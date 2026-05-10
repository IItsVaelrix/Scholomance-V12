# Scholomance Encyclopedia

## The Living Memory of the Codebase

> "No fix is complete without its story."

**Global Search Anchor:** `SCHOL-ENC-BYKE-SEARCH`

---

## Purpose

The Scholomance Encyclopedia is the canonical repository of bug fix documentation, architectural decisions, product design requirements, post-implementation reports, verdicts, handoffs, and operational knowledge.

This is not a changelog. This is deep technical narrative: what changed, why it changed, what broke, what was learned, and what future agents must not forget.

---

## Hygiene

Run the encyclopedia hygiene audit after adding, moving, or renaming entries:

```bash
node docs/scholomance-encyclopedia/tools/audit-hygiene.mjs
```

The audit checks root law entrypoints, archive index coverage, missing files, and zero-byte encyclopedia artifacts.

---

## Search

- **Global audit:** search for `SCHOL-ENC-BYKE-SEARCH`.
- **Bug-specific audit:** search for `SCHOL-ENC-BUG-`.
- **CLI:** `rg "SCHOL-ENC-(BYKE-SEARCH|BUG-)" docs/scholomance-encyclopedia`

---

## Orders of Knowledge

### Scholomance LAW

Foundational mandates and contracts that govern agents and systems.

- [`AGENTS.md`](./Scholomance%20LAW/AGENTS.md)
- [`ARCH_CONTRACT_OVERLAY_INTEGRITY.md`](./Scholomance%20LAW/ARCH_CONTRACT_OVERLAY_INTEGRITY.md)
- [`CLAUDE.md`](./Scholomance%20LAW/CLAUDE.md)
- [`CODEX.md`](./Scholomance%20LAW/CODEX.md)
- [`CURSOR.md`](./Scholomance%20LAW/CURSOR.md)
- [`ENGINEERING_RULEBOOK.md`](./Scholomance%20LAW/ENGINEERING_RULEBOOK.md)
- [`GEMINI.md`](./Scholomance%20LAW/GEMINI.md)
- [`SCHEMA_CONTRACT.md`](./Scholomance%20LAW/SCHEMA_CONTRACT.md)
- [`SHARED_PREAMBLE.md`](./Scholomance%20LAW/SHARED_PREAMBLE.md)
- [`UNITY.md`](./Scholomance%20LAW/UNITY.md)
- [`VAELRIX_LAW.md`](./Scholomance%20LAW/VAELRIX_LAW.md)
- [`forensic-search.skill`](./Scholomance%20LAW/forensic-search.skill)
- [`scholomance-feedback.skill`](./Scholomance%20LAW/scholomance-feedback.skill)
- [`vaelrix-law-debug.skill`](./Scholomance%20LAW/vaelrix-law-debug.skill)
- [`vaelrix-law.skill`](./Scholomance%20LAW/vaelrix-law.skill)

### Scholomance Bug Reports

The forensic record of failures, fixes, and lessons learned.

