/**
 * REDWOOD TREE — tall, majestic conifer using PixelBrain harmonic construction.
 *
 * Leverages:
 * - Harmonic Sketch (golden spacing + symmetry in construction)
 * - New part profiles: tree.trunk.redwood, tree.foliage.tier, tree.foliage.top
 * - Organic materials: bark + pine_needle
 * - Full foundry: silhouette, region fills, selout, square sharpness, noise/texture
 *
 * Usage:
 *   node scripts/generate-redwood-tree.mjs
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { forgeItemAsset, renderBundlePng } from '../codex/core/pixelbrain/item-foundry.js';
import { registerPartProfile } from '../codex/core/pixelbrain/part-profile-library.js'; // ensure profiles are loaded
import { hashItemSpec } from '../codex/core/pixelbrain/item-spec.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_ROOT = resolve(__dirname, '..', 'output', 'foundry', 'redwood-tree');

// Ensure profiles are registered (they live in the library; this import side-effects)
import '../codex/core/pixelbrain/part-profile-library.js';

function buildRedwoodSpec() {
  const canvas = { width: 48, height: 112, gridSize: 1 };
  const cx = 24;

  // Construction: tall central axis + golden-spaced rings for foliage whorls
  // This exercises the new harmonic (symmetry + fibonacci/golden + sketch) reconciliation.
  // Foliage positioned higher up for proper redwood form (long bare lower trunk).
  const numLayers = 6;
  const baseY = 55; // lowest foliage layer y (from top of trunk; smaller = higher up)
  const topY = 10;

  const rings = [];
  for (let i = 0; i < numLayers; i++) {
    const t = i / (numLayers - 1);
    // Golden contraction for natural tapering + spacing
    const y = Math.round(baseY - (baseY - topY) * (1 - Math.pow(1 / 1.618, i * 0.7)));
    const radius = Math.max(2, Math.round(4 + (numLayers - i) * 0.8)); // wider lower
    rings.push({
      radius,
      role: `foliage-tier-${i}`,
      y, // approximate; actual attach uses profile anchors + composer
    });
  }

  return {
    contract: 'ITEM-SPEC-v1',
    id: 'environment.redwood.v1',
    class: 'prop',
    archetype: 'redwood',
    canvas,
    seed: 424242,
    bytecode: 'VW-FOREST-TRANSCENDENT',
    bands: 5,
    light: { angle: Math.PI * 1.1, ambient: 0.22 }, // slightly from upper left
    construction: {
      version: 'construction-v1',
      center: { x: cx, y: 55 },
      rings: rings.map((r, idx) => ({
        radius: r.radius,
        role: r.role,
      })),
      radials: { count: 6, offsetDegrees: 30 },
      axes: false,
      // Activate the new harmonic boons
      goldenSpacing: true,
      symmetricGuides: true,
      harmonic: true,
      symmetry: { axis: 'vertical', mode: 'strict' },
    },
    parts: [
      {
        id: 'trunk',
        profile: 'tree.trunk.redwood',
        params: {
          cx,
          height: 92,
          baseHalf: 5,
          topHalf: 2,
        },
        fill: { material: 'bark' },
        // Subtle vertical texture via intensity (will be enhanced by square amp + noise)
        outline: { material: 'bark', anchor: 'shadow' },
      },
      // Layered foliage whorls — attached conceptually to trunk layers.
      // The harmonic construction + composer will align them beautifully.
      ...Array.from({ length: numLayers }, (_, i) => ({
        id: `foliage-${i}`,
        profile: 'tree.foliage.tier',
        attach: { parent: 'trunk', at: `layer${i + 1}` },
        params: {
          width: 26 - i * 2.2,
          thickness: 4 + Math.floor(i / 2),
          droop: 1 + Math.floor(i / 3),
        },
        fill: { material: 'pine_needle', intensity: i < 2 ? 'bright' : 'dark' },
        trim: { material: 'pine_needle', anchor: 'frost' },
      })),
      // Classic redwood spire top
      {
        id: 'spire',
        profile: 'tree.foliage.top',
        attach: { parent: 'trunk', at: 'tip' },
        params: {
          height: 14,
          baseWidth: 8,
        },
        fill: { material: 'pine_needle', intensity: 'bright' },
      },
    ],
    // Optional: light noise on foliage for needle variation (uses NoiseFillAMP)
    // The foundry will pick it up if present on parts.
  };
}

const OUT_DIR = OUT_ROOT;
mkdirSync(OUT_DIR, { recursive: true });

const spec = buildRedwoodSpec();
const bundle = forgeItemAsset(spec, {
  includeShader: true,
  includePng: true,
  pngScale: 4,
});

writeFileSync(resolve(OUT_DIR, 'redwood.json'), JSON.stringify(bundle.assetPacket, null, 2), 'utf8');
writeFileSync(resolve(OUT_DIR, 'redwood.pbrain'), bundle.godotArtifact, 'utf8');
writeFileSync(resolve(OUT_DIR, 'redwood.png'), bundle.png);
writeFileSync(resolve(OUT_DIR, 'redwood.1x.png'), renderBundlePng(bundle, 1));

if (bundle.godotShader) {
  writeFileSync(resolve(OUT_DIR, 'redwood.gdshader'), bundle.godotShader, 'utf8');
}
if (bundle.phaserPipeline) {
  writeFileSync(resolve(OUT_DIR, 'redwood.phaser.js'), bundle.phaserPipeline, 'utf8');
}

const diagnostics = {
  code: 'REDWOOD_TREE_EXPORT_READY',
  item: spec.id,
  spec: { id: spec.id, hash: hashItemSpec(spec) },
  cells: bundle.assetPacket.geometry.coordinates.length,
  harmonicConstruction: spec.construction?.harmonic || false,
  layers: spec.parts.filter(p => p.id.startsWith('foliage')).length,
};

writeFileSync(
  resolve(OUT_DIR, 'redwood.forge.diagnostics.json'),
  JSON.stringify(diagnostics, null, 2),
  'utf8'
);

console.log(`forged redwood-tree ${hashItemSpec(spec)} ${bundle.assetPacket.geometry.coordinates.length} cells`);
console.log(`  output: ${OUT_DIR}`);
console.log(`  harmonic: ${spec.construction?.harmonic}`);
