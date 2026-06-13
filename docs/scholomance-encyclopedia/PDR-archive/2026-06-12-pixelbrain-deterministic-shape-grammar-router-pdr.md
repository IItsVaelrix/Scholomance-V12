# PDR: PixelBrain Deterministic Shape Grammar Router
## Construction-Line Skeletons, Class Microprocessor Factories, Loud-Failure Routing, and Explicit Seam Composition

**Status:** Implemented
**Classification:** PixelBrain + Shape Grammar + Construction Skeletons + Microprocessor Router + Deterministic Asset Pipeline
**Priority:** Critical
**Primary Goal:** Define the next-generation PixelBrain generation architecture: deterministic shape grammar over construction-line skeletons, routed through per-class microprocessor factories, with loud failure semantics and explicit seam-composition contracts. This is the "ML without the ML" pipeline: model-like asset synthesis without nondeterministic model inference.

---

# 1. Executive Summary

PixelBrain can already generate deterministic item assets from structured specs, but the VOID chestplate failure exposed the next architectural boundary. The renderer did not degrade the image. It rendered exactly what the resolved lattice contained: one pauldron with materials, one mirrored pauldron with null materials, an emblem route that stamped zero cells, and diagnostics that still declared export success.

The fix is not raster-to-vector-to-mesh-to-GLSL. That creates a shadow authority and preserves upstream absences with smoother edges. The fix is a deterministic shape grammar pipeline where construction, topology, materials, motifs, and runtime shaders all consume one lattice authority through declared seams.

This PDR formalizes the architecture:

```text
ITEM-SPEC-v1 intent
  -> Construction Skeleton
  -> Shape Grammar Expansion
  -> Class Microprocessor Factory
  -> Loud-Failure Router
  -> Seam Composer
  -> Lattice Validator
  -> Render / Export / Shader Presentation
```

The result should feel like "ML without the ML": high-level asset intent expands into polished, class-aware, style-aware output, but every step is inspectable, reproducible, diffable, and schema-bound.

# 2. Problem Statement

The current pipeline has strong deterministic foundations but still allows dormant passes:

- A required visual element can emit zero cells and remain a warning.
- A mirrored part can inherit geometry but not inherit material authority.
- Diagnostics can report `ok: true` while required structure is absent.
- Shaders can be generated from stale or incomplete geometry metadata.
- Multiple AMPs can depend on implicit assumptions about part IDs, profiles, and attachments.

These are not rendering problems. They are seam and routing problems.

PixelBrain needs one architecture that answers:

- What is the pose and construction authority?
- Which rules expand it into parts?
- Which class-specific processors are allowed to mutate or retag the lattice?
- What does every processor consume and emit?
- Which missing outputs are fatal?
- How does shader presentation consume the lattice without replacing it?

# 3. Product Goal

Build a deterministic generation architecture where item classes are produced by shape grammar factories over construction-line skeletons.

The pipeline must:

1. Treat construction skeletons as the structural source of truth for pose, anchors, rings, axes, and proportions.
2. Expand skeletons into part manifests using deterministic shape grammar rules.
3. Route assets through per-class microprocessor factories such as `ArmorFactory`, `ShieldFactory`, `JewelryFactory`, and `WeaponFactory`.
4. Enforce loud failures when required passes emit no cells, invalid cells, null materials, broken symmetry, or unreadable focal marks.
5. Define an explicit seam-composition contract for every microprocessor boundary.
6. Keep GLSL and runtime shaders as presentation consumers, never as the geometry source of truth.

# 4. Non-Goals

- Do not introduce ML inference into the canonical PixelBrain asset path.
- Do not vectorize raster outputs as canonical geometry.
- Do not make GPU shader output the canonical asset.
- Do not permit `ok: true` when required class outputs are missing.
- Do not add another implicit orchestration layer without seam declarations.
- Do not replace existing AMPs immediately; this PDR wraps and hardens them through routing contracts.

# 5. Design Principles

## 5.1 The Lattice Is the World Authority

The canonical asset is integer-cell lattice geometry plus registry-derived material colors. Vector meshes, GLSL masks, Aseprite layers, PNGs, and editor previews are projections of the lattice.

## 5.2 Construction Skeleton Before Shape

Assets should begin from a compact construction skeleton:

```json
{
  "version": "construction-v1",
  "center": { "x": 32, "y": 32 },
  "axes": true,
  "rings": [
    { "radius": 5, "role": "top-crystal" },
    { "radius": 9, "role": "core-orb" },
    { "radius": 14, "role": "harness-frame" }
  ],
  "radials": { "count": 8, "offsetDegrees": 22.5 },
  "anchors": {
    "leftShoulder": { "x": 11, "y": 14 },
    "rightShoulder": { "x": 53, "y": 14 },
    "waist": { "x": 32, "y": 62 }
  }
}
```

The skeleton owns pose and proportions. Profiles and AMPs attach to skeleton features, not arbitrary loose coordinates.

## 5.3 Shape Grammar Is the Deterministic Generator

Shape grammar rules expand construction features into part declarations:

```text
armor.chestplate
  -> torso(bodyProfile)
  -> collar(highVoid)
  -> mantle(upperPanel)
  -> pauldron(leftShoulder)
  -> mirror(pauldron, verticalAxis)
  -> socket(centerCore)
  -> heraldry(harnessFrame)
  -> motifLanes(radials or named anchors)
```

Rules are deterministic functions. Given the same spec, skeleton, registry version, and grammar version, output is byte-stable.

## 5.4 Class Factories Own Class Expectations

An armor factory knows armor-specific required outputs. A shield factory knows radial symmetry and ring integrity. A jewelry factory knows gem sockets, prongs, and highlights. The generic foundry should not carry every class rule in one unbounded orchestration function.

## 5.5 Loud Failure Beats Polite Warning

A warning is only acceptable for optional polish. Required topology must fail the route.

Examples:

```text
required emblem stamps 0 cells       -> fail
strict mirror emits only one side    -> fail
required material resolves null      -> fail
shader target part missing           -> fail
focal contrast below floor           -> fail
construction anchor unbound          -> fail
```

## 5.6 Seams Are Contracts

Every microprocessor declares what it consumes, emits, mutates, and validates. The router composes these seams and rejects incompatible routes before rendering.

# 6. Architecture

## 6.1 Top-Level Pipeline

```text
forgeItemAsset(spec)
  normalizeItemSpec
  buildConstructionSkeleton
  expandShapeGrammar
  selectClassFactory
  buildMicroprocessorRoute
  executeRouteWithSeamChecks
  validateFinalLattice
  buildGeometryAmpPayload
  renderBaseOutputs
  buildShaderPresentation
  exportDiagnostics
```

## 6.2 Construction Skeleton Artifact

The construction artifact is a non-render authority:

```ts
type ConstructionSkeleton = {
  contract: 'PB-CONSTRUCTION-SKELETON-v1';
  specId: string;
  canvas: { width: number; height: number; gridSize?: number };
  center: { x: number; y: number };
  axes: Array<{ id: string; kind: 'vertical' | 'horizontal' | 'radial'; cells: CellKey[] }>;
  rings: Array<{ id: string; role: string; radius: number; cells: CellKey[] }>;
  anchors: Record<string, { x: number; y: number; role?: string }>;
  bounds: Record<string, Bounds>;
  hash: string;
};
```

Construction cells may be exported to `00_Reference`, but they do not count as final art unless explicitly promoted.

## 6.3 Shape Grammar Artifact

Shape grammar emits a resolved part manifest before silhouette composition:

```ts
type ShapeGrammarExpansion = {
  contract: 'PB-SHAPE-GRAMMAR-v1';
  grammarId: string;
  grammarVersion: string;
  sourceSkeletonHash: string;
  parts: ResolvedPart[];
  requiredOutputs: RequiredOutput[];
  invariants: InvariantSpec[];
  seams: SeamSpec[];
  hash: string;
};
```

The expansion should be serializable and diffable. When output quality changes, we should know whether the cause was grammar, AMP behavior, materials, or renderer.

# 7. Class Microprocessor Factories

Factories create routes from class and archetype:

```text
ArmorFactory
  chestplate
    ConstructionAMP
    ArmorProportionValidator
    ChestplateShapeGrammar
    SilhouetteComposer
    HeraldryAMP
    JewelryAMP
    ChestplateAMP
    MotifEngraver
    RegionFillAMP
    ChestplateBevelAMP
    CrystalCoreAMP
    SurfaceTextureAMP
    PaletteQuantizationAMP
    GeometryAMP

ShieldFactory
  radial-shield
    ConstructionAMP
    RadialShapeGrammar
    ShieldRimAMP
    HeraldryAMP
    EnergyRingAMP
    RegionFillAMP
    GeometryAMP

JewelryFactory
  amulet/ring
    ConstructionAMP
    JewelryShapeGrammar
    GemSocketAMP
    ProngAMP
    RegionFillAMP
    CrystalCoreAMP
    GeometryAMP
```

