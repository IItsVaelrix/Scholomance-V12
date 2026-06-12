/**
 * Import a hand-edited sprite PNG back into PixelBrain engine artifacts.
 *
 * Workflow:
 *   node scripts/generate-pixelbrain-scimitar.mjs        → output/.../scimitar.1x.png
 *   (edit scimitar.1x.png in Aseprite — keep 1×, transparent background)
 *   node scripts/pixelbrain-import-sprite.mjs output/pixelbrain/scimitar/scimitar.1x.png \
 *       --id scimitar.hd.edited --out output/pixelbrain/scimitar-edited
 *
 * Decodes the PNG (any format Aseprite saves — RGBA, indexed, with or without
 * filters — via sharp), keys the sprite on alpha, transcribes pixels through
 * the engine's source-transcription path, and writes the full artifact bundle:
 *   - <name>.json     PixelBrainAssetPacket
 *   - <name>.pbrain   godot-ready artifact
 *   - <name>.png      8× preview render
 *   - <name>.1x.png   normalized 1× transparent sprite (next edit round)
 *   - <name>.import.diagnostics.json
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, basename, dirname } from 'node:path';
import { deflateSync } from 'node:zlib';
import sharp from 'sharp';

import { transcribeSourcePixelData } from '../codex/core/pixelbrain/image-to-pixel-art.js';
import { createPixelBrainAssetPacket } from '../codex/core/pixelbrain/pixelbrain-asset-packet.js';
import { SOURCE_MATERIAL } from '../codex/core/pixelbrain/material-registry.js';
import { buildPixelBrainGodotExport } from '../src/lib/godot-export/pixelbrainGodotExport.js';

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--id') args.id = argv[++i];
    else if (argv[i] === '--out') args.out = argv[++i];
    else args._.push(argv[i]);
  }
  return args;
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function crc32(buf) {
  let c;
  const table = (crc32._t ||= (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n += 1) {
      c = n;
      for (let k = 0; k < 8; k += 1) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })());
  c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lengthBuf = Buffer.alloc(4);
  lengthBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lengthBuf, typeBuf, data, crcBuf]);
}

function hexToRgb(hex) {
  const m = String(hex || '').trim().replace('#', '');
  if (m.length !== 6) return null;
  return { r: parseInt(m.slice(0, 2), 16), g: parseInt(m.slice(2, 4), 16), b: parseInt(m.slice(4, 6), 16) };
}

function renderPng(coordinates, width, height, scale, { transparent = false } = {}) {
  const bg = { r: 10, g: 10, b: 18 };
  const outW = width * scale;
  const outH = height * scale;
  const pixels = Buffer.alloc(outW * outH * 4);
  if (!transparent) {
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = bg.r; pixels[i + 1] = bg.g; pixels[i + 2] = bg.b; pixels[i + 3] = 255;
    }
  }
  for (const c of coordinates) {
    const x = Math.round(c?.snappedX ?? c?.x);
    const y = Math.round(c?.snappedY ?? c?.y);
    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    const rgb = hexToRgb(c?.color) || bg;
    for (let dy = 0; dy < scale; dy += 1) {
      for (let dx = 0; dx < scale; dx += 1) {
        const off = ((y * scale + dy) * outW + (x * scale + dx)) * 4;
        pixels[off] = rgb.r;
        pixels[off + 1] = rgb.g;
        pixels[off + 2] = rgb.b;
        pixels[off + 3] = 255;
      }
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(outW, 0);
  ihdr.writeUInt32BE(outH, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  const stride = outW * 4;
  const filtered = Buffer.alloc((stride + 1) * outH);
  for (let y = 0; y < outH; y += 1) {
    filtered[y * (stride + 1)] = 0;
    pixels.copy(filtered, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }

  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(filtered)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = args._[0];
  if (!inputPath) {
    console.error('Usage: node scripts/pixelbrain-import-sprite.mjs <sprite.png> [--id <asset-id>] [--out <dir>]');
    process.exit(1);
  }

  const name = basename(inputPath).replace(/\.1x\.png$|\.png$/i, '');
  const assetId = args.id || `${name}.imported.v1`;
  const outDir = resolve(args.out || dirname(resolve(inputPath)));
  mkdirSync(outDir, { recursive: true });

  const { data, info } = await sharp(readFileSync(inputPath))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const dimensions = { width: info.width, height: info.height };

  const coordinates = transcribeSourcePixelData(data, dimensions, { alphaThreshold: 128 });
  if (coordinates.length === 0) {
    console.error('No opaque pixels found — is the background transparent and the sprite 1×?');
    process.exit(1);
  }

  const canvas = { width: dimensions.width, height: dimensions.height, gridSize: 1 };
  const assetPacket = createPixelBrainAssetPacket({
    // No wall-clock importedAt: the packet id is stable-hashed from its
    // contents, so the same edited sprite must always produce the same id.
    source: {
      kind: 'hand-edited',
      id: assetId,
      label: `${name} (Aseprite import)`,
    },
    canvas,
    coordinates,
    palettes: [],
    formula: null,
    material: SOURCE_MATERIAL,
    chromatic: { transformId: SOURCE_MATERIAL },
    metadata: {
      tags: [name, 'hand-edited', 'aseprite-import'],
      compatibility: { pdr: 'pixelbrain-sketch-fill-hd', importer: 'pixelbrain-import-sprite.v1' },
    },
  });

  const godotArtifact = buildPixelBrainGodotExport({ canvas, palettes: [], coordinates, formula: null });

  const palette = [...new Set(coordinates.map((c) => c.color))];
  const diagnostics = {
    input: resolve(inputPath),
    dimensions,
    transcribedCells: coordinates.length,
    uniqueColors: palette.length,
    palette,
    assetPacketId: assetPacket.id,
  };

  writeFileSync(resolve(outDir, `${name}.json`), JSON.stringify(assetPacket, null, 2), 'utf8');
  writeFileSync(resolve(outDir, `${name}.pbrain`), godotArtifact, 'utf8');
  writeFileSync(resolve(outDir, `${name}.png`), renderPng(coordinates, canvas.width, canvas.height, 8));
  writeFileSync(
    resolve(outDir, `${name}.1x.png`),
    renderPng(coordinates, canvas.width, canvas.height, 1, { transparent: true }),
  );
  writeFileSync(resolve(outDir, `${name}.import.diagnostics.json`), JSON.stringify(diagnostics, null, 2), 'utf8');

  console.log('==================================================');
  console.log('  SPRITE IMPORTED INTO PIXELBRAIN');
  console.log('==================================================');
  console.log(`  source       : ${resolve(inputPath)}`);
  console.log(`  dimensions   : ${dimensions.width}×${dimensions.height}`);
  console.log(`  cells        : ${coordinates.length}`);
  console.log(`  colors       : ${palette.length}`);
  console.log(`  asset packet : ${assetPacket.id}`);
  console.log('--------------------------------------------------');
  console.log(`  → ${resolve(outDir, `${name}.json`)}`);
  console.log(`  → ${resolve(outDir, `${name}.pbrain`)}`);
  console.log(`  → ${resolve(outDir, `${name}.png`)}    (8× preview)`);
  console.log(`  → ${resolve(outDir, `${name}.1x.png`)} (normalized, ready for the next edit round)`);
  console.log(`  → ${resolve(outDir, `${name}.import.diagnostics.json`)}`);
  console.log('==================================================');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
