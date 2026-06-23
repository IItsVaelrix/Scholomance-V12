# PDR: PixelBrain Render Fidelity Pipeline
## The Full Render Fidelity Stack

**Status:** Implemented
**Classification:** Behavioral render-stage AMPs / Pipeline Orchestration
**Priority:** High
**Primary Goal:** Establish a multi-stage render fidelity pipeline for PixelBrain that art-directs transmutated assets at the cell level.

---

# 1. Executive Summary

PixelBrain can already emit deterministic coordinates, palettes, formulas, and bytecode artifacts. The Chromatic Transmutation AMP remaps palette colors through material-specific luminance anchors. What remains is the render-stage intelligence that gives those coordinates depth, mass, direction, tonal balance, and final readability.

This PDR defines the **Render Fidelity Pipeline**: a fixed-order chain of six AMPs that transform a raw `PixelBrainRenderPacket` into art-directed, cell-level output consumed by preview, PNG export, Godot artifact export, and the Pixel Lotus layer.

# 2. Problem Statement

After material transmutation, rendered assets suffer from:
- Flat value hierarchy (cyan body touches cyan edge, no separation)
- White core bleeds too broadly without containment
- No directional understanding (upward flow, edge normals, taper)
- Tonal imbalance (too much shared hue, midtones too similar)
- No sense of mass or volume (reads as colored squares, not a living form)
- Final squares lack crisp readability at export resolution

# 3. Product Goal

Build a deterministic, fixed-order pipeline of six AMPs:
1. Color Intensity Rating — annotates each coordinate with intensity role
2. VectorAMP — detects directional structure
3. TonationAMP — sets global/local tonal balance
4. ShadowAMP — reinforces edge and pocket values
5. VolumeAMP — shapes form and mass
6. Square Sharpness Contrast — finalizes per-cell readability

# 4. Non-Goals

- Do not rewrite `color-byte-mapping.js` or the Chromatic Transmutation AMP.
- Do not replace the `PixelBrainRenderPacket` source truth.
- Do not add nondeterministic or random behavior to any AMP.
- Do not mutate source coordinates destructively.
- Do not change global school palette behavior outside PixelBrain.

# 5. Core Design Principles

- Geometry is preserved. Alpha/source identity is preserved when present.
- Each AMP owns exactly one question. No AMP becomes a bloated goblin king.
- Fixed execution order prevents AMPs from fighting each other.
- Every AMP emits diagnostics and changed-count metadata.
- Source material uses a conservative passthrough profile.
- Preview, PNG export, Godot export, and Pixel Lotus all consume the same final fidelity coordinates.

# 6. Feature Overview

The pipeline accepts a `PixelBrainRenderPacket` and a `materialId`, then produces:

```text
PixelBrainAssetPacket (source truth)
  -> PixelBrainRenderPacket (visual truth)
    -> Color Intensity Rating
    -> VectorAMP
    -> TonationAMP
    -> ShadowAMP
    -> VolumeAMP
    -> FlameTipAMP (top-region taper geometry)
    -> Square Sharpness Contrast
      -> Final Fidelity Coordinates
        -> Preview / PNG / JSON / Godot Helper / Pixel Lotus Layer
```

# 7. Architecture

All AMPs live in the PixelBrain core boundary:

```text
codex/core/pixelbrain/
  color-intensity-rating-microprocessor.js
  vector-amp.js
  tonation-amp.js
  shadow-amp.js
  volume-amp.js
  flame-tip-amp.js
  square-sharpness-contrast-amp.js
```

Orchestrator:
```text
codex/core/pixelbrain/render-fidelity-pipeline.js
```

# 8. Module Breakdown

See sections 1–6 below for per-AMP specifications.

# 9. ByteCode IR Design

The pipeline does not replace PixelBrain bytecode palette authority. It is a named pre-finalization/render transform stage. Downstream artifact consumers receive the already-resolved output coordinates, plus per-AMP payload metadata describing each stage.

# 10. Implementation Phases

