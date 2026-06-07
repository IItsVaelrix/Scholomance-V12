/**
 * Affinity Audio Profiles
 *
 * Maps each Scholomance spell affinity to its audio character:
 * base frequency, scale character, and material texture.
 *
 * Used by the SFX intent resolver to inject sonic identity into packets.
 *
 * CLASSIFICATION: core / pure / constants
 * LAYER: codex/core — NO DOM, NO side effects.
 */

import { AFFINITIES } from './pb-sfx.schema.js';

/**
 * @typedef {object} AffinityAudioProfile
 * @property {number} baseFrequencyHz - Fundamental pitch in Hz
 * @property {string} scale           - Musical character ('minor_pentatonic', 'lydian', etc.)
 * @property {string} material        - Sound texture descriptor for synthesis presets
 * @property {number} harmonicRich    - 0–1: how harmonically dense the sound is
 * @property {number} attackSharpness - 0–1: percussive (1) vs. swells (0)
 * @property {number} spaciousness    - 0–1: dry (0) vs. wide (1)
 */

export const AFFINITY_AUDIO_PROFILE = Object.freeze({
  [AFFINITIES.ALCHEMY]: Object.freeze({
    baseFrequencyHz: 432,
    scale:           'minor_pentatonic',
    material:        'glass_metal',
    harmonicRich:    0.7,
    attackSharpness: 0.6,
    spaciousness:    0.5,
  }),
  [AFFINITIES.PSYCHIC]: Object.freeze({
    baseFrequencyHz: 528,
    scale:           'lydian',
    material:        'sine_chorus',
    harmonicRich:    0.4,
    attackSharpness: 0.3,
    spaciousness:    0.8,
  }),
  [AFFINITIES.VOID]: Object.freeze({
    baseFrequencyHz: 174,
    scale:           'chromatic_low',
    material:        'sub_noise',
    harmonicRich:    0.2,
    attackSharpness: 0.8,
    spaciousness:    0.6,
  }),
  [AFFINITIES.LIGHT]: Object.freeze({
    baseFrequencyHz: 639,
    scale:           'major_lift',
    material:        'bell_prism',
    harmonicRich:    0.9,
    attackSharpness: 0.9,
    spaciousness:    0.7,
  }),
  [AFFINITIES.CODEX]: Object.freeze({
    baseFrequencyHz: 963,
    scale:           'harmonic_series',
    material:        'paper_crystal',
    harmonicRich:    0.8,
    attackSharpness: 0.5,
    spaciousness:    0.4,
  }),
  [AFFINITIES.SONIC]: Object.freeze({
    baseFrequencyHz: 741,
    scale:           'whole_tone',
    material:        'resonant_glass',
    harmonicRich:    0.6,
    attackSharpness: 0.7,
    spaciousness:    0.6,
  }),
});

/** Fallback profile used when affinity is unknown. */
export const FALLBACK_AUDIO_PROFILE = AFFINITY_AUDIO_PROFILE[AFFINITIES.CODEX];

/**
 * Resolves an affinity to its audio profile, with deterministic fallback.
 *
 * @param {string} affinity
 * @returns {AffinityAudioProfile}
 */
export function resolveAffinityProfile(affinity) {
  return AFFINITY_AUDIO_PROFILE[affinity] ?? FALLBACK_AUDIO_PROFILE;
}
