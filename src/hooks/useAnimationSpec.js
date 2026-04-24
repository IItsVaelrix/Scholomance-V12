/**
 * @file src/hooks/useAnimationSpec.js
 * @owner Claude
 * 
 * Custom hook to consume PixelBrain animation physics.
 * Translates signal data into React-ready classNames and CSS variables.
 */

import { useMemo } from 'react';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';
import { computeAnimationSpec } from '../lib/animation/computeAnimationSpec';

/**
 * Hook to derive animation properties from a PixelBrain signal.
 * @param {Object} signal - The PixelBrain signal object
 * @returns {Object} Animation specification for React
 */
export function useAnimationSpec(signal) {
  const reducedMotion = usePrefersReducedMotion();

  return useMemo(() => {
    if (!signal) return null;
    const hasDeterministicSignal = Boolean(
      signal.animationSpec
      || signal.dominantSchool
      || signal.burstUnlockStat
      || signal.archetypeEvolution
      || signal.discoveryEvent
    );
    if (!hasDeterministicSignal) return null;

    // The animation spec might already be pre-computed in the signal by Codex
    // but we compute it here if not present to ensure deterministic mapping.
    const spec = signal.animationSpec || computeAnimationSpec(signal);
    if (!spec) return null;

    return {
      cssVars: spec.cssVars ?? {},
      animClass: reducedMotion ? null : spec.keyframe,
      overlays: reducedMotion ? [] : (spec.overlays ?? []),
      emergent: reducedMotion ? null : (spec.emergent ?? null),
    };
  }, [signal, reducedMotion]);
}
