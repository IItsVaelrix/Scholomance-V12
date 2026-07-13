import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildFindingFeedback,
  buildGraduationProposal,
  GRADUATION_PROPOSAL_CONTRACT
} from "../../../codex/core/immunity/cleri-probe/graduation-proposal.js";
import { buildInvestigationReport } from "../../../codex/core/immunity/cleri-probe/canonical-report.js";
import { createEvidence, createFinding } from "../../../codex/core/immunity/cleri-probe/contracts.js";

const SPAN = {
  path: "src/game/combat/damage.js",
  startLine: 5,
  startColumn: 16,
  endLine: 5,
  endColumn: 29,
  symbol: "calculateDamage",
  excerptDigest: "a".repeat(64)
};

function makeReport() {
  const finding = createFinding({
    pathologyClass: "UNSEEDED_RANDOMNESS",
    verdict: "VERIFIED",
    span: SPAN,
    symbol: "calculateDamage",
    summary: "Math.random() decides the outcome of calculateDamage",
    supportingEvidence: [
      createEvidence({
        kind: "SUPPORTING",
        predicateId: "CALL_IS_MATH_RANDOM",
        observed: true,
        span: SPAN,
        explanation: "The call resolves to Math.random()"
      }),
      createEvidence({
        kind: "SUPPORTING",
        predicateId: "SYMBOL_IS_DETERMINISTIC_AUTHORITY",
        observed: true,
        span: SPAN,
        explanation: "calculateDamage is deterministic authority"
      })
    ],
    counterEvidenceChecked: [
      createEvidence({
        kind: "COUNTERCHECK",
        predicateId: "NO_SEEDED_RNG_ADAPTER",
        observed: false,
        span: SPAN,
        explanation: "The module imports no seeded RNG adapter"
      })
    ],
    verifier: { id: "unseeded-randomness/v1", version: "1.0.0" },
    remediation: {
      recommendationId: "repair.math-random.seeded",
      summary: "Use a seeded RNG",
      safePattern: "rng.next()",
      unsafePattern: "Math.random()",
      verificationSteps: ["npm run test:qa"],
      autoFixAvailable: false
    }
  });

  return buildInvestigationReport({
    hypothesis: "unseeded random in combat damage",
    normalizedHypothesis: "unseeded random in combat damage",
    scope: ["src/game/combat"],
    plan: { profileId: "scholomance/default", version: "1.0.0" },
    configuration: { includeTests: false },
    substrateFiles: [{ path: "src/game/combat/damage.js", contentHash: "abc" }],
    findings: [finding],
    coverage: {
      requestedPaths: ["src/game/combat"],
      analyzedPaths: ["src/game/combat/damage.js"],
      complete: true
    },
    diagnostics: []
  });
}

const CLEAN_BENCHMARK = Object.freeze({
  before: { precision: 1, recall: 1, truePositives: 2, falsePositives: 0 },
  candidate: { precision: 1, recall: 1, truePositives: 3, falsePositives: 0 }
});

function confirmFeedback(report) {
  return buildFindingFeedback({
    report,
    findingId: report.findings[0].findingId,
    decision: "CONFIRM",
    rationale: "Confirmed by review: combat damage must be reproducible from the encounter seed."
  });
}

describe("finding feedback", () => {
  it("records a human decision with a checksum", () => {
    const report = makeReport();
    const feedback = confirmFeedback(report);

    expect(feedback.sourceReportId).toBe(report.reportId);
    expect(feedback.findingId).toBe(report.findings[0].findingId);
    expect(feedback.decision).toBe("CONFIRM");
    expect(feedback.proposedBy).toBe("human");
    expect(feedback.checksum).toMatch(/^[0-9a-f]{64}$/);
  });

  it("rejects a missing decision", () => {
    const report = makeReport();
    expect(() => buildFindingFeedback({
      report,
      findingId: report.findings[0].findingId,
      rationale: "looks right"
    })).toThrow(/decision/i);
  });

  it("rejects a decision that is neither CONFIRM nor REJECT", () => {
    const report = makeReport();
    expect(() => buildFindingFeedback({
      report,
      findingId: report.findings[0].findingId,
      decision: "MAYBE",
      rationale: "unsure"
    })).toThrow(/decision/i);
  });

  it("rejects missing human rationale", () => {
    const report = makeReport();
    expect(() => buildFindingFeedback({
      report,
      findingId: report.findings[0].findingId,
      decision: "CONFIRM",
      rationale: "   "
    })).toThrow(/rationale/i);
  });

  it("rejects an unknown finding", () => {
    const report = makeReport();
    expect(() => buildFindingFeedback({
      report,
      findingId: "not-a-finding",
      decision: "CONFIRM",
      rationale: "confirmed"
    })).toThrow(/finding/i);
  });

  it("rejects a tampered report", () => {
    const report = makeReport();
    const tampered = { ...report, hypothesis: "something else" };

    expect(() => buildFindingFeedback({
      report: tampered,
      findingId: report.findings[0].findingId,
      decision: "CONFIRM",
      rationale: "confirmed"
    })).toThrow(/checksum|tamper/i);
  });

  it("cannot be attributed to anything but a human", () => {
    const report = makeReport();
    const feedback = buildFindingFeedback({
      report,
      findingId: report.findings[0].findingId,
      decision: "CONFIRM",
      rationale: "confirmed by review",
      proposedBy: "agent"
    });
    expect(feedback.proposedBy).toBe("human");
  });
});

