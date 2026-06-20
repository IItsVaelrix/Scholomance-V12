import { readFileSync, writeFileSync } from 'node:fs';
import { normalizeItemSpec, composeSilhouette } from '../codex/core/pixelbrain/item-foundry.js';
import { bfs8Connected } from '../codex/core/pixelbrain/shape-grammar-router.js';

const spec = JSON.parse(readFileSync('specs/voidmetal-pickaxe.v1.json', 'utf8'));
const silhouette = composeSilhouette(normalizeItemSpec(spec));

console.log('Cells length:', silhouette.cells.length);
console.log('Connected:', bfs8Connected(silhouette.cells));

const grid = Array.from({length: 64}, () => Array(64).fill('.'));
for (const cell of silhouette.cells) {
  if (cell.y >= 0 && cell.y < 64 && cell.x >= 0 && cell.x < 64) {
    grid[cell.y][cell.x] = '#';
  }
}

for (let y = 0; y < 64; y++) {
  const row = grid[y].join('');
  if (row.includes('#')) {
    console.log(y.toString().padStart(2, '0') + ' ' + row);
  }
}

