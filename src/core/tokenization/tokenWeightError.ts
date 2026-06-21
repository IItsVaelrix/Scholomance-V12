/**
 * tokenWeightError.ts
 *
 * Tokenization weight diagnostic module for the Scholomance analysis pipeline.
 *
 * PROBLEM THIS SOLVES
 * ───────────────────
 * The pipeline (analysis.pipeline.js) produces per-token phonetics, rarity,
 * and content-word flags, but it does not compute a unified per-token weight.
 * The ranker (ranker.js) receives pre-scored candidates from 8 providers and
 * applies provider-level weights — but if a provider's internal scoring is
 * miscalibrated for a token (wrong syllable count, missing rarity signal,
 * stop-word misclassification), that error propagates silently through every
 * provider that touches that token.
 *
 * This module:
 *   1. Computes a REFERENCE token weight for every word in a document using
 *      a transparent, auditable formula (TF-IDF × phonetic salience × position).
 *   2. Compares that reference weight against what the ranker actually scored
 *      each candidate, identifying OVER_WEIGHTED and UNDER_WEIGHTED tokens.
 *   3. Returns a structured TokenWeightDiagnostic that can be logged,
 *      stored in BytecodeHealth, or displayed in the diagnostics panel.
 *
 * DIAGNOSE_ONLY — this module never mutates pipeline state or source code.
 * It only observes and reports.
 *
 * USAGE
 * ─────
 * import { auditTokenWeights } from "../../src/core/tokenization/tokenWeightError";
 *
 * const diagnostic = auditTokenWeights({
 *   analyzedDocument,   // from analyzeText() in analysis.pipeline.js
 *   rankedCandidates,   // from rankCandidates() in ranker.js
 *   context,            // PLSContext
 * });
 *
 * if (diagnostic.errors.length > 0) {
 *   console.warn("[TokenWeight] Scoring anomalies detected:", diagnostic.errors);
 * }
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Default tolerance band.  A ranked score is considered anomalous if it
 * deviates from the reference weight by more than this fraction.
 */
const DEFAULT_DEVIATION_THRESHOLD = 0.25;

/**
 * Minimum reference weight below which we do not audit (stop words,
 * punctuation-only tokens, very rare one-letter tokens).
 */
const MIN_AUDITABLE_WEIGHT = 0.05;

/**
 * Positional decay applied to words deeper in a line.
 * First word on a line receives full weight; each subsequent word decays by
 * this factor.  Mirrors how meter scorers front-load stress.
 */
const POSITIONAL_DECAY_PER_WORD = 0.06;

/**
 * Syllable bonus applied per syllable above 1.  Polysyllabic words carry more
 * phonetic information and should score higher in phonetically-aware providers.
 */
const SYLLABLE_SALIENCE_BONUS = 0.08;

/**
 * Maximum rarity bonus applied to the reference weight.
 * `rarity` on AnalyzedWord is already 0-1; we scale it here.
 */
const RARITY_WEIGHT_SCALE = 0.3;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WeightErrorKind =
  | "OVER_WEIGHTED"   // Ranker scored token far above reference
  | "UNDER_WEIGHTED"  // Ranker scored token far below reference
  | "STOP_WORD_SCORED" // Stop word received a non-trivial score
  | "MISSING_PHONETICS" // Token has no phoneme data; weight unreliable
  | "SYLLABLE_MISMATCH"; // Syllable count from phonetics vs. token length heuristic disagree

export type TokenWeightEntry = {
  /** Surface form of the token as it appears in the document. */
  token: string;
  /** Normalized (lowercase, stripped) form. */
  normalized: string;
  /** 0-1 reference weight derived from TF-IDF × phonetic salience × position. */
  referenceWeight: number;
  /** 0-1 score the ranker assigned to this token (undefined if not a candidate). */
  rankerScore?: number;
  /**
   * Signed deviation: (rankerScore - referenceWeight).
   * Positive = over-weighted. Negative = under-weighted.
   */
  deviation?: number;
  /** Whether the token was classified as a stop word. */
  isStopWord: boolean;
  /** Whether phoneme data was available for this token. */
  hasPhonetics: boolean;
  /** Syllable count used for the salience calculation. */
  syllableCount: number;
  /** Term frequency of this token in the document (raw count). */
  termFrequency: number;
  /** Inverse document frequency proxy (1 / (1 + termFrequency)). */
  idfProxy: number;
  /** Position-adjusted weight before provider scoring. */
  positionalWeight: number;
};

