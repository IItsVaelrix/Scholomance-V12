# PDR: Semantic Calculus

**Status:** Draft (rev 2 — seal-last / immutability freeze)  
**Classification:** Architectural \| AI Intent IR \| LAW \| TurboQuant QBIT \| SCD64 \| SCDNA \| SQLite Memory  
**Priority:** Critical  
**Date:** 2026-07-16  
**Bytecode Search Code:** `SCHOL-ENC-PDR-SEMANTIC-CALCULUS-2026-07-16`

---

## Owner(s)

- **Codex:** Semantic Calculus IR schemas, formation/modulation formula registry, TurboQuant QBIT meaning-lattice contracts, SCD64 seal integration, SQLite theory bank schema, LAW/SCHEMA_CONTRACT alignment
- **Claude:** Operator review UI for theory bank (clarify/probe surfaces), a11y for Clarify flows, Visualiser/UI grounding adapters when guinea-pigging intent→action
- **Gemini:** Compiler pipeline impl, SCDNA cite wiring, vitest/pytest coverage, CI gates, feature flags
- **Escalation owner:** Angel / repo owner (LAW amendments, Promote-to-lexicon decisions, cross-domain gene vs schema conflicts)

## Context (seed)

AIs hallucinate when they interpret free English as permission. Semantic Calculus compiles human intent into a sealed, AI-writable IR whose meanings are produced only by codified formulas under modulation, grounded on a TurboQuant QBIT meaning lattice, warranted by SCDNA gene cites, sealed by SCD64, with unknowns deposited as theoretical concepts into a SQLite review bank—never as null.

## Target Integration Area

- `codex/core/semantic-calculus/` (new)
- `codex/core/quantization/turboquant.js` + QBIT lattice adapters (repurpose, do not fork religion)
- `steamdeck_brain/vaelrix_forcefield/scdna/` (cite genes; do not mint intent-as-gene)
- SCD64 diagnostic seal path (existing generate/seal contracts)
- New SQLite: `semantic_theory_bank.sqlite` (or env-path equivalent)
- Guinea-pig surface: Visualiser / discography UI intent (navigate, select, upload, collapse) before expanding to tools/agents

## Core Concept

Semantic Calculus is not a prettier English vocabulary. It is a **modulated formula language**: sealed formation formulas fire utterance+context into TurboQuant-quantized **semantic ballistics** on a QBIT lattice of meaning buckets; modulators (route, selection, gene confidence, risk) bend trajectories within bounds; impact yields a total typed term (`Do` | `Clarify` | `Probe` | `Forbidden` | `Escalate` | `Theory` | `Hypothesis`). Unbound landings are **theoretical concepts**, deposited in SQLite for review. AIs rewrite terms; they do not author formulas or treat theory as fact. LAW is the permission oracle; SCDNA genes are cited, not become. **SCD64 seals only the final, fully constructed act — nothing inside a sealed `SemanticAct` may mutate after sealing.**

## Implementation Philosophy

Small composable modules, deterministic evaluation (same input → same term bytes), adapter seams over TurboQuant/SCDNA/SCD64, feature-flagged guinea pig first. Preserve existing prediction/rhyme TurboQuant uses. Learn from measured rejection of SimHash/TurboQuant as sole rhyme equality gate: lattice retrieves candidates; LAW+formulas grant permission.

## Ownership & Law Compliance

Respect `VAELRIX_LAW.md`, `AGENTS.md`, `SCHEMA_CONTRACT.md`. Every new path appears in §7 with owning agent. Promote-to-lexicon and new formula registration require Escalation owner. Cross-domain conflicts use `ESCALATION:` blocks.

---

## 1. Executive Summary

Semantic Calculus is Scholomance’s intent IR for AI agents: humans speak; a total compiler always emits an actionable term; AIs read/write only inside that dialect. Meanings are determined by versioned formation and modulation formulas—not ad-hoc NLP. Geometry is a TurboQuant QBIT lattice of vectorized meaning buckets (semantic ballistics). Permission is LAW + SCDNA gene cites. Audit is SCD64 seals on acts. Unknowns are never null: they are theoretical concepts deposited into a SQLite theory memory bank for review; only explicit Promote makes them executable lexicon. Blast radius is architectural (new IR + bank + formula registry) with a narrow UI guinea pig first. Status: Draft PDR — not yet implemented.

