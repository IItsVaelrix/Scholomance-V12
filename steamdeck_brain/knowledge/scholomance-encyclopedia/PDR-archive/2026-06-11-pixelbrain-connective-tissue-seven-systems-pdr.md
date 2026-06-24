# PDR: PixelBrain Connective Tissue Seven-System Implementation
## Asset Packet, Palette Authority, Materials, Pipeline, Shader State, Template Bridge, and Pixel Lotus Interop

**Status:** Implemented
**Classification:** Architectural + PixelBrain + Rendering + Microprocessors + Interop
**Priority:** Critical
**Primary Goal:** Implement the seven highest-boon PixelBrain connective-tissue systems found by the Emergent Disparity Reconciliation pass, without rewriting existing engines.

---

# 1. Executive Summary

PixelBrain has accumulated powerful parts: upload tracing, VerseIR synthesis, WAND handoff, Sketch AMP, TemplateEditor, chromatic transmutation, shader forge, photonic routing, Godot export, and Pixel Lotus actor schemas. The opportunity is not a full rewrite. The opportunity is to introduce stable connective tissue so these systems can exchange one coherent asset model.

This PDR implements all seven reconciliation systems:

1. PixelBrain Asset Packet Contract
2. Palette Authority Bridge
3. Core Material Registry Migration
4. PixelBrain Operation Pipeline
5. Shader Uniform Providers for PixelBrain State
6. TemplateEditor to Asset Packet Bridge
7. PixelBrain and Pixel Lotus Interop Bridge

## Add These Function Roles

```js
createPixelBrainAssetPacket(input)
// raw source → canonical packet

normalizePixelBrainAssetPacket(packet)
// canonical-ish packet → stable canonical packet

derivePixelBrainRenderPacket(packet, options)
// asset packet → render packet

derivePixelBrainExportPacket(packet, target, options)
// asset packet → target-specific export packet

# 2. Problem Statement

PixelBrain currently has strong local behaviors but weak shared contracts. Several systems produce or consume near-identical concepts with incompatible shapes:

- `coordinates`
- `palettes`
- `canvas`
- `formula`
- `bytecode`
- `material`
- `template slots`
- `photonicRoute`
- `WAND fill specs`
- Pixel Lotus layer palettes/materials

Because no canonical packet exists, each surface manually assembles payloads. This raises risk in exports, shader state, future animation, material transmutation, Pixel Lotus actor creation, and QA.

# 3. Product Goal

Create additive bridges that make PixelBrain systems interoperable while preserving current engines and UI behavior.

The intended end-state:

```text
Sources
  Upload | VerseIR | WAND | Sketch | TemplateEditor | Pixel Lotus
      ↓
PixelBrain Asset Packet
      ↓
Palette Authority Bridge
      ↓
Material Registry / Chromatic Transform
      ↓
Operation Pipeline
      ↓
