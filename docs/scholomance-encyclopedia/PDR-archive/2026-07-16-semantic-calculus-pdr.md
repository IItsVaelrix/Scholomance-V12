# PDR: Semantic Calculus

**Status:** Draft (rev 6 — kind/permission split: CalculusKind cut 7→5; every kind now cites a gene)  
**Classification:** Architectural \| AI Intent IR \| LAW \| TurboQuant QBIT \| Act Seal \| SCDNA \| SQLite Memory  
**Priority:** Critical  
**Date:** 2026-07-16  
**Bytecode Search Code:** `SCHOL-ENC-PDR-SEMANTIC-CALCULUS-2026-07-16`

---

## Owner(s)

- **Codex:** Semantic Calculus IR schemas, formation/modulation formula registry, TurboQuant QBIT meaning-lattice contracts, act seal integration, SQLite theory bank schema, LAW/SCHEMA_CONTRACT alignment
- **Claude:** Operator review UI for theory bank (clarify/probe surfaces), a11y for Clarify flows, Visualiser/UI grounding adapters when guinea-pigging intent→action
- **Gemini:** Compiler pipeline impl, SCDNA cite wiring, vitest/pytest coverage, CI gates, feature flags
- **Escalation owner:** Angel / repo owner (LAW amendments, Promote-to-lexicon decisions, cross-domain gene vs schema conflicts)

## Context (seed)

AIs hallucinate when they interpret free English as permission. Semantic Calculus compiles human intent into a sealed, AI-writable IR whose meanings are produced only by codified formulas under modulation, grounded on a TurboQuant QBIT meaning lattice, warranted by SCDNA gene cites, sealed by a content-addressed act seal, with unknowns deposited as theoretical concepts into a SQLite review bank—never as null.

## Target Integration Area

- `codex/core/semantic-calculus/` (new)
- `codex/core/quantization/turboquant.js` + QBIT lattice adapters (repurpose, do not fork religion)
- `steamdeck_brain/vaelrix_forcefield/scdna/` (cite genes; do not mint intent-as-gene)
- `codex/core/semantic-calculus/seal.ts` — canonical serialization + act seal (**new**; the existing SCD64 path is a diagnostic classifier and cannot seal an act — see the F5 amendment)
- New SQLite: `semantic_theory_bank.sqlite` (or env-path equivalent)
- Guinea-pig surface: Visualiser / discography UI intent (navigate, select, upload, collapse) before expanding to tools/agents

## Core Concept

Semantic Calculus is not a prettier English vocabulary. It is a **modulated formula language**: sealed formation formulas fire utterance+**trust-partitioned** context into TurboQuant-quantized **semantic ballistics** on a QBIT lattice of meaning buckets; modulators (route, selection, gene confidence, risk) bend trajectories within bounds and **may only reduce permission**; impact yields a total typed **act type** (`Do` | `Clarify` | `Probe` | `Theory` | `Hypothesis`) whose **permission is a separate axis carried by `law.decision`**. Unbound landings are **theoretical concepts**, deposited in SQLite for review. AIs rewrite terms; they do not author formulas or treat theory as fact. LAW is the permission oracle; SCDNA genes are cited from **trusted context only**, and cited rather than become. **The act seal covers only the final, fully constructed act — the sealed body is a pure function of its declared inputs, and any post-seal mutation is detected by re-verifying the seal, not by trusting a freeze.**

## Implementation Philosophy

Small composable modules, deterministic evaluation (same input → same term bytes), adapter seams over TurboQuant/SCDNA/SCD64, feature-flagged guinea pig first. Preserve existing prediction/rhyme TurboQuant uses. Learn from measured rejection of SimHash/TurboQuant as sole rhyme equality gate: lattice retrieves candidates; LAW+formulas grant permission.

## Ownership & Law Compliance

Respect `VAELRIX_LAW.md`, `AGENTS.md`, `SCHEMA_CONTRACT.md`. Every new path appears in §7 with owning agent. Promote-to-lexicon and new formula registration require Escalation owner. Cross-domain conflicts use `ESCALATION:` blocks.

---

## 1. Executive Summary

Semantic Calculus is Scholomance’s intent IR for AI agents: humans speak; a total compiler always emits an actionable term; AIs read/write only inside that dialect. Meanings are determined by versioned formation and modulation formulas—not ad-hoc NLP. Geometry is a TurboQuant QBIT lattice of vectorized meaning buckets (semantic ballistics). Permission is LAW + SCDNA gene cites. Audit is content-addressed act seals. Unknowns are never null: they are theoretical concepts deposited into a SQLite theory memory bank for review; only explicit Promote makes them executable lexicon. Blast radius is architectural (new IR + bank + formula registry) with a narrow UI guinea pig first. Status: Draft PDR — not yet implemented.

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
| F1 | **`compileSemanticIntent()` is total:** every human utterance+context → one sealed `SemanticAct` | Never returns `null`/`undefined`; unit tests cover Do/Clarify/Probe/Theory/Hypothesis (Forbidden/Escalate are `law.decision` values, not kinds — see F19). **`maybeCompile()` is out of F1** — see F11 |
| F2 | Formation + modulation formulas are registry-versioned | Unknown formula id → compile error or Theory; no anonymous bends |
| F3 | Semantic ballistics: embed → TurboQuant → QBIT bucket address(es) | Deterministic address for fixed embed recipe + lattice map version |
| F4 | Margin law: thin margin → Clarify/Probe, not soft Do | Property tests on margin thresholds |
| F5 | **`sha256-canonical-v0`** seals every **emitted** SemanticAct **last** — seal covers kind, payload, cites, law, ballistics, formulaIds, **contextDigests (all four partitions), capability, riskProfile, theoryDeposit.required, and compiler {buildId, schemaHash}**. **The act seal is NOT an SCD64 — see the amendment below.** | Seal bytes verify against canonical serialization of the full act body. Re-seal forbidden. Every field that influenced the decision is inside the seal; the only fields outside it are the non-deterministic storage receipt (F18). `seal.algorithm` MUST be `'sha256-canonical-v0'`; an act seal MUST NEVER be passed to `parseSCD64`/`decodeSCD64` |
| F6 | SCDNA cite-not-become **and cite-from-trusted-only**: `matchedGenes[]` with stableId+contentHash | Cites resolved **before** seal from `context.policy` + `context.user` **only**; passing untrusted/derived context to `citeGenes` throws `SEMANTIC_CALCULUS_UNTRUSTED_CITE_SOURCE`; no gene row created per act; forcefield apply uses cites |
| F7 | Theory ≠ null: unbound → Theory path + mandatory SQLite deposit **before** final kind + seal | `draftHash` computed **after** cites + LAW (step 6.5) so deposit identity covers the permission-determining fields; bank failure → final kind `Escalate` (then seal Escalate). Never seal Theory then rewrite kind |
| F8 | Theory bank review states: open / under_review / promoted / retired / merged | Status transitions tested; Promote gated |
| F9 | AI rewrite preserves or re-resolves cites | Rewrite = **new compile** (or explicit reseal pipeline); never mutate a sealed act in place |
| F10 | Treating Theory as Fact is illegal IR | Type/guard rejects Do on unpromoted theory |
| F11 | **`maybeCompile()` is the integration gate only** | Returns `null` iff `ENABLE_SEMANTIC_CALCULUS` is off (“Semantic Calculus did not run”). Must not be tested as F1. When flag on, delegates to total `compileSemanticIntent()` |
| F12 | Seal law is **verification**, not freezing | `assertSealedIntact(act)` recomputes `sealBody(canonicalizeBody(body)).digest` and compares to `act.seal.digest`; mismatch throws `SEMANTIC_CALCULUS_SEAL_MUTATION`. Deep-freeze is defence in depth only and MUST NOT be the guard — it is shallow, and structured-clone/IPC/JSON round-trips strip it. Tests must mutate `payload.*`, `cites[]`, `ballistics.bucketIds[]` and prove detection |
| F13 | **Typed trust partitions**: context is four named partitions, never one digest | `context.policy` / `context.user` / `context.untrusted` / `context.derived`; each sealed as its own digest; untrusted content may fill factual payload slots but may never reach gene detection, formula selection, capability grant, or LAW override. Violation → `SEMANTIC_CALCULUS_TRUST_BOUNDARY` |
| F14 | **Capability-bound `Do`**: a valid act does not itself confer tool authority | Every `Do` carries `capability { id, scope[], expiresAtLogical, confirmation }`; executor rejects a `Do` whose capability is absent, out of scope, or logically expired. Kind `Do` without capability → `SEMANTIC_CALCULUS_UNCAPABLE_DO` |
| F15 | **Risk-class margin law**: thresholds are per risk class, not universal | Each formation formula declares `riskProfile { consequence, minMargin, requiredCites[], allowedFallback, confirmationPolicy }`; F4's margin test resolves against the act's risk class. A `destructive` act may not use a `reversible_ui` threshold |
| F16 | **Monotonic bounded modulation**: modulators may only *reduce* permission | Modulator algebra is permission-decreasing (narrow candidates, lower confidence, redirect to safer kind). No modulator may widen scope, raise confidence past its input, or promote a kind toward `Do`. Property test: for all inputs, `permission(modulate(x)) <= permission(x)`. Any exception requires an explicit LAW grant + traceable reason; unreasoned widening throws `SEMANTIC_CALCULUS_PERMISSION_WIDENED` |
| F17 | **Support is distinct principals, not hits** | Theory support counts distinct authenticated principals; merge requires exact-binding agreement, not neighborhood proximity alone. `hit_count` is diagnostic only and MUST NOT feed Promote ranking |
| F18 | **Sealed body excludes bank state** | `theoryId` and `transactionHash` live in a `theoryReceipt` sidecar **outside** the seal. The body seals only `theoryDeposit { required: boolean }` (a pure function of the draft). Bank contents therefore cannot alter sealed bytes; replay identity is 100%, not "four nines" |

