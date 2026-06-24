/**
 * Float32 exact-cosine semantic embedding for codebase search.
 *
 * At the codebase's scale (~6k chunks, ~6 MB at float32) the 4-bit TurboQuant
 * path traded ranking accuracy for memory we don't need to save: the Hadamard
 * spread + 4-bit quantization put real queries in the F/D fidelity regime where
 * ranking is scrambled. The search index now stores full-precision unit vectors
 * and compares with exact cosine.
 */
import { describe, it, expect } from 'vitest';
import {
  embedFloat,
  cosineSimilarity,
} from '../../codex/core/semantic/amp/runVectorAmp.js';

describe('embedFloat', () => {
  it('returns a unit-norm float vector for real text', () => {
    const r = embedFloat('semantic search index oracle');
    expect(r.ok).toBe(true);
    expect(r.vector).toBeInstanceOf(Float32Array);
    expect(r.vector.length).toBe(256);
    let sumSq = 0;
    for (const x of r.vector) sumSq += x * x;
    expect(Math.sqrt(sumSq)).toBeCloseTo(1, 5);
  });

  it('reports not-ok for a token-less (blank) chunk', () => {
    const r = embedFloat('}, };');
    expect(r.ok).toBe(false);
    expect(r.vector).toBeNull();
  });

  it('is deterministic', () => {
    const a = embedFloat('oracle vector resonance');
    const b = embedFloat('oracle vector resonance');
    expect(Array.from(a.vector)).toEqual(Array.from(b.vector));
  });
});

describe('cosineSimilarity', () => {
  it('scores identical vectors as 1', () => {
    const { vector } = embedFloat('semantic search index oracle');
    expect(cosineSimilarity(vector, vector)).toBeCloseTo(1, 6);
  });

  it('returns 0 for empty or mismatched inputs', () => {
    const { vector } = embedFloat('oracle');
    expect(cosineSimilarity(vector, new Float32Array(0))).toBe(0);
    expect(cosineSimilarity(vector, new Float32Array(8))).toBe(0);
  });

  it('ranks related content above unrelated content', () => {
    const query = embedFloat('semantic search index vector embedding').vector;
    const related = embedFloat('vector embedding index for semantic search').vector;
    const unrelated = embedFloat('pancake breakfast syrup griddle').vector;
    expect(cosineSimilarity(query, related)).toBeGreaterThan(
      cosineSimilarity(query, unrelated),
    );
  });
});
