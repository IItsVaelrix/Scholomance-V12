# Prion Detector Rebuild — Harkov Syntactic Mutation Model

- **Date:** 2026-06-10
- **Status:** Approved design, entering implementation planning
- **Author:** Scholomance Developer + Claude
- **Supersedes:** `2026-06-10-prion-ngram-representation-design.md` (phoneme n-gram approach, dropped)

## Context & Problem

The phoneme prion detector averaged per-phoneme phonological features across a whole snippet → all signatures collapsed to the corpus-mean direction → separation gap `0.0000`, 91/91 colliding pairs (proven by `cleri-probe-separation.js`). The root flaw is deeper than averaging: it modeled the **sound of identifier names**, which is causally disconnected from what code *does*.

Pivot: **drop the phoneme/sound layer entirely.** Keep the **syntactic arrangement** of code and model it with a Harkov (Markov) likelihood model, then have jurors vote on the most likely mutation. This reuses existing infrastructure: the transition-matrix Markov core in `codex/core/shared/models/harkov.model.js` and the juror/voting pattern in `codex/core/phonology/g2p/`.

## Approach (hybrid, two-phase)

```
code → Babel AST → syntactic STATE sequence (node-type / token-kind / depth)
     → Harkov transition model
     → [Phase 1 anomaly] low-likelihood under a NORMAL-code model? → if yes:
     → [Phase 2 vote]    jurors classify which mutation it resembles
```

Phase 1 is **load-bearing and built/tested first**. Phase 2 is built only if Phase 1's anomaly signal is real.

## Phase 1 — The Anomaly Gate (MVP)

### Components
1. **Syntactic tokenizer** (`syntax-tokenizer.js`): `@babel/parser` → AST → ordered sequence of **syntactic states**. A state abstracts a node into name-agnostic, sound-agnostic structure: node type (`CallExpression`, `AwaitExpression`, `MemberExpression`…), token kind (keyword/operator/literal/identifier-role), and nesting depth bucket. Deterministic traversal order.
2. **Normal-syntax Harkov model** (`harkov-mutation.engine.js`): train an order-2 Markov transition model over syntactic states across the codebase's own files (thousands of files = real training data). Reuse the `buildTransitionMatrix` logic (`P(to|from) = count/outgoingTotal`), generalized to order-2 (state pair → next). Trained once; cached deterministically.
3. **Likelihood scorer** (the missing piece): `sequenceLogLikelihood(model, stateSeq)` → mean per-token negative log-likelihood (with Laplace/add-k smoothing for unseen transitions). High NLL = improbable = candidate mutation.

### Success metric (replaces separation-gap)
New probe `scripts/cleri-probe-mutation.js`:
- Score anomaly (mean NLL) for (a) a sample of clean codebase files vs (b) the 14 buggy archetypes and seeded mutations.
- **Acceptance: the buggy set scores meaningfully higher anomaly than the clean set** — report as score distributions + separation gap (and AUC if practical).
- **Kill-criterion:** if clean and buggy distributions overlap (AUC ≈ 0.5 / no gap), the syntactic-Markov signal is too coarse. Report with numbers; do **not** build Phase 2.

### Known risk (stated, not hidden)
"Anomalous ≠ buggy": rare-but-correct constructs will false-positive. Measure FP rate on clean-but-unusual files. Phase 2 voting narrows the *class*, it does not fix base anomaly precision.

## Phase 2 — The Jury (gated on Phase 1)

For regions flagged anomalous, repurpose the existing jurors off phonemes onto syntactic states:
- `SyntacticJuror`, `HHMJuror` (wired to the real Harkov transition signature — currently a hardcoded stub), and one structural juror.
- Each votes on which of the 14 prion classes the anomalous region most resembles (per-prion syntactic signatures). Aggregate via the existing adapter tally → `{ mutationClass, confidence, jurorVotes }`.
- Output maps to `QbitPulse` hotspots (resonance = anomaly score or vote confidence). Ledger/`QbitProbeEnrichment` wiring unchanged.

## Reuse map (honest scope)
- **Free:** transition-matrix Markov core, juror/vote pattern, `@babel/parser` (already a dependency), `QbitPulse` output.
- **New:** AST→state tokenizer, normal-corpus training + cache, `sequenceLogLikelihood`, the mutation probe.
- **Repurpose (not free):** juror feature/state layer from prosody (`stressRole`/`rhymePolicy`/meter) → code-syntax states; wire the real Harkov model into the `HHMJuror`.

## Determinism
Deterministic throughout (stable traversal, fixed smoothing constant, sorted transition tallies) per the project determinism contract, so signatures and the trained model are reproducible (same corpus → same model).

## Files
- **New (Phase 1):** `codex/core/immunity/syntax-tokenizer.js`, `codex/core/immunity/harkov-mutation.engine.js`, `scripts/cleri-probe-mutation.js`, `tests/core/immunity/syntax-tokenizer.test.js`, `tests/core/immunity/harkov-mutation.engine.test.js`
- **New (Phase 2):** juror adaptations under `codex/core/immunity/jurors/` (or repurposed g2p jurors), vote aggregation.
- **Reused/modified:** `harkov.model.js` transition core, g2p jurors (feature layer), prion engine entry point.
- **Dropped:** phoneme vectorization path for prion detection (`codeToPhonemeSignature`), the n-gram spec.

## Out of scope (YAGNI)
- No change to the ledger, QbitPulse, BytecodeHealth.
- No re-enabling the G2P phoneme jury for its original purpose.
- No Phase 2 work until Phase 1 passes its probe.
