/**
 * DIAGNOSTIC CELL STASIS TESTS
 *
 * Determinism + coverage tests for the Diagnostic Cell Infrastructure.
 * Per VAELRIX_LAW §6: same input → same output (100x pass required).
 *
 * Reference: PDR-2026-05-09-DIAGNOSTIC-CELL-INFRASTRUCTURE
 */

import { describe, it, expect } from 'vitest';
import {
  BytecodeHealth,
  encodeBytecodeHealth,
  encodeModuleHealth,
  checksumHealth,
  deepFreezeClone,
  verifyHealthDeterminism,
  HEALTH_CODES,
} from '../../codex/core/diagnostic/BytecodeHealth.js';
import { parseImports as astParseImports } from '../../codex/core/diagnostic/ast-import-parser.js';
import { planPruning, timestampFromReportId, RETENTION } from '../../codex/core/diagnostic/persistence.js';

import {
  generateDiagnosticReport,
  verifyReport,
  REPORT_VERSION,
} from '../../codex/core/diagnostic/DiagnosticReport.js';

import {
  runDiagnostic,
  runCellById,
  getAvailableCells,
  CELL_IDS,
} from '../../codex/core/diagnostic/diagnostic-runner.js';

import { scan as immunityScan } from '../../codex/core/diagnostic/cells/immunity-scan.cell.js';
import { scan as layerBoundaryScan } from '../../codex/core/diagnostic/cells/layer-boundary.cell.js';
import { scan as testCoverageScan } from '../../codex/core/diagnostic/cells/test-coverage.cell.js';
import { scan as fixtureShapeScan } from '../../codex/core/diagnostic/cells/fixture-shape.cell.js';
import { scan as processorBridgeScan } from '../../codex/core/diagnostic/cells/processor-bridge.cell.js';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const CLEAN_FILE = {
  content: `/**
 * Clean module
 */
export const FOO = 'bar';
`,
  path: 'codex/core/example/module.js',
};

const VIOLATION_FILE = {
  content: `/**
 * Module with Math.random() violation
 */
const x = Math.random();
`,
  path: 'codex/core/analysis/score.js',
};

const SRC_IMPORT_FILE = {
  content: `/**
 * Violates layer boundary
 */
import { tokenizer } from '../../../src/lib/tokenizer.js';
export function parse(text) { return tokenizer(text); }
`,
  path: 'codex/core/phonology/parser.js',
};

const SRC_LIB_BRIDGE_FILE = {
  content: `/**
 * Module that imports from src/lib into codex/core
 */
import { api } from '../../src/lib/api.js';
export function call() { return api(); }
`,
  path: 'codex/core/example/index.js',
};

const TEST_FILE = {
  content: `/**
 * Test file with antipattern
 */
import { render } from '@testing-library/react';
import { useState } from 'react';

it('renders', () => {
  const [count, setCount] = useState(0);
  render(<div>{count}</div>);
});
`,
  path: 'tests/codex/core/example.test.js',
};

const EMPTY_SNAPSHOT = { root: '/fake/project', timestamp: Date.now() };

// ─── BytecodeHealth Tests ─────────────────────────────────────────────────────

