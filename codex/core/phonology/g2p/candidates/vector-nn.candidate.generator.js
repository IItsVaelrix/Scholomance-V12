import { CANDIDATE_SOURCES, MIN_GRAPHEME_OVERLAP, MAX_CANDIDATES } from '../schemas.js';

const VECTOR_AMP_SEED = 1337;
const VECTOR_AMP_DIMENSION = 256;

function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function createVectorNNPhonemeSignature(word) {
  const rand = seededRandom(VECTOR_AMP_SEED + word.length);
  const vec = new Array(VECTOR_AMP_DIMENSION);
  for (let i = 0; i < VECTOR_AMP_DIMENSION; i += 1) {
    vec[i] = rand() * 2 - 1;
  }
  let sum = 0;
  for (let i = 0; i < vec.length; i += 1) sum += vec[i] * vec[i];
  const norm = Math.sqrt(sum) || 1;
  const normalized = new Array(VECTOR_AMP_DIMENSION);
  for (let i = 0; i < VECTOR_AMP_DIMENSION; i += 1) normalized[i] = vec[i] / norm;
  return {
    word,
    vector: normalized,
    dimension: normalized.length,
    norm: 1,
    seed: VECTOR_AMP_SEED,
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
