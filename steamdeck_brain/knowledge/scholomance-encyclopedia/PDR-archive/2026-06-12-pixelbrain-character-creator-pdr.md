# PDR: PixelBrain Deterministic Character Creator
## Modular MMORPG-Style Character Construction from Structured Specs

**Bytecode Search Code:** `SCHOL-ENC-PDR-PIXELBRAIN-CHARACTER-CREATOR-v1`  
**Date:** 2026-06-12  
**Status:** Proposed  
**Classification:** PixelBrain + Character Creator + Phaser + Godot + Pixel Lotus Combat  
**Priority:** High  
**Primary Goal:** Build a deterministic, modular character creator that produces professional-quality pixel-art player characters from structured `CHARACTER-SPEC-v1` specs. Characters compose from layered part profiles (body base, face features, hair, clothes) and export as Phaser spritesheets, Godot animated scenes, and Pixel Lotus combat actors.

**Related Documents:**
- PixelBrain Agent Operating Manual (lattice authority, determinism, packets)
- `2026-06-12-pixelbrain-holy-fire-paladin-sword-pdr.md` (part profile pattern)
- `2026-06-12-pixelbrain-deterministic-shape-grammar-router-pdr.md` (route/grammar architecture)
- `2026-06-11-pixelbrain-connective-tissue-seven-systems-pdr.md` (packet contracts)
- `2026-06-10-pixel-lotus-actor-forge-iso-combat-runtime-pdr.md` (combat actor integration)
- `combat_grid_component_pdr.md` (Phaser combat grid)

---

## 1. Executive Summary

PixelBrain currently generates items — swords, chestplates, amulets — with deterministic precision. Characters are the next logical domain. An MMORPG character is fundamentally a composition of layered, swappable part profiles (hair, skin, eyes, clothes) arranged on a body silhouette, all of which fit the existing PixelBrain lattice model perfectly.

This PDR defines a character creator that:

```
CHARACTER-SPEC-v1
  → body base profile (skin tone, gender/presentation hints, height class)
  → face part profiles (eyes, nose, mouth, ears)
  → hair profile (style, color)
  → clothing profiles (top, bottom, shoes, beginner set)
  → construction skeleton (head center, shoulder line, hip line)
  → deterministic palette assignment per part
  → four-direction sprite sheet render (S/E/N/W)
  → export packets: Phaser spritesheet, Godot `.tscn` scene, Pixel Lotus actor
```

Every character is unique by construction — different seed + spec produces a distinct, professional-looking character without nondeterministic inference. The system obeys all PixelBrain laws: the lattice is the asset, all formulas are deterministic, failure is loud, and shaders never invent geometry.

**Non-Goals:**
- Full-body animation system (walk cycles, attack frames) — this PDR covers the static construction layer; animation is a separate PDR
- Clothing physics or cloth simulation
- Real-time character customization UI (this PDR defines the generation pipeline; UI is a consumer)
- ML-based face generation
- 3D character models

---

## 2. Problem Statement

PixelBrain can forge a chestplate. It cannot yet forge the person wearing it.

Current state:
1. **No character asset pipeline exists.** Combat actors in Pixel Lotus and Godot use placeholder or hand-drawn sprites.
2. **No modular part system for characters.** Each character would need to be hand-authored as a complete sprite, defeating the purpose of deterministic asset generation.
3. **No export chain.** Even if we could generate a character, there is no path from spec → Phaser spritesheet → Godot scene → Pixel Lotus combat actor.
4. **Visual quality bar is undefined.** What does a "professional" pixel-art character look like at the target resolution? What palette budget? What silhouette conventions?

Characters are the most frequently seen asset in an MMORPG. They must look good at 1x, read clearly at game scale, and produce unique identities without visual noise.

---

## 3. Product Goal

Create `forgeCharacter(spec)` that produces:

```js
{
  spec,                    // CHARACTER-SPEC-v1
  silhouette,              // per-direction silhouette cells + partOf
  construction,            // PB-CONSTRUCTION-SKELETON-v1 (head/shoulder/hip anchors)
  fills,                   // per-part material-resolved colors
  assetPacket,             // PixelBrainAssetPacket (canonical lattice)
  sprites: {               // 4-direction sprite renders
    south: Buffer,         //   facing-down PNG
    east:  Buffer,         //   facing-right PNG
    north: Buffer,         //   facing-up PNG
    west:  Buffer,         //   facing-left PNG
  },
  spritesheet: Buffer,     // single PNG spritesheet (S/E/N/W in one image)
  phaserPipeline,          // Phaser animation config
  godotScene,              // Godot .tscn with AnimatedSprite2D
  pixelLotusActor,         // combat-actor-compatible character payload
  diagnostics,             // route validation + loud failures
}
```

---

## 4. Design Principles

### 4.1 The Lattice Is the Asset

Every character cell emitted is `{ x, y, color, partId }`. PNGs, Godot scenes, and Phaser sprite atlases are projections. The canonical source is always lattice coordinates + registry-derived colors.

### 4.2 Layered Composition

Characters are NOT a single monolithic profile. They are composed of ordered layers drawn from bottom to top:

```
Layer 0:  Body base         (skin, silhouette, gender/presentation hints)
Layer 1:  Face features     (eyes, nose, mouth, ears — placed on body anchors)
Layer 2:  Hair              (style profile, color, covers head top + sides)
Layer 3:  Clothing (top)    (shirt, tunic, beginner robe)
Layer 4:  Clothing (bottom) (pants, skirt, beginner trousers)
Layer 5:  Clothing (shoes)  (boots, sandals, beginner shoes)
```

Each layer is a PixelBrain part profile. Composers resolve anchors between body parts and attached features (eyes anchor to `head.eyeLeft`/`head.eyeRight`, hair anchors to `head.top`, etc.).

### 4.3 Directional Rendering

Characters render in four canonical directions (S/E/N/W). The body base provides the silhouette for each direction. Parts like hair and clothes are rendered directionally — a "ponytail" hair profile knows to draw the tail on the back in south-facing view and to the side in east-facing view.

Directional rendering is achieved via **four independent silhouette compositions** sharing the same spec, each with a direction parameter that rotates orientation.

### 4.4 Determinism

Same `CHARACTER-SPEC-v1` + same seed → identical sprites, identical packets, identical shader hashes. No `Math.random()`. All variation derives from seeded `hashString(seed, segment)` + FNV-1a deterministic jitter.

### 4.5 Professional Visual Quality

Target: 32×48 pixel character sprite (1× scale). Palette budget per character: 32 unique colors max (keeps files compact, enforces discipline, avoids the "71,523 unique colors" problem from the chestplate import PDR).

Visual quality rules:
- Clean silhouette — no orphan pixels, no broken outlines
- Consistent lighting direction (top-left key light, 45°)
- Material registry for skin tones, hair colors, clothing dyes
- Each part profile tested for cell count minimums (loud failure if a required part emits < minCells)

---

## 5. Canonical Contracts

### 5.1 CHARACTER-SPEC-v1

```ts
interface CHARACTER_SPEC_v1 {
  contract: 'CHARACTER-SPEC-v1';
  id: string;                     // e.g. 'scholar.human.female.v1'
  class: 'character';
  archetype: 'human';             // species archetype (open set: human, voidborne, etc.)
  canvas: { width: 32, height: 48, gridSize: 1 };
  seed: number;                   // deterministic variation seed
  bytecode: string;               // e.g. 'VW-SCHOLAR-COMMON-RESONANT'
  
  // Presentation hints (inform silhouette, don't constrain)
  presentation: {
    gender: 'feminine' | 'masculine' | 'androgynous';
    heightClass: 'short' | 'average' | 'tall';
    buildClass: 'slender' | 'average' | 'stocky';
  };

  // Directional rendering config
  directions: Array<'south' | 'east' | 'north' | 'west'>;

  // Material overrides (default from registry if omitted)
  materials?: {
    skin?: string;                 // material id from registry
    hair?: string;
    eyes?: string;
  };

  // Body base
  body: {
    profile: string;               // e.g. 'character.body.human.feminine'
    params?: Record<string, number>;
  };

  // Face features (ordered: eyes → nose → mouth → ears)
  face: Array<{
    id: string;                    // 'leftEye' | 'rightEye' | 'nose' | 'mouth' | 'leftEar' | 'rightEar'
    profile: string;               // e.g. 'character.face.eye.almond'
    params?: Record<string, number>;
    attach: { parent: 'body', at: string }; // anchor on the body
  }>;

  // Hair
  hair: {
    profile: string;               // e.g. 'character.hair.longStraight'
    params?: { color?: string; ... };
    attach: { parent: 'body', at: 'headTop' };
  };

  // Clothing (ordered bottom-to-top in draw order)
  clothing: Array<{
    id: string;                    // 'top', 'bottom', 'shoes'
    profile: string;               // e.g. 'character.clothing.top.beginnerRobe'
    params?: Record<string, number>;
  }>;
}
```

