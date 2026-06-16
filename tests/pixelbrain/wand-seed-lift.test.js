import { describe, it, expect } from 'vitest';
import { createVoxelVolume, ENERGY_TYPES } from '../../codex/core/pixelbrain/voxel-volume.js';
import { liftToVoxelSeeds, generateFibonacciSeeds, SEED_CONFIGS } from '../../codex/core/pixelbrain/wand-seed-lift.js';

describe('SEED_CONFIGS', () => {
  it('has all 6 formula types', () => {
    const keys = Object.keys(SEED_CONFIGS);
    expect(keys).toContain('fibonacci');
    expect(keys).toContain('fractal_iter');
    expect(keys).toContain('parametric_curve');
    expect(keys).toContain('vectorized_text');
  });
});

describe('liftToVoxelSeeds', () => {
  it('converts 2D coords to 3D seed points', () => {
    const v = createVoxelVolume(32, 32, 32);
    const coords2D = [{ x: 400, y: 300 }, { x: 200, y: 100 }];
    const seeds = liftToVoxelSeeds(coords2D, v, { canvasSize: { width: 800, height: 600 } });
    expect(seeds.length).toBe(2);
    for (const seed of seeds) {
      expect(seed.vx).toBeGreaterThanOrEqual(0);
      expect(seed.vx).toBeLessThan(32);
      expect(seed.vy).toBeGreaterThanOrEqual(0);
      expect(seed.vy).toBeLessThan(32);
      expect(seed.vz).toBeGreaterThanOrEqual(0);
      expect(seed.vz).toBeLessThan(32);
    }
  });

  it('each seed has energy and energyType fields', () => {
    const v = createVoxelVolume(32, 32, 32);
    const coords2D = [{ x: 400, y: 300 }];
    const seeds = liftToVoxelSeeds(coords2D, v);
    expect(seeds[0].energy).toBeDefined();
    expect(typeof seeds[0].energyType).toBe('number');
  });

  it('clamps out-of-canvas coords to volume bounds', () => {
    const v = createVoxelVolume(32, 32, 32);
    const coords2D = [{ x: -100, y: 5000 }];
    const seeds = liftToVoxelSeeds(coords2D, v);
    expect(seeds[0].vx).toBeGreaterThanOrEqual(0);
    expect(seeds[0].vz).toBeLessThan(32);
  });

  it('is deterministic', () => {
    const v = createVoxelVolume(32, 32, 32);
    const coords2D = [{ x: 400, y: 300 }];
    const s1 = liftToVoxelSeeds(coords2D, v);
    const s2 = liftToVoxelSeeds(coords2D, v);
    expect(s1[0].vx).toBe(s2[0].vx);
    expect(s1[0].vz).toBe(s2[0].vz);
  });
});

describe('generateFibonacciSeeds', () => {
  it('generates multiple seeds from Fibonacci formula', () => {
    const v = createVoxelVolume(32, 32, 32);
    const seeds = generateFibonacciSeeds({ iterations: 6, scale: 0.75 }, v);
    expect(seeds.length).toBeGreaterThan(10);
  });

  it('all seeds are within volume bounds', () => {
    const v = createVoxelVolume(32, 32, 32);
    const seeds = generateFibonacciSeeds({ iterations: 8, scale: 0.75 }, v);
    for (const seed of seeds) {
      expect(seed.vx).toBeGreaterThanOrEqual(0);
      expect(seed.vx).toBeLessThan(32);
      expect(seed.vy).toBeGreaterThanOrEqual(0);
      expect(seed.vy).toBeLessThan(32);
      expect(seed.vz).toBeGreaterThanOrEqual(0);
      expect(seed.vz).toBeLessThan(32);
    }
  });

  it('is deterministic', () => {
    const v = createVoxelVolume(32, 32, 32);
    const s1 = generateFibonacciSeeds({ iterations: 6, scale: 0.75 }, v);
    const s2 = generateFibonacciSeeds({ iterations: 6, scale: 0.75 }, v);
    expect(s1.length).toBe(s2.length);
    expect(s1[0].vx).toBe(s2[0].vx);
  });
});
