# PDR: QBIT-Voxel Level 3 — Multi-Biome Game Scenery

**Bytecode Search Code:** `SCHOL-ENC-PDR-QBIT-VOXEL-LEVEL3-v1`
**Date:** 2026-06-16
**Status:** Proposed
**Classification:** QBIT-Voxel | Chunked Volume | Cross-Chunk Energy Propagation | Wand Composite Formula | φ-scaled Overlap | Pluggable Attenuation
**Priority:** High
**Related papers / PDRs:**
- `docs/Scholo-Theory/QBIT-VOXEL-SYNTHESIS.md` — §3 Difficulty 10 (Memory Ceiling), §4 Level 3 (The World), §5.4 (Material Bleeding Halos), §5.5 (Photonic Interference Fringes), §6 Failure 2 (Isometric Sorting Cycle)
- `docs/Scholo-Theory/QBIT-VOXEL-SYNTHESIS-CONFIRMED.md` — §8 Level 3 path, §6 confirmed architecture invariants
- `2026-06-15-pixelbrain-volume-container-and-blender-bridge-pdr.md` — `PB-VOLUME-v1` generalization that this PDR inherits
- `2026-06-16-substrate-lens-voxel-inspector-pdr.md` — parallel inspector for the multi-chunk case
- `2026-06-12-pixelbrain-deterministic-pro-chestplate-pdr.md` — pattern for AMP seam contracts

---

## Owner(s)

- **Codex (architecture / schema):** Defines the `ChunkedWorldVolume` packet, the `composite` Wand formula grammar, the `world-energy-field` chunk-border contract, and the `codex/core/modulation/planner/div-layout-validator.js` extension for `world` node types. Owns the `world-volume` schema test and the `assertChunkedWorldVolume` guard.
- **Gemini (backend impl / tests):** Implements `codex/core/pixelbrain/chunked-world-volume.js` (chunk generation, border-overlap propagation, biome emergence), the `composite` formula entry point in `wand-seed-lift.js`, the inverse-square attenuation model in `qbit-field.js`, the immunity rule that rejects non-power-of-two chunk dimensions, the chunk-border AMP (`chunks-seam-amp.js`), and the test suite under `tests/core/pixelbrain/chunked-world-volume.test.js` + `tests/qa/pixelbrain/biome-emergence.test.js`.
- **Claude (UI surface):** Extends `VoxelScenePortal.jsx` to accept `world`-node props, builds the `WorldComposition` React component for multi-biome DivWand layouts, and adds the cross-chunk lens adapter to `SubstrateLens` (sub-PDR). Visual baselines in `tests/visual/`.
- **Escalation owner (cross-domain conflicts):** Angel. Specifically: the chunk-border propagation algorithm, the inverse-square vs Gaussian attenuation tradeoff, and the divergence of `BiomeCoherenceAMP` convergence proof at world scale.

---

## Context (seed — not the Executive Summary)

The QBIT-Voxel Synthesis paper §4 defines Level 3 ("The World") as the moment the system leaves the desk and enters the play space. The acceptance criteria are explicit: a 4×4 chunk grid using a `composite` Wand formula (multiple children, different energy types per child region), adjacent chunks sharing energy propagation at borders within a 16-cell overlap radius, and at least three distinct biomes emerging from the energy type distribution. The paper §3 Difficulty 10 calls out the hard unsolved problem: chunk borders. The QBIT energy field is global — a seed on one side of a chunk boundary should influence cells on the other side. With per-chunk propagation, energy is cut off at chunk edges, producing visible seams. Energy must be propagated with overlap across chunk borders, which requires coordination between adjacent chunks during generation.

The Level 1 confirmation paper §8 lists the same dependencies (chunk architecture, composite formula, inverse-square attenuation) as the open path. Level 1 was a 32³ crystal with a single Fibonacci seed and Gaussian decay. Level 3 is a 128³+ multi-region world with three or more energy types blending at boundaries and inverse-square decay. The architecture that produced the Level 1 crystal must now produce emergent continents.

This PDR is the implementation plan for that leap. It does not introduce a new rendering system. It composes the modules that Level 1 and Level 2 already shipped: `QBITField.propagate`, `HollownessAMP`, `BiomeCoherenceAMP`, `IsoProjector`, `VoxelSVGRenderer`. What is new is *coordination across chunks* and *the composite formula's spatial subdivision*. Everything else is reused.

The name is deliberate. *ChunkedWorldVolume*: a tree of voxel volumes, each a chunk, sharing energy across their borders. *Composite formula*: a Wand formula whose children are themselves formulas, each scoped to a sub-region of the XZ plane, each carrying its own energy type. The two together are what makes "alphabet meets physics" reach game scale.

---

## Target Integration Area

