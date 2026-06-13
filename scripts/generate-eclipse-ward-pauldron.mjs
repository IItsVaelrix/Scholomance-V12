/**
 * Generate the Eclipse Ward Pauldron asset via PixelBrain.
 *
 * Follows the user's 10-step recipe:
 *   New 64x80, CONSTRUCTION GUIDES, PENCIL on named layers (10_Structure/20_Energy/30_Focal),
 *   AMP FILTERS (now using new SDFShapeAMP + NoiseFillAMP + square-sharpness),
 *   polish layers, deterministic packet export.
 *
 * Uses core PixelBrain (template-grid-engine + new SDF/Noise AMPs from PDR).
 * All output goes to the foundry per operating rules.
 *
 * Usage:
 *   node scripts/generate-eclipse-ward-pauldron.mjs
 *
 * Outputs in output/foundry/eclipse-ward-pauldron/:
 *   - eclipse-ward-pauldron.json   (PixelBrainAssetPacket)
 *   - pauldron-recipe.json         (machine-readable recipe + construction + AMP params)
 *   - diagnostics.json             (summary)
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import {
  createTemplateGrid,
  createLayer,
  setCell,
} from '../codex/core/pixelbrain/template-grid-engine.js';

import { buildConstructionGuideCells } from '../codex/core/pixelbrain/construction-guides.js';

import { enhanceSquaresForRender } from '../codex/core/pixelbrain/square-sharpness-contrast-amp.js';

import { SDFShapeAMP } from '../codex/core/pixelbrain/sdf-shape-amp.js';
import { NoiseFillAMP } from '../codex/core/pixelbrain/noise-fill-amp.js';
import {
  createPixelBrainAssetPacket,
  normalizePixelBrainAssetPacket,
  normalizePB_SDF_v1,
  normalizePB_NOISE_v1,
} from '../codex/core/pixelbrain/pixelbrain-asset-packet.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '..', 'output', 'foundry', 'eclipse-ward-pauldron');

function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  console.log('[eclipse-ward-pauldron] Generating via PixelBrain core (lattice + SDF/Noise AMPs)...');

  // === Step 1-2: New 64x80 + CONSTRUCTION GUIDES (00_Reference) ===
  const grid = createTemplateGrid({ width: 64, height: 80, cellSize: 1 });
  grid.layers = [
    createLayer('00_Reference'),
    createLayer('10_Structure'),
    createLayer('20_Energy'),
    createLayer('30_Focal'),
    createLayer('40_Polish'),
    createLayer('50_Final'),
  ];

  const dims = { width: 64, height: 80 };
  const centerX = 32, centerY = 40;

  // Apply construction guides to 00_Reference
  const guideCells = buildConstructionGuideCells(dims);
  guideCells.forEach(c => {
    setCell(grid.layers[0], c.x, c.y, '#444444');
  });

  // === Step 3-4: PENCIL on named layers - deterministic rings/radials (from recipe) ===
  // 10_Structure: rings + radials
  for (let r = 6; r <= 18; r += 3) {
    for (let a = 0; a < 360; a += 30) {
      const rad = (a * Math.PI) / 180;
      const x = Math.round(centerX + Math.cos(rad) * r);
      const y = Math.round(centerY + Math.sin(rad) * r * 0.9);
      if (x >= 0 && x < dims.width && y >= 0 && y < dims.height) {
        setCell(grid.layers[1], x, y, '#C9A227');
      }
    }
  }

  // 20_Energy: spokes / radials
  for (let a = 0; a < 360; a += 45) {
    const rad = (a * Math.PI) / 180;
    for (let d = 4; d < 22; d++) {
      const x = Math.round(centerX + Math.cos(rad) * d);
      const y = Math.round(centerY + Math.sin(rad) * d * 0.85);
      if (x >= 0 && x < dims.width && y >= 0 && y < dims.height) {
        setCell(grid.layers[2], x, y, '#00E5FF');
      }
    }
  }

  // 30_Focal: core
  for (let dx = -3; dx <= 3; dx++) {
    for (let dy = -3; dy <= 3; dy++) {
      if (dx * dx + dy * dy <= 10) {
        setCell(grid.layers[3], centerX + dx, centerY + dy, '#FFFFFF');
      }
    }
  }

  // === Step 5-6: AMP FILTERS using new abilities (SDFShapeAMP + NoiseFillAMP) + legacy polish ===
  // Use SDF for clean silhouette on structure (new ability)
  const sdfDesc = normalizePB_SDF_v1({
    contract: 'PB-SDF-v1',
    id: 'pauldron-silhouette',
    primitives: [
      { type: 'capsule', params: { p1: { x: 32, y: 22 }, p2: { x: 32, y: 58 }, radius: 9 } },
    ],
    operations: [],
  });
  const sdfResult = SDFShapeAMP(
    { construction: { skeleton: { center: { x: 32, y: 40 }, rings: [{ radius: 18 }] } } },
    { sdf: sdfDesc, partId: 'pauldron', defaultColor: '#B8860B', minCells: 1 }
  );
  sdfResult.partCells.forEach(c => {
    setCell(grid.layers[4], c.x, c.y, c.color || '#B8860B'); // polish layer for SDF result
  });

  // Noise on energy layer (new ability)
  const noiseDesc = normalizePB_NOISE_v1({
    contract: 'PB-NOISE-v1',
    id: 'energy-turbulence',
    type: 'fbm',
    seed: 0xC0DEFEED,
    frequency: 0.15,
    octaves: 3,
    amplitude: 0.6,
  });
  const energyCells = Array.from(grid.layers[2].cells.values ? grid.layers[2].cells.values() : []);
  const noiseResult = NoiseFillAMP(energyCells, noiseDesc);
  noiseResult.fills.forEach(c => {
    if (c.x !== undefined && c.y !== undefined) {
      const col = c.color || '#00E5FF';
      setCell(grid.layers[2], c.x, c.y, col);
    }
  });

  // Legacy polish AMP on 40/50 (square-sharpness as in original recipe)
  for (const li of [4, 5]) {
    if (grid.layers[li].cells && grid.layers[li].cells.size) {
      const enhanced = enhanceSquaresForRender(
        Array.from(grid.layers[li].cells.values()),
        { intensity: 0.75 }
      );
      enhanced.forEach(c => {
        setCell(grid.layers[li], c.x, c.y, c.color || '#D4AF37', c.emphasis || 1);
      });
    }
  }

  // === Build canonical coordinates from final lattice (all layers, deduped) ===
  const coordSet = new Map();
  const allColors = new Set();
  for (const layer of grid.layers) {
    if (!layer.cells) continue;
    const vals = layer.cells.values ? Array.from(layer.cells.values()) : layer.cells;
    for (const c of vals) {
      const key = `${c.x},${c.y}`;
      const col = c.color || '#FFFFFF';
      if (!coordSet.has(key)) {
        coordSet.set(key, {
          x: c.x,
          y: c.y,
          color: col,
          partId: layer.name || 'core',
          emphasis: c.emphasis || 1,
        });
      }
      allColors.add(col);
    }
  }
  const coordinates = Array.from(coordSet.values());

  // Palettes (capped, from used colors)
  const palettes = [{ key: 'source', colors: Array.from(allColors).slice(0, 12) }];

  // === Create & normalize the authoritative packet ===
  const packet = createPixelBrainAssetPacket({
    canvas: { width: 64, height: 80, gridSize: 1 },
    coordinates,
    palettes,
    metadata: {
      name: 'eclipse-ward-pauldron',
      source: 'pixelbrain-editor-recipe-via-core-generator',
      recipeSteps: 10,
      construction: grid.construction || null,
    },
  });
  const normalized = normalizePixelBrainAssetPacket(packet);

  // Write canonical foundry artifacts
  writeFileSync(resolve(OUT_DIR, 'eclipse-ward-pauldron.json'), JSON.stringify(normalized, null, 2));

  const recipe = {
    version: 'pixelbrain.recipe.v1',
    name: 'Eclipse Ward Pauldron',
    canvas: { width: 64, height: 80 },
    steps: [
      'New 64x80',
      'CONSTRUCTION GUIDES on 00_Reference',
      'PENCIL rings/radials on 10_Structure',
      'PENCIL spokes on 20_Energy',
      'PENCIL focal core on 30_Focal',
      'SDFShapeAMP (new) on polish layer for silhouette',
      'NoiseFillAMP (new) on energy for turbulence',
      'square-sharpness-contrast@0.75 polish on 40/50',
      'Collect unique lattice coordinates',
      'createPixelBrainAssetPacket + normalize',
    ],
    ampFilters: [
      { id: 'sdf-shape', label: 'SDF Shape (PDR)', params: sdfDesc },
      { id: 'noise-fill', label: 'Noise Fill (PDR)', params: noiseDesc },
      { id: 'square-sharpness-contrast', intensity: 0.75 },
    ],
    layers: grid.layers.map((l, i) => ({
      index: i,
      name: l.name,
      cellCount: l.cells ? (l.cells.size || (Array.isArray(l.cells) ? l.cells.length : 0)) : 0,
    })),
    note: 'Fully generated via PixelBrain core (lattice authority, new SDF/Noise AMPs, deterministic). See eclipse-ward-pauldron.json',
  };
  writeFileSync(resolve(OUT_DIR, 'pauldron-recipe.json'), JSON.stringify(recipe, null, 2));

  const diagnostics = {
    specHash: 'n/a (custom lattice recipe)',
    assetId: normalized.id,
    coords: coordinates.length,
    uniqueColors: allColors.size,
    routeOk: true,
    usedNewAbilities: ['SDFShapeAMP', 'NoiseFillAMP'],
    source: 'scripts/generate-eclipse-ward-pauldron.mjs',
  };
  writeFileSync(resolve(OUT_DIR, 'diagnostics.json'), JSON.stringify(diagnostics, null, 2));

  console.log(`[eclipse-ward-pauldron] Wrote to ${OUT_DIR}`);
  console.log(`  Lattice coords: ${coordinates.length}`);
  console.log(`  Packet: eclipse-ward-pauldron.json`);
  console.log(`  Recipe: pauldron-recipe.json (machine-readable, includes SDF/Noise params)`);
  console.log(`  Used new abilities: SDFShapeAMP + NoiseFillAMP`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
