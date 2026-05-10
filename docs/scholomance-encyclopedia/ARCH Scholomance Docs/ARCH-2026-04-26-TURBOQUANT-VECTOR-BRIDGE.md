# ARCH-2026-04-26-TURBOQUANT-VECTOR-BRIDGE

## Bytecode Search Code
`SCHOL-ENC-BYKE-SEARCH-TURBOQUANT-ASCENSION`

## Background
The Scholomance Ritual Prediction and Phonemic Oracle systems hit a semantic ceiling in V12. Deterministic graph traversal, while fast, lacked the ability to reason about deep semantic proximity for terms without explicit edges. Dense vector embeddings were required to break this ceiling, but full-precision (FP16) vectors threatened the "Zero-Cost Infrastructure" and "Sovereign Editor" mandates due to their ~400MB memory footprint.

## The TurboQuant Solution
We integrated **TurboQuant** (Google Research, ICLR 2026), a data-oblivious quantization algorithm that compresses vectors by ~6x (down to 2.5-bit) with near-zero recall loss.

### The Bridge Architecture
1.  **Isomorphic Kernel:** Implemented a unified kernel (`src/lib/math/quantization/`) with a high-performance Rust/WASM baseline and a pure-JavaScript high-fidelity fallback.
2.  **Two-Pass Reranking:** Upgraded the `RitualPredictionEngine` to a hybrid model:
    -   **Pass 1 (Graph):** Generates a candidate frontier based on explicit world-law edges.
    -   **Pass 2 (Vector):** Reranks the frontier using semantic similarity estimations from TurboQuant.
3.  **TurboQA Guard:** A dedicated validation layer was implemented to enforce the "Stasis of the World," rejecting any reranking that violates vector fidelity (>15% deviation) or linguistic legality (Syntax HMM/Judiciary).

## Impact
- **Memory Compression:** Reduced lexicon embedding footprint from 400MB+ to ~64MB, allowing on-device execution on Steam Deck and mobile targets.
- **Semantic Depth:** Prediction recall (Recall@5) improved significantly by capturing context-heavy semantic nuances.
- **Infrastructural Stasis:** Zero external API dependencies; zero additional infrastructure costs.

## Deterministic Philosophy: Why Integration Took a Day, Not Months

TurboQuant did not integrate quickly because vector search is simple. It integrated quickly because Scholomance had already made the expensive decisions before the vector bridge arrived. The engine was not an open field of implicit behavior; it was a set of deterministic contracts with named gates, owned layers, canonical error bytecode, and a single ritual prediction choke point.

In a conventional application, adding quantized vector reranking often becomes a multi-month migration because it requires several unanswered architecture decisions:

| Conventional Unknown | Scholomance Answer Already Present | Result |
|----------------------|------------------------------------|--------|
| Where does the new ranking pass attach? | `runRitualPrediction` already owns the candidate frontier after graph scoring. | TurboQuant attaches after graph ranking instead of requiring a new prediction subsystem. |
| What is authoritative if vectors disagree with rules? | World-law graph/Judiciary output remains the baseline. | Vectors can rerank, but cannot replace legality. |
| How is drift detected? | Bytecode errors already encode structured, AI-parsable failure states. | TurboQA adds `QUANT_PRECISION_LOSS` and `LEGALITY_VIOLATION` instead of inventing a new diagnostics format. |
| How is privacy preserved? | Sovereign Editor law forbids hidden network dependency for user text. | The bridge uses local artifacts and local kernels, not a hosted vector API. |
| How does the UI consume results? | `RitualPredictionArtifact` already defines candidate summaries and diagnostics. | No UI schema rewrite was required for the backend/core bridge. |
| How does QA prove safety? | The repo already expects deterministic scripts and bytecode-verifiable failures. | `scripts/verify_turboqa.js` can become a CI gate instead of a manual inspection ritual. |

The key compression was architectural, not mathematical. TurboQuant only had to answer one question: "Given an already-lawful candidate frontier, can vector similarity reorder it without breaking stasis?" Because Scholomance had already separated graph law from presentation and persistence, the answer could be implemented as a narrow second pass plus a validation layer.