describe("graduation proposal", () => {
  it("builds a reviewable proposal from confirmed feedback", () => {
    const report = makeReport();
    const proposal = buildGraduationProposal({
      report,
      feedback: confirmFeedback(report),
      benchmark: CLEAN_BENCHMARK
    });

    expect(proposal.contract).toBe(GRADUATION_PROPOSAL_CONTRACT);
    expect(proposal.sourceReportId).toBe(report.reportId);
    expect(proposal.findingId).toBe(report.findings[0].findingId);
    expect(proposal.pathologyClass).toBe("UNSEEDED_RANDOMNESS");
    expect(proposal.verifier).toEqual({ id: "unseeded-randomness/v1", version: "1.0.0" });
    expect(proposal.remediationId).toBe("repair.math-random.seeded");
    expect(proposal.evidenceDigest).toMatch(/^[0-9a-f]{64}$/);
    expect(proposal.proposedBy).toBe("human");
    expect(proposal.approved).toBe(false);
    expect(proposal.checksum).toMatch(/^[0-9a-f]{64}$/);
  });

  it("previews a pattern that is evidence-linked and reproducible from the report", () => {
    const report = makeReport();
    const proposal = buildGraduationProposal({
      report,
      feedback: confirmFeedback(report),
      benchmark: CLEAN_BENCHMARK
    });

    expect(proposal.patternPreview).toContain("UNSEEDED_RANDOMNESS");
    expect(proposal.patternPreview).toContain("CALL_IS_MATH_RANDOM");
    expect(proposal.patternPreview).toContain("NO_SEEDED_RNG_ADAPTER");
    expect(proposal.patternPreview).toContain("calculateDamage");
  });

  it("carries both benchmarks so a reviewer can see the retrieval impact", () => {
    const report = makeReport();
    const proposal = buildGraduationProposal({
      report,
      feedback: confirmFeedback(report),
      benchmark: CLEAN_BENCHMARK
    });

    expect(proposal.beforeBenchmark.precision).toBe(1);
    expect(proposal.candidateBenchmark.truePositives).toBe(3);
  });

  it("blocks a proposal whose candidate benchmark regresses precision", () => {
    const report = makeReport();
    expect(() => buildGraduationProposal({
      report,
      feedback: confirmFeedback(report),
      benchmark: {
        before: { precision: 1, recall: 1, truePositives: 2, falsePositives: 0 },
        candidate: { precision: 0.8, recall: 1, truePositives: 3, falsePositives: 1 }
      }
    })).toThrow(/regress/i);
  });

  it("blocks a proposal whose candidate benchmark regresses recall", () => {
    const report = makeReport();
    expect(() => buildGraduationProposal({
      report,
      feedback: confirmFeedback(report),
      benchmark: {
        before: { precision: 1, recall: 1, truePositives: 2, falsePositives: 0 },
        candidate: { precision: 1, recall: 0.5, truePositives: 1, falsePositives: 0 }
      }
    })).toThrow(/regress/i);
  });

  it("refuses to graduate rejected feedback", () => {
    const report = makeReport();
    const rejection = buildFindingFeedback({
      report,
      findingId: report.findings[0].findingId,
      decision: "REJECT",
      rationale: "False positive: this path is cosmetic."
    });

    expect(() => buildGraduationProposal({
      report,
      feedback: rejection,
      benchmark: CLEAN_BENCHMARK
    })).toThrow(/CONFIRM/);
  });

  it("refuses feedback whose checksum does not match its contents", () => {
    const report = makeReport();
    const feedback = { ...confirmFeedback(report), rationale: "rewritten after the fact" };

    expect(() => buildGraduationProposal({
      report,
      feedback,
      benchmark: CLEAN_BENCHMARK
    })).toThrow(/checksum|tamper/i);
  });

  it("requires a benchmark", () => {
    const report = makeReport();
    expect(() => buildGraduationProposal({
      report,
      feedback: confirmFeedback(report)
    })).toThrow(/benchmark/i);
  });

  it("returns data and has no authority to persist it", () => {
    const report = makeReport();
    const proposal = buildGraduationProposal({
      report,
      feedback: confirmFeedback(report),
      benchmark: CLEAN_BENCHMARK
    });

    expect(Object.isFrozen(proposal)).toBe(true);
    expect(proposal.approved).toBe(false);

    // The module cannot write, and cannot reach RAID: it imports neither.
    const source = fsReadModule();
    expect(source).not.toMatch(/node:fs|require\(['"]fs|raid_feedback|raid_learning|raid_merlin_ingest|transaction_patch/);
  });
});

/** Reads the proposal module's own source, to prove what it cannot reach. */
function fsReadModule() {
  const dir = path.dirname(fileURLToPath(import.meta.url));
  return fs.readFileSync(
    path.resolve(dir, "../../../codex/core/immunity/cleri-probe/graduation-proposal.js"),
    "utf8"
  );
}
