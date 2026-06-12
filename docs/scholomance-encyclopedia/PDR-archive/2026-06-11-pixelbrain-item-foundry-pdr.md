# PDR: PixelBrain Item Foundry
## Universal Weapon / Amulet / Ring Generation from Declarative Item Specs

**Status:** Draft
**Classification:** Architectural + PixelBrain + Procedural Generation + Asset Pipeline
**Priority:** High
**Primary Goal:** Evolve the PixelBrain generation pipeline from bespoke per-item scripts into a declarative Item Foundry that turns a structured item spec — any weapon, amulet, or ring — into a complete deterministic artifact bundle (asset packet, PNG, `.pbrain`, `.gdshader`, Phaser pipeline, diagnostics) with zero new engine code per item.

---

# 1. Executive Summary

The sword and scimitar generators proved that the PixelBrain primitives compose: `sketchToSilhouette` auto-shades any occupancy set, the material registry (now carrying flames, gemstones, and metals) is a single color authority, the Square Sharpness Contrast AMP derives its edge anchors from that registry, and the shader stack (PB-SHADER-v1 packet → uniform registry → Godot/Phaser/WebGL exporters) attaches per-asset effects with verifiable hashes.

What did **not** compose is everything above those primitives. Each item required a hand-written script: silhouette profiles as bespoke JS functions, region boundaries as magic y-ranges, outline detection re-implemented per script, color ramps as hex literals, the lightning engraving as one-off Bresenham walks, and the effect shader as hand-authored GLSL with the blade curve duplicated into UV space by hand.

This PDR introduces the **Item Foundry**: a part-based silhouette grammar, a region-fill AMP, a motif engraver, and a shader templater, all driven by a normalized `ITEM-SPEC-v1` contract. One call — `forgeItemAsset(spec)` — produces the full artifact bundle for any item expressible as parts + materials + motifs.

# 2. Problem Statement

Building the HD scimitar ("engraved with lightning, diamond bezel, black blade, sapphire outline") surfaced five concrete gaps. Each was solved inside the script; none of the solutions lives in the engine:

1. **Silhouette authoring is bespoke.** `bladeHalfWidth(y)`, `BEZEL_PROFILE`, `POMMEL_PROFILE`, and the curve function `bladeCenterX(y)` are per-item JS. A dagger, axe, ring, or amulet means writing them again. The geometry/fill separation the template-fill bridge established stops at the silhouette boundary.
2. **Region identity is positional, not structural.** `regionOf(y)` maps y-ranges to "blade/bezel/grip/pommel". The composer knows which cells belong to which part when it places them — that knowledge is thrown away and reconstructed from coordinates.
3. **Outline detection has a known trap that lives in a script.** The distance transform in `sketch-amp.js` never produces slot 0 at item-scale canvases (minimum interior distance is 1, so the rim quantizes to slot ≥ 1). The scimitar script works around this with explicit 4-neighbor occupancy checks. Every future generator would silently lose its outline unless the author rediscovers this.
4. **Fill ramps are hex literals.** `BLACK_BLADE_RAMP`, `DIAMOND_RAMP`, `GRIP_WRAP` etc. are authored colors, even though the material registry now holds `black_steel`, `diamond`, and `sapphire` with full seven-anchor ramps. Per-region slot ranges also had to be normalized per region (a thin grip never reaches the slots a broad bezel reaches) — again solved locally, not in the engine.
5. **Motifs and effect shaders are one-offs.** The lightning bolt is a hand-seeded zigzag with a fork; the energize shader duplicates the blade centerline math into GLSL by hand, with asset constants string-interpolated into the source.

The cost is linear in items: every new weapon/amulet/ring is a new ~400-line script and a new opportunity to reintroduce solved bugs.

# 3. Product Goal

One deterministic engine entry point:

```text
ITEM-SPEC-v1
  -> silhouette composer        (parts -> occupancy + region map)
  -> sketchToSilhouette          (existing: distance-transform shading slots)
  -> motif engraver              (motif primitives rasterized into part interiors)
  -> region fill AMP             (part + slot + outline -> registry material ramps)
  -> square sharpness AMP        (existing: HD edge pass, registry anchors)
  -> asset packet + render packet (existing contracts)
  -> item effect shader          (motif -> PB-SHADER-v1 packet, hashed)
  -> exports                     (PNG, .pbrain, .gdshader, Phaser pipeline, diagnostics)
```