## 2. Out of Scope / Non-Goals

- Not a general LLM replacement or open chat ontology.
- Not replacing SQLite FTS5, ritual graph prediction, or existing TurboQuant lexicon rerank paths.
- Not using TurboQuant/SimHash probabilistic collision as sole permission for `Do` (measured failure mode in rhyme signatures).
- Not minting SCDNA genes per ephemeral intent (cite genes; genes remain durable LAW/memory).
- Not auto-promoting theories to lexicon by embedding threshold alone.
- Not shipping a full multi-surface agent OS in v0 — Visualiser/UI intent guinea pig only.
- Not deleting retired theories (retire = status change, not null/delete).

## 3. Spec Sheet

### 3.1 Functional

| ID | Requirement | Acceptance |
|----|-------------|------------|
| F1 | **`compileSemanticIntent()` is total:** every human utterance+context → one sealed `SemanticAct` | Never returns `null`/`undefined`; unit tests cover Do/Clarify/Probe/Forbidden/Escalate/Theory/Hypothesis. **`maybeCompile()` is out of F1** — see F11 |
| F2 | Formation + modulation formulas are registry-versioned | Unknown formula id → compile error or Theory; no anonymous bends |
| F3 | Semantic ballistics: embed → TurboQuant → QBIT bucket address(es) | Deterministic address for fixed embed recipe + lattice map version |
| F4 | Margin law: thin margin → Clarify/Probe, not soft Do | Property tests on margin thresholds |
| F5 | SCD64 seals every **emitted** SemanticAct **last** — seal covers kind, payload, cites, law, ballistics, formulaIds | Seal bytes verify against canonical serialization of the full act body (cites included). Re-seal forbidden; mutation after seal is a hard error |
| F6 | SCDNA cite-not-become: `matchedGenes[]` with stableId+contentHash | Cites resolved **before** seal; no gene row created per act; forcefield apply uses cites |
| F7 | Theory ≠ null: unbound → Theory path + mandatory SQLite deposit **before** final kind + seal | Deposit uses `draftHash`; bank failure → final kind `Escalate` (then seal Escalate). Never seal Theory then rewrite kind |
| F8 | Theory bank review states: open / under_review / promoted / retired / merged | Status transitions tested; Promote gated |
| F9 | AI rewrite preserves or re-resolves cites | Rewrite = **new compile** (or explicit reseal pipeline); never mutate a sealed act in place |
| F10 | Treating Theory as Fact is illegal IR | Type/guard rejects Do on unpromoted theory |
| F11 | **`maybeCompile()` is the integration gate only** | Returns `null` iff `ENABLE_SEMANTIC_CALCULUS` is off (“Semantic Calculus did not run”). Must not be tested as F1. When flag on, delegates to total `compileSemanticIntent()` |
| F12 | Seal immutability law | Object.freeze / deep-freeze or equivalent; any post-seal field write throws `SEMANTIC_CALCULUS_SEAL_MUTATION` |

### 3.2 Non-functional

- **Determinism:** same utterance, context digest, formula versions, lattice map → bit-identical SemanticAct **body** (excluding wall-clock); SCD64 content hash is of that canonical body after cites + final kind.
- **Latency (v0 guinea pig):** compile (through seal) p95 &lt; 50ms on Steam Deck class CPU for UI intents.
- **Memory:** no unbounded lattice growth per request; theory bank writes are transactional and complete **before** seal.
- **Accessibility:** Clarify surfaces keyboard-operable; theory review list readable.
- **Security:** lexicon session / auth LAW genes must block Do on protected routes; removing auth in local scratch must not leak into Semantic Calculus defaults.

### 3.3 Contracts (sketch)

