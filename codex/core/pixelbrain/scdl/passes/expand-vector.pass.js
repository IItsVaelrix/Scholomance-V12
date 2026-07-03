/**
 * SCDL Expand Vector Pass
 *
 * Rasterizes vector ops (circle, ring, rect, polygon, path) into the
 * `cell` op form so downstream passes are unchanged. The rasterizer is
 * deterministic — same canvas + same ops → same cells, in same order.
 *
 * Each vector op is converted to 0..N `cell` ops, prepended to the
 * part's existing ops. Source-order is preserved so the "last write
 * wins" dedupe in expand-cells / exporters behaves as authored.
 *
 * Vector ops supported:
 *   circle  cx cy radius R color
 *     └─ fills every cell (x,y) where (x-cx)² + (y-cy)² <= R²
 *
 *   ring    cx cy radius R width W color
 *     └─ fills every cell where (R - W/2)² <= d² <= (R + W/2)²
 *
 *   rect    x y w h color
 *     └─ fills the axis-aligned rectangle
 *
 *   polygon x1 y1 x2 y2 ... xn yn color
 *     └─ fills via scanline + ray-cast point-in-polygon
 *
 *   path    "M..C..S..Q..T..L..Z" color
 *     └─ a closed SVG-path subpath; rasterized via scanline
 *        on the path's sampled polyline approximation
 *
 *   sphere  cx cy radius R [light lx ly] tier0 tier1 tier2 tier3 tier4
 *     └─ fills a shaded disc using fixed Lambertian tiers
 *
 * Out-of-bounds cells are silently dropped (matching `cell` op behaviour).
 */

// ─── Helpers ─────────────────────────────────────────────────────────────────

function inBounds(x, y, w, h) {
  return x >= 0 && x < w && y >= 0 && y < h;
}

function pushCell(ops, x, y, color, loc, sourceOp = null) {
  const cell = { op: 'cell', x, y, color, _fromVector: true, loc };
  if (sourceOp) {
    // Propagate semantic info from SemQuant for downstream cells
    if (sourceOp.partId) cell.partId = sourceOp.partId;
    if (sourceOp.id) cell.sourceOpId = sourceOp.id;
    if (sourceOp.material) cell.material = sourceOp.material;
    if (Array.isArray(sourceOp.annotations) && sourceOp.annotations.length) {
      // Keep light — only canonical role if present
      const roleAnn = sourceOp.annotations.find(a => a.domain === 'role');
      if (roleAnn) cell.role = roleAnn.canonicalType;
    }
    // Also carry any explicit role on the op
    if (sourceOp.role) cell.role = sourceOp.role;
  }
  ops.push(cell);
}

