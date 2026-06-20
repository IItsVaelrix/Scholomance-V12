import { readFileSync, writeFileSync } from 'node:fs';
import { forgeItemAsset } from '../codex/core/pixelbrain/item-foundry.js';
import { runForgeCraftGate } from '../codex/core/pixelbrain/forge-craft-gate.js';
import { parseSilhouetteBlueprint } from '../codex/core/pixelbrain/silhouette-blueprint.js';
import { projectVoxelShadows } from '../codex/core/pixelbrain/silhouette-projection.js';
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

const formBlock = buildSilhFormBlock({
  id: 'weapon.tool.pickaxe-v1',
  grid: bundle.voxelPacket.dimensions,
  tolerance: { front: 279, side: 6, top: 6 },
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

const blueprint = parseSilhouetteBlueprint(finalSilh);

console.log('Testing golden...');
runForgeCraftGate(spec, { blueprint });
console.log('Golden passed!');

const torn = { ...blueprint, views: { ...blueprint.views,
  front: { ...blueprint.views.front, contour: blueprint.views.front.contour.slice(0, -1) } } };

try {
  runForgeCraftGate(spec, { blueprint: torn });
  console.log('Torn passed! (BAD)');
} catch (e) {
  console.log('Torn failed! (GOOD)', e.message);
}