```ts
type CalculusKind =
  | 'Do' | 'Clarify' | 'Probe' | 'Forbidden'
  | 'Escalate' | 'Theory' | 'Hypothesis';

interface GeneCite {
  stableId: string;
  contentHash: string;
  whyMatched: string;
}

/** Pre-seal working state — mutable. Never emitted to agents/runtimes. */
interface SemanticDraft {
  version: 'SemanticCalculus-v0';
  preliminaryKind: CalculusKind;
  payload: Record<string, unknown>;
  cites: GeneCite[];
  law: 'allow' | 'clarify' | 'block' | 'escalate';
  contextDigest: string;
  draftHash: string; // identity for theory-bank deposit before final seal
  ballistics?: {
    latticeMapVersion: string;
    bucketIds: string[];
    score: number;
    margin: number;
  };
  formulaIds: { formation: string[]; modulation: string[] };
  theoryId?: string; // set only after successful bank deposit
}

/** Post-seal emit — immutable. seal covers entire body including cites. */
interface SemanticAct {
  version: 'SemanticCalculus-v0';
  kind: CalculusKind;
  payload: Record<string, unknown>;
  cites: GeneCite[];
  law: 'allow' | 'clarify' | 'block' | 'escalate';
  contextDigest: string;
  ballistics?: SemanticDraft['ballistics'];
  formulaIds: { formation: string[]; modulation: string[] };
  theoryId?: string;
  seal: { scd64: string };
}
```

**Frozen compile pipeline (normative — Phase 0 freeze):**

1. Formation  
2. Ballistics  
3. Bounded modulation  
4. Preliminary kind selection  
5. SCDNA detection and cite resolution  
6. LAW adjudication  
7. Theory-bank transaction when required (`draftHash` → deposit; on failure set preliminary kind → `Escalate`)  
8. Final kind construction  
9. Canonical serialization of act body (no seal field yet)  
10. SCD64 seal over that serialization  
11. Emit **immutable** `SemanticAct`  

Optional pre-deposit identity: `draftHash → deposit → final SemanticAct → SCD64 seal` (same order; `draftHash` is not the SCD64 seal).

**Core seal law:** Nothing inside the sealed `SemanticAct` may mutate after sealing. Kind changes, cite appends, or deposit retries after seal are illegal — rebuild via a new compile.

SQLite theory bank (conceptual columns): `theory_id`, `draft_hash`, `scd64` (nullable until seal write-back in same compile txn), `turboquant_blob`, `lattice_addr`, `cited_genes_json`, `status`, `support_json`, `open_slots_json`, `hit_count`, `last_seen`, `created_at`, `updated_at`, `review_notes`.

**Bank vs act:** Updating the bank row with final `scd64` after step 10 is allowed (storage). Mutating the in-memory/emitted `SemanticAct` after step 10 is not.
### 3.4 Deferred follow-up PDRs

- Full agent-tool surface beyond UI guinea pig
- Operator Theory Review UI polish (Claude-led)
- Lattice map authoring tooling
- Cross-session theory merge heuristics beyond neighborhood match

## 4. Change Classification

| Tag | Rationale |
|-----|-----------|
| **architectural** | New IR, formula registry, theory bank, ballistics path |
| **behavioral** | Intent→action fail-closed; Clarify/Probe/Theory as first-class acts |
| **structural** | New modules + SQLite artifact; adapters to TurboQuant/SCDNA/SCD64 |
| **cosmetic** | None required for v0 core (review UI deferred) |

## 5. Assumptions and Unknowns

**Assumptions**

- VAELRIX_LAW / SCHEMA_CONTRACT remain the permission spine.
- Existing `codex/core/quantization/turboquant.js` remains the quantize/inner-product primitive.
- SCDNA registry + contradiction resolver remain authoritative for gene warrants.
- UI guinea pig can ground nouns/verbs to routes/components via a sealed lexicon table.

**Unknowns (escalate if blocking)**

- Exact QBIT lattice dimensionality / bucket cardinality for meaning maps v0
- Whether theory bank lives beside substrate SQLite or a dedicated file path env
- Embed feature recipe for UI intents (lexical+route+selection only vs richer)

## 6. Open Questions / Escalations

```
ESCALATION:
topic: Promote authority
conflict: Who may flip theory status to promoted (human only vs LAW council vs agent with critical gene)?
owner: Angel / repo owner
needed_by: before Phase 4
```

