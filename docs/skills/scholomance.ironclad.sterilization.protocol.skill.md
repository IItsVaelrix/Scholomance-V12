SCHOLOMANCE_IRONCLAD_STERILIZATION_PROTOCOL.skill.md

# Scholomance Ironclad Sterilization Protocol

> Skill ID: `SISP-v1`
> Purpose: deterministic code review, fix disambiguation, recursion elimination, and VAELRIX_LAW compliance for all Scholomance AI agents.

---

## 1. Purpose

Use the Scholomance Ironclad Sterilization Protocol when reviewing code, proposed fixes, agent patches, architectural changes, schema changes, persistence changes, UI changes, tests, or documentation that can affect Scholomance behavior.

This protocol is not a generic review checklist. It is a deterministic review framework that converts ambiguity into typed findings, clean fix instructions, bounded verification, and explicit handoff decisions.

The goal is to make every fix:

1. Lawful under `VAELRIX_LAW.md`
2. Evidence-backed
3. Minimal and logically necessary
4. Non-recursive and termination-safe
5. Disambiguated enough for any agent to implement without guessing
6. Verifiable through exact commands, tests, or inspection steps
7. Safe across agent ownership boundaries

---

## 2. Design Standard

SISP uses three quality bars:

| Standard | Meaning in SISP |
|---|---|
| Apple-grade professionalism | Clear, restrained, precise, user-respectful review output. No noisy theatrics when decisions matter. |
| Steam-grade innovation | Review artifacts are reusable operating tools: inspectable, versioned, portable across agents, and friendly to community iteration. |
| Bytecode-grade determinism | Same evidence and same contracts produce the same finding class, severity, fix instruction, and verification gate. |

The reviewer must prefer clarity over cleverness. A fix is not clean because it is short; it is clean when it removes ambiguity, reduces state drift, and preserves the system's contracts.

---

## 3. Proof Of Concept: ByteCode Error System

Use `docs/ByteCode Error System/` as the model for SISP.

The ByteCode Error System proves that Scholomance agents can coordinate through deterministic artifacts:

- A stable family marker: `PB-ERR-v1`
- A typed taxonomy: category, severity, module, code
- Structured context: base64 JSON
- Integrity guard: checksum
- AI parsing guidance: decode, verify, extract, analyze, respond
- QA integration: assertions become machine-readable failure records

SISP applies the same idea to code review:

- `SISP-REV-v1` identifies a review finding
- `SISP-FIX-v1` identifies a fix instruction
- `SISP-AUDIT-v1` identifies verification and residual risk
- Structured IR makes instructions parseable by humans and AIs
- Every fix has invariants, forbidden changes, verification, and rollback notes

Do not claim checksum verification unless a checksum tool exists and has been run. Until tooling exists, use `checksum_status: "not_implemented"`.

---

## 4. Invocation Triggers

Invoke this skill when the user says or implies:

- Review this code
- Inspect this patch
- Determine the issue
- Audit this implementation
- Is this fix safe?
- Eliminate recursion
- Make the instructions unambiguous
- Prepare a repair spec for another AI
- Check VAELRIX_LAW compliance
- Review async persistence, schema drift, auth, tests, UI state, or MCP behavior
- Produce a deterministic code review process

Also invoke SISP automatically for any cross-agent handoff where another AI will implement fixes from your written instructions.

---

## 5. Required Reading Order

Before issuing a full SISP review, read:

1. `SHARED_PREAMBLE.md`
2. `VAELRIX_LAW.md`
3. `SCHEMA_CONTRACT.md`
4. Relevant agent lane file: `CODEX.md`, `CLAUDE.md`, `GEMINI.md`, or other assigned context
5. Relevant ByteCode Error System file when bytecode, QA, parsing, or deterministic failure encoding is involved

If time or access prevents this, mark each unread source as `Unknown` and do not claim full compliance.

---

## 6. Evidence Ladder