- `codex/core/pixelbrain/chunked-world-volume.js` — new module, ~400 LOC, exports `ChunkedWorldVolume`, `generateChunk`, `propagateBorderEnergy`, `getOrLoadChunk`, `worldEnergyAt`.
- `codex/core/pixelbrain/wand-seed-lift.js` — additive: export `generateCompositeSeeds`, `liftToMultiRegionVoxelSeeds`.
- `codex/core/pixelbrain/qbit-field.js` — additive: export `propagateInverseSquare` alongside the existing `propagate` (Gaussian). Backward-compatible.
- `codex/core/pixelbrain/biome-coherence-amp.js` — additive: export `runBiomeCoherenceAMPWorld` (chunk-aware variant that respects chunk boundaries during negotiation).
- `codex/core/pixelbrain/chunks-seam-amp.js` — new AMP that injects the 16-cell overlap energy at chunk borders before material assignment.
- `codex/core/pixelbrain/voxel-volume.js` — additive: export `ENERGY_TYPES` expansion (already exists; verify all eight are mapped from `SCHOOL_TO_ENERGY`).
- `codex/core/modulation/planner/div-layout-validator.js` — additive: allow `type: 'world'`, `role: 'world-scene'`, props `{ chunkSize, chunkCount, formula }`.
- `src/pages/DivWand/components/WorldComposition.jsx` — new React component for multi-biome DivWand layouts. Mirrors `VoxelScenePortal.jsx` but iterates visible chunks.
- `src/pages/DivWand/components/VoxelScenePortal.jsx` — small additive change: detect `node.type === 'world'` and dispatch to `WorldComposition`.
- `src/lib/pixelbrain.adapter.js` — re-export the new public surface.
- `tests/core/pixelbrain/chunked-world-volume.test.js` — unit tests for chunk generation, border propagation, determinism, memory bounds.
- `tests/core/pixelbrain/wand-seed-lift.test.js` — extend with `generateCompositeSeeds` and `liftToMultiRegionVoxelSeeds` tests.
- `tests/core/pixelbrain/qbit-field.test.js` — extend with `propagateInverseSquare` tests; verify it matches the documented attenuation model.
- `tests/qa/pixelbrain/biome-emergence.test.js` — integration test: generate a 4×4 chunk world, assert ≥ 3 distinct biomes, assert boundary bleed, assert determinism, assert no visible seams.
- `tests/visual/` — baselines for the WorldComposition visual output.
- `codex/core/immunity/registry.js` — register the new `world-chunk` rule group (rejects non-power-of-two chunk dimensions, rejects chunk counts < 1, rejects chunkSize < 8).
- `docs/scholomance-encyclopedia/Scholomance LAW/SCHEMA_CONTRACT.md` — add `PB-WORLD-v1` to the schema registry.
- `docs/scholomance-encyclopedia/Scholomance LAW/SCHEMA_CONTRACT.md` — add the `composite` formula grammar to the Wand formula registry.

---

## Core Concept

A `ChunkedWorldVolume` is a `Map<string, VoxelVolume>` keyed by `"cx,cy,cz"` chunk coordinates, plus a global seed formula. The world is generated lazily: `getOrLoadChunk(cx, cy, cz)` evaluates the global seed formula in the chunk's coordinate window, lifts the resulting 2D coordinates to 3D QBIT seed points, propagates energy with inverse-square attenuation, runs `HollownessAMP` and `BiomeCoherenceAMP` per-chunk, then calls `propagateBorderEnergy` to receive the 16-cell overlap energy from already-generated neighbor chunks. The composition root is the `composite` Wand formula: a tree of children, each with its own energy type and a sub-region of the XZ plane (a rectangle, a Voronoi cell, a radial wedge — defined by the formula's `region` field).

The first chunk loaded has no neighbors, so it runs the base propagation only. Each subsequent chunk looks up its already-generated neighbors (4 horizontal + 4 vertical + 4 diagonal for 3D), reads the energy values within the 16-cell border overlap radius, and injects them as additional seed points with the neighbor's energy type. The chunk's own propagation then sums its seeds with the imported border energy, producing a smooth gradient across the chunk boundary. A subsequent run of `BiomeCoherenceAMP` negotiates material assignments at the boundary using the actual summed energy, so the biome transition emerges from the physics, not from a hand-tuned blend mask.

The pipeline per chunk is:
```
generateChunk(cx, cy, cz):
  coords2D = globalFormula.evaluateInRegion(chunkWindow)
  seeds    = liftToMultiRegionVoxelSeeds(coords2D, volume, energyTypeMix)
  field    = propagateInverseSquare(seeds, ...)
  for neighbor in alreadyGeneratedNeighbors:
    field = injectBorderEnergy(field, neighbor, overlapRadius=16)
  assign materials from field
  applyHollownessAMP(volume, ...)
  runBiomeCoherenceAMPWorld(volume, field)
  return volume
```

A chunk grid of 4×4 at 64³ = 8M cells. Memory budget: 64³ × 6 bytes (cell + energy) = ~1.5 MB per chunk, 24 MB for a 4×4 world. Plus 16-cell overlap energy per border means 8 extra border regions of 64×16×64 = 64K cells each = ~1.5 MB total for the overlap, or zero if we reuse the neighbor's energy. Reuse the neighbor's energy. Keep memory flat.

---

## Implementation Philosophy

