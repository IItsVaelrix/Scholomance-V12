/**
 * Forge a 3D voxel pickaxe directly from a sealed .silh blueprint.
 * The blueprint's front filled mask IS the silhouette — no hand-authored
 * part profiles. The PDR calls this "mould wiring."
 *
 *   node scripts/generate-pickaxe-from-blueprint.mjs
 */
import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';

import { parseSilhouetteBlueprint, fillContourMask, VIEW_DIMS } from '../codex/core/pixelbrain/silhouette-blueprint.js';
import { sketchToSilhouette } from '../codex/core/pixelbrain/sketch-amp.js';
import { applyRegionFills, hashRegionFills } from '../codex/core/pixelbrain/region-fill-amp.js';
import { engraveMotifs } from '../codex/core/pixelbrain/motif-engraver.js';
import { buildSquareSharpnessContrastPayload } from '../codex/core/pixelbrain/square-sharpness-contrast-amp.js';
import { createPixelBrainAssetPacket } from '../codex/core/pixelbrain/pixelbrain-asset-packet.js';
import { SOURCE_MATERIAL } from '../codex/core/pixelbrain/material-registry.js';
import { renderPng } from '../codex/core/pixelbrain/item-foundry.js';
import { createPixelBrainArtifact } from '../src/lib/godot-export/artifactSchemas.js';
import { serializeStable } from '../src/lib/godot-export/stableSerialize.js';
import { hashString } from '../codex/core/pixelbrain/shared.js';
import { computeStructuralEnergy } from '../codex/core/pixelbrain/structural-energy.js';
import { liftToVolume, buildPartParams } from '../codex/core/pixelbrain/volume-lift-amp.js';
import { serializeItemVoxelPacket } from '../codex/core/pixelbrain/item-voxel-packet.js';

const SILH_PATH = resolve('specs/voidmetal-pickaxe-reference.silh');
const OUT_DIR = resolve('output/foundry/voidmetal-pickaxe-blueprint');
const GODOT_ITEM_DIR = resolve('godot_project/assets/items');
const SPEC_ID = 'voidmetal-pickaxe-blueprint.v1';
const BYTECODE = 'VW-VOID-BLUEPRINT-TRANSCENDENT';
const CANVAS = { width: 64, height: 64, gridSize: 1 };
const BANDS = 6;

// ── Load & parse blueprint ─────────────────────────────────────────
const silhText = readFileSync(SILH_PATH, 'utf8');
const blueprint = parseSilhouetteBlueprint(silhText);
const frontMask = fillContourMask(blueprint.views.front.contour, VIEW_DIMS.front(blueprint.grid));

console.log('Blueprint digest:', blueprint.digest);
console.log('Front mask cells:', frontMask.size);

// ── Convert mask to silhouette cells ───────────────────────────────
const maskCells = [...frontMask].map((key) => {
  const [x, y] = key.split(',').map(Number);
  return { x, y, partId: 'body' };
});

// Build partOf map and silhouette object
const partOf = new Map();
for (const cell of maskCells) partOf.set(`${cell.x},${cell.y}`, 'body');

const silhouette = Object.freeze({
  cells: Object.freeze(maskCells),
  partOf: Object.freeze(partOf),
  parts: Object.freeze(['body']),
  anchors: Object.freeze({}),
});

// ── Minimal spec (single part from blueprint) ─────────────────────
// Volume params: ridge profile for bladed feel, round for the handle.
// Since we have one part, we compromise with ridge.
const spec = Object.freeze({
  contract: 'ITEM-SPEC-v1',
  id: SPEC_ID,
  class: 'weapon',
  archetype: 'pickaxe',
  canvas: CANVAS,
  seed: 240619,
  bytecode: BYTECODE,
  bands: BANDS,
  parts: Object.freeze([Object.freeze({
    id: 'body',
    profile: 'blueprint.front.mask',
    params: Object.freeze({}),
    fill: Object.freeze({ material: 'voidsteel' }),
    outline: Object.freeze({ material: 'silver', anchor: 'spectral' }),
    volume: Object.freeze({ profile: 'ridge', maxDepth: 4 }),
  })]),
  shader: null,
});

// ── Pipeline ───────────────────────────────────────────────────────
// 1. Shading template
let template = sketchToSilhouette(
  silhouette.cells,
  CANVAS,
  { bands: BANDS, symmetry: 'none' },
);

// 2. Region fills (single part, voidsteel with silver outline)
const fills = applyRegionFills({ silhouette, template, spec, motifCells: new Map() });

// 3. Square sharpness
const sharpness = buildSquareSharpnessContrastPayload({
  coordinates: fills.coordinates,
  material: SOURCE_MATERIAL,
  canvas: CANVAS,
  options: { enabled: true },
  intent: 'enhance_square_render_readability',
});
const polished = sharpness.outputCoordinates;
const fillHash = hashRegionFills(fills);

