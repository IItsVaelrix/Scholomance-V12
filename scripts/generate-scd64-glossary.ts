import fs from 'fs';
import path from 'path';
import { SCD64_GLOSSARY } from '../src/core/scd64/glossary';

import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, '../tools/scd64-vscode/data/scd64-glossary.v1.json');

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(SCD64_GLOSSARY, null, 2), 'utf-8');

console.log(`Generated offline glossary at ${outPath}`);