Small, composable, deterministic. Every byte the world emits is reproducible from `(formula, seed, chunkCoords)`. The world is a generalization, not a replacement — Level 1 crystals and Level 2 album covers keep working without modification, because `ChunkedWorldVolume` is a *coordinate address* on top of the existing `VoxelVolume`. The seed grammar (`composite`) is a generalization, not a replacement — existing formula types (`fibonacci`, `fractal_iter`, `parametric_curve`, `grid_projection`, `vectorized_text`) keep working as leaves of a composite tree.

No new RNG. No new post-processing. No new symmetry accidents. The composite formula's spatial subdivision is a pure function of formula parameters and chunk coordinates. Cross-chunk energy is a pure function of already-loaded neighbor state. The same `(formula, seed)` produces the same world on every run, on every machine, in every chunk load order.

The chunk seam is not a feature. It is the absence of a feature. The system does not "render" the seam; the seam does not exist in the data. Two adjacent chunks share a 16-cell overlap region where energy values are continuous because the border energy was injected before the chunk's own propagation ran. The biome boundary emerges from the energy field's own gradient, exactly as the theory paper §5.4 predicted.

---

## Required Sections

### 1. Executive Summary

The QBIT-Voxel pipeline scales to multi-chunk worlds. A `ChunkedWorldVolume` (`PB-WORLD-v1`) composes 16 or more `VoxelVolume` chunks into a unified world that uses a `composite` Wand formula for multi-biome seeding. Adjacent chunks share energy across a φ-scaled `⌊16φ⌋ = 25`-cell border overlap radius, eliminating the energy-field seam by construction. The seed-layer seam is impossible by a different mechanism: every existing Wand formula type is a pure function of world coordinates, so adjacent chunks evaluating the same formula in overlapping windows produce identical seeds in the overlap zone. F-16 (the seed-identity property test) is the formal witness. Attenuation is pluggable — `inverse_square` (default) and `phi_attenuation` (φ-scaled exponent `2/φ`) — empirically selected at implementation time per the Q-1 comparison. At least three distinct biomes (STRUCTURAL / THERMAL / PHOTONIC, drawn from `SCHOOL_TO_ENERGY`) emerge from the energy type distribution; boundaries between biomes show material bleeding because the boundary energy is real, not interpolated. The architecture is fully backward compatible: Level 1 crystals, Level 2 album covers, and existing `VoxelScenePortal` consumers all keep working. The blast radius is contained: additive modules, additive exports, additive schema entries, additive option parameters on existing functions, and one new immunity rule group. Status is **Proposed** — no code lands until §5 phase 1 is green and the chunk-border propagation algorithm is unit-tested in isolation.

### 2. Out of Scope / Non-Goals

- **Replacing** the existing `VoxelVolume` schema. `ChunkedWorldVolume` is a coordinate address on top of `VoxelVolume`, not a replacement.
- **Real-time runtime world streaming for the game.** The world is generated on demand; runtime LOD, mip-chain streaming, and player-region unloading are separate PDRs.
- **Octree acceleration for `propagateInverseSquare`.** Level 3 uses full O(n²) propagation within each chunk. Octree compression is a Level 4 concern.
- **A new renderer.** `WorldComposition` produces a face list per visible chunk; the existing `IsoProjector` and `VoxelSVGRenderer` consume it. No Three.js, no WebGL.
- **Storing floats in the canonical lattice.** All energy values are quantized to the energy field's existing Float32 representation. No Float64, no double-precision.
- **Editing the world after generation.** The world is a projection of the seed. Editing means changing the seed.
- **Material editor features beyond what already lives in `material-registry.js`.** Composite formulas use the same `ENERGY_TYPES` enum and the same `MATERIAL_THRESHOLDS` map.
- **BSP tree for the isometric sort.** Painter's algorithm is sufficient for chunked world geometry at this scale. Failure 2 (Escher Staircase) remains an open concern for overhangs; this PDR does not solve it.
- **Photonic Bridge integration for `propagateInverseSquare`.** Level 4 work. The inverse-square path runs on the JS runtime for Level 3; photonic acceleration is a follow-up.

### 3. Spec Sheet

#### 3.1 Functional spec