Preview | Shader Forge | Photonic Route | PNG | Godot | Pixel Lotus
```

# 4. Non-Goals

- Do not rewrite `PixelBrainPage.jsx` into a new app.
- Do not replace `color-byte-mapping.js`.
- Do not remove existing WAND, Sketch, TemplateEditor, Shader Forge, or Photonic Retina behavior.
- Do not make Pixel Lotus depend on page-level PixelBrain UI code.
- Do not collapse all differences into one mega-object.
- Do not change user-visible workflows unless a bridge exposes an already-existing capability.

# 5. Core Design Principles

- Additive and reversible.
- Core contracts live under `codex/core/pixelbrain` or neutral `src/lib` adapters, not page components.
- UI surfaces consume adapters/facades.
- Every bridge has contract tests.
- Source data and render data remain distinguishable.
- Bytecode palette authority stays downstream in `color-byte-mapping.js`.
- Page-local state should converge toward packet derivation, not ad hoc assembly.
- 
- # 5.1 System Invariants

These invariants must remain true throughout every implementation phase:

1. A `PixelBrainAssetPacket` is the canonical exchange model.
2. Source packets, render packets, export packets, and adapter packets are separate derivations, not interchangeable aliases.
3. `normalizePixelBrainAssetPacket()` must be pure and must not mutate input.
4. Page-level PixelBrain modules may import from `codex/core/pixelbrain`, but core PixelBrain modules must not import from `src/pages/PixelBrain`.
5. Pixel Lotus may receive PixelBrain packets through adapters only. It must not depend on PixelBrain page state.
6. Palette authority resolves in this order:
   - named/source color
   - semantic palette
   - material transform
   - byte map
7. Material identity must survive every supported export when the target format can represent it.
8. Existing PNG and Godot visual output must remain unchanged unless a phase explicitly declares a behavioral change.
9. Pipeline stages must return diagnostics and must not throw opaque errors for expected invalid inputs.
10. Every bridge must have at least one golden fixture before page integration.

# 6. Feature Overview

## 6.1 Asset Packet Contract

Add:

```text
codex/core/pixelbrain/pixelbrain-asset-packet.js
```

Exports:

- `createPixelBrainAssetPacket(input)`
- `normalizePixelBrainAssetPacket(input)`
- `derivePixelBrainRenderPacket(packet, options)`
- `assertPixelBrainAssetPacket(packet)`

{
  kind: 'pixelbrain.asset.v1',
  id,
  schemaVersion: 1,

  source: {
    kind: 'upload' | 'verseir' | 'wand' | 'sketch' | 'template-editor' | 'pixel-lotus',
    id,
    label,
    importedAt
  },

  canvas: {
    width,
    height,
    cellSize,
    transparent,
    background
  },

  geometry: {
    mode: 'sparse-cells' | 'coordinates' | 'raster-trace' | 'template-grid',
    bounds,
    coordinates,
    cells
  },

  palette: {
    sourcePalette,
    semanticPalette,
    materialPalette,
    byteMap,
    authority
  },

  bytecode: {
    raw,
    components,
    authority,
    materialStage
  },

  template: {
    id,
    gridType,
    symmetryAxes,
    slots,
    fillState
  },

  material: {
    id,
    variant,
    registryVersion,
    parameters
  },

  chromatic: {
    transformId,
    diagnostics
  },

  photonic: {
    routeId,
    packetId,
    status
  },

  provenance: {
    createdBy,
    operations
  },

  metadata: {
    tags,
    notes,
    compatibility
  }
}

# 6.1.1 Packet Derivation Model

PixelBrain uses layered packet derivation:

```text
Source Input
  ↓
PixelBrainAssetPacket
  ↓
PixelBrainRenderPacket
  ↓
Target Export Packet

## 6.2 Palette Authority Bridge

Add:

```text
codex/core/pixelbrain/palette-authority-bridge.js
```

# 6.1.2 Normalization Alias Map

| Incoming Concept | Canonical Packet Field |
|---|---|
| `coordinates` | `geometry.coordinates` |
| `cells` | `geometry.cells` |
| `canvas` | `canvas` |
| `palettes` | `palette.sourcePalette` |
| `paletteId` | `palette.sourcePalette.id` |
| `byteMap` | `palette.byteMap` |
| `formula` | `bytecode.raw` or `bytecode.components.formula` |
| `bytecode` | `bytecode.raw` |
| `template slots` | `template.slots` |
| `fill specs` | `template.fillState` |
| `material` | `material.id` + `material.parameters` |
| `chromatic material` | `chromatic.transformId` + `material.id` |
| `photonicRoute` | `photonic.routeId` |
| Pixel Lotus `layer.palette` | `palette.sourcePalette` |
| Pixel Lotus `layer.material` | `material.id` |

Responsibilities:

- Resolve named colors through `color.resolve`.
- Resolve bytecode palettes through `bytecodeToPalette`.
- Apply material transforms through the material registry.
- Emit stable palette + byteMap payloads.

## 6.3 Core Material Registry Migration

Move material definitions out of page-local AMP ownership:

```text
codex/core/pixelbrain/material-registry.js
```

First-class materials:

- `source`
- `icy_fire`

Future-ready entries:

- `shadow_fire`
- `holy_fire`
- `poison_flame`
- `void_ice`

The existing page AMP becomes a consumer of core material rules, not the owner.

# 6.4.1 Pipeline Diagnostics Contract

Every pipeline stage returns diagnostics using this shape:

```js
{
  stageId,
  status: 'ok' | 'warning' | 'error' | 'skipped',
  code,
  message,
  inputHash,
  outputHash,
  warnings: [],
  errors: [],
  durationMs,
  metadata
}

## 6.5 Shader Uniform Providers for PixelBrain State

Add:

```text
codex/core/pixelbrain/pixelbrain-shader-uniform-providers.js
```

Expose uniforms for:

- active material
- palette count
- primary palette color
- template flag
- fill bytecode components
- WAND handoff presence
- photonic packet status

## 6.6 TemplateEditor to Asset Packet Bridge

Add:

```text
codex/core/pixelbrain/template-grid-asset-bridge.js
```

Responsibilities:

- Convert a `TemplateEditor` grid/layer into an asset packet.
- Preserve grid type, cell size, symmetry axes, painted cells, and canvas.
- Let painted grids flow into chromatic transform, photonic route, Godot export, and Pixel Lotus.

## 6.7 PixelBrain and Pixel Lotus Interop Bridge

Add:

```text
src/pixel-lotus/actor-forge/pixelbrainLayerBridge.ts
```

Responsibilities:

- `pixelBrainPacketToPixelLotusLayer(packet, options)`
- `pixelLotusLayerToPixelBrainPacket(layer, options)`
- Carry `paletteId`, `materialId`, provenance, and layer slot metadata.

# 7. Architecture

```text
codex/core/pixelbrain/
  pixelbrain-asset-packet.js
  palette-authority-bridge.js
  material-registry.js
  pixelbrain-operation-pipeline.js
  pixelbrain-shader-uniform-providers.js
  template-grid-asset-bridge.js

src/pages/PixelBrain/
  PixelBrainPage.jsx
  amps/chromaticTransmutationAmp.js
  components/TemplateEditor.jsx

src/pixel-lotus/actor-forge/
  pixelbrainLayerBridge.ts
```

The page remains an orchestrator, but the packet and bridge logic move into pure modules.

# 8. Module Breakdown

## Asset Packet Module

Normalizes:

- coordinates
- palettes
- canvas
- formula/bytecode
- template metadata
- chromatic/material metadata
- provenance

## Palette Authority Bridge

Consumes:

- `color.resolve`
- `bytecodeToPalette`
- `material-registry`

Emits:

- `sourcePalette`
- `semanticPalette`
- `materialPalette`
- `byteMap`

## Material Registry

Owns:

- named material anchors
- luminance thresholds
- material rules
- material options for UI

## Operation Pipeline

Runs deterministic stages over asset packets and returns:

- final packet
- stage diagnostics
- warnings

## Shader Providers

Registers PixelBrain-specific uniform providers without page-specific imports.

## Template Grid Bridge

Converts mutable grid engine state into a serializable asset packet.

## Pixel Lotus Bridge

Converts between sprite asset packets and actor layer contracts.

# 9. ByteCode IR Design

No new bytecode syntax is required in Phase 1. The bridge must preserve current VW bytecode strings and expose packet metadata:

```js
bytecode: 'VW-WILL-RARE-HARMONIC'
paletteAuthority: 'color-byte-mapping.v12'
materialStage: 'icy_fire'
```

Optional future bytecode extension:

```text
VW-WILL-RARE-HARMONIC+MAT-ICY_FIRE
```

This future syntax is explicitly out of scope until packet and palette bridges are stable.

# 10. Implementation Phases

## Phase 0: Contract Tests

- Add packet normalization tests.
- Add golden packet fixtures.
- Add no-mutation tests for source packets.

## Phase 1: Asset Packet Contract

- Implement packet module.
- Update PixelBrainPage derivation points to use packet helpers for upload, VerseIR, WAND, Sketch, and render payloads.

## Phase 2: Palette Authority Bridge

- Implement named color + bytecode + material palette resolver.
- Add tests for source, named color, school color, bytecode, and material transforms.

## Phase 3: Material Registry Migration

- Move material palette definitions into core.
- Update `chromaticTransmutationAmp.js` to consume the registry.
- Preserve current `icy_fire` behavior.

## Phase 4: Operation Pipeline

- Add pure pipeline runner.
- Register `pixelbrain.pipeline.run`.
- Add pipeline tests for trace → material → photonic route.

## Phase 5: Shader Uniform Providers

- Add PixelBrain uniform provider module.
- Register/use providers from Shader Forge runtime state.
- Add tests for material/palette/template/WAND/photonic uniforms.

## Phase 6: TemplateEditor Bridge

- Add grid-to-packet conversion.
- Add UI command to load TemplateEditor grid into the active PixelBrain packet.
- Ensure export paths consume the same packet.

## Phase 7: Pixel Lotus Bridge

- Add packet/layer adapters.
- Add Actor Forge lab interop path.
- Preserve provenance and material/palette ids.

# 11. QA Requirements

- Asset packet normalization is deterministic.
- Source packets are not mutated by render/material derivation.
- Existing PNG and Godot export colors match displayed preview.
- TemplateEditor grid packet export preserves cell count and grid metadata.
- `icy_fire` output matches current golden expectations.
- Shader uniforms expose packet state without requiring page imports.
- Pixel Lotus adapters preserve layer slot, material id, palette id, and provenance.
- `pixelbrain.pipeline.run` produces stable diagnostics and stable output for the same input.

# 12. Success Criteria

- PixelBrain has a canonical packet contract.
- All seven connective-tissue systems have focused tests.
- Existing PixelBrain user workflows still work.
- New bridges make TemplateEditor, WAND, Chromatic AMP, Shader Forge, Photonic Retina, Godot export, and Pixel Lotus interoperate through shared contracts.
- No school/global palette logic is broken outside PixelBrain.

Required Diagnostic Codes
Code	Meaning
PACKET_NORMALIZED	Packet was normalized successfully
PACKET_ALIAS_REWRITTEN	Legacy field was moved to canonical field
PALETTE_FALLBACK_USED	Palette resolution used fallback
MATERIAL_UNKNOWN	Unknown material ID was safely ignored or replaced
BYTECODE_UNPARSED	Bytecode preserved raw but components unavailable
PHOTONIC_ROUTE_SKIPPED	Route unavailable or disabled
EXPORT_TARGET_UNSUPPORTED	Target not supported by current packet
ADAPTER_LOSSY	Adapter could not preserve every field


## Risk Reduced

Diagnostics become searchable, testable, and useful for UI surfacing. No more “something failed in the mist.”

---

# 6. Add Failure and Fallback Behavior

## Why

The current PDR says what each bridge does, but not what happens when things are missing, unknown, malformed, or unsupported.

That matters because this system touches uploads, bytecode, materials, shaders, exports, and interop.

## Add This

```md
# 6.8 Failure and Fallback Policy