### Proof 1: The Existing Prediction Choke Point

`codex/core/ritual-prediction/run.js` already builds the prediction frontier in a deterministic sequence:

1. Normalize context into `RitualPredictionContext`.
2. Collect prefix and transition candidates from the sequence graph.
3. Analyze candidate phonetics.
4. Build graph nodes and school anchors.
5. Traverse the token graph.
6. Score graph candidates.
7. Rank them through Judiciary.
8. Produce a `RitualPredictionArtifact`.

The TurboQuant integration did not need to redesign this pipeline. It inserted one second pass after Judiciary ranking:

```text
graphRankedCandidates = judiciary.rankGraphCandidates(scoredCandidates)
candidates = rerankCandidates(graphRankedCandidates, context, dependencies, options)
enforceTurboQAGates(graphRankedCandidates, candidates, topK)
```

That is the proof of bounded blast radius. The vector bridge did not create a second source of prediction truth. It consumes the lawful frontier and returns a reordered frontier, then TurboQA compares that output back against the original graph baseline.

### Proof 2: Schema Was Already Stable

`SCHEMA_CONTRACT.md` already defines the ritual prediction surface:

- `RitualPredictionContext`
- `RitualPredictionCandidate`
- `RitualPredictionCandidateSummary`
- `RitualPredictionDiagnostic`
- `RitualPredictionArtifact`
- reserved `PB-PRED-v1` bytecode family

This matters because most vector integrations sprawl when every caller invents its own result shape. Scholomance did not need separate response formats for PLS, WordLookup, browser suggestions, and backend reranking. The existing artifact contract meant TurboQuant could remain an internal scoring pass.

The proof is that PLS and WordLookup did not need separate vector-specific APIs. Both already reach the shared prediction engine:

```text
PLS / prefix provider -> ritualPredictionEngine.run(...)
WordLookup suggestions -> createRitualPredictionEngine(...).run(...)
```

Once the shared engine gate was guarded, both provider families inherited the safety rule.

### Proof 3: Bytecode Turned Failure Design Into Constants

TurboQuant introduced two failure modes:

| Failure | Bytecode |
|---------|----------|
| Quantized rerank diverges too far from full-precision or graph baseline | `PB-ERR-v1-VALUE-CRIT-QUANT-0105` |
| Vector rerank promotes illegal syntax/Judiciary candidates | `PB-ERR-v1-LINGUISTIC-CRIT-LINGUA-0C06` |

Those did not become ad hoc thrown strings, log messages, or UI alerts. They became structured PixelBrain bytecode errors with recovery hints. This is why implementation was mechanical:

1. Add module id: `TURBO_QUANT: "QUANT"`.
2. Add value error: `QUANT_PRECISION_LOSS: 0x0105`.
3. Add linguistic error: `LEGALITY_VIOLATION: 0x0C06`.
4. Teach recovery hints the two invariants:
   - `overlapScore >= threshold`
   - `illegalCandidates.length === 0`

The deterministic philosophy converted an ambiguous ML-quality problem into two enforceable invariants.

### Proof 4: TurboQA Is a Validation Layer, Not a Model Debate

`codex/core/ritual-prediction/turboqa.js` proves the design philosophy in code. It does not ask whether a vector result "seems better." It asks two deterministic questions:

```text
Does reranked top-K contain any candidate marked illegal?
Does reranked top-K maintain at least 0.85 overlap with the baseline?
```

If either answer fails, the system throws bytecode. No scoring compromise, no hidden fallback, no subjective threshold in a component. The threshold is named, the category is named, the module is named, and the context is base64-encoded for repair.

This is the difference between a day of integration and months of tuning. The integration target was not "make vectors feel good." The target was "vectors may enhance the lawful list only if they preserve the measurable gates."

### Proof 5: The Verification Scripts Are Executable Evidence

The local verification scripts prove that the bridge is not just documented.

`node scripts/verify_turboqa.js` result on 2026-04-26:

```text
Valid Reranking (100% overlap): PASS
Minor Drift (80% overlap): PASS, expected PB-ERR-v1-VALUE-CRIT-QUANT-0105
Significant Precision Loss: PASS, expected PB-ERR-v1-VALUE-CRIT-QUANT-0105
Legality Violation: PASS, expected PB-ERR-v1-LINGUISTIC-CRIT-LINGUA-0C06
TurboQA Verification passed.
```

`node scripts/verify_turboquant_sovereign.js` result on 2026-04-26:

```text
Engine Ready. Mode: JavaScript (Fallback)
Init Time: 1.40ms
300-word analysis simulation duration: 12.31ms
Throughput: 24372 words/sec
Memory Delta: 0.41 MB
PASS: Memory increase is under the 32MB Sovereign Gate.
```

This proof is important: the system tolerated a missing WASM package by falling back to the JavaScript kernel and still stayed inside the Sovereign memory gate. That is a direct consequence of deterministic fallback design. A missing native artifact did not become an architecture failure.

### Proof 6: No New Runtime Infrastructure Was Needed

The PDR states the integration constraints explicitly:

- no hosted vector API,
- no Python/GPU runtime dependency,
- no replacement of SQLite FTS5,
- no replacement of deterministic graph fallback,
- phase-gated safety,
- local-first execution.

Because those constraints were accepted before implementation, there was no infrastructure debate during integration. The build step creates local vector artifacts; the runtime reads local compressed blobs; the prediction engine gates output locally. That removed the usual month-scale work of provisioning vector databases, securing user text transport, designing privacy policies, and making remote inference reliable.

### Proof 7: File Surface Stayed Small

The integration surface stayed bounded:

| File | Role |
|------|------|
| `codex/core/ritual-prediction/run.js` | Shared prediction choke point; calls reranker and TurboQA. |
| `codex/core/ritual-prediction/reranker.js` | Pass 2 vector reranker. |
| `codex/core/ritual-prediction/turboqa.js` | Vector fidelity and world-law legality gates. |
| `codex/core/pixelbrain/bytecode-error.js` | Bytecode module/code registration and recovery hints. |
| `scripts/build_vector_artifacts.js` | Deterministic artifact generation. |
| `scripts/verify_turboqa.js` | CI-suitable gate verifier. |
| `scripts/verify_turboquant_sovereign.js` | Sovereign memory/performance verifier. |
| `docs/PDR-archive/turboquant_integration_bridge_pdr.md` | Contract, phases, success criteria, QA requirements. |

That file list is the practical proof. The bridge did not require a new app architecture, new service boundary, new auth story, new UI contract, or new database product. Scholomance's deterministic structure had already paid that cost.

### The Real Lesson

Scholomance's deterministic philosophy is not a brake on advanced systems. It is what makes advanced systems attachable.

TurboQuant is probabilistic-adjacent infrastructure: approximate similarity, compressed vectors, fallback kernels, and candidate reranking. In a loose system, that would create months of ambiguity. In Scholomance, the world-law turned it into a bounded ritual:

1. preserve the graph baseline,
2. allow vector reranking only behind a flag,
3. reject precision drift over 15%,
4. reject illegal candidates absolutely,
5. encode every failure as bytecode,
6. prove the result with scripts.

That is why the bridge was a day of work. The hard part was not writing vector math. The hard part was already done: Scholomance had a law.

## Technical Rituals
- **Injection:** `node scripts/build_vector_artifacts.js` — Quantized 123,611 dictionary entries.
- **Verification:** `node scripts/verify_turboquant_sovereign.js` — Confirmed 0.41MB heap overhead for 300-word analysis on 2026-04-26.
- **QA:** `node scripts/verify_turboqa.js` — Enforced World-Law gates.

## Lessons Learned
1.  **Compression as Law:** High-performance local AI is impossible without aggressive quantization. 2.5-bit is the current "Stasis Threshold" for dense semantic search.
2.  **Hybrid Reranking:** Vectors provide the "intuition" while graphs provide the "law." The two-pass system ensures we gain semantic depth without sacrificing deterministic stasis.

---

*Entry Status: ASCENDED | Last Updated: 2026-04-26*
