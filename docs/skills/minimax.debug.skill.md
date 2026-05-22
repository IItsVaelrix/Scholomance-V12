MINIMAX_DEBUGGING_SKILL.md

# Minimax (Testing + QA + CI) Debugging Skill

> Specialization of `vaelrix.law.debug.skill.md` for the Minimax agent — owner of testing, QA, CI configuration, and merge gates.

---

## 1. Purpose

Diagnose, isolate, and repair failures in the **verification layer** of Scholomance — Vitest unit/integration tests, Playwright visual regression, contract tests, golden masters, fixtures, CI configuration, coverage, and the merge gates that block bad changes from landing.

Minimax bugs come in two flavors:
1. **Test failures that reveal real bugs** — diagnosed and routed to the responsible agent (Claude / Codex / Gemini)
2. **Test infrastructure failures that mask real bugs** — flake, mock-prod divergence, fixture rot, golden master decay, coverage gaps, CI misconfiguration

The skill enforces the principle that *a passing test means the code is verified, not just executed*. Decorative tests are worse than no tests because they manufacture false confidence.

---

## 2. Scope

### Owned Surface (writable)
- `tests/` — all test files (unit, integration, contract, golden, fixtures, qa)
- `tests/visual/` — Playwright baselines (shared with Claude — Claude rebaselines, Minimax verifies the harness)
- CI configuration (`.github/workflows/`, `vitest.config.*`, `playwright.config.*`, lint configs)
- Test fixtures, mock factories, test utilities
- Coverage thresholds and reporting configuration
- Merge gate definitions (required checks, required reviewers)

### Forbidden Lanes (read-only)
- `src/pages/`, `src/components/`, `*.css` — Claude authority
- `codex/`, `codex/server/`, `src/lib/`, `src/hooks/` logic — Codex authority
- `src/data/` — Codex / Gemini
- `scripts/` — Codex / Gemini
- Mechanic balance numbers / world-law specs — Gemini authority

If a test failure reveals a bug in production code, **Minimax produces a diagnostic and routes to the responsible agent**, not a patch into production code.

### Shared Boundary (negotiated)
- `tests/visual/` baselines — Claude rebaselines after intentional UI changes; Minimax owns the harness, runner, and flake-detection
- Acceptance criteria — Gemini specifies; Minimax implements as automated checks where possible
- Contract tests at layer boundaries — Codex defines schema; Minimax verifies consumer compatibility

---

## 3. Trigger Phrases

Auto-invoke when the user says or implies:

- "the test is failing / passing intermittently"
- "this test is flaky / brittle / decorative"
- "CI is broken / red / stuck"
- "coverage dropped / gap / regression"
- "golden master diverged / needs rebaseline"
- "Playwright keeps failing on viewport X"
- "the mock doesn't match production"
- "fixture rot" / "fixture out of date"
- "this test would pass even if the code were broken"
- "merge gate is letting bad changes through"
- "merge gate is blocking valid changes"
- "test setup is slow / hanging / flaky"
- "snapshot mismatch"
- "vitest config issue" / "playwright config issue"
- "the test runner found nothing"
- "tests pass locally but fail in CI"
- "tests pass in CI but fail locally"

---

## 4. Operating Modes

| Mode | When to Use | Output |
|---|---|---|
| **A: Diagnostic-Only** | Test failure with unclear cause | Hypothesis ladder (real bug vs flake vs fixture rot vs CI), evidence requested, routing recommendation |
| **B: Patch-Ready** | Test infrastructure fix in owned surface | Diff-style patch, harness update, fixture refresh, flake mitigation |
| **C: Routing Spec** | Failure is a real bug in another agent's lane | Diagnostic report + handoff brief to Claude / Codex / Gemini |
| **D: Senior Reviewer** | Audit a proposed test, fixture, or CI change | Pass / block + decorative-test detection + flake risk + coverage delta |
| **E: Post-Update Auditor** | After any test / CI change | What's now verified, what's now decorative, what's flaky, coverage delta |
| **F: Red-Team** | Attack a proposed test | Mutation-test mindset — would this test fail if the implementation were broken? |

---

## 5. Evidence Standard

