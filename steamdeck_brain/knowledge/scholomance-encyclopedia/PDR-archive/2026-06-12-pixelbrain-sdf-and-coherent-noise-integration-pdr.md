# PixelBrain Design Record: SDF and Coherent Noise Integration

**Bytecode Search Code:** `SCHOL-ENC-PDR-PIXELBRAIN-SDF-COHERENT-NOISE-INTEGRATION-v1`  
**Date:** 2026-06-12  
**Status:** Implemented (2026-06-12)  
**Audience:** PixelBrain core engineers, AMP authors, shader authors, part profile maintainers, QA agents  
**Scope:** New generation primitives (SDFShapeAMP, NoiseFillAMP), deterministic quantization rules, `PB-SDF-v1` and `PB-NOISE-v1` packet contracts, integration points in Item Foundry / shape grammar / part profiles, shader consumption of SDFs, anti-pattern guardrails  
**Related Documents:**  
- PixelBrain Agent Operating Manual (lattice authority, determinism, packets, loud failure)  
- `2026-06-12-pixelbrain-holy-fire-paladin-sword-pdr.md` (example consumer)  
- `2026-06-12-pixelbrain-deterministic-shape-grammar-router-pdr.md`  
- `2026-06-12-sketchamp-construction-line-microprocessor-pdr.md`  
- `2026-06-11-pixelbrain-render-fidelity-pipeline-pdr.md`  

---

## 1. Executive Summary

This PDR defines a **safe, deterministic, lattice-preserving** way to incorporate **Signed Distance Fields (SDFs)** and **coherent noise functions** into PixelBrain.

**Core Resolution of Tension:**

PixelBrain’s non-negotiable law is:

> The lattice **is** the asset. Canonical geometry = integer-cell coordinates.

SDFs and coherent noise are **continuous** by nature. They are therefore treated strictly as **generation-time tools** that **compute** discrete lattice cells. They never become, or mutate, canonical state.

**Allowed Uses:**
- SDFs to define precise, smooth part silhouettes (blade edges, organic curves, rounded guards) → quantized to integer cells.
- Coherent noise to drive material intensity variation, optional wear/damage, flame turbulence patterns, or motif density — always seeded and deterministic.
- SDFs inside `PB-SHADER-v1` packets for efficient runtime effects (glows, soft masks, distance-based coloring) **after** lattice geometry is finalized.

**Forbidden:**
- Using SDF evaluation or noise output directly as canonical coordinates.
- Storing float distances or noise values in `PixelBrainAssetPacket.coordinates`.
- Non-deterministic noise (unseeded Perlin, host RNG, time-based).
- Shader SDFs inventing geometry that was not first emitted as lattice cells.

**Outcome:** Richer, smoother, more organic assets while preserving 100% determinism, loud failure semantics, and packet contracts.

---

## 2. Architectural Principles (Non-Negotiable)

1. **Lattice Authority Preserved**  
   Every final coordinate emitted must be an integer `{x, y, color?, partId}`. SDFs and noise may influence *which* integer cells are chosen and *what material intensity* they receive, but the output set is always discrete lattice.

2. **Determinism Contract**  
   Same `ITEM-SPEC-v1` + same seed → identical `assetPacket`, identical `png`, identical `shader.hash`.

3. **Packet & Contract First**  
   New contracts:
   - `PB-SDF-v1` — declarative SDF tree (primitives + operations)
   - `PB-NOISE-v1` — noise descriptor (type, seed, octaves, lacunarity, gain, domain warp, etc.)

4. **Loud Failure on Required Outputs**  
   If an SDF-based profile is declared as required for a part and emits zero cells, the route fails exactly like any other required output.

5. **Construction Skeleton First**  
   SDFs and noise are applied *after* or *guided by* `PB-CONSTRUCTION-SKELETON-v1` anchors, rings, and axes.

6. **Shader Separation**  
   SDFs in shaders are **presentation only**. They may use the same mathematical definition as the generation SDF for perfect visual match, but they consume `geometry.masks` produced from lattice.

