export type SCD64HoverDecodeResponse = {
  valid: boolean;
  versionByte: string;
  bugFamily: string;
  slots: Array<{
    index: number;
    name: string;
    hex: string;
    meaning: string;
    categoryChecksum?: string;
  }>;
  // Typed as SCD64RemediationHint[] (not string[]) to match LOCAL_HINTS.
  remediationHints?: SCD64RemediationHint[];
};

export type SCD64RemediationHint = {
  kind: "BREAKPOINT" | "INSPECT" | "AVOID" | "TEST" | "TRACE" | "OWNER_NOTE";
  message: string;
  file?: string;
  symbol?: string;
  line?: number;
  confidence: number;
};

export type SCD64GlossaryEntry = {
  schema: "SCD64_GLOSSARY_ENTRY";
  schemaVersion: number;
  slotName: string;
  hexCode: string;
  canonicalDerivationString: string;
  jsonFormulaTemplate: unknown;
  categoryChecksum: string;
  remediationHints?: SCD64RemediationHint[];
};

export type SCD64MutationComparison = {
  matchingBlocks: number;
  differentBlocks: Array<string>;
  similarity: number;
  relationship: "IDENTICAL" | "MUTATION" | "RELATED_FAMILY" | "WEAK_NEIGHBOR" | "UNRELATED";
};

// ---------------------------------------------------------------------------
// Regression test generation
// ---------------------------------------------------------------------------

/**
 * The full diagnostic object that the regression generator consumes.
 * Mirrors the shape produced by SpatialImmuneOrchestrator so that a captured
 * diagnostic JSON can be piped straight in.
 */
export type SCD64RegressionInput = {
  diagnostic: {
    /** The canonical 64-char uppercase hex checksum. */
    checksum64: string;
    /** Human-readable bug family name, e.g. "COLOR_DRAGON". */
    bugFamily: string;
    /** Decoded slot array (from decodeSCD64Hover). */
    slots: Array<{
      index: number;
      name: string;
      hex: string;
      meaning: string;
      categoryChecksum?: string;
    }>;
    /** Runtime evidence captured at the moment the diagnostic fired. */
    runtimeEvidence: {
      backend?: Record<string, unknown>;
      frontend?: Record<string, unknown>;
      comparison?: Record<string, unknown>;
    };
    /** Optional equation/formula objects stored in the diagnostic body. */
    equations?: unknown[];
  };
  /**
   * Optional override for the test description.
   * Defaults to the bug family name if omitted.
   */
  testName?: string;
};

/**
 * The artefact produced by generateSCD64RegressionTest.
 */
export type SCD64GeneratedTest = {
  /** Relative path (from project root) where the file should be written. */
  relativePath: string;
  /** TypeScript source of the generated Vitest regression test. */
  source: string;
  /** The checksum that the test asserts. */
  checksum64: string;
  /** The bug family the test covers. */
  bugFamily: string;
};

// ---------------------------------------------------------------------------
// Circuit breaker
// ---------------------------------------------------------------------------

export type SCD64CircuitBreakerState = {
  active: boolean;
  reason: string;
  checksum64: string;
  affectedFeature: "TRUESIGHT_COLORING" | "TRUESIGHT_RESONANCE_OVERLAY";
  userMessage: string;
  diagnosticMode: "DIAGNOSE_ONLY";
};

// ---------------------------------------------------------------------------
// Document-level SCD64 record (Disparity bridge)
// ---------------------------------------------------------------------------

/**
 * Shape of the `scd64Full` field expected by LexicalScrollEditor on the
 * `analyzedDocument` prop.
 *
 * CURRENT STATUS: This field is checked by LexicalScrollEditor but is never
 * populated by the analysis pipeline or synthesizeVerse. The guard at
 * LexicalScrollEditor:487 (`if (!analyzedDocument?.scd64Full) return false`)
 * always short-circuits, making the circuit breaker permanently inactive.
 *
 * RESOLUTION PATH:
 *   1. The SpatialImmuneOrchestrator or the combat scoring pipeline should
 *      emit a `scd64Full` object when a known-fatal checksum is encountered.
 *   2. That object should be attached to `analyzedDoc` before it reaches
 *      LexicalScrollEditor.
 *   3. Until then, this type documents the expected contract so that future
 *      implementations produce a shape the consumer understands.
 */
export type SCD64FullRecord = {
  /** The canonical 64-char uppercase hex checksum. */
  checksum64: string;
  /** Human-readable bug family name, e.g. "COLOR_DRAGON". */
  bugFamily: string;
  /** Optional severity level to pass to evaluateSCD64CircuitBreaker. */
  severity?: "FATAL_PRESENTATION_DESYNC" | "DEGRADED" | "WARNING";
};

