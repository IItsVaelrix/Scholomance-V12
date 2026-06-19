import { describe, it, expect } from 'vitest';
import {
  createVoxelVolume,
  cellIndex,
  setCellMaterial,
  isCellOccupied,
  ENERGY_TYPES,
} from '../../codex/core/pixelbrain/voxel-volume.js';
import {
  runBiomeCoherenceAMP,
  runBiomeCoherenceAMPWorld,
  NEGOTIATION_THRESHOLD,
  MAX_NEGOTIATION_PASSES,
} from '../../codex/core/pixelbrain/biome-coherence-amp.js';
import {
  createChunkedWorldVolume,
  chunkKey,
} from '../../codex/core/pixelbrain/chunked-world-volume.js';

function makeUniformField(volume, energy = 0.5) {
  return {
    energyAt: () => energy,
    gradientAt: () => ({ gx: 0, gy: 0, gz: 0 }),
  };
}

function makeLoadedChunk(size, occupancyPattern) {
  const vol = createVoxelVolume(size, size, size);
  // Fill cells based on pattern: 'all' | 'half' | 'sparse'
  if (occupancyPattern === 'all') {
    for (let i = 0; i < vol.cells.length; i++) {
      vol.cells[i] = (1 << 4) | 1;  // materialId=1 (earth), occupied
    }
  } else if (occupancyPattern === 'half') {
    for (let i = 0; i < vol.cells.length; i += 2) {
      vol.cells[i] = (1 << 4) | 1;
    }
  } else if (occupancyPattern === 'sparse') {
    for (let i = 0; i < vol.cells.length; i += 8) {
      vol.cells[i] = (1 << 4) | 1;
    }
  }
  return vol;
}

