import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { forgeItemAsset } from '../../../codex/core/pixelbrain/item-foundry.js';
import { ITEM_VOXEL_CONTRACT } from '../../../codex/core/pixelbrain/item-voxel-packet.js';

const PICKAXE_SPEC = JSON.parse(readFileSync('specs/voidmetal-pickaxe.v1.json', 'utf8'));

describe('forgeItemAsset — VolumeLiftAMP lift seam (2D fills → 3D voxel packet)', () => {
  const bundle = forgeItemAsset(PICKAXE_SPEC, { includeShader: false, includePng: false });

  it('emits a live voxel-volume alongside the 2D fills', () => {
    expect(bundle.volume).toBeTruthy();
    expect(bundle.volume.width).toBe(PICKAXE_SPEC.canvas.width);
    expect(bundle.volume.diagnostics.voxelCount).toBeGreaterThan(0);
    // default per-part table (no spec.volume) → flat maxDepth 1 → depth 3
    expect(bundle.volume.depth).toBe(3);
  });

  it('serializes a PB-VOXEL-ITEM transport artifact', () => {
    expect(bundle.voxelPacket.contract).toBe(ITEM_VOXEL_CONTRACT);
    expect(bundle.voxelPacket.id).toBe(PICKAXE_SPEC.id);
    expect(bundle.voxelPacket.voxels.length).toBe(bundle.volume.diagnostics.voxelCount);
    expect(Object.keys(bundle.voxelPacket.materials).length).toBeGreaterThan(0);
  });

  it('preserves the painted palette via colour-keyed materials', () => {
    // every voxel material id resolves to a colorHint in the materials table
    bundle.voxelPacket.voxels.forEach((v) => {
      expect(bundle.voxelPacket.materials[v.materialId]).toBeTruthy();
      expect(bundle.voxelPacket.materials[v.materialId].colorHint).toMatch(/^#[0-9A-F]{6}$/);
    });
  });

  it('is deterministic: two forges produce an identical packet', () => {
    const again = forgeItemAsset(PICKAXE_SPEC, { includeShader: false, includePng: false });
    expect(JSON.stringify(again.voxelPacket)).toBe(JSON.stringify(bundle.voxelPacket));
  });

  it('does not perturb the existing 2D fills geometry', () => {
    const partCells = {};
    for (const c of bundle.fills.coordinates) partCells[c.partId] = (partCells[c.partId] || 0) + 1;
    expect(partCells).toEqual({
      head_core: 190, void_inlay: 30, handle: 96, collar: 62, handle_wrap: 53,
    });
  });
});
