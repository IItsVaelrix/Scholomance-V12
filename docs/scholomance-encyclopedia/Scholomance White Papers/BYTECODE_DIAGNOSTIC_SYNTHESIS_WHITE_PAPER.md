# BYTECODE DIAGNOSTIC SYNTHESIS: THE SECOND EYE OF CLERI-RAID
## An Instruction Manual for Stoichiometric Diagnostic Intelligence

## Bytecode Search Code
`SCHOL-ENC-BYKE-SEARCH-WP-BYTECODE-DIAGNOSTIC-SYNTHESIS`

> "A flat diagnostic says: AUTH_SENDER_MATCH failed. A synthesized diagnostic says: AUTH_HANDSHAKE_COMPLEX is fractured because authSender is limiting relative to identityProof and sessionContinuity. That is a major jump." — *ByteCode Diagnostic Synthesis PDR*

---

## Table of Contents

1. [What This System Is](#1-what-this-system-is)
2. [Quick Start](#2-quick-start)
3. [Architecture](#3-architecture)
4. [Module Reference](#4-module-reference)
   - [BytecodeHealthAdapter](#41-bytecodehealthadapter)
   - [StoichComplexHealth](#42-stoichcomplexhealth)
   - [CleriRaidComplexRegistry](#43-cleriraidcomplexregistry)
   - [CleriRaidMind](#44-cleriraidmind)
5. [Defining Diagnostic Complexes](#5-defining-diagnostic-complexes)
6. [Configuration & Rollout Modes](#6-configuration--rollout-modes)
7. [Integration Patterns](#7-integration-patterns)
8. [QA & Verification](#8-qa--verification)
9. [Operational Runbook](#9-operational-runbook)
10. [Failure Mode Reference](#10-failure-mode-reference)
11. [Glossary](#11-glossary)

---

## 1. WHAT THIS SYSTEM IS

### 1.1 The Problem with Flat Diagnostics

Before ByteCode Diagnostic Synthesis, Cleri-Raid could tell you that a signal failed. It could not tell you why the failure *mattered* relative to the system's expected architecture. A noisy but non-critical signal looked identical to a genuinely missing required signal. A diagnostic channel with twenty passing signals and one critical absent one would still produce an ambiguous output — the loud signals drowned out the critical gap.

This is the diagnostic equivalent of being told "one of your organs is missing" but receiving it as item 14 of a 20-item list.

### 1.2 The Stoichiometric Model

ByteCode Diagnostic Synthesis borrows its core mechanic from stoichiometric multi-protein complex chemistry. In biology, a protein complex fails to assemble not when *any* protein is deficient, but when the **ratio** of constituent subunits deviates from the expected stoichiometric proportion. A missing required subunit collapses the complex. An overabundant subunit creates noise that masks other signals.

The translation to diagnostic systems:

| Biology Term | ByteCode Diagnostic Term |
|---|---|
| Protein subunit | Diagnostic signal |
| Protein complex | Diagnostic domain (AUTH, BYTECODE, UI) |
| Stoichiometric ratio | Expected signal weight ratio |
| Limiting subunit | Weakest required diagnostic signal |
| Excess subunit | Overactive or noisy diagnostic signal |
| Complex assembly | System coherence |
| Repair pathway | Debug action vector |

This is not a biology simulator. Biology is the mathematical metaphor, not the implementation domain.

### 1.3 What This System Adds

```
BytecodeHealth emits raw diagnostic signals.
StoichComplexHealth normalizes those signals into subunit ratios.
CleriRaidMind evaluates complexes and produces a raid-level mind state.
QBIT receives a compact coherence payload.
CI verifies deterministic invariants.
```

The output is not more data. The output is **assembly-aware diagnosis**.

---

## 2. QUICK START

### 2.1 Run the Proof Script

The fastest way to verify the system works:

```bash
node scripts/prove_bytecode_diagnostic_synthesis.js
```

Expected terminal output:
```
{ raidId: "CLERI_RAID_PROOF", mindState: "fractured", globalHealth: 0.774858, ... }
BYTECODE_DIAGNOSTIC_SYNTHESIS_PROOF_OK
```

The proof inputs a known-bad snapshot (AUTH_SENDER_MATCH: score 0) and asserts that `mindState` is `"fractured"` and `authSender` is the primary fault.

### 2.2 Run All Diagnostic Tests

```bash
npx vitest run tests/diagnostic/
```

Expected: 114 tests, all passing. If any fail, run narrower suites — see §8.

### 2.3 Call the Mind Directly

```javascript
import { evaluateCleriRaidMind } from './codex/core/diagnostic/CleriRaidMind.js';

const result = evaluateCleriRaidMind({
  raidId: 'MY_RAID',
  bytecodeHealthSnapshot: {
    AUTH_SENDER_MATCH: { score: 0.2, status: 'critical' },
    IDENTITY_PROOF_VALID: { status: 'stable' },
    SESSION_CONTINUITY: { status: 'stable' },
    CSRF_BOUNDARY_HEALTH: { status: 'stable' },
  },
});

console.log(result.mindState);       // "fractured"
console.log(result.primaryFaults);   // [{ complexId: "AUTH_HANDSHAKE_COMPLEX", subunitId: "authSender" }]
console.log(result.nextDebugActions[0].action); // "restore_signal"
```

### 2.4 Run in Shadow Mode via the Diagnostic Runner

The diagnostic runner already runs synthesis in shadow mode by default. No action required. If `CLERI_RAID_SYNTHESIS_MODE` is unset, shadow mode is active. The `report.synthesis` field is populated after every diagnostic scan.

```bash
CLERI_RAID_SYNTHESIS_MODE=shadow npx vitest run tests/diagnostic/diagnostic.stasis.test.js
```

---

## 3. ARCHITECTURE

### 3.1 Layer Diagram

```
BytecodeHealth.js
  ↓ (emits raw diagnostic signals)
BytecodeHealthAdapter.js
  ↓ (normalizes to 0..1 scores, canonicalizes key order)
StoichComplexHealth.js
  ↓ (evaluates ratio deviations per complex)
CleriRaidComplexRegistry.js
  ↓ (declares complexes, expected ratios, subunit→signalKey mappings)
CleriRaidMind.js
  ↓ (aggregates, classifies mind state, builds repair vectors)
QBIT payload / proof artifacts / diagnostic runner / UI
```

### 3.2 Responsibility Boundaries

| Module | Responsibility | Must Not Do |
|---|---|---|
| `BytecodeHealth.js` | Existing diagnostic primitive | Know raid mind logic |
| `BytecodeHealthAdapter.js` | Normalize old/new signal formats to `0..1` | Invent health semantics |
| `StoichComplexHealth.js` | Pure stoichiometric math | Touch runtime state |
| `CleriRaidComplexRegistry.js` | Declare complexes and expected ratios | Execute diagnostics |
| `CleriRaidMind.js` | Build raid-level mind state | Mutate BytecodeHealth |

### 3.3 Determinism Contract

Every function in this system is pure. No randomness. No date dependency inside scoring. No snapshot mutation. No side effects inside evaluators. All outward-facing arrays are sorted deterministically. Floating-point scores are rounded to 6 decimal places before leaving any module.

---

## 4. MODULE REFERENCE

### 4.1 BytecodeHealthAdapter

**File:** `codex/core/diagnostic/BytecodeHealthAdapter.js`

**Purpose:** The customs checkpoint. It translates passports — it does not decide citizenship. Converts any existing BytecodeHealth output format into normalized `0..1` float scores without changing how BytecodeHealth produces signals.

---

#### `normalizeBytecodeHealthSnapshot(snapshot)`

Normalizes a full snapshot object. Canonicalizes key order (alphabetical) for deterministic downstream consumption.

**Signature:**
```javascript
normalizeBytecodeHealthSnapshot(snapshot?: Record<string, unknown>): Record<string, number>
```

**Parameters:**

| Name | Type | Description |
|---|---|---|
| `snapshot` | `object` | Raw BytecodeHealth snapshot. Any key → any raw signal form. |

**Returns:** `Record<string, number>` — keys sorted alphabetically, values clamped to `[0, 1]`.

**Example:**
```javascript
normalizeBytecodeHealthSnapshot({
  Z_SIGNAL: 1,
  A_SIGNAL: { status: 'stable' },
  B_SIGNAL: { score: 0.72 },
});
// → { A_SIGNAL: 1, B_SIGNAL: 0.72, Z_SIGNAL: 1 }
```

---

#### `normalizeSignal(rawSignal)`

Normalizes a single raw signal value to a `0..1` float.

**Signature:**
```javascript
normalizeSignal(rawSignal: unknown): number
```

**Normalization rules (priority order):**

| Input Form | Output |
|---|---|
| `number` | Clamped to `[0, 1]` |
| `boolean` | `true → 1`, `false → 0` |
| `{ score: number }` | Clamped `.score` |
| `{ health: number }` | Clamped `.health` |
| `{ ok: boolean }` | `true → 1`, `false → 0` |
| `{ status: string }` | Mapped via status table |
| Anything else | `0` |

**Status string mapping:**

| Status | Score |
|---|---|
| `"ok"`, `"pass"`, `"stable"`, `"healthy"` | `1` |
| `"warn"`, `"warning"`, `"unstable"` | `0.65` |
| `"critical"`, `"error"`, `"fail"` | `0.15` |
| `"missing"` | `0` |
| (unknown) | `0.5` |

**Example:**
```javascript
normalizeSignal(0.75)                   // 0.75
normalizeSignal(2)                      // 1      (clamped)
normalizeSignal(-1)                     // 0      (clamped)
normalizeSignal(true)                   // 1
normalizeSignal({ score: 0.4 })         // 0.4
normalizeSignal({ status: 'stable' })   // 1
normalizeSignal({ status: 'critical' }) // 0.15
normalizeSignal({ ok: false })          // 0
```

---

### 4.2 StoichComplexHealth

**File:** `codex/core/diagnostic/StoichComplexHealth.js`

**Purpose:** The pure math layer. Evaluates how well a set of observed diagnostic signals matches the expected stoichiometric ratios for a complex.

---

#### `normalizeStoichVector(vector)`

Normalizes a weight/expected vector to proportional fractions that sum to 1.

**Signature:**
```javascript
normalizeStoichVector(vector?: Record<string, number>): Record<string, number>
```

**Returns:** Proportional normalized values rounded to 6 decimal places. If the input total is zero, all outputs are `0`.

**Example:**
```javascript
normalizeStoichVector({ a: 2, b: 2 })    // { a: 0.5, b: 0.5 }
normalizeStoichVector({ a: 2, b: 1 })    // { a: 0.666667, b: 0.333333 }
normalizeStoichVector({ a: 0, b: 0 })    // { a: 0, b: 0 }
```

---

#### `evaluateStoichComplex(params)`

Evaluates a single diagnostic complex.

**Signature:**
```javascript
evaluateStoichComplex({
  complexId: string,
  expected: Record<string, number>,
  observed: Record<string, number>,
  weights?: Record<string, number>,
  thresholds?: { limitingRatio?: number, excessRatio?: number, deviation?: number }
}): ComplexResult
```

**Parameters:**

| Name | Type | Default | Description |
|---|---|---|---|
| `complexId` | `string` | — | Identifier for this complex |
| `expected` | `Record<string, number>` | — | Expected subunit weights (raw, not pre-normalized) |
| `observed` | `Record<string, number>` | — | Observed subunit scores (0..1, one per subunit id) |
| `weights` | `Record<string, number>` | `1` per subunit | Importance multipliers for deviation scoring |
| `thresholds.limitingRatio` | `number` | `0.65` | Ratio below which a subunit is `limiting` |
| `thresholds.excessRatio` | `number` | `1.45` | Ratio above which a subunit is `excess` |
| `thresholds.deviation` | `number` | `0.18` | Absolute deviation above which a subunit is `unstable` |

**Returns:** `ComplexResult`

```typescript
interface SubunitResult {
  subunitId: string;
  target: number;      // Normalized expected ratio
  actual: number;      // Normalized observed score
  ratio: number|null;  // actual / target (null if target = 0)
  weight: number;
  deviation: number;   // abs(actual - target)
  state: 'stable' | 'limiting' | 'missing' | 'excess' | 'unstable';
}

interface RepairItem {
  subunitId: string;
  action: 'restore_signal' | 'increase_coverage' | 'reduce_noise' | 'inspect_shape' | 'observe';
  delta: number;       // target - actual
  reason: string;      // subunit state
}

interface ComplexResult {
  complexId: string;
  health: number;      // 0..1, rounded to 6dp
  status: 'stable' | 'unstable' | 'noisy' | 'critical';
  limiting: SubunitResult[];
  excess: SubunitResult[];
  subunits: SubunitResult[];
  repairVector: RepairItem[];
}
```

**Health formula:**
```
weightedDeviation = Σ(weight_i × |actual_i − target_i|)
totalWeight       = Σ(weight_i)
health            = max(0, 1 − weightedDeviation / totalWeight)
```

**Status classification:**

| Condition | Status |
|---|---|
| Any subunit is `missing` | `critical` |
| `health < 0.55` | `critical` |
| `health < 0.78` | `unstable` |
| Any subunit is `excess` | `noisy` |
| Otherwise | `stable` |

**Subunit state classification:**

| Condition (checked in order) | State |
|---|---|
| `target > 0` and `actual ≈ 0` | `missing` |
| `ratio < limitingRatio` (default 0.65) | `limiting` |
| `ratio > excessRatio` (default 1.45) | `excess` |
| `deviation > thresholds.deviation` (default 0.18) | `unstable` |
| Otherwise | `stable` |

**Repair vector action mapping:**

| State | Action |
|---|---|
| `missing` | `restore_signal` |
| `limiting` | `increase_coverage` |
| `excess` | `reduce_noise` |
| `unstable` | `inspect_shape` |
| (other) | `observe` |

**Example:**
```javascript
evaluateStoichComplex({
  complexId: 'AUTH_HANDSHAKE_COMPLEX',
  expected: { authSender: 2, identityProof: 2, sessionContinuity: 1, csrfBoundary: 1 },
  observed: { authSender: 0, identityProof: 0.9, sessionContinuity: 0.9, csrfBoundary: 0.9 },
  weights: { authSender: 1.4, identityProof: 1.4, sessionContinuity: 1.1, csrfBoundary: 1.2 },
});
// → { complexId: "AUTH_HANDSHAKE_COMPLEX", health: 0.727..., status: "critical",
//     limiting: [{ subunitId: "authSender", state: "missing" }],
//     repairVector: [{ action: "restore_signal", subunitId: "authSender" }] }
```

---

### 4.3 CleriRaidComplexRegistry

**File:** `codex/core/diagnostic/CleriRaidComplexRegistry.js`

**Purpose:** Declares named diagnostic complexes. All complex relationships live here, not scattered across runtime code.

**Export:** `CLERI_RAID_COMPLEXES` — a frozen array of complex definition objects.

**Complex definition shape:**

```typescript
interface SubunitMapping {
  id: string;       // Internal subunit identifier used in expected/weights/observed
  signalKey: string; // Key in the normalized BytecodeHealth snapshot
}

interface ComplexDefinition {
  id: string;
  expected: Record<string, number>;  // Subunit id → raw weight (not pre-normalized)
  weights?: Record<string, number>;  // Subunit id → importance multiplier
  subunits: SubunitMapping[];        // Maps subunit id to snapshot signal key
  thresholds?: {                     // Optional per-complex threshold overrides
    limitingRatio?: number;
    excessRatio?: number;
    deviation?: number;
  };
}
```

**Current registered complexes:**

| Complex ID | Subunits | Signal Keys |
|---|---|---|
| `AUTH_HANDSHAKE_COMPLEX` | authSender, identityProof, sessionContinuity, csrfBoundary | `AUTH_SENDER_MATCH`, `IDENTITY_PROOF_VALID`, `SESSION_CONTINUITY`, `CSRF_BOUNDARY_HEALTH` |
| `BYTECODE_INTEGRITY_COMPLEX` | decodability, checksum, schema, provenance | `BYTECODE_DECODABLE`, `BYTECODE_CHECKSUM_VALID`, `BYTECODE_SCHEMA_VALID`, `BYTECODE_PROVENANCE_VALID` |
| `UI_STATE_COHERENCE_COMPLEX` | routeState, viewState, cursorState, overlayState | `ROUTE_STATE_HEALTH`, `VIEW_STATE_HEALTH`, `CURSOR_STATE_HEALTH`, `OVERLAY_STATE_HEALTH` |

**Rule:** Ratios live in the registry. Runtime code does not declare diagnostic relationships.

---

### 4.4 CleriRaidMind

**File:** `codex/core/diagnostic/CleriRaidMind.js`

**Purpose:** Converts normalized BytecodeHealth signals into raid-level intelligence. The orchestration layer that binds adapter → math → registry into a single callable.

---

#### `evaluateCleriRaidMind(params)`

Evaluates all registered complexes and returns a complete raid mind result.

**Signature:**
```javascript
evaluateCleriRaidMind({
  raidId?: string,
  bytecodeHealthSnapshot?: Record<string, unknown>,
  complexes?: ComplexDefinition[],
}): RaidMindResult
```

**Parameters:**

| Name | Type | Default | Description |
|---|---|---|---|
| `raidId` | `string` | `'CLERI_RAID_MAIN'` | Identifier embedded in the result and QBIT payload |
| `bytecodeHealthSnapshot` | `object` | `{}` | Raw BytecodeHealth output — any normalized form accepted |
| `complexes` | `ComplexDefinition[]` | `CLERI_RAID_COMPLEXES` | Override the registry for testing |

**Returns:** `RaidMindResult`

```typescript
interface RaidMindResult {
  raidId: string;
  mindState: 'coherent' | 'overstimulated' | 'agitated' | 'fractured';
  globalHealth: number;       // Average complex health, 0..1
  complexes: ComplexResult[]; // Full result per complex
  primaryFaults: FaultItem[];
  nextDebugActions: ActionItem[];
  qbitPayload: QbitPayload;
}

interface FaultItem {
  complexId: string;
  subunitId: string;
  state: string;
  severity: number;  // deviation score (higher = worse)
}

interface ActionItem {
  complexId: string;
  subunitId: string;
  action: string;
  delta: number;
  reason: string;
}

interface QbitPayload {
  qbitType: 'BYTECODE_DIAGNOSTIC_SYNTHESIS';
  raidId: string;
  collapseConfidence: number;      // Same as globalHealth
  complexCount: number;
  unstableComplexes: string[];     // Sorted complex IDs with status !== 'stable'
}
```

**Mind state classification:**

| Condition (checked in order) | State |
|---|---|
| Any complex has status `critical` | `fractured` |
| `globalHealth < 0.78` | `agitated` |
| Any complex has status `noisy` | `overstimulated` |
| Otherwise | `coherent` |

**`primaryFaults`:** Top 2 limiting/missing subunits from each complex, sorted by deviation severity descending, then by `complexId:subunitId` lexicographically to break ties.

**`nextDebugActions`:** Top 3 repair vector items from each complex, sorted by `|delta|` descending, then by `complexId:subunitId` lexicographically.

---

#### `maybeRunDiagnosticSynthesis(params)`

Shadow-mode runner. Observes and reports without blocking anything.

**Signature:**
```javascript
maybeRunDiagnosticSynthesis({
  enabled?: boolean,
  mode?: 'off' | 'shadow' | 'warn' | 'gate',
  snapshot?: Record<string, unknown>,
  raidId?: string,
}): SynthesisResult | null
```

**Parameters:**

| Name | Type | Default | Description |
|---|---|---|---|
| `enabled` | `boolean` | `false` | If `false`, returns `null` immediately |
| `mode` | `string` | `'shadow'` | Operating mode |
| `snapshot` | `object` | `{}` | BytecodeHealth snapshot |
| `raidId` | `string` | `'CLERI_RAID_MAIN'` | Raid identifier |

**Returns by mode:**

| Mode | Return Shape |
|---|---|
| `shadow` | `{ enforced: false, mind: RaidMindResult }` |
| `warn` | `{ enforced: false, warning: string\|null, mind: RaidMindResult }` |
| `gate` | `{ enforced: true, pass: boolean, mind: RaidMindResult }` |

`warning` is `null` when `mindState === 'coherent'`, `'CLERI_RAID_MIND_NOT_COHERENT'` otherwise.

`pass` is `true` when `mindState === 'coherent'`, `false` otherwise.

---

#### `shouldFailDiagnosticGate(mind)`

Gate mode policy function. Returns `true` only for fractured mind state. Agitated and overstimulated states do not block — use warn mode for threshold tuning first.

**Signature:**
```javascript
shouldFailDiagnosticGate(mind: RaidMindResult): boolean
```

**Returns:** `true` if `mind.mindState === 'fractured'`, `false` otherwise.

**Usage:**
```javascript
const result = maybeRunDiagnosticSynthesis({ enabled: true, mode: 'gate', snapshot });
if (result.enforced && shouldFailDiagnosticGate(result.mind)) {
  throw new Error(`Diagnostic gate failed: ${result.mind.mindState}`);
}
```

---

## 5. DEFINING DIAGNOSTIC COMPLEXES

### 5.1 When to Add a New Complex

Add a complex when:
- A group of signals must all be present at correct proportions for a subsystem to be healthy
- Past debugging sessions repeatedly involved checking these signals together
- A new architectural domain is added that has testable signals

Do not add a complex when:
- The relationship between signals is uncertain
- The signal keys do not yet exist in BytecodeHealth output
- You cannot provide a meaningful expected ratio and at least one example failure

### 5.2 Complex Definition Template

```javascript
// In: codex/core/diagnostic/CleriRaidComplexRegistry.js

{
  id: 'MY_DOMAIN_COMPLEX',

  // Expected subunit weights — raw, not pre-normalized
  // These define the stoichiometric ratio, not absolute magnitudes
  // { a: 2, b: 1 } means "a should be twice as strong as b"
  expected: {
    primarySignal: 2,
    secondarySignal: 1,
  },

  // Importance multipliers for weighted deviation scoring
  // Higher weight = more impact on complex health when this subunit deviates
  weights: {
    primarySignal: 1.5,
    secondarySignal: 1.0,
  },

  // Maps subunit id (used in expected/weights/observed) → signal key in snapshot
  subunits: [
    { id: 'primarySignal',   signalKey: 'MY_PRIMARY_SIGNAL_HEALTH' },
    { id: 'secondarySignal', signalKey: 'MY_SECONDARY_SIGNAL_HEALTH' },
  ],

  // Optional: override default thresholds for this complex
  thresholds: {
    limitingRatio: 0.65,  // Default
    excessRatio: 1.45,    // Default
    deviation: 0.18,      // Default
  },
}
```

### 5.3 Required Documentation Per Complex

Each new complex must be documented with:

```
id: MY_DOMAIN_COMPLEX
purpose: What subsystem does this complex represent?
expected ratios: What are the raw weights and why?
subunit mappings: Which signal key maps to which subunit?
weights: Why is each subunit weighted as it is?
thresholds: Are the defaults suitable, or was tuning needed?
example failure: What snapshot produces a fractured result?
expected repair vector: What actions does the repair vector recommend for that failure?
```

### 5.4 Signal Overlap

A signal key may appear in multiple complexes. If `BYTECODE_SCHEMA_VALID` is relevant to both `BYTECODE_INTEGRITY_COMPLEX` and a hypothetical `QBIT_COHERENCE_COMPLEX`, declare it in both. Registry ownership makes overlap explicit and auditable.

### 5.5 Threshold Tuning

If a complex produces too many `limiting` or `unstable` classifications in shadow mode for a system that appears healthy, loosen its thresholds:

```javascript
thresholds: {
  limitingRatio: 0.45,  // Was 0.65 — loosened for this complex
  excessRatio: 1.8,     // Was 1.45 — loosened
}
```

If a complex fails to detect known bad states, tighten thresholds. Always tune in shadow mode before promoting.

---

## 6. CONFIGURATION & ROLLOUT MODES

### 6.1 Environment Variable

```
CLERI_RAID_SYNTHESIS_MODE=shadow
```

Allowed values:

| Value | Effect |
|---|---|
| `off` | Synthesis does not run. `report.synthesis` is not populated. |
| `shadow` | Synthesis runs. Result is attached to `report.synthesis`. No stderr, no blocking. **Default.** |
| `warn` | Synthesis runs. If `mindState !== 'coherent'`, a structured warning is emitted to stderr. No blocking. |
| `gate` | Synthesis runs. CI gates can query the result. Gate should not be enabled until proof stability. |

### 6.2 Rollout Ladder

The ladder is mandatory. Never skip steps.

```
off → shadow → warn → gate
```

**Promotion criteria:**

| From | To | Requirement |
|---|---|---|
| `off` | `shadow` | `StoichComplexHealth` and `CleriRaidMind` unit tests pass |
| `shadow` | `warn` | Shadow output observed across real debugging sessions; repair vectors are useful; no destructive side effects |
| `warn` | `gate` | Warn-mode output is stable; false-positive rate is understood; golden tests pass; proof script passes |

### 6.3 Shadow Mode Permitted Outputs

Shadow mode may write to:
- `report.synthesis` field (internal, not returned to callers)
- Dev-only console in development environments
- Proof script artifact
- QBIT pulse payload

Shadow mode must not:
- Throw runtime errors
- Block route loads
- Fail CI
- Mutate the BytecodeHealth snapshot
- Rewrite registry values at runtime

### 6.4 Warn Mode Output Format

When `CLERI_RAID_SYNTHESIS_MODE=warn` and `mindState !== 'coherent'`, the following is emitted to stderr:

```
[CLERI_RAID_MIND] state=fractured health=0.621
primaryFault=AUTH_HANDSHAKE_COMPLEX.authSender state=missing
action=restore_signal complex=AUTH_HANDSHAKE_COMPLEX.authSender
unstableComplexes=AUTH_HANDSHAKE_COMPLEX,BYTECODE_INTEGRITY_COMPLEX
```

This matches the format defined in PDR §10.7.

### 6.5 Gate Mode Policy

Use `shouldFailDiagnosticGate(mind)` as the standard gate policy. It fails only on `"fractured"` — not on `"agitated"` or `"overstimulated"`. This prevents the gate from becoming a brittle smoke alarm.

```javascript
import { shouldFailDiagnosticGate } from './codex/core/diagnostic/CleriRaidMind.js';

const result = maybeRunDiagnosticSynthesis({ enabled: true, mode: 'gate', snapshot });
if (result.enforced && shouldFailDiagnosticGate(result.mind)) {
  // Block CI or runtime progression
}
```

---

## 7. INTEGRATION PATTERNS

### 7.1 Pattern 1 — Direct Mind Query (Debugging)

Use this when diagnosing a live failure manually.

```javascript
import { evaluateCleriRaidMind } from './codex/core/diagnostic/CleriRaidMind.js';

// Gather your current diagnostic signals — from BytecodeHealth or manual measurement
const snapshot = {
  AUTH_SENDER_MATCH: { score: 0.1, status: 'critical' },
  IDENTITY_PROOF_VALID: { status: 'stable' },
  SESSION_CONTINUITY: { status: 'stable' },
  CSRF_BOUNDARY_HEALTH: { status: 'stable' },
};

const mind = evaluateCleriRaidMind({ raidId: 'MANUAL_DEBUG', bytecodeHealthSnapshot: snapshot });

console.log('Mind state:', mind.mindState);
console.log('Primary fault:', mind.primaryFaults[0]?.subunitId);
console.log('First action:', mind.nextDebugActions[0]?.action);
```

### 7.2 Pattern 2 — Diagnostic Runner (Automatic, Shadow Mode)

The diagnostic runner already wires synthesis automatically. After running `runDiagnostic()`, the result includes a `synthesis` field when mode is not `off`.

```javascript
import { runDiagnostic } from './codex/core/diagnostic/diagnostic-runner.js';

const report = await runDiagnostic({ snapshot, files, commitHash: 'abc1234' });

// Access synthesis result
if (report.synthesis) {
  console.log(report.synthesis.mind.mindState);
  console.log(report.synthesis.mind.qbitPayload);
}
```

The synthesis field is **excluded from the report checksum** — it is metadata only and does not affect the deterministic report identity.

### 7.3 Pattern 3 — Custom Snapshot from Cell Results

The runner builds a synthesis snapshot from cell results using `buildSynthesisSnapshot`. Use this if you need to call synthesis outside the runner:

```javascript
import { buildSynthesisSnapshot } from './codex/core/diagnostic/diagnostic-runner.js';
import { evaluateCleriRaidMind } from './codex/core/diagnostic/CleriRaidMind.js';

// cellResults: array of { cellId, errors, health, skipped, cellError }
const snapshot = buildSynthesisSnapshot(cellResults);
const mind = evaluateCleriRaidMind({ bytecodeHealthSnapshot: snapshot });
```

**Cell → signal key mapping** (defined in `CELL_SIGNAL_MAP` inside `diagnostic-runner.js`):

| Cell | Signal Keys | Rationale |
|---|---|---|
| `IMMUNITY_SCAN` | `BYTECODE_DECODABLE`, `BYTECODE_SCHEMA_VALID`, `AUTH_SENDER_MATCH`, `CSRF_BOUNDARY_HEALTH` | Clean immunity scan = no forbidden patterns or pathogens → auth sender and CSRF boundary are structurally sound |
| `LAYER_BOUNDARY` | `ROUTE_STATE_HEALTH`, `VIEW_STATE_HEALTH`, `CURSOR_STATE_HEALTH`, `OVERLAY_STATE_HEALTH`, `IDENTITY_PROOF_VALID` | Clean layer boundaries = UI state is coherent, identity proof is valid (no forbidden cross-layer auth code) |
| `TEST_COVERAGE` | `BYTECODE_PROVENANCE_VALID`, `SESSION_CONTINUITY` | Test coverage proves session continuity and bytecode provenance |
| `FIXTURE_SHAPE` | `BYTECODE_CHECKSUM_VALID` | Fixture quality proves checksum integrity |
| `PROCESSOR_BRIDGE` | `BYTECODE_DECODABLE` | No bridge crossings = bytecode is decodable end-to-end (min-wins with IMMUNITY_SCAN) |

When multiple cells map to the same signal key, the **minimum score wins** — the synthesis is not falsely confident if any scan path degrades.

### 7.4 Pattern 4 — Testing with a Custom Registry

Pass a custom `complexes` array to `evaluateCleriRaidMind` to isolate tests from the production registry.

```javascript
const TEST_COMPLEXES = [
  {
    id: 'TEST_COMPLEX',
    expected: { a: 1, b: 1 },
    subunits: [
      { id: 'a', signalKey: 'A_SIGNAL' },
      { id: 'b', signalKey: 'B_SIGNAL' },
    ],
  },
];

const result = evaluateCleriRaidMind({
  raidId: 'TEST_RAID',
  complexes: TEST_COMPLEXES,
  bytecodeHealthSnapshot: { A_SIGNAL: 1, B_SIGNAL: 1 },
});

expect(result.mindState).toBe('coherent');
```

### 7.5 Pattern 5 — BytecodeHealth Snapshot Bridge

If `BytecodeHealth.js` already exposes a snapshot function, use it:

```javascript
import { buildDiagnosticSynthesisSnapshot } from './codex/core/diagnostic/BytecodeHealth.js';
import { evaluateCleriRaidMind } from './codex/core/diagnostic/CleriRaidMind.js';

const rawState = /* ... your existing health state object ... */;
const snapshot = buildDiagnosticSynthesisSnapshot(rawState);
const mind = evaluateCleriRaidMind({ bytecodeHealthSnapshot: snapshot });
```

---

## 8. QA & VERIFICATION

### 8.1 Test Suite Map

| File | Tests | Covers |
|---|---|---|
| `tests/diagnostic/stoichComplexHealth.test.js` | 11 | Pure stoichiometric math: normalization, subunit classification, complex health, repair vector ordering |
| `tests/diagnostic/bytecodeHealthAdapter.test.js` | 23 | Signal normalization: numbers, booleans, objects, status strings, canonical key order |
| `tests/diagnostic/cleriRaidMind.test.js` | 12 | Mind state classification, QBIT payload shape, shadow/warn/gate modes, `shouldFailDiagnosticGate` |
| `tests/diagnostic/bytecodeDiagnosticSynthesis.integration.test.js` | 4 | End-to-end: adapter → math → mind → repair vector for known failure scenarios |
| `tests/diagnostic/bytecodeDiagnosticSynthesis.golden.test.js` | 1 | Output stability: exact byte-level match against `tests/fixtures/bytecodeDiagnosticSynthesis/authMismatch.expected.json` |
| `tests/diagnostic/diagnostic.stasis.test.js` | 63 | Diagnostic runner + synthesis wiring, shadow/warn mode stderr behavior, report checksum stability |

**Total: 114 tests**

### 8.2 Running Tests Narrowly (By Phase)

Run the narrowest scope first. Fix math before inspecting mind state. Fix mind state before inspecting runner wiring.

```bash
# After any change to StoichComplexHealth.js
npx vitest run tests/diagnostic/stoichComplexHealth.test.js

# After any change to BytecodeHealthAdapter.js
npx vitest run tests/diagnostic/bytecodeHealthAdapter.test.js

# After any change to CleriRaidMind.js or CleriRaidComplexRegistry.js
npx vitest run tests/diagnostic/cleriRaidMind.test.js

# After wiring changes in diagnostic-runner.js
npx vitest run tests/diagnostic/bytecodeDiagnosticSynthesis.integration.test.js

# Full diagnostic suite
npx vitest run tests/diagnostic/

# Before promoting to warn mode or gate mode
npx vitest run tests/diagnostic/
node scripts/prove_bytecode_diagnostic_synthesis.js
```

### 8.3 The Proof Script

`scripts/prove_bytecode_diagnostic_synthesis.js` is the canonical end-to-end verification. It does not use Vitest — it is a standalone Node script that exercises `evaluateCleriRaidMind` directly, prints the full result as JSON, and asserts two hard invariants:

1. `mindState === 'fractured'` for the auth sender mismatch input
2. `primaryFaults[0].subunitId === 'authSender'`

If either assertion fails, the script exits with code `1`.

```bash
node scripts/prove_bytecode_diagnostic_synthesis.js
# Expected final line: BYTECODE_DIAGNOSTIC_SYNTHESIS_PROOF_OK
```

### 8.4 Golden Test

`tests/fixtures/bytecodeDiagnosticSynthesis/authMismatch.input.json` is the canonical input snapshot.
`tests/fixtures/bytecodeDiagnosticSynthesis/authMismatch.expected.json` is the approved expected output.

The golden test asserts byte-level equality. If the output changes (due to a legitimate change in math, registry, or mind state logic), update the expected file:

```bash
node -e "
  import('./codex/core/diagnostic/CleriRaidMind.js').then(({ evaluateCleriRaidMind }) => {
    const input = JSON.parse(require('fs').readFileSync('./tests/fixtures/bytecodeDiagnosticSynthesis/authMismatch.input.json', 'utf8'));
    const result = evaluateCleriRaidMind(input);
    require('fs').writeFileSync('./tests/fixtures/bytecodeDiagnosticSynthesis/authMismatch.expected.json', JSON.stringify(result, null, 2));
  });
"
```

Only update the golden file after deliberate, reviewed changes to the math or registry. The golden file is the proof that output is stable.

### 8.5 Verify Synthesis Does Not Affect Report Checksum

The stasis test `'report checksum is not affected by synthesis field'` covers this. To confirm manually:

```javascript
const r1 = await runDiagnostic({ snapshot, files });
const r2 = await runDiagnostic({ snapshot, files });

// These must be equal even though synthesis runs both times
assert.equal(r1.checksum, r2.checksum);
```

---

## 9. OPERATIONAL RUNBOOK

### 9.1 Phase 0 — Before Implementation

BytecodeHealth remains authoritative. No synthesis files exist. The project boots, tests, and runs exactly as before. No gates are changed.

### 9.2 Phase 1 (Current) — Shadow Mode Active

State of the system as of 2026-05-24:

- All four synthesis modules are implemented and passing
- Diagnostic runner runs synthesis in shadow mode by default
- `report.synthesis` is populated after every diagnostic scan
- No stderr is emitted in shadow mode
- No CI gate is changed
- Proof script passes

**Operator action in Phase 1:** Observe `report.synthesis.mind` outputs during real debugging sessions. Check that repair vectors are actionable. Check that `primaryFaults` correctly identifies the dominant issue.

### 9.3 Phase 2 — Warn Mode Promotion

**Enable warn mode:**
```bash
CLERI_RAID_SYNTHESIS_MODE=warn
```

Set in the local development environment first, not in CI.

**What to watch:**
- Does `mindState` accurately reflect the system state?
- Are repair vectors useful — specific, actionable, not generic?
- Are there false positives (system appears healthy but mind says `agitated`)?
- If false positives occur, tune registry thresholds (§5.5) before disabling the system

**Exit criteria for warn mode:**
- Warn-mode output has been observed across at least several real debugging sessions
- No repair vector has been "obviously wrong" — recommending the opposite of the actual fix
- Golden tests still pass after any threshold tuning

### 9.4 Phase 3 — Gate Mode Candidate

Enable gate mode only after the exit criteria in §9.3 are met.

**Gate mode in CI:**
```bash
CLERI_RAID_SYNTHESIS_MODE=gate
```

**Gate policy:**
```javascript
// shouldFailDiagnosticGate returns true only for "fractured" mind state
// It does NOT fail for "agitated" or "overstimulated" — those go to warn logs
if (shouldFailDiagnosticGate(report.synthesis.mind)) {
  process.exit(1);
}
```

**Do not gate on `mindState !== 'coherent'` directly.** That includes `agitated` and `overstimulated`, which should be observed and tuned rather than immediately blocked. Gate on `fractured` only.

### 9.5 Emergency Disable

If gate mode produces false positives that block CI:

```bash
CLERI_RAID_SYNTHESIS_MODE=shadow
```

Return to shadow mode. Investigate and fix the registry or thresholds. Do not delete or revert synthesis files — the system exists to be observed, not to disappear when it disagrees.

---

## 10. FAILURE MODE REFERENCE

| Symptom | Likely Cause | Resolution |
|---|---|---|
| All subunits classified as `missing` | Signal keys in registry do not match BytecodeHealth output keys | Fix subunit `signalKey` values in `CleriRaidComplexRegistry.js` |
| `health` is too high despite obvious failure | A missing required subunit is not triggering `critical` override | Confirm the subunit is in the `expected` map with `target > 0` |
| `health` is chronically low with no visible failure | Registry thresholds too strict | Loosen `limitingRatio` and `deviation` in the complex definition |
| Repair vectors recommend `observe` for known problems | Subunit state is classified as something other than the true cause | Check `thresholds` — the signal may be just inside `stable` range |
| Output key order changes between runs | Arrays not sorted deterministically | Ensure repair vectors and faults use the deterministic sort functions |
| Golden test flakes | Floating precision change or key order difference | Round all outward-facing scores to 6dp; canonicalize keys in adapter |
| `report.synthesis` affects `report.checksum` | Synthesis field was added before checksum was computed | Ensure checksum is computed from `violations` + `passing` + `summary` only, not from `synthesis` |
| Runtime throws during synthesis | Shadow mode hook has an unguarded error path | Wrap the `maybeRunDiagnosticSynthesis` call in try/catch in the runner; emit error to stderr, do not re-throw |
| Warn mode output is too frequent | Thresholds too strict or signals are genuinely degraded | Tune thresholds in registry; investigate underlying signal health |
| Gate mode blocks valid CI runs | Gate policy is too aggressive | Revert to `shadow` mode; audit which complex is `fractured` and why |

---

## 11. GLOSSARY

| Term | Definition |
|---|---|
| **BytecodeHealth** | The existing diagnostic primitive layer. Produces health signals, statuses, checksums, packets, or state reports. |
| **ByteCode Diagnostic Synthesis** | The higher-order system that converts BytecodeHealth signals into compositional complex-level diagnostics. |
| **Cleri-Raid** | The predictive diagnostic framework inside Scholomance. Detects architecture failure, state drift, bytecode anomalies, and system incoherence. |
| **CleriRaidMind** | The orchestration module that evaluates diagnostic complexes and returns raid-level intelligence. |
| **Diagnostic Subunit** | A single signal consumed by a diagnostic complex. Example: `AUTH_SENDER_MATCH`. |
| **Diagnostic Complex** | A named group of related diagnostic subunits. Example: `AUTH_HANDSHAKE_COMPLEX`. |
| **Stoichiometric Ratio** | The expected proportional contribution of a diagnostic subunit inside a complex. |
| **Observed Ratio** | The actual normalized strength of a diagnostic subunit in the current snapshot. |
| **Limiting Subunit** | A required subunit that exists but is too weak relative to the expected ratio. Triggers `increase_coverage`. |
| **Missing Subunit** | A required subunit with no observed signal (`actual ≈ 0`). Triggers `restore_signal`. Overrides complex health to `critical`. |
| **Excess Subunit** | A signal that is too strong relative to the expected ratio. Usually indicates noise or repeated errors. Triggers `reduce_noise`. |
| **Unstable Subunit** | A signal that deviates significantly but does not qualify as missing, limiting, or excessive. Triggers `inspect_shape`. |
| **Complex Health** | A `0..1` score representing how well a diagnostic complex assembled. |
| **Global Health** | The average health of all evaluated diagnostic complexes. |
| **Mind State** | The raid-level condition inferred from all complexes: `coherent`, `overstimulated`, `agitated`, or `fractured`. |
| **Repair Vector** | A deterministic list of recommended debugging actions, one item per non-stable subunit. |
| **QBIT Payload** | A compact coherence object: `{ qbitType, raidId, collapseConfidence, complexCount, unstableComplexes }`. |
| **Shadow Mode** | The first rollout mode. Observes and reports; does not block or emit warnings. |
| **Warn Mode** | The second rollout mode. Emits structured stderr warnings when mind is not coherent; does not block. |
| **Gate Mode** | The final rollout mode. Can block CI or runtime progression when `shouldFailDiagnosticGate` returns `true`. |
| **Golden Test** | A deterministic test that compares exact output of a known input against a saved expected output. |
| **Coherence** | The degree to which diagnostic signals agree with each other and with expected architecture structure. |

---

*Signed,*
**Scholomance V13 Engineering Corps**
*2026-05-24*
