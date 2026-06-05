# Photonic Retina PDR v2

## Bytecode Search Code
`SCHOL-ENC-BYKE-SEARCH-PDR-PHOTONIC-RETINA`

## 0. Document Status

**Project name:** Photonic Retina
**Codex name:** Optical Ingestion Engine
**Document type:** Product Design Requirements / Engineering Handoff
**Target codebase:** Scholomance / Codex / PixelBrain
**Primary implementation mode:** Experimental, deterministic, shadow-first ingestion adapter
**Implementation priority:** Medium-high
**Risk level:** Moderate architectural risk, low runtime risk if kept shadow-first
**Owner intent:** Enable seamless painting by compressing raw visual intent at the ingestion boundary

### Implementation Memory

**Phase 1:** Implemented in `src/lib/photonic-retina/` as a deterministic,
shadow-first adapter with validation, normalization, stable hashing, vector
encoding, and `encodeToPhotonicRetina(input, options)`.

**Phase 2:** Implemented. Streaming brush-stroke batching, installable worker
scope support, packet caching, bridge compatibility tests, diagnostics
snapshots, replay tooling, and the internal visual diagnostics panel are
present.

**Phase 3:** Implemented. Retina packets can now route directly into the
Photonic Quantization Bridge through `routeRetinaPacketToPhotonicBridge(input,
options)`, with deterministic low-bit previews, compressed packet deltas,
bridge reports, and software-only optical operation simulation metadata.

**Phase 2 completion snapshot (2026-06-03):**

- Engine files: `retina-stream.js`, `retina-cache.js`, `retina-worker.js`,
  `retina-diagnostics.js`, and `retina-replay.js`.
- Public exports live in `src/lib/photonic-retina/index.js`.
- Internal diagnostics route: `/internal/photonic-bridge`, gated by
  `AdminRoute`, rendered by `src/pages/internal/photonic-bridge/`.
- Verification passed: `pnpm test tests/photonic-retina --run`,
  `pnpm test tests/photonic-quantization --run`, targeted ESLint,
  `pnpm typecheck`, and `node docs/scholomance-encyclopedia/tools/audit-hygiene.mjs`.
- Route smoke check passed with HTTP 200 at
  `http://localhost:5174/internal/photonic-bridge`.
- Do not reintroduce the purged Phase 2 `SCHEMA_CONTRACT.md` additions or
  standalone Phase 2 PIR unless Angel explicitly asks for that documentation
  shape. The canonical memory for this phase is this PDR entry.

**Phase 3 completion snapshot (2026-06-03):**

- Engine file: `retina-bridge.js`.
- Public exports live in `src/lib/photonic-retina/index.js`.
- Phase 3 route accepts either raw Retina input or an already encoded packet,
  then delegates to `analyzePhotonicQuantizationBridge`.
- Route artifacts include `preview`, `delta`, `opticalSimulation`,
  `bridgeReport`, and a deterministic `routeId`.
- PixelBrain now calls `buildPixelBrainPhotonicRoute` after ready coordinate
  generation/mutation and passes route telemetry into the internal terminal
  metrics without changing canvas rendering.
- Animation AMP now attaches `photonicRoute` through the UI-safe AMP client and
  animation submitter hook; Motion Inspector surfaces the route telemetry for
  active animation outputs.
- Verification passed: `pnpm test tests/photonic-retina --run`,
  `pnpm test tests/photonic-quantization --run`, and targeted ESLint for the
  new Phase 3 module and test. PixelBrain wire verification added:
  `pnpm test tests/photonic-retina --run`, targeted PixelBrain adapter QA,
  targeted ESLint, and `pnpm typecheck`. Animation AMP wire verification added:
  `pnpm test tests/photonic-retina --run`, targeted Animation AMP vector tests,
  targeted ESLint, CSS token verification, and `pnpm typecheck`.

---

## 1. Executive Summary

### What to Build

Build a deterministic `photonic-retina` module that acts as a software optical ingestion layer for PixelBrain and related visual systems.

The Photonic Retina receives raw visual input such as coordinates, color arrays, pixel buffers, formula-derived points, lattice cells, or brush-stroke data. It normalizes that input into a compact, deterministic `PhotonicVectorPacket` that can later feed the Photonic Quantization Bridge.

In plain language:

> The Retina is the software eyeball.
> PixelBrain creates or receives visual matter.
> The Retina compresses that matter into optical math packets before heavier systems touch it.

### Why It Exists

The goal is to reduce conceptual and computational latency in visual generation workflows.

Instead of waiting until later pipeline stages to compress visual data, the Retina performs aggressive deterministic encoding immediately at ingestion. This allows future systems to treat visual input as compact operation vectors rather than bulky raw data.

This supports:

* Seamless painting
* Fast brush-response experiments
* Deterministic visual caching
* Quantized visual packet routing
* Future hardware-inspired photonic simulation
* Cleaner integration between PixelBrain, Lotus, Verseir, and Photonic Quantization

### What Makes This Version Stronger

This PDR hardens the original concept by enforcing:

1. No nondeterministic packet IDs
2. No `Date.now()` in core packet generation
3. No `Math.random()` in encoding paths
4. Explicit packet schema
5. Explicit input normalization
6. Shadow-first integration
7. Safe adapter isolation
8. Clear QA acceptance gates
9. Future Web Worker compatibility
10. No coupling to React state or canvas rendering internals

---

## 2. Change Classification

**Primary classification:** Architectural
**Secondary classification:** Structural
**Behavioral impact in Phase 1:** None to user-facing rendering
**Cosmetic impact:** None

This change introduces a new upstream visual ingestion module. It should not replace PixelBrain rendering, Lattice rendering, Lotus composition, or existing image-to-pixel systems.

The Photonic Retina is initially passive. It observes or receives visual inputs, encodes them, and emits packets in shadow mode.

---

## 3. Problem Statement

Current visual systems can produce rich coordinate, pixel, formula, and lattice data, but there is no dedicated ingestion boundary that compresses visual intent into a stable low-bit mathematical packet.

Without this boundary:

* Raw visual structures remain heavy
* Similar visual inputs are harder to cache
* Future quantization systems lack a canonical intake format
* Brush-stroke streams may become coupled to UI state
* Photonic bridge concepts lack a reliable upstream source
* Determinism can be broken by timestamps, random values, or unstable object key order

The Photonic Retina solves this by creating one narrow, deterministic translation layer between visual input and photonic-style vector execution.

---

## 4. Goals

### Phase 1 Goals

1. Create `src/lib/photonic-retina/`
2. Define `PhotonicRetinaInput`
3. Define `PhotonicVectorPacket`
4. Create deterministic input normalization
5. Create deterministic vector encoding
6. Create stable packet hashing
7. Expose `encodeToPhotonicRetina(input, options)`
8. Run only in `shadow` mode by default
9. Add Vitest coverage for determinism, malformed input, and mode behavior
10. Preserve all existing PixelBrain rendering behavior

