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
