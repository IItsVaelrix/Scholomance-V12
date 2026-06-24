# PDR: PixelBrain ChestplateAMP

## Armor Torso Geometry, Material Slot Binding, Heraldry, Trim, and Volume for Deterministic Chestplate Assets

**Status:** Draft
**Classification:** Architectural + PixelBrain + Armor Generation + AMP + Item Foundry
**Priority:** High
**Primary Goal:** Add a deterministic `ChestplateAMP` that generates and refines chestplate-class armor assets from structured item specs, producing readable pixel-art armor with torso volume, shoulder structure, material slot bindings, heraldry, trim, gems, and export-ready PixelBrain artifact bundles.

---

# 1. Executive Summary

PixelBrain has proven it can generate elemental effects, swords, scimitars, amulets, and kite shields. The next major equipment archetype is armor, beginning with the chestplate.

Chestplates are harder than simple weapons because they require believable torso geometry, bilateral symmetry, layered armor plates, shoulder/neck openings, center mass, trim, material contrast, and optional heraldry. Unlike swords, where a single centerline can drive most of the geometry, chestplates require a **body-facing silhouette grammar**.

This PDR introduces **ChestplateAMP**, a deterministic armor-generation and refinement AMP that sits inside the PixelBrain Item Foundry architecture. It converts an armor spec into a cell field containing armor parts, material slots, outline data, trim zones, volume zones, emblem zones, and optional sockets. It then emits coordinates suitable for PixelBrain render packets, PNG export, `.pbrain` metadata, shader export, and future Pixel Lotus actor-layer interop.

The goal is not to hand-author every breastplate. The goal is to define the **chestplate archetype** so every future chestplate becomes a declarative variant.

```text
Chestplate spec
  -> torso silhouette
  -> armor part map
  -> material slot binding
  -> trim / emblem / gem placement
  -> volume and shadow passes
  -> render coordinates
  -> PixelBrain artifact bundle
```

This extends the Item Foundry principle: the spec, not the script, becomes the unit of authorship. The broader Foundry PDR already defines `ITEM-SPEC-v1` as the path from structured spec to deterministic artifact bundle; ChestplateAMP adds the armor torso grammar needed for chestplate-class items.

---

# 2. Problem Statement

The current PixelBrain foundry can generate rigid weapons and shield-like silhouettes, but chest armor introduces new structural demands:

1. **Torso geometry is not a simple vertical blade.**
   Chestplates require broad shoulders, neck gaps, waist taper, chest mass, and layered plate curvature.

2. **Armor needs volume, not just outline.**
   A good chestplate must read as something worn over a body. It needs center-plane lift, side shadows, rim shadows, and curved metal behavior.

3. **Shoulders and torso must remain distinct.**
   Without clear part identity, pauldrons, collar, chest face, trim, and waist guards collapse into a single blob.

4. **Material slots are mandatory.**
   A chestplate may have blacksteel body, gold trim, ruby sockets, sapphire crest, leather straps, and obsidian shadow plates. One global material id is not enough.

5. **Heraldry and emblems need safe zones.**
   The shield tests showed that center symbols become unreadable unless emblem placement, contrast, and dominance are controlled.

6. **Armor symmetry must be intentional.**
   Chestplates usually require bilateral symmetry, but slight asymmetry may be allowed for damaged, corrupted, or organic armor variants.

7. **Future actor integration matters.**
   Chestplates are not only item icons. They are candidates for Pixel Lotus actor layers, equipment slots, and game character armor systems.

---

# 3. Product Goal

Create a deterministic ChestplateAMP that can generate a readable pixel-art chestplate from structured data.

Canonical pipeline:

```text
ITEM-SPEC-v1 / ArmorSpec
  -> ChestplateAMP
  -> armor silhouette + part map
  -> region fill from material registry
  -> armor volume / shadow / trim passes
  -> PixelBrainAssetPacket
  -> PixelBrainRenderPacket
  -> PNG / .pbrain / shader / diagnostics
```

The first successful version should support:

* chestplate silhouettes
* collar / neck opening
* shoulders / pauldrons
* torso body
* waist taper
* trim
* center emblem zone
* gem socket zone
* material slot bindings
* deterministic output
* export parity between preview and PNG

