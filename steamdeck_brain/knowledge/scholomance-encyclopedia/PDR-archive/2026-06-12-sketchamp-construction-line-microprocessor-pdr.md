# PDR: SketchAMP + Construction Line Microprocessor
## Deterministic Reference Geometry, Guide Layers, and Early-Stage Sketch Substrate for PixelBrain Assets (especially radial / shield-like forms)

**Status:** Draft
**Classification:** PixelBrain + Sketching + Reference Layer + AMP + Microprocessor + Aseprite Bridge + Item Foundry
**Priority:** High
**Primary Goal:** Define SketchAMP as the artist- and generator-facing sketch substrate, and add a dedicated Construction Line Microprocessor that produces, consumes, and validates precise guide geometry for `00_Reference` layers and early silhouette locking.

---

# 1. Executive Summary

PixelBrain already has a powerful **Blueprint AMP** that acts as the foundational *engine* sketch layer (sections, anchors, lattice derivation). However, the *artist / construction / reference* side of the pipeline has remained implicit.

For shield-like assets (Void Shield, kiteshields, energy orbs, jewelry, focal emblems) the single most important early decision is the **construction geometry**: exact center, concentric ring radii, radial spokes, elliptical bounds, cross axes, and proportion markers. Without clean, repeatable construction, the later Structure / Energy / Focal layers inherit wobbly rings, off-center focal points, and broken symmetry.

This PDR introduces:

- **SketchAMP** — the named AMP responsible for the early sketch / reference phase. It sits before Structure and produces (or accepts) the canonical `00_Reference` layer.
- **Construction Line Microprocessor** — a focused, reusable microprocessor inside (or wired to) SketchAMP whose sole job is the generation, rasterization, validation, and round-trip handling of construction geometry.

The microprocessor understands pixel-correct radial and concentric math and emits tagged reference cells that the Aseprite Foundry bridge can place into the locked `00_Reference` layer (low opacity, non-destructive).

```text
ITEM-SPEC-v1 (or manual sketch spec)
  -> SketchAMP
       -> Construction Line Microprocessor
            -> reference geometry (center, rings, radials, axes, bounds)
            -> tagged cells (partId: "reference", role: "construction")
  -> 00_Reference layer (via Foundry Aseprite bridge or direct packet)
  -> 10_Structure / 20_Energy / 30_Focal (locked to the guides)
  -> shading, glow, final passes
```

This gives both **generative** power (auto-perfect rings for a 7-ring Void Shield) and **mentorship / analysis** power (detect wobbly construction in user art and give exact corrective coordinates).

---

# 2. Problem Statement

Current state:

- Shield and circular assets rely on ad-hoc center picking and manual ellipse approximation in Aseprite or bespoke generators.
- Concentric energy rings frequently suffer from 1px drift between rings because there is no authoritative radial math at the sketch stage.
- The `00_Reference` layer in the Aseprite bridge exists in name but has no standardized content contract or processor that populates it with useful guides.
- The PixelBrain Grok mentorship skill (pixelbrain) already teaches "use construction lines first" for the Void Shield, but there is no matching deterministic microprocessor the engine or bridge can invoke.
- Later passes (directional light, emblem microprocessor, square sharpness contrast AMP) cannot reliably key off a shared, auditable construction substrate.

Result: beautiful material work on top of slightly off geometry. The silhouette and ring regularity are the first things that read as amateur or "hand-wavy."

---

# 3. Product Goal

Create a first-class **SketchAMP** with a pluggable **Construction Line Microprocessor** that can:

1. Accept a compact construction spec and emit deterministic reference cells.
2. Ingest existing reference pixels (from Aseprite or prior generation) and extract / validate the underlying geometry.
3. Provide clean, high-contrast (but non-final) guide pixels suitable for the `00_Reference` layer convention.
4. Feed exact center, ring radii, and symmetry data downstream to Structure, Energy, Focal, and lighting passes.
5. Survive lossless round-tripping through the Foundry Aseprite bridge (import + export).
6. Be directly usable by the PixelBrain mentorship system (the same spec language powers both generation and teaching/critique).

Primary module locations:

```text
codex/core/pixelbrain/sketchamp.js
codex/core/pixelbrain/construction-line-microprocessor.js   (or reference-construction-mp.js)
```

