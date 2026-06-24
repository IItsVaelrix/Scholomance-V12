# Photonic Quantization Bridge PDR.md

## 0. Document status

**Project name:** Photonic Quantization Bridge  
**Codex name:** Lightbound Vector Cortex  
**Document type:** Product Design Requirements / Engineering Handoff  
**Target codebase:** Scholomance / Codex  
**Primary implementation mode:** Experimental, deterministic, shadow-first adapter layer  
**Do not treat as:** A completed photonic hardware implementation, an AGI brain, or a production inference engine

---

## 1. Executive summary

### What to build

Build a deterministic **Photonic Quantization Bridge** module that models how compressed AI vector representations, especially rotation-aware KV-cache/vector quantization schemes, could be expressed as a hardware-facing operation graph suitable for future photonic acceleration research.

The first implementation must be a **software-only bridge and simulator**. It should not claim to run real photonic hardware. It should produce:

1. A stable vector packet schema.
2. A deterministic quantization/operation graph representation.
3. A compatibility report explaining which operations are photonic-friendly.
4. A shadow-mode simulator that estimates execution shape, risks, and boundaries.
5. A diagnostic payload suitable for Codex/Scholomance debugging.
6. An adapter export that allows the rest of the codebase to call the bridge without depending on unstable internal contracts.

### Why it exists

The conceptual synthesis is:

```text
compressed AI vector math
+ rotation-aware quantization
+ physical light-friendly matrix/vector operations
= possible future hardware/software co-design layer
```

The core insight is that compression is not only storage reduction. Compression can become an **execution contract**. A compressed vector representation can describe what math needs to happen, what precision is acceptable, and which portions are suitable for optical acceleration.

### The safe implementation boundary

This PDR does **not** ask the implementation agent to build photonic hardware support. It asks for a deterministic research/prototype layer that can later feed real hardware backends.

Phase 1 should answer:

```text
Given a compressed-vector job, can Scholomance describe it as a deterministic operation graph and score its photonic compatibility?
```

Phase 1 should not answer:

```text
Can Scholomance execute LLM inference on actual optical hardware?
```

### Change classification

**Architectural**, with **structural** module additions.  
No existing public APIs should be broken.

---

## 2. Context

The current Scholomance / Codex ecosystem already uses bytecode-like contracts, deterministic transformations, diagnostic encoding, and substrate bridges. PixelBrain turns formulas into coordinates, images into bytecode formulas, and visual concepts into deterministic renderable systems. This proposed bridge applies the same doctrine to AI vector computation.

The Photonic Quantization Bridge should sit beside existing deterministic engines, not replace them.

### Conceptual model

```text
Semantic vector
→ rotation-aware quantized packet
→ photonic operation graph
→ simulated compatibility report
→ future hardware execution target
```

The metaphor is a **glass nerve**: not consciousness, not a full brain, but a specialized vector-execution organ that translates compressed mathematical thought into light-friendly operations.

### Research anchors

These anchors justify the direction but do not imply the feature is already production-ready:

- TurboQuant research describes online vector quantization, random rotations, scalar quantization, QJL residual correction, and KV-cache compression targets.
  - https://arxiv.org/abs/2504.19874
  - https://research.google/blog/turboquant-redefining-ai-efficiency-with-extreme-compression/
- Photonic accelerators are actively researched for matrix multiplication, matrix-vector multiplication, and MAC-heavy AI operations.
  - https://www.nature.com/articles/s41586-025-08786-6
  - https://www.nature.com/articles/s41377-022-00717-8
- Transformer photonics remains early and must account for electro-optic conversion, memory movement, nonlinear operations, calibration, and resource limits.
  - https://arxiv.org/abs/2510.01673

---

## 3. Target integration area

### New module area

Create a new isolated module subtree:

```text
src/lib/photonic-quantization/
  photonic.config.js
  photonic-types.js
  photonic-errors.js
  photonic-diagnostics.js
  vector-packet.schema.js
  vector-codec.js
  operation-graph.js
  compatibility-score.js
  simulator.js
  index.js
```

### Adapter integration

Add a narrow adapter export:

```text
src/lib/engine.adapter.js
```

New export:

```js
export { analyzePhotonicQuantizationBridge } from './photonic-quantization/index.js';
```

Only add this export if `engine.adapter.js` is the established gateway for experimental engine access. If not, create a local adapter:

```text
src/lib/photonic-quantization/adapter.js
```

and expose it through the existing app-facing gateway later.

### Tests

Create test coverage:

```text
tests/photonic-quantization/
  vector-packet.schema.test.js
  operation-graph.test.js
  compatibility-score.test.js
  simulator.shadow.test.js
  diagnostics.test.js
  deterministic-output.test.js
  adapter.contract.test.js
```

### Optional future UI route

Do not build UI in Phase 1 unless explicitly requested. If later needed:

```text
src/routes/internal/photonic-bridge/
  PhotonicBridgeLab.jsx
  photonicBridgeLab.css
```

Keep UI behind admin/internal gating.

---

## 4. Core concept

### Plain-language explanation

The bridge accepts vector-like data and metadata, validates it, describes the computation as an operation graph, and scores which parts are compatible with photonic-style acceleration.

It should support jobs such as:

```text
"Estimate inner product over compressed K/V vector packet"
"Build an operation graph for rotation + scalar quantization + residual correction"
"Classify which steps are linear, nonlinear, memory-bound, or control-bound"
"Emit deterministic diagnostics that explain the hardware/software boundary"
```

### What the bridge does

```text
Input packet
→ validate shape and budget
→ normalize deterministic metadata
→ build op graph
→ classify operations
→ calculate compatibility score
→ simulate report in shadow/warn/gate mode
```

### What the bridge does not do

```text
No real optical hardware execution
No GPU kernel implementation
No model inference loop replacement
No automatic mutation of TurboQuant internals
No production gating until shadow reports are stable
```

### Why this belongs in Scholomance

Scholomance already treats computational representation as a first-class artifact. This bridge expands that philosophy from visual formulas and bytecode into vector-execution IR.

The important doctrine:

```text
A representation is not passive data.
A representation can be a future execution substrate.
```

---

## 5. Implementation philosophy

Follow these rules:

1. **Small composable edits.** New module subtree first. Existing files get adapter-only changes.
2. **No hard dependency on hardware.** The first bridge is a deterministic simulator.
3. **No silent assumptions.** Every compatibility report must list assumptions.
4. **Deterministic by default.** Stable sorting, seeded hashing, no `Math.random()`.
5. **Adapter layers over direct imports.** Avoid coupling UI, inference, and experimental vector logic.
6. **Shadow before warn before gate.** Never block existing behavior until reports prove useful.
7. **Preserve public APIs.** Existing callers must continue working.
8. **Diagnostics must be machine-readable and human-readable.**
9. **No "instant light brain" language in code.** Keep names credible: `photonic-quantization`, `operationGraph`, `compatibilityScore`.
10. **Use explicit schemas.** Validation belongs at the boundary.

