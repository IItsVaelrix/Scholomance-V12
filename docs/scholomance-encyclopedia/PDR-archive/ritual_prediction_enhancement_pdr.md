# PDR: Ritual Prediction Enhancement

**Subtitle:** VerseIR-native bounded graph prediction with PixelBrain diagnostic projection

**Status:** Draft
**Classification:** Prediction + VerseIR + PixelBrain + Infrastructure
**Priority:** High
**Primary Owner:** Codex (core/runtime/server) with Claude (consumer surfaces) and Blackbox (replay/QA)
**Primary Goal:** Converge prediction onto one deterministic VerseIR-first pipeline that improves next-token, rhyme, and continuation suggestions without importing incompatible cloud infrastructure.

---

## 1. Executive Summary

Scholomance already has the right primitives for strong ritual prediction: `compileVerseToIR`, the VerseIR-to-PLS bridge, token-graph repos, Hidden Harkov syntax weights, judiciary arbitration, and PixelBrain as a deterministic visual substrate. What it lacks is a single product contract that binds those pieces into one authoritative prediction engine shared by the editor, PLS, and backend lookup paths.

This PDR defines that convergence. Prediction becomes a bounded graph traversal seeded by VerseIR context, scored with syntax-aware judiciary rules, and emitted as a traceable artifact that can optionally be projected into PixelBrain for diagnostics. The design borrows only the parts of the external stack that fit Scholomance's world-law: dual-speed batch and incremental data refresh, optional on-device model quantization for a future local reranker, explicit security hardening, and stronger CI/CD gates. It explicitly rejects Kubernetes, Karpenter, Argo CD, Databricks, a polyglot service split, and atom-based UI rewrites because they add operational weight without improving VerseIR or PixelBrain correctness.

## 2. Problem Statement

Prediction is presently split across multiple partially overlapping paths:

- `src/hooks/usePredictor.js` already builds a graph-backed ranking path.
- `src/lib/pls/providers/prefixProvider.js` still behaves like trie plus bigram lookup.
- `src/lib/pls/providers/predictabilityProvider.js` applies HHM-aware scoring, but only after candidate enumeration.
- `codex/server/services/wordLookup.service.js` has its own graph-backed suggestion ranking.
- `docs/architecture/PHONOSEMANTIC_GRAPH_ARCHITECTURE.md` and `docs/architecture/JUDICIARY_SYNTAX_INTEGRATION.md` describe a stronger end-state than the product currently enforces.

Current gaps:

1. VerseIR is not yet the canonical prediction context even though the compiler already exposes token neighborhoods, window signatures, line-end anchors, and bridge metadata.
2. Candidate generation is duplicated across hook, PLS, and server paths, which risks drift in ranking behavior and trace explanations.
3. Syntax and HHM signals exist but are not consistently injected at the earliest stage of traversal.
4. There is no single diagnostic artifact for prediction decisions, and no formal adapter from prediction traces into PixelBrain.
5. Corpus enrichment is mostly boot-time batch work; there is no explicit incremental refresh strategy for prediction-specific indexes.
6. The system lacks a clear product decision about which modern infrastructure techniques are actually compatible with Scholomance's local-first, bytecode-first architecture.

## 3. Product Goal

1. Compile the active verse once into VerseIR and use that compiled substrate as the canonical prediction context.
2. Run bounded graph traversal over sequence, phonetic, semantic, and school signals, with syntax and HHM legality modulation applied before final arbitration.
3. Emit one shared ritual prediction artifact usable by `usePredictor`, PLS, server lookup routes, and PixelBrain diagnostics.
4. Preserve the Sovereign Editor principle: unsaved verse prediction remains local to the browser unless the user explicitly invokes a server route that already requires consent.
5. Add an incremental artifact refresh path so prediction indexes can improve without adopting a lakehouse or distributed streaming platform.
6. Keep the feature deterministic, explainable, and bytecode-compatible.

## 4. Non-Goals

- Not a migration to Kubernetes, Karpenter, or Argo CD.
- Not a Databricks or Spark adoption.
- Not a rewrite of the frontend state model to Jotai or Recoil style atoms.
- Not a polyglot microservice decomposition into Go, Java, or Erlang services.
- Not making PixelBrain authoritative over candidate selection. PixelBrain is a projection and debug substrate, not the decision engine.
- Not replacing trie, spellchecker, HHM, or judiciary primitives that already work. The goal is convergence and orchestration.
- Not sending unsaved editor text to the server implicitly.
- Not adding a generic LLM dependency as the primary predictor.

## 5. External Technique Intake Matrix

