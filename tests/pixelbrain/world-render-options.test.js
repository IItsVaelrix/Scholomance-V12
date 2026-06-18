import { describe, it, expect } from 'vitest';
import { worldRenderOptions, seedsToLightPoints, WORLD_GLOW_OPACITY } from '../../codex/core/pixelbrain/world-render-options.js';

describe('worldRenderOptions — the shared world render look', () => {
  it('turns on ambient occlusion, antialias and lighting', () => {
    const o = worldRenderOptions();
    expect(o.ambientOcclusion).toBe(true);
    expect(o.antialias).toBe(true);
    expect(o.lighting).toBe(true);
  });

  it('keeps the glow a tasteful CUE, not a prop (opacity well below the 0.45 default)', () => {
    const o = worldRenderOptions();
    expect(o.lightPointOpacity).toBe(WORLD_GLOW_OPACITY);
    expect(o.lightPointOpacity).toBeGreaterThan(0);
    expect(o.lightPointOpacity).toBeLessThanOrEqual(0.2);
  });

  it('threads the supplied light points', () => {
    const lp = [{ sx: 1, sy: 2, r: 3, energy: 0.5, schoolId: 'VOID' }];
    expect(worldRenderOptions(lp).lightPoints).toBe(lp);
  });

  it('defaults light points to an empty list', () => {
    expect(worldRenderOptions().lightPoints).toEqual([]);
  });

  it('lets callers override individual fields', () => {
    const o = worldRenderOptions([], { ambientOcclusionStrength: 0.6 });
    expect(o.ambientOcclusionStrength).toBe(0.6);
    expect(o.antialias).toBe(true); // untouched defaults survive
  });
});

describe('seedsToLightPoints — soft, local glows from energy seeds', () => {
  it('projects a seed to screen space with a contained radius', () => {
    const lp = seedsToLightPoints([{ vx: 4, vy: 8, vz: 2, energy: 0.5 }], { schoolId: 'VOID', size: 32, tileSize: 16 });
    expect(lp).toEqual([{ sx: 32, sy: -80, r: 256, energy: 0.5, schoolId: 'VOID' }]);
  });

  it('accepts plain {x,y,z} seeds too', () => {
    const lp = seedsToLightPoints([{ x: 4, y: 8, z: 2, energy: 1 }], { schoolId: 'VOID', size: 32, tileSize: 16 });
    expect(lp[0].sx).toBe(32);
    expect(lp[0].sy).toBe(-80);
  });

  it('clamps energy into [0,1]', () => {
    const lp = seedsToLightPoints(
      [{ vx: 0, vy: 0, vz: 0, energy: 1.5 }, { vx: 0, vy: 0, vz: 0, energy: -0.3 }],
      { schoolId: 'VOID' },
    );
    expect(lp[0].energy).toBe(1);
    expect(lp[1].energy).toBe(0);
  });
});