Every finding must label its evidence tier.

| Tier | Label | Meaning |
|---|---|---|
| 1 | Direct Evidence | File, line, diff, command output, test output, log, screenshot, or reproduced behavior inspected directly |
| 2 | Contract Evidence | Root docs, schema contract, VAELRIX_LAW, architecture docs, or ByteCode Error System |
| 3 | Local Pattern Evidence | Existing nearby code, naming, tests, adapters, or ownership conventions |
| 4 | Inference | Reasonable conclusion from call graph, state flow, type shape, or async sequencing |
| 5 | Hypothesis | Plausible but not yet proven |
| 6 | Unknown | Missing evidence; needs inspection, user input, or verification |

Forbidden review claims:

- "This passed" without command output or exact verification source
- "No schema impact" without checking schema consumers
- "No recursion risk" without a recursion pass
- "Safe migration" without rollback and partial-failure analysis
- "Atomic" without verifying the transaction boundary
- "Frontend only" without checking data authority and persistence side effects

---

## 7. Finding Taxonomy

Classify each finding with exactly one primary category.

| Category | Use When |
|---|---|
| `SECURITY` | Auth, CSRF, secrets, injection, unsafe rendering, unsafe file operations |
| `LAW` | VAELRIX_LAW, agent ownership, schema sovereignty, server authority, data sovereignty |
| `SCHEMA` | Data shape drift, missing contract, undocumented field, consumer mismatch |
| `DETERMINISM` | Same input can produce different output, hidden randomness, ordering instability |
| `RECURSION` | Infinite loop, event echo, self-triggering worker, import cycle, retry spiral, repeated stale mutation |
| `PERSISTENCE` | Partial write, lost write, race condition, migration hazard, transaction gap |
| `ASYNC` | Stale response overwrite, unawaited promise, concurrent state mutation, timer overlap |
| `STATE` | Invalid lifecycle transition, impossible UI state, stale hook state |
| `BOUNDARY` | Layer import violation, agent domain overreach, client/server authority inversion |
| `TEST` | Missing regression, fake test claim, weak assertion, fixture drift |
| `UX` | Accessibility, visual hierarchy, motion, text overflow, surface inconsistency |
| `MAINTAINABILITY` | Duplication, unclear abstraction, dead path, naming ambiguity |

Severity order:

1. `CRITICAL` - data loss, security break, law violation, corrupt persistent state, nonterminating production loop
2. `HIGH` - user-visible break, race, partial persistence, schema drift, deterministic failure
3. `MEDIUM` - likely regression, missing coverage, ambiguous fix path, stale UI state
4. `LOW` - cleanup, clarity, minor maintainability, documentation precision

---

## 8. Sterilization Workflow

Run these phases in order.

### Phase 0: Jurisdiction Gate

Identify:

- User request
- Agent lane
- Owned files
- Forbidden files
- Shared boundaries
- Required locks or collab-plane actions

If a fix crosses ownership, stop and emit an `ESCALATION:` block instead of silently crossing lanes.

### Phase 1: Evidence Capture

Collect the smallest evidence set that can prove or disprove the issue:

- File paths and line references
- Call path or state path
- Contract text
- Test or command output
- Relevant schema
- Existing local pattern

Do not refactor while gathering evidence.

### Phase 2: Failure Classification

For each suspected issue, assign:

- Category
- Severity
- Evidence tier
- Blast radius
- Affected contract
- Affected owner

If classification is uncertain, mark it `Hypothesis` and gather more evidence.

### Phase 3: Recursion Sterilization

Every review must ask:

- Can this change trigger itself?
- Can an event handler re-emit the event it consumes?
- Can a retry schedule overlap with itself?
- Can a hook update cause the same hook to run again indefinitely?
- Can a migration run repeatedly with different outcomes?
- Can two async writes overwrite each other?
- Can a cache, queue, SSE stream, polling loop, worker, or MCP bridge create an echo loop?
- Can a fallback path persist or display state that users believe is authoritative?

