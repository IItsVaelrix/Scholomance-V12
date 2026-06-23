import { FAMILY_IDENTITY } from './vowelWheel.js';

/**
 * Normalizes a vowel-family token into the app's canonical family ids.
 * Strips trailing ARPAbet stress markers (0, 1, 2) so that "AY1" and "AY"
 * both map to the same canonical family.
 * @param {string | null | undefined} value
 * @returns {string}
 */
export function normalizeVowelFamily(value) {
  const family = String(value || "").trim().toUpperCase();
  if (!family) return "";
  // Strip trailing stress marker digit (0, 1, 2) from ARPAbet vowel tokens
  // so that AY1, AY0, AY2 all map to the same canonical family as AY.
  const cleaned = family.replace(/[012]$/, '');
  return FAMILY_IDENTITY[cleaned] || FAMILY_IDENTITY[family] || family;
}

