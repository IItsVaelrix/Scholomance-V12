/**
 * SCDL Exporters
 *
 * Dispatcher and implementations for SCDL export targets:
 *   - json   → raw PixelBrainAssetPacket JSON string
 *   - svg    → SVG with one <rect> per coordinate
 *   - phaser → Phaser texture config JSON
 *   - png    → deterministic RGBA PNG bytes
 */

import { emitLattice } from './scdl.lattice-emitter.js';

/**
 * Export a compiled asset to one or more targets.
 *
 * @param {object} packet  - PixelBrainAssetPacket
 * @param {string[]} targets - e.g. ['json', 'svg', 'phaser']
 * @param {object} [ast]   - Optional: original SCDL AST
 * @returns {Record<string, {ok:boolean, output:string|object, mimeType:string}>}
 */
export function exportSCDL(packet, targets, ast) {
  const lattice = emitLattice(packet, ast);
  const results = {};

  for (const target of targets) {
    switch (target) {
      case 'json':   results[target] = exportJSON(packet);    break;
      case 'svg':    results[target] = exportSVG(lattice);    break;
      case 'phaser': results[target] = exportPhaser(lattice); break;
      case 'png':    results[target] = exportPNG(lattice);    break;
      default:
        results[target] = {
          ok: false,
          output: `Unknown export target '${target}'`,
          mimeType: 'text/plain',
        };
    }
  }

  return results;
}

// ─── JSON ─────────────────────────────────────────────────────────────────────

function exportJSON(packet) {
  return {
    ok:       true,
    output:   JSON.stringify(packet, null, 2),
    mimeType: 'application/json',
  };
}

// ─── SVG ──────────────────────────────────────────────────────────────────────

function exportSVG(lattice) {
  const { width, height } = lattice.canvas;
  const coords = lattice.geometry.coordinates;

  // Deduplicate by (x,y) — last write wins (mirrors are on top)
  const pixelMap = new Map();
  for (const c of coords) {
    pixelMap.set(`${c.x},${c.y}`, c.color);
  }

  const rects = [];
  for (const [key, color] of pixelMap) {
    const [x, y] = key.split(',').map(Number);
    rects.push(`  <rect x="${x}" y="${y}" width="1" height="1" fill="${color}"/>`);
  }

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges">`,
    ...rects,
    `</svg>`,
  ].join('\n');

  return {
    ok:       true,
    output:   svg,
    mimeType: 'image/svg+xml',
  };
}

// ─── Phaser ───────────────────────────────────────────────────────────────────

/**
 * Phaser texture config.
 * Colors are 32-bit integers (r<<16 | g<<8 | b) for direct Phaser
 * `Graphics.fillStyle(color)` consumption.
 */
function exportPhaser(lattice) {
  const { width, height } = lattice.canvas;
  const coords = lattice.geometry.coordinates;

  const pixels = [];
  const seen = new Map();

  for (const c of coords) {
    const key = `${c.x},${c.y}`;
    seen.set(key, {
      x:     c.x,
      y:     c.y,
      color: _hexToInt(c.color),
    });
  }

  for (const entry of seen.values()) pixels.push(entry);

  // Build integer palette
  const paletteInts = {};
  for (const [name, hex] of Object.entries(lattice._paletteMap || {})) {
    paletteInts[name] = _hexToInt(hex);
  }

  const config = {
    type:    'scdl-phaser-v1',
    key:     lattice.source?.id || 'scdl-asset',
    assetId: lattice.id,
    canvas:  { width, height },
    pixels,
    palette: paletteInts,
    parts:   (lattice.parts || []).map(p => ({
      id:       p.id,
      material: p.material,
    })),
    intentOps: (lattice.parts || []).flatMap(p => p.intentOps || []),
  };

  return {
    ok:       true,
    output:   JSON.stringify(config, null, 2),
    mimeType: 'application/json',
  };
}

// ─── PNG ─────────────────────────────────────────────────────────────────────