Public surface (initial):

- `runSketchAMP(spec, options)`
- `applyConstructionLines(basePacketOrCoords, constructionSpec)`
- `extractConstructionFromReference(referenceCells)`
- `validateConstructionAgainstSpec(referenceCells, spec)`
- `renderConstructionGuides(spec, style)`  // style = { color, opacityRole, tag }

---

# 4. Non-Goals (v1)

- Do not replace Blueprint AMP (the engine lattice sketch). SketchAMP is the *artist/reference* sketch; Blueprint remains the *render substrate* sketch.
- Do not perform final shading or material work.
- Do not force every asset to use construction lines (weapons, organic forms, and asymmetric pieces may opt out or use lighter guides).
- Do not invent a new binary format — reuse/extend existing Foundry JSON + Aseprite bridge.
- Do not require the microprocessor to rasterize "pretty" art; its output is always temporary guide/reference data.

---

# 5. Design

## 5.1 Construction Spec (authoritative, tiny, versioned)

```json
{
  "version": "construction-v1",
  "center": { "x": 32, "y": 32 },
  "bounds": { "width": 48, "height": 48, "shape": "ellipse" },
  "rings": [
    { "radius": 8,  "role": "inner-core" },
    { "radius": 14, "role": "primary-energy" },
    { "radius": 20, "role": "outer-ring" }
  ],
  "radials": {
    "count": 8,
    "offsetDegrees": 22.5,
    "lengths": "to-outer"
  },
  "axes": ["horizontal", "vertical", "diagonal"],
  "proportionDividers": [0.25, 0.5, 0.75],
  "style": {
    "guideColor": "ref-cyan",
    "centerMarker": "cross-3px",
    "ringStyle": "dashed-2px"   // or solid, dotted, etc. (for visual only)
  }
}
```

This spec is the single source of truth. Everything else (rasterized guides, extracted analysis, downstream locking) derives from it.

## 5.2 The Construction Line Microprocessor

Responsibilities:

- **Generate**: Given the spec above + a target canvas or bounding box, produce an array of reference cells with stable `partId: "00_Reference"`, `role: "construction"`, plus metadata (`ringIndex`, `radialIndex`, `isCenter`, `isAxis`).
- **Raster Math**: Pixel-correct concentric ellipses (midpoint + adjustments for even/odd diameters), radial lines using symmetric Bresenham or supercover variants that prefer visual regularity over pure mathematical perfection at small sizes.
- **Validation / Audit**: Given a set of reference cells, reconstruct approximate center + radii + spoke angles and report drift (e.g. "Ring 2 center drifted +1px down; max ring irregularity = 1.3px").
- **Downstream Hints**: Emit a small `constructionHints` object (`{ center, ringRadii: number[], symmetryAxes: [...] }`) that StructureAMP, Energy rings, Focal placement, and the emblem microprocessor can consume so later passes are geometrically locked.

Integration points:

- Runs early in SketchAMP.
- Its output can be written directly into a `PixelBrainAssetPacket` under a `reference` or `construction` collection.
- The Foundry Aseprite bridge already knows the `00_Reference` layer name — the microprocessor just needs to tag cells so the bridge groups them correctly (and can force low opacity + locked on import).

## 5.3 SketchAMP as Container

SketchAMP is the AMP that orchestrates:

- Optional incoming reference image / loose sketch ingestion
- Invocation of the Construction Line Microprocessor (or other future sketch microprocessors: proportion grids, vanishing points, organic gesture curves, etc.)
- Merging of generated guides with any artist-supplied reference marks
- Emission of a clean `SketchArtifact` (or extension of the existing Blueprint one) plus the tagged reference cell set
- Handoff contract to the Structure / main item pipeline

It can be invoked in "pure guide" mode (only emit 00_Reference) or "full sketch substrate" mode.

## 5.4 Aseprite / Foundry Bridge Considerations

- On export: cells with `partId` or layer role starting with `00_Reference` or tagged `construction` become the `00_Reference` layer (low opacity, locked, perhaps a distinct bright guide palette entry that is stripped on final export).
- On import: the Lua scripts + bridge should recognize a `00_Reference` layer and preserve its pixels as reference construction data so re-import can feed `extractConstructionFromReference()`.
- Construction lines should **never** contribute to the final non-transparent cell count for the asset packet unless explicitly promoted (artist chooses to "ink" a guide into structure).