```
ESCALATION:
topic: Modulation algebra
conflict: Multiplicative score channels vs AST rewrite operators for modulators (power vs smuggle risk)?
owner: Codex + Escalation owner
needed_by: before Phase 2 formula registry freeze
```

## 7. Architecture / File Map

```text
Human utterance + context
  → 1 Formation
  → 2 Ballistics (TurboQuant + QBIT buckets)
  → 3 Bounded modulation
  → 4 Preliminary kind
  → 5 SCDNA detect + cite resolution
  → 6 LAW adjudication
  → 7 Theory-bank txn if required (draftHash; fail → Escalate)
  → 8 Final kind construction
  → 9 Canonical serialization (body without seal)
  → 10 SCD64 seal
  → 11 Emit immutable SemanticAct
  → AI rewriter (optional) = new compile, never in-place mutate
  → runtime executor (Do / Clarify / Probe / …)
```

| Path | Owner | Responsibility |
|------|-------|----------------|
| `codex/core/semantic-calculus/types.ts` | Codex | `SemanticDraft` / `SemanticAct` IR types |
| `codex/core/semantic-calculus/formulaRegistry.js` | Codex | Formation/modulation ids + versions |
| `codex/core/semantic-calculus/ballistics.js` | Codex | Embed → TurboQuant → bucket ids |
| `codex/core/semantic-calculus/compiler.js` | Codex/Gemini | Total compile; seal-last pipeline |
| `codex/core/semantic-calculus/rewrite.js` | Codex | Legal AI rewrites via recompile |
| `codex/core/semantic-calculus/theoryBank.js` | Codex/Gemini | SQLite deposit/query/status (`draftHash` then `scd64` write-back) |
| `codex/core/semantic-calculus/scdnaCite.js` | Codex | Gene cite adapter (pre-seal) |
| `codex/core/semantic-calculus/scd64Seal.js` | Codex | Seal adapter (step 10 only) |
| `codex/core/semantic-calculus/lexiconUi.js` | Codex | UI guinea-pig lexicon binds |
| `tests/semantic-calculus/*.test.js` | Gemini | Unit/property tests |
| `steamdeck_brain/vaelrix_forcefield/scdna/*` | Codex | Consume only; no intent-gene mint |
| `docs/scholomance-encyclopedia/PDR-archive/2026-07-16-semantic-calculus-pdr.md` | Codex | This PDR |

Dependency: semantic-calculus → turboquant, scdna (read), scd64 (read), better-sqlite3 / existing sqlite adapter patterns.

## 8. Step-by-Step Implementation Plan

### Phase 0 — Contracts freeze (Codex, 0.5–1d)

- Milestone: types (`SemanticDraft` / `SemanticAct`) + formula id list + theory bank DDL + **seal-last pipeline freeze** recorded in this PDR  
- Exit: Escalation answers on Promote + modulation algebra recorded; F5/F7/F11/F12 accepted as normative

### Phase 1 — Formula registry + total compiler stub (Gemini+Codex, 1–2d)

- Owner: Gemini impl, Codex review  
- Milestone: `compileSemanticIntent` always returns sealed `SemanticAct`; pipeline stubs steps 1–11 (exact-match lexicon; no ballistics yet); `maybeCompile` null only when flag off  
- Exit: F1 + F11 + F12 tests green behind `ENABLE_SEMANTIC_CALCULUS=0` default

### Phase 2 — Ballistics + modulation (Codex+Gemini, 2–3d)

- Milestone: TurboQuant QBIT buckets + bounded modulators + margin law (steps 2–4)  
- Exit: F2–F4 tests; document lattice map version `meaning-lattice-v0`

### Phase 3 — SCDNA cite + LAW (pre-seal) (Codex+Gemini, 1–2d)

- Milestone: F6 cites resolved at steps 5–6; forcefield apply uses cites; no gene mint  
- Exit: integration tests with DEFAULT_GENE_REGISTRY fixtures

### Phase 4 — SQLite theory bank + seal-last (Gemini+Codex, 1–2d)

- Milestone: F7–F8 deposit at step 7 with `draftHash`; bank fail → Escalate then seal; F5 seal at step 10 covers cites  
- Exit: transactional tests; seal-mutation and theory-as-fact guards

### Phase 5 — UI guinea pig (Claude+Gemini, 2d)

