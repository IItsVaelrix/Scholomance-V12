/**
 * TrueSight Immune Probe — spatial diagnostic for the annotation overlay.
 *
 * Implements the RED path of SPATIAL-IMMUNE-DIAGNOSTICS.md against the TrueSight
 * word-hit-box lattice. Each rendered word is a NODE. A node that violates a
 * geometric invariant "burns an ATP token": it sheds a RED BytecodeHealth
 * exosome (deterministic RNA) and becomes an energy seed in a QBIT volume. An
 * immune agent then walks the energy gradient to the distress center-of-mass —
 * the root node — and synthesizes a resonance antibody so the same failure is
 * recognized instantly if it recurs.
 *
 * This module is Node-only (BytecodeHealth uses node:crypto). The live DOM is
 * read separately by the browser-safe collectTruesightNodes.js; this probe
 * consumes those plain descriptors, so it is fully unit-testable.
 *
 * Node descriptor shape (from collectTruesightNodes):
 *   { index, charStart, token, lineIndex, isWord,
 *     styleLeft, styleWidth, styleHeight,
 *     rectLeft, rectTop, rectWidth, rectHeight, hasBox, boxWidth, boxHeight }
 */

import { BytecodeHealth } from './BytecodeHealth.js';
import { HEALTH_CODES, CELL_IDS } from './diagnostic-constants.js';
import { propagate, ATTENUATION_MODELS } from '../pixelbrain/qbit-field.js';

// ─── Tolerances ───────────────────────────────────────────────────────────────
const EPS_OVERLAP = 1.0; // px — neighbouring word boxes may abut, not overlap
const MIN_WIDTH = 0.5; // px — a real word box must have positive extent
const EPS_STYLE = 1.5; // px — inline-style intent vs real layout agreement

// ─── Invariants (z-axis separates failure classes in the QBIT volume) ──────────
export const INVARIANTS = Object.freeze({
  MONOTONIC_NONOVERLAP: { id: 'I1', z: 0, checkId: 'monotonic-nonoverlap', desc: 'word boxes advance left-to-right without overlap' },
  FINITE_POSITIVE: { id: 'I2', z: 1, checkId: 'finite-positive-geometry', desc: 'box left/width are finite and width > 0' },
  SHELL_PER_WORD: { id: 'I3', z: 2, checkId: 'shell-per-word', desc: 'every expected word renders a shell' },
  STYLE_LAYOUT_AGREEMENT: { id: 'I4', z: 3, checkId: 'style-layout-agreement', desc: 'inline-style position matches real layout' },
});
const Z_DEPTH = 4;
const GRID_W = 64;

const round2 = (n) => (Number.isFinite(n) ? Math.round(n * 100) / 100 : n);
const finite = (n) => typeof n === 'number' && Number.isFinite(n);

// ─── Phase 1: Invariant scan → violations ──────────────────────────────────────
/**
 * @param {Array} nodes
 * @param {object} opts { expectedWordCount?, lineCount? }
 * @returns {Array} violations [{ invariant, node, magnitude, expected, actual }]
 */