### Phase 2 Goals

1. Add streaming brush-stroke batching
2. Add Web Worker support
3. Add packet cache
4. Add bridge compatibility tests against Photonic Quantization Bridge
5. Add visual diagnostics panel
6. Add optional packet replay tooling

### Phase 3 Goals

1. Route Retina packets into Photonic Quantization Bridge
2. Support progressive low-bit previews
3. Support realtime visual mutation from compressed packet deltas
4. Explore hardware-inspired optical operation simulation

---


---

## Step 6: Create Adapter

Create:

```text
src/lib/photonic-retina/retina-adapter.js
```

Purpose:

* Expose safe public API
* Enforce mode behavior
* Prevent Retina failures from crashing UI in shadow mode
* Keep encoder pure

```js
import { RETINA_MODES } from './retina.config.js';
import {
  normalizeRetinaConfig,
  validateRetinaInput,
} from './retina-schema.js';
import { simulateRetinaEncoding } from './retina-encoder.js';

export function encodeToPhotonicRetina(rawInput, options = {}) {
  const config = normalizeRetinaConfig(options);

  if (config.mode === RETINA_MODES.OFF) {
    return null;
  }

  try {
    const input = validateRetinaInput(rawInput);
    const packet = simulateRetinaEncoding(input, config);

    if (config.mode === RETINA_MODES.SHADOW) {
      return packet;
    }

    if (config.mode === RETINA_MODES.WARN) {
      console.debug('[Photonic Retina]', packet.packetId);
      return packet;
    }

    return packet;
  } catch (error) {
    if (config.mode === RETINA_MODES.GATE) {
      throw error;
    }

    if (config.mode === RETINA_MODES.WARN) {
      console.warn('[Photonic Retina] Encoding failed:', error);
    }

    return null;
  }
}
```

---

## Step 7: Create Public Exports

Create:

```text
src/lib/photonic-retina/index.js
```

```js
export {
  RETINA_MODES,
  RETINA_SOURCE_KINDS,
  DEFAULT_RETINA_CONFIG,
} from './retina.config.js';

export {
  encodeToPhotonicRetina,
} from './retina-adapter.js';

export {
  simulateRetinaEncoding,
} from './retina-encoder.js';
```

---

## Step 8: Shadow Integration Hook

Use only after unit tests pass.

Example integration:

```js
import { encodeToPhotonicRetina } from '@/lib/photonic-retina';

function onPixelBrainCoordinatesUpdated(coordinates, canvas) {
  const packet = encodeToPhotonicRetina({
    sourceKind: 'coordinates',
    payload: coordinates,
    dimensions: {
      width: canvas.width,
      height: canvas.height,
    },
    metadata: {
      sourceSystem: 'pixelbrain',
    },
  });

  if (packet) {
    // Phase 1: cache, debug, or ignore.
    // Do not mutate UI state unless explicitly building diagnostics.
  }
}
```

Do not wire this into hot render loops until profiling says it is safe.

For drag/paint streams, call through a debounced or batched adapter in Phase 2.

---

## 17. QA Plan

### Test File 1

```text
tests/photonic-retina/retina-hash.test.js
```

Tests:

1. Same object produces same hash
2. Object key order does not change hash
3. Typed arrays serialize deterministically
4. Nested objects serialize deterministically

Example:

```js
import { describe, expect, test } from 'vitest';
import { stableHash } from '../../src/lib/photonic-retina/retina-hash.js';

describe('retina-hash', () => {
  test('object key order does not affect hash', () => {
    const left = { b: 2, a: 1 };
    const right = { a: 1, b: 2 };

    expect(stableHash(left)).toBe(stableHash(right));
  });
});
```

---

### Test File 2

```text
tests/photonic-retina/retina-normalize.test.js
```

Tests:

1. Coordinates normalize to target dimension
2. Empty coordinates produce zero vector
3. Pixel buffers downsample deterministically
4. Lattice map input normalizes without mutation
5. Formula params are sorted before normalization

---

### Test File 3

```text
tests/photonic-retina/retina-encoder.test.js
```

Tests:

1. Same input creates same packet ID
2. Same input creates same byte data
3. Different config creates different config hash
4. Binary sign quantization only emits `-1`, `0`, `1`
5. Scalar quantization stays within int8 range
6. Packet metadata marks deterministic true

Example:

```js
import { describe, expect, test } from 'vitest';
import { normalizeRetinaConfig } from '../../src/lib/photonic-retina/retina-schema.js';
import { validateRetinaInput } from '../../src/lib/photonic-retina/retina-schema.js';
import { simulateRetinaEncoding } from '../../src/lib/photonic-retina/retina-encoder.js';

describe('retina-encoder', () => {
  test('same input produces same packet', () => {
    const config = normalizeRetinaConfig();
    const input = validateRetinaInput({
      sourceKind: 'coordinates',
      payload: [
        { x: 1, y: 2, color: '#ffffff', emphasis: 1 },
      ],
    });

    const first = simulateRetinaEncoding(input, config);
    const second = simulateRetinaEncoding(input, config);

    expect(first.packetId).toBe(second.packetId);
    expect(Array.from(first.data)).toEqual(Array.from(second.data));
  });
});
```

---

### Test File 4

```text
tests/photonic-retina/retina-adapter.test.js
```

Tests:

1. Off mode returns null
2. Shadow mode returns packet
3. Warn mode returns null on invalid input
4. Gate mode throws on invalid input
5. Adapter does not throw in default shadow mode

Example:

```js
import { describe, expect, test } from 'vitest';
import { encodeToPhotonicRetina } from '../../src/lib/photonic-retina/index.js';

describe('retina-adapter', () => {
  test('off mode returns null', () => {
    const packet = encodeToPhotonicRetina(
      { sourceKind: 'coordinates', payload: [] },
      { mode: 'off' }
    );

    expect(packet).toBeNull();
  });

  test('gate mode throws on invalid input', () => {
    expect(() => encodeToPhotonicRetina(
      { sourceKind: 'bad-source', payload: [] },
      { mode: 'gate' }
    )).toThrow();
  });
});
```

---

## 18. QA Commands

Run:

```bash
pnpm test tests/photonic-retina
```

Optional full test run:

```bash
pnpm test
```

Optional lint:

```bash
pnpm lint
```

Optional type check if available:

```bash
pnpm typecheck
```

---

## 19. Acceptance Criteria

The feature is accepted when:

1. All Retina tests pass
2. No existing PixelBrain tests fail
3. Core encoder uses no `Date.now()`
4. Core encoder uses no `performance.now()`
5. Core encoder uses no `Math.random()`
6. Same input produces same `packetId`
7. Same input produces same `Int8Array`
8. Invalid input cannot crash the UI in shadow mode
9. The public API is only `encodeToPhotonicRetina`
10. No UI rendering behavior changes in Phase 1

---

## 20. Regression Risks

