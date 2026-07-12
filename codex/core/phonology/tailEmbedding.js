/**
 * Articulatory embedding of a rhyme tail.
 *
 * Two words rhyme because of a property each holds independently — its tail.
 * Embedding that tail over articulatory features makes slant rhyme a distance:
 * N and M differ only in `place`; T and D differ only in `voicing`.
 *
 * This replaces the pairwise scan as a CANDIDATE GENERATOR only. Scores are
 * still produced by scoreMultiSyllableMatch, so quantization can never change
 * a colour — it can only change which pairs get looked at.
 */
import { PHONOLOGICAL_FEATURES_V1, ARPABET_VOWELS } from './phoneme.constants.js';

// Vowel rows carry `cPlace`, consonant rows carry `vPlace`. Use the union and
// read a missing key as 0 so both row shapes embed into the same space.
export const FEATURE_KEYS = Object.freeze([
  'height', 'contour', 'place', 'length', 'voicing',
  'nasality', 'manner', 'affrication', 'sibilance', 'cPlace', 'vPlace',
]);

export const TAIL_MAX_PHONEMES = 4;
// 4 phonemes x 11 features = 44, padded to the next power of two because
// fastHadamardTransform requires one.
export const TAIL_VECTOR_DIM = 64;

// The nucleus carries the rhyme. Weight it above the coda so `AY-T` and `AY-D`
// stay near each other while `AY-T` and `OW-T` do not.
const NUCLEUS_WEIGHT = 2;

export function stripStress(phoneme) {
  return String(phoneme || '').replace(/[0-9]/g, '').toUpperCase();
}

export function extractRhymeTail(phonemes) {
  const arr = (Array.isArray(phonemes) ? phonemes : []).map(stripStress).filter(Boolean);
  let lastVowel = -1;
  for (let i = arr.length - 1; i >= 0; i -= 1) {
    if (ARPABET_VOWELS.has(arr[i])) { lastVowel = i; break; }
  }
  // CMUdict splits r-coloured/diphthong nuclei across two adjacent vowel
  // tokens (e.g. "fire" -> F AY ER). The nucleus is the whole contiguous
  // vowel run, not just its rightmost token, so extend the start leftward
  // through any immediately preceding vowels.
  while (lastVowel > 0 && ARPABET_VOWELS.has(arr[lastVowel - 1])) {
    lastVowel -= 1;
  }
  const tail = lastVowel < 0 ? arr.slice(-TAIL_MAX_PHONEMES) : arr.slice(lastVowel);
  return tail.slice(0, TAIL_MAX_PHONEMES);
}

export function buildTailFeatureVector(phonemes) {
  const tail = extractRhymeTail(phonemes);
  const vec = new Float32Array(TAIL_VECTOR_DIM);
  for (let i = 0; i < tail.length; i += 1) {
    const features = PHONOLOGICAL_FEATURES_V1[tail[i]];
    if (!features) continue;
    const weight = i === 0 ? NUCLEUS_WEIGHT : 1;
    const base = i * FEATURE_KEYS.length;
    for (let k = 0; k < FEATURE_KEYS.length; k += 1) {
      vec[base + k] = Number(features[FEATURE_KEYS[k]] ?? 0) * weight;
    }
  }
  return vec;
}

export function tailCosine(a, b) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < TAIL_VECTOR_DIM; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
