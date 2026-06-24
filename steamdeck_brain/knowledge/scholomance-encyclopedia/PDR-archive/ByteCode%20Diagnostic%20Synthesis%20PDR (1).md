# ByteCode Diagnostic Synthesis PDR

**Filename:** `ByteCode Diagnostic Synthesis PDR.md`  
**Project:** Scholomance / Cleri-Raid / CODEx Diagnostic Core  
**Current Scholomance Version Target:** V13  
**Primary Integration Target:** `@codex/core/diagnostic/BytecodeHealth.js`  
**PDR Version:** 1.0  
**Date:** 2026-05-24  
**Authoring Mode:** Surgical architecture expansion  
**Status:** Draft for implementation review  

---

## 0. Executive Summary

Cleri-Raid currently functions as a diagnostic, predictive, and proof-oriented system inside Scholomance. This PDR specifies the next layer: **ByteCode Diagnostic Synthesis**, a compositional diagnostic framework that uses stoichiometric multi-protein complex mathematics as a model for bytecode system health.

The core idea:

> A diagnostic system should not merely ask which signal failed.  
> It should ask which missing, excessive, or unstable signal prevented the whole diagnostic complex from assembling.

This turns `BytecodeHealth.js` from a flat health/reporting utility into the primitive measurement substrate for a higher-order diagnostic "MIND" layer.

The new system will introduce:

1. **Stoichiometric diagnostic complexes**
2. **Normalized diagnostic subunit ratios**
3. **Limiting-subunit detection**
4. **Excess/noise detection**
5. **Repair vectors**
6. **Raid-level mind state**
7. **QBIT-compatible coherence outputs**
8. **Deterministic QA proofs**
9. **Shadow-mode rollout before enforcement**

The result is a faster debugging system where Cleri-Raid can identify not just what failed, but why the failure matters inside the architecture.

---

## 1. Change Classification

| Category | Classification |
|---|---|
| Change Type | Architectural + Behavioral |
| Primary Risk | Medium |
| Leverage | High |
| Intended Effect | Make Cleri-Raid infer system imbalance from BytecodeHealth signals |
| Scope | Additive first, then optional BytecodeHealth adapter patch |
| Migration Style | Shadow-mode, no hard enforcement at first |
| Regression Risk | Existing diagnostics may be misread if signal normalization is wrong |
| Risk Reduced | Debugging time, signal noise, root-cause ambiguity, architecture drift |

---

## 2. Core Assumptions

This PDR assumes:

1. `@codex/core/diagnostic/BytecodeHealth.js` exists and already produces bytecode health artifacts, signals, packets, status objects, checksums, or similar structured diagnostics.
2. Scholomance uses deterministic diagnostic expectations and prefers fail-closed schemas where possible.
3. Cleri-Raid Phase 5 already points toward predictive diagnostics, zero-shot abstract symptoms, and topology-driven reasoning.
4. QBIT owns coherence, while CI/test suites own hard invariants.
5. The first implementation should not break existing BytecodeHealth consumers.
6. Cleri-Raid should run this system in **shadow mode** before it becomes a blocking gate.
7. All scores should become deterministic `0..1` health values before stoichiometric math consumes them.
8. This system is not a biology simulator. Biology is the mathematical metaphor, not the implementation domain.

---

## 3. Spec Sheet

### 3.1 System Name

**ByteCode Diagnostic Synthesis**

### 3.2 Purpose

Create a compositional diagnostic system that synthesizes BytecodeHealth outputs into higher-order raid intelligence.

### 3.3 Core Mechanic

BytecodeHealth emits raw or semi-structured diagnostic signals.

StoichComplexHealth normalizes those signals into subunits.

CleriRaidMind evaluates complexes.

QBIT receives coherence-compatible summaries.

CI verifies deterministic invariants.

### 3.4 Target File Additions

```txt
codex/core/diagnostic/
  BytecodeHealth.js          ← existing (optional bridge patch only)
  StoichComplexHealth.js     ← new
  CleriRaidMind.js           ← new
  CleriRaidComplexRegistry.js ← new
  BytecodeHealthAdapter.js   ← new
```

### 3.5 Target Test Additions

```txt
tests/diagnostic/
  stoichComplexHealth.test.js
  cleriRaidMind.test.js
  bytecodeHealthAdapter.test.js
  bytecodeDiagnosticSynthesis.integration.test.js
  bytecodeDiagnosticSynthesis.golden.test.js
```

### 3.6 Optional Proof Artifact Additions

```txt
docs/proofs/
  RAID_PHASE_5_BYTECODE_DIAGNOSTIC_SYNTHESIS_PROOF.md

scripts/
  prove_bytecode_diagnostic_synthesis.js
```

### 3.7 Input Contract

The synthesis layer expects diagnostic snapshots shaped like this:

```js
{
  "AUTH_SENDER_MATCH": {
    score: 0.2,
    status: "critical",
    bytecode: "PB-ERR-v1-STATE-AUTH_SENDER_MISMATCH",
    checksum: "..."
  },
  "SESSION_CONTINUITY": {
    score: 0.8,
    status: "stable"
  }
}
```

Minimum accepted form:

```js
{
  "AUTH_SENDER_MATCH": 0.2,
  "SESSION_CONTINUITY": 0.8
}
```

### 3.8 Output Contract

The synthesis layer returns:

```js
{
  raidId: "CLERI_RAID_MAIN",
  mindState: "fractured",
  globalHealth: 0.62,
  complexes: [],
  primaryFaults: [],
  nextDebugActions: [],
  qbitPayload: {}
}
```

### 3.9 Determinism Requirements

| Requirement | Rule |
|---|---|
| Randomness | Forbidden |
| Date dependency | Forbidden inside scoring |
| Object key ordering | Canonicalize before hashing |
| Floating point | Round final outward-facing scores |
| Snapshot mutation | Forbidden |
| Side effects | Forbidden in evaluators |
| Logging | Optional and external only |
| Repair vectors | Deterministic sort order |

### 3.10 Runtime Mode

The first rollout must run in **shadow mode**:

```txt
BytecodeHealth runs normally.
Diagnostic synthesis reads its output.
Synthesis emits mind state and repair vector.
Nothing blocks CI or runtime yet.
QA compares expected outputs.
Only after proof stability should gates be enabled.
```

---

## 4. Conceptual Model

### 4.1 Biology Model

Stoichiometric multi-protein complexes depend on the correct ratio of multiple subunits. A complex can fail because one subunit is missing, because another is overabundant, or because the assembly is unstable.

### 4.2 Scholomance Translation

| Biology Term | ByteCode Diagnostic Term |
|---|---|
| Protein subunit | Diagnostic signal |
| Protein complex | Diagnostic domain |
| Stoichiometric ratio | Expected signal ratio |
| Limiting subunit | Weakest required diagnostic signal |
| Excess subunit | Overactive/noisy signal |
| Misfolded protein | Invalid state shape |
| Aggregation | Error cascade or log storm |
| Complex assembly | System coherence |
| Cell stress | Runtime instability |
| Repair pathway | Debug action vector |