| Tier | Label | Example |
|---|---|---|
| Direct | `Direct Evidence:` | Captured test runner output, CI log, flake repro count, coverage diff |
| Repo Context | `Repo Context:` | Derivable from CLAUDE.md, ARCH_CONTRACT_SECURITY.md, SCHEMA_CONTRACT.md, vitest/playwright configs |
| Inference | `Inference:` | Implied by stack trace, test name, fixture content |
| Hypothesis | `Hypothesis:` | Plausible but unverified |
| Unknown | `Unknown:` | Missing — must request runner output, CI logs, or repro |

**Forbidden phrasings**:
- "the test passed" without command output
- "this test is reliable" without flake count
- "coverage is good" without a measured percentage
- "this fixture matches production" without a contract check
- "CI is green" without a build link
- "rebaseline is safe" without explaining what changed visually

Minimax above all agents must not invent test results. The skill exists to *prevent* false confidence — manufacturing it would be the deepest possible failure mode.

---

## 6. Debug Report Format

```markdown
# Test / QA Debug Report

## 1. Symptom
## 2. Classification — Real Bug / Flake / Fixture Rot / Mock Drift / Golden Master Stale / CI Config / Coverage Gap / Decorative Test / Harness Bug
## 3. Reproduction Path — Command, environment, seed, retry count
## 4. Failure Chain — Test → Assertion → Underlying Cause
## 5. Root Cause
## 6. Evidence
## 7. Blast Radius — Which test files, which production lanes, which agents
## 8. Routing — Real bug → which agent. Test bug → fix in owned surface.
## 9. Fix Strategy
## 10. Minimal Patch (or Handoff Brief)
## 11. Coverage Delta
## 12. Flake Mitigation
## 13. Mutation Test Mindset — Would the test fail if the code were broken?
## 14. QA Checklist
## 15. Confidence Grade
## 16. Remaining Unknowns
## 17. Test DebugTraceIR
```

No section omitted silently.

---

## 7. Test DebugTraceIR Bytecode

```json
{
  "debug_trace_ir_version": "1.0.0",
  "agent": { "name": "Minimax", "assigned_md": "MINIMAX.md", "mode": "" },
  "bug": {
    "title": "",
    "symptom": "",
    "classification": "real_bug | flake | fixture_rot | mock_drift | golden_master_stale | ci_config | coverage_gap | decorative_test | harness_bug",
    "severity": "low | medium | high | critical",
    "confidence": 0.0
  },
  "context": {
    "repo": "Scholomance-V12",
    "test_file": "",
    "test_name": "",
    "runner": "vitest | playwright | node | other",
    "ci_environment": "local | github_actions | unknown",
    "user_goal": ""
  },
  "failure_signal": {
    "raw_output": "",
    "stack_trace_root": "",
    "first_meaningful_failure": "",
    "secondary_failures": []
  },
  "flake_analysis": {
    "repro_attempts": 0,
    "failures": 0,
    "flake_rate": 0.0,
    "race_or_timing_suspected": "true | false | unknown",
    "ordering_dependency_suspected": "true | false | unknown"
  },
  "fixture_health": {
    "fixture_file": "",
    "matches_production_shape": "true | false | unknown",
    "last_refresh_anchor": "",
    "drift_evidence": ""
  },
  "mock_health": {
    "mock_file": "",
    "diverges_from_production": "true | false | unknown",
    "divergence_evidence": ""
  },
  "golden_master": {
    "golden_file": "",
    "diverged": "true | false | unknown",
    "intentional_change_anchor": "",
    "rebaseline_safe": "true | false | unknown"
  },
  "coverage": {
    "before_pct": 0.0,
    "after_pct": 0.0,
    "delta": 0.0,
    "gap_files": []
  },
  "mutation_mindset": {
    "would_test_fail_if_code_broken": "true | false | unknown",
    "decorative_test_risk": "true | false | unknown",
    "evidence": ""
  },
  "routing": {
    "real_bug_owner": "claude | codex | gemini | none",
    "handoff_brief_required": "true | false",
    "test_infrastructure_fix_required": "true | false"
  },
  "fix": {
    "strategy": "",
    "minimal_patch_summary": "",
    "files_to_change": [],
    "files_not_to_change": [],
    "rollback_plan": ""
  },
  "merge_gate": {
    "blocks_merge": "true | false",
    "reason": ""
  },
  "grade": { "letter": "", "score": 0, "reason": "", "upgrade_path": "" }
}
```

