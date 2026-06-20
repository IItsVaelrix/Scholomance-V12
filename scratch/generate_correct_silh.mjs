import { readFileSync, writeFileSync } from 'node:fs';
import { forgeItemAsset } from '../codex/core/pixelbrain/item-foundry.js';
import { projectVoxelShadows, hamming } from '../codex/core/pixelbrain/silhouette-projection.js';
import { fillContourMask } from '../codex/core/pixelbrain/silhouette-blueprint.js';
import { buildSilhFormBlock, traceContour } from '../codex/core/pixelbrain/silhouette-scan.js';

const spec = JSON.parse(readFileSync('specs/voidmetal-pickaxe.v1.json', 'utf8'));
const bundle = forgeItemAsset(spec);
const shadows = projectVoxelShadows(bundle.voxelPacket);

function getCells(shadowSet) {
  return Array.from(shadowSet).map(k => {
    const [x,y] = k.split(',').map(Number);
    return {x, y};
  });
}

const frontContour = traceContour(getCells(shadows.front));
const sideContour = traceContour(getCells(shadows.side));
const topContour = traceContour(getCells(shadows.top));

const g = bundle.voxelPacket.dimensions;

console.log('Front delta:', hamming(shadows.front, fillContourMask(frontContour, {w: g.width, h: g.height})));
console.log('Side delta:', hamming(shadows.side, fillContourMask(sideContour, {w: g.depth, h: g.height})));
console.log('Top delta:', hamming(shadows.top, fillContourMask(topContour, {w: g.width, h: g.depth})));

const formBlock = buildSilhFormBlock({
  id: 'weapon.tool.pickaxe-v1',
  grid: bundle.voxelPacket.dimensions,
  tolerance: { front: 0, side: 6, top: 6 },
  views: { front: frontContour, side: sideContour, top: topContour }
});

const animBlock = `ANIM_START
ID pickaxe-swing
TARGET id weapon.tool.pickaxe-v1
DURATION 400
EASE token ease-out
LOOP infinite
PHASE windup
ROTATE base 0 peak -35
PHASE strike
ROTATE base -35 peak 60
ANIM_END`;

const finalSilh = formBlock.replace('SILH_END', animBlock + '\nSILH_END');
writeFileSync('specs/voidmetal-pickaxe.silh', finalSilh);
console.log('wrote specs/voidmetal-pickaxe.silh');
