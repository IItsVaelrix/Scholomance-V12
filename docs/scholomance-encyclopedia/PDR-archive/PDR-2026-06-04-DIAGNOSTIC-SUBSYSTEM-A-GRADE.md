# PDR: Diagnostic Subsystem A-Grade Hardening
## Streaming, Output Modes, Shared Constants, and Synthesis Projection

## Bytecode Search Code
`SCHOL-ENC-BYKE-SEARCH-DIAG-A-GRADE-PDR`

**Status:** Implemented  
**Classification:** Architectural | QA Infrastructure | AI Observability | Determinism  
**Priority:** High  
**Primary Goal:** Complete the diagnostic subsystem hardening path by replacing all-files-in-memory scanning with a bounded scan context, implementing real CLI output modes, consolidating diagnostic constants safely, and making synthesis signals explainable.

---

# 1. Executive Summary

The 2026-06-04 diagnostic tightening pass fixed the most visible credibility issues: hardcoded CLI output, duplicate antigen dumps, silent invalid args, divergent runner cell IDs, and environment-sensitive report checksums. The remaining architecture gap is deeper: the CLI still collects accepted file contents into memory, output modes are validated but not distinct, the browser adapter still maintains a separate diagnostic constant copy, and synthesis signals are useful but not yet explainable enough for large-scale agent triage.

This PDR defines the next implementation phase. The diagnostic subsystem should move to a streaming scan context with bounded memory, keep compatibility for existing cells during migration, implement tested output modes, consolidate constants into a browser-safe module, and emit synthesis signal projections with evidence. The goal is to make the system credible under large repositories, deterministic across machines, and easier for both humans and AI agents to consume.

---

# 2. Problem Statement

The subsystem is now better guarded, but it is not yet structurally complete:

- The scan path can still allocate all accepted file contents before cells run.
- `--format bytecode` and `--format minimal` are accepted values without dedicated output behavior.
- `CELL_IDS` are centralized in Node diagnostic core, but browser-safe diagnostic code still duplicates them.
- Synthesis receives normalized scores, but there is no first-class evidence projection explaining which cell produced which signal.
- Large-repo safety is enforced by a file cap, not by a true bounded-memory architecture.

These gaps matter because diagnostic reports are trust artifacts. If scan behavior cannot scale, if output modes are no-ops, or if constants drift at the frontend boundary, confidence in the diagnostic contract erodes.

---

# 3. Product Goal

Deliver an A-grade diagnostic architecture with:

- Bounded-memory scanning.
- Real CLI output modes.
- One browser-safe source for diagnostic constants.
- Explainable synthesis signal projection.
- Determinism and memory tests that prove the contract.

---

# 4. Non-Goals

- Do not redesign `BytecodeError`.
- Do not change the `BytecodeHealth` wire encoding unless a separate schema update is approved.
- Do not add new unrelated diagnostic cells.
- Do not modify UI rendering surfaces beyond importing shared constants safely.
- Do not make client-side diagnostics authoritative over server or core behavior.

---

# 5. Core Design Principles

1. **Determinism first:** Same input tree and same cell logic must produce the same stable report checksum across environments.
2. **Bounded memory by default:** The normal scan path must not require loading every accepted file into memory.
3. **Compatibility during migration:** Existing cells must continue to run while the new scan context is adopted.
4. **Browser safety:** Shared constants must never pull `node:*` modules into frontend bundles.
5. **Bytecode-first observability:** Machine-readable output must preserve bytecode and checksum data without decorative formatting.
6. **Explainable synthesis:** Every projected synthesis signal should have source-cell evidence.

---

# 6. Feature Overview

## 6.1 Streaming Diagnostic File Source

Introduce a source abstraction for listing and reading files lazily. The CLI owns filesystem traversal; the runner consumes an async file source.

Primary outcomes:

- Keep sorted deterministic path traversal.
- Enforce `--max-files`, `--max-file-bytes`, and `--max-total-bytes`.
- Avoid eager content retention for streaming-native cells.

## 6.2 Versioned Scan Context

Introduce `DiagnosticScanContext`:

```ts
interface DiagnosticScanContext {
  snapshot: CodebaseSnapshot;
  files: AsyncIterable<DiagnosticFileRecord>;
  collectFiles(): Promise<DiagnosticFileRecord[]>;
  limits: DiagnosticScanLimits;
}
```

Legacy cells can still run through `collectFiles()` until migrated.

## 6.3 CLI Output Modes

Implement distinct output renderers:

- `standard`: current human summary.
- `bytecode`: stable line-oriented bytecode stream.
- `minimal`: one-line summary for scripts and CI.

## 6.4 Shared Diagnostic Constants

Create `codex/core/diagnostic/diagnostic-constants.js` for constants used by Node and browser code. `BytecodeHealth.js`, `diagnostic-runner.js`, and `src/lib/diagnostic.adapter.js` import from it.

## 6.5 Synthesis Projection

Add projection metadata that explains how cell results became synthesis signals:

```ts
interface DiagnosticSignalProjection {
  signalKey: string;
  sourceCellId: string;
  score: number;
  evidence: string[];
}
```

The core `CleriRaidMind` input remains a deterministic `Record<string, number>`.

---

# 7. Architecture

```text
CLI filesystem walk
  -> DiagnosticFileSource
  -> DiagnosticScanContext
  -> diagnostic-runner
  -> streaming-native cells
  -> legacy compatibility collector where needed
  -> DiagnosticReport
  -> output renderer: standard | bytecode | minimal
  -> persistence
```