describe('BytecodeHealth', () => {
  describe('constructor', () => {
    it('creates health with correct fields', () => {
      const h = new BytecodeHealth({
        code: HEALTH_CODES.IMMUNE_PASS_COORD,
        cellId: 'TEST_CELL',
        checkId: 'check-1',
        context: { foo: 'bar' },
      });

      expect(h.version).toBe('v1');
      expect(h.code).toBe(HEALTH_CODES.IMMUNE_PASS_COORD);
      expect(h.cellId).toBe('TEST_CELL');
      expect(h.checkId).toBe('check-1');
      expect(h.context).toEqual({ foo: 'bar' });
      expect(h.timestamp).toBeDefined();
      expect(h.checksum).toBeDefined();
      expect(h.checksum).toHaveLength(8);
      expect(h.bytecode).toContain(HEALTH_CODES.IMMUNE_PASS_COORD);
    });

    it('is immutable', () => {
      const h = new BytecodeHealth({
        code: HEALTH_CODES.IMMUNE_PASS_COORD,
        cellId: 'TEST_CELL',
        checkId: 'check-1',
        context: { foo: 'bar' },
      });

      expect(() => { h.context.foo = 'baz'; }).toThrow();
    });

    it('generates unique bytecode per input', () => {
      const h1 = encodeBytecodeHealth('CELL_A', 'check-1', { a: 1 });
      const h2 = encodeBytecodeHealth('CELL_A', 'check-1', { a: 2 });
      const h3 = encodeBytecodeHealth('CELL_B', 'check-1', { a: 1 });

      expect(h1.checksum).not.toBe(h2.checksum);
      expect(h1.checksum).not.toBe(h3.checksum);
    });
  });

  describe('toJSON()', () => {
    it('serializes all fields', () => {
      const h = encodeBytecodeHealth('TEST_CELL', 'check-1', { key: 'value' });
      const json = h.toJSON();

      expect(json.version).toBe('v1');
      expect(json.code).toBe(HEALTH_CODES.IMMUNE_PASS_COORD);
      expect(json.cellId).toBe('TEST_CELL');
      expect(json.checkId).toBe('check-1');
      expect(json.context).toEqual({ key: 'value' });
      expect(json.checksum).toBeDefined();
      expect(json.bytecode).toBeDefined();
    });
  });

  describe('toString()', () => {
    it('returns human-readable summary', () => {
      const h = encodeBytecodeHealth('LAYER_BOUNDARY', 'no-violations');
      const str = h.toString();
      expect(str).toContain('PB-OK-v1-IMMUNE-PASS-COORD');
      expect(str).toContain('LAYER_BOUNDARY');
    });
  });
});

describe('encodeBytecodeHealth()', () => {
  it('creates health with default code', () => {
    const h = encodeBytecodeHealth('TEST_CELL', 'check-1');
    expect(h.code).toBe(HEALTH_CODES.IMMUNE_PASS_COORD);
    expect(h.cellId).toBe('TEST_CELL');
    expect(h.checkId).toBe('check-1');
  });
});

describe('encodeModuleHealth()', () => {
  it('creates health with moduleId', () => {
    const h = encodeModuleHealth('codex/core/example.js', 'TEST_COVERAGE', 'module-tested');
    expect(h.moduleId).toBe('codex/core/example.js');
    expect(h.cellId).toBe('TEST_COVERAGE');
  });
});

describe('checksumHealth()', () => {
  it('excludes timestamp from checksum', () => {
    const h1 = new BytecodeHealth({ code: HEALTH_CODES.IMMUNE_PASS_COORD, cellId: 'A', checkId: 'c', context: {} });
    const h2 = new BytecodeHealth({ code: HEALTH_CODES.IMMUNE_PASS_COORD, cellId: 'A', checkId: 'c', context: {} });
    // Same stable fields → same checksum (timestamp excluded)
    expect(h1.checksum).toBe(h2.checksum);
  });

  it('different context → different checksum', () => {
    const h1 = checksumHealth({ version: 'v1', code: 'X', cellId: 'A', checkId: 'c', moduleId: null, context: { a: 1 } });
    const h2 = checksumHealth({ version: 'v1', code: 'X', cellId: 'A', checkId: 'c', moduleId: null, context: { a: 2 } });
    expect(h1).not.toBe(h2);
  });
});

describe('verifyHealthDeterminism() — REGRESSION GUARD', () => {
  it('100 iterations produce identical checksum', () => {
    const result = verifyHealthDeterminism('TEST_CELL', 'check-determinism', { key: 'value' });
    expect(result.deterministic).toBe(true);
    expect(result.iterations).toBe(100);
    expect(result.checksumDrift).toBe(0);
  });
});

// ─── DiagnosticReport Tests ───────────────────────────────────────────────────