1. Color Intensity Rating microprocessor (foundation)
2. VectorAMP (directional structure)
3. TonationAMP (tonal balance)
4. ShadowAMP (depth)
5. VolumeAMP (mass)
6. Square Sharpness Contrast (final readability)
7. Orchestrator (`runPixelBrainRenderFidelityPipeline`)
8. Wire preview, PNG export, Godot export, and Pixel Lotus to final fidelity coordinates
9. Deterministic unit coverage for each AMP and the full pipeline
10. PIR with verification notes

# 11. QA Requirements

- Source packet remains unchanged after pipeline execution.
- Render packet remains material truth.
- Final fidelity coordinates are separate from render packet coordinates.
- Same input produces same output (deterministic).
- Preview and PNG export use final fidelity coordinates.
- Each AMP emits diagnostics and reports changed count.
- `source` material uses conservative profile.
- `holy_fire`, `icy_fire`, `void_ice`, `shadow_fire`, and `poison_flame` have separate defaults.
- Turning off the fidelity pipeline returns original render packet output.
- No stage does nested full-array coordinate scans (performance).

# 12. Success Criteria

The PixelBrain UI can execute the full render fidelity pipeline on any material, render the art-directed output without changing source state, and export the same final fidelity coordinates that are displayed in preview.

---

# AMP Specifications

## ShadowAMP
**Classification**: Behavioral render-stage AMP

**What it does**
ShadowAMP is responsible for darkness with purpose.
Not global darkening. Not “make everything moodier.” Its job is to decide where darkness belongs.

It should reinforce:
- silhouette edges
- outer boundary cells
- recessed pockets
- low-value support cells
- shadow-side flame anatomy
- dark separation between core and outer body

**What it fixes**
The remaining issue in your flame is not that it lacks color. It lacks some value hierarchy.
ShadowAMP fixes this:
- cyan body touches cyan edge
- white core bleeds too broadly
- upper mass feels flat
- outer silhouette lacks bite

**What it should consume**
```javascript
{
  coordinates,
  materialId,
  intensityRatings,
  vectorField,
  canvas
}
```

**What it should output**
```javascript
{
  amp: 'pixelbrain.shadow-amp',
  version: 1,
  coordinates,
  diagnostics,
  metadata: {
    changedCount,
    edgeShadowCount,
    pocketShadowCount,
    preservedCoreCount
  }
}
```

**Core rule**
Never darken core, glow, or spark cells blindly.
ShadowAMP should protect important light.

## VolumeAMP
**Classification**: Behavioral render-stage AMP

**What it does**
VolumeAMP gives the sprite mass.

ShadowAMP says:
*where should darkness live?*

VolumeAMP says:
*how does this thing occupy space?*

For a flame, VolumeAMP should understand:
- core is internal energy
- body wraps around core
- edges contain shape
- upper flame tapers
- lower flame has weight
- sparks are separate particles
- highlights should not spread like paint

**What it fixes**
VolumeAMP prevents this problem:
*asset reads as colored squares instead of a living form*

For the flame, it should create clearer zones:
- white core
- pale support ring
- saturated body
- dark shell
- outer flicker

**What it should consume**
```javascript
{
  coordinates,
  materialId,
  intensityRatings,
  shadowPayload,
  vectorField,
  canvas
}
```

**What it should output**
```javascript
{
  amp: 'pixelbrain.volume-amp',
  version: 1,
  coordinates,
  diagnostics,
  metadata: {
    coreContainmentCount,
    bodySupportCount,
    volumeLiftCount,
    volumeDampenCount
  }
}
```

**Core rule**
VolumeAMP should not blur.
It should reshape color/value relationships at the cell level.

*Good:*
- core cell stays bright
- neighbor becomes glow
- outer neighbor becomes body
- boundary becomes edge

*Bad:*
- average everything until it becomes soup

## FlameTipAMP
**Classification**: Behavioral render-stage geometry AMP

**What it does**
FlameTipAMP is the top-region rule that gives PixelBrain a deterministic
notion of flame tip geometry and taper. It owns one question:
*how does the upper region of a flame narrow into a tip?*

