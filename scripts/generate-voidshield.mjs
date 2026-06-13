/* eslint-env node */
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { forgeItemAsset, renderBundlePng } from '../codex/core/pixelbrain/item-foundry.js';
import { registerPartProfile } from '../codex/core/pixelbrain/part-profile-library.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '..', 'output', 'pixelbrain', 'voidshield');
mkdirSync(OUT_DIR, { recursive: true });

function roundInt(value) { return Math.round(Number(value) || 0); }

// Custom shield base for void shield
registerPartProfile('shield.void_base', (params = {}, options = {}) => {
  const cx = roundInt(params.cx ?? options.width / 2);
  const cy = roundInt(params.cy ?? options.height / 2);
  const rx = roundInt(params.rx ?? 28);
  const ry = roundInt(params.ry ?? 32);
  const cells = [];
  for (let y = -ry; y <= ry; y += 1) {
    for (let x = -rx; x <= rx; x += 1) {
      if (Math.hypot(x / Math.max(1, rx), y / Math.max(1, ry)) <= 1) {
        cells.push({ x: cx + x, y: cy + y });
      }
    }
  }
  return { cells, anchors: { center: { x: cx, y: cy }, base: { x: cx, y: cy - ry } } };
});

const spec = {
  contract: 'ITEM-SPEC-v1',
  id: "void-shield",
  class: "armor",
  archetype: "void_shield",
  bytecode: "VW-VOID-AEGIS",
  canvas: { width: 96, height: 96, gridSize: 1 },
  bands: 8,
  light: { angle: Math.PI * 1.25, ambient: 0.3 },
  parts: [
    {
      id: "base",
      profile: "shield.void_base",
      params: { cx: 48, cy: 48, rx: 34, ry: 38 },
      fill: { material: "black_steel" },
      outline: { material: "gold" }
    },
    // Outer Ring
    {
      id: "ring3",
      profile: "bail",
      attach: { parent: "base", at: "center" },
      params: { rOuter: 30, rInner: 26 },
      fill: { material: "void_ice" },
      outline: { material: "shadow_fire", anchor: "body" }
    },
    // Mid Ring
    {
      id: "ring2",
      profile: "bail",
      attach: { parent: "base", at: "center" },
      params: { rOuter: 22, rInner: 18 },
      fill: { material: "void_ice" },
      outline: { material: "shadow_fire", anchor: "body" }
    },
    // Inner Ring
    {
      id: "ring1",
      profile: "bail",
      attach: { parent: "base", at: "center" },
      params: { rOuter: 14, rInner: 10 },
      fill: { material: "void_ice" },
      outline: { material: "shadow_fire", anchor: "body" }
    },
    // Strong Focal Center
    {
      id: "core",
      profile: "gem.round",
      attach: { parent: "base", at: "center" },
      params: { r: 6 },
      fill: { material: "holy_fire" },
      motif: { kind: "facet", depth: 4 },
      outline: { material: "gold" }
    }
  ]
};

function main() {
  const bundle = forgeItemAsset(spec, { includeShader: false });
  writeFileSync(resolve(OUT_DIR, 'voidshield.png'), renderBundlePng(bundle, 8));
  writeFileSync(resolve(OUT_DIR, 'voidshield@2x.png'), renderBundlePng(bundle, 4));
  writeFileSync(resolve(OUT_DIR, 'voidshield.1x.png'), renderBundlePng(bundle, 1));
  console.log(`Generated Void Shield at ${resolve(OUT_DIR, 'voidshield.png')}`);
}

main();
