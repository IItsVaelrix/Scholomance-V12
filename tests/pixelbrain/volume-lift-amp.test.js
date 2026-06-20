import { describe, it, expect } from 'vitest';
import {
  VOLUME_LIFT_AMP_ID,
  VOLUME_LIFT_PROFILES,
  profileValue,
  liftCellToDepths,
} from '../../codex/core/pixelbrain/volume-lift-amp.js';

describe('VOLUME_LIFT_PROFILES — the art-direction curves', () => {
  it('flat is a constant slab: profile(e) = 1', () => {
    expect(profileValue('flat', 0.1)).toBe(1);
    expect(profileValue('flat', 1)).toBe(1);
  });

  it('bevel is linear: profile(e) = e', () => {
    expect(profileValue('bevel', 0)).toBe(0);
    expect(profileValue('bevel', 0.5)).toBe(0.5);
    expect(profileValue('bevel', 1)).toBe(1);
  });

  it('round is a dome: profile(e) = sqrt(1 - (1 - e)^2)', () => {
    expect(profileValue('round', 1)).toBe(1);
    expect(profileValue('round', 0)).toBe(0);
    expect(profileValue('round', 0.5)).toBeCloseTo(Math.sqrt(1 - 0.25), 10);
  });

  it('ridge is a blade spine: profile(e) = e^0.6', () => {
    expect(profileValue('ridge', 1)).toBe(1);
    expect(profileValue('ridge', 0.5)).toBeCloseTo(Math.pow(0.5, 0.6), 10);
  });

  it('stepped terraces by n: profile(e) = ceil(e*n)/n', () => {
    expect(profileValue('stepped', 0.1, { steps: 4 })).toBeCloseTo(0.25, 10);
    expect(profileValue('stepped', 0.5, { steps: 4 })).toBeCloseTo(0.5, 10);
    expect(profileValue('stepped', 1, { steps: 4 })).toBe(1);
  });

  it('unknown profile falls back to flat', () => {
    expect(profileValue('nonsense', 0.3)).toBe(1);
  });

  it('exposes every PDR-named profile', () => {
    expect(Object.keys(VOLUME_LIFT_PROFILES).sort()).toEqual(
      ['bevel', 'flat', 'ridge', 'round', 'stepped'],
    );
  });
});

describe('liftCellToDepths — symmetric z extents from energy', () => {
  it('flat e=1 maxDepth=2 emits the full 2*maxDepth+1 spine', () => {
    expect(liftCellToDepths(1, 2, 'flat')).toEqual([-2, -1, 0, 1, 2]);
  });

  it('round e=1 maxDepth=1 makes a 3-voxel rod (the haft worked example)', () => {
    expect(liftCellToDepths(1, 1, 'round')).toEqual([-1, 0, 1]);
  });

  it('ridge e=1 maxDepth=2 makes a 5-voxel bladed body (the head worked example)', () => {
    expect(liftCellToDepths(1, 2, 'ridge')).toEqual([-2, -1, 0, 1, 2]);
  });

  it('bevel tapers: e=0.4 maxDepth=2 rounds to halfDepth 1', () => {
    expect(liftCellToDepths(0.4, 2, 'bevel')).toEqual([-1, 0, 1]);
  });

  it('never holes the silhouette: e>0 with halfDepth 0 still emits z=0', () => {
    expect(liftCellToDepths(0.1, 1, 'bevel')).toEqual([0]);
  });

  it('emits nothing for empty cells (e=0)', () => {
    expect(liftCellToDepths(0, 2, 'bevel')).toEqual([]);
  });

  it('always emits an odd, symmetric count', () => {
    const zs = liftCellToDepths(0.8, 3, 'round');
    expect(zs.length % 2).toBe(1);
    expect(zs[0]).toBe(-zs[zs.length - 1]);
  });
});

describe('VOLUME_LIFT_AMP_ID', () => {
  it('is the pixelbrain-namespaced stage id', () => {
    expect(VOLUME_LIFT_AMP_ID).toBe('pixelbrain.volume-lift-amp');
  });
});
