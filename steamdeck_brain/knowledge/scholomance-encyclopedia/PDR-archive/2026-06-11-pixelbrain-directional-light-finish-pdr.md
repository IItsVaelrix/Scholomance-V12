# PDR: PixelBrain Directional Light & Pixel-Art Finish Suite
## Closing the Gap Between Procedural Output and Professional Pixel Art

**Status:** Draft
**Classification:** PixelBrain + Rendering + AMP + Visual Fidelity
**Priority:** High
**Primary Goal:** Replace the radial distance-transform shading model with directional-light shading, and add the three finish passes professional pixel art relies on — selective outline (selout), anti-aliasing, and gem faceting — so generated assets stop reading as machine-made.

---

# 1. Executive Summary

The HD scimitar proved the generation pipeline end-to-end, and an honest art review against industry standard identified exactly why its output reads as "solid programmer art" rather than professional pixel art. The defects are not cosmetic accidents; each one is structural in the current engine:

- **Pillow shading.** `sketchToSilhouette` quantizes distance-from-edge into brightness slots, producing concentric luminance rings — darkest rim, brightest core, identical in every direction. This is the canonical beginner mistake. It is baked into every asset the engine produces.
- **Flat outlines.** Outline cells take one uniform color. Professional sprites modulate the outline around the form (selout): lighter where light strikes, darker in shadow.
- **Raw stair-steps.** Curved silhouettes show unsoftened jaggies; pros place intermediate-color pixels at curve steps (manual anti-aliasing).
- **Radial-ramp gems.** The diamond bezel renders as a smooth white blob; a cut stone needs hard planar facets and sparkle pixels.
- **No detail budget.** Motif + glow + body fill compete inside interiors as narrow as 3px, so the "black blade" reads as a blue-white energy sword in its upper half.

This PDR introduces a finish suite of deterministic, coordinate-based AMPs — a directional shading stage plus selout, AA, faceting, and detail-budget passes — that slots into the existing chain without touching asset contracts. The single highest-leverage change is the light model; everything else compounds on it.

# 2. Problem Statement

The shading authority today is the distance transform in `sketch-amp.js`: `slot = quantize(distanceToEdge / maxDistance)`. Distance to edge is a *depth* signal, not a *light* signal. Using it as luminance means:

1. Brightness is radially symmetric — no part of any sprite can be lit from a direction.
2. A blade cannot have a lit flat and a shadowed flat meeting at a specular edge — the defining read of rendered metal.
3. The Square Sharpness Contrast AMP sharpens *local* contrast downstream but cannot invent a light direction that was never computed.
4. Gems and bezels inherit the same radial ramp, so faceted materials render as soft orbs.

Compounding this, the fill stage emits exactly one color per cell with no transitional hues at silhouette steps, and outline cells are colored by a single material anchor regardless of orientation. Each gap individually is visible; together they are the unambiguous signature of procedural output.

# 3. Product Goal

Insert a light-aware shading stage and finish passes between silhouette composition and final render:

```text
occupancy (+ per-part map)
  -> distance transform              (existing — kept as the DEPTH channel)
  -> normal estimation               (NEW: gradient of the distance field)
  -> directional shading stage       (NEW: depth + normal + light vector -> slot)
  -> region/template fill            (existing ramps, now lit directionally)
  -> selout AMP                      (NEW: outline modulated by light orientation)
  -> anti-aliasing AMP               (NEW: intermediate hues at silhouette steps)
  -> facet AMP                       (NEW: planar shading for gem-class parts)
  -> square sharpness AMP            (existing — unchanged)
  -> packets / exports               (existing — unchanged)
```

The distance field is not discarded — its gradient is precisely the inward surface normal approximation the light model needs, so the new stage is a cheap, deterministic derivation from data the engine already computes.

# 4. Non-Goals

