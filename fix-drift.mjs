import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const result = spawnSync('node', ['docs/scholomance-encyclopedia/tools/audit-hygiene.mjs'], { encoding: 'utf-8' });
const output = result.stdout || result.stderr || '';

const pdrReadme = 'docs/scholomance-encyclopedia/PDR-archive/README.md';
const mainReadme = 'docs/scholomance-encyclopedia/README.md';

let pdrLinks = [];
let mainLinks = [];

for (const line of output.split('\n')) {
  if (line.startsWith('- PDR missing from archive index: ')) {
    const file = line.replace('- PDR missing from archive index: ', '').trim();
    pdrLinks.push(`- [\`${file}\`](./${encodeURI(file).replace(/%2F/g, '/')})`);
  } else if (line.startsWith('- Main encyclopedia README missing link: ')) {
    const file = line.replace('- Main encyclopedia README missing link: ', '').trim();
    mainLinks.push(`- [\`${path.basename(file)}\`](./${encodeURI(file).replace(/%2F/g, '/')})`);
  } else if (line.startsWith('- Main encyclopedia README links missing file: ')) {
    const file = line.replace('- Main encyclopedia README links missing file: ', '').trim();
    let text = fs.readFileSync(mainReadme, 'utf-8');
    const safeName = file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`.*\\(\\.?\\/?${safeName}\\).*\\n?`, 'g');
    text = text.replace(regex, '');
    fs.writeFileSync(mainReadme, text);
  }
}

if (pdrLinks.length > 0) {
  fs.appendFileSync(pdrReadme, '\n' + pdrLinks.join('\n') + '\n');
}
if (mainLinks.length > 0) {
  fs.appendFileSync(mainReadme, '\n## Automatically Restored Links\n\n' + mainLinks.join('\n') + '\n');
}

console.log('Fixed drift.');
