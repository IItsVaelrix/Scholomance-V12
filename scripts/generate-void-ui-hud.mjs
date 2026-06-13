/**
 * VOID UI HUD Generator using PixelBrain
 * Generates arcane/futuristic mystical HUD elements for the MMORPG free-roam combat page.
 * Palette: obsidian, indigo, purple, crimson, silver.
 * Elements "breathe" – designed with glow layers for Phaser animations (pulse alpha/scale).
 * Mysticism: runes, geometric sigils, energy flows, resonance cores.
 *
 * Run: node scripts/generate-void-ui-hud.mjs
 * Outputs to output/foundry/void-ui-hud/ (copy PNGs to public/assets/ for Phaser)
 * Then use in CombatHUDScene.js preload + create.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { forgeItemAsset, renderBundlePng } from '../codex/core/pixelbrain/item-foundry.js';
import { hashItemSpec } from '../codex/core/pixelbrain/item-spec.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_ROOT = resolve(__dirname, '..', 'output', 'foundry', 'void-ui-hud');

mkdirSync(OUT_ROOT, { recursive: true });

// Helper to build a simple UI spec using the profiles
function buildUISpec(name, profile, params = {}, canvas = { width: 256, height: 64 }) {
  return {
    contract: 'ITEM-SPEC-v1',
    id: `ui.void.${name}.v1`,
    class: 'ui',
    archetype: 'arcane_hud',
    canvas,
    seed: 0xBADDCAFE + name.length,
    bytecode: 'VW-VOID-MYSTIC',
    bands: 4,
    light: { angle: Math.PI * 1.2, ambient: 0.3 },
    parts: [
      {
        id: 'main',
        profile,
        params,
        fill: { material: 'source' }, // Colors are baked in the profile for precision
      },
    ],
  };
}

const specs = [
  // Hotbar background bar (long mystical bar with energy lines)
  {
    name: 'hotbar',
    spec: buildUISpec('hotbar', 'ui.hotbar.bar', { width: 520, height: 72 }, { width: 520, height: 72 }),
  },
  // Individual slot frame (for abilities – small arcane socket)
  {
    name: 'slot',
    spec: buildUISpec('slot', 'ui.slot', { size: 52 }, { width: 52, height: 52 }),
  },
  // Minimap border (arcane compass circle)
  {
    name: 'minimap_border',
    spec: buildUISpec('minimap_border', 'ui.minimap.border', { size: 172 }, { width: 172, height: 172 }),
  },
  // Chatbox frame (tall mystical window with rune sides)
  {
    name: 'chatbox',
    spec: buildUISpec('chatbox', 'ui.chatbox.frame', { width: 340, height: 172 }, { width: 340, height: 172 }),
  },
  // Player indicator frame (portrait holder with breathing core)
  {
    name: 'player_indicator',
    spec: buildUISpec('player_indicator', 'ui.indicator.player', { size: 68 }, { width: 68, height: 68 }),
  },
  // Enemy indicator / reticle (pulsing lock-on)
  {
    name: 'enemy_indicator',
    spec: buildUISpec('enemy_indicator', 'ui.indicator.enemy', { size: 44 }, { width: 44, height: 44 }),
  },
];

console.log('Generating VOID Arcane HUD assets with PixelBrain...');

for (const { name, spec } of specs) {
  const bundle = forgeItemAsset(spec, { includeShader: false, includePng: true, pngScale: 1 });
  
  const outName = `void_hud_${name}`;
  writeFileSync(resolve(OUT_ROOT, `${outName}.json`), JSON.stringify(bundle.assetPacket, null, 2), 'utf8');
  writeFileSync(resolve(OUT_ROOT, `${outName}.png`), bundle.png);
  
  console.log(`  forged ${outName}  (${bundle.assetPacket.geometry.coordinates.length} cells)  → ${OUT_ROOT}/${outName}.png`);
  
  // Also output a 2x for crisp scaling if needed
  writeFileSync(resolve(OUT_ROOT, `${outName}@2x.png`), renderBundlePng(bundle, 2));
}

console.log('\nDone. Copy the .png files from output/foundry/void-ui-hud/ to public/assets/');
console.log('Then update CombatHUDScene.js preload() and create() to use these images for the frames.');
console.log('For breathing: In Phaser, tween the images (e.g. scale 1.0 ↔ 1.03, alpha pulse on glow layers) synced to a resonance sine wave.');
console.log('Example: this.tweens.add({ targets: hotbar, scaleX: 1.02, scaleY: 1.02, duration: 1200, yoyo: true, repeat: -1 });');

// Bonus: Generate a combined hotbar with slots for demo (optional full bar)
console.log('\nBonus: You can composite the hotbar + slots in Phaser for the final layout.');