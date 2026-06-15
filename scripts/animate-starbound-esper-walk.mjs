import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { deflateSync } from 'node:zlib';
import { decodeAsepriteBinary, encodeAsepriteBinary } from '../codex/core/pixelbrain/aseprite-binary-codec.js';

function parseHex(hex) {
  const safe = String(hex || '#FFFFFF').replace('#', '').padEnd(6, '0');
  return {
    r: parseInt(safe.slice(0, 2), 16),
    g: parseInt(safe.slice(2, 4), 16),
    b: parseInt(safe.slice(4, 6), 16),
  };
}

function toHex(r, g, b) {
  return `#${[r, g, b].map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

function darken(hex, amount = 20) {
  const rgb = parseHex(hex);
  return toHex(rgb.r - amount, rgb.g - amount, rgb.b - amount);
}

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

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lengthBuf = Buffer.alloc(4);
  lengthBuf.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lengthBuf, typeBuf, data, crcBuf]);
}

function renderPngTransparent(coordinates, width, height, scale = 1) {
  const outW = width * scale;
  const outH = height * scale;
  const pixels = Buffer.alloc(outW * outH * 4);
  
  // Keep background transparent
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = 0; pixels[i + 1] = 0; pixels[i + 2] = 0; pixels[i + 3] = 0;
  }
  
  // Sort coordinates by z-index or order if available, but Aseprite cells are usually ordered
  for (const c of coordinates) {
    const x = Math.round(c.snappedX ?? c.x);
    const y = Math.round(c.snappedY ?? c.y);
    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    const hex = String(c.color || '').trim();
    const m = hex.replace('#', '');
    if (m.length !== 6) continue;
    const r = parseInt(m.slice(0, 2), 16);
    const g = parseInt(m.slice(2, 4), 16);
    const b = parseInt(m.slice(4, 6), 16);
    
    // Check alpha if it's there
    let alpha = 255;
    if (c.alpha !== undefined) alpha = c.alpha * 255;
    
    if (alpha <= 0) continue;

    for (let dy = 0; dy < scale; dy += 1) {
      for (let dx = 0; dx < scale; dx += 1) {
        const off = ((y * scale + dy) * outW + (x * scale + dx)) * 4;
        pixels[off] = r; pixels[off + 1] = g; pixels[off + 2] = b; pixels[off + 3] = alpha;
      }
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(outW, 0);
  ihdr.writeUInt32BE(outH, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const stride = outW * 4;
  const filtered = Buffer.alloc((stride + 1) * outH);
  for (let y = 0; y < outH; y += 1) {
    filtered[y * (stride + 1)] = 0;
    pixels.copy(filtered, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(filtered);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const IN_PATH = resolve('output/foundry/starbound-esper-chibi/starbound-esper-chibi.aseprite');
const OUT_PATH_ASE = resolve('output/foundry/starbound-esper-chibi/starbound-esper-chibi-walk-east.aseprite');
const OUT_PATH_PNG = resolve('public/starbound-esper-chibi-walk-east.png');

console.log('Decoding idle Aseprite...');
const payload = decodeAsepriteBinary(new Uint8Array(readFileSync(IN_PATH)));
const baseLayers = payload.frames[0].layers;

const eastLayers = baseLayers.map(layer => {
  return {
    name: layer.name,
    cells: layer.cells
      .filter(c => c.x >= 32 && c.x < 64)
      .map(c => ({ ...c, x: c.x - 32 }))
  };
});

console.log('Generating 4-frame walk cycle as a Spritesheet (1 frame, 128x48)...');
const CENTER_X = 15;
const mergedLayers = [];
const flatCoords = [];

for (const layer of eastLayers) {
  const isLegLayer = layer.name === 'bottom' || layer.name === 'shoes';
  const isArmLayer = layer.name === 'top';
  
  const allCellsForLayer = [];
  
  for (let frameIndex = 0; frameIndex < 4; frameIndex++) {
    const offsetX = frameIndex * 32;
    
    for (const cell of layer.cells) {
      const c = { ...cell };
      const isBack = c.x < CENTER_X;
      
      if (isLegLayer) {
        if (frameIndex === 0) { 
          c.x += isBack ? -2 : 2; 
          if (isBack) c.color = darken(c.color, 40);
        } else if (frameIndex === 1) { 
          c.y += 1;
          c.x += isBack ? -1 : 1; 
          if (isBack) {
            c.color = darken(c.color, 40);
            c.y -= 1; 
          }
        } else if (frameIndex === 2) { 
          c.x += isBack ? 1 : -1;
          if (isBack) c.color = darken(c.color, 40);
        } else if (frameIndex === 3) { 
          c.y -= 1;
          c.x += isBack ? 2 : -2; 
          if (isBack) c.color = darken(c.color, 40);
        }
      } else {
        if (frameIndex === 1) c.y += 1;
        if (frameIndex === 3) c.y -= 1;
        
        if (isArmLayer && c.y > 20) { 
          if (frameIndex === 0) c.x += isBack ? 1 : -1; 
          if (frameIndex === 1) c.x += isBack ? 0 : 0;
          if (frameIndex === 2) c.x += isBack ? -1 : 1;
          if (frameIndex === 3) c.x += isBack ? -2 : 2;
          if (isBack) c.color = darken(c.color, 20);
        }
      }
      
      c.x += offsetX;
      allCellsForLayer.push(c);
      flatCoords.push({ x: c.x, y: c.y, color: c.color, alpha: c.alpha ?? 1 });
    }
  }
  
  mergedLayers.push({ name: layer.name, cells: allCellsForLayer });
}

payload.frames = [{ frame: 0, duration: 150, layers: mergedLayers }];
payload.width = 128; 

const binary = encodeAsepriteBinary(payload);
writeFileSync(OUT_PATH_ASE, binary);
console.log(`Saved walk cycle spritesheet to ${OUT_PATH_ASE}`);

const pngBinary = renderPngTransparent(flatCoords, 128, 48, 1);
writeFileSync(OUT_PATH_PNG, pngBinary);
console.log(`Saved walk cycle PNG to ${OUT_PATH_PNG}`);