It is a dedicated geometry AMP rather than a side-effect of VectorAMP or
VolumeAMP because taper is a distinct structural concern. VectorAMP answers
*which direction does this form move?* VolumeAMP answers *how does this
object hold mass?* FlameTipAMP answers *how does the upper region taper?*

**What it fixes**
- flame tips that look as wide as the body (no narrowing)
- upper-region cells that read as body cells (no taper envelope)
- tip edges that should recede but stay at full body color
- tip cores that lose their bright apex when mass is applied
- material-agnostic tip behavior (icy_fire and holy_fire tip the same way)

**What it consumes**
```javascript
{
  coordinates,
  materialId,
  intensityRatings,
  vectorField,
  canvas
}
```

**What it should output**
```javascript
{
  amp: 'pixelbrain.flame-tip-amp',
  version: 1,
  coordinates,
  taperField,
  diagnostics,
  metadata: {
    tipCoreCount,
    tipEdgeCount,
    taperShoulderCount,
    bodyCount,
    preservedHighlightCount,
    topRegionYMin,
    topRegionYMax,
    boundingBox,
    taperProfile,
    taperPower,
    baseTipRadius,
    averageTaperRatio
  }
}
```

**How it works**
1. Compute the flame's bounding box.
2. Define the top region as the upper 32% of the bounding box height.
3. For each row in the top region, derive the local centerline, local
   half-width, and an expected half-width that follows a power curve
   `expectedHalfWidth = localHalfWidth * (1 - tH)^taperPower +
   baseTipRadius * (1 - tH)` (default `taperPower` is the golden ratio).
4. Classify each top-region coordinate as one of:
   - `tip-core` — on the centerline inside the taper envelope
   - `taper-shoulder` — inside the envelope but off the centerline
   - `tip-edge` — outside the envelope, recedes toward the body
   - `body` — below the top region, unchanged
5. Apply material-aware mixing toward the `tipCore` / `taperShoulder` /
   `tipEdge` anchors. White cores and spark-drift cells get a softer mix
   so the highlight is never crushed.

**Material anchors**

| Material   | Profile  | Tip core  | Taper shoulder | Tip edge  | Power | Base tip radius |
|------------|----------|-----------|----------------|-----------|-------|-----------------|
| `icy_fire`    | narrow   | `#F8FCFF` | `#7DD3FC`      | `#0EA5E9` | 1.70  | 0.16 |
| `void_ice`    | narrow   | `#EEF2FF` | `#A5B4FC`      | `#3730A3` | 1.75  | 0.14 |
| `holy_fire`   | normal   | `#FFFBEB` | `#FDE68A`      | `#F59E0B` | 1.55  | 0.22 |
| `poison_flame`| normal   | `#F0FDF4` | `#86EFAC`      | `#22C55E` | 1.45  | 0.24 |
| `shadow_fire` | wide     | `#FAF5FF` | `#A78BFA`      | `#7C3AED` | 1.35  | 0.28 |
| `source`      | passthrough (conservative, never crushes darks) | | | |       |       |

**Core rule**
FlameTipAMP narrows the visual envelope of the tip without destroying
light. White cores are protected via an apex-core luminance guard. The
amp is conservative for `source` material and refuses to crush cells
below luminance 0.06. Taper is a structural question, never a recolor
question.

**Execution order**
FlameTipAMP runs after `VolumeAMP` and before `Square Sharpness Contrast`.
It consumes the vector field produced by `VectorAMP` so spark-drift
cells get a dampened tip-core mix.

## TonationAMP
**Classification**: Behavioral render-stage palette/value AMP

**What it does**
TonationAMP controls the overall tonal language of the rendered asset.
It decides whether the asset is:
- too flat
- too washed out
- too saturated
- too dark
- too monochrome
- too far from the material identity
- not harmonized enough with its palette anchors

This is not the same as material transmutation.
Material transmutation says:
*source flame becomes holy_fire*

TonationAMP says:
*this holy_fire render needs better gold/cream/orange balance*