Factories do not draw pixels directly. They declare route steps and required seam contracts.

# 8. Loud-Failure Router

## 8.1 Router Responsibilities

The router receives:

- normalized spec
- construction skeleton
- shape grammar expansion
- selected factory route
- seam declarations

It then:

1. Validates route prerequisites before execution.
2. Executes each microprocessor in deterministic order.
3. Checks emitted artifacts after every step.
4. Promotes warnings to failures when the output is required by the route.
5. Produces route diagnostics that cannot claim success unless required outputs exist.

## 8.2 Required Output Model

```ts
type RequiredOutput = {
  id: string;
  kind: 'partCells' | 'materialSlot' | 'motifCells' | 'heraldryCells' | 'shaderMask' | 'constructionAnchor';
  selector: string;
  minCells?: number;
  minCoverage?: number;
  minContrast?: number;
  symmetryPair?: string;
  fatal: true;
};
```

Example for a chestplate:

```json
[
  { "id": "left-pauldron-cells", "kind": "partCells", "selector": "left_pauldron", "minCells": 50, "fatal": true },
  { "id": "right-pauldron-cells", "kind": "partCells", "selector": "right_pauldron", "minCells": 50, "fatal": true },
  { "id": "right-pauldron-fill", "kind": "materialSlot", "selector": "right_pauldron.fill", "fatal": true },
  { "id": "emblem-cells", "kind": "heraldryCells", "selector": "emblem", "minCells": 1, "fatal": true },
  { "id": "center-core-mask", "kind": "shaderMask", "selector": "center_core", "minCells": 1, "fatal": true }
]
```

## 8.3 Failure Diagnostic

Failure must point at the seam and route step, not only the final image:

```json
{
  "ok": false,
  "code": "PB_ROUTE_REQUIRED_OUTPUT_EMPTY",
  "route": "armor.chestplate.sovereign-v1",
  "step": "HeraldryAMP",
  "seam": "heraldry.template -> silhouette.partOf",
  "requiredOutput": "emblem-cells",
  "message": "Required heraldry entry emblem stamped zero cells.",
  "context": {
    "target": "harness",
    "mark": "eye",
    "scale": 1,
    "center": { "x": 32, "y": 37 }
  }
}
```

# 9. Seam Composition Contract

## 9.1 Seam Spec

Every microprocessor must expose a seam descriptor:

```ts
type SeamSpec = {
  id: string;
  processor: string;
  version: string;
  consumes: string[];
  emits: string[];
  mutates?: string[];
  validates?: string[];
  requires?: RequiredOutput[];
  optionalWarnings?: string[];
};
```

Example:

```json
{
  "id": "heraldry-template-v1",
  "processor": "pixelbrain.heraldry",
  "version": "0.3.0",
  "consumes": [
    "template.coordinates",
    "silhouette.partOf",
    "spec.heraldry",
    "construction.anchors.safeZoneCenter"
  ],
  "emits": [
    "part.emblem.cells",
    "template.coordinates.slotDelta",
    "diagnostics.heraldry.template"
  ],
  "mutates": [
    "silhouette.partOf"
  ],
  "validates": [
    "emblem.cells > 0 when required",
    "emblem does not touch outline",
    "emblem coverage within configured bounds"
  ]
}
```

## 9.2 Composition Rules

The router must reject a route when:

- A processor consumes an artifact no prior processor emits.
- Two processors both mutate the same authority without an ordered merge contract.
- A required output has no responsible emitting processor.
- A processor emits a shadow copy of an authority already owned elsewhere.
- Final geometry is built before all retagging processors have run.

This prevents stale shader masks, null material manifests, and render-ready diagnostics on incomplete structures.

# 10. Determinism Rules

- No `Math.random`, timestamps, unordered object iteration, or host-dependent floating drift in canonical artifacts.
- All noise must be coordinate-hashed or formulaic from `(spec.seed, partId, x, y, processorVersion)`.
- Trigonometric formulas are allowed only when quantized back to lattice cells through deterministic rounding rules.
- GLSL, Godot shaders, Phaser pipelines, and vector exports are presentation artifacts. They consume final lattice metadata.
- Route diagnostics must include hashes for normalized spec, skeleton, grammar expansion, final lattice, and shader packet.

