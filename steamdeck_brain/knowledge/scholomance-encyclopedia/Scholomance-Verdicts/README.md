# Scholomance Verdicts

## The Judgment Layer of the Encyclopedia

> "An architecture is born when ratified. It earns its place when judged."

**Bytecode Search Code:** `SCHOL-ENC-BYKE-SEARCH-VERDICTS`

---

## Purpose

Scholomance Verdicts are **structured product reviews** of architectural artifacts — encyclopedia entries, PDRs, implemented features, and ratified canon. They sit downstream of intent (PDR) and implementation (PIR), and apply a judgment lens grounded in:

- **VAELRIX_LAW.md** — every violation cited and weighted
- **ByteCode Error System** — severity vocabulary (`FATAL`/`CRIT`/`WARN`/`INFO`) is the only severity vocabulary
- **Quantified scoring** — seven metrics, anchored 0–10, no bare numbers
- **Remediation tiers** — every verdict produces actionable work across four horizons

Verdicts are not opinions. They are inscribed judgments rendered in a fixed schema.

---

## When to Render a Verdict

A Scholomance Verdict is rendered when:

1. **A new architectural canon entry is ratified** (`ARCH-*` in the encyclopedia)
2. **A major PDR is approved or moves to `In Progress`** and Angel requests audit
3. **A subsystem is suspected of drift** and a re-judgment is warranted
4. **Angel issues the directive: "RENDER VERDICT"** with a target document path

A verdict on the same target may be re-rendered when conditions change. Older verdicts are not deleted — they remain as a temporal record of how the architecture was viewed at that point in its evolution.

---

## File Naming Convention

```
VERDICT-[YYYY-MM-DD]-[TARGET-SHORT-NAME].md                      ← single-auditor canonical verdict
VERDICT-[YYYY-MM-DD]-[TARGET-SHORT-NAME]-[AUDITOR-ID].md         ← partial verdict (multi-auditor case)
VERDICT-[YYYY-MM-DD]-[TARGET-SHORT-NAME]-RECONCILIATION.md       ← reconciliation across partials
```

Examples:

- `VERDICT-2026-04-27-IMMUNE-SYSTEM.md`
- `VERDICT-2026-05-12-TURBOQUANT-BRIDGE-claude-ui.md` (partial)
- `VERDICT-2026-05-12-TURBOQUANT-BRIDGE-codex.md` (partial)
- `VERDICT-2026-05-12-TURBOQUANT-BRIDGE-RECONCILIATION.md` (final canonical)

---

## Required Structure

Every verdict adopts the PDR-archive structural skeleton (numbered sections, classification header, success criteria), with the **Scholomance Verdict** style overlay:

```markdown
# VERDICT-[YYYY-MM-DD]-[TARGET-SHORT-NAME]

## Bytecode Search Code
`SCHOL-ENC-BYKE-SEARCH-VERDICT-[CODE]`

## Verdict Identity
- Target: [path to audited document]
- Auditor(s): [agent ID, or list of agent IDs for multi-auditor]
- Date Rendered: [YYYY-MM-DD]
- Re-Render Due: [YYYY-MM-DD — see Temporal Re-Render Rule below]
- Audit Frame: [Vaelrix Law + ByteCode Error System + auditor specialty lens]
- Verdict Class: [SINGLE-AUDITOR | PARTIAL | RECONCILIATION]
- Status: [DRAFT | RENDERED | RE-RENDERED | STALE | SUPERSEDED-BY-<verdict-id>]

## 1. Scoring Sigil
[Seven-metric table + Verdict Grade. See "Scoring Rubric" below.]

## 2. Validated Praise
[Specific technological achievements, quoted from target with line citations.]

## 3. Architectural Concerns
[What needs work, ranked by severity per ByteCode Error System.]

## 4. Law Violations
[Each violation: cited law clause, evidence in target, severity, recommended remedy.]

## 5. Admonishment of the Arbiter
[Where the Arbiter's procedural shortcuts undermined the law structure itself.
 Direct address. No softening.]

## 6. Recursive Bug Elimination
[Specific recurring failure modes the audited system can defend against.
 Tied to encyclopedia history where possible.]

## 7. Remediation Tiers
[Four tables: Immediate | 30 Day | 90 Day | Long Term. All four mandatory.
 Empty tiers must say "NONE — <justification>".]

## 8. Final Verdict
[One paragraph synthesis. Verdict Grade restated. Conditions for re-rendering.]
```

---

## Scoring Rubric

**Scale: 0–10, anchored.** Each score requires a one-line justification — bare numbers are inadmissible.