### Risk 1: UI Performance Degradation

Cause:

Encoding might be called too often during brush drag events.

Mitigation:

* Shadow-only
* Batch later
* Debounce later
* Web Worker later

Retest:

* Drag brush rapidly
* Confirm no frame drops
* Confirm no render-loop blocking

---

### Risk 2: Determinism Drift

Cause:

Timestamps, random values, unstable object serialization, Map iteration surprises.

Mitigation:

* Stable serialization
* Sorted object keys
* No wall-clock APIs
* Golden packet tests

Retest:

* Run same test 100 times
* Confirm identical packet IDs and data arrays

---

### Risk 3: Schema Mismatch with Future Photonic Bridge

Cause:

The bridge packet expectations may evolve.

Mitigation:

* Keep packet schema versioned
* Keep bridge out of Phase 1
* Add bridge contract tests in Phase 2

Retest:

* Validate packet against bridge schema once bridge exists

---

### Risk 4: Adapter Boundary Violation

Cause:

UI imports encoder directly.

Mitigation:

* Document public API
* Keep encoder internal
* Add import lint rule later if needed

Retest:

* Search for `simulateRetinaEncoding` imports outside tests

---

### Risk 5: Overclaiming Optical Physics

Cause:

Language suggests real photonic acceleration.

Mitigation:

* Explicitly call Phase 1 a deterministic software simulation
* Keep hardware claims out of code comments
* Use "hardware-inspired" instead of "hardware-backed"

Retest:

* Review docs for misleading claims

---

## 21. Glossary

### Photonic Retina

The software optical ingestion layer. It receives raw visual intent and compresses it into deterministic vector packets.

### Optical Ingestion Engine

Codex name for the Photonic Retina. Describes its function as the first visual compression boundary.

### PhotonicVectorPacket

A compact, versioned, deterministic packet containing quantized vector data and metadata.

### Seamless Painting

A target experience where visual input feels immediate because raw visual data is compressed at the ingestion edge.

### Shadow Mode

A rollout mode where the system runs in parallel without affecting user-facing behavior.

### Gate Mode

A strict mode where invalid inputs throw errors. Used for tests and future enforcement.

### Signed Hash Rotation

A deterministic sign-flipping operation used to simulate lightweight vector rotation without random state.

### Scalar Quantization

A compression method that maps continuous values into a limited numeric range.

### Binary Sign Quantization

A compression method that maps values into `-1`, `0`, or `1`.

### Stable Serialization

A deterministic method of converting objects to strings so key order cannot alter hashes.

---

## 22. Q&A

### Q1: Is this real photonic computing?

No. Phase 1 is software-only. It simulates the shape of a photonic ingestion process without requiring optical hardware.

### Q2: Does this replace PixelBrain?

No. PixelBrain remains the visual generation and rendering system. The Retina only observes or receives visual data and compresses it into packets.

### Q3: Why does packet ID determinism matter?

Because packet IDs become cache keys, replay keys, golden test anchors, and future bridge inputs. If packet IDs use timestamps, the entire system becomes harder to test.

### Q4: Why not wire it directly into the canvas?

Direct canvas coupling would make the Retina fragile. The Retina should consume data contracts, not UI events or rendering internals.

### Q5: Why start in shadow mode?

Shadow mode proves stability without risking the existing UI. It lets the system collect packets before packets control anything.

### Q6: Why use int8 first?

Int8 is simple, portable, easy to test, and close enough to the low-bit quantization goal for Phase 1.

### Q7: Why not implement true 1-bit immediately?

1-bit support is useful, but 4-bit and 8-bit modes make debugging easier. Binary sign quantization can still be included as an option.

### Q8: What should happen on malformed input?

Shadow and warn modes should return null. Gate mode should throw.

### Q9: Should the packet contain raw input?

No. The packet should contain hashes and compressed data, not heavy raw payloads.

### Q10: Can this run in a Web Worker later?

Yes. The core encoder should avoid browser-only APIs so it can be moved into a worker with minimal changes.

---

## 23. Completion Definition

Phase 1 is complete when the Retina can accept coordinate input, pixel input, and lattice input, then produce stable `PhotonicVectorPacket` objects with deterministic hashes and passing tests.

The correct Phase 1 emotional result:

> Nothing visible changes, but the system quietly grows an eye.

That eye does not paint yet.
It watches.
It compresses.
It remembers shape as math.
## 5. Non-Goals

The Photonic Retina must not:

1. Replace PixelBrain canvas rendering
2. Replace Lotus composition
3. Replace image-to-pixel-art generation
4. Replace lattice grid generation
5. Directly mutate React state
6. Depend on browser-only APIs in the core encoder
7. Use `Date.now()` for deterministic packet fields
8. Use `Math.random()` anywhere in packet creation
9. Perform real optical physics
10. Promise hardware-level speed in Phase 1

The Retina is a deterministic software simulation of an optical ingestion boundary.

---

## 6. Dependency Check

### Existing Systems It May Touch

| System                        | Relationship              | Risk                               |
| ----------------------------- | ------------------------- | ---------------------------------- |
| PixelBrain coordinate systems | Primary input source      | Low if adapter-only                |
| Image-to-pixel-art pipeline   | Potential input source    | Low                                |
| Lattice grid engine           | Potential input source    | Low                                |
| Formula-to-coordinate bridge  | Potential input source    | Low                                |
| Color-byte mapping            | Potential input source    | Medium if palette data is unstable |
| Processor bridge              | Optional integration path | Medium                             |
| Photonic Quantization Bridge  | Future consumer           | Medium                             |
| React UI                      | Shadow hook only          | Medium if wired too directly       |

### Integration Rule

The Retina must integrate through adapter boundaries only.

No UI component should import `retina-encoder.js` directly. UI code may only call:

```js
encodeToPhotonicRetina(input, options)
```

This preserves the Cell Wall principle and keeps the encoder portable across browser, Node, Web Worker, and future backend execution.

---

## 7. Architecture Overview

```text
Visual Input Sources
  ├─ PixelBrain coordinates
  ├─ Brush strokes
  ├─ Lattice cells
  ├─ Formula coordinates
  ├─ Pixel buffers
  └─ Color arrays

        ↓

photonic-retina/
  ├─ retina.config.js
  ├─ retina-schema.js
  ├─ retina-normalize.js
  ├─ retina-hash.js
  ├─ retina-encoder.js
  ├─ retina-adapter.js
  └─ index.js

        ↓

PhotonicVectorPacket

        ↓

Future Consumer
  └─ Photonic Quantization Bridge
```

---

## 8. Proposed File Map

```text
src/lib/photonic-retina/
  retina.config.js
  retina-schema.js
  retina-normalize.js
  retina-hash.js
  retina-encoder.js
  retina-adapter.js
  index.js

tests/photonic-retina/
  retina-normalize.test.js
  retina-hash.test.js
  retina-encoder.test.js
  retina-adapter.test.js
```

