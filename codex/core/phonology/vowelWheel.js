/**
 * Core vowel color wheel.
 * Maps ARPAbet vowels to fixed hue positions for deterministic chroma.
 */

export const VOWEL_HUE_MAP = Object.freeze({
  // Front Vowels (High -> Low)
  IY: 0,
  IH: 30,
  EY: 60,
  EH: 90,
  AE: 120,

  // Central/Neutral
  AH: 150,
  AX: 174,
  ER: 330,

  // Back Vowels (Low -> High)
  AA: 180,
  AO: 210,
  OW: 240,
  UH: 270,
  UW: 300,

  // Diphthongs & Specialized Families
  AY: 45,
  AW: 165,
  OY: 225,
  UR: 315,
  OH: 225,
  OO: 285,
  YUW: 315,
});

export const VISEME_METRICS = Object.freeze({
  IY: { radius: 2, tracking: -0.05, skew: 6 },
  AE: { radius: 4, tracking: 0.1, skew: 4 },
  AA: { radius: 10, tracking: 0.15, skew: 0 },
  UW: { radius: 12, tracking: -0.02, skew: -2 },
  AX: { radius: 6, tracking: 0, skew: 0 },
});

/**
 * Resolves the fixed hue for a given ARPAbet vowel.
 * @param {string} vowel - ARPAbet vowel (e.g. "IY", "AA1")
 * @returns {number} Hue in degrees (0-360)
 */
export function getVowelHue(vowel) {
  const base = String(vowel || '').replace(/[0-2]/g, '').toUpperCase();
  return VOWEL_HUE_MAP[base] ?? 180;
}
