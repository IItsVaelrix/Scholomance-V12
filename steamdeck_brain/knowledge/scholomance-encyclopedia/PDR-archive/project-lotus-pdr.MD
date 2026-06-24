# PDR-2026-05-17: Project Lotus

**Codename:** `LOTUS-V0`  
**Project Family:** Scholomance / PixelBrain / PixelCinema / PixelCinema Forge  
**Upgrade Type:** Raster composition infrastructure layer  
**Primary Goal:** Add a deterministic raster-based composition engine to PixelBrain using **CELS** as the core layer-stack model, producing canonical composed pixel buffers that renderer adapters like PixiJS, Canvas, Skia, WebGPU, and future C++ hosts can display without owning composition logic.  
**Status:** Theoretical PDR, pre-implementation  
**Authoring Mode:** Architectural blueprint and implementation guardrail  
**Risk Posture:** Medium-high. The layer is conceptually simple, but alpha, color-space, precision, clipping, and determinism mistakes are expensive to retrofit.  
**Audience:** Scholomance AI coding agents, Gemini implementer agents, future PixelBrain / PixelCinema maintainers.  

---

## 1. Summary

Project Lotus is the missing raster composition layer for PixelBrain.

PixelBrain already has coordinate intelligence, formula intelligence, lattice/grid logic, symmetry AMPs, procedural noise, palette mapping, bytecode diagnostics, voxel substrate direction, and a future Forge path for Wasm/C++ portability. What it lacks is a first-class compositor that owns the final assembly of pixels.

Project Lotus fills that gap.

```txt
PixelBrain Brain
  -> formulas, coordinates, lattices, symmetry, voxel/material intent
    -> Project Lotus CELS compositor
      -> deterministic composed pixel buffer
        -> renderer adapter displays output
```

Lotus is not a renderer. It is not a game engine. It is not a PixiJS scene helper. It is the deterministic raster compositor that sits between PixelBrain's generated structure and the final visual output.

The key separation:

```txt
Brain        = decides what exists and why
Compositor   = assembles pixels deterministically
Renderer     = displays composed pixels
```

Project Lotus may be described casually as the **printer**, but its internal architecture should be understood as a **compositor/recomposition engine**. The printer metaphor describes final output. The compositor model preserves future support for dirty regions, pass caching, partial recomposition, and backend parity.

---

## 2. Why

### 2.1 Current Problem

PixelBrain can generate meaningful visual structure, but final image assembly is currently spread across utilities, renderer assumptions, texture helpers, style extensions, and future engine ideas.

This creates several risks:

- Composition logic gets duplicated across Canvas, PixiJS, Phaser, Skia, and future C++ paths.
- Blend modes, alpha behavior, masks, and post-processing become inconsistent.
- Generated assets may have strong procedural structure but weak final polish.
- Golden tests can accidentally preserve visually wrong math if alpha and color-space rules are not fixed early.
- Renderer adapters may become accidental sources of truth.

The engine needs one canonical place where raster frames are assembled.

### 2.2 Target Solution

Project Lotus introduces a deterministic raster compositor built around **CELS**:

```txt
CELS = Compositional Element Layer Stack
```

CELS is a bottom-up layer stack that produces an accumulator buffer. Passes may read from named cels, masks, or the accumulator, but cels must not reference each other directly.

```txt
Cel Stack
  Cel 0: background
  Cel 1: silhouette
  Cel 2: material fill
  Cel 3: texture
  Cel 4: shadow
  Cel 5: light
  Cel 6: glyph glow
  Cel 7: dither / polish
  -> accumulator
  -> final surface
```

The canonical output is a deterministic pixel buffer.

### 2.3 Why Now

This is the correct next layer because PixelBrain is moving toward PixelCinema Forge and cross-runtime determinism. Forge can seal substrate/frame execution, but it does not by itself solve final raster assembly. Lotus becomes the frame-composition layer that Forge, PixiJS, Skia, Canvas, and future native hosts can consume consistently.

