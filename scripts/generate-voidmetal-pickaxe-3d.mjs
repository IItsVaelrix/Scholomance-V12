import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';

import { forgeItemAsset, renderPng } from '../codex/core/pixelbrain/item-foundry.js';
import { createPixelBrainArtifact } from '../src/lib/godot-export/artifactSchemas.js';
import { serializeStable } from '../src/lib/godot-export/stableSerialize.js';
import { hashString } from '../codex/core/pixelbrain/shared.js';

const SPEC_PATH = resolve('specs/voidmetal-pickaxe-3d.v1.json');
const OUT_DIR = resolve('output/foundry/voidmetal-pickaxe-3d');
const GODOT_ITEM_DIR = resolve('godot_project/assets/items');

const rawSpec = JSON.parse(readFileSync(SPEC_PATH, 'utf8'));

const bundle = forgeItemAsset(rawSpec, {
  includeShader: false,
  includePng: true,
  pngScale: 16,
});

const { voxelPacket, volume, fills, assetPacket, godotArtifact: artifactStr, png } = bundle;

mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(GODOT_ITEM_DIR, { recursive: true });

const specHash = `fnv1a_${hashString(serializeStable(rawSpec)).toString(16).padStart(8, '0')}`;
const fillHash = fills.hash;
const partCounts = {};
for (const c of fills.coordinates) {
  partCounts[c.partId] = (partCounts[c.partId] || 0) + 1;
}

writeFileSync(resolve(OUT_DIR, 'spec.json'), JSON.stringify(bundle.spec, null, 2), 'utf8');
writeFileSync(resolve(OUT_DIR, 'asset-packet.json'), JSON.stringify(assetPacket, null, 2), 'utf8');
writeFileSync(resolve(OUT_DIR, 'voxel-packet.json'), JSON.stringify(voxelPacket, null, 2), 'utf8');
writeFileSync(resolve(OUT_DIR, 'artifact.pbrain'), artifactStr, 'utf8');
writeFileSync(resolve(OUT_DIR, 'pickaxe.png'), png);

writeFileSync(
  resolve(OUT_DIR, 'diagnostics.json'),
  JSON.stringify({
    spec: { file: SPEC_PATH, id: rawSpec.id, hash: specHash },
    cells2d: fills.coordinates.length,
    partCounts,
    fillHash,
    volume: volume ? {
      dimensions: { w: volume.width, h: volume.height, d: volume.depth },
      voxelCount: volume.diagnostics.voxelCount,
      centrePlane: volume.diagnostics.centrePlane,
    } : null,
    voxelPacket: voxelPacket ? {
      contract: voxelPacket.contract,
      id: voxelPacket.id,
      voxelCount: voxelPacket.voxels.length,
      materialCount: Object.keys(voxelPacket.materials).length,
    } : null,
    routeDiagnostics: bundle.routeDiagnostics,
  }, null, 2),
  'utf8',
);

copyFileSync(resolve(OUT_DIR, 'voxel-packet.json'), resolve(GODOT_ITEM_DIR, 'voidmetal_pickaxe_3d.json'));
copyFileSync(resolve(OUT_DIR, 'artifact.pbrain'), resolve(GODOT_ITEM_DIR, 'voidmetal_pickaxe_3d.pbrain'));
copyFileSync(resolve(OUT_DIR, 'pickaxe.png'), resolve(GODOT_ITEM_DIR, 'voidmetal_pickaxe_3d.png'));

const vol = volume;
console.log('===========================================================');
console.log('  VOIDMETAL PICKAXE 3D FORGE — voidmetal-pickaxe-3d.v1');
console.log('===========================================================');
console.log(`  spec hash      : ${specHash}`);
console.log(`  2D cells       : ${fills.coordinates.length}`);
console.log(`  part counts    : ${JSON.stringify(partCounts)}`);
console.log(`  3D volume      : ${vol.width}×${vol.height}×${vol.depth}`);
console.log(`  3D voxels      : ${vol.diagnostics.voxelCount}`);
console.log(`  centre plane   : z=${vol.diagnostics.centrePlane}`);
console.log(`  voxel packet   : ${voxelPacket.voxels.length} voxels, ${Object.keys(voxelPacket.materials).length} materials`);
console.log(`  route ok       : ${bundle.routeDiagnostics.ok}`);
if (bundle.routeDiagnostics.failures.length > 0) {
  console.log('  FAILURES:');
  for (const f of bundle.routeDiagnostics.failures) {
    console.log(`    - ${f.code}: ${f.message}`);
  }
}
console.log(`  output dir     : ${OUT_DIR}`);
console.log('===========================================================');