### 5.2 CHARACTER-SKELETON-v1 (Construction Skeleton)

Extends `PB-CONSTRUCTION-SKELETON-v1` with character-specific anchors:

```ts
interface CHARACTER_SKELETON_v1 {
  contract: 'PB-CONSTRUCTION-SKELETON-v1';
  head: { top: {x:number,y:number}, center: {x:number,y:number}, chin: {x:number,y:number} };
  face: { eyeLeft: {x:number,y:number}, eyeRight: {x:number,y:number}, nose: {x:number,y:number}, mouth: {x:number,y:number}, earLeft: {x:number,y:number}, earRight: {x:number,y:number} };
  torso: { shoulderL: {x:number,y:number}, shoulderR: {x:number,y:number}, hipL: {x:number,y:number}, hipR: {x:number,y:number} };
  legs: { kneeL: {x:number,y:number}, kneeR: {x:number,y:number}, ankleL: {x:number,y:number}, ankleR: {x:number,y:number} };
}
```

All anchors are integer cells. The body base profile places them; face/hair/clothing profiles consume them.

### 5.3 Character Part Profile Contract

Each character part profile returns:

```js
{
  cells: Array<{ x: number, y: number }>,        // part-local integer occupancy
  anchors: Object<string, { x: number, y: number }> // attachment points for children
}
```

Profiles are deterministic pure functions of `(params, options)` where `options` includes canvas dimensions, direction, and the character skeleton.

---

## 6. Part Profile Library

### 6.1 Body Base Profiles

| Profile ID | Description | Params |
|---|---|---|
| `character.body.human.feminine` | Female-presenting human silhouette | `heightClass: 'short'\|'average'\|'tall'`, `buildClass: 'slender'\|'average'\|'stocky'` |
| `character.body.human.masculine` | Male-presenting human silhouette | same |
| `character.body.human.androgynous` | Androgynous human silhouette | same |
| `character.body.voidborne.feminine` | Void-touched elf-like silhouette | `heightClass`, `buildClass`, `earElongation: 0..1` |

Each body profile emits the full body silhouette for all 4 directions and declares the construction skeleton anchors.

### 6.2 Face Feature Profiles

**Eyes:**
| Profile ID | Description |
|---|---|
| `character.face.eye.round` | Large round eyes |
| `character.face.eye.almond` | Almond-shaped eyes |
| `character.face.eye.narrow` | Narrow/squinting eyes |
| `character.face.eye.voidTouched` | Glowing void-touched eyes |

Each eye profile emits 2-4 cells per eye (pixel-art scale). Left/right variants are automatically mirrored.

**Noses:**
| Profile ID | Description |
|---|---|
| `character.face.nose.small` | Small button nose (1-2 cells) |
| `character.face.nose.straight` | Straight nose (2-3 cells) |
| `character.face.nose.broad` | Wider nose (3 cells) |

**Mouths:**
| Profile ID | Description |
|---|---|
| `character.face.mouth.small` | Small closed mouth (1-2 cells) |
| `character.face.mouth.wide` | Wider closed mouth (3 cells) |
| `character.face.mouth.smile` | Slight smile curve |

**Ears:**
| Profile ID | Description |
|---|---|
| `character.face.ear.round` | Round human ear |
| `character.face.ear.pointed` | Slightly pointed ear |
| `character.face.ear.elongated` | Voidborne elongated ear |