---

## 6. Spec sheet

| Field | Value |
|---|---|
| Feature name | Photonic Quantization Bridge |
| Codex nickname | Lightbound Vector Cortex |
| Classification | Architectural + structural |
| Phase 1 runtime | Software-only deterministic simulator |
| Primary input | Vector packet metadata and optional typed vector data |
| Primary output | PhotonicBridgeReport |
| Default rollout mode | `shadow` |
| Hard enforcement | Disabled in Phase 1 |
| Public API | `analyzePhotonicQuantizationBridge(input, options)` |
| Determinism requirement | Same input produces same report hash |
| Forbidden behavior | `Math.random()`, uncontrolled timestamps, nondeterministic object ordering |
| Test runner | Vitest via pnpm |
| Main risk | Overclaiming hardware execution or coupling research prototype to production inference |

### Input contract

```js
/**
 * @typedef {Object} PhotonicVectorPacket
 * @property {string} packetId
 * @property {'kv-cache'|'embedding'|'attention-probe'|'manual'} sourceKind
 * @property {number} dimension
 * @property {number} bitWidth
 * @property {'float32'|'int8'|'int4'|'int2'|'binary'|'packed'} storageKind
 * @property {'none'|'random-rotation'|'hadamard'|'polar'|'custom'} rotationKind
 * @property {'none'|'scalar'|'polar'|'qjl-residual'|'custom'} quantizationKind
 * @property {'none'|'qjl'|'sign-bit'|'residual-codebook'|'custom'} residualKind
 * @property {'inner-product'|'matrix-vector'|'matrix-matrix'|'similarity-search'|'diagnostic'} targetOperation
 * @property {Array<number>|Float32Array|Int8Array|Uint8Array} [data]
 * @property {Object} [metadata]
 */
```

### Output contract

```js
/**
 * @typedef {Object} PhotonicBridgeReport
 * @property {string} schemaVersion
 * @property {string} packetId
 * @property {boolean} ok
 * @property {'shadow'|'warn'|'gate'} mode
 * @property {number} compatibilityScore
 * @property {string} compatibilityGrade
 * @property {PhotonicOperationGraph} operationGraph
 * @property {Array<PhotonicDiagnostic>} diagnostics
 * @property {Array<string>} assumptions
 * @property {Array<string>} blockedReasons
 * @property {string} reportHash
 */
```

### Operation graph contract

```js
/**
 * @typedef {Object} PhotonicOperation
 * @property {string} id
 * @property {'ROTATE'|'QUANTIZE'|'RESIDUAL'|'MVM'|'INNER_PRODUCT'|'NONLINEAR'|'MEMORY_MOVE'|'CONTROL'} kind
 * @property {'photonic-friendly'|'electronic-required'|'hybrid'|'unsupported'} executionClass
 * @property {number} order
 * @property {Object} params
 * @property {Array<string>} dependsOn
 */

/**
 * @typedef {Object} PhotonicOperationGraph
 * @property {string} graphId
 * @property {Array<PhotonicOperation>} operations
 * @property {Array<string>} linearPath
 * @property {Array<string>} electronicBoundaries
 * @property {string} graphHash
 */
```

---

## 7. Assumptions and unknowns

### Assumptions

1. The current Scholomance codebase supports modular `src/lib` additions.
2. The project uses `pnpm` and Vitest.
3. `engine.adapter.js` or an equivalent gateway exists for app-safe exports.
4. Phase 1 only needs simulated compatibility, not real GPU/photonic execution.
5. Input vectors may be absent. Metadata-only analysis must still work.
6. The bridge will eventually integrate with TurboQuant-like vector systems, but Phase 1 must not depend on a specific implementation.
7. Diagnostics should follow existing bytecode/error-reporting culture where possible.

### Unknowns

1. Exact existing TurboQuant module path, if any.
2. Whether current Scholomance uses TypeScript or JS-only in the target subtree.
3. Existing feature flag framework.
4. Exact adapter gateway conventions.
5. Whether vector data is currently available in browser, server, or both.
6. Whether large vector arrays should be allowed client-side.
7. Whether the project already has deterministic hash helpers outside PixelBrain shared utilities.

### Resolution strategy

When a contract is uncertain, create a local adapter and small pure functions. Do not refactor shared systems until a maintainer confirms the canonical path.

---

## 8. Architecture diagram / file map

### High-level architecture

```text
Caller
  |
  v
analyzePhotonicQuantizationBridge(input, options)
  |
  +--> validatePhotonicVectorPacket()
  |
  +--> buildPhotonicOperationGraph()
  |
  +--> scorePhotonicCompatibility()
  |
  +--> runPhotonicShadowSimulator()
  |
  +--> createPhotonicDiagnostics()
  |
  v
PhotonicBridgeReport
```

### Runtime mode flow

```text
off
  -> return disabled report

shadow
  -> generate report, never throw for compatibility failure

warn
  -> generate report, add warning diagnostics for low score

gate
  -> generate report, throw only for schema-invalid or explicitly blocked operation
```

### File map

```text
src/lib/photonic-quantization/
  photonic.config.js
    Default flags, thresholds, mode names.

  photonic-types.js
    JSDoc typedefs only. No runtime behavior.

  photonic-errors.js
    Error helpers and stable error codes.

  photonic-diagnostics.js
    Diagnostic builder, deterministic sorting, report hash.

  vector-packet.schema.js
    Boundary validation and normalization.

  vector-codec.js
    Metadata-only codec classifier. Does not implement real TurboQuant.

  operation-graph.js
    Converts normalized packet into ordered operation graph.

  compatibility-score.js
    Deterministic score formula and grade mapping.

  simulator.js
    Shadow simulator for phase boundaries and warnings.

  index.js
    Public module API.

tests/photonic-quantization/
  *.test.js
```

---

## 9. Step-by-step implementation plan

## Step 1 - Add config and rollout modes

### Why

The bridge must run safely before final enforcement. Default to shadow mode.

### File

```text
src/lib/photonic-quantization/photonic.config.js
```

### Code

```js
export const PHOTONIC_BRIDGE_MODES = Object.freeze({
  OFF: 'off',
  SHADOW: 'shadow',
  WARN: 'warn',
  GATE: 'gate',
});

export const PHOTONIC_EXECUTION_CLASSES = Object.freeze({
  PHOTONIC_FRIENDLY: 'photonic-friendly',
  ELECTRONIC_REQUIRED: 'electronic-required',
  HYBRID: 'hybrid',
  UNSUPPORTED: 'unsupported',
});

export const DEFAULT_PHOTONIC_BRIDGE_CONFIG = Object.freeze({
  schemaVersion: 'PBQ-v1',
  mode: PHOTONIC_BRIDGE_MODES.SHADOW,
  minWarnScore: 0.58,
  minGateScore: 0.72,
  maxDimension: 131072,
  allowedBitWidths: Object.freeze([1, 2, 3, 4, 8, 16, 32]),
  allowedStorageKinds: Object.freeze([
    'float32',
    'int8',
    'int4',
    'int2',
    'binary',
    'packed',
  ]),
});
```

