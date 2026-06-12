/* eslint-env node */
/**
 * Generate a high-definition demonic AMULET asset through the PixelBrain pipeline.
 *
 * Structure (radial, ~8-fold symmetry):
 *   - top ring (halo) at (cx, top)
 *   - 8 curved spikes radiating from the body (N, NE, E, SE, S, SW, W, NW)
 *   - central diamond gem (the largest contiguous "deep" region)
 *   - 2 pairs of secondary "horn" curves (between the cardinal spikes)
 *
 * Pipeline (same as the sword, but radial silhouette + glow palette):
 *   hand-painted silhouette (polar layout)
 *     → sketchToSilhouette(bands=8)                         // auto-shade
 *     → fillTemplate(bytecode)                              // red glow palette
 *     → buildSquareSharpnessContrastPayload(material)       // dark metal edges
 *     → buildPixelBrainGodotExport                          // .pbrain artifact
 *     → renderPng(scale)                                    // downloadable PNG
 *
 * Usage:
 *   node scripts/generate-pixelbrain-amulet.mjs
 *
 * Outputs in output/pixelbrain/amulet/:
 *   - amulet.pbrain, amulet.json, amulet.png, amulet.preview.txt, etc.
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
import { createShaderPacket, validateShaderPacket } from '../codex/core/pixelbrain/shader-packet.js';
import { exportToGodotShader as exportGodotShaderPacket } from '../src/lib/exporters/pixelbrainGodotShaderExport.js';
import { exportToPhaserPipeline as exportPhaserPipeline } from '../src/lib/exporters/pixelbrainPhaserShaderExport.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '..', 'output', 'pixelbrain', 'amulet');
mkdirSync(OUT_DIR, { recursive: true });

const CANVAS = Object.freeze({ width: 96, height: 96, gridSize: 1 });
const BYTECODE = 'VW-WILL-INEXPLICABLE-TRANSCENDENT';
const HD_MATERIAL = 'shadow_fire';
const BANDS = 8;
const CX = Math.floor(CANVAS.width / 2);
const CY = Math.floor(CANVAS.height / 2);

// --- Geometry parameters (radial, in canvas cells) -------------------------

const BODY_RX = 26;             // central body horizontal radius
const BODY_RY = 28;             // central body vertical radius (taller than wide)
const SPIKE_TIP_RADIUS = 44;    // how far the 8 main spikes reach
const SPIKE_BASE_RADIUS = 22;   // where the spikes widen out of the body
const HORN_TIP_RADIUS = 38;     // the secondary "horns" reach a bit less
const HORN_BASE_RADIUS = 20;    // horns start at the body edge

// 8 main spikes (N, NE, E, SE, S, SW, W, NW). Top is y=0, so angle is
// measured from the negative-y direction clockwise.
const SPIKE_ANGLES = Object.freeze([
  -Math.PI / 2,        // N
  -Math.PI / 4,        // NE
  0,                   // E
   Math.PI / 4,        // SE
   Math.PI / 2,        // S
   3 * Math.PI / 4,    // SW
   Math.PI,            // W
  -3 * Math.PI / 4,    // NW
]);

// 4 secondary horns between the cardinal spikes.
const HORN_ANGLES = Object.freeze([
  -3 * Math.PI / 8,    // between N and NE
   Math.PI / 8,        // between E and SE
   5 * Math.PI / 8,    // between S and SW
  -7 * Math.PI / 8,    // between W and NW
]);

const RING_CY = 14;             // top ring center
const RING_RADIUS_OUTER = 11;   // outer rim of the halo
const RING_RADIUS_INNER = 8;    // inner edge of the halo
const TOP_SPIRE_TIP = 4;        // y of the topmost spire tip
const BOTTOM_SPIRE_TIP = 90;    // y of the bottom-most spire tip

// --- Drawing primitives ----------------------------------------------------

function placeAll(seen, occupied, candidates) {
  for (const c of candidates) {
    if (!c) continue;
    const { x, y } = c;
    if (x < 0 || x >= CANVAS.width || y < 0 || y >= CANVAS.height) continue;
    const key = `${x},${y}`;
    if (seen.has(key)) continue;
    seen.add(key);
    occupied.push({ x, y });
  }
}

function lineCells(x0, y0, x1, y1) {
  const cells = [];
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    cells.push({ x, y });
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
  return cells;
}

function thickLine(x0, y0, x1, y1, thickness) {
  const base = lineCells(x0, y0, x1, y1);
  if (thickness <= 1) return base;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.max(1, Math.hypot(dx, dy));
  const nx = -dy / len;
  const ny = dx / len;
  const out = [];
  for (const c of base) {
    for (let k = -(thickness - 1); k <= thickness - 1; k += 1) {
      out.push({ x: Math.round(c.x + nx * k), y: Math.round(c.y + ny * k) });
    }
  }
  return out;
}

function circleCells(cx, cy, radius, innerRadius = 0) {
  const cells = [];
  for (let y = Math.round(cy - radius); y <= Math.round(cy + radius); y += 1) {
    for (let x = Math.round(cx - radius); x <= Math.round(cx + radius); x += 1) {
      const d = Math.hypot(x - cx, y - cy);
      if (d <= radius && d >= innerRadius) cells.push({ x, y });
    }
  }
  return cells;
}

function ellipseCells(cx, cy, rx, ry) {
  const cells = [];
  for (let y = Math.round(cy - ry); y <= Math.round(cy + ry); y += 1) {
    for (let x = Math.round(cx - rx); x <= Math.round(cx + rx); x += 1) {
      const d = Math.hypot((x - cx) / Math.max(1, rx), (y - cy) / Math.max(1, ry));
      if (d <= 1) cells.push({ x, y });
    }
  }
  return cells;
}

// A solid triangle spike from a base arc to a sharp tip.
function spike(angle, baseR, tipR, halfAngleBase) {
  // Three vertices: two on the base arc, one at the tip. All rounded to
  // integers so the Bresenham `===` termination check actually fires.
  const tipX = Math.round(CX + Math.cos(angle) * tipR);
  const tipY = Math.round(CY + Math.sin(angle) * tipR);
  const leftX = Math.round(CX + Math.cos(angle - halfAngleBase) * baseR);
  const leftY = Math.round(CY + Math.sin(angle - halfAngleBase) * baseR);
  const rightX = Math.round(CX + Math.cos(angle + halfAngleBase) * baseR);
  const rightY = Math.round(CY + Math.sin(angle + halfAngleBase) * baseR);
  const cells = [];
  cells.push(...lineCells(leftX, leftY, tipX, tipY));
  cells.push(...lineCells(rightX, rightY, tipX, tipY));
  cells.push(...lineCells(leftX, leftY, rightX, rightY));
  // Fill the triangle with a quick scanline fill
  const ys = [leftY, rightY, tipY];
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  for (let y = yMin; y <= yMax; y += 1) {
    const xs = [];
    for (const [ax, ay, bx, by] of [[leftX, leftY, tipX, tipY], [rightX, rightY, tipX, tipY], [leftX, leftY, rightX, rightY]]) {
      if ((ay <= y && by > y) || (by <= y && ay > y)) {
        const t = (y - ay) / (by - ay);
        xs.push(ax + t * (bx - ax));
      }
    }
    if (xs.length >= 2) {
      const xL = Math.min(...xs);
      const xR = Math.max(...xs);
      for (let x = Math.ceil(xL); x <= Math.floor(xR); x += 1) {
        cells.push({ x, y });
      }
    }
  }
  return cells;
}

// --- Build the amulet silhouette -------------------------------------------

function buildAmuletSilhouette() {
  const seen = new Set();
  const occupied = [];

  // 1. SOLID central body — a filled ellipse. The chamfer distance transform
  //    will create a bright gem in the center and dark metal at the rim.
  placeAll(seen, occupied, ellipseCells(CX, CY, BODY_RX, BODY_RY));

  // 2. 8 main spikes — solid triangles radiating from the body.
  for (const angle of SPIKE_ANGLES) {
    placeAll(seen, occupied, spike(angle, SPIKE_BASE_RADIUS, SPIKE_TIP_RADIUS, 0.18));
  }

  // 3. 4 secondary horns between the cardinal spikes, slightly shorter.
  for (const angle of HORN_ANGLES) {
    placeAll(seen, occupied, spike(angle, HORN_BASE_RADIUS, HORN_TIP_RADIUS, 0.14));
  }

  // 4. Top ring (halo) — a hollow circle above the body, with a thick spire
  //    bridging it to the body and a thin spire rising above.
  placeAll(seen, occupied, circleCells(CX, RING_CY, RING_RADIUS_OUTER, RING_RADIUS_INNER));
  // Bridge from ring to body
  placeAll(seen, occupied, thickLine(CX, RING_CY + RING_RADIUS_OUTER, CX, CY - BODY_RY + 1, 3));
  // Top spire above the ring
  placeAll(seen, occupied, thickLine(CX, RING_CY - RING_RADIUS_OUTER, CX, TOP_SPIRE_TIP, 1));

  // 5. Bottom spire (no ring, just a downward dagger).
  placeAll(seen, occupied, thickLine(CX, CY + BODY_RY - 1, CX, BOTTOM_SPIRE_TIP, 1));

  return occupied;
}

// --- PNG renderer (same zero-dep encoder as the sword) ---------------------

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

function hexToRgb(hex) {
  const m = String(hex || '').trim().replace('#', '');
  if (m.length !== 6) return null;
  return { r: parseInt(m.slice(0, 2), 16), g: parseInt(m.slice(2, 4), 16), b: parseInt(m.slice(4, 6), 16) };
}

function renderPng(coordinates, width, height, scale = 4) {
  const bg = { r: 8, g: 8, b: 16 };
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
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
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

// CPU-side preview of the GLSL pbMain — mirrors the math so the user can
// see what the procedural glow looks like at a frozen time t.
function renderGlowPreview(time, scale = 4) {
  const W = 96, H = 96;
  const outW = W * scale, outH = H * scale;
  const pixels = Buffer.alloc(outW * outH * 4);
  const TWO_PI = Math.PI * 2;
  for (let py = 0; py < outH; py += 1) {
    for (let px = 0; px < outW; px += 1) {
      const uvx = px / outW;
      const uvy = py / outH;
      const dx = uvx - 0.5;
      const dy = uvy - 0.5;
      const dist = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      const oct = ((angle + Math.PI / 8) % (TWO_PI / 4) + TWO_PI / 4) % (TWO_PI / 4);
      const armPulse = Math.sin(oct * 8 - time * 3) * 0.5 + 0.5;
      const ringDist = Math.hypot(uvx - 0.5, uvy - 0.13);
      const ring = Math.max(0, Math.min(1, (0.13 - ringDist) / 0.03)) * Math.max(0, Math.min(1, (ringDist - 0.07) / 0.03));
      const spikeAngle = ((angle + Math.PI / 8) % (TWO_PI / 8) + TWO_PI / 8) % (TWO_PI / 8);
      const spikeWidth = Math.abs(spikeAngle - Math.PI / 8);
      const spikeShape = Math.max(0, Math.min(1, (0.18 - spikeWidth) / 0.18));
      const spikeAmt = spikeShape * Math.max(0, Math.min(1, (0.48 - dist) / 0.30)) * Math.max(0, Math.min(1, dist / 0.10));
      const hornAngle = ((angle + Math.PI / 16) % (TWO_PI / 4) + TWO_PI / 4) % (TWO_PI / 4);
      const hornWidth = Math.abs(hornAngle - Math.PI / 4);
      const hornShape = Math.max(0, Math.min(1, (0.14 - hornWidth) / 0.14));
      const horn = hornShape * Math.max(0, Math.min(1, (0.45 - dist) / 0.27)) * Math.max(0, Math.min(1, dist / 0.10)) * 0.6;
      const bodyRing = Math.max(0, Math.min(1, (0.34 - dist) / 0.04)) * Math.max(0, Math.min(1, (dist - 0.20) / 0.04));
      const body = bodyRing * 0.45;
      const gem = Math.max(0, Math.min(1, (0.18 - dist) / 0.08));
      const crack = Math.max(0, Math.pow(Math.sin(angle * 11 + time * 1.4) * 0.5 + 0.5, 6)) * Math.max(0, Math.min(1, (0.34 - dist) / 0.24)) * 0.8;
      const darkMetal = [0.04, 0.0, 0.02];
      const redDim = [0.55, 0.06, 0.04];
      const redHot = [1.0, 0.18, 0.10];
      const whiteHot = [1.0, 0.85, 0.70];
      let r = darkMetal[0], g = darkMetal[1], b = darkMetal[2];
      r += redDim[0] * body; g += redDim[1] * body; b += redDim[2] * body;
      r += redHot[0] * spikeAmt * (0.6 + 0.4 * armPulse); g += redHot[1] * spikeAmt * (0.6 + 0.4 * armPulse); b += redHot[2] * spikeAmt * (0.6 + 0.4 * armPulse);
      r += redHot[0] * horn * (0.5 + 0.5 * armPulse); g += redHot[1] * horn * (0.5 + 0.5 * armPulse); b += redHot[2] * horn * (0.5 + 0.5 * armPulse);
      r += redHot[0] * crack; g += redHot[1] * crack; b += redHot[2] * crack;
      r += whiteHot[0] * gem * (0.65 + 0.35 * Math.sin(time * 4)); g += whiteHot[1] * gem * (0.65 + 0.35 * Math.sin(time * 4)); b += whiteHot[2] * gem * (0.65 + 0.35 * Math.sin(time * 4));
      r += redHot[0] * ring * (0.7 + 0.3 * Math.sin(time * 2)); g += redHot[1] * ring * (0.7 + 0.3 * Math.sin(time * 2)); b += redHot[2] * ring * (0.7 + 0.3 * Math.sin(time * 2));
      const topSpire = Math.max(0, Math.min(1, (0.06 - dist) / 0.06)) * Math.max(0, Math.min(1, (-dy - 0.0) / 0.20));
      const botSpire = Math.max(0, Math.min(1, (0.06 - dist) / 0.06)) * Math.max(0, Math.min(1, (dy - 0.0) / 0.20));
      r += redHot[0] * topSpire * 0.7; g += redHot[1] * topSpire * 0.7; b += redHot[2] * topSpire * 0.7;
      r += redHot[0] * botSpire * 0.5; g += redHot[1] * botSpire * 0.5; b += redHot[2] * botSpire * 0.5;
      let alpha = Math.max(body * 1.4, Math.max(spikeAmt, Math.max(horn, gem)));
      alpha = Math.max(alpha, Math.max(ring * 1.2, crack * 1.3));
      alpha = Math.max(alpha, Math.max(topSpire, botSpire));
      alpha = Math.max(0, Math.min(1, alpha));
      const bgR = 8, bgG = 8, bgB = 16;
      const finalR = bgR * (1 - alpha) + Math.min(1, r) * 255 * alpha;
      const finalG = bgG * (1 - alpha) + Math.min(1, g) * 255 * alpha;
      const finalB = bgB * (1 - alpha) + Math.min(1, b) * 255 * alpha;
      const off = (py * outW + px) * 4;
      pixels[off] = finalR; pixels[off + 1] = finalG; pixels[off + 2] = finalB; pixels[off + 3] = 255;
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
    PNG_SIGNATURE,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function asciiPreview(coordinates, width, height) {
  const grid = Array.from({ length: height }, () => Array(width).fill(' '));
  for (const c of coordinates) {
    const x = Math.round(c?.snappedX ?? c?.x);
    const y = Math.round(c?.snappedY ?? c?.y);
    if (x >= 0 && x < width && y >= 0 && y < height) grid[y][x] = '#';
  }
  return grid.map((row) => row.join('')).join('\n');
}

// --- Custom GLSL glow shader (procedural, exports to Godot .gdshader) -------

const AMULET_GLOW_GLSL = `vec4 pbMain(vec2 uv, float time, float resonance) {
  vec2 center = vec2(0.5, 0.5);
  vec2 d = uv - center;
  float dist = length(d);
  float angle = atan(d.y, d.x);

  // 8-fold radial pulse
  float oct = mod(angle + 3.14159 / 8.0, 6.28318 / 4.0);
  float armPulse = sin(oct * 8.0 - time * 3.0) * 0.5 + 0.5;

  // Top halo ring
  vec2 ringCenter = vec2(0.5, 0.13);
  float ringDist = length(uv - ringCenter);
  float ring = smoothstep(0.13, 0.10, ringDist) * (1.0 - smoothstep(0.10, 0.07, ringDist));

  // 8 main spikes — angular wedge gates
  float spikeAngle = mod(angle + 3.14159 / 8.0, 6.28318 / 8.0);
  float spikeWidth = abs(spikeAngle - 3.14159 / 8.0);
  float spikeShape = smoothstep(0.18, 0.0, spikeWidth);
  float spike = spikeShape * smoothstep(0.48, 0.18, dist) * smoothstep(0.0, 0.10, dist);

  // 4 secondary horns (between cardinals)
  float hornAngle = mod(angle + 3.14159 / 16.0, 6.28318 / 4.0);
  float hornWidth = abs(hornAngle - 3.14159 / 4.0);
  float hornShape = smoothstep(0.14, 0.0, hornWidth);
  float horn = hornShape * smoothstep(0.45, 0.18, dist) * smoothstep(0.0, 0.10, dist) * 0.6;

  // Body (dark frame around the gem)
  float bodyRing = smoothstep(0.34, 0.30, dist) * (1.0 - smoothstep(0.20, 0.24, dist));
  float body = bodyRing * 0.45;

  // Inner gem
  float gem = smoothstep(0.18, 0.10, dist);

  // Cracks (procedural)
  float crack = sin(angle * 11.0 + time * 1.4) * 0.5 + 0.5;
  crack = pow(crack, 6.0) * smoothstep(0.34, 0.10, dist) * 0.8;

  vec3 darkMetal = vec3(0.04, 0.0, 0.02);
  vec3 redDim   = vec3(0.55, 0.06, 0.04);
  vec3 redHot   = vec3(1.0, 0.18, 0.10);
  vec3 whiteHot = vec3(1.0, 0.85, 0.70);

  vec3 col = darkMetal;
  col += redDim * body;
  col += redHot * spike * (0.6 + 0.4 * armPulse);
  col += redHot * horn * (0.5 + 0.5 * armPulse);
  col += redHot * crack;
  col += whiteHot * gem * (0.65 + 0.35 * sin(time * 4.0));
  col += redHot * ring * (0.7 + 0.3 * sin(time * 2.0));

  // Top + bottom spires
  float topSpire = smoothstep(0.06, 0.0, dist) * smoothstep(0.0, -0.20, d.y);
  float botSpire = smoothstep(0.06, 0.0, dist) * smoothstep(0.20, 0.0, d.y);
  col += redHot * topSpire * 0.7;
  col += redHot * botSpire * 0.5;

  float alpha = max(max(body * 1.4, spike), max(horn, gem));
  alpha = max(alpha, max(ring * 1.2, crack * 1.3));
  alpha = max(alpha, max(topSpire, botSpire));
  alpha = clamp(alpha, 0.0, 1.0) * resonance;

  return vec4(col, alpha);
}`;

function buildAmuletShader() {
  const packet = createShaderPacket({
    id: 'amulet.demonic-glow',
    label: 'Demonic Amulet Glow',
    fragmentSource: AMULET_GLOW_GLSL,
    canvas: { width: CANVAS.width, height: CANVAS.height },
    uniforms: {
      resonance: { type: 'float', default: 1.0 },
    },
  });
  validateShaderPacket(packet);
  return packet;
}

// --- Pipeline --------------------------------------------------------------

function runPipeline() {
  const occupied = buildAmuletSilhouette();
  const template = sketchToSilhouette(occupied, CANVAS, { bands: BANDS, symmetry: 'none' });
  const filled = fillTemplate(template, BYTECODE, { bands: template.bands });
  const sharpness = buildSquareSharpnessContrastPayload({
    coordinates: filled,
    material: HD_MATERIAL,
    canvas: CANVAS,
    options: { enabled: true, edgeContrast: 0.55, interiorContrast: 0.20 },
    intent: 'enhance_square_render_readability',
  });
  const polished = sharpness.outputCoordinates;
  const assetPacket = createPixelBrainAssetPacket({
    source: { kind: 'procedural', id: 'amulet.demonic.v1', label: 'Demonic Amulet Asset' },
    canvas: CANVAS,
    coordinates: polished,
    palettes: [],
    formula: null,
    bytecode: BYTECODE,
    template: {
      gridType: 'sketch-template',
      fillState: { bytecode: BYTECODE, school: 'WILL', rarity: 'INEXPLICABLE', effect: 'TRANSCENDENT', source: 'procedural' },
    },
    material: SOURCE_MATERIAL,
    chromatic: { transformId: SOURCE_MATERIAL },
    metadata: { tags: ['amulet', 'demonic', 'sigil', 'legendary'], compatibility: { pdr: 'pixelbrain-amulet-radial' } },
  });
  const godotArtifact = buildPixelBrainGodotExport({
    canvas: CANVAS, palettes: [], coordinates: polished, formula: null,
  });
  const shader = buildAmuletShader();
  return { occupied, template, filled, sharpness, polished, assetPacket, godotArtifact, shader };
}

function summarize(result) {
  return {
    silhouetteOccupied: result.occupied.length,
    templateCoordinates: result.template.coordinates.length,
    templateBands: result.template.bands,
    filledCoordinates: result.filled.length,
    sharpnessChangedCount: result.sharpness.diagnostics?.changedCount ?? 0,
    finalCoordinates: result.polished.length,
    bytecode: BYTECODE,
    material: HD_MATERIAL,
    canvas: CANVAS,
  };
}

function main() {
  const result = runPipeline();
  const summary = summarize(result);
  writeFileSync(resolve(OUT_DIR, 'amulet.pbrain'), result.godotArtifact, 'utf8');
  writeFileSync(resolve(OUT_DIR, 'amulet.png'), renderPng(result.polished, CANVAS.width, CANVAS.height, 8));
  writeFileSync(resolve(OUT_DIR, 'amulet@2x.png'), renderPng(result.polished, CANVAS.width, CANVAS.height, 4));
  writeFileSync(resolve(OUT_DIR, 'amulet.json'), JSON.stringify(result.assetPacket, null, 2), 'utf8');
  writeFileSync(resolve(OUT_DIR, 'amulet.preview.txt'), asciiPreview(result.polished, CANVAS.width, CANVAS.height), 'utf8');
  writeFileSync(
    resolve(OUT_DIR, 'amulet.diagnostics.json'),
    JSON.stringify({ summary, sharpnessDiagnostics: result.sharpness.diagnostics }, null, 2),
    'utf8',
  );

  // Shader FORGE artifacts — the custom GLSL glow packaged for Godot & Phaser
  const shaderPacket = result.shader;
  writeFileSync(resolve(OUT_DIR, 'amulet.shader.packet.json'), JSON.stringify(shaderPacket, null, 2), 'utf8');
  writeFileSync(resolve(OUT_DIR, 'amulet.glow.gdshader'), exportGodotShaderPacket(shaderPacket), 'utf8');
  writeFileSync(resolve(OUT_DIR, 'amulet.glow.phaser.js'), exportPhaserPipeline(shaderPacket), 'utf8');
  // CPU-side preview of the GLSL glow at t=0 (so the user can see it without
  // launching a WebGL preview).
  writeFileSync(resolve(OUT_DIR, 'amulet.glow.preview.png'), renderGlowPreview(0.0, 6));

  console.log('==================================================');
  console.log('  DEMONIC AMULET ASSET + GLOW SHADER GENERATED');
  console.log('==================================================');
  console.log(`  bytecode       : ${BYTECODE}`);
  console.log(`  material (HD)  : ${HD_MATERIAL}`);
  console.log(`  canvas         : ${CANVAS.width}×${CANVAS.height}`);
  console.log(`  bands          : ${BANDS}`);
  console.log(`  silhouette     : ${summary.silhouetteOccupied} cells`);
  console.log(`  template       : ${summary.templateCoordinates} cells, ${summary.templateBands} bands`);
  console.log(`  filled         : ${summary.filledCoordinates} cells`);
  console.log(`  HD recolor     : ${summary.sharpnessChangedCount} cells`);
  console.log(`  final          : ${summary.finalCoordinates} cells`);
  console.log(`  shader id      : ${shaderPacket.id}`);
  console.log(`  shader contract: ${shaderPacket.contract}`);
  console.log('--------------------------------------------------');
  console.log('  Sprite assets:');
  console.log(`  → ${resolve(OUT_DIR, 'amulet.pbrain')}`);
  console.log(`  → ${resolve(OUT_DIR, 'amulet.png')}     (8× upscaled sprite)`);
  console.log(`  → ${resolve(OUT_DIR, 'amulet@2x.png')}  (4× upscaled sprite)`);
  console.log('  Glow shader (drop into a Godot/Phaser project):');
  console.log(`  → ${resolve(OUT_DIR, 'amulet.glow.gdshader')}`);
  console.log(`  → ${resolve(OUT_DIR, 'amulet.glow.phaser.js')}`);
  console.log(`  → ${resolve(OUT_DIR, 'amulet.glow.preview.png')}    (CPU-rendered at t=0)`);
  console.log(`  → ${resolve(OUT_DIR, 'amulet.shader.packet.json')}`);
  console.log('  Diagnostics:');
  console.log(`  → ${resolve(OUT_DIR, 'amulet.json')}`);
  console.log(`  → ${resolve(OUT_DIR, 'amulet.preview.txt')}`);
  console.log(`  → ${resolve(OUT_DIR, 'amulet.diagnostics.json')}`);
  console.log('==================================================\n');
  console.log(asciiPreview(result.polished, CANVAS.width, CANVAS.height));
}

main();
