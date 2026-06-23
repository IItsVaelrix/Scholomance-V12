import { describe, it, expect } from 'vitest';
import { buildResonanceGate } from '../../src/lib/truesight/buildResonanceGate.js';

const conn = (aCS, bCS, type, score) => ({
  wordA: { charStart: aCS },
  wordB: { charStart: bCS },
  type,
  score,
});

describe('buildResonanceGate', () => {
  it('returns a Map (so .has/.size still work for existing consumers)', () => {
    const gate = buildResonanceGate([]);
    expect(gate).toBeInstanceOf(Map);
    expect(gate.size).toBe(0);
  });

  it('assigns the rhyme tier to a high-scoring non-assonance connection', () => {
    const gate = buildResonanceGate([conn(0, 10, 'perfect', 0.97)]);
    expect(gate.get(0)).toBe('rhyme');
    expect(gate.get(10)).toBe('rhyme');
    expect(gate.has(0)).toBe(true);
  });

  it('assigns the assonance tier to a type:assonance connection (below the rhyme bar)', () => {
    const gate = buildResonanceGate([conn(0, 10, 'assonance', 0.62)]);
    expect(gate.get(0)).toBe('assonance');
    expect(gate.get(10)).toBe('assonance');
  });

  it('does NOT color a sub-threshold non-assonance connection (slant stays grey)', () => {
    const gate = buildResonanceGate([conn(0, 10, 'slant', 0.6)]);
    expect(gate.has(0)).toBe(false);
    expect(gate.has(10)).toBe(false);
  });

  it('does NOT admit phrase_compound to the rhyme tier even above the score bar', () => {
    // Phrase-window connections are not word rhymes; they flood the gate and
    // colored ~68% of the document. They belong to the highlight overlay, not
    // the per-word color gate.
    const gate = buildResonanceGate([conn(0, 10, 'phrase_compound', 0.96)]);
    expect(gate.has(0)).toBe(false);
    expect(gate.has(10)).toBe(false);
  });

  it('does NOT admit consonance to the rhyme tier', () => {
    const gate = buildResonanceGate([conn(0, 10, 'consonance', 0.97)]);
    expect(gate.has(0)).toBe(false);
  });

  it('rhyme wins when a charStart is in both a rhyme and an assonance connection', () => {
    // assonance first, then rhyme
    const a = buildResonanceGate([conn(5, 9, 'assonance', 0.62), conn(5, 20, 'perfect', 0.98)]);
    expect(a.get(5)).toBe('rhyme');
    // rhyme first, then assonance — order must not matter
    const b = buildResonanceGate([conn(5, 20, 'perfect', 0.98), conn(5, 9, 'assonance', 0.62)]);
    expect(b.get(5)).toBe('rhyme');
  });

  it('leaves a weak assonance echo (below the floor) grey', () => {
    // Incidental same-vowel pairs below the assonance floor are noise, not
    // resonance — they must not tint.
    const gate = buildResonanceGate([conn(0, 10, 'assonance', 0.55)]);
    expect(gate.has(0)).toBe(false);
    expect(gate.has(10)).toBe(false);
  });

  it('respects a custom assonanceMinScore', () => {
    const conns = [conn(0, 10, 'assonance', 0.62)];
    expect(buildResonanceGate(conns, { assonanceMinScore: 0.7 }).has(0)).toBe(false);
    expect(buildResonanceGate(conns, { assonanceMinScore: 0.6 }).get(0)).toBe('assonance');
  });

  it('ignores non-array input and malformed charStarts', () => {
    expect(buildResonanceGate(null).size).toBe(0);
    expect(buildResonanceGate([conn(undefined, NaN, 'assonance', 0.62)]).size).toBe(0);
  });
});
