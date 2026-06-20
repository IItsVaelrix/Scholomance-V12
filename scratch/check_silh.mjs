import { readFileSync, writeFileSync } from 'node:fs';
import { forgeItemAsset } from '../codex/core/pixelbrain/item-foundry.js';
import { runForgeCraftGate } from '../codex/core/pixelbrain/forge-craft-gate.js';
import { parseSilhouetteBlueprint } from '../codex/core/pixelbrain/silhouette-blueprint.js';

const spec = JSON.parse(readFileSync('specs/voidmetal-pickaxe.v1.json', 'utf8'));
const rawSilh = readFileSync('specs/voidmetal-pickaxe.silh', 'utf8');

// Insert ANIM block before SILH_END
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

const finalSilh = rawSilh.replace('SILH_END', animBlock + '\nSILH_END');
writeFileSync('specs/voidmetal-pickaxe.silh', finalSilh);

const blueprint = parseSilhouetteBlueprint(finalSilh);
console.log('Tolerance:', blueprint.tolerance);

try {
  runForgeCraftGate(spec, { blueprint });
  console.log('Passed gate!');
} catch (e) {
  console.log('Gate failed!');
  console.log('Message:', e.message);
  console.log('Bytecode:', e.bytecode);
  if (e.toJSON) {
      console.dir(e.toJSON(), {depth: null});
  }
}
