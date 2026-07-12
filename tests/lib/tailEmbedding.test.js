import { describe, expect, it } from 'vitest';
import { extractRhymeTail } from '../../codex/core/phonology/tailEmbedding.js';

// ARPABET pronunciations (CMU)
const BRIGHT  = ['B', 'R', 'AY1', 'T'];
const SIN     = ['S', 'IH1', 'N'];
// Hiatus words: CMUdict splits the vowel-vowel sequence across two tokens,
// but only the SECOND carries stress. The tail must anchor there, not on
// whichever vowel comes first in the contiguous run.
const CREATE  = ['K', 'R', 'IY0', 'EY1', 'T'];
const REACT   = ['R', 'IY0', 'AE1', 'K', 'T'];

describe('extractRhymeTail', () => {
  it('takes the last vowel plus its coda', () => {
    expect(extractRhymeTail(BRIGHT)).toEqual(['AY', 'T']);
  });

  it('strips stress digits', () => {
    expect(extractRhymeTail(SIN)).toEqual(['IH', 'N']);
  });

  it('anchors on the STRESSED vowel in a hiatus, not the first vowel of the run (create)', () => {
    expect(extractRhymeTail(CREATE)).toEqual(['EY', 'T']);
  });

  it('anchors on the STRESSED vowel in a hiatus, not the first vowel of the run (react)', () => {
    expect(extractRhymeTail(REACT)).toEqual(['AE', 'K', 'T']);
  });
});
