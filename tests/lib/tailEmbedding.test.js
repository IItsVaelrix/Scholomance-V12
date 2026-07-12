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

const sim = (a, b) => tailCosine(buildTailFeatureVector(a), buildTailFeatureVector(b));

describe('extractRhymeTail', () => {
  it('takes the last vowel plus its coda', () => {
    expect(extractRhymeTail(BRIGHT)).toEqual(['AY', 'T']);
  });

  it('strips stress digits', () => {
    expect(extractRhymeTail(SIN)).toEqual(['IH', 'N']);
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
});
