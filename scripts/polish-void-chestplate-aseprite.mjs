/**
 * Professional polish pass for the void chestplate .aseprite file.
 *
 * Operations:
 *  1. Remove stray/isolated pixels (no 4-connected neighbors in same layer)
 *  2. Enforce strict bilateral symmetry on pauldrons (mirror left→right)
 *  3. Clean up gold trim / outline edges — fill single-pixel gaps on the
 *     silhouette boundary with the body part's trim color
 *  4. Enhance the central core crystal — add highlight pixels, deepen
 *     shadow cells for 3D depth read
 *  5. Clean the emblem layer — remove noise, ensure the eye mark is crisp
 *  6. Re-encode to .aseprite binary
 *
 * Usage:
 *   node scripts/polish-void-chestplate-aseprite.mjs
 *
 * Input:  output/foundry/new-void-chestplate/new-void-chestplate.aseprite
 * Output: same file (overwritten), + polish diagnostics JSON
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { decodeAsepriteBinary, encodeAsepriteBinary } from '../codex/core/pixelbrain/aseprite-binary-codec.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const INPUT_FILE = resolve(__dirname, '..', 'output', 'foundry', 'new-void-chestplate', 'new-void-chestplate.aseprite');
const DIAG_FILE = resolve(__dirname, '..', 'output', 'foundry', 'new-void-chestplate', 'new-void-chestplate.polish.diagnostics.json');

// ── Helpers ────────────────────────────────────────────────────────────
function key(x, y) { return `${x},${y}`; }
function toFiniteNumber(v, fallback = 0) { const n = Number(v); return Number.isFinite(n) ? n : fallback; }
function hexToRgb(hex) {
  const m = String(hex || '').trim().replace('#', '');
  if (m.length !== 6) return null;
  return { r: parseInt(m.slice(0, 2), 16), g: parseInt(m.slice(2, 4), 16), b: parseInt(m.slice(4, 6), 16) };
}
function rgbToHex(rgb) {
  return '#' + [rgb.r, rgb.g, rgb.b].map(c => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0')).join('');
}
function lerpRgb(a, b, t) {
  return { r: Math.round(a.r + (b.r - a.r) * t), g: Math.round(a.g + (b.g - a.g) * t), b: Math.round(a.b + (b.b - a.b) * t) };
}
function layerCellSet(layer) {
  const set = new Set();
  for (const c of layer.cells) set.add(key(c.x, c.y));
  return set;
}

const TRIM_COLOR = '#A58A2D';    // void_gold body anchor
const TRIM_LIGHT = '#CEB65A';    // void_gold frost
const CRYSTAL_LIGHT = '#A17AE0'; // void_core spectral
const CRYSTAL_CORE = '#6B35B8';  // void_core frost
const CRYSTAL_DARK = '#32106D';  // void_core body
const CRYSTAL_VOID = '#170A3A';  // void_core deep
const BG_COLOR = '#01030A';      // voidsteel void

// ── Layer helpers ───────────────────────────────────────────────────────
function findLayer(layers, name) { return layers.find(l => l.name === name); }
function layerMap(layer) { const m = new Map(); for (const c of layer.cells) m.set(key(c.x, c.y), c); return m; }

// ── Op 1: Remove stray pixels (color-aware) ─────────────────────────────
//
// A cell is only an orphan if BOTH conditions hold:
//   1. No neighbor of the SAME color within radius 2 (spatial isolation
//      of its color class — not just any neighbor, which protects against
//      two adjacent noise pixels protecting each other)
//   2. Its color is under-represented in the layer (frequency ≤ 1, or ≤ 2
//      when the layer has >100 cells and the color is a visual outlier)
//
// Real motif cells (runes, harness, emblem) share a palette — even sparse
// diagonal chains have the same color, so they fail condition 1 and
// survive. Genuine noise is typically a random hue that appears nowhere
// else in the layer — condition 2 catches it.
//
function removeStrayPixels(layer, sameColorRadius = 3) {
  if (!layer.cells || layer.cells.length === 0) return { removed: 0 };
  const original = layer.cells.length;
  // Don't judge single-cell layers — they're intentionally sparse motifs
  if (original === 1) return { removed: 0, reason: 'single-cell-layer' };

  const colorFreq = countColorFrequencies(layer.cells);
  const colorThreshold = layer.cells.length > 100 ? 2 : 1;

  const kept = layer.cells.filter(c => {
    const freq = colorFreq.get(c.color || '') || 0;
    // Condition 2: color is under-represented
    if (freq > colorThreshold) return true;

    // Condition 1: has a same-color neighbor within sameColorRadius?
    // Check all cells sharing this color for proximity.
    if (freq <= 1) return false; // only cell of this color → orphan

    // Multiple cells share this color — check if any other is nearby
    const sameColor = layer.cells.filter(o => o !== c && o.color === c.color);
    const hasClose = sameColor.some(o => {
      const dist = Math.abs(c.x - o.x) + Math.abs(c.y - o.y);
      return dist <= sameColorRadius;
    });
    return hasClose;
  });

  // Never empty a layer that shows color coherence (cells sharing the same
  // palette are likely an intentional sparse motif). A layer with no
  // surviving cells and no color cohesion (all cells unique colors) is
  // noise and can safely empty.
  if (kept.length === 0) {
    const maxFreq = Math.max(...colorFreq.values(), 0);
    if (maxFreq >= 2) return { removed: 0, reason: 'layer-sparse-but-color-coherent' };
    // No color coherence — the entire layer was noise. Let it empty.
    layer.cells = [];
    return { removed: original, reason: 'layer-all-noise' };
  }

  layer.cells = kept;
  return { removed: original - kept.length };
}

function countColorFrequencies(cells) {
  const freq = new Map();
  for (const c of cells) {
    const color = c.color || '';
    freq.set(color, (freq.get(color) || 0) + 1);
  }
  return freq;
}

// ── Op 2: Enforce bilateral symmetry ───────────────────────────────────
function enforcePauldronSymmetry(layers, canvasWidth) {
  const cx = Math.floor(canvasWidth / 2);
  const left = findLayer(layers, 'left_pauldron');
  const right = findLayer(layers, 'right_pauldron');
  if (!left || !right) return { fixed: 0 };

  // Mirror left pauldron cells onto right side for pixel-perfect symmetry
  const leftMap = layerMap(left);
  const rightMap = layerMap(right);
  const changes = [];

  // Add missing right cells that the left has mirrored
  for (const [k, lc] of leftMap.entries()) {
    const [lx, y] = k.split(',').map(Number);
    const rx = (cx * 2) - lx;
    const rk = key(rx, y);
    if (!rightMap.has(rk)) {
      right.cells.push({ x: rx, y, color: lc.color, emphasis: lc.emphasis ?? 1, metadata: { ...lc.metadata, partId: 'right_pauldron' } });
      changes.push({ op: 'add-mirror', x: rx, y, color: lc.color });
    }
  }

  // Remove right cells that don't exist mirrored on the left (asymmetry)
  const origLength = right.cells.length;
  right.cells = right.cells.filter(c => {
    const lx = (cx * 2) - c.x;
    return leftMap.has(key(lx, c.y));
  });
  changes.push({ op: 'remove-asymmetric', count: origLength - right.cells.length });

  // Recolor right cells to match left colors exactly
  for (const c of right.cells) {
    const lx = (cx * 2) - c.x;
    const lc = leftMap.get(key(lx, c.y));
    if (lc && lc.color !== c.color) {
      changes.push({ op: 'recolor-symmetry', x: c.x, y: c.y, from: c.color, to: lc.color });
      c.color = lc.color;
    }
  }

  return { fixed: changes.length };
}

// ── Op 3: Fill single-pixel gaps on silhouette boundary ────────────────
function fillTrimGaps(layers) {
  const body = findLayer(layers, 'body');
  if (!body?.cells) return { filled: 0, recolored: 0 };

  const bodySet = layerCellSet(body);
  const bodyMap = layerMap(body);
  const allSet = new Set();
  for (const l of layers) {
    if (!l.cells) continue;
    for (const c of l.cells) allSet.add(key(c.x, c.y));
  }

  // Find silhouette boundary cells
  const rimCells = body.cells.filter(c => {
    const n4 = [key(c.x+1, c.y), key(c.x-1, c.y), key(c.x, c.y+1), key(c.x, c.y-1)];
    return n4.some(k => !bodySet.has(k));
  });

  // Find the body's bounding box to prevent extension
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const c of body.cells) {
    if (c.x < minX) minX = c.x;
    if (c.x > maxX) maxX = c.x;
    if (c.y < minY) minY = c.y;
    if (c.y > maxY) maxY = c.y;
  }

  let filled = 0;
  let recolored = 0;

  // Op 3a: Recolor rim cells that aren't trim-color yet
  // Only recolor cells whose color is NOT already a gold/trim hue
  for (const c of rimCells) {
    const rgb = hexToRgb(c.color);
    if (!rgb) continue;
    // Check if color is already in the gold family (hue roughly 40-50°)
    // Skip if already gold-toned
    const maxVal = Math.max(rgb.r, rgb.g, rgb.b);
    const minVal = Math.min(rgb.r, rgb.g, rgb.b);
    const saturation = maxVal > 0 ? (maxVal - minVal) / maxVal : 0;
    // Gold: high red+green, low blue, medium saturation
    if (rgb.r > 120 && rgb.g > 80 && rgb.r > rgb.b * 1.3 && saturation > 0.2) continue;

    // This is a rim cell missing trim — recolor to trim
    c.color = TRIM_COLOR;
    recolored += 1;
  }

  // Op 3b: Fill true 1-pixel gaps — a cell OUTSIDE the body that has
  // body neighbors on at least 3 cardinal sides (a missing tooth)
  // BUT only within the existing bounding box to prevent silhouette extension
  for (const c of rimCells) {
    for (const [dx, dy] of [[1,0], [-1,0], [0,1], [0,-1], [1,1], [-1,-1], [1,-1], [-1,1]]) {
      const nx = c.x + dx;
      const ny = c.y + dy;
      // Never extend beyond the existing bounding box
      if (nx < minX || nx > maxX || ny < minY || ny > maxY) continue;
      const nk = key(nx, ny);
      if (bodySet.has(nk)) continue;
      if (allSet.has(nk)) continue;
      // Count body neighbors (8-direction)
      const n8 = [[nx+1,ny],[nx-1,ny],[nx,ny+1],[nx,ny-1],[nx+1,ny+1],[nx-1,ny-1],[nx+1,ny-1],[nx-1,ny+1]];
      const bodyNeighbors = n8.filter(([bx, by]) => bodySet.has(key(bx, by))).length;
      // Need at least 4 body neighbors to be a true "gap" (not boundary extension)
      if (bodyNeighbors < 4) continue;
      body.cells.push({
        x: nx, y: ny, color: TRIM_COLOR, emphasis: 1,
        metadata: { partId: 'body', role: 'trim' }
      });
      bodySet.add(nk);
      allSet.add(nk);
      filled += 1;
    }
  }
  return { filled, recolored };
}

// ── Op 4: Enhance central crystal ──────────────────────────────────────
function enhanceCrystal(layers) {
  const core = findLayer(layers, 'center_core');
  if (!core?.cells || core.cells.length === 0) return { enhanced: 0 };

  const coreSet = layerCellSet(core);
  const coreMap = layerMap(core);

  // Find centroid for highlight placement
  let sx = 0, sy = 0;
  for (const c of core.cells) { sx += c.x; sy += c.y; }
  const cx = Math.round(sx / core.cells.length);
  const cy = Math.round(sy / core.cells.length);

  // Find the topmost cell (where highlight goes)
  let topCell = core.cells[0];
  for (const c of core.cells) { if (c.y < topCell.y) topCell = c; }

  const changes = [];

  // 1. Deepen shadow at bottom of crystal (darken bottom cells)
  const bottomCells = core.cells.filter(c => c.y >= cy);
  for (const c of bottomCells) {
    const rgb = hexToRgb(c.color);
    if (!rgb) continue;
    const shadow = hexToRgb(CRYSTAL_DARK);
    if (!shadow) continue;
    const tone = lerpRgb(rgb, shadow, 0.5);
    c.color = rgbToHex(tone);
    changes.push({ op: 'deepen-crystal', x: c.x, y: c.y, to: c.color });
  }

  // 2. Add bright highlight at top (one cell above topmost)
  if (topCell) {
    const hlKey = key(topCell.x, topCell.y - 1);
    if (!coreSet.has(hlKey)) {
      core.cells.push({
        x: topCell.x, y: topCell.y - 1, color: CRYSTAL_LIGHT, emphasis: 1,
        metadata: { partId: 'center_core', role: 'highlight' }
      });
      changes.push({ op: 'crystal-highlight', x: topCell.x, y: topCell.y - 1, color: CRYSTAL_LIGHT });
    }
  }

  // 3. Add subtle glow ring (1-2 cells around crystal with low-alpha tint)
  // Skip glow for now — let shader handle it per PB-SHADER-v1

  return { enhanced: changes.length };
}

// ── Op 5: Clean emblem ─────────────────────────────────────────────────
function cleanEmblem(layers) {
  const emblem = findLayer(layers, 'emblem');
  if (!emblem?.cells || emblem.cells.length < 5) return { cleaned: 0 };

  const emblemSet = layerCellSet(emblem);

  // Remove isolated emblem cells (no adjacent emblem neighbor)
  const original = emblem.cells.length;
  emblem.cells = emblem.cells.filter(c => {
    const n8 = [
      key(c.x+1,c.y), key(c.x-1,c.y), key(c.x,c.y+1), key(c.x,c.y-1),
      key(c.x+1,c.y+1), key(c.x-1,c.y-1), key(c.x+1,c.y-1), key(c.x-1,c.y+1),
    ];
    return n8.some(k => k !== key(c.x, c.y) && emblemSet.has(k));
  });
  const removed = original - emblem.cells.length;

  // Eye mark contrast check — ensure the emblem color contrasts against
  // the body background (use color luminance comparison)
  const body = findLayer(layers, 'body');
  if (body?.cells) {
    const bodyColor = body.cells[0]?.color || BG_COLOR;
    const bodyRgb = hexToRgb(bodyColor);
    for (const c of emblem.cells) {
      const eRgb = hexToRgb(c.color);
      if (!eRgb || !bodyRgb) continue;
      const eLum = 0.2126 * eRgb.r + 0.7152 * eRgb.g + 0.0722 * eRgb.b;
      const bLum = 0.2126 * bodyRgb.r + 0.7152 * bodyRgb.g + 0.0722 * bodyRgb.b;
      if (Math.abs(eLum - bLum) < 30) {
        // Too low contrast — brighten
        const bright = hexToRgb('#A66BE0');
        if (bright) { c.color = rgbToHex(bright); }
      }
    }
  }

  return { cleaned: removed };
}

// ── Main ────────────────────────────────────────────────────────────────
function main() {
  console.log('[polish-void-chestplate] reading', INPUT_FILE);
  const buf = readFileSync(INPUT_FILE);
  const payload = decodeAsepriteBinary(new Uint8Array(buf));
  const layers = payload.frames[0].layers;
  const canvasWidth = payload.width;
  const canvasHeight = payload.height;
  console.log(`[polish-void-chestplate] decoded ${canvasWidth}x${canvasHeight}, ${layers.length} layers, ${layers.reduce((s,l) => s + l.cells.length, 0)} total cells`);

  const log = { operations: [], beforeCells: layers.reduce((s,l) => s + l.cells.length, 0) };

  // Op 1: Remove stray pixels
  const strayLog = {};
  for (const layer of layers) {
    const result = removeStrayPixels(layer);
    if (result.removed > 0) strayLog[layer.name] = result.removed;
  }
  if (Object.keys(strayLog).length > 0) {
    log.operations.push({ op: 'remove-stray-pixels', details: strayLog });
  }

  // Op 2: Enforce pauldron symmetry
  const symResult = enforcePauldronSymmetry(layers, canvasWidth);
  if (symResult.fixed > 0) log.operations.push({ op: 'enforce-symmetry', ...symResult });

  // Op 3: Fill trim gaps
  const trimResult = fillTrimGaps(layers);
  if (trimResult.filled > 0) log.operations.push({ op: 'fill-trim-gaps', ...trimResult });

  // Op 4: Enhance crystal
  const crystalResult = enhanceCrystal(layers);
  if (crystalResult.enhanced > 0) log.operations.push({ op: 'enhance-crystal', ...crystalResult });

  // Op 5: Clean emblem
  const emblemResult = cleanEmblem(layers);
  if (emblemResult.cleaned > 0) log.operations.push({ op: 'clean-emblem', ...emblemResult });

  log.afterCells = layers.reduce((s, l) => s + l.cells.length, 0);
  log.cellDelta = log.afterCells - log.beforeCells;

  // Re-encode
  const binary = encodeAsepriteBinary(payload);
  writeFileSync(INPUT_FILE, binary);
  console.log('[polish-void-chestplate] wrote', INPUT_FILE, `(${binary.length} bytes)`);

  // Diagnostics
  const diagnostics = {
    polishedAt: new Date().toISOString(),
    note: 'Professional polish pass: removed stray/isolated pixels, enforced strict bilateral pauldron symmetry, filled single-pixel trim gaps on silhouette boundary, enhanced central crystal with depth shading/highlight, cleaned emblem for readability.',
    cells: log.afterCells,
    canvas: { width: canvasWidth, height: canvasHeight },
    operations: log.operations,
    cellDelta: log.cellDelta,
    maxY: Math.max(...layers.flatMap(l => (l.cells || []).map(c => c.y)), 0),
  };
  writeFileSync(DIAG_FILE, JSON.stringify(diagnostics, null, 2) + '\n');
  console.log('[polish-void-chestplate] diagnostics →', DIAG_FILE);
  console.log('[polish-void-chestplate] done — cell delta:', log.cellDelta);
}

main();