| External technique | Decision | Scholomance adaptation | Why |
|---|---|---|---|
| Kubernetes + Karpenter + Argo CD | Discard for this PDR | Keep current Fastify, Docker, and Render deployment model | Scholomance is not operating a fleet of stateless prediction microservices; cluster orchestration does not improve VerseIR or PixelBrain correctness |
| Model quantization (INT4, BF16, memory-capped) | Adapt, future phase only | Allow a local, optional reranker or embedding pack only if it runs on-device, stays under a strict memory ceiling, and never becomes the sole decision path | The technique fits the local-first constraint, but the current system should first exhaust deterministic graph gains |
| FRP signal or atom state for real-time UI | Discard for core prediction | Keep hook and context driven state; reconsider only for a future diagnostic panel if profiling proves re-render pressure | Prediction quality is a core and runtime problem first, and AGENTS rules already require hook-driven state |
| Lakehouse batch plus streaming architecture | Adapt concept, discard vendor stack | Add dual-speed artifact generation: offline batch index builds plus lightweight append-only incremental updates for sequence, semantic, and phonetic neighborhoods | The pattern is useful, but Databricks and Spark are not justified for this repository |
| Polyglot backend | Discard | Stay JS and TS first with optional Python build scripts where they already exist | More languages increase operational entropy without improving deterministic prediction |
| AWS segmentation + AES-256 at rest | Adapt principle, discard vendor specificity | Preserve local-only unsaved drafts, encrypt persisted prediction artifacts in production storage, keep route and auth boundaries explicit | Security hardening is relevant, AWS-specific topology is not |
| Self-service platform engineering + automated CI/CD | Adopt | Add replay corpus batteries, determinism gates, bytecode artifact validation, and implementation playbooks | This directly improves prediction reliability and developer throughput |

## 6. Core Design Principles

| Principle | Meaning |
|---|---|
| VerseIR-first context | Prediction begins from `compileVerseToIR` and `buildPlsVerseIRBridge`, not ad hoc token slices |
| Bounded traversal | Prediction must use fixed fanout and depth limits plus deterministic tie-breaking |
| Judiciary as arbiter | Final selection is a path arbitration problem, not a raw prefix score sort |
| PixelBrain as observer | PixelBrain renders prediction structure and confidence fields, but never decides winners |
| Bytecode for interoperability | Shared and exported prediction artifacts must encode to bytecode before leaving process boundaries |
| Local-first sovereignty | Unsaved draft prediction happens in-browser; backend reuse is for explicit routes, saved corpora, or opt-in diagnostics |
| Backward-compatible rollout | Existing public APIs stay stable while internals converge |

## 7. Feature Overview

### 7.1 Authoritative Ritual Prediction Engine

Add a single orchestration layer in `codex/core/` that receives:

- active prefix or cursor slot
- VerseIR compiler output
- VerseIR bridge state
- syntax plus HHM context
- current school
- repo-backed sequence, semantic, and phonetic neighborhoods

It returns:

- ranked candidates
- winning candidate
- `ScoreTrace[]` evidence
- legality, connectedness, and path coherence metrics
- optional diagnostic payloads for PixelBrain projection

This orchestration layer becomes the shared engine used by:

- `src/hooks/usePredictor.js`
- `src/lib/poeticLanguageServer.js`
- `codex/server/services/wordLookup.service.js`

### 7.2 VerseIR Anchor Resolution

Use existing VerseIR and bridge features as first-class anchors:

- `lineEndAnchors`
- window signatures
- `primaryStressedVowelFamily`
- terminal rhyme tail
- `featureTables.tokenNeighborhoods`
- `featureTables.lineAdjacency`

This turns prediction from simple prefix completion into slot-conditioned traversal.

### 7.3 Unified Multi-Signal Candidate Frontier

Candidate enumeration must merge:

- sequence likelihood from `createTokenGraphSequenceRepo`
- phonetic neighborhoods from `createTokenGraphPhoneticRepo`
- semantic neighborhoods from `createTokenGraphSemanticRepo`
- school resonance from vowel-family and school-bias signals
- syntax legality from HHM and `syntax.layer.js`

Prefix fit remains a filter, not the whole model.

### 7.4 Syntax-Aware Judiciary Convergence

Adopt the direction in `docs/architecture/JUDICIARY_SYNTAX_INTEGRATION.md`:

- syntax context is present during candidate scoring and arbitration
- rhyme-heavy branches are suppressed when the slot is structurally wrong
- terminal content positions receive higher phonetic and rhyme weighting
- explanation traces explicitly describe when syntax altered the result

### 7.5 Dual-Speed Artifact Pipeline

Borrow the useful part of the lakehouse pattern without the lakehouse:

- batch path: regenerate prediction indexes from `public/ritual_dataset.jsonl`, corpus sources, and saved lexical artifacts
- incremental path: append new explicit training pairs, sequence edges, and semantic co-occurrence edges into a compact local artifact or SQLite table
- refresh target: make new prediction artifacts available in minutes, not hours, using existing scripts and runtime caches