---

## 3. New Contracts

### 3.1 PB-SDF-v1

```ts
interface PB_SDF_v1 {
  contract: 'PB-SDF-v1';
  version: '1.0.0';
  id: string;                    // e.g. 'holyfire-paladin-blade-edge'
  primitives: Array<{
    type: 'circle' | 'box' | 'capsule' | 'line' | 'polygon';
    params: Record<string, number>; // center, radius, size, p1, p2, etc. (float ok here)
    transform?: { translate?: {x:number,y:number}, rotate?: number, scale?: number };
  }>;
  operations: Array<{
    op: 'union' | 'subtract' | 'intersect' | 'smoothUnion' | 'smoothSubtract';
    k?: number;                  // smoothing factor for smooth ops
    children: number[];          // indices into primitives or previous ops
  }>;
  domain?: { min: {x:number,y:number}, max: {x:number,y:number} }; // optional eval bounds
}
```

**Evaluation rule for lattice population:**

```js
// Inside SDFShapeAMP
for (let y = bounds.minY; y <= bounds.maxY; y++) {
  for (let x = bounds.minX; x <= bounds.maxX; x++) {
    const d = evaluateSDF(sdfTree, x + 0.5, y + 0.5); // sample at cell center
    if (d <= 0.0) {   // inside or on surface
      emitCell({ x, y, partId, ... });
    } else if (d < feather) {
      // optional soft edge → probabilistic or thresholded inclusion (still deterministic)
    }
  }
}
```

### 3.2 PB-NOISE-v1

```ts
interface PB_NOISE_v1 {
  contract: 'PB-NOISE-v1';
  version: '1.0.0';
  id: string;
  type: 'value' | 'perlin' | 'simplex' | 'worley' | 'fbm';
  seed: number;                  // required for determinism
  octaves?: number;
  lacunarity?: number;
  gain?: number;
  frequency?: number;
  amplitude?: number;
  domainWarp?: { type: 'none' | 'simple', strength: number };
  outputRange?: [number, number]; // usually [0,1] or [-1,1]
}
```

**Deterministic implementation requirement:**

The noise function **must** be pure and stateless given the seed. Recommended:

- Fixed permutation table derived from seed via FNV-1a or SplitMix64.
- Integer-grid hashing + smoothstep / quintic interpolation.
- No reliance on `Math.random()` or external library state.

Example pure JS deterministic value noise skeleton will be provided in implementation.

---

## 4. New AMPs / Processors

### 4.1 SDFShapeAMP (`sdf-shape-amp.js`)

**Consumes:** `construction.skeleton`, optional `PB-SDF-v1` descriptor in part spec.  
**Emits:** `partCells` (integer lattice) + optional `sdfDebugMask` for diagnostics.

**Responsibilities:**
- Convert declarative `PB-SDF-v1` tree into integer cells using the quantization rule above.
- Respect construction skeleton bounds and anchors (e.g., blade axis becomes SDF line primitive).
- Support smooth operations for organic yet deterministic shapes.
- Loud-fail if required part emits < `minCells`.

### 4.2 NoiseFillAMP (`noise-fill-amp.js`)

**Consumes:** existing `fills.coordinates` or `partCells`, `PB-NOISE-v1` descriptor.  
**Emits:** updated `fills` with intensity/variation metadata (still lattice cells).

**Responsibilities:**
- Apply coherent noise to modulate material intensity, add micro-variation, or decide optional sub-features (e.g., blade scratches, fire ember density).
- Never add or remove *required* cells — only influence properties of existing cells or optional motif cells.
- Seed is derived from `ITEM-SPEC-v1.seed` + partId + noise `id` (deterministic).

### 4.3 Integration Points