---

## 9. Public API

```js
encodeToPhotonicRetina(input, options)
```

### Input

```js
{
  sourceKind: 'coordinates' | 'pixels' | 'lattice' | 'formula' | 'colors' | 'brush-stroke',
  payload: unknown,
  dimensions?: {
    width: number,
    height: number,
  },
  metadata?: Record<string, unknown>
}
```

### Options

```js
{
  mode?: 'off' | 'shadow' | 'warn' | 'gate',
  bitWidth?: 1 | 2 | 4 | 8,
  targetDimension?: number,
  quantizationKind?: 'scalar' | 'binary-sign',
  rotationKind?: 'none' | 'signed-hash-rotation',
  packetVersion?: 1,
  seed?: string | number
}
```

### Output

Returns:

```js
PhotonicVectorPacket | null
```

In `off` mode, returns `null`.

In `shadow` mode, returns a packet but must not affect rendering.

In `warn` mode, logs warnings for invalid input but does not throw.

In `gate` mode, throws on invalid input.

---

## 10. Core Packet Contract

```js
{
  schemaVersion: 1,
  packetId: string,
  sourceKind: string,
  dimension: number,
  bitWidth: number,
  storageKind: 'int8',
  rotationKind: string,
  quantizationKind: string,
  residualKind: 'none',
  targetOperation: 'inner-product',
  data: Int8Array,
  metadata: {
    generatedBy: 'photonic-retina',
    inputHash: string,
    configHash: string,
    deterministic: true
  },
  diagnostics: string[]
}
```

### Packet ID Rule

Packet IDs must be deterministic.

Allowed:

```js
packetId = `retina_v1_${inputHash}_${configHash}`
```

Forbidden:

```js
packetId = `retina_${Date.now()}_${dimension}`
```

Reason:

The same input must always produce the same packet. A timestamp makes golden tests impossible and poisons cacheability.

---

## 11. Determinism Contract

The Photonic Retina must obey the following laws:

1. Same input plus same config produces identical packet
2. Same input plus same config produces identical `packetId`
3. Object key order must not affect packet identity
4. Array order may affect packet identity unless explicitly sorted by normalizer
5. No `Date.now()` in core packet creation
6. No `performance.now()` in core packet creation
7. No `Math.random()` in core packet creation
8. No mutation of caller-owned input
9. No browser-only APIs in encoder core
10. All generated diagnostics must be stable for the same input

This is the Retina’s prime invariant.

---

## 12. Rollout Modes

```js
export const RETINA_MODES = Object.freeze({
  OFF: 'off',
  SHADOW: 'shadow',
  WARN: 'warn',
  GATE: 'gate',
});
```

### Mode Behavior

| Mode     | Behavior                            | Throws? | Used for                   |
| -------- | ----------------------------------- | ------: | -------------------------- |
| `off`    | Returns null immediately            |      No | Disable                    |
| `shadow` | Encodes silently, no UI impact      |      No | Default                    |
| `warn`   | Encodes and logs recoverable issues |      No | Debug                      |
| `gate`   | Encodes or throws                   |     Yes | Tests / future enforcement |

Default mode must be `shadow`.

---

## 13. Schema and Validation Rules

### Source Kind Validation

Allowed source kinds:

```js
[
  'coordinates',
  'pixels',
  'lattice',
  'formula',
  'colors',
  'brush-stroke'
]
```

Unknown source kinds should fail validation.

### Dimension Validation

If dimensions are provided:

```js
width > 0
height > 0
Number.isFinite(width)
Number.isFinite(height)
```

### Bit Width Validation

Allowed:

```js
1, 2, 4, 8
```

### Target Dimension Validation

```js
targetDimension >= 1
targetDimension <= 4096
```

Default target dimension:

```js
256
```

---

## 14. Input Normalization Strategy

The Retina should normalize diverse visual inputs into a stable numeric vector.

### Coordinate Input

Coordinate objects should map to numeric channels:

```js
[
  x,
  y,
  z,
  emphasis,
  colorHash
]
```

### Pixel Input

Pixel buffers should map to sampled RGBA values:

```js
[
  r,
  g,
  b,
  a
]
```

Large pixel buffers should be downsampled deterministically.

### Lattice Input

Lattice cells should map to:

```js
[
  col,
  row,
  emphasis,
  colorHash,
  occupancy
]
```

### Formula Input

Formula inputs should map to:

```js
[
  formulaTypeHash,
  parameterKeyHash,
  parameterValue
]
```

### Brush Stroke Input

Brush stroke data should map to:

```js
[
  x,
  y,
  pressure,
  timeIndex,
  colorHash
]
```

Important: `timeIndex` is allowed only if it comes from stroke order, not wall-clock time.

---

## 15. Quantization Strategy

Phase 1 should implement two simple deterministic quantizers.

### Scalar Quantization

Maps normalized values into signed int8 range.

```js
quantized = clampInt8(Math.round(value))
```

### Binary Sign Quantization

Maps values to `-1`, `0`, or `1`.

```js
if (value > threshold) return 1
if (value < -threshold) return -1
return 0
```

### Signed Hash Rotation

A lightweight simulated rotation can flip signs based on deterministic hash state.

This is not true optical physics. It is a deterministic software stand-in for future photonic operation mapping.

---

## 16. Implementation Plan

## Step 1: Create Config

Create:

```text
src/lib/photonic-retina/retina.config.js
```

Purpose:

* Define modes
* Define defaults
* Define allowed enums
* Centralize tuning values

```js
export const RETINA_MODES = Object.freeze({
  OFF: 'off',
  SHADOW: 'shadow',
  WARN: 'warn',
  GATE: 'gate',
});

export const RETINA_SOURCE_KINDS = Object.freeze({
  COORDINATES: 'coordinates',
  PIXELS: 'pixels',
  LATTICE: 'lattice',
  FORMULA: 'formula',
  COLORS: 'colors',
  BRUSH_STROKE: 'brush-stroke',
});

export const DEFAULT_RETINA_CONFIG = Object.freeze({
  mode: RETINA_MODES.SHADOW,
  packetVersion: 1,
  bitWidth: 4,
  targetDimension: 256,
  storageKind: 'int8',
  rotationKind: 'signed-hash-rotation',
  quantizationKind: 'scalar',
  residualKind: 'none',
  targetOperation: 'inner-product',
});
```

---

## Step 2: Create Schema Helpers

Create:

```text
src/lib/photonic-retina/retina-schema.js
```

Purpose:

* Validate input
* Validate config
* Avoid malformed packets
* Keep adapter and encoder clean

