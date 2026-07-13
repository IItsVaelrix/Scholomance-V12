/**
 * Turns a token's phoneme provenance into a colour authority.
 *
 * The IR token already carries `phoneticDiagnostics.source` — the phoneme engine
 * records whether it looked a word up or guessed it, and compileVerseToIR keeps
 * that record. The colour path has never read it, which is why a colour minted
 * from the dictionary and a colour minted from a spelling guess are
 * indistinguishable once they reach the screen.
 *
 * Confidence feeds the kinase threshold (0.51): our dictionary, curated
 * overrides, and CMU paint. A guess never does.
 *
 * Pure module: no fs, no DOM, no clock, no network.
 */

const AUTHORITY_BY_SOURCE = Object.freeze({
  scholomance_dictionary: Object.freeze({ letter: 'D', confidence: 1 }),
  word_override: Object.freeze({ letter: 'O', confidence: 0.9 }),
  cmu_dictionary: Object.freeze({ letter: 'C', confidence: 0.8 }),

  // Guesses. The phonemes are derived from spelling, so love/move and
  // though/tough get opposite vowel families. Rendering these is not a degraded
  // mode, it is a lie.
  heuristic_fallback: Object.freeze({ letter: 'G', confidence: 0.5 }),
  alphabet_literal: Object.freeze({ letter: 'G', confidence: 0.5 }),
  multi_word_composition: Object.freeze({ letter: 'G', confidence: 0.5 }),

  // Unproven. `cached_analysis` is the engine's own admission that an entry was
  // "reused without a stored provenance trail" — an unproven colour is not truth.
  cached_analysis: Object.freeze({ letter: 'U', confidence: 0 }),
  unresolved: Object.freeze({ letter: 'U', confidence: 0 })
});

/** No source at all: nothing was ever claimed, so nothing can be trusted. */
const NO_AUTHORITY = Object.freeze({ letter: 'X', confidence: 0 });

export const CHROMA_AUTHORITY_LETTERS = Object.freeze(['D', 'O', 'C', 'G', 'U', 'X']);

/** Letters whose colour is a guess and must never be painted. */
export const UNTRUSTED_AUTHORITY_LETTERS = Object.freeze(['G', 'U', 'X']);

export function authorityFor(source) {
  if (typeof source !== 'string') return NO_AUTHORITY;
  return AUTHORITY_BY_SOURCE[source] || NO_AUTHORITY;
}

export function authorityForToken(token) {
  return authorityFor(token?.phoneticDiagnostics?.source);
}
