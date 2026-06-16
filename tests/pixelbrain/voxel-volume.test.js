import { describe, it, expect } from 'vitest';
import {
  ENERGY_TYPES,
  createVoxelVolume,
  cellIndex,
  getCellMaterialId,
  isCellOccupied,
  setCellMaterial,
  setCellOccupancy,
} from '../../codex/core/pixelbrain/voxel-volume.js';

describe('ENERGY_TYPES', () => {
  it('has exactly 8 entries with values 0–7', () => {
    expect(Object.keys(ENERGY_TYPES)).toHaveLength(8);
    expect(ENERGY_TYPES.RESONANT).toBe(0);
    expect(ENERGY_TYPES.PHOTONIC).toBe(1);
    expect(ENERGY_TYPES.STRUCTURAL).toBe(2);
    expect(ENERGY_TYPES.THERMAL).toBe(3);
    expect(ENERGY_TYPES.KINETIC).toBe(4);
    expect(ENERGY_TYPES.ENTROPIC).toBe(5);
    expect(ENERGY_TYPES.SHIELDING).toBe(6);
    expect(ENERGY_TYPES.RADIANT).toBe(7);
  });

  it('has all unique values', () => {
    const values = Object.values(ENERGY_TYPES);
    expect(new Set(values).size).toBe(8);
  });
});

describe('createVoxelVolume', () => {
  it('creates correct dimensions for 4x4x4', () => {
    const vol = createVoxelVolume(4, 4, 4);
    expect(vol.width).toBe(4);
    expect(vol.height).toBe(4);
    expect(vol.depth).toBe(4);
  });

  it('initializes arrays to correct lengths for 4x4x4', () => {
    const vol = createVoxelVolume(4, 4, 4);
    expect(vol.cells.length).toBe(64);
    expect(vol.energyField.length).toBe(64);
    expect(vol.energyTypes.length).toBe(64);
  });

  it('works for minimum size 1x1x1', () => {
    const vol = createVoxelVolume(1, 1, 1);
    expect(vol.width).toBe(1);
    expect(vol.height).toBe(1);
    expect(vol.depth).toBe(1);
    expect(vol.cells.length).toBe(1);
    expect(vol.energyField.length).toBe(1);
    expect(vol.energyTypes.length).toBe(1);
  });

  it('works for canonical Level-1 size 32x32x32', () => {
    const vol = createVoxelVolume(32, 32, 32);
    expect(vol.width).toBe(32);
    expect(vol.height).toBe(32);
    expect(vol.depth).toBe(32);
    expect(vol.cells.length).toBe(32768);
    expect(vol.energyField.length).toBe(32768);
    expect(vol.energyTypes.length).toBe(32768);
  });

  it('initializes cells to zero', () => {
    const vol = createVoxelVolume(4, 4, 4);
    for (let i = 0; i < vol.cells.length; i++) {
      expect(vol.cells[i]).toBe(0);
    }
  });

  it('initializes energyField to zero', () => {
    const vol = createVoxelVolume(4, 4, 4);
    for (let i = 0; i < vol.energyField.length; i++) {
      expect(vol.energyField[i]).toBe(0);
    }
  });

  it('initializes energyTypes to zero', () => {
    const vol = createVoxelVolume(4, 4, 4);
    for (let i = 0; i < vol.energyTypes.length; i++) {
      expect(vol.energyTypes[i]).toBe(0);
    }
  });

  it('throws RangeError for width = 0', () => {
    expect(() => createVoxelVolume(0, 4, 4)).toThrow(RangeError);
  });

  it('throws RangeError for negative width', () => {
    expect(() => createVoxelVolume(-1, 4, 4)).toThrow(RangeError);
  });

  it('throws TypeError for non-integer width', () => {
    expect(() => createVoxelVolume(1.5, 4, 4)).toThrow(TypeError);
  });

  it('throws TypeError for NaN width', () => {
    expect(() => createVoxelVolume(NaN, 4, 4)).toThrow(TypeError);
  });

  it('throws RangeError for height = 0', () => {
    expect(() => createVoxelVolume(4, 0, 4)).toThrow(RangeError);
  });

  it('throws RangeError for negative height', () => {
    expect(() => createVoxelVolume(4, -1, 4)).toThrow(RangeError);
  });

  it('throws TypeError for non-integer height', () => {
    expect(() => createVoxelVolume(4, 1.5, 4)).toThrow(TypeError);
  });

  it('throws TypeError for NaN height', () => {
    expect(() => createVoxelVolume(4, NaN, 4)).toThrow(TypeError);
  });

  it('throws RangeError for depth = 0', () => {
    expect(() => createVoxelVolume(4, 4, 0)).toThrow(RangeError);
  });

  it('throws RangeError for negative depth', () => {
    expect(() => createVoxelVolume(4, 4, -1)).toThrow(RangeError);
  });

  it('throws TypeError for non-integer depth', () => {
    expect(() => createVoxelVolume(4, 4, 1.5)).toThrow(TypeError);
  });

  it('throws TypeError for NaN depth', () => {
    expect(() => createVoxelVolume(4, 4, NaN)).toThrow(TypeError);
  });
});

