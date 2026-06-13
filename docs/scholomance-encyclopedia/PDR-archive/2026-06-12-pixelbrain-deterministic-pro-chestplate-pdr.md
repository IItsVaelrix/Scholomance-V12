# PDR: PixelBrain Deterministic Pro Chestplate
## Reproducing AI-Polish Quality Through Spec-Driven Armor Geometry and Render Fidelity

**Status:** Implemented
**Classification:** PixelBrain + Item Foundry + Armor Fidelity + Deterministic Asset Pipeline
**Priority:** High
**Primary Goal:** Replace one-off AI-polished chestplate raster output with a fully deterministic PixelBrain chestplate pipeline that can produce comparable professional quality from structured specs, stable material rules, human-wearable proportions, and reproducible AMP passes.

---

# 1. Executive Summary

The current polished VOID chestplate proves the target quality bar: crisp silhouette, bevelled gold trim, readable blue shoulder enamel, controlled void body values, strong central crystal glow, and a finished game-item presentation. However, that polished image was produced by an AI bitmap edit pass and only afterward transcribed into PixelBrain artifacts. The transcription/export path is deterministic; the visual polish source is not.

This PDR defines the path to make that quality level native to PixelBrain. The output must be generated from `ITEM-SPEC-v1`, `ChestplateAMP`, material-registry colors, deterministic highlight/shadow passes, and a strict final palette budget. The chestplate must keep fantasy prestige while using regular human-sized shoulder proportions by default; oversized raid-boss pauldrons are a separate explicit variant, not the standard armor profile.

# 2. Problem Statement

PixelBrain can already import a polished raster into JSON and `.pbrain`, but that does not solve deterministic art direction. The current raster has three production problems:

1. **The best-looking pixels are not reproducible.** Re-running the AI edit prompt will not produce byte-identical output.
2. **The PixelBrain import preserves too much raster noise.** The imported 640x800 artifact reported 71,523 unique colors, creating large JSON and `.pbrain` files that are unsuitable as a compact canonical item asset.
3. **The shoulder silhouette needs discipline.** The AI-polished version reads as premium, but the pauldrons are wider than regular human armor. The deterministic default must look wearable on a human torso rather than like an exaggerated icon-only silhouette.

The goal is not to ban AI references. The goal is to treat them as concept/reference material only. PixelBrain must own the final source of truth.

# 3. Product Goal

Create a deterministic chestplate generation route that can produce a polished VOID chestplate from data:

```text
ITEM-SPEC-v1
  -> chestplate proportion profile
  -> ChestplateAMP part map
  -> human shoulder constraint validator
  -> material slot binder
  -> trim / bevel / crystal / glyph passes
  -> render fidelity pipeline
  -> palette quantizer
  -> PixelBrainAssetPacket
  -> PNG / .pbrain / diagnostics
```

The target result should approach the professional quality of the AI-polished reference while remaining byte-stable across runs and machines.

# 4. Non-Goals

- Do not use diffusion/image-generation output as the canonical asset.
- Do not require hand-painting individual final pixels for the canonical output.
- Do not introduce nondeterministic jitter, timestamps, or `Math.random`.
- Do not make giant pauldrons the default chestplate silhouette.
- Do not change existing PixelBrain export contracts.
- Do not replace `ChestplateAMP`; this PDR hardens and extends it.
- Do not require WebGL shaders for the base PNG to look finished.

# 5. Core Design Principles

## 5.1 Reference Is Not Source

AI-polished and hand-painted sprites may be used as visual references and test fixtures. They must not become the canonical generation path unless transcribed into deterministic spec rules, material anchors, and AMP logic.

## 5.2 Human-Wearable Proportions By Default

Default chestplates must obey a regular human armor silhouette:

```text
shoulderWidth <= bodyChestWidth * 1.28
pauldronOuterDrop <= torsoHeight * 0.18
pauldronHeight <= torsoHeight * 0.22
neckGapWidth >= bodyChestWidth * 0.24
waistWidth between bodyChestWidth * 0.58 and bodyChestWidth * 0.78
```

An explicit profile flag may opt into exaggerated fantasy shoulders:

```json
{
  "proportions": {
    "profile": "ceremonial_exaggerated",
    "allowOversizedPauldrons": true
  }
}
```

Without that flag, oversized shoulders are a validation failure.

## 5.3 Professional Polish Is Encoded As Rules

The pro look must come from named deterministic passes:

- silhouette cleanup
- bilateral symmetry enforcement
- bevel band construction
- rim/selout authority
- directional highlight placement
- localized shadow pockets
- central crystal glow containment
- palette reduction
- final square sharpness

## 5.4 Palette Discipline Is Required

Canonical chestplate output should target a compact indexed-style palette:

```text
preview/reference ceiling: 96 colors
shipping target: 32 to 64 colors
hard failure: more than 128 colors unless explicitly marked reference-only
```

Every emitted color must derive from the material registry or from a documented deterministic blend between registry anchors.

# 6. Feature Overview

This PDR adds a deterministic fidelity layer for chestplate-class items.

New or extended modules:

```text
codex/core/pixelbrain/armor-proportion-validator.js
codex/core/pixelbrain/chestplate-bevel-amp.js
codex/core/pixelbrain/crystal-core-amp.js
codex/core/pixelbrain/palette-quantization-amp.js
codex/core/pixelbrain/chestplate-fidelity-pipeline.js
```

Existing modules to consume:

```text
codex/core/pixelbrain/chestplate-amp.js
codex/core/pixelbrain/part-profile-library.js
codex/core/pixelbrain/region-fill-amp.js
codex/core/pixelbrain/shadow-amp.js
codex/core/pixelbrain/volume-amp.js
codex/core/pixelbrain/selout-amp.js
codex/core/pixelbrain/square-sharpness-contrast-amp.js
codex/core/pixelbrain/item-foundry.js
```

# 7. Proposed Spec Additions

The deterministic professional VOID chestplate spec should add proportion and fidelity controls:

```json
{
  "contract": "ITEM-SPEC-v1",
  "id": "void.chestplate.pro.deterministic.v1",
  "class": "armor",
  "archetype": "chestplate",
  "canvas": { "width": 64, "height": 80 },
  "seed": 20260612,
  "bytecode": "VW-VOID-WILL-HARMONIC-PRO",
  "symmetry": { "axis": "vertical", "mode": "strict" },
  "proportions": {
    "profile": "human_regular",
    "shoulderScale": 1.12,
    "pauldronScale": 0.92,
    "waistTaper": 0.68,
    "allowOversizedPauldrons": false
  },
  "fidelity": {
    "qualityTarget": "pro_game_icon",
    "paletteBudget": 64,
    "bevelStrength": 0.72,
    "rimContrast": 0.82,
    "centralGlowContainment": 0.88,
    "noiseFloor": "none"
  },
  "parts": [
    {
      "id": "body",
      "profile": "armor.chestplate.void_royal_human",
      "params": {
        "shoulderWidth": 46,
        "chestWidth": 38,
        "waistWidth": 26,
        "torsoHeight": 58
      },
      "fill": { "material": "voidsteel" },
      "trim": { "material": "void_gold" },
      "outline": { "material": "blacksteel" }
    },
    {
      "id": "left_pauldron",
      "profile": "armor.pauldron.angular_human",
      "attach": { "parent": "body", "at": "leftShoulder" },
      "fill": { "material": "sapphire_enamel" },
      "trim": { "material": "void_gold" }
    },
    { "id": "right_pauldron", "mirrorOf": "left_pauldron" },
    {
      "id": "center_core",
      "profile": "gem.socket.void_crystal",
      "attach": { "parent": "body", "at": "centerChest" },
      "fill": { "material": "void_core" },
      "outline": { "material": "void_gold" },
      "glow": { "material": "amethyst", "radius": 4, "containment": 0.88 }
    }
  ]
}
```

# 8. Architecture

```text
forgeItemAsset(spec)
  item-spec.js
    normalize + validate + hash
  armor-proportion-validator.js
    reject non-human default shoulder/pauldron ratios
  silhouette-composer.js + ChestplateAMP
    produce part map, torso, neck gap, pauldrons, core socket
  region-fill-amp.js
    bind registry materials to part slots
  chestplate-bevel-amp.js
    derive trim bevel bands from part boundaries and light direction
  crystal-core-amp.js
    build center crystal facets and contained glow cells
  shadow/volume/selout/square-sharpness AMPs
    reinforce depth and readable pixel clusters
  palette-quantization-amp.js
    reduce to spec.fidelity.paletteBudget deterministically
  asset/export layer
    PNG, .pbrain, diagnostics, stable hashes
```