### 4.3 Primary Formula

```txt
H_complex = 1 - weightedDeviation / totalWeight
```

Expanded:

```txt
weightedDeviation = sum(weight_i * abs(observed_i - expected_i))
totalWeight = sum(weight_i)
```

Where:

```txt
expected_i = normalized expected ratio for subunit i
observed_i = normalized observed ratio for subunit i
weight_i = diagnostic importance weight
```

### 4.4 Classification States

| State | Meaning |
|---|---|
| `stable` | Signal is within expected ratio |
| `limiting` | Signal exists but is too weak |
| `missing` | Required signal is absent |
| `excess` | Signal is too strong/noisy |
| `unstable` | Signal deviates but not enough to classify as missing or excess |
| `critical` | Complex health is too low or a required signal is missing |

---

## 5. Proposed Architecture

### 5.1 Layer Diagram

```txt
BytecodeHealth.js
  ↓
BytecodeHealthAdapter.js
  ↓
StoichComplexHealth.js
  ↓
CleriRaidComplexRegistry.js
  ↓
CleriRaidMind.js
  ↓
QBIT / QA / Logs / UI / Proof Artifacts
```

### 5.2 Responsibility Boundaries

| Module | Responsibility | Must Not Do |
|---|---|---|
| `BytecodeHealth.js` | Existing diagnostic primitive | Know raid mind logic |
| `BytecodeHealthAdapter.js` | Normalize old/new signal formats | Invent health semantics |
| `StoichComplexHealth.js` | Math for complex assembly | Touch runtime state |
| `CleriRaidComplexRegistry.js` | Declare complexes and expected ratios | Execute diagnostics |
| `CleriRaidMind.js` | Build raid-level mind state | Mutate BytecodeHealth |
| QBIT Bridge | Consume coherence payloads | Own CI invariants |

### 5.3 Why This Separation Matters

This protects `BytecodeHealth.js` from becoming a giant tangled oracle. The upgrade should add a diagnostic brain around it, not stuff an entire nervous system into the original file.

---

## 6. Step-by-Step Implementation

---

### Step 1: Inspect `BytecodeHealth.js`

**Goal:** Identify how current diagnostics are emitted.

Look for:

```txt
exports
status builders
checksum builders
bytecode packet builders
health score fields
error code fields
snapshot functions
logging functions
```

Expected useful shapes may include:

```js
{
  bytecode,
  checksum,
  status,
  code,
  level,
  score,
  ok
}
```

If no snapshot function exists, create an adapter that accepts individual diagnostic results.

---

### Step 2: Create `StoichComplexHealth.js`

**File:**

```txt
codex/core/diagnostic/StoichComplexHealth.js
```

**Code Example:**

```js
const EPSILON = 1e-9;
const SCORE_PRECISION = 6;

export function normalizeStoichVector(vector = {}) {
  const entries = Object.entries(vector).map(([key, value]) => [
    key,
    Math.max(0, Number(value) || 0)
  ]);

  const total = entries.reduce((sum, [, value]) => sum + value, 0);

  if (total <= EPSILON) {
    return Object.fromEntries(entries.map(([key]) => [key, 0]));
  }

  return Object.fromEntries(
    entries.map(([key, value]) => [key, roundScore(value / total)])
  );
}

export function evaluateStoichComplex({
  complexId,
  expected = {},
  observed = {},
  weights = {},
  thresholds = {}
}) {
  const expectedNorm = normalizeStoichVector(expected);
  const observedNorm = normalizeStoichVector(observed);

  const subunitIds = Array.from(
    new Set([...Object.keys(expectedNorm), ...Object.keys(observedNorm)])
  ).sort();

  const subunits = subunitIds.map((subunitId) => {
    const target = expectedNorm[subunitId] ?? 0;
    const actual = observedNorm[subunitId] ?? 0;
    const weight = Number(weights[subunitId] ?? 1);
    const deviation = Math.abs(actual - target);
    const ratio = target <= EPSILON ? null : actual / target;

    return {
      subunitId,
      target,
      actual,
      ratio: ratio === null ? null : roundScore(ratio),
      weight,
      deviation: roundScore(deviation),
      state: classifySubunit({
        target,
        actual,
        ratio,
        deviation,
        thresholds
      })
    };
  });

  const weightedDeviation = subunits.reduce(
    (sum, unit) => sum + unit.deviation * unit.weight,
    0
  );

  const totalWeight = subunits.reduce((sum, unit) => sum + unit.weight, 0);

  const health =
    totalWeight <= EPSILON
      ? 1
      : Math.max(0, 1 - weightedDeviation / totalWeight);

  const normalizedHealth = roundScore(health);

  const limiting = subunits
    .filter((unit) => unit.state === "missing" || unit.state === "limiting")
    .sort(sortBySeverity);

  const excess = subunits
    .filter((unit) => unit.state === "excess")
    .sort(sortBySeverity);

  return {
    complexId,
    health: normalizedHealth,
    status: classifyComplexStatus(normalizedHealth, limiting, excess),
    limiting,
    excess,
    subunits,
    repairVector: buildRepairVector(subunits)
  };
}

function classifySubunit({ target, actual, ratio, deviation, thresholds }) {
  const limitingRatio = thresholds.limitingRatio ?? 0.65;
  const excessRatio = thresholds.excessRatio ?? 1.45;
  const deviationLimit = thresholds.deviation ?? 0.18;

  if (target > 0 && actual <= EPSILON) return "missing";
  if (ratio !== null && ratio < limitingRatio) return "limiting";
  if (ratio !== null && ratio > excessRatio) return "excess";
  if (deviation > deviationLimit) return "unstable";
  return "stable";
}

function classifyComplexStatus(health, limiting, excess) {
  if (limiting.some((unit) => unit.state === "missing")) return "critical";
  if (health < 0.55) return "critical";
  if (health < 0.78) return "unstable";
  if (excess.length > 0) return "noisy";
  return "stable";
}

function buildRepairVector(subunits) {
  return subunits
    .filter((unit) => unit.state !== "stable")
    .sort(sortBySeverity)
    .map((unit) => ({
      subunitId: unit.subunitId,
      action: actionForState(unit.state),
      delta: roundScore(unit.target - unit.actual),
      reason: unit.state
    }));
}

function actionForState(state) {
  switch (state) {
    case "missing":
      return "restore_signal";
    case "limiting":
      return "increase_coverage";
    case "excess":
      return "reduce_noise";
    case "unstable":
      return "inspect_shape";
    default:
      return "observe";
  }
}

function sortBySeverity(a, b) {
  if (b.deviation !== a.deviation) return b.deviation - a.deviation;
  return a.subunitId.localeCompare(b.subunitId);
}

function roundScore(value) {
  return Number(Number(value).toFixed(SCORE_PRECISION));
}
```

**Risk Reduced:** Creates deterministic math in isolation before touching the existing diagnostic file.

---

### Step 3: Create `BytecodeHealthAdapter.js`

**File:**