export type TokenWeightError = {
  /** Error classification. */
  kind: WeightErrorKind;
  /** The token that triggered the error. */
  token: string;
  /** Human-readable explanation. */
  message: string;
  /** Reference weight at the time of the error. */
  referenceWeight: number;
  /** Ranker score at the time of the error (if available). */
  rankerScore?: number;
  /** Absolute deviation magnitude. */
  deviationMagnitude?: number;
  /** Suggested investigation target. */
  investigateIn?: string;
};

export type TokenWeightDiagnosticSummary = {
  /** Total tokens audited. */
  totalTokens: number;
  /** Tokens with errors. */
  errorCount: number;
  /** Stop words that received non-trivial scores. */
  stopWordLeakCount: number;
  /** Tokens that were over-weighted. */
  overWeightedCount: number;
  /** Tokens that were under-weighted. */
  underWeightedCount: number;
  /** Tokens missing phonetics. */
  missingPhoneticsCount: number;
  /** Mean absolute deviation across all audited tokens. */
  meanAbsoluteDeviation: number;
  /** Worst single deviation (by absolute magnitude). */
  worstDeviation: number;
  /** Token responsible for the worst deviation. */
  worstToken: string;
};

export type TokenWeightDiagnostic = {
  /** ISO timestamp of when this audit was run. */
  auditedAt: string;
  /** All token weight entries computed. */
  tokens: TokenWeightEntry[];
  /** Detected errors. */
  errors: TokenWeightError[];
  /** Aggregate summary. */
  summary: TokenWeightDiagnosticSummary;
  /**
   * Deviation threshold used for this audit.
   * Tokens whose |deviation| exceeds this are flagged.
   */
  deviationThreshold: number;
  /** DIAGNOSE_ONLY — never mutates source code. */
  diagnosticMode: "DIAGNOSE_ONLY";
};

// ---------------------------------------------------------------------------
// Input shape (mirrors pipeline + ranker outputs)
// ---------------------------------------------------------------------------

/** Minimal AnalyzedWord shape expected from analysis.pipeline.js. */
type AnalyzedWordInput = {
  text: string;
  normalized: string;
  isStopWord: boolean;
  isContentWord: boolean;
  syllableCount: number;
  rarity?: number;
  phonetics?: { phonemes?: string[] } | null;
  deepPhonetics?: { syllableCount?: number } | null;
  lineNumber?: number;
};

/** Minimal AnalyzedDocument shape expected from analysis.pipeline.js. */
type AnalyzedDocumentInput = {
  allWords: AnalyzedWordInput[];
  parsed?: {
    wordFrequency?: Record<string, number>;
  };
};

/** Minimal ScoredCandidate shape expected from ranker.js. */
type ScoredCandidateInput = {
  token: string;
  score: number;
};

export type TokenWeightAuditInput = {
  /** Output of analyzeText() from analysis.pipeline.js. */
  analyzedDocument: AnalyzedDocumentInput;
  /**
   * Output of rankCandidates() from ranker.js.
   * May be empty if no candidates were generated (we still audit the document).
   */
  rankedCandidates?: ScoredCandidateInput[];
  /**
   * Deviation threshold override. Defaults to DEFAULT_DEVIATION_THRESHOLD (0.25).
   */
  deviationThreshold?: number;
};

// ---------------------------------------------------------------------------
// Reference weight formula
// ---------------------------------------------------------------------------

