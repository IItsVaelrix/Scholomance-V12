import { describe, it, expect } from 'vitest';
import {
  collectSchoolTagDeltas,
  applySchoolTagAMP,
} from '../../codex/core/pixelbrain/school-tag-amp.js';
import {
  createVoxelVolume,
  setCellMaterial,
  cellIndex,
  isCellOccupied,
} from '../../codex/core/pixelbrain/voxel-volume.js';
import { VoxelOp, VoxelAuthority } from '../../codex/core/pixelbrain/voxel-delta.js';

const VALID_SCHOOLS = new Set(['SONIC','PSYCHIC','VOID','ALCHEMY','WILL','NECROMANCY','ABJURATION','DIVINATION']);

function filledVolume(size = 8) {
  const vol = createVoxelVolume(size, size, size);
  for (let y = 0; y < size; y++)
    for (let z = 0; z < size; z++)
      for (let x = 0; x < size; x++)
        setCellMaterial(vol, x, y, z, 1 + ((x + y + z) % 4));
  vol.energyField.fill(0.5);
  return vol;
}

describe('collectSchoolTagDeltas', () => {
  it('emits one TAG delta per occupied cell', () => {
    const vol = createVoxelVolume(4, 4, 4);
    setCellMaterial(vol, 0, 0, 0, 1);
    setCellMaterial(vol, 1, 1, 1, 2);
    const deltas = collectSchoolTagDeltas(vol, { VOID: 1.0 });
    expect(deltas).toHaveLength(2);
  });

  it('every delta is VoxelOp.TAG with VOLUME_AMP authority', () => {
    const vol = createVoxelVolume(4, 4, 4);
    setCellMaterial(vol, 1, 2, 3, 2);
    const deltas = collectSchoolTagDeltas(vol, { VOID: 1.0 });
    for (const d of deltas) {
      expect(d.op).toBe(VoxelOp.TAG);
      expect(d.source).toBe(VoxelAuthority.VOLUME_AMP);
    }
  });

  it('every delta payload has a valid schoolId and non-empty blockId', () => {
    const vol = filledVolume(8);
    const deltas = collectSchoolTagDeltas(vol, { VOID: 0.6, NECROMANCY: 0.4 });
    for (const d of deltas) {
      expect(VALID_SCHOOLS.has(d.payload.schoolId)).toBe(true);
      expect(typeof d.payload.blockId).toBe('string');
      expect(d.payload.blockId.length).toBeGreaterThan(0);
    }
  });

  it('emits no deltas for an empty volume', () => {
    const vol = createVoxelVolume(4, 4, 4);
    const deltas = collectSchoolTagDeltas(vol, { VOID: 1.0 });
    expect(deltas).toHaveLength(0);
  });

  it('is deterministic', () => {
    const vol = filledVolume(8);
    const a = collectSchoolTagDeltas(vol, { ALCHEMY: 0.7, WILL: 0.3 });
    const b = collectSchoolTagDeltas(vol, { ALCHEMY: 0.7, WILL: 0.3 });
    expect(a.map(d => d.payload.schoolId)).toEqual(b.map(d => d.payload.schoolId));
    expect(a.map(d => d.payload.blockId)).toEqual(b.map(d => d.payload.blockId));
  });
});

describe('applySchoolTagAMP', () => {
  it('tags every occupied cell in vol.tags', () => {
    const vol = filledVolume(8);
    applySchoolTagAMP(vol, { VOID: 1.0 });
    let solidCount = 0;
    for (let y = 0; y < 8; y++)
      for (let z = 0; z < 8; z++)
        for (let x = 0; x < 8; x++)
          if (isCellOccupied(vol, x, y, z)) solidCount++;
    expect(vol.tags.size).toBe(solidCount);
  });

  it('tags are queryable by "x,y,z" key', () => {
    const vol = createVoxelVolume(4, 4, 4);
    setCellMaterial(vol, 2, 3, 1, 2);
    applySchoolTagAMP(vol, { VOID: 1.0 });
    const tag = vol.tags.get('2,3,1');
    expect(tag).toBeDefined();
    expect(VALID_SCHOOLS.has(tag.schoolId)).toBe(true);
    expect(tag.blockId.length).toBeGreaterThan(0);
  });

  it('does not tag unoccupied cells', () => {
    const vol = createVoxelVolume(4, 4, 4);
    setCellMaterial(vol, 1, 1, 1, 2);
    applySchoolTagAMP(vol, { VOID: 1.0 });
    expect(vol.tags.has('0,0,0')).toBe(false);
    expect(vol.tags.has('1,1,1')).toBe(true);
  });
});
