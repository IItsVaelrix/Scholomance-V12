export const SOURCE_MATERIAL = 'source';
export const MATERIAL_REGISTRY_VERSION = '0.2.0';

export const MATERIAL_CATEGORIES = Object.freeze({
  SOURCE: 'source',
  FLAME: 'flame',
  GEMSTONE: 'gemstone',
  METAL: 'metal',
});

export const MATERIAL_PALETTES = Object.freeze({
  [SOURCE_MATERIAL]: Object.freeze({
    id: SOURCE_MATERIAL,
    label: 'Source',
    category: MATERIAL_CATEGORIES.SOURCE,
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
    category: MATERIAL_CATEGORIES.FLAME,
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
    category: MATERIAL_CATEGORIES.FLAME,
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
    category: MATERIAL_CATEGORIES.FLAME,
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
    category: MATERIAL_CATEGORIES.FLAME,
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
    category: MATERIAL_CATEGORIES.FLAME,
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
  sapphire_enamel: Object.freeze({
    id: 'sapphire_enamel',
    label: 'Sapphire Enamel',
    category: MATERIAL_CATEGORIES.GEMSTONE,
    anchors: Object.freeze({
      void: '#0A1128',
      shadow: '#102A5C',
      deep: '#1D4ED8',
      body: '#3B82F6',
      frost: '#93C5FD',
      spectral: '#DBEAFE',
      whiteCore: '#F0F9FF',
    }),
    rules: Object.freeze({ preserveAlpha: true, preserveShape: true }),
  }),
  cyan_lightning: Object.freeze({
    id: 'cyan_lightning',
    label: 'Cyan Lightning',
    category: MATERIAL_CATEGORIES.FLAME,
    anchors: Object.freeze({
      body: '#E0F2FE',
    }),
    rules: Object.freeze({ preserveAlpha: true, preserveShape: true }),
  }),
  cyan_glow: Object.freeze({
    id: 'cyan_glow',
    label: 'Cyan Glow',
    category: MATERIAL_CATEGORIES.FLAME,
    anchors: Object.freeze({
      body: '#06B6D4',
    }),
    rules: Object.freeze({ preserveAlpha: true, preserveShape: true }),
  }),
  darksteel: Object.freeze({
    id: 'darksteel',
    label: 'Darksteel',
    category: MATERIAL_CATEGORIES.METAL,
    anchors: Object.freeze({
      void: '#000000',
      shadow: '#08080D',
      deep: '#101017',
      body: '#1A1A26',
      frost: '#2D2D3B',
      spectral: '#4B4B5E',
      whiteCore: '#8A8A9E',
    }),
    rules: Object.freeze({ preserveAlpha: true, preserveShape: true, deepenLowValuesToBlack: true }),
  }),
  diamond: Object.freeze({
    id: 'diamond',
    label: 'Diamond',
    category: MATERIAL_CATEGORIES.GEMSTONE,
    anchors: Object.freeze({
      void: '#0B1014',
      shadow: '#2A3540',
      deep: '#7E94A6',
      body: '#C9DAE6',
      frost: '#E4EEF5',
      spectral: '#F2F8FC',
      whiteCore: '#FFFFFF',
    }),
    rules: Object.freeze({ preserveAlpha: true, preserveShape: true, boostHighlightsToWhite: true }),
  }),
  sapphire: Object.freeze({
    id: 'sapphire',
    label: 'Sapphire',
    category: MATERIAL_CATEGORIES.GEMSTONE,
    anchors: Object.freeze({
      void: '#02060F',
      shadow: '#061330',
      deep: '#0B2E6B',
      body: '#0F52BA',
      frost: '#3B82F6',
      spectral: '#93C5FD',
      whiteCore: '#EFF6FF',
    }),
    rules: Object.freeze({ preserveAlpha: true, preserveShape: true, deepenLowValuesToBlack: true }),
  }),
  ruby: Object.freeze({
    id: 'ruby',
    label: 'Ruby',
    category: MATERIAL_CATEGORIES.GEMSTONE,
    anchors: Object.freeze({
      void: '#100204',
      shadow: '#330611',
      deep: '#701030',
      body: '#E0115F',
      frost: '#F4639B',
      spectral: '#FBB6D0',
      whiteCore: '#FFF0F5',
    }),
    rules: Object.freeze({ preserveAlpha: true, preserveShape: true, deepenLowValuesToBlack: true }),
  }),
  emerald: Object.freeze({
    id: 'emerald',
    label: 'Emerald',
    category: MATERIAL_CATEGORIES.GEMSTONE,
    anchors: Object.freeze({
      void: '#021008',
      shadow: '#053827',
      deep: '#0B6B4F',
      body: '#50C878',
      frost: '#86EFAC',
      spectral: '#C6F6D5',
      whiteCore: '#F0FFF4',
    }),
    rules: Object.freeze({ preserveAlpha: true, preserveShape: true }),
  }),
  amethyst: Object.freeze({
    id: 'amethyst',
    label: 'Amethyst',
    category: MATERIAL_CATEGORIES.GEMSTONE,
    anchors: Object.freeze({
      void: '#0A0412',
      shadow: '#2A1245',
      deep: '#5B21B6',
      body: '#9966CC',
      frost: '#C4A7E7',
      spectral: '#E9D8FD',
      whiteCore: '#FAF5FF',
    }),
    rules: Object.freeze({ preserveAlpha: true, preserveShape: true }),
  }),
  onyx: Object.freeze({
    id: 'onyx',
    label: 'Onyx',
    category: MATERIAL_CATEGORIES.GEMSTONE,
    anchors: Object.freeze({
      void: '#000000',
      shadow: '#0A0A0D',
      deep: '#1A1A20',
      body: '#2E2E38',
      frost: '#4B4B58',
      spectral: '#8A8A99',
      whiteCore: '#E6E6F0',
    }),
    rules: Object.freeze({ preserveAlpha: true, preserveShape: true, deepenLowValuesToBlack: true }),
  }),
  gold: Object.freeze({
    id: 'gold',
    label: 'Gold',
    category: MATERIAL_CATEGORIES.METAL,
    anchors: Object.freeze({
      void: '#140D02',
      shadow: '#3D2E08',
      deep: '#8A6D1F',
      body: '#D4AF37',
      frost: '#F0D86E',
      spectral: '#FBEFB8',
      whiteCore: '#FFFBE6',
    }),
    rules: Object.freeze({ preserveAlpha: true, preserveShape: true, boostHighlightsToWhite: true }),
  }),
  silver: Object.freeze({
    id: 'silver',
    label: 'Silver',
    category: MATERIAL_CATEGORIES.METAL,
    anchors: Object.freeze({
      void: '#0B0D10',
      shadow: '#2B3138',
      deep: '#6B7480',
      body: '#C0C0C8',
      frost: '#DDE1E6',
      spectral: '#EFF1F4',
      whiteCore: '#FCFDFE',
    }),
    rules: Object.freeze({ preserveAlpha: true, preserveShape: true, boostHighlightsToWhite: true }),
  }),
  bronze: Object.freeze({
    id: 'bronze',
    label: 'Bronze',
    category: MATERIAL_CATEGORIES.METAL,
    anchors: Object.freeze({
      void: '#120A04',
      shadow: '#38220C',
      deep: '#7A4E22',
      body: '#CD7F32',
      frost: '#E3A869',
      spectral: '#F2D2AC',
      whiteCore: '#FDF3E7',
    }),
    rules: Object.freeze({ preserveAlpha: true, preserveShape: true }),
  }),
  black_steel: Object.freeze({
    id: 'black_steel',
    label: 'Black Steel',
    category: MATERIAL_CATEGORIES.METAL,
    anchors: Object.freeze({
      void: '#030308',
      shadow: '#0B0B14',
      deep: '#16161F',
      body: '#23232E',
      frost: '#3C3C4C',
      spectral: '#7C7C92',
      whiteCore: '#DEDEE8',
    }),
    rules: Object.freeze({ preserveAlpha: true, preserveShape: true, deepenLowValuesToBlack: true }),
  }),
});

export const MATERIAL_OPTIONS = Object.freeze(
  Object.entries(MATERIAL_PALETTES).map(([value, config]) => Object.freeze({
    value,
    label: config.label || value,
    category: config.category || MATERIAL_CATEGORIES.SOURCE,
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