**What it fixes**
For your current outputs, TonationAMP helps prevent:
- too much shared cyan
- too much shared orange
- white core too large
- midtones too similar
- shadows not harmonized with material

**What it should consume**
```javascript
{
  coordinates,
  materialId,
  materialAnchors,
  intensitySummary,
  paletteAuthority,
  canvas
}
```

**What it should output**
```javascript
{
  amp: 'pixelbrain.tonation-amp',
  version: 1,
  coordinates,
  diagnostics,
  metadata: {
    averageLuminanceBefore,
    averageLuminanceAfter,
    averageSaturationBefore,
    averageSaturationAfter,
    tonalBalance
  }
}
```

**Core rule**
TonationAMP should act before ShadowAMP and VolumeAMP because it sets the color/value baseline.
If ShadowAMP runs first and TonationAMP runs after, TonationAMP may accidentally weaken your carefully placed shadows.

## VectorAMP
**Classification**: Analysis microprocessor / render-stage directional AMP

**What it does**
VectorAMP gives PixelBrain a sense of directional structure.

For a flame, it should detect:
- upward flow
- side flicker direction
- edge normals
- body centerline
- taper direction
- spark drift
- silhouette vectors

This is the stage that lets PixelBrain understand:
- this is not just a blob
- this shape is moving upward
- this edge faces outward
- this spark belongs to the flame field
- this tip should taper

**What it fixes**
VectorAMP helps prevent:
- uniform square clusters
- wrong edge emphasis
- bad highlight spread
- flat directionless bodies
- spark artifacts being treated like body cells

**What it should consume**
```javascript
{
  coordinates,
  canvas,
  intensityRatings
}
```

**What it should output**
```javascript
{
  amp: 'pixelbrain.vector-amp',
  version: 1,
  vectorField,
  diagnostics,
  metadata: {
    dominantDirection,
    edgeNormalCount,
    centerlineConfidence,
    flowConfidence
  }
}
```

Example vector field entry:
```javascript
{
  x,
  y,
  direction: { x: 0.1, y: -0.9 },
  normal: { x: 1, y: 0 },
  role: 'edge-flow',
  confidence: 0.82
}
```

**Core rule**
VectorAMP should mostly not recolor.
It should inform the later AMPs.
Think of it as the compass, not the brush.

# The Full Render Fidelity Stack

## Final architecture

**Source truth:**
`PixelBrainAssetPacket`

**Visual truth:**
`PixelBrainRenderPacket`

**Render intelligence:**
1. Color Intensity Rating
2. VectorAMP
3. TonationAMP
4. ShadowAMP
5. VolumeAMP
6. Square Sharpness Contrast AMP

**Target truth:**
Preview / PNG / JSON / Godot Helper / Pixel Lotus Layer

## Why this is powerful

Each AMP owns one question:

| AMP | Question |
|---|---|
| Color Intensity Rating | What role does this color/cell play? |
| VectorAMP | Which direction does this form move? |
| TonationAMP | Is the palette/value balance correct? |
| ShadowAMP | Where should darkness create structure? |
| VolumeAMP | How does the object hold mass? |
| Square Sharpness | Is every final square readable? |

That is clean.
No AMP has to become a bloated goblin king.

## Best implementation order

1. **Color Intensity Rating**
   Already in motion. This is the foundation.

2. **VectorAMP**
   Do this next if you want smarter structural understanding.
   VectorAMP gives ShadowAMP and VolumeAMP better context.

3. **TonationAMP**
   Set global and local tonal balance before shadow/depth work.

4. **ShadowAMP**
   Reinforce edge and pocket values.

5. **VolumeAMP**
   Use the now-clean tone/shadow data to shape form.

6. **Square Sharpness**
   Final pass.

## Important correction to execution order

The execution order must be:
1. VectorAMP
2. TonationAMP
3. ShadowAMP
4. VolumeAMP

With Color Intensity Rating before all of them and Square Sharpness after all of them.

*Why?*
Because:
- Vector tells direction.
- Tonation sets balance.
- Shadow sets depth.
- Volume sets mass.
- Sharpness finalizes readability.

