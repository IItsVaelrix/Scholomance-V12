# Scholomance Product Metrics & Impact Report Skill

> Skill ID: `METRICS-v1`
> Purpose: Quantify the numerical impact of changes across professional product benchmarks.
> Domain: System Performance, Quality, Accessibility, Security, and Efficiency.

---

## 1. Purpose

The **Scholomance Product Metrics & Impact Report Skill** provides a deterministic framework for measuring and reporting the numerical consequences of any modification to the codebase. 

In a professional product, "it feels faster" is a hypothesis; "FCP improved by 400ms" is evidence. This skill converts conceptual updates into hard data, ensuring that every implementation ritual is verified against the **Stasis Budget** and professional product standards.

It is designed to answer:
1. Did we improve or regress performance?
2. Did we shrink or bloat the bundle?
3. Did test coverage hold or drop?
4. Is the product more or less accessible?
5. What is the bit-level delta of this change?

---

## 2. Scope

### Measured Benchmarks
- **Performance:** FCP, LCP, TBT, CLS, Interaction to Next Paint (INP).
- **Efficiency:** Bundle size (main, chunks), total assets, build time, memory heap.
- **Quality:** Line coverage, branch coverage, lint errors/warnings, type-check failures.
- **Accessibility:** Lighthouse A11y score, jest-axe violations.
- **Security:** Vulnerability count (npm audit), security scan failures (njsscan/gitleaks).
- **Deterministic Drift:** Scoring variance, phoneme error rate (PER), bytecode checksums.

### Operating Modes

| Mode | When to Use | Output |
|---|---|---|
| **A: Snapshot-Only** | Establishing a baseline or current state | Current metrics, no comparison |
| **B: Comparative Audit** | After a change or implementation | Before/After table, delta analysis, regression detection |
| **C: Release Gate** | Final check before merge/deploy | Pass/Fail against budget thresholds |
| **D: Regression Hunter** | Investigating a performance/quality drop | Bisect-style metrics trace to find the regression origin |

---

## 3. Trigger Phrases

Auto-invoke when the user says or implies:
- "generate a metrics report"
- "what is the impact of this change?"
- "compare before and after numerical data"
- "how does this affect performance?"
- "run a product quality audit"
- "check the bundle size / coverage"
- "did we regress any benchmarks?"
- "provide a delta report"

---

## 4. Evidence Standard (Numerical)

| Tier | Label | Meaning |
|---|---|---|
| **Direct** | `Measured Data:` | Output from a tool (Lighthouse, Vitest, Duplicates, etc.) |
| **Repo Context** | `Budget Limit:` | Threshold defined in `GEMINI.md` or `ENGINEERING_RULEBOOK.md` |
| **Inference** | `Projected Data:` | Estimated impact based on file size or complexity (label clearly) |
| **Unknown** | `Unknown:` | Metric could not be measured |

**Forbidden Behavior:**
- Estimating a 100% score without running the tool.
- Claiming "no impact" on bundle size without checking `dist/`.
- Reporting "80% coverage" when only a subset of tests were run.

---

## 5. Metrics Report Format

```markdown
# Product Impact Report — [Short Description]

## 1. Executive Summary
[3-5 sentences on whether the change was an overall improvement or a regression.]

## 2. Primary Impact Table
| Metric | Before | After | Delta | Verdict |
| :--- | :--- | :--- | :--- | :--- |
| Performance (Lighthouse) | [Value] | [Value] | [+/- X%] | [✅/⚠️/❌] |
| Bundle Size (main.js) | [Value] | [Value] | [+/- X%] | [✅/⚠️/❌] |
| Test Coverage (Total) | [Value] | [Value] | [+/- X%] | [✅/⚠️/❌] |
| Accessibility Score | [Value] | [Value] | [+/- X] | [✅/⚠️/❌] |
| Security (Vulnerabilities)| [Value] | [Value] | [+/- X] | [✅/⚠️/❌] |

## 3. Detailed Benchmarks
### ⚡ Performance (Runtime)
- [LCP / TBT / CLS breakdown]

### 📦 Efficiency (Build)
- [Total JS size, Chunk count, Build duration]

### 🧪 Quality (Logic)
- [File-specific coverage deltas, Lint status]

### 🛡️ Security & A11y
- [Audit findings, Axe violations]

## 4. Stasis Gate Check
- [ ] Within Performance Budget? (e.g. <16ms frame)
- [ ] Within Bundle Budget? (e.g. <150kb main)
- [ ] Within Coverage Threshold? (e.g. >80%)

## 5. Risk Analysis
[Identify any "silent regressions"—e.g., performance improved but bundle size grew 20%.]

## 6. MetricTraceIR Bytecode
```