| Metric | Polarity | What it measures | Anchors |
|---|---|---|---|
| **Impact Score** | ▲ higher better | Value delivered if shipped well | 0=cosmetic · 5=meaningful subsystem · 10=load-bearing canon |
| **Revenue Potential** | ▲ higher better | $ retention/conversion lift, infra cost saved, agent-hours saved | 0=none · 5=measurable infra savings · 10=changes pricing/cost model |
| **Architecture Risk** | ▼ higher worse | Blast radius if the design is wrong | 0=isolated · 5=cross-layer coupling · 10=violates SCHEMA_CONTRACT |
| **UX Friction** | ▼ higher worse | Pain delivered to humans/agents in daily flow | 0=invisible · 5=one extra click · 10=blocks routine work |
| **Law Violations** | ▼ higher worse | Count + severity vs. VAELRIX_LAW tenets | 0=clean · 3=one WARN · 7=CRIT · 10=FATAL |
| **Immune Potential** | ▲ higher better | How much L1/L2/L3 immunity can defend or accelerate this surface | 0=irrelevant · 5=adaptive scan applies · 10=core immune substrate |
| **Innovation Rating** | ▲ higher better | Novelty + transferability of the technique | 0=table stakes · 5=clever local solution · 10=publishable substrate |

### Verdict Grade Synthesis

A single letter grade — **S / A / B / C / D / F** — synthesized from the seven metrics. Not a blind average. Capping rules:

- A **FATAL** Law Violation caps the grade at **D** regardless of other scores.
- A **CRIT** Law Violation caps the grade at **B**.
- Architecture Risk ≥ 8 caps at **C** unless paired with Immediate-tier remediation already accepted.
- Innovation Rating does not absolve risk. A novel technique with high architectural risk is still a B at best.

---

## Grade Phenotypes (Calibration Anchors)

Each grade is defined by **absolute phenotype**, not relative position. Auditors must consult these anchors before scoring — never the most recent verdicts of similar artifacts. Relative grading induces drift; phenotype anchoring resists it.

### S — Exemplary
- Zero law violations at any severity
- Innovation Rating 9–10, Impact Score 9–10
- Architecture Risk ≤ 3
- All concerns are INFO-tier
- The architecture is a pattern that other architectures should explicitly emulate
- **Frequency:** Rare. Expect 0–1 per calendar year across the entire encyclopedia.

### A — Excellent
- Zero CRIT or higher law violations
- All Immediate-tier remediation items are ≤ INFO severity
- Architecture Risk ≤ 5
- Concerns exist but are scoped, corrigible without architectural rework, and have clear remediation paths
- The architecture is canon-grade as ratified

### B — Good (with Specific Friction)
- Up to 1 CRIT-bordering law violation, **OR**
- Up to 3 WARN-tier law violations, **OR**
- One unresolved CRIT concern with clear remediation path
- Innovation Rating may be 8–10 but cannot fully offset law/risk gaps
- The architecture is sound; the procedural execution or specification is what holds it below A

### C — Mediocre
- Multiple CRIT law violations, **OR**
- Architecture Risk ≥ 7 with no Immediate-tier mitigation accepted
- Foundations are sound but execution requires significant rework before the next phase
- Innovation cannot lift this grade

### D — Failing
- One FATAL law violation, **OR**
- Architecture Risk ≥ 9, **OR**
- Multiple CRIT violations compounding in the same surface
- The architecture should not progress to the next implementation phase without remediation

### F — Rejected
- Multiple FATAL law violations
- The architecture is structurally unsound
- Recommend supersession or replatforming

---

## Calibration Discipline

To resist grade drift across the verdict corpus:

1. **Anchor to phenotype, not history.** Auditors consult the Grade Phenotypes (above) before scoring. Auditors must not consult prior verdicts of similar artifacts during scoring — that induces "B+ creep."
2. **No relative grading.** "This is better than the last one" is not a basis for a grade. "This matches the B phenotype" is.
3. **Quarterly calibration sweep.** Every 90 days, the auditor pool reviews all verdicts rendered in the prior quarter. Any verdict whose grade has drifted from its phenotype is re-rendered with a `CALIBRATION_CORRECTION` flag in §1 (Scoring Sigil) explaining the correction.
4. **Calibration Audit Trail.** When a calibration correction is applied, the prior grade is preserved with strikethrough and the new grade follows: `~~B+~~ → C (calibration correction 2026-07-27 — phenotype review)`.

---

## Severity Vocabulary

The only severity vocabulary used in verdicts is the ByteCode Error System ladder:

| Severity | Meaning | Example Trigger |
|---|---|---|
| **FATAL** | Architecture cannot ship without remediation | Schema violation, unauthenticated authoritative endpoint |
| **CRIT** | Must remediate before next milestone | Law 13 violation, parallel schema invented |
| **WARN** | Should remediate within quarter | Under-specified UI surface, missing edge case mitigation |
| **INFO** | Track, no immediate action | Documentation drift, non-load-bearing inconsistency |