```txt
codex/core/diagnostic/BytecodeHealthAdapter.js
```

**Purpose:** Convert existing BytecodeHealth outputs into normalized `0..1` signal scores.

**Code Example:**

```js
export function normalizeBytecodeHealthSnapshot(snapshot = {}) {
  if (!snapshot || typeof snapshot !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(snapshot)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([signalKey, rawSignal]) => [
        signalKey,
        normalizeSignal(rawSignal)
      ])
  );
}

export function normalizeSignal(rawSignal) {
  if (typeof rawSignal === "number") {
    return clamp01(rawSignal);
  }

  if (typeof rawSignal === "boolean") {
    return rawSignal ? 1 : 0;
  }

  if (!rawSignal || typeof rawSignal !== "object") {
    return 0;
  }

  if (typeof rawSignal.score === "number") {
    return clamp01(rawSignal.score);
  }

  if (typeof rawSignal.health === "number") {
    return clamp01(rawSignal.health);
  }

  if (typeof rawSignal.ok === "boolean") {
    return rawSignal.ok ? 1 : 0;
  }

  if (typeof rawSignal.status === "string") {
    return statusToScore(rawSignal.status);
  }

  return 0;
}

function statusToScore(status) {
  switch (status) {
    case "ok":
    case "pass":
    case "stable":
    case "healthy":
      return 1;
    case "warn":
    case "warning":
    case "unstable":
      return 0.65;
    case "critical":
    case "error":
    case "fail":
      return 0.15;
    case "missing":
      return 0;
    default:
      return 0.5;
  }
}

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}
```

**Important:** This adapter must not decide system meaning. It only normalizes shape.

---

### Step 4: Create `CleriRaidComplexRegistry.js`

**File:**

```txt
codex/core/diagnostic/CleriRaidComplexRegistry.js
```

**Purpose:** Declare named diagnostic complexes.

**Code Example:**

```js
export const CLERI_RAID_COMPLEXES = [
  {
    id: "AUTH_HANDSHAKE_COMPLEX",
    expected: {
      authSender: 2,
      identityProof: 2,
      sessionContinuity: 1,
      csrfBoundary: 1
    },
    weights: {
      authSender: 1.4,
      identityProof: 1.4,
      sessionContinuity: 1.1,
      csrfBoundary: 1.2
    },
    subunits: [
      {
        id: "authSender",
        signalKey: "AUTH_SENDER_MATCH"
      },
      {
        id: "identityProof",
        signalKey: "IDENTITY_PROOF_VALID"
      },
      {
        id: "sessionContinuity",
        signalKey: "SESSION_CONTINUITY"
      },
      {
        id: "csrfBoundary",
        signalKey: "CSRF_BOUNDARY_HEALTH"
      }
    ],
    thresholds: {
      limitingRatio: 0.65,
      excessRatio: 1.45,
      deviation: 0.18
    }
  },

  {
    id: "BYTECODE_INTEGRITY_COMPLEX",
    expected: {
      decodability: 2,
      checksum: 2,
      schema: 2,
      provenance: 1
    },
    weights: {
      decodability: 1.5,
      checksum: 1.4,
      schema: 1.4,
      provenance: 1.0
    },
    subunits: [
      {
        id: "decodability",
        signalKey: "BYTECODE_DECODABLE"
      },
      {
        id: "checksum",
        signalKey: "BYTECODE_CHECKSUM_VALID"
      },
      {
        id: "schema",
        signalKey: "BYTECODE_SCHEMA_VALID"
      },
      {
        id: "provenance",
        signalKey: "BYTECODE_PROVENANCE_VALID"
      }
    ]
  },

  {
    id: "UI_STATE_COHERENCE_COMPLEX",
    expected: {
      routeState: 1,
      viewState: 1,
      cursorState: 1,
      overlayState: 1
    },
    weights: {
      routeState: 1.0,
      viewState: 1.0,
      cursorState: 1.2,
      overlayState: 1.1
    },
    subunits: [
      {
        id: "routeState",
        signalKey: "ROUTE_STATE_HEALTH"
      },
      {
        id: "viewState",
        signalKey: "VIEW_STATE_HEALTH"
      },
      {
        id: "cursorState",
        signalKey: "CURSOR_STATE_HEALTH"
      },
      {
        id: "overlayState",
        signalKey: "OVERLAY_STATE_HEALTH"
      }
    ]
  }
];
```

**Risk Reduced:** Ratios live in a config registry, not scattered across runtime code.

---

### Step 5: Create `CleriRaidMind.js`

**File:**

```txt
codex/core/diagnostic/CleriRaidMind.js
```

**Purpose:** Convert normalized BytecodeHealth signals into raid-level intelligence.

**Code Example:**

```js
import { normalizeBytecodeHealthSnapshot } from "./BytecodeHealthAdapter.js";
import { evaluateStoichComplex } from "./StoichComplexHealth.js";
import { CLERI_RAID_COMPLEXES } from "./CleriRaidComplexRegistry.js";

export function evaluateCleriRaidMind({
  raidId = "CLERI_RAID_MAIN",
  bytecodeHealthSnapshot = {},
  complexes = CLERI_RAID_COMPLEXES
} = {}) {
  const normalizedSnapshot =
    normalizeBytecodeHealthSnapshot(bytecodeHealthSnapshot);

  const evaluatedComplexes = complexes.map((complex) => {
    const observed = collectObservedSubunits({
      subunits: complex.subunits,
      normalizedSnapshot
    });

    return evaluateStoichComplex({
      complexId: complex.id,
      expected: complex.expected,
      observed,
      weights: complex.weights,
      thresholds: complex.thresholds
    });
  });

  const globalHealth = roundScore(averageHealth(evaluatedComplexes));

  return {
    raidId,
    mindState: classifyMindState(globalHealth, evaluatedComplexes),
    globalHealth,
    complexes: evaluatedComplexes,
    primaryFaults: extractPrimaryFaults(evaluatedComplexes),
    nextDebugActions: extractNextDebugActions(evaluatedComplexes),
    qbitPayload: buildQbitPayload({
      raidId,
      globalHealth,
      evaluatedComplexes
    })
  };
}

function collectObservedSubunits({ subunits = [], normalizedSnapshot = {} }) {
  const observed = {};

  for (const subunit of subunits) {
    observed[subunit.id] = normalizedSnapshot[subunit.signalKey] ?? 0;
  }

  return observed;
}

function averageHealth(complexes) {
  if (!complexes.length) return 1;
  return (
    complexes.reduce((sum, complex) => sum + complex.health, 0) /
    complexes.length
  );
}

function classifyMindState(globalHealth, complexes) {
  const hasCritical = complexes.some(
    (complex) => complex.status === "critical"
  );

  if (hasCritical) return "fractured";
  if (globalHealth < 0.78) return "agitated";

  const hasNoise = complexes.some(
    (complex) => complex.status === "noisy"
  );

  if (hasNoise) return "overstimulated";

  return "coherent";
}

function extractPrimaryFaults(complexes) {
  return complexes
    .flatMap((complex) =>
      complex.limiting.slice(0, 2).map((unit) => ({
        complexId: complex.complexId,
        subunitId: unit.subunitId,
        state: unit.state,
        severity: unit.deviation
      }))
    )
    .sort((a, b) => {
      if (b.severity !== a.severity) return b.severity - a.severity;
      return `${a.complexId}:${a.subunitId}`.localeCompare(
        `${b.complexId}:${b.subunitId}`
      );
    });
}

function extractNextDebugActions(complexes) {
  return complexes
    .flatMap((complex) =>
      complex.repairVector.slice(0, 3).map((repair) => ({
        complexId: complex.complexId,
        ...repair
      }))
    )
    .sort((a, b) => {
      if (Math.abs(b.delta) !== Math.abs(a.delta)) {
        return Math.abs(b.delta) - Math.abs(a.delta);
      }
      return `${a.complexId}:${a.subunitId}`.localeCompare(
        `${b.complexId}:${b.subunitId}`
      );
    });
}

function buildQbitPayload({ raidId, globalHealth, evaluatedComplexes }) {
  return {
    qbitType: "BYTECODE_DIAGNOSTIC_SYNTHESIS",
    raidId,
    collapseConfidence: globalHealth,
    complexCount: evaluatedComplexes.length,
    unstableComplexes: evaluatedComplexes
      .filter((complex) => complex.status !== "stable")
      .map((complex) => complex.complexId)
      .sort()
  };
}

function roundScore(value) {
  return Number(Number(value).toFixed(6));
}
```

