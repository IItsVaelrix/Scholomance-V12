/**
 * DIAGNOSTIC MCP HELPERS — Phase 3 wiring
 *
 * Surfaces the diagnostic substrate (codex/core/diagnostic/) to AI agents via
 * MCP tool calls. These helpers wrap the persistence + runner with thin,
 * AI-friendly query semantics. The MCP bridge in mcp-bridge.js delegates to
 * these functions.
 *
 * Reference: PDR-2026-05-09-DIAGNOSTIC-CELL-INFRASTRUCTURE §5.2 +
 *            VERDICT-2026-05-09-DIAGNOSTIC-CELL-INFRASTRUCTURE §7 (90-day item).
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { runDiagnostic } from '../../core/diagnostic/diagnostic-runner.js';
import {
  readReport,
  reportPath,
  DEFAULT_REPORTS_DIR,
  timestampFromReportId,
} from '../../core/diagnostic/persistence.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..', '..');

// ─── Report Index ─────────────────────────────────────────────────────────────

async function listReportIds(rootDir = ROOT) {
  const dir = path.join(rootDir, DEFAULT_REPORTS_DIR);
  let entries;
  try {
    entries = await fs.readdir(dir);
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
  return entries
    .filter(n => n.endsWith('.json'))
    .map(n => n.replace(/\.json$/, ''))
    .filter(id => timestampFromReportId(id) !== null)
    .sort((a, b) => (timestampFromReportId(b) || 0) - (timestampFromReportId(a) || 0));
}

// ─── Public MCP-callable functions ────────────────────────────────────────────

/**
 * `diagnostic_get_latest_report` — return the most recent persisted report.
 * If no reports exist, returns `null` (not an error).
 *
 * @returns {Promise<object|null>}
 */
export async function getLatestReport() {
  const ids = await listReportIds();
  if (ids.length === 0) return null;
  return readReport({ rootDir: ROOT, reportId: ids[0] });
}

/**
 * `diagnostic_get_report_by_id` — return a specific report or `null`.
 *
 * @param {{reportId: string}} params
 * @returns {Promise<object|null>}
 */
export async function getReportById({ reportId }) {
  if (!reportId || !/^PB-DIAG-v1-/.test(reportId)) {
    throw new Error(`Invalid reportId: ${reportId}. Expected format PB-DIAG-v1-{timestamp}-{rand4}.`);
  }
  return readReport({ rootDir: ROOT, reportId });
}

/**
 * `diagnostic_query_violations` — filter the latest report's violations.
 * All filters are AND-combined and optional.
 *
 * @param {{cell?: string, severity?: 'FATAL'|'CRIT'|'WARN'|'INFO', layer?: string, ruleId?: string, limit?: number}} params
 * @returns {Promise<{reportId: string|null, count: number, violations: object[]}>}
 */
export async function queryViolations({ cell, severity, layer, ruleId, limit = 100 } = {}) {
  const report = await getLatestReport();
  if (!report) return { reportId: null, count: 0, violations: [] };
  const filtered = (report.violations || []).filter(v => {
    if (severity && v.severity !== severity) return false;
    if (layer && v.context?.layer !== layer) return false;
    if (ruleId && v.context?.ruleId !== ruleId) return false;
    if (cell && v.context?.cellId !== cell && v.context?.layer !== cell) return false;
    return true;
  });
  return {
    reportId: report.reportId,
    count: filtered.length,
    violations: filtered.slice(0, limit),
  };
}

/**
 * `diagnostic_query_health` — filter the latest report's health signals.
 *
 * @param {{cellId?: string, checkId?: string, moduleId?: string, limit?: number}} params
 * @returns {Promise<{reportId: string|null, count: number, health: object[]}>}
 */
export async function queryHealth({ cellId, checkId, moduleId, limit = 100 } = {}) {
  const report = await getLatestReport();
  if (!report) return { reportId: null, count: 0, health: [] };
  const filtered = (report.passing || []).filter(h => {
    if (cellId && h.cellId !== cellId) return false;
    if (checkId && h.checkId !== checkId) return false;
    if (moduleId && h.moduleId !== moduleId && h.context?.moduleId !== moduleId) return false;
    return true;
  });
  return {
    reportId: report.reportId,
    count: filtered.length,
    health: filtered.slice(0, limit),
  };
}

/**
 * `diagnostic_run_cells` — execute one or more cells against an in-memory file
 * list. Does NOT persist (the report is returned to the caller for inline
 * consumption). For a persisted scan use the `diagnostic:scan` CLI.
 *
 * @param {{files: Array<{path: string, content: string}>, cellFilter?: string[], commitHash?: string, trigger?: string}} params
 * @returns {Promise<object>}
 */
export async function runCells({ files = [], cellFilter = null, commitHash = 'mcp-inline', trigger = 'mcp' } = {}) {
  if (!Array.isArray(files)) {
    throw new Error('runCells: `files` must be an array of { path, content } records');
  }
  return runDiagnostic({
    snapshot: { root: ROOT, timestamp: Date.now() }, // EXEMPT — envelope metadata
    files,
    commitHash,
    trigger,
    cellFilter,
  });
}

/**
 * `diagnostic_summary` — quick at-a-glance numbers from the latest report
 * (for AI agents that just want to know if anything is on fire before drilling
 * deeper). Cheaper than fetching a full report payload.
 *
 * @returns {Promise<{reportId: string|null, summary: object|null, cells: string[]|null, recentReportIds: string[]}>}
 */
export async function summary() {
  const report = await getLatestReport();
  const recent = await listReportIds();
  if (!report) {
    return { reportId: null, summary: null, cells: null, recentReportIds: recent };
  }
  return {
    reportId: report.reportId,
    summary: report.summary,
    cells: report.cells,
    timestamp: report.timestamp,
    commitHash: report.commitHash,
    checksum: report.checksum,
    recentReportIds: recent.slice(0, 20),
  };
}
