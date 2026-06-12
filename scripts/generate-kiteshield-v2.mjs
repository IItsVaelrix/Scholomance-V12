import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { forgeItemAsset, renderBundlePng } from '../codex/core/pixelbrain/item-foundry.js';
import { registerPartProfile } from '../codex/core/pixelbrain/part-profile-library.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '..', 'output', 'pixelbrain', 'kiteshield-v2');
mkdirSync(OUT_DIR, { recursive: true });

function roundInt(value) { return Math.round(Number(value) || 0); }

// Shield Silhouette Profile (True structural symmetry)
registerPartProfile('shield.kite', (params = {}, options = {}) => {
  const cx = roundInt(params.cx ?? options.width / 2);
  const top = roundInt(params.top ?? 16);
  const bottom = roundInt(params.bottom ?? 80);
  
  function shieldHalfWidth(y) {
    if (y < top) return 0;
    if (y > bottom) return 0;
    if (y <= top + 4) return 14 + (y - top);
    if (y <= top + 24) return 18;
    const t = (y - (top + 24)) / (bottom - (top + 24));
    return Math.round(18 * (1 - t * t));
  }

  const cells = [];
  for (let y = top; y <= bottom; y += 1) {
    const half = shieldHalfWidth(y);
    for (let dx = -half; dx <= half; dx += 1) cells.push({ x: cx + dx, y });
  }

  return {
    cells,
    anchors: { base: { x: cx, y: top }, tip: { x: cx, y: bottom }, center: { x: cx, y: top + 24 } }
  };
});

// Shield Crossbrace Profile (Bilateral discipline)
registerPartProfile('shield.crossbrace', (params = {}, options = {}) => {
  const cx = roundInt(params.cx ?? options.width / 2);
  const top = roundInt(params.top ?? 24);
  const widthAt = roundInt(params.width ?? 18);
  const height = roundInt(params.height ?? 6);
  const cells = [];
  for(let y = top; y <= top + height; y++) {
    for(let dx = -widthAt; dx <= widthAt; dx++) cells.push({ x: cx + dx, y });
  }
  return { cells, anchors: { base: { x: cx, y: top }, center: { x: cx, y: top } } };
});

// Dummy profile for virtual parts
registerPartProfile('none', () => ({ cells: [], anchors: { center: { x: 0, y: 0 }, base: { x: 0, y: 0 } } }));

const ROYAL_BLUE_RAMP = ['#0A1128', '#102A5C', '#1D4ED8', '#3B82F6', '#93C5FD'];
const GOLD_RIM = '#FBBF24';
const GOLD_RAMP = ['#78350F', '#B45309', '#D97706', '#F59E0B', '#FCD34D'];
const SONIC_CYAN_CORE = '#E0F2FE';
const SONIC_CYAN_GLOW = '#06B6D4';

const spec = {
  id: "royal-kiteshield-v2",
  class: "armor",
  archetype: "kite_shield",
  bytecode: "VW-ROYAL-SONIC-THAUMATURGY-V2",
  canvas: { width: 48, height: 96, gridSize: 1 },
  bands: 8,
  light: { angle: Math.PI * 1.25, ambient: 0.3 },
  parts: [
    {
      id: "face",
      profile: "shield.kite",
      params: { cx: 24, top: 16, bottom: 80 },
      fill: { material: "sapphire_enamel" },
      outline: { material: "darksteel" }
    },
    {
      id: "rim",
      profile: "none",
      attach: { parent: "face", at: "center" },
      fill: { material: "bronze" },
      outline: { material: "bronze", anchor: "body" },
      params: { thickness: 3 }
    },
    {
      id: "emblem",
      profile: "none",
      attach: { parent: "face", at: "center" },
      fill: { material: "cyan_lightning" }
    },
    {
      id: "emblem_glow",
      profile: "none",
      attach: { parent: "face", at: "center" },
      fill: { material: "cyan_glow" }
    }
  ],
  heraldry: [
    {
      id: "emblem",
      mark: "lightning",
      style: { effect: "emit", coreMaterial: "cyan_lightning", glowMaterial: "cyan_glow", glowRadius: 1 },
      placement: { originX: 24, originY: 22 }
    }
  ]
};

const bundle = forgeItemAsset(spec, { includeShader: false });
writeFileSync(resolve(OUT_DIR, 'kiteshield-v2.png'), renderBundlePng(bundle, 8));
writeFileSync(resolve(OUT_DIR, 'kiteshield-v2.1x.png'), renderBundlePng(bundle, 1));
console.log(`Generated Kiteshield V2 at ${resolve(OUT_DIR, 'kiteshield-v2.png')}`);