| F19 | **Kind is an act type. Permission is `law.decision`. Never one enum.** | `CalculusKind` contains no policy verdict. The executor requires **three** independent gates: `kind === 'Do'` **AND** `law.decision === 'allow'` **AND** a capability. A capability is minted only when both hold — no usable grant may sit inside a sealed refusal. Cites `SEMANTIC_ACT_KIND_IS_NOT_PERMISSION` |
| F20 | **Every kind cites a gene that makes it derivable** | No kind may exist without a computable trigger. Do→`SEMANTIC_KIND_DO_GROUNDED`, Clarify→`SEMANTIC_KIND_CLARIFY_UNDERSPECIFIED`, Probe→`SEMANTIC_KIND_PROBE_READONLY`, Theory→`SEMANTIC_KIND_THEORY_UNBOUND`, Hypothesis→`SEMANTIC_KIND_HYPOTHESIS_CANDIDATE_BINDING`. Adding a kind without a gene is adding a judgement call, which is what produced κ=0.271 |

#### F19 AMENDMENT (rev 6) — the enum cut, and the κ result that forced it

**Phase 0.5 ran. It failed, and the failure was the enum's, not the annotators'.**

Two annotators, 200 UI intents drawn from the real Visualiser affordance surface: **Cohen's κ = 0.159** overall; **κ = 0.271** on the 142 items where both had adequate information. Every per-kind gate failed. The measurement is in `bench/semantic-calculus/labels/`.

The dominant disagreement was structural, not careless:

> `'delete the album'` → annotator A: **Escalate** · annotator B: **Do**

**Both were right, on different axes.** One read the act type ("it's a command"), the other read the policy verdict ("that needs authority"). `CalculusKind` contained both axes, so an annotator had to silently pick which one to project onto — and two people picked differently. Confirmed by the repo owner: *"it's a command. Do. Whether it's ALLOWED is a separate question that LAW answers."*

`Forbidden` and `Escalate` were never speech acts. They were `law.decision`'s `'block'` and `'escalate'` **duplicated inside the kind enum**, which:

- made illegal states representable — `kind: 'Do'` with `law.decision: 'block'` typechecked fine;
- made the taxonomy unannotatable, because no annotator could know which axis was being asked about;
- let the executor check only `kind !== 'Do'` and *appear* safe — it was safe only because the kind was smuggling the verdict inside it.

**The cut: 7 → 5.** `Do | Clarify | Probe | Theory | Hypothesis`.

The conflation had leaked past the enum, and the typechecker found both sites:
- `RiskProfile.allowedFallback: 'Escalate'` — a *margin fallback* set to a *policy verdict*;
- `permission.ts` `isZero()` testing `kind === 'Forbidden'` — the absorbing zero of a permission lattice was never an act type; it is `law.decision === 'block'`.

**What the failure was NOT.** It was not "the kinds are incoherent" — that reading was tested and rejected. It was not missing route/selection state either: attaching state would repair only 40 of 200 items, ceiling ~54% agreement. And it was not annotator error — the owner's `Do` rate was cleanly monotonic across difficulty (20% on gibberish → 93% on clear commands), with hesitation tracking the hard strata exactly. **The instrument was sound; the type it measured had two dimensions.**

**What Phase 0.5 actually bought.** Four of five kinds are now *functions* citing genes, not opinions. The fifth (Hypothesis) was ruled an act by the repo owner and given a measured trigger — candidate binding, 100% precision / 65% recall, under-firing to Theory (fail-closed). **The judgement calls went from seven to zero.** That is the finding, and it cost four minutes of annotation.

#### F5 AMENDMENT (rev 4) — the act seal is not an SCD64

**Discovered during Phase 0/1 implementation. This is what a contracts freeze is for.**

Revisions 1–3 all asserted that "SCD64 seals the act." That was never implementable, because SCD64 in this codebase is not a content-addressing seal:

```ts
// src/core/scd64/generateSCD64FromSlots.ts
export function generateSCD64(bugFamily: string, isPredicted = false): string {
  const family = BUG_FAMILIES[bugFamily];               // fixed glossary lookup
  const slots = family.canonicals.map(...)              // 8 slots x 8 hex
  return slots.join('');                                // BUGCLASS|COORDSYS|INVARIANT|...
}
```

It takes a **bug family name**, looks it up in a fixed taxonomy, and hashes 8 canonical *classification* strings into 8 semantic slots (`BUGCLASS`, `COORDSYS`, `INVARIANT`, `MAGNITUDE`, `MASKING`, `GATE`, `PROPAGATE`, `VERDICT`). **There is no parameter for arbitrary content.** It is a diagnostic classifier for the immune system — it answers *"what kind of bug is this"*, not *"what exactly is in this payload"*. It cannot seal a SemanticAct, and no amount of adapter work makes it able to: the information it encodes is a taxonomy position, not a body.

**The collision that makes this dangerous.** SHA-256 hex is *also* exactly 64 uppercase hex characters, so a content digest satisfies `SCD64_REGEX = /^[0-9A-F]{64}$/` and flows without complaint into `parseSCD64()` and `decodeSCD64()`. Those would split it into 8 blocks and look each up in the MCP glossary, producing a confident, fluent, entirely meaningless bug taxonomy for a hash. **A structurally perfect, semantically empty decode** — the exact failure this whole architecture exists to prevent, committed by the architecture's own seal.

**Resolution.** The act seal is `sha256-canonical-v0`: 64 uppercase hex over the canonical body (§3.3 canonical rules). The `algorithm` tag is not decoration — it is what makes the collision unrepresentable. Two artifacts of identical shape and opposite meaning must be distinguishable by type, not by convention.

| | SCD64 | act seal (`sha256-canonical-v0`) |
|---|---|---|
| Input | a bug family name | the canonical act body |
| Answers | "what class of defect is this" | "has one byte of this act changed" |
| Domain | fixed taxonomy | arbitrary content |
| Decodable | yes, into 8 named slots | no — it is a digest |
| Shape | 64 hex | 64 hex *(the trap)* |

**SCDNA and SCD64 remain unchanged and unrelated to this amendment.** Genes are still cited (F6); the immune system's SCD64 diagnostics are untouched. Only the act seal is renamed, because only the act seal was misattributed.

**Retired doctrine line:** ~~"SCD64 seals last, over the full canonical body including cites."~~ → "The act seal is computed last, over the full canonical body including cites."

### 3.2 Non-functional

- **Determinism (normative input list):** the sealed body is a pure function of exactly — utterance, all four context partition digests, formula versions, lattice map version, gene registry snapshot version, compiler `buildId` + `schemaHash`. **Bank contents are NOT an input and MUST NOT influence sealed bytes** (F18). Wall-clock is excluded; use logical time. Target is **100% bit-identical replay**, not 99.99% — determinism is a property, not a rate, and any non-identical replay under frozen inputs is a defect (hidden clock, unstable key order, cache-state leak), never acceptable variance. A tolerance below 100% would license the very bug the seal exists to detect.
- **Latency (v0 guinea pig):** compile (through seal) p95 &lt; 50ms on Steam Deck class CPU for UI intents. **This is a design budget, not a measurement, and p95 does not compose by addition** — per-stage budgets that sum to the target are arithmetic theatre, because a cold cache correlates every stage at once. Phase 6 must report separate distributions for: exact lexicon hit, ambiguous intent, theory deposit, cold cache, adversarial long input. A single aggregate p95 conceals the expensive path.
- **Memory:** no unbounded lattice growth per request; theory bank writes are transactional and complete **before** seal.
- **Accessibility:** Clarify surfaces keyboard-operable; theory review list readable.
- **Security:** lexicon session / auth LAW genes must block Do on protected routes; removing auth in local scratch must not leak into Semantic Calculus defaults. Untrusted context is a first-class threat surface (F13), not a formatting concern.

