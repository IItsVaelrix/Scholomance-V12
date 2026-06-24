/**
 * Regression: the semantic lens must have an honest zero.
 *
 * A token-less chunk (e.g. a closing-brace tail like "}, };") produces a
 * zero vector. Before this fix, quantizeVectorJS mapped that zero vector to a
 * CONSTANT non-zero byte pattern (all 0x88 → dequant +0.0667), a "ghost"
 * signature that scored an identical, fixed similarity (~0.375) against any
 * query and thereby out-ranked weakly-matching real content.
 *
 * Honest zero: a zero-norm input must compress to an EMPTY signature, and the
 * comparison primitive must treat any constant/ghost signature as zero
 * resonance.
 */
import { describe, it, expect } from 'vitest';
import { quantizeVectorJS } from '../../codex/core/quantization/turboquant.js';
import {
  runVectorAmp,
  compareSignatures,
} from '../../codex/core/semantic/amp/runVectorAmp.js';

const SEED = 1337;
const DIM = 256;

describe('quantizeVectorJS honest zero', () => {
  it('compresses a zero-norm vector to an empty signature, not a 0x88 ghost', () => {
    const zero = new Float32Array(DIM); // all zeros
    const { data, norm } = quantizeVectorJS(zero, SEED);
    expect(norm).toBe(0);
    expect(data.length).toBe(0);
  });
});

describe('compareSignatures ghost rejection', () => {
  it('scores a legacy constant "ghost" signature as zero resonance', () => {
    // A legacy zero-chunk already stored in the index: 128 bytes all 0x88.
    const ghost = { data: new Uint8Array(128).fill(0x88) };
    const query = runVectorAmp('semantic search index oracle').signature;
    expect(compareSignatures(query, ghost)).toBe(0);
  });

  it('ranks real matching content strictly above a ghost', () => {
    const query = runVectorAmp('semantic search index oracle vector embedding').signature;
    const real = runVectorAmp('semantic search index embedding oracle vector resonance').signature;
    const ghost = { data: new Uint8Array(128).fill(0x88) };

    const realScore = compareSignatures(query, real);
    const ghostScore = compareSignatures(query, ghost);

    expect(ghostScore).toBe(0);
    expect(realScore).toBeGreaterThan(ghostScore);
  });
});
