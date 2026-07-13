import { describe, expect, it } from 'vitest';
import { createVectorNNPhonemeSignature } from '../../codex/core/phonology/g2p/candidates/vector-nn.candidate.generator.js';

const cos = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
const sig = (w) => createVectorNNPhonemeSignature(w).vector;

describe('grapheme signature — the stub inverted every one of these', () => {
  it('scores spelling-similar words HIGH (fire ~ hire)', () => {
    expect(cos(sig('FIRE'), sig('HIRE'))).toBeGreaterThan(0.5);
  });

  it('scores a shared-suffix pair HIGH across different lengths (fire ~ desire)', () => {
    // The stub scored this -0.0398 purely because the lengths differ.
    expect(cos(sig('FIRE'), sig('DESIRE'))).toBeGreaterThan(0.35);
  });

  it('scores unrelated same-length words LOW (desire ~ banana)', () => {
    // The stub scored this 1.0000 purely because both are 6 letters.
    expect(cos(sig('DESIRE'), sig('BANANA'))).toBeLessThan(0.3);
  });

  it('is not a function of word length', () => {
    expect(cos(sig('FIRE'), sig('GLOW'))).toBeLessThan(0.99);
  });

  it('is deterministic', () => {
    expect(sig('DESIRE')).toEqual(sig('DESIRE'));
  });
});
