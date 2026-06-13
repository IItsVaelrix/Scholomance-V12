import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { forgeItemAsset, renderBundlePng } from '../codex/core/pixelbrain/item-foundry.js';
import { exportFoundryToAsepriteBinary } from '../codex/core/pixelbrain/foundry-aseprite-bridge.js';
import { hashItemSpec } from '../codex/core/pixelbrain/item-spec.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '..', 'output', 'foundry', 'void-chestplate-pro');

export function buildVoidChestplateProSpec() {
  return {
    contract: 'ITEM-SPEC-v1',
    id: 'void.chestplate.pro.deterministic.v1',
    class: 'armor',
    archetype: 'chestplate',
    canvas: { width: 64, height: 80, gridSize: 1 },
    seed: 20260612,
    bytecode: 'VW-VOID-WILL-HARMONIC-PRO',
    bands: 7,
    symmetry: { axis: 'vertical', mode: 'strict' },
    proportions: {
      profile: 'ceremonial_exaggerated',
      allowOversizedPauldrons: true
    },
    fidelity: {
      qualityTarget: 'pro_game_icon',
      paletteBudget: 64,
      bevelStrength: 0.72,
      rimContrast: 0.82,
      centralGlowContainment: 0.88,
      noiseFloor: 'none'
    },
    parts: [
      {
        id: 'body',
        profile: 'armor.chestplate.void_royal',
        params: {
          shoulderWidth: 46,
          chestWidth: 38,
          waistWidth: 26,
          torsoHeight: 58
        },
        fill: { material: 'voidsteel' },
        trim: { material: 'void_gold' },
        outline: { material: 'blacksteel' }
      },
      {
        id: 'left_pauldron',
        profile: 'armor.pauldron.angular_royal',
        attach: { parent: 'body', at: 'leftShoulder' },
        fill: { material: 'sapphire_enamel' },
        trim: { material: 'void_gold' }
      },
      { id: 'right_pauldron', mirrorOf: 'left_pauldron' },
      {
        id: 'center_core',
        profile: 'gem.socket.void_orb',
        attach: { parent: 'body', at: 'centerChest' },
        fill: { material: 'void_core' },
        outline: { material: 'void_gold' },
        glow: { material: 'amethyst', radius: 4, containment: 0.88 }
      },
      {
        id: 'collar',
        profile: 'armor.collar.high_void',
        params: { neckWidth: 12 },
        attach: { parent: 'body', at: 'top' },
        fill: { material: 'obsidian', intensity: 'dark' },
        trim: { material: 'void_gold', anchor: 'deep' },
        outline: { material: 'blacksteel', anchor: 'shadow' },
      },
      {
        id: 'emblem',
        profile: 'heraldry.void_eye',
        attach: { parent: 'body', at: 'safeZoneCenter' },
        fill: { material: 'amethyst_resonance', anchor: 'frost' },
      }
    ]
  };
}

export function forgeVoidChestplatePro() {
  const bundle = forgeItemAsset(buildVoidChestplateProSpec(), {
    includeShader: false,
    includePng: true,
    pngScale: 6,
  });
  
  return { bundle };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { bundle } = forgeVoidChestplatePro();
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(resolve(OUT_DIR, 'void-chestplate-pro.json'), JSON.stringify(bundle.assetPacket, null, 2), 'utf8');
  writeFileSync(resolve(OUT_DIR, 'void-chestplate-pro.aseprite'), exportFoundryToAsepriteBinary(bundle));
  writeFileSync(resolve(OUT_DIR, 'void-chestplate-pro.png'), bundle.png);
  writeFileSync(resolve(OUT_DIR, 'void-chestplate-pro.1x.png'), renderBundlePng(bundle, 1));
  console.log(`forged void-chestplate-pro ${hashItemSpec(bundle.spec)} ${bundle.assetPacket.geometry.coordinates.length} cells`);
}
