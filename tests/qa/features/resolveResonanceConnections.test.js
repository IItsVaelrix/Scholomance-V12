/**
 * Regression guard — resonance gate input resolver (SCD64 GATE_DATA_ABSENT).
 *
 * Pins the distinction the gate depends on: "analysis ran, no resonant words"
 * (sourcePresent: true, []) must not be confused with "no source on this
 * synthesis path" (sourcePresent: false). The latter drives degraded-mode UX;
 * the former is a legitimately empty strict gate.
 */
import { describe, it, expect } from 'vitest';
import { resolveResonanceConnections } from '../../../src/lib/truesight/resolveResonanceConnections.js';

describe('resolveResonanceConnections', () => {
  it('reads the server path (syntaxLayer.allConnections) and reports source present', () => {
    const conns = [{ score: 1, wordA: { charStart: 0 }, wordB: { charStart: 4 } }];
    const r = resolveResonanceConnections({ syntaxLayer: { allConnections: conns } });
    expect(r.sourcePresent).toBe(true);
    expect(r.connections).toBe(conns);
  });

  it('falls back to the un-aliased analysis.allConnections', () => {
    const conns = [{ score: 0.9 }];
    const r = resolveResonanceConnections({ analysis: { allConnections: conns } });
    expect(r.sourcePresent).toBe(true);
    expect(r.connections).toBe(conns);
  });

  it('falls back to verseIR.connections', () => {
    const conns = [{ score: 0.7 }];
    const r = resolveResonanceConnections({ verseIR: { connections: conns } });
    expect(r.sourcePresent).toBe(true);
    expect(r.connections).toBe(conns);
  });

  it('treats an empty server array as source-present (strict empty gate, NOT degraded)', () => {
    const r = resolveResonanceConnections({ syntaxLayer: { allConnections: [] } });
    expect(r.sourcePresent).toBe(true);
    expect(r.connections).toEqual([]);
  });

  it('reports NO source when the fallback artifact lacks every connection key', () => {
    // The local synthesis artifact: syntaxLayer has tokens but no allConnections,
    // verseIR has no connections.
    const fallbackArtifact = {
      syntaxLayer: { enabled: true, tokens: [{}, {}] },
      verseIR: { tokens: [{}, {}] },
    };
    const r = resolveResonanceConnections(fallbackArtifact);
    expect(r.sourcePresent).toBe(false);
    expect(r.connections).toEqual([]);
  });

  it('reports NO source for null/undefined analysis (loading state)', () => {
    expect(resolveResonanceConnections(null).sourcePresent).toBe(false);
    expect(resolveResonanceConnections(undefined).sourcePresent).toBe(false);
    expect(resolveResonanceConnections(null).connections).toEqual([]);
  });
});
