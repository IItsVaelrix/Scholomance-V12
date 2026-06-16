import { describe, it, expect } from 'vitest';
import { createVoxelVolume, ENERGY_TYPES } from '../../codex/core/pixelbrain/voxel-volume.js';
import { liftToVoxelSeeds, generateFibonacciSeeds, generateVectorizedTextSeeds, SEED_CONFIGS } from '../../codex/core/pixelbrain/wand-seed-lift.js';

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

function makeMockCanvas(whitePixels, W = 64, H = 32) {
  return () => {
    const data = new Uint8ClampedArray(W * H * 4);
    for (const { x, y } of whitePixels) {
      if (x < W && y < H) {
        const idx = (y * W + x) * 4;
        data[idx] = 255; data[idx + 1] = 255; data[idx + 2] = 255; data[idx + 3] = 255;
      }
    }
    return {
      width: W, height: H,
      getContext: () => ({
        fillStyle: '', font: '', textAlign: '', textBaseline: '',
        fillRect: () => {}, fillText: () => {},
        getImageData: () => ({ data }),
      }),
    };
  };
}

describe('generateVectorizedTextSeeds', () => {
  it('returns seeds when mock canvas has white pixels', () => {
    const whitePixels = [{ x: 10, y: 8 }, { x: 11, y: 8 }, { x: 10, y: 9 }];
    const v = createVoxelVolume(32, 32, 32);
    const seeds = generateVectorizedTextSeeds('A', v, {
      createCanvas: makeMockCanvas(whitePixels, 64, 32),
      canvasSize: { width: 64, height: 32 },
    });
    expect(seeds.length).toBeGreaterThan(0);
  });

  it('each seed has vx, vy, vz, energy, energyType', () => {
    const whitePixels = [{ x: 20, y: 10 }];
    const v = createVoxelVolume(32, 32, 32);
    const seeds = generateVectorizedTextSeeds('B', v, {
      createCanvas: makeMockCanvas(whitePixels, 64, 32),
      canvasSize: { width: 64, height: 32 },
    });
    for (const s of seeds) {
      expect(typeof s.vx).toBe('number');
      expect(typeof s.vy).toBe('number');
      expect(typeof s.vz).toBe('number');
      expect(typeof s.energy).toBe('number');
      expect(typeof s.energyType).toBe('number');
    }
  });

  it('all seeds are within volume bounds', () => {
    const whitePixels = [{ x: 5, y: 5 }, { x: 50, y: 25 }];
    const v = createVoxelVolume(32, 32, 32);
    const seeds = generateVectorizedTextSeeds('C', v, {
      createCanvas: makeMockCanvas(whitePixels, 64, 32),
      canvasSize: { width: 64, height: 32 },
    });
    for (const s of seeds) {
      expect(s.vx).toBeGreaterThanOrEqual(0); expect(s.vx).toBeLessThan(32);
      expect(s.vy).toBeGreaterThanOrEqual(0); expect(s.vy).toBeLessThan(32);
      expect(s.vz).toBeGreaterThanOrEqual(0); expect(s.vz).toBeLessThan(32);
    }
  });

  it('returns empty array when canvas produces no white pixels', () => {
    const v = createVoxelVolume(32, 32, 32);
    const seeds = generateVectorizedTextSeeds('X', v, {
      createCanvas: makeMockCanvas([], 64, 32),
      canvasSize: { width: 64, height: 32 },
    });
    expect(seeds).toEqual([]);
  });

  it('is deterministic', () => {
    const whitePixels = [{ x: 15, y: 10 }, { x: 16, y: 10 }];
    const v = createVoxelVolume(32, 32, 32);
    const opts = { createCanvas: makeMockCanvas(whitePixels, 64, 32), canvasSize: { width: 64, height: 32 } };
    const a = generateVectorizedTextSeeds('D', v, opts);
    const b = generateVectorizedTextSeeds('D', v, opts);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