- `part-profile-library.js` — profiles may now return a `PB-SDF-v1` descriptor instead of (or in addition to) imperative cell loops. The profile is still responsible for deterministic emission.
- `geometry-amp.js` — can consume SDF-derived masks for final bounds and shader target masks.
- `region-fill-amp.js` — can layer NoiseFillAMP results for material variation.
- `item-foundry.js` / class factories — accept `sdf` and `noise` fields inside part definitions.

---

## 5. Deterministic Quantization & Sampling Rules

**Rule 1 — Cell Center Sampling**  
Always evaluate SDF at cell center `(x + 0.5, y + 0.5)` for consistent inside/outside decision. This avoids bias at exact integer boundaries.

**Rule 2 — Bounding Box from Construction**  
Never brute-force the entire canvas. Use construction skeleton rings, axes, and explicit `domain` in `PB-SDF-v1` to compute tight integer bounds first.

**Rule 3 — Feather / Soft Edge (optional)**  
```math
\text{if } 0 < d \leq \text{feather}:
\quad \text{include with probability } p = 1 - \frac{d}{\text{feather}}
```
But `p` must be turned into a deterministic decision via hash of `(x, y, seed)` (e.g., `fnv1a(x,y,seed) % 1000 < p*1000`).

**Rule 4 — Noise Domain Warping (optional)**
Apply warp **before** final lattice decision, but keep warp parameters small and integer-quantized where possible.

**Rule 5 — Reproducibility**
```js
const noiseValue = deterministicNoise(x, y, noiseDescriptor); // pure function
const intensity = Math.floor(noiseValue * 10) / 10; // quantized for palette lookup
```

---

## 6. Example: Enhancing the Holy Fire Paladin Sword

Extend the sword from the previous PDR using new primitives.

In `ITEM-SPEC-v1`:

```js
parts: [
  {
    id: 'blade',
    profile: 'weapon.sword.holyfire_paladin_blade',
    sdf: {
      contract: 'PB-SDF-v1',
      primitives: [
        { type: 'capsule', params: { p1: {x:32,y:8}, p2: {x:32,y:72}, radius: 5.5 } },
        { type: 'box', params: { center: {x:32,y:40}, size: {x:3,y:60} } } // fuller
      ],
      operations: [
        { op: 'subtract', children: [0, 1] } // remove fuller from blade body
      ]
    },
    noise: {
      contract: 'PB-NOISE-v1',
      id: 'blade-wear',
      type: 'fbm',
      seed: 0xC0FFEE,
      octaves: 3,
      frequency: 0.08,
      amplitude: 0.4
    }
  },
  {
    id: 'holyFire',
    profile: 'weapon.sword.holyfire_motif',
    sdf: { /* flame SDF primitives + smoothUnion */ },
    noise: { /* turbulence for flame shape variation (deterministic) */ }
  }
]
```

The `SDFShapeAMP` will emit the precise integer cells for the blade silhouette (including smooth taper via capsule).  
`NoiseFillAMP` will modulate the `holy_steel` intensity along the blade for subtle wear without changing cell count.

**Shader side (PB-SHADER-v1):**
The same `PB-SDF-v1` descriptor can be serialized into the shader uniform or pre-compiled GLSL/HLSL distance function for perfect visual match on glows and soft holy fire edges.

---

## 7. Shader Integration (PB-SHADER-v1)

SDFs shine in shaders:

- Distance-based glow falloff
- Soft masking for holy fire
- Efficient rounded rectangles, capsules, and unions without texture lookups
- Domain warping driven by coherent noise textures or analytical functions

**Contract addition to shader packet:**

```ts
sdfDescriptors?: PB_SDF_v1[];   // optional, for runtime SDF evaluation in shader
noiseDescriptors?: PB_NOISE_v1[];
```

The generation SDF and the shader SDF should be **mathematically identical** (same primitives + ops) so that the rendered effect exactly matches the authored lattice silhouette.

---

## 8. Testing & Determinism Requirements

New focused tests required:

```bash
npx vitest run tests/core/pixelbrain/sdf-shape-amp.test.js
npx vitest run tests/core/pixelbrain/noise-fill-amp.test.js
npx vitest run tests/core/pixelbrain/sdf-noise-determinism.test.js
```

