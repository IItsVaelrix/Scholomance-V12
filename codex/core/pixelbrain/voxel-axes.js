/**
 * voxel-axes — A1 (up-axis & handedness) + A3 (mirror planes).
 *
 * The canonical Scholomance voxel frame, adopted from VoxEdit:
 *   Y-up, right-handed, axis order X(right) Y(up) Z(depth, +Z toward camera).
 *
 * This frame is the source of truth. `iso-projector.js` is a declared *view*
 * of it (see PDR SCHOL-ENC-PDR-VOXEDIT-CONVENTIONS-v1.0 §A1). Storage in
 * VoxelVolume stays YZX; that is a memory layout, not a coordinate change.
 */

export const VOXEL_STD_CONTRACT = 'PB-VOXEL-STD-v1';

export const AXES = Object.freeze(['x', 'y', 'z']);
export const UP_AXIS = 'y';
export const HANDEDNESS = 'right';

/**
 * Reflect a point across a half-voxel mirror plane on one axis (A3).
 *
 * The plane sits *between* voxels at `n + 0.5`, so a voxel reflects to its
 * mirror partner exactly: `p' = 2*planeHalf - p`. The reflection is its own
 * inverse (an involution) and leaves the other two axes untouched.
 *
 * @param {{x:number,y:number,z:number}} point
 * @param {'x'|'y'|'z'} axis - axis to reflect across
 * @param {number} planeHalf - mirror plane position in half-voxel units
 * @returns {{x:number,y:number,z:number}} a new, reflected point
 */
export function mirror(point, axis, planeHalf) {
  return { ...point, [axis]: 2 * planeHalf - point[axis] };
}