The mistake would be to build C++ rendering, PixiJS display, or Skia integration before the composition contract is sealed.

---

## 3. Change Classification

**Classification:** Architectural + infrastructural.

Project Lotus adds a new core layer, not a visual effect feature.

### Impact Level

| System | Impact | Notes |
|---|---:|---|
| PixelBrain render/output path | High | Final raster assembly gains canonical owner. |
| PixelBrain coordinate/formula systems | Medium | They feed Lotus but do not own pixel composition. |
| PixelCinema Forge | Medium | Lotus should align with Forge determinism and future Wasm/C++ portability. |
| PixiJS integration | Medium | PixiJS becomes display adapter, not composition authority. |
| Skia integration | Medium | Skia may become backend/validation path, not conceptual owner. |
| TurboQuant | Medium | TurboQuant provides placement decisions, not raster writes. |
| Existing image texture utilities | Medium | Promoted or absorbed into Lotus blend/pass logic. |
| Tests/golden fixtures | High | Need pixel-exact canonical fixture strategy. |
| WASM hot path | Future | Only after JS golden tests exist. |

---

## 4. Existing Foundation

Project Lotus should inherit or integrate with the following PixelBrain/PixelCinema concepts:

### 4.1 PixelBrain Coordinate and Formula Systems

- Formula-to-coordinate generation
- Lattice/grid snapping
- Symmetry transforms
- Template grids
- Image-to-pixel-art coordinate extraction

### 4.2 PixelBrain Raster-Adjacent Utilities

- Existing image texturing and blend mode functions
- Procedural noise and texture buffers
- Color-byte mapping and semantic palettes
- Anti-alias and pixel-grid control

### 4.3 PixelCinema Forge Direction

Forge defines the long-term portability direction: canonical frames, deterministic execution, Wasm AMPs, JS and C++ hosts, and cross-decoder parity. Lotus must remain compatible with that trajectory.

### 4.4 Project Lotus Foundational Decisions

These decisions are binding for v0:

1. Canonical Lotus output uses **premultiplied alpha**.
2. Blend math occurs in **linear-light space**.
3. sRGB encoding occurs only at output boundaries.
4. Determinism is enforced through `CompositionContext.rng`; `Math.random()` is banned under the Lotus subtree.
5. CELS is a deterministic stack composited bottom-up.
6. Passes may declare dependencies on named cels, masks, or the accumulator.
7. Cels must not reference other cels directly.
8. TurboQuant placement must flow through an explicit `PlacementDecision` contract.
9. PixelBuffer should be abstractable over `Uint8ClampedArray` and `Float32Array`.
10. Clipping build order is `rect -> mask -> polygon`, with polygon optionally rasterized into a mask.
11. Canonical golden tests are pixel-exact byte/hash comparisons with no tolerance.
12. Tolerances belong only in backend parity tests, such as JS vs WASM or JS vs Skia.
13. Phase 1 folder structure should stay flat.
14. Buffer pooling waits until profiling proves allocation cost.
15. Lotus should be thought of as a compositor/recomposition engine, not only a one-shot printer.

---

## 5. Product Definition

### 5.1 What Project Lotus Is

Project Lotus is a deterministic raster compositor for PixelBrain.

It receives cels, pixel buffers, masks, blend modes, clipping rules, placement decisions, and raster passes, then emits a canonical composed pixel buffer.

### 5.2 What Project Lotus Is Not

Project Lotus is not:

- A renderer.
- A game engine.
- A PixiJS wrapper.
- A Skia-only pipeline.
- A replacement for PixelCinema Forge.
- A scene graph.
- A general image editor.
- A freeform GPU effects playground.
- A place for nondeterministic visual behavior.

### 5.3 Core Positioning

```txt
PixelBrain decides.
Lotus composes.
PixiJS/Canvas/Skia/native renderers display.
```

Short version:

```txt
Project Lotus turns PixelBrain's procedural visual intelligence into deterministic composed pixels.
```

Vaelrixian version:

```txt
Lotus is where PixelBrain stops sketching symbols in the air and learns how to print the spell onto the page.
```

---

## 6. Architectural Layers

```txt
Layer 0 — Semantic / Formula Brain
  PDRs, prompts, image analysis, formulas, coordinates, symbolic meaning

Layer 1 — Spatial Structure
  lattice, symmetry, coordinates, voxel/material intent, TurboQuant placement

Layer 2 — Project Lotus CELS Compositor
  buffers, cels, masks, blend modes, clipping, passes, accumulator

Layer 3 — Renderer Adapters
  Canvas2D, PixiJS, Skia/CanvasKit, WebGL/WebGPU, future native host

Layer 4 — Display / Export Surface
  browser viewport, PNG export, texture upload, video frame, native window
```

**Invariant:** Layer 2 owns composition. Layer 3 only displays or uploads the result.

---

## 7. Pipeline

### 7.1 Normal Path

```txt
PixelBrain visual intent
  -> coordinate/material/palette generation
    -> optional TurboQuant PlacementDecision
      -> CELS construction
        -> clipping + masks
          -> bottom-up cel composition
            -> raster passes
              -> final premultiplied RGBA8 surface
                -> renderer adapter
```

### 7.2 Future Recomposition Path

```txt
Input change
  -> mark affected cel/pass dirty
    -> recompute only affected buffers
      -> update accumulator region
        -> upload changed region to renderer
```

Dirty-region tracking is not required in Phase 1, but architecture must not block it.

---

## 8. Functional Requirements

## P0 — Contract Seal

Before implementation, create `src/pixelbrain/lotus/CONTRACT.md`.

### P0.1 Alpha Contract

Canonical Lotus output MUST use premultiplied alpha.

- Internal canonical surface format: premultiplied RGBA8.
- Straight-alpha inputs are converted at intake boundaries.
- No canonical pass may assume straight alpha.
- Adapters may export straight alpha only as an explicit conversion.

### P0.2 Color / Blend Contract

Lotus MUST blend in linear-light space.

- sRGB inputs decode to linear before blend math.
- Blend modes operate in linear space.
- Output boundary encodes to sRGB.
- Golden fixtures must preserve this behavior.

### P0.3 Determinism Contract

Lotus MUST be deterministic.

- `Math.random()` is forbidden under `lotus/`.
- Randomness flows through `CompositionContext.rng`.
- Canonical tests use pixel-exact byte/hash comparison.
- Layer order and pass order must be explicit.
- No unordered map/object iteration may affect output.

### P0.4 CELS Contract

- CELS is a stack.
- Cels composite bottom-up into an accumulator.
- Cels cannot reference each other directly.
- Passes may declare dependencies on named cels, masks, or accumulator.

### P0.5 Placement Contract

TurboQuant and other placement intelligence must communicate with Lotus using `PlacementDecision`.

### P0.6 Clipping Contract

Canonical clipping order:

```txt
rect -> mask -> polygon
```

Polygon clipping may initially be implemented by rasterizing polygon regions into masks.

**P0 Exit Criteria:** `CONTRACT.md` exists, constants are declared, and tests/lint rules enforce deterministic entropy boundaries.

---

## P1 — CPU CELS Prototype

### P1.1 Pixel Buffer

Implement canonical pixel buffer creation.

```ts
export type PixelBufferKind = 'rgba8' | 'rgba32f';
export type AlphaMode = 'premultiplied';
export type StorageColorSpace = 'srgb' | 'linear';
export type BlendSpace = 'linear';

export type PixelBuffer<T extends Uint8ClampedArray | Float32Array> = {
  width: number;
  height: number;
  data: T;
  kind: PixelBufferKind;
  storageColorSpace: StorageColorSpace;
  blendSpace: BlendSpace;
  alphaMode: AlphaMode;
};
```

