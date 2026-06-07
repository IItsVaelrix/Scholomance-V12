/**
 * NLP MORPH ENGINE — In-Place Phonetic Asset Manipulation
 *
 * Edits a LOADED asset (its existing coordinate lattice) rather than
 * regenerating one. Derives a target chroma signature from the VerseIR
 * amplifier's PixelBrain payload (school / rarity / effect, already baked
 * into the verse palettes) and re-hues each existing pixel toward it while
 * PRESERVING that pixel's luminance — so the asset keeps its shape and
 * shading and only its hue/saturation sweep. This is what lets the asset
 * "morph in front of your eyes" when interpolated frame-by-frame.
 *
 * Pure + deterministic. No randomness, no external imports beyond shared
 * color math. Lives under the pixelbrain Cell Wall (Z_BASE).
 */

import { hslToHex, clamp01, clampNumber, normalizeDegrees } from './shared.js';

/**
 * Parse a #RRGGBB / #RGB hex string into HSL.
 * @param {string} hex
 * @returns {{ h: number, s: number, l: number } | null} h in [0,360), s/l in [0,100]
 */
export function hexToHsl(hex) {
  const raw = String(hex || '').trim().replace('#', '');
  let normalized = raw;
  if (raw.length === 3) {
    normalized = raw.split('').map((char) => char + char).join('');
  }
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;

  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;
  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r: h = ((g - b) / delta) % 6; break;
      case g: h = (b - r) / delta + 2; break;
      default: h = (r - g) / delta + 4; break;
    }
    h *= 60;
  }

  return {
    h: normalizeDegrees(h),
    s: clamp01(s) * 100,
    l: clamp01(l) * 100,
  };
}

/**
 * Interpolate hue along the shortest arc.
 * @param {number} from degrees
 * @param {number} to degrees
 * @param {number} t [0,1]
 */
export function lerpHue(from, to, t) {
  const start = normalizeDegrees(from);
  const end = normalizeDegrees(to);
  const arc = ((end - start + 540) % 360) - 180;
  return normalizeDegrees(start + arc * t);
}

function argmaxSchool(schoolWeights) {
  const entries = Object.entries(schoolWeights || {});
  if (entries.length === 0) return null;
  return entries
    .sort((left, right) => {
      const delta = (Number(right[1]) || 0) - (Number(left[1]) || 0);
      if (delta !== 0) return delta;
      return String(left[0]).localeCompare(String(right[0]));
    })[0][0];
}

/**
 * Derive a morph target (chroma signature) from a VerseIR PixelBrain payload.
 * The verse palettes already encode school+rarity+effect, so we read the
 * dominant school's representative mid-tone as the hue/saturation anchor.
 *
 * @param {Object} versePayload - verseAmplifier.pixelBrain
 * @returns {{ available: boolean, hue?: number, saturation?: number,
 *   schoolId?: string, dominantSymmetry?: string, palettes?: Array }}
 */
export function deriveVerseMorphTarget(versePayload) {
  const palettes = Array.isArray(versePayload?.palettes) ? versePayload.palettes : [];
  if (palettes.length === 0) {
    return { available: false };
  }

  const dominantSchool = argmaxSchool(versePayload?.schoolWeights);
  const dominantPalette = (dominantSchool
    ? palettes.find((palette) => String(palette?.schoolId || '').toUpperCase() === String(dominantSchool).toUpperCase())
    : null) || palettes[0];

  const colors = Array.isArray(dominantPalette?.colors)
    ? dominantPalette.colors.filter(Boolean)
    : [];
  if (colors.length === 0) {
    return { available: false };
  }

  // Mid-tone is the most representative chroma (extremes skew to black/white).
  const representative = colors[Math.floor(colors.length / 2)] || colors[0];
  const hsl = hexToHsl(representative);
  if (!hsl) {
    return { available: false };
  }

  return {
    available: true,
    hue: hsl.h,
    saturation: hsl.s,
    schoolId: dominantPalette?.schoolId || dominantSchool || 'VOID',
    dominantSymmetry: versePayload?.dominantSymmetry || 'none',
    palettes,
  };
}

/**
 * Recolor a loaded asset's coordinates toward a morph target by factor t.
 * Geometry (x/y/snapped/emphasis/source) is preserved; only `color` changes.
 * Each pixel keeps its own luminance UNLESS the target carries a lightDelta,
 * so the silhouette and shading survive a pure re-hue.
 *
 * Target fields (all optional except `available`):
 *   hue        - absolute target hue [0,360); omit to preserve each pixel's hue
 *   saturation - absolute target saturation [0,100]; omit to preserve
 *   satDelta   - additive saturation shift [-100,100] (e.g. "vivid" / "dull")
 *   lightDelta - additive lightness shift [-100,100] (e.g. "darker" / "brighter")
 *
 * @param {Array} baseCoordinates - the asset's pre-morph coordinates
 * @param {Object} target - from interpretInstruction / deriveVerseMorphTarget
 * @param {number} t - interpolation factor [0,1]; 0 returns originals
 * @returns {Array} new coordinate array
 */
