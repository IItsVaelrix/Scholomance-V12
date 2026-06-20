import { readFileSync } from 'node:fs';
import { forgeItemAsset } from '../codex/core/pixelbrain/item-foundry.js';

const PICKAXE_SPEC = JSON.parse(readFileSync('specs/voidmetal-pickaxe.v1.json', 'utf8'));
const mutated = JSON.parse(JSON.stringify(PICKAXE_SPEC));
mutated.parts.find(p => p.id === 'handle').params.dx = -10; // jagged
mutated.parts.find(p => p.id === 'head_core').params.cx = 32.5; // Off grid float

try {
  const result = forgeItemAsset(mutated);
  console.log("Ok:", result.routeDiagnostics.ok);
  console.log("Failures:", result.routeDiagnostics.failures);
} catch (e) {
  console.log("Exception:", e.message);
}