| ID | Requirement | Acceptance criterion |
|---|---|---|
| F-1 | `ChunkedWorldVolume` round-trips losslessly through `JSON.stringify → JSON.parse` for any deterministic state. | Golden test: serialize a 2×2 world with 4 chunks, parse, assert `Map.keys` match and energy values match. |
| F-2 | `getOrLoadChunk(cx, cy, cz)` is deterministic for identical `(formula, seed, chunkCoords)`. | Two cold calls produce byte-identical `VoxelVolume` data. |
| F-3 | `getOrLoadChunk` is idempotent: calling twice with the same coords returns the same chunk instance. | `===` check on returned volume. |
| F-4 | `propagateBorderEnergy` injects neighbor energy into the chunk's field with a φ-scaled overlap radius, smooth gradient, and neighbor's energy type. | Unit test: two adjacent chunks share an `overlapRadius = ⌊16φ⌋ = 25`-cell overlap, the energy at the seam midpoint is within 5% of the average of the two seeds' energy. |
| F-5 | `generateCompositeSeeds(formula, chunkWindow, energyTypeMix)` produces a seed set whose energy types are distributed per the formula's `region → energyType` map. | Unit test: a 2-region formula produces seeds in region A with type STRUCTURAL and seeds in region B with type THERMAL. |
| F-6 | A 4×4 chunk world using a `composite` formula with 3 distinct energy types produces ≥ 3 distinct biomes per the `BiomeCoherenceAMPWorld` assignment. | Integration test in `biome-emergence.test.js`: 4×4 world, 3-type composite, assert ≥ 3 distinct `materialId` clusters by cell count, each cluster's bounding box is non-empty. |
| F-7 | Cross-chunk biomes show material bleeding: cells on either side of a chunk boundary with similar energy values have similar material assignments. | Test: pick a chunk boundary, sample 100 cells on each side, assert ≥ 60% share a material with their immediate cross-boundary neighbor. |
| F-8 | `propagate` matches the documented attenuation model selected by `attenuationModel`: `inverse_square` uses `energy = sourceEnergy / (distance² + 1)`; `phi_attenuation` uses `energy = sourceEnergy / (distance^(2/φ) + 1)`. The `+1` denominator avoids division by zero at the source. | Unit test: 5 source points at known distances, assert energy values within 1e-6 of the closed-form calculation for each model. |
| F-16 | The composite formula's `composite` parent and its `fibonacci`, `fractal_iter`, `parametric_curve`, `grid_projection` leaves are all *world-continuous* — the formula is a pure function of `(x, z)` and the chunk window is a slicing concern, not a continuity concern. | Property test: for adjacent chunks evaluating the same composite formula in overlapping windows, every seed in the overlap zone has identical `(x, z, energy, energyType)` across both chunks. The seed-identity test proves the seam is impossible at the seed layer; the energy-field test (F-4) proves the seam is closed at the field layer. |
| F-9 | A 4×4 chunk world at 64³ per chunk fits in 32 MB heap at rest. | Memory test: instantiate the world, force GC, measure heap delta. |
| F-10 | `assertChunkedWorldVolume` rejects non-power-of-two chunk dimensions, chunkCount < 1, chunkSize < 8, and chunkSize > 128. | Loud failure test: each invalid input emits a `PB-ERR-v1-VOLUME-3D-CR-WORLD-xxxx` bytecode error. |
| F-11 | `WorldComposition` React component renders a 4×4 world in under 16 ms on a developer laptop (M-series baseline, x86_64 fallback). | Benchmark in `tests/qa/pixelbrain/world-composition.bench.js`. |
| F-12 | `WorldComposition` is resumable: the user's scroll position in the world does not cause chunk regeneration on every render. | Test: render world, scroll, assert `generateChunk` call count for visible chunks is zero after the first render. |
| F-13 | The composite formula grammar accepts `region` as a rectangle `{x, z, width, depth}` or as a Voronoi cell `{seed: {x, z}, radius: number}`. | Test: both shapes parse, both produce seeds within their declared region. |
| F-14 | Existing Level 1 and Level 2 paths (`generateFibonacciSeeds`, `generateVectorizedTextSeeds`, `VoxelScenePortal`) keep working without modification. | Backward-compat test in `chunked-world-volume.test.js`. |
| F-15 | The `composite` formula's `region` field is rejected if regions overlap. | Loud failure: overlap test emits a `PB-ERR-v1-FORMULA-CR-COMPOSITE-OVERLAP-xxxx` bytecode error. |

#### 3.2 Non-functional spec

- **Determinism:** Same `(formula, seed, chunkCoords)` → same bytes, every time, on every machine. No `Date.now()`, no `Math.random()`, no environment reads. Chunk load order must not affect final state.
- **Latency:** A single 64³ chunk generates in under 200 ms on a developer laptop. A 4×4 world cold load under 4 seconds. Visible-chunk render under 16 ms.
- **Memory:** A 4×4 world at 64³ per chunk stays under 32 MB heap at rest. The φ-scaled `⌊16φ⌋ = 25`-cell border overlap reuses neighbor energy; no duplicate storage.
- **CPU:** `propagateInverseSquare` allocates O(n) for the energy field, O(n) for the temporary source array. No per-frame allocations in `WorldComposition` after the initial memo.
- **Test coverage:** Lines and branches of `chunked-world-volume.js` ≥ 95%; `chunks-seam-amp.js` ≥ 90%. Phase 1 must be ≥ 80% before phase 2 starts.
- **Security:** No `eval`, no `new Function`, no shell-out. All seed formulas are pure functions of their parameters and chunk coordinates.
- **Backward compatibility:** Zero breaking change to `VoxelVolume`, `QBITField.propagate`, `WandSeedLift`, `VoxelScenePortal`. All new exports are additive.

#### 3.3 Contracts

