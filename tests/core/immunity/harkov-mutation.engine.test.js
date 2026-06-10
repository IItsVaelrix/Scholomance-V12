import { describe, it, expect } from 'vitest';
import {
  trainTransitionModel,
  transitionProbability,
  sequenceLogLikelihood,
} from '../../../codex/core/immunity/harkov-mutation.engine.js';

describe('harkov mutation engine', () => {
  it('scores in-distribution sequences as less anomalous than out-of-distribution', () => {
    const train = [
      ['A', 'B', 'C', 'A', 'B', 'C'],
      ['A', 'B', 'C', 'A', 'B', 'C'],
    ];
    const model = trainTransitionModel(train);
    const inDist = sequenceLogLikelihood(model, ['A', 'B', 'C', 'A', 'B', 'C']);
    const outDist = sequenceLogLikelihood(model, ['C', 'C', 'C', 'A', 'A', 'A']);
    expect(inDist.meanNll).toBeLessThan(outDist.meanNll);
  });

  it('never returns infinite NLL for unseen transitions (add-k smoothing)', () => {
    const model = trainTransitionModel([['A', 'B', 'A', 'B']]);
    const r = sequenceLogLikelihood(model, ['X', 'Y', 'Z']);
    expect(Number.isFinite(r.meanNll)).toBe(true);
    expect(r.meanNll).toBeGreaterThan(0);
  });

  it('is deterministic: same corpus produces identical probabilities', () => {
    const corpus = [['A', 'B', 'C'], ['A', 'B', 'D']];
    const m1 = trainTransitionModel(corpus);
    const m2 = trainTransitionModel(corpus);
    expect(transitionProbability(m1, 'A', 'B', 'C'))
      .toBe(transitionProbability(m2, 'A', 'B', 'C'));
  });

  it('returns Infinity meanNll for an empty sequence', () => {
    const model = trainTransitionModel([['A', 'B']]);
    expect(sequenceLogLikelihood(model, []).meanNll).toBe(Infinity);
  });
});