---

### Step 6: Add Optional BytecodeHealth Bridge

This should be the only modification to `BytecodeHealth.js` during Phase 1.

**Preferred minimal patch:**

```js
export function buildDiagnosticSynthesisSnapshot(rawHealthState) {
  return rawHealthState;
}
```

If `BytecodeHealth.js` already has a snapshot/export function, do not add a duplicate. Use the existing function.

**Integration Example:**

```js
import { evaluateCleriRaidMind } from "./CleriRaidMind.js";
import { snapshotBytecodeHealth } from "./BytecodeHealth.js";

export function runCleriRaidDiagnosticSynthesis() {
  const snapshot = snapshotBytecodeHealth();

  return evaluateCleriRaidMind({
    raidId: "CLERI_RAID_MAIN",
    bytecodeHealthSnapshot: snapshot
  });
}
```

**Risk Reduced:** Existing BytecodeHealth behavior remains untouched.

---

### Step 7: Add Shadow-Mode Runtime Hook

**Goal:** Run synthesis without enforcing it.

```js
export function maybeRunDiagnosticSynthesis({
  enabled = false,
  mode = "shadow",
  snapshot
}) {
  if (!enabled) return null;

  const mind = evaluateCleriRaidMind({
    raidId: "CLERI_RAID_MAIN",
    bytecodeHealthSnapshot: snapshot
  });

  if (mode === "shadow") {
    return {
      enforced: false,
      mind
    };
  }

  if (mode === "warn") {
    return {
      enforced: false,
      warning:
        mind.mindState === "coherent"
          ? null
          : "CLERI_RAID_MIND_NOT_COHERENT",
      mind
    };
  }

  if (mode === "gate") {
    return {
      enforced: true,
      pass: mind.mindState === "coherent",
      mind
    };
  }

  return {
    enforced: false,
    mind
  };
}
```

Recommended feature flag:

```txt
CLERI_RAID_SYNTHESIS_MODE=shadow
```

Allowed values:

```txt
off
shadow
warn
gate
```

---

## 7. Glossary

### BytecodeHealth

The existing diagnostic primitive layer. It produces bytecode health signals, statuses, checksums, packets, or state reports.

### ByteCode Diagnostic Synthesis

The new higher-order system that turns BytecodeHealth signals into compositional diagnostics.

### Cleri-Raid

The predictive diagnostic framework inside Scholomance. It detects architecture failure, state drift, bytecode anomalies, and system incoherence.

### CleriRaidMind

The orchestration module that evaluates diagnostic complexes and returns raid-level intelligence.

### Diagnostic Subunit

A single signal consumed by a diagnostic complex. Example: `AUTH_SENDER_MATCH`.

### Diagnostic Complex

A named group of related diagnostic subunits. Example: `AUTH_HANDSHAKE_COMPLEX`.

### Stoichiometric Ratio

The expected proportional contribution of a diagnostic subunit inside a complex.

### Observed Ratio

The actual normalized strength of a diagnostic subunit in the current BytecodeHealth snapshot.

### Expected Ratio

The normalized target weight of a diagnostic subunit.

### Limiting Subunit

A required subunit that exists but is too weak relative to the expected ratio.

### Missing Subunit

A required subunit with no observed signal.

### Excess Subunit

A signal that is too strong relative to the expected ratio, often indicating noise, repeated errors, or diagnostic spam.

### Unstable Subunit

A signal that deviates significantly but does not qualify as missing, limiting, or excessive.

### Complex Health

A `0..1` score representing how well the diagnostic complex assembled.

### Global Health

The average health of all evaluated diagnostic complexes.

### Mind State

The raid-level condition inferred from all complexes.

Allowed states:

```txt
coherent
overstimulated
agitated
fractured
```

### Repair Vector

A deterministic list of recommended debugging actions.

### QBIT Payload

A compact coherence object that can be consumed by QBIT, proof docs, UI, or CI.

### Shadow Mode

The first rollout mode. The system observes and reports but does not block or enforce.

### Warn Mode

The second rollout mode. The system emits warnings but does not fail builds.

### Gate Mode

The final rollout mode. The system can block CI or runtime progression if mind coherence fails.

### Golden Test

A deterministic test that compares the exact output of a known input against a saved expected output.

### Coherence

The degree to which diagnostic signals agree with each other and with expected architecture structure.

---

## 8. Q&A: Top 10 Confusing Implementation Concerns

---

### Q1. Should the stoichiometric math go directly inside `BytecodeHealth.js`?

**Answer:** No.

`BytecodeHealth.js` should remain the primitive diagnostic measurement layer. Put stoichiometric logic in `StoichComplexHealth.js`.

**Solve:**

```txt
BytecodeHealth.js emits signals.
StoichComplexHealth.js evaluates ratios.
CleriRaidMind.js interprets system state.
```

This avoids turning the primitive health file into a monolith.

---

### Q2. What if BytecodeHealth signals are not already `0..1` scores?

**Answer:** Use `BytecodeHealthAdapter.js`.

**Solve:**

```js
normalizeSignal({ status: "stable" }) // 1
normalizeSignal({ status: "critical" }) // 0.15
normalizeSignal(true) // 1
normalizeSignal(false) // 0
normalizeSignal(0.72) // 0.72
```

The adapter creates a stable input format without forcing a rewrite of current diagnostics.

---

### Q3. What if a complex has all observed values as zero?

**Answer:** It should not crash or divide by zero.

**Solve:**

```js
if (total <= EPSILON) {
  return Object.fromEntries(entries.map(([key]) => [key, 0]));
}
```

