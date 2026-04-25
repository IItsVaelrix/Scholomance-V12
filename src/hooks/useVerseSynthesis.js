import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { synthesizeVerse } from "../lib/truesight/compiler/VerseSynthesis.js";
import { verseIRMicroprocessors } from "../../codex/core/microprocessors/index.js";

/**
 * useVerseSynthesis — UI Bridge to the VerseSynthesis AMP
 * 
 * Provides reactive access to the unified linguistic artifact.
 * Debounces raw input to prevent temporal jitter during drafting.
 */
export function useVerseSynthesis(content, options = {}) {
  const [artifact, setArtifact] = useState(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [error, setError] = useState(null);

  const { mode = 'balanced', school = 'DEFAULT' } = options;

  const [highlightedGroup, setHighlightedGroup] = useState(null);
  
  const requestCount = useRef(0);

  const performSynthesis = useCallback(async (text) => {
    const requestId = ++requestCount.current;
    setIsSynthesizing(true);
    setError(null);
    try {
      // In V12, we offload this to the VerseSynthesis Microprocessor
      const result = await verseIRMicroprocessors.execute('nlu.synthesizeVerse', { text, options: { mode, school } });
      
      if (requestId === requestCount.current) {
        setArtifact(result);
      }
    } catch (err) {
      if (requestId === requestCount.current) {
        console.error("[PB-SYNTHESIS] Transmutation failed:", err);
        setError(err.message || 'Synthesis failed');
        // Fallback to local synchronous analysis if microprocessor fails
        const fallback = synthesizeVerse(text, { mode, school });
        setArtifact(fallback);
      }
    } finally {
      if (requestId === requestCount.current) {
        setIsSynthesizing(false);
      }
    }
  }, [mode, school]);

  const highlightRhymeGroup = useCallback((groupLabel) => {
    setHighlightedGroup(groupLabel);
  }, []);

  const clearHighlight = useCallback(() => {
    setHighlightedGroup(null);
  }, []);

  const activeConnections = useMemo(() => {
    if (!highlightedGroup) return artifact?.syntaxLayer?.allConnections || artifact?.verseIR?.connections || [];
    const all = artifact?.syntaxLayer?.allConnections || artifact?.verseIR?.connections || [];
    return Array.isArray(all) ? all.filter(c => c.groupLabel === highlightedGroup) : [];
  }, [highlightedGroup, artifact]);

  useEffect(() => {
    if (!content) {
      setArtifact(null);
      setError(null);
      return;
    }

    const timer = setTimeout(() => {
      performSynthesis(content);
    }, 600); // 600ms debounce for heavy analysis

    return () => clearTimeout(timer);
  }, [content, performSynthesis]);

  return {
    artifact,
    isSynthesizing,
    error,
    activeConnections,
    highlightRhymeGroup,
    clearHighlight,
    // Helper accessors for UI panels
    verseIR: artifact?.verseIR,
    syntaxLayer: artifact?.syntaxLayer,
    scheme: artifact?.scheme,
    meter: artifact?.meter,
    vowelSummary: artifact?.vowelSummary,
    literaryDevices: artifact?.literaryDevices,
    emotion: artifact?.emotion,
    totalSyllables: artifact?.totalSyllables || 0,
    analyzedWords: artifact?.tokenByNormalizedWord || new Map(),
    tokenByIdentity: artifact?.tokenByIdentity || new Map(),
    tokenByCharStart: artifact?.tokenByCharStart || new Map(),
  };
}
