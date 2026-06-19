import { describe, it, expect } from 'vitest';
import {
  createChunkedWorldVolume,
  generateWorldChunk,
  getOrLoadChunk,
  chunkKey,
  applyMaterialBoundaryAlignment,
} from '../../codex/core/pixelbrain/chunked-world-volume.js';
import { runBiomeCoherenceAMPWorld } from '../../codex/core/pixelbrain/biome-coherence-amp.js';
import { setCellMaterial } from '../../codex/core/pixelbrain/voxel-volume.js';

/**
 * QBIT-Voxel Level 3 Phase 4 — Material-aware boundary alignment.
 *
 * The energy-field seam (Phase 1) closes the gradient across chunk
 * boundaries, but material assignment uses discrete thresholds. Without
 * alignment, two adjacent chunks can disagree on the material at their
 * shared face. `applyMaterialBoundaryAlignment` is the Phase 4 fix: a
 * post-process pass that forces the material at the boundary row of both
 * adjacent chunks to agree on the lex-min chunk's material.
 */

function buildWorld2x2() {
  const world = createChunkedWorldVolume({
    chunkSize: { w: 8, h: 8, d: 8 },
    chunkCount: { x: 2, y: 1, z: 1 },
    seed: 7,
    formula: { type: 'fibonacci', iterations: 3, scale: 0.5 },
  });
  for (let cx = 0; cx < 2; cx++) {
    getOrLoadChunk(world, cx, 0, 0, generateWorldChunk);
  }
  const getField = (cx, cy, cz, x, y, z) => {
    const v = world.chunks.get(chunkKey(cx, cy, cz));
    return v.energyField[y * v.width * v.depth + z * v.width + x];
  };
  runBiomeCoherenceAMPWorld(world, getField);
  return world;
}

function countDifferingBoundaryCells(world, axis) {
  // For a 2x2 world, count cells on the cx=0 → cx=1 boundary that have
  // different materials on the two sides.
  const W = world.spec.chunkSize.w;
  const A = world.chunks.get(chunkKey(0, 0, 0));
  const B = world.chunks.get(chunkKey(1, 0, 0));
  let differing = 0;
  let total = 0;
  for (let y = 0; y < 8; y++) for (let z = 0; z < 8; z++) {
    const matA = A.cells[y * 64 + z * 8 + 7] >> 4;
    const matB = B.cells[y * 64 + z * 8 + 0] >> 4;
    if (matA === 0 && matB === 0) continue;
    total++;
    if (matA !== matB) differing++;
  }
  return { differing, total };
}