The result will classify required subunits as missing.

---

### Q4. How do we prevent noisy diagnostics from looking important?

**Answer:** Detect excess subunits.

If a signal is far above its expected ratio, classify it as `excess`.

**Solve:**

```js
if (ratio !== null && ratio > excessRatio) return "excess";
```

Then repair action becomes:

```txt
reduce_noise
```

Not:

```txt
chase_the_loudest_error
```

---

### Q5. How does this integrate with QBIT?

**Answer:** QBIT should receive a compact coherence payload, not own the raw scoring logic.

**Solve:**

```js
{
  qbitType: "BYTECODE_DIAGNOSTIC_SYNTHESIS",
  collapseConfidence: globalHealth,
  unstableComplexes: ["AUTH_HANDSHAKE_COMPLEX"]
}
```

QBIT owns coherence interpretation. CI owns hard invariant enforcement.

---

### Q6. How do we avoid false confidence from averaged health?

**Answer:** A missing required subunit must override the average.

**Solve:**

```js
if (limiting.some((unit) => unit.state === "missing")) return "critical";
```

This prevents one catastrophic missing signal from being hidden by several stable signals.

---

### Q7. What should happen if an unknown signal appears?

**Answer:** Ignore it unless it is mapped into a complex.

**Solve:**

Only registry-declared subunits are consumed:

```js
observed[subunit.id] = normalizedSnapshot[subunit.signalKey] ?? 0;
```

This prevents random new signals from changing synthesis behavior.

---

### Q8. What if a signal belongs to multiple complexes?

**Answer:** That is allowed if intentional.

Example:

```txt
BYTECODE_SCHEMA_VALID
```

could appear in both:

```txt
BYTECODE_INTEGRITY_COMPLEX
QBIT_COHERENCE_COMPLEX
```

**Solve:** Registry ownership makes overlap explicit.

---

### Q9. When should this become a CI gate?

**Answer:** Only after golden tests pass and shadow-mode output is stable.

Recommended promotion ladder:

```txt
off → shadow → warn → gate
```

Gate mode should not be enabled until:

1. Unit tests pass.
2. Integration tests pass.
3. Golden output is stable.
4. No major false positives are observed.
5. Repair vectors are useful in real debugging.

---

### Q10. How do we keep repair vectors from becoming vague?

**Answer:** Keep action verbs finite and mapped to states.

Allowed actions:

```txt
restore_signal
increase_coverage
reduce_noise
inspect_shape
observe
```

Each repair vector item must include:

```js
{
  complexId,
  subunitId,
  action,
  delta,
  reason
}
```

No poetic fog in the machine room. The gargoyles can watch, but they do not get commit access.

---

## 9. QA Section

---

## 9.1 QA Philosophy

This system must be tested as deterministic math first, integration second, and runtime behavior third.

QA must prove:

1. Normalization is stable.
2. Subunit classification is correct.
3. Complex health is deterministic.
4. Mind state classification is correct.
5. Repair vectors sort predictably.
6. QBIT payloads are stable.
7. Shadow mode does not mutate existing BytecodeHealth behavior.
8. Gate mode only fails when configured to fail.
9. Unknown signals do not affect output.
10. Golden outputs remain byte-for-byte stable unless intentionally updated.

---

## 9.2 QA File 1: `stoichComplexHealth.test.js`

**Goal:** Verify pure math.

**Create file:**

```txt
tests/diagnostic/stoichComplexHealth.test.js
```

**Code Example:**

```js
import { describe, expect, it } from "vitest";
import {
  normalizeStoichVector,
  evaluateStoichComplex
} from "../../codex/core/diagnostic/StoichComplexHealth.js";

describe("StoichComplexHealth", () => {
  it("normalizes vectors into proportional ratios", () => {
    expect(normalizeStoichVector({ a: 2, b: 2 })).toEqual({
      a: 0.5,
      b: 0.5
    });
  });

  it("handles zero-total vectors without division errors", () => {
    expect(normalizeStoichVector({ a: 0, b: 0 })).toEqual({
      a: 0,
      b: 0
    });
  });

  it("classifies missing required subunits as critical", () => {
    const result = evaluateStoichComplex({
      complexId: "TEST_COMPLEX",
      expected: { a: 1, b: 1 },
      observed: { a: 1, b: 0 }
    });

    expect(result.status).toBe("critical");
    expect(result.limiting[0].subunitId).toBe("b");
    expect(result.limiting[0].state).toBe("missing");
  });

  it("detects excess signal as noisy", () => {
    const result = evaluateStoichComplex({
      complexId: "TEST_COMPLEX",
      expected: { a: 1, b: 1 },
      observed: { a: 9, b: 1 },
      thresholds: { excessRatio: 1.45 }
    });

    expect(result.excess.some((unit) => unit.subunitId === "a")).toBe(true);
  });

  it("returns repair vectors sorted by deviation severity", () => {
    const result = evaluateStoichComplex({
      complexId: "TEST_COMPLEX",
      expected: { a: 1, b: 1, c: 1 },
      observed: { a: 0, b: 0.2, c: 1 }
    });

    // c is excess (dev=0.5), a is missing (dev=0.333), b is limiting (dev=0.167)
    expect(result.repairVector.map((item) => item.subunitId)).toEqual([
      "c",
      "a",
      "b"
    ]);
  });
});
```

**Run:**

```bash
pnpm vitest tests/diagnostic/stoichComplexHealth.test.js
```

---

## 9.3 QA File 2: `bytecodeHealthAdapter.test.js`

**Goal:** Verify raw signal normalization.

**Create file:**

```txt
tests/diagnostic/bytecodeHealthAdapter.test.js
```

**Code Example:**

```js
import { describe, expect, it } from "vitest";
import {
  normalizeSignal,
  normalizeBytecodeHealthSnapshot
} from "../../codex/core/diagnostic/BytecodeHealthAdapter.js";

describe("BytecodeHealthAdapter", () => {
  it("normalizes numeric signals", () => {
    expect(normalizeSignal(0.75)).toBe(0.75);
  });

  it("clamps numeric signals", () => {
    expect(normalizeSignal(2)).toBe(1);
    expect(normalizeSignal(-2)).toBe(0);
  });

  it("normalizes boolean signals", () => {
    expect(normalizeSignal(true)).toBe(1);
    expect(normalizeSignal(false)).toBe(0);
  });

  it("normalizes score objects", () => {
    expect(normalizeSignal({ score: 0.4 })).toBe(0.4);
  });

  it("normalizes status objects", () => {
    expect(normalizeSignal({ status: "stable" })).toBe(1);
    expect(normalizeSignal({ status: "critical" })).toBe(0.15);
  });

  it("returns canonical key order", () => {
    const result = normalizeBytecodeHealthSnapshot({
      Z_SIGNAL: 1,
      A_SIGNAL: 0.5
    });

    expect(Object.keys(result)).toEqual(["A_SIGNAL", "Z_SIGNAL"]);
  });
});
```

**Run:**

```bash
pnpm vitest tests/diagnostic/bytecodeHealthAdapter.test.js
```