export function morphCoordinatesToward(baseCoordinates, target, t) {
  const coords = Array.isArray(baseCoordinates) ? baseCoordinates : [];
  if (!target?.available || coords.length === 0) return coords;

  const amount = clamp01(t);
  if (amount <= 0) return coords;

  const hasHue = Number.isFinite(Number(target.hue));
  const hasSatTarget = Number.isFinite(Number(target.saturation));
  const targetHue = hasHue ? normalizeDegrees(Number(target.hue)) : 0;
  const targetSat = hasSatTarget ? clampNumber(Number(target.saturation), 0, 100) : 0;
  const satDelta = Number(target.satDelta) || 0;
  const lightDelta = Number(target.lightDelta) || 0;

  return coords.map((coord) => {
    const hsl = hexToHsl(coord?.color);
    if (!hsl) {
      // No legible source color — adopt the target at a neutral mid lightness.
      return { ...coord, color: hslToHex(targetHue, hasSatTarget ? targetSat : 50, 50) };
    }

    const finalHue = hasHue ? lerpHue(hsl.h, targetHue, amount) : hsl.h;
    let finalSat = hasSatTarget ? hsl.s + (targetSat - hsl.s) * amount : hsl.s;
    finalSat = clampNumber(finalSat + satDelta * amount, 0, 100);
    const finalLight = clampNumber(hsl.l + lightDelta * amount, 0, 100);
    return { ...coord, color: hslToHex(finalHue, finalSat, finalLight) };
  });
}

// ─── PLAIN-INSTRUCTION INTERPRETER ──────────────────────────────────────────
// Regular English instructions ("make it icy blue", "darker", "more vivid red")
// → a morph target. Deterministic, offline, no poetic structure required.

