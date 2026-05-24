import { describe, expect, it } from 'vitest';
import {
  normalizeSignal,
  normalizeBytecodeHealthSnapshot,
} from '../../codex/core/diagnostic/BytecodeHealthAdapter.js';

describe('BytecodeHealthAdapter', () => {
  describe('normalizeSignal', () => {
    it('normalizes numeric signals', () => {
      expect(normalizeSignal(0.75)).toBe(0.75);
    });

    it('clamps numeric signals above 1', () => {
      expect(normalizeSignal(2)).toBe(1);
    });

    it('clamps numeric signals below 0', () => {
      expect(normalizeSignal(-2)).toBe(0);
    });

    it('normalizes boolean true to 1', () => {
      expect(normalizeSignal(true)).toBe(1);
    });

    it('normalizes boolean false to 0', () => {
      expect(normalizeSignal(false)).toBe(0);
    });

    it('normalizes score objects', () => {
      expect(normalizeSignal({ score: 0.4 })).toBe(0.4);
    });

    it('normalizes health objects', () => {
      expect(normalizeSignal({ health: 0.9 })).toBe(0.9);
    });

    it('normalizes ok:true to 1', () => {
      expect(normalizeSignal({ ok: true })).toBe(1);
    });

    it('normalizes ok:false to 0', () => {
      expect(normalizeSignal({ ok: false })).toBe(0);
    });

    it('normalizes status "stable" to 1', () => {
      expect(normalizeSignal({ status: 'stable' })).toBe(1);
    });

    it('normalizes status "critical" to 0.15', () => {
      expect(normalizeSignal({ status: 'critical' })).toBe(0.15);
    });

    it('normalizes status "warn" to 0.65', () => {
      expect(normalizeSignal({ status: 'warn' })).toBe(0.65);
    });

    it('normalizes status "missing" to 0', () => {
      expect(normalizeSignal({ status: 'missing' })).toBe(0);
    });

    it('normalizes unknown status to 0.5', () => {
      expect(normalizeSignal({ status: 'xyzzy' })).toBe(0.5);
    });

    it('returns 0 for null', () => {
      expect(normalizeSignal(null)).toBe(0);
    });

    it('returns 0 for undefined', () => {
      expect(normalizeSignal(undefined)).toBe(0);
    });

    it('returns 0 for empty object', () => {
      expect(normalizeSignal({})).toBe(0);
    });

    it('clamps score object values', () => {
      expect(normalizeSignal({ score: 1.5 })).toBe(1);
      expect(normalizeSignal({ score: -0.5 })).toBe(0);
    });

    it('handles non-finite numbers', () => {
      expect(normalizeSignal(Infinity)).toBe(0);
      expect(normalizeSignal(NaN)).toBe(0);
    });
  });

  describe('normalizeBytecodeHealthSnapshot', () => {
    it('returns canonical key order', () => {
      const result = normalizeBytecodeHealthSnapshot({
        Z_SIGNAL: 1,
        A_SIGNAL: 0.5,
      });

      expect(Object.keys(result)).toEqual(['A_SIGNAL', 'Z_SIGNAL']);
    });

    it('normalizes all signal shapes in one pass', () => {
      const result = normalizeBytecodeHealthSnapshot({
        A: true,
        B: { score: 0.6 },
        C: { status: 'critical' },
        D: 0.9,
      });

      expect(result.A).toBe(1);
      expect(result.B).toBe(0.6);
      expect(result.C).toBe(0.15);
      expect(result.D).toBe(0.9);
    });

    it('returns empty object for null input', () => {
      expect(normalizeBytecodeHealthSnapshot(null)).toEqual({});
    });

    it('returns empty object for empty input', () => {
      expect(normalizeBytecodeHealthSnapshot({})).toEqual({});
    });
  });
});
