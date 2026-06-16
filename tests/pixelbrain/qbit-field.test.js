import { describe, it, expect } from 'vitest';
import {
  MATERIAL_THRESHOLDS,
  assignMaterial,
  propagate,
} from '../../codex/core/pixelbrain/qbit-field.js';

describe('QBITField', () => {
  describe('MATERIAL_THRESHOLDS', () => {
    it('has 4 entries', () => {
      expect(MATERIAL_THRESHOLDS).toHaveLength(4);
    });

    it('is sorted ascending by threshold', () => {
      for (let i = 0; i < MATERIAL_THRESHOLDS.length - 1; i++) {
        expect(MATERIAL_THRESHOLDS[i].threshold).toBeLessThan(
          MATERIAL_THRESHOLDS[i + 1].threshold
        );
      }
    });

    it('is frozen', () => {
      expect(Object.isFrozen(MATERIAL_THRESHOLDS)).toBe(true);
    });

    it('has correct materialIds and names', () => {
      expect(MATERIAL_THRESHOLDS[0]).toEqual({ materialId: 1, name: 'earth', threshold: 0.00 });
      expect(MATERIAL_THRESHOLDS[1]).toEqual({ materialId: 2, name: 'stone', threshold: 0.25 });
      expect(MATERIAL_THRESHOLDS[2]).toEqual({ materialId: 3, name: 'granite', threshold: 0.50 });
      expect(MATERIAL_THRESHOLDS[3]).toEqual({ materialId: 4, name: 'crystal', threshold: 0.70 });
    });
  });

  describe('assignMaterial', () => {
    it('returns 0 for negative energy', () => {
      expect(assignMaterial(-0.1)).toBe(0);
      expect(assignMaterial(-1.0)).toBe(0);
    });

    it('returns 1 (earth) for energy 0.0 to < 0.25', () => {
      expect(assignMaterial(0.0)).toBe(1);
      expect(assignMaterial(0.1)).toBe(1);
      expect(assignMaterial(0.249)).toBe(1);
    });

    it('returns 2 (stone) for energy 0.25 to < 0.50', () => {
      expect(assignMaterial(0.25)).toBe(2);
      expect(assignMaterial(0.3)).toBe(2);
      expect(assignMaterial(0.499)).toBe(2);
    });

    it('returns 3 (granite) for energy 0.50 to < 0.70', () => {
      expect(assignMaterial(0.5)).toBe(3);
      expect(assignMaterial(0.6)).toBe(3);
      expect(assignMaterial(0.699)).toBe(3);
    });

    it('returns 4 (crystal) for energy >= 0.70', () => {
      expect(assignMaterial(0.7)).toBe(4);
      expect(assignMaterial(0.8)).toBe(4);
      expect(assignMaterial(1.0)).toBe(4);
    });
  });

  describe('propagate', () => {
    it('returns object with width, height, depth and energyAt, gradientAt functions', () => {
      const field = propagate([], 8, 8, 8);
      expect(field).toHaveProperty('width', 8);
      expect(field).toHaveProperty('height', 8);
      expect(field).toHaveProperty('depth', 8);
      expect(typeof field.energyAt).toBe('function');
      expect(typeof field.gradientAt).toBe('function');
    });

    it('returns all zeros for empty seeds', () => {
      const field = propagate([], 8, 8, 8);
      for (let x = 0; x < 8; x++) {
        for (let y = 0; y < 8; y++) {
          for (let z = 0; z < 8; z++) {
            expect(field.energyAt(x, y, z)).toBe(0);
          }
        }
      }
    });

    it('places highest energy at seed center', () => {
      const field = propagate(
        [{ x: 8, y: 8, z: 8, energy: 1.0, energyType: 0 }],
        16,
        16,
        16
      );
      const seedEnergy = field.energyAt(8, 8, 8);
      const farEnergy = field.energyAt(0, 0, 0);
      // Seed should be significantly higher than far cells
      expect(seedEnergy).toBeGreaterThan(farEnergy * 1.1);
    });

    it('shows energy decay: near cell > far cell', () => {
      const field = propagate(
        [{ x: 8, y: 8, z: 8, energy: 1.0, energyType: 0 }],
        16,
        16,
        16
      );
      // distance 1 from seed
      const nearEnergy = field.energyAt(9, 8, 8);
      // distance 10+ from seed
      const farEnergy = field.energyAt(0, 0, 0);
      expect(nearEnergy).toBeGreaterThan(farEnergy);
    });

    it('clamps energy to [0, 1]', () => {
      const field = propagate(
        [
          { x: 8, y: 8, z: 8, energy: 1.0, energyType: 0 },
          { x: 8, y: 8, z: 9, energy: 1.0, energyType: 0 },
        ],
        16,
        16,
        16
      );
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          for (let z = 0; z < 16; z++) {
            const energy = field.energyAt(x, y, z);
            expect(energy).toBeGreaterThanOrEqual(0);
            expect(energy).toBeLessThanOrEqual(1);
          }
        }
      }
    });

    it('gradient points toward seed for single seed at center', () => {
      const field = propagate(
        [{ x: 8, y: 8, z: 8, energy: 1.0, energyType: 0 }],
        16,
        16,
        16
      );
      // cell at x=10, y=8, z=8 (offset in +x direction)
      const grad = field.gradientAt(10, 8, 8);
      // gx should be negative (energy decreases away from seed)
      expect(grad.gx).toBeLessThan(0);
      expect(typeof grad.gy).toBe('number');
      expect(typeof grad.gz).toBe('number');
    });

    it('is deterministic', () => {
      const seeds = [
        { x: 5, y: 5, z: 5, energy: 1.0, energyType: 0 },
        { x: 10, y: 10, z: 10, energy: 0.5, energyType: 1 },
      ];
      const field1 = propagate(seeds, 16, 16, 16, { decay: 0.015, iterations: 3 });
      const field2 = propagate(seeds, 16, 16, 16, { decay: 0.015, iterations: 3 });

      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          for (let z = 0; z < 16; z++) {
            expect(field1.energyAt(x, y, z)).toBe(field2.energyAt(x, y, z));
          }
        }
      }
    });

    it('uses default decay=0.015 and iterations=3', () => {
      const seeds = [{ x: 8, y: 8, z: 8, energy: 1.0, energyType: 0 }];
      const fieldDefault = propagate(seeds, 16, 16, 16);
      const fieldExplicit = propagate(seeds, 16, 16, 16, { decay: 0.015, iterations: 3 });

      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          for (let z = 0; z < 16; z++) {
            expect(fieldDefault.energyAt(x, y, z)).toBe(fieldExplicit.energyAt(x, y, z));
          }
        }
      }
    });

    it('gradientAt corner (0,0,0) returns finite values', () => {
      const field = propagate(
        [{ x: 8, y: 8, z: 8, energy: 1.0, energyType: 0 }],
        16,
        16,
        16
      );
      const grad = field.gradientAt(0, 0, 0);
      expect(Number.isFinite(grad.gx)).toBe(true);
      expect(Number.isFinite(grad.gy)).toBe(true);
      expect(Number.isFinite(grad.gz)).toBe(true);
    });
  });
});