### 3.3 Contracts (sketch)

```ts
/** ACT TYPE only. Permission is law.decision. Cites SEMANTIC_ACT_KIND_IS_NOT_PERMISSION. */
type CalculusKind =
  | 'Do'          // bound + all required slots resolved + mutating effect
  | 'Clarify'     // bound, but a required slot is unresolved
  | 'Probe'       // bound + read-only effect
  | 'Theory'      // no binding in the executable lexicon (a lookup, not a judgement)
  | 'Hypothesis'; // unbound + the utterance supplied a candidate binding

type TrustClass = 'policy' | 'user' | 'untrusted' | 'derived' | 'secret';

/** F13 — context is four named partitions. There is no undifferentiated blob. */
interface TrustPartitionedContext {
  /** LAW, formula registry, capability grants, authenticated identity. */
  policy: Record<string, unknown>;
  /** The current request and explicit user confirmations. */
  user: Record<string, unknown>;
  /** Emails, webpages, documents, retrieved rows, tool outputs. NEVER authority. */
  untrusted: Record<string, unknown>;
  /** Model summaries, embeddings, inferred entities, prior theories. */
  derived: Record<string, unknown>;
  /** Credentials/sensitive values. Executor-only; never enters formation. */
  secret?: Record<string, unknown>;
}

interface ContextDigests {
  policy: string;
  user: string;
  untrusted: string;
  derived: string;
}

interface GeneCite {
  stableId: string;
  contentHash: string;
  whyMatched: string;
  /** F13 — provenance of the evidence that selected this gene. */
  trust: Extract<TrustClass, 'policy' | 'user'>;
  taint: string[];
  /** JSON pointers into payload/decision this cite actually warrants (anti-citation-theatre). */
  supports: string[];
}

/** F15 — declared per formation formula; resolves F4's margin law per risk class. */
interface RiskProfile {
  consequence: 'reversible_ui' | 'destructive' | 'financial' | 'privacy' | 'security';
  minMargin: number;
  requiredCites: string[];
  allowedFallback: 'Clarify' | 'Probe';   // an ACT TYPE. Escalating is LAW's call.
  confirmationPolicy: 'none' | 'single' | 'two_phase';
}

/** F14 — a valid act does not confer authority; this does, narrowly. */
interface Capability {
  id: string;
  scope: string[];
  expiresAtLogical: number; // logical time — never wall-clock (determinism)
  confirmation: 'none' | 'single' | 'two_phase';
}

/** Pre-seal working state — mutable. Never emitted to agents/runtimes. */
interface SemanticDraft {
  version: 'SemanticCalculus-v0';
  preliminaryKind: CalculusKind;
  payload: Record<string, unknown>;
  cites: GeneCite[];
  law: { decision: 'allow' | 'clarify' | 'block' | 'escalate'; ruleIds: string[] };
  contextDigests: ContextDigests;
  riskProfile: RiskProfile;
  capability?: Capability;
  /**
   * F7 — identity for theory-bank deposit.
   * MUST be computed at step 6.5, AFTER cites + LAW, so that two drafts with
   * identical ballistics but opposite adjudications never share an identity.
   */
  draftHash: string;
  ballistics?: {
    latticeMapVersion: string;
    bucketIds: string[];
    score: number;
    margin: number;
  };
  formulaIds: { formation: string[]; modulation: string[] };
  /** F18 — pure function of the draft; this (not the row id) is what gets sealed. */
  theoryDeposit: { required: boolean };
}

/**
 * Post-seal emit — sealed body.
 * F18: contains NO bank-derived field. Deterministic under the §3.2 input list.
 */
interface SemanticAct {
  version: 'SemanticCalculus-v0';
  kind: CalculusKind;
  payload: Record<string, unknown>;
  cites: GeneCite[];
  law: { decision: 'allow' | 'clarify' | 'block' | 'escalate'; ruleIds: string[] };
  contextDigests: ContextDigests;
  riskProfile: RiskProfile;
  capability?: Capability;
  ballistics?: SemanticDraft['ballistics'];
  formulaIds: { formation: string[]; modulation: string[] };
  theoryDeposit: { required: boolean };
  /** Replay needs to know what built the act. */
  compiler: { buildId: string; schemaHash: string; geneRegistrySnapshot: string };
  seal: { algorithm: 'sha256-canonical-v0'; digest: string };
}

/**
 * F18 — what the compiler actually returns.
 * The receipt is bank-state-dependent and therefore lives OUTSIDE the seal.
 * Losing it costs an audit pointer; it can never invalidate an act.
 */
interface SemanticEmission {
  act: SemanticAct;
  theoryReceipt?: { theoryId: string; transactionHash: string };
}
```

**Why `theoryId` is not sealed (F18).** `depositTheory` resolves a row id via `findNeighborhood(...)` against *live* bank contents. If another principal deposits a nearer neighbour between two otherwise-identical compiles, the same utterance would seal different bytes — replay would diverge without any declared input changing. Sealing `theoryDeposit.required` (a pure function of the draft) instead of `theoryId` (a bank lookup) makes the body deterministic by construction. The decision never depended on *which row* stored the theory; it depended on whether a deposit was required and whether it succeeded — and deposit failure is already visible in the seal, because it changes `kind` to `Escalate`.

**Canonical serialization rules (normative).** Field order, number encoding, Unicode normalization (NFC), absent-versus-null, and array ordering must be fixed and versioned in `schemaHash`. Wall-clock is external metadata; logical time only.

**Frozen compile pipeline (normative — Phase 0 freeze):**

1. Formation (**trusted partitions select formulas; untrusted may only fill factual slots**)  
2. Ballistics  
3. Bounded modulation (**permission-decreasing only — F16**)  
4. Preliminary kind selection  
5. SCDNA detection and cite resolution (**`policy` + `user` partitions only — F6/F13**)  
6. LAW adjudication  
6.5. **`draftHash = hashDraft(draft)` — computed HERE, after cites + LAW** (F7)  
7. Theory-bank transaction when required (`draftHash` → deposit; on failure set **`law.decision` → `escalate`** — the kind is unchanged, because a failed deposit does not change what was said)  
8. Final kind construction (+ capability binding for `Do` — F14)  
9. Canonical serialization of act body (no seal field, **no `theoryId`** — F18)  
10. Act seal (`sha256-canonical-v0`) over that serialization  
11. Emit `{ act, theoryReceipt? }`; act deep-frozen as defence in depth  
12. Best-effort seal write-back to the bank row (**separate txn — see below**)

**Why step 6.5 moved (F7).** In rev 2, `draftHash` was computed before `cites` and `law` were populated, so the deposit identity was blind to precisely the fields that determine permission: two drafts with identical formation and ballistics but opposite adjudications — one `allow`, one `block` — collided on the same hash and merged into one theory row. The hash must cover the adjudicated state or it is not an identity, it is a coincidence.

**Core seal law (rev 3).** Nothing inside the sealed `SemanticAct` may mutate after sealing — and this is enforced by **re-verifying the seal**, not by trusting `Object.freeze`. Freezing is shallow (`act.payload.target = 'x'` and `act.cites.push(...)` both succeed on a frozen act) and does not survive structured clone, IPC, or JSON round-trips. The seal is already the tamper-evidence; use it. Deep-freeze in addition, but never as the guard.

**SQLite theory bank (conceptual columns):** `theory_id`, `draft_hash`, `seal_digest` (**nullable — see reconciliation**), `seal_status` (`pending_seal` | `sealed` | `orphaned`), `turboquant_blob`, `lattice_addr`, `exact_binding_key`, `cited_genes_json`, `status`, `support_json`, `distinct_principals`, `open_slots_json`, `hit_count` (**diagnostic only — MUST NOT feed Promote ranking, F17**), `last_seen`, `created_at`, `updated_at`, `review_notes`.

Companion table `theory_support(theory_id, principal_id, first_seen, last_seen)` — `UNIQUE(theory_id, principal_id)`. Support = `COUNT(DISTINCT principal_id)`, never `hit_count`.

**Bank vs act, and the write-back that cannot be transactional.** Rev 2 said the seal column was "nullable until seal write-back in same compile txn." That sentence is unachievable and is hereby retracted: `depositTheory` must commit at step 7, the seal does not exist until step 10, and the seal-last law forbids reordering. The write-back is therefore *necessarily* a second transaction, and a crash between them is *observable*.

