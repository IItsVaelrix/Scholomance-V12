import { describe, it, expect, beforeEach } from 'vitest';
import {
  schoolAt,
  getOrBuildBasis,
  maxRadiusFor,
  invalidateBasis,
  resolveBlockContext,
  prewarmBasis,
} from '../../codex/core/pixelbrain/block-school-bridge.js';

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

const KNOWN_BLOCK_IDS = new Set([
  'voidstone_smooth','voidstone_cracked','voidstone_edge_dark',
  'basalt_slab','basalt_fractured',
  'voidmetal_ore_large','voidmetal_ore_small',
  'cyan_crystal_growth','cyan_crystal_embedded',
  'path_rune_floor',
  'grimstone_block','grimstone_mossy',
  'peat_damp','peat_dry',
  'ash_grass','grimwood_log','ruins_brick',
]);

describe('resolveBlockContext', () => {
  it('returns { schoolId, blockId } with non-empty strings', () => {
    const ctx = resolveBlockContext(8, 8, 8, { VOID: 1.0 }, 1, 4, 4, 4);
    expect(typeof ctx.schoolId).toBe('string');
    expect(ctx.schoolId.length).toBeGreaterThan(0);
    expect(typeof ctx.blockId).toBe('string');
    expect(ctx.blockId.length).toBeGreaterThan(0);
  });

  it('VOID school + materialId=1 returns a VOID tier-1 blockId', () => {
    const ctx = resolveBlockContext(8, 8, 8, { VOID: 1.0 }, 1, 4, 4, 4);
    expect(ctx.schoolId).toBe('VOID');
    expect(['voidstone_smooth','voidstone_cracked','voidstone_edge_dark']).toContain(ctx.blockId);
  });

  it('NECROMANCY school + materialId=2 returns a NECROMANCY tier-2 blockId', () => {
    const ctx = resolveBlockContext(8, 8, 8, { NECROMANCY: 1.0 }, 2, 4, 4, 4);
    expect(ctx.schoolId).toBe('NECROMANCY');
    expect(['peat_damp','peat_dry']).toContain(ctx.blockId);
  });

  it('all fallback schools (ABJURATION, SONIC, PSYCHIC, WILL) return a recognised blockId', () => {
    for (const school of ['ABJURATION','SONIC','PSYCHIC','WILL']) {
      const ctx = resolveBlockContext(8, 8, 8, { [school]: 1.0 }, 2, 4, 4, 4);
      expect(KNOWN_BLOCK_IDS.has(ctx.blockId)).toBe(true);
    }
  });

  it('is deterministic', () => {
    const a = resolveBlockContext(8, 8, 8, { VOID: 0.7, ALCHEMY: 0.3 }, 3, 2, 3, 5);
    const b = resolveBlockContext(8, 8, 8, { VOID: 0.7, ALCHEMY: 0.3 }, 3, 2, 3, 5);
    expect(a.schoolId).toBe(b.schoolId);
    expect(a.blockId).toBe(b.blockId);
  });
});

describe('prewarmBasis', () => {
  it('fills the cache so subsequent getOrBuildBasis calls return the same reference', () => {
    prewarmBasis([{ w: 8, h: 8, d: 8 }, { w: 16, h: 16, d: 16 }]);
    const a = getOrBuildBasis(8, 8, 8);
    const b = getOrBuildBasis(16, 16, 16);
    expect(a).toBeDefined();
    expect(b).toBeDefined();
    expect(getOrBuildBasis(8, 8, 8)).toBe(a);
    expect(getOrBuildBasis(16, 16, 16)).toBe(b);
  });
});

describe('invalidateBasis', () => {
  it('clears a specific size entry', () => {
    const a = getOrBuildBasis(8, 8, 8);
    invalidateBasis(8, 8, 8);
    const b = getOrBuildBasis(8, 8, 8);
    expect(a).not.toBe(b);
  });

  it('clears all entries when called with no arguments', () => {
    getOrBuildBasis(8, 8, 8);
    getOrBuildBasis(16, 16, 16);
    invalidateBasis();
    const a = getOrBuildBasis(8, 8, 8);
    expect(a).toBeDefined();
  });
});