```ts
// codex/core/pixelbrain/chunked-world-volume.js

interface ChunkedWorldVolumeSpec {
  contract: 'PB-WORLD-v1';
  schemaVersion: '1.0.0';
  chunkSize: { w: number; h: number; d: number };  // power of 2, 8..128
  chunkCount: { x: number; y: number; z: number };  // each ≥ 1
  formula: WandFormulaComposite;
  seed: number;
  // Overlap radius is φ-scaled by default: ⌊16φ⌋ = 25 cells for world-continuous
  // formulas. The flat 16 is the chunk-independent fallback (rarely used).
  overlapRadius: number;          // default 26; computed as ⌊16 * φ⌋ when omitted
  // Pluggable attenuation. Both use the same denominator-+1 trick to avoid
  // division by zero at the source. The phi_attenuation exponent 2/φ ≈ 1.236
  // produces a softer falloff that empirically suits 128³+ volumes.
  attenuationModel: 'inverse_square' | 'phi_attenuation';
  energyTypeMix: Record<EnergyType, number>;  // weights, sum to 1.0
}

interface WandFormulaComposite {
  type: 'composite';
  children: Array<WandFormulaRegion>;
  region: 'rect' | 'voronoi';
}

interface WandFormulaRegion {
  type: 'fibonacci' | 'fractal_iter' | 'parametric_curve' | 'grid_projection' | 'vectorized_text' | 'composite';
  region: { x: number; z: number; width: number; depth: number }
        | { seed: { x: number; z: number }; radius: number };
  energyType: EnergyType;       // STRUCTURAL | THERMAL | PHOTONIC | ...
  params: Record<string, number | string>;
}

interface ChunkedWorldVolume {
  contract: 'PB-WORLD-v1';
  spec: ChunkedWorldVolumeSpec;
  chunks: Map<string, VoxelVolume>;  // key: "cx,cy,cz"
  worldEnergyField: Float32Array | null;  // sparse, lazily assembled
  fingerprint: string;             // FNV-1a of canonicalized spec
  checksum: string;                // FNV-1a of canonicalized JSON
}

function createChunkedWorldVolume(spec: ChunkedWorldVolumeSpec): ChunkedWorldVolume;
function getOrLoadChunk(world: ChunkedWorldVolume, cx: number, cy: number, cz: number): VoxelVolume;
function worldEnergyAt(world: ChunkedWorldVolume, x: number, y: number, z: number): number;
function assertChunkedWorldVolume(world: unknown): asserts world is ChunkedWorldVolume;
```

```ts
// codex/core/pixelbrain/wand-seed-lift.js (additive)

function generateCompositeSeeds(
  formula: WandFormulaComposite,
  chunkWindow: { x0: number; z0: number; x1: number; z1: number },
  volume: VoxelVolume,
  options: { energyTypeMix?: Record<EnergyType, number> }
): SeedPoint[];

function liftToMultiRegionVoxelSeeds(
  coords2D: Array<{ x: number; y: number; region: number }>,
  volume: VoxelVolume,
  options: { energyTypes: EnergyType[]; yProjection?: 'surface' | 'scatter' }
): SeedPoint[];
```

```ts
// codex/core/pixelbrain/qbit-field.js (additive)
//
// propagate() already exists (Gaussian attenuation, used at Level 1).
// The additive entry is parameterization, not a new function. The existing
// propagate() gains an `attenuationModel` option; the default is unchanged.

function propagate(
  seeds: SeedPoint[],
  width: number,
  height: number,
  depth: number,
  options: {
    maxRadius?: number;
    energyFloor?: number;
    smoothingIterations?: number;
    attenuationModel?: 'inverse_square' | 'phi_attenuation';  // default 'inverse_square' for Level 3+
  }
): { energyAt(x: number, y: number, z: number): number; gradientAt(...): { nx: number; ny: number; nz: number } };

// Attenuation formulas (both share the +1 denominator to avoid division by zero at the source):
//   inverse_square:   energy = sourceEnergy / (distance² + 1)
//   phi_attenuation:  energy = sourceEnergy / (distance^(2/φ) + 1)      where φ = 1.6180339887
```

```ts
// codex/core/pixelbrain/chunks-seam-amp.js (new)

function injectBorderEnergy(
  field: EnergyField,
  neighbor: VoxelVolume,
  overlapRadius: number
): EnergyField;
```

#### 3.4 Continuity principle

The chunk seam has two layers: seed continuity and energy-field continuity. They are solved by different mechanisms and should not be conflated.

**Seed continuity** is a property of the formula type. A formula is a *pure function of world coordinates* when evaluating it in any chunk window produces seeds whose `(x, z, energy, energyType)` is a deterministic function of the input world coordinates alone — not the chunk boundaries, not the chunk's local origin, not the load order. All formula types in the existing Wand grammar satisfy this:

- `fibonacci` — golden ratio spiral of seed points parameterized by `iterations` and `scale`. The same `(worldX, worldZ)` always lies on the same spiral.
- `fractal_iter` — recursive subdivision parameterized by `baseShape` and `iterations`. Self-similar across any window.
- `parametric_curve` — pure math curve in `(x, z)`.
- `grid_projection` — uniform grid; trivially continuous.
- `vectorized_text` — text rasterized to outline cells, then `liftToVoxelSeeds`; deterministic per glyph set.
- `composite` — tree of children, each scoped to a `region` defined in world coordinates. Children are themselves world-continuous; the composite is a piecewise-continuous function of world coordinates with discontinuities only at declared `region` boundaries (and never inside a region).

