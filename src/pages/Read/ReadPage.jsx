import {
  FolderIcon,
  SearchIcon,
  ToolsIcon,
  SettingsIcon,
} from "../../components/Icons.jsx";
import { useUserSettings } from "../../hooks/useUserSettings.js";
import { useState, useCallback, useEffect, useLayoutEffect, useRef, useMemo } from "react";
import {
  Group as PanelGroup,
  Panel,
  Separator as PanelResizeHandle,
} from "react-resizable-panels";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";

import { useTheme } from "../../hooks/useTheme.jsx";
import { useScrolls } from "../../hooks/useScrolls.jsx";
import { useProgression } from "../../hooks/useProgression.jsx";
import { useVerseSynthesis } from "../../hooks/useVerseSynthesis.js";
import { useWordLookup } from "../../hooks/useWordLookup.jsx";
import { usePredictor } from "../../hooks/usePredictor.js";
import { getVowelColorsForSchool, getRitualPalette } from "../../data/schoolPalettes.js";
import { SCHOOLS, VOWEL_FAMILY_TO_SCHOOL, getSchoolsByUnlock } from "../../data/schools.js";
import { normalizeVowelFamily } from "../../lib/phonology/vowelFamily.js";
import { parseBooleanEnvFlag } from "../../hooks/useCODExPipeline.jsx";
import { patternColor } from "../../lib/patternColor.js";
import { getCachedWord, setCachedWord, pruneOldCaches } from "../../lib/platform/wordCache.js";
import { getAuroraLevel, cycleAuroraLevel, useAuroraLevel } from "../../lib/atmosphere/aurora.ts";
import { useAutoSave } from "../../hooks/useAutoSave.js";
import { useAdaptivePalette } from "../../hooks/useAdaptivePalette.js";
import { useAnimationSubmitter } from "../../ui/animation/hooks/useAnimationSubmitter.ts";

import AnalysisPanel from "./AnalysisPanel.jsx";
import InfoBeamPanel from "../../components/InfoBeamPanel.jsx";
import RhymeDiagramPanel from "../../components/RhymeDiagramPanel.jsx";
import HeuristicScorePanel from "../../components/HeuristicScorePanel.jsx";
import WordTooltip from "../../components/WordTooltip.jsx";
import VowelFamilyPanel from "../../components/VowelFamilyPanel.jsx";
import { TruesightDebugColorPanel } from "../../components/TruesightDebugColorPanel/TruesightDebugColorPanel.jsx";

import ScrollEditor from "./ScrollEditor.jsx";
import ScrollList from "./ScrollList.jsx";
import { ANALYSIS_MODES } from "../../lib/truesight/compiler/analysisModes";
import { TopBar, StatusBar } from "./IDEChrome.jsx";
import ToolsSidebar from "./ToolsSidebar.jsx";
import SearchPanel from "./SearchPanel.jsx";
import FloatingPanel from "../../components/shared/FloatingPanel.jsx";
import IDEAmbientCanvas from "./IDEAmbientCanvas.jsx";
import { ToolbarChannel, TOOLBAR_TOOL, SAVE_STATE } from "../../lib/truesight/compiler/toolbarBytecode";
import { ViewportChannel } from "../../lib/truesight/compiler/viewportBytecode";
import "./IDE.css";

const SCHOOL_GLYPHS = {
  DEFAULT:    "\uD83C\uDF08",
  SONIC:      "\u266A",
  PSYCHIC:    "\u25EC",
  VOID:       "\u2205",
  ALCHEMY:    "\u2697",
  WILL:       "\u26A1",
  DIVINATION: "\u25C9",
  NECROMANCY: "\u263D",
  ABJURATION: "\u2B21",
};
const TOOLTIP_WIDTH = 390;
const TOOLTIP_HEIGHT = 510;
const TOOLTIP_MARGIN = 12;
const TOOLTIP_OFFSET_X = 14;
const TOOLTIP_OFFSET_Y = -8;

const ENABLE_SYNTAX_RHYME_LAYER = parseBooleanEnvFlag(
  import.meta.env.VITE_ENABLE_SYNTAX_RHYME_LAYER,
  false
);

