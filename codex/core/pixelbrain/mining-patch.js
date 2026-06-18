import { isCellOccupied, getCellMaterialId, cellIndex } from './voxel-volume.js';
import { VoxelAuthority, VoxelOp, applyVoxelDeltas } from './voxel-delta.js';
import { makeFace, computeFaceAO } from './iso-projector.js';
import { resolveBlockContext, lightAt } from './block-school-bridge.js';

const MATERIAL_NAMES = Object.freeze({
  0: 'air', 1: 'earth', 2: 'stone', 3: 'granite', 4: 'crystal',
});

// When cell (x, y, z) is removed, these three neighbors may gain a visible face.
// Each neighbor has a face whose visibility was previously blocked by (x,y,z).
const GAIN_CANDIDATES = Object.freeze([
  { dy: -1, dz:  0, dx:  0, faceType: 'top'   }, // cell below gains its top face
  { dy:  0, dz: -1, dx:  0, faceType: 'left'  }, // cell at z-1 gains its left face
  { dy:  0, dz:  0, dx: -1, faceType: 'right' }, // cell at x-1 gains its right face
]);

function buildPatchFace(vol, w, h, d, schoolWeights, nx, ny, nz, faceType) {
  const materialId = getCellMaterialId(vol, nx, ny, nz);
  const blockCtx = resolveBlockContext(w, h, d, schoolWeights, materialId, nx, ny, nz);
  const light = lightAt(w, h, d, schoolWeights, nx, ny, nz);
  const energyVal = vol.energyField[cellIndex(vol, nx, ny, nz)];
  const occ = (cx, cy, cz) => isCellOccupied(vol, cx, cy, cz);
  const face = makeFace(nx, ny, nz, faceType, materialId);
  face.ao = computeFaceAO(nx, ny, nz, faceType, vol, occ);
  face.light = light;
  face.type = faceType;
  const materialName = MATERIAL_NAMES[materialId] ?? `material-${materialId}`;
  face.resource = Object.freeze({
    id: `${materialName}.patch.${nx}.${ny}.${nz}.${faceType}`,
    materialId,
    materialName,
    energyType: 'STRUCTURAL',
    schoolId: blockCtx.schoolId,
    blockId: blockCtx.blockId,
    amount: Math.max(1, Math.round((energyVal + 0.1) * 10)),
    energy: Number(energyVal.toFixed(4)),
    position: Object.freeze({ x: nx, y: ny, z: nz }),
    faceType,
  });
  return Object.freeze(face);
}

/**
 * Apply a RuntimeMining removal at (x, y, z) to the live volume without
 * touching the energyField (the QBIT lattice stays fixed). Returns the
 * minimal face delta the renderer needs: the coordinate of the removed cell
 * (Godot removes all its Polygon2D nodes) and any newly exposed neighbor faces.
 *
 * Never calls buildQbitWorldGameLoop — the lattice is never re-propagated.
 */
export function applyMiningPatch(vol, schoolWeights, x, y, z) {
  const { width: w, height: h, depth: d } = vol;

  applyVoxelDeltas(vol, [{
    x, y, z,
    op: VoxelOp.REMOVE_SOLID,
    source: VoxelAuthority.RUNTIME_MINING,
  }]);

  vol.tags.delete(`${x},${y},${z}`);

  const addedFaces = [];
  for (const { dx, dy, dz, faceType } of GAIN_CANDIDATES) {
    const nx = x + dx, ny = y + dy, nz = z + dz;
    if (nx < 0 || ny < 0 || nz < 0 || nx >= w || ny >= h || nz >= d) continue;
    if (!isCellOccupied(vol, nx, ny, nz)) continue;
    addedFaces.push(buildPatchFace(vol, w, h, d, schoolWeights, nx, ny, nz, faceType));
  }

  return { removedAt: { x, y, z }, addedFaces };
}