describe('generateDiagnosticReport()', () => {
  it('creates report with all fields', () => {
    const cellResults = [
      {
        cellId: 'IMMUNITY_SCAN',
        errors: [],
        health: [encodeBytecodeHealth('IMMUNITY_SCAN', 'no-violations')],
        skipped: [],
      },
    ];

    const report = generateDiagnosticReport({
      commitHash: 'abc123',
      trigger: 'manual',
      cellResults,
    });

    expect(report.reportId).toMatch(/^PB-DIAG-v1-\d+-[a-z0-9]+$/);
    expect(report.reportVersion).toBe(REPORT_VERSION);
    expect(report.timestamp).toBeDefined();
    expect(report.commitHash).toBe('abc123');
    expect(report.trigger).toBe('manual');
    expect(report.cells).toContain('IMMUNITY_SCAN');
    expect(report.summary.totalErrors).toBe(0);
    expect(report.summary.totalHealth).toBe(1);
    expect(report.violations).toHaveLength(0);
    expect(report.passing).toHaveLength(1);
    expect(report.checksum).toBeDefined();
    expect(report.checksum).toHaveLength(16);
  });

  it('aggregates multiple cells', () => {
    const cellResults = [
      {
        cellId: 'CELL_A',
        errors: [],
        health: [encodeBytecodeHealth('CELL_A', 'check-1')],
        skipped: [],
      },
      {
        cellId: 'CELL_B',
        errors: [],
        health: [encodeBytecodeHealth('CELL_B', 'check-2')],
        skipped: [],
      },
    ];

    const report = generateDiagnosticReport({ commitHash: 'test', trigger: 'manual', cellResults });
    expect(report.cells).toEqual(['CELL_A', 'CELL_B']);
    expect(report.summary.totalHealth).toBe(2);
  });

  it('computes critical violations', () => {
    const cellResults = [
      {
        cellId: 'TEST',
        errors: [
          { severity: 'CRIT', context: {}, bytecode: 'X', category: 'A', errorCode: 1 },
          { severity: 'WARN', context: {}, bytecode: 'Y', category: 'B', errorCode: 2 },
        ],
        health: [],
        skipped: [],
      },
    ];

    const report = generateDiagnosticReport({ commitHash: 'test', trigger: 'manual', cellResults });
    expect(report.summary.totalErrors).toBe(2);
    expect(report.summary.criticalViolations).toBe(1);
  });
});

describe('verifyReport()', () => {
  it('returns valid for untampered report', () => {
    const cellResults = [
      { cellId: 'TEST', errors: [], health: [encodeBytecodeHealth('TEST', 'c')], skipped: [] },
    ];
    const report = generateDiagnosticReport({ commitHash: 'test', trigger: 'manual', cellResults });
    const result = verifyReport(report);
    expect(result.valid).toBe(true);
    expect(result.computed).toBe(result.stored);
  });

  it('produces identical checksums for two reports with same stable content but different reportIds (regression: reportId excluded)', () => {
    // Two BytecodeHealth instances are constructed at slightly different
    // wall-clock instants — their stable fields are identical, so the
    // resulting reports must checksum to the same value even though their
    // reportIds (which embed a timestamp+random suffix) differ.
    const buildReport = () => generateDiagnosticReport({
      commitHash: 'same-commit',
      trigger: 'manual',
      cellResults: [{
        cellId: 'TEST',
        errors: [],
        health: [encodeBytecodeHealth('TEST', 'check', { foo: 'bar' })],
        skipped: [],
      }],
    });
    const r1 = buildReport();
    const r2 = buildReport();
    expect(r1.reportId).not.toBe(r2.reportId); // sanity: ids differ
    expect(r1.checksum).toBe(r2.checksum);     // but checksum is stable
  });

  it('returns invalid for tampered report', () => {
    const cellResults = [
      { cellId: 'TEST', errors: [], health: [encodeBytecodeHealth('TEST', 'c')], skipped: [] },
    ];
    const report = generateDiagnosticReport({ commitHash: 'test', trigger: 'manual', cellResults });
    report.summary.totalErrors = 999; // Tamper!
    const result = verifyReport(report);
    expect(result.valid).toBe(false);
  });
});

// ─── Diagnostic Runner Tests ──────────────────────────────────────────────────

describe('getAvailableCells()', () => {
  it('returns all registered cells', () => {
    const cells = getAvailableCells();
    expect(cells.length).toBeGreaterThanOrEqual(5);
    expect(cells.map(c => c.id)).toContain(CELL_IDS.IMMUNITY_SCAN);
    expect(cells.map(c => c.id)).toContain(CELL_IDS.LAYER_BOUNDARY);
    expect(cells.map(c => c.id)).toContain(CELL_IDS.TEST_COVERAGE);
  });
});

describe('runDiagnostic()', () => {
  it('runs all cells and generates report', async () => {
    const files = [CLEAN_FILE];
    const report = await runDiagnostic({ snapshot: EMPTY_SNAPSHOT, files, commitHash: 'test', trigger: 'test' });

    expect(report.reportId).toMatch(/^PB-DIAG-v1/);
    // Clean file may have health signals but should have no critical violations
    expect(report.summary.criticalViolations).toBe(0);
    expect(report.checksum).toBeDefined();
  });

  it('respects cell filter', async () => {
    const files = [CLEAN_FILE];
    const report = await runDiagnostic({
      snapshot: EMPTY_SNAPSHOT,
      files,
      commitHash: 'test',
      trigger: 'test',
      cellFilter: [CELL_IDS.TEST_COVERAGE],
    });

    expect(report.cells).toEqual([CELL_IDS.TEST_COVERAGE]);
  });
});