### 6.3 Hair Profiles

| Profile ID | Description | Params |
|---|---|---|
| `character.hair.short` | Short crop | `color` |
| `character.hair.mediumStraight` | Shoulder-length straight | `color` |
| `character.hair.longStraight` | Long straight hair | `color` |
| `character.hair.ponytail` | Ponytail (directional) | `color`, `tailLength` |
| `character.hair.buzzcut` | Very short/buzzed | `color` |
| `character.hair.curly` | Curly/voluminous | `color`, `volume` |
| `character.hair.bald` | No hair (empty profile) | — |

Hair profiles are directional — the ponytail appears behind in south view, to the side in east/west views.

### 6.4 Beginner Clothing Profiles

**Tops:**
| Profile ID | Description |
|---|---|
| `character.clothing.top.beginnerRobe` | Simple cloth robe, belted |
| `character.clothing.top.beginnerTunic` | Sturdy tunic with collar |
| `character.clothing.top.beginnerShirt` | Basic linen shirt |

**Bottoms:**
| Profile ID | Description |
|---|---|
| `character.clothing.bottom.beginnerPants` | Simple trousers |
| `character.clothing.bottom.beginnerSkirt` | Knee-length skirt |
| `character.clothing.bottom.beginnerLeggings` | Fitted leggings |

**Shoes:**
| Profile ID | Description |
|---|---|
| `character.clothing.shoes.beginnerBoots` | Low boots |
| `character.clothing.shoes.beginnerSandals` | Open sandals (1-2 cells) |
| `character.clothing.shoes.beginnerSlippers` | Cloth slippers |

---

## 7. Material & Palette Authority

New materials added to `material-registry.js`:

```js
'skin_light':      { anchors: ['#FDE8D0', '#F5D0A9', '#E8B88A', '#D4A06A', '#C08850', '#A87040', '#885830'] },
'skin_medium':     { anchors: ['#E8C8A0', '#D4A878', '#C09060', '#A87848', '#906838', '#785028', '#604020'] },
'skin_dark':       { anchors: ['#C8A080', '#B08860', '#987048', '#805838', '#684830', '#503828', '#382820'] },
'skin_voidborne':  { anchors: ['#D8D0E8', '#C0B8D8', '#A898C0', '#9080A8', '#786890', '#605078', '#484060'] },
'hair_black':      { anchors: ['#1A1A20', '#2A2A32', '#3A3A44', '#4A4A56', ...] },
'hair_brown':      { anchors: ['#3A2818', '#4A3828', '#5A4838', '#6A5848', ...] },
'hair_blonde':     { anchors: ['#C8A860', '#D8B870', '#E8C880', '#F0D890', ...] },
'hair_red':        { anchors: ['#6A2010', '#8A3020', '#A84030', '#C05040', ...] },
'hair_void':       { anchors: ['#1A1030', '#2A1850', '#3A2070', '#4A2890', ...] },
'eye_brown':       { anchors: ['#3A2010', '#4A2818', '#5A3020', ...] },
'eye_blue':        { anchors: ['#102040', '#183060', '#204080', ...] },
'eye_green':       { anchors: ['#102010', '#183018', '#204020', ...] },
'eye_void_glow':   { anchors: ['#100830', '#201860', '#302890', '#4038C0', '#6050F0', '#A098FF'] },
'cloth_linen':     { anchors: ['#D8D0C0', '#C8C0B0', '#B8B0A0', '#A8A090', '#989080', ...] },
'cloth_wool':      { anchors: ['#605850', '#706860', '#807870', '#908880', ...] },
'leather_brown':   { anchors: ['#4A3020', '#5A3828', '#6A4030', '#7A4838', ...] },
```

Skin tones use the standard 7-anchor ramp (void→shadow→deep→body→frost→spectral→whiteCore). Hair and clothing materials follow the same contract. Eye materials add a glow anchor for void-touched variants.

The character creator's `region-fill-amp` pass resolves each part's fill material through the registry. Skin is mapped to `body.fills.skin`, hair to `hair.fills.hair`, etc.

