---
name: forensic-search
description: Specialized skill for deep, precise codebase analysis using ripgrep-powered forensic search. Use when semantic search (TurboQuant) is too broad and literal string or regex matching is required for root-cause analysis, security audits, or invariant validation.
---

# Forensic Search

Deep, precise codebase analysis and forensic auditing.

## Overview

Forensic Search is the high-precision companion to TurboQuant's semantic retrieval. While TurboQuant finds "meaning," Forensic Search finds "atoms" — exact strings, regex patterns, and literal code constructs across the entire Scholomance substrate.

**Vaelrix Law 17 Exception**: This skill operates under the explicit exception for low-level diagnostics and precise forensic audits where semantic indexing is insufficient.

## Core Lenses

- **Logic Integrity**: Hunting for logic-fractures, race conditions, and state machine drifts.
- **Security Audit**: Identifying XSS vectors, unvalidated inputs, and dangerous patterns (eval, raw innerHTML).
- **World-Law Validation**: Ensuring absolute compliance with VAELRIX_LAW and SCHEMA_CONTRACT at the syntax level.
- **Dependency Tracking**: Finding every consumer of a specific module or every producer of a certain signal.

## Forensic Workflow

### 1. Identify the Fracture
Define the exact pattern or symptom. Is it a broken import? A missing null guard? A hardcoded z-index?

### 2. Precise Search (The Tool)
Use `mcp_scholomance_collab_forensic_search` with the most surgical query possible.
- **Literal**: For filenames, specific function names, or error messages.
- **Regex**: For patterns (e.g., all `dangerouslySetInnerHTML` usage).
- **Scoped**: Target specific directories (`codex/server`, `src/hooks`) to reduce noise.

### 3. Forensic Diagnosis
Analyze the results through the lens of the World-Law.
- Why does this pattern exist here?
- Is it a violation or an intentional exception?
- What is the cascade effect of changing this code?

### 4. Empirical Proof (The Ritual)
Before fixing, write a failing test that reproduces the discovered fracture. **Test First, Then Fix.**

## Forensic Report Template

```markdown
# Forensic Audit: [Anomaly Name]

## 1. Fracture Identification
- **Pattern**: [Exact string or regex used]
- **Location(s)**: [File paths and line numbers]
- **Symptom**: [Observed failure or potential vulnerability]

## 2. World-Law Context
- **Relevant Law**: [e.g., Law 7: Security Before Features]
- **Violation Type**: [e.g., Logic-Fracture / Math-Rot / Security-Leak]

## 3. Investigation Results
[Detailed analysis of why the code is broken or unsafe.]

## 4. The Failing Test
`[Path to the test file added to prove the bug]`

## 5. Proposed Stasis Fix
[Description of the surgical change needed.]

## 6. ForensicTraceIR
(JSON block for agent-to-agent interpretability)
```

## Specialized Search Patterns

- **Search for all error codes**: `PB-ERR-v1` (regex: true)
- **Search for unsafe HTML**: `dangerouslySetInnerHTML`
- **Search for hardcoded z-index**: `z-index: [2-9]` (regex: true)
- **Search for unvalidated query params**: `req.query` in `codex/server/routes`

## Resources

### references/
- [error-patterns.md](references/error-patterns.md): Common logic fractures and their signatures.
- [security-checklists.md](references/security-checklists.md): Mandatory forensic checks for security audits.

### ForensicTraceIR Schema
```json
{
  "forensic_trace_ir_version": "1.0.0",
  "anomaly": "string",
  "fracture_pattern": "string",
  "affected_files": ["string"],
  "violation_severity": "low | medium | high | critical",
  "root_cause_diagnosis": "string",
  "reproduction_test": "string",
  "stasis_fix_proposed": "string"
}
```
