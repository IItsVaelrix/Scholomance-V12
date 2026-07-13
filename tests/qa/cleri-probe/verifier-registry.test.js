import { describe, expect, it } from "vitest";
import {
  createVerifierRegistry,
  registerVerifier,
  selectVerifiers,
  validateVerifierResult
} from "../../../codex/core/immunity/cleri-probe/verifier-registry.js";
import { createEvidence } from "../../../codex/core/immunity/cleri-probe/contracts.js";

function makeVerifier(overrides = {}) {
  return {
    id: "listener-lifecycle/v1",
    pathologyClass: "LEAKED_LISTENER_SUBSCRIPTION",
    version: "1.0.0",
    retrieveHints(plan) {
      return [`hint:${plan.profileId}`];
    },
    verify(_candidate, _context) {
      return {
        verdict: "NO_FINDING",
        evidence: []
      };
    },
    ...overrides
  };
}

describe("createVerifierRegistry", () => {
  it("returns an empty frozen registry", () => {
    const registry = createVerifierRegistry();
    expect(registry.verifiers).toBeInstanceOf(Map);
    expect(registry.verifiers.size).toBe(0);
    expect(Object.isFrozen(registry)).toBe(true);
  });
});

describe("registerVerifier", () => {
  it("registers a valid verifier and returns a new registry", () => {
    const registry = createVerifierRegistry();
    const next = registerVerifier(registry, makeVerifier());
    expect(next).not.toBe(registry);
    expect(next.verifiers.size).toBe(1);
    expect(next.verifiers.get("listener-lifecycle/v1").id).toBe("listener-lifecycle/v1");
  });

  it("rejects duplicate ids", () => {
    const registry = registerVerifier(createVerifierRegistry(), makeVerifier());
    expect(() => registerVerifier(registry, makeVerifier())).toThrow(/Duplicate verifier id/);
  });

  it("rejects duplicate class/version pairs", () => {
    const registry = registerVerifier(createVerifierRegistry(), makeVerifier());
    const duplicateClassVersion = makeVerifier({ id: "listener-lifecycle/v2" });
    expect(() => registerVerifier(registry, duplicateClassVersion)).toThrow(/duplicate class.version|class\/version/);
  });

  it("rejects mutable metadata", () => {
    const verifier = makeVerifier();
    verifier.metadata = { mutable: true };
    expect(() => registerVerifier(createVerifierRegistry(), verifier)).toThrow(/deeply frozen object|metadata/);
  });

  it("rejects null metadata", () => {
    const verifier = makeVerifier();
    verifier.metadata = null;
    expect(() => registerVerifier(createVerifierRegistry(), verifier)).toThrow(/deeply frozen object|metadata/);
  });

  it("rejects primitive metadata", () => {
    const verifier = makeVerifier();
    verifier.metadata = 42;
    expect(() => registerVerifier(createVerifierRegistry(), verifier)).toThrow(/deeply frozen object|metadata/);
  });

  it("rejects async core verifiers", () => {
    const verifier = makeVerifier({
      verify: async () => ({ verdict: "NO_FINDING", evidence: [] })
    });
    expect(() => registerVerifier(createVerifierRegistry(), verifier)).toThrow(/async|synchronous/);
  });

  it("rejects malformed evidence in a sample result", () => {
    const verifier = makeVerifier({
      verify: () => ({
        verdict: "VERIFIED",
        evidence: [{ kind: "SCORE", observed: true }]
      })
    });
    expect(() => registerVerifier(createVerifierRegistry(), verifier)).toThrow(/evidence kind|malformed evidence/);
  });

  it("rejects a verifier result with an invalid verdict", () => {
    const verifier = makeVerifier({
      verify: () => ({ verdict: "LIKELY", evidence: [] })
    });
    expect(() => registerVerifier(createVerifierRegistry(), verifier)).toThrow(/verdict/);
  });

  it("freezes the registered verifier", () => {
    const registry = registerVerifier(createVerifierRegistry(), makeVerifier());
    const verifier = registry.verifiers.get("listener-lifecycle/v1");
    expect(Object.isFrozen(verifier)).toBe(true);
  });

  it("rejects a verifier with non-deterministic output", () => {
    let counter = 0;
    const verifier = makeVerifier({
      verify: () => ({ verdict: "NO_FINDING", evidence: [], counter: counter++ })
    });
    expect(() => registerVerifier(createVerifierRegistry(), verifier)).toThrow(/divergent output/);
  });
});

