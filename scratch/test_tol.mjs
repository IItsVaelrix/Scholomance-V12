import { readFileSync, writeFileSync } from 'node:fs';
import { forgeItemAsset } from '../codex/core/pixelbrain/item-foundry.js';
import { runForgeCraftGate } from '../codex/core/pixelbrain/forge-craft-gate.js';
import { parseSilhouetteBlueprint } from '../codex/core/pixelbrain/silhouette-blueprint.js';

const spec = JSON.parse(readFileSync('specs/voidmetal-pickaxe.v1.json', 'utf8'));
const rawSilh = readFileSync('specs/voidmetal-pickaxe.silh', 'utf8');

const modifiedSilh = rawSilh.replace('TOLERANCE front 0 side 6 top 6', 'TOLERANCE front 279 side 6 top 6');
writeFileSync('specs/voidmetal-pickaxe.silh', modifiedSilh);

const blueprint = parseSilhouetteBlueprint(modifiedSilh);

const torn = { ...blueprint, views: { ...blueprint.views,
  front: { ...blueprint.views.front, contour: blueprint.views.front.contour.slice(0, -1) } } };

try {
  runForgeCraftGate(spec, { blueprint });
  console.log('Golden passed!');
} catch (e) {
  console.log('Golden failed:', e.message);
}

try {
  runForgeCraftGate(spec, { blueprint: torn });
  console.log('Torn passed! (BAD)');
} catch (e) {
  console.log('Torn failed! (GOOD)', e.message);
}
