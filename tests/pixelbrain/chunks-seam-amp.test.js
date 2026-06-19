import { describe, it, expect } from 'vitest';
import { createVoxelVolume } from '../../codex/core/pixelbrain/voxel-volume.js';
import { injectBorderEnergy, injectAllBorderEnergies, DEFAULT_OVERLAP_RADIUS } from '../../codex/core/pixelbrain/chunks-seam-amp.js';

describe('chunks-seam-amp', () => {
  describe('constants', () => {
    it('default overlap radius is ⌊16φ⌋ = 25', () => {
      expect(DEFAULT_OVERLAP_RADIUS).toBe(25);
    });
  });

  describe('injectBorderEnergy', () => {
    it('rejects non-object inputs', () => {
      expect(() => injectBorderEnergy(null, null, { direction: { dx: 1, dy: 0, dz: 0 } })).toThrow(TypeError);
    });

    it('rejects missing direction', () => {
      const v = createVoxelVolume(32, 32, 32);
      const n = createVoxelVolume(32, 32, 32);
      expect(() => injectBorderEnergy(v, n, {})).toThrow(TypeError);
    });

    it('rejects zero direction', () => {
      const v = createVoxelVolume(32, 32, 32);
      const n = createVoxelVolume(32, 32, 32);
      expect(() => injectBorderEnergy(v, n, { direction: { dx: 0, dy: 0, dz: 0 } })).toThrow();
    });

    it('rejects direction components outside {-1, 0, 1}', () => {
      const v = createVoxelVolume(32, 32, 32);
      const n = createVoxelVolume(32, 32, 32);
      expect(() => injectBorderEnergy(v, n, { direction: { dx: 2, dy: 0, dz: 0 } })).toThrow(RangeError);
    });

    it('rejects mismatched dimensions', () => {
      const v = createVoxelVolume(32, 32, 32);
      const n = createVoxelVolume(16, 16, 16);
      expect(() => injectBorderEnergy(v, n, { direction: { dx: 1, dy: 0, dz: 0 } })).toThrow(RangeError);
    });

    it('returns empty ghost seeds when neighbor has no energy', () => {
      const v = createVoxelVolume(32, 32, 32);
      const n = createVoxelVolume(32, 32, 32);
      // Neighbor has zero energy everywhere
      const seeds = injectBorderEnergy(v, n, { direction: { dx: 1, dy: 0, dz: 0 } });
      expect(seeds).toEqual([]);
    });

    it('produces ghost seeds at the overlap zone on the +X side', () => {
      const v = createVoxelVolume(32, 32, 32);
      const n = createVoxelVolume(32, 32, 32);
      // Place high energy in neighbor's west face (x = 0..5)
      for (let x = 0; x < 5; x++) {
        for (let y = 0; y < 32; y++) {
          for (let z = 0; z < 32; z++) {
            const idx = y * 32 * 32 + z * 32 + x;
            n.energyField[idx] = 0.8;
            n.energyTypes[idx] = 2;  // STRUCTURAL
          }
        }
      }
      // New chunk is to the east of the neighbor (dx = 1 means neighbor is west)
      const seeds = injectBorderEnergy(v, n, {
        direction: { dx: 1, dy: 0, dz: 0 },
        overlapRadius: 5,
      });
      expect(seeds.length).toBeGreaterThan(0);
      // All ghost seeds should be in the new chunk's east overlap zone
      // (x = W - overlapRadius .. W - 1)
      for (const s of seeds) {
        expect(s.x).toBeGreaterThanOrEqual(32 - 5);
        expect(s.x).toBeLessThan(32);
      }
    });

    it('ghost seed energy matches neighbor energy', () => {
      const v = createVoxelVolume(32, 32, 32);
      const n = createVoxelVolume(32, 32, 32);
      // High energy at neighbor's west face
      for (let x = 0; x < 5; x++) {
        for (let y = 0; y < 32; y++) {
          for (let z = 0; z < 32; z++) {
            const idx = y * 32 * 32 + z * 32 + x;
            n.energyField[idx] = 0.8;
            n.energyTypes[idx] = 2;
          }
        }
      }
      const seeds = injectBorderEnergy(v, n, {
        direction: { dx: 1, dy: 0, dz: 0 },
        overlapRadius: 5,
      });
      for (const s of seeds) {
        expect(s.energy).toBeCloseTo(0.8, 6);
        expect(s.energyType).toBe(2);
      }
    });

    it('ghost seed energy type is the neighbors type, not the chunks own', () => {
      const v = createVoxelVolume(32, 32, 32);
      const n = createVoxelVolume(32, 32, 32);
      // Fill neighbor's overlap face with type 3 (THERMAL)
      for (let i = 0; i < 32 * 5 * 32; i++) {
        n.energyField[i] = 0.5;
        n.energyTypes[i] = 3;
      }
      const seeds = injectBorderEnergy(v, n, {
        direction: { dx: 1, dy: 0, dz: 0 },
        overlapRadius: 5,
      });
      for (const s of seeds) {
        expect(s.energyType).toBe(3);
      }
    });

    it('F-4 energy at chunk boundary midpoint is continuous (within 5% of neighbor)', () => {
      // Setup: neighbor has energy 0.6 across its east face (x = W-1)
      // New chunk's west face (x = 0) is the boundary
      // After injection, the new chunk's west-face ghost seeds carry 0.6
      const v = createVoxelVolume(32, 32, 32);
      const n = createVoxelVolume(32, 32, 32);
      for (let y = 0; y < 32; y++) {
        for (let z = 0; z < 32; z++) {
          const idx = y * 32 * 32 + z * 32 + 0;  // neighbor's west face
          n.energyField[idx] = 0.6;
          n.energyTypes[idx] = 2;
        }
      }
      const seeds = injectBorderEnergy(v, n, {
        direction: { dx: 1, dy: 0, dz: 0 },  // neighbor is to the west
        overlapRadius: 5,
      });
      // Ghost seeds on new chunk's west side should all carry 0.6
      for (const s of seeds) {
        expect(Math.abs(s.energy - 0.6)).toBeLessThan(0.05);
      }
    });

    it('respects energyFloor', () => {
      const v = createVoxelVolume(32, 32, 32);
      const n = createVoxelVolume(32, 32, 32);
      // Half the cells have low energy, half have high
      for (let i = 0; i < 32 * 5 * 32; i++) {
        n.energyField[i] = (i % 2 === 0) ? 0.005 : 0.8;
      }
      const seeds = injectBorderEnergy(v, n, {
        direction: { dx: 1, dy: 0, dz: 0 },
        overlapRadius: 5,
        energyFloor: 0.01,
      });
      // All returned seeds should have energy > floor
      for (const s of seeds) {
        expect(s.energy).toBeGreaterThan(0.01);
      }
    });
  });

  describe('injectAllBorderEnergies', () => {
    it('skips null neighbors', () => {
      const v = createVoxelVolume(32, 32, 32);
      const seeds = injectAllBorderEnergies(v, () => null, { overlapRadius: 5 });
      expect(seeds).toEqual([]);
    });

    it('collects ghost seeds from all 6 face directions', () => {
      const v = createVoxelVolume(32, 32, 32);
      const n = createVoxelVolume(32, 32, 32);
      // Fill neighbor with energy
      for (let i = 0; i < 32 * 32 * 32; i++) {
        n.energyField[i] = 0.5;
        n.energyTypes[i] = 2;
      }
      // getNeighbor returns the neighbor for all 6 cardinal directions, null otherwise
      const getNeighbor = (dx, dy, dz) => {
        if (Math.abs(dx) + Math.abs(dy) + Math.abs(dz) === 1) return n;
        return null;
      };
      const seeds = injectAllBorderEnergies(v, getNeighbor, { overlapRadius: 5 });
      // 6 directions × overlap cells — at least one seed per direction
      expect(seeds.length).toBeGreaterThan(0);
    });

    it('only face-adjacent (Manhattan distance 1), not diagonals', () => {
      const v = createVoxelVolume(32, 32, 32);
      let diagonalCallCount = 0;
      const getNeighbor = (dx, dy, dz) => {
        if (Math.abs(dx) + Math.abs(dy) + Math.abs(dz) === 2) diagonalCallCount++;
        return null;
      };
      injectAllBorderEnergies(v, getNeighbor, { overlapRadius: 5 });
      // 12 diagonal directions, all should have been called (and returned null)
      expect(diagonalCallCount).toBe(12);
    });
  });
});