---

# 4. Non-Goals

* Do not create a full humanoid armor renderer in v1.
* Do not animate armor in v1.
* Do not replace Item Foundry or `ITEM-SPEC-v1`.
* Do not mutate source PixelBrain asset packets.
* Do not hard-code colors outside the material registry.
* Do not infer armor regions from y-ranges after generation.
* Do not require WebGL or GPU shaders for base output.
* Do not build a full character paper-doll system in v1.
* Do not implement cloth physics, deformation, or rigging in v1.

---

# 5. Design Principles

## 5.1 Armor Is Part-Based

A chestplate is not one shape. It is a composition of parts:

```text
collar
neck gap
left pauldron
right pauldron
upper chest
center plate
side plates
trim
waist guard
gem socket
emblem
straps
```

Each cell should carry part identity from the composer. Region identity must be carried, not reconstructed later.

## 5.2 Material Slots Are First-Class

ChestplateAMP must support multiple material bindings:

```js
{
  body: "blacksteel",
  trim: "gold",
  emblem: "sapphire",
  sockets: "ruby",
  straps: "black_leather",
  shadowPlate: "obsidian"
}
```

One material id cannot represent armor complexity.

## 5.3 Symmetry Is a Contract

Default chestplates are bilaterally symmetrical. Any asymmetry must be explicit:

```js
symmetry: {
  axis: "vertical",
  mode: "strict" | "soft" | "damaged" | "corrupted"
}
```

## 5.4 Volume Is Required

A flat breastplate is not enough. ChestplateAMP must provide cells that later AMPs can use for volume:

```text
center highlight
side shadow
rim shadow
collar shadow
waist shadow
plate bevel
```

## 5.5 Heraldry Must Be Safe

Heraldry and emblems must sit inside a defined safe zone, respect contrast thresholds, and avoid dominating the entire armor face.

## 5.6 Determinism Is Law

Same spec, same processor versions, same seed, same output.

No `Math.random`.

All jitter, scratches, rune cracks, and damage marks derive from stable seeded hash functions.

---

# 6. Feature Overview

New module:

```text
codex/core/pixelbrain/chestplate-amp.js
```

Optional supporting modules:

```text
codex/core/pixelbrain/armor-profile-library.js
codex/core/pixelbrain/armor-slot-material-binder.js
codex/core/pixelbrain/armor-volume-amp.js
codex/core/pixelbrain/heraldry-amp.js
codex/core/pixelbrain/gem-socket-amp.js
```

Primary export:

```js
buildChestplateAmpPayload(input, options)
```

Secondary exports:

```js
generateChestplateSilhouette(spec, options)
classifyChestplateParts(cells, spec)
bindChestplateMaterials(cells, spec)
deriveChestplateVolumeZones(cells, spec)
applyChestplateTrim(cells, spec)
applyChestplateHeraldry(cells, spec)
applyChestplateGemSockets(cells, spec)
```

---

# 7. Chestplate Spec Contract

## 7.1 Minimal Spec

```json
{
  "contract": "ITEM-SPEC-v1",
  "id": "chestplate.blacksteel.gold.v1",
  "class": "armor",
  "archetype": "chestplate",
  "canvas": { "width": 64, "height": 80 },
  "seed": 20260611,
  "bytecode": "VW-WILL-INEXPLICABLE-HARMONIC",
  "parts": [
    {
      "id": "torso",
      "profile": "armor.chestplate.classic",
      "fill": { "material": "blacksteel" },
      "trim": { "material": "gold" },
      "emblem": { "kind": "flame", "material": "ruby" }
    }
  ]
}
```

## 7.2 Expanded Spec