---

## 8. Directional Rendering Pipeline

Characters render in 4 directions. The pipeline:

```
CHARACTER-SPEC-v1
  → for each direction in [south, east, north, west]:
      → composeSilhouette(spec, { direction })
      → applyConstructionSkeleton(spec, silhouette)
      → composeFaceParts(silhouette, spec, { direction })
      → applyHair(silhouette, spec, { direction })
      → applyClothing(silhouette, spec, { direction })
      → applyRegionFills(silhouette, spec, materialResolver)
      → renderPng(coordinates, 32, 48, scale=4)
  → assembleSpritesheet(pngs) // single 128×48 PNG (4 frames across)
```

Each direction pass is independent. Parts that are directionally aware (hair, clothing backs) receive the direction parameter and adjust cell placement accordingly.

### 8.1 Direction Parameter Effects

| Direction | Effect |
|---|---|
| `south` | Full front view. Eyes, nose, mouth visible. Hair frames face. Clothing front visible. |
| `east` | Right-facing profile. One eye visible. Hair shows side profile. Clothing side seam. |
| `north` | Back view. Hair/back of head visible. No face features. Clothing back visible. |
| `west` | Left-facing profile (mirror of east). |

East and west can share geometry via mirroring (like pauldron symmetry in the chestplate).

### 8.2 Construction Skeleton Per Direction

The construction skeleton's face anchors shift per direction:
- `south`: `eyeLeft`/`eyeRight` symmetric at head center X ±2
- `east`: only `eyeRight` visible (or renamed to `eyeVisible`), shifted slightly right
- `north`: no face anchors (all null)
- `west`: only `eyeLeft` visible, mirrored from east

---

## 9. Shape Grammar & Route

### 9.1 Grammar Definition

```js
const characterGrammar = {
  id: 'character.human.v1',
  version: '1.0.0',
  expand: (ctx) => {
    ctx.addPart(ctx.spec.body);

    for (const facePart of ctx.spec.face) ctx.addPart(facePart);
    if (ctx.spec.hair) ctx.addPart(ctx.spec.hair);
    for (const clothing of ctx.spec.clothing) ctx.addPart(clothing);

    // Required outputs (loud failures)
    ctx.requireOutput({ id: 'body-cells', kind: 'partCells', selector: 'body', minCells: 200, fatal: true });
    ctx.requireOutput({ id: 'hair-cells', kind: 'partCells', selector: 'hair', minCells: 10, fatal: true });
    ctx.requireOutput({ id: 'top-clothing-cells', kind: 'partCells', selector: 'top', minCells: 30, fatal: true });
    ctx.requireOutput({ id: 'bottom-clothing-cells', kind: 'partCells', selector: 'bottom', minCells: 20, fatal: true });
    ctx.requireOutput({ id: 'skin-material', kind: 'materialSlot', selector: 'body.fill', fatal: true });

    // Face features are optional (some characters may omit them in north view)
    if (ctx.spec.directions?.includes('south')) {
      ctx.requireOutput({ id: 'leftEye-cells', kind: 'partCells', selector: 'leftEye', minCells: 2, fatal: true });
      ctx.requireOutput({ id: 'rightEye-cells', kind: 'partCells', selector: 'rightEye', minCells: 2, fatal: true });
    }
  }
};
```

### 9.2 Microprocessor Route

The character creator follows the same seam-checked route architecture as armor/weapons:

```
SilhouetteComposer
  → ConstructionAMP (character skeleton)
  → ShapeGrammarExpansion
  → FaceComposerAMP (eyes, nose, mouth, ears)
  → HairAMP
  → ClothingAMP
  → RegionFillAMP
  → SpritesheetAssembler
```

Each step has a seam descriptor declaring consumes/emits/mutates/validates per the Agent Operating Manual §5.4.

---

## 10. Export Targets

### 10.1 Phaser Spritesheet

A 128×48 pixel PNG (4 frames of 32×48, S/E/N/W). Exported via `exportCharacterToPhaserPipeline(character)` which produces:

```js
{
  spritesheet: Buffer,           // PNG binary
  frameConfig: {                 // Phaser animation frames config
    frameWidth: 32,
    frameHeight: 48,
    frames: {
      walkSouth: [0], walkEast: [1], walkNorth: [2], walkWest: [3]
    }
  },
  pipeline: 'phaser.character.v1'
}
```

The Phaser adapter (`src/lib/phaser/phaser-runtime.adapter.js`) loads this into a `Phaser.GameObjects.Sprite` with the frame config applied.

### 10.2 Godot Scene

A `.tscn` scene file containing an `AnimatedSprite2D` node with the spritesheet texture and animation frames pre-configured. Exported via `exportCharacterToGodotScene(character)`.

The Godot scene includes:
- `SpriteFrames` resource with 4 animations (idle_south, idle_east, idle_north, idle_west)
- Character metadata as node groups and custom properties
- Ready for drag-and-drop into `BattleArena.tscn`

### 10.3 Pixel Lotus Combat Actor

A combat-actor-compatible payload for the Pixel Lotus ISO combat runtime:

```js
{
  actorId: 'scholar.human.female.v1',
  displayName: 'Scholar',
  spriteKey: 'character/scholar_human_female',
  combatProfile: {
    hp: 100, mp: 80,
    school: 'SCHOLAR',
    resonance: 50,
    stance: 'balanced',
    abilities: ['arcaneBolt', 'scholarWard', 'resonancePulse']
  },
  appearance: {
    spritesheet: '<base64>',
    frameWidth: 32,
    frameHeight: 48
  }
}
```

---

## 11. Testing & Determinism Requirements

```bash
npx vitest run tests/core/pixelbrain/character-creator.test.js
npx vitest run tests/core/pixelbrain/character-face-composer.test.js
npx vitest run tests/core/pixelbrain/character-directional-render.test.js
```

**Determinism assertion:**
```js
const a = forgeCharacter(buildScholarSpec());
const b = forgeCharacter(buildScholarSpec());
expect(a.specHash).toBe(b.specHash);
expect(a.assetPacket).toEqual(b.assetPacket);
expect(Buffer.compare(a.spritesheet, b.spritesheet)).toBe(0);
```

**Loud failure tests:**
- Character with missing body part → route fails with `PB_ROUTE_REQUIRED_OUTPUT_EMPTY`
- Character with missing hair (and hair is required) → route fails
- Character with zero-cell clothing → route fails
- South-facing character with missing eyes → route fails

**Visual quality tests:**
- Stray pixel check on all 4 directional sprites (0 orphans)
- Palette budget enforcement (≤ 32 unique colors per character)
- Silhouette connectivity check (≥ 99% of cells in main component)

---

## 12. Implementation Roadmap

**Phase 1: Body Base & Construction Skeleton**
- `character-body-profiles.js` — body silhouette profiles for 3 presentation types × 3 height classes
- `character-construction-skeleton.js` — head/face/torso/legs anchor placement
- `character-silhouette-composer.js` — extends composeSilhouette with direction parameter

**Phase 2: Face & Hair**
- `character-face-profiles.js` — 4 eye types, 3 nose types, 3 mouth types, 3 ear types
- `character-hair-profiles.js` — 7 hair styles with directional awareness
- `character-face-composer.js` — places face features on construction skeleton anchors

**Phase 3: Clothing & Materials**
- `character-clothing-profiles.js` — 3 tops, 3 bottoms, 3 shoes (beginner set)
- Material registry additions — skin tones, hair colors, eye colors, cloth/leather materials
- `character-region-fill-amp.js` — resolves materials per-part

**Phase 4: Export Pipeline**
- `character-phaser-exporter.js` — spritesheet + frame config
- `character-godot-exporter.js` — .tscn scene generation
- `character-pixel-lotus-exporter.js` — combat actor payload

**Phase 5: Testing & QA**
- Golden character PNG references committed
- Determinism tests across runs
- Loud failure tests for all required outputs
- Part profile unit tests (each profile tested independently)

---

## 13. Anti-Patterns (Explicitly Forbidden)

