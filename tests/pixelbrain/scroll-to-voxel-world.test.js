import { describe, it, expect } from 'vitest';
import {
  schoolWeightsToEnergyMix,
  weightedEnergyMixProperty,
  assignSeedEnergyTypes,
  applySchoolWeightsToSeeds,
  deriveQbitParametersFromSchools,
  generateVoxelFieldFromScrollAnalysis,
  SCHOOL_VOXEL_DEFAULTS,
  SCROLL_TO_VOXEL_INTERNALS,
} from '../../codex/core/pixelbrain/scroll-to-voxel-world.js';
import { ENERGY_TYPES } from '../../codex/core/pixelbrain/voxel-volume.js';
import { ATTENUATION_MODELS } from '../../codex/core/pixelbrain/qbit-field.js';

function makeSeed(i, vx = 0, vy = 0, vz = 0) {
  return { vx, vy, vz, energy: 1.0, energyType: 0, index: i };
}

describe('scroll-to-voxel-world', () => {
  describe('schoolWeightsToEnergyMix', () => {
    it('returns VOID-only mix for empty input', () => {
      const mix = schoolWeightsToEnergyMix({});
      expect(mix).toHaveLength(1);
      expect(mix[0].schoolId).toBe('VOID');
      expect(mix[0].weight).toBe(1.0);
      expect(mix[0].energyTypeId).toBe(ENERGY_TYPES.STRUCTURAL);
    });

    it('returns VOID-only mix for null/undefined input', () => {
      expect(schoolWeightsToEnergyMix(null)[0].schoolId).toBe('VOID');
      expect(schoolWeightsToEnergyMix(undefined)[0].schoolId).toBe('VOID');
    });

    it('normalizes raw weights to sum to 1.0', () => {
      const mix = schoolWeightsToEnergyMix({ VOID: 3, ALCHEMY: 1 });
      const total = mix.reduce((sum, entry) => sum + entry.weight, 0);
      expect(total).toBeCloseTo(1.0);
    });

    it('sorts by weight descending', () => {
      const mix = schoolWeightsToEnergyMix({ VOID: 0.6, ALCHEMY: 0.3, PSYCHIC: 0.1 });
      expect(mix[0].schoolId).toBe('VOID');
      expect(mix[1].schoolId).toBe('ALCHEMY');
      expect(mix[2].schoolId).toBe('PSYCHIC');
    });

    it('breaks ties on weight by schoolId lexicographic order', () => {
      const mix = schoolWeightsToEnergyMix({ WILL: 0.5, ALCHEMY: 0.5 });
      // ALCHEMY < WILL lexicographically
      expect(mix[0].schoolId).toBe('ALCHEMY');
      expect(mix[1].schoolId).toBe('WILL');
    });

    it('ignores unknown school IDs', () => {
      const mix = schoolWeightsToEnergyMix({ VOID: 1, UNKNOWN: 1 });
      expect(mix).toHaveLength(1);
      expect(mix[0].schoolId).toBe('VOID');
    });

    it('ignores zero and negative weights', () => {
      const mix = schoolWeightsToEnergyMix({ VOID: 1, ALCHEMY: 0, PSYCHIC: -1 });
      expect(mix.map((e) => e.schoolId)).toEqual(['VOID']);
    });

    it('each mix entry exposes energyType, energyTypeId, baseThreshold, emission', () => {
      const mix = schoolWeightsToEnergyMix({ ALCHEMY: 1 });
      const entry = mix[0];
      expect(entry.energyType).toBe('THERMAL');
      expect(entry.energyTypeId).toBe(ENERGY_TYPES.THERMAL);
      expect(entry.baseThreshold).toBe(0.25);
      expect(entry.emission).toBe(0.7);
    });

    it('is deterministic — same input always produces equal output', () => {
      const a = schoolWeightsToEnergyMix({ VOID: 0.4, ALCHEMY: 0.6 });
      const b = schoolWeightsToEnergyMix({ ALCHEMY: 0.6, VOID: 0.4 });
      expect(a).toEqual(b);
    });

    it('case-insensitive school IDs', () => {
      const lower = schoolWeightsToEnergyMix({ void: 0.5, alchemy: 0.5 });
      const upper = schoolWeightsToEnergyMix({ VOID: 0.5, ALCHEMY: 0.5 });
      expect(lower).toEqual(upper);
    });
  });

  describe('weightedEnergyMixProperty', () => {
    it('returns 0 for empty mix', () => {
      expect(weightedEnergyMixProperty([], 'baseThreshold')).toBe(0);
    });

    it('returns the property of the only entry when mix has one school', () => {
      const mix = schoolWeightsToEnergyMix({ VOID: 1 });
      expect(weightedEnergyMixProperty(mix, 'baseThreshold')).toBeCloseTo(0.55);
    });

    it('linearly blends baseThreshold across schools', () => {
      const mix = schoolWeightsToEnergyMix({ VOID: 0.5, ALCHEMY: 0.5 });
      // VOID baseThreshold = 0.55, ALCHEMY = 0.25 → mean = 0.40
      expect(weightedEnergyMixProperty(mix, 'baseThreshold')).toBeCloseTo(0.40);
    });

    it('linearly blends emission across schools', () => {
      const mix = schoolWeightsToEnergyMix({ VOID: 0.5, DIVINATION: 0.5 });
      // VOID emission = 0.0, DIVINATION = 0.9 → mean = 0.45
      expect(weightedEnergyMixProperty(mix, 'emission')).toBeCloseTo(0.45);
    });
  });

  describe('assignSeedEnergyTypes', () => {
    it('returns empty array for empty seed list', () => {
      const mix = schoolWeightsToEnergyMix({ VOID: 1 });
      expect(assignSeedEnergyTypes([], mix)).toEqual([]);
    });

    it('returns seeds unchanged when mix is empty', () => {
      const seeds = [makeSeed(0)];
      const result = assignSeedEnergyTypes(seeds, []);
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(seeds[0]); // shallow-equal preserved
    });

    it('assigns the only energy type when mix has one entry', () => {
      const mix = schoolWeightsToEnergyMix({ ALCHEMY: 1 });
      const seeds = [makeSeed(0), makeSeed(1), makeSeed(2)];
      const result = assignSeedEnergyTypes(seeds, mix);
      for (const s of result) {
        expect(s.energyType).toBe(ENERGY_TYPES.THERMAL);
        expect(s.energySchool).toBe('ALCHEMY');
      }
    });

    it('VOID-dominant scroll (0.8 VOID, 0.2 ALCHEMY) gives mostly STRUCTURAL seeds', () => {
      const mix = schoolWeightsToEnergyMix({ VOID: 0.8, ALCHEMY: 0.2 });
      const seeds = Array.from({ length: 100 }, (_, i) => makeSeed(i));
      const result = assignSeedEnergyTypes(seeds, mix);
      const structural = result.filter((s) => s.energyType === ENERGY_TYPES.STRUCTURAL).length;
      expect(structural).toBeGreaterThanOrEqual(75);
      expect(structural).toBeLessThanOrEqual(82);
    });

    it('ALCHEMY-dominant scroll (0.9 ALCHEMY) gives mostly THERMAL seeds', () => {
      const mix = schoolWeightsToEnergyMix({ ALCHEMY: 0.9, VOID: 0.1 });
      const seeds = Array.from({ length: 100 }, (_, i) => makeSeed(i));
      const result = assignSeedEnergyTypes(seeds, mix);
      const thermal = result.filter((s) => s.energyType === ENERGY_TYPES.THERMAL).length;
      expect(thermal).toBeGreaterThanOrEqual(86);
    });

    it('preserves seed fields other than energyType', () => {
      const mix = schoolWeightsToEnergyMix({ VOID: 1 });
      const seed = { vx: 5, vy: 10, vz: 15, energy: 0.7, energyType: 99, custom: 'x' };
      const [out] = assignSeedEnergyTypes([seed], mix);
      expect(out.vx).toBe(5);
      expect(out.vy).toBe(10);
      expect(out.vz).toBe(15);
      expect(out.energy).toBe(0.7);
      expect(out.custom).toBe('x');
      expect(out.energyType).toBe(ENERGY_TYPES.STRUCTURAL);
    });

    it('is deterministic — same seed indices always produce same energy types', () => {
      const mix = schoolWeightsToEnergyMix({ VOID: 0.5, ALCHEMY: 0.5 });
      const seeds = Array.from({ length: 50 }, (_, i) => makeSeed(i));
      const a = assignSeedEnergyTypes(seeds, mix);
      const b = assignSeedEnergyTypes(seeds, mix);
      for (let i = 0; i < seeds.length; i++) {
        expect(a[i].energyType).toBe(b[i].energyType);
      }
    });
  });

  describe('applySchoolWeightsToSeeds', () => {
    it('round-trips a single-school scroll', () => {
      const seeds = [makeSeed(0), makeSeed(1)];
      const result = applySchoolWeightsToSeeds(seeds, { ALCHEMY: 1 });
      expect(result.every((s) => s.energyType === ENERGY_TYPES.THERMAL)).toBe(true);
    });
  });

  describe('deriveQbitParametersFromSchools', () => {
    it('VOID-dominant → gaussian attenuation, longer decay', () => {
      const params = deriveQbitParametersFromSchools({ VOID: 1 });
      expect(params.attenuationModel).toBe(ATTENUATION_MODELS.GAUSSIAN);
      expect(params.decay).toBeGreaterThan(0);
      expect(params.dominantSchoolId).toBe('VOID');
      expect(params.dominantEnergyTypeId).toBe(ENERGY_TYPES.STRUCTURAL);
    });

    it('ALCHEMY-dominant → inverse_square attenuation, shorter decay', () => {
      const voidParams = deriveQbitParametersFromSchools({ VOID: 1 });
      const alchParams = deriveQbitParametersFromSchools({ ALCHEMY: 1 });
      expect(alchParams.attenuationModel).toBe(ATTENUATION_MODELS.INVERSE_SQUARE);
      expect(alchParams.dominantSchoolId).toBe('ALCHEMY');
      // ALCHEMY has decayScale 0.6, VOID 1.3 → alch decay < void decay
      expect(alchParams.decay).toBeLessThan(voidParams.decay);
    });

    it('emission for VOID is 0, for DIVINATION is 0.9', () => {
      expect(deriveQbitParametersFromSchools({ VOID: 1 }).emission).toBeCloseTo(0.0);
      expect(deriveQbitParametersFromSchools({ DIVINATION: 1 }).emission).toBeCloseTo(0.9);
    });

    it('blended weights produce blended baseThreshold', () => {
      const voidParams = deriveQbitParametersFromSchools({ VOID: 1 });
      const alchParams = deriveQbitParametersFromSchools({ ALCHEMY: 1 });
      const mixed = deriveQbitParametersFromSchools({ VOID: 0.5, ALCHEMY: 0.5 });
      expect(mixed.baseThreshold).toBeGreaterThan(alchParams.baseThreshold);
      expect(mixed.baseThreshold).toBeLessThan(voidParams.baseThreshold);
    });

    it('iterations stays in valid integer range (≥ 0)', () => {
      const params = deriveQbitParametersFromSchools({ VOID: 1, ABJURATION: 1 });
      expect(params.iterations).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(params.iterations)).toBe(true);
    });

    it('exposes the mix on the result for downstream consumers', () => {
      const params = deriveQbitParametersFromSchools({ VOID: 0.6, ALCHEMY: 0.4 });
      expect(params.mix).toHaveLength(2);
      expect(params.mix[0].schoolId).toBe('VOID');
    });

    it('honours baseDecay / baseIterations option overrides', () => {
      const params = deriveQbitParametersFromSchools(
        { VOID: 1 },
        { baseDecay: 0.05, baseIterations: 10 }
      );
      // VOID decayScale = 1.3 → 0.05 * 1.3 = 0.065
      expect(params.decay).toBeCloseTo(0.065);
      // VOID iterationsBias = -1 → 10 - 1 = 9
      expect(params.iterations).toBe(9);
    });
  });

  describe('generateVoxelFieldFromScrollAnalysis', () => {
    const volume = { width: 8, height: 8, depth: 8 };
    const seeds = Array.from({ length: 4 }, (_, i) => ({
      vx: 4, vy: 4, vz: 4, energy: 1.0, energyType: 0, index: i,
    }));

    it('returns a field with energyAt and gradientAt', () => {
      const result = generateVoxelFieldFromScrollAnalysis(seeds, { VOID: 1 }, volume);
      expect(typeof result.field.energyAt).toBe('function');
      expect(typeof result.field.gradientAt).toBe('function');
      expect(result.field.width).toBe(8);
    });

    it('exposes params, mix, and tagged seeds on the result', () => {
      const result = generateVoxelFieldFromScrollAnalysis(seeds, { ALCHEMY: 1 }, volume);
      expect(result.params.dominantSchoolId).toBe('ALCHEMY');
      expect(result.mix[0].schoolId).toBe('ALCHEMY');
      expect(result.seeds[0].energyType).toBe(ENERGY_TYPES.THERMAL);
    });

    it('rejects non-array seeds', () => {
      expect(() => generateVoxelFieldFromScrollAnalysis(null, {}, volume)).toThrow();
    });

    it('rejects volumes missing dimensions', () => {
      expect(() => generateVoxelFieldFromScrollAnalysis(seeds, {}, {})).toThrow();
    });

    it('center cell has the highest energy for a single-seed scenario', () => {
      const singleSeed = [{ vx: 4, vy: 4, vz: 4, energy: 1.0, energyType: 0, index: 0 }];
      const result = generateVoxelFieldFromScrollAnalysis(singleSeed, { VOID: 1 }, volume);
      const center = result.field.energyAt(4, 4, 4);
      const corner = result.field.energyAt(0, 0, 0);
      expect(center).toBeGreaterThan(corner);
    });

    it('is deterministic — same inputs produce identical fields', () => {
      const a = generateVoxelFieldFromScrollAnalysis(seeds, { VOID: 0.5, ALCHEMY: 0.5 }, volume);
      const b = generateVoxelFieldFromScrollAnalysis(seeds, { VOID: 0.5, ALCHEMY: 0.5 }, volume);
      for (let y = 0; y < volume.height; y++) {
        for (let z = 0; z < volume.depth; z++) {
          for (let x = 0; x < volume.width; x++) {
            expect(a.field.energyAt(x, y, z)).toBe(b.field.energyAt(x, y, z));
          }
        }
      }
    });
  });

  describe('SCHOOL_VOXEL_DEFAULTS', () => {
    it('covers all eight schools', () => {
      const expected = ['SONIC', 'PSYCHIC', 'VOID', 'ALCHEMY', 'WILL', 'NECROMANCY', 'ABJURATION', 'DIVINATION'];
      for (const id of expected) {
        expect(SCHOOL_VOXEL_DEFAULTS[id]).toBeDefined();
        expect(SCHOOL_VOXEL_DEFAULTS[id].attenuationModel).toBeDefined();
      }
    });

    it('attenuationModel is one of the qbit-field models', () => {
      const valid = new Set(Object.values(ATTENUATION_MODELS));
      for (const [, defaults] of Object.entries(SCHOOL_VOXEL_DEFAULTS)) {
        expect(valid.has(defaults.attenuationModel)).toBe(true);
      }
    });
  });

  describe('SCROLL_TO_VOXEL_INTERNALS', () => {
    it('normalizeSchoolWeights returns empty for invalid input', () => {
      const { normalizeSchoolWeights } = SCROLL_TO_VOXEL_INTERNALS;
      expect(normalizeSchoolWeights(null)).toEqual({});
      expect(normalizeSchoolWeights({})).toEqual({});
      expect(normalizeSchoolWeights({ UNKNOWN: 1 })).toEqual({});
    });

    it('ALL_SCHOOL_IDS has length 8', () => {
      expect(SCROLL_TO_VOXEL_INTERNALS.ALL_SCHOOL_IDS).toHaveLength(8);
    });
  });
});
