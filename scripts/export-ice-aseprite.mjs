import { readFileSync, writeFileSync } from 'node:fs';
import { forgeItemAsset } from '../codex/core/pixelbrain/item-foundry.js';
import { exportFoundryToAsepriteBinary } from '../codex/core/pixelbrain/foundry-aseprite-bridge.js';

const spec = JSON.parse(readFileSync('specs/ice-slime-staff.v1.json', 'utf8'));
const foundry = forgeItemAsset(spec);
const asepriteBinary = exportFoundryToAsepriteBinary(foundry);
writeFileSync('output/foundry/ice-slime-staff/staff.aseprite', asepriteBinary);
console.log('Exported staff.aseprite');
