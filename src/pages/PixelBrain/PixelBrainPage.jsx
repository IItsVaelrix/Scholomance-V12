/**
 * PixelBrainPage — Game Asset Generation with Bytecode
 * 
 * Main page component integrating the new UI overhaul
 */

import { useState, useCallback, useRef, useEffect, useMemo, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePredictor } from "../../hooks/usePredictor.jsx";
import { useVerseSynthesis } from "../../hooks/useVerseSynthesis.js";
import { useGodotExportFlag } from "../../hooks/useGodotExportFlag.js";
import { downloadTextFile } from "../../components/GodotExportButton/downloadTextFile.js";

const ShaderForgePanel = lazy(() => import('./components/ShaderForgePanel.jsx'));

// New components
import { UploadSection } from "./components/UploadSection.jsx";
import { AnalysisResults } from "./components/AnalysisResults.jsx";
import { StyleTransmuter } from "./components/StyleTransmuter.jsx";
import { ParameterSliders } from "./components/ParameterSliders.jsx";
import { ExtensionSelector } from "./components/ExtensionSelector.jsx";
import { StatusDisplay } from "./components/StatusDisplay.jsx";
import { DuplicateSection } from "./components/DuplicateSection.jsx";
import { LatticeCanvas } from "./components/LatticeCanvas.jsx";
import { SketchPad } from "./components/SketchPad.jsx";

import PixelBrainTerminal from "./PixelBrainTerminal.jsx";

// Core logic
import { 
  generatePixelArtFromImage, 
  evaluateFormulaWithColor, 
  formulaToBytecode,
  processorBridge,
  buildPixelBrainPhotonicRoute,
  deriveVerseMorphTarget,
  morphCoordinatesToward,
  interpretInstruction,
  templatize,
  fillTemplate,
  sketchToSilhouette,
} from "../../lib/pixelbrain.adapter.js";
import { SCHOOLS } from "../../data/schools.js";
import { readWandFill } from "../../lib/wandPixelbrainBridge.js";
import { buildPixelBrainGodotExport } from "../../lib/godot-export/pixelbrainGodotExport.js";
import { analyzeImageClientSide } from "./utils/imageAnalysis.client.js";

import "./PixelBrainPage.css";

// Map slider keys to formula keys
const PARAM_MAP = {
  amplitude: 'a',
  frequency: 'b',
  phase: 'c',
  points: 'n',
  scale: 'scale',
  complexity: 'complexity',
  cx: 'cx',
  cy: 'cy'
};

const REVERSE_PARAM_MAP = Object.entries(PARAM_MAP).reduce((acc, [k, v]) => {
  acc[v] = k;
  return acc;
}, {});

