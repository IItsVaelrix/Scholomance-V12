/* eslint-env node */
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { forgeItemAsset, renderBundlePng } from '../codex/core/pixelbrain/item-foundry.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '..', 'output', 'pixelbrain', 'amulet');
mkdirSync(OUT_DIR, { recursive: true });

const CANVAS = Object.freeze({ width: 96, height: 96, gridSize: 1 });
const BYTECODE = 'VW-WILL-INEXPLICABLE-TRANSCENDENT';

function buildAmuletSpec() {
  return {
    contract: 'ITEM-SPEC-v1',
    id: 'amulet.demonic.v2',
    class: 'amulet',
    archetype: 'demonic',
    canvas: CANVAS,
    seed: 42,
    bytecode: BYTECODE,
    bands: 8,
    parts: [
      { id: "body", profile: "frame.oval", params: { rx: 26, ry: 28 }, fill: { material: "shadow_fire" } },
      
      // 8 spikes
      { id: "spike_n", profile: "spike.radial", attach: { parent: "body", at: "base" }, params: { angle: -Math.PI / 2, baseR: 22, tipR: 44, baseHalfWidth: 4 }, fill: { material: "shadow_fire" } },
      { id: "spike_ne", profile: "spike.radial", attach: { parent: "body", at: "base" }, params: { angle: -Math.PI / 4, baseR: 22, tipR: 44, baseHalfWidth: 4 }, fill: { material: "shadow_fire" } },
      { id: "spike_e", profile: "spike.radial", attach: { parent: "body", at: "base" }, params: { angle: 0, baseR: 22, tipR: 44, baseHalfWidth: 4 }, fill: { material: "shadow_fire" } },
      { id: "spike_se", profile: "spike.radial", attach: { parent: "body", at: "base" }, params: { angle: Math.PI / 4, baseR: 22, tipR: 44, baseHalfWidth: 4 }, fill: { material: "shadow_fire" } },
      { id: "spike_s", profile: "spike.radial", attach: { parent: "body", at: "base" }, params: { angle: Math.PI / 2, baseR: 22, tipR: 44, baseHalfWidth: 4 }, fill: { material: "shadow_fire" } },
      { id: "spike_sw", profile: "spike.radial", attach: { parent: "body", at: "base" }, params: { angle: 3 * Math.PI / 4, baseR: 22, tipR: 44, baseHalfWidth: 4 }, fill: { material: "shadow_fire" } },
      { id: "spike_w", profile: "spike.radial", attach: { parent: "body", at: "base" }, params: { angle: Math.PI, baseR: 22, tipR: 44, baseHalfWidth: 4 }, fill: { material: "shadow_fire" } },
      { id: "spike_nw", profile: "spike.radial", attach: { parent: "body", at: "base" }, params: { angle: -3 * Math.PI / 4, baseR: 22, tipR: 44, baseHalfWidth: 4 }, fill: { material: "shadow_fire" } },

      // 4 horns
      { id: "horn_1", profile: "spike.radial", attach: { parent: "body", at: "base" }, params: { angle: -3 * Math.PI / 8, baseR: 20, tipR: 38, baseHalfWidth: 3 }, fill: { material: "shadow_fire" } },
      { id: "horn_2", profile: "spike.radial", attach: { parent: "body", at: "base" }, params: { angle: Math.PI / 8, baseR: 20, tipR: 38, baseHalfWidth: 3 }, fill: { material: "shadow_fire" } },
      { id: "horn_3", profile: "spike.radial", attach: { parent: "body", at: "base" }, params: { angle: 5 * Math.PI / 8, baseR: 20, tipR: 38, baseHalfWidth: 3 }, fill: { material: "shadow_fire" } },
      { id: "horn_4", profile: "spike.radial", attach: { parent: "body", at: "base" }, params: { angle: -7 * Math.PI / 8, baseR: 20, tipR: 38, baseHalfWidth: 3 }, fill: { material: "shadow_fire" } },

      // Halo
      { id: "halo", profile: "bail", attach: { parent: "body", at: "base" }, params: { y: 14, rOuter: 11, rInner: 8 }, fill: { material: "shadow_fire" } },
      { id: "top_spire", profile: "spike.radial", attach: { parent: "halo", at: "base" }, params: { angle: -Math.PI / 2, baseR: 11, tipR: 44, baseHalfWidth: 2 }, fill: { material: "shadow_fire" } },
      { id: "bot_spire", profile: "spike.radial", attach: { parent: "body", at: "base" }, params: { angle: Math.PI / 2, baseR: 28, tipR: 44, baseHalfWidth: 2 }, fill: { material: "shadow_fire" } },

      // Gem
      { id: "gem", profile: "gem.round", attach: { parent: "body", at: "center" }, params: { r: 10 }, fill: { material: "ruby" }, motif: { kind: "facet", depth: 3 } }
    ]
  };
}

function main() {
  const spec = buildAmuletSpec();
  const bundle = forgeItemAsset(spec);
  writeFileSync(resolve(OUT_DIR, 'amulet-declarative.png'), renderBundlePng(bundle, 8));
  writeFileSync(resolve(OUT_DIR, 'amulet-declarative@2x.png'), renderBundlePng(bundle, 4));
  if (bundle.godotArtifact) {
    writeFileSync(resolve(OUT_DIR, 'amulet-declarative.pbrain'), bundle.godotArtifact, 'utf8');
  }
  writeFileSync(resolve(OUT_DIR, 'amulet-declarative.json'), JSON.stringify(bundle.assetPacket, null, 2), 'utf8');
  console.log('Declarative amulet generated successfully.');
}

main();