---

## 9.4 QA File 3: `cleriRaidMind.test.js`

**Goal:** Verify raid-level state classification.

**Create file:**

```txt
tests/diagnostic/cleriRaidMind.test.js
```

**Code Example:**

```js
import { describe, expect, it } from "vitest";
import { evaluateCleriRaidMind } from "../../codex/core/diagnostic/CleriRaidMind.js";

const TEST_COMPLEXES = [
  {
    id: "TEST_COMPLEX",
    expected: {
      a: 1,
      b: 1
    },
    subunits: [
      { id: "a", signalKey: "A_SIGNAL" },
      { id: "b", signalKey: "B_SIGNAL" }
    ]
  }
];

describe("CleriRaidMind", () => {
  it("returns coherent when all complexes are stable", () => {
    const result = evaluateCleriRaidMind({
      raidId: "TEST_RAID",
      complexes: TEST_COMPLEXES,
      bytecodeHealthSnapshot: {
        A_SIGNAL: 1,
        B_SIGNAL: 1
      }
    });

    expect(result.mindState).toBe("coherent");
    expect(result.primaryFaults).toEqual([]);
  });

  it("returns fractured when a required signal is missing", () => {
    const result = evaluateCleriRaidMind({
      raidId: "TEST_RAID",
      complexes: TEST_COMPLEXES,
      bytecodeHealthSnapshot: {
        A_SIGNAL: 1
      }
    });

    expect(result.mindState).toBe("fractured");
    expect(result.primaryFaults[0].subunitId).toBe("b");
  });

  it("builds a QBIT-compatible payload", () => {
    const result = evaluateCleriRaidMind({
      raidId: "TEST_RAID",
      complexes: TEST_COMPLEXES,
      bytecodeHealthSnapshot: {
        A_SIGNAL: 1,
        B_SIGNAL: 1
      }
    });

    expect(result.qbitPayload.qbitType).toBe(
      "BYTECODE_DIAGNOSTIC_SYNTHESIS"
    );
    expect(result.qbitPayload.raidId).toBe("TEST_RAID");
    expect(typeof result.qbitPayload.collapseConfidence).toBe("number");
  });
});
```

**Run:**

```bash
pnpm vitest tests/diagnostic/cleriRaidMind.test.js
```

---

## 9.5 QA File 4: Integration Test

**Goal:** Verify adapter, complex math, and mind state together.

**Create file:**

```txt
tests/diagnostic/bytecodeDiagnosticSynthesis.integration.test.js
```

**Code Example:**

```js
import { describe, expect, it } from "vitest";
import { evaluateCleriRaidMind } from "../../codex/core/diagnostic/CleriRaidMind.js";

describe("ByteCode Diagnostic Synthesis Integration", () => {
  it("diagnoses an auth sender mismatch as the primary fault", () => {
    const complexes = [
      {
        id: "AUTH_HANDSHAKE_COMPLEX",
        expected: {
          authSender: 2,
          identityProof: 2,
          sessionContinuity: 1
        },
        weights: {
          authSender: 1.4,
          identityProof: 1.4,
          sessionContinuity: 1
        },
        subunits: [
          { id: "authSender", signalKey: "AUTH_SENDER_MATCH" },
          { id: "identityProof", signalKey: "IDENTITY_PROOF_VALID" },
          { id: "sessionContinuity", signalKey: "SESSION_CONTINUITY" }
        ]
      }
    ];

    const result = evaluateCleriRaidMind({
      raidId: "CLERI_RAID_TEST",
      complexes,
      bytecodeHealthSnapshot: {
        AUTH_SENDER_MATCH: {
          score: 0,
          bytecode: "PB-ERR-v1-STATE-AUTH_SENDER_MISMATCH"
        },
        IDENTITY_PROOF_VALID: {
          status: "stable"
        },
        SESSION_CONTINUITY: {
          status: "stable"
        }
      }
    });

    // score:0 → adapter normalizes to 0 → authSender is "missing" → complex is critical → mindState is fractured
    expect(result.mindState).toBe("fractured");
    expect(result.primaryFaults[0]).toMatchObject({
      complexId: "AUTH_HANDSHAKE_COMPLEX",
      subunitId: "authSender"
    });

    // "missing" maps to restore_signal, not increase_coverage
    expect(result.nextDebugActions[0].action).toBe("restore_signal");
  });
});
```

**Run:**

```bash
pnpm vitest tests/diagnostic/bytecodeDiagnosticSynthesis.integration.test.js
```

---

## 9.6 QA File 5: Golden Test

**Goal:** Ensure exact output stability.

**Create fixture:**

```txt
tests/fixtures/bytecodeDiagnosticSynthesis/authMismatch.input.json
```

```json
{
  "raidId": "CLERI_RAID_TEST",
  "bytecodeHealthSnapshot": {
    "AUTH_SENDER_MATCH": {
      "score": 0,
      "bytecode": "PB-ERR-v1-STATE-AUTH_SENDER_MISMATCH"
    },
    "IDENTITY_PROOF_VALID": {
      "status": "stable"
    },
    "SESSION_CONTINUITY": {
      "status": "stable"
    }
  }
}
```

**Create expected output:**

```txt
tests/fixtures/bytecodeDiagnosticSynthesis/authMismatch.expected.json
```

The exact expected output should be generated after the first approved implementation run.

**Test Example:**

```js
import { describe, expect, it } from "vitest";
import input from "../fixtures/bytecodeDiagnosticSynthesis/authMismatch.input.json";
import expected from "../fixtures/bytecodeDiagnosticSynthesis/authMismatch.expected.json";
import { evaluateCleriRaidMind } from "../../codex/core/diagnostic/CleriRaidMind.js";

describe("ByteCode Diagnostic Synthesis Golden Tests", () => {
  it("matches the approved auth mismatch output", () => {
    const result = evaluateCleriRaidMind(input);

    expect(result).toEqual(expected);
  });
});
```

**Run:**

```bash
pnpm vitest tests/diagnostic/bytecodeDiagnosticSynthesis.golden.test.js
```

---

## 9.7 QA Script: Proof Runner

**Create file:**

```txt
scripts/prove_bytecode_diagnostic_synthesis.js
```

**Code Example:**

```js
import { evaluateCleriRaidMind } from "../codex/core/diagnostic/CleriRaidMind.js";

const result = evaluateCleriRaidMind({
  raidId: "CLERI_RAID_PROOF",
  bytecodeHealthSnapshot: {
    AUTH_SENDER_MATCH: {
      score: 0,
      bytecode: "PB-ERR-v1-STATE-AUTH_SENDER_MISMATCH"
    },
    IDENTITY_PROOF_VALID: {
      status: "stable"
    },
    SESSION_CONTINUITY: {
      status: "stable"
    },
    CSRF_BOUNDARY_HEALTH: {
      status: "stable"
    }
  }
});

console.log(JSON.stringify(result, null, 2));

if (result.mindState !== "fractured") {
  console.error("Expected fractured mind state.");
  process.exit(1);
}

if (result.primaryFaults[0]?.subunitId !== "authSender") {
  console.error("Expected authSender to be the primary fault.");
  process.exit(1);
}

console.log("BYTECODE_DIAGNOSTIC_SYNTHESIS_PROOF_OK");
```