```json
{
  "contract": "ITEM-SPEC-v1",
  "id": "chestplate.rage.obsidian.v1",
  "class": "armor",
  "archetype": "chestplate",
  "canvas": { "width": 64, "height": 80 },
  "seed": 9137,
  "bytecode": "VW-RAGE-INEXPLICABLE-TRANSCENDENT",
  "symmetry": {
    "axis": "vertical",
    "mode": "strict"
  },
  "parts": [
    {
      "id": "body",
      "profile": "armor.chestplate.angular",
      "params": {
        "shoulderWidth": 48,
        "waistWidth": 28,
        "neckWidth": 14,
        "torsoHeight": 58,
        "plateCurve": 0.65
      },
      "fill": { "material": "obsidian" },
      "trim": { "material": "crimson_steel", "anchor": "edge" },
      "outline": { "material": "blacksteel", "anchor": "shadow" }
    },
    {
      "id": "collar",
      "profile": "armor.collar.high",
      "attach": { "parent": "body", "at": "top" },
      "fill": { "material": "blacksteel" }
    },
    {
      "id": "left_pauldron",
      "profile": "armor.pauldron.spiked",
      "attach": { "parent": "body", "at": "leftShoulder" },
      "fill": { "material": "obsidian" },
      "trim": { "material": "crimson_steel" }
    },
    {
      "id": "right_pauldron",
      "mirrorOf": "left_pauldron"
    },
    {
      "id": "center_gem",
      "profile": "gem.socket.diamond",
      "attach": { "parent": "body", "at": "centerChest" },
      "fill": { "material": "ruby" },
      "outline": { "material": "gold" }
    },
    {
      "id": "emblem",
      "profile": "heraldry.rune",
      "attach": { "parent": "body", "at": "safeZone.center" },
      "fill": { "material": "crimson_energy" }
    }
  ],
  "shader": {
    "kind": "armor-glow",
    "resonanceDefault": 0.45
  }
}
```

---

# 8. Chestplate Part Model

## 8.1 Required Parts

| Part             | Responsibility               |
| ---------------- | ---------------------------- |
| `body`           | Primary torso silhouette     |
| `collar`         | Neck/upper opening structure |
| `left_pauldron`  | Left shoulder armor          |
| `right_pauldron` | Right shoulder armor         |
| `center_plate`   | Chest mass / main volume     |
| `waist_guard`    | Lower taper / abdomen edge   |

## 8.2 Optional Parts

| Part           | Responsibility                    |
| -------------- | --------------------------------- |
| `trim`         | Gold/silver/colored borders       |
| `emblem`       | Crest/heraldry/rune               |
| `center_gem`   | Gem socket at sternum             |
| `straps`       | Leather or cloth binding          |
| `spikes`       | Aggressive silhouette accents     |
| `damage`       | Scratches/cracks/chipped sections |
| `glow_cracks`  | Magical fracture lines            |
| `inner_lining` | Dark undersuit shadow             |

---

# 9. Armor Profiles

## 9.1 Profile Library

ChestplateAMP should consume profile definitions from an armor profile library.

```js
ARMOR_PROFILES = {
  "armor.chestplate.classic": classicChestplateProfile,
  "armor.chestplate.angular": angularChestplateProfile,
  "armor.chestplate.royal": royalChestplateProfile,
  "armor.chestplate.infernal": infernalChestplateProfile,
  "armor.chestplate.frost": frostChestplateProfile,
  "armor.chestplate.assassin": assassinChestplateProfile,

  "armor.pauldron.round": roundPauldronProfile,
  "armor.pauldron.spiked": spikedPauldronProfile,

  "armor.collar.low": lowCollarProfile,
  "armor.collar.high": highCollarProfile,

  "gem.socket.diamond": diamondSocketProfile,
  "gem.socket.round": roundSocketProfile
}
```

## 9.2 Profile Output

Each profile returns:

```js
{
  cells,
  anchors,
  bounds,
  safeZones,
  diagnostics
}
```

Example anchors:

```js
{
  top: { x, y },
  centerChest: { x, y },
  leftShoulder: { x, y },
  rightShoulder: { x, y },
  waist: { x, y },
  bottom: { x, y }
}
```

---

# 10. Cell Roles

ChestplateAMP should classify cells into armor-specific roles.

```text
outer_outline
rim
trim
center_plate
left_plate
right_plate
collar_shadow
shoulder_plate
waist_shadow
emblem
gem_socket
strap
inner_shadow
highlight
bevel
damage
```

Each output cell should support metadata:

```js
{
  x,
  y,
  color,
  partId,
  role,
  materialId,
  slot,
  volumeZone,
  isOutline,
  isTrim,
  isHeraldry,
  isGem
}
```

