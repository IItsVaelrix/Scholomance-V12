# PDR-2026-05-09-DIAGNOSTIC-CELL-INFRASTRUCTURE — Diagnostic Cell Architecture for AI-Observable Codebase Health

## Bytecode Search Code
`SCHOL-ENC-BYKE-SEARCH-DIAG-CELL-PDR`

**Status:** Draft
**Classification:** Architectural | QA Infrastructure | AI Observability
**Priority:** High
**Primary Goal:** Build a scheduled agent system that scans the codebase, emits structured Bytecode payloads (errors + health), and writes AI-parseable reports to an MCP-accessible location for downstream AI consumption and action.

---

## 0. Mandate

The Scholomance bytecode system currently speaks only when something is **wrong** (`BytecodeError`). This PDR introduces the complementary signal: **BytecodeHealth** — the green-path counterpart. Together, these form a complete diagnostic channel that AI agents can query, consume, and act upon without manual triage.

The Diagnostic Cell architecture is the **scheduled agent** that:
1. Scans the codebase on-trigger (commit, hourly, test-run)
2. Emits `BytecodeError` (violations) and `BytecodeHealth` (passing checks) payloads
3. Writes a structured JSON report to an MCP-accessible path
4. Allows AI teams to query via MCP → parse report → act

All primitives already exist. This PDR wires them together.

---

## 1. Executive Summary

The Diagnostic Cell Infrastructure transforms the codebase from a **silent system** (only reports failures) into a **speakable system** (reports both failures and passing health signals). AI consumers get a deterministic, parseable report that tells them:

- What violations exist (`BytecodeError[]`)
- What checks passed cleanly (`BytecodeHealth[]`)
- What prescriptive fixes apply (`getRecoveryHintsForError()`)

The architecture is stateless and idempotent by design — the same codebase scan always produces the same report. This guarantees checksum integrity and makes AI consumption trustworthy.

---

## 2. Current Canon (What We Have)

| Primitive | Location | Purpose |
|---|---|---|
| `BytecodeError` | `codex/core/immunity/inflammatoryResponse.js` | Structured error format |
| `parseErrorForAI()` | `codex/core/immunity/` | Parses error for AI consumption |
| `getRecoveryHintsForError()` | `codex/core/immunity/repair.recommendations.js` | Prescriptive fix suggestions |
| IMMUNITY error codes `0x0F00–0x0FFF` | `codex/core/immunity/` | Architectural violation flagging |
| MCP connection | `.mcp.json` | Report delivery layer |

---

## 3. What We Add

### 3.1 BytecodeHealth — The Green-Path Signal

**Why:** Currently, the system only speaks on failure. Diagnostic cells need a positive signal to report clean checks, not just violations.

**Schema:**
```ts
interface BytecodeHealth {
  version: 'v1';
  code: string;                    // e.g., 'PB-OK-v1-IMMUNE-PASS-COORD'
  cellId: string;                  // Which diagnostic cell produced this
  checkId: string;                // Which specific check passed
  moduleId?: string;               // Affected module (if applicable)
  context: Record<string, unknown>;
  timestamp: number;
  checksum: string;               // Deterministic hash of payload
}
```

**Encoding:**
```
PB-OK-v1-IMMUNE-PASS-COORD-{context}-{checksum}
```

**Example:**
```ts
{
  version: 'v1',
  code: 'PB-OK-v1-IMMUNE-PASS-COORD',
  cellId: 'LAYER_BOUNDARY',
  checkId: 'no-src-imports-in-codex-core',
  moduleId: 'phonetic_matcher',
  context: { forbiddenImports: 0, allowedExports: 5 },
  timestamp: 1778355525,
  checksum: 'a3f9b2c1...'
}
```

### 3.2 DiagnosticCell Interface

```ts
export interface DiagnosticCell {
  id: string;                      // Unique cell identifier (e.g., 'LAYER_BOUNDARY')
  name: string;                    // Human-readable name
  schedule: 'on-commit' | 'hourly' | 'on-test-run' | 'manual';
  description: string;             // What this cell scans
  
  scan(codebase: CodebaseSnapshot): ScanResult;
}

export interface ScanResult {
  errors: BytecodeError[];        // Violations found
  health: BytecodeHealth[];       // Checks passed cleanly
  skipped: ScanSkipped[];          // Checks not run (e.g., no target files)
}

export interface CodebaseSnapshot {
  root: string;                    // Project root path
  files: FileTree;                 // Cached file listing
  timestamp: number;
}
```

### 3.3 Report Schema — AI-Parseable

