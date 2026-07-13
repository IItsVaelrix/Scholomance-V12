import { describe, expect, it } from 'vitest';
import { DeepRhymeEngine } from '../../codex/core/rhyme-astrology/deepRhyme.engine.js';

const DENSE = [
  'the ember flame will climb up higher',
  'and every word i wrote is fire',
  'i light the pyre of my desire',
  'a liar in the choir sings entire',
].join('\n');

describe('multisyllabic density after bucketing', () => {
  it('density stays a real fraction in [0,1] and is not degenerate', async () => {
    const engine = new DeepRhymeEngine();
    const analysis = await engine.analyzeDocument(DENSE, { mode: 'balanced' });
    const all = analysis.allConnections.length;
    const multi = analysis.allConnections.filter((c) => (Number(c.syllablesMatched) || 0) >= 2).length;
    expect(all).toBeGreaterThan(0);
    const density = multi / Math.max(1, all);
    expect(density).toBeGreaterThanOrEqual(0);
    expect(density).toBeLessThanOrEqual(1);
    // Before bucketing, `all` was inflated ~90x by junk phrase pairs, which
    // crushed density toward 0. It must no longer be pinned at the floor.
    expect(density).toBeGreaterThan(0.01);
  });
});
