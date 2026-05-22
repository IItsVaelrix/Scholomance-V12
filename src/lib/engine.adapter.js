/**
 * ENGINE ADAPTER
 * 
 * Centralized gateway for UI and Worker modules to access Codex-level logic.
 * Enforces the "Cell Wall" (Law 11) by wrapping direct core imports.
 * 
 * Reference: PDR-2026-05-10-ENGINE-ADAPTER
 */

import { 
  SCHOOLS as CORE_SCHOOLS, 
  VOWEL_FAMILY_TO_SCHOOL as CORE_VOWEL_MAPPING,
  computeSchoolWeights as coreComputeSchoolWeights,
  computeSchoolWeightsFromHints as coreComputeSchoolWeightsFromHints,
  computeDominantSchool as coreComputeDominantSchool,
  generateSchoolColor as coreGenerateSchoolColor
} from '../../codex/core/constants/schools.js';

import { verseIRMicroprocessors } from '../../codex/core/microprocessors/index.js';
import { hslToHex as coreHslToHex } from '../../codex/core/pixelbrain/shared.js';
import { processorBridge as coreProcessorBridge } from '../../codex/core/shared/processor-bridge.js';
import { PhonemeEngine as corePhonemeEngine } from '../../codex/core/phonology/phoneme.engine.js';
import { createTokenGraphSemanticRepo as coreCreateTokenGraphSemanticRepo } from '../../codex/services/token-graph/semantic.repo.js';
import { createTokenGraphSequenceRepo as coreCreateTokenGraphSequenceRepo } from '../../codex/services/token-graph/sequence.repo.js';
import { createRitualPredictionEngine as coreCreateRitualPredictionEngine } from '../../codex/core/ritual-prediction/run.js';
import { RhymeIndex as coreRhymeIndex } from '../../codex/core/shared/rhymeIndex.js';
import * as coreMusicEmbeds from '../../codex/core/shared/musicEmbeds.js';

/**
 * --- SHARED CORE ACCESS ---
 */

export const processorBridge = coreProcessorBridge;
export const PhonemeEngine = corePhonemeEngine;
export const RhymeIndex = coreRhymeIndex;
export const musicEmbeds = coreMusicEmbeds;

/**
 * --- SCHOOL LOGIC ---
 */

export const SCHOOLS = CORE_SCHOOLS;
export const VOWEL_FAMILY_TO_SCHOOL = CORE_VOWEL_MAPPING;

export function computeSchoolWeights(tokens) {
  return coreComputeSchoolWeights(tokens);
}

export function computeSchoolWeightsFromHints(hints) {
  return coreComputeSchoolWeightsFromHints(hints);
}

export function computeDominantSchool(weights) {
  return coreComputeDominantSchool(weights);
}

export function generateSchoolColor(schoolId) {
  return coreGenerateSchoolColor(schoolId);
}

/**
 * --- MICROPROCESSOR LOGIC ---
 */

export const engineMicroprocessors = {
  /**
   * Execute a single processor by ID
   */
  async execute(id, payload, context) {
    return await coreProcessorBridge.execute(id, payload, context);
  },

  /**
   * Execute a sequence of processors as a pipeline
   */
  async executePipeline(sequence, payload, context) {
    return await verseIRMicroprocessors.executePipeline(sequence, payload, context);
  }
};

/**
 * --- GRAPH & PREDICTION ---
 */

export function createTokenGraphSemanticRepo() {
  return coreCreateTokenGraphSemanticRepo();
}

export function createTokenGraphSequenceRepo(options) {
  return coreCreateTokenGraphSequenceRepo(options);
}

export function createRitualPredictionEngine(options) {
  return coreCreateRitualPredictionEngine(options);
}

/**
 * --- SHARED UTILS ---
 */

export function hslToHex(h, s, l) {
  return coreHslToHex(h, s, l);
}

/**
 * --- FORMULA & WAND LOGIC (Law 11 satisfying LING-0F03) ---
 */
import { validateProposal as coreValidateProposal } from '../../codex/core/modulation/planner/formula-validator.js';
import { evaluateFormula as coreEvaluateFormula } from '../../codex/core/pixelbrain/formula-to-coordinates.js';
import { 
  snapToPixelGrid as coreSnapToPixelGrid,
  resolvePixelGridSize as coreResolvePixelGridSize
} from '../../codex/core/pixelbrain/anti-alias-control.js';
import { validateDivProposal as coreValidateDivProposal } from '../../codex/core/modulation/planner/div-layout-validator.js';

export function validateProposal(proposal) {
  return coreValidateProposal(proposal);
}

export function evaluateFormula(formula, canvasSize, time = 0, options = {}) {
  return coreEvaluateFormula(formula, canvasSize, time, options);
}

export function snapToPixelGrid(coordinates, gridSize) {
  return coreSnapToPixelGrid(coordinates, gridSize);
}

export function resolvePixelGridSize(options) {
  return coreResolvePixelGridSize(options);
}

export function validateDivProposal(proposal) {
  return coreValidateDivProposal(proposal);
}




/**
 * --- TURBOQUANT QUANTIZATION GATEWAY ---
 */
import {
  initializeTurboQuant as coreInitializeTurboQuant,
  quantizeVector as coreQuantizeVector,
  similarity as coreSimilarity,
  isWasmActive as coreIsWasmActive,
} from './math/quantization/index.js';

export const initializeTurboQuant = coreInitializeTurboQuant;
export const quantizeVector = coreQuantizeVector;
export const similarity = coreSimilarity;
export const isWasmActive = coreIsWasmActive;

export function padFlatVectorToPowerOfTwo(flatVector) {
  const source = Array.from(flatVector || []);
  const originalLength = source.length;

  if (originalLength === 0) {
    return {
      values: new Float32Array(1),
      originalLength: 0,
      paddedLength: 1,
      padCount: 1,
      padPolicy: 'trailing_zero_power2',
    };
  }

  const paddedLength = 2 ** Math.ceil(Math.log2(originalLength));
  const values = new Float32Array(paddedLength);
  values.set(source);

  return {
    values,
    originalLength,
    paddedLength,
    padCount: paddedLength - originalLength,
    padPolicy: 'trailing_zero_power2',
  };
}

export async function quantizeFlatCoordinates(flatCoords, options = {}) {
  const padded = padFlatVectorToPowerOfTwo(flatCoords);
  const backend = coreIsWasmActive() ? 'wasm' : 'js';

  const quantized = await coreQuantizeVector(padded.values, options);

  const dataLen = quantized.data
    ? quantized.data.length
    : (quantized.byteLength !== undefined ? quantized.byteLength : 0);

  const compressionRatio = padded.originalLength > 0
    ? dataLen / (padded.originalLength * Float32Array.BYTES_PER_ELEMENT)
    : 0;

  return {
    ok: true,
    backend,
    quantized,
    originalLength: padded.originalLength,
    paddedLength: padded.paddedLength,
    padCount: padded.padCount,
    padPolicy: padded.padPolicy,
    compressionRatio,
  };
}