### Risk reduced

Prevents the feature from blocking existing systems before validation data exists.

---

## Step 2 - Add deterministic utilities

### Why

No `Math.random()`, no timestamp-based report IDs, no unstable JSON ordering.

### File

```text
src/lib/photonic-quantization/photonic-diagnostics.js
```

### Code

```js
function stableStringify(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  const entries = Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`);

  return `{${entries.join(',')}}`;
}

export function hashString(value) {
  const input = String(value ?? '');
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).toUpperCase().padStart(8, '0');
}

export function hashObject(value) {
  return hashString(stableStringify(value));
}

export function createDiagnostic(code, severity, message, details = {}) {
  return Object.freeze({
    code: String(code || 'PHOTONIC_UNKNOWN'),
    severity: String(severity || 'info'),
    message: String(message || ''),
    details: Object.freeze({ ...details }),
  });
}

export function sortDiagnostics(diagnostics) {
  return Object.freeze(
    [...(Array.isArray(diagnostics) ? diagnostics : [])]
      .sort((left, right) => {
        const severityOrder = { error: 0, warn: 1, info: 2 };
        const severityDelta = (severityOrder[left.severity] ?? 9) - (severityOrder[right.severity] ?? 9);
        if (severityDelta !== 0) return severityDelta;
        return String(left.code).localeCompare(String(right.code));
      })
  );
}
```

### Risk reduced

Ensures output is snapshot-testable and agent-readable.

---

## Step 3 - Add vector packet schema validation

### Why

All inputs must be normalized at the boundary. Invalid packet shape should produce deterministic errors.

### File

```text
src/lib/photonic-quantization/vector-packet.schema.js
```

### Code

```js
import { DEFAULT_PHOTONIC_BRIDGE_CONFIG } from './photonic.config.js';
import { createDiagnostic } from './photonic-diagnostics.js';

const SOURCE_KINDS = new Set(['kv-cache', 'embedding', 'attention-probe', 'manual']);
const ROTATION_KINDS = new Set(['none', 'random-rotation', 'hadamard', 'polar', 'custom']);
const QUANTIZATION_KINDS = new Set(['none', 'scalar', 'polar', 'qjl-residual', 'custom']);
const RESIDUAL_KINDS = new Set(['none', 'qjl', 'sign-bit', 'residual-codebook', 'custom']);
const TARGET_OPERATIONS = new Set([
  'inner-product',
  'matrix-vector',
  'matrix-matrix',
  'similarity-search',
  'diagnostic',
]);

function normalizeEnum(value, allowed, fallback) {
  const normalized = String(value || fallback).trim().toLowerCase();
  return allowed.has(normalized) ? normalized : fallback;
}

function normalizeBitWidth(value, allowed) {
  const numeric = Number(value);
  if (!Number.isInteger(numeric)) return 8;
  return allowed.includes(numeric) ? numeric : 8;
}

export function validatePhotonicVectorPacket(input, config = DEFAULT_PHOTONIC_BRIDGE_CONFIG) {
  const diagnostics = [];

  if (!input || typeof input !== 'object') {
    return {
      ok: false,
      packet: null,
      diagnostics: [
        createDiagnostic('PHOTONIC_PACKET_INVALID', 'error', 'Input must be an object.'),
      ],
    };
  }

  const dimension = Math.max(1, Math.min(
    Number.isInteger(Number(input.dimension)) ? Number(input.dimension) : 1,
    config.maxDimension
  ));

  if (!Number.isInteger(Number(input.dimension)) || Number(input.dimension) <= 0) {
    diagnostics.push(createDiagnostic(
      'PHOTONIC_DIMENSION_DEFAULTED',
      'warn',
      'dimension was missing or invalid and defaulted to 1.',
      { provided: input.dimension }
    ));
  }

  if (Number(input.dimension) > config.maxDimension) {
    diagnostics.push(createDiagnostic(
      'PHOTONIC_DIMENSION_CLAMPED',
      'warn',
      'dimension exceeded maxDimension and was clamped.',
      { provided: input.dimension, maxDimension: config.maxDimension }
    ));
  }

  const storageKind = String(input.storageKind || 'float32').trim().toLowerCase();
  const safeStorageKind = config.allowedStorageKinds.includes(storageKind)
    ? storageKind
    : 'float32';

  if (safeStorageKind !== storageKind) {
    diagnostics.push(createDiagnostic(
      'PHOTONIC_STORAGE_DEFAULTED',
      'warn',
      'storageKind was unsupported and defaulted to float32.',
      { provided: input.storageKind }
    ));
  }

  const packetId = String(input.packetId || `packet_${dimension}_${safeStorageKind}`).trim();

  const packet = Object.freeze({
    packetId,
    sourceKind: normalizeEnum(input.sourceKind, SOURCE_KINDS, 'manual'),
    dimension,
    bitWidth: normalizeBitWidth(input.bitWidth, config.allowedBitWidths),
    storageKind: safeStorageKind,
    rotationKind: normalizeEnum(input.rotationKind, ROTATION_KINDS, 'none'),
    quantizationKind: normalizeEnum(input.quantizationKind, QUANTIZATION_KINDS, 'none'),
    residualKind: normalizeEnum(input.residualKind, RESIDUAL_KINDS, 'none'),
    targetOperation: normalizeEnum(input.targetOperation, TARGET_OPERATIONS, 'diagnostic'),
    hasData: Boolean(input.data),
    metadata: Object.freeze({ ...(input.metadata || {}) }),
  });

  return {
    ok: diagnostics.every((diagnostic) => diagnostic.severity !== 'error'),
    packet,
    diagnostics,
  };
}
```

### Risk reduced

Prevents raw experimental input from leaking unpredictable shape into the operation graph.

---

## Step 4 - Add codec classifier

### Why

The bridge should classify vector compression metadata without implementing or mutating TurboQuant internals.

### File

```text
src/lib/photonic-quantization/vector-codec.js
```

### Code

```js
export function classifyVectorCodec(packet) {
  const rotationFit = {
    none: 0.25,
    'random-rotation': 0.9,
    hadamard: 0.82,
    polar: 0.76,
    custom: 0.5,
  }[packet.rotationKind] ?? 0.4;

  const quantizationFit = {
    none: 0.25,
    scalar: 0.7,
    polar: 0.82,
    'qjl-residual': 0.78,
    custom: 0.5,
  }[packet.quantizationKind] ?? 0.4;

  const residualFit = {
    none: 0.45,
    qjl: 0.82,
    'sign-bit': 0.75,
    'residual-codebook': 0.62,
    custom: 0.5,
  }[packet.residualKind] ?? 0.4;

  const bitBudgetFit = packet.bitWidth <= 4 ? 0.9 : packet.bitWidth <= 8 ? 0.72 : 0.45;

  return Object.freeze({
    rotationFit,
    quantizationFit,
    residualFit,
    bitBudgetFit,
    notes: Object.freeze([
      `rotationKind=${packet.rotationKind}`,
      `quantizationKind=${packet.quantizationKind}`,
      `residualKind=${packet.residualKind}`,
      `bitWidth=${packet.bitWidth}`,
    ]),
  });
}
```

### Risk reduced

Separates analysis from execution. The bridge can reason about codecs without owning the codec implementation.

---

## Step 5 - Build the operation graph

### Why

The operation graph is the heart of the bridge. It converts a compressed vector packet into a stable list of operations and hardware boundaries.

### File

```text
src/lib/photonic-quantization/operation-graph.js
```

### Code

```js
import { PHOTONIC_EXECUTION_CLASSES } from './photonic.config.js';
import { hashObject } from './photonic-diagnostics.js';

