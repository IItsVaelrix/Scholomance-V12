/**
 * @typedef {'info' | 'warning' | 'error'} DiagnosticSeverity
 */

/**
 * @typedef {Object} Diagnostic
 * @property {string} code
 * @property {string} message
 * @property {DiagnosticSeverity} severity
 */

/**
 * @typedef {'rhyme_density' | 'unique_vocabulary' | 'flow_alignment'} SongStatPillarId
 */

/**
 * @typedef {'exact' | 'estimated' | 'aligned'} SongStatFidelity
 */

/**
 * @typedef {Object} SongStatPillar
 * @property {SongStatPillarId} id
 * @property {number} value
 * @property {string} unit
 * @property {Record<string, number | string>} [secondary]
 * @property {number} normalized01
 * @property {SongStatFidelity} fidelity
 * @property {number} confidence01
 * @property {number} coverage01
 * @property {Diagnostic[]} diagnostics
 */

/**
 * @typedef {'Godlike' | 'Master' | 'Adept' | 'Neophyte'} TechnicalDensityBand
 */

/**
 * @typedef {Object} SongStatsComposite
 * @property {'technical_density'} label
 * @property {number | null} total0to100
 * @property {TechnicalDensityBand | null} band
 * @property {boolean} provisional
 * @property {{ rhymeDensity: number, uniqueVocabulary: number, flowAlignment: number }} weights
 */

/**
 * @typedef {Object} SongStatsMeta
 * @property {'song-stats-v1'} engineVersion
 * @property {string} calibrationVersion
 * @property {string} sourceFingerprint
 * @property {number} rhymeWindow
 * @property {'estimated' | 'aligned'} fidelitySummary
 * @property {{ estimatedBpm: number, beatsPerLine: number, lineRepresentsBar: boolean }} assumptions
 */

/**
 * @typedef {Object} SongStatsResult
 * @property {number} wordCount
 * @property {{ rhymeDensity: SongStatPillar, uniqueVocabulary: SongStatPillar, flowAlignment: SongStatPillar }} pillars
 * @property {SongStatsComposite} composite
 * @property {SongStatsMeta} meta
 */

/**
 * @typedef {Object} AnalyzedDocument
 * @property {string} raw
 * @property {Array<{ text: string, number: number, words: unknown[] }>} lines
 * @property {Array<{ text: string, normalized: string, start: number, end: number, phonetics?: { phonemes?: string[] } }>} allWords
 * @property {Record<string, unknown>} [stats]
 */

/**
 * @typedef {Object} ComputeSongStatsOptions
 * @property {unknown} [alignment]
 * @property {unknown} [beatGrid]
 * @property {number} [rhymeWindow]
 */

export {};