// Color anchors. `lightDelta` is optional and biases value for words that
// imply a dark/light shade (burgundy → dark red, peach → light orange).
const COLOR_ANCHORS = [
  // ── RED ───────────────────────────────────────────────────────────────
  { hue: 0, sat: 86, words: ['red', 'crimson', 'scarlet', 'ruby', 'cherry', 'cardinal', 'vermilion', 'carmine', 'cinnabar', 'candyapple', 'tomato', 'poppy', 'cerise', 'rouge', 'redder'] },
  { hue: 0, sat: 88, lightDelta: 10, words: ['blood', 'bloody', 'bloodred', 'gore', 'gory', 'wound', 'fury', 'rage', 'wrath', 'wrathful', 'angry', 'anger'] },
  { hue: 355, sat: 80, lightDelta: -20, words: ['maroon', 'wine', 'merlot', 'burgundy', 'garnet', 'oxblood', 'claret', 'crimsondark'] },
  // ── ORANGE / FIRE ─────────────────────────────────────────────────────
  { hue: 16, sat: 94, words: ['fire', 'fiery', 'flame', 'flaming', 'ablaze', 'blaze', 'blazing', 'burning', 'ember', 'embers', 'lava', 'magma', 'molten', 'inferno', 'infernal', 'hellfire', 'scorch', 'scorched', 'searing'] },
  { hue: 28, sat: 92, words: ['orange', 'tangerine', 'pumpkin', 'apricot', 'marigold', 'carrot', 'sunset', 'sunrise', 'autumn', 'amberish'] },
  { hue: 30, sat: 75, lightDelta: -8, words: ['rust', 'rusty', 'terracotta', 'sienna', 'burntorange', 'clay', 'brick'] },
  { hue: 32, sat: 60, lightDelta: 18, words: ['peach', 'apricotlight', 'cantaloupe', 'tan', 'sand', 'sandy', 'wheat', 'caramel'] },
  // ── YELLOW / GOLD ─────────────────────────────────────────────────────
  { hue: 48, sat: 94, words: ['yellow', 'gold', 'golden', 'amber', 'honey', 'lemon', 'citrus', 'sunny', 'sunshine', 'sunflower', 'canary', 'butter', 'mustard', 'topaz', 'saffron'] },
  { hue: 50, sat: 95, lightDelta: 14, words: ['holy', 'divine', 'sacred', 'blessed', 'celestial', 'angelic', 'heavenly', 'sunlit'] },
  { hue: 55, sat: 96, lightDelta: 12, words: ['electric', 'lightning', 'thunder', 'spark', 'sparking', 'voltaic', 'zap'] },
  // ── GREEN ─────────────────────────────────────────────────────────────
  { hue: 85, sat: 80, words: ['lime', 'chartreuse', 'limegreen'] },
  { hue: 130, sat: 70, words: ['green', 'emerald', 'forest', 'grass', 'grassy', 'jade', 'leaf', 'leafy', 'foliage', 'verdant', 'nature', 'natural', 'moss', 'mossy', 'fern', 'pine', 'olive', 'mint', 'shamrock', 'kelp', 'viridian', 'malachite'] },
  { hue: 110, sat: 88, lightDelta: 6, words: ['poison', 'poisonous', 'toxic', 'toxin', 'venom', 'venomous', 'slime', 'slimy', 'acid', 'acidic', 'radioactive', 'sickly', 'necrotic', 'necrosis', 'plague', 'pestilent', 'corrosive', 'ooze'] },
  // ── CYAN / TEAL ───────────────────────────────────────────────────────
  { hue: 180, sat: 72, words: ['cyan', 'teal', 'aqua', 'aquamarine', 'turquoise', 'seafoam', 'spearmint', 'verdigris'] },
  // ── BLUE / ICE ────────────────────────────────────────────────────────
  { hue: 200, sat: 80, words: ['ice', 'icy', 'frost', 'frosty', 'frostbite', 'frozen', 'glacier', 'glacial', 'cold', 'chill', 'chilly', 'arctic', 'polar', 'winter', 'wintry', 'snowfall', 'tundra', 'permafrost'] },
  { hue: 215, sat: 84, words: ['blue', 'azure', 'sapphire', 'cobalt', 'cerulean', 'ocean', 'oceanic', 'sea', 'aquatic', 'water', 'watery', 'sky', 'skyblue', 'cornflower', 'denim', 'steelblue', 'periwinkle', 'tidal', 'wave'] },
  { hue: 225, sat: 78, lightDelta: -18, words: ['navy', 'midnight', 'deepblue', 'abyssal', 'oceandeep', 'prussian'] },
  { hue: 245, sat: 72, words: ['indigo', 'royalblue', 'sapphiredeep'] },
  // ── PURPLE / VOID ─────────────────────────────────────────────────────
  { hue: 275, sat: 70, words: ['purple', 'violet', 'amethyst', 'lavender', 'lilac', 'plum', 'orchid', 'mauve', 'grape', 'wisteria', 'royal', 'regal', 'imperial', 'majesty'] },
  { hue: 285, sat: 66, lightDelta: -14, words: ['void', 'arcane', 'magic', 'magical', 'mystic', 'mystical', 'eldritch', 'cosmic', 'cosmos', 'astral', 'occult', 'eldermagic', 'witchcraft', 'enchanted', 'spectral', 'phantasm', 'nebula', 'galaxy'] },
  { hue: 300, sat: 78, words: ['magenta', 'fuchsia', 'mulberry'] },
  // ── PINK ──────────────────────────────────────────────────────────────
  { hue: 335, sat: 74, words: ['pink', 'rose', 'rosy', 'blush', 'salmon', 'coral', 'flamingo', 'bubblegum', 'hotpink', 'raspberry', 'watermelon'] },
  { hue: 340, sat: 45, lightDelta: 20, words: ['pinklight', 'petal', 'cottoncandy', 'babypink'] },
  // ── BROWN / EARTH ─────────────────────────────────────────────────────
  { hue: 25, sat: 48, lightDelta: -6, words: ['brown', 'earth', 'earthy', 'dirt', 'dirty', 'soil', 'wood', 'wooden', 'timber', 'mud', 'muddy', 'bronze', 'chocolate', 'coffee', 'mocha', 'walnut', 'mahogany', 'umber', 'sepia', 'khaki', 'leather'] },
];

const NEUTRAL_ANCHORS = [
  { name: 'white', sat: 6, lightDelta: 26, words: ['white', 'pale', 'paled', 'ghost', 'ghostly', 'snow', 'snowy', 'snowwhite', 'bone', 'pearl', 'pearly', 'ivory', 'alabaster', 'chalk', 'milky', 'frostwhite', 'pallid', 'blanched'] },
  { name: 'black', sat: 8, lightDelta: -34, words: ['black', 'obsidian', 'onyx', 'coal', 'pitch', 'pitchblack', 'ink', 'inky', 'ebony', 'jet', 'sable', 'tar', 'soot', 'charcoal', 'raven', 'eclipse', 'abyss', 'noir'] },
  { name: 'gray', sat: 4, lightDelta: 0, words: ['gray', 'grey', 'silver', 'silvery', 'steel', 'steely', 'metal', 'metallic', 'iron', 'pewter', 'stone', 'stony', 'concrete', 'cement', 'slate', 'ash', 'ashen', 'smoke', 'smoky', 'gunmetal', 'graphite', 'leaden'] },
];

