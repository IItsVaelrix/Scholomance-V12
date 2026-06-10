import { describe, it, expect, beforeAll } from 'vitest';
import { PhonemeEngine } from '../../../codex/core/phonology/phoneme.engine.js';

/**
 * Regression guard for the G2P-Jury async edit.
 *
 * `_resolveWordAnalysisDetailed` was made `async` to host the G2P Jury, but its
 * synchronous consumers (analyzeDeepWithDiagnostics, analyzeDeep, the truesight
 * IR compiler, the phoneme-prion engine) read its result without `await`, so
 * every word resolved to `analysis: null` and downstream vectors were empty.
 *
 * Contract: analyzeDeepWithDiagnostics / analyzeDeep are SYNCHRONOUS and must
 * return real phonemes after init().
 */
describe('PhonemeEngine sync resolution contract', () => {
  beforeAll(async () => {
    await PhonemeEngine.init();
  });

  it('analyzeDeepWithDiagnostics returns phonemes synchronously', () => {
    const result = PhonemeEngine.analyzeDeepWithDiagnostics('calculate');
    expect(result.analysis).not.toBeNull();
    expect(Array.isArray(result.analysis?.phonemes)).toBe(true);
    expect(result.analysis.phonemes.length).toBeGreaterThan(0);
  });

  it('analyzeDeep returns phonemes synchronously for several identifiers', () => {
    for (const word of ['random', 'fetch', 'attacker']) {
      const analysis = PhonemeEngine.analyzeDeep(word);
      expect(analysis, `expected analysis for "${word}"`).not.toBeNull();
      expect(analysis.phonemes.length, `expected phonemes for "${word}"`).toBeGreaterThan(0);
    }
  });
});