// 4. Asset packet
const assetPacket = createPixelBrainAssetPacket({
  source: { kind: 'procedural', id: SPEC_ID, label: `pickaxe ${SPEC_ID}` },
  canvas: CANVAS,
  coordinates: polished,
  palettes: [],
  formula: null,
  bytecode: BYTECODE,
  template: {
    gridType: 'blueprint-mask',
    fillState: { bytecode: BYTECODE, school: 'VOID', rarity: 'INEXPLICABLE', effect: 'TRANSCENDENT', source: 'blueprint' },
  },
  material: SOURCE_MATERIAL,
  chromatic: { transformId: SOURCE_MATERIAL },
  metadata: {
    tags: ['blueprint', 'pickaxe', SPEC_ID],
    compatibility: { pdr: 'pixelbrain-silhouette-blueprint-gate-v1', blueprint: blueprint.digest },
  },
});

// 5. Godot artifact
const godotArtifact = serializeStable(createPixelBrainArtifact({
  canvas: CANVAS,
  palettes: [],
  coordinates: polished,
  formula: null,
  bytecode: BYTECODE,
})) + '\n';

// 6. Volume lift — 2D → 3D
const dims = { width: CANVAS.width, height: CANVAS.height };
const { cells: liftCells, materials: voxelMaterials } = mapFillsToVolumeCells(polished);
const energized = computeStructuralEnergy(liftCells, dims);
const partParams = buildPartParams(spec);
const volume = liftToVolume(energized, { dims, partParams });
const voxelPacket = serializeItemVoxelPacket(volume, {
  id: SPEC_ID,
  bytecode: BYTECODE,
  materials: voxelMaterials,
});

// 7. PNG
const png = renderPng(polished, CANVAS.width, CANVAS.height, 16);

// ── Write outputs ───────────────────────────────────────────────────
mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(GODOT_ITEM_DIR, { recursive: true });

const partCounts = { body: polished.length };
const specHash = `fnv1a_${hashString(JSON.stringify(spec)).toString(16).padStart(8, '0')}`;

writeFileSync(resolve(OUT_DIR, 'asset-packet.json'), JSON.stringify(assetPacket, null, 2), 'utf8');
writeFileSync(resolve(OUT_DIR, 'voxel-packet.json'), JSON.stringify(voxelPacket, null, 2), 'utf8');
writeFileSync(resolve(OUT_DIR, 'artifact.pbrain'), godotArtifact, 'utf8');
writeFileSync(resolve(OUT_DIR, 'pickaxe.png'), png);
writeFileSync(resolve(OUT_DIR, 'diagnostics.json'), JSON.stringify({
  spec: { file: SILH_PATH, id: SPEC_ID, hash: specHash },
  blueprint: { digest: blueprint.digest, id: blueprint.id },
  cells2d: polished.length,
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
}, null, 2), 'utf8');

copyFileSync(resolve(OUT_DIR, 'voxel-packet.json'), resolve(GODOT_ITEM_DIR, 'voidmetal_pickaxe_blueprint.json'));
copyFileSync(resolve(OUT_DIR, 'artifact.pbrain'), resolve(GODOT_ITEM_DIR, 'voidmetal_pickaxe_blueprint.pbrain'));
copyFileSync(resolve(OUT_DIR, 'pickaxe.png'), resolve(GODOT_ITEM_DIR, 'voidmetal_pickaxe_blueprint.png'));

console.log('===========================================================');
console.log('  BLUEPRINT PICKAXE FORGE');
console.log('===========================================================');
console.log(`  blueprint      : ${blueprint.digest}`);
console.log(`  2D cells       : ${polished.length}`);
console.log(`  3D volume      : ${volume.width}×${volume.height}×${volume.depth}`);
console.log(`  3D voxels      : ${volume.diagnostics.voxelCount}`);
console.log(`  centre plane   : z=${volume.diagnostics.centrePlane}`);
console.log(`  voxel packet   : ${voxelPacket.voxels.length} voxels, ${Object.keys(voxelPacket.materials).length} materials`);
console.log(`  output dir     : ${OUT_DIR}`);
console.log('===========================================================');

// ── Helpers ─────────────────────────────────────────────────────────
function mapFillsToVolumeCells(coordinates) {
  const colorToId = new Map();
  const materials = {};
  const cells = coordinates.map((c) => {
    const color = String(c.color || '#000000').toUpperCase();
    let materialId = colorToId.get(color);
    if (materialId == null) {
      materialId = colorToId.size + 1;
      colorToId.set(color, materialId);
      materials[materialId] = { id: `mat${materialId}`, colorHint: color };
    }
    return {
      x: c.snappedX ?? c.x,
      y: c.snappedY ?? c.y,
      partId: c.partId || 'body',
      materialId,
      energies: [],
    };
  });
  return { cells, materials };
}
