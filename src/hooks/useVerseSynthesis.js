import { useState, useCallback, useMemo, useEffect } from "react";
import { synthesizeVerse } from "../lib/truesight/compiler/VerseSynthesis.js";

/**
 * useVerseSynthesis — UI Bridge to the VerseSynthesis AMP
 * 
 * Provides reactive access to the unified linguistic artifact.
 * Debounces raw input to prevent temporal jitter during drafting.
 */
export function useVerseSynthesis(content, options = {}) {
  const [artifact, setArtifact] = useState(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  const { mode = 'balanced' } = options;

  const performSynthesis = useCallback((text) => {
    setIsSynthesizing(true);
    try {
      // In V12, we offload this to the VerseSynthesis AMP
      // In a high-complexity world, this would be wrapped in a Worker pass.
      const result = synthesizeVerse(text, { mode });
      setArtifact(result);
    } catch (error) {
      console.error("[PB-SYNTHESIS] Transmutation failed:", error);
    } finally {
      setIsSynthesizing(false);
    }
  }, [mode]);

  useEffect(() => {
    if (!content) {
      setArtifact(null);
      return;
    }

    const timer = setTimeout(() => {
      performSynthesis(content);
    }, 150); // Debounce to allow the ink to settle

    return () => clearTimeout(timer);
  }, [content, performSynthesis]);

  return {
    artifact,
    isSynthesizing,
    // Helper accessors for UI panels
    verseIR: artifact?.verseIR,
    scheme: artifact?.scheme,
    meter: artifact?.meter,
    vowelSummary: artifact?.vowelSummary,
    literaryDevices: artifact?.literaryDevices,
    emotion: artifact?.emotion,
    totalSyllables: artifact?.totalSyllables || 0,
    tokenByIdentity: artifact?.tokenByIdentity || new Map(),
    tokenByCharStart: artifact?.tokenByCharStart || new Map(),
  };
}