# 11. GLSL and Shader Forge Boundary

Shader Forge remains valuable, but its contract is presentation:

```text
final lattice + GeometryAMP masks
  -> PB-SHADER-v1
  -> glow breathing, shimmer, fBm, domain warping, runtime pulse
```

Shaders must not:

- invent missing parts
- repair missing materials
- replace part masks
- become the canonical item geometry
- affect deterministic PNG export unless an explicit CPU-equivalent bake path exists

Correct shader responsibilities:

- mask-aware fBm shimmer
- domain-warped glow motion
- crystal breathing
- rim pulse
- runtime-only energy presentation

# 12. "ML Without the ML" Pitch

The user experience should resemble generative art direction:

```text
"Forge a sovereign void chestplate with regular human shoulders, blue enamel pauldrons, gold trim, and a central soul gem."
```

But instead of model inference, PixelBrain executes:

```text
intent terms
  -> schema-bound item spec
  -> deterministic construction skeleton
  -> grammar expansion
  -> class factory route
  -> seam-checked microprocessors
  -> validated lattice
  -> polished deterministic render
```

The system gets model-like composition without losing auditability. Every decision can be inspected, replayed, hashed, and tested.

# 13. Implementation Plan

## Phase 1: Route and Seam Contracts

- Add `microprocessor-route.js`.
- Add `seam-contract.js`.
- Define `SeamSpec`, `RequiredOutput`, `RouteDiagnostic`, and `RouteResult`.
- Convert chestplate route diagnostics into route-owned success/failure.

## Phase 2: Construction Skeleton Normalization

- Promote construction output into `PB-CONSTRUCTION-SKELETON-v1`.
- Ensure `Construction Line Microprocessor` emits anchors, axes, rings, and bounds.
- Add skeleton hash to asset packet metadata.

## Phase 3: Shape Grammar Expansion

- Add `shape-grammar-engine.js`.
- Add initial `armor.chestplate.sovereign-v1` grammar.
- Emit resolved part manifest and required output list before silhouette composition.

## Phase 4: Class Factories

- Add `factory/armor-factory.js`.
- Move chestplate route assembly out of generic `item-foundry.js`.
- Add hooks for shield and jewelry factories without changing their behavior yet.

## Phase 5: Loud Failure Enforcement

- Promote required zero-cell heraldry, null mirrored materials, missing shader masks, and strict symmetry gaps to route failures.
- Update diagnostics so `EXPORT_READY` only appears when all required outputs pass.

## Phase 6: Regression Tests and Golden Diagnostics

- Add route tests for:
  - missing mirrored material fails
  - required emblem zero cells fails
  - strict symmetry with one pauldron fails
  - shader target missing fails
  - optional decoration zero cells warns but does not fail
- Add golden diagnostics for VOID chestplate.

# 14. Acceptance Criteria

The PDR is implemented when:

- A chestplate route can be executed through a declared factory instead of implicit foundry order.
- Every route step exposes a seam descriptor.
- Required outputs are declared before execution and validated after execution.
- `ok: true` and `EXPORT_READY` cannot appear when required outputs are missing.
- Mirrored parts resolve geometry and material authority through one contract.
- GeometryAMP is generated only after all lattice-retagging processors run.
- Shader Forge consumes final masks and cannot create shadow geometry authority.
- Repeated runs produce byte-identical asset packets, PNGs, diagnostics, and shader packets.

# 15. Open Questions

- Should grammar expansions be stored as standalone `.pbgrammar` artifacts for editor inspection?
- Should route contracts live beside each AMP or in factory-owned route declarations?
- Should optional warnings be globally configurable, or only factory-specific?
- How much construction skeleton information should be exported into Aseprite `00_Reference` by default?
- Should shader masks fail on missing optional target parts, or only on `shader.targetParts` entries marked required?

# 16. Related PDRs

- `2026-06-12-sketchamp-construction-line-microprocessor-pdr.md`
- `2026-06-12-pixelbrain-deterministic-pro-chestplate-pdr.md`
- `2026-06-11-pixelbrain-item-foundry-pdr.md`
- `2026-06-11-pixelbrain-render-fidelity-pipeline-pdr.md`
- `2026-06-11-pixelbrain-emblem-microprocessor-pdr.md`
- `ChestplateAMP-pdr.md`