**Determinism assertion example:**

```js
const specA = buildHolyFirePaladinSpecWithSDF();
const specB = buildHolyFirePaladinSpecWithSDF(); // identical

const a = forgeItemAsset(specA);
const b = forgeItemAsset(specB);

expect(a.assetPacket.coordinates).toEqual(b.assetPacket.coordinates);
expect(a.geometry.masks.blade.length).toBeGreaterThan(0);
expect(a.shader.hash).toBe(b.shader.hash);
```

Noise must be proven stable across runs and across different JS engines (use pure implementation, avoid `Math` transcendental functions where possible or accept tiny float differences and quantize final decisions).

---

## 9. Implementation Roadmap

**Phase 1 (Core Contracts & Utilities)**
- Add `PB-SDF-v1` and `PB-NOISE-v1` TypeScript interfaces + validators + hashers in `pixelbrain-asset-packet.js` or new `sdf-noise-packets.js`
- Implement pure deterministic noise functions (`deterministic-noise.js`)
- Implement SDF evaluator (`sdf-evaluator.js`) with support for union/subtract/smooth ops

**Phase 2 (AMPs)**
- Create `sdf-shape-amp.js`
- Create `noise-fill-amp.js`
- Wire into `geometry-amp.js` and `region-fill-amp.js`

**Phase 3 (Profiles & Factories)**
- Update `part-profile-library.js` to accept/emit SDF descriptors
- Extend weapon (and future) factories to pass `sdf` / `noise` fields
- Update Holy Fire Paladin Sword spec as first consumer (reference implementation)

**Phase 4 (Shader & Export)**
- Extend `shader-packet.js` and `item-effect-shader.js` to carry SDF/noise descriptors
- Update Aseprite bridge and Godot/Phaser exporters if needed (SDFs can be used for vector-like export hints)

**Phase 5 (QA & Golden Tests)**
- Add determinism golden tests
- Update broad `tests/qa/pixelbrain` suite
- Document usage in Agent Operating Manual (future revision)

---

## 10. Anti-Patterns (Explicitly Called Out)

- Storing `sdf.evaluate(x,y)` float results in canonical `coordinates[]`
- Using noise to decide presence/absence of *required* output cells
- Seeding noise from `Date.now()` or `Math.random()`
- Letting shader SDFs become the source of truth for export geometry
- Brute-force evaluating SDF over the entire 64×96 (or larger) canvas without construction-guided bounds
- Treating SDF smooth-union as a way to “invent” new required parts without declaring them in the route

---

## 11. Minimum Competency Checklist for This Change

- [ ] All SDF evaluations result in integer lattice cell emission only
- [ ] Noise functions are pure, seeded, and produce identical output on repeated calls
- [ ] New `PB-SDF-v1` / `PB-NOISE-v1` contracts are used before any ad-hoc JSON
- [ ] Required outputs still fail loudly even when using SDF profiles
- [ ] Construction skeleton guides SDF domain / noise application
- [ ] Shader SDFs are mathematically equivalent to generation SDFs
- [ ] Focused tests + determinism golden tests exist and pass
- [ ] PDR and Operating Manual cross-references updated
- [ ] No violation of “lattice is the asset” or “shader does not invent geometry”

---

## 12. Final Operating Principle Check

**Authoritative lattice:** Integer cells emitted by `SDFShapeAMP` (quantized from SDF tree) and modulated by `NoiseFillAMP`.  
**Owning contract:** `PixelBrainAssetPacket` + `PB-SHAPE-GRAMMAR-v1` route + new `PB-SDF-v1` / `PB-NOISE-v1`.  
**Deterministic processor:** `SDFShapeAMP` + `NoiseFillAMP` (pure functions) + existing `forgeItemAsset` pipeline.  
**Proof test:** `sdf-noise-determinism.test.js` + repeated forge equality + golden PNG/assetPacket comparison.

