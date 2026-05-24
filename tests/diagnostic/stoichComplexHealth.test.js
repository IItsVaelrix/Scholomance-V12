import { describe, expect, it } from 'vitest';
import {
  normalizeStoichVector,
  evaluateStoichComplex,
} from '../../codex/core/diagnostic/StoichComplexHealth.js';

describe('StoichComplexHealth', () => {
  describe('normalizeStoichVector', () => {
    it('normalizes vectors into proportional ratios', () => {
      expect(normalizeStoichVector({ a: 2, b: 2 })).toEqual({ a: 0.5, b: 0.5 });
    });

    it('handles zero-total vectors without division errors', () => {
      expect(normalizeStoichVector({ a: 0, b: 0 })).toEqual({ a: 0, b: 0 });
    });

    it('handles empty vector', () => {
      expect(normalizeStoichVector({})).toEqual({});
    });

    it('clamps negative values to zero before normalizing', () => {
      const result = normalizeStoichVector({ a: -1, b: 2 });
      expect(result.a).toBe(0);
      expect(result.b).toBe(1);
    });
  });

  describe('evaluateStoichComplex', () => {
    it('classifies missing required subunits as critical', () => {
      const result = evaluateStoichComplex({
        complexId: 'TEST_COMPLEX',
        expected: { a: 1, b: 1 },
        observed: { a: 1, b: 0 },
      });

      expect(result.status).toBe('critical');
      expect(result.limiting[0].subunitId).toBe('b');
      expect(result.limiting[0].state).toBe('missing');
    });

    it('detects excess signal as noisy', () => {
      const result = evaluateStoichComplex({
        complexId: 'TEST_COMPLEX',
        expected: { a: 1, b: 1 },
        observed: { a: 9, b: 1 },
        thresholds: { excessRatio: 1.45 },
      });

      expect(result.excess.some((unit) => unit.subunitId === 'a')).toBe(true);
    });

    it('returns repair vectors sorted by deviation severity', () => {
      const result = evaluateStoichComplex({
        complexId: 'TEST_COMPLEX',
        expected: { a: 1, b: 1, c: 1 },
        observed: { a: 0, b: 0.2, c: 1 },
      });

      // c is excess (dev=0.5), a is missing (dev=0.333), b is limiting (dev=0.167)
      expect(result.repairVector.map((item) => item.subunitId)).toEqual([
        'c',
        'a',
        'b',
      ]);
    });

    it('returns stable status when all subunits are within expected ratios', () => {
      const result = evaluateStoichComplex({
        complexId: 'TEST_COMPLEX',
        expected: { a: 1, b: 1 },
        observed: { a: 1, b: 1 },
      });

      expect(result.status).toBe('stable');
      expect(result.health).toBeCloseTo(1, 5);
      expect(result.repairVector).toEqual([]);
    });

    it('produces deterministic output for identical inputs', () => {
      const params = {
        complexId: 'DET_COMPLEX',
        expected: { x: 2, y: 1 },
        observed: { x: 0.5, y: 0.8 },
        weights: { x: 1.2, y: 1.0 },
      };

      const r1 = evaluateStoichComplex(params);
      const r2 = evaluateStoichComplex(params);

      expect(r1.health).toBe(r2.health);
      expect(r1.status).toBe(r2.status);
      expect(JSON.stringify(r1.repairVector)).toBe(JSON.stringify(r2.repairVector));
    });

    it('maps subunit states to correct repair actions', () => {
      const result = evaluateStoichComplex({
        complexId: 'TEST_COMPLEX',
        expected: { a: 1, b: 1, c: 1, d: 1 },
        observed: { a: 0, b: 0.1, c: 9, d: 0.5 },
      });

      const byId = Object.fromEntries(
        result.repairVector.map((r) => [r.subunitId, r]),
      );

      expect(byId.a?.action).toBe('restore_signal');
      expect(byId.b?.action).toBe('increase_coverage');
      expect(byId.c?.action).toBe('reduce_noise');
    });

    it('handles empty observed without crashing', () => {
      const result = evaluateStoichComplex({
        complexId: 'EMPTY_COMPLEX',
        expected: { a: 1, b: 1 },
        observed: {},
      });

      expect(result.status).toBe('critical');
      expect(result.health).toBeGreaterThanOrEqual(0);
    });
  });
});
