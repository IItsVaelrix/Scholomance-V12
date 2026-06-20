import { readFileSync, writeFileSync } from 'node:fs';
import { forgeItemAsset } from '../codex/core/pixelbrain/item-foundry.js';
import { projectVoxelShadows } from '../codex/core/pixelbrain/silhouette-projection.js';
import { traceContour } from '../codex/core/pixelbrain/silhouette-scan.js';
import { fillContourMask } from '../codex/core/pixelbrain/silhouette-blueprint.js';

const spec = JSON.parse(readFileSync('specs/voidmetal-pickaxe.v1.json', 'utf8'));
const bundle = forgeItemAsset(spec);
const shadows = projectVoxelShadows(bundle.voxelPacket);

// what if I just use the shadow cells exactly as the "contour" instead of using traceContour?
// wait, the grammar says "CONTOUR 0,0 1,0 ..." which is a list of points.
const frontAll = Array.from(shadows.front).map(k => {
    const [x, y] = k.split(',').map(Number);
    return {x, y};
});

const contour = traceContour(frontAll);
const mask = fillContourMask(contour, { width: 64, height: 64 });

let missingInMask = 0;
for (const k of shadows.front) if (!mask.has(k)) missingInMask++;

let extraInMask = 0;
for (const k of mask) if (!shadows.front.has(k)) extraInMask++;

console.log('shadows front size:', shadows.front.size);
console.log('mask size:', mask.size);
console.log('missing in mask:', missingInMask);
console.log('extra in mask:', extraInMask);