This metadata should flow into diagnostics and optional `.pbrain` export, but the rendered coordinate color must stand on its own.

---

# 11. Material Slot Binding

ChestplateAMP requires slot-based material binding.

## 11.1 Required Material Slots

```js
{
  body: "steel",
  trim: "gold",
  outline: "blacksteel",
  shadowPlate: "darksteel"
}
```

## 11.2 Optional Material Slots

```js
{
  emblem: "sapphire",
  gem: "ruby",
  straps: "black_leather",
  glowCracks: "holy_fire",
  damage: "rust",
  innerLining: "void_cloth"
}
```

## 11.3 Material Families

Supported material families:

```text
metal
gemstone
leather
cloth
elemental
energy
bone
obsidian
crystal
```

## 11.4 Slot Compatibility

| Slot        | Allowed Families                   |
| ----------- | ---------------------------------- |
| `body`      | metal, obsidian, crystal, bone     |
| `trim`      | metal, gemstone, energy            |
| `outline`   | metal, obsidian, shadow            |
| `emblem`    | metal, gemstone, energy, elemental |
| `gem`       | gemstone, crystal, elemental       |
| `strap`     | leather, cloth, metal              |
| `glowCrack` | energy, elemental                  |

Invalid bindings must fallback safely and emit diagnostics.

---

# 12. Geometry Rules

## 12.1 Bilateral Symmetry

Default chestplates mirror left/right cells.

Rules:

```text
left pauldron mirrors right pauldron
left trim mirrors right trim
left side shadow mirrors right side shadow unless lighting mode overrides
```

## 12.2 Neck Opening

A chestplate must preserve a readable neck/collar gap.

Rules:

```text
top-center cells may remain empty
collar cells frame the neck opening
neck gap should not be filled by body material
```

## 12.3 Waist Taper

Chestplates must taper toward the waist.

Rules:

```text
shoulder width > chest width > waist width
```

## 12.4 Center Plate

The center plate must provide visual mass.

Rules:

```text
center plate gets highlight or midtone lift
side plates receive darker tone
rim receives trim or shadow
```

## 12.5 Shoulder Authority

Shoulders should not collapse into the torso.

Rules:

```text
pauldrons carry separate part ids
pauldron shadows differ from body shadows
spiked pauldrons may extend silhouette but must remain connected
```

---

# 13. Volume Logic

ChestplateAMP should generate or support volume zones:

```text
center_lift
upper_shadow
side_shadow
rim_shadow
waist_shadow
collar_shadow
pauldron_highlight
pauldron_shadow
```

These zones may be consumed by:

```text
ArmorVolumeAMP
ShadowAMP
TonationAMP
SquareSharpnessContrastAMP
```

Suggested order:

```text
ChestplateAMP
  -> Region Fill AMP
  -> ArmorVolumeAMP
  -> ShadowAMP
  -> TonationAMP
  -> Square Sharpness Contrast AMP
```

Volume must not blur the cell field. It should adjust material anchors at cell level.

---

# 14. Heraldry and Emblem Safe Zone

Chestplates may contain a center emblem.

## 14.1 Safe Zone

The emblem must remain inside the center plate safe zone.

```text
emblem must not touch outer rim
emblem must not overwrite collar gap
emblem must not exceed 25% of center plate area
```

## 14.2 Contrast Contract

The emblem must differ from the body material enough to read.

```text
emblemLuminanceDelta >= threshold
```

If contrast fails, fallback to:

```text
emblem outline
alternate anchor
brighter material ramp
```

## 14.3 Supported Emblem Kinds

```text
flame
cross
tower
eye
rune
crescent
skull
lion
serpent
wing
lightning
diamond
```

---

# 15. Gem Socket Rules

Gem sockets should be placed deliberately.

## 15.1 Supported Socket Types

```text
center_chest
collar
left_shoulder
right_shoulder
waist
```

## 15.2 Socket Shapes

```text
diamond
round
marquise
teardrop
square
hex
```

## 15.3 Gem Material Behavior

Gem cells should use gemstone material anchors:

```text
shadow
mid
highlight
sparkle
spectral
```

