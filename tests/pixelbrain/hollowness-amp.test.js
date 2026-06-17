import { test, expect } from 'vitest';
import {
  HOLLOW_THRESHOLD,
  HOLLOW_ENERGY_MIN,
  PHI,
  computeHollownessAMP,
  buildSurfaceLockSet,
  collectHollowDeltas,
  applyHollownessAMP,
} from '../../codex/core/pixelbrain/hollowness-amp.js';
import {
  createVoxelVolume,
  setCellMaterial,
  isCellOccupied,
  cellIndex,
} from '../../codex/core/pixelbrain/voxel-volume.js';

// --- pure function tests (unchanged) ---

test('PHI is approximately 1.618', () => {
  expect(Math.abs(PHI - 1.6180339887)).toBeLessThan(1e-6);
});

test('HOLLOW_THRESHOLD is 0.4', () => {
  expect(HOLLOW_THRESHOLD).toBe(0.4);
});

test('HOLLOW_ENERGY_MIN is 0.25', () => {
  expect(HOLLOW_ENERGY_MIN).toBe(0.25);
});

test('computeHollownessAMP(0, 0, 0, 3) returns 0.0', () => {
  expect(computeHollownessAMP(0, 0, 0, 3)).toBe(0.0);
});

test('computeHollownessAMP(1, 0, 0, 1) returns ~0.618 (> HOLLOW_THRESHOLD)', () => {
  const value = computeHollownessAMP(1, 0, 0, 1);
  expect(value).toBeGreaterThan(HOLLOW_THRESHOLD);
  expect(value).toBeLessThan(1.0);
  expect(Math.abs(value - (PHI % 1.0))).toBeLessThan(1e-6);
});

test('computeHollownessAMP(0, 0, 0, 1) returns exactly 0.0', () => {
  expect(computeHollownessAMP(0, 0, 0, 1)).toBe(0.0);
});

test('computeHollownessAMP returns values in [0, 1) for varied inputs', () => {
  const cases = [
    [0, 0, 0, 1], [1, 1, 1, 1], [2, 3, 5, 2], [0.5, 0.5, 0.5, 1],
    [10, 20, 30, 5], [0.1, 0.1, 0.1, 3], [3, 4, 5, 2], [1, 2, 3, 4],
    [7, 11, 13, 1], [100, 200, 300, 10],
  ];
  for (const [x, y, z, iterations] of cases) {
    const value = computeHollownessAMP(x, y, z, iterations);
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThan(1.0);
  }
});

// --- buildSurfaceLockSet ---

test('buildSurfaceLockSet locks the top occupied layer of each column', () => {
  const vol = createVoxelVolume(3, 4, 3);
  // Fill only y=0 and y=1 in every column — surface is y=1
  for (let z = 0; z < 3; z++) {
    for (let x = 0; x < 3; x++) {
      setCellMaterial(vol, x, 0, z, 1);
      setCellMaterial(vol, x, 1, z, 1);
    }
  }
  const locked = buildSurfaceLockSet(vol, 1);
  // Surface is y=1 for every (x,z); depth=1 → only y=1 locked
  for (let z = 0; z < 3; z++) {
    for (let x = 0; x < 3; x++) {
      expect(locked.has(`${x},1,${z}`)).toBe(true);
      expect(locked.has(`${x},0,${z}`)).toBe(false);
    }
  }
});

test('buildSurfaceLockSet with depthFromSurface=2 locks top two layers', () => {
  const vol = createVoxelVolume(2, 6, 2);
  for (let y = 0; y < 6; y++) {
    setCellMaterial(vol, 0, y, 0, 1);
  }
  const locked = buildSurfaceLockSet(vol, 2);
  // Surface y=5; lock y=5 and y=4
  expect(locked.has('0,5,0')).toBe(true);
  expect(locked.has('0,4,0')).toBe(true);
  expect(locked.has('0,3,0')).toBe(false);
});

test('buildSurfaceLockSet returns empty set for unoccupied volume', () => {
  const vol = createVoxelVolume(4, 4, 4);
  const locked = buildSurfaceLockSet(vol, 2);
  expect(locked.size).toBe(0);
});

// --- collectHollowDeltas ---

function filledVolWithEnergy(w, h, d, matId, energyValue) {
  const vol = createVoxelVolume(w, h, d);
  for (let y = 0; y < h; y++) {
    for (let z = 0; z < d; z++) {
      for (let x = 0; x < w; x++) {
        setCellMaterial(vol, x, y, z, matId);
        vol.energyField[cellIndex(vol, x, y, z)] = energyValue;
      }
    }
  }
  return vol;
}

test('collectHollowDeltas returns no deltas when energy is below threshold', () => {
  // Energy 0.1 < HOLLOW_ENERGY_MIN (0.25) → nothing proposed
  const vol = filledVolWithEnergy(4, 4, 4, 1, 0.1);
  const { deltas } = collectHollowDeltas(vol, { iterations: 3, surfaceLockDepth: 0 });
  expect(deltas.length).toBe(0);
});

