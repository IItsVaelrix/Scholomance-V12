# Design: Close the SCD64 loop for `tokenWeightError` → `SCORE_DRIFT`

- **Date:** 2026-06-21
- **Status:** Approved for implementation planning
- **Scope:** Full loop, one family (`SCORE_DRIFT`). Other `tokenWeightError` kinds are a documented follow-on pattern.

## Problem

`src/core/tokenization/tokenWeightError.ts` is a runtime diagnostic that computes a transparent reference token weight and compares it against the ranker's actual scores, flagging `OVER_WEIGHTED` / `UNDER_WEIGHTED` (and three sanity-check kinds) anomalies. It currently emits an ad-hoc, un-canonicalized vocabulary (`TokenWeightError.kind` + a `investigateIn` string pointing at a *file*).

Meanwhile the SCD64 system is a knowledge artifact: a glossary of 4 hand-authored bug families (all `COLOR` domain, version bytes `01`–`04`), decoded-on-hover, regression-tested, and MCP-queryable. `generateSCD64()` is **not yet called in production** — nothing mints a *confirmed* fingerprint at runtime. The live diagnostic channels are `BytecodeError` (red) and `BytecodeHealth` (green); the canonical confirmed-diagnostic record is built by `SpatialImmuneOrchestrator._generateSCD64Impl` (`SCD64_DIAGNOSTIC` schema: `checksum64`, `slots`, `runtimeEvidence`, `glossary`, `mcpIndexes`).

**`tokenWeightError` is the ideal first runtime detector to mint a *confirmed* SCD64** — it already holds real runtime evidence (deviation magnitudes from an actual ranked document), which is strictly stronger than the static/predicted path in the IntelliSense PDR. This design makes it the first non-`COLOR` confirmed-SCD64 source.

## Key structural facts (verified in code)

- The checksum is derived purely from a family's 8 canonical slot strings (`sha256` per slot, BUGCLASS prefixed with the version byte). Runtime evidence is carried *separately* in the `runtimeEvidence` blob, not baked into the hex.
- There are **two independent `BUG_FAMILIES` tables**:
  - `src/core/scd64/glossary.ts` — no `equations`; drives decode/glossary (`SCD64_GLOSSARY`).
  - `codex/core/immunity/spatial-immune-orchestrator.js:54` — local `const BUG_FAMILIES`, includes `equations`; drives live emission via `generateSCD64(raid, qbitField, evidence)` (public, line 523; module wrapper line 1287).
- Existing version bytes used: `01` COLOR_DRAGON, `02` RESONANCE_GHOST, `03` GATE_DATA_ABSENT, `04` GATE_DRIFT_FALSE_ALARM. Next free: `05`.
- `auditTokenWeights` has **no production call sites** today — the integration point is greenfield.

## Architecture (3 units, each independently testable)

```
tokenWeightError.ts        (UNCHANGED — pure, dependency-free, DIAGNOSE_ONLY)
    │ produces TokenWeightError[]
    ▼
tokenWeightToSCD64.ts       (NEW bridge — the only unit that knows both vocabularies)
    │ maps a confirmed error → runtimeEvidence → calls orchestrator
    ▼
spatial-immune-orchestrator.generateSCD64('SCORE_DRIFT', raid, qbit, {runtimeEvidence})
    │ returns canonical SCD64_DIAGNOSTIC (checksum64, slots, glossary, mcpIndexes)
    ▼
recorded + auto-vectorized into the SCD64 search index → MCP/glossary/remediation
```

`tokenWeightError.ts` keeps its zero-dependency purity (its best quality). The bridge is the single seam translating the tool's vocabulary into SCD64; either side can change without touching the other.

## Component 1: The `SCORE_DRIFT` family

New domain `SCORING`, version byte `05`, predicted `E5`. The 8 canonical slot strings (these *are* the checksum — authored once, fixed forever):

```
BUGCLASS : SCORE_DRIFT:ranker-score-diverges-from-reference-token-weight
COORDSYS : reference-weight-TFIDF×syllable×position vs ranker-aggregate-of-8-providers
INVARIANT: abs(rankerScore-referenceWeight)<=deviationThreshold-for-auditable-tokens
MAGNITUDE: abs(deviation)>0.25+meanAbsoluteDeviation+worstTokenDelta
MASKING  : provider-level-weights-conceal-per-token-miscalibration-until-final-list
GATE     : referenceWeight>=MIN_AUDITABLE_WEIGHT(0.05)+token-was-ranked
PROPAGATE: provider-scoring-to-ranker-DEFAULT_WEIGHTS-to-ranked-list-to-output
VERDICT  : diagnose-only+over-or-under-weighted+inspect-provider-vs-DEFAULT_WEIGHTS
```

Registered in **both** family tables. The orchestrator copy additionally gets an `equations` block expressing the reference-weight formula as a first-class equation (makes it searchable in the vector index):

