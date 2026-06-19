/**
 * QBIT STAFF PROBE
 *
 * Forges the ice-slime-staff, runs the QBIT node extractor on its silhouette,
 * and prints the skeleton data per part.
 *
 * Verification targets (from spec params):
 *   shaft      half:2  → widthEstimate ≈ 4
 *   grip       half:3  → widthEstimate ≈ 6
 *   orb        r:9     → widthEstimate ≈ 18
 *   cradle     r:10    → widthEstimate ≈ 14-18 (arc, not full circle)
 *
 * Run: node --experimental-vm-modules scripts/qbit-staff-probe.mjs
 */

import { readFileSync } from 'node:fs';
import { forgeItemAsset } from '../codex/core/pixelbrain/item-foundry.js';
import { extractQBITGraph } from '../codex/core/pixelbrain/qbit-node-extractor.js';

const spec = JSON.parse(readFileSync('specs/ice-slime-staff.v1.json', 'utf8'));

console.log('Forging ice-slime-staff...');
const foundry = forgeItemAsset(spec);
const silhouette = foundry.silhouette;

console.log(`Canvas: ${spec.canvas.width}x${spec.canvas.height}`);
console.log(`Parts in silhouette: ${silhouette.parts?.length ?? '(no parts array)'}`);
console.log(`partOf entries: ${silhouette.partOf?.size ?? 0}`);
console.log('');

console.log('Extracting QBIT graph...');
const graphs = extractQBITGraph(silhouette, spec.canvas);

console.log(`Parts with QBIT graphs: ${graphs.size}`);
console.log('');

// Known params from spec for cross-reference
const KNOWN_PARAMS = {
  shaft:            { half: 2,  expected_width: 5  },
  grip:             { half: 3,  expected_width: 7  },
  orb:              { r: 9,     expected_width: 18 },
  cradle:           { r: 10,    expected_width: '~14 (arc)' },
  orb_ring:         { r: 9,     expected_width: '~4 (ring shell)' },
  pommel:           { r: 3,     expected_width: 6  },
};

const rows = [];

for (const [partId, graph] of graphs) {
  const { skeleton } = graph;
  const known = KNOWN_PARAMS[partId];
  const match = known?.expected_width != null
    ? Math.abs(skeleton.widthEstimate - Number(known.expected_width)) <= 2 ? '✅' : '⚠️ '
    : '  ';

  rows.push({
    partId,
    nodes: skeleton.nodeCount,
    maxDepth: skeleton.maxDepth.toFixed(2),
    widthEst: skeleton.widthEstimate.toFixed(1),
    coreXY: `(${skeleton.core.x},${skeleton.core.y})`,
    centroid: `(${skeleton.centroid.x.toFixed(1)},${skeleton.centroid.y.toFixed(1)})`,
    expected: known?.expected_width ?? '—',
    match,
  });
}

rows.sort((a, b) => a.partId.localeCompare(b.partId));

const colW = [28, 6, 10, 10, 14, 22, 10, 4];
const headers = ['part', 'nodes', 'maxDepth', 'widthEst', 'core(x,y)', 'centroid(x,y)', 'expected', ''];

const pad = (s, w) => String(s).padEnd(w);
console.log(headers.map((h, i) => pad(h, colW[i])).join('  '));
console.log('-'.repeat(colW.reduce((s, w) => s + w + 2, 0)));
for (const r of rows) {
  const vals = [r.partId, r.nodes, r.maxDepth, r.widthEst, r.coreXY, r.centroid, r.expected, r.match];
  console.log(vals.map((v, i) => pad(v, colW[i])).join('  '));
}

console.log('');
console.log('Packed node size: 4 bytes per node (FHT + 4-bit × 8 features)');
const totalNodes = [...graphs.values()].reduce((s, g) => s + g.nodes.length, 0);
const totalBytes = totalNodes * 4;
console.log(`Total QBIT index size for this staff: ${totalNodes} nodes × 4 bytes = ${totalBytes} bytes`);
