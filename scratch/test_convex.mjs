import { readFileSync, writeFileSync } from 'node:fs';
import { forgeItemAsset } from '../codex/core/pixelbrain/item-foundry.js';
import { projectVoxelShadows } from '../codex/core/pixelbrain/silhouette-projection.js';
import { traceContour } from '../codex/core/pixelbrain/silhouette-scan.js';
import { fillContourMask } from '../codex/core/pixelbrain/silhouette-blueprint.js';
import { hamming } from '../codex/core/pixelbrain/silhouette-projection.js';

const spec = JSON.parse(readFileSync('specs/voidmetal-pickaxe.v1.json', 'utf8'));
// Remove floating bits
spec.parts = spec.parts.filter(p => p.id !== 'void_inlay' && p.id !== 'handle_wrap');

const bundle = forgeItemAsset(spec);

// Check components
const shadows = projectVoxelShadows(bundle.voxelPacket);

// Check if traceContour matches perfectly now
function getCells(shadowSet) {
  return Array.from(shadowSet).map(k => {
    const [x,y] = k.split(',').map(Number);
    return {x, y};
  });
}

const frontContour = traceContour(getCells(shadows.front));
const g = bundle.voxelPacket.dimensions;
const frontMask = fillContourMask(frontContour, {w: g.width, h: g.height});

console.log('Front delta without floating bits:', hamming(shadows.front, frontMask));

writeFileSync('specs/voidmetal-pickaxe.v1.json', JSON.stringify(spec, null, 2));
console.log('Modified spec');