---

# 6. Example Usage (Generator + Manual Polish)

```js
import { runSketchAMP, applyConstructionLines } from 'codex/core/pixelbrain/sketchamp.js';

const spec = {
  id: "void-shield-v3",
  construction: {
    version: "construction-v1",
    center: { x: 31, y: 31 },
    rings: [
      { radius: 5, role: "core" },
      { radius: 11, role: "inner" },
      { radius: 17, role: "mid" },
      { radius: 23, role: "outer" }
    ],
    radials: { count: 6 },
    // ...
  }
};

const { referenceCells, constructionHints } = applyConstructionLines([], spec.construction);

// Later in pipeline or in Aseprite roundtrip the referenceCells become 00_Reference
```

Artist flow:
1. Generate or load a void-shield spec.
2. SketchAMP + Construction MP emits perfect guides into 00_Reference.
3. Open in Aseprite via bridge → see clean cyan rings + crosshairs on a locked low-opacity layer.
4. Draw Structure on 10_Structure *snapping to* the visible guides.
5. Export back. The guides stay in the packet for future re-edits or automated validation.

---

# 7. Execution Plan

**Phase 1 — Math & Core Microprocessor**
- Implement pixel-correct `rasterConcentricEllipse(cx, cy, r, options)`
- Implement symmetric radial spokes
- Center marker and axis primitives
- Basic `construction-line-microprocessor.js` with generate + extract + validate

**Phase 2 — SketchAMP Container**
- Wire `sketchamp.js` that accepts construction spec (and future other sketch specs)
- Produce the handoff `constructionHints` + reference cell set
- Add to the standard item-foundry pipeline (optional, behind a `useConstructionSketch` flag)

**Phase 3 — Aseprite Bridge Integration**
- Ensure `exportFoundryToAseprite` groups reference-tagged cells under `00_Reference`
- Update Lua importer to create the layer with correct locked + low-opacity state
- Add round-trip test: generate → export JSON → import → extractConstruction matches original spec within tolerance

**Phase 4 — Downstream Locking + Mentorship Surface**
- Feed `constructionHints` into StructureAMP, energy ring generators, focal placement, emblem microprocessor
- Expose a lightweight analysis function consumable by the PixelBrain Grok skill (`/pixelbrain`) so the mentorship persona can say "your outer ring center is +1px; here is the authoritative construction spec to snap to"

**Phase 5 — Validation & Diagnostics**
- Add diagnostic cells / immunity rules that fire when significant construction drift is detected in a final asset
- Surface in PixelBrain diagnostic reports and the collab plane

---

# 8. Success Criteria

- A 5-ring Void Shield generated from a 6-line construction spec has perfectly regular concentric rings (max deviation ≤ 0.5px from ideal after rasterization).
- An artist can open the asset in Aseprite, see clean usable guides in `00_Reference`, draw on top, and re-import without the guides polluting the final asset.
- The same construction spec can be fed to the PixelBrain mentorship skill and used to give pixel-precise critique ("move your ring-3 1px inward at 3 o'clock").
- Later passes (shading, emblems, contrast AMP) can optionally key their behavior off the authoritative center and ring radii.

---

# 9. Relationship to Existing Systems

- **Blueprint AMP**: Complementary. Blueprint is the render-time sketch substrate. SketchAMP + Construction MP is the *design-time / reference* sketch layer.
- **Foundry Aseprite Bridge** (2026-06-12): Direct consumer of the reference layer output.
- **Emblem Microprocessor**: Construction MP provides the reliable center + safe zones that emblems need.
- **PixelBrain Grok Skill** (`~/.grok/skills/pixelbrain` + project .grok equivalent): The teaching voice now has an authoritative microprocessor to cite instead of hand-wavy advice.
- **Item Foundry / ITEM-SPEC-v1**: Construction spec becomes a first-class optional section inside item specs for radial assets.

---

This PDR turns "use construction lines" from a teaching slogan into a first-class, wired, round-trippable, auditable microprocessor inside a named SketchAMP.

When implemented, every future shield, orb, lens, or circular focal element in the Scholomance PixelBrain corpus will be able to declare its geometry in one small, versioned object instead of hoping the artist's eye was perfect that day.
