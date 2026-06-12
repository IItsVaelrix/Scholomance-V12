/* eslint-env node */
/**
 * Generate a high-definition sword asset through the PixelBrain pipeline.
 *
 * Pipeline:
 *   hand-painted silhouette (occupied cells, with a fuller groove)
 *     → sketchToSilhouette(bands=6, symmetry='vertical')   // auto-shade
 *     → fillTemplate(bytecode)                              // re-skin
 *     → buildSquareSharpnessContrastPayload(material)       // HD edge outline
 *     → buildPixelBrainGodotExport                          // .pbrain artifact
 *     → renderPng(scale)                                    // downloadable PNG
 *
 * Usage:
 *   node scripts/generate-pixelbrain-sword.mjs
 *
 * Outputs in output/pixelbrain/sword/:
 *   - sword.pbrain                godot-ready artifact
 *   - sword.json                  asset packet (source of truth)
 *   - sword.png                   rendered sprite (downloadable)
 *   - sword.preview.txt           ASCII silhouette
 *   - sword.preview.colored.ansi.txt   ANSI color visualization
 *   - sword.diagnostics.json      pipeline summary
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

import { sketchToSilhouette } from '../codex/core/pixelbrain/sketch-amp.js';
import { fillTemplate } from '../codex/core/pixelbrain/template-fill-bridge.js';
import { buildSquareSharpnessContrastPayload } from '../codex/core/pixelbrain/square-sharpness-contrast-amp.js';
import { createPixelBrainAssetPacket } from '../codex/core/pixelbrain/pixelbrain-asset-packet.js';
import { SOURCE_MATERIAL } from '../codex/core/pixelbrain/material-registry.js';
import { buildPixelBrainGodotExport } from '../src/lib/godot-export/pixelbrainGodotExport.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '..', 'output', 'pixelbrain', 'sword');
mkdirSync(OUT_DIR, { recursive: true });

const CANVAS = Object.freeze({ width: 32, height: 128, gridSize: 1 });
const BYTECODE = 'VW-ABJURATION-INEXPLICABLE-HARMONIC';
const HD_MATERIAL = 'icy_fire';
const BANDS = 8;

const CX = Math.floor(CANVAS.width / 2); // 16

// 32×128 layout: tip+blade (0-83) → crossguard (84-89) → grip (90-109) → pommel (110-127)
const CROSSGUARD_Y_START = 84;
const CROSSGUARD_Y_END = 89;
const POMMEL_Y_START = 110;

function bladeHalfWidth(y) {
  if (y < 0) return 0;
  if (y <= 1) return 0;        // 1-cell sharp tip
  if (y <= 3) return 1;        // 3 cells
  if (y <= 7) return 2;        // 5 cells
  if (y <= 13) return 3;       // 7 cells
  return 4;                    // 9 cells (wider blade body)
}

const POMMEL_PROFILE = Object.freeze({
  110: 2, 111: 3, 112: 4, 113: 5, 114: 5, 115: 5, 116: 5, 117: 5, 118: 5,
  119: 5, 120: 5, 121: 5, 122: 5, 123: 5, 124: 4, 125: 3, 126: 2, 127: 1,
});

function pommelHalfWidth(y) {
  return POMMEL_PROFILE[y] ?? 0;
}

function buildSwordSilhouette() {
  const occupied = [];
  const seen = new Set();

  const place = (x, y) => {
    if (x < 0 || x >= CANVAS.width || y < 0 || y >= CANVAS.height) return;
    const key = `${x},${y}`;
    if (seen.has(key)) return;
    seen.add(key);
    occupied.push({ x, y });
  };
  const unplace = (x, y) => {
    const key = `${x},${y}`;
    if (!seen.has(key)) return;
    seen.delete(key);
    const idx = occupied.findIndex((c) => c.x === x && c.y === y);
    if (idx >= 0) occupied.splice(idx, 1);
  };

  // TIP + BLADE with FULLER (groove) — drop the center column on the lower
  // 3/4 of the blade so the distance transform produces a dark slot=0 line
  // down the center, giving the blade its "fullered sword" read.
  for (let y = 0; y < CROSSGUARD_Y_START; y += 1) {
    const half = bladeHalfWidth(y);
    if (half === 0) {
      place(CX, y);
      continue;
    }
    for (let dx = -half; dx <= half; dx += 1) {
      place(CX + dx, y);
    }
    if (y >= 8 && half >= 2) {
      unplace(CX, y);
    }
  }

  // CROSSGUARD — beveled quillons: narrower top/bottom rows, full-width middle,
  // with a single-cell tip detail at the outermost quillon ends.
  for (let y = CROSSGUARD_Y_START; y <= CROSSGUARD_Y_END; y += 1) {
    const isEdgeRow = y === CROSSGUARD_Y_START || y === CROSSGUARD_Y_END;
    const xStart = isEdgeRow ? 4 : 2;
    const xEnd = isEdgeRow ? 27 : 29;
    for (let x = xStart; x <= xEnd; x += 1) place(x, y);
    if (!isEdgeRow) {
      place(1, y);
      place(30, y);
    }
  }

  // GRIP — clean uniform 3-cell column (no aggressive wrap), with a metal
  // guard ring at the top and a metal pommel-base ring at the bottom.
  for (let y = CROSSGUARD_Y_END + 1; y < POMMEL_Y_START; y += 1) {
    const rowOffset = y - (CROSSGUARD_Y_END + 1);
    const lastRowOffset = (POMMEL_Y_START - 1) - (CROSSGUARD_Y_END + 1);
    if (rowOffset < 2 || rowOffset > lastRowOffset - 2) {
      // Metal rings at the top (guard collar) and bottom (pommel base).
      for (let dx = -2; dx <= 2; dx += 1) place(CX + dx, y);
    } else {
      place(CX - 1, y);
      place(CX, y);
      place(CX + 1, y);
    }
  }

  // POMMEL — gem polygon.
  for (let y = POMMEL_Y_START; y < CANVAS.height; y += 1) {
    const half = pommelHalfWidth(y);
    for (let dx = -half; dx <= half; dx += 1) {
      place(CX + dx, y);
    }
  }

  return occupied;
}

function runPipeline() {
  const occupied = buildSwordSilhouette();

  const template = sketchToSilhouette(occupied, CANVAS, {
    bands: BANDS,
    symmetry: 'none',
  });

  const filled = fillTemplate(template, BYTECODE, { bands: template.bands });

  const sharpness = buildSquareSharpnessContrastPayload({
    coordinates: filled,
    material: HD_MATERIAL,
    canvas: CANVAS,
    options: {
      enabled: true,
      edgeContrast: 0.18,
      interiorContrast: 0.10,
    },
    intent: 'enhance_square_render_readability',
  });

  const polished = sharpness.outputCoordinates;

  const assetPacket = createPixelBrainAssetPacket({
    source: { kind: 'procedural', id: 'sword.hd.v1', label: 'HD Sword Asset' },
    canvas: CANVAS,
    coordinates: polished,
    palettes: [],
    formula: null,
    bytecode: BYTECODE,
    template: {
      gridType: 'sketch-template',
      fillState: {
        bytecode: BYTECODE,
        school: 'WILL',
        rarity: 'INEXPLICABLE',
        effect: 'TRANSCENDENT',
        source: 'procedural',
      },
    },
    material: SOURCE_MATERIAL,
    chromatic: { transformId: SOURCE_MATERIAL },
    metadata: {
      tags: ['sword', 'hd', 'legendary'],
      compatibility: { pdr: 'pixelbrain-sketch-fill-hd' },
    },
  });

  const godotArtifact = buildPixelBrainGodotExport({
    canvas: CANVAS,
    palettes: [],
    coordinates: polished,
    formula: null,
  });

  return { occupied, template, filled, sharpness, polished, assetPacket, godotArtifact };
}

function asciiPreview(coordinates, width, height) {
  const grid = Array.from({ length: height }, () => Array(width).fill(' '));
  for (const c of coordinates) {
    const x = Math.round(c?.snappedX ?? c?.x);
    const y = Math.round(c?.snappedY ?? c?.y);
    if (x >= 0 && x < width && y >= 0 && y < height) {
      grid[y][x] = '#';
    }
  }
  return grid.map((row) => row.join('')).join('\n');
}

function hexToRgb(hex) {
  const m = String(hex || '').trim().replace('#', '');
  if (m.length !== 6) return null;
  return { r: parseInt(m.slice(0, 2), 16), g: parseInt(m.slice(2, 4), 16), b: parseInt(m.slice(4, 6), 16) };
}

function rgbAnsiBg(rgb) {
  return `\x1b[48;2;${rgb.r};${rgb.g};${rgb.b}m`;
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
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lengthBuf, typeBuf, data, crcBuf]);
}

function renderPng(coordinates, width, height, scale = 8) {
  const bg = { r: 10, g: 10, b: 18 };
  const outW = width * scale;
  const outH = height * scale;
  const pixels = Buffer.alloc(outW * outH * 4);
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = bg.r; pixels[i + 1] = bg.g; pixels[i + 2] = bg.b; pixels[i + 3] = 255;
  }
  for (const c of coordinates) {
    const x = Math.round(c?.snappedX ?? c?.x);
    const y = Math.round(c?.snappedY ?? c?.y);
    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    const rgb = hexToRgb(c?.color) || bg;
    for (let dy = 0; dy < scale; dy += 1) {
      for (let dx = 0; dx < scale; dx += 1) {
        const px = x * scale + dx;
        const py = y * scale + dy;
        const off = (py * outW + px) * 4;
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
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // color type RGBA
  ihdr[10] = 0;  // compression
  ihdr[11] = 0;  // filter
  ihdr[12] = 0;  // interlace

  // Add a leading filter byte (0 = None) to each row.
  const stride = outW * 4;
  const filtered = Buffer.alloc((stride + 1) * outH);
  for (let y = 0; y < outH; y += 1) {
    filtered[y * (stride + 1)] = 0;
    pixels.copy(filtered, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(filtered);

  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function coloredAsciiPreview(coordinates, width, height) {
  const grid = Array.from({ length: height }, () => Array(width).fill(null));
  for (const c of coordinates) {
    const x = Math.round(c?.snappedX ?? c?.x);
    const y = Math.round(c?.snappedY ?? c?.y);
    if (x >= 0 && x < width && y >= 0 && y < height) {
      grid[y][x] = c?.color || '#000000';
    }
  }
  const RESET = '\x1b[0m';
  return grid.map((row) => {
    const cells = [];
    let last = null;
    for (const cell of row) {
      const rgb = cell ? hexToRgb(cell) : null;
      if (rgb && (!last || last.r !== rgb.r || last.g !== rgb.g || last.b !== rgb.b)) {
        cells.push(rgbAnsiBg(rgb));
        last = rgb;
      } else if (!rgb) {
        cells.push(RESET);
        cells.push(rgbAnsiBg({ r: 10, g: 10, b: 18 }));
        last = { r: 10, g: 10, b: 18 };
      }
      cells.push('  ');
    }
    cells.push(RESET);
    return cells.join('');
  }).join('\n');
}

function summarize(result) {
  const { template, filled, polished, sharpness, occupied } = result;
  return {
    silhouetteOccupied: occupied.length,
    templateCoordinates: template.coordinates.length,
    templateBands: template.bands,
    filledCoordinates: filled.length,
    sharpnessEnabled: sharpness.diagnostics?.enabled ?? null,
    sharpnessChangedCount: sharpness.diagnostics?.changedCount ?? 0,
    finalCoordinates: polished.length,
    bytecode: BYTECODE,
    material: HD_MATERIAL,
    canvas: CANVAS,
  };
}

function main() {
  const result = runPipeline();
  const summary = summarize(result);

  writeFileSync(
    resolve(OUT_DIR, 'sword.pbrain'),
    result.godotArtifact,
    'utf8',
  );
  writeFileSync(
    resolve(OUT_DIR, 'sword.png'),
    renderPng(result.polished, CANVAS.width, CANVAS.height, 8),
  );
  writeFileSync(
    resolve(OUT_DIR, 'sword@2x.png'),
    renderPng(result.polished, CANVAS.width, CANVAS.height, 4),
  );
  writeFileSync(
    resolve(OUT_DIR, 'sword.json'),
    JSON.stringify(result.assetPacket, null, 2),
    'utf8',
  );
  writeFileSync(
    resolve(OUT_DIR, 'sword.preview.txt'),
    asciiPreview(result.polished, CANVAS.width, CANVAS.height),
    'utf8',
  );
  writeFileSync(
    resolve(OUT_DIR, 'sword.preview.colored.ansi.txt'),
    coloredAsciiPreview(result.polished, CANVAS.width, CANVAS.height),
    'utf8',
  );
  writeFileSync(
    resolve(OUT_DIR, 'sword.diagnostics.json'),
    JSON.stringify(
      {
        summary,
        sharpnessMetadata: result.sharpness.metadata,
        sharpnessDiagnostics: result.sharpness.diagnostics,
      },
      null,
      2,
    ),
    'utf8',
  );

  console.log('==================================================');
  console.log('  HD SWORD ASSET GENERATED');
  console.log('==================================================');
  console.log(`  bytecode       : ${BYTECODE}`);
  console.log(`  material (HD)  : ${HD_MATERIAL}`);
  console.log(`  canvas         : ${CANVAS.width}×${CANVAS.height}`);
  console.log(`  bands          : ${BANDS}`);
  console.log(`  silhouette     : ${summary.silhouetteOccupied} cells`);
  console.log(`  template       : ${summary.templateCoordinates} cells, ${summary.templateBands} bands`);
  console.log(`  filled         : ${summary.filledCoordinates} cells`);
  console.log(`  HD recolor     : ${summary.sharpnessChangedCount} cells (edge outline via material anchors)`);
  console.log(`  final          : ${summary.finalCoordinates} cells`);
  console.log('--------------------------------------------------');
  console.log(`  → ${resolve(OUT_DIR, 'sword.pbrain')}`);
  console.log(`  → ${resolve(OUT_DIR, 'sword.png')}    (6× upscaled, ready to download)`);
  console.log(`  → ${resolve(OUT_DIR, 'sword.json')}`);
  console.log(`  → ${resolve(OUT_DIR, 'sword.preview.txt')}`);
  console.log(`  → ${resolve(OUT_DIR, 'sword.preview.colored.ansi.txt')}`);
  console.log(`  → ${resolve(OUT_DIR, 'sword.diagnostics.json')}`);
  console.log('==================================================');
  console.log('\nSilhouette preview:\n');
  console.log(asciiPreview(result.polished, CANVAS.width, CANVAS.height));
  console.log('\nColored HD preview (ANSI):\n');
  console.log(coloredAsciiPreview(result.polished, CANVAS.width, CANVAS.height));
  console.log('\x1b[0m');
}

main();
