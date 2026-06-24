# PDR: PixelBrain Color Intensity Rating Microprocessor
## Render-Stage Color Force Annotation for Coordinate-Based AMPs

**Status:** Draft
**Classification:** PixelBrain + Rendering + Microprocessors + Color Engine
**Priority:** High
**Primary Goal:** Add a deterministic render-stage microprocessor that rates color intensity per coordinate so downstream PixelBrain render AMPs can apply material, contrast, sharpening, glow, and export behavior proportionally.

---

# 1. Executive Summary

PixelBrain now has source fidelity, chromatic material transmutation, and a square-stage sharpness/contrast AMP. The next connective system is a color-intensity rating layer that annotates each render coordinate with a deterministic measure of visual force.

The rating should not mean "bright" only. It must catch any intense color condition:

- highly saturated colors
- near-white cores
- near-black anchors
- high local contrast pixels
- rare accent colors
- vivid chroma spikes inside otherwise muted images

Downstream render AMPs can then decide how strongly to modify each coordinate without guessing from raw hex alone.

# 2. Problem Statement

Current render-stage systems can inspect a coordinate's color and neighbors, but they do not share a canonical intensity signal. This causes repeated local heuristics and inconsistent behavior across:

- Chromatic Transmutation
- Square Sharpness Contrast AMP
- future glow/highlight passes
- future export palette hints
- material-specific render profiles

For example, pure white, deep black, electric cyan, hot orange, toxic green, and spectral magenta are all visually intense for different reasons. A brightness-only pass misses saturated midtones and black edge anchors. A saturation-only pass misses white-hot cores and cold shadows.

# 3. Product Goal

Add a microprocessor that annotates render coordinates with:

```js
colorIntensity: {
  rating: 0.0 - 1.0,
  band: 'muted' | 'normal' | 'vivid' | 'intense' | 'extreme',
  luma,
  saturation,
  chroma,
  localContrast,
  role
}
```

Pipeline target:

```text
PixelBrain Render Packet
  -> Color Intensity Rating Microprocessor
  -> Square Sharpness Contrast AMP
  -> Square Draw / Export
```

# 4. Non-Goals

- Do not mutate source asset packets.
- Do not replace material transmutation.
- Do not perform canvas/CSS post-processing.
- Do not use nondeterministic image analysis.
- Do not make "intense" synonymous with brightness.
- Do not hard-code behavior for only icy fire.

# 5. Design Principles

- Coordinate annotations are deterministic.
- Source color and render color remain inspectable.
- Intensity rating is a shared signal, not a final visual effect.
- Render AMPs decide how to consume the rating.
- Local contrast matters.
- Near-white and near-black are both intense when they function as material anchors.
- Saturated midtones can be intense even when luminance is moderate.

# 6. Feature Overview

New module:

```text
codex/core/pixelbrain/color-intensity-rating-microprocessor.js
```

Primary exports:

- `rateColorIntensity(hex, context)`
- `rateCoordinateColorIntensity(coord, context)`
- `annotateCoordinateColorIntensity(coordinates, options)`
- `buildColorIntensityPayload(input)`

Microprocessor id:

```text
pixelbrain.colorIntensity.rate
```

# 7. Rating Model

The rating should combine:

1. **Luminance intensity**
   - Near-white cores are intense.
   - Near-black shadows are intense when opaque and locally meaningful.

2. **Saturation intensity**
   - Highly saturated colors rate higher even at mid luminance.

3. **Chroma distance**
   - Distance from neutral gray at the same luminance.

4. **Local contrast**
   - Difference from neighboring coordinate luminance/chroma.

5. **Accent rarity**
   - Optional score based on how uncommon the color is in the coordinate set.

Initial formula:

```text
rating =
  max(
    whiteCoreScore,
    blackAnchorScore,
    saturationScore * 0.82,
    chromaScore * 0.78,
    localContrastScore * 0.72
  )
```

Then clamp to `[0, 1]`.

# 8. Bands

Suggested bands:

```text
0.00 - 0.24 muted
0.25 - 0.49 normal
0.50 - 0.69 vivid
0.70 - 0.89 intense
0.90 - 1.00 extreme
```

# 9. Roles

Suggested role labels:

- `white_core`
- `black_anchor`
- `hot_chroma`
- `cold_chroma`
- `rare_accent`
- `local_contrast`
- `neutral`

Roles are advisory. Downstream AMPs should branch on `rating` first and `role` second.

# 10. Integration Plan

1. Add core microprocessor module.
2. Register `pixelbrain.colorIntensity.rate` in `codex/core/microprocessors/index.js`.
3. Export adapter helpers through `src/lib/pixelbrain.adapter.js`.
4. Annotate `pixelBrainRenderPacket.coordinates` before Square Sharpness Contrast AMP in `PixelBrainPage.jsx`.
5. Update Square Sharpness Contrast AMP to consume `coord.colorIntensity.rating` where present.
6. Add tests for:
   - pure white as extreme
   - pure black as extreme/anchor
   - saturated midtone as intense
   - muted gray as muted/normal
   - local contrast boost
   - deterministic payload

# 11. QA Requirements

- White cores receive high ratings.
- Near-black anchors receive high ratings.
- Saturated midtones receive high ratings even when not bright.
- Muted colors stay low.
- Same input produces same annotation payload.
- Existing render coordinates preserve `x`, `y`, `snappedX`, `snappedY`, `color`, and source metadata.
- Square Sharpness Contrast AMP produces stronger treatment for high-rated coordinates than low-rated coordinates.

# 12. Success Criteria

PixelBrain render coordinates carry a reusable color-intensity signal, and downstream render AMPs can apply visual force proportionally without reimplementing color-intensity heuristics.