- Drawing the full character as a single monolithic image (defeats modularity)
- Using `Math.random()` for any visual variation (use seeded hash)
- Letting shaders invent facial features not emitted as lattice cells
- Hardcoding skin/hair/eye colors in profile logic (use material registry)
- Omitting directional rendering (north-facing characters must look correct, not just a flipped south sprite)
- Storing character appearance as raster-only (PNG is export, lattice is source)
- Creating separate specs for each direction (one spec, directional parameter)

---

## 14. Minimum Competency Checklist

- [ ] All character cells are integer lattice coordinates
- [ ] Body base, face features, hair, and clothing are independent, swappable profiles
- [ ] Same spec + seed produces byte-identical spritesheets across runs
- [ ] Required body/hair/clothing cells fail loudly when absent
- [ ] Skin/hair/eye/clothing colors resolve through material registry authority
- [ ] Four-direction spritesheet exports correctly to Phaser and Godot
- [ ] Construction skeleton provides authoritative face/body anchors
- [ ] Characters have unique visual identity per spec without nondeterministic variation
- [ ] Palette budget ≤ 32 unique colors per character
- [ ] No orphan/stray pixels in any directional sprite

---

## 15. Example CHARACTER-SPEC-v1

```js
const scholarSpec = {
  contract: 'CHARACTER-SPEC-v1',
  id: 'scholar.human.female.v1',
  class: 'character',
  archetype: 'human',
  canvas: { width: 32, height: 48, gridSize: 1 },
  seed: 0x5CH0LAR,
  bytecode: 'VW-SCHOLAR-COMMON-RESONANT',
  presentation: {
    gender: 'feminine',
    heightClass: 'average',
    buildClass: 'slender',
  },
  directions: ['south', 'east', 'north', 'west'],
  materials: {
    skin: 'skin_light',
    hair: 'hair_brown',
    eyes: 'eye_brown',
  },
  body: {
    profile: 'character.body.human.feminine',
    params: { heightClass: 1, buildClass: 0 },
  },
  face: [
    { id: 'leftEye',  profile: 'character.face.eye.almond',  attach: { parent: 'body', at: 'face.eyeLeft' } },
    { id: 'rightEye', profile: 'character.face.eye.almond',  attach: { parent: 'body', at: 'face.eyeRight' } },
    { id: 'nose',     profile: 'character.face.nose.small',   attach: { parent: 'body', at: 'face.nose' } },
    { id: 'mouth',    profile: 'character.face.mouth.small',  attach: { parent: 'body', at: 'face.mouth' } },
    { id: 'leftEar',  profile: 'character.face.ear.round',    attach: { parent: 'body', at: 'face.earLeft' } },
    { id: 'rightEar', profile: 'character.face.ear.round',    attach: { parent: 'body', at: 'face.earRight' } },
  ],
  hair: {
    profile: 'character.hair.longStraight',
    params: { color: 'hair_brown' },
    attach: { parent: 'body', at: 'headTop' },
  },
  clothing: [
    { id: 'bottom', profile: 'character.clothing.bottom.beginnerSkirt' },
    { id: 'top',    profile: 'character.clothing.top.beginnerRobe' },
    { id: 'shoes',  profile: 'character.clothing.shoes.beginnerBoots' },
  ],
};

const character = forgeCharacter(scholarSpec);
// → { spec, assetPacket, sprites: { south, east, north, west }, spritesheet, godotScene, pixelLotusActor }
```

---

## 16. Final Operating Principle Check

**Authoritative lattice:** Integer cells emitted by body/face/hair/clothing part profiles, composed via the directional silhouette composer.  
**Owning contract:** `PixelBrainAssetPacket` + `PB-CONSTRUCTION-SKELETON-v1` + `CHARACTER-SPEC-v1`.  
**Deterministic processor:** `forgeCharacter` → `composeSilhouette(dir)` → `CharacterFactory` route → `region-fill-amp` → `SpritesheetAssembler`.  
**Proof test:** `character-creator.test.js` + golden spritesheet comparison + repeated forge equality across all 4 directions.

When these four answers are unambiguous, the character creator is aligned with PixelBrain.

---

*End of PDR*