---

## 8. Senior Debugging Arsenal (Test-prioritized)

| Technique | Test Application |
|---|---|
| **Mutation Testing Mindset** | Would the test fail if the implementation were broken? If not, the test is decorative — block it. |
| **Differential Testing** | Local vs CI environment, mock vs real, fixture vs production data |
| **Property-Based Testing** | Use for huge input spaces (poem text, arbitrary phonemes, random Unicode, edge schools) |
| **Metamorphic Testing** | Same input → same output; reordering should not change result; whitespace should not change phoneme identity |
| **Golden Master Discipline** | Capture known-good before refactor; diff after; require explicit anchor for any rebaseline |
| **Flake Repro Loop** | Run failing test 100x; flake rate >0% and <100% confirms flake; 100% means real bug |
| **Mock-Prod Divergence Audit** | When mock-only tests pass, run an integration test that hits the real adapter — if it fails, the mock has rotted |
| **Fixture Anchor Audit** | Every fixture must reference the production shape (schema version, ground-truth data) |
| **Race Timeline Analysis** | For async test failures: T0 setup → T1 action → T2 assertion → T3 teardown; identify ordering assumption |
| **Coverage Cliff Audit** | New file with no tests; modified file with shrinking coverage; uncovered error branches |
| **Test Smell Detection** | Tests that import from production internals; tests that mutate global state; tests that depend on order |

---

## 9. Scholomance-Specific Test Audits

### 9.1 Test Lane Coverage

| Lane | Required Test Type | Owner |
|---|---|---|
| `src/components/`, `src/pages/`, `*.css` | Visual regression (`tests/visual/`) | Claude rebaselines, Minimax verifies harness |
| `codex/core/` | Unit + golden master | Codex writes, Minimax audits |
| `codex/services/` | Contract test against real adapter | Codex writes, Minimax audits |
| `codex/runtime/` | Integration test (caching, dedupe, rate limit) | Codex writes, Minimax audits |
| `codex/server/` | Integration test against real DB / Redis | Codex writes, Minimax audits |
| `src/lib/` | Property-based + golden master | Codex writes, Minimax audits |
| Mechanic specs | Acceptance criteria as automated checks | Gemini specifies, Minimax implements where possible |

### 9.2 Sacred Test Suite Audit

These suites must always be green on main:

- `verify_turboqa.js` — TurboQuant gate verification (per `turboquant_integration_bridge_pdr.md`)
- `tests/lib/deepRhyme.engine.test.js` — rhyme determinism
- `tests/lib/truesight/rhymeColorRegistry.test.js` — color mapping integrity
- `tests/qa/rhyme-analysis-backend.qa.test.jsx` — full backend pipeline
- `tests/visual/` baselines — UI regression

### 9.3 Mock-Prod Divergence Hot Spots

Memory note from CLAUDE.md context: integration tests must hit a real database, not mocks. Reason: prior incident where mocked tests passed but production migration failed.

| Surface | Required Mode |
|---|---|
| SQLite migrations | Real SQLite, never in-memory mock |
| Auth / session | Real Redis, never in-memory mock |
| Dictionary lookup | Real adapter against real fixture DB |
| TurboQuant kernel | Real JS fallback or real WASM, never simulated math |
| Fastify routes | Real Fastify instance, supertest |

### 9.4 Determinism Test Audit

- For every scoring / IR / prediction function: same input + same seed → same output, asserted explicitly
- Cross-platform: where feasible, run the same test on Linux + macOS + Browser environments
- Bit-identical assertions for similarity scores per QA Req #4 of TurboQuant PDR

### 9.5 Golden Master Discipline

| Check | Required |
|---|---|
| Golden file exists for every deterministic core function | Yes |
| Rebaseline requires an anchor (PR, issue, commit) explaining what changed | Yes |
| Rebaseline requires a diff summary in the commit message | Yes |
| Stale goldens (>6 months unverified) flagged for re-anchor | Yes |

