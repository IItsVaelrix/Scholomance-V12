#!/usr/bin/env node
/**
 * Forge a 3D pickaxe through the full Structural-Energy Lift PDR pipeline.
 *
 * Pipeline (all as microprocessor-route steps):
 *   ITEM-SPEC-v1 → SilhouetteComposer → ShapeGrammarExpansion
 *     → RegionFillAMP → GeometryAMP → VolumeLiftAMP → voxel packet + export
 *
 *   node scripts/generate-pickaxe-pdr.mjs
 */
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { forgeItemAsset, renderPng } from '../codex/core/pixelbrain/item-foundry.js';

const SPEC_PATH = resolve('specs/voidmetal-pickaxe-pdr.v1.json');
const OUT_DIR = resolve('output/foundry/voidmetal-pickaxe-pdr');
const GODOT_DIR = resolve('godot_project/assets/items');

const rawSpec = JSON.parse(readFileSync(SPEC_PATH, 'utf8'));
const bundle = forgeItemAsset(rawSpec, {
  includeShader: false,
  includePng: true,
  pngScale: 16,
});

mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(GODOT_DIR, { recursive: true });

const { volume, voxelPacket, fills, assetPacket, godotArtifact, png, routeDiagnostics } = bundle;

// ── Output files ──────────────────────────────────────────────────
writeFileSync(resolve(OUT_DIR, 'asset-packet.json'), JSON.stringify(assetPacket, null, 2), 'utf8');
writeFileSync(resolve(OUT_DIR, 'voxel-packet.json'), JSON.stringify(voxelPacket, null, 2), 'utf8');
writeFileSync(resolve(OUT_DIR, 'artifact.pbrain'), godotArtifact, 'utf8');
writeFileSync(resolve(OUT_DIR, 'pickaxe.png'), png);

const partCounts = {};
for (const c of fills.coordinates) partCounts[c.partId] = (partCounts[c.partId] || 0) + 1;

writeFileSync(resolve(OUT_DIR, 'diagnostics.json'), JSON.stringify({
  spec: rawSpec.id,
  cells2d: fills.coordinates.length,
  partCounts,
  fillHash: fills.hash,
  volume: volume ? {
    dimensions: { w: volume.width, h: volume.height, d: volume.depth },
    voxelCount: volume.diagnostics.voxelCount,
    centrePlane: volume.diagnostics.centrePlane,
    amp: volume.diagnostics.amp,
    version: volume.diagnostics.version,
  } : null,
  voxelPacket: voxelPacket ? {
    contract: voxelPacket.contract,
    voxels: voxelPacket.voxels.length,
    materials: Object.keys(voxelPacket.materials).length,
  } : null,
  route: {
    ok: routeDiagnostics.ok,
    steps: routeDiagnostics.steps.map(s => s.name),
  },
}, null, 2), 'utf8');

// ── Godot copies ──────────────────────────────────────────────────
copyFileSync(resolve(OUT_DIR, 'voxel-packet.json'), resolve(GODOT_DIR, 'voidmetal_pickaxe_pdr.json'));
copyFileSync(resolve(OUT_DIR, 'artifact.pbrain'), resolve(GODOT_DIR, 'voidmetal_pickaxe_pdr.pbrain'));
copyFileSync(resolve(OUT_DIR, 'pickaxe.png'), resolve(GODOT_DIR, 'voidmetal_pickaxe_pdr.png'));

console.log('═══════════════════════════════════════════════════');
console.log('  PICKAXE FORGED — FULL PDR PIPELINE');
console.log('═══════════════════════════════════════════════════');
console.log(`  route           : ${routeDiagnostics.ok ? 'PASS' : 'FAIL'}`);
console.log(`  steps           : ${routeDiagnostics.steps.map(s => s.name).join(' → ')}`);
console.log(`  2D cells        : ${fills.coordinates.length}`);
for (const [part, count] of Object.entries(partCounts)) {
  console.log(`    ${part.padEnd(16)} ${count}`);
}
console.log(`  3D volume       : ${volume.width}×${volume.height}×${volume.depth}`);
console.log(`  3D voxels       : ${volume.diagnostics.voxelCount}`);
console.log(`  centre plane    : z=${volume.diagnostics.centrePlane}`);
console.log(`  voxel packet    : ${voxelPacket.voxels.length} voxels × ${Object.keys(voxelPacket.materials).length} materials`);
console.log(`  output dir      : ${OUT_DIR}`);
console.log(`  godot dir       : ${GODOT_DIR}`);
console.log('═══════════════════════════════════════════════════');