function createOperation(id, kind, executionClass, order, params = {}, dependsOn = []) {
  return Object.freeze({
    id,
    kind,
    executionClass,
    order,
    params: Object.freeze({ ...params }),
    dependsOn: Object.freeze([...dependsOn].sort()),
  });
}

function targetOperationKind(targetOperation) {
  if (targetOperation === 'inner-product') return 'INNER_PRODUCT';
  if (targetOperation === 'matrix-vector') return 'MVM';
  if (targetOperation === 'matrix-matrix') return 'MVM';
  if (targetOperation === 'similarity-search') return 'INNER_PRODUCT';
  return 'CONTROL';
}

export function buildPhotonicOperationGraph(packet) {
  const operations = [];
  let order = 0;

  const inputId = 'op_input_load';
  operations.push(createOperation(
    inputId,
    'MEMORY_MOVE',
    PHOTONIC_EXECUTION_CLASSES.ELECTRONIC_REQUIRED,
    order += 1,
    { storageKind: packet.storageKind, dimension: packet.dimension }
  ));

  let previousId = inputId;

  if (packet.rotationKind !== 'none') {
    const id = 'op_rotation';
    operations.push(createOperation(
      id,
      'ROTATE',
      PHOTONIC_EXECUTION_CLASSES.HYBRID,
      order += 1,
      { rotationKind: packet.rotationKind },
      [previousId]
    ));
    previousId = id;
  }

  if (packet.quantizationKind !== 'none') {
    const id = 'op_quantize';
    operations.push(createOperation(
      id,
      'QUANTIZE',
      PHOTONIC_EXECUTION_CLASSES.ELECTRONIC_REQUIRED,
      order += 1,
      { quantizationKind: packet.quantizationKind, bitWidth: packet.bitWidth },
      [previousId]
    ));
    previousId = id;
  }

  if (packet.residualKind !== 'none') {
    const id = 'op_residual';
    operations.push(createOperation(
      id,
      'RESIDUAL',
      PHOTONIC_EXECUTION_CLASSES.HYBRID,
      order += 1,
      { residualKind: packet.residualKind },
      [previousId]
    ));
    previousId = id;
  }

  const computeId = 'op_target_compute';
  const computeKind = targetOperationKind(packet.targetOperation);
  operations.push(createOperation(
    computeId,
    computeKind,
    computeKind === 'CONTROL'
      ? PHOTONIC_EXECUTION_CLASSES.ELECTRONIC_REQUIRED
      : PHOTONIC_EXECUTION_CLASSES.PHOTONIC_FRIENDLY,
    order += 1,
    { targetOperation: packet.targetOperation },
    [previousId]
  ));

  const sortedOperations = operations.sort((left, right) => left.order - right.order);

  const linearPath = sortedOperations
    .filter((operation) => ['ROTATE', 'MVM', 'INNER_PRODUCT'].includes(operation.kind))
    .map((operation) => operation.id);

  const electronicBoundaries = sortedOperations
    .filter((operation) => operation.executionClass === PHOTONIC_EXECUTION_CLASSES.ELECTRONIC_REQUIRED)
    .map((operation) => operation.id);

  const graphBody = {
    packetId: packet.packetId,
    operations: sortedOperations,
    linearPath,
    electronicBoundaries,
  };

  return Object.freeze({
    graphId: `photonic_graph_${hashObject(graphBody)}`,
    operations: Object.freeze(sortedOperations),
    linearPath: Object.freeze(linearPath),
    electronicBoundaries: Object.freeze(electronicBoundaries),
    graphHash: hashObject(graphBody),
  });
}
```

### Risk reduced

Provides a stable internal IR. Future hardware backends can consume the graph without changing the caller contract.

---

## Step 6 - Add deterministic compatibility scoring

### Why

The bridge needs useful output even before hardware exists. A deterministic score lets agents compare packet shapes and track regressions.

### File

```text
src/lib/photonic-quantization/compatibility-score.js
```

### Code

```js
import { PHOTONIC_EXECUTION_CLASSES } from './photonic.config.js';

function roundScore(value) {
  return Number(Math.max(0, Math.min(1, value)).toFixed(4));
}

function gradeFromScore(score) {
  if (score >= 0.86) return 'S';
  if (score >= 0.72) return 'A';
  if (score >= 0.58) return 'B';
  if (score >= 0.42) return 'C';
  return 'D';
}

