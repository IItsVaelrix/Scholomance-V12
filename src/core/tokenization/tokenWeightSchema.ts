/**
 * tokenWeightSchema.ts
 *
 * Shared schema and adapter contracts for token weighting across the
 * Scholomance pipeline.
 *
 * WHY THIS EXISTS (Emergent Disparity Reconciliation)
 * ─────────────────────────────────────────────────────
 * Three independent subsystems compute token weights:
 *
 *  1. analysis.pipeline.js  — `computeTokenWeight(word, tf, pos)`
 *     Computes document-level TF-IDF × syllable salience × positional weight.
 *     Operates on AnalyzedWord objects. Used by the ranker.
 *
 *  2. harkov.model.js       — `computeTokenWeight(token, context)`
 *     Computes syntax-role weights (content/function, line_end/line_start,
 *     primary/secondary stress, rhymePolicy). Operates on HHM tokens.
 *
 *  3. ritual-prediction/anchors.js  — `uniqueTokenEntries(entries)`
 *     Deduplicates and priority-sorts activation anchor tokens.
 *     Operates on arbitrary { token, weight } entries.
 *
 * These three functions are complementary, not competing. Each measures a
 * different dimension of a token's importance:
 *
 *   Dimension              | Source              | 0-1 range
 *   ───────────────────────┼─────────────────────┼──────────
 *   Document frequency     | analysis.pipeline   | yes
 *   Syntactic role         | harkov.model        | yes (clamped)
 *   Activation priority    | anchors             | yes (0.5 default)
 *
 * This file defines shared vocabulary so consumers can understand, pass, and
 * combine weights without reimplementing the logic.
 *
 * DIAGNOSE_ONLY guards:
 *   None. This is a pure schema/adapter module with no side effects.
 */

// ---------------------------------------------------------------------------
// Core weight dimensions (named constants)
// ---------------------------------------------------------------------------

/**
 * Named weight dimensions understood by the Scholomance pipeline.
 * Consumers should reference these keys rather than constructing strings.
 */
export const TOKEN_WEIGHT_DIMENSION = {
  /** Document-level TF-IDF × syllable salience × positional decay. */
  DOCUMENT: 'document',
  /** Syntactic role weight: content vs. function, line position, stress, rhyme policy. */
  SYNTACTIC: 'syntactic',
  /** Activation anchor weight: how much this token seeds a prediction window. */
  ACTIVATION: 'activation',
} as const;

export type TokenWeightDimension = typeof TOKEN_WEIGHT_DIMENSION[keyof typeof TOKEN_WEIGHT_DIMENSION];

// ---------------------------------------------------------------------------
// Canonical multi-dimensional weight record
// ---------------------------------------------------------------------------

/**
 * A token's weight across all three scoring dimensions.
 * Each field is in the 0-1 range. Missing dimensions default to null
 * (indicating the dimension was not computed, not that the weight is 0).
 */
export type MultiDimTokenWeight = {
  /** Normalized surface form of the token. */
  normalized: string;
  /** Document-level weight (from analysis.pipeline computeTokenWeight). */
  document: number | null;
  /** Syntactic role weight (from harkov.model computeTokenWeight). */
  syntactic: number | null;
  /** Activation anchor weight (from ritual-prediction/anchors). */
  activation: number | null;
};

/**
 * Combine a token's multi-dimensional weights into a single composite score.
 *
 * Mixing strategy:
 *   If all three are present:   0.5 × document + 0.35 × syntactic + 0.15 × activation
 *   If only two are present:    weights renormalized to sum to 1
 *   If only one is present:     that weight is returned directly
 *   If none:                    returns 0
 *
 * The document dimension is weighted highest because it captures TF-IDF,
 * which is the strongest predictor of whether a token carries meaningful
 * semantic load in the document.
 */
export function combineTokenWeights(weights: MultiDimTokenWeight): number {
  const { document: doc, syntactic: syn, activation: act } = weights;

  const hasDim = (v: number | null): v is number =>
    typeof v === 'number' && isFinite(v);

  const available = [
    hasDim(doc) ? { value: doc, base: 0.50 } : null,
    hasDim(syn) ? { value: syn, base: 0.35 } : null,
    hasDim(act) ? { value: act, base: 0.15 } : null,
  ].filter(Boolean) as { value: number; base: number }[];

  if (available.length === 0) return 0;
  if (available.length === 1) return Math.max(0, Math.min(1, available[0].value));

  // Renormalize base weights so they sum to 1.
  const totalBase = available.reduce((sum, d) => sum + d.base, 0);
  const combined = available.reduce(
    (sum, d) => sum + d.value * (d.base / totalBase),
    0,
  );
  return Math.max(0, Math.min(1, combined));
}

// ---------------------------------------------------------------------------
// Adapter: pipeline tokenWeights map → MultiDimTokenWeight[]
// ---------------------------------------------------------------------------

/**
 * Lift a flat `Record<string, number>` tokenWeights map (produced by
 * analysis.pipeline.js) into an array of MultiDimTokenWeight records.
 *
 * Useful when you need to feed pipeline weights into a subsystem that
 * expects multi-dimensional records.
 */
export function liftDocumentWeights(
  tokenWeights: Record<string, number>,
): MultiDimTokenWeight[] {
  return Object.entries(tokenWeights).map(([normalized, w]) => ({
    normalized,
    document: w,
    syntactic: null,
    activation: null,
  }));
}

/**
 * Collapse a MultiDimTokenWeight[] back into a flat Record<string, number>
 * using `combineTokenWeights` for each entry.
 *
 * This is the adapter for passing composite weights to the ranker's
 * `context.tokenWeights` field (which currently expects a flat map).
 */
export function collapseToFlatWeights(
  records: MultiDimTokenWeight[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const record of records) {
    if (record.normalized) {
      out[record.normalized] = combineTokenWeights(record);
    }
  }
  return out;
}