# 9. Module Breakdown

## 9.1 `armor-proportion-validator.js`

Validates armor proportions before rendering. It should emit diagnostics with measured values:

```js
{
  shoulderWidth,
  bodyChestWidth,
  shoulderRatio,
  pauldronHeight,
  pauldronOuterDrop,
  neckGapWidth,
  waistWidth,
  ok
}
```

Default `human_regular` fails if shoulders exceed the configured wearable threshold.

## 9.2 `chestplate-bevel-amp.js`

Creates deterministic bevel bands on trim and plate edges. It must classify:

- top-left highlight edge
- lower-right shadow edge
- inner trim shadow
- gold rim core
- dark separator line

This pass is what makes the gold trim feel finished without hand-painted raster input.

## 9.3 `crystal-core-amp.js`

Builds the sternum crystal/core as structured facets rather than a blurred blob:

- center white facet
- lavender inner ring
- violet containment ring
- dark separator cells
- optional side prongs
- glow radius clamped to armor interior

The glow must not wash out the body material.

## 9.4 `palette-quantization-amp.js`

Reduces final coordinates to a deterministic palette. It must preserve:

- exact outline colors
- core white/lavender colors
- trim highlight/shadow anchors
- material identity tags

It may merge near-duplicate transitional colors only when the registry blend provenance matches.

## 9.5 `chestplate-fidelity-pipeline.js`

Owns the fixed order for professional chestplate output:

```text
ChestplateAMP
  -> proportion validation
  -> region fill
  -> bevel
  -> crystal core
  -> shadow
  -> volume
  -> selout
  -> square sharpness
  -> palette quantization
```

# 10. QA Requirements

- Same spec produces byte-identical PNG, JSON, `.pbrain`, and diagnostics.
- No `Math.random`, timestamps, filesystem order dependence, or environment-dependent colors.
- `human_regular` rejects oversized pauldrons.
- `ceremonial_exaggerated` accepts oversized pauldrons only when explicitly enabled.
- Shoulder ratio, pauldron height, neck gap, and waist taper diagnostics are asserted.
- Final palette is within `fidelity.paletteBudget`.
- Every emitted color maps to material registry anchors or documented deterministic blends.
- The center core remains visually contained and does not erase armor readability.
- The chestplate reads as wearable torso armor, not a shield or oversized shoulder icon.
- PNG export and PixelBrain preview use the same final fidelity coordinates.

# 11. Implementation Phases

| Phase | Deliverable | Acceptance |
|-------|-------------|------------|
| 0 | Add golden reference analysis for AI-polished chestplate | diagnostics record silhouette bounds, palette count, shoulder ratio, value bands |
| 1 | `armor-proportion-validator.js` | tests reject oversized default shoulders and accept human regular profile |
| 2 | human chestplate and pauldron profiles | default VOID chestplate shoulders fit wearable ratio |
| 3 | `chestplate-bevel-amp.js` | deterministic gold trim bevel improves edge read without raw hex literals |
| 4 | `crystal-core-amp.js` | central glow/facets generated from spec and remain contained |
| 5 | `palette-quantization-amp.js` | final output under 64 colors with stable palette order |
| 6 | `chestplate-fidelity-pipeline.js` | one command forges PNG + JSON + `.pbrain` from spec |
| 7 | visual/fidelity QA | deterministic asset approaches reference quality and passes human-proportion gates |

# 12. Success Criteria

A developer can run one deterministic forge command against `void.chestplate.pro.deterministic.v1` and receive a finished chestplate bundle that:

- looks like a professional fantasy armor item,
- uses regular human-sized shoulders by default,
- remains recognizably VOID,
- uses a compact palette,
- exports to PNG and `.pbrain`,
- has stable hashes,
- and can be regenerated byte-identically without AI image generation.

The AI-polished raster becomes a reference target, not a dependency.
