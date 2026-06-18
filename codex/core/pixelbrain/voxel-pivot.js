/**
 * voxel-pivot — B1 (3D pivot type), B2 (default origin), B3 (half-voxel grid).
 *
 * Adopts VoxEdit's pivot conventions. A pivot is a 3D grid point `{x,y,z}`.
 * Voxel cell `i` occupies the continuous interval `[i, i+1)`, so a block
 * spanning indices `min..max` occupies `[min, max+1]` and its geometric
 * center is `(min + max + 1) / 2`. Even spans land on an integer corner;
 * odd spans land on a voxel center (`n + 0.5`) — both exactly representable
 * in half-voxel units, which keeps 90° rotations lattice-aligned.
 *
 * See PDR SCHOL-ENC-PDR-VOXEDIT-CONVENTIONS-v1.0 §B.
 */

/**
 * Lift a 2D anchor `{x,y}` to a 3D pivot `{x,y,z}` (B1). An anchor that
 * already carries a `z` is preserved; otherwise `zDefault` is used.
 */
export function liftAnchor2D(anchor, zDefault) {
  const z = typeof anchor.z === 'number' ? anchor.z : zDefault;
  return { x: anchor.x, y: anchor.y, z };
}

/**
 * Default pivot for a block bounding box (B2): centered on X and Z, resting
 * on the ground (min) in Y — the rigging-friendly "feet on the floor" default.
 *
 * @param {{minX:number,maxX:number,minY:number,maxY:number,minZ:number,maxZ:number}} bbox
 * @returns {{x:number,y:number,z:number}}
 */
export function defaultPivot(bbox) {
  return {
    x: (bbox.minX + bbox.maxX + 1) / 2,
    y: bbox.minY,
    z: (bbox.minZ + bbox.maxZ + 1) / 2,
  };
}

/** Snap each component of a pivot to the nearest half-voxel (B3). */
export function snapToHalfVoxel(pivot) {
  return {
    x: Math.round(pivot.x * 2) / 2,
    y: Math.round(pivot.y * 2) / 2,
    z: Math.round(pivot.z * 2) / 2,
  };
}

/** True when `p` is a complete 3D pivot with numeric x, y, z. */
export function isPivot3D(p) {
  return !!p
    && typeof p.x === 'number'
    && typeof p.y === 'number'
    && typeof p.z === 'number';
}
