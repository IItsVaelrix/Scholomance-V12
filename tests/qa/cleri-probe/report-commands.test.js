import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
const cli = path.join(repoRoot, "scripts/cleri-probe.js");

let workdir;

function run(args, options = {}) {
  try {
    const stdout = execFileSync("node", [cli, ...args], {
      cwd: repoRoot,
      encoding: "utf8",
      env: { ...process.env, NO_COLOR: "1" },
      ...options
    });
    return { code: 0, stdout, stderr: "" };
  } catch (error) {
    return {
      code: error.status ?? 1,
      stdout: error.stdout ?? "",
      stderr: error.stderr ?? ""
    };
  }
}

function investigate(extra = []) {
  const output = path.join(workdir, "report.json");
  const result = run([
    "investigate",
    "leaked event listener subscription missing cleanup",
    "--scope", "tests/qa/fixtures/cleri-probe/listener-lifecycle",
    "--include-tests",
    "--no-cache",
    "--format", "json",
    "--output", output,
    ...extra
  ]);
  expect(result.code).toBe(0);
  return { output, report: JSON.parse(fs.readFileSync(output, "utf8")) };
}

beforeEach(() => {
  workdir = fs.mkdtempSync(path.join(os.tmpdir(), "cleri-report-"));
});

afterEach(() => {
  fs.rmSync(workdir, { recursive: true, force: true });
});

describe("investigate produces a canonical report", () => {
  it("verifies findings and enriches them with law, ownership, and remediation", () => {
    const { report } = investigate();

    expect(report.contract).toBe("SCHOL-CLERI-PROBE-v2");
    expect(report.status).toBe("VERIFIED_FINDINGS");
    expect(report.findings.length).toBeGreaterThan(0);

    const finding = report.findings[0];
    expect(finding.verdict).toBe("VERIFIED");
    expect(finding.ownership).toBe("qa");
    expect(finding.remediation.recommendationId).toBe("cleri.listener-cleanup");
    expect(finding.remediation.autoFixAvailable).toBe(false);
    expect(finding.lawRefs.length).toBeGreaterThan(0);
  });

  it("omits source text from JSON unless --include-source is supplied", () => {
    const { report } = investigate();
    const serialized = JSON.stringify(report);

    // Evidence may name a receiver, an event, or a symbol — that is the proof.
    // It may never carry the source line itself.
    expect(serialized).not.toContain("const handler = () => console.log('resized')");
    expect(serialized).not.toContain("export function WindowResizeHook");
  });
});

describe("explain", () => {
  it("resolves the report id, finding ids, evidence predicates, and limitations", () => {
    const { output, report } = investigate();
    const findingId = report.findings[0].findingId;

    const result = run(["explain", findingId, "--report", output]);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain(report.reportId);
    expect(result.stdout).toContain(findingId);
    expect(result.stdout).toContain("EFFECT_CALLBACK_REGISTERS_LISTENER_OR_SUBSCRIPTION");
    expect(result.stdout).toContain("MATCHING_REMOVE_IN_RETURNED_CLEANUP");
    expect(result.stdout).toContain("Limitations");
    expect(result.stdout).toContain("Coverage");
  });

  it("emits the finding as JSON", () => {
    const { output, report } = investigate();
    const findingId = report.findings[0].findingId;

    const result = run(["explain", findingId, "--report", output, "--format", "json"]);
    const explained = JSON.parse(result.stdout);

    expect(explained.finding.findingId).toBe(findingId);
    expect(explained.finding.supportingEvidence.length).toBeGreaterThan(0);
    expect(explained.coverage).toBeTruthy();
  });

  it("rejects an unknown finding id", () => {
    const { output } = investigate();
    const result = run(["explain", "not-a-finding", "--report", output]);

    expect(result.code).toBe(2);
    expect(result.stderr).toMatch(/^PB-ERR-v1-/);
  });
});

describe("verify", () => {
  it("accepts an untampered report", () => {
    const { output, report } = investigate();
    const result = run(["verify", report.findings[0].findingId, "--report", output]);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("EVIDENCE REPRODUCIBLE");
  });

  it("reports the verification state as JSON", () => {
    const { output, report } = investigate();
    const result = run(["verify", report.findings[0].findingId, "--report", output, "--format", "json"]);
    const verification = JSON.parse(result.stdout);

    expect(verification.checksumValid).toBe(true);
    expect(verification.bytecodeValid).toBe(true);
    expect(verification.findingIdValid).toBe(true);
    expect(verification.substrateDrift).toBeNull();
    expect(verification.reproducible).toBe(true);
  });

  it("rejects a changed predicate", () => {
    const { output, report } = investigate();
    const tampered = JSON.parse(JSON.stringify(report));
    tampered.findings[0].supportingEvidence[0].observed = false;
    fs.writeFileSync(output, JSON.stringify(tampered), "utf8");

    const result = run(["verify", report.findings[0].findingId, "--report", output]);

    expect(result.code).toBe(2);
    expect(result.stderr).toMatch(/^PB-ERR-v1-/);
  });

  it("detects substrate drift when the covered source moves", () => {
    const { output, report } = investigate();
    const finding = report.findings[0];

    const drifted = JSON.parse(JSON.stringify(report));
    const target = drifted.findings.find(item => item.findingId === finding.findingId);
    // The report is intact; the code it points at is not.
    target.span.excerptDigest = "0".repeat(64);
    rehash(drifted, output);

    const result = run(["verify", finding.findingId, "--report", output, "--format", "json"]);
    expect(result.code).toBe(3);
    expect(JSON.parse(result.stdout).substrateDrift).toBe("EXCERPT_CHANGED");
  });

  it("emits the report bytecode plus a verification state, not a source excerpt", () => {
    const { output, report } = investigate();
    const result = run([
      "verify", report.findings[0].findingId,
      "--report", output,
      "--format", "bytecode"
    ]);

    expect(result.stdout.trim()).toBe(`${report.bytecode} REPRODUCIBLE`);
    expect(result.stdout).not.toContain("addEventListener");
  });
});

/**
 * Re-seals a mutated report so its checksum and bytecode are internally
 * consistent. Without this, every mutation would fail on identity before the
 * substrate check could run.
 */
function rehash(report, output) {
  const script = `
    import fs from 'node:fs';
    import { checksumInvestigationReport, encodeCleriReportIdentity } from '${repoRoot}/codex/core/immunity/cleri-probe/canonical-report.js';
    const report = JSON.parse(fs.readFileSync('${output}', 'utf8'));
    report.checksum = checksumInvestigationReport(report);
    report.bytecode = encodeCleriReportIdentity(report);
    fs.writeFileSync('${output}', JSON.stringify(report), 'utf8');
  `;
  fs.writeFileSync(output, JSON.stringify(report), "utf8");
  execFileSync("node", ["--input-type=module", "-e", script], { cwd: repoRoot });
}