Phase 1 MAY use only `Uint8ClampedArray`, but public signatures should not make future `Float32Array` support painful.

### P1.2 Composition Context

```ts
export type CompositionContext = {
  seed: string | number;
  rng: SeededRng;
  deterministic: true;
  warnings: string[];
};
```

### P1.3 CELS

```ts
export type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay';

export type LotusCel = {
  id: string;
  name?: string;
  width: number;
  height: number;
  buffer: PixelBuffer<Uint8ClampedArray>;
  opacity: number;
  blendMode: BlendMode;
  visible: boolean;
  clip?: ClipRegion;
  mask?: LotusMask;
};

export type LotusComposition = {
  id: string;
  width: number;
  height: number;
  cels: LotusCel[];
  passes: LotusPass[];
  context: CompositionContext;
};
```

### P1.4 Blend Modes

Implement:

- normal
- multiply
- screen
- overlay

All blend math is linear-light and premultiplied-alpha aware.

### P1.5 Clipping

Implement:

- rect clipping
- mask clipping

Polygon clipping may be deferred, but the type should exist.

```ts
export type ClipRect = {
  type: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ClipMask = {
  type: 'mask';
  maskId: string;
};

export type ClipPolygon = {
  type: 'polygon';
  points: Array<{ x: number; y: number }>;
};

export type ClipRegion = ClipRect | ClipMask | ClipPolygon;
```

### P1.6 Compose

```ts
export function composeCels(composition: LotusComposition): PixelBuffer<Uint8ClampedArray>;
```

Output must be deterministic and premultiplied RGBA8.

### P1.7 Golden Tests

Create fixtures for:

1. Empty transparent frame.
2. Single opaque cel.
3. Two normal cels.
4. Multiply blend.
5. Screen blend.
6. Overlay blend.
7. Opacity 50%.
8. Rect clipping.
9. Mask clipping.
10. Deterministic seeded pass placeholder.

**P1 Exit Criteria:** All golden fixtures produce pixel-exact stable hashes across 100 runs.

---

## P2 — Placement and Raster Passes

### P2.1 PlacementDecision

```ts
export type PlacementAnchor = 'top-left' | 'center' | 'baseline' | 'custom';
export type SnapAxis = 'x' | 'y' | 'both' | 'none';

export type PlacementDecision = {
  celId: string;
  x: number;
  y: number;
  anchor: PlacementAnchor;
  snapAxis: SnapAxis;
  lattice?: {
    gridSize: number;
    cellX: number;
    cellY: number;
    localX?: number;
    localY?: number;
  };
  customAnchor?: {
    x: number;
    y: number;
  };
};
```

Lotus consumes placement decisions. It does not invent placement intelligence.

### P2.2 Pass Contract

```ts
export type LotusPassTarget = 'accumulator' | `cel:${string}` | `mask:${string}`;

export type LotusPass = {
  id: string;
  type: string;
  reads: LotusPassTarget[];
  writes: LotusPassTarget;
  enabled: boolean;
};
```

Initial pass types:

- texture pass
- shadow pass
- light pass
- outline pass
- dither pass
- palette quantization pass

Only add these after P1 is stable.

---

## P3 — Renderer Adapters

Adapters are consumers, not authorities.

### P3.1 Canvas Adapter

```ts
export function toCanvasImageData(buffer: PixelBuffer<Uint8ClampedArray>): ImageData;
```

### P3.2 PixiJS Adapter

```ts
export function toPixiTexture(buffer: PixelBuffer<Uint8ClampedArray>): unknown;
```

PixiJS must not own composition, clipping, masks, or canonical blend rules.

### P3.3 Skia Adapter

Skia may be used for:

- precision raster backend
- validation backend
- future native path
- pixel-perfect rasterization support

Skia must not become the conceptual owner of Lotus composition.

---

## P4 — WASM Hot Loops

Only after P1/P2 golden tests exist.