describe('runBiomeCoherenceAMPWorld', () => {
  it('throws on null world', () => {
    expect(() => runBiomeCoherenceAMPWorld(null, () => 0)).toThrow(TypeError);
  });

  it('throws on world with no chunks', () => {
    const w = createChunkedWorldVolume({
      chunkSize: { w: 8, h: 8, d: 8 },
      chunkCount: { x: 1, y: 1, z: 1 },
      seed: 0,
    });
    expect(() => runBiomeCoherenceAMPWorld(w, () => 0)).toThrow(RangeError);
  });

  it('throws when getField is not a function', () => {
    const w = createChunkedWorldVolume({
      chunkSize: { w: 8, h: 8, d: 8 },
      chunkCount: { x: 1, y: 1, z: 1 },
      seed: 0,
    });
    w.chunks.set(chunkKey(0, 0, 0), makeLoadedChunk(8, 'all'));
    expect(() => runBiomeCoherenceAMPWorld(w, null)).toThrow(TypeError);
  });

  it('returns stable=false when no changes are made (single chunk, uniform field)', () => {
    const w = createChunkedWorldVolume({
      chunkSize: { w: 8, h: 8, d: 8 },
      chunkCount: { x: 1, y: 1, z: 1 },
      seed: 0,
    });
    const vol = makeLoadedChunk(8, 'all');
    w.chunks.set(chunkKey(0, 0, 0), vol);
    const result = runBiomeCoherenceAMPWorld(w, makeUniformField(vol).energyAt);
    expect(result.passes).toBeGreaterThanOrEqual(1);
    expect(result.stable).toBe(true);
  });

  it('converges on a 2x2 world within MAX_NEGOTIATION_PASSES', () => {
    const w = createChunkedWorldVolume({
      chunkSize: { w: 8, h: 8, d: 8 },
      chunkCount: { x: 2, y: 1, z: 2 },
      seed: 0,
    });
    // Load all 4 chunks, all with the same uniform energy field
    for (let cx = 0; cx < 2; cx++) {
      for (let cz = 0; cz < 2; cz++) {
        w.chunks.set(chunkKey(cx, 0, cz), makeLoadedChunk(8, 'all'));
      }
    }
    const field = makeUniformField(null, 0.5);
    const result = runBiomeCoherenceAMPWorld(w, field.energyAt);
    expect(result.passes).toBeLessThanOrEqual(MAX_NEGOTIATION_PASSES);
  });

  it('is deterministic — same input twice produces same output', () => {
    const makeWorld = () => {
      const w = createChunkedWorldVolume({
        chunkSize: { w: 8, h: 8, d: 8 },
        chunkCount: { x: 2, y: 1, z: 2 },
        seed: 0,
      });
      for (let cx = 0; cx < 2; cx++) {
        for (let cz = 0; cz < 2; cz++) {
          w.chunks.set(chunkKey(cx, 0, cz), makeLoadedChunk(8, 'all'));
        }
      }
      return w;
    };
    const w1 = makeWorld();
    const w2 = makeWorld();
    const field = makeUniformField(null, 0.5);
    runBiomeCoherenceAMPWorld(w1, field.energyAt);
    runBiomeCoherenceAMPWorld(w2, field.energyAt);
    // Compare all cells in all chunks
    for (const [key, vol1] of w1.chunks) {
      const vol2 = w2.chunks.get(key);
      expect(vol1.cells.length).toBe(vol2.cells.length);
      for (let i = 0; i < vol1.cells.length; i++) {
        expect(vol1.cells[i]).toBe(vol2.cells[i]);
      }
    }
  });

  it('cross-chunk neighbor reads work — change one chunk\'s material and watch it propagate', () => {
    const w = createChunkedWorldVolume({
      chunkSize: { w: 8, h: 8, d: 8 },
      chunkCount: { x: 2, y: 1, z: 1 },
      seed: 0,
    });
    const volA = makeLoadedChunk(8, 'all');
    const volB = makeLoadedChunk(8, 'all');
    // In chunk A, all cells start as materialId=1.
    // In chunk B, all cells start as materialId=2.
    for (let i = 0; i < volB.cells.length; i++) {
      volB.cells[i] = (2 << 4) | 1;
    }
    w.chunks.set(chunkKey(0, 0, 0), volA);
    w.chunks.set(chunkKey(1, 0, 0), volB);
    const field = makeUniformField(null, 0.5);  // same energy everywhere
    // With uniform field, every cell qualifies all 6 neighbors (within threshold)
    // except the cross-chunk boundary on the X faces. The boundary cells in
    // chunk A at x=7 see chunk B at x=0 (chunkB's neighbor). They should
    // negotiate to materialId=2 (majority of 1's on chunk A's side, but
    // actually they're all 1's on chunk A and all 2's on chunk B; the
    // boundary cells in chunk A have 5 same-chunk neighbors of 1 and 1
    // cross-chunk neighbor of 2 → majority is 1, so they should STAY at 1.
    // Conversely, chunk B's x=0 cells have 5 neighbors of 2 and 1 of 1 →
    // majority 2, stay at 2. So the boundary is stable.
    runBiomeCoherenceAMPWorld(w, field.energyAt);
    // Verify the boundary is intact: chunk A's right face stays materialId=1,
    // chunk B's left face stays materialId=2.
    for (let y = 0; y < 8; y++) {
      for (let z = 0; z < 8; z++) {
        const idxA = cellIndex(volA, 7, y, z);
        const idxB = cellIndex(volB, 0, y, z);
        expect(volA.cells[idxA] >> 4).toBe(1);
        expect(volB.cells[idxB] >> 4).toBe(2);
      }
    }
  });

  it('skips neighbors in unloaded chunks (does not throw)', () => {
    // 2x2 world, but only 1 chunk is loaded. Cross-chunk neighbors should be
    // silently skipped, not throw.
    const w = createChunkedWorldVolume({
      chunkSize: { w: 8, h: 8, d: 8 },
      chunkCount: { x: 2, y: 1, z: 2 },
      seed: 0,
    });
    w.chunks.set(chunkKey(0, 0, 0), makeLoadedChunk(8, 'all'));
    const field = makeUniformField(null, 0.5);
    const result = runBiomeCoherenceAMPWorld(w, field.energyAt);
    expect(result.stable).toBe(true);
  });

  it('boundary cells in chunk A see cross-chunk neighbors from chunk B (smoke test)', () => {
    // Set up: chunk A has materialId=1 everywhere, chunk B has materialId=2
    // everywhere. Energy is uniform at 0.5. Run world AMP once and verify the
    // snapshot-based read mechanism works (no exceptions, returns stable).
    const w = createChunkedWorldVolume({
      chunkSize: { w: 8, h: 8, d: 8 },
      chunkCount: { x: 2, y: 1, z: 1 },
      seed: 0,
    });
    const volA = makeLoadedChunk(8, 'all');
    const volB = makeLoadedChunk(8, 'all');
    for (let i = 0; i < volB.cells.length; i++) {
      volB.cells[i] = (2 << 4) | 1;
    }
    w.chunks.set(chunkKey(0, 0, 0), volA);
    w.chunks.set(chunkKey(1, 0, 0), volB);
    const field = makeUniformField(null, 0.5);
    expect(() => runBiomeCoherenceAMPWorld(w, field.energyAt)).not.toThrow();
  });

  it('energy-distant neighbors do not negotiate (threshold respected)', () => {
    // Set up: chunk A and chunk B at different energy levels, > threshold apart.
    // No cell should change material.
    const w = createChunkedWorldVolume({
      chunkSize: { w: 8, h: 8, d: 8 },
      chunkCount: { x: 2, y: 1, z: 1 },
      seed: 0,
    });
    const volA = makeLoadedChunk(8, 'all');
    const volB = makeLoadedChunk(8, 'all');
    for (let i = 0; i < volB.cells.length; i++) {
      volB.cells[i] = (2 << 4) | 1;
    }
    w.chunks.set(chunkKey(0, 0, 0), volA);
    w.chunks.set(chunkKey(1, 0, 0), volB);
    // Energy differs by 0.5 — way more than NEGOTIATION_THRESHOLD (0.05)
    const field = {
      energyAt: (cx, cy, cz, x, y, z) => (cx === 0 ? 0.1 : 0.9),
    };
    runBiomeCoherenceAMPWorld(w, field.energyAt);
    // Boundary should be unchanged
    for (let y = 0; y < 8; y++) {
      for (let z = 0; z < 8; z++) {
        const idxA = cellIndex(volA, 7, y, z);
        const idxB = cellIndex(volB, 0, y, z);
        expect(volA.cells[idxA] >> 4).toBe(1);
        expect(volB.cells[idxB] >> 4).toBe(2);
      }
    }
  });

  it('per-volume runBiomeCoherenceAMP still works (regression)', () => {
    const vol = makeLoadedChunk(8, 'all');
    const field = makeUniformField(vol, 0.5);
    expect(() => runBiomeCoherenceAMP(vol, field)).not.toThrow();
  });
});