---

## 6. MetricTraceIR Bytecode

```json
{
  "metric_trace_ir_version": "1.0.0",
  "report_id": "METRIC-YYYYMMDD-###",
  "agent": { "name": "Gemini", "mode": "comparative" },
  "subject": { "description": "", "pr_link": "" },
  "metrics": {
    "performance": {
      "before": { "score": 0, "fcp": 0, "lcp": 0, "tbt": 0, "cls": 0 },
      "after": { "score": 0, "fcp": 0, "lcp": 0, "tbt": 0, "cls": 0 },
      "delta_pct": 0
    },
    "efficiency": {
      "bundle_js_kb": { "before": 0, "after": 0, "delta_kb": 0 },
      "build_time_ms": { "before": 0, "after": 0, "delta_ms": 0 }
    },
    "quality": {
      "coverage_pct": { "before": 0, "after": 0, "delta": 0 },
      "lint_warnings": { "before": 0, "after": 0, "delta": 0 },
      "type_errors": { "before": 0, "after": 0, "delta": 0 }
    },
    "accessibility": {
      "score": { "before": 0, "after": 0, "delta": 0 },
      "violations": { "before": [], "after": [] }
    },
    "security": {
      "vulnerabilities": { "before": 0, "after": 0, "delta": 0 },
      "critical_findings": []
    }
  },
  "verdict": {
    "status": "PASS | WARN | FAIL",
    "grade": "A+ | A | B | C | D | F",
    "reasoning": ""
  }
}
```

---

## 7. Professional Product Benchmarks (Scholomance V12)

The skill enforces the following default "Golden Gates" unless overridden by `GEMINI.md`:

| Benchmark | Professional Target | Hard Regression Limit |
|---|---|---|
| **First Contentful Paint** | < 1.0s | > 1.5s |
| **Total Blocking Time** | < 200ms | > 400ms |
| **Cumulative Layout Shift** | < 0.1 | > 0.25 |
| **Accessibility (Lighthouse)** | 100 | < 95 |
| **Main JS Bundle (Gzip)** | < 150 KB | > 250 KB |
| **Test Coverage (Core)** | > 95% | < 90% |
| **Security Vulnerabilities**| 0 Critical / High | > 0 |

---

## 8. Validation Ritual (Commands)

To generate valid reports, the agent must execute (or check logs for):

1. **Performance:** `npm run build` followed by a local Lighthouse run or `lighthouse-ci`.
2. **Efficiency:** `ls -lh dist/assets/` and `npm run build` (capture time).
3. **Quality:** `npm run test:coverage` and `npm run lint`.
4. **Security:** `npm audit`.
5. **Accessibility:** `npx jest-axe` or Lighthouse A11y pass.

---

## 9. VAELRIX_LAW Tribunal Integration

Every metrics report must pass the **Numerical Tribunal**:

- **Law 6 (Determinism):** Did the change introduce stochastic scoring or random metrics?
- **Law 7 (Security):** Did the change introduce any vulnerabilities or bypass input validation?
- **Law 10 (Stacking):** Did any layout metrics change due to z-index drift?
- **Law 12 (Evolution):** Do these metrics suggest we need to tighten or loosen the law?

---

## 10. Example Output Skeleton

```markdown
# Product Impact Report — Refactor of TrueSight Tokenization

## 1. Executive Summary
Significant improvement in analytical speed and quality. The refactor reduced phoneme error rate (PER) and improved build efficiency. Test coverage held steady. Minor increase in bundle size due to new WASM kernel.

## 2. Primary Impact Table
| Metric | Before | After | Delta | Verdict |
| :--- | :--- | :--- | :--- | :--- |
| Performance (Frame Time) | 14.2ms | 11.8ms | -2.4ms (17% ↓) | ✅ IMPROVED |
| Bundle Size (main.js) | 142KB | 158KB | +16KB (11% ↑) | ⚠️ WARN |
| Test Coverage (Total) | 88.4% | 88.4% | 0.0% | ✅ STABLE |
| Accessibility Score | 100 | 100 | 0.0 | ✅ STABLE |
| Phoneme Error Rate | 4.2% | 2.1% | -2.1% (50% ↓) | ✅ IMPROVED |

## 3. Detailed Benchmarks
... [Detailed analysis]

## 4. Stasis Gate Check
- [x] Within Performance Budget? (11.8ms < 16ms)
- [x] Within Bundle Budget? (158KB < 250KB)
- [x] Within Coverage Threshold? (88.4% ≈ target)

## 6. MetricTraceIR Bytecode
[JSON block]
```

---

*Skill author: gemini-product-impact-specialization*
*Date: 2026-05-08*
