import { describe, expect, it } from "vitest";
import {
  EVIDENCE_KINDS,
  REPORT_STATUSES,
  createEvidence,
  createSourceSpan,
  createCoverage,
  createFinding,
  deriveReportStatus,
  normalizeRepositoryPath
} from "../../../codex/core/immunity/cleri-probe/contracts.js";

describe("Cleri Probe contracts", () => {
  it("normalizes repository-relative paths", () => {
    expect(normalizeRepositoryPath("./src\\probe.js")).toBe("src/probe.js");
    expect(normalizeRepositoryPath("src//deep/file.js")).toBe("src/deep/file.js");
    expect(normalizeRepositoryPath("./src/probe.js/")).toBe("src/probe.js");
  });

  it("normalizes one-based inclusive spans and freezes them", () => {
    const span = createSourceSpan({
      path: "./src\\probe.js",
      startLine: 2,
      startColumn: 3,
      endLine: 2,
      endColumn: 11,
      symbol: "probe",
      excerptDigest: "sha256:abc"
    });
    expect(span.path).toBe("src/probe.js");
    expect(Object.isFrozen(span)).toBe(true);
  });

  it("rejects inverted or zero-based spans", () => {
    expect(() => createSourceSpan({
      path: "a.js",
      startLine: 0,
      startColumn: 1,
      endLine: 1,
      endColumn: 1,
      symbol: null,
      excerptDigest: "sha256:x"
    })).toThrow(/one-based/);

    expect(() => createSourceSpan({
      path: "a.js",
      startLine: 2,
      startColumn: 5,
      endLine: 2,
      endColumn: 3,
      symbol: null,
      excerptDigest: "sha256:x"
    })).toThrow(/one-based|inverted|span/);
  });

  it("derives honest terminal statuses", () => {
    expect(deriveReportStatus({ findings: [], coverageComplete: true }))
      .toBe(REPORT_STATUSES.NO_VERIFIED_FINDINGS);
    expect(deriveReportStatus({ findings: [{}], coverageComplete: true }))
      .toBe(REPORT_STATUSES.VERIFIED_FINDINGS);
  });

  it("flags partial coverage and parser failures", () => {
    expect(deriveReportStatus({ findings: [], coverageComplete: false }))
      .toBe(REPORT_STATUSES.PARTIAL);
    expect(deriveReportStatus({ findings: [], coverageComplete: true, parserFailures: [{}] }))
      .toBe(REPORT_STATUSES.PARTIAL);
  });

  it("marks failed investigations", () => {
    expect(deriveReportStatus({ findings: [], coverageComplete: true, failed: true }))
      .toBe(REPORT_STATUSES.FAILED);
  });

  it("accepts only the four evidence kinds", () => {
    expect(EVIDENCE_KINDS).toEqual([
      "SUPPORTING", "COUNTERCHECK", "LIMITATION", "COVERAGE"
    ]);
    expect(() => createEvidence({ kind: "SCORE" })).toThrow(/evidence kind/);
  });

  it("creates frozen evidence with required fields", () => {
    const evidence = createEvidence({
      evidenceId: "ev-1",
      kind: "SUPPORTING",
      predicateId: "CALL_IS_MATH_RANDOM",
      observed: true,
      explanation: "Math.random() invoked"
    });
    expect(evidence.kind).toBe("SUPPORTING");
    expect(evidence.observed).toBe(true);
    expect(Object.isFrozen(evidence)).toBe(true);
  });

  it("creates frozen coverage with sorted paths", () => {
    const coverage = createCoverage({
      requestedPaths: ["b", "a"],
      analyzedPaths: ["c", "a"],
      skipped: [{ path: "x", reasonCode: "EXCLUDED" }],
      parserFailures: [],
      complete: true
    });
    expect(coverage.requestedPaths).toEqual(["a", "b"]);
    expect(coverage.analyzedPaths).toEqual(["a", "c"]);
    expect(Object.isFrozen(coverage)).toBe(true);
  });

  it("rejects findings with verdicts other than VERIFIED", () => {
    expect(() => createFinding({
      verdict: "NO_FINDING",
      supportingEvidence: [createEvidence({ kind: "SUPPORTING", predicateId: "P", observed: true })],
      counterEvidenceChecked: []
    })).toThrow(/verdict/);
  });

  it("rejects findings with empty supporting evidence", () => {
    expect(() => createFinding({
      verdict: "VERIFIED",
      supportingEvidence: [],
      counterEvidenceChecked: []
    })).toThrow(/supportingEvidence|supporting evidence/);
  });

  it("rejects findings missing counterEvidenceChecked", () => {
    expect(() => createFinding({
      verdict: "VERIFIED",
      supportingEvidence: [createEvidence({ kind: "SUPPORTING", predicateId: "P", observed: true })]
    })).toThrow(/counterEvidenceChecked|counter/);
  });

  it("rejects findings with unsorted lawRefs or raidRefs", () => {
    const supporting = [createEvidence({ kind: "SUPPORTING", predicateId: "P", observed: true })];
    expect(() => createFinding({
      verdict: "VERIFIED",
      supportingEvidence: supporting,
      counterEvidenceChecked: [],
      lawRefs: ["B", "A"]
    })).toThrow(/lawRefs|sorted/);

    expect(() => createFinding({
      verdict: "VERIFIED",
      supportingEvidence: supporting,
      counterEvidenceChecked: [],
      raidRefs: ["Z", "A"]
    })).toThrow(/raidRefs|sorted/);
  });

  it("creates a frozen finding", () => {
    const finding = createFinding({
      verdict: "VERIFIED",
      supportingEvidence: [createEvidence({ kind: "SUPPORTING", predicateId: "P", observed: true })],
      counterEvidenceChecked: []
    });
    expect(finding.verdict).toBe("VERIFIED");
    expect(Object.isFrozen(finding)).toBe(true);
  });
});
