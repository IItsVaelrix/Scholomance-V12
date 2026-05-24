/**
 * DIAGNOSTIC RUNNER — Cell Orchestrator
 *
 * Runs all registered diagnostic cells against a codebase snapshot,
 * aggregates results, and returns a complete DiagnosticReport.
 *
 * Design constraint: stateless and idempotent.
 * Same CodebaseSnapshot always produces the same ScanResult.
 *
 * Reference: PDR-2026-05-09-DIAGNOSTIC-CELL-INFRASTRUCTURE
 */

import * as immunityScan from './cells/immunity-scan.cell.js';
import * as layerBoundaryScan from './cells/layer-boundary.cell.js';
import * as testCoverageScan from './cells/test-coverage.cell.js';
import * as fixtureShapeScan from './cells/fixture-shape.cell.js';
import * as processorBridgeScan from './cells/processor-bridge.cell.js';
import { generateDiagnosticReport } from './DiagnosticReport.js';
import { maybeRunDiagnosticSynthesis } from './CleriRaidMind.js';

export const CELL_IDS = Object.freeze({
  IMMUNITY_SCAN: 'IMMUNITY_SCAN',
  LAYER_BOUNDARY: 'LAYER_BOUNDARY',
  TEST_COVERAGE: 'TEST_COVERAGE',
  FIXTURE_SHAPE: 'FIXTURE_SHAPE',
  PROCESSOR_BRIDGE: 'PROCESSOR_BRIDGE',
});

/**
 * Cell registry. Maps cell ID to module with scan function + metadata.
 */
const CELL_MODULES = {
  [CELL_IDS.IMMUNITY_SCAN]: immunityScan,
  [CELL_IDS.LAYER_BOUNDARY]: layerBoundaryScan,
  [CELL_IDS.TEST_COVERAGE]: testCoverageScan,
  [CELL_IDS.FIXTURE_SHAPE]: fixtureShapeScan,
  [CELL_IDS.PROCESSOR_BRIDGE]: processorBridgeScan,
};

const REQUIRED_CELL_EXPORTS = ['CELL_ID', 'CELL_NAME', 'CELL_DESCRIPTION', 'CELL_SCHEDULE', 'scan'];

/**
 * Validate cell module against the interface contract (white paper §11).
 * Throws on any missing required export.
 */
function assertCellInterface(id, mod) {
  const missing = REQUIRED_CELL_EXPORTS.filter(k => mod[k] === undefined);
  if (missing.length > 0) {
    throw new Error(
      `[diagnostic-runner] Cell ${id} is missing required exports: ${missing.join(', ')}. ` +
      `White paper §11 requires every cell to export ${REQUIRED_CELL_EXPORTS.join(', ')}.`,
    );
  }
  if (typeof mod.scan !== 'function') {
    throw new Error(`[diagnostic-runner] Cell ${id}.scan must be a function, got ${typeof mod.scan}`);
  }
}

/** @type {Array<{id: string, scan: function, name: string, description: string, schedule: string}>} */
const CELLS = Object.entries(CELL_MODULES).map(([id, mod]) => {
  assertCellInterface(id, mod);
  return {
    id,
    scan: mod.scan,
    name: mod.CELL_NAME,
    description: mod.CELL_DESCRIPTION,
    schedule: mod.CELL_SCHEDULE,
  };
});

/**
 * Run a single cell scan.
 *
 * @param {object} cell
 * @param {object} snapshot
 * @param {Array<{content: string, path: string}>} files
 * @returns {Promise<{cellId: string, errors: [], health: [], skipped: []}>}
 */
async function runCell(cell, snapshot, files) {
  try {
    const result = await cell.scan(snapshot, files);
    return {
      cellId: cell.id,
      errors: result.errors || [],
      health: result.health || [],
      skipped: result.skipped || [],
      cellError: null,
    };
  } catch (error) {
    // Cell crashed — surface as a first-class cellError, distinct from
    // per-check `skipped`. The runner stays alive so other cells finish.
    console.error(`[diagnostic-runner] Cell ${cell.id} crashed:`, error.message);
    return {
      cellId: cell.id,
      errors: [],
      health: [],
      skipped: [],
      cellError: { cellId: cell.id, message: error.message, stack: error.stack || null },
    };
  }
}

/**
 * Run all diagnostic cells against the provided files.
 *
 * @param {object} snapshot
 * @param {Array<{content: string, path: string}>} files
 * @param {object} options
 * @param {string} [options.commitHash='unknown']
 * @param {string} [options.trigger='manual']
 * @param {string[]} [options.cellFilter] - Run only these cell IDs
 * @returns {Promise<object>} Complete diagnostic report
 */
export async function runDiagnostic({ snapshot, files = [], commitHash = 'unknown', trigger = 'manual', cellFilter = null }) {
  const cellsToRun = cellFilter
    ? CELLS.filter(c => cellFilter.includes(c.id))
    : CELLS;

  // Run all cells in parallel
  const results = await Promise.all(
    cellsToRun.map(cell => runCell(cell, snapshot, files))
  );

  // Generate the report
  const report = generateDiagnosticReport({
    commitHash,
    trigger,
    cellResults: results,
  });

  // Stage 2: shadow-mode synthesis — observes without enforcing.
  // Stage 3: warn mode — emits structured stderr warnings when mind is not coherent.
  // Mode is controlled by CLERI_RAID_SYNTHESIS_MODE (off|shadow|warn|gate).
  // Defaults to shadow. The synthesis result is metadata only and is excluded
  // from the report checksum per the determinism contract.
  const synthesisMode = process.env.CLERI_RAID_SYNTHESIS_MODE ?? 'shadow';
  if (synthesisMode !== 'off') {
    report.synthesis = maybeRunDiagnosticSynthesis({
      enabled: true,
      mode: synthesisMode,
      snapshot: buildSynthesisSnapshot(results),
    });

    if (synthesisMode === 'warn' && report.synthesis?.warning) {
      emitSynthesisWarning(report.synthesis.mind);
    }
  }

  return report;
}

