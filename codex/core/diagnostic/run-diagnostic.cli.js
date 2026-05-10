#!/usr/bin/env node
/**
 * DIAGNOSTIC CLI — One-shot full-tree scan
 *
 * Walks the working tree from `--root` (defaults to cwd), reads every JS/TS/
 * JSX/JSON file (skipping vendored / build / VCS dirs), runs every diagnostic
 * cell against the file list, persists the report under
 * `.codex/diagnostic-reports/{reportId}.json`, and prints a summary.
 *
 * Usage:
 *   node codex/core/diagnostic/run-diagnostic.cli.js [--root <dir>] [--trigger <name>] [--no-prune]
 *
 * Determinism contract: same tree → same {totalErrors, totalHealth, criticalViolations}.
 * timestamps in the report are envelope-only and excluded from the checksum.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

import { runDiagnostic } from './diagnostic-runner.js';
import { writeReport, pruneReports } from './persistence.js';

// ─── Tree Walk ────────────────────────────────────────────────────────────────

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  '.claude',          // worktrees + agent transcripts — past-state noise
  'dist',
  'build',
  'coverage',
  '.next',
  '.codex',
  '.cache',
  '.turbo',
  '.parcel-cache',
  '.vite',
  'out',
  'tmp',
  'ARCHIVE REFERENCE DOCS',
  'docs',             // canon — not scannable code
  'public',           // static assets
]);

const READABLE_EXT = /\.(m?[jt]sx?|cjs|json)$/;

const MAX_FILE_BYTES = 1_000_000; // 1 MB; skip larger files (corpora, fixtures)

async function walk(rootDir, relDir = '') {
  const out = [];
  const absDir = path.join(rootDir, relDir);
  let entries;
  try {
    entries = await fs.readdir(absDir, { withFileTypes: true });
  } catch {
    return out;
  }

  // Sort by name — readdir order is not portable, and downstream cell
  // outputs depend on iteration order (determinism contract).
  entries.sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    if (entry.name.startsWith('.git') && entry.name !== '.github') continue;
    if (SKIP_DIRS.has(entry.name)) continue;
    const rel = relDir ? `${relDir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      const sub = await walk(rootDir, rel);
      out.push(...sub);
    } else if (entry.isFile() && READABLE_EXT.test(entry.name)) {
      try {
        const stat = await fs.stat(path.join(rootDir, rel));
        if (stat.size > MAX_FILE_BYTES) continue;
        const content = await fs.readFile(path.join(rootDir, rel), 'utf8');
        out.push({ path: rel, content });
      } catch { /* unreadable, skip */ }
    }
  }
  return out;
}

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
  const args = { root: process.cwd(), trigger: 'manual', prune: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--root') args.root = path.resolve(argv[++i]);
    else if (a === '--trigger') args.trigger = argv[++i];
    else if (a === '--no-prune') args.prune = false;
  }
  return args;
}

// ─── Pretty-print ─────────────────────────────────────────────────────────────

function printSummary(report) {
  const { summary, cells, reportId } = report;
  console.log('');
  console.log(`  Diagnostic Report — ${reportId}`);
  console.log(`  Cells:   ${cells.join(', ')}`);
  console.log(`  Errors:  ${summary.totalErrors}  (critical: ${summary.criticalViolations})`);
  console.log(`  Health:  ${summary.totalHealth}`);
  console.log(`  Skipped: ${summary.totalSkipped}`);
  console.log(`  CellErr: ${summary.cellErrors}`);
  console.log(`  Sha16:   ${report.checksum}`);
  console.log('');
  if (summary.cellErrors > 0) {
    console.log('  Cell crashes:');
    for (const ce of report.cellErrors) {
      console.log(`    - ${ce.cellId}: ${ce.message}`);
    }
    console.log('');
  }

  // Top violation breakdown by cell
  const byCell = new Map();
  for (const v of report.violations) {
    const cellId = v.context?.cellId || v.context?.layer || 'UNKNOWN';
    byCell.set(cellId, (byCell.get(cellId) || 0) + 1);
  }
  if (byCell.size > 0) {
    console.log('  Violations by layer:');
    const sorted = [...byCell.entries()].sort((a, b) => b[1] - a[1]);
    for (const [k, n] of sorted) console.log(`    - ${k.padEnd(20)} ${n}`);
    console.log('');
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const startedAt = Date.now(); // EXEMPT — wall-clock for elapsed-time printout, not computation

  console.error(`[diagnostic] scanning ${args.root}`);
  const files = await walk(args.root);
  console.error(`[diagnostic] scanning ${files.length} files`);

  const commitHash = tryCommitHash(args.root);
  const report = await runDiagnostic({
    snapshot: { root: args.root, timestamp: startedAt },
    files,
    commitHash,
    trigger: args.trigger,
  });

  const outPath = await writeReport({ rootDir: args.root, report });
  console.error(`[diagnostic] wrote ${outPath}`);

  if (args.prune) {
    const { pruned } = await pruneReports({ rootDir: args.root });
    if (pruned.length > 0) {
      console.error(`[diagnostic] pruned ${pruned.length} stale report(s)`);
    }
  }

  printSummary(report);

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(2); // EXEMPT — elapsed-time display only
  console.error(`[diagnostic] done in ${elapsed}s`);
}

// Run if invoked directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error('[diagnostic] fatal:', err.stack || err.message);
    process.exit(1);
  });
}
