/**
 * WAND → PixelBrain fill spec validation.
 *
 * Invariants enforced by `ensureValidWandFillSpec`:
 *   - required fields are non-empty (bytecode, schoolId, rarity, effect)
 *   - enum membership uses `Set.has()` so lookup is O(1) and exhaustive:
 *       allowedValues.has(value) === true
 *
 * The WAND bridge (`src/lib/wandPixelbrainBridge.js`) already validates at the
 * read boundary, but this module provides a consumer-side guard so the
 * PixelBrain UI never has to assume the storage layer was honest.
 */

import { SCHOOLS } from '../../../data/schools.js';

export const FILL_SCHOOLS = Object.freeze(new Set(Object.keys(SCHOOLS)));
export const FILL_RARITIES = Object.freeze(new Set(['COMMON', 'RARE', 'INEXPLICABLE']));
export const FILL_EFFECTS = Object.freeze(new Set(['INERT', 'RESONANT', 'HARMONIC', 'TRANSCENDENT']));

export const FILL_RARITY_OPTIONS = Object.freeze([...FILL_RARITIES]);
export const FILL_EFFECT_OPTIONS = Object.freeze([...FILL_EFFECTS]);

const REQUIRED_FIELDS = Object.freeze(['bytecode', 'schoolId', 'rarity', 'effect']);

function missingFieldError(field) {
  return new Error(`WAND fill spec missing required field: "${field}"`);
}

function invalidEnumError(field, value, allowed) {
  return new Error(`WAND fill spec has invalid ${field}: "${value}" (allowed: ${[...allowed].join(', ')})`);
}

export function ensureValidWandFillSpec(spec) {
  if (!spec || typeof spec !== 'object') {
    throw new Error('WAND fill spec is missing or invalid');
  }
  for (const field of REQUIRED_FIELDS) {
    if (!spec[field]) throw missingFieldError(field);
  }
  if (!FILL_SCHOOLS.has(spec.schoolId)) {
    throw invalidEnumError('schoolId', spec.schoolId, FILL_SCHOOLS);
  }
  if (!FILL_RARITIES.has(spec.rarity)) {
    throw invalidEnumError('rarity', spec.rarity, FILL_RARITIES);
  }
  if (!FILL_EFFECTS.has(spec.effect)) {
    throw invalidEnumError('effect', spec.effect, FILL_EFFECTS);
  }
  return spec;
}