export function scorePhotonicCompatibility(packet, codecProfile, operationGraph) {
  const totalOps = Math.max(1, operationGraph.operations.length);

  const photonicFriendlyOps = operationGraph.operations
    .filter((operation) => operation.executionClass === PHOTONIC_EXECUTION_CLASSES.PHOTONIC_FRIENDLY)
    .length;

  const hybridOps = operationGraph.operations
    .filter((operation) => operation.executionClass === PHOTONIC_EXECUTION_CLASSES.HYBRID)
    .length;

  const electronicRequiredOps = operationGraph.operations
    .filter((operation) => operation.executionClass === PHOTONIC_EXECUTION_CLASSES.ELECTRONIC_REQUIRED)
    .length;

  const opPurity = roundScore((photonicFriendlyOps + hybridOps * 0.5) / totalOps);
  const boundaryPenalty = roundScore(electronicRequiredOps / totalOps);

  const targetFit = {
    'inner-product': 0.92,
    'matrix-vector': 0.9,
    'matrix-matrix': 0.86,
    'similarity-search': 0.78,
    diagnostic: 0.35,
  }[packet.targetOperation] ?? 0.35;

  const score = roundScore(
    (codecProfile.rotationFit * 0.22)
    + (codecProfile.quantizationFit * 0.16)
    + (codecProfile.residualFit * 0.12)
    + (codecProfile.bitBudgetFit * 0.14)
    + (opPurity * 0.22)
    + (targetFit * 0.14)
    - (boundaryPenalty * 0.08)
  );

  return Object.freeze({
    score,
    grade: gradeFromScore(score),
    factors: Object.freeze({
      rotationFit: codecProfile.rotationFit,
      quantizationFit: codecProfile.quantizationFit,
      residualFit: codecProfile.residualFit,
      bitBudgetFit: codecProfile.bitBudgetFit,
      opPurity,
      targetFit,
      boundaryPenalty,
    }),
  });
}
```

### Risk reduced

Turns the idea into a measurable engineering artifact instead of a vague research note.

---

## Step 7 - Add shadow simulator

### Why

Phase 1 should simulate phase boundaries and warn about invalid claims.

### File

```text
src/lib/photonic-quantization/simulator.js
```

### Code

```js
import { PHOTONIC_BRIDGE_MODES } from './photonic.config.js';
import { createDiagnostic } from './photonic-diagnostics.js';

export function runPhotonicShadowSimulator({
  packet,
  operationGraph,
  compatibility,
  config,
}) {
  const diagnostics = [];
  const blockedReasons = [];
  const assumptions = [
    'Phase 1 is software-only and does not execute real photonic hardware.',
    'Photonic-friendly means linear-algebra-compatible, not hardware-proven.',
    'Electronic boundaries include memory movement, quantization control, nonlinear operations, and residual handling.',
  ];

  if (operationGraph.electronicBoundaries.length > 0) {
    diagnostics.push(createDiagnostic(
      'PHOTONIC_ELECTRONIC_BOUNDARIES_PRESENT',
      'info',
      'Operation graph includes electronic-required boundaries.',
      { boundaries: operationGraph.electronicBoundaries }
    ));
  }

  if (packet.targetOperation === 'diagnostic') {
    diagnostics.push(createDiagnostic(
      'PHOTONIC_DIAGNOSTIC_ONLY',
      'warn',
      'Packet targetOperation is diagnostic, so compute compatibility is limited.',
      { targetOperation: packet.targetOperation }
    ));
  }

  if (compatibility.score < config.minWarnScore) {
    diagnostics.push(createDiagnostic(
      'PHOTONIC_LOW_COMPATIBILITY',
      config.mode === PHOTONIC_BRIDGE_MODES.GATE ? 'error' : 'warn',
      'Compatibility score is below the configured warning threshold.',
      { score: compatibility.score, minWarnScore: config.minWarnScore }
    ));
  }

  if (config.mode === PHOTONIC_BRIDGE_MODES.GATE && compatibility.score < config.minGateScore) {
    blockedReasons.push(`compatibilityScore ${compatibility.score} < minGateScore ${config.minGateScore}`);
  }

  return Object.freeze({
    diagnostics,
    assumptions,
    blockedReasons: Object.freeze(blockedReasons),
  });
}
```

### Risk reduced

Stops the feature from overclaiming. The simulator explicitly says what is assumed, what is blocked, and what remains electronic.

---

## Step 8 - Add public API

### Why

Expose one stable API, not internal pieces.

### File

```text
src/lib/photonic-quantization/index.js
```

### Code

```js
import {
  DEFAULT_PHOTONIC_BRIDGE_CONFIG,
  PHOTONIC_BRIDGE_MODES,
} from './photonic.config.js';
import { validatePhotonicVectorPacket } from './vector-packet.schema.js';
import { classifyVectorCodec } from './vector-codec.js';
import { buildPhotonicOperationGraph } from './operation-graph.js';
import { scorePhotonicCompatibility } from './compatibility-score.js';
import { runPhotonicShadowSimulator } from './simulator.js';
import {
  createDiagnostic,
  hashObject,
  sortDiagnostics,
} from './photonic-diagnostics.js';

function mergeConfig(options = {}) {
  return Object.freeze({
    ...DEFAULT_PHOTONIC_BRIDGE_CONFIG,
    ...(options.config || {}),
    mode: options.mode || options.config?.mode || DEFAULT_PHOTONIC_BRIDGE_CONFIG.mode,
  });
}

export function analyzePhotonicQuantizationBridge(input, options = {}) {
  const config = mergeConfig(options);

  if (config.mode === PHOTONIC_BRIDGE_MODES.OFF) {
    const report = {
      schemaVersion: config.schemaVersion,
      packetId: String(input?.packetId || 'disabled'),
      ok: true,
      mode: config.mode,
      compatibilityScore: 0,
      compatibilityGrade: 'OFF',
      operationGraph: null,
      diagnostics: [
        createDiagnostic('PHOTONIC_BRIDGE_DISABLED', 'info', 'Photonic bridge is disabled.'),
      ],
      assumptions: [],
      blockedReasons: [],
    };

    return Object.freeze({
      ...report,
      reportHash: hashObject(report),
    });
  }

  const validation = validatePhotonicVectorPacket(input, config);

  if (!validation.ok || !validation.packet) {
    const report = {
      schemaVersion: config.schemaVersion,
      packetId: String(input?.packetId || 'invalid'),
      ok: false,
      mode: config.mode,
      compatibilityScore: 0,
      compatibilityGrade: 'D',
      operationGraph: null,
      diagnostics: sortDiagnostics(validation.diagnostics),
      assumptions: [],
      blockedReasons: ['invalid packet schema'],
    };

    return Object.freeze({
      ...report,
      reportHash: hashObject(report),
    });
  }

  const packet = validation.packet;
  const codecProfile = classifyVectorCodec(packet);
  const operationGraph = buildPhotonicOperationGraph(packet);
  const compatibility = scorePhotonicCompatibility(packet, codecProfile, operationGraph);

  const simulation = runPhotonicShadowSimulator({
    packet,
    operationGraph,
    compatibility,
    config,
  });

  const allDiagnostics = sortDiagnostics([
    ...validation.diagnostics,
    ...simulation.diagnostics,
  ]);

  const ok = config.mode === PHOTONIC_BRIDGE_MODES.GATE
    ? simulation.blockedReasons.length === 0
    : true;

  const report = {
    schemaVersion: config.schemaVersion,
    packetId: packet.packetId,
    ok,
    mode: config.mode,
    compatibilityScore: compatibility.score,
    compatibilityGrade: compatibility.grade,
    operationGraph,
    diagnostics: allDiagnostics,
    assumptions: simulation.assumptions,
    blockedReasons: simulation.blockedReasons,
    scoringFactors: compatibility.factors,
  };

  return Object.freeze({
    ...report,
    reportHash: hashObject(report),
  });
}

