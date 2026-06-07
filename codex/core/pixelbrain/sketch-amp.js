/**
 * SKETCH AMP — Silhouette Authoring → Auto-Shaded Template
 *
 * Closes the front of the pipeline: lets a flat hand-painted silhouette become
 * a shaded, re-skinnable template with zero external art. Given the occupied
 * cells of a sketch it:
 *   1. rasterizes occupancy,
 *   2. optionally mirrors it (symmetry) into a full sprite,
 *   3. runs a chamfer DISTANCE TRANSFORM so interior pixels sit further from the
 *      edge than rim pixels,
 *   4. quantizes that distance into value `slot`s — rim = dark (slot 0),
 *      core = light — so the shape reads as a rounded, shaded form.
 *
 * Output is already a template ({ coordinates with slots, neutral grey }), so it
 * feeds straight into `fillTemplate(result, bytecode)` for a shaded re-skin.
 *
 *   sketch ──sketchToSilhouette()──▶ template ──fillTemplate(bytecode)──▶ sprite
 *
 * Pure + deterministic. Lives under the pixelbrain Cell Wall.
 */

import { clampNumber, hslToHex } from './shared.js';

const DEFAULT_BANDS = 4;
const MIN_BANDS = 2;
const MAX_BANDS = 8;
const DIAG = Math.SQRT2;

function slotToNeutralGrey(slot, bands) {
  const ratio = bands <= 1 ? 0 : slot / (bands - 1);
  return hslToHex(0, 0, Math.round(12 + ratio * 78)); // L: 12 → 90
}

/**
 * Convert a painted sketch into an auto-shaded silhouette template.
 *
 * @param {Array<{x:number,y:number}>} occupied - painted cells (col/row also accepted)
 * @param {{ width:number, height:number }} dimensions
 * @param {{ bands?:number, symmetry?:'none'|'vertical'|'horizontal' }} [options]
 * @returns {{ coordinates: Array, bands: number, isTemplate: true, dimensions: Object }}
 */
export function sketchToSilhouette(occupied, dimensions, options = {}) {
  const width = Math.max(1, Math.round(Number(dimensions?.width) || 32));
  const height = Math.max(1, Math.round(Number(dimensions?.height) || 32));
  const bands = Math.round(clampNumber(options.bands ?? DEFAULT_BANDS, MIN_BANDS, MAX_BANDS));
  const symmetry = options.symmetry || 'none';

  // 1. Occupancy grid.
  const grid = new Uint8Array(width * height);
  const mark = (x, y) => {
    if (x >= 0 && x < width && y >= 0 && y < height) grid[y * width + x] = 1;
  };
  (Array.isArray(occupied) ? occupied : []).forEach((cell) => {
    const x = Math.round(Number(cell?.x ?? cell?.col));
    const y = Math.round(Number(cell?.y ?? cell?.row));
    if (Number.isFinite(x) && Number.isFinite(y)) mark(x, y);
  });

  // 2. Symmetry mirror — author half, get the whole sprite.
  if (symmetry === 'vertical') {
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (grid[y * width + x]) mark(width - 1 - x, y);
      }
    }
  } else if (symmetry === 'horizontal') {
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (grid[y * width + x]) mark(x, height - 1 - y);
      }
    }
  }

  // 3. Distance transform — two-pass chamfer (distance to nearest background).
  const INF = 1e9;
  const dist = new Float32Array(width * height);
  for (let i = 0; i < grid.length; i += 1) dist[i] = grid[i] ? INF : 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = y * width + x;
      if (!grid[i]) continue;
      let d = dist[i];
      if (x > 0) d = Math.min(d, dist[i - 1] + 1);
      if (y > 0) d = Math.min(d, dist[i - width] + 1);
      if (x > 0 && y > 0) d = Math.min(d, dist[i - width - 1] + DIAG);
      if (x < width - 1 && y > 0) d = Math.min(d, dist[i - width + 1] + DIAG);
      dist[i] = d;
    }
  }
  for (let y = height - 1; y >= 0; y -= 1) {
    for (let x = width - 1; x >= 0; x -= 1) {
      const i = y * width + x;
      if (!grid[i]) continue;
      let d = dist[i];
      if (x < width - 1) d = Math.min(d, dist[i + 1] + 1);
      if (y < height - 1) d = Math.min(d, dist[i + width] + 1);
      if (x < width - 1 && y < height - 1) d = Math.min(d, dist[i + width + 1] + DIAG);
      if (x > 0 && y < height - 1) d = Math.min(d, dist[i + width - 1] + DIAG);
      dist[i] = d;
    }
  }

  // 4. Quantize distance → value slot (rim dark, core light) → template coords.
  let maxDist = 0;
  for (let i = 0; i < dist.length; i += 1) {
    if (grid[i] && dist[i] > maxDist) maxDist = dist[i];
  }

  const coordinates = [];
  const lastSlot = Math.max(1, bands - 1);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = y * width + x;
      if (!grid[i]) continue;
      const norm = maxDist > 0 ? dist[i] / maxDist : 0; // 0 = rim, 1 = core
      const slot = Math.min(lastSlot, Math.max(0, Math.round(norm * lastSlot)));
      coordinates.push({
        x,
        y,
        z: 0,
        snappedX: x,
        snappedY: y,
        slot,
        emphasis: slot / lastSlot,
        color: slotToNeutralGrey(slot, bands),
        source: 'sketch',
      });
    }
  }

  return {
    coordinates,
    bands,
    isTemplate: true,
    dimensions: { width, height, gridSize: 1 },
  };
}
