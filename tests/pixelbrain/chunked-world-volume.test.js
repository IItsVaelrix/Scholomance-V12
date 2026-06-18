import { describe, it, expect } from 'vitest';
import {
  createChunkedWorldVolume,
  getOrLoadChunk,
  generateEmptyChunk,
  generateWorldChunk,
  serializeChunkedWorldVolume,
  deserializeChunkedWorldVolume,
  assertChunkedWorldVolume,
  assertFormulaRegions,
  chunkKey,
  parseChunkKey,
  collectWorldSeeds,
  DEFAULT_OVERLAP_RADIUS,
  DEFAULT_ATTENUATION_MODEL,
  CHUNK_SIZE_MIN,
  CHUNK_SIZE_MAX,
} from '../../codex/core/pixelbrain/chunked-world-volume.js';
import { createVoxelVolume, getCellMaterialId } from '../../codex/core/pixelbrain/voxel-volume.js';
import { ENERGY_TYPES } from '../../codex/core/pixelbrain/voxel-volume.js';
import { runBiomeCoherenceAMPWorld } from '../../codex/core/pixelbrain/biome-coherence-amp.js';

describe('ChunkedWorldVolume', () => {
  describe('constants', () => {
    it('default overlap radius is ⌊16φ⌋ = 25', () => {
      expect(DEFAULT_OVERLAP_RADIUS).toBe(25);
    });
    it('default attenuation model is inverse_square', () => {
      expect(DEFAULT_ATTENUATION_MODEL).toBe('inverse_square');
    });
  });

  describe('createChunkedWorldVolume', () => {
    it('creates a world with no chunks at creation time', () => {
      const world = createChunkedWorldVolume({
        chunkSize: { w: 32, h: 32, d: 32 },
        chunkCount: { x: 4, y: 1, z: 4 },
        seed: 0,
      });
      expect(world.chunks.size).toBe(0);
      expect(world.contract).toBe('PB-WORLD-v1');
    });

    it('round-trips through JSON-serialize/deserialize', () => {
      const world = createChunkedWorldVolume({
        chunkSize: { w: 16, h: 16, d: 16 },
        chunkCount: { x: 2, y: 1, z: 2 },
        seed: 42,
        formula: { type: 'fibonacci', iterations: 6, scale: 0.75 },
      });
      const vol = createVoxelVolume(16, 16, 16);
      vol.cells[0] = (3 << 4) | 1;
      world.chunks.set(chunkKey(0, 0, 0), vol);

      const ser = serializeChunkedWorldVolume(world);
      const json = JSON.stringify(ser);
      const back = deserializeChunkedWorldVolume(JSON.parse(json));
      expect(back.contract).toBe('PB-WORLD-v1');
      expect(back.spec.chunkSize).toEqual({ w: 16, h: 16, d: 16 });
      expect(back.fingerprint).toBe(world.fingerprint);
      expect(back.chunks.size).toBe(1);
      const restored = back.chunks.get(chunkKey(0, 0, 0));
      expect(restored.cells[0]).toBe((3 << 4) | 1);
    });

    it('fingerprint is stable for identical specs', () => {
      const spec = {
        chunkSize: { w: 32, h: 32, d: 32 },
        chunkCount: { x: 4, y: 1, z: 4 },
        seed: 99,
        formula: { type: 'fibonacci', iterations: 6, scale: 0.75 },
      };
      const a = createChunkedWorldVolume(spec);
      const b = createChunkedWorldVolume(spec);
      expect(a.fingerprint).toBe(b.fingerprint);
    });

    it('fingerprint differs when seed differs', () => {
      const a = createChunkedWorldVolume({
        chunkSize: { w: 32, h: 32, d: 32 },
        chunkCount: { x: 1, y: 1, z: 1 },
        seed: 1,
      });
      const b = createChunkedWorldVolume({
        chunkSize: { w: 32, h: 32, d: 32 },
        chunkCount: { x: 1, y: 1, z: 1 },
        seed: 2,
      });
      expect(a.fingerprint).not.toBe(b.fingerprint);
    });

    it('rejects non-power-of-two chunkSize', () => {
      expect(() => createChunkedWorldVolume({
        chunkSize: { w: 30, h: 32, d: 32 },
        chunkCount: { x: 1, y: 1, z: 1 },
        seed: 0,
      })).toThrow();
    });

    it('rejects chunkSize below minimum', () => {
      expect(() => createChunkedWorldVolume({
        chunkSize: { w: 4, h: 32, d: 32 },
        chunkCount: { x: 1, y: 1, z: 1 },
        seed: 0,
      })).toThrow();
    });

    it('rejects chunkSize above maximum', () => {
      expect(() => createChunkedWorldVolume({
        chunkSize: { w: 256, h: 32, d: 32 },
        chunkCount: { x: 1, y: 1, z: 1 },
        seed: 0,
      })).toThrow();
    });

    it('rejects chunkCount < 1', () => {
      expect(() => createChunkedWorldVolume({
        chunkSize: { w: 32, h: 32, d: 32 },
        chunkCount: { x: 0, y: 1, z: 1 },
        seed: 0,
      })).toThrow();
    });

    it('rejects non-integer seed', () => {
      expect(() => createChunkedWorldVolume({
        chunkSize: { w: 32, h: 32, d: 32 },
        chunkCount: { x: 1, y: 1, z: 1 },
        seed: 1.5,
      })).toThrow();
    });

    it('accepts all valid power-of-two chunk sizes', () => {
      for (const size of [8, 16, 32, 64, 128]) {
        const w = createChunkedWorldVolume({
          chunkSize: { w: size, h: size, d: size },
          chunkCount: { x: 1, y: 1, z: 1 },
          seed: 0,
        });
        expect(w.spec.chunkSize.w).toBe(size);
      }
    });
  });

  describe('assertChunkedWorldVolume', () => {
    it('passes on a freshly created world', () => {
      const w = createChunkedWorldVolume({
        chunkSize: { w: 32, h: 32, d: 32 },
        chunkCount: { x: 1, y: 1, z: 1 },
        seed: 0,
      });
      expect(assertChunkedWorldVolume(w)).toBe(true);
    });

    it('rejects null', () => {
      expect(() => assertChunkedWorldVolume(null)).toThrow(TypeError);
    });

    it('rejects object with wrong contract', () => {
      expect(() => assertChunkedWorldVolume({ contract: 'WRONG', spec: {}, chunks: new Map() })).toThrow(TypeError);
    });

    it('rejects non-Map chunks', () => {
      const w = createChunkedWorldVolume({
        chunkSize: { w: 32, h: 32, d: 32 },
        chunkCount: { x: 1, y: 1, z: 1 },
        seed: 0,
      });
      w.chunks = [];  // mutate
      expect(() => assertChunkedWorldVolume(w)).toThrow(TypeError);
    });

    it('rejects invalid attenuationModel on construction', () => {
      // createChunkedWorldVolume should reject bad attenuationModel at spec-validation time.
      expect(() => createChunkedWorldVolume({
        chunkSize: { w: 32, h: 32, d: 32 },
        chunkCount: { x: 1, y: 1, z: 1 },
        seed: 0,
        attenuationModel: 'made_up_model',
      })).toThrow(RangeError);
    });
  });

  describe('chunkKey / parseChunkKey', () => {
    it('round-trips coordinates', () => {
      for (const [cx, cy, cz] of [[0, 0, 0], [1, 2, 3], [-1, -2, -3], [100, 0, -50]]) {
        const k = chunkKey(cx, cy, cz);
        const back = parseChunkKey(k);
        expect(back).toEqual({ cx, cy, cz });
      }
    });

    it('rejects malformed keys', () => {
      expect(() => parseChunkKey('a,b,c')).toThrow(TypeError);
      expect(() => parseChunkKey('1,2')).toThrow(TypeError);
      expect(() => parseChunkKey('1,2,3,4')).toThrow(TypeError);
    });
  });

  describe('getOrLoadChunk', () => {
    it('is idempotent: returns the same instance on repeat calls', () => {
      const world = createChunkedWorldVolume({
        chunkSize: { w: 16, h: 16, d: 16 },
        chunkCount: { x: 2, y: 1, z: 2 },
        seed: 0,
      });
      let callCount = 0;
      const gen = () => { callCount++; return createVoxelVolume(16, 16, 16); };
      const a = getOrLoadChunk(world, 0, 0, 0, gen);
      const b = getOrLoadChunk(world, 0, 0, 0, gen);
      expect(a).toBe(b);
      expect(callCount).toBe(1);
    });

    it('is deterministic for the same chunk coords', () => {
      const world = createChunkedWorldVolume({
        chunkSize: { w: 16, h: 16, d: 16 },
        chunkCount: { x: 2, y: 1, z: 2 },
        seed: 0,
      });
      let counter = 0;
      const gen = () => { counter++; return createVoxelVolume(16, 16, 16); };
      getOrLoadChunk(world, 0, 0, 0, gen);
      getOrLoadChunk(world, 0, 0, 0, gen);
      expect(counter).toBe(1);
    });

    it('caches different chunks independently', () => {
      const world = createChunkedWorldVolume({
        chunkSize: { w: 16, h: 16, d: 16 },
        chunkCount: { x: 2, y: 1, z: 2 },
        seed: 0,
      });
      const a = getOrLoadChunk(world, 0, 0, 0, generateEmptyChunk);
      const b = getOrLoadChunk(world, 1, 0, 0, generateEmptyChunk);
      const c = getOrLoadChunk(world, 0, 0, 1, generateEmptyChunk);
      expect(a).not.toBe(b);
      expect(a).not.toBe(c);
      expect(b).not.toBe(c);
      expect(world.chunks.size).toBe(3);
    });

    it('rejects generator that returns wrong-size volume', () => {
      const world = createChunkedWorldVolume({
        chunkSize: { w: 16, h: 16, d: 16 },
        chunkCount: { x: 1, y: 1, z: 1 },
        seed: 0,
      });
      expect(() => getOrLoadChunk(world, 0, 0, 0, () => createVoxelVolume(8, 8, 8))).toThrow(RangeError);
    });

    it('rejects non-integer chunk coordinates', () => {
      const world = createChunkedWorldVolume({
        chunkSize: { w: 16, h: 16, d: 16 },
        chunkCount: { x: 1, y: 1, z: 1 },
        seed: 0,
      });
      expect(() => getOrLoadChunk(world, 0.5, 0, 0, generateEmptyChunk)).toThrow(TypeError);
    });

    it('does not trigger generation of a far chunk when loading a near one', () => {
      const world = createChunkedWorldVolume({
        chunkSize: { w: 16, h: 16, d: 16 },
        chunkCount: { x: 4, y: 1, z: 4 },
        seed: 0,
      });
      getOrLoadChunk(world, 0, 0, 0, generateEmptyChunk);
      expect(world.chunks.size).toBe(1);
      expect(world.chunks.has(chunkKey(1, 0, 0))).toBe(false);
      expect(world.chunks.has(chunkKey(3, 0, 3))).toBe(false);
    });
  });

  describe('assertFormulaRegions', () => {
    it('accepts a non-overlapping composite', () => {
      expect(() => assertFormulaRegions({
        type: 'composite',
        children: [
          { region: { x: 0, z: 0, width: 100, depth: 100 }, energyType: 2 },
          { region: { x: 100, z: 0, width: 100, depth: 100 }, energyType: 3 },
        ],
      })).not.toThrow();
    });

    it('rejects overlapping regions (PB-ERR-v1-FORMULA-CR-COMPOSITE-OVERLAP-0001)', () => {
      expect(() => assertFormulaRegions({
        type: 'composite',
        children: [
          { region: { x: 0, z: 0, width: 100, depth: 100 }, energyType: 2 },
          { region: { x: 50, z: 50, width: 100, depth: 100 }, energyType: 3 },
        ],
      })).toThrow(/COMPOSITE-OVERLAP/);
    });

    it('rejects composite with no children', () => {
      expect(() => assertFormulaRegions({ type: 'composite', children: [] })).toThrow();
    });

    it('rejects composite child missing region', () => {
      expect(() => assertFormulaRegions({
        type: 'composite',
        children: [{ energyType: 2 }],
      })).toThrow();
    });

    it('passes non-composite formulas through (no region check)', () => {
      expect(() => assertFormulaRegions({ type: 'fibonacci', iterations: 6 })).not.toThrow();
    });
  });
});

