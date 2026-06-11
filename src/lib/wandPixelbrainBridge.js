/**
 * WAND → PIXELBRAIN HANDOFF
 *
 * A tiny cross-route handoff so WAND (one page) can emit a fill bytecode that
 * PixelBrain (another page) picks up for its template fill. Persisted via the
 * Storage abstraction so it survives navigation between the two routes.
 */

import { Storage } from './platform/storage.js';
import {
  BytecodeError,
  ERROR_CATEGORIES,
  ERROR_SEVERITY,
  MODULE_IDS,
  ERROR_CODES,
} from '../../codex/core/pixelbrain/bytecode-error.js';

const HANDOFF_KEY = 'pixelbrain.wandFill.v1';

const ALLOWED_SCHOOLS = new Set([
  'SONIC', 'PSYCHIC', 'VOID', 'ALCHEMY', 'WILL', 'NECROMANCY', 'ABJURATION', 'DIVINATION',
]);
const ALLOWED_RARITIES = new Set(['COMMON', 'RARE', 'INEXPLICABLE']);
const ALLOWED_EFFECTS = new Set(['INERT', 'RESONANT', 'HARMONIC', 'TRANSCENDENT']);

/**
 * Publish a WAND-derived fill spec (and optionally its geometry) for PixelBrain.
 * @param {{ bytecode:string, schoolId:string, rarity:string, effect:string,
 *   role?:string, material?:string,
 *   coordinates?:Array<{x:number,y:number}>, canvas?:{width:number,height:number} }} spec
 */
export function publishWandFill(spec) {
  // Validate required fields before processing
  if (!spec) {
    throw new BytecodeError(
      ERROR_CATEGORIES.VALUE,
      ERROR_SEVERITY.CRIT,
      MODULE_IDS.IMG_FORMULA,
      ERROR_CODES.VALUE_INVALID,
      { reason: 'spec is required' }
    );
  }
  if (!spec.bytecode) {
    throw new BytecodeError(
      ERROR_CATEGORIES.VALUE,
      ERROR_SEVERITY.CRIT,
      MODULE_IDS.IMG_FORMULA,
      ERROR_CODES.VALUE_INVALID,
      { reason: 'Required field: "bytecode" is missing' }
    );
  }
  if (!spec.schoolId) {
    throw new BytecodeError(
      ERROR_CATEGORIES.VALUE,
      ERROR_SEVERITY.CRIT,
      MODULE_IDS.IMG_FORMULA,
      ERROR_CODES.VALUE_INVALID,
      { reason: 'Required field: "schoolId" is missing' }
    );
  }
  if (!spec.rarity) {
    throw new BytecodeError(
      ERROR_CATEGORIES.VALUE,
      ERROR_SEVERITY.CRIT,
      MODULE_IDS.IMG_FORMULA,
      ERROR_CODES.VALUE_INVALID,
      { reason: 'Required field: "rarity" is missing' }
    );
  }
  if (!spec.effect) {
    throw new BytecodeError(
      ERROR_CATEGORIES.VALUE,
      ERROR_SEVERITY.CRIT,
      MODULE_IDS.IMG_FORMULA,
      ERROR_CODES.VALUE_INVALID,
      { reason: 'Required field: "effect" is missing' }
    );
  }

  // Check enum membership with Set.has()
  if (!ALLOWED_SCHOOLS.has(spec.schoolId)) {
    throw new BytecodeError(
      ERROR_CATEGORIES.VALUE,
      ERROR_SEVERITY.CRIT,
      MODULE_IDS.IMG_FORMULA,
      ERROR_CODES.VALUE_INVALID,
      { reason: `Invalid schoolId: "${spec.schoolId}"` }
    );
  }
  if (!ALLOWED_RARITIES.has(spec.rarity)) {
    throw new BytecodeError(
      ERROR_CATEGORIES.VALUE,
      ERROR_SEVERITY.CRIT,
      MODULE_IDS.IMG_FORMULA,
      ERROR_CODES.VALUE_INVALID,
      { reason: `Invalid rarity: "${spec.rarity}"` }
    );
  }
  if (!ALLOWED_EFFECTS.has(spec.effect)) {
    throw new BytecodeError(
      ERROR_CATEGORIES.VALUE,
      ERROR_SEVERITY.CRIT,
      MODULE_IDS.IMG_FORMULA,
      ERROR_CODES.VALUE_INVALID,
      { reason: `Invalid effect: "${spec.effect}"` }
    );
  }

  const coordinates = Array.isArray(spec.coordinates)
    ? spec.coordinates.map((c) => ({ x: Number(c?.x) || 0, y: Number(c?.y) || 0 }))
    : null;
  return Storage.setItem(HANDOFF_KEY, JSON.stringify({
    bytecode: spec.bytecode,
    schoolId: spec.schoolId || 'VOID',
    rarity: spec.rarity || 'COMMON',
    effect: spec.effect || 'INERT',
    role: spec.role || null,
    material: spec.material || null,
    coordinates,
    canvas: spec.canvas ? { width: Number(spec.canvas.width) || 800, height: Number(spec.canvas.height) || 600 } : null,
    ts: Date.now(),
  }));
}

