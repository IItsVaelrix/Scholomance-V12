/**
 * voxel-rig — C2 (node tree, parent-relative pivots) + C3 (rotation order).
 *
 * A Rig is a tree of nodes `{ name, parent, pivot, block? }`. Each node's
 * pivot is stored in *parent-local* voxel space; `worldPivot` resolves a
 * node's absolute pivot by accumulating local pivots up to the root.
 *
 * Rotation convention (C3): intrinsic XYZ, right-handed, degrees. Operationally
 * a point (taken relative to its pivot) is rotated about X, then Y, then Z, and
 * translated back. Right-handed checks: +90°Z: +X→+Y, +90°X: +Y→+Z, +90°Y: +X→−Z.
 *
 * See PDR SCHOL-ENC-PDR-VOXEDIT-CONVENTIONS-v1.0 §C.
 */

import { VOXEL_STD_CONTRACT } from './voxel-axes.js';
import { liftAnchor2D } from './voxel-pivot.js';

export const ROTATION_ORDER = 'XYZ';

/** Create a rig with a single root node (default pivot at the origin). */
export function createRig(rootPivot = { x: 0, y: 0, z: 0 }) {
  return {
    contract: VOXEL_STD_CONTRACT,
    nodes: { root: { name: 'root', parent: null, pivot: { ...rootPivot } } },
  };
}

/** Add a node to the rig. Pivot is parent-local. Returns the rig for chaining. */
export function addNode(rig, node) {
  if (!node || !node.name) throw new Error('voxel-rig: node requires a name');
  if (node.parent && !rig.nodes[node.parent]) {
    throw new Error(`voxel-rig: unknown parent "${node.parent}"`);
  }
  rig.nodes[node.name] = {
    name: node.name,
    parent: node.parent ?? 'root',
    pivot: { ...node.pivot },
    ...(node.block ? { block: node.block } : {}),
  };
  return rig;
}

/** Resolve a node's absolute pivot by summing local pivots up to the root. */
export function worldPivot(rig, name) {
  let node = rig.nodes[name];
  if (!node) throw new Error(`voxel-rig: unknown node "${name}"`);
  const out = { x: 0, y: 0, z: 0 };
  while (node) {
    out.x += node.pivot.x;
    out.y += node.pivot.y;
    out.z += node.pivot.z;
    node = node.parent ? rig.nodes[node.parent] : null;
  }
  return out;
}

/**
 * Build a rig from a character construction skeleton (C2 adoption at the
 * boundary): every 2D anchor is lifted to a 3D joint parented to the root.
 */
export function skeletonToRig(skeleton, zDefault = 0) {
  const rig = createRig();
  for (const [region, anchors] of Object.entries(skeleton)) {
    if (typeof anchors !== 'object' || anchors === null || Array.isArray(anchors)) continue;
    for (const [anchorName, point] of Object.entries(anchors)) {
      if (point && typeof point.x === 'number' && typeof point.y === 'number') {
        addNode(rig, {
          name: `${region}.${anchorName}`,
          parent: 'root',
          pivot: liftAnchor2D(point, zDefault),
        });
      }
    }
  }
  return rig;
}

const rad = (deg) => (deg * Math.PI) / 180;

/**
 * Rotate `point` about `pivot` by Euler angles `{x,y,z}` in degrees, applied
 * in X→Y→Z order (C3). Pure; returns a new point.
 */
export function rotatePointAboutPivot(point, eulerDeg, pivot) {
  let x = point.x - pivot.x;
  let y = point.y - pivot.y;
  let z = point.z - pivot.z;

  // Rx
  const ax = rad(eulerDeg.x);
  const cx = Math.cos(ax), sx = Math.sin(ax);
  let y1 = y * cx - z * sx;
  let z1 = y * sx + z * cx;
  y = y1; z = z1;

  // Ry
  const ay = rad(eulerDeg.y);
  const cy = Math.cos(ay), sy = Math.sin(ay);
  let x1 = x * cy + z * sy;
  let z2 = -x * sy + z * cy;
  x = x1; z = z2;

  // Rz
  const az = rad(eulerDeg.z);
  const cz = Math.cos(az), sz = Math.sin(az);
  let x2 = x * cz - y * sz;
  let y2 = x * sz + y * cz;
  x = x2; y = y2;

  return { x: x + pivot.x, y: y + pivot.y, z: z + pivot.z };
}