```js
import {
  DEFAULT_RETINA_CONFIG,
  RETINA_SOURCE_KINDS,
} from './retina.config.js';

const ALLOWED_SOURCE_KINDS = new Set(Object.values(RETINA_SOURCE_KINDS));
const ALLOWED_BIT_WIDTHS = new Set([1, 2, 4, 8]);

export function normalizeRetinaConfig(options = {}) {
  const config = {
    ...DEFAULT_RETINA_CONFIG,
    ...options,
  };

  if (!ALLOWED_BIT_WIDTHS.has(config.bitWidth)) {
    throw new Error(`Invalid Retina bitWidth: ${config.bitWidth}`);
  }

  const targetDimension = Number(config.targetDimension);
  if (!Number.isInteger(targetDimension) || targetDimension < 1 || targetDimension > 4096) {
    throw new Error(`Invalid Retina targetDimension: ${config.targetDimension}`);
  }

  return Object.freeze({
    ...config,
    targetDimension,
  });
}

export function validateRetinaInput(input) {
  if (!input || typeof input !== 'object') {
    throw new Error('Photonic Retina input must be an object');
  }

  const sourceKind = String(input.sourceKind || '').trim();

  if (!ALLOWED_SOURCE_KINDS.has(sourceKind)) {
    throw new Error(`Invalid Photonic Retina sourceKind: ${sourceKind}`);
  }

  if (!('payload' in input)) {
    throw new Error('Photonic Retina input missing payload');
  }

  if (input.dimensions) {
    const width = Number(input.dimensions.width);
    const height = Number(input.dimensions.height);

    if (!Number.isFinite(width) || width <= 0) {
      throw new Error('Photonic Retina dimensions.width must be positive');
    }

    if (!Number.isFinite(height) || height <= 0) {
      throw new Error('Photonic Retina dimensions.height must be positive');
    }
  }

  return Object.freeze({
    sourceKind,
    payload: input.payload,
    dimensions: input.dimensions ? Object.freeze({
      width:estion Engine

Codex name for the Photonic Retina. Describes its function as the first visual compression boundary.

### PhotonicVectorPacket

A compact, versioned, deterministic packet containing quantized vector data and metadata.

### Seamless Painting

A target experience where visual input feels immediate because raw visual data is compressed at the ingestion edge.

### Shadow Mode

A rollout mode where the system runs in parallel without affecting user-facing behavior.

### Gate Mode

A strict mode where invalid inputs throw errors. Used for tests and future enforcement.

### Signed Hash Rotation

A deterministic sign-flipping operation used to simulate lightweight vector rotation without random state.

### Scalar Quantization

A compression method that maps continuous values into a limited numeric range.

### Binary Sign Quantization

A compression method that maps values into `-1`, `0`, or `1`.

### Stable Serialization

A deterministic method of converting objects to strings so key order cannot alter hashes.

---

## 22. Q&A

### Q1: Is this real photonic computing?

No. Phase 1 is software-only. It simulates the shape of a photonic ingestion process without requiring optical hardware.

### Q2: Does this replace PixelBrain?

No. PixelBrain remains the visual generation and rendering system. The Retina only observes or receives visual data and compresses it into packets.

### Q3: Why does packet ID determinism matter?

Because packet IDs become cache keys, replay keys, golden test anchors, and future bridge inputs. If packet IDs use timestamps, the entire system becomes harder to test.

### Q4: Why not wire it directly into the canvas?

Direct canvas coupling would make the Retina fragile. The Retina should consume data contracts, not UI events or rendering internals.

### Q5: Why start in shadow mode?

Shadow mode proves stability without risking the existing UI. It lets the system collect packets before packets control anything.

### Q6: Why use int8 first?

Int8 is simple, portable, easy to test, and close enough to the low-bit quantization goal for Phase 1.

### Q7: Why not implement true 1-bit immediately?

1-bit support is useful, but 4-bit and 8-bit modes make debugging easier. Binary sign quantization can still be included as an option.

### Q8: What should happen on malformed input?

Shadow and warn modes should return null. Gate mode should throw.

### Q9: Should the packet contain raw input?

No. The packet should contain hashes and compressed data, not heavy raw payloads.

### Q10: Can this run in a Web Worker later?

Yes. The core encoder should avoid browser-only APIs so it can be moved into a worker with minimal changes.

---

## 23. Completion Definition

Phase 1 is complete when the Retina can accept coordinate input, pixel input, and lattice input, then produce stable `PhotonicVectorPacket` objects with deterministic hashes and passing tests.

The correct Phase 1 emotional result:

> Nothing visible changes, but the system quietly grows an eye.

That eye does not paint yet.
It watches.
It compresses.
It remembers shape as math. Number(input.dimensions.width),
      height: Number(input.dimensions.height),
    }) : undefined,
    metadata: input.metadata && typeof input.metadata === 'object'
      ? Object.freeze({ ...input.metadata })
      : Object.freeze({}),
  });
}
```

---

## Step 3: Create Stable Hash Utilities

Create:

```text
src/lib/photonic-retina/retina-hash.js
```

Purpose:

* Canonicalize objects
* Stabilize key order
* Create deterministic packet IDs
* Avoid timestamp-based identity

```js
import { hashString } from '../pixelbrain/shared.js';

export function stableSerialize(value) {
  if (value === null) return 'null';

  if (ArrayBuffer.isView(value)) {
    return JSON.stringify(Array.from(value));
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(',')}]`;
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`).join(',')}}`;
  }

  return JSON.stringify(value);
}

export function stableHash(value) {
  return hashString(stableSerialize(value)).toString(16).padStart(8, '0');
}
```

Note: Adjust the import path to match the actual shared utility location in the codebase.

---

## Step 4: Create Input Normalizer

Create:

```text
src/lib/photonic-retina/retina-normalize.js
```

Purpose:

* Convert all accepted input kinds into numeric vectors
* Clamp unsafe values
* Prevent mutation of caller input
* Produce stable numeric arrays

```js
import { hashString } from '../pixelbrain/shared.js';

