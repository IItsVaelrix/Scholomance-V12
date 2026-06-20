import { describe, it, expect } from 'vitest';
import {
  ENERGY_TYPES,
  cellIndex,
  isCellOccupied,
  getCellMaterialId,
} from '../../codex/core/pixelbrain/voxel-volume.js';
import { liftToVolume } from '../../codex/core/pixelbrain/volume-lift-amp.js';

const STRUCT = (value) => ({ type: ENERGY_TYPES.STRUCTURAL, value });

describe('liftToVolume — structural energy → voxel-volume', () => {
  it('lifts a haft column into a 3-voxel round rod centred on z=0', () => {
    const cells = [{ x: 0, y: 0, partId: 'haft', materialId: 7, energies: [STRUCT(1)] }];
    const vol = liftToVolume(cells, {
      dims: { width: 1, height: 1 },
      partParams: { haft: { profile: 'round', maxDepth: 1 } },
    });

    // depth span = 2*maxDepth+1 = 3; centre plane = index 1
    expect(vol.depth).toBe(3);
    for (let z = 0; z < 3; z += 1) {
      expect(isCellOccupied(vol, 0, 0, z)).toBe(true);
      expect(getCellMaterialId(vol, 0, 0, z)).toBe(7); // material inherited
    }
  });

  it('sizes depth to the deepest part and keeps thinner parts thin', () => {
    const cells = [
      { x: 0, y: 0, partId: 'blade', materialId: 2, energies: [STRUCT(1)] },
      { x: 1, y: 0, partId: 'edge', materialId: 2, energies: [STRUCT(0.2)] },
    ];
    const vol = liftToVolume(cells, {
      dims: { width: 2, height: 1 },
      partParams: {
        blade: { profile: 'ridge', maxDepth: 2 },
        edge: { profile: 'bevel', maxDepth: 2 },
      },
    });

    expect(vol.depth).toBe(5); // 2*2+1, sized to deepest
    // blade spine: full 5 voxels
    let bladeCount = 0;
    for (let z = 0; z < 5; z += 1) if (isCellOccupied(vol, 0, 0, z)) bladeCount += 1;
    expect(bladeCount).toBe(5);
    // edge e=0.2 -> round(2*0.2)=0 -> never-hole single voxel at centre
    let edgeCount = 0;
    for (let z = 0; z < 5; z += 1) if (isCellOccupied(vol, 1, 0, z)) edgeCount += 1;
    expect(edgeCount).toBe(1);
    expect(isCellOccupied(vol, 1, 0, 2)).toBe(true); // centre plane
  });

  it('carries RADIANT energy onto every emitted voxel without changing depth', () => {
    const radiantCells = [{
      x: 0, y: 0, partId: 'rune', materialId: 3,
      energies: [STRUCT(1), { type: ENERGY_TYPES.RADIANT, value: 0.8 }],
    }];
    const plainCells = [{ x: 0, y: 0, partId: 'rune', materialId: 3, energies: [STRUCT(1)] }];
    const opts = {
      dims: { width: 1, height: 1 },
      partParams: { rune: { profile: 'flat', maxDepth: 1 } },
    };

    const glow = liftToVolume(radiantCells, opts);
    const plain = liftToVolume(plainCells, opts);

    // same geometry
    expect(glow.depth).toBe(plain.depth);
    for (let z = 0; z < glow.depth; z += 1) {
      const i = cellIndex(glow, 0, 0, z);
      expect(glow.energyTypes[i]).toBe(ENERGY_TYPES.RADIANT);
      expect(glow.energyField[i]).toBeCloseTo(0.8, 5); // Float32 storage
      // plain volume carries no glow
      expect(plain.energyField[cellIndex(plain, 0, 0, z)]).toBe(0);
    }
  });

  it('reads depth ONLY from STRUCTURAL energy (type discipline)', () => {
    // A cell carrying only RADIANT energy has no structural support → not lifted.
    const cells = [{
      x: 0, y: 0, partId: 'glow', materialId: 5,
      energies: [{ type: ENERGY_TYPES.RADIANT, value: 1 }],
    }];
    const vol = liftToVolume(cells, {
      dims: { width: 1, height: 1 },
      partParams: { glow: { profile: 'flat', maxDepth: 2 } },
    });

    let occupied = 0;
    for (let z = 0; z < vol.depth; z += 1) if (isCellOccupied(vol, 0, 0, z)) occupied += 1;
    expect(occupied).toBe(0);
  });

  it('reports diagnostics: voxel count and per-part lift', () => {
    const cells = [{ x: 0, y: 0, partId: 'haft', materialId: 7, energies: [STRUCT(1)] }];
    const vol = liftToVolume(cells, {
      dims: { width: 1, height: 1 },
      partParams: { haft: { profile: 'round', maxDepth: 1 } },
    });
    expect(vol.diagnostics.voxelCount).toBe(3);
    expect(vol.diagnostics.cellCount).toBe(1);
  });
});