const TOKEN_PATTERN = /[A-Za-z']+/g;
const DEFAULT_PIXEL_CANVAS = Object.freeze({ width: 160, height: 144, gridSize: 1 });

// Template/fill bytecode options (VW-SCHOOL-RARITY-EFFECT).
const FILL_RARITIES = ['COMMON', 'RARE', 'INEXPLICABLE'];
const FILL_EFFECTS = ['INERT', 'RESONANT', 'HARMONIC', 'TRANSCENDENT'];
const TEMPLATE_BANDS = 4;
const WAND_TARGET_MAX = 96; // longest sprite dimension when rescaling WAND's 800×600 geometry

function extractLineTokens(line) {
  return String(line || '').match(TOKEN_PATTERN) || [];
}

function buildPlsContext(text, analysis, plsPhoneticFeatures) {
  const lines = String(text || '').split(/\r?\n/);
  const currentLineRaw = lines.at(-1) || '';
  const currentLineTokens = extractLineTokens(currentLineRaw);
  const endsWithPartialToken = /[A-Za-z']$/.test(currentLineRaw);
  const prefix = endsWithPartialToken ? (currentLineTokens.at(-1) || '') : '';
  const completedCurrentLineWords = endsWithPartialToken
    ? currentLineTokens.slice(0, -1)
    : currentLineTokens;

  let prevLineEndWord = null;
  for (let index = lines.length - 2; index >= 0; index -= 1) {
    const lineTokens = extractLineTokens(lines[index]);
    if (lineTokens.length > 0) {
      prevLineEndWord = lineTokens.at(-1) || null;
      break;
    }
  }

  const lineSyllableCounts = Array.isArray(analysis?.lineSyllableCounts)
    ? analysis.lineSyllableCounts.map((value) => Number(value) || 0)
    : [];

  return {
    prefix,
    prevWord: completedCurrentLineWords.at(-1) || null,
    prevLineEndWord,
    currentLineWords: completedCurrentLineWords,
    targetSyllableCount: lineSyllableCounts.at(-1) || null,
    priorLineSyllableCounts: lineSyllableCounts.slice(0, -1),
    plsPhoneticFeatures,
  };
}

function spliceSuggestionIntoVerse(text, suggestion) {
  const baseText = String(text || '');
  const nextToken = String(suggestion || '').trim();
  if (!nextToken) return baseText;

  const partialMatch = baseText.match(/([A-Za-z']+)$/);
  if (partialMatch) {
    return `${baseText.slice(0, -partialMatch[1].length)}${nextToken} `;
  }

  if (!baseText) return `${nextToken} `;
  if (/\s$/.test(baseText)) return `${baseText}${nextToken} `;
  return `${baseText} ${nextToken} `;
}

function describeVerseAmplifier(verseAmplifier) {
  if (!verseAmplifier || typeof verseAmplifier !== 'object') {
    return 'PLS awaits a stable line ending.';
  }

  const dominantTier = String(verseAmplifier.dominantTier || 'DORMANT').toUpperCase();
  const dominantArchetype = String(verseAmplifier?.dominantArchetype?.label || '').trim();
  const trueVisionBand = String(verseAmplifier?.trueVision?.dominantBand?.label || '').trim();
  const confidence = Math.round((Number(verseAmplifier?.trueVision?.confidence) || 0) * 100);

  if (dominantArchetype) {
    return `${dominantTier} resonance leans toward ${dominantArchetype}.${trueVisionBand ? ` TrueVision tracks ${trueVisionBand} at ${confidence}% confidence.` : ''}`;
  }

  return `${dominantTier} resonance is present.${trueVisionBand ? ` TrueVision tracks ${trueVisionBand} at ${confidence}% confidence.` : ''}`;
}

export default function PixelBrainPage() {
  const { getCompletions, isReady: isPredictiveReady } = usePredictor();
  const isGodotExportEnabled = useGodotExportFlag();
  const [verseText, setVerseText] = useState("");

  const {
    artifact: synthesis,
    isSynthesizing: isVerseAnalyzing,
    verseIR: verseAnalysis,
    totalSyllables,
  } = useVerseSynthesis(verseText, {
    mode: "balanced"
  });
  
  // State
  const [activeSchool] = useState('VOID');
  const [referenceImage, setReferenceImage] = useState(null);
  const [imageAnalysis, setImageAnalysis] = useState(null);
  const [formula, setFormula] = useState(null);
  const [coordinates, setCoordinates] = useState([]);
  const [palettes, setPalettes] = useState([]);
  const [parameters, setParameters] = useState({});
  const [extensions, setExtensions] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [showTerminal, setShowTerminal] = useState(false);
  const [leftTab, setLeftTab] = useState('upload'); // 'upload' or 'transmute'
  const [plsSuggestions, setPlsSuggestions] = useState([]);
  const [pixelCanvas, setPixelCanvas] = useState(DEFAULT_PIXEL_CANVAS);
  const [photonicRoute, setPhotonicRoute] = useState(null);
  const [isMorphing, setIsMorphing] = useState(false);
  const [latticeView, setLatticeView] = useState(false);
  const [isTemplate, setIsTemplate] = useState(false);
  const [fillSchool, setFillSchool] = useState('WILL');
  const [fillRarity, setFillRarity] = useState('RARE');
  const [fillEffect, setFillEffect] = useState('HARMONIC');
  const [wandFillSpec, setWandFillSpec] = useState(null);

  const canvasRef = useRef(null);
  const previousPhotonicPacketRef = useRef(null);
  const morphRafRef = useRef(null);

  const bridgedPlsFeatures = synthesis?.features || null;
  const verseAmplifier = verseAnalysis?.verseIRAmplifier || null;
  const versePixelBrainPayload = verseAmplifier?.pixelBrain || null;
  const amplifierExplanation = describeVerseAmplifier(verseAmplifier);

  // Plain-instruction interpretation ("make it icy blue", "darker") — drives
  // the in-place morph without needing poetic/stable-line-ending structure.
  const instructionTarget = useMemo(() => interpretInstruction(verseText), [verseText]);

  const clockRef = useRef({ elapsedSeconds: 0 });

  useEffect(() => {
    let active = true;
    const start = performance.now();
    const tick = () => {
      if (!active) return;
      clockRef.current.elapsedSeconds = (performance.now() - start) / 1000;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return () => { active = false; };
  }, []);

  const SCHOOL_TO_INDEX = useMemo(() => ({
    SONIC: 0,
    PSYCHIC: 1,
    VOID: 2,
    ALCHEMY: 3,
    WILL: 4,
  }), []);

  const shaderRuntimeState = useMemo(() => {
    const schoolIdx = SCHOOL_TO_INDEX[activeSchool] ?? 2;
    return {
      clock: clockRef.current,
      canvas: { size: [160, 144] },
      spell: { schoolIndex: schoolIdx },
      verse: {
        resonance: totalSyllables ? Math.min(1.0, totalSyllables / 10) : 0.5,
        vowelDensity: 0.5,
      },
      palette: {
        0: palettes[0] ? palettes[0].colors[0] : '#000000',
      },
    };
  }, [activeSchool, palettes, totalSyllables, SCHOOL_TO_INDEX]);

  const handleShaderDiagnostic = useCallback((err) => {
    if (err) {
      setError(err.message || 'Shader compile error');
      setStatus('error');
    } else {
      setError(null);
      setStatus('ready');
    }
  }, []);
  const canMorph = (instructionTarget.available || Boolean(versePixelBrainPayload)) && !isMorphing;

  // Sync parameters state from formula
  useEffect(() => {
    if (formula?.coordinateFormula?.parameters) {
      const newParams = {};
      Object.entries(formula.coordinateFormula.parameters).forEach(([k, v]) => {
        const sliderKey = REVERSE_PARAM_MAP[k] || k;
        newParams[sliderKey] = v;
      });
      setParameters(newParams);
    }
  }, [formula]);

  const uploadRequestRef = useRef(0);

  // Handle parameter change
  const handleParameterChange = useCallback((key, value) => {
    // 1. Update parameters state (for UI sliders)
    setParameters(prev => ({ ...prev, [key]: value }));
    
    // 2. If we have a formula, re-evaluate it with the new value
    if (formula) {
      const formulaKey = PARAM_MAP[key] || key;
      const updatedFormula = {
        ...formula,
        coordinateFormula: {
          ...formula.coordinateFormula,
          parameters: {
            ...formula.coordinateFormula.parameters,
            [formulaKey]: value
          }
        }
      };
      
      // Evaluate formula to get new coordinates
      const newCoords = evaluateFormulaWithColor(updatedFormula, { width: 160, height: 144 });
      
      // These setters are now outside the setParameters updater, preventing React anti-patterns
      setCoordinates(newCoords);
      setFormula(updatedFormula);
    }
  }, [formula]);

  // Handle image upload
  const handleImageUpload = useCallback(async (file) => {
    const requestId = ++uploadRequestRef.current;
    setStatus('analyzing');
    setError(null);

    try {
      const preview = URL.createObjectURL(file);
      if (requestId !== uploadRequestRef.current) return;
      setReferenceImage({ file, preview });

      let analysis = await analyzeImageClientSide(file);
      if (requestId !== uploadRequestRef.current) return;
      analysis = { ...analysis, preview };

      try {
        const formData = new FormData();
        formData.append('image', file);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        const response = await fetch('/api/image/analyze', {
          method: 'POST', body: formData, signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (response.ok) {
          const responseData = await response.json();
          const serverAnalysis = responseData.analysis?.colors
            ? responseData.analysis
            : responseData.analysis?.analysis;
          if (serverAnalysis?.colors && requestId === uploadRequestRef.current) {
            analysis = { ...serverAnalysis, preview };
          }
        }
      } catch { /* server unavailable — client analysis is sufficient */ }

      if (requestId !== uploadRequestRef.current) return;
      setImageAnalysis(analysis);
      setPixelCanvas(DEFAULT_PIXEL_CANVAS);
      setLatticeView(false);
      setStatus('generating');

      const workerResult = await processorBridge.execute('pixel.trace', {
        pixelData: analysis.pixelData,
        dimensions: analysis.dimensions,
        threshold: 30,
      });

      if (requestId !== uploadRequestRef.current) return;

      const result = await generatePixelArtFromImage(
        { ...analysis, coordinates: workerResult.coordinates },
        { width: 160, height: 144, gridSize: 1 },
        extensions.length > 0 ? extensions[0] : null
      );

      if (requestId !== uploadRequestRef.current) return;

      setFormula(result.formula);
      setCoordinates(result.coordinates ?? []);
      setPalettes(result.palettes ?? []);
      setPixelCanvas(DEFAULT_PIXEL_CANVAS);
      setStatus('ready');

    } catch (err) {
      if (requestId === uploadRequestRef.current) {
        console.error('Image upload failed:', err);
        setError(err.message || 'Image analysis failed. Please try again.');
        setStatus('error');
        setReferenceImage(null);
        setImageAnalysis(null);
      }
    }
  }, [extensions]);

  const handleTransmuteResult = useCallback((result) => {
    setCoordinates(result.coordinates);
    setPalettes(result.palettes);
    setPixelCanvas(DEFAULT_PIXEL_CANVAS);
    setStatus('ready');
  }, []);

  // Handle export
  const handleExport = useCallback(async (presetKey) => {
    try {
      setStatus('generating');
      
      const preset = {
        GODOT: { scale: 1, name: 'godot' },
        UNITY: { scale: 2, name: 'unity' },
        WEB: { scale: 1, name: 'web' },
        FORMULA: { format: 'json', name: 'formula' }
      }[presetKey];

      if (preset.format === 'json') {
        const data = JSON.stringify({ formula, coordinates, palettes }, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `pixelbrain_${activeSchool.toLowerCase()}_${Date.now()}.json`;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        const exportCanvas = document.createElement('canvas');
        const scale = preset.scale || 1;
        exportCanvas.width = 160 * scale;
        exportCanvas.height = 144 * scale;
        const ectx = exportCanvas.getContext('2d');
        ectx.clearRect(0, 0, exportCanvas.width, exportCanvas.height);
        coordinates.forEach(coord => {
          ectx.fillStyle = coord.color;
          const px = Math.round(coord.x * scale);
          const py = Math.round(coord.y * scale);
          ectx.fillRect(px, py, scale, scale);
        });
        const url = exportCanvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = url;
        link.download = `pixelbrain_${activeSchool.toLowerCase()}_${preset.name}_${'12345'}.png`;
        link.click();
      }
      setStatus('ready');
    } catch (err) {
      setError(err.message || 'Export failed');
      setStatus('error');
    }
  }, [coordinates, palettes, formula, activeSchool]);

  const handleGodotArtifactExport = useCallback(() => {
    try {
      const artifactText = buildPixelBrainGodotExport({
        canvas: pixelCanvas,
        palettes,
        coordinates,
        formula,
      });

      downloadTextFile(`pixelbrain_${activeSchool.toLowerCase()}_${Date.now()}.pbrain`, artifactText);
      setStatus('ready');
      setError(null);
    } catch (err) {
      setError(err.message || 'Godot artifact export failed');
      setStatus('error');
    }
  }, [activeSchool, coordinates, formula, palettes, pixelCanvas]);

  // Handle clear
  const handleClear = useCallback(() => {
    if (morphRafRef.current) {
      cancelAnimationFrame(morphRafRef.current);
      morphRafRef.current = null;
    }
    setReferenceImage(null);
    setImageAnalysis(null);
    setFormula(null);
    setCoordinates([]);
    setPalettes([]);
    setPixelCanvas(DEFAULT_PIXEL_CANVAS);
    setPhotonicRoute(null);
    previousPhotonicPacketRef.current = null;
    setParameters({});
    setIsMorphing(false);
    setLatticeView(false);
    setIsTemplate(false);
    setStatus('idle');
    setError(null);
  }, []);

  const handleApplySuggestion = useCallback((suggestion) => {
    setVerseText((current) => spliceSuggestionIntoVerse(current, suggestion));
  }, []);

  const handleSynthesizeFromVerse = useCallback(() => {
    if (!versePixelBrainPayload) {
      setError('VerseIR amplifier did not emit PixelBrain payload.');
      setStatus('error');
      return;
    }

    setReferenceImage(null);
    setImageAnalysis(null);
    setFormula(null);
    setCoordinates(Array.isArray(versePixelBrainPayload.coordinates) ? versePixelBrainPayload.coordinates : []);
    setPalettes(Array.isArray(versePixelBrainPayload.palettes) ? versePixelBrainPayload.palettes : []);
    setPixelCanvas(versePixelBrainPayload.canvas || DEFAULT_PIXEL_CANVAS);
    setLatticeView(true);
    setStatus('ready');
    setError(null);
  }, [versePixelBrainPayload]);

  // NLP MORPH — edit the LOADED asset in place, animated, driven by the verse.
  // Keeps the asset's geometry; sweeps each pixel's hue toward the verse's
  // dominant school while preserving luminance, so it morphs before your eyes.
  const handleApplyNlpMorph = useCallback(() => {
    // Plain instruction wins ("make it blue"); fall back to the phonetic
    // amplifier payload only when the text carries no color/tone words.
    const instruction = interpretInstruction(verseText);
    const target = instruction.available
      ? instruction
      : deriveVerseMorphTarget(versePixelBrainPayload);
    if (!target.available) {
      setError('No color/tone read from that. Try “make it icy blue”, “darker”, or “vivid crimson”.');
      setStatus('error');
      return;
    }
    if (coordinates.length === 0) {
      setError('No loaded asset to morph. Upload an asset first.');
      setStatus('error');
      return;
    }

    if (morphRafRef.current) cancelAnimationFrame(morphRafRef.current);

    const baseCoordinates = coordinates;
    const DURATION_MS = 900;
    const startTime = performance.now();
    // easeInOutCubic — settle gently at both ends of the morph.
    const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

    setError(null);
    setLatticeView(true);
    setIsMorphing(true);

    const step = (now) => {
      const linear = Math.min(1, (now - startTime) / DURATION_MS);
      setCoordinates(morphCoordinatesToward(baseCoordinates, target, ease(linear)));

      if (linear < 1) {
        morphRafRef.current = requestAnimationFrame(step);
      } else {
        morphRafRef.current = null;
        setPalettes(Array.isArray(target.palettes) ? target.palettes : []);
        setIsMorphing(false);
        setStatus('ready');
      }
    };

    morphRafRef.current = requestAnimationFrame(step);
  }, [verseText, versePixelBrainPayload, coordinates]);

  useEffect(() => () => {
    if (morphRafRef.current) cancelAnimationFrame(morphRafRef.current);
  }, []);

  // TEMPLATIZE — strip the loaded asset to geometry + neutral role-slots,
  // so it can be re-filled by any bytecode formula.
  const handleTemplatize = useCallback(() => {
    if (coordinates.length === 0) {
      setError('No loaded asset to templatize. Upload or synthesize one first.');
      setStatus('error');
      return;
    }
    const template = templatize(coordinates, { bands: TEMPLATE_BANDS });
    setCoordinates(template.coordinates);
    setPalettes([]);
    setLatticeView(true);
    setIsTemplate(true);
    setError(null);
    setStatus('ready');
  }, [coordinates]);

  // FILL — resolve the template's slots to concrete colors via a bytecode
  // formula (VW-SCHOOL-RARITY-EFFECT). Works on a raw asset too (auto-slots).
  const fillBytecode = `VW-${fillSchool}-${fillRarity}-${fillEffect}`;
  const handleFillAsBytecode = useCallback(() => {
    if (coordinates.length === 0) {
      setError('Nothing to fill. Upload, synthesize, or templatize an asset first.');
      setStatus('error');
      return;
    }
    setCoordinates(fillTemplate(coordinates, fillBytecode, { bands: TEMPLATE_BANDS }));
    setLatticeView(true);
    setIsTemplate(false);
    setError(null);
    setStatus('ready');
  }, [coordinates, fillBytecode]);

  // PULL FROM WAND — adopt the bytecode WAND emitted, populating the fill
  // selectors. WAND's procedural proposal then drives the fill, not the dropdowns.
  const handlePullFromWand = useCallback(() => {
    const spec = readWandFill();
    if (!spec) {
      setError('No WAND emission found. In WAND, click "Send → PixelBrain" first.');
      setStatus('error');
      return;
    }
    setFillSchool(SCHOOLS[spec.schoolId] ? spec.schoolId : 'VOID');
    if (FILL_RARITIES.includes(spec.rarity)) setFillRarity(spec.rarity);
    if (FILL_EFFECTS.includes(spec.effect)) setFillEffect(spec.effect);
    setWandFillSpec(spec);
    setError(null);
    setStatus('ready');
  }, []);

  // PULL GEOMETRY FROM WAND — load WAND's procedural shape as a silhouette,
  // rescaled to sprite space and auto-shaded (same Sketch AMP), and adopt its
  // bytecode. One click: WAND shape → shaded template ready to FILL.
  const handlePullWandGeometry = useCallback(() => {
    const spec = readWandFill();
    if (!spec || !Array.isArray(spec.coordinates) || spec.coordinates.length === 0) {
      setError('No WAND geometry found. In WAND, evaluate a shape then click "Send → PixelBrain".');
      setStatus('error');
      return;
    }
    if (morphRafRef.current) {
      cancelAnimationFrame(morphRafRef.current);
      morphRafRef.current = null;
    }

    const src = spec.canvas || { width: 800, height: 600 };
    const scale = WAND_TARGET_MAX / Math.max(1, Math.max(src.width, src.height));
    const width = Math.max(1, Math.round(src.width * scale));
    const height = Math.max(1, Math.round(src.height * scale));

    const seen = new Set();
    const occupied = [];
    for (const point of spec.coordinates) {
      const x = Math.min(width - 1, Math.max(0, Math.round(Number(point.x) * scale)));
      const y = Math.min(height - 1, Math.max(0, Math.round(Number(point.y) * scale)));
      const key = `${x},${y}`;
      if (seen.has(key)) continue;
      seen.add(key);
      occupied.push({ x, y });
    }

    const tpl = sketchToSilhouette(occupied, { width, height }, { bands: TEMPLATE_BANDS, symmetry: 'none' });
    setReferenceImage(null);
    setImageAnalysis(null);
    setFormula(null);
    setCoordinates(tpl.coordinates);
    setPalettes([]);
    setPixelCanvas(tpl.dimensions);
    setLatticeView(true);
    setIsTemplate(true);
    setIsMorphing(false);

    setFillSchool(SCHOOLS[spec.schoolId] ? spec.schoolId : 'VOID');
    if (FILL_RARITIES.includes(spec.rarity)) setFillRarity(spec.rarity);
    if (FILL_EFFECTS.includes(spec.effect)) setFillEffect(spec.effect);
    setWandFillSpec(spec);
    setError(null);
    setStatus('ready');
  }, []);

  // COMMIT SKETCH — run the Sketch AMP (auto-shaded silhouette) and load the
  // result as the active asset, ready to FILL by bytecode. No external art.
  const handleCommitSketch = useCallback(({ occupied, dimensions, symmetry }) => {
    if (!Array.isArray(occupied) || occupied.length === 0) {
      setError('Sketch is empty. Paint a shape first.');
      setStatus('error');
      return;
    }
    if (morphRafRef.current) {
      cancelAnimationFrame(morphRafRef.current);
      morphRafRef.current = null;
    }
    const result = sketchToSilhouette(occupied, dimensions, { bands: TEMPLATE_BANDS, symmetry });
    setReferenceImage(null);
    setImageAnalysis(null);
    setFormula(null);
    setCoordinates(result.coordinates);
    setPalettes([]);
    setPixelCanvas(result.dimensions);
    setLatticeView(true);
    setIsTemplate(true);
    setIsMorphing(false);
    setError(null);
    setStatus('ready');
  }, []);

  useEffect(() => {
    let isCancelled = false;

    async function loadSuggestions() {
      if (!isPredictiveReady || !verseText.trim()) {
        if (!isCancelled) setPlsSuggestions([]);
        return;
      }

      const completions = await getCompletions(
        buildPlsContext(verseText, verseAnalysis, bridgedPlsFeatures),
        { limit: 6 }
      );

      if (!isCancelled) {
        setPlsSuggestions(Array.isArray(completions) ? completions : []);
      }
    }

    void loadSuggestions();

    return () => {
      isCancelled = true;
    };
  }, [bridgedPlsFeatures, getCompletions, isPredictiveReady, verseAnalysis, verseText]);

  useEffect(() => {
    if (coordinates.length === 0 || status !== 'ready') {
      setPhotonicRoute(null);
      previousPhotonicPacketRef.current = null;
      return;
    }

    const route = buildPixelBrainPhotonicRoute(
      {
        coordinates,
        palettes,
        canvas: pixelCanvas,
      },
      {
        previousPacket: previousPhotonicPacketRef.current,
      }
    );

    setPhotonicRoute(route);

    if (route?.packet) {
      previousPhotonicPacketRef.current = route.packet;
    }
  }, [coordinates, palettes, pixelCanvas, status]);

  // Render canvas preview — flat 2D only, no Z transforms
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const srcW = imageAnalysis?.dimensions?.width || pixelCanvas?.width || 32;
    const srcH = imageAnalysis?.dimensions?.height || pixelCanvas?.height || 32;
    const scale = Math.min(canvas.width / srcW, canvas.height / srcH) * 0.85;
    const offsetX = Math.floor((canvas.width - srcW * scale) / 2);
    const offsetY = Math.floor((canvas.height - srcH * scale) / 2);

    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (imageAnalysis?.preview && !latticeView) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, offsetX, offsetY, srcW * scale, srcH * scale);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = Math.max(0.5, scale * 0.1);
        for (let x = 0; x <= srcW; x++) {
          const px = offsetX + x * scale;
          ctx.beginPath();
          ctx.moveTo(px, offsetY);
          ctx.lineTo(px, offsetY + srcH * scale);
          ctx.stroke();
        }
        for (let y = 0; y <= srcH; y++) {
          const py = offsetY + y * scale;
          ctx.beginPath();
          ctx.moveTo(offsetX, py);
          ctx.lineTo(offsetX + srcW * scale, py);
          ctx.stroke();
        }
        if (coordinates.length > 0) {
          coordinates.forEach(coord => {
            const px = offsetX + Math.floor((coord.snappedX ?? coord.x) * scale);
            const py = offsetY + Math.floor((coord.snappedY ?? coord.y) * scale);
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = 0.8;
            ctx.fillRect(px, py, Math.max(1, scale * 0.3), Math.max(1, scale * 0.3));
            ctx.globalAlpha = 1;
          });
        }
      };
      img.src = imageAnalysis.preview;
    } else if (coordinates.length > 0) {
      // Lattice view: render the colored coordinate reconstruction (the
      // recolored asset itself), so the NLP morph is visible frame-by-frame.
      coordinates.forEach(coord => {
        const px = offsetX + Math.floor((coord.snappedX ?? coord.x) * scale);
        const py = offsetY + Math.floor((coord.snappedY ?? coord.y) * scale);
        ctx.fillStyle = coord.color || '#a0a0c0';
        ctx.fillRect(px, py, Math.max(1, scale), Math.max(1, scale));
      });
    }
  }, [coordinates, imageAnalysis, pixelCanvas, latticeView]);

  const terminalAnalysisResult = imageAnalysis ? {
    ...imageAnalysis,
    coordinates,
    palettes,
    formula,
    canvas: { width: 160, height: 144, gridSize: 1 },
    referenceImage,
    photonicRoute,
  } : versePixelBrainPayload ? {
    ...versePixelBrainPayload,
    coordinates,
    palettes,
    formula,
    canvas: pixelCanvas,
    referenceImage: null,
    photonicRoute,
  } : null;

  return (
    <div className="pixelbrain-page">
      {/* Surgical Matrix Topbar */}
      <div className="pixelbrain-topbar">
        <div className="topbar-left">
          <span className="topbar-title">PIXELBRAIN // VOID_ECHO v1.1</span>
          <span className="telemetry-text">[STATUS: {status.toUpperCase()}] [MODE: TRANSMUTATION]</span>
        </div>
        <div className="topbar-right">
          {/* IMMUNE_ALLOW: math-random */}
          <span className="telemetry-text">0x{'12345678'}</span>
          <button
            className="telemetry-text"
            style={{ background: 'none', border: '1px solid #444', padding: '2px 8px', marginLeft: '12px', cursor: 'pointer' }}
            onClick={() => setShowTerminal(!showTerminal)}
          >
            {showTerminal ? 'HIDE_TERMINAL' : 'SHOW_TERMINAL'}
          </button>
        </div>
      </div>

      <div className="pixelbrain-main">
        {/* Left Sidebar: Controls */}
        <aside className="pixelbrain-panel pixelbrain-panel--left">
          <div className="panel-tabs">
            <button 
              className={`tab-btn ${leftTab === 'upload' ? 'active' : ''}`}
              onClick={() => setLeftTab('upload')}
            >
              UPLINK
            </button>
            <button 
              className={`tab-btn ${leftTab === 'transmute' ? 'active' : ''}`}
              onClick={() => setLeftTab('transmute')}
            >
              MATRIX
            </button>
            <button
              className={`tab-btn ${leftTab === 'echo' ? 'active' : ''}`}
              onClick={() => setLeftTab('echo')}
            >
              ECHO
            </button>
            <button
              className={`tab-btn ${leftTab === 'sketch' ? 'active' : ''}`}
              onClick={() => setLeftTab('sketch')}
            >
              SKETCH
            </button>
            <button
              className={`tab-btn ${leftTab === 'forge' ? 'active' : ''}`}
              onClick={() => setLeftTab('forge')}
            >
              FORGE
            </button>
          </div>

          <div className="tab-content">
            {leftTab === 'upload' && (
              <>
                <div className="verse-seed-panel">
                  <div className="section-header">
                    <span className="telemetry-text">VERSEIR UPLINK</span>
                  </div>
                  <label className="section-label telemetry-text" htmlFor="pixelbrain-verse-seed">
                    Seed a verse to synthesize, or a plain instruction to morph the loaded asset
                  </label>
                  <textarea
                    id="pixelbrain-verse-seed"
                    className="pixelbrain-verse-input telemetry-text"
                    value={verseText}
                    onChange={(event) => setVerseText(event.target.value)}
                    placeholder="verse → SYNTHESIZE, or “make it icy blue” / “darker, more vivid” → MORPH..."
                    aria-label="Verse or instruction input for PixelBrain"
                  />
                  <div className="pixelbrain-verse-toolbar">
                    <button
                      className="transmute-ignite-btn pixelbrain-verse-btn"
                      onClick={handleSynthesizeFromVerse}
                      disabled={!versePixelBrainPayload || isVerseAnalyzing}
                    >
                      {isVerseAnalyzing ? 'AMPLIFYING_VERSE...' : 'SYNTHESIZE_VERSE_LATTICE'}
                    </button>
                    <button
                      className="transmute-ignite-btn pixelbrain-verse-btn"
                      onClick={handleApplyNlpMorph}
                      disabled={!canMorph || coordinates.length === 0}
                      title="Edit the loaded asset in place from a plain instruction (e.g. “make it icy blue”, “darker”). Keeps its shape, morphs the color."
                    >
                      {isMorphing
                        ? 'MORPHING_ASSET...'
                        : instructionTarget.available
                          ? `MORPH → ${instructionTarget.label.toUpperCase()}`
                          : 'MORPH_LOADED_ASSET'}
                    </button>
                    <span className="telemetry-text pixelbrain-verse-status">
                      {amplifierExplanation}
                    </span>
                  </div>
                  {plsSuggestions.length > 0 && (
                    <div className="pixelbrain-pls-shell" aria-label="PLS suggestions">
                      {plsSuggestions.map((candidate) => (
                        <button
                          key={`${candidate.token}-${candidate.score}`}
                          className="pixelbrain-pls-chip"
                          onClick={() => handleApplySuggestion(candidate.token)}
                          type="button"
                        >
                          <span>{candidate.token}</span>
                          <span>{Math.round((Number(candidate.score) || 0) * 100)}%</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <UploadSection
                  onImageUpload={handleImageUpload}
                  analysis={imageAnalysis}
                  onClear={handleClear}
                  uploadError={error}
                />
                {imageAnalysis && (
                  <AnalysisResults analysis={imageAnalysis} />
                )}
              </>
            )}
            {leftTab === 'transmute' && (
              <StyleTransmuter 
                referenceFile={referenceImage?.file}
                onTransmute={handleTransmuteResult}
                isProcessing={status === 'analyzing'}
              />
            )}
            {leftTab === 'echo' && (
              <DuplicateSection
                referenceFile={referenceImage?.file}
                isProcessing={status === 'generating'}
                onProcessingChange={(p) => setStatus(p ? 'generating' : 'ready')}
              />
            )}
            {leftTab === 'sketch' && (
              <SketchPad
                onCommit={handleCommitSketch}
                disabled={isMorphing}
              />
            )}
            {leftTab === 'forge' && (
              <div className="telemetry-text" style={{ padding: '16px', opacity: 0.7 }}>
                FORGE_ACTIVE // WebGL pipeline engaged. Custom GLSL shaders mapped to spells.
              </div>
            )}
          </div>
        </aside>

        {leftTab === 'forge' ? (
          <Suspense fallback={<div className="telemetry-text" style={{ padding: '24px' }}>LOADING SHADER FORGE...</div>}>
            <ShaderForgePanel
              runtimeState={shaderRuntimeState}
              onDiagnosticEmit={handleShaderDiagnostic}
            />
          </Suspense>
        ) : (
          <>
            {/* Center: Viewport */}
            <section className="pixelbrain-panel pixelbrain-panel--center">
              <div className="canvas-container">
                <canvas
                  ref={canvasRef}
                  className="preview-canvas"
                  width={800}
                  height={600}
                />
              </div>

              <StatusDisplay
                status={status}
                error={error}
              />
            </section>

            {/* Right Sidebar: Telemetry & Compiler */}
            <aside className="pixelbrain-panel pixelbrain-panel--right">
              <div className="section-header">
                <span className="telemetry-text">LATTICE COMPILER</span>
              </div>
              
              <div className="bytecode-terminal">
                <div className="terminal-header telemetry-text">0xF_SYNTAX_STREAM</div>
                <textarea 
                  className="terminal-textarea telemetry-text"
                  style={{ width: '100%', height: '120px', background: '#000', border: '1px solid #333', color: '#00FF41', padding: '8px', fontSize: '12px' }}
                  value={formula ? formulaToBytecode(formula) : "AWAITING_TRANSMUTATION..."}
                  readOnly
                />
              </div>

              <LatticeCanvas analysis={imageAnalysis} />

              <ParameterSliders
                parameters={parameters}
                onChange={handleParameterChange}
                school={activeSchool}
              />
              
              <ExtensionSelector
                selectedExtensions={extensions}
                onChange={setExtensions}
              />

              {/* Template / Fill bridge: strip to neutral slots, refill by bytecode */}
              <div className="section-header" style={{ marginTop: '12px' }}>
                <span className="telemetry-text">TEMPLATE / FILL</span>
                {isTemplate && <span className="telemetry-text" style={{ marginLeft: 'auto', color: '#888' }}>[NEUTRAL SLOTS]</span>}
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  className="transmute-ignite-btn"
                  onClick={handlePullFromWand}
                  title="Adopt only the fill bytecode WAND emitted, populating the selectors below."
                  type="button"
                  style={{ flex: 1 }}
                >
                  PULL_BYTECODE ← WAND
                </button>
                <button
                  className="transmute-ignite-btn"
                  onClick={handlePullWandGeometry}
                  title="Load WAND's procedural shape as a shaded silhouette template (rescaled to sprite space) and adopt its bytecode."
                  type="button"
                  style={{ flex: 1 }}
                >
                  PULL_GEOMETRY ← WAND
                </button>
              </div>
              {wandFillSpec && (
                <div className="telemetry-text" style={{ margin: '4px 0', color: '#7ab4ff', fontSize: '11px' }}>
                  WAND: {wandFillSpec.bytecode}
                  {wandFillSpec.material ? ` · ${String(wandFillSpec.material).toUpperCase()}` : ''}
                </div>
              )}
              <button
                className="transmute-ignite-btn"
                onClick={handleTemplatize}
                disabled={coordinates.length === 0}
                title="Strip the loaded asset to geometry + neutral role-slots (grayscale relief)."
                type="button"
              >
                TEMPLATIZE_ASSET
              </button>
              <div className="pixelbrain-fill-controls" style={{ display: 'flex', gap: '4px', margin: '8px 0' }}>
                <select
                  className="telemetry-text"
                  style={{ flex: 2, background: '#000', border: '1px solid #333', color: '#00FF41', padding: '4px', fontSize: '11px' }}
                  value={fillSchool}
                  onChange={(e) => setFillSchool(e.target.value)}
                  aria-label="Fill school"
                >
                  {Object.keys(SCHOOLS).map((id) => <option key={id} value={id}>{id}</option>)}
                </select>
                <select
                  className="telemetry-text"
                  style={{ flex: 1, background: '#000', border: '1px solid #333', color: '#00FF41', padding: '4px', fontSize: '11px' }}
                  value={fillRarity}
                  onChange={(e) => setFillRarity(e.target.value)}
                  aria-label="Fill rarity"
                >
                  {FILL_RARITIES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <select
                  className="telemetry-text"
                  style={{ flex: 1, background: '#000', border: '1px solid #333', color: '#00FF41', padding: '4px', fontSize: '11px' }}
                  value={fillEffect}
                  onChange={(e) => setFillEffect(e.target.value)}
                  aria-label="Fill effect"
                >
                  {FILL_EFFECTS.map((eff) => <option key={eff} value={eff}>{eff}</option>)}
                </select>
              </div>
              <button
                className="transmute-ignite-btn"
                onClick={handleFillAsBytecode}
                disabled={coordinates.length === 0}
                title="Resolve every slot to a color via this bytecode formula. Re-skins the asset."
                type="button"
              >
                FILL → {fillBytecode}
              </button>

              <button
                className="transmute-ignite-btn"
                onClick={() => handleExport('FORMULA')}
                disabled={!formula}
              >
                EXECUTE_BURN_TO_LATTICE
              </button>
              {isGodotExportEnabled && (
                <button
                  className="transmute-ignite-btn"
                  onClick={handleGodotArtifactExport}
                  disabled={coordinates.length === 0}
                  type="button"
                >
                  EXPORT_GODOT_ARTIFACT
                </button>
              )}
            </aside>
          </>
        )}
      </div>

      {/* Terminal Overlay */}
      <AnimatePresence>
        {showTerminal && (
          <motion.div
            className="terminal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <PixelBrainTerminal
              mode={terminalAnalysisResult ? "result" : "input"}
              analysisResult={terminalAnalysisResult}
              onClose={() => setShowTerminal(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