Sockets should preserve a dark or metallic rim so the gem does not melt into the body.

---

# 16. Damage and Corruption Rules

Optional damage layer:

```js
damage: {
  kind: "scratches" | "cracks" | "chipped" | "corrupted",
  density: 0.15,
  material: "rust"
}
```

Rules:

```text
damage must be deterministic
damage may not break the silhouette unless explicitly enabled
damage may not overwrite essential emblem/gem cells
damage density must be capped
```

---

# 17. Shader Integration

ChestplateAMP may request shader metadata, but should not require shaders for base asset output.

Supported shader kinds:

```text
armor-glow
gem-pulse
rune-energize
crack-ember
holy-aura
void-breath
```

Shader metadata should attach to the asset packet:

```js
metadata: {
  shader: {
    kind: "armor-glow",
    targetParts: ["gem", "emblem", "glowCracks"],
    materialIds: ["ruby", "crimson_energy"]
  }
}
```

Generated shaders must obey the existing PixelBrain shader packet contract and export gates.

---

# 18. Architecture

```text
forgeItemAsset(spec)
  -> item-spec.js
  -> armor-profile-library.js
  -> chestplate-amp.js
  -> silhouette composer
  -> part map
  -> material slot binder
  -> region fill amp
  -> armor volume amp
  -> shadow amp
  -> tonation amp
  -> square sharpness amp
  -> createPixelBrainAssetPacket()
  -> derivePixelBrainRenderPacket()
  -> export PNG / .pbrain / shader / diagnostics
```

ChestplateAMP does not replace the Foundry. It is an armor archetype module consumed by the Foundry.

---

# 19. Diagnostics

ChestplateAMP should emit structured diagnostics:

```js
{
  amp: "pixelbrain.chestplate-amp",
  version: 1,
  ok: true,
  diagnostics: [
    {
      code: "CHESTPLATE_SYMMETRY_OK",
      message: "Strict vertical symmetry satisfied."
    },
    {
      code: "CHESTPLATE_NECK_GAP_PRESERVED",
      message: "Neck/collar gap remained unfilled."
    },
    {
      code: "CHESTPLATE_MATERIAL_FALLBACK",
      message: "Unknown trim material fell back to gold."
    }
  ],
  metadata: {
    cellCount,
    partCount,
    outlineCount,
    trimCount,
    emblemCount,
    gemCount,
    symmetryMode,
    materialBindings
  }
}
```

Required diagnostic codes:

```text
CHESTPLATE_SPEC_NORMALIZED
CHESTPLATE_PROFILE_RESOLVED
CHESTPLATE_SYMMETRY_OK
CHESTPLATE_SYMMETRY_REPAIRED
CHESTPLATE_NECK_GAP_PRESERVED
CHESTPLATE_WAIST_TAPER_OK
CHESTPLATE_OUTLINE_CLOSED
CHESTPLATE_MATERIAL_FALLBACK
CHESTPLATE_EMBLEM_CONTRAST_LOW
CHESTPLATE_SOCKET_PLACED
CHESTPLATE_DAMAGE_APPLIED
CHESTPLATE_EXPORT_READY
```

---

# 20. QA Requirements

## 20.1 Contract Tests

* [ ] valid minimal chestplate spec normalizes
* [ ] invalid material id falls back with diagnostic
* [ ] invalid profile rejects spec
* [ ] unknown emblem kind rejects or falls back
* [ ] missing body part rejects spec

## 20.2 Geometry Tests

* [ ] chestplate silhouette is connected
* [ ] neck gap remains open
* [ ] waist taper exists
* [ ] shoulders are wider than waist
* [ ] pauldrons remain attached
* [ ] outline is closed
* [ ] strict symmetry mirrors cells correctly

## 20.3 Material Tests

* [ ] body material uses registry anchors
* [ ] trim material uses registry anchors
* [ ] gemstone socket uses gemstone anchors
* [ ] no raw hex literals in ChestplateAMP
* [ ] emitted colors are traceable to registry anchors or documented blends

## 20.4 Render Tests

