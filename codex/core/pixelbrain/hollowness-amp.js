import { isCellOccupied, setCellOccupancy } from './voxel-volume.js';

export const HOLLOW_THRESHOLD = 0.4;
export const PHI = 1.6180339887;

/**
 * Pure function. Computes a quasi-periodic hollowness value based on position
 * and iteration count. Uses golden ratio modulation for deterministic cavity patterns.
 *
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} z - Z coordinate
 * @param {number} iterations - Iteration count (affects modulation frequency)
 * @returns {number} Float in [0, 1) representing hollowness likelihood
 */
export function computeHollownessAMP(x, y, z, iterations) {
  const dist = Math.sqrt(x * x + y * y + z * z);
  const value = (dist * PHI * iterations) % 1.0;
  return value;
}

/**
 * Applies hollowness cavity punching to an occupied voxel volume.
 * Iterates over every cell in YZX order. For each occupied cell,
 * computes hollowness and punches it out (becomes air) if value > HOLLOW_THRESHOLD.
 * Pure position function — does not depend on energy field.
 *
 * @param {Object} vol - VoxelVolume object
 * @param {number} iterations - Iteration count passed to computeHollownessAMP (default 3)
 * @returns {Object} The same volume object, mutated in place
 */
export function applyHollownessAMP(vol, iterations = 3) {
  for (let y = 0; y < vol.height; y++) {
    for (let z = 0; z < vol.depth; z++) {
      for (let x = 0; x < vol.width; x++) {
        if (!isCellOccupied(vol, x, y, z)) {
          continue;
        }

        const hollownessValue = computeHollownessAMP(x, y, z, iterations);
        if (hollownessValue > HOLLOW_THRESHOLD) {
          setCellOccupancy(vol, x, y, z, false);
        }
      }
    }
  }

  return vol;
}