- Milestone: Visualiser discography intents compile+execute Clarify/Do  
- Exit: manual script + vitest grounding tests; flag off by default until DoD

Each phase shippable independently behind `ENABLE_SEMANTIC_CALCULUS`.

## 9. Code Examples for Pivotal Changes

### 9.1 Seal-last total compile

```js
// codex/core/semantic-calculus/compiler.js
export function compileSemanticIntent({ utterance, context, formulas, lattice, db, registry }) {
  const formation = runFormation(utterance, context, formulas.formation);
  const shot = fireBallistics(formation, lattice);
  const modulated = applyModulation(shot, context, formulas.modulation);
  let draft = {
    version: 'SemanticCalculus-v0',
    preliminaryKind: selectPreliminaryKind(modulated),
    payload: {},
    cites: [],
    law: 'allow',
    contextDigest: digestContext(context),
    draftHash: '',
    ballistics: pickBallistics(modulated),
    formulaIds: collectFormulaIds(formulas),
  };
  draft.draftHash = hashDraft(draft);
  draft.cites = citeGenes(registry, draft, context);           // step 5 — before seal
  draft.law = adjudicateLaw(draft);                           // step 6
  if (needsTheoryDeposit(draft)) {
    const deposited = depositTheory(db, draft);               // step 7 — draftHash
    if (!deposited.ok) draft.preliminaryKind = 'Escalate';
    else draft.theoryId = deposited.theoryId;
  }
  const kind = finalizeKind(draft);                           // step 8
  const body = canonicalizeBody({ ...draft, kind });          // step 9 — no seal field
  const scd64 = sealScd64(body);                              // step 10
  if (draft.theoryId) writeBackSeal(db, draft.theoryId, scd64);
  return Object.freeze({ ...body, seal: { scd64 } });         // step 11 — immutable
}
```

### 9.2 Theory deposit uses draftHash (pre-seal)

```js
// codex/core/semantic-calculus/theoryBank.js
export function depositTheory(db, draft) {
  try {
    const tx = db.transaction(() => {
      const existing = findNeighborhood(db, draft.ballistics);
      if (existing) return bumpHit(db, existing.theory_id, draft.draftHash);
      return insertTheory(db, { ...draft, scd64: null }); // scd64 write-back after seal
    });
    return { ok: true, theoryId: tx() };
  } catch {
    return { ok: false };
  }
}
```

### 9.3 Cite-not-become guard (pre-seal only)

```js
// codex/core/semantic-calculus/scdnaCite.js
export function citeGenes(registry, draft, context) {
  const matches = detect_gene_matches(registry, context);
  return matches.map((g) => ({
    stableId: g.identity.stableId,
    contentHash: g.identity.contentHash,
    whyMatched: g.domain.primary,
  }));
  // NEVER compile_gene() / registry.insert() here
}
```

### 9.4 Illegal Theory-as-Fact + seal mutation

```js
export function assertExecutable(act) {
  if (act.kind === 'Theory' || act.kind === 'Hypothesis') {
    throw new Error('SEMANTIC_CALCULUS_THEORY_NOT_EXECUTABLE');
  }
}

export function assertSealedImmutable(act) {
  if (!Object.isFrozen(act)) throw new Error('SEMANTIC_CALCULUS_SEAL_MUTATION');
}
```

### 9.5 Integration gate vs total compile (F1 vs F11)

```js
/** Total — never returns null. F1 applies here. */
export function compileSemanticIntent(input) { /* … always SemanticAct … */ }

/**
 * Integration gate only. null means “Semantic Calculus did not run.”
 * Do NOT treat null as an F1 violation.
 */
export function maybeCompile(input) {
  if (process.env.ENABLE_SEMANTIC_CALCULUS !== '1') return null;
  return compileSemanticIntent(input);
}
```

## 10. Glossary