### 7.6 PixelBrain Diagnostic Projection

Prediction results may be projected into PixelBrain as a debug and inspection surface:

- candidate strength becomes emphasis and height
- relation type becomes palette and effect class
- traversed nodes are laid out on a deterministic lattice
- winning path is visually distinguishable from the explored frontier

This projection is optional and must never be required for editor prediction to function.

### 7.7 Optional Quantized Local Reranker

If deterministic graph gains plateau, a second-pass reranker may be introduced with strict guardrails:

- local and on-device only
- quantized footprint under a fixed memory ceiling
- reranks only the bounded candidate frontier
- disabled by default behind a feature flag
- deterministic graph result remains the fallback when the model is absent

## 8. Architecture

### 8.1 Runtime Flow

```text
Draft Verse (browser-local)
        |
        v
compileVerseToIR(...)
        |
        +--> buildPlsVerseIRBridge(...)
        |
        v
RitualPredictionContext
        |
        +--> Sequence repo
        +--> Phonetic repo
        +--> Semantic repo
        +--> School / HHM / syntax context
        |
        v
Bounded token-graph traversal
        |
        v
Candidate scoring + judiciary arbitration
        |
        +--> top-k suggestions for editor / PLS
        +--> canonical trace artifact
        +--> optional PixelBrain projection adapter
```

### 8.2 Local vs Server Boundary

```text
Unsaved editor text
  -> local VerseIR compile
  -> local ritual prediction
  -> local PixelBrain diagnostic projection

Explicit server routes / saved artifacts
  -> same core prediction modules
  -> route-safe serialization / bytecode
  -> authenticated persistence if the user explicitly saves or requests lookup
```

This preserves the Sovereign Editor principle.

### 8.3 Module Layout

**Core**

- `codex/core/ritual-prediction/context.js` — normalize request + VerseIR bridge into a canonical context
- `codex/core/ritual-prediction/anchors.js` — resolve anchor tokens, line-end signals, and window signals
- `codex/core/ritual-prediction/run.js` — build frontier, traverse, score, arbitrate
- `codex/core/ritual-prediction/artifact.js` — package trace output and bytecode-ready projection metadata

**Services**

- reuse and extend:
  - `codex/services/token-graph/sequence.repo.js`
  - `codex/services/token-graph/phonetic.repo.js`
  - `codex/services/token-graph/semantic.repo.js`

**Runtime / Server**

- `src/hooks/usePredictor.js` becomes a thin consumer of the shared core engine
- `src/lib/poeticLanguageServer.js` consumes the same artifact
- `codex/server/services/wordLookup.service.js` uses the same ranking contract
- `codex/runtime/` may cache compiled artifacts and incremental indexes

### 8.4 Backward-Compatible Facade Strategy

Phase 1 must preserve:

- `predict(prefix, contextWord, limit)`
- current PLS completion entrypoints
- existing word lookup routes

The implementation changes beneath those APIs. Callers should not need to know whether results came from trie and bigram lookup or graph orchestration.

## 9. Proposed Contract and ByteCode IR

These are proposed design contracts only. They are not live schema until published in `SCHEMA_CONTRACT.md`.

### 9.1 Proposed Runtime Contract

```ts
interface RitualPredictionContext {
  prefix: string;
  cursorTokenId: number | null;
  prevToken: string | null;
  currentSchool: School | null;
  syntaxContext: ContextActivation["syntaxContext"];
  verseIR: VerseIR;
  verseIRBridge: ReturnType<typeof buildPlsVerseIRBridge> | null;
  maxDepth: number;
  maxFanout: number;
}

interface RitualPredictionCandidate extends GraphCandidate {
  pathNodeIds: string[];
  connectedness: number;
  pathCoherence: number;
  sourceRelations: TokenGraphEdge["relation"][];
}

interface RitualPredictionArtifact {
  version: string;
  verseIRVersion: string;
  mode: string;
  requestHash: string;
  context: RitualPredictionContext;
  winner: RitualPredictionCandidate | null;
  candidates: RitualPredictionCandidate[];
  diagnostics: Diagnostic[];
  pixelbrainProjection?: PredictionPixelBrainProjection | null;
}
```

### 9.2 Bytecode Direction

For in-memory local execution, structured objects are acceptable. For any shared, persisted, or exported prediction artifact:

- encode to a new `PB-PRED-v1` family
- continue to use `PB-ERR-v1` for failures and contract violations
- keep the bytecode payload small enough to replay deterministically in tests and diagnostics

**Initial scope for `PB-PRED-v1`:**

- request hash and version
- active anchors
- winning token
- top-k token scores
- trace checksum
- optional PixelBrain projection checksum

### 9.3 PixelBrain Projection Contract