/**
 * Compute the reference weight for a single token.
 *
 * Formula:
 *   baseWeight = TF_IDF_proxy × (1 + syllableSalience) × positionalFactor
 *   TF_IDF_proxy = (1 / (1 + termFrequency)) — high-frequency words penalised
 *   syllableSalience = syllableCount > 1 ? (syllableCount - 1) * SYLLABLE_SALIENCE_BONUS : 0
 *   positionalFactor = 1 - (positionInLine * POSITIONAL_DECAY_PER_WORD)
 *   rarityBonus = rarity * RARITY_WEIGHT_SCALE
 *
 *   finalWeight = clamp01(baseWeight + rarityBonus)
 *
 * Stop words receive a weight of 0 by definition (they should not influence
 * phonetic scoring decisions).
 */
function computeReferenceWeight(
  word: AnalyzedWordInput,
  termFrequency: number,
  positionInLine: number,
): number {
  if (word.isStopWord) return 0;

  const tf = Math.max(0, termFrequency);
  const idfProxy = 1 / (1 + tf);

  const syllables = Math.max(1, word.syllableCount || 1);
  const syllableSalience = syllables > 1 ? (syllables - 1) * SYLLABLE_SALIENCE_BONUS : 0;

  const positionalFactor = Math.max(
    0.2,
    1 - positionInLine * POSITIONAL_DECAY_PER_WORD,
  );

  const baseWeight = idfProxy * (1 + syllableSalience) * positionalFactor;

  const rarity = typeof word.rarity === "number" && isFinite(word.rarity)
    ? Math.max(0, Math.min(1, word.rarity))
    : 0;
  const rarityBonus = rarity * RARITY_WEIGHT_SCALE;

  return Math.max(0, Math.min(1, baseWeight + rarityBonus));
}

// ---------------------------------------------------------------------------
// Syllable consistency check
// ---------------------------------------------------------------------------

/**
 * A quick heuristic syllable estimate based on vowel groups.
 * Used only for consistency checking against the phoneme engine count.
 */
function heuristicSyllableCount(word: string): number {
  const lower = word.toLowerCase().replace(/[^a-z]/g, "");
  const vowelGroups = lower.match(/[aeiouy]+/g);
  const raw = vowelGroups ? vowelGroups.length : 1;
  // Apply silent-e heuristic
  const silentE = lower.length > 2 && lower.endsWith("e") ? -1 : 0;
  return Math.max(1, raw + silentE);
}

// ---------------------------------------------------------------------------
// Core audit function
// ---------------------------------------------------------------------------

/**
 * Audit the token weight scoring of an analyzed document against ranked
 * candidate scores.
 *
 * Returns a TokenWeightDiagnostic describing every anomaly found.
 * Does not mutate any input.
 */
