Create a copy-ready Markdown file titled "[feature-name]-pdr.md" for my [project] codebase.

> [!IMPORTANT]
> **Rename the file before saving.** Recommended convention: `[YYYY-MM-DD]-[short-name]-pdr.md` (matches the dated PDR catalog at `docs/.../PDR-archive/`). The title above is a placeholder; do not ship a file literally named `[feature-name]-pdr.md`.

---

## Owner(s)
- **Codex:** [schemas, layer law, engine architecture — what this agent owns in this PDR]
- **Claude:** [UI, visuals, a11y — what this agent owns in this PDR]
- **Gemini:** [backend impl, tests, CI — what this agent owns in this PDR]
- **Escalation owner** (cross-domain conflicts): [Angel / repo owner / a specific named owner]

## Context (seed — not the Executive Summary)
[2–3 sentences. Plain language. The Executive Summary in §1 expands on this. Do not duplicate; the seed is what an executive skims in 5 seconds.]

## Target Integration Area
[File path / folder / module / route / engine / subsystem this PDR affects. The "where it goes."]

## Core Concept
[One paragraph. Plain language. Include metaphor / model / math / system inspiration if relevant.]

## Implementation Philosophy
Treat this as a real engineering handoff for an AI coding agent and future maintainers. Prefer small composable edits, deterministic behavior, adapter layers where existing contracts are uncertain, and no unnecessary rewrites. Preserve existing behavior unless a change is explicitly justified.

## Ownership & Law Compliance
This PDR must respect the project's file-ownership / agent-jurisdiction rules (e.g., `VAELRIX_LAW.md`, `AGENTS.md`). Every file path this PDR writes must appear in §7 (Architecture / File Map) with its owning agent. Cross-domain conflicts are not resolved unilaterally; they are sent to the Escalation owner in the project's `ESCALATION:` block format.

---

## Required Sections

1. **Executive Summary** — 3–7 sentences. What, why, blast radius, current status.
2. **Out of Scope / Non-Goals** — what this PDR explicitly does NOT build. Mandatory. Prevents scope creep.
3. **Spec Sheet** — functional spec (with acceptance criteria), non-functional spec (latency, CPU, memory, accessibility, determinism), contracts (data shapes, schemas, public APIs), and any item deferred to a follow-up PDR.
4. **Change Classification** — cosmetic | structural | behavioral | architectural. Each tag with a one-line rationale.
5. **Assumptions and Unknowns** — assumptions explicit; unknowns surfaced and escalated.
6. **Open Questions / Escalations** — distinct from §5. These are *conflicts* that require an owner decision, not missing information. Use the project's `ESCALATION:` block format.
7. **Architecture / File Map** — directories, modules, dependency graph, and the file-ownership table. A tree is fine; no ASCII diagram required.
8. **Step-by-Step Implementation Plan** — ordered phases, each with: owner, approximate time, milestone, and exit criteria. Phases must be safe to ship independently behind a flag.
9. **Code Examples for the 5–10 Most Pivotal Changes** — runnable snippets, not pseudocode. One snippet per pivotal change. Skip boilerplate.
10. **Glossary** — every term a reader outside the owning domain would not recognize. One line each.
11. **Q&A — Top 10 Most Confusing Implementation Concerns** — and their solves. The reader is a future maintainer or a fresh agent picking this up cold.
12. **QA Plan** — exact file paths of new tests, exact commands using **your project's actual package manager and test runner** (e.g., `npm`/`pnpm`/`yarn`, `vitest`/`jest`/`pytest`/`cargo test`/`go test`), and runnable test code examples.
13. **Regression Risks and Specific Retest Checklist** — exact scenarios to re-run, with file paths and command snippets.
14. **Rollout Plan** — feature flags, shadow mode, A/B compare, canary cohort, and **how the system should run before it is complete**. The "incomplete-but-safe" clause is mandatory. Include explicit rollback steps.
15. **Definition of Done** — the enforceable list, not aspirations. Every box must be mechanically checkable.
16. **Final Architectural Verdict** — one of: `Safe and complete` | `Complete with acceptable risk` | `Functionally complete but needs follow-up` | `Partial implementation` | `Blocked / unresolved`. With one paragraph of unspun reality.
17. **References** — every existing file, schema, PDR, ADR, and external doc this PDR depends on. Bullet paths and one-line purpose each.
18. **Post-Implementation Report Handoff** — the exact filename and date for the PIR this PDR will require, per the project's PIR template (e.g., `docs/.../post-implementation-reports/PIR-[YYYYMMDD]-[SHORT_NAME].md`). A PDR that ships without a corresponding PIR is incomplete.

---

## Constraints

- Make the document copy-ready Markdown. No placeholders left in the shipped file.
- Do not give vague advice. Every recommendation must be actionable.
- Include practical code examples, not pseudocode only.
- Preserve existing public APIs unless there is a strong reason not to. State the reason.
- Use adapter layers when existing file contracts are uncertain. The adapter is the seam.
- Feature flags / shadow / warn / gate / canary rollout modes are required, not optional.
- All scoring, validation, ordering, or diagnostic output must be deterministic. Same input → same output → same bytes.
- Include exact QA commands using your project's actual package manager and test runner.
- Label what could break and how to retest it. No silent regressions.
- Every file this PDR writes must be in §7 with its owning agent. Law-compliance is mandatory, not aspirational.
- Make it suitable to hand directly to Codex, Claude, Gemini, or another implementation agent without further translation.

---

## Acceptance Criteria

The PDR must tell an implementation agent:
- **What** to build (§3)
- **Why** it exists (§1, §4)
- **Where** it goes (§7)
- **Who** owns each file (§7)
- **How** to build it step by step (§8)
- **What the 5–10 most pivotal code changes look like** (§9)
- **How** to test it (§12)
- **How** to avoid breaking existing behavior (§13, §11)
- **How** the incomplete version should safely run before final enforcement (§14)
- **What** "done" means, mechanically (§15)
- **What** the post-implementation PIR is named, so it cannot be skipped (§18)
