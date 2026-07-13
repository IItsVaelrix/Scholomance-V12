/**
 * Determinism battery.
 *
 * A report is an identity, not a printout: the same substrate must produce the
 * same bytes no matter where the repository lives, what order the filesystem
 * hands back its entries, whether the cache was warm, or how wide the terminal
 * is. And every field that participates in that identity must be load-bearing —
 * tamper with any one of them and verification must fail.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createInvestigationRuntime } from "../../../codex/runtime/cleri-probe/investigation.runtime.js";
import { createSubstrateService } from "../../../codex/services/cleri-probe/substrate.service.js";
import { parseSourceFacts, PARSER_VERSION } from "../../../codex/services/cleri-probe/babel-facts.adapter.js";
import { createContextService } from "../../../codex/services/cleri-probe/context.service.js";
import * as retrieval from "../../../codex/core/immunity/cleri-probe/retrieval.js";
import { createDefaultRegistry } from "../../../codex/core/immunity/cleri-probe/verifier-registry.js";
import {
  stableStringify,
  verifyInvestigationReport
} from "../../../codex/core/immunity/cleri-probe/canonical-report.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
const cli = path.join(repoRoot, "scripts/cleri-probe.js");
const FIXTURES = "tests/qa/fixtures/cleri-probe/listener-lifecycle";

const REQUEST = Object.freeze({
  hypothesis: "leaked event listener subscription missing cleanup",
  scopes: [FIXTURES],
  includeTests: true,
  maxCandidates: 50,
  maxRuntimeMs: 30000
});

function memoryIndex() {
  const store = new Map();
  const keyOf = key => JSON.stringify(key);
  return {
    get: key => store.get(keyOf(key)) ?? null,
    set: (key, payload) => store.set(keyOf(key), payload),
    clear: () => store.clear()
  };
}

/** A substrate service that hands files back in a deliberately hostile order. */
function shuffledSubstrate(root, seed) {
  const inner = createSubstrateService({ fs, root });
  return {
    cacheDir: inner.cacheDir,
    async resolveScope(request) {
      const resolved = await inner.resolveScope(request);
      const files = [...resolved.files];
      // Deterministic shuffle: same seed, same disorder.
      for (let i = files.length - 1; i > 0; i -= 1) {
        const j = (i * 7 + seed) % (i + 1);
        [files[i], files[j]] = [files[j], files[i]];
      }
      return { ...resolved, files };
    }
  };
}

function makeRuntime({ root = repoRoot, substrateService, indexRepository, clock } = {}) {
  return createInvestigationRuntime({
    substrateService: substrateService ?? createSubstrateService({ fs, root }),
    indexRepository: indexRepository ?? memoryIndex(),
    parser: parseSourceFacts,
    parserVersion: PARSER_VERSION,
    verifierRegistry: createDefaultRegistry(),
    retrieval,
    contextService: createContextService({}),
    clock
  });
}

let mirrorRoot;

beforeAll(() => {
  // The same repository, at a different absolute path.
  mirrorRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cleri-mirror-"));
  fs.mkdirSync(path.join(mirrorRoot, FIXTURES), { recursive: true });
  for (const name of fs.readdirSync(path.join(repoRoot, FIXTURES))) {
    fs.copyFileSync(
      path.join(repoRoot, FIXTURES, name),
      path.join(mirrorRoot, FIXTURES, name)
    );
  }
});

afterAll(() => {
  fs.rmSync(mirrorRoot, { recursive: true, force: true });
});

describe("determinism", () => {
  it("produces byte-identical reports across 100 runs", async () => {
    const runtime = makeRuntime();
    const first = await runtime.investigate(REQUEST);
    const canonical = stableStringify(first.report);

    for (let i = 0; i < 99; i += 1) {
      const next = await runtime.investigate(REQUEST);
      expect(stableStringify(next.report)).toBe(canonical);
    }
  });

  it("is unchanged by filesystem order, cache warmth, and injected durations", async () => {
    const baseline = await makeRuntime().investigate(REQUEST);
    const canonical = stableStringify(baseline.report);

    // Shuffled filesystem order.
    for (const seed of [1, 3, 11]) {
      const runtime = makeRuntime({ substrateService: shuffledSubstrate(repoRoot, seed) });
      const result = await runtime.investigate(REQUEST);
      expect(stableStringify(result.report)).toBe(canonical);
    }

    // Cold cache, then warm cache through the same repository.
    const index = memoryIndex();
    const cold = await makeRuntime({ indexRepository: index }).investigate(REQUEST);
    const warm = await makeRuntime({ indexRepository: index }).investigate(REQUEST);
    expect(stableStringify(cold.report)).toBe(canonical);
    expect(stableStringify(warm.report)).toBe(canonical);

    // An injected clock changes durations, which are not part of identity.
    let tick = 1_000_000;
    const skewed = await makeRuntime({ clock: () => (tick += 137) }).investigate(REQUEST);
    expect(stableStringify(skewed.report)).toBe(canonical);
    expect(skewed.durationMs).not.toBe(baseline.durationMs);
  });

  it("is unchanged by the absolute root the repository sits at", async () => {
    const here = await makeRuntime({ root: repoRoot }).investigate(REQUEST);
    const there = await makeRuntime({ root: mirrorRoot }).investigate(REQUEST);

    expect(stableStringify(there.report)).toBe(stableStringify(here.report));
    expect(there.report.reportId).toBe(here.report.reportId);
    expect(stableStringify(here.report)).not.toContain(repoRoot);
    expect(stableStringify(there.report)).not.toContain(mirrorRoot);
  });

  it("is unchanged by colour and terminal width", () => {
    const json = env => execFileSync("node", [
      cli, "investigate", REQUEST.hypothesis,
      "--scope", FIXTURES,
      "--include-tests", "--no-cache",
      "--format", "json"
    ], { cwd: repoRoot, encoding: "utf8", env: { ...process.env, ...env } });

    const plain = json({ NO_COLOR: "1", COLUMNS: "40" });
    const wide = json({ NO_COLOR: "", COLUMNS: "200", FORCE_COLOR: "3" });

    expect(wide).toBe(plain);
  });

  it("fails verification when any identity-bearing field is tampered with", async () => {
    const { report } = await makeRuntime().investigate(REQUEST);
    expect(verifyInvestigationReport(report).valid).toBe(true);

    const tampering = {
      contract: "SCHOL-CLERI-PROBE-v1",
      schemaVersion: "9.9.9",
      reportId: "0".repeat(64),
      hypothesis: "a different hypothesis",
      normalizedHypothesis: "a different hypothesis",
      substrateFingerprint: "0".repeat(64),
      configurationFingerprint: "0".repeat(64),
      status: "NO_VERIFIED_FINDINGS",
      diagnostics: ["injected"],
      findings: [],
      coverage: { ...report.coverage, complete: false },
      plan: { ...report.plan, pathologyClasses: [] }
    };

    for (const [field, value] of Object.entries(tampering)) {
      const tampered = { ...report, [field]: value };
      const verdict = verifyInvestigationReport(tampered);
      expect(verdict.valid, `tampering with ${field} was not detected`).toBe(false);
    }
  });

  it("fails verification when the bytecode or checksum alone is rewritten", async () => {
    const { report } = await makeRuntime().investigate(REQUEST);

    expect(verifyInvestigationReport({ ...report, checksum: "0".repeat(64) }).valid).toBe(false);
    expect(verifyInvestigationReport({ ...report, bytecode: "PB-CLERI-v2-REPORT-forged" }).valid).toBe(false);
  });
});
