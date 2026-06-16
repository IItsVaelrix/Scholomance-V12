export const DEFAULT_DECAY = 0.015;
export const DEFAULT_ITERATIONS = 3;

export const MATERIAL_THRESHOLDS = Object.freeze([
  { materialId: 1, name: 'earth', threshold: 0.00 },
  { materialId: 2, name: 'stone', threshold: 0.25 },
  { materialId: 3, name: 'granite', threshold: 0.50 },
  { materialId: 4, name: 'crystal', threshold: 0.70 },
]);

/**
 * Assigns a material ID based on energy value.
 * Returns the materialId of the highest threshold entry where energyValue >= threshold.
 * If energyValue < 0.00, returns 0 (no material / air).
 * @param {number} energyValue - Energy value in range [0, 1]
 * @returns {number} Material ID (0-4)
 */
export function assignMaterial(energyValue) {
  if (energyValue < 0.00) {
    return 0;
  }

  // Iterate from highest threshold to lowest
  for (let i = MATERIAL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (energyValue >= MATERIAL_THRESHOLDS[i].threshold) {
      return MATERIAL_THRESHOLDS[i].materialId;
    }
  }

  return 0;
}

/**
 * Propagates energy from seed points using Gaussian decay and smoothing.
 * @param {Array} seeds - Array of { x, y, z, energy, energyType } objects
 * @param {number} width - Volume width
 * @param {number} height - Volume height
 * @param {number} depth - Volume depth
 * @param {Object} options - { decay: 0.015, iterations: 3 }
 * @returns {Object} QBITField with energyAt(x,y,z) and gradientAt(x,y,z) methods
 */
export function propagate(seeds, width, height, depth, { decay = DEFAULT_DECAY, iterations = DEFAULT_ITERATIONS } = {}) {
  // Guard against zero-size volumes
  if (width === 0 || height === 0 || depth === 0) {
    return {
      width,
      height,
      depth,
      energyAt() {
        return 0;
      },
      gradientAt() {
        return { gx: 0, gy: 0, gz: 0 };
      },
    };
  }

  const totalCells = width * height * depth;
  let energyBuffer = new Float32Array(totalCells);

  // 1. Compute initial energy field from seed contributions
  for (const seed of seeds) {
    const { x: sx, y: sy, z: sz, energy: seedEnergy } = seed;

    for (let y = 0; y < height; y++) {
      for (let z = 0; z < depth; z++) {
        for (let x = 0; x < width; x++) {
          const dx = x - sx;
          const dy = y - sy;
          const dz = z - sz;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          const contribution = seedEnergy * Math.exp(-dist * decay);

          const idx = y * width * depth + z * width + x;
          energyBuffer[idx] += contribution;
        }
      }
    }
  }

  // 2. Clamp energy to [0, 1]
  for (let i = 0; i < totalCells; i++) {
    energyBuffer[i] = Math.max(0, Math.min(1, energyBuffer[i]));
  }

  // 3. Smoothing passes with 6-neighbor averaging
  for (let pass = 0; pass < iterations; pass++) {
    const newBuffer = new Float32Array(totalCells);

    for (let y = 0; y < height; y++) {
      for (let z = 0; z < depth; z++) {
        for (let x = 0; x < width; x++) {
          const idx = y * width * depth + z * width + x;
          let sum = energyBuffer[idx];
          let count = 1;

          // 6-neighbor face-adjacent averaging
          if (x > 0) {
            sum += energyBuffer[y * width * depth + z * width + (x - 1)];
            count++;
          }
          if (x < width - 1) {
            sum += energyBuffer[y * width * depth + z * width + (x + 1)];
            count++;
          }

          if (y > 0) {
            sum += energyBuffer[(y - 1) * width * depth + z * width + x];
            count++;
          }
          if (y < height - 1) {
            sum += energyBuffer[(y + 1) * width * depth + z * width + x];
            count++;
          }

          if (z > 0) {
            sum += energyBuffer[y * width * depth + (z - 1) * width + x];
            count++;
          }
          if (z < depth - 1) {
            sum += energyBuffer[y * width * depth + (z + 1) * width + x];
            count++;
          }

          newBuffer[idx] = sum / count;
        }
      }
    }

    energyBuffer = newBuffer;
  }

  // Helper to safely read energy (clamped to bounds)
  const readEnergy = (cx, cy, cz) => {
    const clampedX = Math.max(0, Math.min(width - 1, cx));
    const clampedY = Math.max(0, Math.min(height - 1, cy));
    const clampedZ = Math.max(0, Math.min(depth - 1, cz));
    const idx = clampedY * width * depth + clampedZ * width + clampedX;
    return energyBuffer[idx];
  };

  return {
    width,
    height,
    depth,

    energyAt(x, y, z) {
      if (x < 0 || x >= width || y < 0 || y >= height || z < 0 || z >= depth) {
        return 0;
      }
      const idx = y * width * depth + z * width + x;
      return energyBuffer[idx];
    },

    gradientAt(x, y, z) {
      const CENTRAL_DIFF_SPAN = 2; // step = 1 voxel, span = (x+1)-(x-1) = 2

      // Central difference gradient with edge clamping
      const gx = (readEnergy(x + 1, y, z) - readEnergy(x - 1, y, z)) / CENTRAL_DIFF_SPAN;
      const gy = (readEnergy(x, y + 1, z) - readEnergy(x, y - 1, z)) / CENTRAL_DIFF_SPAN;
      const gz = (readEnergy(x, y, z + 1) - readEnergy(x, y, z - 1)) / CENTRAL_DIFF_SPAN;

      return { gx, gy, gz };
    },
  };
}
