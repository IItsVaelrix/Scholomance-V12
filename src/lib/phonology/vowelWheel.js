/**
 * Vowel Color Wheel
 * Maps ARPAbet vowels to fixed hue positions on the 360-degree color wheel.
 * Aligned with RhymeDesign-style linguistic visualization.
 */

export const VOWEL_HUE_MAP = Object.freeze({
  // Front Vowels (High -> Low)
  'IY': 0,    // Lime (High Front)
  'IH': 30,   // Yellow-Green
  'EY': 60,   // Yellow
  'EH': 90,   // Gold
  'AE': 120,  // Orange (Low Front)
  
  // Central/Neutral
  'AH': 150,  // Orange-Red
  'AX': 174,  // Teal (Neutral Schwa Center)
  'ER': 330,  // Rose
  
  // Back Vowels (Low -> High)
  'AA': 180,  // Red (Low Back)
  'AO': 210,  // Deep Blue
  'OW': 240,  // Indigo
  'UH': 270,  // Violet
  'UW': 300,  // Magenta (High Back)
  
  // Diphthongs & Specialized Families
  'AY': 45,   // Yellow-Orange (IY-AA blend)
  'AW': 165,  // Red-Orange (AA-UW blend)
  'OY': 225,  // Blue-Violet (AO-IY blend)
  'UR': 315,  // Pink
  'OH': 225,  // Blue-Violet (Back-Open variant)
  'OO': 285,  // Indigo-Violet
  'YUW': 315, // Pink (High Back Glide)
});

/**
 * BIOPHYSICAL VISEME CONSTANTS (LAW 4.2)
 * Shared metrics for mouth-shape rendering.
 */
export const VISEME_METRICS = Object.freeze({
  'IY': { radius: 2,  tracking: -0.05, skew: 6 },
  'AE': { radius: 4,  tracking: 0.1,   skew: 4 },
  'AA': { radius: 10, tracking: 0.15,  skew: 0 },
  'UW': { radius: 12, tracking: -0.02, skew: -2 },
  'AX': { radius: 6,  tracking: 0,     skew: 0 },
});

/**
 * Resolves the fixed hue for a given ARPAbet vowel.
 * @param {string} vowel - ARPAbet vowel (e.g. "IY", "AA1")
 * @returns {number} Hue in degrees (0-360)
 */
export function getVowelHue(vowel) {
  const base = String(vowel || '').replace(/[0-2]/g, '').toUpperCase();
  return VOWEL_HUE_MAP[base] ?? 180; // Default to AA-like Red if unknown
}

import { resolveSonicChroma } from '../../../codex/core/phonology/chroma.resolver.js';
export { resolveSonicChroma };

