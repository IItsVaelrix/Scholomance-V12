/**
 * voxel-block — C1: a named sub-volume whose local origin is its pivot.
 *
 * A Block is the VoxEdit unit of rigging: `{ name, cells, bbox, pivot }`.
 * Cells are voxel coordinates `{x,y,z}` in the block's local space. The pivot
 * defaults to the feet-on-ground center (see voxel-pivot.defaultPivot) and may
 * be overridden; an override is snapped to the half-voxel grid.
 *
 * See PDR SCHOL-ENC-PDR-VOXEDIT-CONVENTIONS-v1.0 §C1.
 */

import { defaultPivot, snapToHalfVoxel } from './voxel-pivot.js';

/** Axis-aligned bounding box over a non-empty list of voxel cells. */
export function blockBBox(cells) {
  if (!cells || cells.length === 0) {
    throw new Error('voxel-block: cannot compute a bbox for an empty cell list');
  }
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  for (const c of cells) {
    if (c.x < minX) minX = c.x;
    if (c.x > maxX) maxX = c.x;
    if (c.y < minY) minY = c.y;
    if (c.y > maxY) maxY = c.y;
    if (c.z < minZ) minZ = c.z;
    if (c.z > maxZ) maxZ = c.z;
  }
  return { minX, maxX, minY, maxY, minZ, maxZ };
}

/**
 * Create a Block from a name and its local cells. The pivot defaults to the
 * bbox feet-on-ground center; a provided `pivotOverride` is half-voxel snapped.
 */
export function createBlock(name, cells, pivotOverride) {
  const bbox = blockBBox(cells);
  const pivot = pivotOverride ? snapToHalfVoxel(pivotOverride) : defaultPivot(bbox);
  return { name, cells, bbox, pivot };
}