* [ ] source packet is not mutated
* [ ] render packet derives correctly
* [ ] preview and PNG export match
* [ ] volume pass does not erase emblem
* [ ] shadow pass does not black out center plate
* [ ] square sharpness preserves trim and gem highlights

## 20.5 Golden Fixtures

Create fixtures:

```text
chestplate.classic.steel.gold.v1
chestplate.obsidian.ruby.rage.v1
chestplate.froststeel.sapphire.v1
chestplate.voidsteel.amethyst.v1
chestplate.damaged.iron.v1
```

---

# 21. Implementation Phases

## Phase 0: Contract Extension

Deliver:

```text
armor/chestplate spec validation
material slot schema
symmetry schema
```

Acceptance:

```text
valid chestplate specs normalize
malformed specs reject with diagnostics
```

## Phase 1: Chestplate Silhouette

Deliver:

```text
classic chestplate profile
angular chestplate profile
neck gap
waist taper
basic symmetry
```

Acceptance:

```text
classic chestplate renders connected silhouette with readable torso shape
```

## Phase 2: Part Map and Slots

Deliver:

```text
body/collar/pauldron/waist part identity
material binding per part
outline cells
trim cells
```

Acceptance:

```text
cells carry part ids and material ids
no regionOf(y) inference
```

## Phase 3: Volume and Shadow

Deliver:

```text
ArmorVolumeAMP integration
side shadows
center plate lift
rim shadows
collar shadows
```

Acceptance:

```text
chestplate reads as armor mass, not flat shield
```

## Phase 4: Heraldry and Gem Sockets

Deliver:

```text
center emblem safe zone
gem socket placement
contrast rules
```

Acceptance:

```text
ruby/diamond/sapphire sockets render visibly without corrupting body silhouette
```

## Phase 5: Foundry Integration

Deliver:

```text
forgeItemAsset(spec) supports class: armor, archetype: chestplate
PNG/.pbrain/shader diagnostics bundle
```

Acceptance:

```text
new chestplate spec produces artifact bundle with zero new engine code
```

---

# 22. Success Criteria

ChestplateAMP is successful when a teammate can write:

```json
{
  "contract": "ITEM-SPEC-v1",
  "id": "chestplate.obsidian.ruby.rage.v1",
  "class": "armor",
  "archetype": "chestplate",
  "canvas": { "width": 64, "height": 80 },
  "seed": 9137,
  "parts": [
    {
      "id": "body",
      "profile": "armor.chestplate.angular",
      "fill": { "material": "obsidian" },
      "trim": { "material": "crimson_steel" },
      "emblem": { "kind": "flame", "material": "ruby" }
    }
  ]
}
```

and PixelBrain produces:

```text
readable chestplate PNG
valid PixelBrainAssetPacket
valid PixelBrainRenderPacket
.pbrain metadata
optional shader packet
diagnostics
stable deterministic hash
```

without any new per-item engine code.

---

# 23. Regression Risks

| Risk                             | Mitigation                                        |
| -------------------------------- | ------------------------------------------------- |
| Chestplate looks like shield     | Neck gap, shoulders, waist taper, collar rules    |
| Center emblem becomes unreadable | Heraldry safe zone + contrast contract            |
| Materials become global again    | Slot bindings mandatory                           |
| Shoulders collapse into torso    | Part identity map and pauldron anchors            |
| Armor looks flat                 | ArmorVolumeAMP + ShadowAMP                        |
| Over-detail creates noise        | Emblem dominance cap and damage density cap       |
| Source packet mutates            | Derived coordinates only                          |
| Random damage breaks determinism | Seeded hash only                                  |
| UI/export mismatch               | Preview and export consume same final coordinates |

---

# 24. Final Contract

```text
ChestplateAMP owns armor torso geometry.
Armor profiles own silhouette generation.
Material registry owns color truth.
Slot material bindings own part materials.
HeraldryAMP owns center emblem readability.
GemSocketAMP owns gem placement.
ArmorVolumeAMP owns chestplate mass.
ShadowAMP owns depth.
SquareSharpness owns final square readability.
PixelBrainAssetPacket remains source truth.
PixelBrainRenderPacket remains visual truth.
PixelBrainExportPacket remains target truth.
```

Breaking these boundaries is the main way chestplate generation will regress.