Normative handling: rows are inserted with `seal_status = 'pending_seal'`, not a bare `NULL` `seal_digest`. Step 12 flips them to `sealed`. A reconciliation sweep marks rows `orphaned` where `seal_status = 'pending_seal' AND created_at < logical_now - RECONCILE_WINDOW`. **Orphaned rows are never eligible for Promote and never counted as support.** Updating a bank row after step 10 is storage and is legal; mutating the emitted `SemanticAct` after step 10 is not.
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
- Callers can partition their context by trust (F13). **If a caller cannot say where a string came from, it is `untrusted` — there is no default-trusted path.**
- **The v0 compiler binds kinds by exact lexicon match, not by model judgement.** This is deliberate and narrow, and it means v0 tests *"an exact parser with a reject option beats a prompt"* — not the broader thesis that a model can safely propose meanings under compilation. That thesis needs a v1 where kind selection is model-proposed, and it must not be claimed on v0 evidence.

**Unknowns (escalate if blocking)**

- Exact QBIT lattice dimensionality / bucket cardinality for meaning maps v0
- Whether theory bank lives beside substrate SQLite or a dedicated file path env
- Embed feature recipe for UI intents (lexical+route+selection only vs richer)
- **Whether the seven kinds survive Phase 0.5.** `Theory` / `Hypothesis` / `Clarify` may not be human-separable; if κ < 0.7 the kind set merges. Seven is a hypothesis, not a finding.
- **The true clarification cost.** §6.1-style compounding maths motivates per-act validation, but Clarify and Escalate *are steps* — a 10-step chain at 5%/step versus a 13-step chain at 2%/step is not obviously a win once clarifications are counted as steps with their own failure modes (user abandons, answers ambiguously, or lies). Phase 6 must model the round-trip, not just the happy path.
- **Whether UI-intent abstention is affordable at all.** The one cited result that quantifies risk-coverage (selective classification) bought its error target at ~60% coverage — a 40% abstention rate, four times the ≤10pt loss this PDR allows. UI intents are plausibly far easier than ImageNet top-5, but that is a hope until measured.

## 6. Open Questions / Escalations

```
ESCALATION:
topic: Promote authority
conflict: Who may flip theory status to promoted (human only vs LAW council vs agent with critical gene)?
owner: Angel / repo owner
needed_by: before Phase 4
```

**RESOLVED (rev 3) — Modulation algebra.** Previously: *"Multiplicative score channels vs AST rewrite operators for modulators (power vs smuggle risk)?"*

Resolution: **monotonic bounded, permission-decreasing only** (F16). A modulator may narrow a candidate set, lower confidence, require stronger evidence, or redirect to a safer kind. It may never widen scope, raise confidence above its input, or move a kind toward `Do`. Any permission-increasing operator requires an explicit LAW grant and a traceable reason.

Rationale: this buys a **theorem instead of a test suite**. If every modulator is permission-decreasing and permission composes monotonically, then "no sequence of modulators can increase authority" follows from composition — it does not need to be caught by review. That closes the *formula smuggling* risk by construction rather than by vigilance, and it is the only property in this design that can be *proved* rather than measured. It is also what earns the word **calculus**: an algebra with laws, rather than a taxonomy with a pipeline.

Minimum obligations this creates:
- `permission(x)` is a total order (or lattice) over `(kind, scope, confidence)`, defined in `formulaRegistry.js`.
- Property test: `∀ x, m. permission(m(x)) <= permission(x)`.
- `compose(m1, m2)` is closed and order-preserving; **`law.decision = 'block'` is the absorbing zero** — the zero lives on the permission axis, not among the act types.
- AST rewrite operators are permitted **only** where they can be shown permission-decreasing; multiplicative score channels are permitted where bounded to `[0, 1]` multipliers.

```
ESCALATION:
topic: Promotion integrity (opened by rev 3, F17)
conflict: Approximate lattice geometry reaches Promote through five indirections —
  ballistics → neighborhood merge → support → review-queue ranking → Promote → executable Do.
  The doctrine says buckets do not grant permission; today they grant it slowly.
  Human Promote is a filter on a queue whose ordering an attacker can influence, and
  at §6.2 review volumes the ordering IS the decision.
question: Is "support = distinct authenticated principals + exact-binding agreement"
  (F17) sufficient, or does Promote additionally require adversarial-recurrence testing
  and per-tenant support isolation?
owner: Codex + Escalation owner
needed_by: before Phase 4 theory-bank enable (NOT merely before Promote ships)
```

## 7. Architecture / File Map

```text
Human utterance + trust-partitioned context {policy, user, untrusted, derived, secret?}
  → 1 Formation            (trusted selects formulas; untrusted fills factual slots only)
  → 2 Ballistics (TurboQuant + QBIT buckets)
  → 3 Bounded modulation   (permission-DECREASING only — F16)
  → 4 Preliminary kind
  → 5 SCDNA detect + cite resolution   (policy + user partitions ONLY — F6/F13)
  → 6 LAW adjudication
  → 6.5 draftHash = hashDraft(draft)   (AFTER cites + law — F7)
  → 7 Theory-bank txn if required (draftHash; fail → law.decision = escalate)
  → 8 Final kind construction + capability binding for Do (F14)
  → 9 Canonical serialization (no seal field, no theoryId — F18)
  → 10 Act seal (sha256-canonical-v0)
  → 11 Emit { act, theoryReceipt? }    (receipt OUTSIDE the seal)
  → 12 Seal write-back to bank (separate txn; pending_seal → sealed)
  → AI rewriter (optional) = new compile, never in-place mutate
  → runtime executor (verifies seal + capability; Do / Clarify / Probe / …)
```

| Path | Owner | Responsibility |
|------|-------|----------------|
| `codex/core/semantic-calculus/types.ts` | Codex | `SemanticDraft` / `SemanticAct` / `SemanticEmission` IR types |
| `codex/core/semantic-calculus/trustPartition.js` | Codex | **(new, F13)** Context partitioning, digests, taint propagation, boundary guards |
| `codex/core/semantic-calculus/capability.js` | Codex | **(new, F14)** Capability mint/scope/logical-expiry; `Do` binding |
| `codex/core/semantic-calculus/permission.js` | Codex | **(new, F16)** `permission()` order + monotonicity property helpers |
| `codex/core/semantic-calculus/formulaRegistry.js` | Codex | Formation/modulation ids + versions + `riskProfile` (F15) |
| `codex/core/semantic-calculus/ballistics.js` | Codex | Embed → TurboQuant → bucket ids |
| `codex/core/semantic-calculus/compiler.js` | Codex/Gemini | Total compile; seal-last pipeline |
| `codex/core/semantic-calculus/rewrite.js` | Codex | Legal AI rewrites via recompile |
| `codex/core/semantic-calculus/theoryBank.js` | Codex/Gemini | SQLite deposit/query/status; `pending_seal` reconciliation; distinct-principal support (F17) |
| `codex/core/semantic-calculus/scdnaCite.js` | Codex | Gene cite adapter (pre-seal, trusted-only) |
| `codex/core/semantic-calculus/seal.ts` | Codex | Canonical serialization + `sealBody` (step 10) + `assertSealedIntact` verification (F12). NOT an SCD64 adapter — see the F5 amendment |
| `codex/core/semantic-calculus/lexiconUi.js` | Codex | UI guinea-pig lexicon binds |
| `tests/semantic-calculus/*.test.js` | Gemini | Unit/property tests |
| `bench/semantic-calculus/corpus/*.jsonl` | Claude | **(new, Phase 6)** Gold corpus, ambiguity pairs, adversarial set |
| `bench/semantic-calculus/runner.mjs` | Gemini | **(new, Phase 6)** Baseline arms, metrics, power-aware reporting |
| `steamdeck_brain/vaelrix_forcefield/scdna/compiler.json` | Codex | **6 semantic-calculus genes** (F20). Durable LAW definitions, not per-intent mints — the non-goal stands |
| `steamdeck_brain/vaelrix_forcefield/scdna/*` | Codex | Consume only; no intent-gene mint |
| `docs/scholomance-encyclopedia/PDR-archive/2026-07-16-semantic-calculus-pdr.md` | Codex | This PDR |

Dependency: semantic-calculus → turboquant, scdna (read), scd64 (read), better-sqlite3 / existing sqlite adapter patterns.

## 8. Step-by-Step Implementation Plan

### Phase 0 — Contracts freeze (Codex, 1–1.5d)

- Milestone: types (`SemanticDraft` / `SemanticAct` / `SemanticEmission`) **including trust partitions, capability, riskProfile, compiler identity, and the theoryReceipt sidecar** + formula id list + theory bank DDL + **seal-last pipeline freeze** recorded in this PDR  
- Exit: modulation-algebra escalation recorded as resolved (F16); Promote-authority + promotion-integrity escalations recorded or explicitly deferred with owner; F5/F7/F11/F12/F13/F14/F18 accepted as normative
- **Gate:** the frozen contract must be a superset of the published paper's Appendix A. Anything omitted here becomes a migration against sealed artifacts later, which is the most expensive class of change this design has.

### Phase 0.5 — Kind-label agreement (Claude, 1d) — **gates Phase 1**

