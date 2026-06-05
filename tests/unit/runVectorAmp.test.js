import { describe, it, expect } from 'vitest';
import { runVectorAmp, compareSignatures, VECTOR_AMP_ERRORS } from '../../codex/core/semantic/amp/runVectorAmp.js';

describe('[core] [runVectorAmp]', () => {
  describe('vector amplification and signature comparison', () => {
    it('returns a valid signature and grades high fidelity for normal text', () => {
      const result = runVectorAmp('const x = 42; function solve() { return x; }');
      expect(result.ok).toBe(true);
      expect(result.signature).not.toBeNull();
      expect(result.signature.data).toBeInstanceOf(Uint8Array);
      expect(result.fidelity).not.toBeNull();
    });

    it('enforces self-similarity cosine of exactly 1.0 — REGRESSION GUARD', () => {
      const result = runVectorAmp('const x = 42; function solve() { return x; }');
      expect(result.ok).toBe(true);
      const similarity = compareSignatures(result.signature, result.signature);
      expect(similarity).toBeCloseTo(1.0, 5);
    });

    it('returns ok:false and an empty/sentinel signature on empty or degenerate input — REGRESSION GUARD', () => {
      const result = runVectorAmp('');
      expect(result.ok).toBe(false);
      expect(result.signature).not.toBeNull();
      expect(result.signature.data.length).toBe(0);
      expect(result.signature.norm).toBe(0);
      expect(result.error.code).toBe('AMP-ERR-012');
    });

    it('returns zero similarity when comparing degenerate or empty signatures — REGRESSION GUARD', () => {
      const normalResult = runVectorAmp('const x = 42;');
      const degenerateResult = runVectorAmp('');
      const similarity = compareSignatures(normalResult.signature, degenerateResult.signature);
      expect(similarity).toBe(0);
    });

    it('returns zero similarity for null or malformed signatures', () => {
      const normalResult = runVectorAmp('const x = 42;');
      expect(compareSignatures(null, normalResult.signature)).toBe(0);
      expect(compareSignatures(normalResult.signature, null)).toBe(0);
      expect(compareSignatures({ data: new Uint8Array([1, 2]) }, { data: new Uint8Array([1]) })).toBe(0);
    });

    it('clamps similarity bounds strictly between -1 and 1 — REGRESSION GUARD', () => {
      const res1 = runVectorAmp('const a = 1;');
      const res2 = runVectorAmp('function helper() {}');
      const similarity = compareSignatures(res1.signature, res2.signature);
      expect(similarity).toBeGreaterThanOrEqual(-1.0);
      expect(similarity).toBeLessThanOrEqual(1.0);
    });

    it('supports fidelity policy off without emitting health diagnostics', () => {
      const result = runVectorAmp('const offPolicy = true;', { fidelityPolicy: 'off' });
      expect(result.ok).toBe(true);
      expect(result.policy).toBe('off');
      expect(result.fidelity).toBeNull();
      expect(result.health).toBeNull();
      expect(result.diagnostics).toEqual([]);
    });

    it('rejects low-fidelity signatures when reject policy threshold is not met', () => {
      const result = runVectorAmp('function complex(a){return a.map(x=>x*x).join(",")}', {
        fidelityPolicy: 'reject',
        minGrade: 'A',
      });

      expect(result.ok).toBe(false);
      expect(result.policy).toBe('reject');
      expect(result.fidelity.grade).toBe('D');
      expect(result.error.code).toBe(VECTOR_AMP_ERRORS.FIDELITY_REJECTED);
    });

    it('returns AMP-ERR-009 when vector wiring throws', () => {
      const result = runVectorAmp('const broken = true;', { dimension: -1 });
      expect(result.ok).toBe(false);
      expect(result.policy).toBe('error');
      expect(result.signature).toBeNull();
      expect(result.error.code).toBe(VECTOR_AMP_ERRORS.VECTOR_WIRING_FAILED);
    });
  });
});
