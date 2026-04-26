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

function roundHsl(hsl) {
  return {
    h: Math.round(hsl.h),
    s: Math.round(hsl.s),
    l: Math.round(hsl.l)
  };
}

function buildPalette(baseHsl) {
  const palette = {};
  VERSE_IR_PALETTE_FAMILIES.forEach(family => {
    palette[family] = resolveVerseIrColor(family, null, { baseHsl, phase: 0 }).hex;
  });
  return palette;
}

function buildColorResolver(baseHsl) {
  return (family, phase = 0) => {
    return resolveVerseIrColor(family, null, { baseHsl, phase }).hex;
  };
}

/**
 * Consumes school weights from the live analysis output and produces
 * canonical chroma plus optional animated ambience for the current analysis.
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
  const currentHslRef = useRef(targetHsl);
  const rafRef = useRef();
  
  // Smoothly transition currentHsl toward targetHsl
  useEffect(() => {
    const commitHsl = (nextHsl) => {
      currentHslRef.current = nextHsl;
      setCurrentHsl(nextHsl);
    };

    if (reducedMotion) {
      commitHsl(targetHsl);
      return;
    }

    const duration = 600; // ms
    const startTime = performance.now();
    const startHsl = { ...currentHslRef.current };

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out quad
      const t = progress * (2 - progress);

      commitHsl({
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
  }, [targetHsl, reducedMotion]);

  const canonicalBaseHsl = useMemo(() => roundHsl(targetHsl), [targetHsl]);
  const ambientBaseHsl = useMemo(() => roundHsl(currentHsl), [currentHsl]);

  // Canonical chroma is deterministic for a given analysis output.
  const palette = useMemo(() => buildPalette(canonicalBaseHsl), [canonicalBaseHsl]);
  const ambientPalette = useMemo(() => buildPalette(ambientBaseHsl), [ambientBaseHsl]);

  /**
   * Resolves a color for a specific phoneme family and visual phase.
   * Phase allows for rhythmic alternation (0-1).
   */
  const getColor = useMemo(() => buildColorResolver(canonicalBaseHsl), [canonicalBaseHsl]);
  const getAmbientColor = useMemo(() => buildColorResolver(ambientBaseHsl), [ambientBaseHsl]);

  return {
    palette,
    ambientPalette,
    getColor,
    getAmbientColor,
    blendedHsl: currentHsl,
    canonicalHsl: targetHsl,
    dominantSchool: analysisOutput?.dominantSchool || null
  };
}