- Milestone: two annotators independently label 200 real Visualiser intents across all seven kinds; compute Cohen's κ, publish the confusion matrix
- Rationale: `Theory` ("unresolved concept, insufficient binding"), `Hypothesis` ("testable candidate interpretation"), and `Clarify` ("bounded question") are three ways of saying *I don't know enough*. §3.1 F1 asserts totality — every utterance maps to exactly one kind — but totality of a partition is worthless if the partition boundaries are not reproducible by humans.
- **Exit (TWO thresholds — amended rev 5):** overall κ ≥ 0.7 **AND every per-kind κ ≥ 0.6** (one-vs-rest). **If either fails, merge kinds before Phase 2.**
- **Why the gate is not a single number.** An aggregate κ hides a collapsed kind. Measured against a synthetic rater that systematically fused Hypothesis→Theory and Escalate→Forbidden: **overall κ = 0.784 (PASS) while Escalate sat at 0.454 and Hypothesis at 0.500** — a third of the taxonomy dead, gate green, because the other five kinds carried the average. This is the same failure this PDR already names for latency ("a single aggregate p95 can conceal the expensive path"), and merging is a *per-kind* decision — you never merge "all seven", you merge Hypothesis into Theory. The gate must name which.
- **A degenerate κ is not a passing κ.** If both annotators label everything the same kind, pₑ = 1 and κ is 0/0 — undefined, **not** 1. The tool reports NaN and fails the gate; two lazy annotators must never clear it with worthless labels.
- Seven is a choice, not a discovery, and no downstream accuracy target is reachable above the annotation ceiling. This is the cheapest experiment in the programme and it gates everything.
- **Tooling:** `bench/semantic-calculus/build-corpus.mjs` (200 items, seeded shuffle, deliberately loaded at the Theory/Hypothesis, Clarify/Do, Probe/Do and Forbidden/Escalate boundaries), `annotate.mjs --as <name>`, `kappa.mjs a.jsonl b.jsonl` (exit 1 on gate failure, so CI can enforce it), `ANNOTATION_GUIDE.md`. κ math is verified against published worked examples in `tests/semantic-calculus/kappa.math.test.js`.
- **STATUS: RAN 2026-07-16. FAILED — κ=0.159 (κ=0.271 on the clean subset). Diagnosis: the enum had two axes (F19). Cut to 5 kinds; every kind now cites a gene (F20). Phase 0.5's purpose is discharged — with no judgement calls left in the enum, there is nothing for annotators to disagree about, and the ≥95% act-accuracy target now measures a function's output rather than a gold label that never existed.**
- **Still open:** a second HUMAN annotator would establish the ceiling. κ(claude, damien) is a performance number and could not separate "the kinds are bad" from "the model labels weirdly". κ(claude, damien) is a *performance* number — it cannot establish the ceiling, because a low score there is ambiguous between "the kinds are bad" and "the model is wrong". The PDR's actual gate needs κ(human, human).

### Phase 1 — Formula registry + total compiler stub (Gemini+Codex, 1–2d)

- Owner: Gemini impl, Codex review  
- Milestone: `compileSemanticIntent` always returns a sealed emission; pipeline stubs steps 1–12 (exact-match lexicon; no ballistics yet); `maybeCompile` null only when flag off  
- Exit: F1 + F11 + F12 + F18 tests green behind `ENABLE_SEMANTIC_CALCULUS=0` default; **replay identity 100% over the frozen fixture corpus**

### Phase 2 — Ballistics + modulation (Codex+Gemini, 2–3d)

- Milestone: TurboQuant QBIT buckets + bounded modulators + risk-class margin law (steps 2–4)  
- Exit: F2–F4 + F15 + **F16 monotonicity property test** green; document lattice map version `meaning-lattice-v0`

### Phase 3 — SCDNA cite + LAW + trust partitions (pre-seal) (Codex+Gemini, 2–3d)

- Milestone: F6 cites resolved at steps 5–6 **from trusted partitions only**; F13 boundary guards; taint propagation; forcefield apply uses cites; no gene mint  
- Exit: integration tests with DEFAULT_GENE_REGISTRY fixtures; **AgentDojo-style injection fixtures prove untrusted context cannot select a gene, widen a capability, or override LAW**

### Phase 4 — SQLite theory bank + seal-last (Gemini+Codex, 2–3d)

- Milestone: F7–F8 deposit at step 7 with post-LAW `draftHash`; bank fail → `law.decision = escalate` then seal (kind unchanged); F5 seal at step 10; F17 distinct-principal support; `pending_seal` reconciliation sweep  
- Exit: transactional tests incl. **crash-between-commit-and-write-back leaves `pending_seal`, never a silent null**; seal-verification and theory-as-fact guards; promotion-integrity escalation resolved

### Phase 5 — UI guinea pig (Claude+Gemini, 2d)

- Milestone: Visualiser discography intents compile+execute Clarify/Do  
- Exit: manual script + vitest grounding tests; flag off by default until DoD

### Phase 6 — Measure (Claude corpus + Gemini runner + Codex review, ~3–4w) — **owns the DoD**

Without this phase the system is validated by nothing but its own unit tests, which only ever assert that a total function is total. Structural green is not evidence.