describe('cellIndex', () => {
  it('computes YZX layout: (0,0,0) = 0', () => {
    const vol = createVoxelVolume(4, 4, 4);
    expect(cellIndex(vol, 0, 0, 0)).toBe(0);
  });

  it('computes YZX layout: (1,0,0) = 1', () => {
    const vol = createVoxelVolume(4, 4, 4);
    expect(cellIndex(vol, 1, 0, 0)).toBe(1);
  });

  it('computes YZX layout: (0,0,1) = 4', () => {
    const vol = createVoxelVolume(4, 4, 4);
    expect(cellIndex(vol, 0, 0, 1)).toBe(4);
  });

  it('computes YZX layout: (0,1,0) = 16', () => {
    const vol = createVoxelVolume(4, 4, 4);
    expect(cellIndex(vol, 0, 1, 0)).toBe(16);
  });
});

describe('getCellMaterialId', () => {
  it('returns 0 for all cells in new volume', () => {
    const vol = createVoxelVolume(4, 4, 4);
    for (let x = 0; x < 4; x++) {
      for (let y = 0; y < 4; y++) {
        for (let z = 0; z < 4; z++) {
          expect(getCellMaterialId(vol, x, y, z)).toBe(0);
        }
      }
    }
  });

  it('extracts high 12 bits from cell word', () => {
    const vol = createVoxelVolume(4, 4, 4);
    const i = cellIndex(vol, 1, 0, 0);
    vol.cells[i] = (0xFFF << 4) | 0x0;
    expect(getCellMaterialId(vol, 1, 0, 0)).toBe(0xFFF);
  });
});

describe('isCellOccupied', () => {
  it('returns false when materialId is 0', () => {
    const vol = createVoxelVolume(4, 4, 4);
    expect(isCellOccupied(vol, 0, 0, 0)).toBe(false);
  });

  it('returns true when materialId > 0', () => {
    const vol = createVoxelVolume(4, 4, 4);
    setCellMaterial(vol, 0, 0, 0, 1);
    expect(isCellOccupied(vol, 0, 0, 0)).toBe(true);
  });
});

describe('setCellMaterial', () => {
  it('sets materialId and getCellMaterialId returns it', () => {
    const vol = createVoxelVolume(4, 4, 4);
    setCellMaterial(vol, 1, 0, 0, 4);
    expect(getCellMaterialId(vol, 1, 0, 0)).toBe(4);
  });

  it('works with materialId = 4095 (max)', () => {
    const vol = createVoxelVolume(4, 4, 4);
    setCellMaterial(vol, 0, 0, 0, 4095);
    expect(getCellMaterialId(vol, 0, 0, 0)).toBe(4095);
  });

  it('throws RangeError for materialId = 4096', () => {
    const vol = createVoxelVolume(4, 4, 4);
    expect(() => setCellMaterial(vol, 0, 0, 0, 4096)).toThrow(RangeError);
  });

  it('throws RangeError for materialId = -1', () => {
    const vol = createVoxelVolume(4, 4, 4);
    expect(() => setCellMaterial(vol, 0, 0, 0, -1)).toThrow(RangeError);
  });

  it('preserves low 4 flag bits', () => {
    const vol = createVoxelVolume(4, 4, 4);
    const i = cellIndex(vol, 0, 0, 0);
    vol.cells[i] = 0x000F;
    setCellMaterial(vol, 0, 0, 0, 42);
    expect(vol.cells[i] & 0xF).toBe(0xF);
    expect(getCellMaterialId(vol, 0, 0, 0)).toBe(42);
  });

  it('makes isCellOccupied true', () => {
    const vol = createVoxelVolume(4, 4, 4);
    setCellMaterial(vol, 0, 0, 0, 4);
    expect(isCellOccupied(vol, 0, 0, 0)).toBe(true);
  });
});

describe('setCellOccupancy', () => {
  it('clears materialId when occupied = false', () => {
    const vol = createVoxelVolume(4, 4, 4);
    setCellMaterial(vol, 0, 0, 0, 5);
    setCellOccupancy(vol, 0, 0, 0, false);
    expect(getCellMaterialId(vol, 0, 0, 0)).toBe(0);
  });

  it('preserves flags when clearing', () => {
    const vol = createVoxelVolume(4, 4, 4);
    const i = cellIndex(vol, 0, 0, 0);
    vol.cells[i] = 0x000F;
    setCellMaterial(vol, 0, 0, 0, 5);
    setCellOccupancy(vol, 0, 0, 0, false);
    expect(vol.cells[i] & 0xF).toBe(0xF);
  });

  it('sets materialId to 1 when occupied = true and materialId = 0', () => {
    const vol = createVoxelVolume(4, 4, 4);
    expect(getCellMaterialId(vol, 0, 0, 0)).toBe(0);
    setCellOccupancy(vol, 0, 0, 0, true);
    expect(getCellMaterialId(vol, 0, 0, 0)).toBe(1);
  });

  it('leaves materialId unchanged when occupied = true and materialId > 0', () => {
    const vol = createVoxelVolume(4, 4, 4);
    setCellMaterial(vol, 0, 0, 0, 3);
    setCellOccupancy(vol, 0, 0, 0, true);
    expect(getCellMaterialId(vol, 0, 0, 0)).toBe(3);
  });
});
