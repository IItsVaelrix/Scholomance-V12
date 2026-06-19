import { readFileSync } from 'node:fs';
import { forgeItemAsset } from '../codex/core/pixelbrain/item-foundry.js';

const rawSpec = JSON.parse(readFileSync('specs/slime-staff.v1.json', 'utf8'));
const bundle = forgeItemAsset(rawSpec, { includeShader: false, includePng: false });

console.log(Object.keys(bundle.silhouette));
console.log(bundle.silhouette.parts[0]);
console.log(bundle.silhouette.canvas);
