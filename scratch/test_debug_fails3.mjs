import { readFileSync, writeFileSync } from 'node:fs';
import { forgeItemAsset } from '../codex/core/pixelbrain/item-foundry.js';
import { rotateVoxelsZ, hamming, projectVoxelShadows } from '../codex/core/pixelbrain/silhouette-projection.js';
import { fillContourMask } from '../codex/core/pixelbrain/silhouette-blueprint.js';
import { parseSilhouetteBlueprint } from '../codex/core/pixelbrain/silhouette-blueprint.js';

const spec = JSON.parse(readFileSync('specs/voidmetal-pickaxe.v1.json', 'utf8'));
const bundle = forgeItemAsset(spec);
const { voxelPacket } = bundle;
const rawSilh = readFileSync('specs/voidmetal-pickaxe.silh', 'utf8');
const blueprint = parseSilhouetteBlueprint(rawSilh);
const grid = blueprint.grid;
const pivot = { x: Math.floor(grid.width / 2), y: Math.floor(grid.height / 2) };
const frontMask = fillContourMask(blueprint.views.front.contour, {w: grid.width, h: grid.height});

function packetFromFrontMask(mask, dimensions) {
  const voxels = [...mask].sort().map((key) => {
    const [x, y] = key.split(',').map(Number);
    return { x, y, z: 0, materialId: 1 };
  });
  return { dimensions, voxels };
}

const frontMaskPacket = packetFromFrontMask(frontMask, voxelPacket.dimensions);

const rotateDeg = 45;
const rotatedVoxelPacket = rotateVoxelsZ(voxelPacket, rotateDeg, pivot);
const rotatedMaskPacket = rotateVoxelsZ(frontMaskPacket, rotateDeg, pivot);

const delta = hamming(
  projectVoxelShadows(rotatedVoxelPacket).front,
  projectVoxelShadows(rotatedMaskPacket).front,
);
console.log('Delta at 45 deg:', delta);
