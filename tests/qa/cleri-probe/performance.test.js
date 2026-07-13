/**
 * Performance gate.
 *
 * The product thresholds live in the benchmark command and are enforced on the
 * documented reference machine. This suite measures the same four scenarios at
 * deterministic fixture scale with generous CI ceilings: it exists to catch an
 * order-of-magnitude regression, not to police milliseconds on shared hardware.
 */

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createInvestigationRuntime } from "../../../codex/runtime/cleri-probe/investigation.runtime.js";
import { createSubstrateService } from "../../../codex/services/cleri-probe/substrate.service.js";
import { parseSourceFacts, PARSER_VERSION } from "../../../codex/services/cleri-probe/babel-facts.adapter.js";
import { createContextService } from "../../../codex/services/cleri-probe/context.service.js";
import * as retrieval from "../../../codex/core/immunity/cleri-probe/retrieval.js";
import { createDefaultRegistry } from "../../../codex/core/immunity/cleri-probe/verifier-registry.js";
import { BENCHMARK_THRESHOLDS } from "../../../scripts/cleri-probe/commands.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");

/** CI runs on shared hardware; the product thresholds are the real gate. */
const CI_MULTIPLIER = 8;
const SAMPLES = 5;

function memoryIndex() {
  const store = new Map();
  const keyOf = key => JSON.stringify(key);
  return {
    get: key => store.get(keyOf(key)) ?? null,
    set: (key, payload) => store.set(keyOf(key), payload)
  };
}

function makeRuntime(indexRepository = memoryIndex()) {
  return createInvestigationRuntime({
    substrateService: createSubstrateService({ fs, root: repoRoot }),
    indexRepository,
    parser: parseSourceFacts,
    parserVersion: PARSER_VERSION,
    verifierRegistry: createDefaultRegistry(),
    retrieval,
    contextService: createContextService({})
  });
}

const REQUEST = {
  hypothesis: "leaked event listener subscription missing cleanup",
  includeTests: true,
  maxCandidates: 50,
  maxRuntimeMs: 30000
};

async function p95(run) {
  const durations = [];
  for (let i = 0; i < SAMPLES; i += 1) {
    const started = Date.now();
    await run();
    durations.push(Date.now() - started);
  }
  durations.sort((a, b) => a - b);
  return durations[Math.min(durations.length - 1, Math.ceil(0.95 * durations.length) - 1)];
}

describe("performance", () => {
  it("keeps a warm targeted investigation within its budget", async () => {
    const index = memoryIndex();
    const runtime = makeRuntime(index);
    const request = { ...REQUEST, scopes: ["tests/qa/fixtures/cleri-probe"] };

    await runtime.investigate(request);
    const measured = await p95(() => runtime.investigate(request));

    expect(measured).toBeLessThanOrEqual(BENCHMARK_THRESHOLDS.warm * CI_MULTIPLIER);
  });

  it("keeps a one-file incremental investigation within its budget", async () => {
    const index = memoryIndex();
    const runtime = makeRuntime(index);
    const request = {
      ...REQUEST,
      scopes: ["tests/qa/fixtures/cleri-probe/listener-lifecycle/verified.jsx"]
    };

    await runtime.investigate(request);
    const measured = await p95(() => runtime.investigate(request));

    expect(measured).toBeLessThanOrEqual(BENCHMARK_THRESHOLDS.incremental * CI_MULTIPLIER);
  });

  it("keeps a cold investigation with no cache within its budget", async () => {
    const request = { ...REQUEST, scopes: ["tests/qa/fixtures/cleri-probe"], noCache: true };
    const measured = await p95(() => makeRuntime().investigate(request));

    expect(measured).toBeLessThanOrEqual(BENCHMARK_THRESHOLDS.cold * CI_MULTIPLIER);
  });

  it("keeps a repository-subtree sweep within its budget", async () => {
    const runtime = makeRuntime();
    const request = { ...REQUEST, scopes: ["codex/core/immunity/cleri-probe"] };
    const measured = await p95(() => runtime.investigate(request));

    expect(measured).toBeLessThanOrEqual(BENCHMARK_THRESHOLDS.sweep * CI_MULTIPLIER);
  });

  it("honours its runtime budget instead of running to completion", async () => {
    const runtime = makeRuntime();
    const started = Date.now();

    const result = await runtime.investigate({
      ...REQUEST,
      scopes: ["codex"],
      maxRuntimeMs: 1
    });

    expect(Date.now() - started).toBeLessThan(BENCHMARK_THRESHOLDS.sweep * CI_MULTIPLIER);
    expect(result.status).toBe("PARTIAL");
    expect(result.report.diagnostics.some(entry => entry.startsWith("PB-ERR-v1-"))).toBe(true);
  });
});