Bytecode error citations follow the canonical schema:
`PB-ERR-v1-{CATEGORY}-{SEVERITY}-{MODULE}-{CODE}` per `docs/ByteCode Error System/`.

---

## Remediation Tier Schema

Four mandatory tiers. Every tier table has the same columns:

| Column | Required | Description |
|---|---|---|
| Action | Yes | Concrete imperative ("Move types into SCHEMA_CONTRACT.md") |
| Owner | Yes | Agent ID from collab registry (`claude-ui`, `codex`, `gemini-*`, `Angel`) |
| Severity | Yes | FATAL/CRIT/WARN/INFO per ByteCode Error System |
| Cost | Yes | Agent-hours OR $ estimate — one or the other, not vague |
| Reversibility | Yes | `cheap` (easy backout) or `one-way` (architectural commitment) |
| Success Criterion / Trigger | Yes | What proves done, OR what wakes the action back up |

**Tier definitions:**

| Tier | Horizon | Purpose |
|---|---|---|
| **Immediate** | This commit / open PR / current sprint cycle | Bleeding stops here |
| **30 Day** | Next sprint window | Compliance + foundation hardening |
| **90 Day** | Next quarter | Phased rollout milestones, soak periods |
| **Long Term** | Architectural horizon | Cross-system implications, publication, replatforming triggers |

Empty tiers are permitted only with explicit justification: `NONE — <reason>`.
Skipped tiers without justification → Verdict is rejected and re-rendered.

---

## Multi-Auditor Protocol (Cross-Jurisdictional Canon)

For architectural canon that spans **≥ 2 jurisdictional domains**, single-auditor verdicts are structurally insufficient. A single auditor's specialty lens introduces blind-spot bias proportional to the architecture's surface coverage.

### Definition of Cross-Jurisdictional

A canon entry is cross-jurisdictional when it mandates work in modules owned by ≥ 2 distinct agents per the jurisdiction tables in `CLAUDE.md`, `GEMINI.md`, and Codex's authority over `codex/`. Concretely, if implementing the canon requires writes in two or more of:

- `src/pages/`, `src/components/`, `*.css` (Claude)
- `codex/server/`, `codex/runtime/`, `codex/services/`, `codex/core/` (Codex/Gemini)
- `SCHEMA_CONTRACT.md`, `src/lib/`, `src/hooks/` (Codex)
- `tests/`, `.github/workflows/` (Gemini)

…then the canon is cross-jurisdictional and triggers this protocol.

### Protocol

