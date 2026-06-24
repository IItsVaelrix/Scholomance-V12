# PDR: Chromatic Transmutation AMP
## Luminance-Aware Material Palette Stage for PixelBrain

**Status:** Implemented
**Classification:** Architectural + Rendering + PixelBrain + Behavioral
**Priority:** High
**Primary Goal:** Insert a deterministic material palette transform between VerseIR/NLP color intent and PixelBrain render/export so semantic recolors can become full material transmutations.

---

# 1. Executive Summary

PixelBrain can already emit deterministic coordinates, palettes, formulas, and bytecode artifacts. The observed gap is narrower: VerseIR/NLP color modification can shift hue, but it does not fully remap material behavior. Fire can become blue fire without becoming icy fire.

This PDR introduces a Chromatic Transmutation AMP that preserves geometry while remapping palette and coordinate colors through material-specific luminance anchors. The first material is `icy_fire`, designed to convert warm fire source colors into cold void shadows, ice-blue midtones, frost highlights, and white-blue cores.

# 2. Problem Statement

The existing path treats color intent mainly as hue/saturation movement. That preserves silhouette and shading, but it does not establish material-specific anchors for:

- white-hot frost highlights
- near-black cold shadow
- pale desaturated ice blues
- blue-white internal glow
- subtractive void edges
- rare accents such as glacial lavender, spectral teal, and moonlit gray

This makes an icy-fire request read as recolored fire rather than a transmuted cold material.

# 3. Product Goal

Add a reusable AMP that can sit after VerseIR/NLP modifier output and before PixelBrain render/export:

```text
VerseIR Modifier
  -> Chromatic Transmutation AMP
  -> PixelBrain Bytecode Palette / Render Payload
  -> Renderer / Export
```

# 4. Non-Goals

- Do not rewrite `color-byte-mapping.js`.
- Do not hard-code icy-fire behavior in the renderer.
- Do not mutate source coordinates or palettes destructively.
- Do not change global school palette behavior outside PixelBrain.
- Do not add nondeterministic palette generation.

# 5. Core Design Principles

- Geometry is preserved.
- Alpha/source identity is preserved when present.
- Palette remapping is material-keyed and deterministic.
- Luminance is the primary remap authority for white, black, and midtone anchors.
- Renderer and export consume the same derived payload.
- `source` material remains a no-op escape hatch.

# 6. Feature Overview

The AMP accepts source palettes and coordinates, resolves a material transform, and emits:

- `sourcePalette`
- `outputPalette`
- `sourceCoordinates`
- `outputCoordinates`
- `colorMap`
- material metadata

`icy_fire` uses fixed anchors from void to white core:

```text
void -> shadow -> deep -> body -> frost -> spectral -> whiteCore
```

# 7. Architecture

The AMP lives in the PixelBrain page boundary as a render/export transform stage:

```text
src/pages/PixelBrain/amps/chromaticTransmutationAmp.js
```

PixelBrain page state keeps original `coordinates` and `palettes`. A memoized render payload derives `renderCoordinates` and `renderPalettes` from the selected material. Canvas preview, PNG export, Godot artifact export, terminal preview, and photonic route consume render payload data.

# 8. Module Breakdown

- `MATERIAL_PALETTES` stores named material anchors and rules.
- `hexToRgb` parses `#RGB` and `#RRGGBB`.
- `luminanceFromRgb` computes deterministic WCAG-relative luminance.
- `transmutePaletteColor` maps a hex color to a material anchor.
- `transmutePixelBrainPalette` maps a palette array.
- `transmutePixelBrainCoordinates` maps coordinate `color` fields while preserving geometry.
- `buildChromaticTransmutationPayload` emits the complete stage payload.

# 9. ByteCode IR Design

The AMP does not replace PixelBrain bytecode palette authority. It is a named pre-finalization/render transform stage. Downstream artifact consumers receive the already-resolved output palette and output coordinate colors, plus metadata describing the material stage.

# 10. Implementation Phases

1. Add the AMP module with `source` and `icy_fire`.
2. Add PixelBrain material selection.
3. Wire preview, PNG export, Godot export, terminal payload, and photonic route to the derived payload.
4. Add deterministic unit coverage for luminance anchors, no-op source, coordinate preservation, and payload structure.
5. Add PIR with verification notes.

# 11. QA Requirements

- Flame silhouette remains recognizable.
- Warm source colors do not survive in `icy_fire` unless deliberately preserved later as source ghosts.
- Bright yellow/cream maps to white or blue-white.
- Dark red/brown maps to near-black cold shadow.
- Midtones map to frost/cyan/ice blue.
- Display and PNG/Godot export consume the same output colors.
- Same input + material produces identical output.
- Switching material to `source` returns original palette and coordinate behavior.

# 12. Success Criteria

The PixelBrain UI can switch from `SOURCE` to `ICY_FIRE`, render the transmuted material without changing source state, and export the same transmuted coordinate/palette payload that is displayed.
