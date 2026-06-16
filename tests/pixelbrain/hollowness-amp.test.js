import { test, expect } from 'vitest';
import {
  HOLLOW_THRESHOLD,
  PHI,
  computeHollownessAMP,
  applyHollownessAMP,
} from '../../codex/core/pixelbrain/hollowness-amp.js';
import { createVoxelVolume, setCellMaterial, isCellOccupied } from '../../codex/core/pixelbrain/voxel-volume.js';

test('PHI is approximately 1.618', () => {
  expect(Math.abs(PHI - 1.6180339887)).toBeLessThan(1e-6);
});

test('HOLLOW_THRESHOLD is 0.4', () => {
  expect(HOLLOW_THRESHOLD).toBe(0.4);
});

test('computeHollownessAMP(0, 0, 0, 3) returns 0.0', () => {
  const value = computeHollownessAMP(0, 0, 0, 3);
  expect(value).toBe(0.0);
});

test('computeHollownessAMP(1, 0, 0, 1) returns ~0.618 (> HOLLOW_THRESHOLD)', () => {
  const value = computeHollownessAMP(1, 0, 0, 1);
  // dist = 1, value = (1 * PHI * 1) % 1.0 = 1.618... % 1.0 ≈ 0.618
  expect(value).toBeGreaterThan(HOLLOW_THRESHOLD);
  expect(value).toBeLessThan(1.0);
  expect(Math.abs(value - (PHI % 1.0))).toBeLessThan(1e-6);
});

test('computeHollownessAMP(0, 0, 0, 1) returns exactly 0.0', () => {
  const value = computeHollownessAMP(0, 0, 0, 1);
  expect(value).toBe(0.0);
});

test('computeHollownessAMP returns values in [0, 1) for varied inputs', () => {
  const testCases = [
    [0, 0, 0, 1],
    [1, 1, 1, 1],
    [2, 3, 5, 2],
    [0.5, 0.5, 0.5, 1],
    [10, 20, 30, 5],
    [0.1, 0.1, 0.1, 3],
    [3, 4, 5, 2],
    [1, 2, 3, 4],
    [7, 11, 13, 1],
    [100, 200, 300, 10],
  ];

  for (const [x, y, z, iterations] of testCases) {
    const value = computeHollownessAMP(x, y, z, iterations);
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThan(1.0);
  }
});

test('applyHollownessAMP on fully occupied 4×4×4 volume hollows some cells, keeps others', () => {
  const vol = createVoxelVolume(4, 4, 4);

  // Fill all cells with materialId = 1 (occupied)
  for (let y = 0; y < 4; y++) {
    for (let z = 0; z < 4; z++) {
      for (let x = 0; x < 4; x++) {
        setCellMaterial(vol, x, y, z, 1);
      }
    }
  }

  applyHollownessAMP(vol, 3);

  // Count occupied and unoccupied cells
  let occupiedCount = 0;
  let unoccupiedCount = 0;
  for (let y = 0; y < 4; y++) {
    for (let z = 0; z < 4; z++) {
      for (let x = 0; x < 4; x++) {
        if (isCellOccupied(vol, x, y, z)) {
          occupiedCount++;
        } else {
          unoccupiedCount++;
        }
      }
    }
  }

  expect(occupiedCount).toBeGreaterThan(0);
  expect(unoccupiedCount).toBeGreaterThan(0);
});

test('applyHollownessAMP keeps origin (0,0,0) occupied', () => {
  const vol = createVoxelVolume(4, 4, 4);

  // Fill all cells with materialId = 1
  for (let y = 0; y < 4; y++) {
    for (let z = 0; z < 4; z++) {
      for (let x = 0; x < 4; x++) {
        setCellMaterial(vol, x, y, z, 1);
      }
    }
  }

  applyHollownessAMP(vol, 3);

  // Origin should remain occupied (computeHollownessAMP(0,0,0,3) = 0.0 <= 0.4)
  expect(isCellOccupied(vol, 0, 0, 0)).toBe(true);
});

test('applyHollownessAMP on volume with no occupied cells leaves all unoccupied', () => {
  const vol = createVoxelVolume(4, 4, 4);

  // All cells start unoccupied (default)
  applyHollownessAMP(vol, 3);

  for (let y = 0; y < 4; y++) {
    for (let z = 0; z < 4; z++) {
      for (let x = 0; x < 4; x++) {
        expect(isCellOccupied(vol, x, y, z)).toBe(false);
      }
    }
  }
});

test('applyHollownessAMP returns the same volume object (in-place mutation)', () => {
  const vol = createVoxelVolume(4, 4, 4);
  for (let y = 0; y < 4; y++) {
    for (let z = 0; z < 4; z++) {
      for (let x = 0; x < 4; x++) {
        setCellMaterial(vol, x, y, z, 1);
      }
    }
  }

  const result = applyHollownessAMP(vol, 3);

  expect(result).toBe(vol);
});

test('applyHollownessAMP is deterministic', () => {
  // Create two identical volumes
  const createFilledVolume = () => {
    const vol = createVoxelVolume(4, 4, 4);
    for (let y = 0; y < 4; y++) {
      for (let z = 0; z < 4; z++) {
        for (let x = 0; x < 4; x++) {
          setCellMaterial(vol, x, y, z, 1);
        }
      }
    }
    return vol;
  };

  const vol1 = createFilledVolume();
  const vol2 = createFilledVolume();

  applyHollownessAMP(vol1, 3);
  applyHollownessAMP(vol2, 3);

  // Both volumes should have identical occupancy patterns
  for (let y = 0; y < 4; y++) {
    for (let z = 0; z < 4; z++) {
      for (let x = 0; x < 4; x++) {
        expect(isCellOccupied(vol1, x, y, z)).toBe(isCellOccupied(vol2, x, y, z));
      }
    }
  }
});
