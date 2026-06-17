#!/usr/bin/env node
/* global process */

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const TARGETS = [
  path.join(repoRoot, 'godot_project', 'assets', 'voidmetal-cave.qworld'),
  path.join(repoRoot, 'public', 'data', 'pixelbrain', 'voidmetal-cave.world.json'),
];

function key(x, y, z) {
  return `${x},${y},${z}`;
}

function hashCell(x, y, z, salt = 0) {
  let h = 2166136261;
  h ^= Math.trunc(x) + 374761393; h = Math.imul(h, 16777619);
  h ^= Math.trunc(y) + 668265263; h = Math.imul(h, 16777619);
  h ^= Math.trunc(z) + 2246822519; h = Math.imul(h, 16777619);
  h ^= salt; h = Math.imul(h, 16777619);
  return (h >>> 0) / 4294967295;
}

function exposedNeighborCount(occupied, x, y, z) {
  let exposed = 0;
  for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
    if (!occupied.has(key(x + dx, y + dy, z + dz))) exposed += 1;
  }
  return exposed;
}

function resolveBlockId(solid, occupied, mineableKeys) {
  const x = Number(solid.x);
  const y = Number(solid.y);
  const z = Number(solid.z);
  const materialId = Number(solid.materialId);
  const h = hashCell(x, y, z, 0xB10C);
  const exposed = exposedNeighborCount(occupied, x, y, z);

  if (materialId === 3) {
    return mineableKeys.has(key(x, y, z)) || exposed >= 2 || h > 0.62
      ? 'voidmetal_ore_large'
      : 'voidmetal_ore_small';
  }
  if (materialId === 4) {
    return exposed >= 3 || h > 0.58 ? 'cyan_crystal_growth' : 'cyan_crystal_embedded';
  }
  if (materialId === 5) {
    return 'path_rune_floor';
  }
  if (materialId === 2) {
    return h > 0.46 || exposed >= 3 ? 'basalt_fractured' : 'basalt_slab';
  }
  if (exposed >= 4) return 'voidstone_edge_dark';
  if (h > 0.52 || y > 7) return 'voidstone_cracked';
  return 'voidstone_smooth';
}

function applyBlockIds(world) {
  const solids = world.gameplay?.collisionSolids ?? [];
  const occupied = new Map(solids.map((solid) => [key(solid.x, solid.y, solid.z), solid]));
  const mineableKeys = new Set((world.gameplay?.mineables ?? []).map((node) => key(node.voxel.x, node.voxel.y, node.voxel.z)));
  const blockHistogram = {};

  for (const solid of solids) {
    const blockId = resolveBlockId(solid, occupied, mineableKeys);
    solid.blockId = blockId;
    blockHistogram[blockId] = (blockHistogram[blockId] ?? 0) + 1;
  }

  for (const node of world.gameplay?.mineables ?? []) {
    const solid = occupied.get(key(node.voxel.x, node.voxel.y, node.voxel.z));
    node.blockId = solid?.blockId ?? 'voidmetal_ore_large';
  }

  for (const face of world.faces ?? []) {
    const solid = occupied.get(key(face.voxel.x, face.voxel.y, face.voxel.z));
    face.blockId = solid?.blockId ?? resolveBlockId({ ...face.voxel, materialId: face.materialId }, occupied, mineableKeys);
    if (face.resource && typeof face.resource === 'object') {
      face.resource.blockId = face.blockId;
    }
  }

  world.blockRegistry = {
    contract: 'PB-BLOCK-REGISTRY-v1',
    path: 'res://assets/blocks/block-registry.json',
    publicPath: '/data/pixelbrain/blocks/block-registry.json',
  };
  world.telemetry = {
    ...(world.telemetry ?? {}),
    blockHistogram,
    blockCount: Object.values(blockHistogram).reduce((sum, count) => sum + count, 0),
  };
  return blockHistogram;
}

function main() {
  for (const target of TARGETS) {
    const world = JSON.parse(readFileSync(target, 'utf8'));
    const blockHistogram = applyBlockIds(world);
    writeFileSync(target, `${JSON.stringify(world)}\n`);
    console.log(`${path.relative(repoRoot, target)}: ${Object.keys(blockHistogram).length} block types`);
  }
}

main();