export function scanInvariants(nodes, opts = {}) {
  const violations = [];

  // I2 — finite, positive geometry (per node). Catches NaN/0 collapse.
  for (const node of nodes) {
    if (!finite(node.rectLeft) || !finite(node.rectWidth) || node.rectWidth < MIN_WIDTH) {
      violations.push({
        invariant: INVARIANTS.FINITE_POSITIVE,
        node,
        magnitude: 1,
        expected: `finite rectLeft and rectWidth >= ${MIN_WIDTH}`,
        actual: { rectLeft: node.rectLeft, rectWidth: node.rectWidth },
      });
    }
  }

  // I1 — monotonic non-overlap (per visual line, ordered by charStart).
  const byLine = new Map();
  for (const node of nodes) {
    const k = finite(node.lineIndex) ? node.lineIndex : 0;
    if (!byLine.has(k)) byLine.set(k, []);
    byLine.get(k).push(node);
  }
  for (const lineNodes of byLine.values()) {
    const ordered = [...lineNodes].sort((a, b) => (a.charStart - b.charStart));
    for (let i = 1; i < ordered.length; i++) {
      const prev = ordered[i - 1];
      const cur = ordered[i];
      if (!finite(prev.rectLeft) || !finite(prev.rectWidth) || !finite(cur.rectLeft)) continue;
      const prevRight = prev.rectLeft + prev.rectWidth;
      const overlap = prevRight - cur.rectLeft;
      if (overlap > EPS_OVERLAP) {
        violations.push({
          invariant: INVARIANTS.MONOTONIC_NONOVERLAP,
          node: cur,
          magnitude: overlap,
          expected: `rectLeft >= ${round2(prevRight)} (after "${prev.token}")`,
          actual: { rectLeft: round2(cur.rectLeft), overlapPx: round2(overlap) },
        });
      }
    }
  }

  // I4 — inline-style intent vs real layout (per node).
  for (const node of nodes) {
    if (!finite(node.styleLeft) || !finite(node.rectLeft)) continue;
    const disc = Math.abs(node.styleLeft - node.rectLeft);
    if (disc > EPS_STYLE) {
      violations.push({
        invariant: INVARIANTS.STYLE_LAYOUT_AGREEMENT,
        node,
        magnitude: disc,
        expected: `rectLeft ≈ styleLeft (${round2(node.styleLeft)})`,
        actual: { rectLeft: round2(node.rectLeft), discrepancyPx: round2(disc) },
      });
    }
  }

  // I3 — shell-per-word (aggregate). Catches "only the first word rendered".
  if (finite(opts.expectedWordCount) && nodes.length < opts.expectedWordCount) {
    const missing = opts.expectedWordCount - nodes.length;
    const last = nodes[nodes.length - 1] || { lineIndex: 0, rectLeft: 0, charStart: 0, token: '∅' };
    violations.push({
      invariant: INVARIANTS.SHELL_PER_WORD,
      node: {
        index: nodes.length,
        charStart: (last.charStart ?? 0) + 1,
        token: '∅(missing)',
        lineIndex: last.lineIndex ?? 0,
        rectLeft: finite(last.rectLeft) ? last.rectLeft : 0,
        rectWidth: 0,
        styleLeft: null,
      },
      magnitude: missing / opts.expectedWordCount,
      expected: `${opts.expectedWordCount} word shells`,
      actual: { rendered: nodes.length, missing },
    });
  }

  return violations;
}

// ─── Phase 2: Exosome shedding (deterministic RNA per node) ──────────────────────
/**
 * Sheds one BytecodeHealth exosome per node: RED if it owns any violation,
 * green otherwise. Context is rounded so the checksum (RNA) is reproducible.
 */
/** Builds one exosome for a node given the invariant ids it failed (if any). */
export function buildExosome(node, failingIds = []) {
  const failing = failingIds.length ? [...failingIds].sort() : [];
  const context = {
    charStart: node.charStart,
    token: node.token,
    lineIndex: node.lineIndex,
    styleLeft: round2(node.styleLeft),
    styleWidth: round2(node.styleWidth),
    rectLeft: round2(node.rectLeft),
    rectWidth: round2(node.rectWidth),
    hasBox: !!node.hasBox,
    failing,
  };
  return new BytecodeHealth({
    code: failing.length ? HEALTH_CODES.TRUESIGHT_NODE_DISTRESS : HEALTH_CODES.TRUESIGHT_NODE_HEALTHY,
    cellId: CELL_IDS.TRUESIGHT_OVERLAY,
    checkId: failing.length ? failing.join('+') : 'healthy',
    moduleId: 'truesight-word-shell',
    context,
  });
}

/** Maps node.index → sorted list of invariant ids it violated. */
function failingByIndexMap(violations) {
  const map = new Map();
  for (const v of violations) {
    const idx = v.node.index;
    if (!map.has(idx)) map.set(idx, []);
    map.get(idx).push(v.invariant.id);
  }
  return map;
}

