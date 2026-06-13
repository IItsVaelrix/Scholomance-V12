/**
 * chestplate-fidelity-pipeline.js
 *
 * Fixed-order deterministic fidelity passes for chestplate-class assets.
 */

import { validateArmorProportions } from './armor-proportion-validator.js';
import { applyChestplateBevel } from './chestplate-bevel-amp.js';
import { applyCrystalCore } from './crystal-core-amp.js';
import { applyPaletteQuantization } from './palette-quantization-amp.js';
import { applyChestplateSurfaceTexture } from './chestplate-surface-texture-amp.js';

export function validateChestplateFidelityInput({ spec, silhouette } = {}) {
  return validateArmorProportions({ spec, silhouette });
}

export function applyChestplateFidelityFills({ fills, spec, silhouette } = {}) {
  if (!fills || !spec || !silhouette) return fills;
  let next = fills;
  next = applyChestplateBevel(next, spec);
  next = applyCrystalCore(next, spec, silhouette);
  next = applyChestplateSurfaceTexture(next, spec);
  return Object.freeze({
    ...next,
    chestplateFidelity: Object.freeze({
      amp: 'pixelbrain.chestplate-fidelity-pipeline',
      version: '1.0.0',
      fillStages: Object.freeze([
        next.chestplateBevel ? 'chestplate-bevel-amp' : null,
        next.crystalCore ? 'crystal-core-amp' : null,
        next.chestplateSurfaceTexture ? 'chestplate-surface-texture-amp' : null,
      ].filter(Boolean)),
    }),
  });
}

export function finalizeChestplateFidelityCoordinates({ coordinates, spec } = {}) {
  const quantResult = applyPaletteQuantization(coordinates, spec);
  let finalCoords = quantResult.coordinates || coordinates;
  const paletteDiagnostics = quantResult.diagnostics || null;

  // Force strict vertical symmetry on final coords before raster.
  // For every pair, the right mirror gets the exact color/emphasis/part from its left counterpart.
  // This makes the packet (and thus any raster rendering / PNG / editor canvas draw)
  // perfectly symmetric, even if individual amps (bevel, texture, light, crystal core, etc.)
  // or the symmetry "amp" mirror logic had biases or off-by-ones earlier in the pipeline.
  const symmetry = spec.symmetry || {};
  if (symmetry.axis === 'vertical' && symmetry.mode === 'strict') {
    const w = spec.canvas?.width || 64;
    const byPos = new Map();
    finalCoords.forEach(c => {
      byPos.set(`${c.x},${c.y}`, c);
    });
    const enforced = new Map();
    // First pass: keep all, but will override rights
    finalCoords.forEach(c => {
      enforced.set(`${c.x},${c.y}`, c);
    });
    // Second pass: for lefts, force their data onto the right mirror position
    finalCoords.forEach(c => {
      if (c.x < w / 2) {
        const mx = (w - 1) - c.x;
        const mk = `${mx},${c.y}`;
        enforced.set(mk, {
          ...c,
          x: mx,
          y: c.y,
          // identical attributes
        });
      }
    });
    finalCoords = Array.from(enforced.values());

    // Brute final pass: for any remaining pair with color mismatch, force right to left.
    // Guarantees the coords passed to renderPng (raster) are pixel-perfect symmetric.
    const finalMap = new Map();
    finalCoords.forEach(c => finalMap.set(`${c.x},${c.y}`, c));
    const symmetric = [];
    finalCoords.forEach(c => {
      if (c.x >= w / 2) return; // only process left + center
      symmetric.push(c);
      const mx = (w - 1) - c.x;
      const right = finalMap.get(`${mx},${c.y}`);
      if (right) {
        symmetric.push({ ...c, x: mx, y: c.y });
      }
    });
    // add any center-only or right-only that were not paired (rare after force)
    finalCoords.forEach(c => {
      const k = `${c.x},${c.y}`;
      if (!symmetric.some(sc => `${sc.x},${sc.y}` === k)) symmetric.push(c);
    });
    finalCoords = symmetric;

    // Ultimate guarantee: rebuild map and for every vertical pair, pick one color (prefer left if present)
    // and assign identical to both sides. This makes the coords for raster rendering 100% symmetric.
    const posMap = new Map();
    finalCoords.forEach(c => posMap.set(`${c.x},${c.y}`, c));
    const rebuilt = [];
    const seen = new Set();
    // Mirror map for partIds in strict vertical chestplates
    const partMirror = {
      'left_pauldron': 'right_pauldron',
      'right_pauldron': 'left_pauldron',
      // add more like left/right_void_panel etc if they appear as separate
    };
    for (let x = 0; x < Math.floor(w / 2); x++) {
      for (let y = 0; y < (spec.canvas?.height || 80); y++) {
        const lk = `${x},${y}`;
        const rk = `${(w-1)-x},${y}`;
        const left = posMap.get(lk);
        const right = posMap.get(rk);
        const source = left || right;
        if (source) {
          const mirroredPart = partMirror[source.partId] || source.partId;
          const common = { ...source, x, y, snappedX: x, snappedY: y, partId: source.partId };
          const rcommon = { ...source, x: (w-1)-x, y, snappedX: (w-1)-x, snappedY: y, partId: mirroredPart };
          if (!seen.has(lk)) { rebuilt.push(common); seen.add(lk); }
          if (!seen.has(rk)) { rebuilt.push(rcommon); seen.add(rk); }
        }
      }
    }
    // center column
    for (let y = 0; y < (spec.canvas?.height || 80); y++) {
      const ck = `${Math.floor(w/2)},${y}`;
      if (posMap.has(ck) && !seen.has(ck)) rebuilt.push(posMap.get(ck));
    }
    finalCoords = rebuilt;
  }

  return {
    coordinates: finalCoords,
    diagnostics: {
      ...paletteDiagnostics,
      // Recompute uniqueColors after symmetry enforcement — the symmetry
      // rebuild may drop cells whose colors only appeared on one side,
      // making the post-symmetry palette smaller than the quantized set.
      uniqueColors: new Set(finalCoords.map((cell) => cell.color).filter(Boolean)).size,
    },
  };
}
