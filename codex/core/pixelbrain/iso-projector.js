export const ISO_TILE_SIZE = 16; // pixels per voxel tile in isometric view

const FACE_TYPE_INDEX = {
  top: 0,
  left: 1,
  right: 2,
};

/**
 * Projects a 3D voxel coordinate to 2D isometric screen coordinates.
 * @param {number} x - voxel grid x coordinate
 * @param {number} y - voxel grid y coordinate (vertical, up)
 * @param {number} z - voxel grid z coordinate
 * @returns {{ sx: number, sy: number }} isometric screen coordinates
 */
export function project(x, y, z) {
  const sx = (x - z) * ISO_TILE_SIZE;
  const sy = (x + z) * (ISO_TILE_SIZE / 2) - y * ISO_TILE_SIZE;
  return { sx, sy };
}

/**
 * Creates a face descriptor for a visible voxel face.
 * @param {number} x - voxel grid x coordinate
 * @param {number} y - voxel grid y coordinate
 * @param {number} z - voxel grid z coordinate
 * @param {string} faceType - 'top' | 'left' | 'right'
 * @param {number} materialId - material identifier
 * @returns {object} face descriptor with screen coordinates and sort key
 */
export function makeFace(x, y, z, faceType, materialId) {
  const { sx, sy } = project(x, y, z);
  const faceTypeIndex = FACE_TYPE_INDEX[faceType];
  const sortKey = (z + y) * 10000 + x * 10 + faceTypeIndex;

  return {
    x,
    y,
    z,
    faceType,
    materialId,
    sx,
    sy,
    sortKey,
  };
}

/**
 * Collects all visible faces from a voxel volume.
 * Uses injected accessor functions for flexibility (no direct VoxelVolume import).
 *
 * Loop order: outer y, middle z, inner x (YZX matching VoxelVolume layout).
 * Face visibility rules (isometric view from above-right):
 *   - top: visible if cell above (y+1) is not occupied or out of bounds
 *   - left: visible if cell at (z+1) is not occupied or out of bounds
 *   - right: visible if cell at (x+1) is not occupied or out of bounds
 *
 * @param {object} vol - VoxelVolume instance
 * @param {Function} getCellMaterialId - (x, y, z) => materialId
 * @param {Function} isCellOccupied - (x, y, z) => boolean
 * @returns {Array<object>} sorted array of face descriptors
 */
function sampleOccupied(isCellOccupied, vol, x, y, z) {
  if (x < 0 || y < 0 || z < 0) return false;
  if (x >= vol.width || y >= vol.height || z >= vol.depth) return false;
  return isCellOccupied(x, y, z);
}

function computeFaceAO(x, y, z, faceType, vol, isCellOccupied) {
  const s = (dx, dy, dz) => sampleOccupied(isCellOccupied, vol, x + dx, y + dy, z + dz) ? 1 : 0;
  let count = 0;
  if (faceType === 'top') {
    count = s(-1, 1, 0) + s(1, 1, 0) + s(0, 1, -1) + s(0, 1, 1);
  } else if (faceType === 'left') {
    count = s(-1, 0, 1) + s(1, 0, 1) + s(0, -1, 1) + s(0, 1, 1);
  } else if (faceType === 'right') {
    count = s(1, 0, -1) + s(1, 0, 1) + s(1, -1, 0) + s(1, 1, 0);
  }
  return count / 4;
}

export function collectFaces(vol, getCellMaterialId, isCellOccupied) {
  const faces = [];

  // Loop order: outer y, middle z, inner x (YZX)
  for (let y = 0; y < vol.height; y++) {
    for (let z = 0; z < vol.depth; z++) {
      for (let x = 0; x < vol.width; x++) {
        // Skip empty cells
        if (!isCellOccupied(x, y, z)) {
          continue;
        }

        const materialId = getCellMaterialId(x, y, z);

        // Top face: visible if cell above is not occupied
        const aboveOccupied = y + 1 < vol.height && isCellOccupied(x, y + 1, z);
        if (!aboveOccupied) {
          const face = makeFace(x, y, z, 'top', materialId);
          face.ao = computeFaceAO(x, y, z, 'top', vol, isCellOccupied);
          faces.push(face);
        }

        // Left face: visible if cell at z+1 is not occupied
        const leftOccupied = z + 1 < vol.depth && isCellOccupied(x, y, z + 1);
        if (!leftOccupied) {
          const face = makeFace(x, y, z, 'left', materialId);
          face.ao = computeFaceAO(x, y, z, 'left', vol, isCellOccupied);
          faces.push(face);
        }

        // Right face: visible if cell at x+1 is not occupied
        const rightOccupied = x + 1 < vol.width && isCellOccupied(x + 1, y, z);
        if (!rightOccupied) {
          const face = makeFace(x, y, z, 'right', materialId);
          face.ao = computeFaceAO(x, y, z, 'right', vol, isCellOccupied);
          faces.push(face);
        }
      }
    }
  }

  // Sort by sortKey ascending (painter's algorithm)
  faces.sort((a, b) => a.sortKey - b.sortKey);

  return faces;
}

/**
 * Computes the bounding box of all face screen coordinates.
 * @param {Array<object>} faces - array of face descriptors
 * @returns {{ minX: number, maxX: number, minY: number, maxY: number }}
 */
export function renderBounds(faces) {
  if (faces.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  }

  let minX = faces[0].sx;
  let maxX = faces[0].sx;
  let minY = faces[0].sy;
  let maxY = faces[0].sy;

  for (let i = 1; i < faces.length; i++) {
    const face = faces[i];
    if (face.sx < minX) minX = face.sx;
    if (face.sx > maxX) maxX = face.sx;
    if (face.sy < minY) minY = face.sy;
    if (face.sy > maxY) maxY = face.sy;
  }

  return { minX, maxX, minY, maxY };
}
