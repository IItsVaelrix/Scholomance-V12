/**
 * Mirrored Trim Pair Validator
 *
 * Enforces structural symmetry at three levels:
 *   1. Silhouette — the mirrored cell exists (position-level)
 *   2. Material  — color/registry anchor matches at the mirrored position
 *   3. PartId    — the mirrored cell carries the correct structural identity
 *                  (not just a coincidentally-same-color lookalike)
 *
 * This catches bugs where visual symmetry passes but semantic symmetry fails:
 *
 *   { x: 8,  y: 10, color: '#A58A2D', partId: 'left_pauldron_trim'  }
 *   { x: 55, y: 10, color: '#A58A2D', partId: 'right_pauldron_shell' }
 *                         ^ both gold, but structurally wrong ^
 *
 * Contract: validateMirroredTrimPairs(coordinates, pairs) → { ok, failures }
 *
 * Each pair declares the left/right partIds, a mirror axis, material
 * expectation, and minimum cell counts. The validator checks every cell
 * on the left side has a mirrored counterpart on the right with matching
 * color and partId. Any asymmetry is a fatal failure.
 */
import {
  MATERIAL_PALETTES,
  resolveMaterialId,
  hexToRgb,
} from './material-registry.js';
import { hashString } from './shared.js';

export const MIRRORED_TRIM_VALIDATOR_ID = 'pixelbrain.mirroredTrimValidator';
export const MIRRORED_TRIM_VALIDATOR_VERSION = '1.0.0';

// ── Trim pair definitions ──────────────────────────────────────────────

/**
 * Per-armor-class mirrored trim pairs.
 * Add new entries here as new item classes are implemented.
 */
export const MIRRORED_TRIM_PAIRS = Object.freeze({
  'armor.chestplate.sovereign-v1': Object.freeze([
    Object.freeze({
      id: 'pauldron-outer-trim',
      leftPartId: 'left_pauldron',
      rightPartId: 'right_pauldron',
      mirrorAxis: 31.5,
      required: true,
      minCellsPerSide: 20,
      checkRimCells: true,   // only validate rim (trim) cells — the structural boundary
      materials: ['void_gold', 'voidsteel', 'blacksteel'],
      fatal: true,
    }),
    Object.freeze({
      id: 'pauldron-enamel-fill',
      leftPartId: 'left_pauldron',
      rightPartId: 'right_pauldron',
      mirrorAxis: 31.5,
      required: true,
      minCellsPerSide: 25,
      checkRimCells: false,  // validate interior (fill/enamel) cells
      materials: ['sapphire_enamel', 'void_gold', 'voidsteel'],
      fatal: true,
    }),
    Object.freeze({
      id: 'body-lower-trim',
      leftPartId: 'body',
      rightPartId: 'body',
      mirrorAxis: 31.5,
      required: true,
      minCellsPerSide: 3,
      checkRimCells: true,
      materials: ['void_gold', 'voidsteel', 'blacksteel'],
      fatal: false,  // body trim asymmetry is a warning, not fatal
    }),
  ]),
});

// ── Helpers ────────────────────────────────────────────────────────────

function cellKey(x, y, color) {
  return `${x},${y},${color}`;
}

/**
 * Check if a color belongs to one of the expected materials.
 * Resolves the color to its material anchors via the registry.
 */
function colorMatchesMaterials(color, materialIds) {
  if (!materialIds || materialIds.length === 0) return true; // no filter → pass
  for (const id of materialIds) {
    const def = MATERIAL_PALETTES[resolveMaterialId(id)];
    if (!def?.anchors) continue;
    for (const anchor of Object.values(def.anchors)) {
      if (typeof anchor === 'string' && anchor.toUpperCase() === color.toUpperCase()) {
        return true;
      }
    }
  }
  return false;
}

function materialForColor(color) {
  if (!color) return 'unknown';
  for (const [id, def] of Object.entries(MATERIAL_PALETTES)) {
    if (!def?.anchors) continue;
    for (const anchor of Object.values(def.anchors)) {
      if (typeof anchor === 'string' && anchor.toUpperCase() === color.toUpperCase()) {
        return id;
      }
    }
  }
  return 'unknown';
}

// ── Validator ──────────────────────────────────────────────────────────

/**
 * Validate that mirrored trim pairs satisfy structural symmetry at all
 * three levels (silhouette, material, partId).
 *
 * @param {Array<{ x: number, y: number, color: string, partId: string, isRim?: boolean }>} coordinates
 * @param {Array<{ id: string, leftPartId: string, rightPartId: string, mirrorAxis: number, required: boolean, minCellsPerSide: number, checkRimCells?: boolean, materials?: string[], fatal: boolean }>} pairs
 * @returns {{ ok: boolean, failures: Array }}
 */