/**
 * Run a specific cell by ID.
 *
 * @param {string} cellId
 * @param {object} snapshot
 * @param {Array<{content: string, path: string}>} files
 * @returns {Promise<{cellId: string, errors: [], health: [], skipped: []}>}
 */
export async function runCellById(cellId, snapshot, files) {
  const cell = CELLS.find(c => c.id === cellId);
  if (!cell) {
    throw new Error(`Unknown cell: ${cellId}. Available: ${CELLS.map(c => c.id).join(', ')}`);
  }
  return runCell(cell, snapshot, files);
}

/**
 * Get list of available cells.
 *
 * @returns {Array<{id: string, name: string, description: string, schedule: string}>}
 */
export function getAvailableCells() {
  return CELLS.map(cell => ({
    id: cell.id,
    name: cell.name || cell.id,
    description: cell.description || '',
    schedule: cell.schedule || 'manual',
  }));
}

// ─── Synthesis Stage 2 — Shadow Mode Wiring ───────────────────────────────────

/**
 * Maps each diagnostic cell to the synthesis signal keys it can supply.
 * Signals that have no cell mapping will be absent from the snapshot,
 * which causes the synthesis to classify them as missing — the expected
 * shadow-mode behavior until dedicated signal producers are added.
 */
const CELL_SIGNAL_MAP = Object.freeze({
  // BYTECODE_INTEGRITY_COMPLEX + AUTH_HANDSHAKE_COMPLEX (security signals)
  // A clean immunity scan means no forbidden patterns or pathogens → auth sender and
  // CSRF boundary are structurally sound, bytecode is decodable and schema-valid.
  IMMUNITY_SCAN: [
    'BYTECODE_DECODABLE',
    'BYTECODE_SCHEMA_VALID',
    'AUTH_SENDER_MATCH',
    'CSRF_BOUNDARY_HEALTH',
  ],

  // UI_STATE_COHERENCE_COMPLEX + AUTH_HANDSHAKE_COMPLEX (layer integrity signals)
  // Clean layer boundaries → route/view/cursor/overlay state is coherent, identity
  // proof is valid (no forbidden cross-layer auth code).
  LAYER_BOUNDARY: [
    'ROUTE_STATE_HEALTH',
    'VIEW_STATE_HEALTH',
    'CURSOR_STATE_HEALTH',
    'OVERLAY_STATE_HEALTH',
    'IDENTITY_PROOF_VALID',
  ],

  // AUTH_HANDSHAKE_COMPLEX + BYTECODE_INTEGRITY_COMPLEX (coverage signals)
  // Test coverage proves session continuity and bytecode provenance.
  TEST_COVERAGE: [
    'BYTECODE_PROVENANCE_VALID',
    'SESSION_CONTINUITY',
  ],

  // BYTECODE_INTEGRITY_COMPLEX — fixture quality proves checksum integrity.
  FIXTURE_SHAPE: ['BYTECODE_CHECKSUM_VALID'],

  // BYTECODE_INTEGRITY_COMPLEX — no bridge crossings = bytecode is decodable end-to-end.
  // Min-wins with IMMUNITY_SCAN for BYTECODE_DECODABLE.
  PROCESSOR_BRIDGE: ['BYTECODE_DECODABLE'],
});

/**
 * Derive a 0..1 health score from a single cell result.
 *
 * @param {{cellError: object|null, health: any[], errors: any[]}} result
 * @returns {number}
 */
function computeCellHealthScore(result) {
  if (result.cellError) return 0;
  const pass = result.health.length;
  const fail = result.errors.length;
  if (pass === 0 && fail === 0) return 0.5;
  if (fail === 0) return 1;
  return pass / (pass + fail);
}

/**
 * Build a synthesis signal snapshot from raw cell results.
 * When multiple cells map to the same signal key the minimum score wins —
 * the synthesis should not be falsely confident if any scan path degrades.
 *
 * @param {Array<{cellId: string, cellError: object|null, health: any[], errors: any[]}>} cellResults
 * @returns {Record<string, number>}
 */
/**
 * Emit a structured warn-mode synthesis warning to stderr.
 * Format matches PDR section 10.7 example output.
 *
 * @param {object} mind - CleriRaidMind result
 */
function emitSynthesisWarning(mind) {
  const primaryFault = mind.primaryFaults[0];
  const topAction = mind.nextDebugActions[0];

  const lines = [
    `[CLERI_RAID_MIND] state=${mind.mindState} health=${mind.globalHealth}`,
  ];

  if (primaryFault) {
    lines.push(`primaryFault=${primaryFault.complexId}.${primaryFault.subunitId} state=${primaryFault.state}`);
  }

  if (topAction) {
    lines.push(`action=${topAction.action} complex=${topAction.complexId}.${topAction.subunitId}`);
  }

  const unstable = mind.qbitPayload?.unstableComplexes ?? [];
  if (unstable.length > 0) {
    lines.push(`unstableComplexes=${unstable.join(',')}`);
  }

  console.error(lines.join('\n'));
}

export function buildSynthesisSnapshot(cellResults) {
  const snapshot = {};

  for (const result of cellResults) {
    const signals = CELL_SIGNAL_MAP[result.cellId];
    if (!signals) continue;

    const score = computeCellHealthScore(result);

    for (const signalKey of signals) {
      snapshot[signalKey] = signalKey in snapshot
        ? Math.min(snapshot[signalKey], score)
        : score;
    }
  }

  return snapshot;
}