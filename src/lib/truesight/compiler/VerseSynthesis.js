/**
 * VerseSynthesis AMP — Unified Linguistic Analytical MicroProcessor
 * 
 * The authoritative engine for transmuting raw syntax into structured magic.
 * Integrates VerseIR, RhymeDetection, and MeterAnalysis into a single O(1) lookup field.
 * 
 * Logic Domain: Vaelrix Law 5 (Pure Analysis)
 */

import { analyzeText } from "../../../../codex/core/analysis.pipeline.js";
import { buildSyntaxLayer } from "../../syntax.layer.js";
import { buildHiddenHarkovSummary } from "../../models/harkov.model.js";
import { compileVerseToIR } from "./compileVerseToIR.js";
import { detectScheme, analyzeMeter } from "../../rhymeScheme.detector.js";
import { buildVowelSummary, normalizeVowelFamily } from "../../phonology/vowelFamily.js";
import { analyzeLiteraryDevices, detectEmotionDetailed } from "../../literaryDevices.detector.js";
import { resolveSonicChroma } from "../../../../codex/core/phonology/chroma.resolver.js";
import { decodeBytecode } from "../../../pages/Read/bytecodeRenderer.js";
import { buildRhymeColorRegistry, resolveTokenColor } from "../color/rhymeColorRegistry.js";
import { resolveVerseIrColor } from "../color/pcaChroma.js";

/**
 * Executes a total linguistic synthesis of the given text.
 * 
 * @param {string} text - Raw verse text
 * @param {Object} options - { mode, school }
 * @returns {LinguisticArtifact} Unified analytical payload
 */
export function synthesizeVerse(text, options = {}) {
  const normalizedText = String(text || "");
  if (!normalizedText.trim()) return createEmptyArtifact();

  // 1. Structural Skeleton (The Bones)
  const analyzedDoc = analyzeText(normalizedText);
  const syntaxLayer = buildSyntaxLayer(analyzedDoc);
  
  // 2. Hidden Harkov Model (The Pulse)
  const hhm = buildHiddenHarkovSummary(syntaxLayer.tokens);

  // 3. VerseIR Compilation (The Physics)
  const verseIR = compileVerseToIR(normalizedText, {
    mode: options.mode || 'balanced'
  });

  // 4. Rhyme & Meter Detection (The Echo)
  const scheme = detectScheme(syntaxLayer.schemePattern, syntaxLayer.rhymeGroups);
  const meter = analyzeMeter(analyzedDoc.lines);
  const vowelSummary = buildVowelSummary(analyzedDoc);

  // 5. Stylistic Inference (The Soul)
  const literaryDevices = analyzeLiteraryDevices(normalizedText);
  const emotion = detectEmotionDetailed(normalizedText, {
    syntaxLayer,
    hhmSummary: hhm.summary
  }).emotion;

  // 6. Token Identity Mapping & Chromatic Unification
  const tokenByIdentity = new Map();
  const tokenByCharStart = new Map();
  const tokenByNormalizedWord = new Map();

  const currentSchool = options.school || 'DEFAULT';

  verseIR.tokens.forEach((token, index) => {
    const syntaxToken = syntaxLayer.tokens[index] || {};
    const identityKey = `${token.lineIndex}:${token.tokenIndexInLine}:${token.charStart}`;
    
    // PIPELINE A: Phonetic Anchor
    const sonicChroma = (token.phonemes?.length > 0) ? resolveSonicChroma(token.phonemes) : null;
    
    // PIPELINE B: Unified Visual (Locked to Anchor)
    const verseIrColor = token.terminalVowelFamily 
      ? resolveVerseIrColor(token.terminalVowelFamily, currentSchool, {
          forcedHue: sonicChroma?.h ?? null,
          phase: index / (verseIR.tokens.length || 1)
        })
      : null;

    const visualBytecode = token.visualBytecode || token.trueVisionBytecode || null;
    const decoded = visualBytecode ? decodeBytecode(visualBytecode) : null;

    const unifiedToken = {
      ...token,
      ...syntaxToken,
      hhm: hhm.tokenStateByIdentity.get(identityKey) || null,
      vowelFamily: normalizeVowelFamily(token.primaryStressedVowelFamily),
      verseIrColor,
      precomputed: {
        sonicChroma,
        decoded,
        hex: verseIrColor?.hex || (sonicChroma ? `hsl(${sonicChroma.h}, ${sonicChroma.s}%, ${sonicChroma.l}%)` : null)
      }
    };

    tokenByIdentity.set(identityKey, unifiedToken);
    tokenByCharStart.set(token.charStart, unifiedToken);
    
    if (!tokenByNormalizedWord.has(token.normalizedWord)) {
      tokenByNormalizedWord.set(token.normalizedWord, unifiedToken);
    }
  });

  // 7. Authority Registry Unification
  const rhymeColorRegistry = buildRhymeColorRegistry(Array.from(tokenByIdentity.values()));

  return Object.freeze({
    timestamp: Date.now(),
    verseIR,
    syntaxLayer,
    hhm,
    scheme,
    meter,
    vowelSummary,
    literaryDevices,
    emotion,
    tokenByIdentity,
    tokenByCharStart,
    tokenByNormalizedWord,
    rhymeColorRegistry,
    totalSyllables: verseIR.metadata.syllableCount || 0,
    isPure: true
  });
}

function createEmptyArtifact() {
  return Object.freeze({
    timestamp: Date.now(),
    verseIR: null,
    syntaxLayer: null,
    hhm: null,
    scheme: null,
    meter: null,
    vowelSummary: { families: [], totalWords: 0, uniqueWords: 0 },
    literaryDevices: [],
    emotion: 'Neutral',
    tokenByIdentity: new Map(),
    tokenByCharStart: new Map(),
    tokenByNormalizedWord: new Map(),
    totalSyllables: 0,
    isPure: true
  });
}
