#!/usr/bin/env node
/**
 * DIAGNOSTIC CLI — One-shot full-tree scan
 *
 * Walks the working tree from `--root` (defaults to cwd), reads every JS/TS/
 * JSX/JSON file (skipping vendored / build / VCS dirs), runs every diagnostic
 * cell against the file list, persists the report under
 * `.codex/diagnostic-reports/{reportId}.json`, and prints a bytecode-driven summary.
 *
 * Usage:
 *   node codex/core/diagnostic/run-diagnostic.cli.js [options]
 *
 * Options:
 *   --root <dir>           Root directory to scan (default: cwd)
 *   --trigger <name>      Trigger source (manual, ci, github-actions)
 *   --no-prune            Skip stale report pruning
 *   --format <mode>       Output format: standard (default), bytecode, minimal
 *   --priority <level>    Coverage filter: all (default), high, medium
 *   --filter <cell>        Only run specific cell (e.g. TEST_COVERAGE)
 *   --max-files <n>        Max readable source files before failing (default: 10000)
 *   --max-file-bytes <n>   Max bytes per readable source file (default: 1000000)
 *   --max-total-bytes <n>  Max aggregate source bytes before failing (default: 100000000)
 *   --write-memory         Build BytecodeXP/QBIT memory write payloads for scan findings
 *   --memory-include-health Include passing health signals in memory payloads
 *   --memory-max <n>       Max memory artifacts to write or emit (default: 32)
 *
 * Determinism contract: same tree → same {totalErrors, totalHealth, criticalViolations}.
 * timestamps in the report are envelope-only and excluded from the checksum.
 *
 * Bytecode-aware output demonstrates the full power of PB-OK-v1-* signals.
 */

import path from 'node:path';
import { promises as fs } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

import { getAvailableCells, runDiagnostic } from './diagnostic-runner.js';
import { createFilesystemFileSource, DEFAULT_SCAN_LIMITS } from './diagnostic-file-source.js';
import { writeReport, pruneReports } from './persistence.js';
import { INFUSED_ANTIGENS } from '../immunity/clerical-raid.substrate.js';

const FORMAT_VALUES = new Set(['standard', 'bytecode', 'minimal']);
const PRIORITY_VALUES = new Set(['all', 'high', 'medium']);
const DEFAULT_MEMORY_DIR = '.codex/diagnostic-memory';

// ─── Git Helpers ──────────────────────────────────────────────────────────────

function tryCommitHash(rootDir) {
  try {
    return execSync('git rev-parse HEAD', { cwd: rootDir, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
      .slice(0, 12);
  } catch {
    return 'unknown';
  }
}

// ─── Args ─────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = { 
    root: process.cwd(), 
    trigger: 'manual', 
    prune: true,
    format: 'standard',
    priority: 'all',
    filter: null,
    maxFiles: DEFAULT_SCAN_LIMITS.maxFiles,
    maxFileBytes: DEFAULT_SCAN_LIMITS.maxFileBytes,
    maxTotalBytes: DEFAULT_SCAN_LIMITS.maxTotalBytes,
    writeMemory: false,
    memoryIncludeHealth: false,
    memoryMax: 32,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--root') args.root = path.resolve(argv[++i]);
    else if (a === '--trigger') args.trigger = argv[++i];
    else if (a === '--no-prune') args.prune = false;
    else if (a === '--format') args.format = argv[++i];
    else if (a === '--priority') args.priority = argv[++i];
    else if (a === '--filter') args.filter = argv[++i];
    else if (a === '--max-files') args.maxFiles = Number(argv[++i]);
    else if (a === '--max-file-bytes') args.maxFileBytes = Number(argv[++i]);
    else if (a === '--max-total-bytes') args.maxTotalBytes = Number(argv[++i]);
    else if (a === '--write-memory') args.writeMemory = true;
    else if (a === '--memory-include-health') args.memoryIncludeHealth = true;
    else if (a === '--memory-max') args.memoryMax = Number(argv[++i]);
  }
  validateArgs(args);
  return args;
}

