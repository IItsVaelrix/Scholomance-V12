import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { forgeItemAsset, renderBundlePng } from '../codex/core/pixelbrain/item-foundry.js';
import { registerPartProfile } from '../codex/core/pixelbrain/part-profile-library.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '..', 'output', 'pixelbrain', 'kiteshield-v3');
mkdirSync(OUT_DIR, { recursive: true });

function roundInt(value) { return Math.round(Number(value) || 0); }

/**
 * Shield Silhouette Profile (V3-refined shape + V4 silhouette discipline)
 * True structural symmetry, quadratic taper, strong shoulder, crisp point.
 * This is the "master" evolution of the kite profile used for v2/v3/v4 iterations.
 */
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
    anchors: {
      base: { x: cx, y: top },
      tip: { x: cx, y: bottom },
      center: { x: cx, y: top + 24 }
    }
  };
});

// Dummy for virtual parts (rim/emblem are stamped via heraldry or templates)
registerPartProfile('none', () => ({ cells: [], anchors: { center: { x: 0, y: 0 }, base: { x: 0, y: 0 } } }));

const spec = {
  id: "sonic-thaumaturgist-kiteshield-v3",
  class: "armor",
  archetype: "kite_shield",
  bytecode: "VW-ROYAL-SONIC-THAUMATURGY-V3",
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
    // Explicit emblem parts so the heraldry-stamped cells get the bright sonic material.
    // This prevents the "black censor bar" problem.
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

  // Mastered Sonic Thaumaturgist emblem:
  // V3 clean vertical authority + V4 dynamic forked energy,
  // expressed as a tall, precisely defined tuning-fork + resonant tail
  // with sonic wave chevrons. Uses the new heraldry mark for crisp raster.
  heraldry: [
    {
      id: "emblem",
      mark: "sonic_thaumaturgist",
      style: { effect: "emit" },
      placement: { originX: 24, originY: 42 }
    }
  ]
};

console.log('[KiteShield V3] Forging master Sonic Thaumaturgist shield...');
const bundle = forgeItemAsset(spec, { includeShader: false, pngScale: 8 });

writeFileSync(resolve(OUT_DIR, 'kiteshield-v3.png'), renderBundlePng(bundle, 8));
writeFileSync(resolve(OUT_DIR, 'kiteshield-v3.1x.png'), renderBundlePng(bundle, 1));

console.log(`[KiteShield V3] Master asset written:`);
console.log(`  ${resolve(OUT_DIR, 'kiteshield-v3.png')}  (8×)`);
console.log(`  ${resolve(OUT_DIR, 'kiteshield-v3.1x.png')} (1×)`);
console.log('Done.');