import { readFileSync, writeFileSync } from 'node:fs';
import { forgeItemAsset } from '../codex/core/pixelbrain/item-foundry.js';
import { projectVoxelShadows } from '../codex/core/pixelbrain/silhouette-projection.js';

const spec = JSON.parse(readFileSync('specs/voidmetal-pickaxe.v1.json', 'utf8'));
const bundle = forgeItemAsset(spec);
const shadows = projectVoxelShadows(bundle.voxelPacket);

const set = new Set(shadows.front);
let components = 0;

while (set.size > 0) {
  const first = set.values().next().value;
  set.delete(first);
  const queue = [first];
  let size = 1;

  while (queue.length > 0) {
    const [x, y] = queue.shift().split(',').map(Number);
    const neighbors = [
      `${x-1},${y}`, `${x+1},${y}`, `${x},${y-1}`, `${x},${y+1}`,
      `${x-1},${y-1}`, `${x+1},${y-1}`, `${x-1},${y+1}`, `${x+1},${y+1}`
    ];
    for (const n of neighbors) {
      if (set.has(n)) {
        set.delete(n);
        queue.push(n);
        size++;
      }
    }
  }
  console.log(`Component ${components+1}: size ${size}`);
  components++;
}
console.log('Total components:', components);
