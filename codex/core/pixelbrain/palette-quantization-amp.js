/**
 * palette-quantization-amp.js
 *
 * Deterministic final palette budget enforcement. The palette is built from
 * material registry anchors referenced by the spec, then nearest-color mapped.
 */

import { MATERIAL_PALETTES, resolveMaterialId } from './material-registry.js';

const ANCHOR_ORDER = Object.freeze(['void', 'shadow', 'deep', 'body', 'frost', 'spectral', 'whiteCore']);

function parseHex(hex) {
  const raw = String(hex || '').replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) return null;
  const n = parseInt(raw, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function distance(a, b) {
  return ((a.r - b.r) ** 2) + ((a.g - b.g) ** 2) + ((a.b - b.b) ** 2);
}

function uniquePush(list, color) {
  if (color && !list.includes(color)) list.push(color);
}

function collectSpecPalette(spec) {
  const colors = [];
  for (const part of spec.parts || []) {
    for (const field of ['fill', 'trim', 'outline', 'wrap']) {
      const target = part[field];
      if (!target?.material) continue;
      const def = MATERIAL_PALETTES[resolveMaterialId(target.material)];
      if (!def?.anchors) continue;
      if (target.anchor && def.anchors[target.anchor]) {
        uniquePush(colors, def.anchors[target.anchor]);
      }
      for (const key of ANCHOR_ORDER) uniquePush(colors, def.anchors[key]);
    }
    for (const target of [part.motif?.core, part.motif?.glow, part.glow]) {
      if (!target?.material) continue;
      const def = MATERIAL_PALETTES[resolveMaterialId(target.material)];
      if (!def?.anchors) continue;
      for (const key of ANCHOR_ORDER) uniquePush(colors, def.anchors[key]);
    }
  }
  return colors;
}

function nearestColor(color, paletteRgb) {
  const rgb = parseHex(color);
  if (!rgb || paletteRgb.length === 0) return color;
  let best = paletteRgb[0];
  let bestDistance = Infinity;
  for (const entry of paletteRgb) {
    const d = distance(rgb, entry.rgb);
    if (d < bestDistance || (d === bestDistance && entry.color < best.color)) {
      best = entry;
      bestDistance = d;
    }
  }
  return best.color;
}

export function applyPaletteQuantization(coordinates, spec) {
  if (!Array.isArray(coordinates)) return Object.freeze({ coordinates: [], diagnostics: { uniqueColors: 0 } });
  const budget = spec.fidelity?.paletteBudget || null;
  if (!budget) {
    const uniqueColors = new Set(coordinates.map((cell) => cell.color).filter(Boolean)).size;
    return Object.freeze({ coordinates, diagnostics: Object.freeze({ uniqueColors, budget: null, changedCount: 0 }) });
  }

  const sourcePalette = collectSpecPalette(spec);
  const uniqueOriginal = [...new Set(coordinates.map((cell) => cell.color).filter(Boolean))].sort();
  for (const color of uniqueOriginal) uniquePush(sourcePalette, color);
  const palette = sourcePalette.slice(0, Math.max(1, budget));
  const paletteRgb = palette
    .map((color) => ({ color, rgb: parseHex(color) }))
    .filter((entry) => entry.rgb);

  let changedCount = 0;
  const output = coordinates.map((cell) => {
    const color = nearestColor(cell.color, paletteRgb);
    if (color !== cell.color) changedCount += 1;
    return color === cell.color ? cell : { ...cell, color, quantizedFrom: cell.color };
  });
  const uniqueColors = new Set(output.map((cell) => cell.color).filter(Boolean)).size;

  return Object.freeze({
    coordinates: Object.freeze(output),
    diagnostics: Object.freeze({
      amp: 'pixelbrain.palette-quantization-amp',
      version: '1.0.0',
      budget,
      uniqueInputColors: uniqueOriginal.length,
      uniqueColors,
      palette: Object.freeze(palette),
      changedCount,
      ok: uniqueColors <= budget,
    }),
  });
}