describe('applyMaterialBoundaryAlignment', () => {
  it('forces boundary materials to match on both sides', () => {
    const world = buildWorld2x2();
    const before = countDifferingBoundaryCells(world, 'x');
    expect(before.differing).toBeGreaterThan(0);
    applyMaterialBoundaryAlignment(world);
    const after = countDifferingBoundaryCells(world, 'x');
    expect(after.differing).toBe(0);
  });

  it('is deterministic — running it twice produces the same state', () => {
    const world = buildWorld2x2();
    applyMaterialBoundaryAlignment(world);
    const snapshot = new Map();
    for (const [k, v] of world.chunks) {
      snapshot.set(k, new Uint16Array(v.cells));
    }
    applyMaterialBoundaryAlignment(world);  // idempotent second pass
    for (const [k, v] of world.chunks) {
      const expected = snapshot.get(k);
      for (let i = 0; i < v.cells.length; i++) {
        expect(v.cells[i]).toBe(expected[i]);
      }
    }
  });

  it('preserves the lex-min chunk as the boundary owner', () => {
    // Build a 2x2 world with chunk (0, 0, 0) having a forced material of 4
    // (crystal) at the boundary, and chunk (1, 0, 0) having a forced
    // material of 1 (earth) at the boundary. After alignment, both should
    // be material 4 (the lex-min chunk's value).
    const world = createChunkedWorldVolume({
      chunkSize: { w: 8, h: 8, d: 8 },
      chunkCount: { x: 2, y: 1, z: 1 },
      seed: 0,
      formula: { type: 'fibonacci', iterations: 2, scale: 0.5 },
    });
    getOrLoadChunk(world, 0, 0, 0, generateWorldChunk);
    getOrLoadChunk(world, 1, 0, 0, generateWorldChunk);
    const A = world.chunks.get(chunkKey(0, 0, 0));
    const B = world.chunks.get(chunkKey(1, 0, 0));
    // Force boundary materials
    for (let y = 0; y < 8; y++) for (let z = 0; z < 8; z++) {
      setCellMaterial(A, 7, y, z, 4);  // crystal
      setCellMaterial(B, 0, y, z, 1);  // earth
    }
    applyMaterialBoundaryAlignment(world);
    for (let y = 0; y < 8; y++) for (let z = 0; z < 8; z++) {
      const matA = A.cells[y * 64 + z * 8 + 7] >> 4;
      const matB = B.cells[y * 64 + z * 8 + 0] >> 4;
      // Lex-min: chunk (0, 0, 0) < chunk (1, 0, 0), so chunk A's material wins.
      expect(matA).toBe(4);
      expect(matB).toBe(4);
    }
  });

  it('falls back to non-empty material when the lex-min owner is hollow', () => {
    const world = createChunkedWorldVolume({
      chunkSize: { w: 8, h: 8, d: 8 },
      chunkCount: { x: 2, y: 1, z: 1 },
      seed: 0,
      formula: { type: 'fibonacci', iterations: 2, scale: 0.5 },
    });
    getOrLoadChunk(world, 0, 0, 0, generateWorldChunk);
    getOrLoadChunk(world, 1, 0, 0, generateWorldChunk);
    const A = world.chunks.get(chunkKey(0, 0, 0));
    const B = world.chunks.get(chunkKey(1, 0, 0));
    // Chunk A's boundary is hollow (0); chunk B's boundary is material 3
    for (let y = 0; y < 8; y++) for (let z = 0; z < 8; z++) {
      A.cells[y * 64 + z * 8 + 7] = (0 << 4);  // hollow
      setCellMaterial(B, 0, y, z, 3);          // granite
    }
    applyMaterialBoundaryAlignment(world);
    for (let y = 0; y < 8; y++) for (let z = 0; z < 8; z++) {
      const matA = A.cells[y * 64 + z * 8 + 7] >> 4;
      const matB = B.cells[y * 64 + z * 8 + 0] >> 4;
      expect(matA).toBe(3);  // fell back to non-empty
      expect(matB).toBe(3);
    }
  });

  it('handles a 2x2x2 world with corners (3 face directions per chunk)', () => {
    const world = createChunkedWorldVolume({
      chunkSize: { w: 8, h: 8, d: 8 },
      chunkCount: { x: 2, y: 1, z: 2 },
      seed: 0,
      formula: { type: 'fibonacci', iterations: 3, scale: 0.5 },
    });
    for (let cx = 0; cx < 2; cx++) for (let cz = 0; cz < 2; cz++) {
      getOrLoadChunk(world, cx, 0, cz, generateWorldChunk);
    }
    const getField = (cx, cy, cz, x, y, z) => {
      const v = world.chunks.get(chunkKey(cx, cy, cz));
      return v.energyField[y * v.width * v.depth + z * v.width + x];
    };
    runBiomeCoherenceAMPWorld(world, getField);
    applyMaterialBoundaryAlignment(world);
    // Check all 4 shared boundaries (cx=0→1, cz=0→1 in 4 row/column combinations)
    for (let cz = 0; cz < 2; cz++) {
      const A = world.chunks.get(chunkKey(0, 0, cz));
      const B = world.chunks.get(chunkKey(1, 0, cz));
      for (let y = 0; y < 8; y++) for (let z = 0; z < 8; z++) {
        const matA = A.cells[y * 64 + z * 8 + 7] >> 4;
        const matB = B.cells[y * 64 + z * 8 + 0] >> 4;
        if (matA === 0 && matB === 0) continue;
        expect(matA).toBe(matB);
      }
    }
    for (let cx = 0; cx < 2; cx++) {
      const A = world.chunks.get(chunkKey(cx, 0, 0));
      const B = world.chunks.get(chunkKey(cx, 0, 1));
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
        const matA = A.cells[y * 64 + 7 * 8 + x] >> 4;
        const matB = B.cells[y * 64 + 0 * 8 + x] >> 4;
        if (matA === 0 && matB === 0) continue;
        expect(matA).toBe(matB);
      }
    }
  });

  it('throws on invalid input', () => {
    expect(() => applyMaterialBoundaryAlignment(null)).toThrow(TypeError);
    expect(() => applyMaterialBoundaryAlignment({})).toThrow(TypeError);
  });
});
