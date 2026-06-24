/**
 * OOV SUBJECT RESOLVER
 *
 * Maps an out-of-vocabulary (OOV) word onto a known visual subject using the
 * Datamuse `meansLike` relation ("words that mean like X"). This gives novel
 * words a semantic grounding the phonetic Photonic bridge cannot provide.
 *
 * Online strategy by design: the adapter performs a network round-trip. The
 * caller decides whether to supply an adapter at all, so this path never runs
 * (and never hits the network) unless explicitly wired in.
 */

import { SUBJECT_KEYWORDS } from './constants.js';
import { LEXICAL_VISUAL_DB } from '../../semantic/visual-extractor.js';

const KNOWN_SUBJECTS = new Set(SUBJECT_KEYWORDS);

/**
 * A word is a usable subject if it is a subject keyword or has a visual profile.
 * @param {string} word
 * @returns {boolean}
 */
function isKnownSubject(word) {
  return KNOWN_SUBJECTS.has(word) || LEXICAL_VISUAL_DB.has(word);
}

/**
 * Resolve a single OOV word to a known subject.
 *
 * @param {string} candidate - The OOV token.
 * @param {{ meansLike: (word: string) => Promise<string[]> }} adapter
 * @returns {Promise<{original: string, resolvedTo: string, via: string}|null>}
 */
export async function resolveOOVSubject(candidate, adapter) {
  if (!candidate || !adapter || typeof adapter.meansLike !== 'function') {
    return null;
  }

  // meansLike already swallows network errors and returns [].
  const neighbors = await adapter.meansLike(candidate);
  if (!Array.isArray(neighbors)) return null;

  for (const neighbor of neighbors) {
    const word = String(neighbor || '').toLowerCase();
    if (isKnownSubject(word)) {
      return Object.freeze({ original: candidate, resolvedTo: word, via: 'datamuse:meansLike' });
    }
  }

  return null;
}

/**
 * Build a memoized resolver bound to one adapter. Repeated lookups of the same
 * word within a run reuse the first result instead of re-fetching.
 *
 * @param {{ meansLike: (word: string) => Promise<string[]> }} adapter
 * @returns {(candidate: string) => Promise<{original: string, resolvedTo: string, via: string}|null>}
 */
export function createOOVResolver(adapter) {
  const memo = new Map();
  return async (candidate) => {
    const key = String(candidate || '').toLowerCase();
    if (memo.has(key)) return memo.get(key);
    const result = await resolveOOVSubject(candidate, adapter);
    memo.set(key, result);
    return result;
  };
}
