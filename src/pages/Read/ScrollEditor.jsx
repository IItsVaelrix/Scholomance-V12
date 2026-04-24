import { useState, useEffect, useLayoutEffect, useRef, useCallback, forwardRef, useImperativeHandle, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../../hooks/useTheme.jsx";
import { useColorCodex } from "../../hooks/useColorCodex.js";
import IntelliSense from "../../components/IntelliSense.jsx";
import { computeGridTopology } from "../../lib/truesight/compiler/truesightGrid";
import { computeAdaptiveGridTopology, buildTruesightOverlayLines } from "../../lib/truesight/compiler/adaptiveWhitespaceGrid";
import { loadCorpusFrequencies } from "../../lib/truesight/compiler/corpusWhitespaceGrid";
import { ViewportChannel } from "../../lib/truesight/compiler/viewportBytecode";
import Gutter from "./Gutter.jsx";
import { normalizeVowelFamily } from "../../lib/phonology/vowelFamily.js";
import { WORD_TOKEN_REGEX } from "../../lib/wordTokenization.js";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion.js";
import { decodeBytecode } from "./bytecodeRenderer.js";
import { buildRhymeColorRegistry, resolveTokenColor } from "../../lib/truesight/color/rhymeColorRegistry.js";
import { VOWEL_FAMILY_TO_SCHOOL } from "../../data/schools.js";
import { resolvePlsVerseIRState } from "../../lib/pls/verseIRBridge.js";
import { resolveSonicChroma } from "../../lib/phonology/vowelWheel.js";
import { BytecodeError, ERROR_CATEGORIES, ERROR_SEVERITY, ERROR_CODES, MODULE_IDS } from "../../lib/pixelbrain.adapter.js";
import AnimatedSurface from "../../components/AnimatedSurface";


const MAX_CONTENT_LENGTH = 50000;
const DEFAULT_LINE_HEIGHT = 24;

function normalizeWordToken(token) {
  return String(token || "")
    .trim()
    .replace(/^[^A-Za-z']+|[^A-Za-z']+$/g, "")
    .toUpperCase();
}

function toFiniteInt(value, fallback = -1) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.trunc(num);
}

function findSyntaxTokenForCursor(syntaxLayer, lineNumber, targetWordIndex, targetCharStart) {
  if (!syntaxLayer || typeof syntaxLayer !== "object") return null;

  const byIdentity = syntaxLayer.tokenByIdentity;
  const byCharStart = syntaxLayer.tokenByCharStart;
  const tokens = Array.isArray(syntaxLayer.tokens) ? syntaxLayer.tokens : [];

  if (byIdentity?.get && Number.isInteger(targetCharStart) && targetCharStart >= 0) {
    const identity = `${lineNumber}:${targetWordIndex}:${targetCharStart}`;
    const identityToken = byIdentity.get(identity);
    if (identityToken) return identityToken;
  }

  if (byCharStart?.get && Number.isInteger(targetCharStart) && targetCharStart >= 0) {
    const exactCharToken = byCharStart.get(targetCharStart);
    if (exactCharToken) return exactCharToken;
  }

  const lineTokens = tokens
    .filter((token) => toFiniteInt(token?.lineNumber, -1) === lineNumber)
    .sort((a, b) => toFiniteInt(a?.wordIndex, 0) - toFiniteInt(b?.wordIndex, 0));

  if (lineTokens.length === 0) return null;

  if (Number.isInteger(targetCharStart) && targetCharStart >= 0) {
    const rangeMatch = lineTokens.find((token) => {
      const start = toFiniteInt(token?.charStart, -1);
      const end = toFiniteInt(token?.charEnd, -1);
      if (start < 0 || end < start) return false;
      return targetCharStart >= start && targetCharStart <= end;
    });
    if (rangeMatch) return rangeMatch;
  }

  const exactWordIndex = lineTokens.find(
    (token) => toFiniteInt(token?.wordIndex, -1) === targetWordIndex
  );
  if (exactWordIndex) return exactWordIndex;

  const closestPrior = [...lineTokens]
    .reverse()
    .find((token) => toFiniteInt(token?.wordIndex, -1) <= targetWordIndex);
  if (closestPrior) return closestPrior;

  return lineTokens[lineTokens.length - 1];
}

/**
 * Resolves a word token at the given character offset.
 * Uses the syntaxLayer if available, otherwise falls back to regex tokenization.
 */
function resolveWordTokenAtOffset(cursorOffset, syntaxLayer, content) {
  if (!syntaxLayer || typeof syntaxLayer !== "object") {
    // Fallback: basic tokenization from content
    const beforeCursor = String(content || "").slice(0, Math.max(0, cursorOffset));
    const lines = beforeCursor.split("\n");
    const lineNumber = Math.max(0, lines.length - 1);
    const currentLineText = lines[lines.length - 1] || "";
    const words = currentLineText.match(WORD_TOKEN_REGEX) || [];
    const targetWordIndex = words.length;
    
    return {
      lineNumber,
      wordIndex: targetWordIndex,
      charStart: beforeCursor.length,
      charEnd: beforeCursor.length,
      token: words[targetWordIndex - 1] || "",
    };
  }

  // Use syntax layer for precise token resolution
  const beforeCursor = String(content || "").slice(0, Math.max(0, cursorOffset));
  const linesBefore = beforeCursor.split("\n");
  const lineNumber = Math.max(0, linesBefore.length - 1);
  const currentLineText = linesBefore[linesBefore.length - 1] || "";
  const words = currentLineText.match(WORD_TOKEN_REGEX) || [];
  const targetWordIndex = words.length;

  const syntaxToken = findSyntaxTokenForCursor(
    syntaxLayer,
    lineNumber,
    targetWordIndex,
    cursorOffset
  );

  if (syntaxToken) {
    return {
      ...syntaxToken,
      lineNumber: toFiniteInt(syntaxToken?.lineNumber, lineNumber),
      wordIndex: toFiniteInt(syntaxToken?.wordIndex, targetWordIndex),
      charStart: toFiniteInt(syntaxToken?.charStart, cursorOffset),
      charEnd: toFiniteInt(syntaxToken?.charEnd, cursorOffset),
    };
  }

  // Fallback
  return {
    lineNumber,
    wordIndex: targetWordIndex,
    charStart: cursorOffset,
    charEnd: cursorOffset,
    token: "",
  };
}

/**
 * Builds a word activation payload from a token entry.
 */