export function validateMirroredTrimPairs(coordinates, pairs) {
  const failures = [];

  // Index cells by partId for fast lookup
  const cellsByPart = new Map();
  for (const cell of coordinates) {
    const pid = cell.partId;
    if (!pid) continue;
    if (!cellsByPart.has(pid)) cellsByPart.set(pid, []);
    cellsByPart.get(pid).push(cell);
  }

  for (const pair of pairs) {
    const allLeft = cellsByPart.get(pair.leftPartId) ?? [];
    const allRight = cellsByPart.get(pair.rightPartId) ?? [];

    // Filter to rim/non-rim based on checkRimCells flag
    const left = pair.checkRimCells !== undefined
      ? allLeft.filter(c => pair.checkRimCells ? !!c.isRim : !c.isRim)
      : allLeft;
    const right = pair.checkRimCells !== undefined
      ? allRight.filter(c => pair.checkRimCells ? !!c.isRim : !c.isRim)
      : allRight;

    // ── Level 1: Silhouette symmetry (cell count) ──────────────────
    if (pair.required && left.length < pair.minCellsPerSide) {
      failures.push({
        code: 'PB_TRIM_LEFT_REQUIRED_OUTPUT_EMPTY',
        pair: pair.id,
        partId: pair.leftPartId,
        minCells: pair.minCellsPerSide,
        actualCells: left.length,
        fatal: pair.fatal,
      });
    }

    if (pair.required && right.length < pair.minCellsPerSide) {
      failures.push({
        code: 'PB_TRIM_RIGHT_REQUIRED_OUTPUT_EMPTY',
        pair: pair.id,
        partId: pair.rightPartId,
        minCells: pair.minCellsPerSide,
        actualCells: right.length,
        fatal: pair.fatal,
      });
    }

    // If one side is empty, skip cell-level checks
    if (left.length === 0 || right.length === 0) continue;

    // Build a lookup for right-side cells, keyed by their ACTUAL position
    // (not mirrored). The left-side check computes the mirrored X and
    // looks it up in this set.
    const rightSet = new Set();
    for (const cell of right) {
      rightSet.add(cellKey(cell.x, cell.y, cell.color));
    }

    // ── Levels 2 & 3: Material + PartId symmetry ───────────────────
    for (const cell of left) {
      const mirroredX = Math.round((pair.mirrorAxis * 2) - cell.x);

      // Level 2: Material symmetry — does the mirrored cell exist with
      // matching color? (color is the deterministic material proxy)
      const key = cellKey(mirroredX, cell.y, cell.color);
      if (!rightSet.has(key)) {
        // Check if there's ANY cell at the mirrored position (silhouette
        // symmetry passes but material fails — different color)
        const rightAtPos = right.find(c => c.x === mirroredX && c.y === cell.y);
        if (rightAtPos) {
          // Silhouette passes, material fails
          failures.push({
            code: 'PB_TRIM_MIRROR_MATERIAL_MISMATCH',
            pair: pair.id,
            leftCell: { x: cell.x, y: cell.y, color: cell.color, material: materialForColor(cell.color) },
            rightCell: { x: rightAtPos.x, y: rightAtPos.y, color: rightAtPos.color, material: materialForColor(rightAtPos.color) },
            expectedColor: cell.color,
            fatal: pair.fatal,
          });
        } else {
          // Level 1: Silhouette fails — no cell at mirrored position
          failures.push({
            code: 'PB_TRIM_MIRROR_CELL_MISSING',
            pair: pair.id,
            leftCell: { x: cell.x, y: cell.y },
            expectedRightCell: { x: mirroredX, y: cell.y },
            color: cell.color,
            material: materialForColor(cell.color),
            fatal: pair.fatal,
          });
        }
      }
    }
  }

  return {
    ok: failures.filter(f => f.fatal).length === 0,
    failures,
  };
}

/**
 * Validate mirrored trim pairs using the per-class pair definitions.
 * Convenience wrapper that resolves the class from a spec object.
 *
 * @param {Array} coordinates — filled/polished coordinate array
 * @param {string} grammarId  — e.g. 'armor.chestplate.sovereign-v1'
 * @returns {{ ok: boolean, failures: Array }}
 */
export function validateMirroredTrimByClass(coordinates, grammarId) {
  const pairs = MIRRORED_TRIM_PAIRS[grammarId];
  if (!pairs || pairs.length === 0) return { ok: true, failures: [] };
  return validateMirroredTrimPairs(coordinates, pairs);
}

export default validateMirroredTrimPairs;