Constants flow:

```text
diagnostic-constants.js
  -> BytecodeHealth.js
  -> diagnostic-runner.js
  -> src/lib/diagnostic.adapter.js
```

Synthesis flow:

```text
cellResults
  -> buildSynthesisProjection()
  -> normalized signal map
  -> CleriRaidMind
  -> metadata includes projections and missing signals
```

---

# 8. Module Breakdown

| Module | Responsibility |
|---|---|
| `diagnostic-constants.js` | Browser-safe diagnostic constants |
| `run-diagnostic.cli.js` | Filesystem source, caps, output renderer selection |
| `diagnostic-runner.js` | Context creation, cell contract detection, compatibility path |
| `BytecodeHealthAdapter.js` | Signal normalization authority |
| `CleriRaidMind.js` | Synthesis evaluation, unchanged numeric input contract |
| `src/lib/diagnostic.adapter.js` | Browser-safe health encoding with shared constants |
| `tests/diagnostic/` | Regression battery for determinism, output, limits, and streaming |

---

# 9. ByteCode IR Design

No new BytecodeHealth or BytecodeError family is required for this phase.

The bytecode output renderer should emit stable lines:

```text
PB-DIAG-LINE-v1 HEALTH <cellId> <checkId> <code> <checksum>
PB-DIAG-LINE-v1 ERROR <severity> <code> <path> <checksum-or-errorCode>
PB-DIAG-LINE-v1 SUMMARY <reportChecksum> errors=<n> health=<n> critical=<n>
```

This is an output framing convention, not a persistent schema. If it becomes persisted or externally consumed as a contract, promote it into `SCHEMA_CONTRACT.md` before implementation.

---

# 10. Implementation Phases

## Phase 1: Constants and Renderer Foundation

- Add `diagnostic-constants.js`.
- Move `CELL_IDS` imports to the shared module.
- Add output renderer functions for `standard`, `bytecode`, and `minimal`.
- Add snapshot tests for each renderer.

## Phase 2: File Source and Limits

- Implement `DiagnosticFileSource`.
- Add `--max-total-bytes`.
- Preserve deterministic sorted traversal.
- Add tests for file cap, byte cap, unreadable files, and stable order.

## Phase 3: Scan Context Compatibility

- Add `DiagnosticScanContext`.
- Detect legacy cells and wrap them with `collectFiles()`.
- Convert two low-risk cells to streaming-native processing.
- Add tests proving both contracts run.

## Phase 4: Synthesis Projection

- Add projection builder with evidence.
- Include projections in report metadata outside checksum unless promoted to stable report contract.
- Add tests for missing signals and min-score conflict resolution.

## Phase 5: Large-Repo Regression Battery

- Add synthetic async iterable tests for 100k records.
- Verify memory profile by ensuring contents are not materialized for all records.
- Run determinism battery against streamed path.

---

# 11. QA Requirements

Required checks:

- `npx vitest run tests/diagnostic`
- Targeted ESLint for changed diagnostic and adapter files.
- Frontend build or targeted import test proving `src/lib/diagnostic.adapter.js` does not import Node-only modules.
- CLI manual checks:
  - `--format standard`
  - `--format bytecode`
  - `--format minimal`
  - invalid `--format`
  - invalid `--priority`
  - `--max-files 1`
  - `--max-total-bytes 1`

New tests:

- Renderer snapshots.
- No-git checksum parity.
- Synthetic large file source.
- Legacy and streaming cell compatibility.
- Shared constant import parity.
- Synthesis projection evidence.

---

# 12. Success Criteria

This PDR is complete when:

- The CLI no longer needs to build a full in-memory `{ path, content }[]` for streaming-native cells.
- At least two existing cells are migrated to the scan context path.
- Output modes produce materially different, tested output.
- `CELL_IDS` have one browser-safe source.
- The browser diagnostic adapter remains free of Node-only imports.
- Synthesis metadata explains signal origin and missing signals.
- Large synthetic scans demonstrate bounded memory behavior.
- Diagnostic checks remain deterministic across git/no-git environments.

---

# 13. Handoff

Codex owns the architecture and schema boundaries. Gemini should implement the runner, CLI, and test migration within this PDR. Claude only needs notification if browser adapter changes affect UI imports or bundle behavior.

---

# 14. Implementation Record

Implemented on 2026-06-04.

Completed:

- Streaming file source abstraction with deterministic traversal and scan limits.
- Scan context compatibility in the diagnostic runner.
- Two streaming-native migrated cells: `FIXTURE_SHAPE` and `PROCESSOR_BRIDGE`.
- Real CLI output modes: `standard`, `bytecode`, `minimal`.
- Browser-safe diagnostic constants shared by core and `src/lib/diagnostic.adapter.js`.
- Synthesis projection metadata and missing-signal reporting.
- Regression tests for file-source caps, constants parity, streaming execution, synthesis projection evidence, and synthetic 100k-file streaming.

Validation:

- `npx vitest run tests/diagnostic/diagnostic.stasis.test.js tests/diagnostic/bytecodeHealthAdapter.test.js tests/diagnostic/bytecodeDiagnosticSynthesis.integration.test.js tests/diagnostic/bytecodeDiagnosticSynthesis.golden.test.js`
- Targeted ESLint over changed diagnostic modules.
- Manual CLI checks for `minimal`, `bytecode`, invalid format, and total-byte cap.
