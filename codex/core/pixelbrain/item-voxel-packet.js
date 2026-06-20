/**
 * ITEM VOXEL PACKET — the serialized transport artifact (PB-VOXEL-ITEM)
 *
 * The sibling of PB-VOXEL-CHAR (the hand-authored scholar packet). PDR Risk #4:
 * `voxel-volume` is the in-memory buffer; the Godot bridge needs a serialized
 * artifact. Do not conflate. This module flattens a lifted `voxel-volume` into a
 * deterministic, JSON-friendly packet the bridge can load through one renderer.
 *
 * Pure + deterministic.
 */

import {
  getCellMaterialId,
  cellIndex,
} from './voxel-volume.js';

export const ITEM_VOXEL_CONTRACT = 'PB-VOXEL-ITEM-v1';
export const ITEM_VOXEL_SCHEMA_VERSION = '0.1.0';

/**
 * Flatten a lifted voxel volume into a PB-VOXEL-ITEM packet.
 *
 * @param {object} volume - a voxel-volume produced by liftToVolume
 * @param {{ id?:string, bytecode?:string, materials?:object, pivots?:object }} [meta]
 * @returns {object} the serialized packet
 */
export function serializeItemVoxelPacket(volume, meta = {}) {
  if (!volume || !Number.isInteger(volume.width)) {
    throw new TypeError('serializeItemVoxelPacket requires a voxel-volume');
  }

  const voxels = [];
  const materialIds = new Set();

  // Walk in y → z → x order so the packet is deterministic and matches the
  // volume's YZX cell layout.
  for (let y = 0; y < volume.height; y += 1) {
    for (let z = 0; z < volume.depth; z += 1) {
      for (let x = 0; x < volume.width; x += 1) {
        const materialId = getCellMaterialId(volume, x, y, z);
        if (materialId <= 0) continue;
        materialIds.add(materialId);

        const voxel = { x, y, z, materialId };
        const i = cellIndex(volume, x, y, z);
        const energy = volume.energyField[i];
        if (energy > 0) {
          voxel.energy = energy;
          voxel.energyType = volume.energyTypes[i];
        }
        voxels.push(voxel);
      }
    }
  }

  // Material summary: prefer caller-supplied hints, else a bare presence map.
  const materials = {};
  for (const id of [...materialIds].sort((a, b) => a - b)) {
    materials[id] = (meta.materials && meta.materials[id]) || { id };
  }

  return {
    contract: ITEM_VOXEL_CONTRACT,
    schemaVersion: ITEM_VOXEL_SCHEMA_VERSION,
    id: meta.id || 'pixelbrain-item-voxel',
    bytecode: meta.bytecode || null,
    dimensions: { width: volume.width, height: volume.height, depth: volume.depth },
    ...(meta.pivots ? { pivots: meta.pivots } : {}),
    materials,
    voxels,
  };
}
