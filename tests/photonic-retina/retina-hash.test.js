import { describe, expect, it } from 'vitest';
import { stableHash, stableSerialize } from '../../src/lib/photonic-retina/retina-hash.js';

describe('retina-hash', () => {
  it('produces the same hash for the same object', () => {
    const input = { sourceKind: 'coordinates', payload: [{ x: 1, y: 2 }] };

    expect(stableHash(input)).toBe(stableHash(input));
  });

  it('ignores object key order', () => {
    const left = { b: 2, a: 1 };
    const right = { a: 1, b: 2 };

    expect(stableHash(left)).toBe(stableHash(right));
  });

  it('serializes typed arrays deterministically', () => {
    const left = new Uint8ClampedArray([12, 24, 36, 48]);
    const right = new Uint8ClampedArray([12, 24, 36, 48]);

    expect(stableSerialize(left)).toBe(stableSerialize(right));
    expect(stableHash(left)).toBe(stableHash(right));
  });

  it('serializes nested objects deterministically', () => {
    const left = { payload: [{ z: 3, x: 1, nested: { b: 2, a: 1 } }] };
    const right = { payload: [{ nested: { a: 1, b: 2 }, x: 1, z: 3 }] };

    expect(stableSerialize(left)).toBe(stableSerialize(right));
    expect(stableHash(left)).toBe(stableHash(right));
  });
});