Candidate WASM ports:

- blend loops
- mask application
- dithering
- palette quantization
- glow / blur kernels
- linear/sRGB conversion kernels

### P4 Exit Criteria

For each WASM port:

```txt
JS canonical output == WASM output
```

Comparison may use tolerance only where specified in backend parity tests. Canonical JS output remains the reference until the WASM path becomes canonical through a separate PDR/spec update.

---

## 9. Non-Goals

Lotus v0 does not include:

- Full GPU compositor.
- Skia-first architecture.
- PixiJS-first architecture.
- Game engine entities.
- Physics.
- Audio.
- Input.
- Networking.
- Full animation editor.
- Dirty-region caching implementation.
- BufferPool unless profiling proves need.
- WASM implementation before JS golden tests.
- Arbitrary scene graph.

---

## 10. Repository Layout

Phase 1 should stay flat:

```txt
src/pixelbrain/lotus/
  CONTRACT.md
  index.ts

  buffers/
    pixelBuffer.ts
    colorSpace.ts
    premultiply.ts

  cels/
    celTypes.ts
    createCel.ts
    celStack.ts

  blend/
    blendTypes.ts
    blendModes.ts
    normal.ts
    multiply.ts
    screen.ts
    overlay.ts

  clip/
    clipTypes.ts
    rectClip.ts
    maskClip.ts

  compose/
    compositionTypes.ts
    compositionContext.ts
    composeCels.ts

  test/
    golden/
    blendModes.test.ts
    cels.test.ts
    clipping.test.ts
    deterministicOutput.test.ts
    mathRandomBan.test.ts
```

Do not create adapter, wasm, Skia, or PixiJS directories until the compositor core is stable.

---

## 11. Interface Contracts

### 11.1 Alpha

Canonical surfaces are premultiplied.

Given straight-alpha input:

```txt
r' = r * a
g' = g * a
b' = b * a
a' = a
```

All canonical buffers store premultiplied channels.

### 11.2 Linear-Light Blend

Canonical blend pipeline:

```txt
sRGB input bytes
  -> normalize 0..1
    -> decode sRGB to linear
      -> premultiplied blend math
        -> encode linear to sRGB at output boundary
          -> RGBA8 bytes
```

### 11.3 Deterministic RNG

```ts
export type SeededRng = {
  nextFloat01(): number;
  nextUint32(): number;
};
```

No canonical Lotus code may call `Math.random()`.

### 11.4 Golden Hashing

Canonical golden fixture hashing uses byte-exact RGBA output.

```txt
sha256(buffer.data)
```

No tolerances in canonical suite.

---

## 12. Validation and Fail-Closed Behavior

### 12.1 Input Validation

- Width and height must be positive integers.
- Buffer length must equal `width * height * 4`.
- Cel dimensions must match its buffer dimensions.
- Opacity must be clamped to `[0, 1]` or rejected based on API mode.
- Blend mode must be from known set.
- Clip regions must be inside or safely intersected with composition bounds.
- Cels must have unique IDs.
- Pass IDs must be unique.

### 12.2 Fail-Closed Conditions

- Unknown blend mode.
- Unsupported alpha mode.
- Unsupported color space.
- Buffer length mismatch.
- Cel dependency/reference cycle attempt.
- Pass writes outside declared target.
- `Math.random()` detected in canonical Lotus subtree.

### 12.3 Diagnostics

Project Lotus should use PixelBrain-style structured diagnostics when available.

Initial diagnostic names:

| Name | Trigger | Halt? |
|---|---|---|
| `LOTUS_BUFFER_SIZE_MISMATCH` | data length != width * height * 4 | Yes |
| `LOTUS_UNSUPPORTED_ALPHA_MODE` | non-premultiplied canonical buffer | Yes |
| `LOTUS_UNSUPPORTED_BLEND_SPACE` | non-linear canonical blend request | Yes |
| `LOTUS_UNKNOWN_BLEND_MODE` | blend mode not registered | Yes |
| `LOTUS_CLIP_INVALID` | malformed clip region | Yes |
| `LOTUS_CEL_ID_DUPLICATE` | duplicate cel IDs | Yes |
| `LOTUS_PASS_CONTRACT_VIOLATION` | pass reads/writes invalid target | Yes |
| `LOTUS_NONDETERMINISTIC_RANDOM` | Math.random use detected | Yes |
| `LOTUS_GOLDEN_HASH_MISMATCH` | fixture hash changed unexpectedly | Yes |

---

## 13. Determinism Requirements

Lotus v0 is deterministic for the same input composition.

### Stable Inputs

- composition ID
- dimensions
- cel order
- cel buffers
- opacity
- blend modes
- clip regions
- masks
- pass list
- seed
- placement decisions

### Forbidden Canonical Inputs

- wall-clock time
- `Math.random()`
- renderer state
- browser pixel ratio
- GPU driver behavior
- unordered object iteration
- debug panel state

### Required Ordering

- Cels composite in explicit array order.
- Passes execute in explicit array order.
- Maps must be sorted before canonical hash if used.
- Ties must have stable tie-breakers.

---

## 14. Testing Strategy

### 14.1 Unit Tests

- sRGB ↔ linear conversion
- premultiply / unpremultiply
- createBuffer invariants
- normal blend
- multiply blend
- screen blend
- overlay blend
- rect clipping
- mask clipping
- opacity
- alpha preservation

### 14.2 Golden Tests

Pixel-exact, no tolerance.

```txt
input composition fixture -> output RGBA8 -> sha256 -> expected hash
```

### 14.3 Determinism Tests

- Same composition run 100 times produces identical hash.
- Same seed produces identical procedural decisions.
- Different seed changes only seeded passes.
- `Math.random()` ban test passes.

### 14.4 Backend Parity Tests

Future only:

- JS vs WASM
- JS vs Skia
- JS vs PixiJS upload/readback if practical

Tolerance allowed only here, never in canonical golden tests.

---

## 15. Integration Points

### 15.1 Upstream Producers

- PixelBrain coordinate engine
- PixelBrain formula engine
- PixelBrain lattice/grid engine
- Symmetry AMP
- Color-byte mapping
- Procedural noise
- TurboQuant placement oracle
- PixelCinema Forge frame producers

### 15.2 Downstream Consumers

- Canvas2D adapter
- PixiJS viewport adapter
- Skia/CanvasKit backend
- WebGL/WebGPU texture upload
- Future C++ native host
- Export pipeline

---

## 16. Security / Safety / Stability

Project Lotus is not security-critical in the web-auth sense, but it is stability-critical.

Rules:

- No unbounded buffer writes.
- All pixel writes must bounds-check or operate inside precomputed safe regions.
- All clipping must intersect with composition bounds.
- No renderer global state in canonical output path.
- No hidden mutable singletons.
- No nondeterministic entropy.
- No silent fallback to straight alpha.
- No silent fallback to sRGB blending.

---

## 17. Failure Modes

### 17.1 Alpha Haloing

**Cause:** Straight-alpha blending or filtering through transparent edges.  
**Mitigation:** Premultiplied alpha canonical path.

### 17.2 Wrong Blend Appearance

**Cause:** Blending in sRGB instead of linear-light.  
**Mitigation:** Decode to linear before blend; encode to sRGB at output boundary.

### 17.3 Scene Graph Creep

**Cause:** Cels reference other cels directly.  
**Mitigation:** Cels are stack-only; passes declare dependencies.

### 17.4 Placement Leakage

**Cause:** TurboQuant logic writes pixels directly or Lotus invents placement.  
**Mitigation:** `PlacementDecision` boundary.

### 17.5 Banding / Precision Loss

**Cause:** Repeated lighting/shadow/glow accumulation in RGBA8.  
**Mitigation:** PixelBuffer generic over RGBA8 and RGBA32F; float buffers when passes require them.

