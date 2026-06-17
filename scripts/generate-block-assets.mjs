#!/usr/bin/env node
/* global Buffer, process */

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const blockDir = path.join(repoRoot, 'godot_project', 'assets', 'blocks');
const publicBlockDir = path.join(repoRoot, 'public', 'data', 'pixelbrain', 'blocks');
const TILE_SIZE = 32;
const UPSCALE_FACTOR = 4;

const BLOCKS = [
  {
    id: 'voidstone_smooth',
    materialId: 1,
    label: 'Voidstone Smooth',
    base: [17, 13, 28],
    accent: [42, 35, 62],
    rules: { materialId: 1, neighborhood: 'interior', weight: 0.42 },
  },
  {
    id: 'voidstone_cracked',
    materialId: 1,
    label: 'Voidstone Cracked',
    base: [20, 16, 34],
    accent: [86, 78, 112],
    rules: { materialId: 1, neighborhood: 'wall', weight: 0.38 },
  },
  {
    id: 'voidstone_edge_dark',
    materialId: 1,
    label: 'Voidstone Edge Dark',
    base: [9, 7, 15],
    accent: [48, 41, 70],
    rules: { materialId: 1, neighborhood: 'outer_edge', weight: 0.2 },
  },
  {
    id: 'basalt_slab',
    materialId: 2,
    label: 'Basalt Slab',
    base: [37, 31, 49],
    accent: [78, 70, 96],
    rules: { materialId: 2, neighborhood: 'floor_or_wall', weight: 0.55 },
  },
  {
    id: 'basalt_fractured',
    materialId: 2,
    label: 'Basalt Fractured',
    base: [29, 24, 39],
    accent: [98, 89, 122],
    rules: { materialId: 2, neighborhood: 'high_frequency_cracks', weight: 0.45 },
  },
  {
    id: 'voidmetal_ore_small',
    materialId: 3,
    label: 'Voidmetal Ore Small',
    base: [62, 48, 128],
    accent: [174, 150, 255],
    emission: [70, 38, 180],
    rules: { materialId: 3, cluster: 'edge', rarity: 0.45 },
  },
  {
    id: 'voidmetal_ore_large',
    materialId: 3,
    label: 'Voidmetal Ore Large',
    base: [78, 56, 156],
    accent: [216, 184, 255],
    emission: [94, 50, 230],
    rules: { materialId: 3, cluster: 'core', rarity: 0.35 },
  },
  {
    id: 'cyan_crystal_embedded',
    materialId: 4,
    label: 'Cyan Crystal Embedded',
    base: [47, 160, 188],
    accent: [186, 251, 255],
    emission: [70, 225, 255],
    rules: { materialId: 4, growth: 'embedded', lightRadius: 7 },
  },
  {
    id: 'cyan_crystal_growth',
    materialId: 4,
    label: 'Cyan Crystal Growth',
    base: [35, 135, 178],
    accent: [224, 255, 255],
    emission: [110, 231, 255],
    rules: { materialId: 4, growth: 'exposed', lightRadius: 9 },
  },
  {
    id: 'path_rune_floor',
    materialId: 5,
    label: 'Path Rune Floor',
    base: [18, 96, 108],
    accent: [85, 246, 255],
    emission: [36, 199, 223],
    rules: { materialId: 5, role: 'walkable_glyph', lightRadius: 3 },
  },
  // Surface world blocks
  {
    id: 'grimstone_block',
    materialId: 1,
    label: 'Grimstone Block',
    base: [38, 38, 44],
    accent: [72, 68, 82],
    rules: { materialId: 1, neighborhood: 'bedrock', weight: 0.60 },
  },
  {
    id: 'grimstone_mossy',
    materialId: 1,
    label: 'Grimstone Mossy',
    base: [30, 44, 36],
    accent: [52, 76, 56],
    rules: { materialId: 1, neighborhood: 'surface_outcrop', weight: 0.40 },
  },
  {
    id: 'peat_damp',
    materialId: 2,
    label: 'Peat Damp',
    base: [40, 30, 22],
    accent: [64, 50, 36],
    rules: { materialId: 2, neighborhood: 'subsurface', weight: 0.55 },
  },
  {
    id: 'peat_dry',
    materialId: 2,
    label: 'Peat Dry',
    base: [58, 46, 32],
    accent: [86, 70, 50],
    rules: { materialId: 2, neighborhood: 'surface_soil', weight: 0.45 },
  },
  {
    id: 'ash_grass',
    materialId: 3,
    label: 'Ash Grass',
    base: [28, 40, 22],
    accent: [46, 68, 36],
    faceOverrides: {
      side:   { base: [44, 34, 24], accent: [68, 52, 36] },
      bottom: { base: [40, 30, 22], accent: [64, 50, 36] },
    },
    rules: { materialId: 3, neighborhood: 'cap', weight: 1.0 },
  },
  {
    id: 'grimwood_log',
    materialId: 4,
    label: 'Grimwood Log',
    base: [26, 20, 14],
    accent: [56, 44, 30],
    rules: { materialId: 4, role: 'harvestable_tree', weight: 1.0 },
  },
  {
    id: 'ruins_brick',
    materialId: 5,
    label: 'Ruins Brick',
    base: [52, 48, 58],
    accent: [88, 80, 102],
    rules: { materialId: 5, role: 'ruin_wall', weight: 1.0 },
  },
];