function clampTooltipPosition(position, viewportWidth = 1200, viewportHeight = 900) {
  const minX = Math.min(TOOLTIP_MARGIN, viewportWidth - TOOLTIP_WIDTH - TOOLTIP_MARGIN);
  const minY = Math.min(TOOLTIP_MARGIN, viewportHeight - TOOLTIP_HEIGHT - TOOLTIP_MARGIN);
  const maxX = Math.max(TOOLTIP_MARGIN, viewportWidth - TOOLTIP_WIDTH - TOOLTIP_MARGIN);
  const maxY = Math.max(TOOLTIP_MARGIN, viewportHeight - TOOLTIP_HEIGHT - TOOLTIP_MARGIN);
  const rawX = Number(position?.x);
  const rawY = Number(position?.y);
  const safeX = Number.isFinite(rawX) ? rawX : TOOLTIP_MARGIN;
  const safeY = Number.isFinite(rawY) ? rawY : TOOLTIP_MARGIN;
  return {
    x: Math.min(Math.max(minX, safeX), maxX),
    y: Math.min(Math.max(minY, safeY), maxY),
  };
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeComparableWord(value) {
  return String(value || "").trim().toUpperCase();
}

function applyMatchCase(sourceWord, replacement) {
  const source = String(sourceWord || "");
  const nextWord = String(replacement || "");
  if (!source || !nextWord) return nextWord;

  if (source === source.toUpperCase()) {
    return nextWord.toUpperCase();
  }

  const first = source.charAt(0);
  const rest = source.slice(1);
  if (first === first.toUpperCase() && rest === rest.toLowerCase()) {
    return `${nextWord.charAt(0).toUpperCase()}${nextWord.slice(1)}`;
  }

  return nextWord;
}


export default function ReadPage() {
  const { theme } = useTheme();
  const { settings, updateSettings } = useUserSettings();
  const auroraLevel = useAuroraLevel();
  const { scrolls, saveScroll, deleteScroll, getScrollById, activeScrollId, setActiveScrollId } = useScrolls();
  const { addXP, progression } = useProgression();
  const [isEditable, setIsEditable] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editorContent, setEditorContent] = useState("");
  const [editorTitle, setEditorTitle] = useState("");
  const editorRef = useRef(null);
  const editorDocumentSerialRef = useRef(0);
  const [editorDocumentIdentity, setEditorDocumentIdentity] = useState("new:0");
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [selectedSchool, setSelectedSchool] = useState("SONIC");
  const [infoBeamEnabled, setInfoBeamEnabled] = useState(false);
  const [infoBeamFamily, setInfoBeamFamily] = useState(null);

  // Use settings for initial state if available
  const [isTruesight, setIsTruesight] = useState(settings?.truesightEnabled ?? false);
  const [mirrored, setMirrored] = useState(settings?.mirroredEnabled ?? false); // Mirror state
  const [analysisMode, setAnalysisMode] = useState(settings?.analysisMode ?? ANALYSIS_MODES.NONE);
  const [_isActivityBarExpanded, _setIsActivityBarExpanded] = useState(settings?.ideLayout?.[0] > 18);
  
  const [highlightedLines, setHighlightedLines] = useState([]);
  const [pinnedLines, setPinnedLines] = useState([]);
  
  const activeScroll = activeScrollId ? getScrollById(activeScrollId) : null;

  const { saveStatus, bumpAutosaveContext, isSaving } = useAutoSave({
    title: editorTitle,
    content: editorContent,
    id: activeScrollId,
    isEditable,
    submittedAt: activeScroll?.submittedAt
  }, {
    onSaveSuccess: (savedScroll) => {
      if (!isEditing) setIsEditing(true);
      setEditorTitle(String(savedScroll.title || ""));
    }
  });

  const [isNarrowViewport, setIsNarrowViewport] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [sidebarTab, setSidebarTab] = useState("FILES");
  const [mobileActiveTab, setMobileActiveTab] = useState("EDITOR");
  const [showScorePanel, setShowScorePanel] = useState(false);
  const [showOraclePanel, setShowOraclePanel] = useState(true);
  const [oracleWord, setOracleWord] = useState("");
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const schoolColorHex = useMemo(() => {
    return SCHOOLS[selectedSchool]?.color || "#d5b34b";
  }, [selectedSchool]);

  const effectiveHighlightedLines = useMemo(() => {
    return [...new Set([...highlightedLines, ...pinnedLines])];
  }, [highlightedLines, pinnedLines]);
  
  const activeScrollContent = String(activeScroll?.content || "");

  const editorInitialTitle = isEditable
    ? String(editorTitle || "")
    : String(activeScroll?.title || editorTitle || "");

  const editorInitialContent = isEditable
    ? String(editorContent || "")
    : activeScrollContent;

  const truesightContent = isEditable ? editorContent : activeScrollContent;

  const {
    artifact: deepAnalysis,
    isSynthesizing: isAnalyzing,
    error: analysisError,
    activeConnections,
    highlightRhymeGroup,
    clearHighlight,
    verseIR,
    scheme: schemeDetection,
    meter: meterDetection,
    vowelSummary,
    literaryDevices,
    emotion,
    totalSyllables,
    analyzedWords,
    tokenByIdentity: analyzedWordsByIdentity,
    tokenByCharStart: analyzedWordsByCharStart,
  } = useVerseSynthesis(truesightContent);

  // Fallbacks for legacy fields moving to AMP
  const scoreData = deepAnalysis?.scoreData || null;
  const rhymeAstrology = deepAnalysis?.rhymeAstrology || null;
  const narrativeAMP = deepAnalysis?.narrativeAMP || null;
  const oracle = deepAnalysis?.oracle || null;
  const genreProfile = deepAnalysis?.genreProfile || null;

  const { 
    palette: adaptivePalette, 
    getColor: adaptiveColorResolver,
    blendedHsl, 
    dominantSchool 
  } = useAdaptivePalette(deepAnalysis);

  const { submitIntent } = useAnimationSubmitter();

  // Drive atmospheric effects via Animation AMP
  useEffect(() => {
    submitIntent({
      version: 'v1.0',
      targetId: 'global:atmosphere',
      trigger: 'audio',
      state: { blendedHsl, dominantSchool }
    });
  }, [blendedHsl, dominantSchool, submitIntent]);

  // Handle route-based atmosphere (pausing on watch page)
  const location = useLocation();
  // AtmosphereSync handles global route-change intents

  const handleToggleTruesight = useCallback(() => {
    setIsTruesight((prev) => {
      const next = !prev;
      updateSettings({ truesightEnabled: next });
      ToolbarChannel.setTool(TOOLBAR_TOOL.TRUESIGHT, next);
      setHighlightedLines([]);
      return next;
    });
  }, [updateSettings]);

  const handleToggleMirrored = useCallback(() => {
    setMirrored((prev) => {
      const next = !prev;
      updateSettings({ mirroredEnabled: next });
      return next;
    });
  }, [updateSettings]);

  const handleModeChange = useCallback((nextMode) => {
    setAnalysisMode((prev) => {
      const resolvedMode = prev === nextMode ? ANALYSIS_MODES.NONE : nextMode;
      updateSettings({ analysisMode: resolvedMode });
      ToolbarChannel.setTool(TOOLBAR_TOOL.ANALYSIS_MODE, resolvedMode);
      return resolvedMode;
    });
    setHighlightedLines([]);
  }, [updateSettings]);

  const handleSchoolChange = useCallback((schoolId) => {
    setSelectedSchool(schoolId);
  }, []);

  const handleInfoBeamToggle = useCallback(() => {
    setInfoBeamEnabled((prev) => !prev);
  }, []);

  const overlayConnections = useMemo(() => {
    if (!isTruesight) {
      return [];
    }
    return activeConnections || [];
  }, [isTruesight, activeConnections]);

  const handleInfoBeamClick = useCallback((label) => {
    setInfoBeamFamily(label);
  }, []);

  const infoBeamConnections = useMemo(() => {
    if (!infoBeamEnabled || !infoBeamFamily) return [];
    const all = Array.isArray(deepAnalysis?.syntaxLayer?.allConnections)
      ? deepAnalysis.syntaxLayer.allConnections
      : [];
    return all.filter((c) => c.groupLabel === infoBeamFamily);
  }, [infoBeamEnabled, infoBeamFamily, deepAnalysis]);

  const scrollLines = useMemo(
    () => truesightContent.split("\n"),
    [truesightContent]
  );

  const lineCount = scrollLines.length;
  const currentLineText = cursorPos.line > 0 ? scrollLines[cursorPos.line - 1] || "" : "";

  const ritualPalette = getRitualPalette(selectedSchool);
  const activeSchoolLabel = SCHOOLS[selectedSchool]?.name || "Universal";
  const mobileVisionLabel = isTruesight ? "Truesight active" : "Ink view";
  const mobileSurfaceTitle = activeScroll?.title || (isEditable ? "Drafting..." : "Scholomance");

  const issueEditorDocumentIdentity = useCallback((label = "new") => {
    editorDocumentSerialRef.current += 1;
    setEditorDocumentIdentity(`${label || "new"}:${editorDocumentSerialRef.current}`);
  }, []);

  useEffect(() => {
    return ViewportChannel.subscribe((vp) => {
      setIsNarrowViewport(vp.width <= 960);
      setIsMobileViewport(vp.width <= 640);
    });
  }, []);

  const handleSaveScroll = useCallback(
    async (title, content) => {
      bumpAutosaveContext();
      ToolbarChannel.setTool(TOOLBAR_TOOL.SAVE_STATE, SAVE_STATE.SAVING);
      const isUpdate = Boolean(isEditing && activeScrollId);
      const wasSubmitted = Boolean(activeScroll?.submittedAt);
      const savedScroll = await saveScroll({
        id: isUpdate ? activeScrollId : undefined,
        title,
        content,
        submit: true,
        submittedAt: activeScroll?.submittedAt || null,
      });
      if (!savedScroll) {
        ToolbarChannel.setTool(TOOLBAR_TOOL.SAVE_STATE, SAVE_STATE.DIRTY);
        addToast("Failed to save scroll", "error");
        return;
      }

      const didSubmitNow = !wasSubmitted && Boolean(savedScroll.submittedAt);
      const actionLabel = didSubmitNow
        ? "Scroll Submitted"
        : isUpdate
          ? "Scroll Updated"
          : "Scroll Saved";

      if (didSubmitNow) {
        const totalPower = scoreData?.totalScore || 0;
        const baseXP = 25;
        const powerXP = Math.round(Math.pow(totalPower, 1.6));
        const xpAwarded = baseXP + powerXP;
        const source = totalPower > 70 ? "legendary_submission"
          : totalPower > 40 ? "expert_submission"
            : "basic_submission";

        addXP(xpAwarded, source);
        addToast(`${actionLabel}! +${xpAwarded} XP`, "success");
      } else {
        addToast(`${actionLabel}!`, "success");
      }

      ToolbarChannel.setTool(TOOLBAR_TOOL.SAVE_STATE, SAVE_STATE.SAVED);
      setEditorTitle(savedScroll.title);
      setActiveScrollId(savedScroll.id);
      setIsEditing(false);
      setIsEditable(false);
    },
    [isEditing, activeScrollId, activeScroll?.submittedAt, saveScroll, addXP, addToast, scoreData, bumpAutosaveContext, setActiveScrollId]
  );

  const handleSelectScroll = useCallback((id) => {
    const scroll = getScrollById(id);
    if (!scroll) return;
    bumpAutosaveContext();
    setActiveScrollId(id);
    setEditorTitle(String(scroll.title || ""));
    setEditorContent(String(scroll.content || ""));
    issueEditorDocumentIdentity(id);
    setIsEditing(false);
    setIsEditable(false);
    setHighlightedLines([]);
  }, [bumpAutosaveContext, getScrollById, issueEditorDocumentIdentity, setActiveScrollId]);

  const handleNewScroll = useCallback(() => {
    bumpAutosaveContext();
    setActiveScrollId(null);
    setEditorTitle("");
    setEditorContent("");
    issueEditorDocumentIdentity("new");
    setIsEditing(false);
    setIsEditable(true);
    setHighlightedLines([]);
  }, [bumpAutosaveContext, issueEditorDocumentIdentity, setActiveScrollId]);

  const handleEditScroll = useCallback(() => {
    bumpAutosaveContext();
    setEditorTitle(String(activeScroll?.title || ""));
    setEditorContent(activeScrollContent);
    issueEditorDocumentIdentity(activeScrollId || "new");
    setIsEditing(true);
    setIsEditable(true);
    setHighlightedLines([]);
  }, [activeScroll?.title, activeScrollContent, activeScrollId, bumpAutosaveContext, issueEditorDocumentIdentity]);

  const handleEditScrollById = useCallback((id) => {
    const scroll = getScrollById(id);
    if (!scroll) return;
    bumpAutosaveContext();
    setActiveScrollId(id);
    setEditorTitle(String(scroll.title || ""));
    setEditorContent(String(scroll.content || ""));
    issueEditorDocumentIdentity(id);
    setIsEditing(true);
    setIsEditable(true);
    setHighlightedLines([]);
  }, [getScrollById, bumpAutosaveContext, issueEditorDocumentIdentity, setActiveScrollId]);

  const handleCancelEdit = useCallback(() => {
    bumpAutosaveContext();
    if (activeScrollId) {
      setEditorTitle(String(activeScroll?.title || ""));
      setEditorContent(activeScrollContent);
      issueEditorDocumentIdentity(activeScrollId);
      setIsEditing(false);
      setIsEditable(false);
    } else {
      setActiveScrollId(null);
      setEditorTitle("");
      setEditorContent("");
      issueEditorDocumentIdentity("new");
      setIsEditing(false);
      setIsEditable(false);
    }
  }, [activeScroll?.title, activeScrollContent, activeScrollId, bumpAutosaveContext, issueEditorDocumentIdentity, setActiveScrollId]);

  const handleEditorContentChange = useCallback((newContent) => {
    setEditorContent(newContent);
    ToolbarChannel.setTool(TOOLBAR_TOOL.SAVE_STATE, SAVE_STATE.DIRTY);
  }, []);

  const handleEditorTitleChange = useCallback((newTitle) => {
    setEditorTitle(newTitle);
    ToolbarChannel.setTool(TOOLBAR_TOOL.SAVE_STATE, SAVE_STATE.DIRTY);
  }, []);

  const [tooltipState, setTooltipState] = useState({
    token: null,
    position: { x: TOOLTIP_MARGIN, y: TOOLTIP_MARGIN },
    localAnalysis: null,
    pinned: false,
  });

  const [sessionWords, setSessionWords] = useState([]);
  const [sessionIndex, setSessionIndex] = useState(-1);
  const [lookupOverride, setLookupOverride] = useState(null);

  const tooltipCloseGuardRef = useRef({ expiresAt: 0, lineIndex: -1, charStart: -1 });

  const resolveTooltipPosition = useCallback((anchorRect) => {
    if (!anchorRect) return { x: TOOLTIP_MARGIN, y: TOOLTIP_MARGIN };
    const rawX = anchorRect.left + TOOLTIP_OFFSET_X;
    const rawY = anchorRect.top + TOOLTIP_OFFSET_Y - TOOLTIP_HEIGHT;
    const vp = ViewportChannel.getState();
    return clampTooltipPosition({ x: rawX, y: rawY }, vp.width, vp.height);
  }, []);

  const buildTooltipAnalysis = useCallback((activation) => {
    const { word, analysis, charStart, lineIndex } = activation;
    const core = analysis || {};
    return {
      word,
      charStart,
      lineIndex,
      core: {
        vowelFamily: core.vowelFamily || null,
        terminalVowelFamily: core.terminalVowelFamily || null,
        rhymeKey: core.rhymeKey || null,
        rhymeTailSignature: core.rhymeTailSignature || null,
        syllableCount: core.syllableCount || 0,
        phonemes: core.phonemes || [],
        stressPattern: core.stressPattern || "",
      }
    };
  }, []);

  const { lookup, data: lookupData, isLoading: isLookupLoading, error: lookupError, reset: resetWordLookup } = useWordLookup();

  useEffect(() => {
    // Initialize session for Lexicon access
    import("../../hooks/useAuth.jsx").then(({ getCsrfToken }) => {
      getCsrfToken().catch(err => console.warn("[ReadPage] Session init failed:", err));
    });
  }, []);

  const handleWordActivate = useCallback((activation) => {
    if (!activation || !activation.normalizedWord) {
      setTooltipState({ token: null, position: { x: 0, y: 0 }, localAnalysis: null, pinned: false });
      return;
    }

    const closeGuard = tooltipCloseGuardRef.current;
    if (Date.now() < closeGuard.expiresAt) {
      const sameToken = closeGuard.lineIndex === activation.lineIndex && closeGuard.charStart === activation.charStart;
      if (sameToken) return;
    }

    const pos = resolveTooltipPosition(activation.anchorRect);
    const analysis = buildTooltipAnalysis(activation);

    setTooltipState({
      token: { 
        word: activation.word, 
        normalizedWord: activation.normalizedWord, 
        charStart: activation.charStart, 
        lineIndex: activation.lineIndex 
      },
      position: pos,
      localAnalysis: analysis,
      pinned: true,
    });

    if (activation.normalizedWord) {
      setSessionWords((prev) => {
        const next = [...prev, activation.normalizedWord].slice(-20);
        setSessionIndex(next.length - 1);
        return next;
      });
      setLookupOverride(null);
      resetWordLookup();
      lookup(activation.normalizedWord);
    }
  }, [buildTooltipAnalysis, lookup, resetWordLookup, resolveTooltipPosition]);

  const handleCloseTooltip = useCallback(() => {
    handleWordActivate(null);
  }, [handleWordActivate]);

  const handleTooltipDrag = useCallback((pos) => {
    const vp = ViewportChannel.getState();
    const clampedPos = clampTooltipPosition(pos, vp.width, vp.height);
    setTooltipState(prev => ({ ...prev, position: clampedPos }));
  }, []);

  const handleSuggestionClick = useCallback((suggestedWord) => {
    if (!tooltipState.token) return;
    const { word: original, charStart } = tooltipState.token;
    const replacement = applyMatchCase(original, suggestedWord);
    const newContent = editorContent.slice(0, charStart) + replacement + editorContent.slice(charStart + original.length);
    handleEditorContentChange(newContent);
    handleCloseTooltip();
    addToast(`Transmuted "${original}" to "${replacement}"`, "success");
  }, [editorContent, handleEditorContentChange, handleCloseTooltip, tooltipState.token, addToast]);

  const handleSessionNavigate = useCallback((direction) => {
    const nextIndex = sessionIndex + direction;
    if (nextIndex >= 0 && nextIndex < sessionWords.length) {
      const nextWord = sessionWords[nextIndex];
      setSessionIndex(nextIndex);
      setLookupOverride(null);
      resetWordLookup();
      lookup(nextWord);
    }
  }, [sessionIndex, sessionWords, lookup, resetWordLookup]);

  const tooltipWordData = useMemo(() => {
    if (!tooltipState.token) return null;
    const baseWordData = {
      word: tooltipState.token.word,
      vowelFamily: tooltipState.localAnalysis?.core?.vowelFamily || null,
      terminalVowelFamily: tooltipState.localAnalysis?.core?.terminalVowelFamily || null,
      rhymeKey: tooltipState.localAnalysis?.core?.rhymeKey || null,
      rhymeTailSignature: tooltipState.localAnalysis?.core?.rhymeTailSignature || null,
      syllableCount: tooltipState.localAnalysis?.core?.syllableCount || undefined,
    };
    const effectiveLookupData = lookupOverride ?? lookupData;
    if (effectiveLookupData && String(effectiveLookupData.word || "").toUpperCase() === String(tooltipState.token.normalizedWord || "").toUpperCase()) {
      return {
        ...baseWordData,
        ...effectiveLookupData,
        word: effectiveLookupData.word || baseWordData.word,
        vowelFamily: effectiveLookupData.vowelFamily || baseWordData.vowelFamily,
        terminalVowelFamily: effectiveLookupData.terminalVowelFamily || baseWordData.terminalVowelFamily,
        rhymeKey: effectiveLookupData.rhymeKey || baseWordData.rhymeKey,
        rhymeTailSignature: effectiveLookupData.rhymeTailSignature || baseWordData.rhymeTailSignature,
        syllableCount: effectiveLookupData.syllableCount || baseWordData.syllableCount,
      };
    }
    return baseWordData;
  }, [lookupData, lookupOverride, tooltipState]);

  const { predict, getCompletions, checkSpelling, getSpellingSuggestions, ready: predictorReady } = usePredictor();
  const misspellings = useMemo(() => {
    return scoreData?.misspellings || [];
  }, [scoreData]);

  const applySpellcheckCorrection = useCallback((original, correction) => {
    const replacement = applyMatchCase(original, correction);
    const escapedOriginal = escapeRegExp(original);
    const regex = new RegExp(`\\b${escapedOriginal}\\b`, "g");
    const newContent = editorContent.replace(regex, replacement);
    handleEditorContentChange(newContent);
    addToast(`Corrected "${original}" to "${replacement}"`, "success");
  }, [editorContent, handleEditorContentChange, addToast]);

  const activeVowelColors = useMemo(() => getVowelColorsForSchool(selectedSchool), [selectedSchool]);
  const lexiconSeedWord = useMemo(() => oracleWord || "", [oracleWord]);

  const jumpToLexiconOracle = useCallback((word) => {
    setOracleWord(word);
    setSidebarTab("SEARCH");
  }, []);

  const resolveLexiconContext = useCallback((word) => {
    if (!word || !deepAnalysis) return null;
    const normalized = word.toUpperCase();
    const tokens = deepAnalysis.verseIR?.tokens || [];
    const occurrences = tokens.filter(t => t.normalizedWord === normalized);
    
    if (occurrences.length === 0) return null;

    const first = occurrences[0];
    
    return {
      foundInScroll: true,
      totalOccurrences: occurrences.length,
      core: {
        rhymeKey: first.rhymeKey,
        vowelFamily: first.vowelFamily,
      },
      resonanceLinks: occurrences.map(t => ({
        lineIndex: t.lineIndex,
        word: t.word,
        context: scrollLines[t.lineIndex] || ""
      })),
      astrology: deepAnalysis.rhymeAstrology?.wordMap?.get(normalized) || null
    };
  }, [deepAnalysis, scrollLines]);

  const truesightDebugWords = useMemo(() => {
    if (!deepAnalysis?.verseIR?.tokens) return [];
    return deepAnalysis.verseIR.tokens.map(token => {
      const identityKey = `${token.lineIndex}:${token.tokenIndexInLine}:${token.charStart}`;
      const unified = analyzedWordsByIdentity.get(identityKey) || token;
      return {
        text: token.word,
        phonemes: token.phonemes || [],
        vowelFamily: unified.vowelFamily
      };
    });
  }, [deepAnalysis, analyzedWordsByIdentity]);

  useEffect(() => {
    if (window.requestIdleCallback) {
      window.requestIdleCallback(() => pruneOldCaches());
    } else {
      setTimeout(pruneOldCaches, 100);
    }
  }, []);

  const isAstrologyMode = analysisMode === ANALYSIS_MODES.ASTROLOGY;
  const isAnalyzeMode = isTruesight && analysisMode === ANALYSIS_MODES.ANALYZE;
  const isAnalysisPanelVisible = isAnalyzeMode || isAstrologyMode;
  const analysisPanelTitle = isAstrologyMode ? "Rhyme Astrology" : "Phonetic Analysis";
  const analysisPanelCloseLabel = isAstrologyMode ? "Close Astrology" : "Close Analysis";

  const mobileTabs = useMemo(() => [
    { id: "EDITOR", label: "Editor", hint: "Ink & Vision" },
    { id: "FILES",  label: "Scrolls", hint: "Archive" },
    { id: "SEARCH", label: "Oracle", hint: "Lexicon" },
    { id: "TOOLS",  label: "Hex",    hint: "Controls" },
    { id: "STATS",  label: "Power",  hint: "Metrics" },
  ], []);

  const currentMobileTab = useMemo(() => {
    const base = mobileTabs.find(t => t.id === mobileActiveTab) || mobileTabs[0];
    const descriptions = {
      EDITOR: "The primary manifestation surface for thy verses.",
      FILES:  "Survey the records of thy past rituals.",
      SEARCH: "Query the Abyss for linguistic echoes and resonance.",
      TOOLS:  "Tweak the laws of sight and predictive anticipation.",
      STATS:  "Observe the numerical weight of thy current casting.",
    };
    const eyebrows = { EDITOR: "Drafting", FILES: "Archive", SEARCH: "Oracle", TOOLS: "Alchemical", STATS: "Judiciary" };
    return { 
      ...base, 
      description: descriptions[mobileActiveTab], 
      eyebrow: eyebrows[mobileActiveTab],
      badge: mobileActiveTab === "STATS" && scoreData ? `${scoreData.totalScore} Power` : ""
    };
  }, [mobileActiveTab, scoreData, mobileTabs]);

  const MobileTabIcon = ({ tabId }) => {
    if (tabId === "FILES") return <FolderIcon />;
    if (tabId === "SEARCH") return <SearchIcon />;
    if (tabId === "TOOLS") return <ToolsIcon />;
    if (tabId === "STATS") return <SettingsIcon />;
    return <span className="material-symbols-outlined">edit_note</span>;
  };

  const toolsBlock = (
    <ToolsSidebar 
      editorRef={editorRef}
      isEditable={isEditable}
      isTruesight={isTruesight}
      onToggleTruesight={handleToggleTruesight}
      isPredictive={true}
      mirrored={mirrored}
      onToggleMirrored={handleToggleMirrored}
      analysisMode={analysisMode}
      onModeChange={handleModeChange}
      isAnalyzing={isAnalyzing}
      showScorePanel={showScorePanel}
      onToggleScorePanel={() => setShowScorePanel(!showScorePanel)}
      selectedSchool={selectedSchool}
      onSchoolChange={setSelectedSchool}
      schoolList={getSchoolsByUnlock(progression)}
    />
  );

  const scoreBlock = (
    <HeuristicScorePanel
      scoreData={scoreData}
      genreProfile={genreProfile}
      visible={true}
      isEmbedded={true}
    />
  );

  const schoolList = getSchoolsByUnlock(progression);

  const activeMobilePanel = mobileActiveTab === "EDITOR" ? null :
    mobileActiveTab === "FILES" ? <ScrollList scrolls={scrolls} activeScrollId={activeScrollId} onSelect={(id) => { handleSelectScroll(id); setMobileActiveTab("EDITOR"); }} onNewScroll={handleNewScroll} /> :
    mobileActiveTab === "SEARCH" ? <SearchPanel seedWord={lexiconSeedWord} selectedSchool={selectedSchool} contextLookup={resolveLexiconContext} onJumpToLine={(line) => { editorRef.current?.jumpToLine?.(line); setMobileActiveTab("EDITOR"); }} /> :
    mobileActiveTab === "TOOLS" ? <div className="ide-mobile-panel">{toolsBlock}</div> :
    <div className="ide-mobile-panel">{scoreBlock}</div>;


  const commonUI = (
    <>
      <AnimatePresence>
        {tooltipState.token && (
          <WordTooltip
            key="word-card"
            wordData={tooltipWordData}
            analysis={tooltipState.localAnalysis}
            isLoading={tooltipState.pinned && isLookupLoading && !lookupOverride}
            error={tooltipState.pinned ? lookupError : null}
            x={tooltipState.position.x}
            y={tooltipState.position.y}
            onDrag={handleTooltipDrag}
            onClose={handleCloseTooltip}
            onSuggestionClick={handleSuggestionClick}
            sessionHistory={sessionWords}
            sessionIndex={sessionIndex}
            onSessionNavigate={handleSessionNavigate}
          />
        )}
      </AnimatePresence>

      {misspellings.length > 0 && (
        <FloatingPanel
          id="spellcheck-panel"
          title="Spellcheck"
          onClose={() => {}} // Always active
          defaultX={typeof window !== 'undefined' ? window.innerWidth - 300 : 900}
          defaultY={typeof window !== 'undefined' ? window.innerHeight - 300 : 600}
          minWidth={220}
          minHeight={120}
          maxWidth={400}
          maxHeight={500}
          className="spellcheck-panel"
        >
          <div className="misspellings-list">
            {misspellings.map((err, i) => (
              <div key={i} className="misspelling-item">
                <button
                  type="button"
                  className={`error-word${err.suggestions.length > 0 ? " error-word--interactive" : ""}`}
                  disabled={err.suggestions.length === 0}
                  onClick={() => applySpellcheckCorrection(err.word, err.suggestions[0])}
                  title={
                    err.suggestions.length > 0
                      ? `Replace "${err.word}" with "${err.suggestions[0]}"`
                      : "No suggestions available"
                  }
                >
                  {err.word}
                </button>
                <div className="error-suggestions">
                  {err.suggestions.map((s, j) => (
                    <button key={j} className="btn-tiny" onClick={() => applySpellcheckCorrection(err.word, s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </FloatingPanel>
      )}

      <div className="toast-container">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
              className={`toast-item toast-item--${toast.type}`}
            >
              {toast.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );

  /* ── MOBILE RENDER ── */
  if (isMobileViewport) {
    return (
      <div className="ide-layout-wrapper ide-layout-wrapper--mobile">
        <TopBar
          title={mobileSurfaceTitle}
          onOpenSearch={() => { setMobileActiveTab("SEARCH"); }}
          showMinimap={false}
          onToggleMinimap={() => {}}
          isEditable={isEditable}
          activeScrollId={activeScrollId}
          onEdit={handleEditScroll}
          onNewScroll={handleNewScroll}
          progression={progression}
          auroraLevel={auroraLevel}
          onCycleAuroraLevel={cycleAuroraLevel}
          showMinimapControl={false}
          showSettingsControl={false}
        />
        <main className="ide-mobile-content">
          <section className="ide-mobile-hero" aria-label="Scroll chamber overview">
            <div className="ide-mobile-hero-copy">
              <p className="ide-mobile-hero-eyebrow">Scribe chamber</p>
              <h2 className="ide-mobile-hero-title">{mobileSurfaceTitle}</h2>
              <p className="ide-mobile-hero-description">
                Compose, inspect, and score within one continuous chamber built for touch instead of compromise.
              </p>
            </div>
            <div className="ide-mobile-meta-grid" aria-label="Current ritual state">
              <div className="ide-mobile-meta-chip">
                <span className="ide-mobile-meta-label">School</span>
                <span className="ide-mobile-meta-value">{activeSchoolLabel}</span>
              </div>
              <div className="ide-mobile-meta-chip">
                <span className="ide-mobile-meta-label">Vision</span>
                <span className="ide-mobile-meta-value">{mobileVisionLabel}</span>
              </div>
              <div className="ide-mobile-meta-chip">
                <span className="ide-mobile-meta-label">Power</span>
                <span className="ide-mobile-meta-value">{scoreData ? scoreData.totalScore : "Unscored"}</span>
              </div>
              <div className="ide-mobile-meta-item">
                <span className="ide-mobile-meta-label">Vision</span>
                <span className="ide-mobile-meta-value">Predictive active</span>
              </div>

            </div>
          </section>

          <nav className="ide-mobile-tab-bar" aria-label="Scribe workspace sections">
            {mobileTabs.map((tab) => {
              const isActive = mobileActiveTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={`ide-mobile-tab-btn${isActive ? " active" : ""}`}
                  onClick={() => setMobileActiveTab(tab.id)}
                  aria-pressed={isActive}
                  aria-label={`${tab.label} panel`}
                >
                  <span className="ide-mobile-tab-icon" aria-hidden="true">
                    <MobileTabIcon tabId={tab.id} />
                  </span>
                  <span className="ide-mobile-tab-copy">
                    <span className="ide-mobile-tab-label">{tab.label}</span>
                    <span className="ide-mobile-tab-hint">{tab.hint}</span>
                  </span>
                </button>
              );
            })}
          </nav>

          <section className={`ide-mobile-stage ide-mobile-stage--${String(currentMobileTab.id || "editor").toLowerCase()}`}>
            <header className="ide-mobile-stage-header">
              <div className="ide-mobile-stage-copy">
                <p className="ide-mobile-stage-eyebrow">{currentMobileTab.eyebrow}</p>
                <h3 className="ide-mobile-stage-title">{currentMobileTab.label}</h3>
                <p className="ide-mobile-stage-description">{currentMobileTab.description}</p>
              </div>
              <span className="ide-mobile-stage-badge">{currentMobileTab.badge}</span>
            </header>
            <div className={`ide-mobile-stage-body${mobileActiveTab === "EDITOR" ? " ide-mobile-stage-body--editor" : ""}`}>
              {mobileActiveTab === "EDITOR" && (
                <ScrollEditor
                  key={editorDocumentIdentity}
                  ref={editorRef}
                  documentIdentity={editorDocumentIdentity}
                  title={editorInitialTitle}
                  content={editorInitialContent}
                  onSave={handleSaveScroll}
                  onCancel={isEditing ? handleCancelEdit : undefined}
                  isEditable={isEditable}
                  disabled={false}
                  isTruesight={isTruesight}
                  isPredictive={true}
                  predict={predict}
                  getCompletions={getCompletions}
                  checkSpelling={checkSpelling}
                  getSpellingSuggestions={getSpellingSuggestions}
                  predictorReady={predictorReady}
                  plsPhoneticFeatures={scoreData?.plsPhoneticFeatures || rhymeAstrology?.features || null}
                  onContentChange={handleEditorContentChange}
                  onTitleChange={handleEditorTitleChange}
                  analyzedWords={analyzedWords}
                  analyzedWordsByIdentity={analyzedWordsByIdentity}
                  analyzedWordsByCharStart={analyzedWordsByCharStart}
                  activeConnections={overlayConnections}                  lineSyllableCounts={deepAnalysis?.lineSyllableCounts || []}
                  highlightedLines={effectiveHighlightedLines}
                  pinnedLines={pinnedLines}
                  vowelColors={isTruesight ? adaptivePalette : activeVowelColors}
                  vowelColorResolver={isTruesight ? adaptiveColorResolver : null}
                  syntaxLayer={deepAnalysis?.syntaxSummary}
                  analysisMode={analysisMode}
                  theme={theme}
                  onWordActivate={handleWordActivate}
                  onCursorChange={setCursorPos}
                  mirrored={mirrored}
                />
              )}
              {activeMobilePanel}
            </div>
          </section>

          <div className="ide-mobile-status-strip" role="status" aria-live="polite">
            <span className={`ide-mobile-status-chip${analysisError ? " is-offline" : ""}`}>
              <span className="status-ready-dot" aria-hidden="true" />
              {analysisError ? "Analysis offline" : "Analysis ready"}
            </span>
            <span className="ide-mobile-status-chip">{`Ln ${cursorPos.line}, Col ${cursorPos.col}`}</span>
            <span className="ide-mobile-status-chip">Syllables {totalSyllables}</span>
            <span className="ide-mobile-status-chip">{mobileVisionLabel}</span>
          </div>
        </main>

        {commonUI}
      </div>
    );
  }

  /* ── DESKTOP RENDER ── */
  return (
    <div 
      className="ide-layout-wrapper"
      style={{
        '--ritual-abyss': ritualPalette.abyss,
        '--ritual-panel': ritualPalette.panel,
        '--ritual-parchment': ritualPalette.parchment,
        '--ritual-ink': ritualPalette.ink,
        '--ritual-primary': ritualPalette.primary,
        '--ritual-secondary': ritualPalette.secondary,
        '--ritual-tertiary': ritualPalette.tertiary,
        '--ritual-border': ritualPalette.border,
        '--ritual-glow': ritualPalette.glow,
        '--ritual-aurora-start': ritualPalette.aurora_start,
        '--ritual-aurora-end': ritualPalette.aurora_end,
        '--active-school-glow': ritualPalette.glow + '66', // 40% alpha
      }}
    >
      <TopBar
        title={activeScroll?.title || (isEditable ? "New Scroll" : "Scholomance IDE")}
        onOpenSearch={() => setSidebarTab('SEARCH')}
        showMinimap={showOraclePanel}
        onToggleMinimap={() => setShowOraclePanel(!showOraclePanel)}
        isEditable={isEditable}
        activeScrollId={activeScrollId}
        onEdit={handleEditScroll}
        onNewScroll={handleNewScroll}
        progression={progression}
        auroraLevel={auroraLevel}
        onCycleAuroraLevel={cycleAuroraLevel}
      />
      <main className="ide-main-content">
        <IDEAmbientCanvas schoolColor={schoolColorHex} />
        <PanelGroup
          className="ide-panel-group"
          direction={isNarrowViewport ? "vertical" : "horizontal"}
        >
          {/* 1. Dedicated Activity Bar (Icons only, far left) */}
          <Panel
            defaultSize={isNarrowViewport ? 10 : 4}
            minSize={isNarrowViewport ? 8 : 4}
            maxSize={isNarrowViewport ? 15 : 6}
            className="activity-icons-col"
          >
            <div className="activity-bar-content">
              {['FILES', 'SEARCH', 'TOOLS'].map((tab) => {
                const Icon = tab === 'FILES' ? FolderIcon : tab === 'SEARCH' ? SearchIcon : ToolsIcon;
                return (
                  <button
                    key={tab}
                    className={`activity-item icon-only ${sidebarTab === tab ? 'active' : ''}`}
                    onClick={() => setSidebarTab(tab)}
                    title={tab}
                  >
                    <Icon size={28} />
                  </button>
                );
              })}
            </div>
            <div className="activity-bar-footer">
              <button className="activity-item icon-only" title="Settings">
                <SettingsIcon size={24} />
              </button>
            </div>
          </Panel>

          <PanelResizeHandle className="sidebar-resize-handle" />

          {/* 2. Primary Sidebar (Labels + Content) */}
          <Panel
            defaultSize={isNarrowViewport ? 30 : 20}
            minSize={isNarrowViewport ? 20 : 15}
            className="ide-sidebar expandable-sidebar"
          >
            <div className="sidebar-combined-content">
              {/* Header labels area */}
              <div className="sidebar-labels-header">
                {['EXPLORER', 'ORACLE', 'HEX TOOLS'].map((label, i) => {
                  const tabs = ['FILES', 'SEARCH', 'TOOLS'];
                  return (
                    <button
                      key={label}
                      className={`sidebar-label-btn ${sidebarTab === tabs[i] ? 'active' : ''}`}
                      onClick={() => setSidebarTab(tabs[i])}
                    >
                      <span className="activity-label">{label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Main content area */}
              <div className="sidebar-body-content">
                {sidebarTab === 'FILES' && (
                  <ScrollList
                    scrolls={scrolls}
                    activeScrollId={activeScrollId}
                    onSelect={handleSelectScroll}
                    onDelete={deleteScroll}
                    onNewScroll={handleNewScroll}
                    onEdit={handleEditScrollById}
                  />
                )}
                {sidebarTab === 'SEARCH' && (
                  <SearchPanel
                    seedWord={lexiconSeedWord}
                    selectedSchool={selectedSchool}
                    contextLookup={resolveLexiconContext}
                    onJumpToLine={(line) => {
                      editorRef.current?.jumpToLine?.(line);
                    }}
                    variant="sidebar"
                  />
                )}
                {sidebarTab === 'TOOLS' && (
                  <div className="sidebar-tools">
                    <ToolsSidebar 
                      editorRef={editorRef}
                      isEditable={isEditable}
                      isTruesight={isTruesight}
                      onToggleTruesight={handleToggleTruesight}
                      isPredictive={true}
                      onTogglePredictive={() => {}}
                      mirrored={mirrored}
                      onToggleMirrored={handleToggleMirrored}
                      analysisMode={analysisMode}
                      onModeChange={handleModeChange}
                      isAnalyzing={isAnalyzing}
                      showScorePanel={showScorePanel}
                      onToggleScorePanel={() => setShowScorePanel(!showScorePanel)}
                      selectedSchool={selectedSchool}
                      onSchoolChange={setSelectedSchool}
                      schoolList={schoolList}
                    />
                    {analysisMode === ANALYSIS_MODES.RHYME && (
                      <div className="sidebar-sub-panel">
                        <RhymeDiagramPanel
                          connections={overlayConnections}
                          lineCount={lineCount}
                          visible={true}
                          onPairSelect={(lines) => {
                            setPinnedLines(lines);
                            if (!lines) setHighlightedLines([]);
                            if (lines) editorRef.current?.scrollToTopSmooth?.();
                          }}
                          onConnectionClick={() => {
                            editorRef.current?.scrollToTopSmooth?.();
                          }}
                          highlightedLines={effectiveHighlightedLines}
                        />
                      </div>
                    )}
                    {isTruesight && (
                      <div className="sidebar-sub-panel">
                        <VowelFamilyPanel
                          visible={true}
                          families={vowelSummary?.families ?? []}
                          totalWords={vowelSummary?.totalWords ?? 0}
                          uniqueWords={vowelSummary?.uniqueWords ?? 0}
                          isEmbedded={true}
                        />
                      </div>
                    )}
                    {isTruesight && (
                      <div className="sidebar-sub-panel">
                        <TruesightDebugColorPanel
                          analyzedWords={truesightDebugWords}
                          activeSchool={selectedSchool}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Panel>

          <PanelResizeHandle className="sidebar-resize-handle" />
          <Panel defaultSize={settings?.ideLayout?.length === 5 ? settings.ideLayout[3] : (settings?.ideLayout?.[2] ?? (isNarrowViewport ? undefined : 60))} minSize={isNarrowViewport ? "40%" : "30%"}>
            <div className="codex-workspace">
              <div className="document-container">
                {activeScrollId || isEditable ? (
                  <ScrollEditor
                    key={editorDocumentIdentity}
                    ref={editorRef}
                    documentIdentity={editorDocumentIdentity}
                    title={editorInitialTitle}
                    content={editorInitialContent}
                    onSave={handleSaveScroll}
                    onCancel={isEditing ? handleCancelEdit : undefined}
                    isEditable={isEditable}
                    disabled={false}
                    isTruesight={isTruesight}
                    isPredictive={true}
                    predict={predict}
                    getCompletions={getCompletions}
                    checkSpelling={checkSpelling}
                    getSpellingSuggestions={getSpellingSuggestions}
                    predictorReady={predictorReady}
                    plsPhoneticFeatures={scoreData?.plsPhoneticFeatures || rhymeAstrology?.features || null}
                    onContentChange={handleEditorContentChange}
                    onTitleChange={handleEditorTitleChange}
                    analyzedWords={analyzedWords}
                    analyzedWordsByIdentity={analyzedWordsByIdentity}
                    analyzedWordsByCharStart={analyzedWordsByCharStart}
                    activeConnections={overlayConnections}
                    lineSyllableCounts={deepAnalysis?.lineSyllableCounts || []}
                    highlightedLines={effectiveHighlightedLines}
                    pinnedLines={pinnedLines}
                    vowelColors={isTruesight ? adaptivePalette : activeVowelColors}
                    vowelColorResolver={isTruesight ? adaptiveColorResolver : null}
                    syntaxLayer={deepAnalysis?.syntaxSummary}
                    analysisMode={analysisMode}
                    theme={theme}
                    onWordActivate={handleWordActivate}
                    onCursorChange={setCursorPos}
                    mirrored={mirrored}
                  />
                ) : (
                  <div className="scroll-placeholder">
                    <button type="button" className="btn btn-primary" onClick={handleNewScroll}>
                      Begin New Scroll
                    </button>
                  </div>
                )}
              </div>
            </div>
          </Panel>
          {!isNarrowViewport && (
            <>
              <PanelResizeHandle className="sidebar-resize-handle" />
              <Panel 
                defaultSize={settings?.ideLayout?.length === 5 ? settings.ideLayout[4] : (settings?.ideLayout?.[3] ?? 25)}
                minSize={15} 
                collapsible={true} 
                className="ide-right-panel"
              >
                <div className="right-panel-container">
                  <div className="right-panel-scroll">
                    {showScorePanel && scoreData && (
                      <div className="right-panel-section">
                        <div className="right-panel-section-header">
                          <span className="right-panel-section-title">CODEx Metrics</span>
                          <button
                            type="button"
                            className="right-panel-close"
                            onClick={() => setShowScorePanel(false)}
                            aria-label="Close CODEx Metrics"
                          >×</button>
                        </div>
                        <HeuristicScorePanel
                          scoreData={scoreData}
                          genreProfile={genreProfile}
                          visible={true}
                          isEmbedded={true}
                        />
                      </div>
                    )}

                    {isAnalysisPanelVisible && (
                      <div className="right-panel-section">
                        <div className="right-panel-section-header">
                          <span className="right-panel-section-title">{analysisPanelTitle}</span>
                          <button
                            type="button"
                            className="right-panel-close"
                            onClick={() => handleModeChange(analysisMode)}
                            aria-label={analysisPanelCloseLabel}
                          >×</button>
                        </div>
                        <AnalysisPanel
                          scheme={schemeDetection}
                          meter={meterDetection}
                          statistics={deepAnalysis?.statistics}
                          literaryDevices={literaryDevices}
                          emotion={emotion}
                          genreProfile={genreProfile}
                          hhmSummary={deepAnalysis?.syntaxSummary?.hhm}
                          scoreData={scoreData}
                          rhymeAstrology={rhymeAstrology}
                          narrativeAMP={narrativeAMP}
                          oracle={oracle}
                          onGroupHover={highlightRhymeGroup}
                          onGroupLeave={clearHighlight}
                          infoBeamEnabled={infoBeamEnabled}
                          onInfoBeamToggle={() => setInfoBeamEnabled((prev) => !prev)}
                          onGroupClick={handleInfoBeamClick}
                          activeInfoBeamFamily={infoBeamFamily}
                          surfaceMode={isAstrologyMode ? "astrology" : "full"}
                          currentLineText={currentLineText}
                          />                      </div>
                    )}

                    {infoBeamEnabled && infoBeamFamily && (
                      <div className="right-panel-section">
                        <div className="right-panel-section-header">
                          <span className="right-panel-section-title">InfoBeam — Group {infoBeamFamily}</span>
                          <button
                            type="button"
                            className="right-panel-close"
                            onClick={() => setInfoBeamFamily(null)}
                            aria-label="Close InfoBeam"
                          >×</button>
                        </div>
                        <InfoBeamPanel
                          groupLabel={infoBeamFamily}
                          groupColor={patternColor(infoBeamFamily)}
                          connections={infoBeamConnections}
                          scrollLines={scrollLines}
                        />
                      </div>
                    )}

                    {showOraclePanel && (
                      <div className="right-panel-section">
                        <div className="right-panel-section-header">
                          <span className="right-panel-section-title">Lexicon Oracle</span>
                          <button
                            type="button"
                            className="right-panel-close"
                            onClick={() => setShowOraclePanel(false)}
                            aria-label="Close Lexicon Oracle"
                          >×</button>
                        </div>
                        <SearchPanel
                          seedWord={lexiconSeedWord}
                          selectedSchool={selectedSchool}
                          contextLookup={resolveLexiconContext}
                          onJumpToLine={(line) => {
                            editorRef.current?.jumpToLine?.(line);
                          }}
                          variant="rail"
                        />
                      </div>
                    )}

                    {misspellings.length > 0 && (
                      <div className="right-panel-section">
                        <div className="right-panel-section-header">
                          <span className="right-panel-section-title">Spellcheck</span>
                          <button
                            type="button"
                            className="right-panel-close"
                            onClick={() => {}} // Always active
                            aria-label="Spellcheck is active"
                          >×</button>
                        </div>
                        <div className="misspellings-list">
                          {misspellings.map((err, i) => (
                            <div key={i} className="misspelling-item">
                              <button
                                type="button"
                                className={`error-word${err.suggestions.length > 0 ? " error-word--interactive" : ""}`}
                                disabled={err.suggestions.length === 0}
                                onClick={() => applySpellcheckCorrection(err.word, err.suggestions[0])}
                                title={
                                  err.suggestions.length > 0
                                    ? `Replace "${err.word}" with "${err.suggestions[0]}"`
                                    : "No suggestions available"
                                }
                              >
                                {err.word}
                              </button>
                              <div className="error-suggestions">
                                {err.suggestions.map((s, j) => (
                                  <button
                                    key={j}
                                    className="btn-tiny"
                                    onClick={() => applySpellcheckCorrection(err.word, s)}
                                  >
                                    {s}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {!showScorePanel && !isAnalysisPanelVisible && !(infoBeamEnabled && infoBeamFamily) && !showOraclePanel && !(misspellings.length > 0) && (
                      <div className="right-panel-empty">
                        <div className="right-panel-empty-icon">⊘</div>
                        <p>Summon the Lexicon Oracle, Rhyme Astrology, or CODEx Metrics to project analysis here</p>
                      </div>
                    )}
                  </div>
                </div>
              </Panel>
            </>
          )}
        </PanelGroup>
      </main>

      <StatusBar
        line={cursorPos.line}
        col={cursorPos.col}
        language="Scroll Language"
        syllableCount={totalSyllables}
        analysisError={analysisError}
      />
      
      {/* Floating panel fallback for narrow viewports only */}
      {isNarrowViewport && showOraclePanel && (
        <FloatingPanel
          id="lexicon-oracle-panel"
          title="Lexicon Oracle"
          onClose={() => setShowOraclePanel(false)}
          defaultX={window.innerWidth - 420}
          defaultY={88}
          defaultWidth={380}
          defaultHeight={520}
          minWidth={280}
          minHeight={240}
          maxWidth={560}
          maxHeight={760}
          zIndex={200}
          className="oracle-floating-panel"
        >
          <SearchPanel
            seedWord={lexiconSeedWord}
            selectedSchool={selectedSchool}
            contextLookup={resolveLexiconContext}
            onJumpToLine={(line) => {
              editorRef.current?.jumpToLine?.(line);
            }}
            variant="floating"
          />
        </FloatingPanel>
      )}

      {isNarrowViewport && isAnalysisPanelVisible && (
        <FloatingPanel
          id={isAstrologyMode ? "astrology-panel" : "analyze-panel"}
          title={analysisPanelTitle}
          onClose={() => handleModeChange(analysisMode)}
          defaultX={window.innerWidth - 360}
          defaultY={80}
          defaultWidth={340}
          defaultHeight={540}
          minWidth={280}
          minHeight={200}
          maxWidth={580}
          maxHeight={860}
        >
          <AnalysisPanel
            scheme={schemeDetection}
            meter={meterDetection}
            statistics={deepAnalysis?.statistics}
            literaryDevices={literaryDevices}
            emotion={emotion}
            genreProfile={genreProfile}
            hhmSummary={deepAnalysis?.syntaxSummary?.hhm}
            scoreData={scoreData}
            rhymeAstrology={rhymeAstrology}
            narrativeAMP={narrativeAMP}
            oracle={oracle}
            onGroupHover={highlightRhymeGroup}
            onGroupLeave={clearHighlight}
            infoBeamEnabled={infoBeamEnabled}
            onInfoBeamToggle={() => setInfoBeamEnabled((prev) => !prev)}
            onGroupClick={handleInfoBeamClick}
            activeInfoBeamFamily={infoBeamFamily}
            surfaceMode={isAstrologyMode ? "astrology" : "full"}
            currentLineText={currentLineText}
          />
        </FloatingPanel>
      )}

      {isNarrowViewport && infoBeamEnabled && infoBeamFamily && (
        <FloatingPanel
          id="infobeam-panel"
          title={`InfoBeam — Group ${infoBeamFamily}`}
          onClose={() => setInfoBeamFamily(null)}
          defaultX={window.innerWidth - 720}
          defaultY={80}
          defaultWidth={320}
          defaultHeight={480}
          minWidth={220}
          minHeight={160}
          maxWidth={500}
          maxHeight={700}
          zIndex={150}
          className="infobeam-floating-panel"
        >
          <InfoBeamPanel
            groupLabel={infoBeamFamily}
            groupColor={patternColor(infoBeamFamily)}
            connections={infoBeamConnections}
            scrollLines={scrollLines}
          />
        </FloatingPanel>
      )}

      {isNarrowViewport && showScorePanel && scoreData && (
        <FloatingPanel
          id="score-panel"
          title="CODEx Metrics"
          className="codex-metrics-panel"
          onClose={() => setShowScorePanel(false)}
          defaultX={window.innerWidth - 340}
          defaultY={80}
          minWidth={260}
          minHeight={180}
          maxWidth={500}
          maxHeight={700}
        >
          <HeuristicScorePanel
            scoreData={scoreData}
            genreProfile={genreProfile}
            visible={true}
            isEmbedded={true}
          />
        </FloatingPanel>
      )}

      {commonUI}
    </div>
  );
}
