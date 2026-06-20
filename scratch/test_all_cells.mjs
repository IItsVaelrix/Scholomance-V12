import { readFileSync, writeFileSync } from 'node:fs';
import { forgeItemAsset } from '../codex/core/pixelbrain/item-foundry.js';
import { projectVoxelShadows, hamming } from '../codex/core/pixelbrain/silhouette-projection.js';
import { fillContourMask } from '../codex/core/pixelbrain/silhouette-blueprint.js';

const spec = JSON.parse(readFileSync('specs/voidmetal-pickaxe.v1.json', 'utf8'));
const bundle = forgeItemAsset(spec);
const shadows = projectVoxelShadows(bundle.voxelPacket);

// Just pass all points of the shadow as the contour
const contourAll = Array.from(shadows.front).map(k => {
  const [x,y] = k.split(',').map(Number);
  return [x,y];
});

const g = bundle.voxelPacket.dimensions;
const maskAll = fillContourMask(contourAll, { w: g.width, h: g.height });
console.log('Delta when contour = all shadow cells:', hamming(shadows.front, maskAll));
