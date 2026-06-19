/**
 * QBIT SYMMETRY TEST
 *
 * Checks equidistant spatial orientation for each part of the ice-slime-staff.
 * For each part, computes the derived center from cell bounds, then measures:
 *   - Per-row symmetry (does row center == part center?)
 *   - Distance distribution (are cells equidistant from center?)
 *   - QBIT medial axis alignment (are medial nodes on the expected spine?)
 *
 * Stray pixels from incorrect tracing will appear as:
 *   - Asymmetric rows (rowCx drifts from partCx)
 *   - Distance outliers (cells far from where a clean profile would place them)
 *   - Medial nodes shifted off the geometric centerline
 */

import { readFileSync } from 'node:fs';
import { forgeItemAsset } from '../codex/core/pixelbrain/item-foundry.js';
import { extractQBITGraph } from '../codex/core/pixelbrain/qbit-node-extractor.js';

const spec = JSON.parse(readFileSync('specs/ice-slime-staff.v1.json', 'utf8'));
const foundry = forgeItemAsset(spec);
const silhouette = foundry.silhouette;
const canvas = spec.canvas;

// Group cells by partId
const byPart = new Map();
silhouette.partOf.forEach((partId, key) => {
  const [x, y] = key.split(',').map(Number);
  if (!byPart.has(partId)) byPart.set(partId, []);
  byPart.get(partId).push({ x, y });
});

const qbitGraphs = extractQBITGraph(silhouette, canvas);

// Known geometric centers from spec params
// shaft: cx=24, grip attaches below bezel
const EXPECTED_CX = {
  shaft: 24,
  shaft_shadow: 24,
  shaft_highlight: 24,
  shaft_rune_lattice: 24,
  shaft_lattice_glow: 24,
  shaft_glint: 24,
  grip: 24,
  grip_shadow: 24,
  grip_highlight: 24,
  grip_trim: 24,
};

console.log('QBIT SYMMETRY TEST — ice-slime-staff');
console.log('======================================\n');

const results = [];

for (const [partId, cells] of byPart) {
  if (cells.length < 4) continue;

  const xs = cells.map(c => c.x);
  const ys = cells.map(c => c.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const derivedCx = (minX + maxX) / 2;
  const derivedCy = (minY + maxY) / 2;

  // Per-row symmetry check
  const byRow = new Map();
  for (const c of cells) {
    if (!byRow.has(c.y)) byRow.set(c.y, []);
    byRow.get(c.y).push(c.x);
  }

  let maxRowDrift = 0;
  let asymRowCount = 0;
  const asymDetails = [];
  for (const [y, rowXs] of byRow) {
    const rowMin = Math.min(...rowXs);
    const rowMax = Math.max(...rowXs);
    const rowCx = (rowMin + rowMax) / 2;
    const drift = Math.abs(rowCx - derivedCx);
    if (drift > maxRowDrift) maxRowDrift = drift;
    if (drift > 0.5) {
      asymRowCount++;
      if (asymDetails.length < 3) {
        asymDetails.push(`y=${y}: cx=${rowCx.toFixed(1)} (expected ${derivedCx.toFixed(1)}, drift=${drift.toFixed(1)})`);
      }
    }
  }

  // Distance from derived center — check for outliers
  const dists = cells.map(c => Math.hypot(c.x - derivedCx, c.y - derivedCy));
  const maxCellDist = Math.max(...dists);
  const outliers = cells.filter((c, i) => {
    // Outlier: cell more than 2px further from center than 90th percentile
    return false; // computed below
  });
  const sorted = [...dists].sort((a, b) => a - b);
  const p90 = sorted[Math.floor(sorted.length * 0.9)];
  const outlierCount = dists.filter(d => d > p90 + 2).length;

  // QBIT medial axis check
  const graph = qbitGraphs.get(partId);
  const medialCx = graph
    ? graph.nodes.reduce((s, n) => s + n.x, 0) / graph.nodes.length
    : null;
  const medialCxDrift = medialCx != null ? Math.abs(medialCx - derivedCx) : null;

  // Expected cx (for axis parts)
  const expectedCx = EXPECTED_CX[partId];
  const axisError = expectedCx != null ? Math.abs(derivedCx - expectedCx) : null;

  const symmetric = asymRowCount === 0 && outlierCount === 0;
  const status = symmetric ? '✅ SYMMETRIC' : '⚠️  DRIFT DETECTED';

  results.push({
    partId,
    cells: cells.length,
    derivedCx: derivedCx.toFixed(2),
    derivedCy: derivedCy.toFixed(2),
    asymRows: asymRowCount,
    maxDrift: maxRowDrift.toFixed(2),
    outliers: outlierCount,
    medialCxDrift: medialCxDrift != null ? medialCxDrift.toFixed(2) : '—',
    axisError: axisError != null ? axisError.toFixed(2) : '—',
    status,
    asymDetails,
  });
}

results.sort((a, b) => {
  // Drifted parts first
  if (a.asymRows !== b.asymRows) return b.asymRows - a.asymRows;
  return a.partId.localeCompare(b.partId);
});

for (const r of results) {
  console.log(`${r.status}  ${r.partId}`);
  console.log(`  cells=${r.cells}  derivedCenter=(${r.derivedCx}, ${r.derivedCy})`);
  console.log(`  asymmetricRows=${r.asymRows}  maxRowDrift=${r.maxDrift}  outliers=${r.outliers}`);
  console.log(`  medialCxDrift=${r.medialCxDrift}  axisError=${r.axisError}`);
  if (r.asymDetails.length > 0) {
    console.log(`  stray rows:`);
    for (const d of r.asymDetails) console.log(`    ${d}`);
  }
  console.log('');
}

const drifted = results.filter(r => r.asymRows > 0 || Number(r.outliers) > 0);
console.log(`======================================`);
console.log(`Parts with detected drift: ${drifted.length} / ${results.length}`);
console.log(`Parts clean: ${results.length - drifted.length}`);
