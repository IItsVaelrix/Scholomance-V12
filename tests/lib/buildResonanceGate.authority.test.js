import { describe, expect, it } from 'vitest';
import { buildResonanceGate } from '../../src/lib/truesight/buildResonanceGate.js';

const CONNECTIONS = [
  { type: 'perfect', score: 1, wordA: { charStart: 0 }, wordB: { charStart: 20 } },
  { type: 'assonance', score: 0.8, wordA: { charStart: 5 }, wordB: { charStart: 25 } },
];

describe('buildResonanceGate — authority gating', () => {
  it('colours normally when authority is available', () => {
    const gate = buildResonanceGate(CONNECTIONS, {});
    expect(gate.size).toBeGreaterThan(0);
  });

  it('colours NOTHING when authority is unavailable', () => {
    // Without dictionary truth the phonemes are spelling guesses. Colouring from
    // them is worse than not colouring: love/move and though/tough invert.
    const gate = buildResonanceGate(CONNECTIONS, { authorityUnavailable: true });
    expect(gate.size).toBe(0);
  });
});