| Term | Meaning |
|------|---------|
| **Semantic Calculus** | Sealed intent IR + formula language for AI↔compiled human meaning |
| **Formation formula** | Versioned function mapping utterance/context → candidate meaning evidence |
| **Modulation formula** | Bounded function warping scores/trajectory without inventing ontology |
| **Semantic ballistics** | Embed→TurboQuant→QBIT lattice trajectory into meaning buckets |
| **Meaning bucket** | Vectorized lattice address for a meaning neighborhood |
| **SemanticDraft** | Mutable pre-seal working state; may hold `draftHash`; never emitted |
| **SemanticAct** | Immutable sealed term; SCD64 covers full body including cites |
| **draftHash** | Pre-seal identity for theory-bank deposit; not the SCD64 seal |
| **Theory** | First-class unknown; not null; deposited for review before seal |
| **Cite-not-become** | Acts reference SCDNA genes; acts are not genes |
| **Promote** | LAW-gated elevation of theory → executable lexicon bind |
| **SCD64** | Content-addressed seal of the **final** act body (seal-last) |
| **SCDNA** | Cognitive DNA gene registry (retrieval, risk, instruction, English) |
| **maybeCompile** | Flag gate; `null` = calculus did not run (not an F1 failure) |

## 11. Q&A — Top Confusing Concerns

1. **Isn’t this just embeddings?** No — embeddings address buckets; formulas+LAW permission the act.  
2. **Why not SimHash equality?** Measured collision failure in rhyme signatures; don’t repeat for `Do`.  
3. **Can AIs invent verbs?** Only via LAW formula/lexicon amendment — not at rewrite time.  
4. **What if bank is down?** Final kind becomes `Escalate`, then seal Escalate — never seal Theory then mutate.  
5. **Is Clarify a failure?** No — first-class actionable term.  
6. **Does Theory clog the DB?** Merge-by-neighborhood + hit_count; retire keeps audit.  
7. **Relation to Spellweave intent octree?** Complementary: octree classifies puzzle/combat intent; Calculus is general intent IR — adapter later, don’t merge prematurely.  
8. **Forcefield?** SCDNA cites feed `apply_scdna_to_force_field`; Calculus doesn’t bypass it.  
9. **Why can’t we seal then cite?** Seal must cover cites; post-seal cite append breaks checksum law.  
10. **English for operators?** Via gene `GeneEnglish` + Theory review notes — humans don’t author IR.  
11. **Does `maybeCompile() === null` violate F1?** No — F1 is `compileSemanticIntent` only (F11).  
12. **UI guinea pig enough?** Yes for v0 proof; tools/agents need follow-up PDR.

## 12. QA Plan

**New tests (exact paths):**

- `tests/semantic-calculus/compiler.total.test.js`
- `tests/semantic-calculus/ballistics.determinism.test.js`
- `tests/semantic-calculus/margin.law.test.js`
- `tests/semantic-calculus/theoryBank.deposit.test.js`
- `tests/semantic-calculus/scdna.cite-not-become.test.js`
- `tests/semantic-calculus/theory-as-fact.guard.test.js`
- `tests/semantic-calculus/seal.last-and-immutable.test.js`
- `tests/semantic-calculus/maybeCompile.gate.test.js`

**Commands:**

```bash
npx vitest run tests/semantic-calculus --reporter=verbose
```

**Example:**

```js
import { describe, it, expect } from 'vitest';
import { compileSemanticIntent } from '../../codex/core/semantic-calculus/compiler.js';

describe('total compiler', () => {
  it('never returns null kind', () => {
    const act = compileSemanticIntent({
      utterance: 'do the thing with the widget',
      context: { route: '/visualiser' },
      formulas: minimalFormulas(),
      lattice: meaningLatticeV0(),
    });
    expect(act.kind).toMatch(/Do|Clarify|Probe|Forbidden|Escalate|Theory|Hypothesis/);
    expect(act.seal.scd64).toBeTruthy();
  });
});
```

## 13. Regression Risks and Retest Checklist

| Risk | Retest |
|------|--------|
| TurboQuant lexicon rerank regresses | `npx vitest run` ritual/prediction turboquant tests; enable flag off path |
| SCDNA forcefield / search governor | `steamdeck_brain` SCDNA pytest suite |
| Visualiser discography nav | `npx vitest run tests/visualiser/DiscographyNav.test.tsx` |
| Auth/lexicon session bypass creep | Ensure Semantic Calculus does not strip `requireLexiconSession` |
| Rhyme signature path untouched | Confirm no revive of SimHash/TurboQuant candidate gate |