- [`BUG-2026-03-28-INITIAL-AUDIT.md`](./Scholomance%20Bug%20Reports/BUG-2026-03-28-INITIAL-AUDIT.md)
- [`BUG-2026-03-29-SKITTLES.md`](./Scholomance%20Bug%20Reports/BUG-2026-03-29-SKITTLES.md)
- [`BUG-2026-04-02-WHITESPACE-ALIGNMENT.md`](./Scholomance%20Bug%20Reports/BUG-2026-04-02-WHITESPACE-ALIGNMENT.md)
- [`BUG-2026-04-03-DEV-MISSING-BACKEND.md`](./Scholomance%20Bug%20Reports/BUG-2026-04-03-DEV-MISSING-BACKEND.md)
- [`BUG-2026-04-03-LOCK-SYNC-SPLIT.md`](./Scholomance%20Bug%20Reports/BUG-2026-04-03-LOCK-SYNC-SPLIT.md)
- [`BUG-2026-04-03-PB-SANI-FINGERPRINTING.md`](./Scholomance%20Bug%20Reports/BUG-2026-04-03-PB-SANI-FINGERPRINTING.md)
- [`BUG-2026-04-03-SYSTEM-STABILIZATION.md`](./Scholomance%20Bug%20Reports/BUG-2026-04-03-SYSTEM-STABILIZATION.md)
- [`BUG-2026-04-26-IPV6-PROXY-BLINDNESS.md`](./Scholomance%20Bug%20Reports/BUG-2026-04-26-IPV6-PROXY-BLINDNESS.md)
- [`BUG-2026-04-27-COGNITIVE-BUS-MISAPPROPRIATION.md`](./Scholomance%20Bug%20Reports/BUG-2026-04-27-COGNITIVE-BUS-MISAPPROPRIATION.md)
- [`BUG-2026-04-27-RECURSIVE-SHADOW.md`](./Scholomance%20Bug%20Reports/BUG-2026-04-27-RECURSIVE-SHADOW.md)
- [`BUG-2026-05-08-CARET-STICKING-DRIFT.md`](./Scholomance%20Bug%20Reports/BUG-2026-05-08-CARET-STICKING-DRIFT.md)
- [`BUG-2026-05-08-INPUT-LAG-COMPLETIONS.md`](./Scholomance%20Bug%20Reports/BUG-2026-05-08-INPUT-LAG-COMPLETIONS.md)
- [`BUG-2026-05-08-TRUESIGHT-SEMANTIC-AMBIGUITY.md`](./Scholomance%20Bug%20Reports/BUG-2026-05-08-TRUESIGHT-SEMANTIC-AMBIGUITY.md)
- [`BUG-2026-05-09-MISSING-VIEWPORT-BYTECODE.md`](./Scholomance%20Bug%20Reports/BUG-2026-05-09-MISSING-VIEWPORT-BYTECODE.md)
- [`BUG-2026-05-09-REJECTED-WATER-SOURCE.md`](./Scholomance%20Bug%20Reports/BUG-2026-05-09-REJECTED-WATER-SOURCE.md)
- [`BUG-FIX-PLAN-2026-04-26-DISCONNECTED-LOGIC.md`](./Scholomance%20Bug%20Reports/BUG-FIX-PLAN-2026-04-26-DISCONNECTED-LOGIC.md)
- [`BUG-TEMPLATE.md`](./Scholomance%20Bug%20Reports/BUG-TEMPLATE.md)

### PDR Archive

Product Design Requirements: intent before implementation.

- [`README.md`](./PDR-archive/README.md)

The PDR archive README is the exhaustive PDR index.

### Post-Implementation Reports

Reality after implementation.

- [`DEVELOPER_PRODUCTIVITY_METRICS_WEEK_13_2026.md`](./post-implementation-reports/DEVELOPER_PRODUCTIVITY_METRICS_WEEK_13_2026.md)
- [`PIR-2026-04-26-TURBOQUANT-ASCENSION.md`](./post-implementation-reports/PIR-2026-04-26-TURBOQUANT-ASCENSION.md)
- [`PIR-20260405-LEXORACLE-S1-S2.md`](./post-implementation-reports/PIR-20260405-LEXORACLE-S1-S2.md)
- [`PIR-20260419-THOROUGH-AI-COMBAT.md`](./post-implementation-reports/PIR-20260419-THOROUGH-AI-COMBAT.md)
- [`PIR-20260424-IDE-ATMOSPHERE-MICROPROCESSORS.md`](./post-implementation-reports/PIR-20260424-IDE-ATMOSPHERE-MICROPROCESSORS.md)
- [`dead-code.md`](./post-implementation-reports/dead-code.md)

### Architecture Docs

Canonical architecture entries and system decisions.