// SVG-like path sampler. Handles M, L, H, V, Q, T, C, S, A, Z.
// Curves are flattened into deterministic 10-step polylines. Arcs currently
// preserve endpoint continuity as a straight segment until SCDL needs full
// elliptical-arc geometry.
function samplePath(d) {
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+/g) || [];
  let i = 0;
  let cx = 0, cy = 0;
  let startX = 0, startY = 0;
  let lastQ = null;
  let lastC = null;
  const out = [];
  const isCommand = token => /^[a-zA-Z]$/.test(token || '');
  const nextNum = () => parseFloat(tokens[i++]);

  while (i < tokens.length) {
    const cmd = tokens[i++];
    const isRel = cmd === cmd.toLowerCase() && cmd !== 'z';
    const C = cmd.toUpperCase();
    if (C === 'M') {
      const x = parseFloat(tokens[i++]);
      const y = parseFloat(tokens[i++]);
      cx = isRel ? cx + x : x;
      cy = isRel ? cy + y : y;
      startX = cx;
      startY = cy;
      out.push([cx, cy]);
      lastQ = null; lastC = null;
    } else if (C === 'L') {
      const x = parseFloat(tokens[i++]);
      const y = parseFloat(tokens[i++]);
      cx = isRel ? cx + x : x;
      cy = isRel ? cy + y : y;
      out.push([cx, cy]);
      lastQ = null; lastC = null;
    } else if (C === 'H') {
      const x = parseFloat(tokens[i++]);
      cx = isRel ? cx + x : x;
      out.push([cx, cy]);
      lastQ = null; lastC = null;
    } else if (C === 'V') {
      const y = parseFloat(tokens[i++]);
      cy = isRel ? cy + y : y;
      out.push([cx, cy]);
      lastQ = null; lastC = null;
    } else if (C === 'Q') {
      const x1 = nextNum();
      const y1 = nextNum();
      const x = nextNum();
      const y = nextNum();
      const ax = isRel ? cx + x1 : x1;
      const ay = isRel ? cy + y1 : y1;
      const ex = isRel ? cx + x : x;
      const ey = isRel ? cy + y : y;
      const lastX = cx, lastY = cy;
      for (let t = 0.1; t <= 1.0; t += 0.1) {
        const u = 1 - t;
        const px = u*u*lastX + 2*u*t*ax + t*t*ex;
        const py = u*u*lastY + 2*u*t*ay + t*t*ey;
        out.push([px, py]);
      }
      cx = ex; cy = ey;
      lastQ = [ax, ay]; lastC = null;
    } else if (C === 'T') {
      const x = nextNum();
      const y = nextNum();
      const ax = lastQ ? (2 * cx - lastQ[0]) : cx;
      const ay = lastQ ? (2 * cy - lastQ[1]) : cy;
      const ex = isRel ? cx + x : x;
      const ey = isRel ? cy + y : y;
      const lastX = cx, lastY = cy;
      for (let t = 0.1; t <= 1.0; t += 0.1) {
        const u = 1 - t;
        out.push([
          u*u*lastX + 2*u*t*ax + t*t*ex,
          u*u*lastY + 2*u*t*ay + t*t*ey,
        ]);
      }
      cx = ex; cy = ey;
      lastQ = [ax, ay]; lastC = null;
    } else if (C === 'C') {
      const x1 = nextNum();
      const y1 = nextNum();
      const x2 = nextNum();
      const y2 = nextNum();
      const x = nextNum();
      const y = nextNum();
      const c1x = isRel ? cx + x1 : x1;
      const c1y = isRel ? cy + y1 : y1;
      const c2x = isRel ? cx + x2 : x2;
      const c2y = isRel ? cy + y2 : y2;
      const ex = isRel ? cx + x : x;
      const ey = isRel ? cy + y : y;
      const sx = cx, sy = cy;
      for (let t = 0.1; t <= 1.0; t += 0.1) {
        const u = 1 - t;
        out.push([
          u*u*u*sx + 3*u*u*t*c1x + 3*u*t*t*c2x + t*t*t*ex,
          u*u*u*sy + 3*u*u*t*c1y + 3*u*t*t*c2y + t*t*t*ey,
        ]);
      }
      cx = ex; cy = ey;
      lastC = [c2x, c2y]; lastQ = null;
    } else if (C === 'S') {
      const x2 = nextNum();
      const y2 = nextNum();
      const x = nextNum();
      const y = nextNum();
      const c1x = lastC ? (2 * cx - lastC[0]) : cx;
      const c1y = lastC ? (2 * cy - lastC[1]) : cy;
      const c2x = isRel ? cx + x2 : x2;
      const c2y = isRel ? cy + y2 : y2;
      const ex = isRel ? cx + x : x;
      const ey = isRel ? cy + y : y;
      const sx = cx, sy = cy;
      for (let t = 0.1; t <= 1.0; t += 0.1) {
        const u = 1 - t;
        out.push([
          u*u*u*sx + 3*u*u*t*c1x + 3*u*t*t*c2x + t*t*t*ex,
          u*u*u*sy + 3*u*u*t*c1y + 3*u*t*t*c2y + t*t*t*ey,
        ]);
      }
      cx = ex; cy = ey;
      lastC = [c2x, c2y]; lastQ = null;
    } else if (C === 'A') {
      i += 5; // rx ry rotation large-arc sweep
      if (!isCommand(tokens[i]) && !isCommand(tokens[i + 1])) {
        const x = nextNum();
        const y = nextNum();
        cx = isRel ? cx + x : x;
        cy = isRel ? cy + y : y;
        out.push([cx, cy]);
      }
      lastQ = null; lastC = null;
    } else if (C === 'Z') {
      cx = startX; cy = startY;
      out.push([cx, cy]);
      lastQ = null; lastC = null;
    } else {
      // unsupported: skip remaining args
    }
  }
  return out;
}

