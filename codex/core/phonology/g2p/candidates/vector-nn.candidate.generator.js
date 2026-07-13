import { CANDIDATE_SOURCES, MIN_GRAPHEME_OVERLAP, MAX_CANDIDATES } from '../schemas.js';

const VECTOR_AMP_DIMENSION = 256;
const NGRAM_SIZES = [2, 3];
// Suffix graphemes decide English pronunciation far more than prefixes
// (-IRE, -IGHT, -TION), and this generator exists to guess a pronunciation.
const SUFFIX_WEIGHT = 2.5;
const SUFFIX_LENGTH = 4;

function hashToken(token) {
  let h = 2166136261;
  for (let i = 0; i < token.length; i += 1) {
    h ^= token.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % VECTOR_AMP_DIMENSION;
}

/**
 * Hashed character-n-gram embedding of a word's SPELLING.
 *
 * This is grapheme space, not phoneme space: its job is "this unknown word is
 * spelled like these dictionary words, so borrow their pronunciation".
 *
 * The previous implementation seeded a random vector on word.LENGTH, so it
 * carried no information about the word at all: DESIRE~BANANA scored 1.0000
 * (both six letters) while FIRE~DESIRE scored -0.0398 (a real rhyme, different
 * lengths). It ranked by length and called it a phoneme signature.
 */
export function createVectorNNPhonemeSignature(word) {
  const upper = String(word || '').toUpperCase().replace(/[^A-Z]/g, '');
  const vec = new Array(VECTOR_AMP_DIMENSION).fill(0);

  const padded = `^${upper}$`;
  for (const n of NGRAM_SIZES) {
    for (let i = 0; i + n <= padded.length; i += 1) {
      const gram = padded.slice(i, i + n);
      const isSuffix = i + n >= padded.length - SUFFIX_LENGTH;
      vec[hashToken(gram)] += isSuffix ? SUFFIX_WEIGHT : 1;
    }
  }

  let sumSq = 0;
  for (let i = 0; i < VECTOR_AMP_DIMENSION; i += 1) sumSq += vec[i] * vec[i];
  const norm = Math.sqrt(sumSq) || 1;
  const normalized = vec.map((value) => value / norm);

  return {
    word: upper,
    vector: normalized,
    dimension: VECTOR_AMP_DIMENSION,
    norm: 1,
    seed: 0,
  };
}

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

export function retrieveVectorNNPhonemeCandidates(word, cmuEntries, limit = MAX_CANDIDATES) {
  const upper = String(word || '').toUpperCase().replace(/[^A-Z]/g, '');
  if (upper.length < MIN_GRAPHEME_OVERLAP) return [];

  const queryVec = createVectorNNPhonemeSignature(upper);
  const candidates = [];
  const seenPhonemes = new Set();

  for (const [key, phonemeVariants] of cmuEntries) {
    if (key.length < MIN_GRAPHEME_OVERLAP) continue;

    let overlap = 0;
    for (let i = 0; i < upper.length; i += 1) {
      if (i < key.length && upper[i] === key[i]) overlap += 1;
    }
    if (overlap < MIN_GRAPHEME_OVERLAP) continue;

    for (let v = 0; v < phonemeVariants.length; v += 1) {
      const phonemes = phonemeVariants[v];
      const keyStr = phonemes.join(' ');
      if (seenPhonemes.has(keyStr)) continue;

      const candidateVec = createVectorNNPhonemeSignature(key);
      const raw = innerProduct(queryVec.vector, candidateVec.vector);
      const similarity = clamp01((raw + 1) / 2);

      candidates.push({
        key,
        phonemes,
        overlap,
        similarity,
      });

      seenPhonemes.add(keyStr);
      if (candidates.length >= limit) break;
    }

    if (candidates.length >= limit) break;
  }

  candidates.sort((a, b) => {
    if (b.similarity !== a.similarity) return b.similarity - a.similarity;
    return b.overlap - a.overlap;
  });

  return candidates.slice(0, Math.min(limit, MAX_CANDIDATES));
}

function innerProduct(a, b) {
  let sum = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i += 1) sum += a[i] * b[i];
  return sum;
}