const TONE_MODIFIERS = [
  { key: 'darker', lightDelta: -24, words: ['darker', 'darken', 'darkened', 'dark', 'darkness', 'dim', 'dimmer', 'dimmed', 'dusk', 'dusky', 'gloomy', 'gloom', 'murky', 'deeper', 'deep', 'shaded', 'shade', 'shadow', 'shadowy', 'shadowed', 'night', 'nightly', 'nighttime', 'twilight', 'somber', 'tenebrous'] },
  { key: 'brighter', lightDelta: 24, words: ['brighter', 'brighten', 'brightened', 'bright', 'glow', 'glowing', 'aglow', 'radiant', 'radiance', 'luminous', 'luminance', 'shining', 'shine', 'shiny', 'lighter', 'lighten', 'lightened', 'gleaming', 'gleam', 'beaming', 'dazzling', 'incandescent'] },
  { key: 'vivid', satDelta: 32, words: ['vivid', 'vibrant', 'saturated', 'saturate', 'intense', 'intensify', 'rich', 'bold', 'bolder', 'neon', 'punchy', 'lush', 'deepened', 'pure', 'pop'] },
  { key: 'dull', satDelta: -32, words: ['dull', 'duller', 'desaturate', 'desaturated', 'muted', 'mute', 'faded', 'fade', 'washed', 'washedout', 'pastel', 'softer', 'soft', 'grayish', 'greyish', 'drab', 'dreary', 'bleak', 'dusty', 'weathered'] },
];

function buildWordIndex(groups) {
  const index = new Map();
  groups.forEach((group) => {
    group.words.forEach((word) => {
      if (!index.has(word)) index.set(word, group);
    });
  });
  return index;
}

const COLOR_INDEX = buildWordIndex(COLOR_ANCHORS);
const NEUTRAL_INDEX = buildWordIndex(NEUTRAL_ANCHORS);
const MODIFIER_INDEX = buildWordIndex(TONE_MODIFIERS);

/**
 * Interpret a plain-English instruction into a morph target.
 * Finds the first color/neutral anchor and accumulates tone modifiers.
 * Returns { available: false } when nothing color/tone-related is recognised.
 *
 * @param {string} text
 * @returns {Object} morph target compatible with morphCoordinatesToward
 */
export function interpretInstruction(text) {
  const tokens = String(text || '')
    .toLowerCase()
    .match(/[a-z]+/g) || [];
  if (tokens.length === 0) return { available: false };

  let anchor = null;        // { hue, sat } or { neutral, sat, lightDelta }
  let anchorLabel = '';
  let satDelta = 0;
  let lightDelta = 0;
  const modifierLabels = [];

  for (const token of tokens) {
    if (!anchor) {
      const color = COLOR_INDEX.get(token);
      if (color) {
        anchor = { hue: color.hue, sat: color.sat, lightDelta: color.lightDelta };
        anchorLabel = token;
        continue;
      }
      const neutral = NEUTRAL_INDEX.get(token);
      if (neutral) {
        anchor = { neutral: neutral.name, sat: neutral.sat, lightDelta: neutral.lightDelta };
        anchorLabel = token;
        continue;
      }
    }
    const modifier = MODIFIER_INDEX.get(token);
    if (modifier) {
      satDelta += Number(modifier.satDelta) || 0;
      lightDelta += Number(modifier.lightDelta) || 0;
      if (!modifierLabels.includes(modifier.key)) modifierLabels.push(modifier.key);
    }
  }

  if (!anchor && satDelta === 0 && lightDelta === 0) {
    return { available: false };
  }

  const target = {
    available: true,
    satDelta: clampNumber(satDelta, -100, 100),
    lightDelta: clampNumber(lightDelta, -100, 100),
  };

  if (anchor) {
    target.saturation = anchor.sat;
    if (anchor.neutral) {
      // Neutral: preserve each pixel's hue, just drain saturation & shift value.
      target.lightDelta = clampNumber(target.lightDelta + (Number(anchor.lightDelta) || 0), -100, 100);
    } else {
      target.hue = anchor.hue;
      // Color words can carry a shade bias (burgundy → dark, peach → light).
      if (anchor.lightDelta) {
        target.lightDelta = clampNumber(target.lightDelta + (Number(anchor.lightDelta) || 0), -100, 100);
      }
    }
  }

  const labelParts = [anchorLabel, ...modifierLabels].filter(Boolean);
  target.label = labelParts.join(' · ');

  return target;
}