### 17.6 Fixture Wrongness

**Cause:** Golden tests written before alpha/color-space contract.  
**Mitigation:** P0 contract before P1 implementation.

### 17.7 Premature WASM Complexity

**Cause:** Starting with toolchain/performance before behavior is correct.  
**Mitigation:** JS prototype first, WASM only after golden tests.

---

## 18. Milestones

### Phase 0 — Contract Seal

**Goal:** Freeze alpha, blend space, and determinism law.

Deliverables:

- `CONTRACT.md`
- constants/types for alpha/color-space/determinism
- seeded RNG utility
- Math.random ban test/lint

Exit criteria:

- Contract exists.
- Canonical choices are represented in types.
- Nondeterminism ban is mechanically enforced.

### Phase 1 — CELS CPU Compositor

**Goal:** Compose simple cels into stable RGBA output.

Deliverables:

- PixelBuffer
- createCel
- composeCels
- normal/multiply/screen/overlay
- rect clip
- mask clip
- golden fixtures

Exit criteria:

- 10 golden fixtures pass byte-exact hash comparison.
- 100-run determinism test passes.

### Phase 2 — Placement Contract

**Goal:** Integrate TurboQuant-style placement without leaking intelligence into Lotus.

Deliverables:

- `PlacementDecision` type
- placement application helper
- snap-axis handling
- lattice placement fixture

Exit criteria:

- Placement decisions produce deterministic cel placement.
- Lotus does not call TurboQuant directly in canonical composition.

### Phase 3 — Raster Pass System

**Goal:** Add dependency-declared passes without turning CELS into a scene graph.

Deliverables:

- `LotusPass` contract
- reads/writes validation
- texture pass
- outline pass or shadow pass as first proof

Exit criteria:

- Passes can read named cels or accumulator.
- Pass writes are validated.
- No direct cel-to-cel references.

### Phase 4 — Adapter Proof

**Goal:** Display Lotus output without changing composition semantics.

Deliverables:

- Canvas ImageData adapter
- PixiJS texture adapter

Exit criteria:

- Adapter output visually matches canonical buffer.
- Adapter does not own composition logic.

### Phase 5 — WASM Hot Loop Proof

**Goal:** Port one hot loop after JS behavior is sealed.

Deliverables:

- WASM blend or mask kernel
- JS vs WASM parity test

Exit criteria:

- WASM output matches JS canonical output under parity rules.

---

## 19. Success Demo

The first Lotus demo should be small:

1. Create three cels:
   - background cel
   - object silhouette cel
   - glyph glow cel
2. Compose them with normal and screen/multiply blend modes.
3. Apply rect clipping and mask clipping.
4. Output premultiplied RGBA8.
5. Hash output buffer.
6. Display the exact same buffer through Canvas and PixiJS.

Minimum proof statement:

```txt
Same CELS composition, same seed, same bytes, displayed by multiple adapters.
```

---

## 20. Documentation Requirements

Project Lotus ships with:

```txt
src/pixelbrain/lotus/
  CONTRACT.md
  README.md
  docs/
    ALPHA.md
    COLOR_SPACE.md
    CELS.md
    DETERMINISM.md
    GOLDEN_TESTS.md
    PLACEMENT_DECISION.md
```

Only `CONTRACT.md` is required before Phase 1. The rest can land as the implementation expands.

---

## 21. Open Questions

These are intentionally deferred:

1. Exact seed RNG implementation.
2. Whether canonical output remains RGBA8 forever or RGBA32F becomes canonical for specific passes.
3. Whether Skia becomes a validation backend or a production backend first.
4. Whether Lotus lives under PixelBrain directly or eventually migrates into PixelCinema Forge.
5. Whether CELS should support frame sequences in v1 or only static compositions.
6. Dirty-region API design.
7. Pass caching strategy.

These are not deferred:

