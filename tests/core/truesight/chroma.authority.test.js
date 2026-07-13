import { describe, expect, it } from 'vitest';
import { authorityFor, authorityForToken } from '../../../codex/core/shared/truesight/color/chroma.authority.js';

describe('chroma authority', () => {
  it('maps the Scholomance dictionary to full confidence', () => {
    expect(authorityFor('scholomance_dictionary')).toEqual({ letter: 'D', confidence: 1 });
  });

  it('maps a curated override and CMU below our own dictionary but above a guess', () => {
    expect(authorityFor('word_override')).toEqual({ letter: 'O', confidence: 0.9 });
    expect(authorityFor('cmu_dictionary')).toEqual({ letter: 'C', confidence: 0.8 });
  });

  it('maps every guessing branch to G at 0.50 — below the 0.51 threshold', () => {
    for (const source of ['heuristic_fallback', 'alphabet_literal', 'multi_word_composition']) {
      expect(authorityFor(source), source).toEqual({ letter: 'G', confidence: 0.5 });
    }
  });

  it('treats an untraceable cache hit as unproven, not as truth', () => {
    // The engine itself notes these were "reused without a stored provenance trail".
    expect(authorityFor('cached_analysis')).toEqual({ letter: 'U', confidence: 0 });
    expect(authorityFor('unresolved')).toEqual({ letter: 'U', confidence: 0 });
  });

  it('treats an unknown or absent source as no authority at all', () => {
    expect(authorityFor('unspecified_engine')).toEqual({ letter: 'X', confidence: 0 });
    expect(authorityFor(undefined)).toEqual({ letter: 'X', confidence: 0 });
  });

  it('reads the authority straight off an IR token', () => {
    const token = { phoneticDiagnostics: { source: 'heuristic_fallback' } };
    expect(authorityForToken(token)).toEqual({ letter: 'G', confidence: 0.5 });
    expect(authorityForToken({})).toEqual({ letter: 'X', confidence: 0 });
  });
});
