/**
 * @file src/lib/animation/computeAnimationSpec.js
 * @owner Codex
 * 
 * Pure function to derive an animation specification from a PixelBrain signal.
 * Implements the deterministic mapping required by VAELRIX_LAW.
 */

import { SCHOOL_PHYSICS, WAVEFORM_TO_KEYFRAME, RATING_SCALE } from './schoolPhysics';

const lerp = (min, max, t) => min + (max - min) * t;

const STAT_OVERLAYS = {
  SYNT: { class: 'overlay-synt', duration: 400 },
  META: { class: 'overlay-meta', duration: 500 },
  MYTH: { class: 'overlay-myth', duration: 600 },
  VIS:  { class: 'overlay-vis',  duration: 350 },
  PSYC: { class: 'overlay-psyc', duration: 450 },
  CODEX: { class: 'overlay-codex', duration: 700 },
  CNWV: { class: 'overlay-cnwv', duration: 800 },
  CINF: { class: 'overlay-cinf', duration: 900 },
  PSCH: { class: 'overlay-psch', duration: 750 },
  EXCL: { class: 'overlay-excl', duration: 500 },
  VOID: { class: 'overlay-void', duration: 1000 },
};

const OVERLAY_THRESHOLD = {
  SYNT: (r) => ['Adept', 'Master', 'Godlike'].includes(r),
  META: (r) => ['Master', 'Godlike'].includes(r),
  MYTH: (r) => ['Master', 'Godlike'].includes(r),
  VIS:  (r) => ['Adept', 'Master', 'Godlike'].includes(r),
  PSYC: (r) => ['Adept', 'Master', 'Godlike'].includes(r),
  CODEX: (r) => ['Master', 'Godlike'].includes(r),
  CNWV: (r) => false, // Only for bursts
  CINF: (r) => false, // Only for bursts
  PSCH: (r) => false, // Only for bursts
  EXCL: (r) => false, // Only for bursts
  VOID: (r) => false, // Only for bursts
};

/**
 * Derives the complete animation specification from PixelBrain signal.
 * @param {Object} signal - The PixelBrain signal object
 * @returns {Object} Animation specification
 */
export function computeAnimationSpec(signal) {
  if (!signal || !signal.dominantSchool) {
    return null;
  }

  const school = SCHOOL_PHYSICS[signal.dominantSchool] || SCHOOL_PHYSICS.ABJURATION;
  
  // Base timing from school + glowIntensity
  const intensity = signal.glowIntensity ?? 0.5;
  const duration = Math.round(lerp(school.durationMin, school.durationMax, intensity));
  const easing = school.easingCurve;
  
  // Glow from blended HSL
  const { h, s, l } = signal.blendedHsl ?? { h: 0, s: 0, l: 80 };
  const glowRadius = Math.round(intensity * 20); // 0–20px
  const glowAlpha = (intensity * 0.6).toFixed(2);
  const glowColor = `hsla(${h}, ${s}%, ${Math.min(l + 20, 95)}%, ${glowAlpha})`;
  
  // Waveform drives keyframe selection
  const keyframe = WAVEFORM_TO_KEYFRAME[school.waveform] || 'anim-breathe';
  
  // Stat overlays (only if statScores present)
  const overlays = (signal.statScores ?? [])
    .filter(s => OVERLAY_THRESHOLD[s.stat]?.(s.rating))
    .map(s => ({
      stat: s.stat,
      ...STAT_OVERLAYS[s.stat],
      magnitude: RATING_SCALE[s.rating].magnitude,
    }));
  
  // Emergent event spec
  const emergent = signal.burstUnlockStat
    ? buildBurstSpec(signal)
    : signal.archetypeEvolution
    ? buildArchetypeSpec(signal)
    : signal.discoveryEvent
    ? buildDiscoverySpec(signal)
    : null;
  
  // Build spec
  return {
    duration,
    easing,
    glowRadius,
    glowColor,
    keyframe,
    color: `hsl(${h}, ${s}%, ${l}%)`,
    overlays,
    emergent,
    cssVars: {
      '--anim-duration': `${duration}ms`,
      '--anim-easing': easing,
      '--anim-glow-radius': `${glowRadius}px`,
      '--anim-glow-color': glowColor,
      '--anim-color': `hsl(${h}, ${s}%, ${l}%)`,
      '--anim-h': h,
      '--anim-s': `${s}%`,
      '--anim-l': `${l}%`,
    },
  };
}

function buildBurstSpec(signal) {
  const { h, s, l } = signal.blendedHsl ?? { h: 0, s: 0, l: 80 };
  const intensity = signal.glowIntensity ?? 0.5;
  const syllableDepth = signal.syllableDepth ?? 4;

  return {
    type: 'burst',
    stat: signal.burstUnlockStat,
    color: `hsla(${h}, ${s}%, ${Math.min(l + 15, 95)}%, 1)`,
    glowRadius: Math.round(intensity * 40),
    cascadeDuration: 800 + (syllableDepth * 120),
    cssVars: {
      '--burst-color': `hsla(${h}, ${s}%, ${Math.min(l + 15, 95)}%, 1)`,
      '--burst-glow-radius': `${Math.round(intensity * 40)}px`,
      '--burst-cascade-duration': `${800 + (syllableDepth * 120)}ms`,
    }
  };
}

function buildArchetypeSpec(signal) {
  const { h, s, l } = signal.blendedHsl ?? { h: 0, s: 0, l: 80 };
  return {
    type: 'archetype',
    evolution: signal.archetypeEvolution,
    color: `hsla(${h}, ${s}%, ${Math.min(l + 20, 95)}%, 1)`,
    cssVars: {
      '--evolve-color': `hsla(${h}, ${s}%, ${Math.min(l + 20, 95)}%, 1)`,
    }
  };
}

function buildDiscoverySpec(signal) {
  const school = SCHOOL_PHYSICS[signal.dominantSchool] || SCHOOL_PHYSICS.DIVINATION;
  return {
    type: 'discovery',
    discoveryType: signal.discoveryEvent,
    keyframe: school.waveform === 'dual-pulse' ? 'anim-shimmer' : 'anim-breathe',
  };
}