```json
{
  "reportId": "PB-DIAG-v1-{timestamp}-{random4}",
  "reportVersion": "1.0.0",
  "timestamp": 1778355525,
  "commitHash": "abc1234",
  "trigger": "on-commit | hourly | on-test-run | manual",
  "cells": ["IMMUNITY_SCAN", "LAYER_BOUNDARY", "TEST_COVERAGE", "FIXTURE_SHAPE", "PROCESSOR_BRIDGE"],
  "summary": {
    "totalErrors": 3,
    "totalHealth": 47,
    "totalSkipped": 2,
    "criticalViolations": 1
  },
  "violations": [...BytecodeError[]],
  "passing": [...BytecodeHealth[]],
  "skipped": [...ScanSkipped[]],
  "recommendations": [...getRecoveryHintsForError()],
  "checksum": "sha256-of-entire-report"
}
```

---

## 4. Diagnostic Cells

### 4.1 IMMUNITY_SCAN — Innate Immunity Check

**What it scans:** Files annotated with `// IMMUNE_ALLOW:` to detect authorized entropy zones and stacking violations.

**Key codes it emits:**
- `PB-ERR-v1-IMMUNE-FORBIDDEN-IMPORT 0x0F03` — Forbidden import detected
- `PB-ERR-v1-IMMUNE-OVERRIDE-VELOCITY 0x0F05` — Override velocity exceeded
- `PB-OK-v1-IMMUNE-PASS-COORD` — No immunity violations detected

**Example violation:**
```json
{
  "code": "PB-ERR-v1-IMMUNE-FORBIDDEN-IMPORT",
  "cellId": "IMMUNITY_SCAN",
  "file": "src/pages/Read/SearchPanel.jsx",
  "line": 42,
  "violation": "// IMMUNE_ALLOW: math-random used for visual seed",
  "severity": "warning"
}
```

### 4.2 LAYER_BOUNDARY — Cell Wall Enforcement

**What it scans:** `codex/core/` imports crossing into `src/` and vice versa.

**Key codes it emits:**
- `PB-ERR-v1-IMMUNE-FORBIDDEN-IMPORT 0x0F03` — `src/lib` imported into `codex/core`
- `PB-OK-v1-IMMUNE-PASS-COORD` — All imports within layer boundaries

**Example violation:**
```json
{
  "code": "PB-ERR-v1-IMMUNE-FORBIDDEN-IMPORT",
  "cellId": "LAYER_BOUNDARY",
  "file": "codex/core/analysis.pipeline.js",
  "line": 12,
  "violation": "Imports from 'src/lib/wordTokenization.js' — forbidden layer crossing",
  "severity": "critical"
}
```

### 4.3 TEST_COVERAGE — QA Coverage Gate

**What it scans:** Modules with no corresponding QA test file.

**Key codes it emits:**
- `PB-ERR-v1-TEST-MISSING 0x0F06` — Module has no test file
- `PB-OK-v1-TEST-COVERAGE-PASS` — All modules have tests

**Example violation:**
```json
{
  "code": "PB-ERR-v1-TEST-MISSING",
  "cellId": "TEST_COVERAGE",
  "file": "codex/core/rhyme-astrology/deepRhyme.engine.js",
  "violation": "No test file found at tests/codex/rhyme-astrology/deepRhyme.engine.test.js",
  "severity": "warning"
}
```

### 4.4 FIXTURE_SHAPE — Test Harness Quality

**What it scans:** Test fixtures with `useState(0)` patterns and JSDOM reflow traps.

**Key codes it emits:**
- `PB-ERR-v1-TEST-FIXTURE-ANTIPATTERN 0x0F07` — Antipattern detected
- `PB-OK-v1-TEST-FIXTURE-SHAPE-OK` — All fixtures clean

**Example violation:**
```json
{
  "code": "PB-ERR-v1-TEST-FIXTURE-ANTIPATTERN",
  "cellId": "FIXTURE_SHAPE",
  "file": "tests/codex/core/phoneme.engine.test.js",
  "line": 23,
  "violation": "useState(0) detected — prefer useReducer for complex state",
  "severity": "info"
}
```

### 4.5 PROCESSOR_BRIDGE — Illegal Bridge Crossings

**What it scans:** Illegal crossings via `processor-bridge.js` or similar.

**Key codes it emits:**
- `PB-ERR-v1-IMMUNE-PROTOCOL-BLOCK 0x0F08` — Unauthorized bridge crossing
- `PB-OK-v1-PROCESSOR-BRIDGE-CLEAN` — No illegal crossings

