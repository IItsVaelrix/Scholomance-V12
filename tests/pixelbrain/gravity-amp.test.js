import { describe, it, expect } from 'vitest';
import { createVoxelVolume } from '../../codex/core/pixelbrain/voxel-volume.js';
import { applyGravityAMP } from '../../codex/core/pixelbrain/gravity-amp.js';

describe('applyGravityAMP', () => {
  it('produces multiple seeds per XZ input position', () => {
    const vol = createVoxelVolume(32, 32, 32);
    const xzSeeds = [{ vx: 16, vz: 16, energy: 1.0, energyType: 0 }];
    const seeds = applyGravityAMP(xzSeeds, vol);
    expect(seeds.length).toBeGreaterThan(1);
  });

  it('seeds span from baseY down to peakY', () => {
    const vol = createVoxelVolume(32, 32, 32);
    const xzSeeds = [{ vx: 10, vz: 10, energy: 1.0, energyType: 0 }];
    const seeds = applyGravityAMP(xzSeeds, vol, { steps: 4, baseYFraction: 0.75, peakYFraction: 0.1 });
    const yValues = seeds.map(s => s.vy);
    const baseY = Math.floor(32 * 0.75);
    const peakY = Math.floor(32 * 0.1);
    expect(Math.max(...yValues)).toBeLessThanOrEqual(baseY);
    expect(Math.min(...yValues)).toBeGreaterThanOrEqual(peakY);
  });

  it('base seed has higher energy than peak seed', () => {
    const vol = createVoxelVolume(32, 32, 32);
    const xzSeeds = [{ vx: 10, vz: 10, energy: 1.0, energyType: 0 }];
    const seeds = applyGravityAMP(xzSeeds, vol, { steps: 6 });
    // Sort by vy descending: highest vy = base (bottom of volume in voxel coords)
    const sorted = [...seeds].sort((a, b) => b.vy - a.vy);
    expect(sorted[0].energy).toBeGreaterThan(sorted[sorted.length - 1].energy);
  });

  it('all seed coordinates are within volume bounds', () => {
    const vol = createVoxelVolume(32, 32, 32);
    const xzSeeds = [{ vx: 0, vz: 0 }, { vx: 31, vz: 31 }];
    const seeds = applyGravityAMP(xzSeeds, vol);
    for (const s of seeds) {
      expect(s.vx).toBeGreaterThanOrEqual(0);
      expect(s.vx).toBeLessThan(32);
      expect(s.vy).toBeGreaterThanOrEqual(0);
      expect(s.vy).toBeLessThan(32);
      expect(s.vz).toBeGreaterThanOrEqual(0);
      expect(s.vz).toBeLessThan(32);
    }
  });

  it('is deterministic', () => {
    const vol = createVoxelVolume(32, 32, 32);
    const xzSeeds = [{ vx: 8, vz: 12, energy: 0.8, energyType: 0 }];
    const a = applyGravityAMP(xzSeeds, vol);
    const b = applyGravityAMP(xzSeeds, vol);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