## 14. Rollout Plan

- **Flag:** `ENABLE_SEMANTIC_CALCULUS` default `0`  
- **Shadow:** compile+seal+deposit Theory/Clarify in logs without executing Do  
- **Warn:** execute Clarify/Probe only  
- **Canary:** Do for Visualiser navigation only  
- **Incomplete-but-safe:** with flag off, system identical to today  
- **Rollback:** set flag `0`; theory bank remains read-only archive; no schema drop required

## 15. Definition of Done

- [ ] F1–F12 acceptance tests green under vitest (including seal-last + maybeCompile gate)  
- [ ] Formula registry has versioned formation+modulation entries for UI guinea pig  
- [ ] Theory bank SQLite migrates/opens; deposit uses `draftHash` before seal; retire≠delete  
- [ ] SCD64 seal is step 10 only; cites included in sealed body; no gene mint on compile  
- [ ] Post-seal mutation throws `SEMANTIC_CALCULUS_SEAL_MUTATION`  
- [ ] Feature flag default off; `maybeCompile` null semantics documented (F11)  
- [ ] This PDR referenced from PDR-archive README catalog  
- [ ] PIR filed per §18  
- [ ] Escalations in §6 resolved or explicitly deferred with owner

## 16. Final Architectural Verdict

**Functionally complete but needs follow-up** (as a PDR): doctrine and seams are locked — including **seal-last immutability** and **compile vs maybeCompile** (rev 2). Implementation and Promote-authority escalation remain open. Safe to begin Phase 0–1 behind a flag; not safe to enforce Do globally until guinea pig + review bank prove fail-closed behavior.

## 17. References

- `docs/scholomance-encyclopedia/PDR-archive/PDR Prompt.md` — authoring template used  
- `docs/scholomance-encyclopedia/Scholomance LAW/SCHEMA_CONTRACT.md` — sealed contracts  
- `docs/scholomance-encyclopedia/Scholomance LAW/VAELRIX_LAW.md` / `AGENTS.md` — agency bounds  
- `codex/core/quantization/turboquant.js` — quantize / inner product  
- `steamdeck_brain/vaelrix_forcefield/scdna/` — gene registry, cite, forcefield, contradictions  
- `docs/superpowers/specs/2026-07-12-resonance-signature-contract-design.md` — TurboQuant/SimHash rejection lesson  
- `docs/scholomance-encyclopedia/PDR-archive/turboquant_integration_bridge_pdr.md` — TurboQuant bridge precedent  
- `docs/scholomance-encyclopedia/PDR-archive/2026-06-17-qbit-3d-lattice-unification_pdr.md` — QBIT lattice prior art  
- Memory Cell Osmosis / substrate SQLite patterns — durable local banks  

## 18. Post-Implementation Report Handoff

**Required PIR:** `docs/scholomance-encyclopedia/post-implementation-reports/PIR-20260716-SEMANTIC-CALCULUS.md`  
(Adjust date to actual completion day if later; do not ship without PIR.)

---

## Doctrine (normative)

> Human meaning is compiled into Semantic Calculus.  
> Meanings are formed and steered only by sealed formulas under bounded modulation.  
> TurboQuant QBIT lattice provides semantic ballistics into meaning buckets.  
> Buckets address meaning; they do not grant permission.  
> SCDNA genes are cited before seal; they do not become acts.  
> Theory-bank deposit (when required) completes before final kind and seal; failure yields Escalate, then seal.  
> SCD64 seals last, over the full canonical body including cites.  
> **Nothing inside a sealed SemanticAct may mutate after sealing.**  
> Unknowns are theoretical concepts, never null, deposited in SQLite for review.  
> Only LAW-gated Promote makes theory executable fact.  
> Treating theory as fact is illegal IR.  
> `compileSemanticIntent` is total; `maybeCompile` null means the calculus did not run.  
> AIs rewrite by recompile; they do not author formulas or mutate seals.

---

*PDR Author: Semantic Calculus design dialogue (2026-07-16)*  
*Rev 2: seal-last immutability + compile/maybeCompile distinction*  
*Template: `PDR Prompt.md`*