### 9.6 Visual Regression Discipline

| Check | Required |
|---|---|
| Baselines exist for every page × school × viewport combination | Yes (or explicit waiver) |
| Rebaseline requires Claude's explicit confirmation of intentional change | Yes |
| Reduced-motion variant baselines exist | Yes |
| Baselines stored deterministically (font rendering, devicePixelRatio fixed) | Yes |

### 9.7 Coverage Threshold Audit

- Critical paths: `codex/core/`, `src/lib/` — coverage threshold ≥ 90%
- Server routes: ≥ 80%
- UI components: visual regression count over line coverage; line coverage informational only
- New file with no tests blocks merge unless explicitly waived

### 9.8 CI Configuration Audit

| Check | Required |
|---|---|
| Required checks include: lint, test, build, security:qa, test:visual | Yes |
| Concurrency cancellation prevents stuck builds | Yes |
| Cache key invalidates on lockfile or config change | Yes |
| Secrets scoped to environment, not global | Yes |
| No skipped tests without an issue link | Yes |

---

## 10. Mandatory QA Commands

| Command | Purpose | Required When |
|---|---|---|
| `npm run lint` | Static, max-warnings=0 | Every change |
| `npm test` | Vitest unit / integration | Every change |
| `npm run build` | Production build smoke | Every change |
| `npm run test:visual` | Playwright regression | Every UI surface change |
| `npm run security:qa` | Security checks | Every auth / API / persistence change |
| `npm run security:audit` | Dependency risk | Before release |
| `node scripts/verify_turboqa.js` | TurboQuant gate | Every prediction / TurboQuant change |
| Flake repro loop (100x) | Flake confirmation | Every intermittent failure |
| Coverage report | Coverage delta | Every PR |

**Absolute rule**: never claim a command passed without actual captured output. The Minimax skill is the last line of defense against false-confidence reporting.

---

## 11. Red-Team Review

| Attack Question | Answer |
|---|---|
| Would this test fail if the implementation were broken? | |
| Does this test depend on order with other tests? | |
| Does this test mutate global state without cleanup? | |
| Does this test use a mock that diverges from production? | |
| Does this test rely on `Date.now()` / `Math.random()` without seeding? | |
| Does this test hit a real DB or only an in-memory mock? | |
| Is this test's failure message specific enough to diagnose without rerunning? | |
| Has this golden master been re-anchored in the last 6 months? | |
| Does this CI config have hidden skips or `continue-on-error`? | |
| Would removing this test reduce confidence? If not, it's decorative. | |

---

## 12. VAELRIX_LAW Tribunal

| Category | Verdict | Evidence |
|---|---|---|
| Test Quality (real vs decorative) | | |
| Coverage | | |
| Flake Rate | | |
| Golden Master Discipline | | |
| Visual Regression Discipline | | |
| Mock-Prod Alignment | | |
| CI Health | | |
| Merge Gate Effectiveness | | |
| Routing Discipline (handoff vs patch) | | |
| Final Grade | | |

Verdicts: Excellent / Good / Needs refinement / Risky / Blocked / Unknown.

---

## 13. Agent-Specific Rules

1. **Real bugs route to the responsible agent.** Minimax does not patch production code.
2. **Mutation-test mindset on every new test.** Decorative tests are blocked.
3. **Mocks must match production.** Integration tests against real DB / Redis / adapter required at boundaries.
4. **No flake tolerance on main.** Flaky tests are quarantined or fixed, never ignored.
5. **Golden masters require explicit anchors** for any rebaseline (PR / issue / commit message).
6. **Visual regression rebaselines require Claude's confirmation** that the change is intentional.
7. **Determinism is asserted explicitly** for every scoring / IR / prediction function.
8. **Never claim a command passed without captured output.**
9. **CI changes pass through the same merge gate as production code.**
10. **Coverage thresholds enforced** (90% core, 80% server, visual count for UI).
11. **No `--no-verify`, no `continue-on-error`** without explicit user authorization.
12. **TurboQuant gate (`verify_turboqa.js`) must pass on main** at all times.

