/** Project a voxel packet into three orthographic integer shadow sets. */
export function projectVoxelShadows(voxelPacket) {
  const front = new Set();
  const side = new Set();
  const top = new Set();

  for (const voxel of voxelPacket?.voxels || []) {
    front.add(`${voxel.x},${voxel.y}`);
    side.add(`${voxel.z},${voxel.y}`);
    top.add(`${voxel.x},${voxel.z}`);
  }

  return { front, side, top };
}

/** Count the symmetric difference between two shadow sets. */
export function hamming(a, b) {
  let count = 0;
  for (const key of a) {
    if (!b.has(key)) count += 1;
  }
  for (const key of b) {
    if (!a.has(key)) count += 1;
  }
  return count;
}

/** Rotate voxels in the front (x,y) plane about an integer pivot. */
export function rotateVoxelsZ(voxelPacket, degrees, pivot) {
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const voxels = (voxelPacket?.voxels || []).map((voxel) => {
    const dx = voxel.x - pivot.x;
    const dy = voxel.y - pivot.y;
    return {
      ...voxel,
      x: Math.round(pivot.x + dx * cos - dy * sin),
      y: Math.round(pivot.y + dx * sin + dy * cos),
      z: voxel.z,
    };
  });

  return { ...voxelPacket, voxels };
}
