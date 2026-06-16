export const ENERGY_TYPES = Object.freeze({
  RESONANT:   0,
  PHOTONIC:   1,
  STRUCTURAL: 2,
  THERMAL:    3,
  KINETIC:    4,
  ENTROPIC:   5,
  SHIELDING:  6,
  RADIANT:    7,
});

export function createVoxelVolume(width, height, depth) {
  if (!Number.isInteger(width) || width <= 0) {
    throw new TypeError(`width must be a positive integer, got ${width}`);
  }
  if (!Number.isInteger(height) || height <= 0) {
    throw new TypeError(`height must be a positive integer, got ${height}`);
  }
  if (!Number.isInteger(depth) || depth <= 0) {
    throw new TypeError(`depth must be a positive integer, got ${depth}`);
  }

  const totalCells = width * height * depth;

  return {
    width,
    height,
    depth,
    cells: new Uint16Array(totalCells),
    energyField: new Float32Array(totalCells),
    energyTypes: new Uint8Array(totalCells),
  };
}

export function cellIndex(vol, x, y, z) {
  return y * vol.width * vol.depth + z * vol.width + x;
}

export function getCellMaterialId(vol, x, y, z) {
  const i = cellIndex(vol, x, y, z);
  return (vol.cells[i] >> 4) & 0xFFF;
}

export function isCellOccupied(vol, x, y, z) {
  return getCellMaterialId(vol, x, y, z) > 0;
}

export function setCellMaterial(vol, x, y, z, materialId) {
  if (materialId < 0 || materialId > 4095) {
    throw new RangeError(`materialId must be 0–4095, got ${materialId}`);
  }
  const i = cellIndex(vol, x, y, z);
  const flags = vol.cells[i] & 0xF;
  vol.cells[i] = (materialId << 4) | flags;
}

export function setCellOccupancy(vol, x, y, z, occupied) {
  const i = cellIndex(vol, x, y, z);
  const currentMaterialId = getCellMaterialId(vol, x, y, z);

  if (occupied === false) {
    const flags = vol.cells[i] & 0xF;
    vol.cells[i] = flags;
  } else if (occupied === true) {
    if (currentMaterialId === 0) {
      const flags = vol.cells[i] & 0xF;
      vol.cells[i] = (1 << 4) | flags;
    }
  }
}
