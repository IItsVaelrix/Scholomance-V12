import { describe, it, expect } from 'vitest';
import {
  VOXEL_STD_CONTRACT,
  AXES,
  UP_AXIS,
  HANDEDNESS,
  mirror,
} from '../../codex/core/pixelbrain/voxel-axes.js';

describe('voxel-axes contract & frame', () => {
  it('declares the PB-VOXEL-STD-v1 contract', () => {
    expect(VOXEL_STD_CONTRACT).toBe('PB-VOXEL-STD-v1');
  });

  it('is Y-up, right-handed (A1)', () => {
    expect(UP_AXIS).toBe('y');
    expect(HANDEDNESS).toBe('right');
  });

  it('names the three axes x, y, z', () => {
    expect(AXES).toEqual(['x', 'y', 'z']);
  });
});

describe('mirror across a half-voxel plane (A3)', () => {
  it('reflects the chosen axis across the plane: 2*planeHalf - p', () => {
    const p = { x: 2, y: 0, z: 0 };
    expect(mirror(p, 'x', 3.5)).toEqual({ x: 5, y: 0, z: 0 });
  });

  it('leaves the other axes untouched', () => {
    const p = { x: 2, y: 7, z: 9 };
    const out = mirror(p, 'z', 4.5);
    expect(out).toEqual({ x: 2, y: 7, z: 0 });
  });

  it('is an involution: mirroring twice returns the original point', () => {
    const p = { x: 1, y: 6, z: 3 };
    expect(mirror(mirror(p, 'y', 5.5), 'y', 5.5)).toEqual(p);
  });

  it('does not mutate the input point', () => {
    const p = { x: 2, y: 0, z: 0 };
    mirror(p, 'x', 3.5);
    expect(p).toEqual({ x: 2, y: 0, z: 0 });
  });
});
