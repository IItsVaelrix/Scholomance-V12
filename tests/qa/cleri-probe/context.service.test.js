import { describe, expect, it } from "vitest";
import { createContextService } from "../../../codex/services/cleri-probe/context.service.js";
import { getRemediation, VERIFICATION_COMMANDS } from "../../../codex/core/immunity/cleri-probe/remediation.js";
import { createEvidence, createFinding } from "../../../codex/core/immunity/cleri-probe/contracts.js";

function makeFinding(overrides = {}) {
  const span = {
    path: "src/game/combat/damage.js",
    startLine: 5,
    startColumn: 16,
    endLine: 5,
    endColumn: 29,
    symbol: "calculateDamage",
    excerptDigest: null
  };

  return createFinding({
    findingId: "finding-1",
    pathologyClass: "UNSEEDED_RANDOMNESS",
    verdict: "VERIFIED",
    span,
    symbol: "calculateDamage",
    summary: "Math.random() decides the outcome of calculateDamage",
    supportingEvidence: [
      createEvidence({
        kind: "SUPPORTING",
        predicateId: "CALL_IS_MATH_RANDOM",
        observed: true,
        span,
        explanation: "The call resolves to Math.random()"
      })
    ],
    counterEvidenceChecked: [
      createEvidence({
        kind: "COUNTERCHECK",
        predicateId: "NO_SEEDED_RNG_ADAPTER",
        observed: false,
        span,
        explanation: "The module imports no seeded RNG adapter"
      })
    ],
    verifier: { id: "unseeded-randomness/v1", version: "1.0.0" },
    ...overrides
  });
}

describe("remediation lookup", () => {
  it("maps a pathology class to an existing repair recommendation", () => {
    const remediation = getRemediation("UNSEEDED_RANDOMNESS");
    expect(remediation.recommendationId).toBe("repair.math-random.seeded");
    expect(remediation.summary).toContain("seeded");
    expect(remediation.autoFixAvailable).toBe(false);
    expect(remediation.safePattern).toBeTruthy();
    expect(remediation.unsafePattern).toBeTruthy();
  });

  it("returns a canonical remediation for every registered pathology class", () => {
    for (const pathologyClass of [
      "CONCURRENT_SHARED_STATE_MUTATION",
      "LEAKED_LISTENER_SUBSCRIPTION",
      "SWALLOWED_ERROR",
      "UNSAFE_EXTERNAL_RESPONSE_ACCESS",
      "UNSEEDED_RANDOMNESS"
    ]) {
      const remediation = getRemediation(pathologyClass);
      expect(remediation.recommendationId).toBeTruthy();
      expect(remediation.verificationSteps.length).toBeGreaterThan(0);
      expect(remediation.autoFixAvailable).toBe(false);
    }
  });

  it("selects verification steps only from the allow-listed command catalog", () => {
    const remediation = getRemediation("UNSEEDED_RANDOMNESS");
    for (const step of remediation.verificationSteps) {
      expect(VERIFICATION_COMMANDS).toContain(step);
    }
  });

  it("never emits a shell fragment carried in report content", () => {
    const remediation = getRemediation("UNSEEDED_RANDOMNESS; rm -rf /");
    expect(remediation.recommendationId).toBe("repair.unknown");
    for (const step of remediation.verificationSteps) {
      expect(VERIFICATION_COMMANDS).toContain(step);
    }
  });
});

describe("context service", () => {
  it("adds law refs, RAID refs, ownership, and remediation without changing the verdict", () => {
    const service = createContextService({
      raidAdapter: {
        query: () => [
          { id: "raid-2", summary: "similar leak" },
          { id: "raid-1", summary: "older leak" }
        ]
      }
    });

    const enriched = service.enrichFindings([makeFinding()]);

    expect(enriched.diagnostics).toEqual([]);
    const finding = enriched.findings[0];
    expect(finding.verdict).toBe("VERIFIED");
    expect(finding.lawRefs.length).toBeGreaterThan(0);
    expect(finding.lawRefs).toEqual([...finding.lawRefs].sort());
    expect(finding.raidRefs).toEqual(["raid-1", "raid-2"]);
    expect(finding.remediation.recommendationId).toBe("repair.math-random.seeded");
    expect(finding.ownership).toBe("game");
  });

  it("cites the innate immune rule that already governs the pathology", () => {
    const service = createContextService({});
    const finding = service.enrichFindings([makeFinding()]).findings[0];
    expect(finding.lawRefs).toContain("QUANT-0101");
  });

  it("records the owning boundary for the finding path", () => {
    const service = createContextService({});
    const findings = service.enrichFindings([
      makeFinding(),
      makeFinding({
        findingId: "finding-2",
        span: {
          path: "codex/core/immunity/prion-detector.engine.js",
          startLine: 1,
          startColumn: 1,
          endLine: 1,
          endColumn: 2,
          symbol: null,
          excerptDigest: null
        }
      })
    ]).findings;

    expect(findings.map(finding => finding.ownership)).toEqual(["game", "codex"]);
  });

  it("bounds the number of references it attaches", () => {
    const service = createContextService({
      limits: { maxRaidRefs: 2 },
      raidAdapter: {
        query: () => Array.from({ length: 50 }, (_, index) => ({ id: `raid-${index}` }))
      }
    });
    const finding = service.enrichFindings([makeFinding()]).findings[0];
    expect(finding.raidRefs.length).toBe(2);
  });

  it("preserves the canonical finding and records a diagnostic when an adapter fails", () => {
    const service = createContextService({
      raidAdapter: {
        query: () => {
          throw new Error("RAID unavailable");
        }
      }
    });

    const enriched = service.enrichFindings([makeFinding()]);

    expect(enriched.findings[0].verdict).toBe("VERIFIED");
    expect(enriched.findings[0].supportingEvidence.length).toBe(1);
    expect(enriched.findings[0].raidRefs).toEqual([]);
    expect(enriched.diagnostics.length).toBe(1);
    expect(enriched.diagnostics[0]).toMatch(/^PB-ERR-v1-/);
  });

  it("never lets RAID similarity become supporting evidence", () => {
    const service = createContextService({
      raidAdapter: { query: () => [{ id: "raid-1", score: 0.99 }] }
    });
    const finding = service.enrichFindings([makeFinding()]).findings[0];
    const predicates = finding.supportingEvidence.map(evidence => evidence.predicateId);
    expect(predicates).toEqual(["CALL_IS_MATH_RANDOM"]);
    expect(JSON.stringify(finding)).not.toContain("0.99");
  });
});
