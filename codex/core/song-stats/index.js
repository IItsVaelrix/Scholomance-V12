import {
  CALIBRATION_VERSION,
  DEFAULT_BEATS_PER_LINE,
  DEFAULT_BPM,
  DEFAULT_RHYME_WINDOW,
  ENGINE_VERSION,
  MIN_WORDS_FOR_STATS,
  WEIGHTS,
} from './constants.js';
import { buildSourceFingerprint } from './fingerprint.js';
import { computeRhymeDensity } from './rhymeDensity.js';
import { computeUniqueVocabulary } from './uniqueVocabulary.js';

/** @typedef {import('./types.js').AnalyzedDocument} AnalyzedDocument */
/** @typedef {import('./types.js').ComputeSongStatsOptions} ComputeSongStatsOptions */
/** @typedef {import('./types.js').Diagnostic} Diagnostic */
/** @typedef {import('./types.js').SongStatPillar} SongStatPillar */
/** @typedef {import('./types.js').SongStatsComposite} SongStatsComposite */
/** @typedef {import('./types.js').SongStatsMeta} SongStatsMeta */
/** @typedef {import('./types.js').SongStatsResult} SongStatsResult */

/**
 * @param {Diagnostic[]} [extraDiagnostics]
 * @returns {SongStatPillar}
 */
function stubRhymeDensityPillar(extraDiagnostics = []) {
  return {
    id: 'rhyme_density',
    value: 0,
    unit: 'rd_c',
    normalized01: 0,
    fidelity: 'exact',
    confidence01: 0,
    coverage01: 0,
    diagnostics: extraDiagnostics,
  };
}

/**
 * @returns {SongStatPillar}
 */
function stubUniqueVocabularyPillar() {
  return {
    id: 'unique_vocabulary',
    value: 0,
    unit: 'per_100w',
    normalized01: 0,
    fidelity: 'exact',
    confidence01: 0,
    coverage01: 0,
    diagnostics: [],
  };
}

/**
 * @returns {SongStatPillar}
 */
function stubFlowAlignmentPillar() {
  return {
    id: 'flow_alignment',
    value: 0,
    unit: 'sps',
    normalized01: 0,
    fidelity: 'estimated',
    confidence01: 0,
    coverage01: 0,
    diagnostics: [],
  };
}

/**
 * @param {AnalyzedDocument} doc
 * @param {ComputeSongStatsOptions} [options]
 * @returns {SongStatsResult}
 */
export function computeSongStats(doc, options = {}) {
  const rhymeWindow = options.rhymeWindow ?? DEFAULT_RHYME_WINDOW;
  const wordCount = doc.allWords?.length ?? 0;
  const sourceFingerprint = buildSourceFingerprint({
    raw: doc.raw ?? '',
    rhymeWindow,
    alignmentId: options.alignment?.id ?? null,
    beatGridId: options.beatGrid?.id ?? null,
  });

  /** @type {SongStatsMeta} */
  const meta = {
    engineVersion: ENGINE_VERSION,
    calibrationVersion: CALIBRATION_VERSION,
    sourceFingerprint,
    rhymeWindow,
    fidelitySummary: 'estimated',
    assumptions: {
      estimatedBpm: DEFAULT_BPM,
      beatsPerLine: DEFAULT_BEATS_PER_LINE,
      lineRepresentsBar: true,
    },
  };

  /** @type {SongStatsComposite} */
  const composite = {
    label: 'technical_density',
    total0to100: null,
    band: null,
    provisional: true,
    weights: { ...WEIGHTS },
  };

  if (wordCount < MIN_WORDS_FOR_STATS) {
    /** @type {Diagnostic} */
    const needMoreLyrics = {
      code: 'need_more_lyrics',
      message: `At least ${MIN_WORDS_FOR_STATS} words are required for song stats.`,
      severity: 'warning',
    };

    return {
      wordCount,
      pillars: {
        rhymeDensity: stubRhymeDensityPillar([needMoreLyrics]),
        uniqueVocabulary: stubUniqueVocabularyPillar(),
        flowAlignment: stubFlowAlignmentPillar(),
      },
      composite,
      meta,
    };
  }

  return {
    wordCount,
    pillars: {
      rhymeDensity: computeRhymeDensity(doc.allWords, { rhymeWindow }),
      uniqueVocabulary: computeUniqueVocabulary(doc.allWords),
      flowAlignment: stubFlowAlignmentPillar(),
    },
    composite,
    meta,
  };
}

export { buildSourceFingerprint } from './fingerprint.js';
export { computeRhymeDensity, longestVowelMatchLength } from './rhymeDensity.js';
export { computeUniqueVocabulary } from './uniqueVocabulary.js';
export * from './constants.js';