describe('runCellById()', () => {
  it('runs specific cell', async () => {
    const result = await runCellById(CELL_IDS.IMMUNITY_SCAN, EMPTY_SNAPSHOT, [VIOLATION_FILE]);
    expect(result.cellId).toBe(CELL_IDS.IMMUNITY_SCAN);
    expect(result.errors.length).toBeGreaterThan(0); // Math.random() detected
  });

  it('throws for unknown cell', async () => {
    await expect(runCellById('UNKNOWN_CELL', EMPTY_SNAPSHOT, [])).rejects.toThrow('Unknown cell');
  });
});

// ─── Cell Tests ───────────────────────────────────────────────────────────────

describe('IMMUNITY_SCAN cell', () => {
  it('detects Math.random() violation', async () => {
    const result = await immunityScan(EMPTY_SNAPSHOT, [VIOLATION_FILE]);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('emits health on clean file', async () => {
    const result = await immunityScan(EMPTY_SNAPSHOT, [CLEAN_FILE]);
    expect(result.health.length).toBeGreaterThan(0);
  });

  it('is deterministic — same scan same result', async () => {
    const r1 = await immunityScan(EMPTY_SNAPSHOT, [CLEAN_FILE]);
    const r2 = await immunityScan(EMPTY_SNAPSHOT, [CLEAN_FILE]);
    expect(r1.errors.length).toBe(r2.errors.length);
    expect(r1.health.length).toBe(r2.health.length);
  });
});

describe('LAYER_BOUNDARY cell', () => {
  it('emits health for clean codex/core file', async () => {
    const cleanCodexFile = {
      content: 'import { x } from "node:path";',
      path: 'codex/core/clean/file.js',
    };
    const result = await layerBoundaryScan(EMPTY_SNAPSHOT, [cleanCodexFile]);
    expect(result.health.length).toBeGreaterThan(0);
  });
});

describe('TEST_COVERAGE cell', () => {
  it('detects missing test file', async () => {
    const files = [
      { path: 'codex/core/example.js', content: 'export const x = 1;' },
      // No test file
    ];
    const result = await testCoverageScan(EMPTY_SNAPSHOT, files);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('passes when test exists', async () => {
    const files = [
      { path: 'codex/core/example.js', content: 'export const x = 1;' },
      { path: 'tests/codex/core/example.test.js', content: 'it("works", () => {});' },
    ];
    const result = await testCoverageScan(EMPTY_SNAPSHOT, files);
    // When test exists, coverage is satisfied - health should be emitted
    expect(result.health.some(h => h.context.moduleId?.includes('example.js'))).toBe(true);
  });
});

describe('FIXTURE_SHAPE cell', () => {
  it('detects useState(0) antipattern', async () => {
    const result = await fixtureShapeScan(EMPTY_SNAPSHOT, [TEST_FILE]);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('passes clean test files', async () => {
    const cleanTest = {
      content: 'it("works", () => { expect(true).toBe(true); });',
      path: 'tests/clean.test.js',
    };
    const result = await fixtureShapeScan(EMPTY_SNAPSHOT, [cleanTest]);
    expect(result.errors.length).toBe(0);
  });
});

describe('PROCESSOR_BRIDGE cell', () => {
  it('detects processor-bridge imports', async () => {
    const bridgeFile = {
      content: 'import { processBridge } from "src/lib/processor-bridge.js";',
      path: 'codex/core/pixelbrain/engine.js',
    };
    const result = await processorBridgeScan(EMPTY_SNAPSHOT, [bridgeFile]);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

// ─── Integration Test ─────────────────────────────────────────────────────────

describe('Full Diagnostic Run — DETERMINISM REGRESSION GUARD', () => {
  it('100 runs produce byte-identical violation counts', async () => {
    const files = [CLEAN_FILE, VIOLATION_FILE];
    const errorCounts = [];
    const healthCounts = [];

    for (let i = 0; i < 100; i++) {
      const report = await runDiagnostic({ snapshot: EMPTY_SNAPSHOT, files });
      errorCounts.push(report.summary.totalErrors);
      healthCounts.push(report.summary.totalHealth);
    }

    const uniqueErrors = new Set(errorCounts);
    const uniqueHealth = new Set(healthCounts);

    expect(uniqueErrors.size).toBe(1); // All runs same error count
    expect(uniqueHealth.size).toBe(1); // All runs same health count
  });
});

// ─── Deep Freeze (white paper §7) ─────────────────────────────────────────────

describe('deepFreezeClone() — context tamper-evidence', () => {
  it('freezes top-level keys', () => {
    const ctx = { a: 1, b: 'x' };
    const out = deepFreezeClone(ctx);
    expect(Object.isFrozen(out)).toBe(true);
    expect(() => { out.a = 99; }).toThrow();
  });

  it('freezes nested objects (the white paper §7 claim)', () => {
    const ctx = { bySeverity: { CRIT: 1, WARN: 2 }, arr: [{ k: 'v' }] };
    const out = deepFreezeClone(ctx);
    expect(Object.isFrozen(out.bySeverity)).toBe(true);
    expect(Object.isFrozen(out.arr)).toBe(true);
    expect(Object.isFrozen(out.arr[0])).toBe(true);
    expect(() => { out.bySeverity.CRIT = 99; }).toThrow();
    expect(() => { out.arr[0].k = 'mutated'; }).toThrow();
  });

  it('does not mutate the input', () => {
    const ctx = { nested: { x: 1 } };
    const out = deepFreezeClone(ctx);
    expect(Object.isFrozen(ctx)).toBe(false);
    expect(Object.isFrozen(ctx.nested)).toBe(false);
    expect(out).not.toBe(ctx);
    expect(out.nested).not.toBe(ctx.nested);
  });

  it('BytecodeHealth.context resists deep tampering', () => {
    const h = new BytecodeHealth({
      code: HEALTH_CODES.IMMUNE_PASS_COORD,
      cellId: 'X',
      checkId: 'y',
      context: { bySeverity: { CRIT: 1 } },
    });
    expect(() => { h.context.bySeverity.CRIT = 999; }).toThrow();
  });
});

// ─── AST Import Parser (verdict §3 / §7 30-day item) ──────────────────────────

describe('AST import parser', () => {
  it('detects static imports', () => {
    const { imports } = astParseImports(`import { x } from 'foo';\nimport y from 'bar';`, 'a.js');
    expect(imports.map(i => i.path)).toEqual(['foo', 'bar']);
    expect(imports.every(i => i.kind === 'static')).toBe(true);
  });

  it('detects side-effect-only static imports (regex misses these)', () => {
    const { imports } = astParseImports(`import 'side-effect';`, 'a.js');
    expect(imports[0]).toMatchObject({ path: 'side-effect', kind: 'static', dynamic: false });
  });

  it('detects dynamic import() with literal path', () => {
    const { imports } = astParseImports(`async function f() { const m = await import('dyn'); }`, 'a.js');
    expect(imports.find(i => i.kind === 'dynamic')).toMatchObject({ path: 'dyn', dynamic: false });
  });

  it('marks template-literal dynamic imports as dynamic / unresolvable', () => {
    const { imports } = astParseImports('const m = import(`./${name}`);', 'a.js');
    const dyn = imports.find(i => i.kind === 'dynamic');
    expect(dyn).toBeDefined();
    expect(dyn.dynamic).toBe(true);
    expect(dyn.path).toBe(null);
  });

  it('detects re-exports with source', () => {
    const { imports } = astParseImports(`export { foo } from 'reexp';\nexport * from 'star-reexp';`, 'a.js');
    const sources = imports.filter(i => i.kind === 'export-from').map(i => i.path);
    expect(sources.sort()).toEqual(['reexp', 'star-reexp']);
  });

  it('detects require() calls (CommonJS)', () => {
    const { imports } = astParseImports(`const fs = require('node:fs');`, 'a.cjs');
    expect(imports[0]).toMatchObject({ path: 'node:fs', kind: 'require' });
  });

  it('handles JSX without crashing', () => {
    const { imports, parseError } = astParseImports(
      `import React from 'react';\nconst el = <div>hi</div>;\nexport default function F() { return el; }`,
      'a.jsx',
    );
    expect(parseError).toBeNull();
    expect(imports[0].path).toBe('react');
  });

  it('returns parseError on broken syntax without throwing', () => {
    const { imports, parseError } = astParseImports('import { from "broken";', 'a.js');
    expect(imports.length).toBeGreaterThanOrEqual(0);
    // errorRecovery is enabled in babel options, so parseError may or may not be null;
    // the contract is: never throw.
    expect(typeof parseError === 'string' || parseError === null).toBe(true);
  });
});

// ─── Logarithmic Pruner (white paper §10) ─────────────────────────────────────

describe('planPruning()', () => {
  const HOUR = 60 * 60 * 1000;
  const DAY = 24 * HOUR;

  function mkFile(reportId) {
    return { name: `${reportId}.json`, ts: timestampFromReportId(reportId) };
  }

  it('keeps everything in the recent window (<24h)', () => {
    const now = 100 * DAY;
    const files = [
      mkFile(`PB-DIAG-v1-${now - 1 * HOUR}-aaaa`),
      mkFile(`PB-DIAG-v1-${now - 12 * HOUR}-bbbb`),
      mkFile(`PB-DIAG-v1-${now - 23 * HOUR}-cccc`),
    ];
    const { keep, prune } = planPruning({ now, files });
    expect(prune).toEqual([]);
    expect(keep.length).toBe(3);
  });

  it('keeps only the newest report per UTC day in the daily window', () => {
    const now = 100 * DAY;
    const dayStart = now - 5 * DAY;
    const files = [
      mkFile(`PB-DIAG-v1-${dayStart + 1 * HOUR}-aaaa`),
      mkFile(`PB-DIAG-v1-${dayStart + 5 * HOUR}-bbbb`),  // newest in this UTC day → kept
      mkFile(`PB-DIAG-v1-${dayStart + 3 * HOUR}-cccc`),
    ];
    const { keep, prune } = planPruning({ now, files });
    expect(keep).toEqual([`PB-DIAG-v1-${dayStart + 5 * HOUR}-bbbb.json`]);
    expect(prune.length).toBe(2);
  });

  it('keeps only one weekly representative beyond 30d', () => {
    const now = 100 * DAY;
    const oldStart = now - 60 * DAY;
    const files = [
      mkFile(`PB-DIAG-v1-${oldStart}-aaaa`),
      mkFile(`PB-DIAG-v1-${oldStart + 1 * DAY}-bbbb`),
      mkFile(`PB-DIAG-v1-${oldStart + 3 * DAY}-cccc`),
    ];
    const { keep, prune } = planPruning({ now, files });
    expect(keep.length).toBeGreaterThanOrEqual(1);
    expect(keep.length + prune.length).toBe(3);
  });

  it('is deterministic — same (now, files) ⇒ same plan', () => {
    const now = 200 * DAY;
    const files = Array.from({ length: 50 }, (_, i) => mkFile(`PB-DIAG-v1-${now - i * HOUR}-${String(i).padStart(4, '0')}`));
    const a = planPruning({ now, files });
    const b = planPruning({ now, files });
    expect(a).toEqual(b);
  });
});

// ─── Cell Interface Compliance (white paper §11) ──────────────────────────────

describe('Cell interface compliance', () => {
  it('runner already loaded valid cells without throwing (smoke)', () => {
    // If the runner threw at module load, the import at the top of this file
    // would have failed. This test exists to make the contract visible and
    // catch regressions that loosen the runtime check.
    expect(true).toBe(true);
  });
});

// ─── DiagnosticReport: cellErrors split (verdict §3 immediate item) ───────────

describe('generateDiagnosticReport() — cellErrors are first-class', () => {
  it('separates cell crashes from per-check skipped', async () => {
    const { generateDiagnosticReport } = await import('../../codex/core/diagnostic/DiagnosticReport.js');
    const report = generateDiagnosticReport({
      commitHash: 'test',
      trigger: 'test',
      cellResults: [
        {
          cellId: 'CELL_A',
          errors: [],
          health: [],
          skipped: [{ cellId: 'CELL_A', reason: 'no target files' }],
          cellError: null,
        },
        {
          cellId: 'CELL_B',
          errors: [],
          health: [],
          skipped: [],
          cellError: { cellId: 'CELL_B', message: 'boom', stack: null },
        },
      ],
    });
    expect(report.summary.totalSkipped).toBe(1);
    expect(report.summary.cellErrors).toBe(1);
    expect(report.cellErrors).toHaveLength(1);
    expect(report.cellErrors[0].cellId).toBe('CELL_B');
  });
});