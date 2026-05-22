/**
 * PHONOLOGY ADAPTER
 * 
 * Bridge between UI surfaces and Codex-level phonology logic.
 * Ensures UI files don't violate architectural boundaries by importing codex/* directly.
 */

import { resolveSonicChroma as codexResolveSonicChroma } from '../../codex/core/phonology/chroma.resolver.js';
import { getVowelHue as codexGetVowelHue, VOWEL_HUE_MAP, FAMILY_IDENTITY } from '../../codex/core/phonology/vowelWheel.js';
import { PhoneticSimilarity as codexPhoneticSimilarity } from '../../codex/core/phonology/phoneticSimilarity.js';

/**
 * Resolves a ChromaSignature from a phoneme sequence.
 * @param {string[]} phonemes ARPAbet phonemes
 */
export function resolveSonicChroma(phonemes) {
  return codexResolveSonicChroma(phonemes);
}

/**
 * Resolves the fixed hue for a given ARPAbet vowel.
 * @param {string} vowel
 */
export function getVowelHue(vowel) {
  return codexGetVowelHue(vowel);
}

/**
 * Vowel-vowel acoustic similarity (used by color phonemegram diagnostic).
 */
export function getVowelSimilarity(a, b) {
  return codexPhoneticSimilarity.getVowelSimilarity(a, b);
}

export {
  VOWEL_HUE_MAP,
  FAMILY_IDENTITY
};