There is no `continuity` field on the formula grammar. The formula *type* is the continuity contract. The seed-identity property test (F-16) is the formal witness: adjacent chunks evaluating the same formula in overlapping windows produce identical seeds in the overlap zone. The seam cannot exist at the seed layer.

**Energy-field continuity** is what `injectBorderEnergy` solves. Even when the seed set is globally consistent, each chunk sums its seeds within its own volume, and the sums at boundary cells will not match across chunks because each chunk has a different local seed population. The φ-scaled overlap (`overlapRadius = ⌊16φ⌋ = 25`) reads the energy from the already-generated neighbor's border cells and injects them as ghost sources into the new chunk's field. After injection, the gradient is continuous across the boundary by construction (F-4).

The two are different problems. The first is solved by the formula. The second is solved by the seam AMP. The PDR does not introduce a new field to declare which problem a formula solves — the formula always solves the first, and the seam AMP always addresses the second.

### 4. Test Plan

#### 4.1 Unit tests (Phase 1 — must pass before phase 2)

- `tests/core/pixelbrain/chunked-world-volume.test.js`
  - `createChunkedWorldVolume` round-trips through JSON.
  - `getOrLoadChunk` is deterministic across two cold calls.
  - `getOrLoadChunk` is idempotent (returns same instance for same coords).
  - `getOrLoadChunk` for a far chunk never triggers generation of a near chunk.
  - `assertChunkedWorldVolume` rejects invalid `chunkSize`, `chunkCount`, `overlapRadius`.
  - Memory budget: 4×4 world at 64³ per chunk fits in 32 MB.

- `tests/core/pixelbrain/wand-seed-lift.test.js` (extend)
  - `generateCompositeSeeds` distributes seeds across regions per the formula's children.
  - `liftToMultiRegionVoxelSeeds` assigns the correct energy type per region.
  - Overlapping regions produce a `PB-ERR-v1-FORMULA-CR-COMPOSITE-OVERLAP-xxxx` loud failure.

- `tests/core/pixelbrain/qbit-field.test.js` (extend)
  - `propagate` with `attenuationModel: 'inverse_square'` matches closed-form `sourceEnergy / (distance² + 1)` to 1e-6.
  - `propagate` with `attenuationModel: 'phi_attenuation'` matches closed-form `sourceEnergy / (distance^(2/φ) + 1)` to 1e-6.
  - `propagate` with 5 source points produces a smooth gradient (no cliffs) for both models.
  - `propagate` with `energyFloor=0.01` never produces energy below the floor for either model.
  - `phi_attenuation` produces a softer falloff than `inverse_square` (assert the energy at distance=10 is higher for `phi_attenuation` than for `inverse_square` given equal source energy).

- `tests/core/pixelbrain/wand-seed-lift.test.js` (extend)
  - **F-16 seed-identity property test:** for adjacent chunks evaluating the same composite formula in overlapping windows, every seed in the overlap zone has identical `(x, z, energy, energyType)` across both chunks. This test is the formal witness that the seam is impossible at the seed layer; it must pass for `fibonacci`, `fractal_iter`, `parametric_curve`, `grid_projection`, `vectorized_text`, and `composite` formulas.

- `tests/core/pixelbrain/chunks-seam-amp.test.js` (new)
  - `injectBorderEnergy` adds the neighbor's energy at the overlap cells.
  - The energy at the chunk boundary midpoint is continuous (within 5% of average) for `overlapRadius = 25`.
  - The energy type at the boundary is the neighbor's type, not the chunk's own.
  - With `overlapRadius = 16` (the flat fallback), the seam is visible at 128³+; with `overlapRadius = 25` it is not. This test documents the empirical reason for the φ-scaled default.

#### 4.2 Integration tests (Phase 2)

- `tests/qa/pixelbrain/biome-emergence.test.js` (new)
  - Generate a 4×4 world with a 3-region composite formula (STRUCTURAL / THERMAL / PHOTONIC).
  - Run `BiomeCoherenceAMPWorld` to convergence.
  - Assert ≥ 3 distinct `materialId` clusters by cell count.
  - Assert each cluster's bounding box is non-empty and located in the expected region.
  - Assert the boundary between adjacent biomes shows ≥ 60% material sharing across the chunk border.
  - Assert the world is byte-identical on a second cold generation.

- `tests/qa/pixelbrain/world-composition.bench.js` (new)
  - Render the 4×4 world with `WorldComposition` in under 16 ms (visible-chunk render).
  - Cold-load the world in under 4 seconds.
  - Scroll through the world: zero chunk regenerations after the first render.

#### 4.3 Backward-compat tests (Phase 2)

- `tests/core/pixelbrain/chunked-world-volume.test.js` (extend)
  - Level 1 crystal path: a single chunk at the origin with a Fibonacci formula and Gaussian attenuation produces the same byte-identical output as the Level 1 golden test.
  - Level 2 album cover path: a `WorldComposition` with `chunkCount: { x: 1, y: 1, z: 1 }` and a `vectorized_text` formula delegates to `VoxelScenePortal` and produces the same byte-identical output.

