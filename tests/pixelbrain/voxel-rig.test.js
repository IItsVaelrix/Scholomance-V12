import { describe, it, expect } from 'vitest';
import {
  createRig,
  addNode,
  worldPivot,
  skeletonToRig,
  rotatePointAboutPivot,
  ROTATION_ORDER,
} from '../../codex/core/pixelbrain/voxel-rig.js';

const close = (p, q) => {
  expect(p.x).toBeCloseTo(q.x, 6);
  expect(p.y).toBeCloseTo(q.y, 6);
  expect(p.z).toBeCloseTo(q.z, 6);
};

describe('rig hierarchy & parent-relative pivots (C2)', () => {
  it('creates a root node at the origin by default', () => {
    const rig = createRig();
    expect(worldPivot(rig, 'root')).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('resolves a child world pivot as parent + local', () => {
    const rig = createRig();
    addNode(rig, { name: 'shoulder', parent: 'root', pivot: { x: 1, y: 2, z: 3 } });
    expect(worldPivot(rig, 'shoulder')).toEqual({ x: 1, y: 2, z: 3 });
  });

  it('accumulates pivots down a chain', () => {
    const rig = createRig({ x: 0, y: 0, z: 0 });
    addNode(rig, { name: 'a', parent: 'root', pivot: { x: 1, y: 2, z: 3 } });
    addNode(rig, { name: 'b', parent: 'a', pivot: { x: 10, y: 0, z: 0 } });
    expect(worldPivot(rig, 'b')).toEqual({ x: 11, y: 2, z: 3 });
  });

  it('throws for an unknown node', () => {
    expect(() => worldPivot(createRig(), 'ghost')).toThrow();
  });
});

describe('skeletonToRig (C2 — anchors become 3D joints)', () => {
  it('lifts each 2D skeleton anchor into a world joint at z=0', () => {
    const skel = {
      contract: 'PB-CONSTRUCTION-SKELETON-v1',
      torso: { shoulderL: { x: 9, y: 13 } },
      head: { top: { x: 16, y: 2 } },
    };
    const rig = skeletonToRig(skel);
    expect(worldPivot(rig, 'torso.shoulderL')).toEqual({ x: 9, y: 13, z: 0 });
    expect(worldPivot(rig, 'head.top')).toEqual({ x: 16, y: 2, z: 0 });
  });
});

describe('rotation convention (C3)', () => {
  it('uses intrinsic XYZ order', () => {
    expect(ROTATION_ORDER).toBe('XYZ');
  });

  it('zero rotation is the identity', () => {
    close(rotatePointAboutPivot({ x: 1, y: 2, z: 3 }, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }), { x: 1, y: 2, z: 3 });
  });

  it('a point at the pivot is fixed under any rotation', () => {
    close(rotatePointAboutPivot({ x: 5, y: 6, z: 7 }, { x: 30, y: 45, z: 90 }, { x: 5, y: 6, z: 7 }), { x: 5, y: 6, z: 7 });
  });

  it('+90° about Z takes +X to +Y (right-handed)', () => {
    close(rotatePointAboutPivot({ x: 1, y: 0, z: 0 }, { x: 0, y: 0, z: 90 }, { x: 0, y: 0, z: 0 }), { x: 0, y: 1, z: 0 });
  });

  it('+90° about X takes +Y to +Z', () => {
    close(rotatePointAboutPivot({ x: 0, y: 1, z: 0 }, { x: 90, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }), { x: 0, y: 0, z: 1 });
  });

  it('+90° about Y takes +X to -Z', () => {
    close(rotatePointAboutPivot({ x: 1, y: 0, z: 0 }, { x: 0, y: 90, z: 0 }, { x: 0, y: 0, z: 0 }), { x: 0, y: 0, z: -1 });
  });

  it('rotates about an offset pivot', () => {
    close(rotatePointAboutPivot({ x: 2, y: 0, z: 0 }, { x: 0, y: 0, z: 90 }, { x: 1, y: 0, z: 0 }), { x: 1, y: 1, z: 0 });
  });
});