// =====================================================================
// QBIT-Voxel Level 3 Step 2.2 — generateWorldChunk integration
// =====================================================================

describe('generateWorldChunk', () => {
  it('produces a populated VoxelVolume for a single-chunk world', () => {
    const world = createChunkedWorldVolume({
      chunkSize: { w: 16, h: 16, d: 16 },
      chunkCount: { x: 1, y: 1, z: 1 },
      seed: 0,
      formula: { type: 'fibonacci', iterations: 5, scale: 0.5 },
    });
    const vol = generateWorldChunk(world, 0, 0, 0);
    expect(vol.width).toBe(16);
    expect(vol.height).toBe(16);
    expect(vol.depth).toBe(16);
    expect(vol.energyField.length).toBe(16 * 16 * 16);
    // At least one cell should be occupied
    let occupiedCount = 0;
    for (let i = 0; i < vol.cells.length; i++) {
      if (vol.cells[i] >> 4 > 0) occupiedCount++;
    }
    expect(occupiedCount).toBeGreaterThan(0);
  });

  it('is deterministic — same input twice produces same output', () => {
    const makeWorld = () => createChunkedWorldVolume({
      chunkSize: { w: 16, h: 16, d: 16 },
      chunkCount: { x: 1, y: 1, z: 1 },
      seed: 42,
      formula: { type: 'fibonacci', iterations: 5, scale: 0.5 },
    });
    const w1 = makeWorld();
    const w2 = makeWorld();
    const v1 = generateWorldChunk(w1, 0, 0, 0);
    const v2 = generateWorldChunk(w2, 0, 0, 0);
    for (let i = 0; i < v1.cells.length; i++) {
      expect(v1.cells[i]).toBe(v2.cells[i]);
      expect(v1.energyField[i]).toBe(v2.energyField[i]);
    }
  });

  it('integration: 2x2 world with 2-region composite produces 2 distinct biomes', () => {
    const world = createChunkedWorldVolume({
      chunkSize: { w: 16, h: 16, d: 16 },
      chunkCount: { x: 2, y: 1, z: 2 },
      seed: 7,
      formula: {
        type: 'composite',
        children: [
          // Left half of the world: STRUCTURAL
          { type: 'fibonacci', iterations: 4, scale: 0.4,
            region: { x: 0, z: 0, width: 16, depth: 32 },
            energyType: ENERGY_TYPES.STRUCTURAL },
          // Right half of the world: THERMAL
          { type: 'fibonacci', iterations: 4, scale: 0.4,
            region: { x: 16, z: 0, width: 16, depth: 32 },
            energyType: ENERGY_TYPES.THERMAL },
        ],
      },
    });
    // Load all 4 chunks via getOrLoadChunk + generateWorldChunk
    for (let cx = 0; cx < 2; cx++) {
      for (let cz = 0; cz < 2; cz++) {
        getOrLoadChunk(world, cx, 0, cz, generateWorldChunk);
      }
    }
    expect(world.chunks.size).toBe(4);
    // Apply chunk-aware biome coherence
    const getField = (cx, cy, cz, x, y, z) => {
      const vol = world.chunks.get(chunkKey(cx, cy, cz));
      return vol.energyField[y * vol.width * vol.depth + z * vol.width + x];
    };
    const result = runBiomeCoherenceAMPWorld(world, getField);
    expect(result.stable).toBe(true);

    // Count distinct material IDs across all chunks
    const materialCounts = new Map();
    for (const [, vol] of world.chunks) {
      for (let i = 0; i < vol.cells.length; i++) {
        const m = vol.cells[i] >> 4;
        if (m > 0) materialCounts.set(m, (materialCounts.get(m) ?? 0) + 1);
      }
    }
    expect(materialCounts.size).toBeGreaterThanOrEqual(2);
  });

  it('cross-chunk energy injection: a chunk\'s right face reads the previous chunk\'s energy', () => {
    // Load chunk (0,0,0) first, then chunk (1,0,0). The second chunk's
    // generation should inject ghost seeds from the first. Both chunks
    // should produce non-zero energy in their overlap zone.
    const world = createChunkedWorldVolume({
      chunkSize: { w: 16, h: 16, d: 16 },
      chunkCount: { x: 2, y: 1, z: 1 },
      seed: 0,
      formula: { type: 'fibonacci', iterations: 4, scale: 0.5 },
    });
    const v0 = getOrLoadChunk(world, 0, 0, 0, generateWorldChunk);
    const v1 = getOrLoadChunk(world, 1, 0, 0, generateWorldChunk);
    // Both chunks should have some occupied cells
    let c0 = 0, c1 = 0;
    for (let i = 0; i < v0.cells.length; i++) {
      if (v0.cells[i] >> 4 > 0) c0++;
      if (v1.cells[i] >> 4 > 0) c1++;
    }
    expect(c0).toBeGreaterThan(0);
    expect(c1).toBeGreaterThan(0);
    // The energy fields should be non-zero in the overlap zone (last 25 cells of v0, first 25 cells of v1)
    let v0BoundaryEnergy = 0, v1BoundaryEnergy = 0;
    for (let y = 0; y < 16; y++) {
      for (let z = 0; z < 16; z++) {
        for (let x = 11; x < 16; x++) {  // last 5 cells
          v0BoundaryEnergy += v0.energyField[y * 16 * 16 + z * 16 + x];
        }
        for (let x = 0; x < 5; x++) {  // first 5 cells
          v1BoundaryEnergy += v1.energyField[y * 16 * 16 + z * 16 + x];
        }
      }
    }
    expect(v0BoundaryEnergy).toBeGreaterThan(0);
    expect(v1BoundaryEnergy).toBeGreaterThan(0);
  });

  it('rejects non-fibonacci non-composite formulas with a clear message', () => {
    const world = createChunkedWorldVolume({
      chunkSize: { w: 8, h: 8, d: 8 },
      chunkCount: { x: 1, y: 1, z: 1 },
      seed: 0,
      formula: { type: 'fractal_iter', iterations: 3, baseShape: 'triangle' },
    });
    expect(() => generateWorldChunk(world, 0, 0, 0)).toThrow(/fractal_iter/);
  });

  it('rejects non-integer chunk coordinates', () => {
    const world = createChunkedWorldVolume({
      chunkSize: { w: 8, h: 8, d: 8 },
      chunkCount: { x: 1, y: 1, z: 1 },
      seed: 0,
    });
    expect(() => generateWorldChunk(world, 0.5, 0, 0)).toThrow(TypeError);
  });
});