**Run:**

```bash
node scripts/prove_bytecode_diagnostic_synthesis.js
```

---

## 10. Detailed Runtime Synopsis Before Completion

This section describes exactly how the project should run before the system is complete.

The correct pre-completion state is **not** a half-working enforcement layer. It is a shadow diagnostic organism. It watches everything, learns system proportions, emits structured mind states, and proves usefulness without blocking the existing application.

---

### 10.1 Phase 0: Current Runtime Remains Authoritative

Before implementation begins:

```txt
BytecodeHealth remains authoritative.
Existing tests remain authoritative.
Existing runtime behavior remains authoritative.
Cleri-Raid synthesis does not exist yet.
No gates are changed.
No CI rule is changed.
No runtime rejection is added.
```

The project should still boot, test, and run exactly as it did before the PDR.

---

### 10.2 Phase 1: Pure Math Exists in Isolation

After `StoichComplexHealth.js` is added:

```txt
The project can import stoichiometric diagnostic math.
No production runtime calls it yet.
No BytecodeHealth behavior changes.
No logs change.
No routes change.
No UI changes.
```

At this stage, only unit tests should exercise the new math.

Expected state:

```txt
pnpm vitest tests/diagnostic/stoichComplexHealth.test.js
```

passes.

If it fails, do not inspect Cleri-Raid or QBIT yet. The math layer must be fixed first.

---

### 10.3 Phase 2: Adapter Reads Existing Signals

After `BytecodeHealthAdapter.js` is added:

```txt
Existing diagnostic objects can be normalized.
No existing diagnostic producer must change.
The adapter accepts multiple shapes.
Bad values degrade safely to 0.
Unknown status strings degrade to 0.5.
```

The adapter must behave like a customs checkpoint, not a judge. It translates passports. It does not decide citizenship.

Expected state:

```txt
normalizeSignal(true) = 1
normalizeSignal(false) = 0
normalizeSignal({ score: 0.8 }) = 0.8
normalizeSignal({ status: "stable" }) = 1
normalizeSignal({ status: "critical" }) = 0.15
```

---

### 10.4 Phase 3: Registry Declares Diagnostic Biology

After `CleriRaidComplexRegistry.js` is added:

```txt
Diagnostic complexes are declared in one place.
Each complex has an id.
Each complex has expected ratios.
Each complex maps subunit ids to BytecodeHealth signal keys.
Weights remain explicit.
Thresholds remain explicit.
```

No runtime should guess what belongs to a complex.

Example:

```txt
AUTH_HANDSHAKE_COMPLEX
  authSender → AUTH_SENDER_MATCH
  identityProof → IDENTITY_PROOF_VALID
  sessionContinuity → SESSION_CONTINUITY
  csrfBoundary → CSRF_BOUNDARY_HEALTH
```

This means a future agent can add or audit complexes without spelunking through runtime code.

---

### 10.5 Phase 4: CleriRaidMind Runs in Direct Calls Only

After `CleriRaidMind.js` is added:

```txt
A developer can call evaluateCleriRaidMind manually.
Tests can call evaluateCleriRaidMind.
Proof scripts can call evaluateCleriRaidMind.
Production runtime still does not enforce it.
```

The output should look like:

```js
{
  raidId: "CLERI_RAID_MAIN",
  mindState: "fractured",
  globalHealth: 0.693122,
  complexes: [
    {
      complexId: "AUTH_HANDSHAKE_COMPLEX",
      health: 0.51,
      status: "critical"
    }
  ],
  primaryFaults: [
    {
      complexId: "AUTH_HANDSHAKE_COMPLEX",
      subunitId: "authSender",
      state: "limiting"
    }
  ],
  nextDebugActions: [
    {
      complexId: "AUTH_HANDSHAKE_COMPLEX",
      subunitId: "authSender",
      action: "increase_coverage"
    }
  ],
  qbitPayload: {
    qbitType: "BYTECODE_DIAGNOSTIC_SYNTHESIS",
    collapseConfidence: 0.693122
  }
}
```

If this output feels useful during debugging, continue.

If the repair vectors are obvious, vague, or wrong, fix registry ratios before adding runtime hooks.

---

### 10.6 Phase 5: Shadow Mode Runtime Hook

Once tests pass, add a shadow-mode hook.

Runtime behavior:

```txt
Application starts normally.
BytecodeHealth runs normally.
A snapshot is copied.
Diagnostic synthesis evaluates the copy.
Result is stored, logged, or exposed to dev diagnostics.
No user-facing failure occurs.
No request is rejected.
No build is failed.
```

Allowed shadow output destinations:

```txt
console debug in development
diagnostic JSON endpoint in local mode
dev-only UI panel
proof script artifact
QBIT pulse payload
```

Forbidden shadow behavior:

```txt
throwing runtime errors
blocking route loads
failing CI
mutating BytecodeHealth snapshot
rewriting registry values dynamically
```

This is the safest pre-completion state.

---

### 10.7 Phase 6: Warn Mode

After shadow mode produces stable and useful output, promote to warn mode.

Warn mode behavior:

```txt
Application still runs.
CI still passes unless regular tests fail.
Warnings are emitted when mindState is not coherent.
Warnings include primaryFaults and nextDebugActions.
Warnings are deterministic.
```

Example warning:

```txt
[CLERI_RAID_MIND] state=fractured health=0.621
primaryFault=AUTH_HANDSHAKE_COMPLEX.authSender
action=increase_coverage
```

Warn mode should be used to tune thresholds.

If warnings are too frequent, do not disable the system. Fix ratios, thresholds, or noisy signal mappings.

---

### 10.8 Phase 7: Gate Candidate

Only after repeated proof stability should the system become a gate candidate.

Gate candidate requirements:

```txt
Unit tests pass.
Integration tests pass.
Golden tests pass.
Proof script passes.
Shadow mode observed no destructive side effects.
Warn mode produced useful repair vectors.
False positives are understood.
Unknown signals are ignored safely.
```

At this point, create a proof document:

```txt
docs/proofs/RAID_PHASE_5_BYTECODE_DIAGNOSTIC_SYNTHESIS_PROOF.md
```

Suggested proof structure:

```md
# RAID Phase 5 ByteCode Diagnostic Synthesis Proof

## Claim

Cleri-Raid can synthesize BytecodeHealth signals into deterministic complex-level diagnostics.

## Input

Describe snapshot.

## Expected Output

Describe mind state, primary fault, and repair vector.

## Command

node scripts/prove_bytecode_diagnostic_synthesis.js

## Acceptance Criteria

- mindState is fractured
- authSender is primary fault
- qbitPayload exists
- repair vector recommends restore_signal for authSender

## Limitations

- Registry coverage is incomplete
- Signal normalization still depends on adapter mapping
- Gate mode is not enabled yet
```

