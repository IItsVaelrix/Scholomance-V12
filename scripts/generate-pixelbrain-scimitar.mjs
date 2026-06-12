/**
 * Generate a high-definition scimitar asset through the PixelBrain pipeline.
 *
 * Spec: scimitar engraved with lightning · diamond bezel · black blade · sapphire outline.
 *
 * Pipeline:
 *   hand-painted silhouette (curved blade, bezel guard, wrapped grip, gem pommel)
 *     → sketchToSilhouette(bands=6)                          // auto-shade slots
 *     → region fill (sapphire rim / black blade / diamond bezel / lightning engraving)
 *     → buildSquareSharpnessContrastPayload('source')        // HD contrast pass
 *     → buildPixelBrainGodotExport                           // .pbrain artifact
 *     → renderPng(scale)                                     // downloadable PNG
 *
 * Usage:
 *   node scripts/generate-pixelbrain-scimitar.mjs
 *
 * Outputs in output/pixelbrain/scimitar/:
 *   - scimitar.pbrain             godot-ready artifact
 *   - scimitar.json               asset packet (source of truth)
 *   - scimitar.png                rendered sprite (downloadable)
 *   - scimitar.preview.txt        ASCII silhouette
 *   - scimitar.preview.colored.ansi.txt   ANSI color visualization
 *   - scimitar.diagnostics.json   pipeline summary
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
import { createShaderPacket, validateShaderPacket, hashShaderPacket } from '../codex/core/pixelbrain/shader-packet.js';
import { resolveShaderUniforms } from '../codex/core/pixelbrain/shader-uniform-resolver.js';
import { registerPixelBrainShaderUniformProvider } from '../codex/core/pixelbrain/pixelbrain-shader-uniform-providers.js';
import { buildPixelBrainGodotExport } from '../src/lib/godot-export/pixelbrainGodotExport.js';
import { exportToGodotShader } from '../src/lib/exporters/pixelbrainGodotShaderExport.js';
import { exportToPhaserPipeline } from '../src/lib/exporters/pixelbrainPhaserShaderExport.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '..', 'output', 'pixelbrain', 'scimitar');
mkdirSync(OUT_DIR, { recursive: true });

const CANVAS = Object.freeze({ width: 48, height: 96, gridSize: 1 });
const BYTECODE = 'VW-VOID-INEXPLICABLE-TRANSCENDENT';

// Layout: curved blade(0-59) → bezel guard(60-67) → grip(68-85) → pommel(86-95)
const HILT_X = 16;
const BLADE_END = 59;
const BEZEL_Y_START = 60;
const BEZEL_Y_END = 67;
const GRIP_Y_START = 68;
const GRIP_Y_END = 85;
const POMMEL_Y_START = 86;

// ── Palette ────────────────────────────────────────────────────────────────
const SAPPHIRE_OUTLINE = '#1D5FD6';
const SAPPHIRE_DEEP = '#10316F';
const BLACK_BLADE_RAMP = ['#08080D', '#0D0D14', '#13131C', '#1A1A26', '#232332']; // dark → specular core
const DIAMOND_RIM = '#A9C6D9';
const DIAMOND_RAMP = ['#B8CDDC', '#D4E4EF', '#E8F2F9', '#F7FBFE', '#FFFFFF'];
const GRIP_BLACK_RAMP = ['#0B0B11', '#12121A', '#1A1A24'];
const GRIP_WRAP = '#1E4FB8';
const POMMEL_GEM_RAMP = ['#0F3E9E', '#1D5FD6', '#3B82F6', '#7DB1FF'];
const BOLT_CORE = '#EAF6FF';
const BOLT_GLOW = '#2A4E9E';

// Blade centerline curves right toward the tip (scimitar sweep).
// Slope stays under 1 cell/row so the silhouette remains 4-connected.
function bladeCenterX(y) {
  const t = (BLADE_END - y) / BLADE_END; // 0 at guard → 1 at tip
  return HILT_X + Math.round(26 * t * t);
}

// Scimitar profile: sharp tip, broad belly (yelman) in the distal third,
// narrowing back toward the guard.
function bladeHalfWidth(y) {
  if (y <= 1) return 0;
  if (y <= 4) return 1;
  if (y <= 12) return 2;
  if (y <= 15) return 3;
  if (y <= 24) return 4;   // yelman belly
  if (y <= 45) return 3;
  return 2;
}

// Marquise-cut bezel guard — the "diamond bezel" holding blade to grip.
const BEZEL_PROFILE = Object.freeze({
  60: 3, 61: 5, 62: 7, 63: 8, 64: 8, 65: 7, 66: 5, 67: 3,
});

// Pommel: small gem held in its own bezel ring.
const POMMEL_PROFILE = Object.freeze({
  86: 1, 87: 2, 88: 3, 89: 4, 90: 4, 91: 4, 92: 3, 93: 2, 94: 1, 95: 1,
});

function buildScimitarSilhouette() {
  const occupied = [];
  const seen = new Set();

  const place = (x, y) => {
    if (x < 0 || x >= CANVAS.width || y < 0 || y >= CANVAS.height) return;
    const key = `${x},${y}`;
    if (seen.has(key)) return;
    seen.add(key);
    occupied.push({ x, y });
  };

  // BLADE — curved sweep.
  for (let y = 0; y <= BLADE_END; y += 1) {
    const cx = bladeCenterX(y);
    const half = bladeHalfWidth(y);
    for (let dx = -half; dx <= half; dx += 1) place(cx + dx, y);
  }

  // BEZEL GUARD — marquise polygon.
  for (let y = BEZEL_Y_START; y <= BEZEL_Y_END; y += 1) {
    const half = BEZEL_PROFILE[y] ?? 0;
    for (let dx = -half; dx <= half; dx += 1) place(HILT_X + dx, y);
  }

  // GRIP — 3-wide handle with cord-wrap flare every 3rd row.
  for (let y = GRIP_Y_START; y <= GRIP_Y_END; y += 1) {
    for (let dx = -1; dx <= 1; dx += 1) place(HILT_X + dx, y);
    if ((y - GRIP_Y_START) % 3 === 0) {
      place(HILT_X - 2, y);
      place(HILT_X + 2, y);
    }
  }

  // POMMEL — bezel-set gem.
  for (let y = POMMEL_Y_START; y < CANVAS.height; y += 1) {
    const half = POMMEL_PROFILE[y] ?? 0;
    for (let dx = -half; dx <= half; dx += 1) place(HILT_X + dx, y);
  }

  return occupied;
}

// ── Lightning engraving ────────────────────────────────────────────────────
// Zigzag bolt down the blade, following the curve, with a fork near the tip.
function rasterLine(x0, y0, x1, y1, emit) {
  let x = x0;
  let y = y0;
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    emit(x, y);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
}

function buildLightningBolt() {
  const offsets = [+1, -2, +2, -1, +1, -2, +2, -1, 0];
  const waypoints = [];
  for (let i = 0; i < offsets.length; i += 1) {
    const y = 6 + i * 6; // rows 6..54 down the blade
    waypoints.push({ x: bladeCenterX(y) + offsets[i], y });
  }
  const bolt = new Set();
  for (let i = 0; i < waypoints.length - 1; i += 1) {
    const a = waypoints[i];
    const b = waypoints[i + 1];
    rasterLine(a.x, a.y, b.x, b.y, (x, y) => bolt.add(`${x},${y}`));
  }
  // Fork: short branch off the first waypoint toward the tip's trailing edge.
  rasterLine(waypoints[0].x, waypoints[0].y, bladeCenterX(3) - 1, 3, (x, y) => bolt.add(`${x},${y}`));
  return bolt;
}

// ── Region fill ────────────────────────────────────────────────────────────
function rampPick(ramp, slot, minSlot, maxSlot) {
  const span = Math.max(1, maxSlot - minSlot);
  const norm = Math.max(0, Math.min(1, (slot - minSlot) / span));
  return ramp[Math.min(ramp.length - 1, Math.round(norm * (ramp.length - 1)))];
}

function fillScimitar(template) {
  const coords = template.coordinates;
  const occupiedKeys = new Set(coords.map((c) => `${c.x},${c.y}`));
  const bolt = buildLightningBolt();

  // Glow: cardinal neighbors of bolt cells, interior blade only.
  const glow = new Set();
  for (const key of bolt) {
    const [bx, by] = key.split(',').map(Number);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nKey = `${bx + dx},${by + dy}`;
      if (occupiedKeys.has(nKey) && !bolt.has(nKey)) glow.add(nKey);
    }
  }

  const isOutline = (c) => (
    !occupiedKeys.has(`${c.x + 1},${c.y}`)
    || !occupiedKeys.has(`${c.x - 1},${c.y}`)
    || !occupiedKeys.has(`${c.x},${c.y + 1}`)
    || !occupiedKeys.has(`${c.x},${c.y - 1}`)
  );

  // Interior slot range per region so each ramp gets its full dynamic range.
  const slotRange = { blade: [Infinity, 0], bezel: [Infinity, 0], grip: [Infinity, 0], pommel: [Infinity, 0] };
  const regionOf = (y) => {
    if (y < BEZEL_Y_START) return 'blade';
    if (y <= BEZEL_Y_END) return 'bezel';
    if (y <= GRIP_Y_END) return 'grip';
    return 'pommel';
  };
  for (const c of coords) {
    if (isOutline(c)) continue;
    const range = slotRange[regionOf(c.y)];
    range[0] = Math.min(range[0], c.slot);
    range[1] = Math.max(range[1], c.slot);
  }

  return coords.map((c) => {
    const key = `${c.x},${c.y}`;
    const region = regionOf(c.y);
    const outline = isOutline(c);
    let color;

    if (region === 'bezel') {
      // Diamond bezel: pale rim, brilliant white core.
      const [minS, maxS] = slotRange.bezel;
      color = outline ? DIAMOND_RIM : rampPick(DIAMOND_RAMP, c.slot, minS, maxS);
    } else if (region === 'pommel') {
      // Diamond bezel ring holding a sapphire gem.
      const [minS, maxS] = slotRange.pommel;
      color = outline ? DIAMOND_RAMP[2] : rampPick(POMMEL_GEM_RAMP, c.slot, minS, maxS);
    } else if (region === 'grip') {
      const [minS, maxS] = slotRange.grip;
      const isWrapRow = (c.y - GRIP_Y_START) % 3 === 0;
      if (outline) color = SAPPHIRE_DEEP;
      else if (isWrapRow) color = GRIP_WRAP;
      else color = rampPick(GRIP_BLACK_RAMP, c.slot, minS, maxS);
    } else {
      // Blade: sapphire outline, lightning engraving, black steel body.
      const [minS, maxS] = slotRange.blade;
      if (outline) color = SAPPHIRE_OUTLINE;
      else if (bolt.has(key)) color = BOLT_CORE;
      else if (glow.has(key)) color = BOLT_GLOW;
      else color = rampPick(BLACK_BLADE_RAMP, c.slot, minS, maxS);
    }

    return { ...c, color, region, partId: region, isRim: outline, engraving: bolt.has(key) || undefined };
  });
}

// ── Shader stage ───────────────────────────────────────────────────────────
// Lightning-engraving energize overlay (PB-SHADER-v1). The pbMain contract is
// shared by the WebGL sandbox, the Phaser pipeline export, and the Godot
// .gdshader export, all of which declare the canonical six uniforms — so the
// packet keeps only canonical uniforms and asset-specific values are baked
// into the generated source as constants.
function buildScimitarFragment(engravingDensity) {
  const [r, g, b] = (() => {
    const rgb = hexToRgb(SAPPHIRE_OUTLINE);
    return [rgb.r / 255, rgb.g / 255, rgb.b / 255];
  })();
  return `// HD Scimitar — lightning engraving energize overlay.
// Deterministic: all motion derives from u_time / u_resonance.
const vec3 BOLT_TINT = vec3(${r.toFixed(4)}, ${g.toFixed(4)}, ${b.toFixed(4)}); // sapphire ${SAPPHIRE_OUTLINE}
const float ENGRAVING_DENSITY = ${engravingDensity.toFixed(4)}; // engraved cells / total cells

float pbHash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// Blade sweep centerline in UV space — mirrors bladeCenterX() in
// generate-pixelbrain-scimitar.mjs (blade spans v in [0, ${(BLADE_END / CANVAS.height).toFixed(3)}]).
float bladeCenter(float v) {
  float t = clamp((${(BLADE_END / CANVAS.height).toFixed(3)} - v) / ${(BLADE_END / CANVAS.height).toFixed(3)}, 0.0, 1.0);
  return ${(HILT_X / CANVAS.width).toFixed(3)} + ${(26 / CANVAS.width).toFixed(3)} * t * t;
}

vec4 pbMain(vec2 uv, float time, float resonance) {
  float v = uv.y;
  float blade = step(v, ${(BLADE_END / CANVAS.height).toFixed(3)});
  float cx = bladeCenter(v);

  // Zigzag jitter per engraving segment (9 waypoints down the blade).
  float seg = floor(v * 9.0);
  float jitter = (pbHash(vec2(seg, 7.0)) - 0.5) * 0.10;
  float d = abs(uv.x - (cx + jitter));

  // Strobe: quantized time flicker, charged by verse resonance.
  float strobe = pbHash(vec2(floor(time * 8.0), seg));
  float charge = 0.35 + 0.65 * resonance;
  float flicker = smoothstep(0.55, 1.0, strobe) * charge;

  float core = smoothstep(0.035, 0.0, d);
  float halo = smoothstep(0.16, 0.0, d) * 0.45;
  float energy = blade * (core + halo) * flicker;

  vec3 tint = mix(BOLT_TINT, u_palette0, 0.25);
  vec3 color = mix(tint, vec3(1.0), core * 0.85) * energy;
  float alpha = clamp(energy * (0.5 + ENGRAVING_DENSITY * 4.0), 0.0, 1.0);
  return vec4(color, alpha);
}`;
}

function buildShaderStage(filled, assetPacketFactory) {
  const engravingCells = filled.filter((c) => c.engraving).length;
  const engravingDensity = filled.length > 0 ? engravingCells / filled.length : 0;

  const shaderPacket = createShaderPacket({
    id: 'scimitar-lightning-engraving',
    label: 'Scimitar Lightning Engraving',
    fragmentSource: buildScimitarFragment(engravingDensity),
    uniforms: {},
    canvas: { width: CANVAS.width, height: CANVAS.height },
    deterministicSeed: 1337,
  });
  validateShaderPacket(shaderPacket);
  const shaderHash = hashShaderPacket(shaderPacket);

  // Asset packet carries the shader reference; shader resolution then runs
  // against the finished packet so the pixelbrain provider can contribute
  // its u_pixelbrain_* uniforms.
  const assetPacket = assetPacketFactory({ shaderId: shaderPacket.id, shaderHash });
  const renderPacket = derivePixelBrainRenderPacket(assetPacket);

  registerPixelBrainShaderUniformProvider();
  const sapphire = hexToRgb(SAPPHIRE_OUTLINE);
  const resolvedUniforms = resolveShaderUniforms(shaderPacket, {
    clock: { elapsedSeconds: 0 },
    canvas: { size: [CANVAS.width, CANVAS.height] },
    verse: { resonance: 0.85, vowelDensity: 0.5 },
    palette: { 0: { rgb01: [sapphire.r / 255, sapphire.g / 255, sapphire.b / 255] } },
    packet: assetPacket,
    renderPacket,
  });

  return {
    shaderPacket,
    shaderHash,
    assetPacket,
    renderPacket,
    resolvedUniforms,
    godotShader: exportToGodotShader(shaderPacket),
    phaserPipeline: exportToPhaserPipeline(shaderPacket),
  };
}

function runPipeline() {
  const occupied = buildScimitarSilhouette();

  const template = sketchToSilhouette(occupied, CANVAS, {
    bands: 6,
    symmetry: 'none',
    light: { angle: Math.PI * 1.25, ambient: 0.3 }
  });

  const filled = fillScimitar(template);

  // Apply finish passes
  const mockSpec = {
    parts: [
      { id: 'blade', outline: { material: 'bladeOutline' } },
      { id: 'grip', outline: { material: 'gripOutline' } },
      { id: 'bezel', shading: 'faceted', fill: { material: 'diamond' } },
      { id: 'pommel', shading: 'faceted', fill: { material: 'sapphire' } }
    ]
  };
  const mockMaterialResolver = ({ material, anchor }) => {
    if (material === 'diamond') {
      if (anchor === 'whiteCore') return DIAMOND_RAMP[4];
      if (anchor === 'frost') return DIAMOND_RAMP[3];
      if (anchor === 'shadow') return DIAMOND_RAMP[1];
      if (anchor === 'void') return DIAMOND_RAMP[0];
      return DIAMOND_RAMP[2]; // body
    }
    if (material === 'sapphire') {
      if (anchor === 'whiteCore') return POMMEL_GEM_RAMP[3];
      if (anchor === 'frost') return POMMEL_GEM_RAMP[2];
      if (anchor === 'shadow') return POMMEL_GEM_RAMP[0];
      if (anchor === 'void') return POMMEL_GEM_RAMP[0];
      return POMMEL_GEM_RAMP[1]; // body
    }
    if (material === 'bladeOutline') {
      if (anchor === 'body') return '#3B82F6'; // lighter sapphire
      if (anchor === 'void') return SAPPHIRE_DEEP;
      return SAPPHIRE_OUTLINE;
    }
    if (material === 'gripOutline') {
      if (anchor === 'body') return '#1E4FB8'; 
      if (anchor === 'void') return '#000000';
      return SAPPHIRE_DEEP;
    }
    return null;
  };

  let fillsObj = { coordinates: filled };
  fillsObj = applySelout(fillsObj, mockSpec, mockMaterialResolver, { angle: Math.PI * 1.25, ambient: 0.3 });
  fillsObj = applyPixelAA(fillsObj, mockSpec);
  fillsObj = applyFacets(fillsObj, mockSpec, mockMaterialResolver, { angle: Math.PI * 1.25, ambient: 0.3 });

  // 'source' material: generic contrast/readability pass that preserves the
  // authored sapphire/black/diamond palette instead of remapping to a flame.
  const sharpness = buildSquareSharpnessContrastPayload({
    coordinates: fillsObj.coordinates,
    material: SOURCE_MATERIAL,
    canvas: CANVAS,
    options: { enabled: true },
    intent: 'enhance_square_render_readability',
  });

  const polished = sharpness.outputCoordinates;

  const assetPacketFactory = ({ shaderId, shaderHash }) => createPixelBrainAssetPacket({
    source: { kind: 'procedural', id: 'scimitar.hd.v1', label: 'HD Scimitar — Lightning Engraving, Diamond Bezel' },
    canvas: CANVAS,
    coordinates: polished,
    palettes: [],
    formula: null,
    bytecode: BYTECODE,
    template: {
      gridType: 'sketch-template',
      fillState: {
        bytecode: BYTECODE,
        school: 'VOID',
        rarity: 'INEXPLICABLE',
        effect: 'TRANSCENDENT',
        source: 'procedural',
      },
    },
    material: SOURCE_MATERIAL,
    chromatic: { transformId: SOURCE_MATERIAL },
    metadata: {
      tags: ['scimitar', 'hd', 'legendary', 'lightning', 'diamond-bezel', 'sapphire', 'shader'],
      compatibility: {
        pdr: 'pixelbrain-sketch-fill-hd',
        shader: { id: shaderId, hash: shaderHash, contract: 'PB-SHADER-v1', artifact: 'scimitar.gdshader' },
      },
    },
  });

  const shaderStage = buildShaderStage(filled, assetPacketFactory);
  const { assetPacket } = shaderStage;

  const godotArtifact = buildPixelBrainGodotExport({
    canvas: CANVAS,
    palettes: [],
    coordinates: polished,
    formula: null,
  });

  return { occupied, template, filled, sharpness, polished, assetPacket, godotArtifact, shaderStage };
}

// ── Rendering (shared shape with generate-pixelbrain-sword.mjs) ───────────
function asciiPreview(coordinates, width, height) {
  const grid = Array.from({ length: height }, () => Array(width).fill(' '));
  for (const c of coordinates) {
    const x = Math.round(c?.snappedX ?? c?.x);
    const y = Math.round(c?.snappedY ?? c?.y);
    if (x >= 0 && x < width && y >= 0 && y < height) {
      grid[y][x] = c?.engraving ? '*' : '#';
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
    engravingCells: filled.filter((c) => c.engraving).length,
    sharpnessEnabled: sharpness.diagnostics?.enabled ?? null,
    sharpnessChangedCount: sharpness.diagnostics?.changedCount ?? 0,
    finalCoordinates: polished.length,
    bytecode: BYTECODE,
    material: SOURCE_MATERIAL,
    canvas: CANVAS,
    shader: {
      id: result.shaderStage.shaderPacket.id,
      hash: result.shaderStage.shaderHash,
      uniformCount: Object.keys(result.shaderStage.resolvedUniforms).length,
    },
  };
}

function main() {
  const result = runPipeline();
  const summary = summarize(result);

  writeFileSync(resolve(OUT_DIR, 'scimitar.pbrain'), result.godotArtifact, 'utf8');
  writeFileSync(resolve(OUT_DIR, 'scimitar.gdshader'), result.shaderStage.godotShader, 'utf8');
  writeFileSync(resolve(OUT_DIR, 'scimitar.phaser.pipeline.js'), result.shaderStage.phaserPipeline, 'utf8');
  writeFileSync(
    resolve(OUT_DIR, 'scimitar.shader.json'),
    JSON.stringify(
      {
        packet: result.shaderStage.shaderPacket,
        hash: result.shaderStage.shaderHash,
        resolvedUniforms: result.shaderStage.resolvedUniforms,
        resolutionContext: {
          clock: { elapsedSeconds: 0 },
          verse: { resonance: 0.85, vowelDensity: 0.5 },
          note: 'baseline snapshot — runtime hosts re-resolve per frame',
        },
      },
      null,
      2,
    ),
    'utf8',
  );
  writeFileSync(resolve(OUT_DIR, 'scimitar.png'), renderPng(result.polished, CANVAS.width, CANVAS.height, 8));
  // 1× transparent-background sprite: open this in Aseprite to hand-edit, then
  // re-import with scripts/pixelbrain-import-sprite.mjs.
  writeFileSync(
    resolve(OUT_DIR, 'scimitar.1x.png'),
    renderPng(result.polished, CANVAS.width, CANVAS.height, 1, { transparent: true }),
  );
  writeFileSync(resolve(OUT_DIR, 'scimitar.json'), JSON.stringify(result.assetPacket, null, 2), 'utf8');
  writeFileSync(
    resolve(OUT_DIR, 'scimitar.preview.txt'),
    asciiPreview(result.polished, CANVAS.width, CANVAS.height),
    'utf8',
  );
  writeFileSync(
    resolve(OUT_DIR, 'scimitar.preview.colored.ansi.txt'),
    coloredAsciiPreview(result.polished, CANVAS.width, CANVAS.height),
    'utf8',
  );
  writeFileSync(
    resolve(OUT_DIR, 'scimitar.diagnostics.json'),
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
  console.log('  HD SCIMITAR ASSET GENERATED');
  console.log('==================================================');
  console.log(`  bytecode       : ${BYTECODE}`);
  console.log(`  canvas         : ${CANVAS.width}×${CANVAS.height}`);
  console.log(`  silhouette     : ${summary.silhouetteOccupied} cells`);
  console.log(`  template       : ${summary.templateCoordinates} cells, ${summary.templateBands} bands`);
  console.log(`  engraving      : ${summary.engravingCells} lightning cells`);
  console.log(`  HD contrast    : ${summary.sharpnessChangedCount} cells changed`);
  console.log(`  final          : ${summary.finalCoordinates} cells`);
  console.log(`  shader         : ${summary.shader.id} (${summary.shader.hash}, ${summary.shader.uniformCount} uniforms)`);
  console.log('--------------------------------------------------');
  console.log(`  → ${resolve(OUT_DIR, 'scimitar.pbrain')}`);
  console.log(`  → ${resolve(OUT_DIR, 'scimitar.gdshader')}`);
  console.log(`  → ${resolve(OUT_DIR, 'scimitar.phaser.pipeline.js')}`);
  console.log(`  → ${resolve(OUT_DIR, 'scimitar.shader.json')}`);
  console.log(`  → ${resolve(OUT_DIR, 'scimitar.png')}    (8× upscaled, ready to download)`);
  console.log(`  → ${resolve(OUT_DIR, 'scimitar.1x.png')} (1× transparent — edit in Aseprite, re-import via pixelbrain-import-sprite)`);
  console.log(`  → ${resolve(OUT_DIR, 'scimitar.json')}`);
  console.log(`  → ${resolve(OUT_DIR, 'scimitar.preview.txt')}`);
  console.log(`  → ${resolve(OUT_DIR, 'scimitar.preview.colored.ansi.txt')}`);
  console.log(`  → ${resolve(OUT_DIR, 'scimitar.diagnostics.json')}`);
  console.log('==================================================');
  console.log('\nSilhouette preview (* = lightning engraving):\n');
  console.log(asciiPreview(result.polished, CANVAS.width, CANVAS.height));
  console.log('\x1b[0m');
}

main();
