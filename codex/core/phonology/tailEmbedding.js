/**
 * Stress-anchored rhyme-tail extraction.
 *
 * Two words rhyme because of a property each holds independently — its tail.
 * This module extracts that tail; the Resonance Fingerprint (rhyme-astrology/
 * resonanceFingerprint.js) turns it into per-token SCD64-discipline blocks,
 * and bucketing is block-exact from there. Scores are still produced by
 * scoreMultiSyllableMatch downstream — extraction here can only change which
 * pairs become candidates, never a colour.
 */
import { ARPABET_VOWELS } from './phoneme.constants.js';

export const TAIL_MAX_PHONEMES = 4;

export function stripStress(phoneme) {
  return String(phoneme || '').replace(/[0-9]/g, '').toUpperCase();
}

export function extractRhymeTail(phonemes) {
  const raw = Array.isArray(phonemes) ? phonemes : [];
  // Read the stress digit off the RAW phoneme (e.g. "AY1") before stripping —
  // stripStress deletes that digit, so it must be captured here or it's gone.
  const tokens = raw
    .map((p) => {
      const s = String(p || '');
      const match = s.match(/([0-9])/);
      return { stripped: stripStress(s), stress: match ? match[1] : '' };
    })
    .filter((t) => t.stripped);
  const arr = tokens.map((t) => t.stripped);

  // A rhyme tail begins at the LAST STRESSED VOWEL (stress digit 1 or 2) and
  // runs to the end of the word. CMUdict splits r-coloured/diphthong nuclei
  // across two adjacent vowel tokens (e.g. "fire" -> F AY1 ER0), but it also
  // splits hiatus across two vowels where only the SECOND carries the stress
  // (e.g. "create" -> K R IY0 EY1 T). Anchoring on stress, not on "first vowel
  // of the contiguous run", gets both cases right: the r-coloured vowel is
  // stressed so it's still the anchor, while the hiatus's unstressed onset
  // vowel is correctly left out of the tail.
  let anchor = -1;
  for (let i = arr.length - 1; i >= 0; i -= 1) {
    if (ARPABET_VOWELS.has(arr[i]) && (tokens[i].stress === '1' || tokens[i].stress === '2')) {
      anchor = i;
      break;
    }
  }
  // Fall back to the last vowel of any kind (reduced monosyllables, unstressed
  // function words carry no stress digit at all).
  if (anchor < 0) {
    for (let i = arr.length - 1; i >= 0; i -= 1) {
      if (ARPABET_VOWELS.has(arr[i])) { anchor = i; break; }
    }
  }
  // Fall back to the final phonemes when there is no vowel at all.
  const tail = anchor < 0 ? arr.slice(-TAIL_MAX_PHONEMES) : arr.slice(anchor);
  return tail.slice(0, TAIL_MAX_PHONEMES);
}