/**
 * Read the latest WAND fill spec, or null if none has been published.
 * @returns {Object|null}
 */
export function readWandFill() {
  const raw = Storage.getItem(HANDOFF_KEY);
  if (!raw) return null;
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed) return null;

  // Validate required fields before processing
  if (!parsed.bytecode) {
    throw new BytecodeError(
      ERROR_CATEGORIES.VALUE,
      ERROR_SEVERITY.CRIT,
      MODULE_IDS.IMG_FORMULA,
      ERROR_CODES.VALUE_INVALID,
      { reason: 'Required field: "bytecode" is missing' }
    );
  }
  if (!parsed.schoolId) {
    throw new BytecodeError(
      ERROR_CATEGORIES.VALUE,
      ERROR_SEVERITY.CRIT,
      MODULE_IDS.IMG_FORMULA,
      ERROR_CODES.VALUE_INVALID,
      { reason: 'Required field: "schoolId" is missing' }
    );
  }
  if (!parsed.rarity) {
    throw new BytecodeError(
      ERROR_CATEGORIES.VALUE,
      ERROR_SEVERITY.CRIT,
      MODULE_IDS.IMG_FORMULA,
      ERROR_CODES.VALUE_INVALID,
      { reason: 'Required field: "rarity" is missing' }
    );
  }
  if (!parsed.effect) {
    throw new BytecodeError(
      ERROR_CATEGORIES.VALUE,
      ERROR_SEVERITY.CRIT,
      MODULE_IDS.IMG_FORMULA,
      ERROR_CODES.VALUE_INVALID,
      { reason: 'Required field: "effect" is missing' }
    );
  }

  // Check enum membership with Set.has()
  if (!ALLOWED_SCHOOLS.has(parsed.schoolId)) {
    throw new BytecodeError(
      ERROR_CATEGORIES.VALUE,
      ERROR_SEVERITY.CRIT,
      MODULE_IDS.IMG_FORMULA,
      ERROR_CODES.VALUE_INVALID,
      { reason: `Invalid schoolId: "${parsed.schoolId}"` }
    );
  }
  if (!ALLOWED_RARITIES.has(parsed.rarity)) {
    throw new BytecodeError(
      ERROR_CATEGORIES.VALUE,
      ERROR_SEVERITY.CRIT,
      MODULE_IDS.IMG_FORMULA,
      ERROR_CODES.VALUE_INVALID,
      { reason: `Invalid rarity: "${parsed.rarity}"` }
    );
  }
  if (!ALLOWED_EFFECTS.has(parsed.effect)) {
    throw new BytecodeError(
      ERROR_CATEGORIES.VALUE,
      ERROR_SEVERITY.CRIT,
      MODULE_IDS.IMG_FORMULA,
      ERROR_CODES.VALUE_INVALID,
      { reason: `Invalid effect: "${parsed.effect}"` }
    );
  }

  return parsed;
}

export function clearWandFill() {
  Storage.removeItem(HANDOFF_KEY);
}
