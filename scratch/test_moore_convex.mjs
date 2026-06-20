import { readFileSync, writeFileSync } from 'node:fs';
import { forgeItemAsset } from '../codex/core/pixelbrain/item-foundry.js';
import { projectVoxelShadows, hamming } from '../codex/core/pixelbrain/silhouette-projection.js';
import { fillContourMask } from '../codex/core/pixelbrain/silhouette-blueprint.js';

const spec = JSON.parse(readFileSync('specs/voidmetal-pickaxe.v1.json', 'utf8'));
const bundle = forgeItemAsset(spec);
const shadows = projectVoxelShadows(bundle.voxelPacket);

function traceBoundary(shadowSet) {
  const set = shadowSet;
  let startNode = null;
  let minX = Infinity;
  let minY = Infinity;
  for (const key of set) {
    const [x, y] = key.split(',').map(Number);
    if (y < minY || (y === minY && x < minX)) {
      minY = y;
      minX = x;
      startNode = {x, y};
    }
  }

  const dirs = [
    {dx: 0, dy: -1}, {dx: 1, dy: -1}, {dx: 1, dy: 0}, {dx: 1, dy: 1},
    {dx: 0, dy: 1}, {dx: -1, dy: 1}, {dx: -1, dy: 0}, {dx: -1, dy: -1}
  ];
  
  let current = startNode;
  let currentDir = 0;
  const boundary = [];
  const startKey = `${startNode.x},${startNode.y}`;

  do {
    boundary.push([current.x, current.y]);
    let nextDir = (currentDir + 6) % 8;
    let found = false;
    for (let i = 0; i < 8; i++) {
      const dir = (nextDir + i) % 8;
      const nx = current.x + dirs[dir].dx;
      const ny = current.y + dirs[dir].dy;
      if (set.has(`${nx},${ny}`)) {
        current = {x: nx, y: ny};
        currentDir = dir;
        found = true;
        break;
      }
    }
    if (!found) break;
  } while (`${current.x},${current.y}` !== startKey && boundary.length < 10000);

  return boundary;
}

const frontContour = traceBoundary(shadows.front);
const g = bundle.voxelPacket.dimensions;
const frontMask = fillContourMask(frontContour, {w: g.width, h: g.height});
console.log('Front delta with Moore trace:', hamming(shadows.front, frontMask));

const sideContour = traceBoundary(shadows.side);
console.log('Side delta with Moore trace:', hamming(shadows.side, fillContourMask(sideContour, {w: g.depth, h: g.height})));

const topContour = traceBoundary(shadows.top);
console.log('Top delta with Moore trace:', hamming(shadows.top, fillContourMask(topContour, {w: g.width, h: g.depth})));

