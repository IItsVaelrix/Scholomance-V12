/**
 * tokenWeightToSCD64.ts
 *
 * Bridge: turns a confirmed token-weight runtime anomaly into a canonical
 * confirmed SCD64 diagnostic (family SCORE_DRIFT, version byte 05).
 *
 * WHY THIS IS A SEPARATE MODULE
 * ─────────────────────────────
 * tokenWeightError.ts is pure, dependency-free, and DIAGNOSE_ONLY. It must stay
 * that way. This bridge is the single seam that knows BOTH vocabularies — the
 * audit tool's TokenWeightError and the SCD64 system — so either side can change
 * without touching the other.
 *
 * CONFIRMED, NOT PREDICTED
 * ────────────────────────
 * tokenWeightError runs at runtime against a real analyzed document and a real
 * ranked list. Its findings are therefore *runtime evidence*, which mints a
 * CONFIRMED SCD64 (version byte 05), never an `E`-prefixed prediction. The
 * predicted path belongs to the static IntelliSense matcher, not here.
 *
 * The bridge mints ONLY when there is real ranker evidence:
 *   - the error is a drift kind (OVER_WEIGHTED / UNDER_WEIGHTED), and
 *   - a ranker score is present (the token was actually scored).
 * Anything else returns null — a hypothesis is not a confirmed diagnostic.
 *
 * The three non-drift kinds (STOP_WORD_SCORED, MISSING_PHONETICS,
 * SYLLABLE_MISMATCH) are the documented follow-on SCORING families; the bridge
 * returns null for them until those families are authored.
 */

// @ts-ignore — JS module, no type declarations.
import { generateSCD64ForFamily } from "../../../codex/core/immunity/spatial-immune-orchestrator.js";
import type { TokenWeightError, TokenWeightDiagnostic } from "./tokenWeightError";

/** The canonical confirmed-diagnostic record produced by the orchestrator. */
export type SCD64Diagnostic = {
  schema: "SCD64_DIAGNOSTIC";
  domain: string;
  bugFamily: string;
  diagnosticMode: "DIAGNOSE_ONLY";
  checksum64: string;
  slots: Array<{ index: number; name: string; hex: string }>;
  runtimeEvidence: {
    backend: Record<string, unknown>;
    frontend: Record<string, unknown>;
    comparison: Record<string, unknown>;
  };
  [key: string]: unknown;
};

const DRIFT_KINDS: ReadonlySet<TokenWeightError["kind"]> = new Set([
  "OVER_WEIGHTED",
  "UNDER_WEIGHTED",
]);

/**
 * Convert a single token-weight error into a confirmed SCORE_DRIFT SCD64
 * diagnostic, or null if the error is not confirmed-eligible.
 *
 * @param error      One TokenWeightError from a TokenWeightDiagnostic.
 * @param diagnostic The full diagnostic it came from (for the matching token
 *                   entry and the document-level deviation summary).
 */
export function tokenWeightToSCD64(
  error: TokenWeightError,
  diagnostic: TokenWeightDiagnostic,
): SCD64Diagnostic | null {
  if (!DRIFT_KINDS.has(error.kind)) return null;
  if (typeof error.rankerScore !== "number") return null;

  const entry = diagnostic.tokens.find((t) => t.token === error.token);

  const runtimeEvidence = {
    backend: {
      source: "reference-weight-formula",
      referenceWeight: error.referenceWeight,
      idfProxy: entry?.idfProxy,
      syllableCount: entry?.syllableCount,
      termFrequency: entry?.termFrequency,
    },
    frontend: {
      source: "ranker",
      rankerScore: error.rankerScore,
    },
    comparison: {
      deviation: entry?.deviation,
      deviationThreshold: diagnostic.deviationThreshold,
      meanAbsoluteDeviation: diagnostic.summary.meanAbsoluteDeviation,
      worstToken: diagnostic.summary.worstToken,
      worstDeviation: diagnostic.summary.worstDeviation,
    },
  };

  const collapseVerdict =
    error.kind === "OVER_WEIGHTED"
      ? "SCORE_DRIFT_OVER_WEIGHTED"
      : "SCORE_DRIFT_UNDER_WEIGHTED";

  const deviationMagnitude =
    error.deviationMagnitude ?? Math.abs(entry?.deviation ?? 0);

  return generateSCD64ForFamily(
    "SCORE_DRIFT",
    {
      completed: true,
      queryId: `tokenweight:${error.token}`,
      verdictText: error.message,
    },
    {
      collapseVerdict,
      energyAtMismatch: deviationMagnitude,
      gradientMagnitude: deviationMagnitude,
    },
    { runtimeEvidence },
  ) as SCD64Diagnostic;
}

/**
 * Map every confirmed-eligible error in a diagnostic to its SCD64 diagnostic,
 * skipping the rest. Convenience for an integration call site.
 */
export function tokenWeightDiagnosticToSCD64(
  diagnostic: TokenWeightDiagnostic,
): SCD64Diagnostic[] {
  const out: SCD64Diagnostic[] = [];
  for (const error of diagnostic.errors) {
    const scd = tokenWeightToSCD64(error, diagnostic);
    if (scd) out.push(scd);
  }
  return out;
}
