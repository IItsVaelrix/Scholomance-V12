import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '..', 'godot_project', 'assets', 'inventory');
mkdirSync(OUT_DIR, { recursive: true });

const SIZE = 64;

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

function renderIcon(pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(SIZE, 0);
  ihdr.writeUInt32BE(SIZE, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const stride = SIZE * 4;
  const filtered = Buffer.alloc((stride + 1) * SIZE);
  for (let y = 0; y < SIZE; y += 1) {
    filtered[y * (stride + 1)] = 0;
    pixels.copy(filtered, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(filtered);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function setPx(px, x, y, r, g, b, a = 255) {
  if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return;
  const i = (y * SIZE + x) * 4;
  px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = a;
}

function blend(px, x, y, r, g, b, a) {
  if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return;
  const i = (y * SIZE + x) * 4;
  const da = px[i + 3] / 255;
  const sa = a / 255;
  const oa = sa + da * (1 - sa);
  if (oa <= 0) return;
  px[i]     = Math.round((r * sa + px[i]     * da * (1 - sa)) / oa);
  px[i + 1] = Math.round((g * sa + px[i + 1] * da * (1 - sa)) / oa);
  px[i + 2] = Math.round((b * sa + px[i + 2] * da * (1 - sa)) / oa);
  px[i + 3] = Math.round(oa * 255);
}

function fillRect(px, x0, y0, w, h, r, g, b, a = 255) {
  for (let y = y0; y < y0 + h; y += 1)
    for (let x = x0; x < x0 + w; x += 1)
      setPx(px, x, y, r, g, b, a);
}

function fillEllipse(px, cx, cy, rx, ry, r, g, b, a = 255) {
  for (let y = -ry; y <= ry; y += 1)
    for (let x = -rx; x <= rx; x += 1) {
      const nx = x / rx, ny = y / ry;
      if (nx * nx + ny * ny <= 1) blend(px, cx + x, cy + y, r, g, b, a);
    }
}

function drawTorch(px) {
  // Wooden stick (lower 60%)
  for (let y = 30; y < 62; y += 1) {
    const wobble = (y % 2 === 0) ? 0 : 1;
    fillRect(px, 30 + wobble, y, 4, 1, 90, 60, 36);
  }
  // Glow halo
  fillEllipse(px, 32, 24, 18, 20, 255, 170, 60, 90);
  fillEllipse(px, 32, 22, 13, 16, 255, 200, 80, 200);
  // Flame core
  fillEllipse(px, 32, 20, 6, 11, 255, 230, 120, 255);
  fillEllipse(px, 32, 18, 3, 7, 255, 245, 200, 255);
}

function drawStick(px) {
  // Diagonal wooden rod
  for (let i = 0; i < 50; i += 1) {
    const x = 8 + i;
    const y = 8 + i;
    setPx(px, x, y, 120, 84, 48);
    setPx(px, x + 1, y, 120, 84, 48);
    setPx(px, x, y + 1, 90, 60, 32);
    setPx(px, x + 1, y + 1, 90, 60, 32);
  }
  // Bark knots
  fillEllipse(px, 22, 22, 2, 2, 60, 36, 18);
  fillEllipse(px, 42, 42, 2, 2, 60, 36, 18);
}

function drawSword(px) {
  // Blade (vertical) — icy cyan with brighter edge
  fillRect(px, 28, 8, 8, 36, 168, 232, 250);
  fillRect(px, 26, 8, 2, 36, 96, 196, 232);
  fillRect(px, 36, 8, 2, 36, 96, 196, 232);
  // Tip
  for (let i = 0; i < 8; i += 1) {
    setPx(px, 30 + Math.floor(i / 2), 8 - i, 220, 248, 255);
    setPx(px, 31 + Math.floor(i / 2), 8 - i, 220, 248, 255);
  }
  // Fuller (groove)
  fillRect(px, 31, 16, 2, 22, 110, 200, 232);
  // Crossguard
  fillRect(px, 18, 44, 28, 5, 200, 168, 84);
  fillRect(px, 18, 49, 28, 2, 130, 100, 36);
  fillEllipse(px, 18, 46, 2, 2, 240, 210, 130);
  fillEllipse(px, 46, 46, 2, 2, 240, 210, 130);
  // Grip
  fillRect(px, 30, 51, 4, 8, 80, 50, 28);
  // Pommel
  fillEllipse(px, 32, 60, 5, 4, 220, 184, 92);
  fillEllipse(px, 32, 60, 3, 2, 250, 220, 140);
}

function makeIcon(draw) {
  const px = Buffer.alloc(SIZE * SIZE * 4);
  for (let i = 0; i < px.length; i += 4) {
    px[i] = 12; px[i + 1] = 14; px[i + 2] = 22; px[i + 3] = 255;
  }
  draw(px);
  return renderIcon(px);
}

writeFileSync(resolve(OUT_DIR, 'torch_icon.png'), makeIcon(drawTorch));
writeFileSync(resolve(OUT_DIR, 'stick_icon.png'), makeIcon(drawStick));
writeFileSync(resolve(OUT_DIR, 'sword_icon.png'), makeIcon(drawSword));

console.log('Wrote torch_icon.png, stick_icon.png, sword_icon.png to', OUT_DIR);