function buildWordPayloadFromToken(tokenEntry) {
  if (!tokenEntry) return null;

  const rawToken = tokenEntry.token || "";
  const normalizedWord = normalizeWordToken(rawToken);
  const vowelFamily = tokenEntry.vowelFamily || null;
  const school = vowelFamily ? VOWEL_FAMILY_TO_SCHOOL[normalizeVowelFamily(vowelFamily)] : null;

  return {
    word: rawToken,
    normalizedWord,
    charStart: toFiniteInt(tokenEntry?.charStart, -1),
    charEnd: toFiniteInt(tokenEntry?.charEnd, -1),
    lineNumber: toFiniteInt(tokenEntry?.lineNumber, -1),
    wordIndex: toFiniteInt(tokenEntry?.wordIndex, -1),
    vowelFamily,
    school,
    analysis: tokenEntry.analysis || null,
    bytecode: tokenEntry.visualBytecode || tokenEntry.trueVisionBytecode || null,
  };
}

/**
 * Emits a word activation event via the onWordActivate callback.
 */
function emitWordActivation(trigger, wordPayload, anchorRect, onWordActivate) {
  if (!onWordActivate || !wordPayload) return;

  const activation = {
    trigger,
    ...wordPayload,
    anchorRect,
  };

  onWordActivate(activation);
}

// Cached styles to avoid layout thrashing during animation frames
let cachedEditorStyles = null;

function getCursorCoordsFromTextarea(textarea, mirrored = false, topology = null) {
  if (!textarea) return { x: 0, y: 0 };
  
  // Use cached styles if available to avoid getComputedStyle layout thrashing
  if (!cachedEditorStyles) {
    const s = window.getComputedStyle(textarea);
    cachedEditorStyles = {
      fontSize: parseFloat(s.fontSize) || 16,
      lineHeightStr: s.lineHeight,
      fontWeight: s.fontWeight,
      fontFamily: s.fontFamily,
      paddingLeft: parseFloat(s.paddingLeft) || 0,
      paddingTop: parseFloat(s.paddingTop) || 0,
    };
    
    // Auto-clear cache after 5 seconds or on resize
    setTimeout(() => { cachedEditorStyles = null; }, 5000);
  }

  const { fontSize, lineHeightStr, fontWeight, fontFamily, paddingLeft, paddingTop } = cachedEditorStyles;
  let lineHeight = parseFloat(lineHeightStr);
  
  if (!lineHeightStr.includes('px') && lineHeight < 10) {
    lineHeight = lineHeight * fontSize;
  }
  if (isNaN(lineHeight)) lineHeight = fontSize * 1.5;

  const rect = textarea.getBoundingClientRect();
  const pos = textarea.selectionStart;
  const text = textarea.value.substring(0, pos);
  const lines = text.split('\n');
  const lineNum = lines.length - 1;
  const currentLineText = lines[lineNum];

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  const textWidth = ctx.measureText(currentLineText).width;

  let x = paddingLeft + textWidth;

  // Apply mirroring if enabled
  if (mirrored && topology) {
    // For a single point (the caret), we use the point mirror formula: x' = (totalWidth - x)
    // We base it on the topology content width
    x = topology.totalWidth - x;
  }

  return {
    x: rect.left + x,
    y: rect.top + paddingTop + (lineNum * lineHeight) + (lineHeight * 0.8) - textarea.scrollTop,
  };
}

