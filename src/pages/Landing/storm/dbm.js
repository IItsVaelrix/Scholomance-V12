/**
 * DIELECTRIC BREAKDOWN MODEL (DBM) — Laplacian-growth lightning.
 *
 * Physically-grounded discharge: the growing bolt is held at potential 0, the
 * outer frame at potential 1, and Laplace's equation ∇²φ = 0 is solved over the
 * grid by Successive Over-Relaxation (SOR). Each growth step adds one candidate
 * cell adjacent to the cluster with probability ∝ φ^η, then the field is re-solved.
 * This produces the self-similar fractal branching real lightning exhibits — and
 * it is deliberately expensive (many Poisson sweeps per bolt), which is the point:
 * the resulting field is encoded into high-dimensional vectors and pushed through
 * TurboQuant (the photonic bridge) by dbm.worker.js.
 *
 * Pure / DOM-free so it runs in a worker and is unit-testable in Node.
 */

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * @returns {{
 *   points: Array<{x:number,y:number}>,
 *   branches: Array<{points:Array<{x:number,y:number}>}>,
 *   fieldPayload: Array<{x:number,y:number,emphasis:number,color:string}>,
 *   telemetry: { gridW:number, gridH:number, sites:number, sweeps:number, solves:number, reachedEdge:boolean }
 * }}
 */
export function runDielectricBreakdown(options = {}) {
  const {
    gridW = 96,
    gridH = 96,
    steps = 110,
    eta = 1.0,
    sweeps = 16,
    omega = 1.7,
    region = { x: 0, y: 0, w: 100, h: 100 },
    seed = 0xa17b,
  } = options;

  const rng = mulberry32(seed);
  const N = gridW * gridH;
  const phi = new Float32Array(N);
  const occupied = new Uint8Array(N);
  const parent = new Int32Array(N).fill(-1);
  const usedPhi = new Float32Array(N);
  const idx = (x, y) => y * gridW + x;

  phi.fill(1); // far field (outer electrode) at potential 1

  const sx = (gridW >> 1);
  const sy = (gridH >> 1);
  const seedIndex = idx(sx, sy);
  occupied[seedIndex] = 1;
  phi[seedIndex] = 0;
  const order = [seedIndex];

  function relax() {
    for (let s = 0; s < sweeps; s += 1) {
      for (let y = 1; y < gridH - 1; y += 1) {
        const row = y * gridW;
        for (let x = 1; x < gridW - 1; x += 1) {
          const i = row + x;
          if (occupied[i]) continue; // Dirichlet: cluster held at 0
          const avg = 0.25 * (phi[i - 1] + phi[i + 1] + phi[i - gridW] + phi[i + gridW]);
          phi[i] += omega * (avg - phi[i]);
        }
      }
    }
  }

  let reachedEdge = false;
  let solves = 0;

  for (let step = 0; step < steps; step += 1) {
    relax();
    solves += 1;

    // Collect cluster-adjacent candidates and their growth weights φ^η.
    const cand = [];
    const weights = [];
    let total = 0;
    for (let y = 1; y < gridH - 1; y += 1) {
      const row = y * gridW;
      for (let x = 1; x < gridW - 1; x += 1) {
        const i = row + x;
        if (occupied[i]) continue;
        if (occupied[i - 1] || occupied[i + 1] || occupied[i - gridW] || occupied[i + gridW]) {
          const w = Math.pow(Math.max(0, phi[i]), eta);
          cand.push(i);
          weights.push(w);
          total += w;
        }
      }
    }

    if (cand.length === 0) break;

    // Roulette-select the next breakdown site.
    let pick = cand[cand.length - 1];
    let pickW = weights[weights.length - 1];
    if (total > 0) {
      let r = rng() * total;
      for (let k = 0; k < cand.length; k += 1) {
        r -= weights[k];
        if (r <= 0) { pick = cand[k]; pickW = weights[k]; break; }
      }
    }

    // Attach to an occupied neighbour (prefer up, then sides, then down).
    const up = pick - gridW;
    const down = pick + gridW;
    const left = pick - 1;
    const right = pick + 1;
    parent[pick] = occupied[up] ? up : occupied[left] ? left : occupied[right] ? right : down;
    usedPhi[pick] = pickW;
    occupied[pick] = 1;
    phi[pick] = 0;
    order.push(pick);

    const py = (pick / gridW) | 0;
    const px = pick % gridW;
    if (px <= 1 || px >= gridW - 2 || py <= 1 || py >= gridH - 2) {
      reachedEdge = true;
      break;
    }
  }

  // ── Geometry extraction ─────────────────────────────────────────────────
  const children = new Map();
  for (const i of order) {
    const p = parent[i];
    if (p >= 0) {
      if (!children.has(p)) children.set(p, []);
      children.get(p).push(i);
    }
  }

  // subtree reach (depth), computed in reverse topological order
  const reach = new Float64Array(N);
  for (let k = order.length - 1; k >= 0; k -= 1) {
    const i = order[k];
    const kids = children.get(i);
    let r = 0;
    if (kids) for (const c of kids) if (reach[c] + 1 > r) r = reach[c] + 1;
    reach[i] = r;
  }

  const sxScale = gridW > 1 ? region.w / (gridW - 1) : 0;
  const syScale = gridH > 1 ? region.h / (gridH - 1) : 0;
  const toScreen = (i) => ({
    x: region.x + (i % gridW) * sxScale,
    y: region.y + ((i / gridW) | 0) * syScale,
  });

  const branches = [];
  function channelFrom(startNode) {
    const pts = [toScreen(startNode)];
    let node = startNode;
    for (;;) {
      const kids = children.get(node);
      if (!kids || kids.length === 0) break;
      let main = kids[0];
      for (const k of kids) if (reach[k] > reach[main]) main = k;
      for (const k of kids) {
        if (k === main) continue;
        const sub = channelFrom(k);
        if (sub.length > 1) branches.push({ points: [toScreen(node), ...sub] });
      }
      pts.push(toScreen(main));
      node = main;
    }
    return pts;
  }

  const points = channelFrom(seedIndex);

  // High-dimensional field payload for TurboQuant: every breakdown site with the
  // growth potential it formed at.
  const fieldPayload = order.map((i) => {
    const s = toScreen(i);
    return { x: s.x, y: s.y, emphasis: usedPhi[i], color: '#bfe3ff' };
  });

  return {
    points,
    branches,
    fieldPayload,
    telemetry: { gridW, gridH, sites: order.length, sweeps, solves, reachedEdge },
  };
}
