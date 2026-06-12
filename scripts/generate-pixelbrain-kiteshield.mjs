/**
 * Generate a high-definition Kiteshield asset through the PixelBrain pipeline.
 *
 * Spec: Royal Sonic Thaumaturgist Kiteshield.
 * Colors: Royal Blue, Gold, and glowing Cyan (sonic energy).
 *
 * Usage:
 *   node scripts/generate-pixelbrain-kiteshield.mjs
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

import { sketchToSilhouette } from '../codex/core/pixelbrain/sketch-amp.js';
import { applySelout } from '../codex/core/pixelbrain/selout-amp.js';
import { applyPixelAA } from '../codex/core/pixelbrain/pixel-aa-amp.js';
import { applyFacets } from '../codex/core/pixelbrain/facet-amp.js';
import { buildSquareSharpnessContrastPayload } from '../codex/core/pixelbrain/square-sharpness-contrast-amp.js';
import { createPixelBrainAssetPacket, derivePixelBrainRenderPacket } from '../codex/core/pixelbrain/pixelbrain-asset-packet.js';
import { SOURCE_MATERIAL } from '../codex/core/pixelbrain/material-registry.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '..', 'output', 'pixelbrain', 'kiteshield');
mkdirSync(OUT_DIR, { recursive: true });

const CANVAS = Object.freeze({ width: 48, height: 96, gridSize: 1 });
const BYTECODE = 'VW-ROYAL-SONIC-THAUMATURGY';

const CENTER_X = 24;
const SHIELD_TOP = 16;
const SHIELD_BOTTOM = 80;

// Colors
const ROYAL_BLUE_RAMP = ['#0A1128', '#102A5C', '#1D4ED8', '#3B82F6', '#93C5FD'];
const GOLD_RIM = '#FBBF24';
const GOLD_RAMP = ['#78350F', '#B45309', '#D97706', '#F59E0B', '#FCD34D'];
const SONIC_CYAN_CORE = '#E0F2FE';
const SONIC_CYAN_GLOW = '#06B6D4';
const SONIC_CYAN_DEEP = '#0891B2';

function shieldHalfWidth(y) {
  if (y < SHIELD_TOP) return 0;
  if (y > SHIELD_BOTTOM) return 0;
  
  // Flat top with slight curve
  if (y <= SHIELD_TOP + 4) return 14 + (y - SHIELD_TOP);
  
  // Straight sides
  if (y <= SHIELD_TOP + 24) return 18;
  
  // Taper down to a point
  const t = (y - (SHIELD_TOP + 24)) / (SHIELD_BOTTOM - (SHIELD_TOP + 24));
  // Quadratic taper
  return Math.round(18 * (1 - t * t));
}

function buildKiteshieldSilhouette() {
  const occupied = [];
  const seen = new Set();

  const place = (x, y) => {
    if (x < 0 || x >= CANVAS.width || y < 0 || y >= CANVAS.height) return;
    const key = `${x},${y}`;
    if (seen.has(key)) return;
    seen.add(key);
    occupied.push({ x, y });
  };

  // Main shield body
  for (let y = SHIELD_TOP; y <= SHIELD_BOTTOM; y += 1) {
    const half = shieldHalfWidth(y);
    for (let dx = -half; dx <= half; dx += 1) place(CENTER_X + dx, y);
  }

  // Cross brace / Insignia protrusion (Gold trim element)
  for (let y = SHIELD_TOP + 8; y <= SHIELD_TOP + 14; y += 1) {
      const w = shieldHalfWidth(y) + 1;
      place(CENTER_X - w, y);
      place(CENTER_X + w, y);
  }

  return occupied;
}

function buildInsignia() {
  const insignia = new Set();
  
  // Sonic wave pattern (three concentric curves)
  const cy = SHIELD_TOP + 24;
  
  const addWave = (radius) => {
      for (let angle = -Math.PI/3; angle <= Math.PI/3; angle += 0.1) {
          const x = CENTER_X + Math.round(Math.sin(angle) * radius);
          const y = cy - Math.round(Math.cos(angle) * radius);
          insignia.add(`${x},${y}`);
      }
  };

  addWave(4);
  addWave(8);
  addWave(12);

  // Central tuning fork / thaumaturgist symbol
  for (let y = cy - 2; y <= cy + 8; y++) {
      insignia.add(`${CENTER_X},${y}`);
  }
  insignia.add(`${CENTER_X - 2},${cy - 4}`);
  insignia.add(`${CENTER_X - 2},${cy - 3}`);
  insignia.add(`${CENTER_X - 1},${cy - 2}`);
  
  insignia.add(`${CENTER_X + 2},${cy - 4}`);
  insignia.add(`${CENTER_X + 2},${cy - 3}`);
  insignia.add(`${CENTER_X + 1},${cy - 2}`);

  return insignia;
}

function rampPick(ramp, slot, minSlot, maxSlot) {
  const span = Math.max(1, maxSlot - minSlot);
  const norm = Math.max(0, Math.min(1, (slot - minSlot) / span));
  return ramp[Math.min(ramp.length - 1, Math.round(norm * (ramp.length - 1)))];
}

function fillKiteshield(template) {
  const coords = template.coordinates;
  const occupiedKeys = new Set(coords.map((c) => `${c.x},${c.y}`));
  const insignia = buildInsignia();

  const glow = new Set();
  for (const key of insignia) {
    const [bx, by] = key.split(',').map(Number);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nKey = `${bx + dx},${by + dy}`;
      if (occupiedKeys.has(nKey) && !insignia.has(nKey)) glow.add(nKey);
    }
  }

  const isOutline = (c) => (
    !occupiedKeys.has(`${c.x + 1},${c.y}`)
    || !occupiedKeys.has(`${c.x - 1},${c.y}`)
    || !occupiedKeys.has(`${c.x},${c.y + 1}`)
    || !occupiedKeys.has(`${c.x},${c.y - 1}`)
  );

  let minS = Infinity, maxS = 0;
  for (const c of coords) {
    if (isOutline(c)) continue;
    minS = Math.min(minS, c.slot);
    maxS = Math.max(maxS, c.slot);
  }

  return coords.map((c) => {
    const key = `${c.x},${c.y}`;
    const outline = isOutline(c);
    let color;
    let region = 'shield';

    const distFromCenter = Math.abs(c.x - CENTER_X);
    const isTrim = distFromCenter >= shieldHalfWidth(c.y) - 2 || outline || c.y < SHIELD_TOP + 3;

    if (isTrim) {
      region = 'trim';
      color = outline ? GOLD_RIM : rampPick(GOLD_RAMP, c.slot, minS, maxS);
    } else {
      if (insignia.has(key)) color = SONIC_CYAN_CORE;
      else if (glow.has(key)) color = SONIC_CYAN_GLOW;
      else color = rampPick(ROYAL_BLUE_RAMP, c.slot, minS, maxS);
    }

    return { ...c, color, region, partId: region, isRim: outline, engraving: insignia.has(key) || undefined };
  });
}

function runPipeline() {
  const occupied = buildKiteshieldSilhouette();

  const template = sketchToSilhouette(occupied, CANVAS, {
    bands: 6,
    symmetry: 'horizontal',
    light: { angle: Math.PI * 1.25, ambient: 0.3 }
  });

  const filled = fillKiteshield(template);

  const mockSpec = {
    parts: [
      { id: 'shield', outline: { material: 'shieldOutline' } },
      { id: 'trim', outline: { material: 'trimOutline' }, shading: 'faceted' }
    ]
  };
  const mockMaterialResolver = ({ material, anchor }) => {
    if (material === 'shieldOutline') return '#0A1128';
    if (material === 'trimOutline') {
      if (anchor === 'body') return '#FCD34D';
      if (anchor === 'void') return '#78350F';
      return GOLD_RIM;
    }
    return null;
  };

  let fillsObj = { coordinates: filled };
  fillsObj = applySelout(fillsObj, mockSpec, mockMaterialResolver, { angle: Math.PI * 1.25, ambient: 0.3 });
  fillsObj = applyPixelAA(fillsObj, mockSpec);
  fillsObj = applyFacets(fillsObj, mockSpec, mockMaterialResolver, { angle: Math.PI * 1.25, ambient: 0.3 });

  const sharpness = buildSquareSharpnessContrastPayload({
    coordinates: fillsObj.coordinates,
    material: SOURCE_MATERIAL,
    canvas: CANVAS,
    options: { enabled: true },
    intent: 'enhance_square_render_readability',
  });

  const polished = sharpness.outputCoordinates;

  const assetPacket = createPixelBrainAssetPacket({
    source: { kind: 'procedural', id: 'kiteshield.royal.sonic', label: 'Royal Sonic Thaumaturgist Kiteshield' },
    canvas: CANVAS,
    coordinates: polished,
    palettes: [],
    formula: null,
    bytecode: BYTECODE,
    template: {
      gridType: 'sketch-template',
      fillState: { bytecode: BYTECODE, school: 'SONIC', rarity: 'EPIC', effect: 'RESONANCE', source: 'procedural' },
    },
    material: SOURCE_MATERIAL,
    chromatic: { transformId: SOURCE_MATERIAL },
    metadata: { tags: ['kiteshield', 'sonic'] },
  });

  return { occupied, template, filled, sharpness, polished, assetPacket };
}

function renderPng(coordinates, width, height, scale = 8, { transparent = false } = {}) {
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
    const hex = String(c?.color || '').trim().replace('#', '');
    if (hex.length !== 6) continue;
    const rgb = { r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4, 6), 16) };
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
  ihdr.writeUInt32BE(outW, 0); ihdr.writeUInt32BE(outH, 4);
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
    chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))
  ]);
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

function main() {
  const result = runPipeline();
  writeFileSync(resolve(OUT_DIR, 'kiteshield.png'), renderPng(result.polished, CANVAS.width, CANVAS.height, 8));
  writeFileSync(resolve(OUT_DIR, 'kiteshield.1x.png'), renderPng(result.polished, CANVAS.width, CANVAS.height, 1, { transparent: true }));
  console.log(`Generated Royal Sonic Thaumaturgist Kiteshield at ${resolve(OUT_DIR, 'kiteshield.png')}`);
}

main();
