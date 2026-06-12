import { describe, it, expect } from 'vitest';
import {
  ensureValidWandFillSpec,
  FILL_SCHOOLS,
  FILL_RARITIES,
  FILL_EFFECTS,
  FILL_RARITY_OPTIONS,
  FILL_EFFECT_OPTIONS,
} from '../../../src/pages/PixelBrain/utils/wandFillValidation.js';

const VALID_SPEC = Object.freeze({
  bytecode: 'VW-VOID-COMMON-INERT',
  schoolId: 'VOID',
  rarity: 'COMMON',
  effect: 'INERT',
});

describe('wandFillValidation', () => {
  describe('enum membership via Set.has()', () => {
    it('FILL_RARITIES is a Set, not an Array', () => {
      expect(FILL_RARITIES).toBeInstanceOf(Set);
      expect(FILL_RARITIES.has('COMMON')).toBe(true);
      expect(FILL_RARITIES.has('RARE')).toBe(true);
      expect(FILL_RARITIES.has('INEXPLICABLE')).toBe(true);
      expect(FILL_RARITIES.has('MYSTICAL')).toBe(false);
    });

    it('FILL_EFFECTS is a Set, not an Array', () => {
      expect(FILL_EFFECTS).toBeInstanceOf(Set);
      expect(FILL_EFFECTS.has('INERT')).toBe(true);
      expect(FILL_EFFECTS.has('RESONANT')).toBe(true);
      expect(FILL_EFFECTS.has('HARMONIC')).toBe(true);
      expect(FILL_EFFECTS.has('TRANSCENDENT')).toBe(true);
      expect(FILL_EFFECTS.has('BANISHED')).toBe(false);
    });

    it('FILL_SCHOOLS is a Set derived from the canonical SCHOOLS registry', () => {
      expect(FILL_SCHOOLS).toBeInstanceOf(Set);
      for (const school of ['SONIC', 'PSYCHIC', 'VOID', 'ALCHEMY', 'WILL', 'NECROMANCY', 'ABJURATION', 'DIVINATION']) {
        expect(FILL_SCHOOLS.has(school)).toBe(true);
      }
      expect(FILL_SCHOOLS.has('NOT_A_SCHOOL')).toBe(false);
    });

    it('exposes spread-array views for <select> rendering', () => {
      expect(Array.isArray(FILL_RARITY_OPTIONS)).toBe(true);
      expect(Array.isArray(FILL_EFFECT_OPTIONS)).toBe(true);
      expect(FILL_RARITY_OPTIONS).toEqual([...FILL_RARITIES]);
      expect(FILL_EFFECT_OPTIONS).toEqual([...FILL_EFFECTS]);
    });
  });

  describe('ensureValidWandFillSpec', () => {
    it('returns the spec unchanged when fully valid', () => {
      const out = ensureValidWandFillSpec(VALID_SPEC);
      expect(out).toBe(VALID_SPEC);
    });

    it.each([
      ['bytecode', { schoolId: 'VOID', rarity: 'COMMON', effect: 'INERT' }],
      ['schoolId', { bytecode: 'VW', rarity: 'COMMON', effect: 'INERT' }],
      ['rarity',    { bytecode: 'VW', schoolId: 'VOID', effect: 'INERT' }],
      ['effect',    { bytecode: 'VW', schoolId: 'VOID', rarity: 'COMMON' }],
    ])('throws when required field "%s" is missing', (field, partial) => {
      expect(() => ensureValidWandFillSpec(partial)).toThrow(`"${field}"`);
    });

    it('throws on null / undefined / non-object spec', () => {
      expect(() => ensureValidWandFillSpec(null)).toThrow(/missing or invalid/);
      expect(() => ensureValidWandFillSpec(undefined)).toThrow(/missing or invalid/);
      expect(() => ensureValidWandFillSpec('VW')).toThrow(/missing or invalid/);
    });

    it('rejects unknown schoolId via Set.has()', () => {
      const spec = { ...VALID_SPEC, schoolId: 'BLOOD_MAGIC' };
      expect(() => ensureValidWandFillSpec(spec)).toThrow(/schoolId/);
      expect(FILL_SCHOOLS.has(spec.schoolId)).toBe(false);
    });

    it('rejects unknown rarity via Set.has()', () => {
      const spec = { ...VALID_SPEC, rarity: 'LEGENDARY' };
      expect(() => ensureValidWandFillSpec(spec)).toThrow(/rarity/);
      expect(FILL_RARITIES.has(spec.rarity)).toBe(false);
    });

    it('rejects unknown effect via Set.has()', () => {
      const spec = { ...VALID_SPEC, effect: 'WILD' };
      expect(() => ensureValidWandFillSpec(spec)).toThrow(/effect/);
      expect(FILL_EFFECTS.has(spec.effect)).toBe(false);
    });

    it('accepts every canonical school / rarity / effect combination', () => {
      for (const schoolId of FILL_SCHOOLS) {
        for (const rarity of FILL_RARITIES) {
          for (const effect of FILL_EFFECTS) {
            const spec = { bytecode: `VW-${schoolId}-${rarity}-${effect}`, schoolId, rarity, effect };
            expect(() => ensureValidWandFillSpec(spec)).not.toThrow();
          }
        }
      }
    });
  });
});