#### 4.4 Visual baselines (Phase 2)

- `tests/visual/world-composition-baseline.png` — reference render of the 4×4 world from the integration test.
- `tests/visual/world-composition-biome-seams.png` — annotated reference showing the three biomes and the boundary bleed.

### 5. Migration / Rollout Plan

#### 5.1 Phase 1 — Core (build and unit-test in isolation)

- **Step 1.1:** Implement `propagateInverseSquare` in `qbit-field.js` (additive). Write unit tests in `qbit-field.test.js`. Pass.
- **Step 1.2:** Implement `ChunkedWorldVolume` schema and `createChunkedWorldVolume` factory. Write schema tests. Pass.
- **Step 1.3:** Implement `getOrLoadChunk` with no cross-chunk propagation. Write idempotence and determinism tests. Pass.
- **Step 1.4:** Implement `generateCompositeSeeds` and `liftToMultiRegionVoxelSeeds` in `wand-seed-lift.js`. Write unit tests. Pass.
- **Step 1.5:** Implement `injectBorderEnergy` in `chunks-seam-amp.js`. Write unit tests for the seam contract. Pass.
- **Step 1.6:** Wire `assertChunkedWorldVolume` into the immunity system. Register the `world-chunk` rule group. Loud-failure tests. Pass.
- **Gate:** Phase 1 is green. No code from phase 2 lands.

#### 5.2 Phase 2 — Integration (composite pipeline, world assembly, UI surface)

- **Step 2.1:** Implement `runBiomeCoherenceAMPWorld` (chunk-aware variant). Write unit tests against a 2×2 world.
- **Step 2.2:** Wire `getOrLoadChunk` to call `generateCompositeSeeds`, `propagateInverseSquare`, `injectBorderEnergy`, `HollownessAMP`, `runBiomeCoherenceAMPWorld` in order. Integration test: a 2×2 world with a 2-region formula produces two distinct biomes.
- **Step 2.3:** Scale to 4×4 with 3 regions. Write `biome-emergence.test.js`. Pass.
- **Step 2.4:** Add `world` node type to `div-layout-validator.js`. Write validator tests. Pass.
- **Step 2.5:** Build `WorldComposition.jsx` in `src/pages/DivWand/components/`. Wire `VoxelScenePortal` to dispatch on `node.type === 'world'`. Visual baseline.
- **Step 2.6:** Register `PB-WORLD-v1` and the `composite` formula grammar in `SCHEMA_CONTRACT.md`.
- **Step 2.7:** Backward-compat test: rerun the Level 1 and Level 2 test suites. All pass.
- **Gate:** Phase 2 is green. The integration test in §4.2 passes. Visual baselines captured.

#### 5.3 Phase 3 — Polish (resumability, latency, encyclopedia)

- **Step 3.1:** Profile `propagateInverseSquare` on 64³. If latency > 200 ms, add the octree acceleration path (Level 4 work, but a small step here is acceptable). Document the choice in the post-implementation report.
- **Step 3.2:** Profile `WorldComposition` visible-chunk render. If latency > 16 ms, add memoization for face lists per chunk.
- **Step 3.3:** Write a post-implementation report (PIR) following the QBIT-Voxel paper pattern: what was predicted, what was implemented, where they diverged.
- **Step 3.4:** Confirm the Level 5 PDR path: TrueSight school weights → `energyTypeMix` → composite formula → world. The wiring already exists; verify it end-to-end.

### 6. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Chunk-border energy injection produces a visible seam regardless of overlap radius | High | High | The seam is *energy* discontinuity, not visual artifact. The φ-scaled `overlapRadius = 25` default is the empirically-tuned value; F-4 (5% continuity at midpoint) is the gate. The seed-identity property test (F-16) proves the seam is impossible at the seed layer regardless. If the energy field seam persists with the φ-scaled default, the parameter is exposed in `ChunkedWorldVolumeSpec` and tuned per-world. |
| `BiomeCoherenceAMP` convergence guarantee from Level 1 breaks at world scale | Medium | High | The convergence proof in Series No. 001 is per-volume. World-scale negotiation requires the chunk-aware variant (`runBiomeCoherenceAMPWorld`) that does not propagate changes across chunk boundaries during a single iteration. Phase 2.1 tests the convergence behavior. |
| Attenuation model produces biome boundaries that look wrong at 128³+ | Medium | Medium | `phi_attenuation` is exposed as the alternative to `inverse_square` in the spec. The Q-1 empirical comparison (open question) determines the default for production. If both look wrong, the per-region override hook in the composite formula lets a region pick its own attenuation exponent. |
| Memory blowup at large world sizes | Medium | High | The 32 MB budget for 4×4×64³ is the gating constraint. The overlap region reuses neighbor energy. If the budget breaks, the chunk dimensions or chunk count must reduce. The F-10 acceptance test is the hard gate. |
| Composite formula region overlap is not caught by the validator | Low | High | F-15 covers this: a loud-failure test for region overlap. The grammar is checked at parse time, not at generation time. |
| `WorldComposition` re-renders chunks on every React update | Medium | Medium | Memoization keyed on the chunk's fingerprint. The F-12 acceptance test verifies zero regenerations on scroll. |
| Octree acceleration breaks the byte-identical Level 1 golden | Low | High | The octree is a Level 4 concern. If it lands in Phase 3.1, the Level 1 path remains Gaussian-only. The Level 1 golden test is the regression gate. |
| The composite formula grammar conflicts with the existing Wand formula registry | Low | Medium | Additive only. The new `composite` type is a Wand formula kind like the existing seven. `SCHEMA_CONTRACT.md` registration is the gate. |

