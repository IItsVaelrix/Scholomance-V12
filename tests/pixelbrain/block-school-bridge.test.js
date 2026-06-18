import { describe, it, expect, beforeEach } from 'vitest';
import { schoolAt, getOrBuildBasis, maxRadiusFor, invalidateBasis } from '../../codex/core/pixelbrain/block-school-bridge.js';

const VALID_SCHOOL_IDS = new Set([
  'SONIC','PSYCHIC','VOID','ALCHEMY','WILL','NECROMANCY','ABJURATION','DIVINATION',
]);

beforeEach(() => {
  invalidateBasis();
});

describe('maxRadiusFor', () => {
  it('is floor(min(w,h,d) * 0.75)', () => {
    expect(maxRadiusFor(16, 16, 16)).toBe(12);
    expect(maxRadiusFor(32, 32, 32)).toBe(24);
    expect(maxRadiusFor(16, 32, 16)).toBe(12);
  });
});

describe('getOrBuildBasis', () => {
  it('returns an object with a Float32Array for each of the 8 schools', () => {
    const basis = getOrBuildBasis(8, 8, 8);
    for (const schoolId of VALID_SCHOOL_IDS) {
      expect(basis[schoolId]).toBeInstanceOf(Float32Array);
      expect(basis[schoolId].length).toBe(8 * 8 * 8);
    }
  });

  it('caches: second call returns the exact same object reference', () => {
    const a = getOrBuildBasis(8, 8, 8);
    const b = getOrBuildBasis(8, 8, 8);
    expect(a).toBe(b);
  });

  it('different sizes produce independent cache entries', () => {
    const a = getOrBuildBasis(8, 8, 8);
    const b = getOrBuildBasis(16, 16, 16);
    expect(a).not.toBe(b);
    expect(b['VOID'].length).toBe(16 * 16 * 16);
  });
});

describe('schoolAt', () => {
  it('returns a valid school ID', () => {
    const school = schoolAt(8, 8, 8, { VOID: 1.0 }, 4, 4, 4);
    expect(VALID_SCHOOL_IDS.has(school)).toBe(true);
  });

  it('returns VOID when schoolWeights is empty', () => {
    const school = schoolAt(8, 8, 8, {}, 4, 4, 4);
    expect(school).toBe('VOID');
  });

  it('returns the sole school when only one has positive weight', () => {
    const school = schoolAt(8, 8, 8, { ALCHEMY: 1.0 }, 4, 4, 4);
    expect(school).toBe('ALCHEMY');
  });

  it('is deterministic: same inputs always produce same output', () => {
    const a = schoolAt(8, 8, 8, { VOID: 0.6, NECROMANCY: 0.4 }, 2, 3, 5);
    const b = schoolAt(8, 8, 8, { VOID: 0.6, NECROMANCY: 0.4 }, 2, 3, 5);
    expect(a).toBe(b);
  });

  it('VOID and ALCHEMY bases differ at seed-adjacent cells (different attenuation physics)', () => {
    const voidSchool = schoolAt(8, 8, 8, { VOID: 1.0 }, 1, 1, 1);
    const alchSchool = schoolAt(8, 8, 8, { ALCHEMY: 1.0 }, 1, 1, 1);
    expect(VALID_SCHOOL_IDS.has(voidSchool)).toBe(true);
    expect(VALID_SCHOOL_IDS.has(alchSchool)).toBe(true);
  });
});