- **Owner: Claude (corpus + labelling), Gemini (runner + CI), Codex (review).** A phase with no owner does not happen.
- Milestone: corpus, baseline arms, and the outcome table below, published as a post-implementation report **including negative results**.
- **Baselines (the honest comparison is #2, not #1):**
  1. Prompt-only model emitting tool-call JSON — *context only; do not quote headline gains against this.*
  2. **Modern JSON-schema/grammar-constrained function calling, no LAW / theory / margins — this is the real baseline.** Structural validity is a tie against it by construction; the entire measurable delta of Semantic Calculus lives in LAW, margins, trust partitions, and the theory bank.
  3. Exact lexicon matcher with Clarify fallback, no vector lattice.
  4. Ablations: lattice disabled; theory bank disabled; trust partitions collapsed (sandboxed security runs only).
- **Corpus sizing is derived from the base rate, not from a round number.** At a 2% baseline unsafe-execution rate, detecting a 70% relative reduction (2% → 0.6%) at α=0.05 / 80% power needs **≈1,025 per arm (~2,050 intents)**; at a 1% base rate it is **≈2,070 per arm**. Eight hypotheses require multiple-comparison correction on top. A 1,000-intent corpus is underpowered by ≥2× and cannot support a significance claim.
- **Split the instrument by where power is affordable:**
  - *Adversarial/canary set* (high base rate by construction): carries the security claims at n in the low hundreds.
  - *Naturalistic set*: a coverage, latency, and act-accuracy instrument — **not** a significance test.
- Exit: every metric in §15's outcome gate has a measured value with a confidence interval, and each hypothesis names the baseline arm it was tested against.

Each phase shippable independently behind `ENABLE_SEMANTIC_CALCULUS`.

## 9. Code Examples for Pivotal Changes

### 9.1 Seal-last total compile

```js
// codex/core/semantic-calculus/compiler.js
export function compileSemanticIntent({ utterance, context, formulas, lattice, db, registry, build }) {
  assertPartitioned(context);                                  // F13 — no blob contexts

  // Step 1 — untrusted context may fill factual slots; it may NOT select formulas.
  const formation = runFormation(utterance, trustedOf(context), formulas.formation);
  const shot = fireBallistics(formation, lattice);
  const modulated = applyModulation(shot, context, formulas.modulation); // F16 — see 9.6

  let draft = {
    version: 'SemanticCalculus-v0',
    preliminaryKind: selectPreliminaryKind(modulated),
    payload: bindFactualSlots(formation, context),             // untrusted allowed HERE only
    cites: [],
    law: { decision: 'allow', ruleIds: [] },
    contextDigests: digestPartitions(context),                 // F13 — four digests
    riskProfile: resolveRiskProfile(formulas.formation, modulated), // F15
    ballistics: pickBallistics(modulated),
    formulaIds: collectFormulaIds(formulas),
    theoryDeposit: { required: false },
    draftHash: '',
  };

  // Step 5 — cites resolved from POLICY + USER partitions only (F6/F13).
  draft.cites = citeGenes(registry, draft, trustedOf(context));
  // Step 6 — LAW adjudication.
  draft.law = adjudicateLaw(draft);
  // Step 6.5 — identity computed AFTER cites + law, so it covers what determines permission (F7).
  draft.theoryDeposit = { required: needsTheoryDeposit(draft) };
  draft.draftHash = hashDraft(draft);

  // Step 7 — deposit. The row id is a storage detail and never enters the body (F18).
  let theoryReceipt;
  if (draft.theoryDeposit.required) {
    const deposited = depositTheory(db, draft);
    if (!deposited.ok) draft.law = { decision: 'escalate', ruleIds: ['law.bank-unavailable.v1'] };  // fail-closed
    else theoryReceipt = { theoryId: deposited.theoryId, transactionHash: deposited.txHash };
  }

  // Step 8 — final kind + capability binding (F14).
  const kind = finalizeKind(draft);
  const capability = kind === 'Do' ? mintCapability(draft) : undefined;

  // Step 9 — canonical body. Deterministic: no theoryId, no wall-clock.
  const body = canonicalizeBody({
    ...omit(draft, ['preliminaryKind', 'draftHash']),
    kind,
    capability,
    compiler: {
      buildId: build.buildId,
      schemaHash: build.schemaHash,
      geneRegistrySnapshot: registry.snapshotId,
    },
  });

  const seal = sealBody(body);                                 // step 10 — sha256-canonical-v0
  const act = deepFreeze({ ...body, seal });

  // Step 12 — write-back is a SEPARATE txn by necessity; failure is reconcilable, not fatal.
  if (theoryReceipt) writeBackSeal(db, theoryReceipt.theoryId, seal.digest);

  return { act, theoryReceipt };                               // step 11 — receipt outside the seal
}
```

### 9.2 Theory deposit — post-LAW identity, principal support, pending_seal

```js
// codex/core/semantic-calculus/theoryBank.js
export function depositTheory(db, draft) {
  try {
    const tx = db.transaction(() => {
      // F17 — geometry PROPOSES the merge; exact binding CONFIRMS it.
      // Neighborhood proximity alone must never merge two theories, because merge
      // feeds support, support feeds Promote, and Promote mints executable lexicon.
      const candidate = findNeighborhood(db, draft.ballistics);
      const existing = candidate && exactBindingAgrees(candidate, draft) ? candidate : null;

      const theoryId = existing
        ? existing.theory_id
        : insertTheory(db, { ...draft, seal_digest: null, seal_status: 'pending_seal' });

      recordSupport(db, theoryId, draft.principalId);  // UNIQUE(theory_id, principal_id)
      bumpHit(db, theoryId);                           // diagnostic ONLY — never Promote input
      return theoryId;
    });
    return { ok: true, theoryId: tx(), txHash: db.lastTransactionHash() };
  } catch (err) {
    // Do NOT swallow the error class: a migration bug, a full disk, and a genuine
    // constraint violation all fail closed to law.escalate, and an undiagnosed escalation
    // storm IS the review-overload failure mode.
    logBankFailure({ code: classifyBankError(err), draftHash: draft.draftHash });
    return { ok: false };
  }
}

/** Support is people, not hits. Orphans never count. */
export function supportOf(db, theoryId) {
  return db.prepare(`
    SELECT COUNT(DISTINCT principal_id) FROM theory_support
    WHERE theory_id = ? AND theory_id NOT IN (
      SELECT theory_id FROM theories WHERE seal_status = 'orphaned'
    )`).pluck().get(theoryId);
}
```

### 9.3 Cite guard — not-become AND from-trusted-only

```js
// codex/core/semantic-calculus/scdnaCite.js
export function citeGenes(registry, draft, trustedContext) {
  // F6/F13. cite-not-become stops untrusted text from MINTING a gene. It does not stop
  // untrusted text from SELECTING which genes get cited — and cites are the warrant LAW
  // adjudicates on. Cite selection is an authority path, so it takes trusted input only.
  assertTrustedOnly(trustedContext); // throws SEMANTIC_CALCULUS_UNTRUSTED_CITE_SOURCE

  const matches = detect_gene_matches(registry, trustedContext);
  return matches.map((g) => ({
    stableId: g.identity.stableId,
    contentHash: g.identity.contentHash,
    whyMatched: g.domain.primary,
    trust: g.sourcePartition,          // 'policy' | 'user'
    taint: g.taint ?? [],
    supports: g.supportsPointers,      // JSON pointers — anti-citation-theatre
  }));
  // NEVER compile_gene() / registry.insert() here
}
```

### 9.4 Illegal Theory-as-Fact + seal verification

```js
export function assertExecutable(act) {
  if (act.kind === 'Theory' || act.kind === 'Hypothesis') {
    throw new Error('SEMANTIC_CALCULUS_THEORY_NOT_EXECUTABLE');
  }
  if (act.kind === 'Do' && !act.capability) {           // F14
    throw new Error('SEMANTIC_CALCULUS_UNCAPABLE_DO');
  }
}

/**
 * F12 — verify, don't trust the freeze.
 *
 * Object.freeze is SHALLOW: on a frozen act, `act.payload.target = 'production'` and
 * `act.cites.push(fakeCite)` both succeed while Object.isFrozen(act) stays true — so a
 * frozen-ness check cannot detect the mutations that matter. Freezing also does not
 * survive structured clone / IPC / JSON round-trips, so it produces false positives on
 * legitimate acts crossing a worker boundary AND false negatives on tampered ones.
 *
 * The seal is already the tamper-evidence. Recompute it.
 */
export function assertSealedIntact(act) {
  const { seal, ...body } = act;
  if (sealBody(canonicalizeBody(body)).digest !== seal.digest) {
    throw new Error('SEMANTIC_CALCULUS_SEAL_MUTATION');
  }
}

/** Defence in depth only — never the guard. */
export function deepFreeze(o) {
  for (const v of Object.values(o)) {
    if (v && typeof v === 'object' && !Object.isFrozen(v)) deepFreeze(v);
  }
  return Object.freeze(o);
}
```

### 9.5 Monotonic modulation (F16)

```js
// codex/core/semantic-calculus/permission.js
// The theorem this buys: if every modulator is permission-decreasing and permission
// composes monotonically, then "no sequence of modulators can increase authority"
// follows from composition. Formula smuggling is closed by construction, not by review.

export const permission = (x) => ({
  kind: KIND_RANK[x.kind],        // Theory=0 Hypothesis=1 Clarify=2 Probe=3 Do=4
  scope: x.capability?.scope.length ?? 0,
  confidence: x.score,
});

export function applyModulation(shot, context, modulators) {
  return modulators.reduce((acc, m) => {
    const next = m.apply(acc, context);
    if (!permissionLte(permission(next), permission(acc))) {
      if (!m.lawGrant) throw new Error('SEMANTIC_CALCULUS_PERMISSION_WIDENED');
      recordPermissionGrant(m.lawGrant, m.reason);   // explicit, traceable, auditable
    }
    return next;
  }, shot);
}
```

### 9.6 Integration gate vs total compile (F1 vs F11)

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
| **Act type (kind)** | What sort of speech act this is: Do/Clarify/Probe/Theory/Hypothesis. Never a permission |
| **Permission** | `law.decision`: allow/clarify/block/escalate. The ONLY place a verdict lives |
| **Formation formula** | Versioned function mapping utterance/context → candidate meaning evidence |
| **Modulation formula** | Bounded function warping scores/trajectory without inventing ontology |
| **Semantic ballistics** | Embed→TurboQuant→QBIT lattice trajectory into meaning buckets |
| **Meaning bucket** | Vectorized lattice address for a meaning neighborhood |
| **SemanticDraft** | Mutable pre-seal working state; may hold `draftHash`; never emitted |
| **SemanticAct** | Sealed term; the act seal covers the full decision-bearing body. Integrity is proved by re-verifying the seal, not by `Object.isFrozen` |
| **SemanticEmission** | What the compiler returns: `{ act, theoryReceipt? }` — the receipt sits outside the seal |
| **draftHash** | Deposit identity, computed **after** cites + LAW so it covers the permission-determining fields; not the act seal |
| **Trust partition** | One of `policy` / `user` / `untrusted` / `derived` / `secret`. Untrusted content may fill factual slots and may never reach gene detection, formula selection, capability, or LAW |
| **theoryReceipt** | Bank-state-dependent storage pointer (`theoryId`, `transactionHash`) held **outside** the seal so bank contents cannot alter sealed bytes |
| **Monotonic modulation** | Modulators may only reduce permission; the basis of the no-smuggling theorem, and the reason this design earns the word *calculus* |
| **Support** | Count of **distinct authenticated principals**, never `hit_count`. Only support may inform Promote ranking |
| **pending_seal** | Bank row state between deposit commit and seal write-back; reconciled to `sealed` or `orphaned`, never left a silent null |
| **Theory** | First-class unknown; not null; deposited for review before seal |
| **Cite-not-become** | Acts reference SCDNA genes; acts are not genes |
| **Promote** | LAW-gated elevation of theory → executable lexicon bind |
| **Act seal** | `sha256-canonical-v0` — content-addressed digest of the **final** act body (seal-last). 64 uppercase hex |
| **SCD64** | The immune system's 8-slot diagnostic **classification** code. Shares the 64-hex shape with an act seal and shares nothing else. MUST NEVER be confused with one — see the F5 amendment |
| **SCDNA** | Cognitive DNA gene registry (retrieval, risk, instruction, English) |
| **maybeCompile** | Flag gate; `null` = calculus did not run (not an F1 failure) |

## 11. Q&A — Top Confusing Concerns

1. **Isn’t this just embeddings?** No — embeddings address buckets; formulas+LAW permission the act.  
2. **Why not SimHash equality?** Measured collision failure in rhyme signatures; don’t repeat for `Do`.  
3. **Can AIs invent verbs?** Only via LAW formula/lexicon amendment — not at rewrite time.  
4. **What if bank is down?** `law.decision` becomes `escalate` and the act seals with its kind intact — a failed deposit does not change what the user said. Never seal then mutate.  
5. **Is Clarify a failure?** No — first-class actionable term.  
6. **Does Theory clog the DB?** Merge-by-neighborhood + hit_count; retire keeps audit.  
7. **Relation to Spellweave intent octree?** Complementary: octree classifies puzzle/combat intent; Calculus is general intent IR — adapter later, don’t merge prematurely.  
8. **Forcefield?** SCDNA cites feed `apply_scdna_to_force_field`; Calculus doesn’t bypass it.  
9. **Why can’t we seal then cite?** Seal must cover cites; post-seal cite append breaks checksum law.  
10. **English for operators?** Via gene `GeneEnglish` + Theory review notes — humans don’t author IR.  
11. **Does `maybeCompile() === null` violate F1?** No — F1 is `compileSemanticIntent` only (F11).  
12. **UI guinea pig enough?** Yes for v0 proof; tools/agents need follow-up PDR.  
13. **Isn't `Object.freeze` enough for the seal law?** No. It is shallow — `act.payload.target = 'x'` and `act.cites.push(...)` both succeed on a frozen act while `Object.isFrozen(act)` stays `true`. The rev-2 guard could not detect the mutations it existed to prevent, and freezing does not survive structured clone / IPC / JSON. Verify the seal instead (F12); deep-freeze is defence in depth.  
14. **Why isn't `theoryId` sealed?** Because it is a *bank lookup*, and bank contents are not a declared determinism input. If another principal deposits a nearer neighbour between two identical compiles, a sealed `theoryId` would make the same utterance produce different bytes. We seal `theoryDeposit.required` (pure) and carry the row id in a receipt outside the seal (F18). Deposit *failure* is still sealed — it changes `kind` to `Escalate`.  
15. **Why 100% replay and not 99.99%?** Determinism is a property, not a rate. One-in-ten-thousand non-identical replay means a hidden clock, an unstable key order, or a cache-state leak — a defect, not tolerable variance. A sub-100% target lets the test pass while the bug lives, and §5.6-style regression comparison collapses if the baseline may flicker.  
16. **Doesn't neighborhood merge violate "buckets don't grant permission"?** In rev 2, slowly: ballistics → merge → hit_count → queue ranking → Promote → executable `Do`. Geometry granted permission in five steps instead of one. F17 breaks the chain — merge needs exact-binding agreement, support counts distinct principals, and `hit_count` is diagnostic only.  
17. **Untrusted text can't mint a gene — so we're safe from injection?** No. Cite-not-become stops *minting*; it never stopped untrusted text from *selecting* which genes get cited, and cites are the warrant LAW adjudicates on. Selection is an authority path (F6/F13).  
18. **Phase 6 is longer than every other phase combined — is it really in scope?** Yes, and it owns the DoD. F1–F12 going green only proves a total function is total. If Phase 6 has no owner, the paper becomes marketing for this PDR rather than a check on it.

## 12. QA Plan

**New tests (exact paths):**

- `tests/semantic-calculus/compiler.total.test.js`
- `tests/semantic-calculus/ballistics.determinism.test.js`
- `tests/semantic-calculus/margin.law.test.js` — per risk class (F15)
- `tests/semantic-calculus/theoryBank.deposit.test.js`
- `tests/semantic-calculus/scdna.cite-not-become.test.js`
- `tests/semantic-calculus/theory-as-fact.guard.test.js`
- `tests/semantic-calculus/seal.last-and-immutable.test.js`
- `tests/semantic-calculus/maybeCompile.gate.test.js`
- **`tests/semantic-calculus/seal.verification.test.js`** — mutate `payload.*`, `cites[]`, `ballistics.bucketIds[]` on a sealed act; each MUST throw `SEMANTIC_CALCULUS_SEAL_MUTATION`. A frozen-ness check passes all three; this is the regression test for the rev-2 guard (F12)
- **`tests/semantic-calculus/seal.survives-structured-clone.test.js`** — `structuredClone(act)` still verifies (freeze is stripped; seal is not)
- **`tests/semantic-calculus/determinism.bank-independence.test.js`** — compile utterance U → insert an interfering neighbouring theory from another principal → recompile U → **sealed bytes identical**; only `theoryReceipt` may differ (F18)
- **`tests/semantic-calculus/determinism.replay-identity.test.js`** — frozen fixture corpus replays **100%** bit-identical; any single divergence fails the suite
- **`tests/semantic-calculus/draftHash.covers-law.test.js`** — two drafts, identical ballistics, opposite LAW adjudications → **different `draftHash`**, never merged (F7)
- **`tests/semantic-calculus/trust.partition-boundary.test.js`** — untrusted context attempting gene selection / formula selection / capability widening / LAW override → `SEMANTIC_CALCULUS_TRUST_BOUNDARY` (F13)
- **`tests/semantic-calculus/trust.injection-fixtures.test.js`** — AgentDojo-style embedded instructions and fake authority claims in `context.untrusted`
- **`tests/semantic-calculus/modulation.monotonic.property.test.js`** — fast-check property: `∀ x, m. permission(m(x)) <= permission(x)`; permission-widening without a LAW grant throws (F16)
- **`tests/semantic-calculus/capability.bound-do.test.js`** — `Do` without capability, out-of-scope, and logically-expired all rejected (F14)
- **`tests/semantic-calculus/theoryBank.support-principals.test.js`** — 1,000 hits from one principal < 3 hits from 3 principals in Promote ranking; `hit_count` never reaches the ranker (F17)
- **`tests/semantic-calculus/theoryBank.pending-seal-reconcile.test.js`** — simulated crash between deposit commit and write-back leaves `pending_seal`, sweep marks `orphaned`, orphan never promotable and never counted as support

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
    expect(act.kind).toMatch(/Do|Clarify|Probe|Theory|Hypothesis/);
    expect(act.seal.digest).toMatch(/^[0-9A-F]{64}$/);
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
| **Seal guard silently weakens back to a freeze check** | `seal.verification.test.js` must mutate nested `payload`/`cites`/`bucketIds` and still throw; a passing `Object.isFrozen` implementation fails this suite by construction |
| **Bank state leaks back into sealed bytes** | `determinism.bank-independence.test.js`; any new sealed field must be justified against the §3.2 input list |
| **Trust partition collapses under a "convenience" refactor** | `trust.partition-boundary.test.js`; grep for any `digestContext(context)` single-blob call site |
| **`hit_count` creeps back into Promote ranking** | `theoryBank.support-principals.test.js`; ranker must query `supportOf()`, never `theories.hit_count` |
| **Phase 6 quietly dropped once F1–F18 go green** | §15 outcome gate is a DoD blocker, not a stretch goal; PIR cannot be filed without measured values |

## 14. Rollout Plan

- **Flag:** `ENABLE_SEMANTIC_CALCULUS` default `0`  
- **Shadow:** compile+seal+deposit Theory/Clarify in logs without executing Do. **Build the gold corpus from these real intents; measure act accuracy and clarification burden here, before anything executes.**  
- **Warn:** execute Clarify/Probe only  
- **Canary:** Do for Visualiser navigation only — **and navigation only because it is reversible, idempotent, observable, and cheap to label.**  
- **Evidence gates (not scope limits).** Each stage advance requires measured evidence, not a green unit suite:
  - Shadow → Warn: act accuracy ≥95% on the bounded UI corpus; κ ≥ 0.7 (Phase 0.5) already met.
  - Warn → Canary: injection attack success <5% on the adversarial set; replay identity 100%; policy bypass rate 0.
  - Canary → wider `Do`: unsafe-execution reduction ≥70% **versus baseline #2** with a reported CI, and safe-coverage loss ≤10pt.
  - **Destructive / external / financial acts:** never on this flag. Follow-up PDR, with reversibility or two-phase commit per §7 of the paper.
- **Every `Do` carries an idempotency key** derived from the sealed act + operation scope, and an undo or no-op guarantee. Retries must not duplicate effects.
- **Incomplete-but-safe:** with flag off, system identical to today  
- **Rollback:** set flag `0`; theory bank remains read-only archive; no schema drop required

## 15. Definition of Done

**Structural gate (necessary, NOT sufficient — this only proves a total function is total):**

- [ ] F1–F20 acceptance tests green under vitest (including seal-last + maybeCompile gate)
- [ ] `CalculusKind` contains no policy verdict; executor checks kind AND law.decision AND capability (F19)
- [ ] Every kind cites a gene in the SCDNA registry; no kind ships without a computable trigger (F20)  
- [ ] Formula registry has versioned formation+modulation entries **with `riskProfile`** for UI guinea pig  
- [ ] Theory bank SQLite migrates/opens; `draftHash` computed after cites+LAW; `pending_seal` reconciliation sweep runs; retire≠delete  
- [ ] Act seal (`sha256-canonical-v0`) is step 10 only; `seal.algorithm` is asserted and never handed to `decodeSCD64`; sealed body carries all four context digests, capability, riskProfile, and compiler identity; no gene mint on compile  
- [ ] Post-seal mutation of `payload.*` / `cites[]` / `ballistics.bucketIds[]` each throw `SEMANTIC_CALCULUS_SEAL_MUTATION` **via seal verification**, and the act still verifies after `structuredClone`  
- [ ] Replay identity **100%** over the frozen fixture corpus; bank-independence test green  
- [ ] Monotonicity property test green; no unreasoned permission-widening path exists  
- [ ] Untrusted context cannot select a gene, select a formula, widen a capability, or override LAW  
- [ ] Feature flag default off; `maybeCompile` null semantics documented (F11)  
- [ ] This PDR referenced from PDR-archive README catalog  
- [ ] PIR filed per §18  
- [ ] Escalations in §6 resolved or explicitly deferred with owner

**Outcome gate (Phase 6 — the actual DoD; each value measured, with a CI, against a named baseline arm):**

| Metric | Target for v0 | Baseline arm |
|---|---|---|
| Kind-label agreement (κ) | overall ≥ 0.7 **AND** every per-kind κ ≥ 0.6 — **gates Phase 2** | n/a (needs 2 humans) |
| Unsafe execution rate | ≥70% relative reduction | **#2 (grammar-constrained)** |
| Safe task coverage | ≤10pt loss vs best baseline | #2 / #3 |
| Structural validity | 100% | #2 (expected tie — not a claim) |
| Semantic act accuracy | ≥95% on bounded UI corpus, **capped by the κ ceiling** | #3 |
| Clarification efficiency | ≥80% success post-clarify; median 1 question | #1 |
| Injection attack success | <5% on canary UI surface | #2 + collapsed-partition ablation |
| Replay identity | **100%** | n/a |
| p95 latency (non-model core) | <50ms — reported **per path**, never as one aggregate | n/a |
| Theory novelty precision | ≥80% after neighbourhood merge | n/a |
| Operator minutes / 1,000 intents | <5 — **the number most likely to kill this architecture** | n/a |

- [ ] Corpus sized from the measured base rate (≈2,050+ intents at a 2% base rate), not from a round number  
- [ ] Security claims carried by the adversarial set, where power is affordable; naturalistic set reported as coverage/latency/accuracy only  
- [ ] Multiple-comparison correction applied across hypotheses  
- [ ] **Reviewer-hours/day curve published** (theory rate × merge rate), with the economic viability line marked. If the product scenario cannot reach ~1 FTE, the theory bank is a staffing plan, not a memory system — say so in the PIR.  
- [ ] PIR includes negative results, latency distributions, attack failures, and the semantic confusion matrix

## 16. Final Architectural Verdict

**Functionally complete but needs follow-up** (as a PDR): doctrine and seams are locked — including **seal-last verification** (not freezing), **trust partitions**, **deterministic bank-independent bodies**, **monotonic modulation**, and **compile vs maybeCompile**. Implementation, Promote-authority, and promotion-integrity escalations remain open. Safe to begin Phase 0–1 behind a flag; not safe to enforce Do globally until the Phase 6 outcome gate is met.

**Rev 3 changed the shape of the claim, not just the schema.** Rev 2 was internally coherent and quietly wrong in five places: the immutability guard could not detect the mutations it existed to prevent; the deposit identity was blind to the fields that determine permission; sealed bytes depended on undeclared bank state (which is where "99.99% replay" came from — the non-determinism was priced into a metric instead of fixed); approximate geometry reached `Do` through five indirections; and untrusted context could steer gene cites without ever violating cite-not-become. Each was invisible at the doctrine level and obvious at the code-example level. **This is the argument for keeping executable examples in PDRs: the doctrine was right and the pipeline implementing it was not, and only §9 could show the difference.**

**The honest boundary of this design.** Semantic Calculus does not make wrong interpretations impossible — a perfectly valid `Do(action='delete', target='draft-7')` is catastrophic if the user meant archive, and no grammar prevents it. It makes wrong interpretations *typed, inspectable, rejectable, replayable, and governable*. That is a systems contribution, not a correctness proof, and §15's outcome gate — not a green unit suite — is the only thing that can establish it.

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
> **A kind is what was said. A verdict is what may happen. Two axes, two fields, never one enum.**  
> **No kind exists without a gene that computes it; a kind without a trigger is an opinion.**  
> Meanings are formed and steered only by sealed formulas under bounded modulation.  
> **Modulators may only reduce permission; no sequence of them may increase authority.**  
> TurboQuant QBIT lattice provides semantic ballistics into meaning buckets.  
> Buckets address meaning; they do not grant permission — **not in one step, and not in five.**  
> **Context is partitioned by trust. Untrusted content may inform; it may never authorize.**  
> SCDNA genes are cited before seal from trusted context only; they do not become acts.  
> Theory-bank deposit (when required) completes before final kind and seal; failure sets `law.decision = escalate`, then seals — a failed deposit does not change what was said.  
> The act seal is computed last, over the full canonical body including cites.
> The act seal is **not** an SCD64; a shared shape is not a shared meaning.  
> **The sealed body is a pure function of its declared inputs. Bank state is not an input.**  
> **Nothing inside a sealed SemanticAct may mutate after sealing — and this is proved by verifying the seal, never by trusting a freeze.**  
> **Replay is identical or it is broken. There is no fourth nine.**  
> Unknowns are theoretical concepts, never null, deposited in SQLite for review.  
> **Support is people, not hits.**  
> Only LAW-gated Promote makes theory executable fact.  
> Theory is an unbound term. Hypothesis is an unbound term whose candidate the speaker supplied.  
> The compiler never invents the candidate; a guess attributed to the user is still a guess.  
> Treating theory as fact is illegal IR.  
> A valid act is not a permitted act; **`Do` carries its capability or it does not execute.**  
> `compileSemanticIntent` is total; `maybeCompile` null means the calculus did not run.  
> AIs rewrite by recompile; they do not author formulas or mutate seals.  
> **Green tests prove the compiler runs. Only measurement proves it helps.**

---

*PDR Author: Semantic Calculus design dialogue (2026-07-16)*  
*Rev 2: seal-last immutability + compile/maybeCompile distinction*  
*Rev 3 (2026-07-16): trust partitions (F13) · capability-bound Do (F14) · risk-class margins (F15) · monotonic modulation (F16, resolves the §6 algebra escalation) · distinct-principal support (F17) · bank-independent deterministic body (F18) · seal verification replaces the shallow-freeze guard (F12) · draftHash moved after cites+LAW (F7) · `pending_seal` reconciliation replaces the unachievable "same txn" write-back · contract absorbed from the technical-implications paper's Appendix A · Phase 0.5 (κ) and Phase 6 (Measure) added with owners · DoD split into structural gate and outcome gate*  
*Rev 4 (2026-07-16): **F5 amended** — the act seal is `sha256-canonical-v0`, not SCD64. Discovered in Phase 0/1 implementation: `generateSCD64(bugFamily)` is an 8-slot diagnostic classifier over a fixed taxonomy with no content parameter, and cannot seal an act; both are 64 hex, so a content digest would decode into a confident meaningless bug taxonomy. `seal.{algorithm,digest}` replaces `seal.{algorithm:'SCD64',scd64}`; theory-bank column `scd64` -> `seal_digest`; `scd64Seal.js` -> `seal.ts`. SCDNA and the immune SCD64 diagnostics are unaffected. Phases 0 and 1 implemented: 31/31 tests green, replay identity 100%, flag default-off.*
*Rev 6 (2026-07-16): **Phase 0.5 ran and failed** (κ=0.159; 0.271 clean) — diagnosed as the kind enum carrying two orthogonal axes. **F19**: kind is an act type, permission is `law.decision`; `CalculusKind` cut 7→5 (Forbidden/Escalate were `law.decision` duplicates); executor now checks three gates; no capability minted for a refused act. **F20**: every kind cites a gene — 6 semantic-calculus genes added to the SCDNA registry. Hypothesis ruled an act by the repo owner with a measured trigger (candidate binding, 100% precision, fail-closed to Theory). Judgement calls in the enum: 7 → 0.*
*Template: `PDR Prompt.md`*