Do not overload the existing VerseIR amplifier `PixelBrainPayload` until the schema is explicitly expanded. Introduce a dedicated adapter that maps prediction artifacts into a PixelBrain-friendly lattice view. PixelBrain remains a consumer, not the authoritative source.

## 10. Implementation Phases

### Phase 0 — Baseline and Replay Battery

- add a held-out ritual prediction replay set derived from `public/ritual_dataset.jsonl`
- record current trie, bigram, and PLS baseline metrics
- identify drift between `usePredictor`, PLS, and backend suggestion ranking

### Phase 1 — Core Convergence

- add `codex/core/ritual-prediction/*`
- move shared orchestration out of `usePredictor.js`
- route editor, PLS, and backend suggestion flows through the same core engine

### Phase 2 — VerseIR + Syntax Hardening

- incorporate `buildPlsVerseIRBridge` data into anchor resolution
- feed HHM and syntax context into traversal and judiciary
- publish the agreed runtime contract to `SCHEMA_CONTRACT.md`

### Phase 3 — Artifact and PixelBrain Diagnostics

- package canonical prediction artifacts
- add bytecode encoding for persisted and shared artifacts
- build a PixelBrain adapter for deterministic diagnostic rendering

### Phase 4 — Dual-Speed Data Refresh

- extend corpus and index build scripts to generate prediction-specific artifacts
- add a lightweight incremental refresh path for explicit training data and saved corpora
- cache compiled artifacts in runtime with deterministic invalidation

### Phase 5 — Optional Quantized Reranker

- prototype an on-device reranker behind a flag
- enforce memory ceiling, warm-start budget, and deterministic fallback
- ship only if it improves replay metrics without violating local-first constraints

## 11. QA Requirements

1. Determinism battery: same input, same VerseIR, same artifact, same winner.
2. Replay corpus battery: top-1 and top-5 recall measured against a held-out ritual dataset.
3. Cross-surface parity: editor, PLS, and backend return the same candidate ordering for the same context.
4. Performance budgets:
   - warm local top-5 prediction: `<= 25 ms` on a 300-token verse
   - cold local first prediction after compile: `<= 120 ms`
   - optional PixelBrain projection build: `<= 16 ms` for top-12 candidates
5. Sovereignty test: unsaved draft prediction performs no server fetch unless the user explicitly invokes a networked route.
6. Bytecode validation: exported and shared prediction artifacts decode and replay cleanly; failures encode as `PB-ERR-v1`.
7. Regression coverage:
   - `tests/core/predictor.test.js`
   - new ritual prediction replay tests
   - PLS provider parity tests
   - PixelBrain diagnostic snapshot tests if and when projection UI ships

## 12. Success Criteria

- SC1: One canonical core prediction path is reused by `usePredictor`, PLS, and backend lookup.
- SC2: Top-5 recall on the ritual replay set improves by at least 20 percent over the current trie and bigram baseline.
- SC3: Suggestion ordering is deterministic and identical across surfaces for the same input context.
- SC4: Syntax-aware arbitration measurably reduces structurally illegal rhyme suggestions in mid-line function slots.
- SC5: Prediction artifacts can be rendered into a PixelBrain diagnostic lattice without affecting the winning candidate.
- SC6: No incompatible infrastructure from the external stack is introduced into the implementation.
- SC7: Optional quantized reranker, if shipped, never exceeds the agreed memory budget and can be disabled without changing the deterministic baseline result.

## 13. Risks and Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Orchestration duplicates existing token-graph code | Medium | keep new modules thin and reuse existing repos, judiciary, and traversal |
| Syntax over-penalizes creative candidate paths | Medium | expose trace reasons, tune via replay battery, keep bounded weights |
| Incremental artifact refresh introduces drift against batch builds | High | batch build remains source of truth; incremental path must reconcile to a batch checksum |
| PixelBrain projection scope creeps into core ranking | Medium | hard separation: adapter only, never feed visual coordinates back into candidate selection |
| Quantized reranker adds opacity | High | phase-gated, optional, local-only, deterministic graph fallback always present |

## 14. File Manifest

**Expected new or changed files**

- `docs/PDR-archive/ritual_prediction_enhancement_pdr.md`
- `codex/core/ritual-prediction/context.js`
- `codex/core/ritual-prediction/anchors.js`
- `codex/core/ritual-prediction/run.js`
- `codex/core/ritual-prediction/artifact.js`
- `src/hooks/usePredictor.js`
- `src/lib/poeticLanguageServer.js`
- `src/lib/pls/providers/prefixProvider.js`
- `codex/server/services/wordLookup.service.js`
- `SCHEMA_CONTRACT.md`
- replay and parity tests under `tests/core/` and `tests/lib/pls/`

*PDR Author: codex-ritual-pdr*  
*Created: 2026-04-18*