1. **Each affected jurisdiction renders a Partial Verdict.** Filed as `VERDICT-[date]-[name]-[auditor-id].md`. Each Partial Verdict has its own Scoring Sigil — auditors do not see each other's scores until partials are filed.
2. **Reconciliation Document.** A canonical `VERDICT-[date]-[name]-RECONCILIATION.md` aggregates the partials and contains:
   - Each partial verdict's grade, in a comparison table
   - **Convergence:** points where auditors agreed (with each auditor's reasoning quoted)
   - **Divergence:** points where auditors disagreed (with each position quoted, no synthesis attempted)
   - **Reconciled Grade:** the canonical grade after applying the reconciliation rules below
3. **Partials persist.** Partial verdicts are not deleted after reconciliation — they remain as evidence of the lens-specific concerns each auditor surfaced.

### Reconciliation Rules (No Averaging)

- **Default:** the **lowest grade** among the partials wins. If `claude-ui` says A and `codex` says C, the reconciled grade is C.
- **Upward Petition:** any auditor may petition the Arbiter for upward reconciliation. The petition must cite specific concerns from the lower-grading partial and demonstrate why those concerns do not apply at the level the lower auditor weighted them. Arbiter ratifies or rejects.
- **No Averaging.** "B-and-D averages to a low B" is structurally forbidden. Averaging hides where the architecture is actually weak.

### Single-Auditor Exemption

A canon entry that lives entirely within one jurisdiction may be rendered by a single auditor. UI-only changes, schema-only changes, backend-only changes — all single-auditor unless the canon explicitly affects cross-cutting laws (Law 3, Law 6, Law 7, Law 13).

---

## Temporal Re-Render Rule

Every Verdict carries a mandatory **`Re-Render Due`** date. After this date the verdict is automatically marked `STALE` and the canon it judges loses its current grade pending re-render.

### Default Re-Render Windows

| Canon Class | Re-Render Window | Rationale |
|---|---|---|
| Stable infrastructure (post-Phase-6, > 2 implementations downstream) | 24 months | Drift is slow; re-render is expensive; mostly checking for new law evolution |
| Standard architectural canon | 12 months | One full year is enough for assumptions to age, dependencies to shift, and Long-Term remediation items to either resolve or rot |
| High-risk surface (Architecture Risk ≥ 7) | 6 months | Risk concentration warrants closer recalibration |
| Experimental / pre-Phase-2 | 3 months | Architecture is still proving itself |

### Re-Render Mechanics

- The new Verdict is filed at the same target with a new dated filename.
- Old Verdict status changes to `SUPERSEDED-BY-<new-verdict-id>`.
- **Long-Term remediation items in the prior verdict that remain unaddressed become Immediate or 30-Day items in the re-rendered verdict.** This is the mechanism that prevents Long-Term tier rot.
- The re-render must include a **Drift Note** in §1: what changed in the architecture's surroundings since the prior verdict, and how that changed the grade.

### Premature Re-Render Triggers

A Verdict may be re-rendered before its Re-Render Due date if any of:

- A material remediation from the prior verdict ships (especially when it's expected to lift the cap)
- A Phase boundary in the canon's rollout passes
- A law amendment changes how prior law violations are scored
- The Arbiter requests it

Premature re-renders preserve the prior verdict identically — they don't replace it on the basis of stale assumptions.

---

## Immune System Coupling

**Verdicts are themselves architectural canon. They are subject to the immune system audit defined in `ARCH-2026-04-26-IMMUNE-SYSTEM.md`.**

This closes the recursive loop: the audit framework is auditable by the same system the audits cover.

### How Verdicts Pass Through the Three Layers

| Layer | What it checks for Verdicts | Example bytecode emission on failure |
|---|---|---|
| **L1 — Innate** | Format compliance: required sections present, severity vocabulary correct (FATAL/CRIT/WARN/INFO only), all four remediation tiers populated, scoring metrics in valid 0–10 range, polarity arrows present, Verdict Identity complete | `PB-ERR-v1-LINGUISTIC-CRIT-LING-0F03` (parallel-format invention if a custom severity is used) |
| **L2 — Adaptive** | Pattern match against verdict-pathogen registry. Seed pathogens: `pathogen.praise-without-concerns`, `pathogen.all-CRIT-severity-flatness`, `pathogen.relative-grading-citation`, `pathogen.empty-tier-without-justification` | `PB-ERR-v1-VALUE-WARN-COLBYT-0703` (severity-byte mismatch — semantic) |
| **L3 — Override** | Arbiter may override a flagged Verdict with `IMMUNE_OVERRIDE: verdict-format-deviation` + reason + authority | Audit-logged, surfaced on dashboard |

### Verdict-Specific Pathogens (Seed List)

These are the Verdict-class anti-patterns the adaptive scanner watches for. Every entry is rooted in §Anti-Patterns below.

- **`pathogen.praise-without-concerns`** — A Verdict whose Validated Praise section has ≥ 3 items but Architectural Concerns has 0. Flattery is structurally indistinguishable from this signature.
- **`pathogen.all-CRIT-severity-flatness`** — A Verdict where every concern carries the same severity. Mirrors the same anti-pattern flagged in the immune system itself (universal CRIT = universal noise).
- **`pathogen.relative-grading-citation`** — A Verdict that references "the last verdict" or "compared to prior" anywhere in the grading rationale. Calibration discipline violation.
- **`pathogen.empty-tier-without-justification`** — A remediation tier table that is empty without an explicit `NONE — <reason>` row.
- **`pathogen.single-auditor-on-cross-jurisdictional`** — A single-auditor verdict on canon that should have triggered the multi-auditor protocol.

When a new Verdict-class anti-pattern graduates via L3 audit, it is auto-appended here per the immune system's adaptive-memory loop.

---

## Anti-Patterns (What a Verdict Is Not)

- **A verdict is not a PIR.** PIRs document what shipped. Verdicts judge what ratified.
- **A verdict is not a bug report.** Bug reports describe a failure. Verdicts evaluate an architecture.
- **A verdict is not a code review.** Code reviews evaluate diffs. Verdicts evaluate canon.
- **A verdict is not optional praise.** Praise without scored concerns is rejected as flattery.
- **A verdict is not anonymous.** The auditor's collab agent ID is part of the verdict identity.

---

## Related Documents

- `VAELRIX_LAW.md` — the law referenced in every Law Violations section
- `docs/ByteCode Error System/` — the severity vocabulary
- `docs/scholomance-encyclopedia/PDR-archive/README.md` — the structural skeleton verdicts inherit
- `docs/scholomance-encyclopedia/README.md` — the parent encyclopedia
- `SHARED_PREAMBLE.md` — agent coordination protocols

---

*A verdict is a mirror, not a hammer. The architecture is what it is — the verdict only tells you what it is.*

*Directory created: 2026-04-27. First verdict: VERDICT-2026-04-27-IMMUNE-SYSTEM.md.*