function validateArgs(args) {
  if (!FORMAT_VALUES.has(args.format)) {
    throw new Error(`Invalid --format "${args.format}". Expected one of: ${[...FORMAT_VALUES].join(', ')}`);
  }
  if (!PRIORITY_VALUES.has(args.priority)) {
    throw new Error(`Invalid --priority "${args.priority}". Expected one of: ${[...PRIORITY_VALUES].join(', ')}`);
  }
  if (!Number.isInteger(args.maxFiles) || args.maxFiles < 1) {
    throw new Error(`Invalid --max-files "${args.maxFiles}". Expected a positive integer.`);
  }
  if (!Number.isInteger(args.maxFileBytes) || args.maxFileBytes < 1) {
    throw new Error(`Invalid --max-file-bytes "${args.maxFileBytes}". Expected a positive integer.`);
  }
  if (!Number.isInteger(args.maxTotalBytes) || args.maxTotalBytes < 1) {
    throw new Error(`Invalid --max-total-bytes "${args.maxTotalBytes}". Expected a positive integer.`);
  }
  if (!Number.isInteger(args.memoryMax) || args.memoryMax < 1) {
    throw new Error(`Invalid --memory-max "${args.memoryMax}". Expected a positive integer.`);
  }
  if (args.filter) {
    const available = new Set(getAvailableCells().map(cell => cell.id));
    if (!available.has(args.filter)) {
      throw new Error(`Invalid --filter "${args.filter}". Expected one of: ${[...available].join(', ')}`);
    }
  }
}

// ─── Pretty-print ─────────────────────────────────────────────────────────────

import chalk from 'chalk';

function printSummary(report, options = {}) {
  const { summary, violations, passing, checksum } = report;
  const priority = options.priority || 'all';

  const sealStatus = summary.criticalViolations > 0
    ? chalk.red.bold('TORN')
    : chalk.green.bold('SEALED');

  console.log('');
  console.log(`   ${chalk.bold('SEAL STATUS:')} ${sealStatus} — ${summary.criticalViolations} critical violations require resolution`);
  console.log('');
  console.log(`   ${chalk.bold('BYTECODE DIAGNOSTIC SUMMARY')}`);
  console.log(`   ${chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━')}`);
  console.log('');

  // Health Signals
  console.log(`   ${chalk.bold('PB-OK-v1-* HEALTH SIGNALS:')}`);
  const healthCounts = passing.reduce((acc, h) => {
    const code = h.code || h.bytecode;
    if (code) {
      acc[code] = (acc[code] || 0) + 1;
    }
    return acc;
  }, {});

  Object.entries(healthCounts).forEach(([code, count]) => {
    console.log(`   ├── ${chalk.green(code.padEnd(35))} ${count}`.padEnd(10));
  });
  console.log('');

  // Critical Violations
  console.log(`   ${chalk.bold(`PB-ERR-v1-* CRITICAL VIOLATIONS (${summary.criticalViolations}):`)}`);
  const criticalViolations = violations.filter(v => v.severity === 'CRIT' || v.severity === 'FATAL');
  const violationsByCode = criticalViolations.reduce((acc, v) => {
    const code = v.code || v.bytecode;
    if (!acc[code]) {
      acc[code] = [];
    }
    acc[code].push(v);
    return acc;
  }, {});

  Object.entries(violationsByCode).forEach(([code, a_violations]) => {
    console.log(`   ├── ${chalk.red(code)} (${a_violations.length} files)`);
    a_violations.forEach(v => {
      const violationPath = v.context.path || v.context.sourceFile;
      const line = v.context.line || '';
      console.log(`   │     ${chalk.yellow(violationPath || '')}:${chalk.cyan(line)}`);
    });
  });
  console.log('');

  // Coverage Debt
  const coverageDebt = violations.filter(v => (
    v.context.layer === 'coverage' &&
    (priority === 'all' || v.context.priority === priority.toUpperCase())
  ));
  if (coverageDebt.length > 0) {
    console.log(`   ${chalk.bold(`COVERAGE DEBT (${coverageDebt.length} → triage needed):`)}`);
    const highValuePaths = coverageDebt.filter(v => v.context.priority === 'HIGH');
    const mediumValuePaths = coverageDebt.filter(v => v.context.priority === 'MEDIUM');
    
    if (highValuePaths.length > 0) {
      printCoverageGroup(highValuePaths, 'HIGH');
    }
    if (mediumValuePaths.length > 0) {
      printCoverageGroup(mediumValuePaths, 'MEDIUM');
    }
    if (priority === 'all') {
      console.log(`       ${chalk.yellow('Use --priority high to filter')}`);
    }
    console.log('');
  }

  // Antigens
  console.log(`   ${chalk.bold(`ANTIGENS: ${INFUSED_ANTIGENS.length} (from Clerical RAID)`)}`);
  INFUSED_ANTIGENS.forEach(antigen => {
    console.log(`   ├── ${chalk.cyan(antigen.title)}`);
  });
  console.log('');
  
  console.log(`   ${chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━')}`);
  console.log(`   ${chalk.bold('Sha16:')} ${checksum}`);
  console.log('');
}

