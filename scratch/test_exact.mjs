import { readFileSync, writeFileSync } from 'node:fs';
import { forgeItemAsset } from '../codex/core/pixelbrain/item-foundry.js';
import { projectVoxelShadows, hamming } from '../codex/core/pixelbrain/silhouette-projection.js';
import { fillContourMask } from '../codex/core/pixelbrain/silhouette-blueprint.js';

const spec = JSON.parse(readFileSync('specs/voidmetal-pickaxe.v1.json', 'utf8'));
const bundle = forgeItemAsset(spec);
const shadows = projectVoxelShadows(bundle.voxelPacket);

function generateExactContour(shadowSet) {
  // Group by Y
  const rows = {};
  for (const key of shadowSet) {
    const [x, y] = key.split(',').map(Number);
    if (!rows[y]) rows[y] = [];
    rows[y].push(x);
  }

  const contour = [];
  for (const y of Object.keys(rows).map(Number).sort((a,b)=>a-b)) {
    const xs = rows[y].sort((a,b)=>a-b);
    let startX = xs[0];
    let endX = xs[0];
    for (let i = 1; i < xs.length; i++) {
      if (xs[i] === endX + 1) {
        endX = xs[i];
      } else {
        contour.push([startX, y]);
        if (endX !== startX) contour.push([endX, y]);
        startX = xs[i];
        endX = xs[i];
      }
    }
    contour.push([startX, y]);
    if (endX !== startX) contour.push([endX, y]);
  }
  return contour;
}

const frontContour = generateExactContour(shadows.front);
const g = bundle.voxelPacket.dimensions;
const frontMask = fillContourMask(frontContour, {w: g.width, h: g.height});
console.log('Front delta with exact endpoints:', hamming(shadows.front, frontMask));

const sideContour = generateExactContour(shadows.side);
const sideMask = fillContourMask(sideContour, {w: g.depth, h: g.height});
console.log('Side delta with exact endpoints:', hamming(shadows.side, sideMask));

const topContour = generateExactContour(shadows.top);
const topMask = fillContourMask(topContour, {w: g.width, h: g.depth});
console.log('Top delta with exact endpoints:', hamming(shadows.top, topMask));