**Example violation:**
```json
{
  "code": "PB-ERR-v1-IMMUNE-PROTOCOL-BLOCK",
  "cellId": "PROCESSOR_BRIDGE",
  "file": "codex/core/pixelbrain/lattice-grid-engine.js",
  "line": 8,
  "violation": "Reaches into 'src/lib/processor-bridge.js' — convenience hack detected",
  "severity": "critical"
}
```

---

## 5. MCP Integration

### 5.1 Report Delivery Path

```
Diagnostic Cell Scan
  → Generate report JSON
  → Write to: .codex/diagnostic-reports/{reportId}.json
  → Update index: .codex/diagnostic-reports/index.jsonl
```

### 5.2 MCP Tool Bindings

| Tool | Purpose |
|---|---|
| `diagnostic_get_latest_report` | Returns most recent report |
| `diagnostic_get_report_by_id` | Returns specific report by ID |
| `diagnostic_query_violations` | Query violations by code, cell, severity |
| `diagnostic_query_health` | Query passing checks by cell |
| `diagnostic_run_cells` | Trigger manual cell execution |

### 5.3 AI Query Pattern

```ts
// Example AI consumption
const report = await mcp.diagnostic_get_latest_report();
const criticalViolations = report.violations.filter(v => v.severity === 'critical');
const fixHints = criticalViolations.flatMap(v => getRecoveryHintsForError(v.code));

// AI acts on violations
for (const violation of criticalViolations) {
  const fix = getRecoveryHintsForError(violation.code);
  console.log(`Fix ${violation.file}:${violation.line} — ${fix}`);
}
```

---

## 6. Determinism Contracts

### 6.1 Stateless Scan

Each cell scan must be **pure function** — same `CodebaseSnapshot` always produces same `ScanResult`. No side effects, no external state, no `Date.now()` in computation (only in metadata).

### 6.2 Checksum Integrity

The entire report is checksummed:
```ts
const checksum = sha256(JSON.stringify({ ...report, checksum: undefined }));
report.checksum = checksum;
```

AI consumers can verify report integrity by re-computing the checksum.

### 6.3 Idempotence

Running the same cell twice on the same codebase snapshot produces **byte-identical** results. This is the foundation of trust for AI consumption.

---

## 7. Implementation Phases

### Phase 1 — Core Infrastructure (Blackbox owns)
- [ ] `BytecodeHealth` schema definition
- [ ] `encodeBytecodeHealth()` function
- [ ] `DiagnosticCell` interface
- [ ] Report schema and `generateDiagnosticReport()` function
- [ ] Report writer to `.codex/diagnostic-reports/`

### Phase 2 — Cell Implementations (Blackbox owns)
- [ ] `IMMUNITY_SCAN` cell
- [ ] `LAYER_BOUNDARY` cell
- [ ] `TEST_COVERAGE` cell
- [ ] `FIXTURE_SHAPE` cell
- [ ] `PROCESSOR_BRIDGE` cell

### Phase 3 — MCP Integration (Codex owns)
- [ ] MCP tool bindings in `.mcp.json`
- [ ] Report query functions
- [ ] Index update on report write

### Phase 4 — Scheduling (CI/CD owns)
- [ ] GitHub Actions trigger on commit
- [ ] Hourly cron job
- [ ] On-test-run integration

---

## 8. File Structure

```
codex/
  core/
    diagnostic/
      cells/                    # Diagnostic cell implementations
        immunity-scan.cell.js
        layer-boundary.cell.js
        test-coverage.cell.js
        fixture-shape.cell.js
        processor-bridge.cell.js
      BytecodeHealth.js         # Health payload schema + encoder
      DiagnosticReport.js       # Report generation
      diagnostic-runner.js      # Runs all cells, aggregates results
      index.js                  # Public API

.codex/
  diagnostic-reports/           # Generated reports
    {reportId}.json
    index.jsonl                 # Report index (append-only log)

tests/
  diagnostic/
    BytecodeHealth.test.js
    diagnostic-runner.test.js
    cells/
      immunity-scan.test.js
      layer-boundary.test.js
      test-coverage.test.js
      fixture-shape.test.js
      processor-bridge.test.js
```

---

## 9. Error Code Registry

Reconciled against `codex/core/pixelbrain/bytecode-error.js` on 2026-05-10. The
draft of this PDR (2026-05-09) listed several codes at incorrect hex slots.
This table is now canonical.

