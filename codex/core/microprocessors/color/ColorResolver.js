import { createByteMap, hslToHex, roundTo } from '../../pixelbrain/shared.js';
import {
  getKnownColorNames,
  lookupKnownColor,
  normalizeKnownColorName,
} from './named-color-registry.js';

const HEX_PATTERN = /^#?[0-9a-fA-F]{6}$/;

function clampByte(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(255, Math.round(number)));
}

function normalizeHex(hex) {
  const raw = String(hex || '').trim();
  if (!HEX_PATTERN.test(raw)) return null;
  return `#${raw.replace('#', '').toUpperCase()}`;
}

function hexToRgb(hex) {
  const normalized = normalizeHex(hex);
  if (!normalized) return null;
  const raw = normalized.slice(1);
  return {
    r: parseInt(raw.slice(0, 2), 16),
    g: parseInt(raw.slice(2, 4), 16),
    b: parseInt(raw.slice(4, 6), 16),
  };
}

function rgbToHex(rgb) {
  if (!rgb || typeof rgb !== 'object') return null;
  return `#${[rgb.r, rgb.g, rgb.b]
    .map((value) => clampByte(value).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;
}

function rgbToHsl({ r, g, b }) {
  const red = clampByte(r) / 255;
  const green = clampByte(g) / 255;
  const blue = clampByte(b) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  const l = (max + min) / 2;

  if (delta === 0) {
    return { h: 0, s: 0, l: roundTo(l * 100, 3) };
  }

  const s = delta / (1 - Math.abs((2 * l) - 1));
  let h = 0;
  switch (max) {
    case red: h = ((green - blue) / delta) % 6; break;
    case green: h = ((blue - red) / delta) + 2; break;
    default: h = ((red - green) / delta) + 4; break;
  }

  return {
    h: roundTo(((h * 60) + 360) % 360, 3),
    s: roundTo(s * 100, 3),
    l: roundTo(l * 100, 3),
  };
}

function luminanceFromRgb({ r, g, b }) {
  return roundTo(((0.2126 * clampByte(r)) + (0.7152 * clampByte(g)) + (0.0722 * clampByte(b))) / 255, 6);
}

function buildPalette(hsl, paletteSize = 3) {
  const size = Math.max(1, Math.min(8, Math.round(Number(paletteSize) || 3)));
  if (size === 1) return Object.freeze([hslToHex(hsl.h, hsl.s, hsl.l).toUpperCase()]);

  const colors = [];
  for (let index = 0; index < size; index += 1) {
    const ratio = index / (size - 1);
    const lightness = Math.max(4, Math.min(96, hsl.l - 22 + (ratio * 44)));
    const saturation = Math.max(0, Math.min(100, hsl.s - 8 + (ratio * 10)));
    colors.push(hslToHex(hsl.h, saturation, lightness).toUpperCase());
  }
  return Object.freeze(colors);
}

function resolveSourceColor(payload = {}) {
  const requested = payload.color ?? payload.name ?? payload.hex ?? null;
  const known = lookupKnownColor(requested);
  if (known) {
    return { ...known, hex: normalizeHex(known.hex) };
  }

  const hex = normalizeHex(payload.hex ?? payload.color);
  if (hex) {
    return {
      requested: String(payload.hex ?? payload.color),
      name: null,
      canonicalName: null,
      hex,
      source: 'hex',
      aliasOf: null,
    };
  }

  const rgbHex = rgbToHex(payload.rgb);
  if (rgbHex) {
    return {
      requested: 'rgb',
      name: null,
      canonicalName: null,
      hex: rgbHex,
      source: 'rgb',
      aliasOf: null,
    };
  }

  return null;
}

export function resolveKnownColor(payload = {}, context = {}) {
  const resolved = resolveSourceColor(payload);
  if (!resolved) {
    return {
      ok: false,
      error: 'UNKNOWN_COLOR',
      requested: payload?.color ?? payload?.name ?? payload?.hex ?? payload?.rgb ?? null,
      knownColorCount: getKnownColorNames().length,
    };
  }

  const rgb = hexToRgb(resolved.hex);
  const hsl = rgbToHsl(rgb);
  const palette = buildPalette(hsl, payload.paletteSize ?? context.paletteSize);
  const processorId = resolved.name ? `color.resolve.${normalizeKnownColorName(resolved.name)}` : 'color.resolve';

  return {
    ok: true,
    processorId,
    requested: resolved.requested,
    name: resolved.name,
    canonicalName: resolved.canonicalName,
    aliasOf: resolved.aliasOf,
    source: resolved.source,
    hex: resolved.hex,
    rgb,
    hsl,
    luminance: luminanceFromRgb(rgb),
    palette,
    byteMap: createByteMap(palette),
    knownColorCount: getKnownColorNames().length,
  };
}

export function createColorResolverProcessor(colorName) {
  const fixedColor = String(colorName || '').trim();
  return (payload = {}, context = {}) => resolveKnownColor({
    ...payload,
    color: fixedColor,
  }, context);
}