export function shedExosomes(nodes, violations) {
  const failingByIndex = failingByIndexMap(violations);
  return nodes.map((node) => buildExosome(node, failingByIndex.get(node.index) || []));
}

// ─── Phase 3: QBIT seeding ──────────────────────────────────────────────────────
function computeDims(nodes) {
  let maxRight = 1;
  let maxLine = 0;
  for (const n of nodes) {
    if (finite(n.rectLeft) && finite(n.rectWidth)) maxRight = Math.max(maxRight, n.rectLeft + n.rectWidth);
    if (finite(n.lineIndex)) maxLine = Math.max(maxLine, n.lineIndex);
  }
  const cellW = Math.max(1, maxRight / (GRID_W - 1));
  return { width: GRID_W, height: Math.max(1, maxLine + 1), depth: Z_DEPTH, cellW, maxRight };
}

export function seedField(violations, dims) {
  return violations.map((v) => {
    const left = finite(v.node.rectLeft) ? v.node.rectLeft : 0;
    const x = Math.max(0, Math.min(dims.width - 1, Math.round(left / dims.cellW)));
    const y = Math.max(0, Math.min(dims.height - 1, finite(v.node.lineIndex) ? v.node.lineIndex : 0));
    const z = v.invariant.z;
    // Normalize energy per failure class so heterogeneous magnitudes are comparable.
    let energy;
    if (v.invariant.id === INVARIANTS.FINITE_POSITIVE.id) energy = 1;
    else if (v.invariant.id === INVARIANTS.SHELL_PER_WORD.id) energy = Math.max(0.5, v.magnitude);
    else energy = Math.max(0.25, Math.min(1, v.magnitude / dims.maxRight));
    return { x, y, z, energy, energyType: 'distress', invariantId: v.invariant.id, charStart: v.node.charStart };
  });
}

// ─── Phase 4: Chemotaxis — immune agent ascends the gradient to the peak ─────────
export function runChemotaxis(field, dims, maxSteps = 256) {
  // Start from an idle corner and climb. With one collapse the peak is the
  // distress center-of-mass = root node locus.
  let x = 0, y = 0, z = 0;
  const path = [{ x, y, z }];
  const sign = (n) => (n > 1e-9 ? 1 : n < -1e-9 ? -1 : 0);
  for (let step = 0; step < maxSteps; step++) {
    const { gx, gy, gz } = field.gradientAt(x, y, z);
    const nx = Math.max(0, Math.min(dims.width - 1, x + sign(gx)));
    const ny = Math.max(0, Math.min(dims.height - 1, y + sign(gy)));
    const nz = Math.max(0, Math.min(dims.depth - 1, z + sign(gz)));
    if (nx === x && ny === y && nz === z) break; // local maximum reached
    // Avoid 2-cycles: if energy did not increase, stop.
    if (field.energyAt(nx, ny, nz) <= field.energyAt(x, y, z)) break;
    x = nx; y = ny; z = nz;
    path.push({ x, y, z });
  }
  return { peak: { x, y, z }, energy: field.energyAt(x, y, z), steps: path.length - 1, path };
}

// ─── Phase 5: Locate root node + synthesize antibody ────────────────────────────
export function locateRootNode(violations, seeds, peak) {
  if (!violations.length) return null;
  let best = null;
  let bestDist = Infinity;
  for (let i = 0; i < violations.length; i++) {
    const s = seeds[i];
    const d = (s.x - peak.x) ** 2 + (s.y - peak.y) ** 2 + (s.z - peak.z) ** 2;
    // Deterministic tiebreak: nearer to peak, then earliest charStart.
    if (d < bestDist || (d === bestDist && (s.charStart ?? 1e9) < (best.seed.charStart ?? 1e9))) {
      best = { violation: violations[i], seed: s };
      bestDist = d;
    }
  }
  return best;
}