- No changes to asset/render/export packet contracts, exporters, or shader stack.
- No per-pixel hand-editing workflow or paint UI.
- No global illumination, multiple lights, or normal-map export in v1 — one directional key light with a fixed ambient floor.
- No retroactive mutation of archived assets; regeneration is opt-in per asset.
- No replacement of the Square Sharpness Contrast AMP — it remains the final readability pass.
- Item Foundry geometry/spec work is out of scope here (covered by the Item Foundry PDR); this suite is the shading/finish layer beneath it and must work for today's bespoke scripts too.

# 5. Design Principles

- **Depth and light are separate channels.** Distance = form thickness; normal·light = illumination. Conflating them was the root defect.
- **Deterministic, coordinate-based, contract-shaped.** Every pass is an AMP: frozen payload, input hash, diagnostics, no `Math.random` (Anti-Chaos gauntlet applies).
- **The material registry stays the only color authority.** Lit/shadow/specular colors are registry anchors or documented two-anchor blends; AA intermediates are blends of the two adjacent cell colors, never new hues.
- **Pixel-art AA, not blur.** AA recolors existing silhouette-adjacent cells; it never adds partial alpha or new geometry.
- **Finish passes must be skippable.** Each AMP is independently toggleable so regressions can be bisected and styles compared.

# 6. Feature Overview

New modules under `codex/core/pixelbrain/`:

| Module | Responsibility |
|--------|----------------|
| `normal-estimation.js` | Central-difference gradient of the existing distance field → per-cell 2D normal (unit vector pointing inward-to-outward). |
| `directional-shading-amp.js` | `slot = f(depth, normal · L, ambient)` with light vector `L` from options (default top-left, the genre convention). Emits lit-side, shadow-side, core, and specular-edge classifications alongside slots. |
| `selout-amp.js` | Outline cells re-anchored by orientation: `normal · L > threshold` → lighter anchor (e.g. `body`), opposed → darker anchor (e.g. `void`), neutral → declared outline anchor. |
| `pixel-aa-amp.js` | Detects 1-cell silhouette stair-steps along curves; recolors the inner corner cell with a 50/50 blend of its two neighbors' colors. Outline closure is never broken (AA acts inside the rim). |
| `facet-amp.js` | For parts flagged `shading: 'faceted'` (gems, bezels): partitions the part into 3–5 planar regions via deterministic seeded splits, shades each plane flat by its synthetic normal, places 1–2 sparkle cells at the brightest plane junction. |
| `detail-budget.js` | Width-aware motif policy consumed by generators: interior width ≥ 7 → motif + glow; 4–6 → motif only (no glow shell); ≤ 3 → single-pixel accents. Fixes the "energy sword" overcrowding. |

# 7. Architecture

The directional shading stage replaces the *slot assignment* inside silhouette processing while keeping `sketchToSilhouette`'s occupancy, symmetry, and distance-transform machinery. Compatibility is explicit:

- `sketchToSilhouette(occupied, dims, { bands, symmetry })` — unchanged behavior, radial shading (legacy mode).
- `sketchToSilhouette(occupied, dims, { bands, symmetry, light: { angle, ambient } })` — new directional mode.

Selout, AA, and facet passes run after fill and before the Square Sharpness Contrast AMP, in that order (selout fixes the rim, AA blends against the fixed rim, facets override interior shading for gem parts, sharpness then does final local contrast). Each is a standalone payload-shaped AMP consumable by both the bespoke scripts and, later, the Item Foundry orchestrator.

# 8. Behavior

**Directional shading.** For each interior cell: `illum = ambient + (1 - ambient) * max(0, n · L)`, then `slot = quantize(illum * depthWeight(depth))`. Cells whose normal opposes `L` fall to shadow slots even near the core — this is what breaks the pillow. Cells on the silhouette whose normal aligns with `L` within a tight cone and whose part is metal-category are classified `specular-edge` and pinned to a high anchor — the bright line along a blade's cutting edge.

