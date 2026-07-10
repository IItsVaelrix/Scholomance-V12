# Authoring Routes

Use one primary route per task:

```text
authoritative source -> owning contract -> deterministic processor -> derived outputs -> verification
```

## Route Table

| Intent | Source | Processor | Derived output | Primary proof |
|---|---|---|---|---|
| Pixel asset, prop, tile, frame loop | `.scdl` | SCDL compiler passes | asset packets, PNG, SVG, Phaser, Aseprite, frame-loop manifest | `check`, `compile`, repeated packet/output comparison |
| Vector silhouette, stroke, glyph, character | Wand JSON proposal | schema validator and formula evaluator; character bridge when applicable | role-tagged `vectorPaths`, fills, raster input | proposal validation, bounded evaluation, non-empty paths |
| DOM HUD, panel, card, layout | DIV Wand tree | sandbox renderer and geometry verifier | measured DOM proposal for UI implementation | depth/payload limits, declared-versus-computed geometry |
| Procedural item | `ITEM-SPEC-v1` | Item Foundry class route and AMPs | construction, grammar, geometry, shader, asset/export packets | route diagnostics and every required output |
| Runtime visual effect | `PB-SHADER-v1` | shader bridge/runtime | Godot/Phaser/WebGL presentation | existing GeometryAMP mask, stable packet/hash |
| Pixel geometry animation | base SCDL plus frame deltas | SCDL frame expansion and exporters | per-frame packets, combined Aseprite, compiler manifest | dense indices, ordering laws, stable frame-0 identity |
| Transform/effect animation | blueprint and bytecode channels | compile-time AMP tables | O(1) runtime lookup values | absolute-time repeatability, no per-frame generation |
| Isometric floor, cliff, prop | `.scdl` plus gene constraints | SCDL compiler, alpha/silhouette mask, iso renderer | exact-size RGBA derived asset | alpha, anchor, projection, light, live grid |
| Broken output | earliest authoritative input | owning compiler/route/pass | regenerated derived output | diagnostic cleared and deterministic retest |

## SCDL Route

Prefer implemented paint operations: `cell`, `line`, `rect`, `circle`, `ellipse` outline, `ring`, `polygon`, `path`, `sphere`, and symmetry. Author in painter order. Use symmetry for structure and hand-place light-pinned highlights.

Run SemQuant after validation and before geometry lowering. Preserve `partId`, canonical role, material, `sourceOpId`, annotations, and provenance into the final packet. Treat unknown material fallback as an authoring failure even when SCDL reports it as a warning.

Frame 0 is the base. Frame blocks are full part replacements, anchored additions, or omissions. Use dense indices `1..N`. A replacement retains its painter slot and has no `after`; a new part requires a known `after` anchor.

## Wand and DIV Wand Boundary

Use Fairly Odd Wand for bounded vector geometry. Prefer `edge_trace` for silhouettes, `mathematical_stroke` for expressive strokes, curve dialects for controlled repetition, and `composite` for multi-part artifacts. Every composite child has a semantic role. The evaluated coordinate paths are the artifact; a raw SVG string is not the creative source.

Use DIV Wand for bounded UI structure. It produces a recursive DOM proposal with measured geometry. It does not author sprites, icons, vector silhouettes, or lattice assets.

## Foundry and Shader Boundary

The foundry route owns procedural structure. Declare required parts, materials, motifs, construction anchors, and shader masks before validation. A required selector with zero cells is fatal.

The shader consumes final masks and runtime uniforms. It may recolor, glow, distort presentation, or animate effects within its contract. It never creates missing canonical geometry.

## Isometric Route

Read the owning SCDL before any raster. Floors use exact diamond silhouettes with transparent corners. Cliffs retain geometry below the top diamond. Props use native dimensions and bottom-center registration. Draw floors first and decor afterward. Keep projection step sizes synchronized with the logical SCDL cell dimensions.

## Diagnosis Route

Read the structured diagnostic first. Identify route, compiler pass, seam, selector, and expected output. Inspect the upstream processor that owns it. Fix the `.scdl`, role, material, profile, item spec, shape grammar, or geometry mask, then regenerate all derived outputs.

If no canonical contract exists, stop and request a schema change. Do not create a one-off payload.