That order avoids AMPs fighting each other.

# Module Map (Implemented)

```text
codex/core/pixelbrain/
  color-intensity-rating-microprocessor.js
  vector-amp.js
  tonation-amp.js
  shadow-amp.js
  volume-amp.js
  square-sharpness-contrast-amp.js
  render-fidelity-pipeline.js
```

**Orchestrator:**
`codex/core/pixelbrain/render-fidelity-pipeline.js`

**Export:**
```javascript
runPixelBrainRenderFidelityPipeline({
  renderPacket,
  materialId,
  canvas,
  options
})
```

## Implemented orchestrator

```javascript
export function runPixelBrainRenderFidelityPipeline(input, options = {}) {
  // 1. Color Intensity Rating
  const intensity = buildColorIntensityPayload({
    coordinates: input.renderPacket.coordinates,
    options: {},
    intent: 'annotate_intensity'
  });

  // 2. VectorAMP
  const vector = buildVectorAmpPayload({
    coordinates: intensity.outputCoordinates,
    intensityRatings: intensity,
    canvas: input.canvas,
  });

  // 3. TonationAMP
  const tonation = buildTonationAmpPayload({
    coordinates: intensity.outputCoordinates,
    materialId: input.materialId,
    intensitySummary: intensity.diagnostics,
    canvas: input.canvas,
  });

  // 4. ShadowAMP
  const shadow = buildShadowAmpPayload({
    coordinates: tonation.coordinates,
    materialId: input.materialId,
    intensityRatings: intensity,
    vectorField: vector.vectorField,
    canvas: input.canvas,
  });

  // 5. VolumeAMP
  const volume = buildVolumeAmpPayload({
    coordinates: shadow.coordinates,
    materialId: input.materialId,
    intensityRatings: intensity,
    vectorField: vector.vectorField,
    canvas: input.canvas,
  });

  // 6. Square Sharpness Contrast
  const sharpness = buildSquareSharpnessContrastPayload({
    coordinates: volume.coordinates,
    material: input.materialId,
    canvas: input.canvas,
    options: options.sharpness || {},
    intent: 'enhance_square_render_readability'
  });

  return {
    ok: true,
    coordinates: sharpness.outputCoordinates,
    payloads: {
      intensity,
      vector,
      tonation,
      shadow,
      volume,
      sharpness,
    },
  };
}
```

# Regression risks

| Risk | Mitigation |
|---|---|
| AMPs over-process asset | Add per-material conservative defaults |
| Source mode stops looking original | Source profile must be minimal |
| Preview/export mismatch | Both consume final fidelity coordinates |
| Performance gets heavy | Coordinate map once per stage, no O(n²) scans |
| AMPs fight each other | Fixed execution order |
| Debugging becomes harder | Keep payload metadata per AMP |
| Visuals become too stylized | Add intensity caps and material profiles |

# QA checklist

- [ ] Source packet remains unchanged.
- [ ] Render packet remains material truth.
- [ ] Final fidelity coordinates are separate from render packet coordinates.
- [ ] Same input produces same output.
- [ ] Preview and PNG export use final fidelity coordinates.
- [ ] Each AMP emits diagnostics.
- [ ] Each AMP reports changed count.
- [ ] `source` material uses conservative profile.
- [ ] `holy_fire`, `icy_fire`, `void_ice`, `shadow_fire`, and `poison_flame` have separate defaults.
- [ ] Turning off the fidelity pipeline returns original render packet output.
- [ ] No stage does nested full-array coordinate scans.

# Final Verdict

All six AMPs and the orchestrator are implemented:
- Color Intensity Rating = role annotation (foundation)
- VectorAMP = direction
- TonationAMP = tonal balance
- ShadowAMP = depth
- VolumeAMP = mass
- Square Sharpness Contrast = final readability

Together they form the **PixelBrain Render Fidelity Pipeline**.
PixelBrain now art-directs assets at the cell level through a deterministic, fixed-order stage chain.