**Selout.** Only rim cells (missing 4-neighbor — the structural outline authority) are eligible. The declared outline material is kept; only the *anchor* shifts by orientation, so a sapphire outline stays sapphire — brighter sapphire in light, near-void sapphire in shadow.

**Anti-aliasing.** A stair-step is a rim cell whose rim continues with a 1-cell lateral offset. The step's inner-corner neighbor takes the blend. Straight runs and intentional corners (guard tips, pommel points, motif cells) are exempt; the pass must never soften a deliberate point.

**Faceting.** Facet boundaries derive from `hashString(partId, seed)` so the same spec always cuts the same stone. Each facet is shaded flat (single anchor per facet by its plane's `n · L`), giving the hard tonal breaks cut stones need; the radial ramp is fully suppressed for faceted parts.

# 9. Migration & Calibration

- The scimitar and sword regenerate in directional mode as the calibration pair; before/after PNGs are reviewed side by side. The current outputs are archived as the legacy baseline (this is a deliberate visual change — golden images are *replaced*, with the diff documented in the PIR).
- Legacy radial mode remains the default until calibration review approves the new defaults; generators opt in via the `light` option.
- The Item Foundry PDR's region-fill AMP consumes the shading classifications (lit/shadow/specular) when both land; neither PDR blocks the other — this suite works under the existing bespoke scripts.

# 10. QA Requirements

- **Anti-pillow property test:** in directional mode, for a convex test silhouette, mean luminance of the lit half strictly exceeds the shadow half along the light axis, and luminance is *not* radially monotonic (the inverse of today's behavior, which the radial mode's tests pin).
- **Determinism:** identical inputs (including light options and seed) → byte-identical outputs across runs; Anti-Chaos scanners stay green.
- **Outline integrity:** selout and AA never add or remove rim cells; rim remains closed (reuse the Foundry PDR's closure checker).
- **Registry compliance:** every emitted color is a registry anchor or a declared blend of exactly two existing cell colors (AA) — no free hues.
- **Specular line:** metal-category blade fixture produces a connected specular run ≥ 60% of blade length on the lit edge.
- **Facet hard edges:** adjacent facets on a gem fixture differ by ≥ 2 anchor steps; no facet renders a smooth ramp.
- **Legacy mode untouched:** all existing sketch-amp and sharpness-amp tests pass unchanged with `light` absent.

# 11. Phases

| Phase | Deliverable | Acceptance |
|-------|-------------|------------|
| 1 | `normal-estimation.js` + directional mode in `sketch-amp` | anti-pillow property test green; legacy tests untouched |
| 2 | `selout-amp.js` | scimitar outline shows orientation-shifted sapphire; closure test green |
| 3 | `pixel-aa-amp.js` | blade curve stair-steps blended; deliberate points exempt; fixture review |
| 4 | `facet-amp.js` | diamond bezel renders faceted with sparkle; hard-edge test green |
| 5 | `detail-budget.js` + scimitar/sword regeneration | upper blade reads black with 1px lightning accents; side-by-side PIR approved |

Phase 1 is the kill-question: if gradient-derived normals on 3–7px-wide forms are too noisy to produce a stable lit/shadow split (a real risk at this scale — the smoothing window may exceed thin parts), the fallback design is per-part analytic normals from the profile functions (the composer knows each part's centerline and half-width, so the surface direction is computable exactly). The fallback is strictly more work but cannot fail for parametric parts; the gradient approach is attempted first because it also covers hand-sketched silhouettes.

# 12. Success Criteria

The regenerated scimitar, viewed beside the current one, shows: a lit flat and a shadowed flat meeting at a bright specular edge instead of a center glow; a sapphire outline that turns with the light; smoothed curve steps with no blur; a faceted diamond bezel with sparkle instead of a white blob; and a predominantly black upper blade with single-pixel lightning accents. A pixel artist reviewing the pair should identify the new output as hand-finished-adjacent rather than procedural — and a non-artist should simply prefer it without being told why.
