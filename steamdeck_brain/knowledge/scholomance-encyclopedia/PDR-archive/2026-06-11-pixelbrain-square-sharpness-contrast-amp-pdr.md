# PDR: PixelBrain Square Sharpness Contrast AMP
## Render-Stage Local Contrast for Pixel-Scale Material Readability

**Status:** Implemented
**Classification:** PixelBrain + Rendering + AMP + Visual Fidelity
**Priority:** High
**Primary Goal:** Add a deterministic render-stage AMP that improves square-level readability after chromatic/material transmutation without mutating source asset packets.

---

# 1. Executive Summary

PixelBrain now preserves source pixels and can transmute material palettes, but icy-fire and other high-contrast materials can still read as soft square islands when the final canvas renderer draws each coordinate. The color meaning is correct, but the pixel-scale presentation lacks enough local contrast, silhouette recovery, and highlight/shadow separation.

This PDR introduces a Square Sharpness Contrast AMP that runs immediately before square drawing. It is neighbor-aware and coordinate-based. It does not operate as a CSS filter, does not mutate the source asset, and does not replace Chromatic Transmutation. Its job is to make already-derived render coordinates read crisply at square/pixel scale.

# 2. Problem Statement

The current pipeline has three strong pieces:

- source pixel/transcription fidelity
- material palette transmutation
- square coordinate rendering

The missing connective layer is local pixel readability. After a material transform, bright cores may survive and shadows may survive, but adjacent squares can still collapse visually because:

- local edge contrast is not reinforced
- silhouette boundaries are not darkened consistently
- white cores do not always receive cold midtone support
- isolated trace samples can look like floating artifacts
- final canvas drawing treats every coordinate as an equal square

# 3. Product Goal

Insert a deterministic render AMP at the square drawing boundary:

```text
Asset Packet
  -> Chromatic Transmutation / Render Packet
  -> Square Sharpness Contrast AMP
  -> Canvas Preview / PNG Export / Terminal Payload / Photonic Route
```

The AMP should inspect neighboring coordinate squares, classify edges/interiors/highlights/shadows, and adjust output colors/emphasis for final rendering.

# 4. Non-Goals

- Do not mutate source `PixelBrainAssetPacket` coordinates.
- Do not replace the material registry or Chromatic Transmutation AMP.
- Do not use canvas/CSS post-processing as the canonical implementation.
- Do not add nondeterministic sharpening.
- Do not require WebGL.
- Do not globally change non-PixelBrain rendering.

# 5. Design Principles

- Source truth remains `PixelBrainAssetPacket`.
- Visual truth remains derived render data.
- Square readability is a render-stage concern.
- Neighbor inspection must be deterministic.
- The same enhanced coordinates must feed preview and export.
- `source` material remains conservative and should not aggressively recolor.
- Material-specific edge anchors should be data-driven enough to extend later.

# 6. Feature Overview

New module:

```text
codex/core/pixelbrain/square-sharpness-contrast-amp.js
```

Primary exports:

- `enhanceSquaresForRender(coordinates, options)`
- `buildSquareSharpnessContrastPayload(input)`

Input:

- render coordinates
- material id
- canvas
- local contrast options

Output:

- enhanced coordinates
- diagnostics
- amp metadata

# 7. Architecture

The AMP runs after `derivePixelBrainRenderPacket()` in `PixelBrainPage.jsx`.

```text
pixelBrainRenderPacket.coordinates
  -> buildSquareSharpnessContrastPayload()
  -> squareRenderCoordinates
  -> canvas fillRect / PNG export / Godot helper / photonic route / terminal
```

It is deliberately not embedded inside `derivePixelBrainRenderPacket()` because render packets should represent material color resolution, while square sharpness is a final draw/readability stage.

# 8. Behavior

For each coordinate:

1. Build a coordinate occupancy map.
2. Inspect 4-neighbors and diagonal neighbors.
3. Compute luminance and neighbor luminance deltas.
4. Classify:
   - silhouette edge
   - high highlight
   - low shadow
   - midtone near highlight
   - isolated sample
   - interior
5. Apply deterministic color and emphasis changes:
   - preserve or slightly lift white cores
   - darken silhouette edges toward material shadow
   - push midtones near highlights toward frost/body anchors
   - slightly increase interior local contrast
   - reduce emphasis on isolated samples

# 9. Material Defaults

Initial material-aware anchors:

- `icy_fire`
- `void_ice`
- `shadow_fire`
- `holy_fire`
- `poison_flame`

Unknown materials fall back to generic luminance contrast.

# 10. UI / Product Impact

No new control is required for the first implementation. The AMP is active for rendered PixelBrain output with conservative defaults. It should improve crispness in the existing preview and exports without changing user workflow.

# 11. QA Requirements

- Bright white coordinates remain bright.
- Edge coordinates darken when neighboring occupancy is missing.
- Midtones near white highlights shift toward material support colors.
- Isolated samples reduce emphasis.
- Source coordinates are not mutated.
- Same input produces the same output.
- Preview/export use enhanced coordinates consistently.

# 12. Success Criteria

Icy-fire render output keeps white cores, gains cold edge definition, preserves the recognizable flame silhouette, and exports the same square-enhanced coordinate set shown in preview.