describe("selectVerifiers", () => {
  it("selects verifiers matching the plan pathology classes", () => {
    const v1 = makeVerifier();
    const v2 = makeVerifier({
      id: "unseeded-randomness/v1",
      pathologyClass: "UNSEEDED_RANDOMNESS"
    });
    const registry = registerVerifier(
      registerVerifier(createVerifierRegistry(), v1),
      v2
    );
    const plan = {
      pathologyClasses: ["LEAKED_LISTENER_SUBSCRIPTION"],
      profileId: "scholomance/default",
      version: "1.0.0"
    };
    const selected = selectVerifiers(registry, plan);
    expect(selected.map(v => v.id)).toEqual(["listener-lifecycle/v1"]);
  });

  it("sorts selected verifiers by id", () => {
    const v1 = makeVerifier({ id: "b-v1", pathologyClass: "X", version: "1.0.0" });
    const v2 = makeVerifier({ id: "a-v1", pathologyClass: "X", version: "1.0.1" });
    const registry = registerVerifier(
      registerVerifier(createVerifierRegistry(), v1),
      v2
    );
    const selected = selectVerifiers(registry, { pathologyClasses: ["X"] });
    expect(selected.map(v => v.id)).toEqual(["a-v1", "b-v1"]);
  });

  it("returns an empty array when no classes match", () => {
    const registry = registerVerifier(createVerifierRegistry(), makeVerifier());
    const selected = selectVerifiers(registry, { pathologyClasses: ["UNKNOWN"] });
    expect(selected).toEqual([]);
  });

  it("returns a frozen selected array", () => {
    const registry = registerVerifier(createVerifierRegistry(), makeVerifier());
    const selected = selectVerifiers(registry, { pathologyClasses: ["LEAKED_LISTENER_SUBSCRIPTION"] });
    expect(Object.isFrozen(selected)).toBe(true);
  });
});

describe("validateVerifierResult", () => {
  it("accepts a VERIFIED result with valid evidence", () => {
    const result = validateVerifierResult({
      verdict: "VERIFIED",
      evidence: [createEvidence({ kind: "SUPPORTING", predicateId: "P", observed: true })]
    });
    expect(result.valid).toBe(true);
  });

  it("accepts a NO_FINDING result", () => {
    const result = validateVerifierResult({ verdict: "NO_FINDING", evidence: [] });
    expect(result.valid).toBe(true);
  });

  it("rejects verdicts other than VERIFIED or NO_FINDING", () => {
    expect(() => validateVerifierResult({ verdict: "LIKELY" })).toThrow(/verdict/);
    expect(() => validateVerifierResult({ verdict: "SCORE" })).toThrow(/verdict/);
  });

  it("rejects malformed evidence", () => {
    expect(() =>
      validateVerifierResult({
        verdict: "VERIFIED",
        evidence: [{ kind: "SCORE", observed: true }]
      })
    ).toThrow(/evidence kind|malformed evidence/);
  });

  it("rejects a candidate score presented as a verdict", () => {
    expect(() =>
      validateVerifierResult({ verdict: "VERIFIED", score: 0.95, evidence: [] })
    ).toThrow(/score|candidate score/);
  });

  it("describes only the score rule in the score rejection message", () => {
    let message;
    try {
      validateVerifierResult({ verdict: "VERIFIED", score: 0.95, evidence: [] });
    } catch (error) {
      message = error.message;
    }
    expect(message).toMatch(/candidate score/i);
    expect(message).not.toMatch(/structural verifier|emit VERIFIED/);
  });
});
