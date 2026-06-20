// Export the true-3D pickaxe sculpt (scratch/pickaxe-cells.mjs) to a
// PB-VOXEL-ITEM packet — the SAME transport the void scholar uses, so it renders
// through the one shared Godot voxel renderer. This is the high-fidelity item
// path: author in 3D, serialise, render. No 2D→3D lift involved.
//
//   node scratch/export-pickaxe-packet.mjs

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  createVoxelVolume,
  setCellMaterial,
  cellIndex,
} from '../codex/core/pixelbrain/voxel-volume.js';
import { serializeItemVoxelPacket } from '../codex/core/pixelbrain/item-voxel-packet.js';
import { buildPickaxeCells } from './pickaxe-cells.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const ASSET_DIR = resolve(here, '../godot_project/assets/items');

const { cells, dims, materials } = buildPickaxeCells();

// Sculpt cells → voxel-volume (the real in-memory container), then serialise.
const vol = createVoxelVolume(dims.width, dims.height, dims.depth);
for (const c of cells) {
  setCellMaterial(vol, c.x, c.y, c.z, c.m);
  if ((c.energy ?? 0) > 0) {
    const i = cellIndex(vol, c.x, c.y, c.z);
    vol.energyField[i] = c.energy;
    vol.energyTypes[i] = c.energyType ?? 7; // RADIANT
  }
}

const packet = serializeItemVoxelPacket(vol, {
  id: 'voidmetal-pickaxe-sculpt.v1',
  bytecode: 'VW-VOID-WILL-FORGE-TRANSCENDENT',
  materials,
});
// Authored y-up (model space), unlike lift output which is image-space y-down.
// The renderer reads this to decide whether to flip Y.
packet.space = 'model';

const json = JSON.stringify(packet, null, 2);
for (const ext of ['json', 'pbrain']) {
  const out = resolve(ASSET_DIR, `voidmetal_pickaxe_sculpt.${ext}`);
  writeFileSync(out, json);
  console.log(`wrote ${out} (${packet.voxels.length} voxels, dims ${dims.width}×${dims.height}×${dims.depth})`);
}