Preferred anti-recursion controls:

- Idempotency key
- Monotonic request sequence
- Abort controller or stale-response guard
- Transaction boundary
- Single-writer queue
- Unique constraint with conditional update
- Bounded retry count
- Explicit lifecycle state machine
- Event origin marker
- Reentrancy guard

### Phase 4: Fix Disambiguation

Every fix instruction must answer:

1. Who owns the fix?
2. What exact file or module changes?
3. What exact behavior changes?
4. What invariant must hold after the change?
5. What must not change?
6. What verifies the fix?
7. What rollback is safe?
8. What remains unknown?

If any answer is missing, the instruction is ambiguous and must not be handed to another AI as implementation-ready.

### Phase 5: Minimal Logical Choice

Choose the fix with this priority order:

1. Preserve security and VAELRIX_LAW
2. Preserve schema and server authority
3. Preserve deterministic behavior
4. Preserve user data and persistent state
5. Minimize blast radius
6. Match existing local patterns
7. Add the least abstraction that solves the real problem
8. Prefer deleting redundant behavior over adding competing behavior
9. Prefer bounded state machines over implicit lifecycle assumptions
10. Prefer direct tests over broad snapshots

If two fixes tie, prefer the one with fewer ownership crossings and clearer rollback.

### Phase 6: Verification Gate

Define verification before or alongside the fix:

- Exact command
- Expected output class
- Manual inspection target
- Regression file or test name
- Not-run reason if unavailable

Do not mark a finding resolved until verification has evidence.

### Phase 7: Residual Risk

End every review with:

- Remaining unknowns
- Tests not run
- Schema or law update proposals
- Handoff needs
- Monitoring or follow-up suggestions

---

## 9. Fix Instruction IR

Use this JSON block for implementation-ready fixes.

```json
{
  "sisp_fix_ir_version": "1.0.0",
  "id": "SISP-FIX-v1-001",
  "finding_id": "SISP-REV-v1-001",
  "owner": "codex | claude | gemini | arbiter | unity | angel | unknown",
  "category": "SECURITY | LAW | SCHEMA | DETERMINISM | RECURSION | PERSISTENCE | ASYNC | STATE | BOUNDARY | TEST | UX | MAINTAINABILITY",
  "severity": "CRITICAL | HIGH | MEDIUM | LOW",
  "evidence_tier": "Direct Evidence | Contract Evidence | Local Pattern Evidence | Inference | Hypothesis | Unknown",
  "target_files": [],
  "forbidden_files": [],
  "preconditions": [],
  "exact_change": "",
  "invariant_after_fix": "",
  "anti_recursion_rule": "",
  "verification": {
    "commands": [],
    "manual_checks": [],
    "expected_result": ""
  },
  "rollback_plan": "",
  "requires_schema_change": false,
  "requires_law_update": false,
  "requires_handoff": false,
  "remaining_unknowns": [],
  "checksum_status": "not_implemented"
}
```

Rules:

- One IR object per fix.
- One primary owner per IR object.
- Do not bundle unrelated fixes.
- Do not include files the owner cannot write.
- Do not use vague verbs such as "improve", "handle better", or "make robust" without exact behavior.
- Do not use `requires_schema_change: false` until schema consumers have been checked.

---

## 10. Review Report Format

Full SISP reviews must use this shape:

```markdown
# SISP Review Report

## 1. Verdict
Pass / Block / Needs Evidence / Escalate

## 2. Findings
Ordered by severity. Each finding includes:
- ID
- Category
- Severity
- Evidence tier
- File and line reference
- Impact
- Required fix

## 3. Evidence Ledger
List direct evidence, contract evidence, local patterns, inferences, hypotheses, and unknowns.

## 4. Recursion Sterilization
State recursion risks found or explicitly ruled unknown.

## 5. Fix Instruction IR
Include one JSON object per implementation-ready fix.

## 6. Verification Plan
Commands, manual checks, expected outcomes, and tests not run.

## 7. VAELRIX Compliance
Schema sovereignty, server authority, security, bytecode, ownership, and law-update evaluation.

## 8. Handoff / Escalation
Who must act next and what they own.

## 9. Residual Risk
Remaining unknowns and monitoring needs.
```

