/**
 * Regression Guard — authority must beat a memoised spelling guess.
 *
 * analyzeWord() checks WORD_CACHE (a memo of whichever branch ran last) BEFORE
 * it checks AUTHORITY_CACHE. ensureAuthorityBatch used to write straight into
 * AUTHORITY_CACHE, so any word already analysed from spelling kept the guess:
 *
 *   "bold" analysed early  -> B AA1 L D  / AA-LD   (guessed from letters)
 *   dictionary then says   -> B OW1 L D  / OW-LD   (ignored — WORD_CACHE hit)
 *
 * The ritual tooltip rendered both at once: the lexicon's "B OW1 L D" as the
 * pronunciation, and "VOWEL AA / RHYME AA-LD" in the Phonology panel directly
 * under it. Same class as gene BUGPATTERN_COLOR_DRAGON_FRONTEND_FALLBACK: a
 * frontend fallback outranking backend truth.
 *
 * setAuthority() evicts the word's stale memo. It must evict ONLY that word —
 * the colouring path re-analyses the whole document, so a clearCache() here
 * would throw away every other word's analysis on every tooltip open.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { PhonemeEngine } from '../../../codex/core/phonology/phoneme.engine.js';

describe('[Core] PhonemeEngine authority cache eviction', () => {
  beforeEach(() => {
    PhonemeEngine.clearCache();
  });

  it('overrides a spelling guess that was already memoised', () => {
    const guess = PhonemeEngine.analyzeWord('bold');
    expect(guess.vowelFamily).toBe('AA'); // the wrong, letter-derived family
    expect(guess.rhymeKey).toBe('AA-LD');

    PhonemeEngine.setAuthority('bold', { family: null, phonemes: ['B', 'OW1', 'L', 'D'] });

    const corrected = PhonemeEngine.analyzeWord('bold');
    expect(corrected.phonemes).toEqual(['B', 'OW1', 'L', 'D']);
    expect(corrected.vowelFamily).toBe('OW');
    expect(corrected.rhymeKey).toBe('OW-LD');
  });

  it('evicts only the corrected word, leaving other analyses warm', () => {
    PhonemeEngine.analyzeWord('bold');
    PhonemeEngine.analyzeWord('night');
    const sizeBefore = PhonemeEngine.WORD_CACHE.size;
    expect(sizeBefore).toBeGreaterThanOrEqual(2);

    PhonemeEngine.setAuthority('bold', { family: null, phonemes: ['B', 'OW1', 'L', 'D'] });

    expect(PhonemeEngine.WORD_CACHE.has('BOLD')).toBe(false);
    expect(PhonemeEngine.WORD_CACHE.has('NIGHT')).toBe(true);
    expect(PhonemeEngine.WORD_CACHE.size).toBe(sizeBefore - 1);
  });

  it('is case-insensitive and refuses payloads carrying no authority', () => {
    PhonemeEngine.analyzeWord('bold');
    expect(PhonemeEngine.setAuthority('BoLd', { phonemes: ['B', 'OW1', 'L', 'D'] })).toBe(true);
    expect(PhonemeEngine.analyzeWord('bold').vowelFamily).toBe('OW');

    expect(PhonemeEngine.setAuthority('bold', {})).toBe(false);
    expect(PhonemeEngine.setAuthority('bold', null)).toBe(false);
    expect(PhonemeEngine.setAuthority('', { phonemes: ['B'] })).toBe(false);
  });
});
