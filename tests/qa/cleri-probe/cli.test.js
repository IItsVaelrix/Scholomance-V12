import { describe, expect, it } from "vitest";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { verifyInvestigationReport } from "../../../codex/core/immunity/cleri-probe/canonical-report.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cli = path.resolve(__dirname, "../../../scripts/cleri-probe.js");
const cwd = path.dirname(path.dirname(cli));

function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, ...args], {
      cwd,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", chunk => {
      stdout += chunk;
    });
    child.stderr.on("data", chunk => {
      stderr += chunk;
    });

    child.on("error", reject);
    child.on("close", code => {
      resolve({ code, stdout, stderr });
    });
  });
}

describe("Cleri Probe CLI", () => {
  it("emits one parseable SCHOL-CLERI-PROBE-v2 object and no stderr debug output", async () => {
    const result = await run([
      "investigate",
      "leaked listener",
      "--scope",
      "tests/qa/fixtures/cleri-probe/listener-lifecycle",
      "--format",
      "json",
      "--include-tests"
    ]);

    expect(result.stderr).toBe("");
    const lines = result.stdout.trim().split("\n").filter(Boolean);
    expect(lines).toHaveLength(1);

    const report = JSON.parse(lines[0]);
    expect(report.contract).toBe("SCHOL-CLERI-PROBE-v2");
    expect(verifyInvestigationReport(report).valid).toBe(true);
  });

  it("refuses an artifact that does not carry the report contract", async () => {
    // The corpus manifest is a real file, but it is not a report. Every report
    // command must reject it as an operational failure, not read it hopefully.
    for (const command of [
      ["explain", "finding-1", "--report", "tests/qa/fixtures/cleri-probe/manifest.json"],
      ["verify", "finding-1", "--report", "tests/qa/fixtures/cleri-probe/manifest.json"]
    ]) {
      const result = await run(command);
      expect(result.code).toBe(2);
      expect(result.stderr).toMatch(/^PB-ERR-v1-/);
    }
  });

  it("returns exit code 2 for unknown options", async () => {
    const result = await run([
      "investigate",
      "leaked listener",
      "--unknown-option"
    ]);
    expect(result.code).toBe(2);
    expect(result.stderr).toMatch(/^PB-ERR-v1-/);
  });

  it("lists detectors as valid JSON", async () => {
    const result = await run(["detectors", "--json"]);
    expect(result.code).toBe(0);
    expect(result.stderr).toBe("");
    const parsed = JSON.parse(result.stdout);
    expect(Array.isArray(parsed)).toBe(true);
  });
});
