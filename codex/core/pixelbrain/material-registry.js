export const SOURCE_MATERIAL = 'source';
export const MATERIAL_REGISTRY_VERSION = '0.1.0';

export const MATERIAL_PALETTES = Object.freeze({
  [SOURCE_MATERIAL]: Object.freeze({
    id: SOURCE_MATERIAL,
    label: 'Source',
    anchors: Object.freeze({}),
    rules: Object.freeze({
      preserveAlpha: true,
      preserveShape: true,
      passthrough: true,
    }),
  }),
  icy_fire: Object.freeze({
    id: 'icy_fire',
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
  shadow_fire: Object.freeze({
    id: 'shadow_fire',
    label: 'Shadow Fire',
    anchors: Object.freeze({
      void: '#030106',
      shadow: '#12051D',
      deep: '#2E1065',
      body: '#7C3AED',
      frost: '#A78BFA',
      spectral: '#DDD6FE',
      whiteCore: '#FAF5FF',
    }),
    rules: Object.freeze({ preserveAlpha: true, preserveShape: true, deepenLowValuesToBlack: true }),
  }),
  holy_fire: Object.freeze({
    id: 'holy_fire',
    label: 'Holy Fire',
    anchors: Object.freeze({
      void: '#160F02',
      shadow: '#3A2704',
      deep: '#92400E',
      body: '#F59E0B',
      frost: '#FDE68A',
      spectral: '#FEF3C7',
      whiteCore: '#FFFBEB',
    }),
    rules: Object.freeze({ preserveAlpha: true, preserveShape: true, boostHighlightsToWhite: true }),
  }),
  poison_flame: Object.freeze({
    id: 'poison_flame',
    label: 'Poison Flame',
    anchors: Object.freeze({
      void: '#020A04',
      shadow: '#052E16',
      deep: '#166534',
      body: '#22C55E',
      frost: '#86EFAC',
      spectral: '#BBF7D0',
      whiteCore: '#F0FDF4',
    }),
    rules: Object.freeze({ preserveAlpha: true, preserveShape: true, forceColdHue: false }),
  }),
  void_ice: Object.freeze({
    id: 'void_ice',
    label: 'Void Ice',
    anchors: Object.freeze({
      void: '#00030A',
      shadow: '#020617',
      deep: '#1E1B4B',
      body: '#3730A3',
      frost: '#A5B4FC',
      spectral: '#C7D2FE',
      whiteCore: '#EEF2FF',
    }),
    rules: Object.freeze({ preserveAlpha: true, preserveShape: true, deepenLowValuesToBlack: true }),
  }),
});

export const MATERIAL_OPTIONS = Object.freeze(
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

export function resolveMaterialId(material) {
  const key = String(material || SOURCE_MATERIAL).trim();
  return MATERIAL_PALETTES[key] ? key : SOURCE_MATERIAL;
}

export function getMaterialDefinition(material = SOURCE_MATERIAL) {
  return MATERIAL_PALETTES[resolveMaterialId(material)];
}

export function hexToRgb(hex) {
  const raw = String(hex || '').trim().replace('#', '');
  const normalized = raw.length === 3
    ? raw.split('').map((char) => `${char}${char}`).join('')
    : raw;
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;
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

function pickAnchoredColor(luma, anchors) {
  if (luma >= 0.88) return anchors.whiteCore;
  if (luma >= 0.66) return anchors.spectral;
  if (luma >= 0.58) return anchors.glacialLavender || anchors.frost || anchors.spectral;
  if (luma >= 0.52) return anchors.frost || anchors.body;
  if (luma >= 0.34) return anchors.body;
  if (luma >= 0.18) return anchors.deep;
  if (luma >= 0.07) return anchors.shadow;
  return anchors.void;
}

export function transmuteMaterialColor(hex, material = 'icy_fire') {
  const materialId = resolveMaterialId(material);
  const definition = MATERIAL_PALETTES[materialId];
  if (materialId === SOURCE_MATERIAL || definition.rules?.passthrough) return hex;

  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return pickAnchoredColor(luminanceFromRgb(rgb), definition.anchors);
}

export function transmuteMaterialPalette(sourcePalette, material = 'icy_fire') {
  if (!Array.isArray(sourcePalette)) return [];
  return sourcePalette.map((hex) => transmuteMaterialColor(hex, material));
}

export function transmuteMaterialPalettes(palettes, material = 'icy_fire') {
  if (!Array.isArray(palettes)) return [];
  const materialId = resolveMaterialId(material);
  return palettes.map((palette) => {
    const sourceColors = Array.isArray(palette?.colors) ? palette.colors : [];
    return {
      ...palette,
      colors: transmuteMaterialPalette(sourceColors, materialId),
      sourceColors,
      chromaticMaterial: materialId,
      materialRegistryVersion: MATERIAL_REGISTRY_VERSION,
    };
  });
}

export function transmuteMaterialCoordinates(coordinates, material = 'icy_fire') {
  if (!Array.isArray(coordinates)) return [];
  const materialId = resolveMaterialId(material);
  return coordinates.map((coord) => {
    if (!coord || typeof coord !== 'object' || typeof coord.color !== 'string') return coord;
    return {
      ...coord,
      sourceColor: coord.sourceColor || coord.color,
      color: transmuteMaterialColor(coord.color, materialId),
      chromaticMaterial: materialId,
    };
  });
}