export {
  DEFAULT_PHOTONIC_BRIDGE_CONFIG,
  PHOTONIC_BRIDGE_MODES,
};
```

### Risk reduced

Gives other agents one obvious function to use and test.

---

## Step 9 - Add adapter export

### Why

Do not make UI or unrelated modules import internals.

### File

```text
src/lib/engine.adapter.js
```

### New code section

```js
// Photonic Quantization Bridge - experimental, shadow-first research adapter.
// Keep as a narrow export. Do not import internal files directly from UI.
export {
  analyzePhotonicQuantizationBridge,
  PHOTONIC_BRIDGE_MODES,
} from './photonic-quantization/index.js';
```

### If the adapter path is uncertain

Create:

```text
src/lib/photonic-quantization/adapter.js
```

```js
export {
  analyzePhotonicQuantizationBridge,
  PHOTONIC_BRIDGE_MODES,
} from './index.js';
```

Then defer main gateway integration until the canonical adapter file is confirmed.

### Risk reduced

Preserves cell-wall architecture.

---

## Step 10 - Add documentation stub

### Why

Future agents need to know this is a simulator, not real photonic execution.

### File

```text
docs/architecture/photonic-quantization-bridge.md
```

### Code / content

```md
# Photonic Quantization Bridge

The Photonic Quantization Bridge is an experimental software-only compatibility layer.

It accepts vector packet metadata, builds a deterministic operation graph, scores photonic compatibility, and emits diagnostics.

It does not execute real photonic hardware.

Safe modes:
- off
- shadow
- warn
- gate

Default mode:
- shadow

Do not use this module to claim production optical inference.
```

### Risk reduced

Prevents future implementation agents from overextending the claim.

---

## 10. Code examples for each major step

This section gives copy-ready examples that can be adapted into files.

### Example A - Minimal usage

```js
import { analyzePhotonicQuantizationBridge } from '../src/lib/photonic-quantization/index.js';

const report = analyzePhotonicQuantizationBridge({
  packetId: 'demo_kv_packet',
  sourceKind: 'kv-cache',
  dimension: 4096,
  bitWidth: 3,
  storageKind: 'packed',
  rotationKind: 'random-rotation',
  quantizationKind: 'polar',
  residualKind: 'qjl',
  targetOperation: 'inner-product',
});

console.log(report.compatibilityGrade);
console.log(report.operationGraph.graphHash);
```

### Example B - Shadow mode

```js
import {
  analyzePhotonicQuantizationBridge,
  PHOTONIC_BRIDGE_MODES,
} from '../src/lib/photonic-quantization/index.js';

export function runShadowProbe(packet) {
  return analyzePhotonicQuantizationBridge(packet, {
    mode: PHOTONIC_BRIDGE_MODES.SHADOW,
  });
}
```

### Example C - Warn mode

```js
import {
  analyzePhotonicQuantizationBridge,
  PHOTONIC_BRIDGE_MODES,
} from '../src/lib/photonic-quantization/index.js';

export function runWarnProbe(packet) {
  const report = analyzePhotonicQuantizationBridge(packet, {
    mode: PHOTONIC_BRIDGE_MODES.WARN,
  });

  const warnings = report.diagnostics.filter((diagnostic) => diagnostic.severity === 'warn');
  return { report, warnings };
}
```

### Example D - Gate mode, do not use by default

```js
import {
  analyzePhotonicQuantizationBridge,
  PHOTONIC_BRIDGE_MODES,
} from '../src/lib/photonic-quantization/index.js';

export function runExperimentalGate(packet) {
  const report = analyzePhotonicQuantizationBridge(packet, {
    mode: PHOTONIC_BRIDGE_MODES.GATE,
    config: {
      minGateScore: 0.72,
    },
  });

  if (!report.ok) {
    throw new Error(`PHOTONIC_GATE_BLOCKED: ${report.blockedReasons.join('; ')}`);
  }

  return report;
}
```

### Example E - Stable diagnostic display

```js
export function formatPhotonicDiagnostics(report) {
  return report.diagnostics.map((diagnostic) => ({
    code: diagnostic.code,
    severity: diagnostic.severity,
    message: diagnostic.message,
  }));
}
```

---

## 11. Glossary

| Term | Meaning |
|---|---|
| Photonic Quantization Bridge | Software layer that maps compressed vector jobs into photonic-compatible operation graphs. |
| Lightbound Vector Cortex | Codex nickname for the specialized vector-execution organ. |
| Photonic-friendly | Operation is linear-algebra-shaped and could theoretically map to photonic matrix/vector hardware. |
| Electronic-required | Operation likely needs electronic logic, memory movement, quantization control, nonlinear activation, or system orchestration. |
| Hybrid | Operation has a linear component but still needs electronic support. |
| KV cache | Transformer memory of key/value vectors used during inference. |
| Vector codec | Representation strategy for compressing or packing high-dimensional vectors. |
| Rotation-aware quantization | Quantization strategy that transforms vector geometry before compression. |
| QJL | Quantized Johnson-Lindenstrauss style residual or sign-bit sketching technique. |
| Operation graph | Stable internal representation of the compute path. |
| Compatibility score | Deterministic grade estimating how well a packet maps to photonic-style acceleration. |
| Shadow mode | Feature runs and reports without changing behavior. |
| Warn mode | Feature reports and escalates warnings without blocking. |
| Gate mode | Feature can block low-compatibility packets. Not default. |
| Report hash | Stable hash of the generated report for regression testing. |
| Boundary | Point where photonic-compatible math must return to electronic control. |
| Substrate bridge | A layer that translates abstract computation into a specific execution medium. |

---

## 12. Q&A - top 10 confusing implementation concerns

### 1. Is this building real photonic hardware support?

No. Phase 1 is a deterministic simulator and compatibility layer. It must not claim actual optical execution.

### 2. Should this import or modify TurboQuant directly?

No. Use metadata-compatible packets. A later adapter can map real TurboQuant outputs into this packet schema.

### 3. Why include a compatibility score if no hardware exists?

The score gives the codebase a deterministic way to compare representation shapes and track whether a vector job is becoming more or less photonic-friendly.

### 4. Should the bridge process large vector arrays?

Not required in Phase 1. Metadata-only analysis must work. If data is provided, do not copy large arrays unless needed.

### 5. Should nonlinear operations be photonic-friendly?

Default to no. Mark nonlinear work as electronic-required unless a future backend explicitly supports it.

### 6. Why use shadow mode first?

Because this is a research bridge. Shadow mode produces evidence without risking production behavior.

### 7. What makes the output deterministic?

Stable object sorting, no random numbers, fixed scoring formulas, fixed grade bands, and deterministic hashes.

### 8. Can UI call the internal graph builder directly?

No. UI should call the adapter/public API only. Internal file contracts can evolve.

### 9. What happens if the packet is malformed?

Return a deterministic invalid report with error diagnostics. Do not crash in shadow or warn mode.

### 10. When can gate mode be enabled?

Only after tests are stable, reports have been inspected across real packet examples, and a maintainer explicitly chooses enforcement thresholds.

---

## 13. QA plan with exact tests, file names, commands, and code examples

### Test command

Run targeted tests:

```bash
pnpm vitest tests/photonic-quantization --run
```

Run full test suite:

```bash
pnpm test
```

Run deterministic repeat test manually:

```bash
pnpm vitest tests/photonic-quantization/deterministic-output.test.js --run --reporter=verbose
```

---

## Test 1 - Schema validates and normalizes packets

### File

```text
tests/photonic-quantization/vector-packet.schema.test.js
```

### Code

```js
import { describe, expect, it } from 'vitest';
import { validatePhotonicVectorPacket } from '../../src/lib/photonic-quantization/vector-packet.schema.js';

