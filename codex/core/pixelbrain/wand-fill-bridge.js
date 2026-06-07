/**
 * WAND → FILL BRIDGE
 *
 * Derives a PixelBrain fill bytecode (VW-SCHOOL-RARITY-EFFECT) from a WAND
 * proposal, so WAND's procedural authoring can drive the template fill instead
 * of PixelBrain's manual school/rarity/effect dropdowns.
 *
 * Resolution order (most explicit wins):
 *   1. proposal.bytecode               — an explicit VW- string (AI/JSON authored)
 *   2. proposal.school/.rarity/.effect — explicit components
 *   3. proposal.material / .formula    — heuristic mapping (the usual WAND path)
 *
 * Pure + deterministic. Lives under the pixelbrain Cell Wall.
 */

import { createBytecodeString, parseBytecodeString } from './shared.js';

const KNOWN_SCHOOLS = new Set([
  'SONIC', 'PSYCHIC', 'VOID', 'ALCHEMY', 'WILL', 'NECROMANCY', 'ABJURATION', 'DIVINATION',
]);
const KNOWN_RARITIES = new Set(['COMMON', 'RARE', 'INEXPLICABLE']);
const KNOWN_EFFECTS = new Set(['INERT', 'RESONANT', 'HARMONIC', 'TRANSCENDENT']);

// WAND material vocabulary → nearest school (by chroma intent).
const MATERIAL_TO_SCHOOL = {
  gold: 'DIVINATION',   // gold / radiant yellow
  stone: 'VOID',        // neutral, desaturated
  aurora: 'PSYCHIC',    // shimmering blue
  aura: 'ALCHEMY',      // mystical magenta
  aether: 'SONIC',
  bone: 'NECROMANCY',
  crystal: 'ABJURATION',
  blood: 'WILL',
};

function upper(value, fallback) {
  const v = String(value || '').trim().toUpperCase();
  return v || fallback;
}

/**
 * @param {Object} proposal - a WAND proposal ({ role, material, formula, ... })
 * @returns {{ bytecode: string, schoolId: string, rarity: string, effect: string, source: string }}
 */
export function deriveWandFillBytecode(proposal) {
  const safe = proposal || {};

  // 1. Explicit bytecode string.
  if (safe.bytecode && String(safe.bytecode).toUpperCase().startsWith('VW-')) {
    const parsed = parseBytecodeString(safe.bytecode);
    const schoolId = KNOWN_SCHOOLS.has(parsed.schoolId) ? parsed.schoolId : 'VOID';
    const rarity = KNOWN_RARITIES.has(parsed.rarity) ? parsed.rarity : 'COMMON';
    const effect = KNOWN_EFFECTS.has(parsed.effect) ? parsed.effect : 'INERT';
    return { bytecode: createBytecodeString({ schoolId, rarity, effect }), schoolId, rarity, effect, source: 'explicit-bytecode' };
  }

  // 2. Explicit components.
  let schoolId = upper(safe.school || safe.schoolId, '');
  let rarity = upper(safe.rarity, '');
  let effect = upper(safe.effect, '');
  let source = 'components';

  // 3. Heuristic from material + formula shape.
  if (!schoolId) {
    schoolId = MATERIAL_TO_SCHOOL[String(safe.material || '').trim().toLowerCase()] || 'VOID';
    source = 'material';
  }
  const isComposite = safe.formula?.type === 'composite';
  const childCount = Array.isArray(safe.formula?.children) ? safe.formula.children.length : 0;
  if (!rarity) {
    rarity = childCount >= 3 ? 'INEXPLICABLE' : isComposite ? 'RARE' : 'COMMON';
  }
  if (!effect) {
    effect = isComposite ? 'HARMONIC' : 'RESONANT';
  }

  if (!KNOWN_SCHOOLS.has(schoolId)) schoolId = 'VOID';
  if (!KNOWN_RARITIES.has(rarity)) rarity = 'COMMON';
  if (!KNOWN_EFFECTS.has(effect)) effect = 'INERT';

  return { bytecode: createBytecodeString({ schoolId, rarity, effect }), schoolId, rarity, effect, source };
}
