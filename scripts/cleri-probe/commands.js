/**
 * Cleri Probe CLI command implementations.
 *
 * Wires argument parsing, the investigation runtime, and report renderers to
 * the lawful exit semantics defined by the Cleri Probe overhaul PDR.
 */

import fs from "node:fs";
import path from "node:path";
import { compileInvestigationPlan } from "../../codex/core/immunity/cleri-probe/planner.js";
import {
  createSubstrateService,
  readSpanExcerpt
} from "../../codex/services/cleri-probe/substrate.service.js";
import { createContextService } from "../../codex/services/cleri-probe/context.service.js";
import { createIndexRepository } from "../../codex/services/cleri-probe/index.repository.js";
import { parseSourceFacts, PARSER_VERSION } from "../../codex/services/cleri-probe/babel-facts.adapter.js";
import * as retrieval from "../../codex/core/immunity/cleri-probe/retrieval.js";
import { createDefaultRegistry } from "../../codex/core/immunity/cleri-probe/verifier-registry.js";
import { createInvestigationRuntime } from "../../codex/runtime/cleri-probe/investigation.runtime.js";
import {
  buildFindingId,
  checksumInvestigationReport,
  encodeCleriReportIdentity,
  sha256Hex,
  stableStringify,
  verifyInvestigationReport
} from "../../codex/core/immunity/cleri-probe/canonical-report.js";
import { renderExplain, renderVerification } from "./render-human.js";
import {
  BytecodeError,
  ERROR_CATEGORIES,
  ERROR_SEVERITY,
  ERROR_CODES,
  MODULE_IDS
} from "../../codex/core/pixelbrain/bytecode-error.js";
import { renderHuman } from "./render-human.js";

// ─── CLI defaults ────────────────────────────────────────────────────────────

const DEFAULT_MAX_CANDIDATES = 50;
const DEFAULT_MAX_RUNTIME_MS = 30000;

function assertPositiveFinite(value, name) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`CLI default ${name} must be a positive finite number: ${value}`);
  }
}

assertPositiveFinite(DEFAULT_MAX_CANDIDATES, "maxCandidates");
assertPositiveFinite(DEFAULT_MAX_RUNTIME_MS, "maxRuntimeMs");

// ─── Production detector registry ────────────────────────────────────────────

function createProductionRegistry() {
  return createDefaultRegistry();
}

function notAvailableError(command) {
  return new BytecodeError(
    ERROR_CATEGORIES.STATE,
    ERROR_SEVERITY.INFO,
    MODULE_IDS.IMMUNITY,
    ERROR_CODES.INVALID_STATE,
    {
      message: `Command '${command}' is not available in this foundation phase`,
      phase: "foundation",
      reasonCode: "NOT_AVAILABLE_IN_PHASE"
    }
  );
}

// ─── Runtime composition ─────────────────────────────────────────────────────

function createRuntime() {
  const fsAdapter = fs;
  const substrateService = createSubstrateService({
    fs: fsAdapter,
    root: process.cwd(),
    limits: {}
  });
  const indexRepository = createIndexRepository({
    fs: fsAdapter,
    cacheDir: substrateService.cacheDir
  });

  return createInvestigationRuntime({
    substrateService,
    indexRepository,
    parser: parseSourceFacts,
    parserVersion: PARSER_VERSION,
    verifierRegistry: createProductionRegistry(),
    retrieval,
    // The CLI runs hermetically: law, ownership, and remediation come from the
    // repository itself. Clerical RAID history is only consulted when a caller
    // injects a read-only adapter.
    contextService: createContextService({})
  });
}

// ─── Report loading ──────────────────────────────────────────────────────────

function loadReport(reportPath) {
  let raw;
  try {
    raw = fs.readFileSync(path.resolve(reportPath), "utf8");
  } catch (error) {
    throw new BytecodeError(
      ERROR_CATEGORIES.STATE,
      ERROR_SEVERITY.CRIT,
      MODULE_IDS.IMMUNITY,
      ERROR_CODES.INVALID_STATE,
      { message: `Report is unreadable: ${reportPath}`, reason: error.message }
    );
  }

  let report;
  try {
    report = JSON.parse(raw);
  } catch (error) {
    throw new BytecodeError(
      ERROR_CATEGORIES.VALUE,
      ERROR_SEVERITY.CRIT,
      MODULE_IDS.IMMUNITY,
      ERROR_CODES.INVALID_FORMAT,
      { message: `Report is not valid JSON: ${reportPath}`, reason: error.message }
    );
  }

  if (!report || report.contract !== "SCHOL-CLERI-PROBE-v2") {
    throw new BytecodeError(
      ERROR_CATEGORIES.VALUE,
      ERROR_SEVERITY.CRIT,
      MODULE_IDS.IMMUNITY,
      ERROR_CODES.INVALID_FORMAT,
      { message: "Report does not carry the SCHOL-CLERI-PROBE-v2 contract", contract: report?.contract }
    );
  }

  const validation = verifyInvestigationReport(report);
  if (!validation.valid) {
    throw new BytecodeError(
      ERROR_CATEGORIES.VALUE,
      ERROR_SEVERITY.CRIT,
      MODULE_IDS.IMMUNITY,
      ERROR_CODES.INVARIANT_VIOLATION,
      { message: `Report failed validation: ${validation.reason}` }
    );
  }

  return report;
}

