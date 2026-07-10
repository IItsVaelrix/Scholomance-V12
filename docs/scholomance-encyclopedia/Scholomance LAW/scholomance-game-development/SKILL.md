---
name: scholomance-game-development
description: Use when designing, implementing, diagnosing, or validating Scholomance game assets, SCDL files, PixelBrain lattice packets, PB-SEM roles, Wand or DIV Wand proposals, deterministic animation, foundry routes, exports, shaders, or isometric 2.5D integration.
---

# Scholomance Game Development

## Core Principle

Choose one canonical authority, derive every output deterministically, and prove the result at the owning layer. The lattice is the asset; SCDL, approved packets, bytecode, and schemas are truth. PNG, SVG, canvas, DOM, shaders, and previews are derived consumers.

## Load Law and References

Before task work, read the active law stack in repository order:

1. `../SHARED_PREAMBLE.md`
2. `../VAELRIX_LAW.md`
3. `../SCHEMA_CONTRACT.md`
4. `../AGENTS.md`

Then read [references/source-map.md](references/source-map.md) and completely load only the canonical documents required for the selected route. If a referenced document conflicts with this skill, the canonical document wins.

## Select the Primary Route

| Request | Canonical authority |
|---|---|
| Pixel/lattice asset, tile, prop, or frame loop | SCDL source |
| Vector silhouette, stroke, glyph, or composite | Fairly Odd Wand proposal and evaluated `vectorPaths` |
| HUD, panel, card, or other game DOM surface | DIV Wand proposal |
| Procedural class-bound item | `ITEM-SPEC-v1` and Item Foundry route |
| Runtime visual effect | `PB-SHADER-v1` consuming an existing GeometryAMP mask |
| Geometry-changing pixel animation | SCDL v1.1 frame deltas |
| Transform, glow, flicker, opacity, or rotation animation | PixelBrain blueprint and precomputed bytecode channels |
| Isometric floor, cliff, or prop | SCDL plus the isometric-integrity gene |
| Broken asset, route, or export | Diagnostic-to-source backtrace |

For mixed requests, declare one primary authority and label every other representation as a derived consumer. Read [references/authoring-routes.md](references/authoring-routes.md) for route details and implementation limits.

## Execute the Workflow

1. **Inspect context.** Read neighboring sources, registries, schemas, exporters, render consumers, and focused tests.
2. **Declare authority.** State the authoritative source, owning contract, deterministic processor, derived outputs, and proof strategy.
3. **Author at the source.** Change SCDL, a bounded Wand/DIV Wand proposal, or an existing packet/spec/blueprint contract.
4. **Normalize semantics.** Resolve roles, parts, materials, effects, and provenance through PB-SEM. Downstream code consumes canonical roles.
5. **Compile or evaluate.** Use the existing compiler, foundry, bridge, or renderer path. Regenerate derived artifacts from the source.
6. **Read diagnostics.** Record `SCDL-*`, `PB-SEM-*`, `PB-ERR-v1`, route, pass, seam, selector, and required-output evidence.
7. **Validate deterministically.** Repeat the operation and compare canonical packets, IDs, manifests, bytecode, or serialized outputs.
8. **Report evidence.** Name the source changed, derived outputs, commands and observed results, known limits, and residual risk.

## Apply Conditional Branches

### Isometric and 2.5D Assets

Read `../SCDNA_Gene_Isometric_Asset_Integrity.md` completely before touching an asset.

1. Read the owning `.scdl`; record exact canvas, silhouette, anchor, part structure, and light direction.
2. Compile a clean RGBA baseline from SCDL.
3. Return any external enhancement to the exact SCDL canvas and apply an SCDL-derived alpha or silhouette mask.
4. Preserve transparent corners for floors, lower extensions for cliffs, and bottom-center registration for props.
5. Render base floors first and decor props afterward using native dimensions.
6. Verify dimensions, alpha includes zero, compositing, grid alignment, anchor placement, and NW light consistency in the live view.

Never place a rectangular 2D asset directly into projection math. The enhanced raster remains derived; SCDL remains production authority.

### Animation

If pixels or part geometry change, use dense declaration-ordered SCDL frame deltas. Let the compiler generate `SCDL-FRAME-LOOP-v1`; do not hand-author or patch it.

If only transforms or effects change, use blueprint directives and bytecode channels. Drive runtime values from absolute time and pre-generated cached patterns. Keep runtime work as O(1) lookup plus transform application.

Never use per-frame randomness, delta accumulation as canonical motion, runtime simulation as canonical geometry, or timestamp-seeded variation.

### Broken Assets and Exports

Trace backward:

```text
diagnostic
  -> route / compiler pass / seam
  -> missing or invalid required output
  -> owning SCDL op, role, material, profile, spec, grammar, or mask
  -> source correction
  -> deterministic recompile and retest
```

Repair the earliest authoritative defect. Do not inject fake cells in an exporter, invent geometry in a shader, or hide a missing required output behind a warning or fallback.

## Validate the Route

Use [references/validation-matrix.md](references/validation-matrix.md). Run the checks that correspond to the touched authority and record actual output. Required structure fails loudly; warnings are for optional polish.

For a complete source-to-runtime pattern, read [references/worked-example.md](references/worked-example.md).

## Common Mistakes

| Mistake | Correct authority |
|---|---|
| Treating a PNG or screenshot as canonical | SCDL or `PixelBrainAssetPacket` lattice coordinates |
| Dropping an AI-upscaled rectangle into an iso cell | SCDL canvas plus silhouette/alpha mask and correct anchor |
| Emitting raw SVG or imperative canvas as vector art | Bounded Wand proposal evaluated to role-tagged paths |
| Using DIV Wand to create visual asset geometry | Fairly Odd Wand or SCDL |
| Fuzzy role checks such as `torso || hull || mass` | PB-SEM `resolveRole()` and canonical role metadata |
| Letting a shader repair missing structure | Fix the GeometryAMP mask or upstream source |
| Editing generated PNG, JSON, or frame manifests | Edit source and recompile |
| Relying on reserved SCDL transforms/booleans/references | Use currently implemented geometry ops |
| Inventing `{ pixels, size }` or another parallel schema | Use the existing packet/export contract or request a schema change |
| Claiming success from unchecked boxes | Report commands and observed results |

## Completion Contract

Return these fields in order:

1. **Authority:** canonical source and owning contract.
2. **Source change:** files and semantic intent changed.
3. **Derived outputs:** regenerated packets, manifests, previews, or exports.
4. **Diagnostics:** exact errors/warnings resolved or remaining.
5. **Verification:** commands run and observed results, including determinism evidence.
6. **Implementation limits:** reserved or incomplete behaviors relevant to the task.
7. **Risk:** remaining visual, schema, performance, or integration risk.

Do not claim complete until the selected route's required evidence passes.