---

### 10.9 Phase 8: Gate Mode

Gate mode should be the final step.

Gate mode behavior:

```txt
If mindState is coherent, pass.
If mindState is overstimulated, optionally warn.
If mindState is agitated, fail only in strict diagnostic contexts.
If mindState is fractured, fail gate.
```

Recommended policy:

```js
export function shouldFailDiagnosticGate(mind) {
  return mind.mindState === "fractured";
}
```

Do not fail on every `unstable` complex at first. That will create a brittle cathedral where every candle is a smoke alarm.

---

## 11. Incomplete Project Operating Rules

Until complete, every contributor or agent must follow these rules:

### Rule 1: Do Not Refactor BytecodeHealth Prematurely

Only add a snapshot bridge if required.

### Rule 2: Do Not Enable Gate Mode First

The rollout ladder is mandatory:

```txt
off → shadow → warn → gate
```

### Rule 3: Registry Before Logic

If a new diagnostic relationship is needed, add it to the registry, not to conditional spaghetti.

### Rule 4: Scores Must Be `0..1`

Every consumed signal must normalize to a finite score.

### Rule 5: Unknown Signals Are Ignored

Unknown input must not affect output.

### Rule 6: Deterministic Sorts Everywhere

Every array in outward-facing output must have deterministic ordering.

### Rule 7: Repair Vectors Must Be Actionable

Bad:

```txt
investigate instability
```

Good:

```txt
increase_coverage for AUTH_HANDSHAKE_COMPLEX.authSender
```

### Rule 8: QBIT Receives Summaries

Do not make QBIT parse raw subunit arrays unless specifically needed.

### Rule 9: CI Owns Hard Invariants

QBIT can flag low coherence, but CI should enforce stable expected outputs.

### Rule 10: Document Every New Complex

Each new complex must include:

```txt
id
purpose
expected ratios
subunit mappings
weights
thresholds
example failure
expected repair vector
```

---

## 12. Recommended Initial Complexes

Start with three complexes only.

### 12.1 `AUTH_HANDSHAKE_COMPLEX`

Purpose:

```txt
Detect sender identity, session, and boundary mismatch.
```

Subunits:

```txt
authSender
identityProof
sessionContinuity
csrfBoundary
```

Why first:

```txt
Past Cleri-Raid diagnostics have already involved sender/auth mismatch style failures.
```

---

### 12.2 `BYTECODE_INTEGRITY_COMPLEX`

Purpose:

```txt
Detect malformed, undecodable, untrusted, or checksum-invalid bytecode packets.
```

Subunits:

```txt
decodability
checksum
schema
provenance
```

Why second:

```txt
This protects the diagnostic language itself.
```

---

### 12.3 `UI_STATE_COHERENCE_COMPLEX`

Purpose:

```txt
Detect view, cursor, overlay, and route state desynchronization.
```

Subunits:

```txt
routeState
viewState
cursorState
overlayState
```

Why third:

```txt
Scholomance has high UI precision requirements, and this complex helps catch drift.
```

---

## 13. Implementation Order Checklist

```txt
[ ] Read BytecodeHealth.js exports.
[ ] Identify available snapshot or signal shape.
[ ] Add StoichComplexHealth.js.
[ ] Add stoich unit tests.
[ ] Add BytecodeHealthAdapter.js.
[ ] Add adapter unit tests.
[ ] Add CleriRaidComplexRegistry.js.
[ ] Add CleriRaidMind.js.
[ ] Add mind unit tests.
[ ] Add integration test.
[ ] Add proof script.
[ ] Add golden test fixture.
[ ] Add shadow-mode hook.
[ ] Observe output during real debugging.
[ ] Tune thresholds.
[ ] Promote to warn mode.
[ ] Add proof markdown.
[ ] Only then consider gate mode.
```

---

## 14. Regression-Aware Retest Plan

After each implementation step, run the narrowest test first.

### After Step 2

```bash
pnpm vitest tests/diagnostic/stoichComplexHealth.test.js
```

### After Step 3

```bash
pnpm vitest tests/diagnostic/bytecodeHealthAdapter.test.js
```

### After Step 5

```bash
pnpm vitest tests/diagnostic/cleriRaidMind.test.js
```

### After Step 6

```bash
pnpm vitest tests/diagnostic/bytecodeDiagnosticSynthesis.integration.test.js
```

### Before promotion to warn mode

```bash
pnpm vitest tests/diagnostic
node scripts/prove_bytecode_diagnostic_synthesis.js
```

### Before promotion to gate mode

```bash
pnpm test
pnpm vitest tests/diagnostic
node scripts/prove_bytecode_diagnostic_synthesis.js
```

---

## 15. Failure Modes and Solves

| Failure | Likely Cause | Solve |
|---|---|---|
| Everything becomes missing | Signal keys do not match BytecodeHealth output | Fix registry mappings |
| Health is too high despite obvious failure | Missing required subunit not overriding average | Ensure missing causes critical |
| Health is too low constantly | Ratios or thresholds too strict | Tune registry thresholds |
| Repair vectors are vague | Too many generic states | Use finite action mapping |
| Output order changes | Arrays not sorted | Add deterministic sort |
| Golden test flakes | Floating precision or key order | Round scores and canonicalize keys |
| QBIT output bloats | Raw complexes sent to QBIT | Send compact qbitPayload |
| Runtime breaks | Hook enforces too early | Return to shadow mode |
| Existing tests fail | BytecodeHealth was modified too much | revert BytecodeHealth patch, use adapter |
| New agents misuse the system | PDR unclear or registry undocumented | Add complex docs and proof examples |

---

## 16. Definition of Done

The project is complete when:

```txt
[ ] StoichComplexHealth is implemented.
[ ] BytecodeHealthAdapter is implemented.
[ ] CleriRaidComplexRegistry is implemented.
[ ] CleriRaidMind is implemented.
[ ] Unit tests pass.
[ ] Integration tests pass.
[ ] Golden tests pass.
[ ] Proof script passes.
[ ] Shadow mode runs without side effects.
[ ] Warn mode produces useful repair vectors.
[ ] QBIT payload is compact and deterministic.
[ ] Gate mode policy exists but is not enabled by default.
[ ] PDR proof artifact exists.
```

---

## 17. Final Architectural Verdict

ByteCode Diagnostic Synthesis should make Cleri-Raid feel less like a log reader and more like an immune mind.

The win is not more output.

The win is **assembly-aware diagnosis**.

A flat diagnostic says:

```txt
AUTH_SENDER_MATCH failed.
```

A synthesized diagnostic says:

```txt
AUTH_HANDSHAKE_COMPLEX is fractured because authSender is limiting relative to identityProof and sessionContinuity. Increase auth sender coverage before investigating downstream UI state.
```

That is a major jump.

It reduces debug fog, prevents loud signals from dominating attention, and gives QBIT a clean coherence object without making QBIT responsible for every invariant.

Build it additively. Run it in shadow. Prove it with golden tests. Then let Cleri-Raid open its second eye.