function numberOrZero(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function colorToNumber(color) {
  return hashString(String(color || '')) % 255;
}

function normalizeCoordinates(payload) {
  const coords = Array.isArray(payload) ? payload : [];
  const values = [];

  coords.forEach((coord) => {
    values.push(numberOrZero(coord.x));
    values.push(numberOrZero(coord.y));
    values.push(numberOrZero(coord.z));
    values.push(numberOrZero(coord.emphasis) * 255);
    values.push(colorToNumber(coord.color));
  });

  return values;
}

function normalizePixels(payload, targetDimension) {
  const pixels = ArrayBuffer.isView(payload) ? payload : new Uint8ClampedArray();
  const values = [];
  const stride = Math.max(1, Math.floor(pixels.length / targetDimension));

  for (let index = 0; index < pixels.length && values.length < targetDimension; index += stride) {
    values.push(numberOrZero(pixels[index]));
  }

  return values;
}

function normalizeLattice(payload) {
  const cells = payload?.cells instanceof Map
    ? Array.from(payload.cells.values())
    : Array.isArray(payload?.cells)
      ? payload.cells
      : [];

  const values = [];

  cells.forEach((cell) => {
    values.push(numberOrZero(cell.col));
    values.push(numberOrZero(cell.row));
    values.push(numberOrZero(cell.emphasis) * 255);
    values.push(colorToNumber(cell.color));
    values.push(1);
  });

  return values;
}

function normalizeFormula(payload) {
  const values = [];
  const formulaType = payload?.type || payload?.formulaType || 'unknown';
  values.push(colorToNumber(formulaType));

  const params = payload?.parameters && typeof payload.parameters === 'object'
    ? payload.parameters
    : {};

  Object.keys(params).sort().forEach((key) => {
    values.push(colorToNumber(key));
    values.push(numberOrZero(params[key]));
  });

  return values;
}

function normalizeColors(payload) {
  const colors = Array.isArray(payload) ? payload : [];
  return colors.map(colorToNumber);
}

export function normalizeRetinaPayload(input, config) {
  let values;

  switch (input.sourceKind) {
    case 'coordinates':
    case 'brush-stroke':
      values = normalizeCoordinates(input.payload);
      break;
    case 'pixels':
      values = normalizePixels(input.payload, config.targetDimension);
      break;
    case 'lattice':
      values = normalizeLattice(input.payload);
      break;
    case 'formula':
      values = normalizeFormula(input.payload);
      break;
    case 'colors':
      values = normalizeColors(input.payload);
      break;
    default:
      values = [];
  }

  const target = new Float32Array(config.targetDimension);

  for (let index = 0; index < target.length; index += 1) {
    target[index] = values.length > 0
      ? numberOrZero(values[index % values.length])
      : 0;
  }

  return target;
}
```

---

## Step 5: Create Encoder

Create:

```text
src/lib/photonic-retina/retina-encoder.js
```estion Engine

Codex name for the Photonic Retina. Describes its function as the first visual compression boundary.

### PhotonicVectorPacket

A compact, versioned, deterministic packet containing quantized vector data and metadata.

### Seamless Painting
estion Engine

Codex name for the Photonic Retina. Describes its function as the first visual compression boundary.

### PhotonicVectorPacket

A compact, versioned, deterministic packet containing quantized vector data and metadata.

### Seamless Painting

A target experience where visual input feels immediate because raw visual data is compressed at the ingestion edge.

### Shadow Mode

A rollout mode where the system runs in parallel without affecting user-facing behavior.

### Gate Mode

A strict mode where invalid inputs throw errors. Used for tests and future enforcement.

### Signed Hash Rotation

A deterministic sign-flipping operation used to simulate lightweight vector rotation without random state.

### Scalar Quantization

A compression method that maps continuous values into a limited numeric range.

### Binary Sign Quantization

A compression method that maps values into `-1`, `0`, or `1`.

### Stable Serialization

A deterministic method of converting objects to strings so key order cannot alter hashes.

---

## 22. Q&A

### Q1: Is this real photonic computing?

No. Phase 1 is software-only. It simulates the shape of a photonic ingestion process without requiring optical hardware.

### Q2: Does this replace PixelBrain?

No. PixelBrain remains the visual generation and rendering system. The Retina only observes or receives visual data and compresses it into packets.

### Q3: Why does packet ID determinism matter?

Because packet IDs become cache keys, replay keys, golden test anchors, and future bridge inputs. If packet IDs use timestamps, the entire system becomes harder to test.

### Q4: Why not wire it directly into the canvas?

Direct canvas coupling would make the Retina fragile. The Retina should consume data contracts, not UI events or rendering internals.

### Q5: Why start in shadow mode?

Shadow mode proves stability without risking the existing UI. It lets the system collect packets before packets control anything.

### Q6: Why use int8 first?

Int8 is simple, portable, easy to test, and close enough to the low-bit quantization goal for Phase 1.

### Q7: Why not implement true 1-bit immediately?

1-bit support is useful, but 4-bit and 8-bit modes make debugging easier. Binary sign quantization can still be included as an option.

### Q8: What should happen on malformed input?

Shadow and warn modes should return null. Gate mode should throw.

### Q9: Should the packet contain raw input?

No. The packet should contain hashes and compressed data, not heavy raw payloads.

### Q10: Can this run in a Web Worker later?

Yes. The core encoder should avoid browser-only APIs so it can be moved into a worker with minimal changes.

---

## 23. Completion Definition

Phase 1 is complete when the Retina can accept coordinate input, pixel input, and lattice input, then produce stable `PhotonicVectorPacket` objects with deterministic hashes and passing tests.

The correct Phase 1 emotional result:

> Nothing visible changes, but the system quietly grows an eye.

That eye does not paint yet.
It watches.
It compresses.
It remembers shape as math.
A target experience where visual input feels immediate because raw visual data is compressed at the ingestion edge.

### Shadow Mode

A rollout mode where the system runs in parallel without affecting user-facing behavior.

### Gate Mode

A strict mode where invalid inputs throw errors. Used for tests and future enforcement.

### Signed Hash Rotation

A deterministic sign-flipping operation used to simulate lightweight vector rotation without random state.

### Scalar Quantization

A compression method that maps continuous values into a limited numeric range.

### Binary Sign Quantization

A compression method that maps values into `-1`, `0`, or `1`.

### Stable Serialization

A deterministic method of converting objects to strings so key order cannot alter hashes.

---

## 22. Q&A

### Q1: Is this real photonic computing?

No. Phase 1 is software-only. It simulates the shape of a photonic ingestion process without requiring optical hardware.

### Q2: Does this replace PixelBrain?

No. PixelBrain remains the visual generation and rendering system. The Retina only observes or receives visual data and compresses it into packets.

### Q3: Why does packet ID determinism matter?

Because packet IDs become cache keys, replay keys, golden test anchors, and future bridge inputs. If packet IDs use timestamps, the entire system becomes harder to test.

### Q4: Why not wire it directly into the canvas?

Direct canvas coupling would make the Retina fragile. The Retina should consume data contracts, not UI events or rendering internals.

### Q5: Why start in shadow mode?

Shadow mode proves stability without risking the existing UI. It lets the system collect packets before packets control anything.

### Q6: Why use int8 first?

Int8 is simple, portable, easy to test, and close enough to the low-bit quantization goal for Phase 1.

### Q7: Why not implement true 1-bit immediately?

1-bit support is useful, but 4-bit and 8-bit modes make debugging easier. Binary sign quantization can still be included as an option.

### Q8: What should happen on malformed input?

Shadow and warn modes should return null. Gate mode should throw.

### Q9: Should the packet contain raw input?

No. The packet should contain hashes and compressed data, not heavy raw payloads.

### Q10: Can this run in a Web Worker later?

Yes. The core encoder should avoid browser-only APIs so it can be moved into a worker with minimal changes.

---

## 23. Completion Definition

Phase 1 is complete when the Retina can accept coordinate input, pixel input, and lattice input, then produce stable `PhotonicVectorPacket` objects with deterministic hashes and passing tests.

The correct Phase 1 emotional result:

> Nothing visible changes, but the system quietly grows an eye.

That eye does not paint yet.
It watches.
It compresses.
It remembers shape as math.

Purpose:

* Convert normalized vector into quantized packet
* Apply deterministic signed hash rotation
* Generate stable packet IDs
* Return frozen packet object

```js
import { stableHash } from './retina-hash.js';
import { normalizeRetinaPayload } from './retina-normalize.js';

function clampInt8(value) {
  return Math.max(-128, Math.min(127, Math.round(Number(value) || 0)));
}

function signedHash(index, seedHash) {
  let state = (Number.parseInt(seedHash, 16) >>> 0) ^ index;
  state = Math.imul(state ^ (state >>> 16), 0x7feb352d);
  state = Math.imul(state ^ (state >>> 15), 0x846ca68b);
  state = state ^ (state >>> 16);
  return (state >>> 0) % 2 === 0 ? 1 : -1;
}

function quantizeScalar(value, bitWidth) {
  const maxMagnitude = (2 ** (bitWidth - 1)) - 1;
  const normalized = Math.max(-1, Math.min(1, value / 255));
  return clampInt8(normalized * maxMagnitude);
}

function quantizeBinarySign(value) {
  if (value > 0) return 1;
  if (value < 0) return -1;
  return 0;
}

export function simulateRetinaEncoding(input, config) {
  const vector = normalizeRetinaPayload(input, config);
  const inputHash = stableHash(input);
  const configHash = stableHash({
    bitWidth: config.bitWidth,
    targetDimension: config.targetDimension,
    rotationKind: config.rotationKind,
    quantizationKind: config.quantizationKind,
    packetVersion: config.packetVersion,
  });

  const seedHash = stableHash({
    inputHash,
    configHash,
    seed: config.seed ?? 'photonic-retina',
  });

  const data = new Int8Array(vector.length);

  for (let index = 0; index < vector.length; index += 1) {
    const sign = config.rotationKind === 'signed-hash-rotation'
      ? signedHash(index, seedHash)
      : 1;

    const rotated = vector[index] * sign;

    data[index] = config.quantizationKind === 'binary-sign'
      ? quantizeBinarySign(rotated)
      : quantizeScalar(rotated, config.bitWidth);
  }

  const packetId = `retina_v${config.packetVersion}_${inputHash}_${configHash}`;

  return Object.freeze({
    schemaVersion: config.packetVersion,
    packetId,
    sourceKind: input.sourceKind,
    dimension: data.length,
    bitWidth: config.bitWidth,
    storageKind: config.storageKind,
    rotationKind: config.rotationKind,
    quantizationKind: config.quantizationKind,
    residualKind: config.residualKind,
    targetOperation: config.targetOperation,
    data,
    metadata: Object.freeze({
      generatedBy: 'photonic-retina',
      inputHash,
      configHash,
      deterministic: true,
    }),
    diagnostics: Object.freeze([
      `RETINA_ENCODED ${input.sourceKind}`,
      `DIMENSION ${data.length}`,
      `BIT_WIDTH ${config.bitWidth}`,
      `PACKET_ID ${packetId}`,
    ]),
  });
}
```

---

## Step 6: Create Adapter

Create:

```text
src/lib/photonic-retina/retina-adapter.js
```

Purpose:

* Expose safe public API
* Enforce mode behavior
* Prevent Retina failures from crashing UI in shadow mode
* Keep encoder pure

```js
import { RETINA_MODES } from './retina.config.js';
import {
  normalizeRetinaConfig,
  validateRetinaInput,
} from './retina-schema.js';
import { simulateRetinaEncoding } from './retina-encoder.js';

export function encodeToPhotonicRetina(rawInput, options = {}) {
  const config = normalizeRetinaConfig(options);

  if (config.mode === RETINA_MODES.OFF) {
    return null;
  }

  try {
    const input = validateRetinaInput(rawInput);
    const packet = simulateRetinaEncoding(input, config);

    if (config.mode === RETINA_MODES.SHADOW) {
      return packet;
    }

    if (config.mode === RETINA_MODES.WARN) {
      console.debug('[Photonic Retina]', packet.packetId);
      return packet;
    }

    return packet;
  } catch (error) {
    if (config.mode === RETINA_MODES.GATE) {
      throw error;
    }

    if (config.mode === RETINA_MODES.WARN) {
      console.warn('[Photonic Retina] Encoding failed:', error);
    }

    return null;
  }
}
```

---

## Step 7: Create Public Exports

Create:

```text
src/lib/photonic-retina/index.js
```

```js
export {
  RETINA_MODES,
  RETINA_SOURCE_KINDS,
  DEFAULT_RETINA_CONFIG,
} from './retina.config.js';

export {
  encodeToPhotonicRetina,
} from './retina-adapter.js';

export {
  simulateRetinaEncoding,
} from './retina-encoder.js';
```

---

## Step 8: Shadow Integration Hook

Use only after unit tests pass.

Example integration:

```js
import { encodeToPhotonicRetina } from '@/lib/photonic-retina';

function onPixelBrainCoordinatesUpdated(coordinates, canvas) {
  const packet = encodeToPhotonicRetina({
    sourceKind: 'coordinates',
    payload: coordinates,
    dimensions: {
      width: canvas.width,
      height: canvas.height,
    },
    metadata: {
      sourceSystem: 'pixelbrain',
    },
  });

  if (packet) {
    // Phase 1: cache, debug, or ignore.
    // Do not mutate UI state unless explicitly building diagnostics.
  }
}
```

Do not wire this into hot render loops until profiling says it is safe.

For drag/paint streams, call through a debounced or batched adapter in Phase 2.

---

## 17. QA Plan

### Test File 1

```text
tests/photonic-retina/retina-hash.test.js
```

Tests:

1. Same object produces same hash
2. Object key order does not change hash
3. Typed arrays serialize deterministically
4. Nested objects serialize deterministically

Example:

```js
import { describe, expect, test } from 'vitest';
import { stableHash } from '../../src/lib/photonic-retina/retina-hash.js';

describe('retina-hash', () => {
  test('object key order does not affect hash', () => {
    const left = { b: 2, a: 1 };
    const right = { a: 1, b: 2 };

    expect(stableHash(left)).toBe(stableHash(right));
  });
});
```

---

### Test File 2

```text
tests/photonic-retina/retina-normalize.test.js
```

Tests:


1. Coordinates normalize to target dimension
2. Empty coordinates produce zero vector
3. Pixel buffers downsample deterministically
4. Lattice map input normalizes without mutation
5. Formula params are sorted before normalization

---

### Test File 3

```text
tests/photonic-retina/retina-encoder.test.js
```

Tests:

1. Same input creates same packet ID
2. Same input creates same byte data
3. Different config creates different config hash
4. Binary sign quantization only emits `-1`, `0`, `1`
5. Scalar quantization stays within int8 range
6. Packet metadata marks deterministic true


Example:

```js
import { describe, expect, test } from 'vitest';
import { normalizeRetinaConfig } from '../../src/lib/photonic-retina/retina-schema.js';
import { validateRetinaInput } from '../../src/lib/photonic-retina/retina-schema.js';
import { simulateRetinaEncoding } from '../../src/lib/photonic-retina/retina-encoder.js';

describe('retina-encoder', () => {
  test('same input produces same packet', () => {
    const config = normalizeRetinaConfig();
    const input = validateRetinaInput({
      sourceKind: 'coordinates',
      payload: [
        { x: 1, y: 2, color: '#ffffff', emphasis: 1 },
      ],
    });

    const first = simulateRetinaEncoding(input, config);
    const second = simulateRetinaEncoding(input, config);

    expect(first.packetId).toBe(second.packetId);
    expect(Array.from(first.data)).toEqual(Array.from(second.data));
  });
});
```

---

### Test File 4

```text
tests/photonic-retina/retina-adapter.test.js
```

Tests:

1. Off mode returns null
2. Shadow mode returns packet
3. Warn mode returns null on invalid input
4. Gate mode throws on invalid input
5. Adapter does not throw in default shadow mode

Example:

```js
import { describe, expect, test } from 'vitest';
import { encodeToPhotonicRetina } from '../../src/lib/photonic-retina/index.js';

describe('retina-adapter', () => {
  test('off mode returns null', () => {
    const packet = encodeToPhotonicRetina(
      { sourceKind: 'coordinates', payload: [] },
      { mode: 'off' }
    );

    expect(packet).toBeNull();
  });

  test('gate mode throws on invalid input', () => {
    expect(() => encodeToPhotonicRetina(
      { sourceKind: 'bad-source', payload: [] },
      { mode: 'gate' }
    )).toThrow();
  });
});
```

---

## 18. QA Commands

Run:

```bash
pnpm test tests/photonic-retina
```

Optional full test run:

```bash
pnpm test
```

Optional lint:

```bash
pnpm lint
```

Optional type check if available:

```bash
pnpm typecheck
```

---

## 19. Acceptance Criteria

The feature is accepted when:

1. All Retina tests pass
2. No existing PixelBrain tests fail
3. Core encoder uses no `Date.now()`
4. Core encoder uses no `performance.now()`
5. Core encoder uses no `Math.random()`
6. Same input produces same `packetId`
7. Same input produces same `Int8Array`
8. Invalid input cannot crash the UI in shadow mode
9. The public API is only `encodeToPhotonicRetina`
10. No UI rendering behavior changes in Phase 1

---

## 20. Regression Risks

### Risk 1: UI Performance Degradation

Cause:

Encoding might be called too often during brush drag events.

Mitigation:

* Shadow-only
* Batch later
* Debounce later
* Web Worker later

Retest:

* Drag brush rapidly
* Confirm no frame drops
* Confirm no render-loop blocking

---

### Risk 2: Determinism Drift

Cause:

Timestamps, random values, unstable object serialization, Map iteration surprises.

Mitigation:

* Stable serialization
* Sorted object keys
* No wall-clock APIs
* Golden packet tests

Retest:

* Run same test 100 times
* Confirm identical packet IDs and data arrays

---

### Risk 3: Schema Mismatch with Future Photonic Bridge

Cause:

The bridge packet expectations may evolve.

Mitigation:

* Keep packet schema versioned
* Keep bridge out of Phase 1
* Add bridge contract tests in Phase 2

Retest:

* Validate packet against bridge schema once bridge exists

---

### Risk 4: Adapter Boundary Violation

Cause:

UI imports encoder directly.

Mitigation:

* Document public API
* Keep encoder internal
* Add import lint rule later if needed

Retest:

* Search for `simulateRetinaEncoding` imports outside tests

---

### Risk 5: Overclaiming Optical Physics

Cause:

Language suggests real photonic acceleration.

Mitigation:

* Explicitly call Phase 1 a deterministic software simulation
* Keep hardware claims out of code comments
* Use "hardware-inspired" instead of "hardware-backed"

Retest:

* Review docs for misleading claims

---

## 21. Glossary

### Photonic Retina

The software optical ingestion layer. It receives raw visual intent and compresses it into deterministic vector packets.

### Optical Ingestion Engine

Codex name for the Photonic Retina. Describes its function as the first visual compression boundary.

### PhotonicVectorPacket

A compact, versioned, deterministic packet containing quantized vector data and metadata.

### Seamless Painting

A target experience where visual input feels immediate because raw visual data is compressed at the ingestion edge.

### Shadow Mode

A rollout mode where the system runs in parallel without affecting user-facing behavior.

### Gate Mode

A strict mode where invalid inputs throw errors. Used for tests and future enforcement.

### Signed Hash Rotation

A deterministic sign-flipping operation used to simulate lightweight vector rotation without random state.

### Scalar Quantization

A compression method that maps continuous values into a limited numeric range.

### Binary Sign Quantization

A compression method that maps values into `-1`, `0`, or `1`.

### Stable Serialization

A deterministic method of converting objects to strings so key order cannot alter hashes.

---

## 22. Q&A

### Q1: Is this real photonic computing?

No. Phase 1 is software-only. It simulates the shape of a photonic ingestion process without requiring optical hardware.

### Q2: Does this replace PixelBrain?

No. PixelBrain remains the visual generation and rendering system. The Retina only observes or receives visual data and compresses it into packets.

### Q3: Why does packet ID determinism matter?

Because packet IDs become cache keys, replay keys, golden test anchors, and future bridge inputs. If packet IDs use timestamps, the entire system becomes harder to test.

### Q4: Why not wire it directly into the canvas?

Direct canvas coupling would make the Retina fragile. The Retina should consume data contracts, not UI events or rendering internals.

### Q5: Why start in shadow mode?

Shadow mode proves stability without risking the existing UI. It lets the system collect packets before packets control anything.

### Q6: Why use int8 first?

Int8 is simple, portable, easy to test, and close enough to the low-bit quantization goal for Phase 1.

### Q7: Why not implement true 1-bit immediately?

1-bit support is useful, but 4-bit and 8-bit modes make debugging easier. Binary sign quantization can still be included as an option.

### Q8: What should happen on malformed input?

Shadow and warn modes should return null. Gate mode should throw.

### Q9: Should the packet contain raw input?

No. The packet should contain hashes and compressed data, not heavy raw payloads.

### Q10: Can this run in a Web Worker later?

Yes. The core encoder should avoid browser-only APIs so it can be moved into a worker with minimal changes.

---

## 23. Completion Definition

Phase 1 is complete when the Retina can accept coordinate input, pixel input, and lattice input, then produce stable `PhotonicVectorPacket` objects with deterministic hashes and passing tests.

The correct Phase 1 emotional result:

> Nothing visible changes, but the system quietly grows an eye.

That eye does not paint yet.
It watches.
It compresses.
It remembers shape as math.