describe('world seed glow (WorldScenePortal lighting source)', () => {
  const makeWorld = () => createChunkedWorldVolume({
    chunkSize: { w: 16, h: 16, d: 16 },
    chunkCount: { x: 2, y: 1, z: 2 },
    seed: 7,
    formula: { type: 'fibonacci', iterations: 6, scale: 0.75 },
  });

  it('generateWorldChunk attaches the chunk-local seeds', () => {
    const chunk = generateWorldChunk(makeWorld(), 0, 0, 0);
    expect(Array.isArray(chunk.seeds)).toBe(true);
    expect(chunk.seeds.length).toBeGreaterThan(0);
    for (const s of chunk.seeds) {
      expect(s.x).toBeGreaterThanOrEqual(0); expect(s.x).toBeLessThan(16);
      expect(s.y).toBeGreaterThanOrEqual(0); expect(s.y).toBeLessThan(16);
      expect(s.z).toBeGreaterThanOrEqual(0); expect(s.z).toBeLessThan(16);
      expect(typeof s.energy).toBe('number');
    }
  });

  it('collectWorldSeeds lifts seeds into world coordinates by chunk origin', () => {
    const world = makeWorld();
    world.chunks.set(chunkKey(1, 0, 1), generateWorldChunk(world, 1, 0, 1));
    const seeds = collectWorldSeeds(world);
    expect(seeds.length).toBeGreaterThan(0);
    // chunk (1,0,1) origin = (16, 0, 16) for a 16³ chunk
    for (const s of seeds) {
      expect(s.x).toBeGreaterThanOrEqual(16); expect(s.x).toBeLessThan(32);
      expect(s.z).toBeGreaterThanOrEqual(16); expect(s.z).toBeLessThan(32);
    }
  });

  it('tolerates chunks without seeds (e.g. deserialized)', () => {
    const world = makeWorld();
    world.chunks.set(chunkKey(0, 0, 0), createVoxelVolume(16, 16, 16)); // no .seeds
    expect(collectWorldSeeds(world)).toEqual([]);
  });
});
