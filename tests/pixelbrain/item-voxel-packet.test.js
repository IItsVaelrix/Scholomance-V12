import { describe, it, expect } from 'vitest';
import { ENERGY_TYPES } from '../../codex/core/pixelbrain/voxel-volume.js';
import { liftToVolume } from '../../codex/core/pixelbrain/volume-lift-amp.js';
import {
  ITEM_VOXEL_CONTRACT,
  serializeItemVoxelPacket,
} from '../../codex/core/pixelbrain/item-voxel-packet.js';

const STRUCT = (value) => ({ type: ENERGY_TYPES.STRUCTURAL, value });

function pickaxeVolume() {
  // a 1x1 haft cell (round, 3 voxels) + a glowing rune cell (flat, 1 voxel)
  const cells = [
    { x: 0, y: 0, partId: 'haft', materialId: 4, energies: [STRUCT(1)] },
    {
      x: 0, y: 1, partId: 'rune', materialId: 6,
      energies: [STRUCT(0.2), { type: ENERGY_TYPES.RADIANT, value: 0.9 }],
    },
  ];
  return liftToVolume(cells, {
    dims: { width: 1, height: 2 },
    partParams: { haft: { profile: 'round', maxDepth: 1 }, rune: { profile: 'flat', maxDepth: 1 } },
  });
}

describe('serializeItemVoxelPacket — PB-VOXEL-ITEM, sibling of PB-VOXEL-CHAR', () => {
  it('carries the contract, version and identity metadata', () => {
    const packet = serializeItemVoxelPacket(pickaxeVolume(), {
      id: 'voidmetal-pickaxe', bytecode: 'PB-VOXEL-ITEM-v1-VOIDMETAL-PICKAXE',
    });
    expect(packet.contract).toBe(ITEM_VOXEL_CONTRACT);
    expect(typeof packet.schemaVersion).toBe('string');
    expect(packet.id).toBe('voidmetal-pickaxe');
    expect(packet.bytecode).toBe('PB-VOXEL-ITEM-v1-VOIDMETAL-PICKAXE');
  });

  it('reports the volume dimensions', () => {
    const vol = pickaxeVolume();
    const packet = serializeItemVoxelPacket(vol);
    expect(packet.dimensions).toEqual({ width: vol.width, height: vol.height, depth: vol.depth });
  });

  it('serializes exactly the occupied voxels with their materials', () => {
    const vol = pickaxeVolume();
    const packet = serializeItemVoxelPacket(vol);
    expect(packet.voxels).toHaveLength(vol.diagnostics.voxelCount);
    packet.voxels.forEach((v) => {
      expect(Number.isInteger(v.x)).toBe(true);
      expect(Number.isInteger(v.y)).toBe(true);
      expect(Number.isInteger(v.z)).toBe(true);
      expect(v.materialId).toBeGreaterThan(0);
    });
    expect(packet.voxels.some((v) => v.materialId === 4)).toBe(true); // haft
    expect(packet.voxels.some((v) => v.materialId === 6)).toBe(true); // rune
  });

  it('carries RADIANT energy onto glowing voxels and omits it elsewhere', () => {
    const packet = serializeItemVoxelPacket(pickaxeVolume());
    const glow = packet.voxels.find((v) => v.materialId === 6);
    expect(glow.energyType).toBe(ENERGY_TYPES.RADIANT);
    expect(glow.energy).toBeCloseTo(0.9, 5);
    const plain = packet.voxels.find((v) => v.materialId === 4);
    expect(plain.energy).toBeUndefined();
    expect(plain.energyType).toBeUndefined();
  });

  it('orders voxels deterministically (y, then z, then x)', () => {
    const packet = serializeItemVoxelPacket(pickaxeVolume());
    const again = serializeItemVoxelPacket(pickaxeVolume());
    expect(packet.voxels).toEqual(again.voxels);
    for (let i = 1; i < packet.voxels.length; i += 1) {
      const a = packet.voxels[i - 1];
      const b = packet.voxels[i];
      const rankA = [a.y, a.z, a.x];
      const rankB = [b.y, b.z, b.x];
      expect(rankA <= rankB || JSON.stringify(rankA) <= JSON.stringify(rankB)).toBeTruthy();
    }
  });

  it('summarizes the materials present', () => {
    const packet = serializeItemVoxelPacket(pickaxeVolume());
    expect(Object.keys(packet.materials).map(Number).sort()).toEqual([4, 6]);
  });
});
