# Vaelrix SCDNA Benchmark Report

**Date:** 2026-06-24  
**Commit:** `a70fa93` on `v13/main`  
**Scope:** SCDNA Retrieval Genome Protocol implementation and Vaelrix ForceField runtime integration  
**Author:** OpenCode (automated assessment)

---

## Executive Verdict

| Metric | Result |
|--------|--------|
| **Overall grade** | **B+** |
| **Test pass rate** | 134 / 134 (100 %) |
| **Diagnostic violations** | 0 |
| **Runtime latency** | ~4.3 ms per `BrainBridge.ask()` call |
| **Gene operations** | <0.05 ms per compile/decode/detect |
| **Readiness** | MVP-complete, production-hardening recommended |

The SCDNA layer is **functionally complete**, **well-tested**, and **fast enough** for interactive use. The main weaknesses are not in SCDNA itself but in the surrounding runtime: several Amplifier brains are still stubs, the semantic detector is token-based rather than embedding-based, and there is no persistent production registry deployment path yet.

---

## 1. Test Coverage & Health

### 1.1 Automated Test Suite

```text
PYTHONPATH=steamdeck_brain .venv/bin/pytest vaelrix_forcefield/tests/ -q
134 passed in ~1.5 s
```

| Test file | Tests | Focus |
|-----------|-------|-------|
| `test_scdna.py` | 41 | Gene compile, decode, encode, validate, detect, lifecycle, contradictions, compiler CLI, history, supersede |
| `test_scdna_runtime_wiring.py` | 28 | Search governor, amplifier router, BrainBridge, TurboQuant chunks, tiered signals, freshness gate, match cap, PixelBrain routing, council arbiter |
| Existing ForceField tests | 65 | Personality weighting, BrainBridge, tool governor, determinism auditor, search governor, amplifier routing |

### 1.2 Scholomance Diagnostic Scan

- **Report ID:** `PB-DIAG-v1-1782301734171-0000`
- **Cells run:** `IMMUNITY_SCAN`, `LAYER_BOUNDARY`, `TEST_COVERAGE`, `FIXTURE_SHAPE`, `PROCESSOR_BRIDGE`
- **Total errors:** 0
- **Critical violations:** 0
- **Global health:** 0.942

The scan found one minor imbalance in the `AUTH_HANDSHAKE_COMPLEX` (identityProof limiting, csrfBoundary excess), but this is a project-wide architectural signal, not a regression introduced by SCDNA.

### 1.3 Code Coverage Note

`pytest-cov` is **not installed** in the project venv, so line-coverage could not be measured automatically. Based on manual inspection, SCDNA core paths are exercised by the 69 SCDNA-specific tests, but the following are under-tested:

- Error branches in the compiler (duplicate ID, unknown brain, flag validation failures).
- Full recovery path in `recover_gene()`.
- Edge cases around `freshness=0.0` genes and `max_genes_per_request=0`.

**Recommendation:** install `pytest-cov` and target ≥80 % line coverage for `vaelrix_forcefield/scdna/`.

---

## 2. Performance Benchmarks

Measured on the local Steam Deck development environment (Python 3.13.1).

| Operation | Median | Min | Max | Assessment |
|-----------|--------|-----|-----|------------|
| `compile_gene()` | 0.038 ms | 0.036 ms | 0.188 ms | Excellent |
| `decode_retrieval_gene()` | 0.007 ms | 0.007 ms | 0.030 ms | Excellent |
| `detect_gene_matches()` | 0.008 ms | 0.008 ms | 0.072 ms | Excellent |
| `BrainBridge.ask()` with SCDNA | 4.281 ms | 3.739 ms | 5.363 ms | Good for MVP |

### Observations

- Gene-level operations are **negligible** compared to model/tool latencies.
- The 4 ms `BrainBridge.ask()` cost is dominated by stub brain execution, search-governance checks, and arbiter formatting, not by SCDNA.
- The current detector is token-overlap based and therefore bounded by text length; it will remain fast even with larger registries.

---

## 3. Code Size & Footprint

| Component | Lines of Python | Share of `vaelrix_forcefield` |
|-----------|-----------------|-------------------------------|
| `vaelrix_forcefield/scdna/` | 2,151 | ~27.5 % |
| `vaelrix_forcefield/` total | 7,820 | 100 % |

SCDNA added 15 modules plus 2 test files. The integration surface is small: only 8 existing files were modified, and most changes are additive (new `tieredSignals` fields, optional SCDNA branches).

---

## 4. SCDNA PDR Compliance Checklist

| PDR Capability | Status | Notes |
|----------------|--------|-------|
| Retrieval gene schema (`RetrievalGene`, compact string) | ✅ Complete | 12-field schema implemented |
| Compiler with acceptance checklist | ✅ Complete | CLI + programmatic API |
| Content hash + stable ID | ✅ Complete | `scdna-<hash>` |
| Decoder / encoder | ✅ Complete | Compact ↔ English + structured gene |
| Translator to English | ✅ Complete | Action, domain, brains, confidence |
| Validator | ✅ Complete | Field ranges, brain limits, flag checks |
| Detector | ✅ Complete | Token-overlap scoring with base threshold |
| Lifecycle (degradation / recovery) | ⚠️ Partial | Degradation implemented; recovery exists but not exercised by runtime |
| Contradiction detection | ✅ Complete | Action conflicts, suppressed-brain, task-classification mismatch |
| Registry + history + supersede | ✅ Complete | JSON registry + append-only `.jsonl` history |
| ForceField integration | ✅ Complete | `apply_scdna_to_force_field()` with freshness gate + match cap |
| Search Governor integration | ✅ Complete | Gene bypass blocks broad search when confident |
| Tool Governor integration | ✅ Complete | Tiered signals emitted for blocked/high-risk calls |
| Determinism Auditor integration | ✅ Complete | Tiered signals emitted for violations |
| Amplifier Router integration | ✅ Complete | Merge-based signal + gene routing |
| Council Arbiter integration | ✅ Complete | Gene findings reach arbiter as accepted findings |
| PixelBrain Router | ✅ Complete | `PB-YELLOW-v1`/`PB-RED-v1` signal conversion |
| TurboQuant genome chunks | ✅ Complete | Attach/retrieve gene-tagged chunks |
| Health signal emission | ✅ Complete | `emit_health_signal` + runtime routing |