---

## 14. Forbidden Behaviors

The skill must not:

- Patch production code in `src/`, `codex/`, `*.css`, `scripts/`
- Approve a decorative test (one that would pass even if the code were broken)
- Approve a flaky test on main
- Rebaseline a golden master or visual baseline without an explicit anchor
- Mock at a layer where integration testing is required (DB, Redis, adapters)
- Skip a test without an issue link
- Lower a coverage threshold without justification
- Disable a CI check without explicit user authorization
- Claim a command passed without captured output
- Invent flake rates, coverage numbers, or CI status
- Treat a real bug as a test fix (route it instead)
- Cross into Claude / Codex / Gemini lanes for production changes
- Use `--no-verify` or `--no-gpg-sign` to bypass hooks
- Approve a fixture that diverges from production shape
- Approve a mock that diverges from the real adapter

---

## 15. Example Output Skeleton

```markdown
# Test Debug Report — `verify_turboqa.js` Test 4 Passes Even With Reranker Bug

## 1. Symptom
After Codex's recent reranker change, `verify_turboqa.js` test 4 (Legality Violation) passes — but a manual VOID school playthrough surfaces an illegal candidate at position 3 of the top-5.

## 2. Classification
Decorative Test — the test passes but does not actually catch the bug class it claims to verify.

## 3. Reproduction Path
- Command: `node scripts/verify_turboqa.js`
- Result: all 4 tests PASS
- Manual playthrough: VOID school, seed 0xCAFEBABE, observed illegal candidate ranked #3

## 4. Failure Chain
Test 4 fixture has only 1 illegal candidate at position 4 of input → reranker bug only surfaces when illegal candidate similarity > legal candidate similarity → fixture lacks that case → test passes despite bug.

## 5. Root Cause
**Direct Evidence**: `verify_turboqa.js` line 90–96 fixture `illegalRerank` puts the illegal token at position 4 with similarity 0.75 — strictly less than all legal tokens. The reranker's missing legality multiplication never has a chance to misorder.

## 6. Evidence
- Direct: `verify_turboqa.js` fixture inspected, similarity scores compared
- Direct: manual playthrough captured (Codex provided)
- Repo Context: `turboquant_integration_bridge_pdr.md` §11 QA Req #2 — reranker must not promote illegal candidates *under any input*
- Inference: mutation-test mindset — broken reranker would still pass this fixture

## 7. Blast Radius
- All TurboQuant world-law gate verification
- False confidence in `verify_turboqa.js` until fixture is hardened

## 8. Routing
- Real bug → Codex (reranker missing legality multiplication)
- Test infrastructure bug → Minimax (fixture is decorative)

## 9. Fix Strategy
- Minimax: harden fixture to include illegal candidate with similarity > all legal candidates
- Codex (handoff): fix reranker per separate report `codex.debug.skill.md` example

## 10. Minimal Patch
[diff in scripts/verify_turboqa.js fixture — add test 5 with illegal high-similarity candidate]

## 11. Coverage Delta
TurboQuant world-law gate: covered cases go from 1 (illegal at low similarity) to 2 (illegal at low + high similarity). Effectively closes the gap that hid the Codex bug.

## 12. Flake Mitigation
N/A — deterministic.

## 13. Mutation Test Mindset
Old fixture: would pass even if reranker had no legality logic at all. **Decorative.**
New fixture: would fail if reranker dropped legality multiplication. **Real test.**

## 14. QA Checklist
- [x] Run new fixture against current reranker — confirm fails (verifies test catches bug)
- [ ] Run new fixture against fixed reranker (per Codex handoff) — confirm passes
- [x] Mutation-test mindset documented

## 15. Confidence Grade
A — fixture gap directly identified, test was decorative, hardened fixture has explicit mutation justification.

## 16. Remaining Unknowns
- Are there other decorative fixtures in the QA suite? (Audit `tests/qa/fixtures/` next)

## 17. Test DebugTraceIR
[json bytecode block]
```

---

*Skill author: minimax-test-debug-specialization*
*Source template: `docs/skills/vaelrix.law.debug.skill.md`*
*Date: 2026-04-26*