export function auditTokenWeights(
  input: TokenWeightAuditInput,
): TokenWeightDiagnostic {
  const {
    analyzedDocument,
    rankedCandidates = [],
    deviationThreshold = DEFAULT_DEVIATION_THRESHOLD,
  } = input;

  const wordFrequency: Record<string, number> =
    analyzedDocument.parsed?.wordFrequency ?? {};

  // Build a lookup: normalizedToken → ranker score
  const rankerScoreMap = new Map<string, number>();
  for (const candidate of rankedCandidates) {
    if (candidate && typeof candidate.token === "string") {
      rankerScoreMap.set(candidate.token.toLowerCase(), candidate.score);
    }
  }

  const tokenEntries: TokenWeightEntry[] = [];
  const errors: TokenWeightError[] = [];

  // Track position-within-line per line
  const linePositionCounters = new Map<number, number>();

  for (const word of analyzedDocument.allWords) {
    const lineNum = word.lineNumber ?? 0;
    const positionInLine = linePositionCounters.get(lineNum) ?? 0;
    linePositionCounters.set(lineNum, positionInLine + 1);

    const tf = wordFrequency[word.normalized] ?? 1;
    const idfProxy = 1 / (1 + tf);
    const referenceWeight = computeReferenceWeight(word, tf, positionInLine);
    const hasPhonetics = Boolean(
      word.phonetics?.phonemes && word.phonetics.phonemes.length > 0,
    );
    const syllableCount = word.syllableCount ?? 1;

    // Ranker score lookup (normalized token)
    const rankerScore = rankerScoreMap.get(word.normalized);
    const deviation =
      rankerScore !== undefined ? rankerScore - referenceWeight : undefined;

    const entry: TokenWeightEntry = {
      token: word.text,
      normalized: word.normalized,
      referenceWeight,
      rankerScore,
      deviation,
      isStopWord: word.isStopWord,
      hasPhonetics,
      syllableCount,
      termFrequency: tf,
      idfProxy,
      positionalWeight: referenceWeight,
    };

    tokenEntries.push(entry);

    // ── Error detection ──────────────────────────────────────────────────────

    // 1. Stop word that somehow received a non-trivial ranker score
    if (word.isStopWord && rankerScore !== undefined && rankerScore > 0.1) {
      errors.push({
        kind: "STOP_WORD_SCORED",
        token: word.text,
        message:
          `Stop word "${word.text}" received ranker score ${rankerScore.toFixed(3)}. ` +
          `Stop words should contribute 0 to phonetic scoring. ` +
          `Check if this token is misclassified in the STOP_WORDS set in analysis.pipeline.js.`,
        referenceWeight: 0,
        rankerScore,
        deviationMagnitude: rankerScore,
        investigateIn: "codex/core/analysis.pipeline.js:STOP_WORDS",
      });
    }

    // 2. Missing phonetics on a content word
    if (!word.isStopWord && !hasPhonetics && referenceWeight > MIN_AUDITABLE_WEIGHT) {
      errors.push({
        kind: "MISSING_PHONETICS",
        token: word.text,
        message:
          `Content word "${word.text}" has no phoneme data. ` +
          `Meter, rhyme, and color providers will score it from fallback paths only. ` +
          `Check PhonemeEngine.analyzeWord coverage for this word.`,
        referenceWeight,
        rankerScore,
        investigateIn: "codex/core/phonology/phoneme.engine.js",
      });
    }

    // 3. Syllable mismatch between phoneme engine and heuristic
    if (!word.isStopWord && hasPhonetics) {
      const heuristic = heuristicSyllableCount(word.normalized);
      const engineCount = syllableCount;
      if (Math.abs(engineCount - heuristic) >= 2) {
        errors.push({
          kind: "SYLLABLE_MISMATCH",
          token: word.text,
          message:
            `Syllable count mismatch for "${word.text}": ` +
            `phoneme engine reports ${engineCount}, heuristic estimates ${heuristic}. ` +
            `A difference of ≥2 may cause the meter provider to score this token incorrectly.`,
          referenceWeight,
          rankerScore,
          investigateIn: "src/lib/pls/providers/meterProvider.js",
        });
      }
    }

    // 4. Over-weighted / under-weighted (only for tokens that were ranked)
    if (
      deviation !== undefined &&
      referenceWeight >= MIN_AUDITABLE_WEIGHT &&
      Math.abs(deviation) > deviationThreshold
    ) {
      const kind: WeightErrorKind =
        deviation > 0 ? "OVER_WEIGHTED" : "UNDER_WEIGHTED";

      const investigateIn =
        kind === "OVER_WEIGHTED"
          ? "src/lib/pls/ranker.js:DEFAULT_WEIGHTS or provider scoring"
          : "src/lib/pls/providers/* — provider may be returning 0 for this token";

      errors.push({
        kind,
        token: word.text,
        message:
          `"${word.text}" is ${kind.replace("_", "-").toLowerCase()}. ` +
          `Reference: ${referenceWeight.toFixed(3)}, ` +
          `Ranker: ${rankerScore!.toFixed(3)}, ` +
          `Deviation: ${deviation > 0 ? "+" : ""}${deviation.toFixed(3)} ` +
          `(threshold ±${deviationThreshold}).`,
        referenceWeight,
        rankerScore,
        deviationMagnitude: Math.abs(deviation),
        investigateIn,
      });
    }
  }

  // ── Summary ────────────────────────────────────────────────────────────────

  const auditableEntries = tokenEntries.filter(
    (e) => e.referenceWeight >= MIN_AUDITABLE_WEIGHT,
  );

  const deviations = auditableEntries
    .filter((e) => e.deviation !== undefined)
    .map((e) => Math.abs(e.deviation!));

  const meanAbsoluteDeviation =
    deviations.length > 0
      ? deviations.reduce((a, b) => a + b, 0) / deviations.length
      : 0;

  const worstIdx = deviations.reduce(
    (maxIdx, d, i, arr) => (d > arr[maxIdx] ? i : maxIdx),
    0,
  );
  const worstDeviation = deviations[worstIdx] ?? 0;
  const worstToken =
    auditableEntries.filter((e) => e.deviation !== undefined)[worstIdx]?.token ?? "";

  const summary: TokenWeightDiagnosticSummary = {
    totalTokens: tokenEntries.length,
    errorCount: errors.length,
    stopWordLeakCount: errors.filter((e) => e.kind === "STOP_WORD_SCORED").length,
    overWeightedCount: errors.filter((e) => e.kind === "OVER_WEIGHTED").length,
    underWeightedCount: errors.filter((e) => e.kind === "UNDER_WEIGHTED").length,
    missingPhoneticsCount: errors.filter((e) => e.kind === "MISSING_PHONETICS").length,
    meanAbsoluteDeviation,
    worstDeviation,
    worstToken,
  };

  return {
    auditedAt: new Date().toISOString(),
    tokens: tokenEntries,
    errors,
    summary,
    deviationThreshold,
    diagnosticMode: "DIAGNOSE_ONLY",
  };
}

