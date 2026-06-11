export const SOURCE_MATERIAL = 'source';

export const MATERIAL_PALETTES = Object.freeze({
  [SOURCE_MATERIAL]: Object.freeze({
    label: 'Source',
    anchors: Object.freeze({}),
    rules: Object.freeze({
      preserveAlpha: true,
      preserveShape: true,
      passthrough: true,
    }),
  }),
  icy_fire: Object.freeze({
    label: 'Icy Fire',
    anchors: Object.freeze({
      void: '#02070A',
      shadow: '#06131C',
      deep: '#06324A',
      body: '#0EA5E9',
      frost: '#7DD3FC',
      whiteCore: '#F8FCFF',
      spectral: '#B8F7FF',
      glacialLavender: '#C7D2FE',
      moonlitGray: '#CBD5E1',
    }),
    rules: Object.freeze({
      preserveAlpha: true,
      preserveShape: true,
      forceColdHue: true,
      boostHighlightsToWhite: true,
      deepenLowValuesToBlack: true,
      desaturateMidtones: true,
    }),
  }),
});

export const CHROMATIC_MATERIAL_OPTIONS = Object.freeze(
  Object.entries(MATERIAL_PALETTES).map(([value, config]) => Object.freeze({
    value,
    label: config.label || value,
  }))
);

export function clamp01(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(1, numeric));
}

export function hexToRgb(hex) {
  const raw = String(hex || '').trim().replace('#', '');
  const normalized = raw.length === 3
    ? raw.split('').map((char) => `${char}${char}`).join('')
    : raw;

  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return null;
  }

  const value = parseInt(normalized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

export function luminanceFromRgb(rgb) {
  if (!rgb) return 0;
  return clamp01(((0.2126 * rgb.r) + (0.7152 * rgb.g) + (0.0722 * rgb.b)) / 255);
}

function resolveMaterial(material) {
  const key = String(material || SOURCE_MATERIAL);
  return MATERIAL_PALETTES[key] ? key : SOURCE_MATERIAL;
}

function pickIcyFireColor(luma, anchors) {
  if (luma >= 0.88) return anchors.whiteCore;
  if (luma >= 0.66) return anchors.spectral;
  if (luma >= 0.58) return anchors.glacialLavender;
  if (luma >= 0.52) return anchors.frost;
  if (luma >= 0.34) return anchors.body;
  if (luma >= 0.18) return anchors.deep;
  if (luma >= 0.07) return anchors.shadow;

  return anchors.void;
}

export function transmutePaletteColor(hex, material = 'icy_fire') {
  const resolvedMaterial = resolveMaterial(material);
  const palette = MATERIAL_PALETTES[resolvedMaterial];

  if (resolvedMaterial === SOURCE_MATERIAL || palette?.rules?.passthrough) {
    return hex;
  }

  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const luma = luminanceFromRgb(rgb);
  if (resolvedMaterial === 'icy_fire') {
    return pickIcyFireColor(luma, palette.anchors);
  }

  return hex;
}

export function transmutePixelBrainPalette(sourcePalette, material = 'icy_fire') {
  if (!Array.isArray(sourcePalette)) return [];
  return sourcePalette.map((hex) => transmutePaletteColor(hex, material));
}

export function transmutePixelBrainPalettes(palettes, material = 'icy_fire') {
  if (!Array.isArray(palettes)) return [];

  return palettes.map((palette) => {
    const sourceColors = Array.isArray(palette?.colors) ? palette.colors : [];
    return {
      ...palette,
      colors: transmutePixelBrainPalette(sourceColors, material),
      sourceColors,
      chromaticMaterial: resolveMaterial(material),
    };
  });
}

export function buildChromaticColorMap({ sourcePalette = [], outputPalette = [] } = {}) {
  const map = {};
  sourcePalette.forEach((sourceColor, index) => {
    const outputColor = outputPalette[index];
    if (typeof sourceColor === 'string' && typeof outputColor === 'string') {
      map[sourceColor.toUpperCase()] = outputColor;
      map[sourceColor.toLowerCase()] = outputColor;
    }
  });
  return map;
}

function deriveFlatSourcePalette(sourcePalette, sourcePalettes) {
  if (Array.isArray(sourcePalette) && sourcePalette.length > 0) {
    return sourcePalette;
  }

  const flat = [];
  (Array.isArray(sourcePalettes) ? sourcePalettes : []).forEach((palette) => {
    if (Array.isArray(palette?.colors)) flat.push(...palette.colors);
  });
  return flat;
}

export function transmutePixelBrainCoordinates(coordinates, material = 'icy_fire') {
  if (!Array.isArray(coordinates)) return [];

  return coordinates.map((coord) => {
    if (!coord || typeof coord !== 'object' || typeof coord.color !== 'string') {
      return coord;
    }

    return {
      ...coord,
      sourceColor: coord.sourceColor || coord.color,
      color: transmutePaletteColor(coord.color, material),
      chromaticMaterial: resolveMaterial(material),
    };
  });
}

export function buildChromaticTransmutationPayload({
  sourcePalette,
  sourcePalettes,
  sourceCoordinates,
  material = 'icy_fire',
  intent = 'transmute_fire_to_icy_fire',
} = {}) {
  const resolvedMaterial = resolveMaterial(material);
  const flatSourcePalette = deriveFlatSourcePalette(sourcePalette, sourcePalettes);
  const outputPalette = transmutePixelBrainPalette(flatSourcePalette, resolvedMaterial);
  const outputPalettes = transmutePixelBrainPalettes(sourcePalettes, resolvedMaterial);
  const outputCoordinates = transmutePixelBrainCoordinates(sourceCoordinates, resolvedMaterial);

  return {
    amp: 'chromatic-transmutation',
    version: '0.1.0',
    intent,
    material: resolvedMaterial,
    sourcePalette: flatSourcePalette,
    outputPalette,
    sourcePalettes: Array.isArray(sourcePalettes) ? sourcePalettes : [],
    outputPalettes,
    sourceCoordinates: Array.isArray(sourceCoordinates) ? sourceCoordinates : [],
    outputCoordinates,
    colorMap: buildChromaticColorMap({ sourcePalette: flatSourcePalette, outputPalette }),
  };
}
