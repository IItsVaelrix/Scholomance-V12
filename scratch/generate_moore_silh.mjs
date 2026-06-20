import { readFileSync, writeFileSync } from 'node:fs';
import { forgeItemAsset } from '../codex/core/pixelbrain/item-foundry.js';
import { projectVoxelShadows, hamming } from '../codex/core/pixelbrain/silhouette-projection.js';
import { fillContourMask } from '../codex/core/pixelbrain/silhouette-blueprint.js';
import { buildSilhFormBlock } from '../codex/core/pixelbrain/silhouette-scan.js';

const spec = JSON.parse(readFileSync('specs/voidmetal-pickaxe.v1.json', 'utf8'));
const bundle = forgeItemAsset(spec);
const shadows = projectVoxelShadows(bundle.voxelPacket);

function traceBoundary(shadowSet) {
  // Moore-neighbor tracing
  const set = shadowSet;
  let startNode = null;
  // find top-leftmost point
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
    {dx: 0, dy: -1}, // N
    {dx: 1, dy: -1}, // NE
    {dx: 1, dy: 0},  // E
    {dx: 1, dy: 1},  // SE
    {dx: 0, dy: 1},  // S
    {dx: -1, dy: 1}, // SW
    {dx: -1, dy: 0}, // W
    {dx: -1, dy: -1} // NW
  ];
  
  let current = startNode;
  let currentDir = 0; // N
  const boundary = [];
  const startKey = `${startNode.x},${startNode.y}`;

  do {
    boundary.push([current.x, current.y]);
    let nextDir = (currentDir + 6) % 8; // turn left 90 degrees
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
    if (!found) break; // isolated point
  } while (`${current.x},${current.y}` !== startKey && boundary.length < 10000);

  return boundary;
}

const frontContour = traceBoundary(shadows.front);
const g = bundle.voxelPacket.dimensions;

const frontMask = fillContourMask(frontContour, { w: g.width, h: g.height });
console.log('Front delta with true boundary trace:', hamming(shadows.front, frontMask));

const sideContour = traceBoundary(shadows.side);
const sideMask = fillContourMask(sideContour, { w: g.depth, h: g.height });
console.log('Side delta with true boundary trace:', hamming(shadows.side, sideMask));

const topContour = traceBoundary(shadows.top);
const topMask = fillContourMask(topContour, { w: g.width, h: g.depth });
console.log('Top delta with true boundary trace:', hamming(shadows.top, topMask));

const formBlock = buildSilhFormBlock({
  id: 'weapon.tool.pickaxe-v1',
  grid: bundle.voxelPacket.dimensions,
  tolerance: { front: 0, side: 6, top: 6 },
  views: { front: frontContour, side: sideContour, top: topContour }
});

const animBlock = `ANIM_START
ID pickaxe-swing
TARGET id weapon.tool.pickaxe-v1
DURATION 400
EASE token ease-out
LOOP infinite
PHASE windup
ROTATE base 0 peak -35
PHASE strike
ROTATE base -35 peak 60
ANIM_END`;

const finalSilh = formBlock.replace('SILH_END', animBlock + '\nSILH_END');
writeFileSync('specs/voidmetal-pickaxe.silh', finalSilh);
console.log('Generated new specs/voidmetal-pickaxe.silh with Moore neighborhood trace');
