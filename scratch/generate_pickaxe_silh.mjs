import { readFileSync, writeFileSync } from 'node:fs';
import { forgeItemAsset } from '../codex/core/pixelbrain/item-foundry.js';
import { projectVoxelShadows } from '../codex/core/pixelbrain/silhouette-projection.js';
import { traceContour, buildSilhFormBlock } from '../codex/core/pixelbrain/silhouette-scan.js';

const spec = JSON.parse(readFileSync('specs/voidmetal-pickaxe.v1.json', 'utf8'));
const bundle = forgeItemAsset(spec);

const shadows = projectVoxelShadows(bundle.voxelPacket);

function extractEdgeCells(shadowSet) {
  const edges = [];
  for (const key of shadowSet) {
    const [x, y] = key.split(',').map(Number);
    const hasEmptyNeighbor = [
      `${x+1},${y}`, `${x-1},${y}`, `${x},${y+1}`, `${x},${y-1}`
    ].some(k => !shadowSet.has(k));
    if (hasEmptyNeighbor) {
      edges.push({x, y});
    }
  }
  return edges;
}

const views = {
  front: traceContour(extractEdgeCells(shadows.front)),
  side: traceContour(extractEdgeCells(shadows.side)),
  top: traceContour(extractEdgeCells(shadows.top))
};

const formBlock = buildSilhFormBlock({
  id: 'weapon.tool.pickaxe-v1',
  grid: bundle.voxelPacket.dimensions,
  tolerance: { front: 0, side: 6, top: 6 },
  views
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

// The script in Task 13 step 1 says to insert the ANIM block before SILH_END or after?
// PDR §6 says ANIM_START...ANIM_END is inside the .silh block before SILH_END?
// Wait, the test in Task 6 shows ANIM_START inside SILH_START and SILH_END.
// We'll replace the line 'SILH_END' with animBlock + '\nSILH_END'.
const finalSilh = formBlock.replace('SILH_END', animBlock + '\nSILH_END');

writeFileSync('specs/voidmetal-pickaxe.silh', finalSilh);
console.log('wrote specs/voidmetal-pickaxe.silh');