// ---------------------------------------------------------------------------
// Helpers for downstream consumers
// ---------------------------------------------------------------------------

/**
 * Filter a TokenWeightDiagnostic to only the most actionable errors,
 * sorted by deviation magnitude descending.
 *
 * Useful for log output or for feeding into the SCD64 remediation hint layer.
 */
export function topTokenWeightErrors(
  diagnostic: TokenWeightDiagnostic,
  limit = 10,
): TokenWeightError[] {
  return [...diagnostic.errors]
    .sort(
      (a, b) =>
        (b.deviationMagnitude ?? 0) - (a.deviationMagnitude ?? 0),
    )
    .slice(0, limit);
}

/**
 * Produce a compact human-readable report string from a diagnostic.
 * Safe to print to console or embed in a BytecodeHealth event body.
 */
export function formatTokenWeightReport(
  diagnostic: TokenWeightDiagnostic,
): string {
  const s = diagnostic.summary;
  const lines: string[] = [
    `TokenWeight Audit — ${diagnostic.auditedAt}`,
    `─────────────────────────────────────────`,
    `Tokens audited   : ${s.totalTokens}`,
    `Errors found     : ${s.errorCount}`,
    `  Over-weighted  : ${s.overWeightedCount}`,
    `  Under-weighted : ${s.underWeightedCount}`,
    `  Stop-word leak : ${s.stopWordLeakCount}`,
    `  Missing phon.  : ${s.missingPhoneticsCount}`,
    `Mean abs. dev.   : ${s.meanAbsoluteDeviation.toFixed(4)}`,
    `Worst deviation  : ${s.worstDeviation.toFixed(4)} ("${s.worstToken}")`,
    `Threshold        : ±${diagnostic.deviationThreshold}`,
    ``,
  ];

  if (diagnostic.errors.length === 0) {
    lines.push("✓ No token weight errors detected.");
  } else {
    lines.push("Top errors:");
    for (const err of topTokenWeightErrors(diagnostic, 5)) {
      lines.push(
        `  [${err.kind}] "${err.token}" — ${err.message.slice(0, 100)}`,
      );
      if (err.investigateIn) {
        lines.push(`    → investigate: ${err.investigateIn}`);
      }
    }
  }

  return lines.join("\n");
}

/**
 * Quick boolean check: does this document have token weight errors above the
 * threshold?  Suitable for use as a gate in the analysis pipeline.
 */
export function hasTokenWeightErrors(
  diagnostic: TokenWeightDiagnostic,
): boolean {
  return diagnostic.errors.length > 0;
}
