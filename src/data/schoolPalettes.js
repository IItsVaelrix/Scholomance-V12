import { SCHOOLS } from './schools.js';
import {
  resolveVerseIrColor,
  VERSE_IR_PALETTE_FAMILIES,
} from '../lib/truesight/color/pcaChroma.js';

/**
 * Universal Biophysical Teaching Palette.
 * Scholomance V11 is Dark Mode only.
 */
function buildUniversalVowelPalette() {
  const result = {};

  VERSE_IR_PALETTE_FAMILIES.forEach((family) => {
    const data = resolveVerseIrColor(family);
    result[family] = {
      color: data.hex,
      viseme: data.viseme
    };
  });

  return Object.freeze(result);
}

/** The authoritative 7-color phonetic rainbow. */
const DEFAULT_VOWEL_COLORS = buildUniversalVowelPalette();

/**
 * Returns the universal vowel-family color map.
 *
 * The teaching palette is school-invariant by design — the school only skins
 * the ritual/UI palette (see getRitualPalette), never the vowel-family colors.
 * (Cleared per AUDIT-2026-06-04-COLOR-AUTHORITY-DISPARITY / LING-0F07: the old
 * school-keyed resolver advertised a school argument it ignored, and a dead
 * skin map keyed every school to this same single palette.)
 */
export function getUniversalVowelColors() {
  return DEFAULT_VOWEL_COLORS;
}

/**
 * Returns the full ritual palette (UI background slots) for a given school.
 */
export function getRitualPalette(school) {
  const schoolId = String(school || 'DEFAULT').trim().toUpperCase() || 'DEFAULT';
  const meta = SCHOOLS[schoolId] || { color: '#6548b8', colorHsl: { h: 265, s: 48, l: 50 } };
  const h = meta.colorHsl.h;

  return {
    abyss: `hsl(${h}, 20%, 6%)`,
    panel: `hsl(${h}, 25%, 12%)`,
    parchment: "#e6e4da",
    ink: "#f1efec",
    primary: meta.color,
    secondary: `hsl(${(h + 72) % 360}, 60%, 55%)`,
    tertiary: `hsl(${(h + 148) % 360}, 50%, 45%)`,
    border: `hsl(${h}, 30%, 30%)`,
    glow: `hsl(${h}, 80%, 75%)`,
    glow_40: `hsla(${h}, 80%, 75%, 0.40)`,
    aurora_start: `hsl(${h}, 70%, 60%)`,
    aurora_end: `hsl(${(h + 45) % 360}, 60%, 50%)`,
  };
}

export {
  resolveVerseIrColor,
  VERSE_IR_PALETTE_FAMILIES,
};