describe('validatePhotonicVectorPacket', () => {
  it('normalizes a valid packet deterministically', () => {
    const result = validatePhotonicVectorPacket({
      packetId: 'A',
      sourceKind: 'kv-cache',
      dimension: 4096,
      bitWidth: 3,
      storageKind: 'packed',
      rotationKind: 'random-rotation',
      quantizationKind: 'polar',
      residualKind: 'qjl',
      targetOperation: 'inner-product',
    });

    expect(result.ok).toBe(true);
    expect(result.packet.dimension).toBe(4096);
    expect(result.packet.bitWidth).toBe(3);
    expect(result.packet.rotationKind).toBe('random-rotation');
  });

  it('returns deterministic diagnostics for invalid input', () => {
    const result = validatePhotonicVectorPacket(null);

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0].code).toBe('PHOTONIC_PACKET_INVALID');
  });
});
```

---

## Test 2 - Operation graph orders operations stably

### File

```text
tests/photonic-quantization/operation-graph.test.js
```

### Code

```js
import { describe, expect, it } from 'vitest';
import { buildPhotonicOperationGraph } from '../../src/lib/photonic-quantization/operation-graph.js';

describe('buildPhotonicOperationGraph', () => {
  it('builds a stable graph for rotated quantized KV packets', () => {
    const graph = buildPhotonicOperationGraph({
      packetId: 'kv',
      sourceKind: 'kv-cache',
      dimension: 4096,
      bitWidth: 3,
      storageKind: 'packed',
      rotationKind: 'random-rotation',
      quantizationKind: 'polar',
      residualKind: 'qjl',
      targetOperation: 'inner-product',
      metadata: {},
    });

    expect(graph.operations.map((operation) => operation.id)).toEqual([
      'op_input_load',
      'op_rotation',
      'op_quantize',
      'op_residual',
      'op_target_compute',
    ]);

    expect(graph.linearPath).toContain('op_rotation');
    expect(graph.linearPath).toContain('op_target_compute');
    expect(graph.graphHash).toMatch(/^[0-9A-F]{8}$/);
  });
});
```

---

## Test 3 - Compatibility score is deterministic

### File

```text
tests/photonic-quantization/compatibility-score.test.js
```

### Code

```js
import { describe, expect, it } from 'vitest';
import { classifyVectorCodec } from '../../src/lib/photonic-quantization/vector-codec.js';
import { buildPhotonicOperationGraph } from '../../src/lib/photonic-quantization/operation-graph.js';
import { scorePhotonicCompatibility } from '../../src/lib/photonic-quantization/compatibility-score.js';

describe('scorePhotonicCompatibility', () => {
  it('returns the same score for the same packet', () => {
    const packet = {
      packetId: 'stable',
      sourceKind: 'kv-cache',
      dimension: 4096,
      bitWidth: 3,
      storageKind: 'packed',
      rotationKind: 'random-rotation',
      quantizationKind: 'polar',
      residualKind: 'qjl',
      targetOperation: 'inner-product',
      metadata: {},
    };

    const codecProfile = classifyVectorCodec(packet);
    const graph = buildPhotonicOperationGraph(packet);

    const first = scorePhotonicCompatibility(packet, codecProfile, graph);
    const second = scorePhotonicCompatibility(packet, codecProfile, graph);

    expect(first).toEqual(second);
    expect(first.score).toBeGreaterThan(0);
    expect(['S', 'A', 'B', 'C', 'D']).toContain(first.grade);
  });
});
```

---

## Test 4 - Shadow mode never blocks low compatibility

### File

```text
tests/photonic-quantization/simulator.shadow.test.js
```

### Code

```js
import { describe, expect, it } from 'vitest';
import {
  analyzePhotonicQuantizationBridge,
  PHOTONIC_BRIDGE_MODES,
} from '../../src/lib/photonic-quantization/index.js';

describe('Photonic bridge shadow mode', () => {
  it('does not block low-compatibility packets', () => {
    const report = analyzePhotonicQuantizationBridge({
      packetId: 'low',
      sourceKind: 'manual',
      dimension: 32,
      bitWidth: 32,
      storageKind: 'float32',
      rotationKind: 'none',
      quantizationKind: 'none',
      residualKind: 'none',
      targetOperation: 'diagnostic',
    }, {
      mode: PHOTONIC_BRIDGE_MODES.SHADOW,
    });

    expect(report.ok).toBe(true);
    expect(report.mode).toBe('shadow');
    expect(report.blockedReasons).toEqual([]);
  });
});
```

---

## Test 5 - Gate mode blocks below threshold

### File

```text
tests/photonic-quantization/gate-mode.test.js
```

### Code

```js
import { describe, expect, it } from 'vitest';
import {
  analyzePhotonicQuantizationBridge,
  PHOTONIC_BRIDGE_MODES,
} from '../../src/lib/photonic-quantization/index.js';

describe('Photonic bridge gate mode', () => {
  it('marks report as not ok when below gate threshold', () => {
    const report = analyzePhotonicQuantizationBridge({
      packetId: 'gate_low',
      sourceKind: 'manual',
      dimension: 32,
      bitWidth: 32,
      storageKind: 'float32',
      rotationKind: 'none',
      quantizationKind: 'none',
      residualKind: 'none',
      targetOperation: 'diagnostic',
    }, {
      mode: PHOTONIC_BRIDGE_MODES.GATE,
      config: {
        minGateScore: 0.99,
      },
    });

    expect(report.ok).toBe(false);
    expect(report.blockedReasons.length).toBeGreaterThan(0);
  });
});
```

---

## Test 6 - Report hash is stable

### File

```text
tests/photonic-quantization/deterministic-output.test.js
```

### Code

```js
import { describe, expect, it } from 'vitest';
import { analyzePhotonicQuantizationBridge } from '../../src/lib/photonic-quantization/index.js';

