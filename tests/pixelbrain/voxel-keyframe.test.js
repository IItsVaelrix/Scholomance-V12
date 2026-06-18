import { describe, it, expect } from 'vitest';
import {
  composeTransform,
  applyTransform,
  FPS_DEFAULT,
  frameAt,
} from '../../codex/core/pixelbrain/voxel-keyframe.js';

const close = (p, q) => {
  expect(p.x).toBeCloseTo(q.x, 6);
  expect(p.y).toBeCloseTo(q.y, 6);
  expect(p.z).toBeCloseTo(q.z, 6);
};

const apply = (keyframe, pivot, point) => applyTransform(point, composeTransform(keyframe, pivot));

describe('timeline units (D2)', () => {
  it('defaults to 12 fps', () => {
    expect(FPS_DEFAULT).toBe(12);
  });

  it('maps seconds to the nearest frame index', () => {
    expect(frameAt(1, 12)).toBe(12);
    expect(frameAt(0.5)).toBe(6); // default fps
    expect(frameAt(0.04, 12)).toBe(0);
    expect(frameAt(0.05, 12)).toBe(1);
  });
});

describe('keyframe transform about pivot (D1)', () => {
  it('an empty keyframe is the identity', () => {
    close(apply({}, { x: 2, y: 3, z: 4 }, { x: 5, y: 6, z: 7 }), { x: 5, y: 6, z: 7 });
  });

  it('applies translation', () => {
    close(apply({ translate: { x: 1, y: 0, z: 0 } }, { x: 0, y: 0, z: 0 }, { x: 5, y: 6, z: 7 }), { x: 6, y: 6, z: 7 });
  });

  it('rotates about the pivot, not the origin', () => {
    close(apply({ rotateDeg: { x: 0, y: 0, z: 90 } }, { x: 1, y: 0, z: 0 }, { x: 2, y: 0, z: 0 }), { x: 1, y: 1, z: 0 });
  });

  it('scales about the pivot', () => {
    close(apply({ scale: { x: 2, y: 1, z: 1 } }, { x: 0, y: 0, z: 0 }, { x: 3, y: 0, z: 0 }), { x: 6, y: 0, z: 0 });
  });

  it('composes scale before rotation (S then R)', () => {
    close(apply({ scale: { x: 2, y: 1, z: 1 }, rotateDeg: { x: 0, y: 0, z: 90 } }, { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }), { x: 0, y: 2, z: 0 });
  });
});