## Unknown Material

Unknown material IDs must resolve to `source` material and emit `MATERIAL_UNKNOWN`.

## Unknown Color Name

Unknown color names must preserve the raw input and emit `PALETTE_FALLBACK_USED`.

## Invalid Bytecode

Invalid bytecode must remain in `bytecode.raw`; component parsing may fail without blocking packet normalization.

## Missing Canvas

Missing canvas must be derived from geometry bounds when possible.

## Empty Template Grid

Empty grids are valid packets with zero painted cells.

## Unsupported Export Target

Unsupported export targets must return a structured error packet, not throw an opaque exception.

## Lossy Adapter Conversion

Adapters must mark conversion as lossy when PixelBrain data cannot be represented in Pixel Lotus or vice versa.

7. Add Import Boundary Rules
Why

The PDR already states that the page remains an orchestrator and pure modules move into codex/core/pixelbrain.

Now enforce the direction.

Add This
# 7.1 Import Boundary Rules

Allowed:

```text
src/pages/PixelBrain/* → codex/core/pixelbrain/*
src/pixel-lotus/actor-forge/* → codex/core/pixelbrain/*
codex/core/pixelbrain/* → codex/core/pixelbrain/*

Forbidden:

codex/core/pixelbrain/* → src/pages/PixelBrain/*
codex/core/pixelbrain/* → React components
codex/core/pixelbrain/* → browser globals
codex/core/pixelbrain/* → PixelBrain page state
src/pixel-lotus/* → src/pages/PixelBrain/*

If a core module needs environment-specific behavior, inject it through options or adapters.


## Risk Reduced

This prevents core from quietly becoming page-shaped. That is the slippery banana peel.

---

# 8. Add a Golden Fixture Matrix

## Why

The PDR has Phase 0 contract tests, golden packet fixtures, and no-mutation tests. That is excellent. Now specify the actual fixture matrix. :contentReference[oaicite:7]{index=7}

## Add This

```md
# 10.1 Golden Fixture Matrix

| Fixture | Source | Must Validate |
|---|---|---|
| `upload-basic.packet.json` | Upload | canvas, coordinates, source palette |
| `verseir-bytecode.packet.json` | VerseIR | bytecode raw, formula metadata |
| `wand-fill.packet.json` | WAND | fill specs, template fill state |
| `sketch-coordinates.packet.json` | Sketch AMP | sparse geometry, bounds |
| `template-grid-painted.packet.json` | TemplateEditor | grid type, symmetry, painted cell count |
| `chromatic-icy-fire.packet.json` | Chromatic AMP | material id, material palette, diagnostics |
| `photonic-routed.packet.json` | Photonic Retina | route id, packet status |
| `pixel-lotus-layer.packet.json` | Pixel Lotus | layer slot, palette id, material id |
Add These Required Assertions
Each fixture must assert:

- input is not mutated
- output packet has stable `kind`
- output packet has stable `schemaVersion`
- normalization is deterministic
- render derivation is deterministic
- lossy conversions emit diagnostics
- material ID survives supported round trips
- palette ID survives supported round trips
Risk Reduced

This converts the QA section from “remember to test things” into “these artifacts must exist.”

9. Add Phase Gates
Why

The current implementation phases are clear, but each phase should have an exit gate. Otherwise Phase 4 can begin while Phase 1 is half-molten.

Upgrade Phases Like This
## Phase 1 Exit Gate: Asset Packet Contract

Phase 1 is not complete until:

- upload, VerseIR, WAND, Sketch, and render payloads can normalize into packets
- at least three golden fixtures pass
- `derivePixelBrainRenderPacket()` is used by one real preview/export path
- no existing PixelBrain user workflow changes
## Phase 3 Exit Gate: Material Registry

Phase 3 is not complete until:

- `icy_fire` definition lives in core registry
- `chromaticTransmutationAmp.js` consumes core material data
- visual output matches existing golden expectation
- unknown material falls back to `source`
## Phase 7 Exit Gate: Pixel Lotus Bridge

Phase 7 is not complete until:

- PixelBrain packet converts to valid Pixel Lotus layer
- Pixel Lotus layer converts back to valid PixelBrain packet
- round-trip diagnostics report whether conversion was lossless
- Actor Forge lab path works without importing PixelBrain page code
Risk Reduced

Phase gates prevent “implemented” from meaning “file exists.”

10. Add Adapter Lossiness Rules
Why

PixelBrain and Pixel Lotus do not have identical concepts. The bridge should not pretend every conversion is perfect.

Add This
# 6.7.1 Adapter Lossiness Rules

Adapters must declare whether conversion is lossless.

```js
{
  result,
  diagnostics: {
    lossless: true,
    lostFields: [],
    approximatedFields: []
  }
}
Lossy Examples
Conversion	Possible Loss
PixelBrain → Pixel Lotus	Photonic route metadata may not map to actor layer
PixelBrain → PNG	Material identity may not survive in pixels
Pixel Lotus → PixelBrain	Actor animation metadata may not map to template grid
Godot export	Some shader hints may require target-specific translation

## Risk Reduced

This protects interop from lying. Honest bridges age better.

---

# 11. Improve Palette Authority Specificity

## Why

The palette bridge currently has responsibilities, but it needs a strict resolution order and output shape. :contentReference[oaicite:8]{index=8}

## Add This

```md
# 6.2.1 Palette Resolution Order

Palette Authority Bridge resolves color in this order:

1. Preserve source palette if supplied.
2. Resolve named colors through `color.resolve`.
3. Resolve semantic palette roles.
4. Apply material transform from `material-registry`.
5. Derive byte map through `bytecodeToPalette`.
6. Emit diagnostics for fallback, transform, or byte-map mismatch.
Add Output Shape
{
  sourcePalette,
  semanticPalette,
  materialPalette,
  byteMap,
  authority: {
    colorResolverVersion,
    byteMappingVersion,
    materialRegistryVersion
  },
  diagnostics
}
Risk Reduced

This prevents material transform and byte mapping from being applied in the wrong order.

12. Expand Material Registry Contract
Why

The material registry currently owns named anchors, luminance thresholds, material rules, and UI options. Good start.

Make the entry shape explicit.

Add This
{
  id: 'icy_fire',
  label: 'Icy Fire',
  version: 1,
  category: 'hybrid',

  paletteRoles: {
    primary: 'cold',
    secondary: 'heat',
    accent: 'ember'
  },

  transform: {
    id: 'icy_fire.transform.v1',
    blendMode: 'thermal-contrast',
    luminanceThresholds: {
      shadow: 0.2,
      mid: 0.55,
      highlight: 0.85
    }
  },

  shaderHints: {
    emission: 0.65,
    distortion: 0.25,
    contrast: 0.8
  },

  exportHints: {
    godot: {
      materialKind: 'shader'
    },
    pixelLotus: {
      materialKind: 'hybrid-elemental'
    }
  },

  ui: {
    selectable: true,
    experimental: false
  }
}
Risk Reduced

This turns materials into portable semantic objects, not page-side visual recipes.

