// @vitest-environment node
//
// Regression Guard — the Phonology panel must not present a GUESS as a FACT.
//
// PhonemeEngine sources a pronunciation one of two ways:
//
//   LOOKED UP   cmu_dictionary — a real pronunciation from a real dictionary.
//   GUESSED     heuristic_fallback — the word is in no dictionary, so the engine
//               derives phonemes from the SPELLING. "saudade" comes out
//               S AO0 D EY1 D; "zzyzx" comes out Z Z Y Z K S.
//
// The panel printed both identically: a vowel family, a coda and a rhyme key, stated
// as fact. For a guessed word every one of those fields is invented, because they are
// all computed FROM the invented phonemes.
//
// The engine has always known the difference — analyzeWordWithDiagnostics reports the
// source. The panel simply never asked. gene BUGPATTERN_COLOR_DRAGON_FRONTEND_FALLBACK:
// a frontend guess must not outrank, or impersonate, backend truth.

import { beforeAll, describe, expect, it } from 'vitest';
import { PhonemeEngine } from '../../codex/core/phonology/phoneme.engine.js';
import { CmuPhonemeEngine } from '../../codex/core/phonology/cmu.phoneme.engine.js';
import {
  buildRitualPrediction,
  isPhonemeSourceAuthoritative,
} from '../../src/lib/ritualPredictionTooltip.js';

function phonologyOf(word) {
  return buildRitualPrediction({
    word,
    line: 0,
    column: 0,
    contextLine: word,
    surroundingText: word,
  })?.prediction?.phonology;
}

describe('[Lib] phonology provenance', () => {
  beforeAll(async () => {
    await CmuPhonemeEngine.init();
    await PhonemeEngine.init();
  });

  it('does not mark a dictionary word as estimated', () => {
    const phonology = phonologyOf('bold');

    expect(phonology).toBeTruthy();
    expect(phonology.source).toBe('cmu_dictionary');
    expect(phonology.estimated).toBe(false);

    // ...and the fields it states really are the dictionary's.
    expect(phonology.vowelFamily).toBe('OW');
    expect(phonology.rhymeKey).toBe('OW-LD');
  });

  it('MARKS a word whose phonemes were guessed from its spelling', () => {
    // "saudade" is not in CMU. The engine invents S AO0 D EY1 D from the letters,
    // and the vowel/coda/rhyme below are invented with it.
    const phonology = phonologyOf('saudade');

    expect(phonology).toBeTruthy();
    expect(phonology.source).toBe('heuristic_fallback');
    expect(phonology.estimated).toBe(true);
  });

  it('marks pure nonsense as estimated rather than describing it', () => {
    const phonology = phonologyOf('zzyzx');
    expect(phonology.estimated).toBe(true);
  });

  it('classifies every source the engine can report', () => {
    // A source the engine adds later must default to ESTIMATED, not to authoritative —
    // an unknown provenance is not a trusted one.
    expect(isPhonemeSourceAuthoritative('cmu_dictionary')).toBe(true);
    expect(isPhonemeSourceAuthoritative('scholomance_dictionary')).toBe(true);

    expect(isPhonemeSourceAuthoritative('heuristic_fallback')).toBe(false);
    expect(isPhonemeSourceAuthoritative('alphabet_literal')).toBe(false);
    expect(isPhonemeSourceAuthoritative('some_future_source')).toBe(false);
    expect(isPhonemeSourceAuthoritative(null)).toBe(false);
    expect(isPhonemeSourceAuthoritative(undefined)).toBe(false);
  });
});
