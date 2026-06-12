import { clamp01, hashString } from './shared.js';

export const COLOR_INTENSITY_MICROPROCESSOR_ID = 'pixelbrain.colorIntensity.rate';
export const COLOR_INTENSITY_VERSION = '0.1.0';

const BANDS = [
  { max: 0.24, label: 'muted' },
  { max: 0.49, label: 'normal' },
  { max: 0.69, label: 'vivid' },
  { max: 0.89, label: 'intense' },
  { max: 1.00, label: 'extreme' }
];

function toFiniteNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function parseHexColor(hex) {
  const raw = String(hex || '').trim().replace('#', '');
  const normalized = raw.length === 3
    ? raw.split('').map((char) => `${char}${char}`).join('')
    : raw;
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return { r: 0, g: 0, b: 0 };
  const value = parseInt(normalized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function getHSL(rgb) {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const luma = clamp01(((0.2126 * rgb.r) + (0.7152 * rgb.g) + (0.0722 * rgb.b)) / 255);
  
  let h = 0;
  let s = 0;
  let l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  
  const chroma = max - min;
  return { h, s, l, luma, chroma };
}

function determineBand(rating) {
  for (const band of BANDS) {
    if (rating <= band.max) return band.label;
  }
  return 'extreme';
}

function coordinateKey(coord) {
  const x = Math.round(toFiniteNumber(coord?.snappedX ?? coord?.x, 0));
  const y = Math.round(toFiniteNumber(coord?.snappedY ?? coord?.y, 0));
  return `${x},${y}`;
}

export function rateColorIntensity(hex, context = {}) {
  const rgb = parseHexColor(hex);
  const { h, s, luma, chroma } = getHSL(rgb);
  const localContrast = clamp01(toFiniteNumber(context.localContrast, 0));
  
  const whiteCoreScore = luma >= 0.9 ? clamp01((luma - 0.9) / 0.1) : 0;
  const blackAnchorScore = luma <= 0.1 ? clamp01((0.1 - luma) / 0.1) : 0;
  
  const saturationScore = s;
  const chromaScore = chroma;
  const localContrastScore = localContrast;

  let rating = Math.max(
    whiteCoreScore,
    blackAnchorScore,
    saturationScore * 0.82,
    chromaScore * 0.78,
    localContrastScore * 0.72
  );
  
  rating = clamp01(rating);
  
  let role = 'neutral';
  if (whiteCoreScore > 0.8) {
    role = 'white_core';
  } else if (blackAnchorScore > 0.8) {
    role = 'black_anchor';
  } else if (localContrastScore > 0.8 && rating >= 0.7) {
    role = 'local_contrast';
  } else if (chroma > 0.5) {
    role = h >= 0.85 || h <= 0.15 || (h >= 0.25 && h <= 0.45) ? 'hot_chroma' : 'cold_chroma'; 
  }
  
  return {
    rating,
    band: determineBand(rating),
    luma,
    saturation: s,
    chroma,
    localContrast,
    role,
  };
}

export function rateCoordinateColorIntensity(coord, context = {}) {
  const { coordinateMap = new Map(), radius = 1 } = context;
  
  let localContrast = 0;
  if (coordinateMap.size > 0) {
    const x = Math.round(toFiniteNumber(coord?.snappedX ?? coord?.x, 0));
    const y = Math.round(toFiniteNumber(coord?.snappedY ?? coord?.y, 0));
    let neighborLumas = [];
    const rgb = parseHexColor(coord.color);
    const centerLuma = getHSL(rgb).luma;

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx === 0 && dy === 0) continue;
        const neighbor = coordinateMap.get(`${x + dx},${y + dy}`);
        if (neighbor && neighbor.color) {
          const nRgb = parseHexColor(neighbor.color);
          neighborLumas.push(getHSL(nRgb).luma);
        }
      }
    }
    
    if (neighborLumas.length > 0) {
      const avgNeighborLuma = neighborLumas.reduce((a, b) => a + b, 0) / neighborLumas.length;
      localContrast = Math.abs(centerLuma - avgNeighborLuma);
    }
  }

  const intensity = rateColorIntensity(coord.color, { localContrast });
  
  return {
    ...coord,
    colorIntensity: intensity,
  };
}

export function annotateCoordinateColorIntensity(coordinates, options = {}) {
  if (!Array.isArray(coordinates)) return [];
  
  const coordinateMap = new Map();
  coordinates.forEach((coord) => {
    if (coord && typeof coord === 'object') coordinateMap.set(coordinateKey(coord), coord);
  });
  
  const context = {
    coordinateMap,
    radius: options.neighborRadius || 1,
  };
  
  return coordinates.map(coord => rateCoordinateColorIntensity(coord, context));
}

export function buildColorIntensityPayload(input) {
  const { coordinates = [], options = {}, intent = 'annotate_intensity' } = input || {};
  const outputCoordinates = annotateCoordinateColorIntensity(coordinates, options);
  
  return Object.freeze({
    amp: COLOR_INTENSITY_MICROPROCESSOR_ID,
    version: COLOR_INTENSITY_VERSION,
    intent,
    inputHash: hashString(JSON.stringify(coordinates.map((coord) => [coord?.x, coord?.y, coord?.color]))).toString(16),
    sourceCoordinates: coordinates,
    outputCoordinates,
    diagnostics: Object.freeze({
      coordinateCount: coordinates.length,
    }),
  });
}

export function runColorIntensityProcessor(payload, context) {
  return buildColorIntensityPayload(payload);
}
