import { readFileSync, writeFileSync } from 'node:fs';
import { forgeItemAsset } from '../codex/core/pixelbrain/item-foundry.js';
import { projectVoxelShadows, hamming } from '../codex/core/pixelbrain/silhouette-projection.js';
import { traceContour, buildSilhFormBlock } from '../codex/core/pixelbrain/silhouette-scan.js';
import { fillContourMask } from '../codex/core/pixelbrain/silhouette-blueprint.js';

const spec = JSON.parse(readFileSync('specs/voidmetal-pickaxe.v1.json', 'utf8'));
const bundle = forgeItemAsset(spec);

const shadows = projectVoxelShadows(bundle.voxelPacket);

function extractEdgeCells(shadowSet) {
  const edges = [];
  for (const key of shadowSet) {
    const [x, y] = key.split(',').map(Number);
    const hasEmptyNeighbor = [
      `${x+1},${y}`, `${x-1},${y}`, `${x},${y+1}`, `${x},${y-1}`
    ].some(k => !shadowSet.has(k));
    if (hasEmptyNeighbor) {
      edges.push({x, y});
    }
  }
  return edges;
}

const frontEdges = extractEdgeCells(shadows.front);
const frontContour = traceContour(frontEdges);

const g = bundle.voxelPacket.dimensions;
const frontMask = fillContourMask(frontContour, { w: g.width, h: g.height });

const delta = hamming(shadows.front, frontMask);
console.log('delta with edges:', delta);

const frontAll = Array.from(shadows.front).map(k => {
    const [x, y] = k.split(',').map(Number);
    return {x, y};
});
const frontContourAll = traceContour(frontAll);
const frontMaskAll = fillContourMask(frontContourAll, { w: g.width, h: g.height });
const deltaAll = hamming(shadows.front, frontMaskAll);
console.log('delta with all cells:', deltaAll);