test('collectHollowDeltas returns deltas for interior high-energy cells', () => {
  // Large enough volume so interior cells exist beyond surface lock
  const vol = filledVolWithEnergy(6, 6, 6, 1, 0.8);
  const { deltas } = collectHollowDeltas(vol, { iterations: 3, surfaceLockDepth: 2 });
  expect(deltas.length).toBeGreaterThan(0);
  for (const d of deltas) {
    expect(d.op).toBe('REMOVE_SOLID');
    expect(d.source).toBe('HollowAMP');
  }
});

test('collectHollowDeltas never proposes surface-locked cells', () => {
  const vol = filledVolWithEnergy(4, 4, 4, 1, 0.8);
  const { deltas, surfaceLocked } = collectHollowDeltas(vol, { iterations: 3, surfaceLockDepth: 2 });
  for (const d of deltas) {
    expect(surfaceLocked.has(`${d.x},${d.y},${d.z}`)).toBe(false);
  }
});

test('collectHollowDeltas is deterministic', () => {
  const vol1 = filledVolWithEnergy(6, 6, 6, 1, 0.7);
  const vol2 = filledVolWithEnergy(6, 6, 6, 1, 0.7);
  const { deltas: d1 } = collectHollowDeltas(vol1, { iterations: 3 });
  const { deltas: d2 } = collectHollowDeltas(vol2, { iterations: 3 });
  expect(d1.length).toBe(d2.length);
  for (let i = 0; i < d1.length; i++) {
    expect(d1[i].x).toBe(d2[i].x);
    expect(d1[i].y).toBe(d2[i].y);
    expect(d1[i].z).toBe(d2[i].z);
  }
});

// --- applyHollownessAMP ---

test('applyHollownessAMP does not hollow cells with energy below threshold', () => {
  const vol = filledVolWithEnergy(4, 4, 4, 1, 0.0);
  applyHollownessAMP(vol, { iterations: 3 });
  // All cells should remain occupied — no energy → no hollowing
  let allOccupied = true;
  for (let y = 0; y < 4; y++) {
    for (let z = 0; z < 4; z++) {
      for (let x = 0; x < 4; x++) {
        if (!isCellOccupied(vol, x, y, z)) { allOccupied = false; }
      }
    }
  }
  expect(allOccupied).toBe(true);
});

test('applyHollownessAMP hollows some interior cells when energy is sufficient', () => {
  // 6×6×6 ensures interior cells beyond the 2-layer surface lock exist
  const vol = filledVolWithEnergy(6, 6, 6, 1, 0.8);
  applyHollownessAMP(vol, { iterations: 3, surfaceLockDepth: 2 });

  let hollowedCount = 0;
  for (let y = 0; y < 6; y++) {
    for (let z = 0; z < 6; z++) {
      for (let x = 0; x < 6; x++) {
        if (!isCellOccupied(vol, x, y, z)) hollowedCount++;
      }
    }
  }
  expect(hollowedCount).toBeGreaterThan(0);
});

test('applyHollownessAMP never hollows surface-locked cells', () => {
  const vol = filledVolWithEnergy(6, 6, 6, 1, 1.0);
  // Record surface cells before hollowing
  const { surfaceLocked } = collectHollowDeltas(vol, { iterations: 3, surfaceLockDepth: 2 });

  applyHollownessAMP(vol, { iterations: 3, surfaceLockDepth: 2 });

  for (const key of surfaceLocked) {
    const [x, y, z] = key.split(',').map(Number);
    expect(isCellOccupied(vol, x, y, z)).toBe(true);
  }
});

test('applyHollownessAMP on volume with no occupied cells leaves all unoccupied', () => {
  const vol = createVoxelVolume(4, 4, 4);
  applyHollownessAMP(vol, { iterations: 3 });
  for (let y = 0; y < 4; y++) {
    for (let z = 0; z < 4; z++) {
      for (let x = 0; x < 4; x++) {
        expect(isCellOccupied(vol, x, y, z)).toBe(false);
      }
    }
  }
});

test('applyHollownessAMP returns the same volume object (in-place mutation)', () => {
  const vol = filledVolWithEnergy(4, 4, 4, 1, 0.8);
  const result = applyHollownessAMP(vol, { iterations: 3 });
  expect(result).toBe(vol);
});

test('applyHollownessAMP is deterministic', () => {
  const vol1 = filledVolWithEnergy(6, 6, 6, 1, 0.7);
  const vol2 = filledVolWithEnergy(6, 6, 6, 1, 0.7);
  applyHollownessAMP(vol1, { iterations: 3 });
  applyHollownessAMP(vol2, { iterations: 3 });
  for (let y = 0; y < 6; y++) {
    for (let z = 0; z < 6; z++) {
      for (let x = 0; x < 6; x++) {
        expect(isCellOccupied(vol1, x, y, z)).toBe(isCellOccupied(vol2, x, y, z));
      }
    }
  }
});

test('applyHollownessAMP accepts numeric iterations for backward compatibility', () => {
  // Numeric second arg should not throw and should return the volume
  const vol = filledVolWithEnergy(4, 4, 4, 1, 0.0);
  const result = applyHollownessAMP(vol, 3);
  expect(result).toBe(vol);
});
