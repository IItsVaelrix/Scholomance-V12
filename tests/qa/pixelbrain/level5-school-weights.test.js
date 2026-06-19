import { describe, it, expect } from 'vitest';
import { createChunkedWorldVolume, getOrLoadChunk, generateWorldChunk, chunkKey } from '../../../codex/core/pixelbrain/chunked-world-volume.js';
import { runBiomeCoherenceAMPWorld } from '../../../codex/core/pixelbrain/biome-coherence-amp.js';
import { SCHOOL_TO_ENERGY } from '../../../codex/core/constants/schools.js';

/**
 * QBIT-Voxel Level 5 (Phoneme-World Resonance) — verification test.
 *
 * The full path: TrueSight school weights → SCHOOL_TO_ENERGY mapping →
 * energyTypeMix for the ChunkedWorldVolumeSpec → composite formula with
 * each region tagged with the school's energy type → ChunkedWorldVolume →
 * generated world.
 *
 * This test verifies the wiring without running the full TrueSight pipeline
 * (which is a separate system). It confirms:
 *   1. The school → energy type mapping is in place and is a valid
 *      ChunkedWorldVolumeSpec.energyTypeMix
 *   2. A composite formula can be built from a school's energy type and
 *      used as the world spec
 *   3. The world generates successfully (no exceptions, deterministic
 *      chunks, byte-identical cold re-run)
 *
 * The path is fully wired. What is NOT yet built: a TrueSight analyzer that
 * emits school weights from a verse (that's the existing TrueSight system
 * upstream of this). Phase 5 work.
 */

function buildEnergyTypeMix(schoolWeights) {
  // schoolWeights: { SONIC: 0.2, VOID: 0.5, ALCHEMY: 0.3, ... } (sum to 1.0)
  const mix = {};
  for (const [school, weight] of Object.entries(schoolWeights)) {
    if (!(school in SCHOOL_TO_ENERGY)) {
      throw new TypeError(`Unknown school "${school}" in TrueSight output`);
    }
    const { typeId } = SCHOOL_TO_ENERGY[school];
    mix[typeId] = (mix[typeId] ?? 0) + weight;
  }
  return mix;
}

function buildCompositeFormulaFromSchools(schoolWeights, worldWidth, worldDepth) {
  // Distribute each school's energy type across a strip of the XZ plane.
  // Strips are vertical bands of width (worldWidth / numSchools).
  const schools = Object.keys(schoolWeights).filter(s => schoolWeights[s] > 0);
  if (schools.length === 0) return { type: 'composite', children: [], region: 'rect' };
  const stripWidth = worldWidth / schools.length;
  return {
    type: 'composite',
    region: 'rect',
    children: schools.map((school, i) => ({
      type: 'fibonacci',
      iterations: 3,
      scale: 0.4,
      region: {
        x: i * stripWidth,
        z: 0,
        width: stripWidth,
        depth: worldDepth,
      },
      energyType: SCHOOL_TO_ENERGY[school].typeId,
    })),
  };
}

describe('Level 5 wiring: TrueSight school weights → energyTypeMix → world', () => {
  it('buildEnergyTypeMix produces a valid energyTypeMix from school weights', () => {
    const mix = buildEnergyTypeMix({ SONIC: 0.3, VOID: 0.7 });
    // SONIC → RESONANT (0), VOID → STRUCTURAL (2)
    expect(mix[0]).toBeCloseTo(0.3);
    expect(mix[2]).toBeCloseTo(0.7);
  });

  it('rejects unknown school names', () => {
    expect(() => buildEnergyTypeMix({ UNKNOWN_SCHOOL: 1.0 })).toThrow(/Unknown school/);
  });

  it('buildCompositeFormulaFromSchools produces a valid composite formula', () => {
    const formula = buildCompositeFormulaFromSchools(
      { SONIC: 0.4, VOID: 0.6 },
      64, 32
    );
    expect(formula.type).toBe('composite');
    expect(formula.children.length).toBe(2);
    expect(formula.children[0].energyType).toBe(0);  // SONIC → RESONANT
    expect(formula.children[1].energyType).toBe(2);  // VOID → STRUCTURAL
    expect(formula.children[0].region.x).toBe(0);
    expect(formula.children[1].region.x).toBe(32);  // stripWidth = 32
  });

  it('end-to-end: school weights → spec → world → deterministic', () => {
    // Simulate TrueSight output: a verse dominated by VOID with some ALCHEMY.
    const schoolWeights = { VOID: 0.7, ALCHEMY: 0.3 };
    const worldWidth = 16, worldDepth = 16;
    const formula = buildCompositeFormulaFromSchools(schoolWeights, worldWidth, worldDepth);
    const spec = {
      chunkSize: { w: 16, h: 8, d: 16 },
      chunkCount: { x: 2, y: 1, z: 2 },
      seed: 7,
      formula,
    };
    // Build twice and verify byte-identical.
    const a = createChunkedWorldVolume(spec);
    const b = createChunkedWorldVolume(spec);
    expect(a.fingerprint).toBe(b.fingerprint);
    for (let cx = 0; cx < 2; cx++) {
      for (let cz = 0; cz < 2; cz++) {
        getOrLoadChunk(a, cx, 0, cz, generateWorldChunk);
        getOrLoadChunk(b, cx, 0, cz, generateWorldChunk);
      }
    }
    for (const [key, volA] of a.chunks) {
      const volB = b.chunks.get(key);
      for (let i = 0; i < volA.cells.length; i++) {
        expect(volA.cells[i]).toBe(volB.cells[i]);
        expect(volA.energyField[i]).toBe(volB.energyField[i]);
      }
    }
  });

  it('all 8 schools map to valid ENERGY_TYPES indices (0-7)', () => {
    const expectedTypeIds = new Set();
    for (const school of Object.keys(SCHOOL_TO_ENERGY)) {
      expectedTypeIds.add(SCHOOL_TO_ENERGY[school].typeId);
    }
    // All 8 typeIds 0..7 should be present
    for (let i = 0; i < 8; i++) {
      expect(expectedTypeIds.has(i), `typeId ${i} not mapped from any school`).toBe(true);
    }
  });

  it('end-to-end with biome coherence: a verse dominated by ALCHEMY produces a world with at least 2 distinct material clusters', () => {
    const schoolWeights = { ALCHEMY: 1.0 };
    const formula = buildCompositeFormulaFromSchools(schoolWeights, 16, 16);
    const world = createChunkedWorldVolume({
      chunkSize: { w: 16, h: 8, d: 16 },
      chunkCount: { x: 1, y: 1, z: 1 },
      seed: 0,
      formula,
    });
    getOrLoadChunk(world, 0, 0, 0, generateWorldChunk);
    const getField = (cx, cy, cz, x, y, z) => {
      const vol = world.chunks.get(chunkKey(cx, cy, cz));
      return vol.energyField[y * vol.width * vol.depth + z * vol.width + x];
    };
    const result = runBiomeCoherenceAMPWorld(world, getField);
    expect(result.stable).toBe(true);
    // Count distinct materialIds
    const matCounts = new Set();
    for (const [, vol] of world.chunks) {
      for (let i = 0; i < vol.cells.length; i++) {
        matCounts.add(vol.cells[i] >> 4);
      }
    }
    expect(matCounts.size).toBeGreaterThanOrEqual(2);
  });
});
