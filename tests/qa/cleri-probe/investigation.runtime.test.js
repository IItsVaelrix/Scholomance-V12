import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createInvestigationRuntime } from "../../../codex/runtime/cleri-probe/investigation.runtime.js";
import { createSubstrateService } from "../../../codex/services/cleri-probe/substrate.service.js";
import { parseSourceFacts } from "../../../codex/services/cleri-probe/babel-facts.adapter.js";
import * as retrieval from "../../../codex/core/immunity/cleri-probe/retrieval.js";
import {
  createVerifierRegistry,
  registerVerifier
} from "../../../codex/core/immunity/cleri-probe/verifier-registry.js";
import {
  createEvidence
} from "../../../codex/core/immunity/cleri-probe/contracts.js";
import {
  stableStringify,
  verifyInvestigationReport
} from "../../../codex/core/immunity/cleri-probe/canonical-report.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");

function makeMemoryIndexRepository() {
  const store = new Map();
  const keyOf = key =>
    JSON.stringify({
      contract: key.contract,
      parserVersion: key.parserVersion,
      profileVersion: key.profileVersion,
      repositoryFingerprint: key.repositoryFingerprint
    });

  return {
    get(key) {
      return store.get(keyOf(key)) ?? null;
    },
    set(key, payload) {
      store.set(keyOf(key), payload);
    },
    delete(key) {
      store.delete(keyOf(key));
    }
  };
}

function makeTelemetry() {
  const phases = [];
  return {
    phases,
    phase(name) {
      phases.push(name);
    }
  };
}

function makeRecordingSubstrateService() {
  let calls = 0;
  return {
    async resolveScope(...args) {
      calls += 1;
      return {
        rootFingerprint: "sha256:test",
        requestedPaths: args[0]?.paths ?? [],
        files: [],
        skipped: []
      };
    },
    getCalls() {
      return calls;
    }
  };
}

function makeSyntheticVerifier() {
  return {
    id: "synthetic-listener/v1",
    version: "1.0.0",
    pathologyClass: "LEAKED_LISTENER_SUBSCRIPTION",
    retrieveHints() {
      return [];
    },
    verify(candidate) {
      if (candidate.path && candidate.path.includes("verified")) {
        return {
          verdict: "VERIFIED",
          evidence: [
            createEvidence({
              kind: "SUPPORTING",
              predicateId: "LEAKED_LISTENER",
              observed: true,
              span: candidate.span,
              explanation: "Synthetic verifier observed a leaked listener registration"
            }),
            createEvidence({
              kind: "COUNTERCHECK",
              predicateId: "CLEANUP_PRESENT",
              observed: false,
              span: candidate.span,
              explanation: "No matching cleanup was found"
            })
          ]
        };
      }
      return { verdict: "NO_FINDING" };
    }
  };
}

describe("Cleri Probe investigation runtime", () => {
  it("runs PLAN, LOAD, INDEX, RETRIEVE, VERIFY, ENRICH, REPORT in order", async () => {
    const telemetry = makeTelemetry();
    const indexRepo = makeMemoryIndexRepository();
    let registry = createVerifierRegistry();
    registry = registerVerifier(registry, makeSyntheticVerifier());

    const runtime = createInvestigationRuntime({
      substrateService: createSubstrateService({ fs, root: repoRoot }),
      indexRepository: indexRepo,
      parser: parseSourceFacts,
      verifierRegistry: registry,
      retrieval,
      telemetry
    });

    const result = await runtime.investigate({
      hypothesis: "leaked event listener subscription missing cleanup",
      scopes: ["tests/qa/fixtures/cleri-probe/listener-lifecycle"],
      includeTests: true,
      maxCandidates: 10,
      maxRuntimeMs: 30000
    });

    expect(telemetry.phases).toEqual([
      "PLAN",
      "LOAD",
      "INDEX",
      "RETRIEVE",
      "VERIFY",
      "ENRICH",
      "REPORT"
    ]);

    expect(result.report).not.toBeNull();
    expect(result.report.contract).toBe("SCHOL-CLERI-PROBE-v2");
    expect(result.report.status).toBe("VERIFIED_FINDINGS");
    expect(result.report.findings.length).toBeGreaterThan(0);
    expect(verifyInvestigationReport(result.report).valid).toBe(true);
  });

  it("produces byte-identical reports across 100 runs", async () => {
    const indexRepo = makeMemoryIndexRepository();
    let registry = createVerifierRegistry();
    registry = registerVerifier(registry, makeSyntheticVerifier());

    const runtime = createInvestigationRuntime({
      substrateService: createSubstrateService({ fs, root: repoRoot }),
      indexRepository: indexRepo,
      parser: parseSourceFacts,
      verifierRegistry: registry,
      retrieval
    });

    const request = {
      hypothesis: "leaked event listener subscription missing cleanup",
      scopes: ["tests/qa/fixtures/cleri-probe/listener-lifecycle"],
      includeTests: true,
      maxCandidates: 10,
      maxRuntimeMs: 30000
    };

    const first = await runtime.investigate(request);
    const canonical = stableStringify(first.report);

    for (let i = 0; i < 99; i += 1) {
      const next = await runtime.investigate(request);
      expect(stableStringify(next.report)).toBe(canonical);
      expect(next.report.bytecode).toBe(first.report.bytecode);
      expect(next.report.checksum).toBe(first.report.checksum);
      expect(next.report.reportId).toBe(first.report.reportId);
    }
  });

  it("returns INCONCLUSIVE for unsupported hypotheses without loading the substrate", async () => {
    const telemetry = makeTelemetry();
    const indexRepo = makeMemoryIndexRepository();
    const substrate = makeRecordingSubstrateService();

    const runtime = createInvestigationRuntime({
      substrateService: substrate,
      indexRepository: indexRepo,
      parser: parseSourceFacts,
      verifierRegistry: createVerifierRegistry(),
      retrieval,
      telemetry
    });

    const result = await runtime.investigate({
      hypothesis: "the UI feels haunted"
    });

    expect(result.status).toBe("INCONCLUSIVE");
    expect(substrate.getCalls()).toBe(0);
    expect(telemetry.phases).toEqual(["PLAN", "REPORT"]);
    expect(result.report).not.toBeNull();
    expect(result.report.status).toBe("INCONCLUSIVE");
  });

  it("records parser failures as coverage entries", async () => {
    const telemetry = makeTelemetry();
    const indexRepo = makeMemoryIndexRepository();
    const brokenParser = () => {
      const err = new Error("parse failed");
      err.loc = { line: 1, column: 1 };
      throw err;
    };

    const runtime = createInvestigationRuntime({
      substrateService: createSubstrateService({ fs, root: repoRoot }),
      indexRepository: indexRepo,
      parser: brokenParser,
      verifierRegistry: createVerifierRegistry(),
      retrieval,
      telemetry
    });

    const result = await runtime.investigate({
      hypothesis: "leaked event listener subscription missing cleanup",
      scopes: ["tests/qa/fixtures/cleri-probe/listener-lifecycle"],
      includeTests: true,
      maxCandidates: 10,
      maxRuntimeMs: 30000
    });

    expect(result.report.coverage.parserFailures.length).toBeGreaterThan(0);
    expect(result.report.status).toBe("PARTIAL");
    expect(result.report.coverage.parserFailures.every(f => f.errorBytecode.startsWith("PB-ERR-v1-"))).toBe(true);
  });
});
