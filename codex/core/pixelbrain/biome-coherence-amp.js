import { cellIndex, getCellMaterialId, setCellMaterial, isCellOccupied } from './voxel-volume.js';

export const NEGOTIATION_THRESHOLD = 0.05;

export function getNeighbors6(cell, volume) {
  const { x, y, z } = cell;
  return [
    [x + 1, y, z], [x - 1, y, z],
    [x, y + 1, z], [x, y - 1, z],
    [x, y, z + 1], [x, y, z - 1],
  ]
    .filter(([nx, ny, nz]) => isCellOccupied(volume, nx, ny, nz))
    .map(([nx, ny, nz]) => ({ x: nx, y: ny, z: nz, materialId: getCellMaterialId(volume, nx, ny, nz) }));
}

function majorityMaterial(cell, neighbors) {
  const counts = new Map();
  for (const n of neighbors) {
    counts.set(n.materialId, (counts.get(n.materialId) ?? 0) + 1);
  }
  let best = cell.materialId, bestCount = 0;
  counts.forEach((count, matId) => {
    if (count > bestCount || (count === bestCount && matId === cell.materialId)) {
      bestCount = count;
      best = matId;
    }
  });
  return best;
}

export function runBiomeCoherenceAMP(volume, field) {
  let unstable = true;
  while (unstable) {
    unstable = false;
    for (let y = 0; y < volume.height; y++) {
      for (let z = 0; z < volume.depth; z++) {
        for (let x = 0; x < volume.width; x++) {
          if (!isCellOccupied(volume, x, y, z)) continue;
          const cell = { x, y, z, materialId: getCellMaterialId(volume, x, y, z) };
          const neighbors = getNeighbors6(cell, volume);
          if (neighbors.length === 0) continue;
          for (const neighbor of neighbors) {
            if (neighbor.materialId === cell.materialId) continue;
            const energyDelta = Math.abs(field.energyAt(cell) - field.energyAt(neighbor));
            if (energyDelta < NEGOTIATION_THRESHOLD) {
              const majority = majorityMaterial(cell, neighbors);
              if (majority !== cell.materialId) {
                setCellMaterial(volume, x, y, z, majority);
                cell.materialId = majority;
                unstable = true;
                break;
              }
            }
          }
        }
      }
    }
  }
}
