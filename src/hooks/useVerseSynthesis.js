import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { synthesizeVerse } from "../lib/truesight/compiler/VerseSynthesis.js";
import { verseIRMicroprocessors } from "../../codex/core/microprocessors/index.js";
import { parseBooleanEnvFlag } from "./useCODExPipeline.jsx";
import { ScholomanceDictionaryAPI } from "../lib/scholomanceDictionary.api.js";

const USE_SERVER_ANALYSIS = parseBooleanEnvFlag(import.meta.env.VITE_USE_SERVER_PANEL_ANALYSIS, true);

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
  const lastRequestContentRef = useRef("");

  const performSynthesis = useCallback(async (text) => {
    // Deterministic Guard: Stop if content is identical to last issued request
    if (text === lastRequestContentRef.current) return;
    
    const requestId = ++requestCount.current;
    lastRequestContentRef.current = text;
    
    setIsSynthesizing(true);
    setError(null);
    try {
      let result;

      if (USE_SERVER_ANALYSIS && ScholomanceDictionaryAPI.isEnabled()) {
        const response = await ScholomanceDictionaryAPI.analyzePanels(text, { nluMode: 'generate' });
        if (response?.data) {
          result = response.data;
          // Hydrate Maps which are lost during JSON serialization
          if (result.analysis?.wordAnalyses) {
            result.tokenByIdentity = new Map();
            result.tokenByCharStart = new Map();
            result.tokenByNormalizedWord = new Map();

            result.analysis.wordAnalyses.forEach(profile => {
              const identity = `${profile.lineIndex}:${profile.wordIndex}:${profile.charStart}`;
              result.tokenByIdentity.set(identity, profile);
              result.tokenByCharStart.set(profile.charStart, profile);
              if (!result.tokenByNormalizedWord.has(profile.normalizedWord)) {
                result.tokenByNormalizedWord.set(profile.normalizedWord, profile);
              }
            });
          }
          // Mapping for UI components that expect specific artifact fields
          result.verseIR = result.analysis?.compiler;
          result.syntaxLayer = result.analysis;
        }
      }

      if (!result) {
        // In V12, we offload this to the VerseSynthesis Microprocessor
        result = await verseIRMicroprocessors.execute('nlu.synthesizeVerse', { text, options: { mode, school } });
      }
      
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

    const requestId = ++requestCount.current;

    const timer = setTimeout(() => {
      if (requestId !== requestCount.current) return;
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
