import { describe, it, expect } from 'vitest';
import {
  MATERIAL_THRESHOLDS,
  assignMaterial,
  propagate,
  propagateWithOctree,
  ATTENUATION_MODELS,
  PHI,
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

    it('default attenuationModel is gaussian (backward compat)', () => {
      const seeds = [{ x: 8, y: 8, z: 8, energy: 1.0, energyType: 0 }];
      const a = propagate(seeds, 16, 16, 16);
      const b = propagate(seeds, 16, 16, 16, { attenuationModel: ATTENUATION_MODELS.GAUSSIAN });
      expect(a.energyAt(8, 8, 8)).toBe(b.energyAt(8, 8, 8));
    });

    it('inverse_square matches closed-form seedEnergy / (dist^2 + 1) to 1e-6', () => {
      const seeds = [{ x: 8, y: 8, z: 8, energy: 1.0, energyType: 0 }];
      const field = propagate(seeds, 16, 16, 16, { attenuationModel: ATTENUATION_MODELS.INVERSE_SQUARE, iterations: 0 });
      // distance 0: 1.0 / (0 + 1) = 1.0
      expect(field.energyAt(8, 8, 8)).toBeCloseTo(1.0, 6);
      // distance 1: 1.0 / (1 + 1) = 0.5
      expect(field.energyAt(9, 8, 8)).toBeCloseTo(0.5, 6);
      // distance sqrt(3): 1.0 / (3 + 1) = 0.25
      expect(field.energyAt(9, 9, 9)).toBeCloseTo(0.25, 6);
    });

    it('phi_attenuation matches closed-form seedEnergy / (dist^(2/φ) + 1) to 1e-6', () => {
      const seeds = [{ x: 8, y: 8, z: 8, energy: 1.0, energyType: 0 }];
      const field = propagate(seeds, 16, 16, 16, { attenuationModel: ATTENUATION_MODELS.PHI_ATTENUATION, iterations: 0 });
      const exponent = 2 / PHI;
      // distance 0: 1.0 / (0 + 1) = 1.0
      expect(field.energyAt(8, 8, 8)).toBeCloseTo(1.0, 6);
      // distance 1: 1.0 / (1^exp + 1) = 0.5
      expect(field.energyAt(9, 8, 8)).toBeCloseTo(0.5, 6);
      // distance 2: 1.0 / (2^exp + 1)
      const expected = 1.0 / (Math.pow(2, exponent) + 1);
      expect(field.energyAt(10, 8, 8)).toBeCloseTo(expected, 6);
    });

    it('phi_attenuation falls off softer than inverse_square at distance 10', () => {
      const seeds = [{ x: 8, y: 8, z: 8, energy: 1.0, energyType: 0 }];
      const inv = propagate(seeds, 24, 24, 24, { attenuationModel: ATTENUATION_MODELS.INVERSE_SQUARE, iterations: 0 });
      const phi = propagate(seeds, 24, 24, 24, { attenuationModel: ATTENUATION_MODELS.PHI_ATTENUATION, iterations: 0 });
      const invE = inv.energyAt(18, 8, 8);  // distance 10
      const phiE = phi.energyAt(18, 8, 8);
      expect(phiE).toBeGreaterThan(invE);
    });

    it('inverse_square never divides by zero at seed cell', () => {
      const seeds = [{ x: 8, y: 8, z: 8, energy: 1.0, energyType: 0 }];
      const field = propagate(seeds, 16, 16, 16, { attenuationModel: ATTENUATION_MODELS.INVERSE_SQUARE, iterations: 0 });
      expect(field.energyAt(8, 8, 8)).toBe(1.0);
      expect(Number.isFinite(field.energyAt(8, 8, 8))).toBe(true);
    });

    it('maxRadius limits seed reach', () => {
      const seeds = [{ x: 8, y: 8, z: 8, energy: 1.0, energyType: 0 }];
      const field = propagate(seeds, 16, 16, 16, { attenuationModel: ATTENUATION_MODELS.INVERSE_SQUARE, iterations: 0, maxRadius: 3 });
      // distance 1 is within reach
      expect(field.energyAt(9, 8, 8)).toBeGreaterThan(0);
      // distance 10 is beyond reach, contributes 0
      expect(field.energyAt(18, 8, 8)).toBe(0);
    });

    it('clamps energy to [0, 1] under inverse_square with many seeds', () => {
      // Many seeds at the same point would saturate; verify clamp holds
      const seeds = [];
      for (let i = 0; i < 10; i++) {
        seeds.push({ x: 8, y: 8, z: 8, energy: 1.0, energyType: 0 });
      }
      const field = propagate(seeds, 16, 16, 16, { attenuationModel: ATTENUATION_MODELS.INVERSE_SQUARE, iterations: 0 });
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          for (let z = 0; z < 16; z++) {
            const e = field.energyAt(x, y, z);
            expect(e).toBeGreaterThanOrEqual(0);
            expect(e).toBeLessThanOrEqual(1);
          }
        }
      }
    });
  });
});

