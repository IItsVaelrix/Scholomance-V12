import { describe, it, expect } from 'vitest';
import {
  createVoxelVolume,
  setCellMaterial,
  setCellOccupancy,
  getCellMaterialId,
  cellIndex,
} from '../../codex/core/pixelbrain/voxel-volume.js';
import { runBiomeCoherenceAMP, getNeighbors6, NEGOTIATION_THRESHOLD } from '../../codex/core/pixelbrain/biome-coherence-amp.js';

function makeField(volume, energies) {
  for (const [x, y, z, e] of energies) {
    volume.energyField[cellIndex(volume, x, y, z)] = e;
  }
  return {
    energyAt: (cell) => volume.energyField[cellIndex(volume, cell.x, cell.y, cell.z)],
  };
}

describe('getNeighbors6', () => {
  it('returns up to 6 occupied neighbors', () => {
    const v = createVoxelVolume(4, 4, 4);
    for (const [x, y, z] of [[1,1,1],[0,1,1],[2,1,1],[1,0,1],[1,2,1],[1,1,0],[1,1,2]]) {
      setCellOccupancy(v, x, y, z, true);
      setCellMaterial(v, x, y, z, 2);
    }
    const neighbors = getNeighbors6({ x: 1, y: 1, z: 1 }, v);
    expect(neighbors.length).toBe(6);
  });

  it('ignores empty (non-occupied) neighbors', () => {
    const v = createVoxelVolume(4, 4, 4);
    setCellOccupancy(v, 1, 1, 1, true);
    const neighbors = getNeighbors6({ x: 1, y: 1, z: 1 }, v);
    expect(neighbors.length).toBe(0);
  });
});

describe('runBiomeCoherenceAMP', () => {
  it('does not change materials when all cells already agree', () => {
    const v = createVoxelVolume(4, 4, 4);
    for (let x = 0; x < 4; x++) {
      for (let z = 0; z < 4; z++) {
        setCellOccupancy(v, x, 0, z, true);
        setCellMaterial(v, x, 0, z, 2);
        v.energyField[cellIndex(v, x, 0, z)] = 0.5;
      }
    }
    const field = { energyAt: (cell) => v.energyField[cellIndex(v, cell.x, cell.y, cell.z)] };
    runBiomeCoherenceAMP(v, field);
    for (let x = 0; x < 4; x++) {
      for (let z = 0; z < 4; z++) {
        expect(getCellMaterialId(v, x, 0, z)).toBe(2);
      }
    }
  });

  it('lone cell with different material flips to majority when energetically similar', () => {
    const v = createVoxelVolume(4, 4, 4);
    for (let x = 0; x < 4; x++) {
      setCellOccupancy(v, x, 0, 0, true);
      setCellMaterial(v, x, 0, 0, x < 3 ? 2 : 3);
      v.energyField[cellIndex(v, x, 0, 0)] = 0.5;
    }
    const field = { energyAt: (cell) => v.energyField[cellIndex(v, cell.x, cell.y, cell.z)] };
    runBiomeCoherenceAMP(v, field);
    expect(getCellMaterialId(v, 3, 0, 0)).toBe(2);
  });

  it('preserves biome boundary where energy delta > NEGOTIATION_THRESHOLD', () => {
    const v = createVoxelVolume(4, 4, 4);
    setCellOccupancy(v, 0, 0, 0, true);
    setCellMaterial(v, 0, 0, 0, 2);
    v.energyField[cellIndex(v, 0, 0, 0)] = 0.2;
    setCellOccupancy(v, 1, 0, 0, true);
    setCellMaterial(v, 1, 0, 0, 4);
    v.energyField[cellIndex(v, 1, 0, 0)] = 0.9;
    const field = { energyAt: (cell) => v.energyField[cellIndex(v, cell.x, cell.y, cell.z)] };
    runBiomeCoherenceAMP(v, field);
    expect(getCellMaterialId(v, 0, 0, 0)).toBe(2);
    expect(getCellMaterialId(v, 1, 0, 0)).toBe(4);
  });
});
