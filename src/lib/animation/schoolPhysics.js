/**
 * @file src/lib/animation/schoolPhysics.js
 * @owner Codex
 * 
 * Physical animation constants derived from VAELRIX_LAW school signatures.
 * Defines timing, easing, and waveform shapes for the 8 schools.
 */

export const SCHOOL_PHYSICS = {
  SONIC: {
    durationMin: 400,
    durationMax: 800,
    easingCurve: 'cubic-bezier(0.25, 0, 0.1, 1)', // sharp attack
    waveform: 'pulse-wave', // rapid oscillation
    glowBehavior: 'flash-decay',
  },
  PSYCHIC: {
    durationMin: 600,
    durationMax: 1200,
    easingCurve: 'cubic-bezier(0.4, 0, 0.6, 1)', // smooth symmetric
    waveform: 'sine-wave', // smooth oscillation
    glowBehavior: 'diffuse-bloom',
  },
  ALCHEMY: {
    durationMin: 300,
    durationMax: 600,
    easingCurve: 'cubic-bezier(0.5, 0, 0.5, 1.5)', // slight overshoot
    waveform: 'sawtooth', // build then snap
    glowBehavior: 'chromatic-shift',
  },
  WILL: {
    durationMin: 800,
    durationMax: 1600,
    easingCurve: 'cubic-bezier(0.2, 0, 0.8, 1)', // sustained
    waveform: 'square-wave', // binary on/off beats
    glowBehavior: 'steady-glow',
  },
  VOID: {
    durationMin: 1200,
    durationMax: 2400,
    easingCurve: 'cubic-bezier(0.9, 0, 0.1, 1)', // slow ramp
    waveform: 'flat-decay', // fade without oscillation
    glowBehavior: 'cold-vignette',
  },
  ABJURATION: {
    durationMin: 1400,
    durationMax: 2000,
    easingCurve: 'cubic-bezier(0.3, 0, 0.7, 1)', // structural breathing
    waveform: 'sine-wave', // measured, architectural
    glowBehavior: 'steady-green-ward',
  },
  NECROMANCY: {
    durationMin: 1000,
    durationMax: 1800,
    easingCurve: 'cubic-bezier(0.6, 0, 0.4, 1)', // weight-forward
    waveform: 'decaying-sine', // fades to stillness
    glowBehavior: 'purple-residue',
  },
  DIVINATION: {
    durationMin: 500,
    durationMax: 1000,
    easingCurve: 'cubic-bezier(0.1, 0.9, 0.9, 0.1)', // anticipatory
    waveform: 'dual-pulse', // see-then-confirm
    glowBehavior: 'gold-shimmer',
  },
};

export const WAVEFORM_TO_KEYFRAME = {
  'pulse-wave': 'anim-pulse',
  'sine-wave': 'anim-breathe',
  'sawtooth': 'anim-sawtooth',
  'square-wave': 'anim-square',
  'flat-decay': 'anim-void',
  'decaying-sine': 'anim-decay',
  'dual-pulse': 'anim-shimmer',
};

/**
 * Rating Tier Scaling factors (lore sheet §5)
 */
export const RATING_SCALE = {
  Neophyte: { magnitude: 0.4, durationMultiplier: 0.6, glowMultiplier: 0.3 },
  Adept:    { magnitude: 0.7, durationMultiplier: 0.85, glowMultiplier: 0.6 },
  Master:   { magnitude: 1.0, durationMultiplier: 1.0, glowMultiplier: 1.0 },
  Godlike:  { magnitude: 1.35, durationMultiplier: 1.2, glowMultiplier: 1.5 },
};
