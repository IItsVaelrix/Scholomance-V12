/**
 * TEMPLATE / FILL BRIDGE — Geometry↔Fill Separation
 *
 * Cuts the abstraction line PixelBrain never cut: a coordinate's GEOMETRY
 * (where it sits) is separated from its FILL (what color it is). A template
 * carries only a neutral role per coordinate — a `slot` index — and no baked
 * color. A bytecode formula then resolves every slot to a concrete color via
 * the existing `bytecodeToPalette` math, so one base shape re-skins into any
 * school / rarity / effect deterministically.
 *
 *   concrete asset ──templatize()──▶ template (geometry + slots, neutral grey)
 *   template + bytecode ──fillTemplate()──▶ concrete asset (re-skinned)
 *
 * Pure + deterministic. Composes primitives that already exist
 * (`bytecodeToPalette`, `hexToHsl`). Lives under the pixelbrain Cell Wall.
 */

import { hslToHex, clamp01, clampNumber } from './shared.js';
import { hexToHsl } from './nlp-morph-engine.js';
import { bytecodeToPalette } from './color-byte-mapping.js';

const DEFAULT_BANDS = 4;
const MIN_BANDS = 2;
const MAX_BANDS = 8;

/**
 * Luminance [0,1] of a coordinate — from its color, falling back to emphasis.
 */
function coordinateLuminance(coord) {
  const hsl = hexToHsl(coord?.color);
  if (hsl) return clamp01(hsl.l / 100);
  return clamp01(Number(coord?.emphasis));
}

/**
 * Quantize a luminance [0,1] into a slot index [0, bands-1].
 * slot 0 = darkest role, slot (bands-1) = lightest role.
 */
function luminanceToSlot(luminance, bands) {
  const safeBands = Math.max(1, bands);
  return Math.min(safeBands - 1, Math.max(0, Math.round(clamp01(luminance) * (safeBands - 1))));
}

/**
 * Neutral grey for a slot — the "fixed value" a template renders as before fill.
 */
function slotToNeutralGrey(slot, bands) {
  const ratio = bands <= 1 ? 0 : slot / (bands - 1);
  return hslToHex(0, 0, Math.round(12 + ratio * 78)); // L: 12 → 90
}

/**
 * Strip a concrete asset down to a palette-agnostic template.
 * Each coordinate keeps its geometry and gains a `slot` role; its baked color
 * is replaced by a neutral grey so the template renders as a clean relief.
 *
 * @param {Array} coordinates
 * @param {{ bands?: number }} [options]
 * @returns {{ coordinates: Array, bands: number, isTemplate: true }}
 */
export function templatize(coordinates, options = {}) {
  const bands = Math.round(clampNumber(options.bands ?? DEFAULT_BANDS, MIN_BANDS, MAX_BANDS));
  const coords = Array.isArray(coordinates) ? coordinates : [];

  const out = coords.map((coord) => {
    const slot = luminanceToSlot(coordinateLuminance(coord), bands);
    const { color: _strippedColor, ...geometry } = coord;
    return { ...geometry, slot, color: slotToNeutralGrey(slot, bands) };
  });

  return { coordinates: out, bands, isTemplate: true };
}

/**
 * Resolve a template's slots to concrete colors via a bytecode formula.
 * Accepts either a template object ({ coordinates, bands }) or a raw
 * coordinate array (auto-derives slots from luminance, so it also works as a
 * one-shot re-skin of an un-templatized asset).
 *
 * @param {Object|Array} template - from templatize(), or a coordinate array
 * @param {string} bytecode - e.g. "VW-FIRE-RARE-HARMONIC"
 * @param {{ bands?: number }} [options]
 * @returns {Array} concrete coordinates (geometry preserved, color filled)
 */
export function fillTemplate(template, bytecode, options = {}) {
  const coords = Array.isArray(template?.coordinates)
    ? template.coordinates
    : Array.isArray(template)
      ? template
      : [];
  if (coords.length === 0) return coords;

  const palette = bytecodeToPalette(String(bytecode || '')).colors || [];
  if (palette.length === 0) return coords;

  const bands = Math.round(clampNumber(
    template?.bands ?? options.bands ?? DEFAULT_BANDS,
    MIN_BANDS,
    MAX_BANDS,
  ));
  const lastPaletteIndex = palette.length - 1;
  const lastSlot = Math.max(1, bands - 1);

  return coords.map((coord) => {
    const slot = Number.isFinite(Number(coord?.slot))
      ? clampNumber(Number(coord.slot), 0, bands - 1)
      : luminanceToSlot(coordinateLuminance(coord), bands);
    // Rescale the template's slot band onto the (possibly smaller) palette.
    const paletteIndex = Math.round((slot / lastSlot) * lastPaletteIndex);
    return { ...coord, slot, color: palette[Math.min(lastPaletteIndex, Math.max(0, paletteIndex))] };
  });
}