**Compliance score: 18 / 19 (95 %)** — only lifecycle recovery is present but not actively wired.

---

## 5. Runtime Behavior Sample

For the prompt `"fix the color dragon frontend fallback bug"`:

- **SCDNA genes matched:** 1 (`BUGPATTERN_COLOR_DRAGON_FRONTEND_FALLBACK`)
- **Search behavior:** `CODE_BRAIN` searches for `color`, `dragon`, `frontend`, `fallback` were blocked by the gene.
- **Health signals produced:** 7 (mix of determinism warnings, SCDNA signals, and stub-brain notices).
- **Arbiter output:** accepted the SCDNA finding; recommended reviewing flagged risks before editing files.
- **Contradictions flagged:** determinism brain noted non-deterministic tools and unstable brain order.

This demonstrates the intended loop: **query → gene detection → search governance → health signals → arbiter review**.

---

## 6. Strengths

1. **Fast and lightweight.** Gene operations are sub-millisecond; the runtime overhead is acceptable for an MVP.
2. **Well-tested.** 69 SCDNA-specific tests with 100 % pass rate.
3. **Clean integration.** SCDNA is additive; existing ForceField behavior is preserved when no genes match.
4. **Ritual-aware compiler.** Acceptance checklist, duplicate detection, brain limits, and audit history make the compiler production-suitable.
5. **Diagnostic clean.** Scholomance scan reports zero violations on the changed files.
6. **Tiered signal design.** Retroactive health signals from search, tools, and determinism are unified through PixelBrain.

---

## 7. Weaknesses & Gaps

| # | Issue | Severity | Impact |
|---|-------|----------|--------|
| 1 | **Stub Amplifier brains.** Many brains return placeholder output. | Medium | Arbiter decisions are based on low-quality inputs; real value of SCDNA routing is limited. |
| 2 | **Token-based detector.** No embedding/semantic similarity; misses paraphrases. | Medium | Gene recall depends on literal word overlap. |
| 3 | **No production registry path.** Default registry/history live in the package directory. | Medium | Multi-instance deployments will have separate, non-replicated genes. |
| 4 | **Determinism auditor noise.** It flags non-determinism on every run, creating repeated contradictions. | Low-Medium | Arbiter output is cluttered; operators may learn to ignore warnings. |
| 5 | **Lifecycle recovery not wired.** `recover_gene()` exists but is not called by runtime. | Low | Degraded genes stay degraded indefinitely unless contradictions stop. |
| 6 | **No code-coverage tooling.** Cannot quantify test coverage automatically. | Low | Risk of untested regressions. |
| 7 | **Freshness gate is arbitrary.** `min_freshness=0.5` has no empirical calibration. | Low | May reject valid genes or accept stale ones. |
| 8 | **Gutter.jsx typo.** Caught and fixed before commit (`width="8"SS`), but shows manual review is still needed. | Low | Process issue, not architectural. |

---

## 8. Risk Score

Using the sentinel-style model:

| Category | Score / 100 | Rationale |
|----------|-------------|-----------|
| Correctness | 90 | 134/134 tests pass; no diagnostic violations. |
| Performance | 92 | Sub-ms gene ops; 4 ms ask latency is acceptable. |
| Completeness | 78 | PDR 95 % complete; detector and recovery gaps. |
| Production readiness | 65 | Stub brains, no shared registry, no coverage tooling. |
| Maintainability | 85 | Modular package, clear tests, good separation of concerns. |
| **Weighted overall** | **82 / 100** | **B+** |

---

## 9. Recommendations (Priority Order)

1. **Install `pytest-cov` and set a coverage gate** (target 80 % for SCDNA, 70 % for ForceField).
2. **Replace stub brains with real implementations**, starting with `CODE_BRAIN` and `TEST_BRAIN`, so SCDNA routing actually changes behavior.
3. **Add embedding-based gene detection** as an optional `semantic` lookup mode, fallback to token overlap.
4. **Define a production registry deployment path** (e.g., environment-variable override, shared JSON/DB store, or version-controlled canonical registry).
5. **Calibrate freshness gate** against real usage data or make it configurable per environment.
6. **Wire `recover_gene()` into a periodic maintenance loop** so degraded genes can heal when contradictions cease.
7. **Stabilize or gate the determinism auditor** so it does not emit the same warnings on every call.
8. **Add end-to-end integration tests** that exercise real file operations, search, and tool calls with SCDNA genes.

---

## 10. Conclusion

The Vaelrix SCDNA implementation is a **solid, testable, and performant MVP**. It meets the PDR spec for the core protocol and integrates cleanly with the ForceField runtime. The remaining work is less about SCDNA itself and more about **hardening the surrounding cortex**: replacing stubs, adding semantic detection, and defining production deployment semantics.

**Bottom line:** SCDNA is ready for continued development and small-scale use, but should not be considered production-grade until stub brains are replaced and a shared registry path is established.
