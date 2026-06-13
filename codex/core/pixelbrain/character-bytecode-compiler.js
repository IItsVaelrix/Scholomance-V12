/**
 * character-bytecode-compiler.js — Character effects bytecode compiler
 *
 * Compiles a CHARACTER-SPEC into GPU uniform values for the character
 * effects shader. Produces deterministic output given the same spec.
 *
 * Output uniforms:
 *   u_schoolGlow        vec3  — school magic glow colour
 *   u_rimColor          vec3  — rim light colour from school primary
 *   u_eyeColor          vec3  — eye iris colour from material
 *   u_glowIntensity     float — glow strength [0.3, 1.5]
 *   u_atmosphereOpacity float — ambient atmosphere [0, 0.8]
 */

import { MATERIAL_PALETTES } from './material-registry.js';

/**
 * Inlined from src/pages/Combat/assets/combatAssets.js to avoid pulling in
 * the browser-facing import chain (wandSvg → engine.adapter → …).
 * Must stay in sync with SCHOOL_PALETTE in combatAssets.js.
 */
const SCHOOL_PALETTE = {
  SONIC:   { primary: '#8a5bff', glow: '#b79bff', dark: '#1a0f33', accent: '#ffe27a' },
  VOID:    { primary: '#9a6bff', glow: '#c8a2ff', dark: '#0c0c1a', accent: '#ff7ae0' },
  PSYCHIC: { primary: '#00e5ff', glow: '#9bf6ff', dark: '#04222b', accent: '#ffe27a' },
  ALCHEMY: { primary: '#ff3d8b', glow: '#ff9dc4', dark: '#2b0418', accent: '#ffd36e' },
  WILL:    { primary: '#ffd400', glow: '#fff19b', dark: '#2b2200', accent: '#fff7cc' },
};

function hexToVec3(hex) {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ];
}

const GLOW_INTENSITY = { VOID: 0.9, PSYCHIC: 0.8, SONIC: 0.6, ALCHEMY: 0.7, WILL: 0.65 };
const ATMOSPHERE_OPACITY = { VOID: 0.5, PSYCHIC: 0.4, SONIC: 0.25, ALCHEMY: 0.3, WILL: 0.2 };

/**
 * Compile a CHARACTER-SPEC into GPU shader uniform values.
 *
 * @param {Object} spec — character spec with contract, materials, combatProfile
 * @returns {{ u_schoolGlow: number[], u_rimColor: number[], u_eyeColor: number[],
 *             u_glowIntensity: number, u_atmosphereOpacity: number }}
 */
export function compileEffectsBytecode(spec) {
  const school = spec.combatProfile?.school ?? 'SONIC';
  const palette = SCHOOL_PALETTE[school] ?? SCHOOL_PALETTE.SONIC;

  const eyeMaterial = spec.materials?.eyes ?? 'eye_brown';
  const eyeEntry = MATERIAL_PALETTES[eyeMaterial];
  // Fall back to eye_brown body anchor if material not found
  const eyeHex = eyeEntry?.anchors?.body ?? '#6A3828';

  return {
    u_schoolGlow:        hexToVec3(palette.glow),
    u_rimColor:          hexToVec3(palette.primary),
    u_eyeColor:          hexToVec3(eyeHex),
    u_glowIntensity:     GLOW_INTENSITY[school] ?? 0.5,
    u_atmosphereOpacity: ATMOSPHERE_OPACITY[school] ?? 0.25,
  };
}