| Code | Hex | Severity | Cell | Description |
|---|---|---|---|---|
| `PB-ERR-v1-IMMUNE-FORBIDDEN-IMPORT` | 0x0F03 | critical | LAYER_BOUNDARY, IMMUNITY_SCAN | Forbidden import crossing layer boundary |
| `PB-ERR-v1-IMMUNE-DUPLICATE-PATH` | 0x0F04 | warning | LAYER_BOUNDARY, IMMUNITY_SCAN | Duplicate / shadow module path detected |
| `PB-ERR-v1-IMMUNE-KNOWN-VIOLATION-LITERAL` | 0x0F05 | warning | IMMUNITY_SCAN | Purged symbol resurrection (LING-0F05) |
| `PB-ERR-v1-IMMUNE-OVERRIDE-MISSING` | 0x0F06 | warning | IMMUNITY_SCAN | L3 override required but not provided |
| `PB-ERR-v1-IMMUNE-OVERRIDE-AUTHORITY-INVALID` | 0x0F07 | warning | IMMUNITY_SCAN | Override authority not on curated list |
| `PB-ERR-v1-IMMUNE-PROTOCOL-BLOCK` | 0x0F08 | critical | PROCESSOR_BRIDGE | Unauthorized bridge crossing |
| `PB-ERR-v1-IMMUNE-CELL-WALL-VIOLATION` | 0x0F09 | critical | (reserved) | Internal domain boundary breach |
| `PB-ERR-v1-IMMUNE-APOPTOSIS-SIGNAL` | 0x0F0A | warning | (reserved) | Domain self-destruct / self-signal |
| `PB-ERR-v1-IMMUNE-OVERRIDE-VELOCITY` | 0x0F0B | warning | IMMUNITY_SCAN | Threshold of `IMMUNE_ALLOW` annotations exceeded |
| `PB-ERR-v1-TEST-MISSING` | 0x0F10 | warning | TEST_COVERAGE | Module has no test file |
| `PB-ERR-v1-TEST-FIXTURE-ANTIPATTERN` | 0x0F11 | info | FIXTURE_SHAPE | Test fixture antipattern detected |
| `PB-OK-v1-IMMUNE-PASS-COORD` | — | pass | ALL | Check passed cleanly |

---

## 10. QA Requirements

- [ ] `BytecodeHealth` checksum stable across 100 identical scans
- [ ] `diagnostic-runner` produces byte-identical reports for same snapshot
- [ ] All 5 cells emit correct error codes
- [ ] MCP tools return correct report data
- [ ] Report index correctly appends new reports
- [ ] Invalid snapshot (empty codebase) handled gracefully

---

## 11. Agent Handoffs

### Blackbox (QA)
- Core infrastructure: `BytecodeHealth` schema, `DiagnosticCell` interface, `DiagnosticReport`
- Cell implementations: IMMUNITY_SCAN, LAYER_BOUNDARY, TEST_COVERAGE, FIXTURE_SHAPE, PROCESSOR_BRIDGE
- Determinism tests: 100-run stability, checksum integrity
- Anti-exploit: verify no cell can produce false positives via state mutation

### Codex (Backend)
- MCP tool bindings in `.mcp.json`
- Report query functions
- Index update mechanism
- Performance: scan time <5s for full codebase

### Gemini (CI/CD)
- GitHub Actions trigger on commit
- Hourly cron job configuration
- On-test-run integration hook

---

## 12. Success Criteria

- [ ] `BytecodeHealth` payloads generated and checksummed
- [ ] All 5 diagnostic cells operational
- [ ] Reports written to `.codex/diagnostic-reports/`
- [ ] MCP tools return correct report data
- [ ] 100-run stability test passes (byte-identical reports)
- [ ] AI can query and parse reports without manual intervention
- [ ] CI integration triggers on commit

---

## 13. Open Questions

1. ~~**Report retention policy?**~~ **RESOLVED 2026-05-10**: Logarithmic Pruning policy ratified — see white paper §10 and `codex/core/diagnostic/persistence.js::pruneReports()`. <24h all kept, 24h–30d daily representative, >30d weekly representative indefinitely.
2. ~~**Cell addition protocol?**~~ **RESOLVED 2026-05-10**: Strict interface contract enforced at runner load time — every cell must export `CELL_ID`, `CELL_NAME`, `CELL_DESCRIPTION`, `CELL_SCHEDULE`, `scan`. Missing exports throw at registration. See `codex/core/diagnostic/diagnostic-runner.js::assertCellInterface()`.
3. **Cross-repository scanning?** Scope for multi-repo diagnostic aggregation. Still open.

---

**Status:** Draft
**Author:** Blackbox (QA / Testing)
**Implementing agents:** Blackbox (core + cells), Codex (MCP), Gemini (CI/CD)