13. Add Shader Uniform Naming Rules
Why

Shader uniform providers are planned, but uniform names need a stable convention.

Add This
# 6.5.1 PixelBrain Uniform Naming

PixelBrain shader uniforms use the `u_pb_` prefix.

Required uniforms:

```js
{
  u_pb_active,
  u_pb_material_hash,
  u_pb_palette_count,
  u_pb_primary_color,
  u_pb_template_active,
  u_pb_fill_density,
  u_pb_wand_handoff_active,
  u_pb_photonic_status,
  u_pb_layer_count
}

Uniform providers must be pure derivations from packet/runtime state and must not import React/page modules.


## Risk Reduced

Prevents shader naming drift and page-state leakage.

---

# 14. Add Performance Budgets

## Why

This system can become heavy: normalization, palette transforms, material transforms, shader derivation, grid conversion, and export all touch potentially large visual data.

## Add This

```md
# 11.1 Performance Budgets

| Operation | Budget |
|---|---|
| Packet normalization | O(n) over cells/coordinates |
| Render packet derivation | O(n) over visible cells |
| Palette authority resolution | O(p) over palette entries |
| Template grid conversion | O(painted cells), not full canvas when sparse |
| Pixel Lotus adapter | O(layer cells) |
| Shader uniform derivation | O(1) or O(summary fields), never full-grid scan per frame |

Shader uniform providers must not scan full packet geometry every frame. Expensive values should be precomputed during packet normalization or pipeline stages.
Risk Reduced

This prevents beautiful architecture from becoming a frame-rate swamp creature.

15. Add Security and Input Hygiene
Why

PixelBrain handles upload tracing and exports. The PDR should explicitly guard malformed asset inputs, giant grids, and unsafe metadata.

Add This
# 11.2 Input Hygiene

- Uploaded metadata must be treated as untrusted.
- Packet names, tags, and notes must not be executed or injected into DOM.
- Canvas dimensions must be capped.
- Cell counts must be capped or streamed.
- Unknown fields must be preserved only under `metadata.unrecognized` or discarded with diagnostics.
- Export filenames must be sanitized.
- JSON export must not include functions, DOM nodes, cyclic references, or runtime objects.
Risk Reduced

This protects the bridge layer from becoming an accidental smuggling tunnel.

16. Add a “First PR Slice”
Why

The PDR is ambitious. Add one tiny implementation slice so the first commit is obvious and low-risk.

Add This
# 13. First PR Slice

The first PR should only implement:

1. `pixelbrain-asset-packet.js`
2. packet normalization for one upload-style payload
3. packet normalization for one TemplateEditor-style payload
4. `derivePixelBrainRenderPacket()`
5. three golden fixtures
6. no PixelBrain UI behavior changes

Do not implement palette authority, material registry migration, pipeline runner, shader providers, or Pixel Lotus adapters in the first PR.
Risk Reduced

This makes the opening move surgical. No seven-headed PR hydra.

17. Naming Polish
Recommended Edits
Current	Better
ByteCode IR Design	Bytecode IR Design
PixelBrain and Pixel Lotus Interop Bridge	PixelBrain ↔ Pixel Lotus Interop Bridge
source material	base or source_default material
materialStage	materialId or material.stageId
paletteAuthority as string	palette.authority object
kind: 'pixelbrain.asset.v1'	Keep, but add schemaVersion: 1
Why

Small naming improvements prevent future ambiguity. source as a material name is especially risky because source already means input origin.

Strongest Upgrade: Add the Control Plane

The PDR currently describes seven modules. What it needs is one additional conceptual layer:

PixelBrain Control Plane
  owns:
    packet normalization
    authority order
    diagnostics
    phase gates
    import boundaries
    fixture matrix

This is not a new runtime module necessarily. It is a governance layer in the PDR.

Without it, the seven systems can still drift.

With it, everything obeys the same laws.

Recommended New Table of Contents Additions

Add these sections:

5.1 System Invariants
6.1.1 Packet Derivation Model
6.1.2 Normalization Alias Map
6.2.1 Palette Resolution Order
6.4.1 Pipeline Diagnostics Contract
6.5.1 PixelBrain Uniform Naming
6.7.1 Adapter Lossiness Rules
6.8 Failure and Fallback Policy
7.1 Import Boundary Rules
10.1 Golden Fixture Matrix
10.2 Phase Exit Gates
11.1 Performance Budgets
11.2 Input Hygiene
13. First PR Slice
