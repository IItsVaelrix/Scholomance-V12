# Spec Sheet: Diagnostic Subsystem A-Grade Hardening

## Bytecode Search Code
`SCHOL-ENC-BYKE-SEARCH-DIAG-A-GRADE-SPEC`

**Status:** Implemented  
**Classification:** Architectural | QA Infrastructure | Diagnostic Subsystem | Determinism  
**Priority:** High  
**Primary Goal:** Define implementation-ready requirements for moving the diagnostic subsystem from bounded-memory safeguards to a streaming, fully contract-aligned, A-grade diagnostic architecture.

---

# 1. Scope

This spec covers the next diagnostic subsystem hardening pass after the 2026-06-04 tightening update. It targets the remaining known gaps:

- Streaming or batched scan input instead of retaining all readable files in memory.
- Full CLI output behavior for `standard`, `bytecode`, and `minimal`.
- Shared diagnostic constant contract across Node core and browser-safe adapters.
- Stronger diagnostic synthesis signal production and documented adapter ownership.
- Determinism and memory-budget regression tests at scale.

Out of scope:

- New diagnostic cell categories unrelated to scan transport.
- UI rendering changes.
- Changing BytecodeError or BytecodeHealth wire formats without a schema update.

---

# 2. Current Baseline

| Area | Current State | Gap |
|---|---|---|
| CLI hardcoded output | Removed | No further action |
| Antigen duplicate output | Removed | No further action |
| CLI arg validation | Present | `--format` modes need distinct behavior |
| CELL_IDS in runner | Uses `BytecodeHealth.CELL_IDS` | Browser adapter still has a UI-safe copy |
| Tree walk memory | File-count cap added | Files are still read into an array |
| Report checksum | `commitHash` excluded | Add regression fixture for no-git parity |
| Synthesis bridge | Normalizes via adapter | Signal producers remain sparse |
| Archived health codes | Explicitly selectable | Add usage guidance by archived reason |

---

# 3. Functional Requirements

## FR-1 Streaming Scan Transport

The diagnostic runner must support a file source abstraction:

```ts
interface DiagnosticFileRecord {
  path: string;
  content: string;
  sizeBytes: number;
}

interface DiagnosticFileSource {
  listPaths(): AsyncIterable<{ path: string; sizeBytes: number }>;
  read(path: string): Promise<DiagnosticFileRecord>;
}
```

Acceptance criteria:

- The CLI must not retain all file contents at once for cells that can process streamed records.
- Existing cells may use a compatibility collector during migration.
- A hard `--max-files` cap remains as a separate safety guard.
- A new `--max-total-bytes` cap fails loudly before unbounded memory exposure.

## FR-2 Cell API Migration

Add a versioned scan context while preserving old cell compatibility:

```ts
interface DiagnosticScanContext {
  snapshot: CodebaseSnapshot;
  files: AsyncIterable<DiagnosticFileRecord>;
  collectFiles(): Promise<DiagnosticFileRecord[]>;
  limits: {
    maxFiles: number;
    maxFileBytes: number;
    maxTotalBytes: number;
  };
}
```

Acceptance criteria:

- New cells implement `scan(context)`.
- Existing cells can temporarily run through `scan(snapshot, files)` compatibility.
- Runner rejects cells that implement neither contract.
- Interface validation reports whether a cell is legacy or streaming-native.

## FR-3 CLI Output Modes

`--format` must become behavioral, not only validated:

| Mode | Output |
|---|---|
| `standard` | Human-readable summary with grouped health, violations, coverage debt, antigens |
| `bytecode` | Bytecode-first lines suitable for AI parsing, no decorative grouping |
| `minimal` | One-line status with checksum, critical count, report path |

Acceptance criteria:

- Each format has snapshot tests.
- `bytecode` output includes every violation and health signal bytecode or canonical code.
- `minimal` emits no multiline sections.
- Invalid formats still fail before scanning.

## FR-4 Browser-Safe Diagnostic Constants

Establish a shared constants package that is safe for browser and Node import:

```text
codex/core/diagnostic/diagnostic-constants.js
```

Contents:

- `CELL_IDS`
- `HEALTH_SEVERITY`
- browser-safe code literals that do not import `node:crypto`

Acceptance criteria:

- `BytecodeHealth.js`, `diagnostic-runner.js`, and `src/lib/diagnostic.adapter.js` import `CELL_IDS` from the shared constants module.
- No Node-only module is imported into browser bundles.
- Existing UI tests still pass.

## FR-5 Synthesis Signal Production

Document and implement a dedicated signal projection layer:

```ts
interface DiagnosticSignalProjection {
  signalKey: string;
  sourceCellId: string;
  score: number;
  evidence: string[];
}
```

Acceptance criteria:

- `buildSynthesisSnapshot` can emit both the raw normalized map and explainable projections.
- `CleriRaidMind` still receives a deterministic `Record<string, number>`.
- Missing signals are explicitly reported in diagnostic metadata.

## FR-6 Determinism and Memory Tests

Add regression coverage for:

- No-git vs git checksum parity.
- File order stability under shuffled directory entry mocks.
- `--max-files` and `--max-total-bytes` failure paths.
- Streaming scan memory envelope using generated fixture records.
- CLI output snapshots for all formats.

Acceptance criteria:

- Diagnostic test suite covers at least one 100k-file synthetic source without allocating file contents for every record at once.
- Determinism battery passes 100 iterations for the streamed path.

---

# 8. Implementation Notes

Implemented on 2026-06-04:

- Added `diagnostic-file-source.js` with array and filesystem file sources.
- Added `diagnostic-constants.js` for browser-safe shared constants.
- Migrated `FIXTURE_SHAPE` and `PROCESSOR_BRIDGE` to `streaming-context-v1`.
- Added real CLI `standard`, `bytecode`, and `minimal` render paths.
- Added `--max-file-bytes` and `--max-total-bytes`.
- Added synthesis projections and missing-signal metadata.
- Added regression coverage for constants parity, file caps, streaming cell execution, projection evidence, and a synthetic 100k-file source.

---

# 4. Non-Functional Requirements

| Requirement | Target |
|---|---|
| Determinism | Same file tree and same cell outputs produce same checksum across machines |
| Memory | O(active cell batch + largest accepted file), not O(all files) for streaming-native cells |
| Compatibility | Existing cells continue to run during migration |
| Failure mode | Limits fail loudly with actionable messages |
| AI parseability | Bytecode output is stable and line-oriented |
| Browser safety | Shared constants do not pull Node built-ins into frontend bundles |

---

# 5. Module Impact

| Module | Change |
|---|---|
| `codex/core/diagnostic/run-diagnostic.cli.js` | File source, output modes, byte and file caps |
| `codex/core/diagnostic/diagnostic-runner.js` | Scan context, compatibility wrapper, cell interface versioning |
| `codex/core/diagnostic/BytecodeHealth.js` | Import constants from browser-safe module |
| `src/lib/diagnostic.adapter.js` | Import shared constants, keep browser-safe checksum implementation |
| `codex/core/diagnostic/BytecodeHealthAdapter.js` | Remains normalization authority |
| `codex/core/diagnostic/CleriRaidMind.js` | Accept projected metadata without changing core scoring input |
| `tests/diagnostic/` | Add memory, format, and determinism tests |

---

# 6. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Cell migration churn | Medium | Keep legacy compatibility wrapper |
| Streaming API complicates cells needing global file knowledge | Medium | Provide `collectFiles()` for legacy/global cells and migrate selectively |
| Browser bundle accidentally imports Node code | High | Constants-only module plus frontend build test |
| CLI snapshots become brittle | Low | Snapshot only stable sections and bytecode lines |
| Performance test too slow in CI | Medium | Use synthetic async iterables, not disk-backed 100k files |

---

# 7. Definition of Done

- All diagnostic cells run through the scan context.
- At least two cells are streaming-native.
- CLI has tested `standard`, `bytecode`, and `minimal` output.
- Browser and Node diagnostic constants share one source.
- Report checksum remains stable with and without git.
- Synthetic large-repo tests prove bounded memory behavior.
- PDR status can move from Draft to Implemented after QA passes.