function printCoverageGroup(items, priority) {
  const paths = items
    .map(v => v.context.path || v.context.sourceFile || v.context.moduleId || 'unknown')
    .sort((a, b) => a.localeCompare(b));

  console.log(`   ├── ${chalk.yellow(`${priority} VALUE`)} ${paths.length} file${paths.length === 1 ? '' : 's'}`);
  for (const filePath of paths.slice(0, 8)) {
    console.log(`   │     ${filePath}`);
  }
  if (paths.length > 8) {
    console.log(`   │     ... ${paths.length - 8} more`);
  }
}

function printBytecode(report) {
  for (const health of report.passing) {
    console.log(`PB-DIAG-LINE-v1 HEALTH ${health.cellId || 'UNKNOWN'} ${health.checkId || 'UNKNOWN'} ${health.code || health.bytecode || 'UNKNOWN'} ${health.checksum || 'no-checksum'}`);
  }
  for (const violation of report.violations) {
    const code = violation.code || violation.bytecode || 'UNKNOWN';
    const location = violation.context?.path || violation.context?.sourceFile || 'unknown';
    const token = violation.checksum || violation.errorCode || 'no-token';
    console.log(`PB-DIAG-LINE-v1 ERROR ${violation.severity || 'UNKNOWN'} ${code} ${location} ${token}`);
  }
  console.log(`PB-DIAG-LINE-v1 SUMMARY ${report.checksum} errors=${report.summary.totalErrors} health=${report.summary.totalHealth} critical=${report.summary.criticalViolations}`);
}

function printMinimal(report, outPath) {
  const status = report.summary.criticalViolations > 0 ? 'TORN' : 'SEALED';
  const memory = report.memoryInfusion
    ? ` memory=${report.memoryInfusion.written}/${report.memoryInfusion.requestedArtifacts}`
    : '';
  console.log(
    `PB-DIAG ${status} checksum=${report.checksum} critical=${report.summary.criticalViolations} ` +
    `errors=${report.summary.totalErrors} health=${report.summary.totalHealth}${memory} report=${outPath}`,
  );
}

function printReport(report, { format, priority, outPath }) {
  if (format === 'bytecode') {
    printBytecode(report);
    return;
  }
  if (format === 'minimal') {
    printMinimal(report, outPath);
    return;
  }
  printSummary(report, { priority });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const startedAt = Date.now(); // EXEMPT — wall-clock for elapsed-time printout, not computation

  console.error(`[diagnostic] scanning ${args.root}`);
  const fileSource = createFilesystemFileSource({
    rootDir: args.root,
    limits: {
      maxFiles: args.maxFiles,
      maxFileBytes: args.maxFileBytes,
      maxTotalBytes: args.maxTotalBytes,
    },
  });

  const commitHash = tryCommitHash(args.root);
  const report = await runDiagnostic({
    snapshot: { root: args.root, timestamp: startedAt },
    fileSource,
    commitHash,
    trigger: args.trigger,
    cellFilter: args.filter ? [args.filter] : null,
    memoryInfusion: args.writeMemory
      ? {
        enabled: true,
        dryRun: true,
        maxArtifacts: args.memoryMax,
        includePassing: args.memoryIncludeHealth,
        agentId: 'diagnostic-cli',
      }
      : null,
  });

  const outPath = await writeReport({ rootDir: args.root, report });
  console.error(`[diagnostic] wrote ${outPath}`);

  if (report.memoryInfusion) {
    const manifestPath = await writeMemoryManifest({ rootDir: args.root, report });
    console.error(`[diagnostic] wrote memory manifest ${manifestPath}`);
  }

  if (args.prune) {
    const { pruned } = await pruneReports({ rootDir: args.root });
    if (pruned.length > 0) {
      console.error(`[diagnostic] pruned ${pruned.length} stale report(s)`);
    }
  }

  printReport(report, { format: args.format, priority: args.priority, outPath });

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(2); // EXEMPT — elapsed-time display only
  console.error(`[diagnostic] done in ${elapsed}s`);

  // Phase 4: CI Integration — fail if critical violations exist
  if (args.trigger === 'ci' || args.trigger === 'github-actions') {
    const critical = report.summary.criticalViolations || 0;
    if (critical > 0) {
      console.error(`[diagnostic:ci] FAILURE: ${critical} critical violations detected.`);
      process.exit(1);
    }
    console.error('[diagnostic:ci] PASS: No critical violations detected.');
  }
}

async function writeMemoryManifest({ rootDir, report }) {
  const dir = path.join(rootDir, DEFAULT_MEMORY_DIR);
  await fs.mkdir(dir, { recursive: true });
  const out = path.join(dir, `${report.reportId}.json`);
  await fs.writeFile(out, JSON.stringify(report.memoryInfusion, null, 2) + '\n', 'utf8');
  return out;
}

// Run if invoked directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error('[diagnostic] fatal:', err.stack || err.message);
    process.exit(1);
  });
}
