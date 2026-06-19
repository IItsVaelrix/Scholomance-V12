import { readFileSync } from 'node:fs';
import { forgeItemAsset } from '../codex/core/pixelbrain/item-foundry.js';

const rawSpec = JSON.parse(readFileSync('specs/slime-staff.v1.json', 'utf8'));
const bundle = forgeItemAsset(rawSpec, { includeShader: false, includePng: false });

const shadow = bundle.silhouette.parts.find(p => p.id === 'shaft_shadow');
console.log(shadow);