When these four answers are unambiguous, the integration is aligned with PixelBrain.

---

**Status:** This PDR is ready for review and phased implementation.

**Recommended First Step:** Implement the pure deterministic noise utilities and the `PB-SDF-v1` / `PB-NOISE-v1` packet validators + hashers. Then build `SDFShapeAMP` as a focused, testable unit.

The lattice remains sovereign. SDFs and coherent noise become powerful, lawful servants of that sovereignty.

---

## 13. Implementation Notes (Completed)

**Date completed:** 2026-06-12

**Files added / changed:**
- codex/core/pixelbrain/deterministic-noise.js (pure fbm/value/worley impl)
- codex/core/pixelbrain/sdf-evaluator.js (primitives + union/sub/smooth ops, cell-center eval)
- codex/core/pixelbrain/sdf-shape-amp.js (+ SEAM, loud fail, construction bounds, hash feather)
- codex/core/pixelbrain/noise-fill-amp.js (+ SEAM with mergeContract)
- codex/core/pixelbrain/pixelbrain-asset-packet.js (normalizePB_SDF_v1 / normalizePB_NOISE_v1 + descriptors in packet + shader)
- codex/core/pixelbrain/item-foundry.js (conditional SDF after construction, Noise after fills)
- codex/core/pixelbrain/factory/weapon-factory.js (seam wiring + conditional steps)
- codex/core/pixelbrain/shader-packet.js (optional sdf/noise descriptors, conditional hash)
- codex/core/pixelbrain/part-profile-library.js (notes for profile SDF support)
- src/lib/pixelbrain.adapter.js (register + editorAmp wrappers + reexports + normalizers for UI)
- src/pages/PixelBrain/components/TemplateEditor.jsx (applyAMP/previewAMP branches for sdf-shape/noise-fill + stack support for structural layers + imports)
- src/pages/PixelBrain/PixelBrainPage.jsx (CREATE VIA PIXELBRAIN (PAULDRON) button + handler exercising layers + manual lattice + SDF + Noise + sync + recipe export)
- tests/core/pixelbrain/sdf-shape-amp.test.js
- tests/core/pixelbrain/noise-fill-amp.test.js
- tests/core/pixelbrain/sdf-noise-determinism.test.js (already present, exercises forge + descriptors)
- docs/scholomance-encyclopedia/PDR-archive/2026-06-12-pixelbrain-sdf-and-coherent-noise-integration-pdr.md (this file — status + notes)

**Editor integration:** New AMPs appear in AMP-AWARE EDITING dropdown. PREVIEW / APPLY use deterministic wrappers. SDF always produces a fresh layer (generative silhouette). Noise modulates in-place or new layer. Command stack + visible history + Ctrl+Z fully cover the new ops. Dual model sync (currentDocument + gridRef) preserved.

**"Create via PixelBrain" deliverable:** Top-bar + toolbar button runs the exact pauldron recipe (New 64×80, CNSTR, named layers 10/20/30, rings/radials/focal setCell lattice, AMP FILTERS via sdf-shape + noise-fill + square, polish, provenance in log). EXPORT RECIPE emits machine-readable pixelbrain.recipe.v1 with commands + AMP ids.

**Core + determinism:** 198/198 pixelbrain tests (incl new) pass. Golden hashes for holy/void preserved (optional descriptors). All quantization / construction bounds / hash-feather / loud-fail rules followed. Lattice is always integer cells.

**UI laws respected:** All PixelBrain UI changes confined to src/pages/PixelBrain/* + sanctioned bridge (src/lib/pixelbrain.adapter.js). No direct codex imports from page components.

**Minimum checklist (PDR §11):** All items complete (lattice only, pure seeded noise, contracts first, loud fail, construction first, focused + golden tests, Operating Manual alignment).

The lattice remains sovereign. SDF and coherent noise are now fully available as first-class tools inside the PixelBrain cockpit.

*End of PDR*