function exportPNG(lattice) {
  return {
    ok:       true,
    output:   renderPngBytes(lattice.geometry.coordinates, lattice.canvas.width, lattice.canvas.height),
    mimeType: 'image/png',
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function _hexToInt(hex) {
  const raw = String(hex || '#000000').replace('#', '');
  const normalized = raw.length === 3
    ? raw.split('').map(c => c + c).join('')
    : raw;
  return parseInt(normalized.padEnd(6, '0'), 16) || 0;
}

function _hexToRgb(hex) {
  const raw = String(hex || '').trim().replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) return null;
  const value = parseInt(raw, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function renderPngBytes(coordinates, width, height) {
  const w = Math.max(1, Math.round(Number(width) || 1));
  const h = Math.max(1, Math.round(Number(height) || 1));
  const rgba = new Uint8Array(w * h * 4);

  for (const c of coordinates || []) {
    const x = Math.round(c?.x ?? c?.snappedX ?? -1);
    const y = Math.round(c?.y ?? c?.snappedY ?? -1);
    if (x < 0 || x >= w || y < 0 || y >= h) continue;
    const rgb = _hexToRgb(c?.color);
    if (!rgb) continue;
    const off = (y * w + x) * 4;
    rgba[off] = rgb.r;
    rgba[off + 1] = rgb.g;
    rgba[off + 2] = rgb.b;
    rgba[off + 3] = 255;
  }

  return encodePng(w, h, rgba);
}

function encodePng(width, height, rgba) {
  const ihdr = new Uint8Array(13);
  writeU32BE(ihdr, 0, width);
  writeU32BE(ihdr, 4, height);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const stride = width * 4;
  const filtered = new Uint8Array((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    filtered[y * (stride + 1)] = 0;
    filtered.set(rgba.subarray(y * stride, y * stride + stride), y * (stride + 1) + 1);
  }

  return concatBytes([
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlibStore(filtered)),
    pngChunk('IEND', new Uint8Array(0)),
  ]);
}

function zlibStore(data) {
  const blocks = [];
  for (let offset = 0; offset < data.length; offset += 65535) {
    const chunk = data.subarray(offset, Math.min(offset + 65535, data.length));
    const block = new Uint8Array(5 + chunk.length);
    block[0] = offset + chunk.length >= data.length ? 1 : 0;
    writeU16LE(block, 1, chunk.length);
    writeU16LE(block, 3, (~chunk.length) & 0xffff);
    block.set(chunk, 5);
    blocks.push(block);
  }

  const checksum = new Uint8Array(4);
  writeU32BE(checksum, 0, adler32(data));
  return concatBytes([new Uint8Array([0x78, 0x01]), ...blocks, checksum]);
}

function pngChunk(type, data) {
  const typeBytes = asciiBytes(type);
  const lengthBytes = new Uint8Array(4);
  writeU32BE(lengthBytes, 0, data.length);
  const crcBytes = new Uint8Array(4);
  writeU32BE(crcBytes, 0, crc32(concatBytes([typeBytes, data])));
  return concatBytes([lengthBytes, typeBytes, data, crcBytes]);
}

function concatBytes(chunks) {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

function asciiBytes(value) {
  const out = new Uint8Array(value.length);
  for (let i = 0; i < value.length; i += 1) out[i] = value.charCodeAt(i) & 0xff;
  return out;
}

function writeU16LE(target, offset, value) {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
}

function writeU32BE(target, offset, value) {
  target[offset] = (value >>> 24) & 0xff;
  target[offset + 1] = (value >>> 16) & 0xff;
  target[offset + 2] = (value >>> 8) & 0xff;
  target[offset + 3] = value & 0xff;
}

function adler32(data) {
  let a = 1;
  let b = 0;
  for (const byte of data) {
    a = (a + byte) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

function crc32(data) {
  let c = 0xffffffff;
  for (const byte of data) {
    c ^= byte;
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}
