/**
 * Security and resilience battery.
 *
 * The probe reads a repository it does not trust. Nothing it reads may execute,
 * escape the root, reach the network, hang the process, or reach an operator's
 * terminal as a control sequence. Operational failures are PB-ERR-v1 artifacts;
 * a pathology it cannot see is PARTIAL or INCONCLUSIVE, never a clean bill of
 * health.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createInvestigationRuntime } from "../../../codex/runtime/cleri-probe/investigation.runtime.js";
import { createSubstrateService } from "../../../codex/services/cleri-probe/substrate.service.js";
import { createIndexRepository } from "../../../codex/services/cleri-probe/index.repository.js";
import { parseSourceFacts, PARSER_VERSION } from "../../../codex/services/cleri-probe/babel-facts.adapter.js";
import { createContextService } from "../../../codex/services/cleri-probe/context.service.js";
import * as retrieval from "../../../codex/core/immunity/cleri-probe/retrieval.js";
import { createDefaultRegistry } from "../../../codex/core/immunity/cleri-probe/verifier-registry.js";
import { decodeBytecodeError } from "../../../codex/core/pixelbrain/bytecode-error.js";
import { sanitize } from "../../../scripts/cleri-probe/render-human.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
const cli = path.join(repoRoot, "scripts/cleri-probe.js");
const HYPOTHESIS = "unseeded random math random in a deterministic path";

let root;
let cacheDir;

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "cleri-sec-"));
  cacheDir = path.join(root, ".cache");
  fs.mkdirSync(path.join(root, "src/game/combat"), { recursive: true });
});

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

function write(relative, content) {
  const absolute = path.join(root, relative);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, content);
  return absolute;
}

function runtimeFor(overrides = {}) {
  const substrateService = createSubstrateService({ fs, root, cacheDir, ...overrides.substrate });
  return createInvestigationRuntime({
    substrateService,
    indexRepository: createIndexRepository({ fs, cacheDir }),
    parser: parseSourceFacts,
    parserVersion: PARSER_VERSION,
    verifierRegistry: createDefaultRegistry(),
    retrieval,
    contextService: createContextService({}),
    ...overrides.runtime
  });
}

function investigate(request = {}) {
  return runtimeFor(request.overrides).investigate({
    hypothesis: HYPOTHESIS,
    scopes: ["src"],
    maxCandidates: 50,
    maxRuntimeMs: 30000,
    ...request
  });
}

function runCli(args, env = {}) {
  try {
    return {
      code: 0,
      stdout: execFileSync("node", [cli, ...args], {
        cwd: repoRoot,
        encoding: "utf8",
        env: { ...process.env, NO_COLOR: "1", ...env }
      }),
      stderr: ""
    };
  } catch (error) {
    return { code: error.status ?? 1, stdout: error.stdout ?? "", stderr: error.stderr ?? "" };
  }
}

describe("substrate is read, never trusted", () => {
  it("refuses a scope that traverses out of the root", async () => {
    write("src/game/combat/damage.js", "function calculateDamage() { return Math.random(); }\n");

    await expect(investigate({ scopes: ["../../etc"] })).rejects.toMatchObject({
      bytecode: expect.stringMatching(/^PB-ERR-v1-/)
    });
  });

  it("does not follow a symlink that escapes the root", async () => {
    write("src/game/combat/damage.js", "function calculateDamage() { return Math.random(); }\n");
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), "cleri-outside-"));
    fs.writeFileSync(path.join(outside, "secret.js"), "function calculateDamage() { return Math.random(); }\n");
    fs.symlinkSync(path.join(outside, "secret.js"), path.join(root, "src/escape.js"));

    const result = await investigate();

    expect(result.report.coverage.analyzedPaths).not.toContain("src/escape.js");
    fs.rmSync(outside, { recursive: true, force: true });
  });

  it("survives a symlink loop", async () => {
    write("src/game/combat/damage.js", "function calculateDamage() { return Math.random(); }\n");
    fs.symlinkSync(path.join(root, "src"), path.join(root, "src/game/loop"));

    const result = await investigate();
    expect(result.report).toBeTruthy();
    expect(result.report.findings.length).toBe(1);
  });

  it("skips an oversized file rather than reading it", async () => {
    write("src/game/combat/damage.js", "function calculateDamage() { return Math.random(); }\n");
    write("src/game/combat/huge.js", `// ${"x".repeat(3 * 1024 * 1024)}\n`);

    const result = await investigate({ maxFileBytes: 1024 });

    expect(result.report.coverage.analyzedPaths).not.toContain("src/game/combat/huge.js");
    expect(result.report.status).toBe("PARTIAL");
  });

  it("records a parser failure for binary and malformed content instead of crashing", async () => {
    write("src/game/combat/damage.js", "function calculateDamage() { return Math.random(); }\n");
    fs.writeFileSync(path.join(root, "src/game/combat/binary.js"), Buffer.from([0x00, 0xff, 0xfe, 0x01, 0x02]));
    write("src/game/combat/broken.js", "function calculateDamage( { \uD800\n");

    const result = await investigate();

    expect(result.report.status).toBe("PARTIAL");
    expect(result.report.coverage.parserFailures.length).toBeGreaterThan(0);
    for (const failure of result.report.coverage.parserFailures) {
      expect(failure.errorBytecode).toMatch(/^PB-ERR-v1-/);
      expect(decodeBytecodeError(failure.errorBytecode)).toBeTruthy();
    }
    // A file it could not parse is never a clean bill of health.
    expect(result.report.status).not.toBe("NO_VERIFIED_FINDINGS");
  });

  it("bounds a parser bomb by the runtime budget", async () => {
    write("src/game/combat/bomb.js", `const x = ${"[".repeat(20000)}${"]".repeat(20000)};\n`);

    const started = Date.now();
    const result = await investigate({ maxRuntimeMs: 3000 });
    const elapsed = Date.now() - started;

    expect(elapsed).toBeLessThan(15000);
    expect(["PARTIAL", "NO_VERIFIED_FINDINGS", "VERIFIED_FINDINGS"]).toContain(result.report.status);
  });

  it("bounds a candidate flood", async () => {
    for (let i = 0; i < 200; i += 1) {
      write(`src/game/combat/damage${i}.js`, "function calculateDamage() { return Math.random(); }\n");
    }

    const result = await investigate({ maxCandidates: 10 });
    expect(result.candidates.length).toBeLessThanOrEqual(10);
  });

  it("treats a malicious cache payload as advisory", async () => {
    write("src/game/combat/damage.js", "function calculateDamage() { return Math.random(); }\n");

    const clean = await investigate();
    // Poison every cache file the run produced.
    for (const entry of fs.readdirSync(cacheDir, { recursive: true })) {
      const absolute = path.join(cacheDir, String(entry));
      if (fs.statSync(absolute).isFile()) {
        fs.writeFileSync(absolute, '{"__proto__":{"polluted":true},"ok":"not facts"}');
      }
    }

    const poisoned = await investigate();

    expect(poisoned.report.reportId).toBe(clean.report.reportId);
    expect(poisoned.report.findings.length).toBe(1);
    expect({}.polluted).toBeUndefined();
  });

  it("skips an unreadable path", async () => {
    write("src/game/combat/damage.js", "function calculateDamage() { return Math.random(); }\n");
    const locked = write("src/game/combat/locked.js", "function calculateDamage() { return Math.random(); }\n");
    fs.chmodSync(locked, 0o000);

    const result = await investigate();

    expect(result.report).toBeTruthy();
    fs.chmodSync(locked, 0o644);
  });

  it("never executes the source it reads", async () => {
    const marker = path.join(root, "EXECUTED");
    write("src/game/combat/damage.js", `
      const fs = require('fs');
      fs.writeFileSync(${JSON.stringify(marker)}, 'executed');
      process.exit(1);
      function calculateDamage() { return Math.random(); }
    `);

    const result = await investigate();

    expect(fs.existsSync(marker)).toBe(false);
    expect(result.report).toBeTruthy();
  });

  it("never calls a network API", async () => {
    write("src/services/profile.js", `
      async function fetchUserProfile() {
        const response = await fetch('/api/user');
        const data = await response.json();
        return data.profile.name;
      }
    `);

    const originalFetch = globalThis.fetch;
    let called = 0;
    globalThis.fetch = () => {
      called += 1;
      throw new Error("the probe reached the network");
    };

    try {
      await investigate({ hypothesis: "unguarded api response data from fetch" });
      expect(called).toBe(0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe("output is safe to print", () => {
  it("strips ANSI and control sequences carried in content", () => {
    const injected = "[31mred[0m  payload";
    expect(sanitize(injected)).toBe("red payload");
  });

  it("redacts secrets", () => {
    expect(sanitize("const apiKey = 'AKIAIOSFODNN7EXAMPLE';")).toContain("[REDACTED]");
    expect(sanitize("Authorization: Bearer abc.def.ghi")).toContain("[REDACTED]");
    expect(sanitize("const password = 'hunter2';")).not.toContain("hunter2");
  });

  it("omits source text from JSON unless --include-source is supplied", () => {
    const result = runCli([
      "investigate", "leaked event listener subscription missing cleanup",
      "--scope", "tests/qa/fixtures/cleri-probe/listener-lifecycle",
      "--include-tests", "--no-cache", "--format", "json"
    ]);

    expect(result.code).toBe(0);
    expect(result.stdout).not.toContain("const handler = () => console.log('resized')");
  });

  it("emits no uncontrolled ANSI when colour is disabled", () => {
    const noColor = runCli([
      "investigate", "leaked event listener subscription missing cleanup",
      "--scope", "tests/qa/fixtures/cleri-probe/listener-lifecycle",
      "--include-tests", "--no-cache", "--no-color"
    ]);

    // eslint-disable-next-line no-control-regex
    expect(noColor.stdout).not.toMatch(/\[/);
  });

  it("emits JSON with no debug logging around it", () => {
    const result = runCli([
      "investigate", "leaked event listener subscription missing cleanup",
      "--scope", "tests/qa/fixtures/cleri-probe/listener-lifecycle",
      "--include-tests", "--no-cache", "--format", "json"
    ]);

    expect(() => JSON.parse(result.stdout)).not.toThrow();
  });

  it("prints complete help", () => {
    const result = runCli(["--help"]);

    expect(result.code).toBe(0);
    for (const fragment of [
      "investigate", "explain", "verify", "detectors", "benchmark", "graduate",
      "--scope", "--exclude", "--detector", "--include-tests", "--plan-only",
      "--format", "--output", "--include-source", "--no-cache", "--no-color",
      "--fail-on-findings", "--report", "--proposal",
      "VERIFIED_FINDINGS", "NO_VERIFIED_FINDINGS", "PARTIAL", "INCONCLUSIVE", "FAILED",
      "not proof of absence"
    ]) {
      expect(result.stdout).toContain(fragment);
    }
  });

  it("renders in a narrow terminal without wrapping into nonsense", () => {
    const result = runCli([
      "investigate", "leaked event listener subscription missing cleanup",
      "--scope", "tests/qa/fixtures/cleri-probe/listener-lifecycle",
      "--include-tests", "--no-cache"
    ], { COLUMNS: "40" });

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Verified findings");
  });
});

describe("exit codes", () => {
  const listenerScope = [
    "--scope", "tests/qa/fixtures/cleri-probe/listener-lifecycle",
    "--include-tests", "--no-cache"
  ];

  it("exits 0 on a completed investigation", () => {
    expect(runCli(["investigate", "leaked event listener subscription missing cleanup", ...listenerScope]).code)
      .toBe(0);
  });

  it("exits 1 when findings are reported and --fail-on-findings is given", () => {
    const result = runCli([
      "investigate", "leaked event listener subscription missing cleanup",
      ...listenerScope, "--fail-on-findings"
    ]);
    expect(result.code).toBe(1);
  });

  it("exits 2 on an operational failure", () => {
    const unknownOption = runCli(["investigate", "x", "--nope"]);
    expect(unknownOption.code).toBe(2);
    expect(unknownOption.stderr).toMatch(/^PB-ERR-v1-/);

    const missingHypothesis = runCli(["investigate"]);
    expect(missingHypothesis.code).toBe(2);
    expect(missingHypothesis.stderr).toMatch(/^PB-ERR-v1-/);

    const badFormat = runCli(["investigate", "x", "--format", "yaml"]);
    expect(badFormat.code).toBe(2);
    expect(decodeBytecodeError(badFormat.stderr.trim())).toBeTruthy();
  });

  it("exits 3 when the hypothesis reaches no registered pathology class", () => {
    const result = runCli(["investigate", "the UI feels haunted", ...listenerScope]);

    expect(result.code).toBe(3);
    expect(result.stdout).toContain("INCONCLUSIVE");
  });

  it("never reports NO_VERIFIED_FINDINGS for an unsupported hypothesis", () => {
    const result = runCli([
      "investigate", "the UI feels haunted",
      ...listenerScope, "--format", "json"
    ]);
    const report = JSON.parse(result.stdout);

    expect(report.status).toBe("INCONCLUSIVE");
    expect(report.status).not.toBe("NO_VERIFIED_FINDINGS");
  });

  it("reports NO_VERIFIED_FINDINGS only when coverage is complete and nothing was proven", () => {
    const result = runCli([
      "investigate", "unseeded random math random in a deterministic path",
      "--scope", "tests/qa/fixtures/cleri-probe/listener-lifecycle",
      "--include-tests", "--no-cache", "--format", "json"
    ]);
    const report = JSON.parse(result.stdout);

    expect(report.status).toBe("NO_VERIFIED_FINDINGS");
    expect(report.coverage.complete).toBe(true);
  });
});
