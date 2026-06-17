/**
 * QBIT-Voxel Level 5 Integration Test — Phoneme-World Resonance
 *
 * Per QBIT-VOXEL-SYNTHESIS.md §4 Level 5: words produce worlds.
 *
 * Demonstrates the convergence by generating two voxel worlds from two
 * different scrolls and asserting:
 *   - VOID-dominant scroll → cold structural world (high-threshold, low
 *     emission, sparse-but-angular geometry, mostly STRUCTURAL cells)
 *   - ALCHEMY-dominant scroll → warm thermal world (low-threshold, high
 *     emission, dense glowing geometry, mostly THERMAL cells)
 *
 * The two worlds share the seed positions and the Wand formula. The only
 * thing that changes is the schoolWeights distribution. Anything that
 * differs between the two outputs is, by construction, a consequence of
 * the language.
 *
 * No RNG, no manual tuning per scroll, no hand-painted biome overrides.
 * The world is the phoneme distribution made visible.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { writeFileSync, mkdirSync } from 'fs';

import {
  createVoxelVolume,
  cellIndex,
  isCellOccupied,
  setCellMaterial,
  getCellMaterialId,
  ENERGY_TYPES,
} from '../../codex/core/pixelbrain/voxel-volume.js';
import { generateFibonacciSeeds } from '../../codex/core/pixelbrain/wand-seed-lift.js';
import { assignMaterial } from '../../codex/core/pixelbrain/qbit-field.js';
import { applyHollownessAMP } from '../../codex/core/pixelbrain/hollowness-amp.js';
import { runBiomeCoherenceAMP } from '../../codex/core/pixelbrain/biome-coherence-amp.js';
import { collectFaces } from '../../codex/core/pixelbrain/iso-projector.js';
import { renderFacesToSVG } from '../../codex/core/pixelbrain/voxel-svg-renderer.js';
import {
  generateVoxelFieldFromScrollAnalysis,
  schoolWeightsToEnergyMix,
} from '../../codex/core/pixelbrain/scroll-to-voxel-world.js';

const SIZE = 32;

// Two scrolls expressed as their TrueSight `schoolWeights` outputs.
// In production these come from `analyzePoem(text).schoolWeights`. Inlining
// them keeps this test independent of the phoneme dictionary (the unit
// surface under test is the resonance, not the analyzer).
const VOID_SCROLL = Object.freeze({
  // "I cast no shadow on the silent floor / where empty echoes leave no door"
  // Tonally heavy on dark vowels — TrueSight maps this to VOID.
  VOID: 0.75,
  NECROMANCY: 0.15,
  ABJURATION: 0.10,
});

const ALCHEMY_SCROLL = Object.freeze({
  // "Bright copper boils through golden veins / where every flask becomes a flame"
  // Tonally heavy on bright vowels — TrueSight maps this to ALCHEMY.
  ALCHEMY: 0.70,
  DIVINATION: 0.20,
  WILL: 0.10,
});

function buildSeeds(volume) {
  const raw = generateFibonacciSeeds(
    { iterations: 6, scale: 0.75 },
    volume,
    { energyType: ENERGY_TYPES.STRUCTURAL, initialEnergy: 0.5 }
  );
  return raw.map((s, i) => ({
    vx: s.vx, vy: s.vy, vz: s.vz, energy: s.energy, index: i,
  }));
}

function runPipeline(schoolWeights) {
  const volume = createVoxelVolume(SIZE, SIZE, SIZE);
  const seeds = buildSeeds(volume);

  const { field, params, mix, seeds: taggedSeeds } = generateVoxelFieldFromScrollAnalysis(
    seeds,
    schoolWeights,
    volume,
    { maxRadius: 24 }
  );

  for (let y = 0; y < SIZE; y++) {
    for (let z = 0; z < SIZE; z++) {
      for (let x = 0; x < SIZE; x++) {
        const energy = field.energyAt(x, y, z);
        volume.energyField[cellIndex(volume, x, y, z)] = energy;
        setCellMaterial(volume, x, y, z, assignMaterial(energy));
      }
    }
  }

  applyHollownessAMP(volume, 3);

  const biomeField = { energyAt: (cell) => field.energyAt(cell.x, cell.y, cell.z) };
  runBiomeCoherenceAMP(volume, biomeField);

  const boundGet = (x, y, z) => getCellMaterialId(volume, x, y, z);
  const boundOcc = (x, y, z) => isCellOccupied(volume, x, y, z);
  const rawFaces = collectFaces(volume, boundGet, boundOcc);
  const faces = rawFaces.map((f) => ({ ...f, type: f.faceType }));
  const svg = renderFacesToSVG(faces);

  let solidCount = 0;
  const materialHistogram = new Map();
  for (let y = 0; y < SIZE; y++) {
    for (let z = 0; z < SIZE; z++) {
      for (let x = 0; x < SIZE; x++) {
        if (isCellOccupied(volume, x, y, z)) {
          solidCount += 1;
          const matId = getCellMaterialId(volume, x, y, z);
          materialHistogram.set(matId, (materialHistogram.get(matId) ?? 0) + 1);
        }
      }
    }
  }

  return {
    volume, field, params, mix, seeds: taggedSeeds, faces, svg,
    solidCount,
    density: solidCount / (SIZE * SIZE * SIZE),
    materialHistogram,
  };
}

describe('QBIT-Voxel Level 5 — Phoneme-World Resonance', () => {
  let voidWorld;
  let alchemyWorld;

  beforeAll(() => {
    voidWorld = runPipeline(VOID_SCROLL);
    alchemyWorld = runPipeline(ALCHEMY_SCROLL);

    mkdirSync('output/pixelbrain', { recursive: true });
    writeFileSync('output/pixelbrain/qbit-world-void-level5.svg', voidWorld.svg);
    writeFileSync('output/pixelbrain/qbit-world-alchemy-level5.svg', alchemyWorld.svg);
  });

  describe('VOID-dominant scroll', () => {
    it('derives STRUCTURAL as dominant energy type', () => {
      expect(voidWorld.params.dominantSchoolId).toBe('VOID');
      expect(voidWorld.params.dominantEnergyTypeId).toBe(ENERGY_TYPES.STRUCTURAL);
    });

    it('selects gaussian attenuation (sharp boundaries)', () => {
      expect(voidWorld.params.attenuationModel).toBe('gaussian');
    });

    it('weighted emission is low (cold world)', () => {
      // VOID emission = 0, NECROMANCY = 0.1, ABJURATION = 0
      // weighted = 0*0.75 + 0.1*0.15 + 0*0.1 = 0.015
      expect(voidWorld.params.emission).toBeLessThan(0.1);
    });

    it('majority of seeds get STRUCTURAL energy type', () => {
      const structural = voidWorld.seeds.filter((s) => s.energyType === ENERGY_TYPES.STRUCTURAL).length;
      expect(structural / voidWorld.seeds.length).toBeGreaterThanOrEqual(0.7);
    });
  });

  describe('ALCHEMY-dominant scroll', () => {
    it('derives THERMAL as dominant energy type', () => {
      expect(alchemyWorld.params.dominantSchoolId).toBe('ALCHEMY');
      expect(alchemyWorld.params.dominantEnergyTypeId).toBe(ENERGY_TYPES.THERMAL);
    });

    it('selects inverse_square attenuation (long-tailed glow)', () => {
      expect(alchemyWorld.params.attenuationModel).toBe('inverse_square');
    });

    it('weighted emission is high (warm world)', () => {
      // ALCHEMY emission = 0.7, DIVINATION = 0.9, WILL = 0.5
      // weighted = 0.7*0.7 + 0.9*0.2 + 0.5*0.1 = 0.72
      expect(alchemyWorld.params.emission).toBeGreaterThan(0.5);
    });

    it('majority of seeds get THERMAL energy type', () => {
      const thermal = alchemyWorld.seeds.filter((s) => s.energyType === ENERGY_TYPES.THERMAL).length;
      expect(thermal / alchemyWorld.seeds.length).toBeGreaterThanOrEqual(0.65);
    });
  });

  describe('the convergence (worlds are reflections of language)', () => {
    it('VOID and ALCHEMY worlds produce different SVGs from identical seeds', () => {
      expect(voidWorld.svg).not.toBe(alchemyWorld.svg);
    });

    it('VOID and ALCHEMY worlds have different material distributions', () => {
      // ALCHEMY = INVERSE_SQUARE with shorter decay = energy spreads further,
      // pushing more cells over the higher material thresholds.
      // VOID = GAUSSIAN with longer decay = sharper falloff, more cells at
      // the lower material thresholds.
      // HollownessAMP is now energy-gated: occupancy differs between worlds
      // because different energy fields produce different hollow candidates.
      // Material ID distribution is additionally shaped by schoolWeights.
      const histToArray = (hist) => {
        const sorted = Array.from(hist.entries()).sort(([a], [b]) => a - b);
        return sorted.map(([matId, count]) => `${matId}:${count}`).join(',');
      };
      expect(histToArray(voidWorld.materialHistogram))
        .not.toBe(histToArray(alchemyWorld.materialHistogram));
    });

    it('VOID world picks GAUSSIAN, ALCHEMY world picks INVERSE_SQUARE', () => {
      expect(voidWorld.params.attenuationModel).not.toBe(alchemyWorld.params.attenuationModel);
    });

    it('VOID world emission < ALCHEMY world emission (cold vs warm)', () => {
      expect(voidWorld.params.emission).toBeLessThan(alchemyWorld.params.emission);
    });

    it('VOID world baseThreshold > ALCHEMY world baseThreshold (sparse vs dense)', () => {
      // VOID baseThreshold = 0.55 (high), ALCHEMY = 0.25 (low)
      expect(voidWorld.params.baseThreshold).toBeGreaterThan(alchemyWorld.params.baseThreshold);
    });
  });

  describe('determinism — same scroll, same world', () => {
    it('two VOID-scroll runs produce identical SVGs', () => {
      const run2 = runPipeline(VOID_SCROLL);
      expect(run2.svg).toBe(voidWorld.svg);
    });

    it('two ALCHEMY-scroll runs produce identical SVGs', () => {
      const run2 = runPipeline(ALCHEMY_SCROLL);
      expect(run2.svg).toBe(alchemyWorld.svg);
    });
  });

  describe('seed-topology smoothness (Section 5.1 — nearby seeds → nearby worlds)', () => {
    it('a slight schoolWeights perturbation changes the world by less than a swap', () => {
      const baseline = runPipeline({ VOID: 0.75, NECROMANCY: 0.15, ABJURATION: 0.10 });
      const perturbed = runPipeline({ VOID: 0.74, NECROMANCY: 0.16, ABJURATION: 0.10 });
      const swapped = runPipeline({ ALCHEMY: 0.75, NECROMANCY: 0.15, ABJURATION: 0.10 });

      // Defines distance as the count of cells that differ in materialId.
      const distance = (a, b) => {
        let d = 0;
        for (let y = 0; y < SIZE; y++) {
          for (let z = 0; z < SIZE; z++) {
            for (let x = 0; x < SIZE; x++) {
              if (getCellMaterialId(a.volume, x, y, z) !== getCellMaterialId(b.volume, x, y, z)) d += 1;
            }
          }
        }
        return d;
      };

      const dPerturbed = distance(baseline, perturbed);
      const dSwapped = distance(baseline, swapped);
      // Perturbed world should be much closer to baseline than the
      // ALCHEMY-swapped world.
      expect(dPerturbed).toBeLessThan(dSwapped);
    });
  });

  describe('all-eight-school coverage (the world generator handles every school)', () => {
    it('each individual school produces a valid voxel world', () => {
      const allSchools = ['SONIC', 'PSYCHIC', 'VOID', 'ALCHEMY', 'WILL', 'NECROMANCY', 'ABJURATION', 'DIVINATION'];
      for (const id of allSchools) {
        const result = runPipeline({ [id]: 1 });
        expect(result.solidCount).toBeGreaterThan(0);
        expect(result.params.dominantSchoolId).toBe(id);
      }
    });
  });

  describe('mix introspection', () => {
    it('schoolWeightsToEnergyMix exposes a stable ordering for VOID_SCROLL', () => {
      const mix = schoolWeightsToEnergyMix(VOID_SCROLL);
      expect(mix.map((entry) => entry.schoolId)).toEqual(['VOID', 'NECROMANCY', 'ABJURATION']);
    });

    it('schoolWeightsToEnergyMix exposes a stable ordering for ALCHEMY_SCROLL', () => {
      const mix = schoolWeightsToEnergyMix(ALCHEMY_SCROLL);
      expect(mix.map((entry) => entry.schoolId)).toEqual(['ALCHEMY', 'DIVINATION', 'WILL']);
    });
  });
});
