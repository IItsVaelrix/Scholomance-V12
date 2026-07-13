# Cleri Probe Baseline — 2026-07-13

Captured by `scripts/cleri-probe/benchmark-baseline.js` against the current CLI engine (`scripts/cleri-probe.js`).
This document records what the tool does today, not what it should do tomorrow.

## Measured profile

| Metric | Value |
|--------|-------|
| Captured at | 2026-07-13T12:10:18.905Z |
| Substrate files | 4677 |
| Hypothesis scan duration (`currentProcessMs`) | 9903.54 ms |
| Prion scan duration (`currentPrionMs`) | 1305.97 ms |
| Hypothesis | `leaked event listener subscription missing cleanup` |
| Listener fixture ranking | `hard-negative.jsx` rank 5 (0.388), `verified.jsx` rank 10 (0.294) |
| CLI self-contamination | Canonical source is `scripts/cleri-probe.js` (does not rank in the listener-hypothesis top 500). Visible artifact: `scripts/cleri-probe/benchmark-baseline.js` rank 4 (0.402). All paths are recorded repository-relative. |

## Component dispositions

| Component | Verdict | Rationale |
|-----------|---------|-----------|
| Source filtering (skip `node_modules`, `.git`, `docs`, etc.; keep `js/jsx/ts/tsx/mjs/cjs`) | **RETAIN_FOR_RETRIEVAL** | Tightening the substrate to source files was the fix that stopped PySide6 metatypes JSON from outranking JavaScript bugs. Keep the allow-list, but add the new fixture tree to the scan so accuracy cases are first-class citizens. |
| IDF corpus weighting | **RETAIN_FOR_RETRIEVAL** | Without IDF, the top band collapsed to a six-point spread. IDF is essential for separation. The current implementation is correct in principle; the failure is in the similarity lens, not the weighting. |
| 4096-dimension float vectors + raw cosine score | **REWORK** | Float + 4096 dims + raw cosine (not `(cos+1)/2`) is the right substrate, but raw cosine alone cannot distinguish a safe cleanup from a leak. It must be paired with structural evidence (presence/absence of paired calls, AST scope, etc.). |
| Prion presence/absence logic (paired-call exact + token-window heuristic) | **REWORK** | The paired-call prions (`listener-without-cleanup`, `interval-without-clear`) are precise and should be the foundation. The token-window prions are too coarse: `silent-failure-swallowed-error` reports 395 sites and `unseeded-rng-in-deterministic-path` reports 110 sites. Replace broad token windows with bounded scope/AST checks before scaling. |
| Phoneme-prion TurboQuant signatures | **REJECT** | All 15 archetypes currently report every one of the 4677 source files at resonance `1.0`. The signature/inner-product stage is saturated and non-discriminative. Do not use it as a scoring oracle until it can be recalibrated. |

## Measured accuracy against the frozen corpus

The corpus has 20 cases: 10 `VERIFIED` (clear or real-world positives) and 10 `NO_FINDING` (direct and adversarial hard negatives), balanced across five pathology families.

With the current default cosine threshold of `0.4`:

* **Recall@default**: 0/10 verified cases appear in any hypothesis heatmap.
* **Precision@default**: undefined (no verified cases are retrieved).
* **False-positive distribution@default**: 2/10 hard-negative cases appear above threshold (`unseeded-randomness-combat-seeded` at 0.418, `listener-lifecycle-socket-off` / `listener-lifecycle-window-cleanup` at 0.380), producing false positives with no corresponding true positives.

With threshold lowered to `0` (all results surfaced):

* **Recall@all**: 10/10 verified cases are present somewhere in the 4673-result heatmap.
* **Precision@all**: 10/4673 ≈ 0.002 — essentially noise.
* **False-positive distribution@all**: in four of five families the hard-negative fixture ranks *above* the verified fixture, confirming the vector lens is scoring lexical overlap rather than structural defect:
  * `UNSEEDED_RANDOMNESS`: hard-negative rank 7 (0.418) vs. verified rank 55 (0.284)
  * `LEAKED_LISTENER_SUBSCRIPTION`: hard-negative rank 5 (0.388) vs. verified rank 10 (0.294)
  * `SWALLOWED_ERROR`: hard-negative rank 55 (0.277) vs. verified rank 93 (0.237)
  * `UNSAFE_EXTERNAL_RESPONSE_ACCESS`: hard-negative rank 13 (0.290) vs. verified rank 17 (0.275)
  * `CONCURRENT_SHARED_STATE_MUTATION`: verified rank 341 (0.084) vs. hard-negative rank 423 (0.075) — the only family where the verified case ranks higher, though both are buried in noise.

## Interpretation (not proof)

High cosine resonance is **not** evidence of a bug. The current engine rewards shared vocabulary (`addEventListener`, `Promise.all`, `catch`, `Math.random`) and penalizes fixtures that happen to use less common tokens. The 2026-07-13 failures are therefore expected:

1. **Self-contamination**: the probe strings live inside `scripts/cleri-probe.js`, so files in `scripts/cleri-probe/` that embed those strings rank highly for their own hypotheses. `scripts/cleri-probe.js` itself is the canonical self-contamination source; it does not appear in the listener-hypothesis top 500, while `scripts/cleri-probe/benchmark-baseline.js` surfaces at rank 4.
2. **Safe cleanup ranks above leak**: a fixture that contains `removeEventListener` or `socket.off` shares the same keyword neighborhood as the leak fixture and scores higher because it has more matching tokens, not because it is more buggy.

The replacement engine must treat these cosine scores as weak retrieval signals and rely on structured presence/absence rules for ranking and verdicts.