function findFinding(report, findingId) {
  const finding = (report.findings || []).find(item => item.findingId === findingId);
  if (!finding) {
    throw new BytecodeError(
      ERROR_CATEGORIES.VALUE,
      ERROR_SEVERITY.CRIT,
      MODULE_IDS.IMMUNITY,
      ERROR_CODES.INVALID_VALUE,
      { message: `Report contains no finding ${findingId}`, findingId }
    );
  }
  return finding;
}

// ─── Output helpers ──────────────────────────────────────────────────────────

function writeOutput(content, outputPath) {
  if (outputPath) {
    fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
    fs.writeFileSync(outputPath, content, "utf8");
  } else {
    process.stdout.write(content);
  }
}

function writeError(bytecode) {
  process.stderr.write(bytecode + "\n");
}

function reportExitCode(report, failOnFindings) {
  if (!report) return 2;
  if (report.findings && report.findings.length > 0 && failOnFindings) return 1;
  if (report.status === "PARTIAL" || report.status === "INCONCLUSIVE") return 3;
  return 0;
}

function renderReport(report, options) {
  if (options.format === "json") {
    return stableStringify(report) + "\n";
  }
  if (options.format === "bytecode") {
    return report.bytecode + "\n";
  }
  return renderHuman(report, { noColor: options.noColor });
}

function renderPlan(plan, options) {
  if (options.format === "json") {
    return stableStringify(plan) + "\n";
  }
  if (options.format === "bytecode") {
    return "PB-CLERI-v2-PLAN-not-yet-encoded\n";
  }

  const lines = [];
  lines.push("Cleri Probe Plan");
  lines.push("==================");
  lines.push(`Profile: ${plan.profileId}@${plan.version}`);
  lines.push(`Supported: ${plan.supported}`);
  if (plan.reasonCode) lines.push(`Reason: ${plan.reasonCode}`);
  lines.push(`Pathology classes: ${plan.pathologyClasses.join(", ") || "(none)"}`);
  lines.push(`Verifier ids: ${plan.verifierIds.join(", ") || "(none)"}`);
  lines.push(`Counterchecks: ${plan.counterchecks.join(", ") || "(none)"}`);
  lines.push(`Scopes: ${plan.paths.join(", ") || "."}`);
  return lines.join("\n") + "\n";
}

// ─── Command handlers ────────────────────────────────────────────────────────

async function runInvestigate(args) {
  const hypothesis = args.positional.join(" ");
  const options = args.options;

  if (options.planOnly) {
    const plan = compileInvestigationPlan(hypothesis, { paths: options.scopes });
    writeOutput(renderPlan(plan, options), options.output);
    return 0;
  }

  const runtime = createRuntime();
  const result = await runtime.investigate({
    hypothesis,
    scopes: options.scopes,
    excludes: options.excludes,
    detectorIds: options.detectors,
    includeTests: options.includeTests,
    includeGenerated: options.includeGenerated,
    noCache: options.noCache,
    maxCandidates: DEFAULT_MAX_CANDIDATES,
    maxRuntimeMs: DEFAULT_MAX_RUNTIME_MS
  });

  writeOutput(renderReport(result.report, options), options.output);
  return reportExitCode(result.report, options.failOnFindings);
}

async function runExplain(args) {
  const options = args.options;
  const report = loadReport(options.report);
  const finding = findFinding(report, args.positional[0]);

  if (options.format === "json") {
    writeOutput(stableStringify({
      reportId: report.reportId,
      finding,
      coverage: report.coverage,
      diagnostics: report.diagnostics
    }) + "\n", options.output);
  } else if (options.format === "bytecode") {
    writeOutput(report.bytecode + "\n", options.output);
  } else {
    writeOutput(renderExplain(report, finding, { noColor: options.noColor }), options.output);
  }

  return 0;
}

/**
 * Recomputes the report's identity and reloads the source the finding covers.
 *
 * A report can be intact and still no longer true: the checksum proves nobody
 * edited the report, and the excerpt digest proves the code it points at has not
 * moved underneath it. Evidence is only reproducible when both hold.
 */
