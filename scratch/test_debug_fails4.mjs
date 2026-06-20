import { readFileSync, writeFileSync } from 'node:fs';
import { forgeItemAsset } from '../codex/core/pixelbrain/item-foundry.js';
import { rotateVoxelsZ } from '../codex/core/pixelbrain/silhouette-projection.js';

function connectedComponentCount(voxels) {
  if (voxels.length === 0) return 0;
  
  const vset = new Set(voxels.map(v => `${v.x},${v.y},${v.z}`));
  let count = 0;
  
  while (vset.size > 0) {
    const start = vset.values().next().value;
    const queue = [start];
    vset.delete(start);
    count++;
    
    while (queue.length > 0) {
      const curr = queue.shift();
      const [cx, cy, cz] = curr.split(',').map(Number);
      
      const neighbors = [
        `${cx-1},${cy},${cz}`, `${cx+1},${cy},${cz}`,
        `${cx},${cy-1},${cz}`, `${cx},${cy+1},${cz}`,
        `${cx},${cy},${cz-1}`, `${cx},${cy},${cz+1}`,
      ];
      for (const n of neighbors) {
        if (vset.has(n)) {
          vset.delete(n);
          queue.push(n);
        }
      }
    }
  }
  return count;
}

const spec = JSON.parse(readFileSync('specs/voidmetal-pickaxe.v1.json', 'utf8'));
const bundle = forgeItemAsset(spec);
const { voxelPacket } = bundle;
const pivot = { x: 32, y: 32 };

const baseCount = connectedComponentCount(voxelPacket.voxels);
console.log('Base components:', baseCount);

for (let deg of [45, 90, 105, 12345]) {
  const rotated = rotateVoxelsZ(voxelPacket, deg, pivot);
  console.log('Rotated', deg, 'components:', connectedComponentCount(rotated.voxels));
}