function pointInPolygon(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (((yi > y) !== (yj > y)) &&
        (x < (xj - xi) * (y - yi) / ((yj - yi) || 1e-9) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

// ─── Rasterizers ─────────────────────────────────────────────────────────────

function rasterizeCircle(op, W, H, ops) {
  const { cx, cy, radius, color, loc } = op;
  const r2 = radius * radius;
  for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y++) {
    for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x++) {
      const dx = x - cx, dy = y - cy;
      if (dx*dx + dy*dy <= r2 && inBounds(x, y, W, H)) {
        pushCell(ops, x, y, color, loc, op);
      }
    }
  }
}

function rasterizeRing(op, W, H, ops) {
  const { cx, cy, radius, width, color, loc } = op;
  const inner = Math.max(0, radius - (width / 2));
  const outer = radius + (width / 2);
  const inner2 = inner * inner;
  const outer2 = outer * outer;
  for (let y = Math.floor(cy - outer); y <= Math.ceil(cy + outer); y++) {
    for (let x = Math.floor(cx - outer); x <= Math.ceil(cx + outer); x++) {
      const dx = x - cx, dy = y - cy;
      const d2 = dx*dx + dy*dy;
      if (d2 >= inner2 && d2 <= outer2 && inBounds(x, y, W, H)) {
        pushCell(ops, x, y, color, loc, op);
      }
    }
  }
}

function rasterizeRect(op, W, H, ops) {
  const { x, y, w, h, color, loc } = op;
  for (let yy = Math.floor(y); yy < Math.ceil(y + h); yy++) {
    for (let xx = Math.floor(x); xx < Math.ceil(x + w); xx++) {
      if (inBounds(xx, yy, W, H)) {
        pushCell(ops, xx, yy, color, loc, op);
      }
    }
  }
}

function rasterizePolygon(op, W, H, ops) {
  const { points, color, loc } = op;
  if (points.length < 3) return;
  let minY = Infinity, maxY = -Infinity;
  for (const [, py] of points) {
    if (py < minY) minY = py;
    if (py > maxY) maxY = py;
  }
  const yStart = Math.max(0, Math.floor(minY));
  const yEnd   = Math.min(H - 1, Math.ceil(maxY));
  for (let y = yStart; y <= yEnd; y++) {
    for (let x = 0; x < W; x++) {
      if (pointInPolygon(x + 0.5, y + 0.5, points) && inBounds(x, y, W, H)) {
        pushCell(ops, x, y, color, loc, op);
      }
    }
  }
}

function rasterizePath(op, W, H, ops) {
  const { d, color, loc } = op;
  const pts = samplePath(d);
  if (pts.length < 3) return;
  // Sample the path: walk segments at integer-t intervals to catch all cells
  // the polyline passes through. Then fill interior via scanline.
  const samples = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      samples.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]);
    }
  }
  // Close the polygon
  samples.push(samples[0]);
  // Use polygon rasterizer on the sampled polyline
  const polyOp = { points: samples, color, loc, partId: op.partId, id: op.id, material: op.material, annotations: op.annotations, role: op.role };
  rasterizePolygon(polyOp, W, H, ops);
}

// Tier thresholds for the sphere op, matching the pixel-grid generator.
// Tiers ordered brightest→darkest: 0=shine, 1=glow, 2=core, 3=rim, 4=shadow
const SPHERE_THRESHOLDS = Object.freeze([0.999, 0.70, 0.10, -0.40]);

function rasterizeSphere(op, W, H, ops) {
  const { cx, cy, radius, lx, ly, tierColors, loc } = op;
  if (!Array.isArray(tierColors) || tierColors.length < 1) return;
  const r2 = radius * radius;
  const lLen = Math.hypot(lx, ly) || 1;
  const lNormX = lx / lLen;
  const lNormY = ly / lLen;
  const last = tierColors.length - 1;
  for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y++) {
    for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x++) {
      const dx = x - cx, dy = y - cy;
      const d2 = dx*dx + dy*dy;
      if (d2 > r2) continue;
      if (!inBounds(x, y, W, H)) continue;
      const d  = Math.sqrt(d2);
      let tierIdx = 4;
      if (d > 0) {
        const nx = dx / d;
        const ny = dy / d;
        const cosTheta = nx * lNormX + ny * lNormY;
        if      (cosTheta >= SPHERE_THRESHOLDS[0]) tierIdx = 0;
        else if (cosTheta >= SPHERE_THRESHOLDS[1]) tierIdx = 1;
        else if (cosTheta >= SPHERE_THRESHOLDS[2]) tierIdx = 2;
        else if (cosTheta >= SPHERE_THRESHOLDS[3]) tierIdx = 3;
      }
      const color = tierColors[Math.min(tierIdx, last)];
      pushCell(ops, x, y, color, loc, op);
    }
  }
}

// ─── Pass ────────────────────────────────────────────────────────────────────

/**
 * @param {object} ast
 * @param {import('../scdl.errors.js').SCDLError[]} errors
 * @returns {object} new AST with vector ops replaced by cell ops
 */
export function expandVectorPass(ast, _errors) {
  const { canvas } = ast;
  const W = canvas.width;
  const H = canvas.height;

  const newParts = ast.parts.map(part => {
    const newOps = [];
    for (const op of part.ops) {
      // Attach part context to the op for semantic propagation
      const opWithContext = { ...op, partId: op.partId || part.id };

      switch (op.op) {
        case 'circle':   rasterizeCircle(opWithContext, W, H, newOps);   break;
        case 'ring':     rasterizeRing(opWithContext, W, H, newOps);     break;
        case 'rect':     rasterizeRect(opWithContext, W, H, newOps);     break;
        case 'polygon':  rasterizePolygon(opWithContext, W, H, newOps);  break;
        case 'path':     rasterizePath(opWithContext, W, H, newOps);     break;
        case 'sphere':   rasterizeSphere(opWithContext, W, H, newOps);   break;
        default:         newOps.push(op);                     break;
      }
    }
    return { ...part, ops: newOps, _vectorExpanded: true };
  });

  return { ...ast, parts: newParts };
}