```
referenceWeight = clamp01( idfProxy × (1 + syllableSalience) × positionalFactor + rarity × RARITY_WEIGHT_SCALE )
  idfProxy        = 1 / (1 + termFrequency)
  syllableSalience= max(0, syllableCount - 1) × SYLLABLE_SALIENCE_BONUS(0.08)
  positionalFactor= max(0.2, 1 - positionInLine × POSITIONAL_DECAY_PER_WORD(0.06))
```

Human-readable slot meanings added to `SLOT_HUMAN_MEANINGS` in `glossary.ts`, mirroring the existing families.

A unit test asserts the two tables' `SCORE_DRIFT` canonical strings are byte-identical so they cannot silently drift. **Table consolidation (orchestrator imports the shared glossary) is explicit follow-on tech debt** — it is the IntelliSense PDR's Phase 0 "move into shared package," out of scope here.

## Component 2: The bridge — confirmed-only gating

`tokenWeightToSCD64(error, diagnostic, auditContext) → SCD64_DIAGNOSTIC | null`

Namespace-integrity rules (the confirmed-vs-predicted firewall):

- Mints **only** when `error.kind ∈ {OVER_WEIGHTED, UNDER_WEIGHTED}` **and** `error.rankerScore !== undefined` (the token was actually ranked). No ranker score = a hypothesis, not runtime evidence → returns `null`, never a confirmed `05`.
- The three non-drift kinds (`STOP_WORD_SCORED`, `MISSING_PHONETICS`, `SYLLABLE_MISMATCH`) are the documented follow-on families — bridge returns `null` for them in v1.
- Output is always **confirmed** (version byte `05`, never `E5`): `tokenWeightError` runs at runtime on real data, so its evidence is runtime evidence by construction. The predicted (`E`-prefixed) path belongs to the static IntelliSense matcher, not here.

`runtimeEvidence` mirrors the existing `backend / frontend / comparison` triad:

```
backend:    { referenceWeight, idfProxy, syllableSalience, positionalFactor, rarityBonus }
frontend:   { rankerScore }
comparison: { deviation, deviationThreshold, meanAbsoluteDeviation, worstToken, worstDeviation }
```

Language note: bridge is authored in TypeScript (matching `tokenWeightError.ts` and `src/core/scd64/*`), importing the ESM `.js` orchestrator wrapper.

## Component 3: Integration point (greenfield)

A new guarded call site: after `auditTokenWeights(...)`, when `hasTokenWeightErrors(diagnostic)` is true, map qualifying errors through the bridge and record each `SCD64_DIAGNOSTIC` (recording auto-vectorizes it into the orchestrator's SCD64 search index). The natural home is wherever ranked candidates are produced alongside an analyzed document. Gated behind an opt-in flag so it does not silently fire in the hot path until proven.

## Data flow

```
analyzed document + ranked candidates
→ auditTokenWeights()                      (existing, pure)
→ hasTokenWeightErrors()? if yes:
→ for each error: tokenWeightToSCD64()      (new bridge; null unless confirmed-eligible)
→ orchestrator.generateSCD64('SCORE_DRIFT', …, { runtimeEvidence })
→ SCD64_DIAGNOSTIC recorded + vectorized
→ MCP / glossary / remediation hints available by checksum64
```

## Error handling

- Bridge returns `null` (never throws) for non-eligible errors; callers skip nulls.
- Orchestrator already `console.warn`s on canonical/pinned mismatch; the `SCORE_DRIFT` family test guards against canonical authoring errors before they reach runtime.
- DIAGNOSE_ONLY preserved end-to-end: no pipeline state or source mutation; no circuit-breaker trip in v1.

## Testing

- **Family test:** `SCORE_DRIFT` checksum is deterministic across runs; two-table canonicals byte-identical; version byte `05`; decodes via existing `decodeSCD64`.
- **Bridge test:** `OVER_WEIGHTED` with `rankerScore` → confirmed `05…` diagnostic with correct `runtimeEvidence`; missing `rankerScore` → `null`; non-drift kinds → `null`.
- **Namespace test** (mirrors the IntelliSense PDR QA checklist): bridge never emits an `E`-prefixed predicted value; confirmed diagnostic carries real evidence; nothing predicted is written as confirmed.

## Decisions made (flag to flip)

1. **Dual-table duplication handled by add-to-both + equality test**, not a consolidation refactor (YAGNI for v1; consolidation logged as follow-on).
2. **Confirmed-only, gated on `rankerScore` presence** — the bridge refuses to mint without real ranker evidence.

## Non-goals

- Auto-fixing scores or mutating pipeline state.
- Tripping a circuit breaker from a score-drift diagnostic.
- Authoring the other four `SCORING` families (follow-on, same pattern).
- Consolidating the two `BUG_FAMILIES` tables.
- The static/predicted (`E5`) IntelliSense matcher for score drift.