export function synthesizeResonance(rootExosome, root, peak, chemotaxis) {
  if (!root || !rootExosome) return null;
  return {
    checksum: rootExosome.checksum,
    code: rootExosome.code,
    cellId: rootExosome.cellId,
    bytecode: rootExosome.bytecode,
    invariant: root.violation.invariant.id,
    invariantDesc: root.violation.invariant.desc,
    rootCharStart: root.violation.node.charStart,
    rootToken: root.violation.node.token,
    lineIndex: root.violation.node.lineIndex,
    magnitude: round2(root.violation.magnitude),
    expected: root.violation.expected,
    actual: root.violation.actual,
    peakCell: peak,
    gradientSteps: chemotaxis ? chemotaxis.steps : 0,
  };
}

// ─── Orchestrator ───────────────────────────────────────────────────────────────
/**
 * Full immune scan over collected DOM nodes.
 * @param {object} collected - output of collectTruesightNodes
 * @param {object} opts - { expectedWordCount? }
 * @returns {object} report
 */
export function runImmuneScan(collected, opts = {}) {
  const nodes = (collected && collected.nodes) || [];
  const violations = scanInvariants(nodes, {
    expectedWordCount: opts.expectedWordCount,
    lineCount: collected ? collected.lineCount : 0,
  });
  const exosomes = shedExosomes(nodes, violations);
  const dims = computeDims(nodes);
  const seeds = seedField(violations, dims);

  let field = null;
  let chemotaxis = null;
  let root = null;
  let antibody = null;

  if (seeds.length) {
    field = propagate(seeds, dims.width, dims.height, dims.depth, {
      attenuationModel: ATTENUATION_MODELS.PHI_ATTENUATION,
      iterations: 2,
    });
    chemotaxis = runChemotaxis(field, dims);
    root = locateRootNode(violations, seeds, chemotaxis.peak);
    // Build the root exosome straight from its violation so synthetic "absence"
    // nodes (I3 missing shells) — which never rendered and so were never shed —
    // still yield a deterministic antibody.
    const rootExosome = root
      ? buildExosome(root.violation.node, failingByIndexMap(violations).get(root.violation.node.index) || [root.violation.invariant.id])
      : null;
    antibody = synthesizeResonance(rootExosome, root, chemotaxis.peak, chemotaxis);
  }

  const redCount = exosomes.filter((e) => e.code === HEALTH_CODES.TRUESIGHT_NODE_DISTRESS).length;

  return {
    healthy: violations.length === 0,
    nodeCount: nodes.length,
    shellCount: collected ? collected.shellCount : nodes.length,
    expectedWordCount: opts.expectedWordCount ?? null,
    redExosomeCount: redCount,
    distress: violations.map((v) => ({
      invariant: v.invariant.id,
      checkId: v.invariant.checkId,
      charStart: v.node.charStart,
      token: v.node.token,
      lineIndex: v.node.lineIndex,
      magnitude: round2(v.magnitude),
      expected: v.expected,
      actual: v.actual,
    })),
    dims,
    seeds,
    peakCell: chemotaxis ? chemotaxis.peak : null,
    rootNode: root
      ? { charStart: root.violation.node.charStart, token: root.violation.node.token, invariant: root.violation.invariant.id }
      : null,
    antibody,
    exosomes: exosomes.map((e) => e.toJSON()),
  };
}

/** One-line human summary for logs. */
export function summarizeReport(report) {
  if (report.healthy) {
    return `IMMUNE: healthy — ${report.nodeCount} nodes, 0 distress seeds`;
  }
  const r = report.rootNode;
  return [
    `IMMUNE: ${report.distress.length} distress seeds across ${report.nodeCount}/${report.expectedWordCount ?? '?'} nodes`,
    r ? `root = "${r.token}" @char ${r.charStart} via ${r.invariant}` : 'root = (none)',
    report.peakCell ? `peak = (${report.peakCell.x},${report.peakCell.y},${report.peakCell.z})` : '',
  ].filter(Boolean).join(' | ');
}
