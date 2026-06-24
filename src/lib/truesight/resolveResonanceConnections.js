/**
 * resolveResonanceConnections — single source for the resonance gate's input.
 *
 * Rhyme/assonance connections are produced by the SERVER panel-analysis
 * pipeline (deepRhymeEngine) and surfaced on the artifact as
 * `syntaxLayer.allConnections` (aliased from `analysis.allConnections` in
 * useVerseSynthesis). Every LOCAL fallback synthesis path
 * (`nlu.synthesizeVerse` → `synthesizeVerse` → `buildSyntaxLayer`) produces a
 * syntaxLayer with NO `allConnections`, and `compileVerseToIR` produces no
 * `.connections`. So the resonance gate, which historically read only
 * `syntaxLayer.allConnections`, was starved of input whenever the server was
 * unreachable — the gate Set came out empty and every word rendered grey.
 *
 * This helper makes the gate's read path explicit and path-agnostic, and —
 * critically — distinguishes "analysis ran but found no resonant words"
 * (sourcePresent: true, connections: []) from "no analysis source exists on
 * this path at all" (sourcePresent: false). The caller uses `sourcePresent`
 * to drive a deliberate degraded-mode UX (a quiet "resonance offline" signal)
 * instead of silently greying everything.
 *
 * Diagnosed as SCD64 family GATE_DATA_ABSENT
 * (03030742C01B6AC16D9C5B00CF603CFBD906A4D5F91679A661F84A3B19C5CB5A).
 *
 * Pure function — no React, no DOM, no module state.
 *
 * @param {object|null} deepAnalysis - The unified analysis artifact.
 * @returns {{ connections: Array, sourcePresent: boolean }}
 */
export function resolveResonanceConnections(deepAnalysis) {
  // Server path (and its alias) — the authoritative source.
  const fromSyntaxLayer = deepAnalysis?.syntaxLayer?.allConnections;
  if (Array.isArray(fromSyntaxLayer)) {
    return { connections: fromSyntaxLayer, sourcePresent: true };
  }

  // The un-aliased server payload, in case the alias is ever absent.
  const fromAnalysis = deepAnalysis?.analysis?.allConnections;
  if (Array.isArray(fromAnalysis)) {
    return { connections: fromAnalysis, sourcePresent: true };
  }

  // The IR shape some artifacts expose (mirrors useVerseSynthesis'
  // activeConnections fallback).
  const fromVerseIR = deepAnalysis?.verseIR?.connections;
  if (Array.isArray(fromVerseIR)) {
    return { connections: fromVerseIR, sourcePresent: true };
  }

  // No connection source on this synthesis path.
  return { connections: [], sourcePresent: false };
}