The spec — not a script — is the unit of authorship. Adding a new item is data; adding a new *kind* of geometry or motif is one engine-side primitive that every future item inherits.

# 4. Non-Goals

- No ML/diffusion image generation. The Foundry is parametric and deterministic.
- No changes to the asset/render/export packet contracts or to the Godot artifact schema.
- No prose-first authoring in v1. A natural-language layer (mapping "sapphire outline" → spec fields via the registry's category index and `interpretInstruction`) is a defined v2 extension, not the foundation — the structured spec is canonical and prose parsing must compile *to* it.
- No runtime engine (Phaser/Godot) changes; consumers keep reading the same artifacts.
- No replacement of the wand pipeline (`wand-fill-bridge`, `wandFillValidation`). Wands keep their authority; convergence is evaluated only after the Foundry is proven on weapons/amulets/rings.
- No animation or multi-frame sprites in v1.

# 5. Design Principles

- **Geometry/fill separation extends upward.** Parts own geometry; materials own color; motifs own engraving; shaders own motion. No layer reaches into another's authority.
- **The material registry is the only color authority.** Region fills reference material ids and anchor roles, never hex literals. The registry's category field (`gemstone`/`metal`/`flame`) is the resolution namespace for spec nouns.
- **Region identity is carried, not inferred.** The composer stamps every cell with its part id at placement time. `regionOf(y)` heuristics are forbidden.
- **Outline is structural, not luminance-derived.** Rim membership = missing 4-neighbor, computed once in the engine (the slot-0 trap is documented and tested, not rediscovered).
- **Determinism is law.** Same spec → byte-identical artifacts and stable FNV-1a hashes. No `Math.random` (Anti-Chaos gauntlet enforces this); any stochastic look (bolt jitter) derives from `hashString` of cell coordinates and the spec seed.
- **Connectivity is an invariant, not luck.** The scimitar curve stayed 4-connected because its slope was kept under 1 cell/row by hand. The composer must enforce this (or bridge gaps) for arbitrary curves.

# 6. Feature Overview

New modules under the PixelBrain Cell Wall (`codex/core/pixelbrain/`):

| Module | Responsibility |
|--------|----------------|
| `item-spec.js` | `ITEM-SPEC-v1` contract: normalize, validate, hash. Spec nouns resolve against the material registry by category. |
| `part-profile-library.js` | Parametric part archetypes: `blade` (straight/curved/axe-head), `guard`, `grip`, `pommel`, `band`, `setting`, `gem`, `frame`, `chain`, `loop`. Each is `(params) -> { centerline(t), halfWidth(t), span }`. |
| `silhouette-composer.js` | Parts → occupancy set + per-cell part map. Enforces 4-connectivity, canvas bounds, inter-part attachment (each part declares its anchor on its parent). |
| `motif-engraver.js` | Motif primitives (`bolt`, `rune-row`, `vine`, `wave`, `facet-lines`) rasterized into a target part's interior cells; seeded jitter via `hashString`. |
| `region-fill-amp.js` | `(cell, part, slot, isOutline, spec) -> color` from registry ramps. Owns per-part slot-range normalization and outline color assignment. Payload-shaped like the other AMPs (input hash, diagnostics, frozen output). |
| `item-effect-shader.js` | Generates a `pbMain` fragment from the spec's motif + part geometry (centerline exported to UV space mechanically, not by hand), packs PB-SHADER-v1, validates, hashes. |
| `item-foundry.js` | Orchestrator: `forgeItemAsset(spec)` runs the full chain and returns the artifact bundle. Registers the pixelbrain uniform provider and bakes the baseline uniform snapshot. |

# 7. The ITEM-SPEC-v1 Contract

The scimitar, expressed as the spec the Foundry must accept:

```json
{
  "contract": "ITEM-SPEC-v1",
  "id": "scimitar.hd.v1",
  "class": "weapon",
  "archetype": "scimitar",
  "canvas": { "width": 48, "height": 96 },
  "seed": 1337,
  "bytecode": "VW-VOID-INEXPLICABLE-TRANSCENDENT",
  "parts": [
    { "id": "blade",  "profile": "blade.curved", "params": { "sweep": 0.54, "belly": 4, "span": [0, 59] },
      "fill": { "material": "black_steel" }, "outline": { "material": "sapphire", "anchor": "body" },
      "motif": { "kind": "bolt", "fork": true, "core": { "material": "diamond", "anchor": "whiteCore" },
                 "glow": { "material": "sapphire", "anchor": "deep" } } },
    { "id": "bezel",  "profile": "guard.marquise", "attach": { "parent": "blade", "at": "base" },
      "fill": { "material": "diamond" } },
    { "id": "grip",   "profile": "grip.wrapped", "attach": { "parent": "bezel", "at": "base" },
      "fill": { "material": "black_steel" }, "wrap": { "material": "sapphire", "anchor": "deep", "period": 3 } },
    { "id": "pommel", "profile": "pommel.gem", "attach": { "parent": "grip", "at": "base" },
      "fill": { "material": "sapphire" }, "outline": { "material": "diamond", "anchor": "spectral" } }
  ],
  "shader": { "kind": "motif-energize", "resonanceDefault": 0.85 }
}
```

Item classes set layout defaults the parts inherit:

| Class | Canvas preset | Layout | Typical parts |
|-------|---------------|--------|---------------|
| `weapon` | 48×96 | vertical spine, parts stacked tip→pommel | blade/head, guard, grip, pommel |
| `ring` | 48×48 | radial, band centerline is a circle arc | band, setting, gem |
| `amulet` | 64×80 | hanging, chain above frame | chain, loop, frame, gem |

Validation rejects: unknown profiles, unresolvable material ids, parts whose attachment graph is not a tree rooted at the class's primary part, occupancy escaping canvas, and disconnected silhouettes.

# 8. Architecture

```text
forgeItemAsset(spec)
  item-spec.js          normalize + validate + hash(spec)
  silhouette-composer   parts -> { occupied[], partOf: Map<cellKey, partId> }
  sketch-amp (existing) occupied -> shading slots (bands from spec, default 6)
  motif-engraver        motif cells per part, interior-only (outline never broken)
  region-fill-amp       partOf + slots + outline -> colored coordinates
  square-sharpness-amp  (existing) HD pass, material 'source' to preserve authored fills
  asset packet          (existing) + metadata.compatibility.{ spec: hash, shader: { id, hash } }
  item-effect-shader    spec.shader -> PB-SHADER-v1 packet -> .gdshader / Phaser exports
  exporters             PNG renderer + .pbrain (existing) + previews + diagnostics
```

The Foundry composes existing stages and never forks them: `sketchToSilhouette`, `buildSquareSharpnessContrastPayload`, `createPixelBrainAssetPacket`, `derivePixelBrainRenderPacket`, `createShaderPacket`/`hashShaderPacket`, `exportToGodotShader`, `exportToPhaserPipeline`, and `buildPixelBrainGodotExport` are consumed as-is. `runPixelBrainOperationPipeline` remains the host for packet-level operations; the Foundry sits above it as the generation-time orchestrator.

# 9. Behavior

**Silhouette composition.** Each profile emits cells along a parametric centerline with a half-width function. The composer clamps centerline slope to < 1 cell/row (inserting bridge cells when a spec demands sharper curvature) so silhouettes are always 4-connected — the invariant the scimitar satisfied by hand-tuning `26 * t * t`.

**Region fill.** For each part, interior slot range `[minSlot, maxSlot]` is computed over that part's non-outline cells, then mapped onto the part material's registry ramp (`void → whiteCore` subset appropriate to the part's lightness intent: dark materials use the low anchors, bright materials the high anchors). Outline cells take the declared outline material/anchor. This promotes the scimitar's `rampPick` + per-region `slotRange` logic into the engine.

**Motifs.** A motif rasterizes waypoints along its host part's centerline with seeded lateral offsets (`hashString(seed, segment)`), connects them with Bresenham segments, and restricts itself to interior cells so outlines stay closed. Glow cells are the cardinal-neighbor shell of the motif. Bolt-with-fork generalizes the scimitar engraving; rune-row/vine/wave/facet-lines follow the same shape: waypoints → segments → interior clip.

**Effect shader.** `motif-energize` emits the proven scimitar fragment shape: the host part's centerline is converted to a UV-space polynomial by the generator (sampled and least-squares fitted, not hand-transcribed), asset constants (tint from the outline material's registry anchor, motif density) are baked into the source, and the packet declares only canonical uniforms — custom uniforms are forbidden because the WebGL sandbox wrapper declares only canonical + provider uniforms. Every generated fragment must pass `glslangValidator` (available in CI and on the Deck) as GLSL ES 3.00 after `wrapShaderSource`.

# 10. Migration

- `scripts/generate-pixelbrain-scimitar.mjs` and `generate-pixelbrain-sword.mjs` become 30-line spec files invoking `forgeItemAsset`. The current scimitar output is the golden baseline: the migrated spec must reproduce its PNG byte-identically (same cells, same colors) before the bespoke script is deleted.
- `output/pixelbrain/` bundle layout is unchanged; existing consumers (Godot import, download flow) need no changes.
- The PixelBrain UI gains nothing in v1; a spec-driven "Forge" panel is a natural follow-up once the engine API is stable.

# 11. QA Requirements

- **Determinism:** same spec → identical artifact bytes and identical spec/shader hashes across runs and machines. No `Math.random` (Anti-Chaos scanners must stay green).
- **Connectivity:** every composed silhouette is 4-connected; property test over randomized-but-seeded spec corpora.
- **Outline closure:** every part with a declared outline has an unbroken rim (no motif or fill may claim a rim cell); regression test pinned to the slot-0 trap.
- **Registry compliance:** every emitted color is reachable from a registry anchor or a documented blend of two anchors; no raw hex literals in Foundry modules.
- **Shader gate:** generated fragments compile via `glslangValidator` (ES 3.00) and export valid Godot/Phaser sources; packet hash is stable.
- **Golden assets:** scimitar + sword specs reproduce the archived outputs; one new ring and one new amulet spec are added as fixtures with reviewed PNGs.
- **Contract tests:** ITEM-SPEC-v1 validation rejects each malformed-spec class listed in §7.

# 12. Phases

| Phase | Deliverable | Acceptance |
|-------|-------------|------------|
| 0 | `item-spec.js` contract + validation + hashing | contract tests green |
| 1 | `part-profile-library.js` + `silhouette-composer.js` (weapon profiles) | scimitar/sword silhouettes reproduced from specs, connectivity property test green |
| 2 | `region-fill-amp.js` + outline authority | scimitar colors reproduced byte-identically from spec |
| 3 | `motif-engraver.js` (bolt first, then rune-row) | scimitar engraving reproduced; outline-closure test green |
| 4 | `item-effect-shader.js` | scimitar `.gdshader`/Phaser exports reproduced; glslang gate green |
| 5 | `item-foundry.js` + ring/amulet profiles + script migration | ring + amulet fixtures forged with zero new engine code; bespoke scripts deleted |

Each phase lands TDD with its own tests; no phase begins until the previous phase's acceptance is demonstrated, and Phase 2's byte-identical bar is the kill-question for the whole design — if spec-driven fill cannot reproduce the hand-authored scimitar, the spec vocabulary is too weak and must be revised before building higher.

# 13. Success Criteria

A teammate writes a JSON spec for an item that has never existed — "ruby-eyed gold serpent amulet, emerald vine engraving" — and `forgeItemAsset` produces a render-ready bundle (PNG, `.pbrain`, `.gdshader`, Phaser pipeline, hashed packets) on the first run, deterministic across machines, with every color traceable to the material registry and every gate (typecheck, test:qa, Anti-Chaos, glslang) green. The scimitar and sword remain reproducible from their specs as living proof the migration lost nothing.