function verifyFinding(report, finding) {
  const recomputedChecksum = checksumInvestigationReport(report);
  const recomputedBytecode = encodeCleriReportIdentity({ ...report, checksum: recomputedChecksum });
  const recomputedFindingId = buildFindingId(finding);

  const checksumValid = recomputedChecksum === report.checksum;
  const bytecodeValid = recomputedBytecode === report.bytecode;
  const findingIdValid = recomputedFindingId === finding.findingId;

  const span = finding.span || {};
  let substrateDrift = null;

  if (span.excerptDigest) {
    let content = null;
    try {
      content = fs.readFileSync(path.resolve(process.cwd(), span.path), "utf8");
    } catch {
      substrateDrift = "SOURCE_UNREADABLE";
    }

    if (content !== null) {
      const excerpt = readSpanExcerpt(content, span);
      if (excerpt === null) {
        substrateDrift = "SPAN_OUT_OF_RANGE";
      } else if (sha256Hex(excerpt) !== span.excerptDigest) {
        substrateDrift = "EXCERPT_CHANGED";
      }
    }
  } else {
    substrateDrift = "NO_EXCERPT_DIGEST";
  }

  const reproducible = checksumValid && bytecodeValid && findingIdValid && substrateDrift === null;

  return {
    reportId: report.reportId,
    findingId: finding.findingId,
    checksumValid,
    bytecodeValid,
    findingIdValid,
    substrateDrift,
    reproducible
  };
}

async function runVerify(args) {
  const options = args.options;
  const report = loadReport(options.report);
  const finding = findFinding(report, args.positional[0]);
  const verification = verifyFinding(report, finding);

  if (options.format === "json") {
    writeOutput(stableStringify(verification) + "\n", options.output);
  } else if (options.format === "bytecode") {
    // The bytecode identifies the report and carries the verification state; it
    // never stands in for the evidence itself.
    writeOutput(
      `${report.bytecode} ${verification.reproducible ? "REPRODUCIBLE" : "NOT_REPRODUCIBLE"}\n`,
      options.output
    );
  } else {
    writeOutput(renderVerification(verification, { noColor: options.noColor }), options.output);
  }

  return verification.reproducible ? 0 : 3;
}

async function runGraduate() {
  const error = notAvailableError("graduate");
  writeError(error.bytecode);
  return 3;
}

async function runDetectors(args) {
  const registry = createProductionRegistry();
  const detectors = [];
  for (const verifier of registry.verifiers.values()) {
    detectors.push({
      id: verifier.id,
      version: verifier.version,
      pathologyClass: verifier.pathologyClass,
      supportingPredicates: verifier.supportingPredicates || [],
      counterchecks: verifier.counterchecks || [],
      limitations: verifier.limitations || []
    });
  }
  detectors.sort((a, b) => a.id.localeCompare(b.id));

  if (args.options.json) {
    writeOutput(stableStringify(detectors) + "\n", args.options.output);
  } else {
    const lines = ["Installed detectors", "==================="];
    if (detectors.length === 0) {
      lines.push("No detectors are installed in this foundation phase.");
    } else {
      for (const d of detectors) {
        lines.push(`${d.id}@${d.version} [${d.pathologyClass}]`);
        lines.push(`  supporting: ${d.supportingPredicates.join(", ") || "(none)"}`);
        lines.push(`  counterchecks: ${d.counterchecks.join(", ") || "(none)"}`);
        lines.push(`  limitations: ${d.limitations.join(", ") || "(none)"}`);
      }
    }
    writeOutput(lines.join("\n") + "\n", args.options.output);
  }

  return 0;
}

async function runBenchmark(args) {
  const runtime = createRuntime();
  const detectorId = args.options.detectors[0] || null;
  const result = await runtime.investigate({
    hypothesis: "leaked event listener subscription missing cleanup",
    scopes: ["tests/qa/fixtures/cleri-probe"],
    includeTests: true,
    detectorIds: detectorId ? [detectorId] : [],
    maxCandidates: DEFAULT_MAX_CANDIDATES,
    maxRuntimeMs: DEFAULT_MAX_RUNTIME_MS
  });

  const summary = {
    durationMs: result.durationMs,
    status: result.status,
    fileCount: result.report?.coverage?.analyzedPaths?.length || 0,
    candidateCount: result.candidates?.length || 0,
    findingCount: result.report?.findings?.length || 0
  };

  if (args.options.json) {
    writeOutput(stableStringify(summary) + "\n", args.options.output);
  } else {
    const lines = [
      "Cleri Probe Benchmark",
      "=====================",
      `Duration:     ${summary.durationMs}ms`,
      `Status:       ${summary.status}`,
      `Files parsed: ${summary.fileCount}`,
      `Findings:     ${summary.findingCount}`
    ];
    writeOutput(lines.join("\n") + "\n", args.options.output);
  }

  return 0;
}

// ─── Public router ───────────────────────────────────────────────────────────

export async function run(args) {
  switch (args.command) {
    case "investigate":
      return runInvestigate(args);
    case "explain":
      return runExplain(args);
    case "verify":
      return runVerify(args);
    case "detectors":
      return runDetectors(args);
    case "benchmark":
      return runBenchmark(args);
    case "graduate":
      return runGraduate(args);
    default:
      throw new BytecodeError(
        ERROR_CATEGORIES.VALUE,
        ERROR_SEVERITY.CRIT,
        MODULE_IDS.IMMUNITY,
        ERROR_CODES.INVALID_FORMAT,
        { message: `Unknown command: ${args.command}` }
      );
  }
}
