import { describe, it, expect } from 'vitest';
import {
  liftAnchor2D,
  defaultPivot,
  snapToHalfVoxel,
  isPivot3D,
} from '../../codex/core/pixelbrain/voxel-pivot.js';

describe('liftAnchor2D (B1)', () => {
  it('adds the default z to a 2D anchor', () => {
    expect(liftAnchor2D({ x: 5, y: 9 }, 4)).toEqual({ x: 5, y: 9, z: 4 });
  });

  it('preserves an anchor that already has a z', () => {
    expect(liftAnchor2D({ x: 5, y: 9, z: 2 }, 4)).toEqual({ x: 5, y: 9, z: 2 });
  });

  it('does not mutate the input anchor', () => {
    const a = { x: 5, y: 9 };
    liftAnchor2D(a, 4);
    expect(a).toEqual({ x: 5, y: 9 });
  });
});

describe('defaultPivot (B2: X center, Y min/ground, Z center)', () => {
  it('even spans land on an integer corner', () => {
    const bbox = { minX: 0, maxX: 3, minY: 0, maxY: 7, minZ: 0, maxZ: 3 };
    expect(defaultPivot(bbox)).toEqual({ x: 2, y: 0, z: 2 });
  });

  it('odd spans land on a voxel center (n+0.5)', () => {
    const bbox = { minX: 0, maxX: 2, minY: 2, maxY: 9, minZ: 0, maxZ: 2 };
    expect(defaultPivot(bbox)).toEqual({ x: 1.5, y: 2, z: 1.5 });
  });
});

describe('snapToHalfVoxel (B3)', () => {
  it('snaps each component to the nearest half-voxel', () => {
    expect(snapToHalfVoxel({ x: 1.2, y: 1.7, z: 1.5 })).toEqual({ x: 1, y: 1.5, z: 1.5 });
  });
});

describe('isPivot3D', () => {
  it('accepts a full 3D pivot', () => {
    expect(isPivot3D({ x: 1, y: 2, z: 3 })).toBe(true);
  });

  it('rejects a 2D anchor', () => {
    expect(isPivot3D({ x: 1, y: 2 })).toBe(false);
  });

  it('rejects non-numeric components', () => {
    expect(isPivot3D({ x: 1, y: 2, z: 'a' })).toBe(false);
  });
});
