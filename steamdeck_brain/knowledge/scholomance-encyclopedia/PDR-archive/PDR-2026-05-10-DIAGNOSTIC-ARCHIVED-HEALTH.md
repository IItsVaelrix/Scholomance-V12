# PDR-2026-05-10-DIAGNOSTIC-ARCHIVED-HEALTH — Archived Health Infrastructure & Hallucination Mitigation

## Bytecode Search Code
`SCHOL-ENC-BYKE-SEARCH-DIAG-ARCHIVED-PDR`

**Status:** Implemented (Retroactive)
**Classification:** Architectural | QA Infrastructure | AI Safety
**Priority:** High
**Primary Goal:** Introduce a formal "Archived" state to the diagnostic system to handle intentionally unfinished logic (stasis) and mitigate AI hallucinations caused by the reintroduction of legacy code patterns.

---

## 0. Mandate

The Scholomance diagnostic system, as defined in `PDR-2026-05-09-DIAGNOSTIC-CELL-INFRASTRUCTURE`, was identified as being "too ravenous" for errors—specifically flagging work-in-progress logic or infrastructure drift (e.g., port alignment) as active failures. 

This PDR introduces the **Archived Health** signal: a third state between "Pure Health" (passing) and "Bytecode Error" (failing). This allows for a **Stasis Field** where known-incomplete logic is documented and observed without triggering immune system blocks.

---

## 1. Executive Summary

The Archived Health infrastructure transforms the diagnostic system into a more sophisticated observer. It provides:
1.  **Stasis Identification**: Formal codes for incomplete, stubbed, or deprecated logic.
2.  **Surgical Suppression**: A mechanism for developers to silence specific rules per-file using `// ARCHIVED: <RuleID>` annotations.
3.  **Hallucination Defense**: A new pathogen (`PAT-051`) that detects when AI agents "hallucinate" production code by using `Archive/Prototypes/` as a logic base.
4.  **Enhanced Reporting**: A distinct `totalArchived` metric in Diagnostic Reports to maintain visibility into the codebase's stasis surface.

---

## 2. Problem Statement: The Ravenous Immune Response

Prior to this implementation:
- **Noise**: Baseline scans reported ~768 errors, many of which were "expected" (e.g., legacy port 3000 in READMEs, missing tests for WIP pages).
- **Hallucination**: AI agents frequently reintroduced forbidden paths (e.g., `codex/core/rhyme/`) because they found similar logic in the `Archive/` directory and assumed it was production-ready.
- **Binary Choice**: Diagnostics were binary (Pass/Fail). There was no way to say "I know this is incomplete, stop flagging it" without weakening the underlying rules.

---

## 3. Proposed Design

### 3.1 Archived Health Codes (`BytecodeHealth.js`)

A new section is added to the health infrastructure to categorize stasis logic.

**Codes:**
- `PB-OK-v1-LOGIC-INCOMPLETE`: General work-in-progress logic.
- `PB-OK-v1-WIP-STUB`: Intentional placeholder stubs.
- `PB-OK-v1-DEPRECATED-STASIS`: Logic being phased out but not yet purged.

**Severity:**
- `HEALTH_SEVERITY.ARCHIVED`: A distinct severity level used for reporting.

### 3.2 Surgical Suppression Mechanism

Diagnostic cells are updated to respect top-level comment annotations.

**Syntax:**
`// ARCHIVED: <RuleID>` (e.g., `// ARCHIVED: INFRA-0G01`)
`// ARCHIVED: logic-incomplete` (Specifically for `TEST_COVERAGE`)

**Detection Logic (Regex):**
`const archivedRegex = new RegExp('^\\/\\/\\s*ARCHIVED:\\s*${ruleId}', 'm');`
*Note: Use of the 'm' flag and start-of-line anchor ensures that the annotation is a deliberate top-level comment, preventing self-archiving within the scanner logic itself.*

### 3.3 Pathogen `PAT-051`: Hallucination Guard

A new entry in `clerical-raid.patterns.js` specifically targets the "Archive-as-Base" hallucination.

- **ID**: `PAT-051`
- **Name**: `AI Hallucination: Legacy Path Reintroduction`
- **Symptoms**: Import failures pointing to `codex/core/rhyme`, resurrection of `nexus.registry.js` prototypes.
- **Action**: Blocks merge/commit and prescribes re-routing to canonical layers (e.g., `codex/core/rhyme-astrology`).

---

## 4. Enhanced Diagnostic Report

The `DiagnosticReport.js` and `run-diagnostic.cli.js` are updated to track and display archived signals.

**Summary Schema Delta:**
```json
{
  "summary": {
    "totalErrors": number,
    "totalHealth": number,
    "totalArchived": number,  // NEW
    "totalSkipped": number,
    "criticalViolations": number
  }
}
```

**CLI Output:**
```
Diagnostic Report — PB-DIAG-v1-...
  Errors:  767
  Health:  666
  Archived: 2  <-- NEW
  ...
  Archived by layer:
    - IMMUNITY_SCAN        1
    - TEST_COVERAGE        1
```

---

## 5. Implementation Status

| Component | Status | Location |
|---|---|---|
| Archived Constants | **DONE** | `codex/core/diagnostic/BytecodeHealth.js` |
| Suppression Logic | **DONE** | All 5 Diagnostic Cells |
| Pathogen `PAT-051` | **DONE** | `codex/core/immunity/clerical-raid.patterns.js` |
| Report UI/CLI | **DONE** | `DiagnosticReport.js` & `run-diagnostic.cli.js` |

---

## 6. Success Criteria

1.  **Baseline Drift**: Applying an `ARCHIVED` annotation reduces the `totalErrors` count and increases the `totalArchived` count by exactly 1.
2.  **Determinism**: Archived health signals produce stable checksums across 100x scans.
3.  **Hallucination Catch**: `npm run cleri scan "importing from codex/core/rhyme"` triggers `PAT-051`.
4.  **Non-interference**: Archiving Rule A in a file does NOT silence Rule B in the same file.

---

## 7. Open Questions

1.  **Stasis Expiration**: Should "Archived" signals expire after 30/60/90 days to prevent permanent rot?
2.  **Block-level Scoping**: Currently, suppression is file-level. Should we support block-level suppression for larger files?

---

**Status:** Implemented (Retroactive)
**Author:** Gemini-Backend (Debug Inquisitor)
**Verified:** 2026-05-10 via Diagnostic CLI scan.
