import { describe, it, expect } from 'vitest';
import {
  VoxelAuthority,
  VoxelOp,
  isDeltaAllowed,
  applyVoxelDeltas,
} from '../../codex/core/pixelbrain/voxel-delta.js';
import {
  createVoxelVolume,
  setCellMaterial,
  isCellOccupied,
} from '../../codex/core/pixelbrain/voxel-volume.js';

describe('isDeltaAllowed', () => {
  it('REMOVE_SOLID is allowed for HOLLOW_AMP on non-surface-locked cell', () => {
    const delta = { x: 1, y: 1, z: 1, op: VoxelOp.REMOVE_SOLID, source: VoxelAuthority.HOLLOW_AMP };
    expect(isDeltaAllowed(delta, new Set())).toBe(true);
  });

  it('REMOVE_SOLID is rejected for HOLLOW_AMP on surface-locked cell', () => {
    const delta = { x: 1, y: 1, z: 1, op: VoxelOp.REMOVE_SOLID, source: VoxelAuthority.HOLLOW_AMP };
    expect(isDeltaAllowed(delta, new Set(['1,1,1']))).toBe(false);
  });

  it('REMOVE_SOLID is allowed for RUNTIME_MINING even on surface-locked cells', () => {
    const delta = { x: 1, y: 1, z: 1, op: VoxelOp.REMOVE_SOLID, source: VoxelAuthority.RUNTIME_MINING };
    expect(isDeltaAllowed(delta, new Set(['1,1,1']))).toBe(true);
  });

  it('ADD_SOLID is rejected for HOLLOW_AMP', () => {
    const delta = { x: 0, y: 0, z: 0, op: VoxelOp.ADD_SOLID, source: VoxelAuthority.HOLLOW_AMP };
    expect(isDeltaAllowed(delta, new Set())).toBe(false);
  });

  it('TAG is allowed for VOLUME_AMP', () => {
    const delta = { x: 0, y: 0, z: 0, op: VoxelOp.TAG, source: VoxelAuthority.VOLUME_AMP, payload: {} };
    expect(isDeltaAllowed(delta, new Set())).toBe(true);
  });
});

describe('applyVoxelDeltas — TAG op', () => {
  it('vol.tags exists on a fresh VoxelVolume', () => {
    const vol = createVoxelVolume(4, 4, 4);
    expect(vol.tags).toBeInstanceOf(Map);
  });

  it('TAG op stores payload in vol.tags keyed by "x,y,z"', () => {
    const vol = createVoxelVolume(4, 4, 4);
    setCellMaterial(vol, 1, 1, 1, 2);
    const delta = {
      x: 1, y: 1, z: 1,
      op: VoxelOp.TAG,
      source: VoxelAuthority.VOLUME_AMP,
      payload: { schoolId: 'VOID', blockId: 'voidstone_smooth' },
    };
    applyVoxelDeltas(vol, [delta]);
    expect(vol.tags.get('1,1,1')).toEqual({ schoolId: 'VOID', blockId: 'voidstone_smooth' });
  });

  it('TAG op is counted as applied', () => {
    const vol = createVoxelVolume(4, 4, 4);
    const delta = { x: 0, y: 0, z: 0, op: VoxelOp.TAG, source: VoxelAuthority.VOLUME_AMP, payload: { schoolId: 'ALCHEMY' } };
    const stats = applyVoxelDeltas(vol, [delta]);
    expect(stats.applied).toBe(1);
  });

  it('TAG op does not mutate cell occupancy', () => {
    const vol = createVoxelVolume(4, 4, 4);
    const delta = { x: 2, y: 2, z: 2, op: VoxelOp.TAG, source: VoxelAuthority.VOLUME_AMP, payload: { schoolId: 'SONIC' } };
    applyVoxelDeltas(vol, [delta]);
    expect(isCellOccupied(vol, 2, 2, 2)).toBe(false);
  });

  it('subsequent TAG ops overwrite the previous payload at the same cell', () => {
    const vol = createVoxelVolume(4, 4, 4);
    const d1 = { x: 0, y: 0, z: 0, op: VoxelOp.TAG, source: VoxelAuthority.VOLUME_AMP, payload: { schoolId: 'VOID' } };
    const d2 = { x: 0, y: 0, z: 0, op: VoxelOp.TAG, source: VoxelAuthority.VOLUME_AMP, payload: { schoolId: 'ALCHEMY' } };
    applyVoxelDeltas(vol, [d1, d2]);
    expect(vol.tags.get('0,0,0').schoolId).toBe('ALCHEMY');
  });
});

describe('applyVoxelDeltas — priority ordering', () => {
  it('applies VOLUME_AMP before HOLLOW_AMP (lower priority number first)', () => {
    const vol = createVoxelVolume(4, 4, 4);
    setCellMaterial(vol, 1, 1, 1, 2);
    const deltas = [
      { x: 1, y: 1, z: 1, op: VoxelOp.REMOVE_SOLID, source: VoxelAuthority.HOLLOW_AMP },
      { x: 1, y: 1, z: 1, op: VoxelOp.TAG, source: VoxelAuthority.VOLUME_AMP, payload: { schoolId: 'VOID' } },
    ];
    const stats = applyVoxelDeltas(vol, deltas);
    expect(stats.applied).toBe(2);
    expect(isCellOccupied(vol, 1, 1, 1)).toBe(false);
    expect(vol.tags.get('1,1,1')).toEqual({ schoolId: 'VOID' });
  });
});