- [`ARCH-2026-04-02-FONT-ORACLE.md`](./ARCH%20Scholomance%20Docs/ARCH-2026-04-02-FONT-ORACLE.md)
- [`ARCH-2026-04-02-SOVEREIGN-EDITOR.md`](./ARCH%20Scholomance%20Docs/ARCH-2026-04-02-SOVEREIGN-EDITOR.md)
- [`ARCH-2026-04-26-IMMUNE-SYSTEM.md`](./ARCH%20Scholomance%20Docs/ARCH-2026-04-26-IMMUNE-SYSTEM.md)
- [`ARCH-2026-04-26-TURBOQUANT-VECTOR-BRIDGE.md`](./ARCH%20Scholomance%20Docs/ARCH-2026-04-26-TURBOQUANT-VECTOR-BRIDGE.md)
- [`ARCH-2026-04-27-ARCHIVE-OF-DOMINANCE.md`](./ARCH%20Scholomance%20Docs/ARCH-2026-04-27-ARCHIVE-OF-DOMINANCE.md)
- [`ARCH-2026-04-27-COGNITIVE-BUS.md`](./ARCH%20Scholomance%20Docs/ARCH-2026-04-27-COGNITIVE-BUS.md)

### Scholomance White Papers

Deep technical analysis, operating manuals, and specialist briefs.

- [`IMMUNE-SYSTEM-WHITE-PAPER.md`](./Scholomance%20White%20Papers/IMMUNE-SYSTEM-WHITE-PAPER.md)
- [`MCP_INTEGRATION_GUIDE.md`](./Scholomance%20White%20Papers/MCP_INTEGRATION_GUIDE.md)
- [`PARAEQ_PLUGIN.md`](./Scholomance%20White%20Papers/PARAEQ_PLUGIN.md)
- [`TURBOQUANT-SERVICE-MANUAL.md`](./Scholomance%20White%20Papers/TURBOQUANT-SERVICE-MANUAL.md)
- [`TURBOQUANT_WHITE_PAPER.md`](./Scholomance%20White%20Papers/TURBOQUANT_WHITE_PAPER.md)
- [`opencode.md`](./Scholomance%20White%20Papers/opencode.md)

### Scholomance Verdicts

Structured product reviews and judgment of ratified canon.

- [`README.md`](./Scholomance-Verdicts/README.md)
- [`VERDICT-2026-04-27-COGNITIVE-BUS-claude-ui.md`](./Scholomance-Verdicts/VERDICT-2026-04-27-COGNITIVE-BUS-claude-ui.md)
- [`VERDICT-2026-04-27-IMMUNE-SYSTEM.md`](./Scholomance-Verdicts/VERDICT-2026-04-27-IMMUNE-SYSTEM.md)
- [`VERDICT-2026-05-09-CELL-WALL-INFRA.md`](./Scholomance-Verdicts/VERDICT-2026-05-09-CELL-WALL-INFRA.md)

### Changes

- [`CHANGE-2026-04-02-PASSWORDLESS-AGENT.md`](./Scholomance%20Changes/CHANGE-2026-04-02-PASSWORDLESS-AGENT.md)

### Handoffs

- [`HANDOFF-2026-05-08-RHYME-CONSTELLATION-P1-P2.md`](./Scholomance%20Hand%20Offs/HANDOFF-2026-05-08-RHYME-CONSTELLATION-P1-P2.md)

### Studies

- [`study1.md`](./study1.md)

---

## Entry Format

Bug reports follow this structure:

```markdown
# BUG-[YYYY-MM-DD]-[SHORT_NAME]

## Bytecode Search Code
`SCHOL-ENC-BYKE-SEARCH-[BUG_CODE]`

## Bug Description
[What was broken, how it manifested, user impact]

## Root Cause
[Technical explanation of why the bug occurred]

## Thought Process
[Step-by-step reasoning]

## Changes Made
| File | Lines Changed | Rationale |
|------|---------------|-----------|
| `path/to/file.js` | 45-67 | [why this change] |

## Testing
[How the fix was verified]

## Lessons Learned
[What this teaches us about the system]
```

---

*The Scholomance Encyclopedia grows with every battle fought. Each entry is a lesson for the next agent who walks this path.*
