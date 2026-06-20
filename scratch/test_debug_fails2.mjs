import { readFileSync, writeFileSync } from 'node:fs';
import { forgeItemAsset } from '../codex/core/pixelbrain/item-foundry.js';
import { runForgeCraftGate } from '../codex/core/pixelbrain/forge-craft-gate.js';
import { parseSilhouetteBlueprint } from '../codex/core/pixelbrain/silhouette-blueprint.js';

const spec = JSON.parse(readFileSync('specs/voidmetal-pickaxe.v1.json', 'utf8'));
const rawSilh = readFileSync('specs/voidmetal-pickaxe.silh', 'utf8');
const blueprint = parseSilhouetteBlueprint(rawSilh);

const brokenAnim = { ...blueprint, animation: { ...blueprint.animation, poses: [
  { phase: 'impossible', rotateDeg: 45 } 
]}};

try {
  runForgeCraftGate(spec, { blueprint: brokenAnim });
  console.log('Anim DID NOT THROW!');
} catch (e) {
  console.log('Anim threw:', e.context.reason);
}