describe('Photonic bridge deterministic output', () => {
  it('produces identical reportHash for identical input', () => {
    const input = {
      packetId: 'same',
      sourceKind: 'kv-cache',
      dimension: 4096,
      bitWidth: 3,
      storageKind: 'packed',
      rotationKind: 'random-rotation',
      quantizationKind: 'polar',
      residualKind: 'qjl',
      targetOperation: 'inner-product',
    };

    const first = analyzePhotonicQuantizationBridge(input);
    const second = analyzePhotonicQuantizationBridge(input);

    expect(first.reportHash).toBe(second.reportHash);
    expect(first.operationGraph.graphHash).toBe(second.operationGraph.graphHash);
  });
});
```

---

## Test 7 - No Math.random in module subtree

### File

```text
tests/photonic-quantization/no-random.test.js
```

### Code

```js
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

function collectJsFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectJsFiles(fullPath);
    return entry.name.endsWith('.js') ? [fullPath] : [];
  });
}

describe('photonic-quantization determinism guard', () => {
  it('does not use Math.random', () => {
    const dir = path.resolve(process.cwd(), 'src/lib/photonic-quantization');
    const files = collectJsFiles(dir);

    const offenders = files.filter((file) => fs.readFileSync(file, 'utf8').includes('Math.random'));

    expect(offenders).toEqual([]);
  });
});
```

---

## Test 8 - Adapter export exists

### File

```text
tests/photonic-quantization/adapter.contract.test.js
```

### Code

```js
import { describe, expect, it } from 'vitest';
import { analyzePhotonicQuantizationBridge } from '../../src/lib/engine.adapter.js';

describe('photonic adapter contract', () => {
  it('exports analyzePhotonicQuantizationBridge through the engine adapter', () => {
    expect(typeof analyzePhotonicQuantizationBridge).toBe('function');
  });
});
```

If the real adapter path differs, update the import path only. Do not change the feature implementation for this test.

---

## 14. Regression risks and specific retest checklist

### Risk 1 - Existing adapter import graph breaks

**What could break:** Circular imports or missing export in `engine.adapter.js`.

**Retest:**

```bash
pnpm vitest tests/photonic-quantization/adapter.contract.test.js --run
pnpm test
```

### Risk 2 - Feature blocks behavior too early

**What could break:** Gate mode accidentally becomes default.

**Retest:**

```bash
pnpm vitest tests/photonic-quantization/simulator.shadow.test.js --run
```

Verify default mode is `shadow`.

### Risk 3 - Nondeterministic report hash

**What could break:** Object key order, unstable diagnostics, accidental timestamp, random seed.

**Retest:**

```bash
pnpm vitest tests/photonic-quantization/deterministic-output.test.js --run
pnpm vitest tests/photonic-quantization/no-random.test.js --run
```

### Risk 4 - Overclaiming real photonic execution

**What could break:** UI/docs/diagnostics imply real hardware execution.

**Retest:**

Search docs and code:

```bash
grep -R "real photonic hardware\|optical execution\|instant" src/lib/photonic-quantization docs/architecture || true
```

Expected: wording should clearly state software-only simulation in Phase 1.

### Risk 5 - Large vector input causes memory pressure

**What could break:** Data arrays get copied or serialized into report hashes.

**Retest:**

Add test with large `Float32Array` metadata. Confirm report does not include raw `data`.

### Risk 6 - Score changes without intentional update

**What could break:** Compatibility score snapshots drift.

**Retest:**

```bash
pnpm vitest tests/photonic-quantization/compatibility-score.test.js --run
```

Optional: add snapshot only after formula stabilizes.

### Risk 7 - Diagnostic sorting changes

**What could break:** Agent handoff becomes noisy.

**Retest:**

```bash
pnpm vitest tests/photonic-quantization/diagnostics.test.js --run
```

### Risk 8 - Existing public APIs mutate

**What could break:** Other modules import changed adapter behavior.

**Retest:**

```bash
pnpm test
```

Also inspect `git diff src/lib/engine.adapter.js`.

---

## 15. Rollout plan, including incomplete-safe behavior

### Phase 0 - Document only

- Add this PDR.
- No runtime changes.
- Safe state: no code runs.

### Phase 1 - Local module in shadow mode

- Add `src/lib/photonic-quantization`.
- Add tests.
- Do not expose to UI.
- Default mode: `shadow`.
- Safe state: reports only, no behavior changes.

### Phase 2 - Adapter export

- Add public adapter export.
- Only internal tools call it.
- Safe state: callable but non-blocking.

### Phase 3 - Warn mode in internal diagnostics

- Internal route or diagnostic panel can show compatibility warnings.
- No production logic changes.
- Safe state: warnings only.

### Phase 4 - Gate mode for explicit experiments

- Gate mode can be used only when caller opts in.
- Never make gate mode default.
- Safe state: experimental callers only.

### Phase 5 - Future hardware backend research

Only after Phase 1-4 are stable:

```text
operationGraph
→ backend capability registry
→ hardware adapter
→ calibrated execution report
```

No hardware backend should be added in this PDR.

---

## 16. Definition of done

The implementation is complete when:

1. `src/lib/photonic-quantization` exists with config, schema, graph, score, simulator, diagnostics, and public index.
2. `analyzePhotonicQuantizationBridge(input, options)` returns stable reports.
3. Default mode is `shadow`.
4. Invalid inputs produce deterministic diagnostic reports.
5. Operation graphs sort operations by explicit `order`.
6. Compatibility scoring is deterministic and tested.
7. Report hash is stable for identical input.
8. No module in the subtree uses `Math.random()`.
9. Raw vector data is not serialized into report hashes by default.
10. Adapter export exists or a local adapter exists with a note explaining deferred integration.
11. Tests pass:

```bash
pnpm vitest tests/photonic-quantization --run
```

12. Full suite does not regress:

```bash
pnpm test
```

13. Documentation clearly says Phase 1 is software-only.

---

## 17. Final architectural verdict

This is a valid **research-grade architectural bridge**, not a production hardware engine.

The strongest version of the idea is:

```text
Compressed vector formats can become execution contracts.
Photonic hardware can potentially accelerate the linear pieces of those contracts.
Scholomance can model that boundary deterministically before any real hardware exists.
```

This feature should be built as a **deterministic substrate translator**:

```text
Vector packet
→ operation graph
→ compatibility score
→ diagnostics
→ future backend target
```

Do not let it sprawl into a model runtime, GPU kernel project, or real photonic claim. The power of Phase 1 is that it makes the idea inspectable, testable, and agent-safe.

### Final grade target

- Phase 1 complete with passing tests: **A**
- Phase 1 plus internal diagnostic UI: **A+**
- Phase 1 plus real backend capability registry, still simulator-only: **S**
- Any version that claims real photonic execution without hardware: **F**
