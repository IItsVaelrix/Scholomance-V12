# BUG-2026-05-09-TEST-INFRASTRUCTURE-CRITIQUE

## Bytecode Search Code
`SCHOL-ENC-BYKE-INFRA-AUDIT-20260509`

## Bug Description
Infrastructure assessment reveals systemic test failures that block reliable CI/CD and indicate deeper architectural instability in the test harness itself.

**Summary:**
- **97 unit tests failing** / 1219 passing across 43 test files
- **6 QA feature tests failing** / 48 passing
- **2 lint errors** blocking clean build
- **1 uncaught exception** (Maximum call stack exceeded in accessibility tests)

---

## Layer Analysis

### Layer: TEST HARNESS — Infrastructure Instability

#### Issue 1: Cache Module — Missing Export
```
deleteFromCache is not a function
```
**File:** `tests/runtime/cache.test.js`
**Affected tests:** 3
**Root cause:** The export `deleteFromCache` exists in test imports but is not exported from the source `codex/runtime/cache.js`

#### Issue 2: Collab Database Schema Mismatch
```
datatype mismatch
```
**Files:** `tests/collab/messaging.test.js`, `tests/collab/alerts.test.js`
**Affected tests:** 14+
**Root cause:** Schema evolution drift — test expectations don't match current SQLite schema (likely `is_telepathic` removal)

#### Issue 3: Collab Pipeline Table Missing
```
no such table: collab_pipelines
```
**File:** `tests/collab/collab.service.test.js`
**Affected tests:** 4
**Root cause:** Migration not applied in test environment

#### Issue 4: ScrollEditor Truesight — Provider Context Missing
```
useScrolls must be used within ScrollsProvider
```
**Files:** `tests/pages/read-scroll-editor.truesight.test.jsx`, `tests/accessibility.test.jsx`
**Affected tests:** Multiple
**Root cause:** Test wrapper doesn't wrap components in required `ScrollsProvider`

#### Issue 5: Truesight Bytecode Assertions — Missing Nodes
```
nodes should exist: true, got: false
```
**File:** `tests/qa/features/truesight.qa.test.jsx`
**Affected tests:** 6
**Root cause:** Bytecode generation for rhyme clusters incomplete or not wired

#### Issue 6: Accessibility Test — Stack Overflow
```
Maximum call stack size exceeded
```
**File:** `tests/accessibility.test.jsx`
**Root cause:** Console.error spy is recursively calling itself through the mock setup

#### Issue 7: Lint Errors
```javascript
// scripts/production-polish.js:185:31
Unnecessary escape character: \-

// src/pages/PixelBrain/PixelBrainPage.jsx:473:108
Comments inside children section of tag should be placed inside braces
```

---

## The Weave Trace

```
Layer: TEST HARNESS
Origin: Multiple source files with schema/API drift
Propagation:
  collab schema → messaging.test.js, alerts.test.js (14 failures)
  pipeline migration → collab.service.test.js (4 failures)  
  cache API change → cache.test.js (3 failures)
  provider context → scroll truesight tests (5 failures)
  bytecode compiler → truesight.qa.test.jsx (6 failures)
  console spy recursion → accessibility.test.jsx (1 exception)
First visible manifestation: npm run test -- --run output
```

---

## Hypothetical Causes

### Cause A (Schema Drift — 80% confidence)
The collab database schema changed (likely `is_telepathic` field removed) but test fixtures weren't updated. The same pattern appears in:
- Cache API changes
- Pipeline table missing migration
- Bytecode output format changes

**Evidence:** Multiple `datatype mismatch` errors across collab tests
**Risk if confirmed:** Other schema-dependent features likely broken

### Cause B (Context Provider Pollution — 70% confidence)
Tests were written against older provider architecture. New providers (`ScrollsProvider`, `TruesightProvider`) added but test wrappers not updated.

**Evidence:** 5 tests failing with `useScrolls must be used within ScrollsProvider`
**Risk if confirmed:** All tests rendering full component trees need wrapper updates

### Cause C (Bytecode Compiler Incompleteness — 60% confidence)
The `viewportBytecode.ts` was recently stubbed. The stub may not implement full bytecode generation for rune/cluster nodes.

**Evidence:** 6 QA tests failing on bytecode node assertions
**Risk if confirmed:** Visual Truesight features broken for rhyme clusters

---

## The Failing Tests (Reproduction)

```javascript
// tests/runtime/cache.test.js — REGRESSION GUARD
describe('[Runtime] Cache', () => {
  it('deletes an entry when deleteFromCache is called', async () => {
    // CURRENTLY FAILS: deleteFromCache is not a function
    await deleteFromCache('key');
    expect(await getFromCache('key')).toBeNull();
  });
});

// tests/pages/read-scroll-editor.truesight.test.jsx — REGRESSION GUARD  
describe('ScrollEditor Truesight overlay', () => {
  it('renders one overlay row per document line, including blank lines', () => {
    // CURRENTLY FAILS: expected 1 to be 5
    // Root cause: missing ScrollsProvider wrapper
  });
});
```