const ScrollEditor = forwardRef(function ScrollEditor({
  documentIdentity = "new:0",
  initialTitle = "",
  initialContent = "",
  onSave,
  onCancel,
  isEditable = true,
  disabled = false,
  isTruesight = false,
  isPredictive = false,
  onContentChange,
  onTitleChange,
  analyzedWords = new Map(),
  analyzedWordsByIdentity = new Map(),
  analyzedWordsByCharStart = new Map(),
  activeConnections = [],
  lineSyllableCounts = [],
  highlightedLines = [],
  pinnedLines = null,
  syntaxLayer = null,
  analysisMode = 'none',
  onWordActivate,
  onCursorChange,
  onScrollChange,
  predict,
  getCompletions,
  checkSpelling,
  getSpellingSuggestions,
  predictorReady,
  plsPhoneticFeatures,
  mirrored = false,
  vowelColors = {},
  vowelColorResolver = null,
}, ref) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [contentForOverlay, setContentForOverlay] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const [cursorCoords, setCursorCoords] = useState({ x: 0, y: 0 });
  const [lineHeightPx, setLineHeightPx] = useState(DEFAULT_LINE_HEIGHT);
  const [intellisenseSuggestions, setIntellisenseSuggestions] = useState([]);
  const scrollTopRef = useRef(0);
  const [ghostData, setGhostData] = useState(null);   // { sortedLines, initialYMap }
  const [isGhostPinned, setIsGhostPinned] = useState(false);
  const [intellisenseIndex, setIntellisenseIndex] = useState(0);
  const textareaRef = useRef(null);
  const wordBackgroundLayerRef = useRef(null);
  const markdownRef = useRef(null);
  const bootPayloadRef = useRef({
    title: String(initialTitle || ""),
    content: String(initialContent || ""),
  });
  const isReadOnlyTruesight = isTruesight && !isEditable;
  const isReadOnlyPlain = !isTruesight && !isEditable;

  bootPayloadRef.current = {
    title: String(initialTitle || ""),
    content: String(initialContent || ""),
  };

  // Bytecode-driven viewport integration
  const [viewportState, setViewportState] = useState(() => ViewportChannel.getState());
  
  // Subscribe to viewport bytecode channel
  useEffect(() => {
    const unsubscribe = ViewportChannel.bind('scroll-editor', (vp) => {
      setViewportState(vp);
    });
    
    return unsubscribe;
  }, []);
  
  // Load corpus for CEAG (Corpus-Enhanced Adaptive Grid)
  useEffect(() => {
    loadCorpusFrequencies().then(freq => {
      if (freq.size > 0) {
        console.log(`[ScrollEditor] CEAG loaded ${freq.size} corpus words`);
      }
    });
  }, []);
  
  // Bytecode-driven cursor alignment
  // Adaptive grid topology that updates on resize/CSS variable changes
  const wrapperRef = useRef(null);

  // --- Accessibility Fix: Blur hidden textarea ---
  useEffect(() => {
    if (isReadOnlyTruesight && !!onWordActivate) {
      if (document.activeElement === textareaRef.current) {
        textareaRef.current.blur();
      }
    }
  }, [isReadOnlyTruesight, onWordActivate]);

  const [computedTypography, setComputedTypography] = useState(null);
  const [gridTopology, setGridTopology] = useState(null);
  const [adaptiveTopology, setAdaptiveTopology] = useState(null);
  const [, setBytecodeArtifacts] = useState([]);

  useLayoutEffect(() => {
    const { title: nextTitle, content: nextContent } = bootPayloadRef.current;

    setTitle(nextTitle);
    setContent(nextContent);
    setContentForOverlay(nextContent);
    setIsSaving(false);
    setScrollTop(0);
    scrollTopRef.current = 0;
    setCursorCoords({ x: 0, y: 0 });
    setIntellisenseSuggestions([]);
    setIntellisenseIndex(0);
    setGhostData(null);
    setIsGhostPinned(false);
    cachedEditorStyles = null;

    for (const node of [textareaRef.current, wordBackgroundLayerRef.current, markdownRef.current]) {
      if (!node) continue;
      node.scrollTop = 0;
      node.scrollLeft = 0;
    }
  }, [documentIdentity]);

  // --- Bytecode Guard: Style Invariant Verification ---
  const verifyTypographyInvariant = useCallback((textareaStyles, overlayStyles) => {
    const criticalFields = ['fontFamily', 'fontSize', 'lineHeight', 'paddingLeft', 'paddingTop'];
    for (const field of criticalFields) {
      if (textareaStyles[field] !== overlayStyles[field]) {
        const error = new BytecodeError(
          ERROR_CATEGORIES.TYPE,
          ERROR_SEVERITY.CRIT,
          MODULE_IDS.SHARED,
          ERROR_CODES.TYPE_MISMATCH,
          {
            field,
            expected: textareaStyles[field],
            actual: overlayStyles[field],
            component: 'ScrollEditor',
            reason: 'Typography mismatch between substrate and overlay'
          }
        );
        console.error(`[PB-GUARD] Typography Invariant Violated: ${error.bytecode}`);
        setBytecodeArtifacts(prev => [...prev.slice(-4), error.bytecode]);
        return false;
      }
    }
    return true;
  }, []);

  // --- Bytecode Guard: Overlay Geometry Invariant ---
  // Verifies that the Truesight overlay and the textarea share the exact bounding rect.
  // A mismatch means pixel-perfect word hit-testing is broken.
  useEffect(() => {
    if (!isTruesight) return;
    const overlay = wordBackgroundLayerRef.current;
    const textarea = textareaRef.current;
    if (!overlay || !textarea) return;

    const overlayRect = overlay.getBoundingClientRect();
    const textareaRect = textarea.getBoundingClientRect();
    const TOLERANCE = 1; // 1px — sub-pixel rounding is acceptable

    const dTop  = Math.abs(overlayRect.top    - textareaRect.top);
    const dLeft = Math.abs(overlayRect.left   - textareaRect.left);
    const dW    = Math.abs(overlayRect.width  - textareaRect.width);
    const dH    = Math.abs(overlayRect.height - textareaRect.height);

    if (dTop > TOLERANCE || dLeft > TOLERANCE || dW > TOLERANCE || dH > TOLERANCE) {
      const geoError = new BytecodeError(
        ERROR_CATEGORIES.COORD,
        ERROR_SEVERITY.CRIT,
        MODULE_IDS.SHARED,
        ERROR_CODES.COORD_OUT_OF_BOUNDS,
        {
          reason: 'Truesight overlay geometry diverges from substrate textarea — pixel-perfect word hit-testing is compromised',
          delta: { top: dTop.toFixed(2), left: dLeft.toFixed(2), width: dW.toFixed(2), height: dH.toFixed(2) },
          overlay:  { top: overlayRect.top.toFixed(1), left: overlayRect.left.toFixed(1), w: overlayRect.width.toFixed(1),  h: overlayRect.height.toFixed(1) },
          textarea: { top: textareaRect.top.toFixed(1), left: textareaRect.left.toFixed(1), w: textareaRect.width.toFixed(1), h: textareaRect.height.toFixed(1) },
          component: 'ScrollEditor'
        }
      );
      console.error(`[PB-GUARD] Overlay Geometry Invariant Violated: ${geoError.bytecode}`);
      setBytecodeArtifacts(prev => [...prev.slice(-4), geoError.bytecode]);
    }
  }, [isTruesight, computedTypography]);

  // Compute typography from the active surface and geometry from the wrapper.
  // Plain read-only mode, editable mode, and TrueSight all render through
  // different substrates, so the style source must follow the active surface.
  const updateTypography = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const start = performance.now();

    if (import.meta.env.MODE === 'test') {
      console.log(`[ScrollEditor] updateTypography: ${wrapper.clientWidth}x${wrapper.clientHeight}, content: ${content?.length}`);
    }

    const styleSource =
      (isReadOnlyPlain ? markdownRef.current : null) ||
      (isTruesight ? wordBackgroundLayerRef.current : null) ||
      textareaRef.current ||
      wrapper;
    const styles = window.getComputedStyle(styleSource);
    const topology = computeGridTopology(wrapper);

    // Collect sample tokens from content for adaptive measurement
    const sampleTokens = content?.split(/\s+/).slice(0, 10) || [];
    const adaptiveTopo = computeAdaptiveGridTopology(wrapper, sampleTokens);

    setComputedTypography({
      fontFamily: styles.fontFamily,
      fontSize: styles.fontSize,
      lineHeight: styles.lineHeight,
      letterSpacing: styles.letterSpacing,
      wordSpacing: styles.wordSpacing,
      paddingTop: styles.paddingTop,
      paddingRight: styles.paddingRight,
      paddingBottom: styles.paddingBottom,
      paddingLeft: styles.paddingLeft,
      fontStyle: styles.fontStyle,
      fontWeight: styles.fontWeight,
    });

    if (topology) {
      setGridTopology(topology);
    }

    if (adaptiveTopo) {
      setAdaptiveTopology(adaptiveTopo);
      if (adaptiveTopo.baseCellHeight) {
        setLineHeightPx(adaptiveTopo.baseCellHeight);
      }
    }

    const duration = performance.now() - start;
    // Typography measurement is a synchronous layout read that legitimately exceeds
    // one frame on large documents. Only emit UI_STASIS for durations that represent
    // an actionable freeze (>100ms), not routine recalculation.
    if (duration > 100) {
      const stasisErr = new BytecodeError(
        ERROR_CATEGORIES.UI_STASIS,
        ERROR_SEVERITY.WARN,
        'UISTAS',
        0x0E01,
        {
          operation: 'updateTypography',
          actualDuration: duration,
          timeoutMs: 100,
          contentLength: content?.length || 0
        }
      );
      console.warn(`[PB-GUARD] UI Stasis Detected: ${stasisErr.bytecode}`);
    }
  }, [content, isReadOnlyPlain, isTruesight]);
  
  // Initial capture + adaptive updates via ResizeObserver
  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    
    // Initial computation
    updateTypography();
    
    // Adaptive: watch for CSS variable changes via ResizeObserver
    // Guarded by requestAnimationFrame to prevent layout recursion/thrashing
    let frameId;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        updateTypography();
      });
    });
    
    observer.observe(wrapper);
    
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frameId);
    };
  }, [updateTypography]);
  
  const cursorSync = useMemo(() => {
    if (!computedTypography || !gridTopology) return null;
    
    const textareaStyles = {
      fontFamily: computedTypography.fontFamily,
      fontSize: computedTypography.fontSize,
      lineHeight: computedTypography.lineHeight,
      letterSpacing: computedTypography.letterSpacing,
      wordSpacing: computedTypography.wordSpacing,
      paddingTop: computedTypography.paddingTop,
      paddingRight: computedTypography.paddingRight,
      paddingBottom: computedTypography.paddingBottom,
      paddingLeft: computedTypography.paddingLeft,
      tabSize: 2,
      MozTabSize: 2,
      boxSizing: 'border-box',
      WebkitTextFillColor: 'currentColor',
      resize: 'none',
      overflow: 'auto',
    };

    const overlayStyles = {
      fontFamily: computedTypography.fontFamily,
      fontSize: computedTypography.fontSize,
      lineHeight: computedTypography.lineHeight,
      letterSpacing: computedTypography.letterSpacing,
      wordSpacing: computedTypography.wordSpacing,
      paddingTop: computedTypography.paddingTop,
      paddingRight: computedTypography.paddingRight,
      paddingBottom: computedTypography.paddingBottom,
      paddingLeft: computedTypography.paddingLeft,
      tabSize: 2,
      MozTabSize: 2,
      boxSizing: 'border-box',
      overflow: 'hidden',
      pointerEvents: 'none',
    };

    // --- Bytecode Guard: Final Typography Validation ---
    verifyTypographyInvariant(textareaStyles, overlayStyles);

    return {
      textareaStyles,
      overlayStyles,
      gridTopology,
    };
  }, [computedTypography, gridTopology, verifyTypographyInvariant]);

  useEffect(() => {
    let resizeTimer;
    const handleResize = () => { 
      cachedEditorStyles = null;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        updateTypography();
      }, 100);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimer);
    };
  }, [updateTypography]);

  const reducedMotion = usePrefersReducedMotion();
  const { theme: activeTheme } = useTheme();

  // Trigger ritual prediction when typing (debounced)
  useEffect(() => {
    if (!isEditable || !isPredictive || !predict || !predictorReady || !content) {
      setIntellisenseSuggestions(prev => (prev.length === 0 ? prev : []));
      return;
    }

    const textarea = textareaRef.current;
    if (!textarea) return;

    const timeoutId = setTimeout(async () => {
      const pos = textarea.selectionStart;
      const textBefore = content.substring(0, pos);
      const lastWordMatch = textBefore.match(/([a-zA-Z']+)$/);
      const prefix = lastWordMatch ? lastWordMatch[1] : '';
      
      // Look back for the previous word to provide bigram context
      const prevText = textBefore.substring(0, textBefore.length - prefix.length).trim();
      const prevWordMatch = prevText.match(/([a-zA-Z']+)$/);
      const prevWord = prevWordMatch ? prevWordMatch[1] : null;

      try {
        const lineWords = textBefore.split('\n').pop().split(/\s+/).filter(Boolean);
        const verseIRState = resolvePlsVerseIRState({
          prevLineEndWord: prevWord, // Simplified heuristic for prev line end
          currentLineWords: lineWords,
          plsPhoneticFeatures,
        });

        const suggestions = await predict(prefix, prevWord, 6, {
          syntaxContext: syntaxLayer,
          currentLineWords: lineWords,
          verseIRState,
        });
        
        if (Array.isArray(suggestions)) {
          const coords = getCursorCoordsFromTextarea(textarea, mirrored, adaptiveTopology);
          setCursorCoords(coords);
          setIntellisenseSuggestions(suggestions.map(s => ({ token: s })));
          setIntellisenseIndex(0);
        }
      } catch (err) {
        console.error('[ScrollEditor] Prediction failed:', err);
      }
    }, 180);

    return () => clearTimeout(timeoutId);
  }, [content, isEditable, isPredictive, predict, predictorReady, syntaxLayer, plsPhoneticFeatures, adaptiveTopology, mirrored]);

  const containerWidth = useMemo(() => {
    if (adaptiveTopology && adaptiveTopology.totalWidth > 0) {
      return adaptiveTopology.totalWidth;
    }
    return 800;
  }, [adaptiveTopology]);

  const { lines: overlayLines, allTokens: allOverlayTokens } = useMemo(
    () => adaptiveTopology ? buildTruesightOverlayLines(contentForOverlay, containerWidth, adaptiveTopology) : { lines: [], allTokens: [] },
    [contentForOverlay, containerWidth, adaptiveTopology]
  );

  const derivedAnalyzedWordsByCharStart = useMemo(() => {
    const map = new Map();
    if (analyzedWordsByCharStart instanceof Map) {
      for (const [charStart, analysis] of analyzedWordsByCharStart.entries()) {
        map.set(Number(charStart), analysis);
      }
    }
    return map;
  }, [analyzedWordsByCharStart]);

  const allowLegacyWordFallback = true;

  const highlightedLinesSet = useMemo(() => {
    const set = new Set();
    if (Array.isArray(highlightedLines)) {
      for (const lineIndex of highlightedLines) {
        set.add(Number(lineIndex));
      }
    }
    return set;
  }, [highlightedLines]);

  const rhymeColorRegistry = useMemo(
    () => buildRhymeColorRegistry(Array.from(analyzedWordsByIdentity.values())),
    [analyzedWordsByIdentity]
  );

  const { shouldColorWord } = useColorCodex(
    Array.from(analyzedWordsByIdentity.values()).map((analysis) => ({
      charStart: analysis.charStart,
      visualBytecode: analysis.visualBytecode || analysis.trueVisionBytecode,
      vowelFamily: analysis.vowelFamily,
    })),
    activeConnections,
    syntaxLayer,
    { analysisMode }
  );

  const getViewportNode = useCallback(() => {
    if (isReadOnlyTruesight) return wordBackgroundLayerRef.current;
    if (isReadOnlyPlain) return markdownRef.current;
    return textareaRef.current;
  }, [isReadOnlyPlain, isReadOnlyTruesight]);

  const syncScrollPosition = useCallback((top, left = 0, source = null) => {
    const nextTop = Number.isFinite(top) ? Math.max(0, top) : 0;
    const nextLeft = Number.isFinite(left) ? Math.max(0, left) : 0;

    scrollTopRef.current = nextTop;
    setScrollTop((prev) => (Math.abs(prev - nextTop) > 1 ? nextTop : prev));
    onScrollChange?.(nextTop);

    const peers = [textareaRef.current, wordBackgroundLayerRef.current, markdownRef.current];
    for (const node of peers) {
      if (!node || node === source) continue;
      
      const currentTop = node.scrollTop ?? 0;
      const currentLeft = node.scrollLeft ?? 0;
      const deltaTop = Math.abs(currentTop - nextTop);
      const deltaLeft = Math.abs(currentLeft - nextLeft);

      if (deltaTop > 1) node.scrollTop = nextTop;
      if (deltaLeft > 1) node.scrollLeft = nextLeft;

      const syncedTop = node.scrollTop ?? 0;
      const syncedLeft = node.scrollLeft ?? 0;
      const residualTop = Math.abs(syncedTop - nextTop);
      const residualLeft = Math.abs(syncedLeft - nextLeft);
      const residualDelta = Math.max(residualTop, residualLeft);

      // --- Bytecode Guard: Sync Invariant ---
      // Only warn when a peer remains misaligned after synchronization is applied.
      if (residualDelta > 1 && !isReadOnlyPlain && !isReadOnlyTruesight) {
        const error = new BytecodeError(
          ERROR_CATEGORIES.COORD,
          ERROR_SEVERITY.WARN,
          MODULE_IDS.COORD,
          ERROR_CODES.COORD_OUT_OF_BOUNDS,
          {
            operation: 'syncScrollPosition',
            sourceTop: nextTop,
            sourceLeft: nextLeft,
            targetTop: syncedTop,
            targetLeft: syncedLeft,
            delta: residualDelta,
            nodeType: node.className,
            priorTop: currentTop,
            priorLeft: currentLeft,
            reason: 'Peer layer remained out of sync after scroll synchronization'
          }
        );
        console.warn(`[PB-GUARD] Scroll Sync Invariant Violated: ${error.bytecode}`);
        setBytecodeArtifacts(prev => [...prev.slice(-4), error.bytecode]);
      }
    }
  }, [isReadOnlyPlain, isReadOnlyTruesight, onScrollChange]);

  const handleTextareaScroll = useCallback(() => {
    if (isReadOnlyPlain) return;
    const textarea = textareaRef.current;
    if (!textarea) return;
    syncScrollPosition(textarea.scrollTop, textarea.scrollLeft, textarea);
  }, [isReadOnlyPlain, syncScrollPosition]);

  const handleOverlayScroll = useCallback(() => {
    const layer = wordBackgroundLayerRef.current;
    if (!layer) return;
    syncScrollPosition(layer.scrollTop, layer.scrollLeft, layer);
  }, [syncScrollPosition]);

  const handleMarkdownScroll = useCallback(() => {
    if (!isReadOnlyPlain) return;
    const markdown = markdownRef.current;
    if (!markdown) return;
    syncScrollPosition(markdown.scrollTop, markdown.scrollLeft, markdown);
  }, [isReadOnlyPlain, syncScrollPosition]);

  const handleSave = useCallback(async () => {
    if (!content.trim()) return;
    setIsSaving(true);
    try {
      await onSave?.(title, content);
    } finally {
      setIsSaving(false);
    }
  }, [content, title, onSave]);

  useLayoutEffect(() => {
    if (pinnedLines && pinnedLines.length > 0) {
      const sorted = [...pinnedLines].sort((a, b) => a - b);
      const initialYMap = new Map();
      for (const li of sorted) {
        initialYMap.set(li, li * lineHeightPx - scrollTopRef.current);
      }
      setGhostData({ sortedLines: sorted, initialYMap });
      setIsGhostPinned(true);
    } else {
      setIsGhostPinned(false);
    }
  }, [pinnedLines, lineHeightPx]);

  const jumpToLine = useCallback((lineNum) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const lines = content.split('\n');
    let offset = 0;
    for (let i = 0; i < Math.min(lineNum - 1, lines.length); i++) {
      offset += lines[i].length + 1;
    }
    if (isEditable) {
      textarea.focus();
      textarea.setSelectionRange(offset, offset);
    }
    const lineHeight = parseFloat(window.getComputedStyle(textarea).lineHeight);
    const viewport = getViewportNode();
    const nextTop = Math.max(0, (lineNum - 1) * lineHeight);
    if (viewport) {
      viewport.scrollTop = nextTop;
      syncScrollPosition(viewport.scrollTop, viewport.scrollLeft, viewport);
      return;
    }
    textarea.scrollTop = nextTop;
    syncScrollPosition(textarea.scrollTop, textarea.scrollLeft, textarea);
  }, [content, getViewportNode, isEditable, syncScrollPosition]);

  const scrollTo = useCallback((y) => {
    const viewport = getViewportNode();
    if (!viewport) return;
    viewport.scrollTop = y;
    syncScrollPosition(viewport.scrollTop, viewport.scrollLeft, viewport);
  }, [getViewportNode, syncScrollPosition]);

  const scrollToTopSmooth = useCallback(() => {
    const viewport = getViewportNode();
    if (!viewport) return;
    if ('scrollBehavior' in document.documentElement.style) {
      viewport.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const start = viewport.scrollTop;
    if (start === 0) return;
    const duration = 320;
    const startTime = performance.now();
    const step = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      viewport.scrollTop = start * (1 - ease);
      syncScrollPosition(viewport.scrollTop, viewport.scrollLeft, viewport);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [getViewportNode, syncScrollPosition]);

  useImperativeHandle(ref, () => ({
    save: handleSave,
    jumpToLine,
    scrollTo,
    scrollToTopSmooth,
    replaceContent(newContent) {
      setContent(newContent);
      setContentForOverlay(newContent);
      onContentChange?.(newContent);
    },
    get clientHeight() { return getViewportNode()?.clientHeight || 0; },
    get scrollHeight() { return getViewportNode()?.scrollHeight || 0; },
  }), [getViewportNode, handleSave, jumpToLine, scrollTo, scrollToTopSmooth, onContentChange]);

  const handleAcceptSuggestion = useCallback((token) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const pos = textarea.selectionStart;
    const textBefore = content.substring(0, pos);
    const textAfter = content.substring(pos);
    const lastWordMatch = textBefore.match(/([a-zA-Z']+)$/);
    let newContent, newCursorPos;
    if (lastWordMatch) {
      const before = content.substring(0, lastWordMatch.index);
      newContent = before + token + ' ' + textAfter;
      newCursorPos = lastWordMatch.index + token.length + 1;
    } else {
      newContent = textBefore + token + ' ' + textAfter;
      newCursorPos = pos + token.length + 1;
    }
    setContent(newContent);
    setContentForOverlay(newContent);
    onContentChange?.(newContent);
    setIntellisenseSuggestions([]);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    });
  }, [content, onContentChange]);

  const handleKeyDown = useCallback(
    (e) => {
      if (intellisenseSuggestions.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setIntellisenseIndex(i => (i + 1) % intellisenseSuggestions.length);
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setIntellisenseIndex(i => (i - 1 + intellisenseSuggestions.length) % intellisenseSuggestions.length);
          return;
        }
        if (e.key === 'Tab' || e.key === 'Enter') {
          e.preventDefault();
          handleAcceptSuggestion(intellisenseSuggestions[intellisenseIndex]?.token);
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          setIntellisenseSuggestions([]);
          return;
        }
      }
      if (e.key === "s" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSave();
      }
      if (e.key === "Escape" && onCancel) {
        e.preventDefault();
        onCancel();
      }
    }, [handleSave, onCancel, intellisenseSuggestions, intellisenseIndex, handleAcceptSuggestion]);

  const emitCursorChange = useCallback((textarea) => {
    const pos = textarea.selectionStart;
    const textBefore = textarea.value.substring(0, pos);
    const lines = textBefore.split('\n');
    const line = lines.length;
    const col = lines[lines.length - 1].length + 1;
    onCursorChange?.({ line, col, offset: pos });
  }, [onCursorChange]);

  const handleCursorChange = useCallback((event) => {
    emitCursorChange(event.target);
  }, [emitCursorChange]);

  const handleTextareaClick = useCallback((event) => {
    const textarea = event.currentTarget;
    emitCursorChange(textarea);
    if (!onWordActivate || textarea.selectionStart !== textarea.selectionEnd) return;
    const tokenEntry = resolveWordTokenAtOffset(textarea.selectionStart, syntaxLayer, content);
    const wordPayload = buildWordPayloadFromToken(tokenEntry);
    if (!wordPayload) return;
    const caretCoords = getCursorCoordsFromTextarea(textarea, mirrored, adaptiveTopology);
    const lineHeight = parseFloat(window.getComputedStyle(textarea).lineHeight) || DEFAULT_LINE_HEIGHT;
    emitWordActivation("pin", wordPayload, {
      anchorRect: {
        left: caretCoords.x,
        right: caretCoords.x + 1,
        top: caretCoords.y - lineHeight,
        bottom: caretCoords.y,
        width: 1,
        height: lineHeight,
      },
      clientX: Number.isFinite(event.clientX) ? event.clientX : caretCoords.x,
      clientY: Number.isFinite(event.clientY) ? event.clientY : caretCoords.y,
      detail: event.detail,
      source: "pointer",
    }, onWordActivate);
  }, [content, emitCursorChange, mirrored, onWordActivate, adaptiveTopology, syntaxLayer]);

  const handleContentChange = useCallback((event) => {
    const nextValue = event.target.value;
    if (nextValue.length > MAX_CONTENT_LENGTH) {
      const truncated = nextValue.slice(0, MAX_CONTENT_LENGTH);
      setContent(truncated);
      setContentForOverlay(truncated);
      if (onContentChange) {
        onContentChange(truncated);
      }
      return;
    }
    setContent(nextValue);
    emitCursorChange(event.target);
    setContentForOverlay(nextValue);
    if (onContentChange) {
      onContentChange(nextValue);
    }
  }, [emitCursorChange, onContentChange]);

  const containerHeight = viewportState?.height || 800;

  return (
    <motion.div
      className="scroll-editor"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      role="form"
      aria-label="Scroll editor"
    >
      <div className="editor-header">
        {isEditable ? (
          <div className="editor-title-container">
            <input
              id="scroll-title"
              type="text"
              className="editor-title-input"
              placeholder="Scroll Title..."
              aria-label="Scroll Title"
              value={title}
              onChange={(e) => {
                const nextTitle = e.target.value;
                setTitle(nextTitle);
                if (onTitleChange) {
                  onTitleChange(nextTitle);
                }
              }}
              disabled={disabled || isSaving}
              maxLength={100}
              aria-required="true"
            />
            <button 
              type="button" 
              className="btn btn-primary save-scroll-btn"
              onClick={handleSave}
              disabled={disabled || isSaving || !content.trim()}
            >
              {isSaving ? "Saving..." : "Save Scroll"}
            </button>
          </div>
        ) : (
          <h2 className="editor-title-display">{title || "Untitled Scroll"}</h2>
        )}

        {isEditable && (
          <div className="editor-toolbar">
            <button 
              type="button" 
              className="toolbar-btn toolbar-btn--bytecode" 
              onClick={() => {
                const bytecode = allOverlayTokens.map(t => t.token).join(' ');
                navigator.clipboard.writeText(bytecode);
              }} 
              title="Copy Bytecode Stream"
            >
              <span className="material-symbols-outlined">data_object</span>
              <span className="btn-label">COPY_BYTECODE</span>
            </button>
          </div>
        )}
      </div>

      <div className={`editor-body ${!isEditable ? "read-only" : ""}`}>
        <Gutter
          overlayLines={overlayLines}
          lineCounts={lineSyllableCounts}
          scrollTop={scrollTop}
          viewportHeight={containerHeight}
          lineHeightPx={lineHeightPx}
        />
        <div ref={wrapperRef} className="editor-textarea-wrapper">
          {!isEditable && !isTruesight && (
            <div
              ref={markdownRef}
              className="markdown-rendered"
              aria-label={`Scroll content: ${title || "Untitled"}`}
              onScroll={handleMarkdownScroll}
            >
              {content}
            </div>
          )}
          {isTruesight && (
            <div
              ref={wordBackgroundLayerRef}
              className={`word-background-layer${isReadOnlyTruesight ? ' word-background-layer--interactive' : ''}`}
              style={cursorSync?.overlayStyles}
              aria-hidden={!isReadOnlyTruesight}
              onScroll={handleOverlayScroll}
            >
              <div>
                {overlayLines.map(({ lineIndex: li, rawLineIndex, tokens, lineType }) => {
                  const isGroupActive = highlightedLinesSet.size > 0;
                  const isHighlighted = highlightedLinesSet.has(rawLineIndex);
                  const isLineDimmed = (isGroupActive && !isHighlighted) || isGhostPinned;

                  return (
                    <div
                      key={li}
                      className={`truesight-line truesight-line--${lineType}${isLineDimmed ? ' truesight-line--dimmed' : ''}${isHighlighted ? ' truesight-line--highlighted' : ''}`}
                      style={{ position: 'relative', height: `${lineHeightPx}px` }}
                    >
                      {tokens.map(({ token, localStart, localEnd, lineIndex, wordIndex, x: tokenX, width: tokenWidth, isWhitespace }) => {
                        const isWord = WORD_TOKEN_REGEX.test(token) && !isWhitespace;
                        const clean = isWord ? token.trim().toUpperCase() : "";
                        const charStart = localStart;
                        const charEnd = localEnd;
                        const identityKey = `${lineIndex}:${Number.isInteger(wordIndex) ? wordIndex : -1}:${charStart}`;
                        const analysis = isWord
                          ? (
                            analyzedWordsByIdentity.get(identityKey) ||
                            derivedAnalyzedWordsByCharStart.get(charStart) ||
                            (allowLegacyWordFallback ? analyzedWords.get(clean) : null)
                          )
                          : null;

                        const pixelX = tokenX || 0;
                        const pixelWidth = tokenWidth || null;

                        const commonStyle = {
                          position: 'absolute',
                          left: `${pixelX}px`,
                          width: pixelWidth ? `${pixelWidth}px` : 'auto',
                          whiteSpace: 'pre',
                        };

                        if (!isWord) {
                          // Render whitespace/punctuation to maintain perfect layout sync.
                          // We use currentColor (or inherit) so they are visible in Truesight.
                          return (
                            <span 
                              key={localStart} 
                              style={{ ...commonStyle, pointerEvents: 'none', opacity: isWhitespace ? 0 : 0.4 }}
                              data-char-start={charStart}
                            >
                              {token}
                            </span>
                          );
                        }

                        const wordVowelFamily = analysis ? normalizeVowelFamily(analysis?.vowelFamily) : null;
                        const rhymeVowelFamily = analysis
                          ? normalizeVowelFamily(analysis?.terminalVowelFamily || analysis?.vowelFamily)
                          : null;
                        const rhymeIdentity = analysis?.rhymeTailSignature || analysis?.rhymeKey || null;
                        const bytecode = analysis?.visualBytecode || analysis?.trueVisionBytecode || null;
                        const shouldColor = shouldColorWord(charStart, clean, wordVowelFamily);
                        const decoded = bytecode && shouldColor ? decodeBytecode(bytecode, { reducedMotion, theme: activeTheme }) : null;
                        
                        // GrimDesign-aligned: phase=0 keeps color deterministic per vowel nucleus.
                        // Same vowel family → same hue, regardless of word position in the document.
                        const sonicChroma = (analysis?.phonemes?.length > 0) ? resolveSonicChroma(analysis.phonemes) : null;
                        const isRhymeSurface = analysisMode === "rhyme" || (analysisMode === "none" && activeConnections?.length > 0);
                        const displayColorFamily = isRhymeSurface ? rhymeVowelFamily : wordVowelFamily;
                        const familyData = (displayColorFamily && vowelColors) ? vowelColors[displayColorFamily] : null;
                        const explicitColor = decoded?.color || bytecode?.color || null;
                        const rhymeColor = isRhymeSurface
                          ? resolveTokenColor(rhymeIdentity, rhymeColorRegistry, null)
                          : null;
                        const color = shouldColor ? (
                          explicitColor
                          || rhymeColor
                          || (vowelColorResolver && displayColorFamily ? vowelColorResolver(displayColorFamily, 0) : null)
                          || (typeof familyData === 'string' ? familyData : familyData?.color)
                          || (sonicChroma ? `hsl(${sonicChroma.h}, ${sonicChroma.s}%, ${sonicChroma.l}%)` : null)
                          || null
                        ) : null;
                        const visemeStyle = (familyData && typeof familyData === 'object') ? (familyData.viseme || {}) : {};
                        const animationSignal = (analysis?.animationSpec || analysis?.dominantSchool) ? analysis : null;

                        const isLineHighlighted = highlightedLinesSet.has(lineIndex);

                        const wordStyle = {
                          ...commonStyle,
                          color: color || undefined,
                          ...visemeStyle,
                          ...(decoded?.style || {}),
                          pointerEvents: 'auto',
                          cursor: 'pointer',
                          ...(isLineHighlighted ? { backgroundColor: 'rgba(101, 31, 255, 0.13)', borderRadius: '0.5rem' } : {}),
                        };

                        return (
                          <AnimatedSurface
                            key={localStart}
                            as="span"
                            signal={animationSignal}
                            role="button"
                            tabIndex={0}
                            data-char-start={charStart}
                            className={[
                              'truesight-word',
                              'pixel-brain-chip',
                              shouldColor ? 'grimoire-word' : 'grimoire-word--grey',
                              decoded?.className || '',
                              isLineHighlighted ? 'grimoire-word--rhyme-highlight' : '',
                            ].filter(Boolean).join(' ')}
                            style={{
                              ...wordStyle,
                              '--chip-delay': `${wordIndex * 30}ms`
                            }}
                            onClick={() => {
                              if (analysis) {
                                onWordActivate?.({ word: token, normalizedWord: clean, trigger: 'truesight_tap', analysis, charStart, charEnd });
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                if (analysis) onWordActivate?.({ word: token, normalizedWord: clean, trigger: 'truesight_tap', analysis, charStart, charEnd });
                              }
                            }}
                          >
                            {token}
                          </AnimatedSurface>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <textarea
            id="scroll-content"
            ref={textareaRef}
            className={`editor-textarea ${isTruesight ? "truesight-transparent editor-textarea--underlay" : "editor-textarea--foreground"} ${!isEditable && !isTruesight ? "editor-textarea--hidden" : ""} ${isReadOnlyTruesight ? "editor-textarea--read-only-truesight" : ""}`}
            style={cursorSync?.textareaStyles}
            aria-hidden={isTruesight && !isEditable && !!onWordActivate}
            tabIndex={isTruesight && !isEditable && !!onWordActivate ? -1 : undefined}
            placeholder={isEditable ? "Inscribe thy verses upon this sacred parchment..." : ""}
            value={content}
            onChange={handleContentChange}
            onKeyDown={isEditable ? handleKeyDown : undefined}
            onKeyUp={handleCursorChange}
            onClick={handleTextareaClick}
            onBlur={() => setIntellisenseSuggestions([])}
            onScroll={handleTextareaScroll}
            disabled={disabled || isSaving}
            readOnly={!isEditable}
            spellCheck="false"
            maxLength={MAX_CONTENT_LENGTH}
            aria-required={isEditable}
            aria-label={`Scroll content: ${title || "Untitled"}`}
          />

          {isTruesight && ghostData && (
            <div className="truesight-ghost-layer" aria-hidden="true">
              <AnimatePresence onExitComplete={() => setGhostData(null)}>
                {isGhostPinned && ghostData.sortedLines.map((li, i) => {
                  const lineData = overlayLines.find(l => l.rawLineIndex === li);
                  if (!lineData) return null;
                  const initialY = ghostData.initialYMap.get(li) ?? 0;
                  const targetY = 8 + i * (lineHeightPx + 4);
                  return (
                    <motion.div
                      key={`ghost-${li}`}
                      className="truesight-line truesight-line--highlighted truesight-ghost-line"
                      initial={{ y: initialY, opacity: 0.6, scale: 0.98 }}
                      animate={{ y: targetY, opacity: 1, scale: 1 }}
                      exit={{ y: initialY, opacity: 0, scale: 0.98 }}
                      transition={{ type: "spring", stiffness: 140, damping: 20, mass: 0.8, restDelta: 0.001 }}
                      style={{ willChange: "transform, opacity", contain: "layout paint style", position: 'absolute', height: `${lineHeightPx}px`, left: '1%', right: '1%' }}
                    >
                      {lineData.tokens.map(({ token, localStart, localEnd, wordIndex, x: tokenX, width: tokenWidth, isWhitespace }) => {
                        const isWord = WORD_TOKEN_REGEX.test(token) && !isWhitespace;
                        
                        const commonStyle = {
                          position: 'absolute',
                          left: `${tokenX}px`,
                          width: `${tokenWidth}px`,
                          whiteSpace: 'pre',
                        };

                        if (!isWord) {
                          return (
                            <span 
                              key={localStart} 
                              style={{ ...commonStyle, color: 'transparent' }}
                              data-char-start={localStart}
                            >
                              {token}
                            </span>
                          );
                        }
                        
                        const clean = token.trim().toUpperCase();
                        const charStart = localStart;
                        const charEnd = localEnd;
                        const identityKey = `${li}:${Number.isInteger(wordIndex) ? wordIndex : -1}:${charStart}`;
                        const analysis = analyzedWordsByIdentity.get(identityKey)
                          || derivedAnalyzedWordsByCharStart.get(charStart)
                          || (allowLegacyWordFallback ? analyzedWords.get(clean) : null);
                        const wordVowelFamily = analysis ? normalizeVowelFamily(analysis?.vowelFamily) : null;
                        const rhymeVowelFamily = analysis
                          ? normalizeVowelFamily(analysis?.terminalVowelFamily || analysis?.vowelFamily)
                          : null;
                        const rhymeIdentity = analysis?.rhymeTailSignature || analysis?.rhymeKey || null;
                        const bytecode = analysis?.visualBytecode || analysis?.trueVisionBytecode || null;
                        const shouldColor = shouldColorWord(charStart, clean, wordVowelFamily);
                        const decoded = bytecode && shouldColor ? decodeBytecode(bytecode, { reducedMotion, theme: activeTheme }) : null;
                        
                        // GrimDesign-aligned: phase=0 keeps color deterministic per vowel nucleus.
                        // Same vowel family → same hue, regardless of word position in the document.
                        const sonicChroma = (analysis?.phonemes?.length > 0) ? resolveSonicChroma(analysis.phonemes) : null;
                        const isRhymeSurface = analysisMode === "rhyme" || (analysisMode === "none" && activeConnections?.length > 0);
                        const displayColorFamily = isRhymeSurface ? rhymeVowelFamily : wordVowelFamily;
                        const familyData = (displayColorFamily && vowelColors) ? vowelColors[displayColorFamily] : null;
                        const explicitColor = decoded?.color || bytecode?.color || null;
                        const rhymeColor = isRhymeSurface
                          ? resolveTokenColor(rhymeIdentity, rhymeColorRegistry, null)
                          : null;
                        const color = shouldColor ? (
                          explicitColor
                          || rhymeColor
                          || (vowelColorResolver && displayColorFamily ? vowelColorResolver(displayColorFamily, 0) : null)
                          || (typeof familyData === 'string' ? familyData : familyData?.color)
                          || (sonicChroma ? `hsl(${sonicChroma.h}, ${sonicChroma.s}%, ${sonicChroma.l}%)` : null)
                          || null
                        ) : null;
                        const visemeStyle = (familyData && typeof familyData === 'object') ? (familyData.viseme || {}) : {};
                        const animationSignal = (analysis?.animationSpec || analysis?.dominantSchool) ? analysis : null;

                        const isMultiSyllable = (shouldColor || wordVowelFamily) && (decoded?.syllableDepth >= 2);
                        const isRichMultiSyllable = (shouldColor || wordVowelFamily) && (decoded?.syllableDepth >= 3);

                        return (
                          <AnimatedSurface
                            key={charStart}
                            as="span"
                            signal={animationSignal}
                            role="button"
                            tabIndex={0}
                            className={[
                              "truesight-word",
                              "pixel-brain-chip",
                              (shouldColor || wordVowelFamily) ? "grimoire-word" : "grimoire-word--grey",
                              decoded?.className || "",
                              isMultiSyllable ? "word--multi-rhyme" : "",
                              isRichMultiSyllable ? "word--multi-rhyme--rich" : "",
                            ].filter(Boolean).join(" ")}
                            style={{ 
                              ...commonStyle,
                              ...visemeStyle,
                              color: color || undefined, 
                              ...(decoded?.style || {}), 
                              pointerEvents: 'auto', 
                              cursor: 'pointer' 
                            }}
                            onClick={() => {
                              if (analysis) onWordActivate?.({ word: token, normalizedWord: clean, trigger: 'truesight_tap', analysis, charStart, charEnd });
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                if (analysis) onWordActivate?.({ word: token, normalizedWord: clean, trigger: 'truesight_tap', analysis, charStart, charEnd });
                              }
                            }}
                          >
                            {token}
                          </AnimatedSurface>
                        );
                      })}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isPredictive && intellisenseSuggestions.length > 0 && (
          <IntelliSense
            suggestions={intellisenseSuggestions}
            selectedIndex={intellisenseIndex}
            position={cursorCoords}
            onAccept={handleAcceptSuggestion}
            onHover={setIntellisenseIndex}
            ghostLine={intellisenseSuggestions[intellisenseIndex]?.ghostLine || null}
            badges={intellisenseSuggestions[intellisenseIndex]?.badges || []}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
});

export default ScrollEditor;