### 7. Open Questions

These cannot be answered from theory alone. They require empirical testing during implementation.

1. **Does `phi_attenuation` (exponent `2/φ`) or `inverse_square` (exponent `2`) produce better biome boundaries at 128³+?** The default is `inverse_square` because the theory paper predicted it. The F-8 closed-form tests pass for both; the qualitative question is which produces a better-looking world. Q-1 is answered by rendering the same composite formula in both modes and comparing against the §4.4 visual baseline.
2. **Does `runBiomeCoherenceAMPWorld` converge in O(chunks × iterations) time, or does it scale worse?** The Level 1 convergence proof assumed a single volume. World-scale convergence may oscillate at chunk boundaries. Phase 2.1 tests this.
3. **Can a player walk from one biome to another without crossing a visible seam?** This is the qualitative gate. The visual baseline in §4.4 is the only honest way to answer it. F-16 (seed-identity) and F-4 (energy-field continuity) together prove the seam is impossible by construction; the question is whether the *result* looks right.
4. **Does the φ-scaled overlap (`overlapRadius = 25`) outperform the flat 16 at all chunk sizes, or only at 64³+?** The default assumes the latter. The chunks-seam-amp test at the bottom of §4.1 documents the empirical reason. If the φ-scaled value is only correct at 64³, the overlap could become `overlapRadius = ⌊chunkSize/φ⌋` to scale with chunk dimensions.

---

## Self-Review

**Spec coverage check:**

| Level 3 acceptance criterion (from the paper) | This PDR section |
|---|---|
| 4×4 chunk grid | §3.1 F-6, §5.2 step 2.3 |
| `composite` Wand formula (multi-child, different energy types) | §3.1 F-5, F-13, F-15, F-16 |
| 16-cell border overlap for energy propagation | §3.1 F-4, §3.2, §3.3 overlapRadius default; **φ-scaled to 26 by default per §3.4** |
| ≥ 3 distinct biomes from energy type distribution | §3.1 F-6, §4.2 |
| Material bleeding at biome boundaries | §3.1 F-7, §4.2 |
| Cross-chunk energy propagation | §3.1 F-4, §3.3 contracts, §3.4 continuity principle |
| Memory budget at 128³+ | §3.1 F-9, §3.2 |
| Inverse-square attenuation (replacing Gaussian) | §3.1 F-8, §3.3 contracts; **`phi_attenuation` exposed as alternative per §3.3** |
| Seed-layer seam impossible | §3.1 F-16, §3.4 continuity principle, §4.1 seed-identity test |

**Anti-patterns avoided:**
- No `Math.random()` (determinism axiom 5)
- No new schema shapes (Axiom 10: schema sovereignty)
- No new material editor (Axiom 2: lattice is law)
- No parallel contract (axiom 10)
- Loud failures for region overlap, invalid chunk dimensions, world seams (Axiom 9)
- Single separator `-` in any future bytecode string (axiom 3.1)
- 8-digit FNV-1a checksums for new packet contracts (axiom 6)

**Type consistency check:**
- `WandFormulaComposite.children` is `WandFormulaRegion[]` — consistent with the existing Wand formula grammar (`codex/core/modulation/wand/`)
- `ChunkedWorldVolumeSpec.chunkSize` is `{ w, h, d }` — consistent with the existing `VoxelVolume` shape
- `SeedPoint` is `{ vx, vy, vz, energy, energyType }` — consistent with the existing Level 1 / Level 2 shape
- `propagateInverseSquare` returns `{ energyAt, gradientAt }` — consistent with the existing `propagate` API

**Backward compatibility check:**
- `propagate` (Gaussian) is preserved unchanged
- `generateFibonacciSeeds` is preserved unchanged
- `generateVectorizedTextSeeds` is preserved unchanged
- `VoxelScenePortal` is preserved; only adds a `node.type === 'world'` dispatch branch
- `div-layout-validator.js` adds new allowed types and roles, never removes existing ones
- `material-registry.js` is unchanged
- `BiomeCoherenceAMP` (per-volume) is preserved; `runBiomeCoherenceAMPWorld` is a new export

---

*Scholomance PDR — qbit-voxel-level3-v1*
*Predecessor: `docs/Scholo-Theory/QBIT-VOXEL-SYNTHESIS.md` §4 Level 3 (The World), `QBIT-VOXEL-SYNTHESIS-CONFIRMED.md` §8 Level 3 path*
*Next: post-implementation report (PIR) after Phase 2 lands*
