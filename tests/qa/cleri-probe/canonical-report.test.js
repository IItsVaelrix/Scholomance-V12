import { describe, expect, it } from "vitest";
import {
  stableClone,
  stableStringify,
  sha256Hex,
  fingerprintSubstrate,
  fingerprintConfiguration,
  buildFindingId,
  buildInvestigationReport,
  encodeCleriReportIdentity,
  verifyInvestigationReport
} from "../../../codex/core/immunity/cleri-probe/canonical-report.js";
import {
  createEvidence,
  createSourceSpan,
  createCoverage,
  createFinding
} from "../../../codex/core/immunity/cleri-probe/contracts.js";

describe("Cleri Probe canonical report identity", () => {
  const makeSpan = (overrides = {}) =>
    createSourceSpan({
      path: "src/combat.js",
      startLine: 10,
      startColumn: 5,
      endLine: 10,
      endColumn: 20,
      symbol: "rollDamage",
      excerptDigest: "sha256:abc",
      ...overrides
    });

  const makeEvidence = (predicateId, kind = "SUPPORTING", observed = true) =>
    createEvidence({
      evidenceId: `ev-${predicateId}`,
      kind,
      predicateId,
      observed,
      explanation: `${predicateId} observed`
    });

  const makeFinding = (overrides = {}) =>
    createFinding({
      pathologyClass: "UNSEEDED_RANDOMNESS",
      verdict: "VERIFIED",
      span: makeSpan(overrides.span),
      symbol: "rollDamage",
      summary: "Unseeded Math.random in deterministic combat logic",
      supportingEvidence: [makeEvidence("CALL_IS_MATH_RANDOM")],
      counterEvidenceChecked: [makeEvidence("NO_SEEDED_RNG_ADAPTER", "COUNTERCHECK", false)],
      verifier: { id: "unseeded-randomness/v1", version: "1.0.0" },
      lawRefs: ["VAELRIX-DETERMINISM-7"],
      raidRefs: ["RAID-2026-001"],
      verificationSteps: ["Replace Math.random with seeded RNG"],
      remediation: {
        recommendationId: "seeded-random",
        summary: "Use deterministic RNG",
        safePattern: "createSeededRng(seed).random()",
        unsafePattern: "Math.random()",
        verificationSteps: ["Run combat replay test"],
        autoFixAvailable: false
      },
      limitations: [],
      ...overrides
    });

  const makeReportInput = (overrides = {}) => ({
    hypothesis: "unseeded randomness in combat",
    normalizedHypothesis: "unseeded randomness in combat",
    scope: ["src"],
    plan: {
      pathologyClasses: ["UNSEEDED_RANDOMNESS"],
      requiredEvidence: ["CALL_IS_MATH_RANDOM"],
      counterEvidence: ["NO_SEEDED_RNG_ADAPTER"],
      requestedScopes: ["src"],
      selectedVerifiers: [{ id: "unseeded-randomness/v1", version: "1.0.0" }],
      unsupportedClauses: [],
      applicableLawRefs: ["VAELRIX-DETERMINISM-7"],
      retrievalHints: []
    },
    configuration: { profileId: "scholomance/default", version: "1.0.0" },
    substrateFiles: [{ path: "src/combat.js", contentHash: "sha256:abc" }],
    findings: [makeFinding()],
    coverage: createCoverage({
      requestedPaths: ["src"],
      analyzedPaths: ["src/combat.js"],
      skipped: [],
      parserFailures: [],
      complete: true
    }),
    diagnostics: [],
    ...overrides
  });

  it("stableStringify is deterministic across key order", () => {
    const a = stableStringify({ z: 1, a: [{ c: 1, b: 2 }] });
    const b = stableStringify({ a: [{ b: 2, c: 1 }], z: 1 });
    expect(a).toBe(b);
  });

  it("stableClone returns a recursively frozen deterministic clone", () => {
    const original = { z: 1, a: [{ c: 1, b: 2 }] };
    const clone = stableClone(original);
    expect(clone).toEqual({ a: [{ b: 2, c: 1 }], z: 1 });
    expect(Object.isFrozen(clone)).toBe(true);
    expect(Object.isFrozen(clone.a)).toBe(true);
    expect(Object.isFrozen(clone.a[0])).toBe(true);
  });

  it("sha256Hex produces a 64-character lowercase hex digest", () => {
    const hash = sha256Hex("scholomance");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).toBe(sha256Hex("scholomance"));
  });

  it("fingerprintSubstrate is independent of input file order", () => {
    const files = [
      { path: "b.js", contentHash: "sha256:bbb" },
      { path: "a.js", contentHash: "sha256:aaa" }
    ];
    const reversed = [...files].reverse();
    expect(fingerprintSubstrate(files)).toBe(fingerprintSubstrate(reversed));
    expect(fingerprintSubstrate(files)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("fingerprintConfiguration is deterministic across key order", () => {
    const a = fingerprintConfiguration({ z: 1, a: 2 });
    const b = fingerprintConfiguration({ a: 2, z: 1 });
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("buildFindingId is deterministic", () => {
    const f1 = makeFinding();
    const f2 = makeFinding();
    expect(buildFindingId(f1)).toBe(buildFindingId(f2));
  });

  it("buildInvestigationReport emits a SCHOL-CLERI-PROBE-v2 artifact", () => {
    const report = buildInvestigationReport(makeReportInput());

    expect(report.contract).toBe("SCHOL-CLERI-PROBE-v2");
    expect(report.schemaVersion).toBe("2.0.0");
    expect(report.reportId).toMatch(/^[0-9a-f]{64}$/);
    expect(report.substrateFingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(report.configurationFingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(report.checksum).toMatch(/^[0-9a-f]{64}$/);
    expect(report.bytecode).toMatch(
      /^PB-CLERI-v2-REPORT-[0-9a-f]{64}-[0-9a-f]{12}-[0-9a-f]{12}$/
    );
    expect(report.status).toBe("VERIFIED_FINDINGS");
  });

  it("sorts findings by path, line, column, pathologyClass, and findingId", () => {
    const findings = [
      makeFinding({ span: { path: "src/b.js", startLine: 5, startColumn: 1, endLine: 5, endColumn: 10, symbol: "b", excerptDigest: "sha256:b" } }),
      makeFinding({ span: { path: "src/a.js", startLine: 10, startColumn: 5, endLine: 10, endColumn: 20, symbol: "a", excerptDigest: "sha256:a" } }),
      makeFinding({ span: { path: "src/a.js", startLine: 10, startColumn: 1, endLine: 10, endColumn: 5, symbol: "a2", excerptDigest: "sha256:a2" } })
    ];
    const report = buildInvestigationReport(makeReportInput({ findings }));
    const paths = report.findings.map(f => f.span.path);
    const columns = report.findings.map(f => f.span.startColumn);
    expect(paths).toEqual(["src/a.js", "src/a.js", "src/b.js"]);
    expect(columns).toEqual([1, 5, 1]);
  });

  it("100 repeated builds serialize byte-identically", () => {
    const input = makeReportInput();
    const first = buildInvestigationReport(input);
    const canonical = stableStringify(first);

    for (let i = 0; i < 99; i++) {
      const next = buildInvestigationReport(input);
      expect(stableStringify(next)).toBe(canonical);
      expect(next.bytecode).toBe(first.bytecode);
      expect(next.checksum).toBe(first.checksum);
      expect(next.reportId).toBe(first.reportId);
    }
  });

  it("never exposes absolute repository roots in the canonical report", () => {
    const input = makeReportInput({
      scope: ["/home/deck/project/src"],
      substrateFiles: [{ path: "/home/deck/project/src/combat.js", contentHash: "sha256:abc" }]
    });
    const report = buildInvestigationReport(input);
    const canonical = stableStringify(report);
    expect(canonical).not.toContain("/home/");
    expect(canonical).not.toContain("C:\\");
  });

  it("verifyInvestigationReport passes for an untampered report", () => {
    const report = buildInvestigationReport(makeReportInput());
    const result = verifyInvestigationReport(report);
    expect(result.valid).toBe(true);
  });

  it("verifyInvestigationReport fails when an evidence predicate is changed", () => {
    const report = buildInvestigationReport(makeReportInput());
    const tampered = JSON.parse(stableStringify(report));
    tampered.findings[0].supportingEvidence[0].predicateId = "TAMPERED";
    const result = verifyInvestigationReport(tampered);
    expect(result.valid).toBe(false);
  });

  it("verifyInvestigationReport fails when the checksum is corrupted", () => {
    const report = buildInvestigationReport(makeReportInput());
    const tampered = JSON.parse(stableStringify(report));
    tampered.checksum = tampered.checksum.slice(0, -1) + "0";
    const result = verifyInvestigationReport(tampered);
    expect(result.valid).toBe(false);
  });

  it("verifyInvestigationReport fails when the bytecode is corrupted", () => {
    const report = buildInvestigationReport(makeReportInput());
    const tampered = JSON.parse(stableStringify(report));
    tampered.bytecode = tampered.bytecode.slice(0, -1) + "0";
    const result = verifyInvestigationReport(tampered);
    expect(result.valid).toBe(false);
  });

  it("encodeCleriReportIdentity derives identity from report fields", () => {
    const report = buildInvestigationReport(makeReportInput());
    const identity = encodeCleriReportIdentity(report);
    expect(identity).toBe(report.bytecode);
  });
});
