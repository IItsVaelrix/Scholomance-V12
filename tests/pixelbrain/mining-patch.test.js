import { describe, it, expect } from 'vitest';
import {
  applyMiningPatch,
} from '../../codex/core/pixelbrain/mining-patch.js';
import {
  createVoxelVolume,
  setCellMaterial,
  isCellOccupied,
  cellIndex,
} from '../../codex/core/pixelbrain/voxel-volume.js';
import { applySchoolTagAMP } from '../../codex/core/pixelbrain/school-tag-amp.js';

const SCHOOL_WEIGHTS = { VOID: 1.0 };
const VALID_SCHOOLS = new Set(['SONIC','PSYCHIC','VOID','ALCHEMY','WILL','NECROMANCY','ABJURATION','DIVINATION']);

function solidVolume(size = 8) {
  const vol = createVoxelVolume(size, size, size);
  for (let y = 0; y < size; y++)
    for (let z = 0; z < size; z++)
      for (let x = 0; x < size; x++)
        setCellMaterial(vol, x, y, z, 1 + ((x + y + z) % 4));
  vol.energyField.fill(0.5);
  applySchoolTagAMP(vol, SCHOOL_WEIGHTS);
  return vol;
}

describe('applyMiningPatch', () => {
  it('removes the mined cell from the volume', () => {
    const vol = solidVolume();
    applyMiningPatch(vol, SCHOOL_WEIGHTS, 4, 4, 4);
    expect(isCellOccupied(vol, 4, 4, 4)).toBe(false);
  });

  it('does not touch the energyField at the mined position', () => {
    const vol = solidVolume();
    const idx = cellIndex(vol, 4, 4, 4);
    const originalEnergy = vol.energyField[idx];
    applyMiningPatch(vol, SCHOOL_WEIGHTS, 4, 4, 4);
    expect(vol.energyField[idx]).toBe(originalEnergy);
  });

  it('removes the tag for the mined cell', () => {
    const vol = solidVolume();
    expect(vol.tags.has('4,4,4')).toBe(true);
    applyMiningPatch(vol, SCHOOL_WEIGHTS, 4, 4, 4);
    expect(vol.tags.has('4,4,4')).toBe(false);
  });

  it('returns removedAt matching the mined coordinate', () => {
    const vol = solidVolume();
    const patch = applyMiningPatch(vol, SCHOOL_WEIGHTS, 3, 2, 5);
    expect(patch.removedAt).toEqual({ x: 3, y: 2, z: 5 });
  });

  it('returns addedFaces for neighbors that gain visibility', () => {
    const vol = solidVolume();
    const patch = applyMiningPatch(vol, SCHOOL_WEIGHTS, 4, 4, 4);
    // 3 neighbors can gain new faces: (4,3,4)→top, (4,4,3)→left, (3,4,4)→right
    expect(patch.addedFaces.length).toBeGreaterThan(0);
    expect(patch.addedFaces.length).toBeLessThanOrEqual(3);
  });

  it('every added face has valid schoolId, blockId, ao, and light', () => {
    const vol = solidVolume();
    const patch = applyMiningPatch(vol, SCHOOL_WEIGHTS, 4, 4, 4);
    for (const face of patch.addedFaces) {
      expect(VALID_SCHOOLS.has(face.resource.schoolId)).toBe(true);
      expect(face.resource.blockId.length).toBeGreaterThan(0);
      expect(face.ao).toBeGreaterThanOrEqual(0);
      expect(face.ao).toBeLessThanOrEqual(1);
      expect(face.light).toBeGreaterThanOrEqual(0);
      expect(face.light).toBeLessThanOrEqual(1);
    }
  });

  it('does not add faces for neighbors that are already empty', () => {
    const vol = createVoxelVolume(8, 8, 8);
    // Only place one block — its below-neighbor and left-neighbor are empty
    setCellMaterial(vol, 4, 4, 4, 2);
    vol.energyField.fill(0.5);
    applySchoolTagAMP(vol, SCHOOL_WEIGHTS);
    const patch = applyMiningPatch(vol, SCHOOL_WEIGHTS, 4, 4, 4);
    expect(patch.addedFaces).toHaveLength(0);
  });

  it('does not add faces for out-of-bounds neighbors', () => {
    const vol = solidVolume(4);
    // Mine a corner block — its y-1, z-1, x-1 neighbors are all out of bounds
    const patch = applyMiningPatch(vol, SCHOOL_WEIGHTS, 0, 0, 0);
    expect(patch.addedFaces).toHaveLength(0);
  });

  it('is deterministic — same patch for same inputs', () => {
    const vol1 = solidVolume();
    const vol2 = solidVolume();
    const p1 = applyMiningPatch(vol1, SCHOOL_WEIGHTS, 4, 4, 4);
    const p2 = applyMiningPatch(vol2, SCHOOL_WEIGHTS, 4, 4, 4);
    expect(p1.addedFaces.map(f => f.resource.blockId)).toEqual(p2.addedFaces.map(f => f.resource.blockId));
  });

  it('subsequent mines at adjacent positions compound correctly', () => {
    const vol = solidVolume();
    applyMiningPatch(vol, SCHOOL_WEIGHTS, 4, 4, 4);
    const patch2 = applyMiningPatch(vol, SCHOOL_WEIGHTS, 4, 3, 4);
    // After two mines, the second patch should reflect the updated volume
    expect(isCellOccupied(vol, 4, 4, 4)).toBe(false);
    expect(isCellOccupied(vol, 4, 3, 4)).toBe(false);
    expect(patch2.removedAt).toEqual({ x: 4, y: 3, z: 4 });
  });
});