---

## Escalation Matrix

| Issue | Owner | Action Required |
|-------|-------|-----------------|
| `deleteFromCache` missing | Codex | Export function or update test import |
| Collab schema mismatch | Codex | Run migrations, update fixtures |
| Pipeline table missing | Codex | Add migration for `collab_pipelines` |
| ScrollsProvider missing | Claude | Add provider wrapper to tests |
| Bytecode nodes missing | Codex | Complete `viewportBytecode.ts` stub |
| Console spy recursion | Blackbox | Fix spy setup in `tests/setup.js` |
| Lint errors | Claude | Fix escape char and JSX comment |

---

## PROS OF FIXING NOW
- Unblocks reliable CI/CD
- Prevents regression blindness
- Aligns test suite with current schema
- Enables meaningful coverage metrics

## CONS / RISKS OF FIXING NOW
- May reveal deeper architectural issues
- Could take significant time to fix all 97 tests
- Some tests may need complete rewrite

## ALTERNATIVE PATHS
1. **Quick Win:** Fix the 2 lint errors immediately (trivial)
2. **Quarantine:** Mark failing tests as `skip` until owners can fix
3. **Full Audit:** Comprehensive migration of all tests to new schema/provider architecture

---

## Infrastructure Assessment

### Strengths ✅
1. **Comprehensive test structure** — 157 test files across all layers
2. **CI/CD pipeline** — `.github/workflows/test.yml` with multi-tier audits
3. **Security audits** — Cell Wall, Nucleus Drift, Circuit Breaker scripts
4. **Visual regression** — Playwright with multi-browser support
5. **QA test framework** — Structured bytecode assertions with error codes
6. **Accessibility testing** — jest-axe integration
7. **Mock infrastructure** — Robust fetch/canvas/framer-motion mocks

### Weaknesses ❌
1. **Schema-test synchronization** — Database migrations not applied to test DB
2. **Provider context isolation** — Tests missing required React context wrappers
3. **Test data fragility** — Mock fixtures not updated with API changes
4. **Recursive spy bugs** — Console.error mocking causes stack overflow
5. **Missing vitest.config.ts** — Coverage config in vite.config.js only

### Opportunities 🔮
1. **Coverage enforcement** — CI could block merges below coverage thresholds
2. **Test ownership tags** — Could add `@owner:codex|gemini|claude` comments
3. **Flaky test detection** — Could track test stability over time
4. **Snapshot governance** — 2 snapshot failures indicate outdated baselines

---

## Recommendation

**MERGE STATUS: HOLD**

The test suite has 97 failures that need triage:
- **Critical (blocks CI):** Schema mismatch, missing tables, stack overflow
- **High (affects functionality):** Bytecode assertions, provider context
- **Medium (cosmetic):** Lint errors, snapshot drift

**Exact condition for merge:** All 97 failing tests must be classified as either:
1. Fixed (ownership assigned to appropriate agent)
2. Skipped with JIRA ticket reference
3. Known limitation documented in `TEST_KNOWN_ISSUES.md`

---

## PROGRESS UPDATE — 2026-05-09 (Session 1)

### Fixes Applied

| File Created | Test File Fixed | Status |
|--------------|-----------------|--------|
| `codex/services/adapters/index.js` | `tests/lib/adapters/index.test.js` | ✅ PASS |
| `src/codex/animation/bytecode/encodeMotionBytecode.js` | `tests/lib/animation-roundtrip.test.ts` | ✅ PASS |
| `src/codex/animation/presets/presetRegistry.js` | `tests/lib/animation-determinism.test.ts` | ✅ PASS |
| `src/codex/animation/bytecode-bridge/contracts/blueprint.types.js` | | scaffolding |
| `src/codex/animation/bytecode-bridge/parser/blueprintParser.js` | | scaffolding |
| `src/codex/animation/bytecode-bridge/validator/blueprintValidator.js` | | scaffolding |
| `src/codex/animation/bytecode-bridge/compiler/blueprintCompiler.js` | | scaffolding |
| `src/codex/animation/bytecode-bridge/qa/blueprintQA.js` | `tests/codex/animation/bytecode-bridge.test.ts` | ✅ PASS |

**Net result:** 4 fewer failed test files (43 → 39), 37 more passing tests (1219 → 1256)

---

*Entry Status: AUDIT IN PROGRESS | Auditor: Merlin Data | Last Updated: 2026-05-09*