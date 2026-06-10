import { describe, it, expect } from 'vitest';
import { computeFingerprint, semanticTokens, GOLDEN_RATIO } from '../../../src/pages/Visualiser/bytecodeFingerprint';

const TRACK = { title: 'Echoes of the Veil', bpm: 136, key: 'D minor' };

describe('bytecodeFingerprint', () => {
  it('is deterministic: same track produces identical output', () => {
    expect(computeFingerprint(TRACK)).toEqual(computeFingerprint(TRACK));
  });

  it('formats the fingerprint as four 4-hex groups', () => {
    expect(computeFingerprint(TRACK).fingerprint).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/);
  });

  it('builds a seed from title/bpm/key', () => {
    expect(computeFingerprint(TRACK).seed).toBe('0xECHO.136.Dm');
  });

  it('phase is always the golden ratio', () => {
    expect(computeFingerprint(TRACK).ritualSync.phase).toBe(GOLDEN_RATIO);
  });

  it('coordinates are within [-20, 20] and stable', () => {
    const c = computeFingerprint(TRACK).coordinates;
    for (const v of [c.x, c.y, c.z]) {
      expect(v).toBeGreaterThanOrEqual(-20);
      expect(v).toBeLessThanOrEqual(20);
    }
  });

  it('semanticTokens are deterministic, capitalized, stopword-free', () => {
    const toks = semanticTokens('We drift through the veil where echoes call and temples fall', 6);
    expect(toks).toEqual(semanticTokens('We drift through the veil where echoes call and temples fall', 6));
    expect(toks).not.toContain('Through');
    expect(toks.every((t) => /^[A-Z]/.test(t))).toBe(true);
  });
});
