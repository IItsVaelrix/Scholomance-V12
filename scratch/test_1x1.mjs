import { readFileSync, writeFileSync } from 'node:fs';
import { forgeItemAsset } from '../codex/core/pixelbrain/item-foundry.js';
import { projectVoxelShadows, hamming } from '../codex/core/pixelbrain/silhouette-projection.js';
import { fillContourMask } from '../codex/core/pixelbrain/silhouette-blueprint.js';

const spec = JSON.parse(readFileSync('specs/voidmetal-pickaxe.v1.json', 'utf8'));
const bundle = forgeItemAsset(spec);
const shadows = projectVoxelShadows(bundle.voxelPacket);

// Build a contour that explicitly defines 1x1 squares for EVERY cell
const contourAll = [];
for (const k of shadows.front) {
  const [x,y] = k.split(',').map(Number);
  // Add a degenerate 1x1 square
  contourAll.push([x, y]);
  contourAll.push([x + 1, y]);
  contourAll.push([x + 1, y + 1]);
  contourAll.push([x, y + 1]);
  contourAll.push([x, y]);
}

const g = bundle.voxelPacket.dimensions;
const maskAll = fillContourMask(contourAll, { w: g.width, h: g.height });
console.log('Delta when contour = 1x1 squares:', hamming(shadows.front, maskAll));

// Try one more: just all original points
const contourPoints = Array.from(shadows.front).map(k => {
  const [x,y] = k.split(',').map(Number);
  return [x,y];
});
const maskPoints = fillContourMask(contourPoints, { w: g.width, h: g.height });
console.log('Delta when contour = exact points:', hamming(shadows.front, maskPoints));
