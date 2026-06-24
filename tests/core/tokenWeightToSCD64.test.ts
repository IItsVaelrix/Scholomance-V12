import { describe, it, expect } from "vitest";
import { auditTokenWeights } from "../../src/core/tokenization/tokenWeightError";
import { tokenWeightToSCD64 } from "../../src/core/tokenization/tokenWeightToSCD64";

/** Build an audit whose single token is scored far above its reference weight. */
function overWeightedAudit(rankerScore: number) {
  return auditTokenWeights({
    analyzedDocument: {
      allWords: [
        {
          text: "cat",
          normalized: "cat",
          isStopWord: false,
          isContentWord: true,
          syllableCount: 1,
          rarity: 0,
          phonetics: { phonemes: ["K", "AE", "T"] },
          lineNumber: 0,
        },
      ],
      parsed: { wordFrequency: { cat: 1 } },
    },
    rankedCandidates: [{ token: "cat", score: rankerScore }],
  });
}

describe("tokenWeightToSCD64 bridge", () => {
  it("mints a confirmed SCORE_DRIFT SCD64 from an OVER_WEIGHTED runtime error", () => {
    const diagnostic = overWeightedAudit(0.9);
    const error = diagnostic.errors.find((e) => e.kind === "OVER_WEIGHTED");
    expect(error).toBeDefined();

    const scd = tokenWeightToSCD64(error!, diagnostic);

    expect(scd).not.toBeNull();
    expect(scd!.bugFamily).toBe("SCORE_DRIFT");
    expect(scd!.checksum64.slice(0, 2)).toBe("05");
    expect(scd!.diagnosticMode).toBe("DIAGNOSE_ONLY");
    // Real runtime evidence is carried, not synthesized.
    expect(scd!.runtimeEvidence.frontend.rankerScore).toBe(0.9);
    expect(scd!.runtimeEvidence.comparison.deviation).toBeGreaterThan(0.25);
    expect(scd!.runtimeEvidence.backend.referenceWeight).toBe(error!.referenceWeight);
  });

  it("never emits a predicted (E-prefixed) checksum — runtime evidence is confirmed", () => {
    const diagnostic = overWeightedAudit(0.9);
    const error = diagnostic.errors.find((e) => e.kind === "OVER_WEIGHTED")!;
    const scd = tokenWeightToSCD64(error, diagnostic);
    expect(scd!.checksum64.slice(0, 1)).not.toBe("E");
  });

  it("refuses to mint without a ranker score (no evidence → no confirmed SCD64)", () => {
    const diagnostic = overWeightedAudit(0.9);
    const fabricated = {
      kind: "OVER_WEIGHTED" as const,
      token: "cat",
      message: "no ranker score present",
      referenceWeight: 0.5,
      rankerScore: undefined,
    };
    expect(tokenWeightToSCD64(fabricated, diagnostic)).toBeNull();
  });

  it("returns null for non-drift error kinds (follow-on families)", () => {
    // A content word with no phonetics yields MISSING_PHONETICS, not a drift kind.
    const diagnostic = auditTokenWeights({
      analyzedDocument: {
        allWords: [
          {
            text: "luminous",
            normalized: "luminous",
            isStopWord: false,
            isContentWord: true,
            syllableCount: 3,
            rarity: 0.4,
            phonetics: null,
            lineNumber: 0,
          },
        ],
        parsed: { wordFrequency: { luminous: 1 } },
      },
    });
    const missing = diagnostic.errors.find((e) => e.kind === "MISSING_PHONETICS");
    expect(missing).toBeDefined();
    expect(tokenWeightToSCD64(missing!, diagnostic)).toBeNull();
  });
});
