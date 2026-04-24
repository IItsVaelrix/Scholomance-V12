import { useMemo, useState, useEffect, useRef } from 'react';
import { 
  computeBlendedHsl, 
  resolveVerseIrColor, 
  VERSE_IR_PALETTE_FAMILIES 
} from '../lib/truesight/color/pcaChroma.js';
import { SCHOOLS } from '../data/schools.js';

/**
 * Hook to detect user preference for reduced motion.
 */
function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (event) => setReducedMotion(event.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return reducedMotion;
}

/**
 * Linear interpolation for numbers.
 */
function lerp(start, end, t) {
  return start + (end - start) * t;
}

/**
 * Linear interpolation for hue (handles 360 wrap).
 */
function lerpHue(start, end, t) {
  const d = end - start;
  const delta = d + (Math.abs(d) > 180 ? (d > 0 ? -360 : 360) : 0);
  return (start + delta * t + 360) % 360;
}

/**
 * Consumes school weights from the live analysis output and produces
 * a dynamically blended color palette that reflects the text's phonemic character.
 *
 * @param {object} analysisOutput - AnalyzedDocument from CODEx
 * @returns {{ palette: Record<string, string>, blendedHsl: object, dominantSchool: string|null }}
 */
export function useAdaptivePalette(analysisOutput) {
  const reducedMotion = useReducedMotion();
  
  const schoolWeights = useMemo(() => analysisOutput?.schoolWeights || {}, [analysisOutput]);
  
  // Target HSL derived from current weights
  const targetHsl = useMemo(() => {
    return computeBlendedHsl(schoolWeights, SCHOOLS);
  }, [schoolWeights]);

  const [currentHsl, setCurrentHsl] = useState(targetHsl);
  const rafRef = useRef();
  
  // Smoothly transition currentHsl toward targetHsl
  useEffect(() => {
    if (reducedMotion) {
      setCurrentHsl(targetHsl);
      return;
    }

    const duration = 600; // ms
    const startTime = performance.now();
    const startHsl = { ...currentHsl };

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out quad
      const t = progress * (2 - progress);

      setCurrentHsl({
        h: lerpHue(startHsl.h, targetHsl.h, t),
        s: lerp(startHsl.s, targetHsl.s, t),
        l: lerp(startHsl.l, targetHsl.l, t)
      });

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [targetHsl, reducedMotion, currentHsl]);

  // Build the static palette (phase 0) for general UI
  const palette = useMemo(() => {
    const p = {};
    const baseHsl = {
      h: Math.round(currentHsl.h),
      s: Math.round(currentHsl.s),
      l: Math.round(currentHsl.l)
    };

    VERSE_IR_PALETTE_FAMILIES.forEach(family => {
      p[family] = resolveVerseIrColor(family, null, { baseHsl, phase: 0 }).hex;
    });
    return p;
  }, [currentHsl]);

  /**
   * Resolves a color for a specific phoneme family and visual phase.
   * Phase allows for rhythmic alternation (0-1).
   */
  const getColor = useMemo(() => {
    const baseHsl = {
      h: Math.round(currentHsl.h),
      s: Math.round(currentHsl.s),
      l: Math.round(currentHsl.l)
    };

    return (family, phase = 0) => {
      return resolveVerseIrColor(family, null, { baseHsl, phase }).hex;
    };
  }, [currentHsl]);

  return {
    palette,
    getColor,
    blendedHsl: currentHsl,
    dominantSchool: analysisOutput?.dominantSchool || null
  };
}
