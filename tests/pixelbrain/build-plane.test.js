import { describe, it, expect } from 'vitest';
import {
  createPlane,
  planeToVoxel,
  voxelToPlane,
  clampPlane,
} from '../../codex/core/pixelbrain/build-plane.js';

describe('createPlane (A2)', () => {
  it('defaults to the z (depth) axis at index 0', () => {
    expect(createPlane()).toEqual({ axis: 'z', index: 0 });
  });

  it('accepts an explicit axis and index', () => {
    expect(createPlane('y', 3)).toEqual({ axis: 'y', index: 3 });
  });
});

describe('planeToVoxel', () => {
  it('z-plane maps (u,v) to (x,y) at the depth index', () => {
    expect(planeToVoxel({ axis: 'z', index: 5 }, 3, 7)).toEqual({ x: 3, y: 7, z: 5 });
  });

  it('y-plane (top-down) maps (u,v) to (x,z) at the height index', () => {
    expect(planeToVoxel({ axis: 'y', index: 2 }, 3, 7)).toEqual({ x: 3, y: 2, z: 7 });
  });

  it('x-plane (side) maps (u,v) to (z,y) at the width index', () => {
    expect(planeToVoxel({ axis: 'x', index: 4 }, 3, 7)).toEqual({ x: 4, y: 7, z: 3 });
  });
});

describe('voxelToPlane', () => {
  it('reads the two in-plane coordinates back out', () => {
    expect(voxelToPlane({ axis: 'z', index: 5 }, { x: 3, y: 7, z: 5 })).toEqual({ u: 3, v: 7 });
  });

  it('round-trips with planeToVoxel for every axis', () => {
    for (const axis of ['x', 'y', 'z']) {
      const plane = { axis, index: 1 };
      expect(voxelToPlane(plane, planeToVoxel(plane, 4, 6))).toEqual({ u: 4, v: 6 });
    }
  });
});

describe('clampPlane', () => {
  const vol = { width: 8, height: 6, depth: 4 };

  it('clamps a z index to the volume depth', () => {
    expect(clampPlane({ axis: 'z', index: 10 }, vol)).toEqual({ axis: 'z', index: 3 });
  });

  it('clamps a negative index to 0', () => {
    expect(clampPlane({ axis: 'z', index: -2 }, vol)).toEqual({ axis: 'z', index: 0 });
  });

  it('uses the height for a y plane', () => {
    expect(clampPlane({ axis: 'y', index: 10 }, vol)).toEqual({ axis: 'y', index: 5 });
  });
});
