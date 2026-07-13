import { describe, expect, it } from 'vitest';
import { DeepRhymeEngine } from '../../codex/core/rhyme-astrology/deepRhyme.engine.js';

const VERSE = 'the ember flame climbs higher\nand every word i wrote is fire';

describe('phraseWindows', () => {
  it('emits one entry per phrase window, not one per pair', async () => {
    const engine = new DeepRhymeEngine();
    const analysis = await engine.analyzeDocument(VERSE, { mode: 'balanced' });
    expect(Array.isArray(analysis.phraseWindows)).toBe(true);
    const phrasePairs = analysis.allConnections.filter((c) => c.type === 'phrase_compound').length;
    // The whole point: windows are linear, pairs are not.
    expect(analysis.phraseWindows.length).toBeLessThanOrEqual(Math.max(phrasePairs, 1) * 4);
  });

  it('carries a sign and a span on every window', async () => {
    const engine = new DeepRhymeEngine();
    const analysis = await engine.analyzeDocument(VERSE, { mode: 'balanced' });
    for (const w of analysis.phraseWindows) {
      expect(typeof w.sign).toBe('string');
      expect(Number.isInteger(w.charStart)).toBe(true);
      expect(Number.isInteger(w.charEnd)).toBe(true);
      expect(w.charEnd).toBeGreaterThan(w.charStart);
    }
  });

  it('gives rhyming windows the same sign (higher / fire)', async () => {
    const engine = new DeepRhymeEngine();
    const analysis = await engine.analyzeDocument(VERSE, { mode: 'balanced' });
    const signs = new Map();
    for (const w of analysis.phraseWindows) {
      if (!w.sign) continue;
      if (!signs.has(w.sign)) signs.set(w.sign, []);
      signs.get(w.sign).push(w);
    }
    // At least one sign is shared by two or more windows — that shared sign IS the rhyme.
    expect([...signs.values()].some((group) => group.length >= 2)).toBe(true);
  });
});