For quick reviews, findings may lead and the rest may be compressed, but do not omit evidence tier, recursion risk, or verification status.

---

## 11. VAELRIX Stop Conditions

Stop and escalate when:

- A needed schema is absent from `SCHEMA_CONTRACT.md`
- A fix changes UI-owned files from a backend lane or backend-owned files from a UI lane
- A client becomes authoritative over a server-owned outcome
- A persistent shape changes without schema notice
- A proposed fix stores unsaved user work without explicit consent
- A security input surface lacks allow-list validation
- A destructive command is required but not explicitly authorized
- A fix needs another agent's domain decision
- Evidence is insufficient for a high-severity conclusion

Escalation format:

```text
ESCALATION: SISP_BLOCKER
- Finding ID:
- Blocker:
- Evidence:
- Affected Law / Contract:
- Owner Needed:
- Decision Needed:
```

---

## 12. Clean Fix Heuristics

A clean fix usually:

- Removes one failure path instead of masking symptoms
- Makes invalid states impossible or explicit
- Has one source of truth
- Uses structured parsing instead of ad hoc string logic
- Uses a transaction or idempotency boundary for multi-write persistence
- Has a single terminal state for async workflows
- Keeps UI state decorative when the server is authoritative
- Produces a smaller API surface than the broken design
- Leaves unrelated files untouched
- Adds focused tests at the contract boundary

A suspect fix usually:

- Adds another polling loop without stale-response control
- Adds fallback state that looks persisted
- Catches and ignores persistence errors
- Adds a second schema shape
- Changes a test to match broken behavior
- Uses broad refactors to hide a small bug
- Crosses agent ownership without escalation
- Turns a race into "last write wins" without saying so

---

## 13. Bytecode-Style Review Token

When a compact identifier is useful, use:

```text
SISP-REV-v1-{CATEGORY}-{SEVERITY}-{OWNER}-{NNNN}
SISP-FIX-v1-{CATEGORY}-{SEVERITY}-{OWNER}-{NNNN}
SISP-AUDIT-v1-{RESULT}-{OWNER}-{NNNN}
```

Examples:

```text
SISP-REV-v1-PERSISTENCE-HIGH-CODEX-0001
SISP-FIX-v1-ASYNC-MEDIUM-CLAUDE-0002
SISP-AUDIT-v1-BLOCK-CODEX-0003
```

These tokens are review identifiers, not cryptographic bytecode. Do not confuse them with `PB-ERR-v1` until checksum tooling exists.

---

## 14. Final Reviewer Checklist

Before sending a SISP review, confirm:

- [ ] Findings are severity ordered
- [ ] Each finding has file/line evidence or is labeled hypothesis/unknown
- [ ] Each fix has one owner and one primary action
- [ ] Recursion risks are inspected
- [ ] Async and persistence boundaries are inspected when relevant
- [ ] Schema impacts are checked
- [ ] VAELRIX_LAW stop conditions are checked
- [ ] Tests or verification commands are explicit
- [ ] Tests not run are disclosed
- [ ] Handoffs are clear
- [ ] No false certainty appears in the report

---

## 15. Adoption Notes

SISP is a skill, not law by itself. To make it mandatory, Angel should approve one of these adoption levels:

| Level | Meaning |
|---|---|
| Advisory | Agents may use SISP for complex reviews |
| Default | Agents use SISP for all non-trivial reviews |
| Mandatory | `VAELRIX_LAW.md` references SISP as the required code review protocol |

Until then, treat SISP as the cleanest available review framework, but do not present it as an approved law update.
