import { describe, expect, it } from 'vitest';
import {
  extractRhymeTail,
  buildTailFeatureVector,
  tailCosine,
  TAIL_VECTOR_DIM,
} from '../../codex/core/phonology/tailEmbedding.js';

// ARPABET pronunciations (CMU)
const FIRE    = ['F', 'AY1', 'ER0'];
const DESIRE  = ['D', 'IH0', 'Z', 'AY1', 'ER0'];
const HIGHER  = ['HH', 'AY1', 'ER0'];
const BANANA  = ['B', 'AH0', 'N', 'AE1', 'N', 'AH0'];
const SIN     = ['S', 'IH1', 'N'];
const SIM     = ['S', 'IH1', 'M'];
const SIT     = ['S', 'IH1', 'T'];
const BRIGHT  = ['B', 'R', 'AY1', 'T'];
// Hiatus words: CMUdict splits the vowel-vowel sequence across two tokens,
// but only the SECOND carries stress. The tail must anchor there, not on
// whichever vowel comes first in the contiguous run.
const CREATE  = ['K', 'R', 'IY0', 'EY1', 'T'];
const ELATE   = ['IH0', 'L', 'EY1', 'T'];
const REACT   = ['R', 'IY0', 'AE1', 'K', 'T'];
const TRACT   = ['T', 'R', 'AE1', 'K', 'T'];

const sim = (a, b) => tailCosine(buildTailFeatureVector(a), buildTailFeatureVector(b));

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

describe('buildTailFeatureVector', () => {
  it('is a fixed power-of-two dimension (fastHadamardTransform requires it)', () => {
    expect(buildTailFeatureVector(FIRE)).toHaveLength(TAIL_VECTOR_DIM);
    expect(TAIL_VECTOR_DIM & (TAIL_VECTOR_DIM - 1)).toBe(0);
  });
});

describe('tailCosine — the invariant the old vector-nn stub inverted', () => {
  it('scores a real rhyme HIGH (fire ~ desire)', () => {
    expect(sim(FIRE, DESIRE)).toBeGreaterThan(0.95);
  });

  it('scores a real compound rhyme HIGH (higher ~ desire)', () => {
    expect(sim(HIGHER, DESIRE)).toBeGreaterThan(0.95);
  });

  it('scores an unrelated word LOW (desire ~ banana)', () => {
    expect(sim(DESIRE, BANANA)).toBeLessThan(0.8);
  });

  it('ranks a slant coda (sin~sim, place only) above a distant coda (sin~sit)', () => {
    expect(sim(SIN, SIM)).toBeGreaterThan(sim(SIN, SIT));
  });

  it('scores a real hiatus rhyme HIGH (create ~ elate)', () => {
    expect(sim(CREATE, ELATE)).toBeGreaterThan(0.95);
  });

  it('scores a real hiatus rhyme HIGH (react ~ tract)', () => {
    expect(sim(REACT, TRACT)).toBeGreaterThan(0.95);
  });

  // NOTE: poet~note ('OW','AH','T' vs 'OW','T') is NOT covered here. Both the
  // pre-fix and post-fix extractRhymeTail produce that same pair of tails
  // (this word never hit the leftmost-of-run extraction bug — its only
  // stressed vowel already sat at the start of its vowel-vowel run), and the
  // measured 0.911 cosine is a property of NUCLEUS_WEIGHT squaring the shared
  // OW nucleus's self-dot (32) so it dominates the two extra coda phonemes'
  // contribution (dot 35 / norms 41,36) regardless of tail-extraction
  // correctness. Fixing that would mean touching buildTailFeatureVector,
  // which is out of scope here — tracked as a follow-up, not asserted as a
  // passing regression test.
});
