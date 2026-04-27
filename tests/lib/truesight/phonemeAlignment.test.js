import { describe, it, expect } from 'vitest';
import { alignPhonemes } from '../../../codex/core/phonology/phonemeAlignment.js';

describe('phonemeAlignment — Modified Levenshtein with Study1 Table 2 costs', () => {
  it('produces three substitutions for thin → fun (study1 Figure 3)', () => {
    const stim = ['F', 'AH', 'N'];
    const resp = ['TH', 'IH', 'N'];
    const { alignment, cost } = alignPhonemes(stim, resp);

    expect(alignment).toHaveLength(3);
    expect(alignment.map(a => a.op)).toEqual(['sub', 'sub', 'match']);
    expect(alignment[0]).toMatchObject({ stim: 'F', resp: 'TH' });
    expect(alignment[1]).toMatchObject({ stim: 'AH', resp: 'IH' });
    expect(alignment[2]).toMatchObject({ stim: 'N', resp: 'N', op: 'match' });
    expect(cost).toBeGreaterThan(0);
    expect(cost).toBeLessThan(6);
  });

  it('handles pure insertion: cat → can-t (study1 Figure 5 type)', () => {
    const stim = ['K', 'AE', 'T'];
    const resp = ['K', 'AE', 'N', 'T'];
    const { alignment } = alignPhonemes(stim, resp);

    const ops = alignment.map(a => a.op);
    expect(ops).toContain('insert');
    expect(ops.filter(o => o === 'match')).toHaveLength(3);
    const inserted = alignment.find(a => a.op === 'insert');
    expect(inserted?.resp).toBe('N');
    expect(inserted?.stim).toBe('-');
  });

  it('handles pure deletion: fun → un (F dropped)', () => {
    const stim = ['F', 'AH', 'N'];
    const resp = ['AH', 'N'];
    const { alignment } = alignPhonemes(stim, resp);

    const ops = alignment.map(a => a.op);
    expect(ops).toContain('delete');
    const deleted = alignment.find(a => a.op === 'delete');
    expect(deleted?.stim).toBe('F');
    expect(deleted?.resp).toBe('-');
  });

  it('returns zero cost for identical sequences', () => {
    const stim = ['B', 'IY', 'T'];
    const { alignment, cost } = alignPhonemes(stim, stim);
    expect(cost).toBe(0);
    expect(alignment.every(a => a.op === 'match')).toBe(true);
  });

  it('prefers similar-vowel substitution (AE↔EH) over consonant-vowel substitution', () => {
    const stim = ['B', 'AE', 'T'];
    const resp = ['B', 'EH', 'T'];
    const { alignment, cost } = alignPhonemes(stim, resp);

    const subOp = alignment.find(a => a.op === 'sub');
    expect(subOp?.stim).toBe('AE');
    expect(subOp?.resp).toBe('EH');
    expect(cost).toBeLessThan(2);
  });

  it('handles empty stimulus or response', () => {
    expect(alignPhonemes([], ['A']).cost).toBeGreaterThan(0);
    expect(alignPhonemes(['A'], []).cost).toBeGreaterThan(0);
    expect(alignPhonemes([], []).cost).toBe(0);
  });

  it('preserves stress markers in stim/resp output', () => {
    const stim = ['B', 'IY1', 'T'];
    const resp = ['B', 'IH1', 'T'];
    const { alignment } = alignPhonemes(stim, resp);
    expect(alignment[1].stim).toBe('IY1');
    expect(alignment[1].resp).toBe('IH1');
  });
});