function crc32(buffer) {
  let crc = ~0;
  for (let i = 0; i < buffer.length; i += 1) {
    crc ^= buffer[i];
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return ~crc >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function writePng(filePath, width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  const rows = [];
  for (let y = 0; y < height; y += 1) {
    rows.push(Buffer.from([0]));
    rows.push(rgba.subarray(y * width * 4, (y + 1) * width * 4));
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const png = Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(Buffer.concat(rows))),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
  writeFileSync(filePath, png);
}

function hash2(x, y, salt) {
  let h = 2166136261;
  h ^= x + 374761393; h = Math.imul(h, 16777619);
  h ^= y + 668265263; h = Math.imul(h, 16777619);
  h ^= salt + 1274126177; h = Math.imul(h, 16777619);
  return (h >>> 0) / 4294967295;
}

function mix(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function makeTile(block, face) {
  const rgba = Buffer.alloc(TILE_SIZE * TILE_SIZE * 4);
  const salt = [...block.id, ...face].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const faceShade = face === 'top' ? 1.14 : face === 'bottom' ? 0.56 : 0.82;
  const faceColors = block.faceOverrides?.[face] ?? block;
  const base = faceColors.base;
  const accent = faceColors.accent;
  for (let y = 0; y < TILE_SIZE; y += 1) {
    for (let x = 0; x < TILE_SIZE; x += 1) {
      const grain = hash2(x, y, salt);
      const vein = Math.abs(((x * 3 + y * 5 + salt) % 23) - 11) < 1;
      const crack = Math.abs(((x - y * 2 + salt) % 29) - 14) < 1;
      const rune = block.id.includes('rune') && ((x === y) || (x + y === TILE_SIZE - 1) || (x > 12 && x < 20 && y % 7 === 0));
      const crystal = block.id.includes('crystal') && ((x + y + salt) % 11 < 2 || Math.abs(x - TILE_SIZE / 2) < 2);
      const ore = block.id.includes('voidmetal') && ((x * y + salt) % (block.id.includes('large') ? 13 : 19) < 3);
      const woodGrain = block.id.includes('log') && (x % 4 === 0 || (x + y * 3) % 9 === 0);
      const brick = block.id.includes('ruins') && (y % 5 === 0 || ((x + Math.floor(y / 5) % 2 * 8) % 16 === 0));
      const grassTuft = block.id.includes('grass') && face === 'top' && (grain > 0.78 || (x + y) % 6 === 0);
      const mossPatch = block.id.includes('mossy') && grain > 0.72;
      let t = grain * 0.32;
      if (vein || crack || mossPatch) t += 0.24;
      if (woodGrain || brick) t += 0.32;
      if (grassTuft) t += 0.28;
      if (ore || crystal || rune) t = 0.9;
      const shaded = faceShade * (0.84 + grain * 0.22);
      const r = Math.max(0, Math.min(255, mix(base[0], accent[0], t) * shaded));
      const g = Math.max(0, Math.min(255, mix(base[1], accent[1], t) * shaded));
      const b = Math.max(0, Math.min(255, mix(base[2], accent[2], t) * shaded));
      const i = (y * TILE_SIZE + x) * 4;
      rgba[i] = r;
      rgba[i + 1] = g;
      rgba[i + 2] = b;
      rgba[i + 3] = 255;
    }
  }
  return rgba;
}

function sampleBilinear(source, width, height, x, y, channel) {
  const x0 = Math.max(0, Math.min(width - 1, Math.floor(x)));
  const y0 = Math.max(0, Math.min(height - 1, Math.floor(y)));
  const x1 = Math.max(0, Math.min(width - 1, x0 + 1));
  const y1 = Math.max(0, Math.min(height - 1, y0 + 1));
  const tx = x - x0;
  const ty = y - y0;
  const i00 = (y0 * width + x0) * 4 + channel;
  const i10 = (y0 * width + x1) * 4 + channel;
  const i01 = (y1 * width + x0) * 4 + channel;
  const i11 = (y1 * width + x1) * 4 + channel;
  const top = source[i00] + (source[i10] - source[i00]) * tx;
  const bottom = source[i01] + (source[i11] - source[i01]) * tx;
  return Math.round(top + (bottom - top) * ty);
}

function upscaleAntialias(source, width, height, factor) {
  const nextWidth = width * factor;
  const nextHeight = height * factor;
  const out = Buffer.alloc(nextWidth * nextHeight * 4);
  for (let y = 0; y < nextHeight; y += 1) {
    for (let x = 0; x < nextWidth; x += 1) {
      const sx = (x + 0.5) / factor - 0.5;
      const sy = (y + 0.5) / factor - 0.5;
      const i = (y * nextWidth + x) * 4;
      out[i] = sampleBilinear(source, width, height, sx, sy, 0);
      out[i + 1] = sampleBilinear(source, width, height, sx, sy, 1);
      out[i + 2] = sampleBilinear(source, width, height, sx, sy, 2);
      out[i + 3] = 255;
    }
  }
  return out;
}

function writeBlockAssets(targetDir, pathPrefix) {
  mkdirSync(targetDir, { recursive: true });
  const blocks = {};
  for (const block of BLOCKS) {
    const faces = {};
    const upscaledFaces = {};
    for (const face of ['top', 'side', 'bottom']) {
      const tile = makeTile(block, face);
      const filename = `${block.id}_${face}.png`;
      writePng(path.join(targetDir, filename), TILE_SIZE, TILE_SIZE, tile);
      faces[face] = `${pathPrefix}/${filename}`;
      const upscaledFilename = `${block.id}_${face}_aa4x.png`;
      writePng(
        path.join(targetDir, upscaledFilename),
        TILE_SIZE * UPSCALE_FACTOR,
        TILE_SIZE * UPSCALE_FACTOR,
        upscaleAntialias(tile, TILE_SIZE, TILE_SIZE, UPSCALE_FACTOR)
      );
      upscaledFaces[face] = `${pathPrefix}/${upscaledFilename}`;
    }
    blocks[block.id] = {
      id: block.id,
      label: block.label,
      materialId: block.materialId,
      faces,
      upscaledFaces,
      upscaledTileSize: TILE_SIZE * UPSCALE_FACTOR,
      emission: block.emission ?? null,
      rules: block.rules,
    };
  }
  return blocks;
}

function main() {
  const godotBlocks = writeBlockAssets(blockDir, 'res://assets/blocks');
  writeBlockAssets(publicBlockDir, '/data/pixelbrain/blocks');
  const registry = {
    contract: 'PB-BLOCK-REGISTRY-v1',
    version: 1,
    tileSize: TILE_SIZE,
    upscaledTileSize: TILE_SIZE * UPSCALE_FACTOR,
    upscaledFilter: 'bilinear-aa4x',
    defaultBlockId: 'voidstone_smooth',
    blocks: godotBlocks,
  };
  writeFileSync(path.join(blockDir, 'block-registry.json'), `${JSON.stringify(registry, null, 2)}\n`);
  writeFileSync(path.join(publicBlockDir, 'block-registry.json'), `${JSON.stringify(registry, null, 2)}\n`);
  console.log(`Generated ${BLOCKS.length} block definitions in ${path.relative(repoRoot, blockDir)}`);
}

main();
