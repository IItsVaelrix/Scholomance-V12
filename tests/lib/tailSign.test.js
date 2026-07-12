import { describe, expect, it } from 'vitest';
import { buildTailSignBands, sharesSignBand } from '../../codex/core/phonology/tailEmbedding.js';

const FIRE   = ['F', 'AY1', 'ER0'];
const DESIRE = ['D', 'IH0', 'Z', 'AY1', 'ER0'];
const HIGHER = ['HH', 'AY1', 'ER0'];
const BANANA = ['B', 'AH0', 'N', 'AE1', 'N', 'AH0'];
const SIN    = ['S', 'IH1', 'N'];
const SIM    = ['S', 'IH1', 'M'];

describe('buildTailSignBands', () => {
  it('is deterministic', () => {
    expect(buildTailSignBands(FIRE)).toEqual(buildTailSignBands(FIRE));
  });

  it('returns no bands for a featureless tail (never bucket silence together)', () => {
    expect(buildTailSignBands([])).toEqual([]);
  });

  it('gives identical tails identical bands (fire / desire / higher all end AY-ER)', () => {
    expect(buildTailSignBands(FIRE)).toEqual(buildTailSignBands(DESIRE));
    expect(buildTailSignBands(HIGHER)).toEqual(buildTailSignBands(DESIRE));
  });
});

describe('sharesSignBand — candidate generation', () => {
  it('collides real rhymes', () => {
    expect(sharesSignBand(buildTailSignBands(FIRE), buildTailSignBands(DESIRE))).toBe(true);
  });

  it('collides slant codas (sin ~ sim)', () => {
    expect(sharesSignBand(buildTailSignBands(SIN), buildTailSignBands(SIM))).toBe(true);
  });

  it('does not collide unrelated tails (desire ~ banana)', () => {
    expect(sharesSignBand(buildTailSignBands(DESIRE), buildTailSignBands(BANANA))).toBe(false);
  });

  it('never collides on empty bands', () => {
    expect(sharesSignBand([], [])).toBe(false);
  });
});
