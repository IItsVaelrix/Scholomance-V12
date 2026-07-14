// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildResonanceGate } from '../../src/lib/truesight/buildResonanceGate.js';
import { resolveResonanceConnections } from '../../src/lib/truesight/resolveResonanceConnections.js';

/**
 * The unit tests for buildResonanceGate and PhonemeEngine.authorityFailure both
 * passed while the bug was still live, because nothing threaded the flag from the
 * wire into the gate — the early return was dead code in the running app.
 *
 * This test asserts the CHAIN, which is the only thing that actually protects the
 * user: backend says authority is unavailable -> ReadPage reads it off the payload
 * -> the gate renders nothing. Without authority the phonemes are spelling guesses,
 * and colouring from them inverts love/move and though/tough. A blank gate is
 * honest; a wrong gate is a lie.
 */

const CONNECTIONS = [
  { type: 'perfect', score: 1, wordA: { charStart: 0 }, wordB: { charStart: 20 } },
  { type: 'assonance', score: 0.8, wordA: { charStart: 5 }, wordB: { charStart: 25 } },
];

// Exactly what ReadPage.jsx does, kept in lockstep with it.
function gateFor(deepAnalysis) {
  const { connections } = resolveResonanceConnections(deepAnalysis);
  const authorityUnavailable = Boolean(
    deepAnalysis?.syntaxLayer?.authorityUnavailable
    ?? deepAnalysis?.analysis?.authorityUnavailable,
  );
  return buildResonanceGate(connections, { authorityUnavailable });
}

describe('authority gate — the wire-to-gate chain', () => {
  it('colours when the backend reports authority is available', () => {
    const gate = gateFor({ analysis: { allConnections: CONNECTIONS, authorityUnavailable: false } });
    expect(gate.size).toBeGreaterThan(0);
  });

  it('colours NOTHING when the backend reports authority is unavailable', () => {
    const gate = gateFor({ analysis: { allConnections: CONNECTIONS, authorityUnavailable: true } });
    expect(gate.size).toBe(0);
  });

  it('honours the flag under the syntaxLayer alias too (useVerseSynthesis sets both)', () => {
    const analysis = { allConnections: CONNECTIONS, authorityUnavailable: true };
    const gate = gateFor({ analysis, syntaxLayer: analysis });
    expect(gate.size).toBe(0);
  });

  it('still colours when the flag is absent entirely (older payloads)', () => {
    const gate = gateFor({ analysis: { allConnections: CONNECTIONS } });
    expect(gate.size).toBeGreaterThan(0);
  });

  it('ReadPage actually passes the flag — guards against the gate call losing its second argument', () => {
    // The original bug was literally `buildResonanceGate(connections)` with no opts,
    // which made the whole authority path dead code while every unit test stayed green.
    //
    // The pattern used to demand the options object be EXACTLY `{ authorityUnavailable }`,
    // which guarded the flag by forbidding every other option — so adding `multis` (the
    // separate multi-rhyme pipeline) tripped a test about authority. Assert the INTENT:
    // the flag must be inside the options object, whatever else is there.
    const source = readFileSync('src/pages/Read/ReadPage.jsx', 'utf8');
    expect(source).toMatch(/buildResonanceGate\(\s*connections\s*,\s*\{[^}]*\bauthorityUnavailable\b[^}]*\}\s*\)/);
  });

  it('ReadPage passes the multis through as their OWN option, not merged into connections', () => {
    // A multi is a chain of rhyme families across syllables; a connection is one rhyme
    // on one token. Merging them would drag multis through the word tier's score bar
    // and type set. They must arrive separately.
    const source = readFileSync('src/pages/Read/ReadPage.jsx', 'utf8');
    expect(source).toMatch(/buildResonanceGate\(\s*connections\s*,\s*\{[^}]*\bmultis\b[^}]*\}\s*\)/);
  });
});