- Premultiplied alpha.
- Linear-light blend space.
- Deterministic RNG threading.
- Math.random ban.

---

## 22. First Implementation Slice

Do not start with PixiJS.  
Do not start with Skia.  
Do not start with WASM.  
Do not start with lighting/glow.

Start with:

```txt
src/pixelbrain/lotus/CONTRACT.md
src/pixelbrain/lotus/buffers/pixelBuffer.ts
src/pixelbrain/lotus/buffers/colorSpace.ts
src/pixelbrain/lotus/buffers/premultiply.ts
src/pixelbrain/lotus/cels/createCel.ts
src/pixelbrain/lotus/blend/blendModes.ts
src/pixelbrain/lotus/clip/rectClip.ts
src/pixelbrain/lotus/clip/maskClip.ts
src/pixelbrain/lotus/compose/composeCels.ts
src/pixelbrain/lotus/test/golden/*.json
```

First PR name:

```txt
feat(lotus): seal raster composition contract and CPU cel compositor
```

---

## 23. QA Checklist

### Contract

- [ ] `CONTRACT.md` exists.
- [ ] Premultiplied alpha is canonical.
- [ ] Linear-light blending is canonical.
- [ ] sRGB encode occurs only at output boundary.
- [ ] `CompositionContext.rng` exists.
- [ ] `Math.random()` is banned under `lotus/`.

### Pixel Buffer

- [ ] Width/height are positive integers.
- [ ] Buffer length is validated.
- [ ] Alpha mode is explicit.
- [ ] Color storage and blend space are explicit.
- [ ] Premultiply conversion tested.
- [ ] sRGB/linear conversion tested.

### CELS

- [ ] Cel IDs are unique.
- [ ] Cels composite bottom-up.
- [ ] Invisible cels are skipped.
- [ ] Opacity is applied deterministically.
- [ ] Cels do not reference other cels.

### Blend

- [ ] Normal blend tested.
- [ ] Multiply tested.
- [ ] Screen tested.
- [ ] Overlay tested.
- [ ] Alpha handling tested.
- [ ] Linear-light behavior tested.

### Clip / Mask

- [ ] Rect clipping never writes outside bounds.
- [ ] Mask clipping alpha-multiplies as expected.
- [ ] Polygon is deferred or rasterized to mask.

### Golden

- [ ] Golden tests are pixel-exact.
- [ ] No tolerance in canonical tests.
- [ ] 100-run determinism test passes.
- [ ] Fixture hash changes require explicit approval.

---

## 24. Next Risks

### 24.1 Overbuilding the Folder Tree

Keep Phase 1 flat. Empty adapter/WASM/Skia folders create psychological pressure to fill them.

### 24.2 Renderer Ownership Drift

PixiJS, Skia, or Canvas must not become composition authorities.

### 24.3 Golden Fixtures Too Early

Golden fixtures before alpha/color-space contract are dangerous. They fossilize wrongness.

### 24.4 Over-Optimizing Memory

Do not add `BufferPool` until profiling proves allocation cost.

### 24.5 Losing Recomposition Path

Even if v0 recomposes the full frame, keep types and pass boundaries compatible with dirty-region tracking later.

---

## 25. Final Verdict

Project Lotus is Blueprint #1 because it gives PixelBrain a missing professional graphics layer.

PixelBrain already knows how to generate meaning, coordinates, formulas, lattices, symmetry, and voxel intent. PixelCinema Forge gives that intelligence a path toward portable deterministic execution. Project Lotus gives the whole system a canonical way to assemble final pixels.

The disciplined architecture is:

```txt
Brain -> Structure -> Lotus Compositor -> Renderer Adapter -> Display
```

The first move is not code. The first move is the contract.

```txt
Alpha: premultiplied.
Blend: linear-light.
Determinism: seeded RNG, Math.random banned.
```

Once those are sealed, the first compositor prototype becomes small, boring, testable, and correct.

That is the point.
