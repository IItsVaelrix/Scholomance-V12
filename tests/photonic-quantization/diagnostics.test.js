import { describe, expect, it } from 'vitest';
import {
  hashString,
  hashObject,
  createDiagnostic,
  sortDiagnostics,
} from '../../src/lib/photonic-quantization/photonic-diagnostics.js';

describe('hashString', () => {
  it('returns an 8-character uppercase hex string', () => {
    const result = hashString('hello');
    expect(result).toMatch(/^[0-9A-F]{8}$/);
  });

  it('is deterministic for the same input', () => {
    expect(hashString('test')).toBe(hashString('test'));
  });

  it('produces different hashes for different inputs', () => {
    expect(hashString('a')).not.toBe(hashString('b'));
  });

  it('handles empty string without throwing', () => {
    expect(() => hashString('')).not.toThrow();
  });

  it('handles null and undefined via coercion', () => {
    expect(hashString(null)).toBe(hashString(''));
    expect(hashString(undefined)).toBe(hashString(''));
  });
});

describe('hashObject', () => {
  it('is deterministic for equal objects', () => {
    const a = { z: 1, a: 2 };
    const b = { a: 2, z: 1 };
    expect(hashObject(a)).toBe(hashObject(b));
  });

  it('differs for different objects', () => {
    expect(hashObject({ x: 1 })).not.toBe(hashObject({ x: 2 }));
  });

  it('handles nested objects deterministically', () => {
    const a = { outer: { z: 'z', a: 'a' } };
    const b = { outer: { a: 'a', z: 'z' } };
    expect(hashObject(a)).toBe(hashObject(b));
  });

  it('handles arrays deterministically', () => {
    expect(hashObject([1, 2, 3])).toBe(hashObject([1, 2, 3]));
    expect(hashObject([1, 2, 3])).not.toBe(hashObject([3, 2, 1]));
  });

  it('handles null values without throwing', () => {
    expect(() => hashObject({ a: null })).not.toThrow();
  });

  it('handles undefined values without throwing', () => {
    expect(() => hashObject({ a: undefined })).not.toThrow();
    expect(hashObject({ a: undefined })).toBe(hashObject({ a: undefined }));
  });
});

describe('createDiagnostic', () => {
  it('creates a frozen diagnostic with all required fields', () => {
    const d = createDiagnostic('CODE_X', 'error', 'Something failed', { key: 'val' });
    expect(d.code).toBe('CODE_X');
    expect(d.severity).toBe('error');
    expect(d.message).toBe('Something failed');
    expect(d.details.key).toBe('val');
    expect(Object.isFrozen(d)).toBe(true);
  });

  it('defaults code to PHOTONIC_UNKNOWN when falsy', () => {
    const d = createDiagnostic('', 'info', 'msg');
    expect(d.code).toBe('PHOTONIC_UNKNOWN');
  });

  it('defaults severity to info when falsy', () => {
    const d = createDiagnostic('CODE', '', 'msg');
    expect(d.severity).toBe('info');
  });

  it('defaults message to empty string when falsy', () => {
    const d = createDiagnostic('CODE', 'warn', null);
    expect(d.message).toBe('');
  });
});

describe('sortDiagnostics', () => {
  it('sorts errors before warnings before info', () => {
    const diagnostics = [
      createDiagnostic('C', 'info', ''),
      createDiagnostic('A', 'error', ''),
      createDiagnostic('B', 'warn', ''),
    ];
    const sorted = sortDiagnostics(diagnostics);
    expect(sorted[0].severity).toBe('error');
    expect(sorted[1].severity).toBe('warn');
    expect(sorted[2].severity).toBe('info');
  });

  it('sorts alphabetically by code within the same severity', () => {
    const diagnostics = [
      createDiagnostic('ZCODE', 'warn', ''),
      createDiagnostic('ACODE', 'warn', ''),
    ];
    const sorted = sortDiagnostics(diagnostics);
    expect(sorted[0].code).toBe('ACODE');
    expect(sorted[1].code).toBe('ZCODE');
  });

  it('returns a frozen array', () => {
    const sorted = sortDiagnostics([createDiagnostic('X', 'info', '')]);
    expect(Object.isFrozen(sorted)).toBe(true);
  });

  it('handles non-array input gracefully', () => {
    expect(sortDiagnostics(null)).toEqual([]);
    expect(sortDiagnostics(undefined)).toEqual([]);
  });

  it('is deterministic for the same input', () => {
    const diagnostics = [
      createDiagnostic('B', 'warn', ''),
      createDiagnostic('A', 'error', ''),
    ];
    expect(sortDiagnostics(diagnostics)).toEqual(sortDiagnostics(diagnostics));
  });
});