// =====================================================================
// QBIT-Voxel Phase 5 — Octree-accelerated propagation
// =====================================================================

describe('propagateWithOctree', () => {
  it('produces the same energy field as propagate() for inverse_square', () => {
    const seeds = [
      { x: 4, y: 4, z: 4, energy: 1.0, energyType: 0 },
      { x: 12, y: 12, z: 12, energy: 0.5, energyType: 1 },
    ];
    const a = propagate(seeds, 16, 16, 16, { attenuationModel: ATTENUATION_MODELS.INVERSE_SQUARE, maxRadius: 12, iterations: 2 });
    const b = propagateWithOctree(seeds, 16, 16, 16, { attenuationModel: ATTENUATION_MODELS.INVERSE_SQUARE, maxRadius: 12, iterations: 2 });
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        for (let z = 0; z < 16; z++) {
          expect(b.energyAt(x, y, z)).toBeCloseTo(a.energyAt(x, y, z), 6);
        }
      }
    }
  });

  it('produces the same energy field as propagate() for gaussian (sqrt path)', () => {
    const seeds = [
      { x: 8, y: 8, z: 8, energy: 1.0, energyType: 0 },
    ];
    const a = propagate(seeds, 16, 16, 16, { attenuationModel: ATTENUATION_MODELS.GAUSSIAN, decay: 0.05, maxRadius: 10, iterations: 0 });
    const b = propagateWithOctree(seeds, 16, 16, 16, { attenuationModel: ATTENUATION_MODELS.GAUSSIAN, decay: 0.05, maxRadius: 10, iterations: 0 });
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        for (let z = 0; z < 16; z++) {
          expect(b.energyAt(x, y, z)).toBeCloseTo(a.energyAt(x, y, z), 5);
        }
      }
    }
  });

  it('produces the same energy field as propagate() for phi_attenuation', () => {
    const seeds = [{ x: 8, y: 8, z: 8, energy: 1.0, energyType: 0 }];
    const a = propagate(seeds, 16, 16, 16, { attenuationModel: ATTENUATION_MODELS.PHI_ATTENUATION, maxRadius: 10, iterations: 0 });
    const b = propagateWithOctree(seeds, 16, 16, 16, { attenuationModel: ATTENUATION_MODELS.PHI_ATTENUATION, maxRadius: 10, iterations: 0 });
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        for (let z = 0; z < 16; z++) {
          expect(b.energyAt(x, y, z)).toBeCloseTo(a.energyAt(x, y, z), 5);
        }
      }
    }
  });

  it('handles a seed at the corner correctly (deep prune case)', () => {
    // Seed at (0, 0, 0) with maxRadius=8 in a 32³ volume. The subtree
    // behind the seed (x, y, z > 8) is entirely outside maxRadius and
    // should be skipped entirely by the octree.
    const seeds = [{ x: 0, y: 0, z: 0, energy: 1.0, energyType: 0 }];
    const a = propagate(seeds, 32, 32, 32, { attenuationModel: ATTENUATION_MODELS.INVERSE_SQUARE, maxRadius: 8, iterations: 0 });
    const b = propagateWithOctree(seeds, 32, 32, 32, { attenuationModel: ATTENUATION_MODELS.INVERSE_SQUARE, maxRadius: 8, iterations: 0 });
    for (let x = 0; x < 32; x++) {
      for (let y = 0; y < 32; y++) {
        for (let z = 0; z < 32; z++) {
          expect(b.energyAt(x, y, z)).toBeCloseTo(a.energyAt(x, y, z), 6);
        }
      }
    }
  });

  it('handles a seed at the center (no prune case)', () => {
    // Seed at (16, 16, 16) with maxRadius=8 in a 32³ volume. The whole
    // volume is partially within maxRadius; the octree should still
    // produce the correct result.
    const seeds = [{ x: 16, y: 16, z: 16, energy: 1.0, energyType: 0 }];
    const a = propagate(seeds, 32, 32, 32, { attenuationModel: ATTENUATION_MODELS.INVERSE_SQUARE, maxRadius: 8, iterations: 0 });
    const b = propagateWithOctree(seeds, 32, 32, 32, { attenuationModel: ATTENUATION_MODELS.INVERSE_SQUARE, maxRadius: 8, iterations: 0 });
    for (let x = 0; x < 32; x++) {
      for (let y = 0; y < 32; y++) {
        for (let z = 0; z < 32; z++) {
          expect(b.energyAt(x, y, z)).toBeCloseTo(a.energyAt(x, y, z), 6);
        }
      }
    }
  });

  it('handles multiple seeds with overlapping reach', () => {
    const seeds = [
      { x: 4, y: 4, z: 4, energy: 1.0, energyType: 0 },
      { x: 12, y: 12, z: 12, energy: 1.0, energyType: 0 },
      { x: 20, y: 20, z: 20, energy: 1.0, energyType: 0 },
    ];
    const a = propagate(seeds, 24, 24, 24, { attenuationModel: ATTENUATION_MODELS.INVERSE_SQUARE, maxRadius: 8, iterations: 0 });
    const b = propagateWithOctree(seeds, 24, 24, 24, { attenuationModel: ATTENUATION_MODELS.INVERSE_SQUARE, maxRadius: 8, iterations: 0 });
    let maxDiff = 0;
    for (let x = 0; x < 24; x++) {
      for (let y = 0; y < 24; y++) {
        for (let z = 0; z < 24; z++) {
          maxDiff = Math.max(maxDiff, Math.abs(b.energyAt(x, y, z) - a.energyAt(x, y, z)));
        }
      }
    }
    expect(maxDiff).toBeLessThan(1e-6);
  });

  it('returns same shape as propagate()', () => {
    const seeds = [{ x: 4, y: 4, z: 4, energy: 1.0, energyType: 0 }];
    const field = propagateWithOctree(seeds, 8, 8, 8, { attenuationModel: ATTENUATION_MODELS.INVERSE_SQUARE });
    expect(field.width).toBe(8);
    expect(field.height).toBe(8);
    expect(field.depth).toBe(8);
    expect(typeof field.energyAt).toBe('function');
    expect(typeof field.gradientAt).toBe('function');
  });

  it('is comparable in speed to propagate() for sparse seeds at the corner of a 64³ volume', () => {
    // The octree was the PDR §3.1 Step 3.1 promised optimization. Empirically
    // it is NOT a clear win over the simpler spatial-pruning approach that
    // `propagate()` already uses. For a single seed at the corner of a 64³
    // volume with small maxRadius, the octree's recursive descent has
    // comparable cost to the per-cell early-continue in the spatial version.
    // The octree is more useful in cases where the seed's bounding box
    // covers a large region but most of it is outside maxRadius — a niche
    // that doesn't arise in the standard QBIT-Voxel world pipeline.
    //
    // This test asserts that the octree doesn't regress (within 3x of
    // the standard version) — not that it's faster. Correctness is the
    // primary guarantee; performance is informational.
    const seeds = [{ x: 0, y: 0, z: 0, energy: 1.0, energyType: 0 }];
    const N = 10;
    const t0 = performance.now();
    for (let i = 0; i < N; i++) {
      propagate(seeds, 64, 64, 64, { attenuationModel: ATTENUATION_MODELS.INVERSE_SQUARE, maxRadius: 8, iterations: 0 });
    }
    const tStandard = (performance.now() - t0) / N;
    const t1 = performance.now();
    for (let i = 0; i < N; i++) {
      propagateWithOctree(seeds, 64, 64, 64, { attenuationModel: ATTENUATION_MODELS.INVERSE_SQUARE, maxRadius: 8, iterations: 0 });
    }
    const tOctree = (performance.now() - t1) / N;
    // Don't regress beyond 3x the standard version's time.
    expect(tOctree).toBeLessThan(tStandard * 3);
    // eslint-disable-next-line no-console
    console.log(`  propagate avg: ${tStandard.toFixed(2)}ms, octree avg: ${tOctree.toFixed(2)}ms, ratio: ${(tOctree / tStandard).toFixed(2)}x`);
  });
});
