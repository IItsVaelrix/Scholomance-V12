# PDR: Pixel Lotus Actor Forge and Isometric Combat Runtime

> Copy-ready filename: `2026-06-10-pixel-lotus-actor-forge-iso-combat-runtime-pdr.md`
> Catalog target: `docs/scholomance-encyclopedia/PDR-archive/2026-06-10-pixel-lotus-actor-forge-iso-combat-runtime-pdr.md`

---

## Owner(s)

* **Codex:** schemas, layer law, engine architecture, deterministic projection math, actor contracts, import adapters, runtime tests.
* **Claude:** UI kit, visual design, a11y, debug overlays, interaction affordances, combat readability.
* **Gemini:** backend implementation, CI, asset pipeline validation, performance tests, import/export test harnesses.
* **Escalation owner:** Angel / Vaelrix.

---

## Document Status

**Status:** Draft for implementation
**Date:** 2026-06-10
**Project Family:** Scholomance / PixelBrain / Pixel Lotus / Combat Runtime
**Primary Classification:** Architectural
**Secondary Classification:** Structural + Behavioral
**Priority:** Critical
**Primary Goal:** Convert Pixel Lotus into a native actor/sprite composition forge and establish the first deterministic isometric runtime contract for map traversal, actor animation, and real-time sigil combat.

---

## Seed

Pixel Lotus should not directly depend on Universal LPC Sprite Sheet Generator or inherit its code/assets as a runtime dependency. Instead, Pixel Lotus should adopt the architectural pattern: layered sprite assembly, animation manifests, palette/material variation, provenance tracking, and import adapters.

This PDR defines a Pixel Lotus-native Actor Forge and IsoScene Runtime so the current combat page can evolve into a playable 2.5D isometric map with walking actors, layered sprites, deterministic depth sorting, and real-time spell combat.

---

## Target Integration Area

Primary target areas:

```txt
src/pixel-lotus/
src/pixel-lotus/actor-forge/
src/pixel-lotus/importers/
src/game/iso/
src/pages/internal/pixel-lotus/
src/pages/combat/
docs/scholomance-encyclopedia/PDR-archive/
```

Secondary integration areas:

```txt
src/lib/processor-bridge.js
src/core/animation/
src/data/schools.js
src/game/combat/
src/game/runtime/
```

Existing PixelBrain/Lotus-adjacent systems expected to participate:

```txt
image-texturing.js
template-grid-engine.js
lattice-grid-engine.js
formula-to-coordinates.js
coordinate-mapping.js
color-byte-mapping.js
procedural-noise.js
physics-extensions.js
extension-registry.js
bytecode-error.js
image-to-pixel-art.js
symmetry-amp.js
coord-symmetry-amp.js
```

---

## Core Concept

Pixel Lotus becomes the canonical raster actor forge: it composes bodies, clothing, weapons, auras, glyphs, shadows, and school-tinted materials into deterministic sprite sheets. Universal LPC is treated as a reference pattern and optional import format, not as the native engine contract.

The isometric combat runtime then consumes these Pixel Lotus actor sheets and projects them into a 2.5D world. The map is a deterministic spatial contract, not a painted backdrop. Tiles, actors, props, spell fields, collision, click-targeting, and render depth all resolve through one shared IsoScene model.

In plain language:

```txt
Layered Actor Parts
→ Pixel Lotus Composition
→ Actor Sprite Sheet + Animation Manifest
→ IsoScene Actor Runtime
→ Isometric Map Movement
→ Real-Time Sigil Combat
```

The metaphor: Pixel Lotus becomes the wardrobe, skeleton, loom, and printing press. IsoScene becomes the stage. Combat becomes a living sigil-board where formulas are not just effects, but playable space.

---

## Implementation Philosophy

Treat this as a real engineering handoff for an AI coding agent and future maintainers.

Prefer:

* Small composable edits.
* Native Pixel Lotus contracts before import adapters.
* Deterministic schema boundaries.
* Adapter layers where external contracts are uncertain.
* No direct runtime dependency on Universal LPC.
* No copied external source code without explicit legal review.
* No production use of external assets without provenance tracking.
* Existing behavior preserved unless explicitly scoped.
* Debug overlays before full gameplay complexity.
* One shared projection contract for rendering, movement, hit testing, and spell targeting.

Do not:

* Hardcode LPC row assumptions into the game runtime.
* Let Phaser, Canvas, PixiJS, or React own composition logic.
* Let imported sprite sheet structure become the native actor schema.
* Implement real-time combat before click-to-move, depth sorting, and animation playback are stable.
* Create one-off combat-page hacks that cannot survive map/editor integration.

---

## 1. Executive Summary

This PDR introduces two connected systems:

1. **Pixel Lotus Actor Forge**

   * A native layered sprite composition system for humanoid and creature actors.
   * Supports body bases, garments, weapons, relics, auras, glyphs, shadows, palettes, materials, and animation manifests.
   * Can import Universal LPC-style sheets through an adapter, but does not depend on LPC directly.

2. **IsoScene Runtime**

   * A deterministic 2.5D isometric map runtime.
   * Supports tile projection, depth sorting, click-to-move, actor facing, walking animation, collision occupancy, spell telegraphs, and real-time combat fields.
   * Converts the current combat page into an IsoMap Sandbox before full combat implementation.

The first deliverable is not a full game. The first deliverable is a playable vertical slice:

```txt
IsoMap Sandbox
→ generated or static isometric map
→ one controllable actor
→ click-to-move
→ walk/idle animation
→ correct facing
→ depth sorting behind props
→ debug overlays
```

Once that works, combat can be added safely.

---

## 2. Change Classification

### Primary Classification

**Architectural**

This introduces native contracts for actor composition, sprite manifests, isometric projection, depth sorting, movement, and future real-time spell combat.

### Secondary Classifications

| Category           | Classification | Reason                                                         |
| ------------------ | -------------- | -------------------------------------------------------------- |
| UI                 | Structural     | Combat page becomes an isometric scene surface.                |
| Runtime            | Behavioral     | Actors gain movement, facing, animation states, and collision. |
| Asset Pipeline     | Architectural  | Pixel Lotus gains a native actor forge and import adapters.    |
| Visual System      | Structural     | Layered sprites become composable raster outputs.              |
| Legal / Provenance | Preventative   | External sprite imports require source tracking.               |

### Non-goals

* Full combat implementation in phase 1.
* Multiplayer.
* Final production art.
* Direct LPC code dependency.
* Direct LPC asset dependency without provenance.
* Replacing all existing combat logic immediately.
* Porting the entire game to Godot or Phaser as part of this PDR.

---

## 3. Spec Sheet

### Feature Name

**Pixel Lotus Actor Forge and Isometric Combat Runtime**

### Short Name

`pixel-lotus-actor-forge-iso-runtime`

### Bytecode Search Code

`SCHOL-ENC-BYKE-SEARCH-PDR-PIXEL-LOTUS-ACTOR-FORGE-ISO-RUNTIME`

### Runtime Namespaces

```txt
pixelLotus.actorForge
pixelLotus.importers.lpc
iso.scene
iso.projection
iso.actor
iso.combat
```

### Primary User Outcome

The user can open an internal lab, spawn a Pixel Lotus actor onto an isometric map, click a tile, and watch the actor walk there with correct direction, animation, and depth sorting.

### Engineering Outcome

The codebase gains reusable contracts for:

* actor layer stacks
* animation manifests
* sprite provenance
* external sheet import adapters
* isometric coordinate conversion
* screen-to-cell hit testing
* render sort keys
* real-time spell telegraph geometry

### Style Outcome

The game develops a unique visual language:

```txt
Dofus/Wakfu-inspired readability
+ Star Ocean-inspired real-time movement
+ Scholomance sigil/combat math
+ PixelBrain procedural geometry
+ Pixel Lotus deterministic raster composition
```

---

## 4. Assumptions and Unknowns

### Assumptions

1. Pixel Lotus is intended to become the canonical raster composition layer.
2. PixelBrain coordinate/formula systems can feed Lotus but should not own final raster assembly.
3. The current combat page can be converted into an internal sandbox before replacing production gameplay.
4. Universal LPC should be treated as inspiration and optional import source, not native truth.
5. The first playable milestone should prove movement and rendering before battle mechanics.
6. Current animation/AMP systems can provide motion discipline and deterministic timing.
7. Existing bytecode error infrastructure should report schema, import, projection, and runtime failures.

### Unknowns

1. Exact current location of the combat page implementation.
2. Whether Phaser, Canvas, PixiJS, or React currently owns the combat render surface.
3. Whether the current game engine already has an entity-component pattern.
4. Whether the repo has an existing pathfinding module.
5. Whether imported sprites should be stored as raw image sheets, coordinate buffers, or composed Lotus CELS.
6. Whether final runtime target is browser-only, Godot bridge, or both.
7. Exact school IDs and material mappings required for actor palettes.
8. Whether licensing/provenance should be enforced at build time or only in editor UI.

### Required Discovery Before Implementation

Codex must locate:

```txt
src/pages/combat/
src/pages/Combat/
src/game/combat/
src/game/runtime/
src/pixel-lotus/
src/lib/processor-bridge.js
src/data/schools.js
docs/scholomance-encyclopedia/Scholomance LAW/
AGENTS.md
CLAUDE.md
GEMINI.md
```

If any path does not exist, Codex must report the nearest equivalent before creating new directories.

---

## 5. Architecture Diagram / File Map

### 5.1 Proposed File Map

```txt
src/pixel-lotus/
  actor-forge/
    pixelLotusActor.schema.ts
    pixelLotusActorLayer.schema.ts
    pixelLotusAnimationManifest.schema.ts
    pixelLotusActorForge.ts
    pixelLotusLayerStack.ts
    pixelLotusPaletteResolver.ts
    pixelLotusSpriteSheetExporter.ts
    pixelLotusProvenance.schema.ts
    pixelLotusActorForge.errors.ts
    index.ts

  importers/
    lpc/
      lpcImportManifest.schema.ts
      lpcAnimationMap.ts
      lpcToPixelLotusActor.ts
      lpcProvenanceAdapter.ts
      lpcImport.errors.ts
      index.ts

src/game/iso/
  contracts/
    isoTile.schema.ts
    isoActor.schema.ts
    isoMap.schema.ts
    isoScene.schema.ts
    isoCombat.schema.ts

  math/
    isoProjection.ts
    isoDepthSort.ts
    isoHitTest.ts
    isoPathing.ts
    isoFacing.ts

  runtime/
    createIsoSceneRuntime.ts
    isoActorController.ts
    isoMovementSystem.ts
    isoCollisionSystem.ts
    isoSpellTelegraphSystem.ts
    isoRuntime.errors.ts

  rendering/
    IsoMapCanvas.jsx
    IsoTileLayer.jsx
    IsoPropLayer.jsx
    IsoActorLayer.jsx
    IsoSpellTelegraphLayer.jsx
    IsoDebugOverlay.jsx

src/pages/internal/pixel-lotus/
  ActorForgeLab.jsx
  ActorForgeLab.module.css
  IsoMapSandbox.jsx
  IsoMapSandbox.module.css

docs/scholomance-encyclopedia/PDR-archive/
  2026-06-10-pixel-lotus-actor-forge-iso-combat-runtime-pdr.md
```

### 5.2 Ownership Map

| Path                              | Owner  | Notes                                       |
| --------------------------------- | ------ | ------------------------------------------- |
| `src/pixel-lotus/actor-forge/`    | Codex  | Native schema and composition logic.        |
| `src/pixel-lotus/importers/lpc/`  | Codex  | Adapter only. No direct runtime dependency. |
| `src/game/iso/contracts/`         | Codex  | Shared deterministic scene contracts.       |
| `src/game/iso/math/`              | Codex  | Projection, hit testing, sort keys.         |
| `src/game/iso/runtime/`           | Codex  | Movement, collision, scene update loop.     |
| `src/game/iso/rendering/`         | Claude | UI/visual layer over Codex contracts.       |
| `src/pages/internal/pixel-lotus/` | Claude | Labs, inspectors, previews, debug panels.   |
| `docs/.../PDR-archive/`           | Codex  | Documentation and implementation handoff.   |

### 5.3 ESCALATION Block

```txt
ESCALATION:
  Trigger: Any implementation requires changing existing combat rules, deleting current combat page behavior, or making external LPC assets part of production.
  Owner: Angel / Vaelrix
  Required Output: Before/after contract, affected files, licensing implication, rollback plan.
```

---

## 6. Core Contracts

### 6.1 Pixel Lotus Actor Layer

```ts
export type PixelLotusActorLayerSlot =
  | 'base'
  | 'face'
  | 'hair'
  | 'robe'
  | 'armor'
  | 'relic'
  | 'weapon'
  | 'aura'
  | 'glyph'
  | 'shadow'
  | 'custom';

export type PixelLotusBlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay';

export type PixelLotusActorLayer = {
  id: string;
  slot: PixelLotusActorLayerSlot;
  assetId: string;
  visible: boolean;
  locked: boolean;
  zIndex: number;
  opacity: number;
  paletteId?: string;
  materialId?: string;
  blendMode: PixelLotusBlendMode;
};
```

### 6.2 Pixel Lotus Actor Build

```ts
export type PixelLotusActorBuild = {
  schemaVersion: 'pixel-lotus-actor-v1';
  id: string;
  displayName: string;
  rigId: 'humanoid_8dir_v1' | 'creature_4dir_v1' | string;
  schoolAffinity?: string;
  layers: PixelLotusActorLayer[];
  animationManifestId: string;
  provenanceId?: string;
};
```

### 6.3 Animation Manifest

```ts
export type IsoFacing =
  | 'N'
  | 'NE'
  | 'E'
  | 'SE'
  | 'S'
  | 'SW'
  | 'W'
  | 'NW';

export type PixelLotusAnimationName =
  | 'idle'
  | 'walk'
  | 'run'
  | 'cast'
  | 'attack'
  | 'hurt'
  | 'down';

export type PixelLotusAnimationManifest = {
  schemaVersion: 'pixel-lotus-animation-manifest-v1';
  id: string;
  frameWidth: number;
  frameHeight: number;
  directions: IsoFacing[];
  animations: Record<PixelLotusAnimationName, {
    frames: number;
    fps: number;
    loop: boolean;
    rowsByFacing: Partial<Record<IsoFacing, number>>;
  }>;
};
```

### 6.4 Provenance Manifest

```ts
export type PixelLotusProvenance = {
  schemaVersion: 'pixel-lotus-provenance-v1';
  id: string;
  sourceKind:
    | 'native'
    | 'user-authored'
    | 'external-import'
    | 'generated'
    | 'unknown';
  sourceName?: string;
  sourceUrl?: string;
  license?: string;
  authors?: string[];
  requiredAttribution?: string[];
  productionAllowed: boolean;
  notes?: string[];
};
```

### 6.5 Iso Tile

```ts
export type IsoTile = {
  id: string;
  col: number;
  row: number;
  height: number;
  terrain:
    | 'stone'
    | 'grass'
    | 'water'
    | 'void'
    | 'metal'
    | 'crystal'
    | 'fabric'
    | 'energy';
  walkable: boolean;
  blocksSight: boolean;
  movementCost: number;
  elevation: number;
  schoolAffinity?: string;
  textureSeed: string;
};
```

### 6.6 Iso Actor Runtime State

```ts
export type IsoActorState = {
  id: string;
  actorBuildId: string;
  spriteSheetId: string;
  animationManifestId: string;
  animation: PixelLotusAnimationName;
  facing: IsoFacing;
  gridPosition: {
    col: number;
    row: number;
    z: number;
  };
  worldPosition: {
    x: number;
    y: number;
    z: number;
  };
  velocity: {
    x: number;
    y: number;
  };
  radius: number;
  team: 'player' | 'enemy' | 'neutral';
};
```

### 6.7 Iso Scene

```ts
export type IsoScene = {
  schemaVersion: 'iso-scene-v1';
  id: string;
  tileWidth: number;
  tileHeight: number;
  origin: {
    x: number;
    y: number;
  };
  map: {
    cols: number;
    rows: number;
    tiles: IsoTile[];
  };
  actors: IsoActorState[];
  props: IsoProp[];
  spellFields: IsoSpellField[];
};
```

---

## 7. Isometric Projection Contract

### 7.1 Cell to Screen

```ts
export function isoCellToScreen(
  col: number,
  row: number,
  z: number,
  scene: Pick<IsoScene, 'tileWidth' | 'tileHeight' | 'origin'>
) {
  const x = scene.origin.x + ((col - row) * scene.tileWidth) / 2;
  const y = scene.origin.y + ((col + row) * scene.tileHeight) / 2 - z;
  return { x, y };
}
```

### 7.2 Screen to Cell

```ts
export function screenToIsoCell(
  screenX: number,
  screenY: number,
  scene: Pick<IsoScene, 'tileWidth' | 'tileHeight' | 'origin'>
) {
  const localX = screenX - scene.origin.x;
  const localY = screenY - scene.origin.y;

  const col = Math.floor((localY / (scene.tileHeight / 2) + localX / (scene.tileWidth / 2)) / 2);
  const row = Math.floor((localY / (scene.tileHeight / 2) - localX / (scene.tileWidth / 2)) / 2);

  return { col, row };
}
```

### 7.3 Depth Sort Key

```ts
export function getIsoDepthSortKey(entity: {
  col: number;
  row: number;
  z?: number;
  layerOffset?: number;
}) {
  return (entity.col + entity.row) * 1000 + (entity.z ?? 0) + (entity.layerOffset ?? 0);
}
```

### 7.4 Invariant

Every system must use the same projection functions:

```txt
rendering
movement
hit testing
spell targeting
debug overlays
path previews
```

No system may implement private isometric math.

---

## 8. Universal LPC Logic Adoption Policy

### 8.1 Allowed

Pixel Lotus may adopt the following patterns:

* Layered sprite composition.
* Animation row manifests.
* Directional frame mapping.
* Equipment slot layering.
* Palette swapping.
* Import/export manifests.
* Provenance tracking.
* Preview lab UX concepts.

### 8.2 Not Allowed Without Explicit Review

* Copying Universal LPC source code into the repo.
* Shipping LPC assets without attribution/provenance manifest.
* Treating LPC sheet layout as native engine law.
* Making external license terms invisible to the build/editor.
* Using GPL-covered code in a way that contaminates intended closed/proprietary targets.

### 8.3 Adapter Strategy

The LPC importer must emit Pixel Lotus-native data:

```txt
LPC Source Sheet
→ LPC Import Manifest
→ Provenance Manifest
→ Pixel Lotus Actor Build
→ Pixel Lotus Animation Manifest
→ Runtime Sprite Sheet
```

After import, runtime systems consume only Pixel Lotus contracts.

---

## 9. UI Kit: Scholomance Isometric Diorama

### 9.1 Style Name

**Scholomance Isometric Diorama**

### 9.2 Visual Language

| Element   | Direction                                                      |
| --------- | -------------------------------------------------------------- |
| Camera    | Fixed 2.5D isometric.                                          |
| Tiles     | Diamond tiles with subtle extrusion and contact shadows.       |
| Props     | Tall silhouettes, readable occlusion, school-affinity accents. |
| Actors    | Layered pixel/raster sprites with magical overlays.            |
| Combat FX | Sigil-first telegraphs before impact.                          |
| UI Panels | Scholomance dark glass, brass/rune accents, clean labels.      |
| Debug     | Toggleable overlays, not permanent clutter.                    |

### 9.3 Dofus/Wakfu Inspiration Boundary

Keep:

* readable isometric playfield
* charming tile-map clarity
* strong silhouettes
* bright strategic affordances
* map-as-stage feeling

Avoid:

* copied proportions
* copied tile silhouettes
* copied UI ornament language
* copied character styling
* turn-based pacing unless explicitly scoped later

### 9.4 Star Ocean Inspiration Boundary

Keep:

* real-time movement
* active combat flow
* character-controlled arena feel
* quick attacks and spell casts

Avoid:

* camera chaos
* unreadable spell spam
* combo systems before movement foundation
* high-speed action before hit testing is stable

---

## 10. Real-Time Sigil Combat Model

### 10.1 Core Loop

```txt
Player input
→ movement vector / click path
→ actor facing update
→ animation state update
→ collision check
→ spell cast intent
→ spell telegraph geometry
→ hit resolution
→ effect animation
→ bytecode event log
```

### 10.2 Spell Field Types

```ts
export type IsoSpellFieldShape =
  | 'line'
  | 'cone'
  | 'circle'
  | 'ring'
  | 'sigil'
  | 'thread'
  | 'fractal'
  | 'tile-pattern';
```

### 10.3 Spell Field Contract

```ts
export type IsoSpellField = {
  id: string;
  casterId: string;
  shape: IsoSpellFieldShape;
  schoolId: string;
  createdAtMs: number;
  windupMs: number;
  activeMs: number;
  recoveryMs: number;
  geometry: {
    origin: { col: number; row: number; z: number };
    target?: { col: number; row: number; z: number };
    radius?: number;
    width?: number;
    angleDeg?: number;
    formulaId?: string;
  };
  damage?: {
    amount: number;
    type: string;
  };
};
```

### 10.4 Combat Rule

Every damaging spell must have a readable pre-impact state:

```txt
telegraph
→ active hit window
→ aftermath
```

No instant invisible damage fields in the first implementation.

---

## 11. Step-by-Step Implementation Plan

### Phase 0: Discovery and Guardrails

1. Locate existing combat page and game runtime files.
2. Locate existing Pixel Lotus files.
3. Confirm current rendering host.
4. Confirm law/agent ownership docs.
5. Add implementation notes to this PDR if discovered paths differ.

Deliverable:

```txt
implementation-discovery-report.md
```

Gate:

```txt
No code changes until file ownership and current render host are identified.
```

---

### Phase 1: Pixel Lotus Actor Schema

Create:

```txt
src/pixel-lotus/actor-forge/pixelLotusActor.schema.ts
src/pixel-lotus/actor-forge/pixelLotusActorLayer.schema.ts
src/pixel-lotus/actor-forge/pixelLotusAnimationManifest.schema.ts
src/pixel-lotus/actor-forge/pixelLotusProvenance.schema.ts
```

Requirements:

* Strict TypeScript types or JSON-schema equivalent.
* No dependency on LPC naming.
* Include provenance from the beginning.
* Include animation manifest from the beginning.
* Include layer z-order and blend mode from the beginning.

Gate:

```txt
Schema tests pass.
Invalid layer slot fails.
Invalid frame dimensions fail.
Missing provenance defaults to sourceKind: "unknown".
```

---

### Phase 2: Actor Forge Composer

Create:

```txt
src/pixel-lotus/actor-forge/pixelLotusActorForge.ts
src/pixel-lotus/actor-forge/pixelLotusLayerStack.ts
src/pixel-lotus/actor-forge/pixelLotusPaletteResolver.ts
src/pixel-lotus/actor-forge/pixelLotusSpriteSheetExporter.ts
```

Requirements:

* Compose ordered layers into a deterministic output.
* Palette changes must not mutate source assets.
* Blend mode must be explicit.
* Missing optional layers must not crash composition.
* Output must include a manifest hash.

Gate:

```txt
Same actor build + same assets + same palette = same output hash.
Layer order changes output hash.
Hidden layer does not affect output pixels.
```

---

### Phase 3: LPC Import Adapter

Create:

```txt
src/pixel-lotus/importers/lpc/lpcImportManifest.schema.ts
src/pixel-lotus/importers/lpc/lpcAnimationMap.ts
src/pixel-lotus/importers/lpc/lpcToPixelLotusActor.ts
src/pixel-lotus/importers/lpc/lpcProvenanceAdapter.ts
```

Requirements:

* LPC adapter outputs Pixel Lotus-native actor build.
* Adapter stores all external source/provenance metadata.
* Adapter does not become a runtime dependency.
* Adapter may be removed without breaking native Pixel Lotus actors.

Gate:

```txt
Imported actor can preview in ActorForgeLab.
Imported actor carries sourceKind: external-import.
Missing license marks productionAllowed: false.
```

---

### Phase 4: Actor Forge Lab

Create:

```txt
src/pages/internal/pixel-lotus/ActorForgeLab.jsx
src/pages/internal/pixel-lotus/ActorForgeLab.module.css
```

UI requirements:

* Actor preview canvas.
* Layer list.
* Layer visibility toggles.
* Palette selector.
* Animation selector.
* Direction selector.
* Provenance panel.
* Export manifest preview.
* Debug hash display.

Gate:

```txt
User can switch idle/walk/cast.
User can rotate through 8 facings.
User can toggle layer visibility.
User can see provenance status.
```

---

### Phase 5: IsoScene Contracts and Math

Create:

```txt
src/game/iso/contracts/
src/game/iso/math/
```

Functions required:

```txt
isoCellToScreen
screenToIsoCell
getIsoDepthSortKey
velocityToFacing
resolveIsoTileAtScreenPoint
```

Gate:

```txt
Projection roundtrip tests pass for known cells.
Depth sort places actor behind taller prop when expected.
All facings resolve from movement vectors.
```

---

### Phase 6: IsoMap Sandbox

Create:

```txt
src/pages/internal/pixel-lotus/IsoMapSandbox.jsx
src/pages/internal/pixel-lotus/IsoMapSandbox.module.css
```

Features:

* Static generated test map.
* One controllable actor.
* Click-to-move.
* Idle/walk animation switching.
* Facing follows movement.
* Debug overlay for cell coordinates.
* Depth sort visualization.

Gate:

```txt
Actor walks to clicked tile.
Actor stops and returns to idle.
Actor faces the movement direction.
Actor appears behind/above props correctly.
Debug overlay can be toggled.
```

---

### Phase 7: Combat Page Adapter

After sandbox passes:

1. Wrap existing combat page with an adapter.
2. Do not delete existing combat logic.
3. Add feature flag:

```ts
const ENABLE_ISO_COMBAT_SANDBOX = false;
```

4. Route internal sandbox separately until stable.

Gate:

```txt
Existing combat page still works with flag off.
Iso sandbox loads with flag on or internal route.
No regression to current combat UI.
```

---

### Phase 8: Real-Time Spell Telegraph Prototype

Implement only one test spell:

```txt
Spell: Arc Line
Shape: line
Behavior: telegraph → active → fade
Damage: optional/no-op in first pass
```

Gate:

```txt
Line telegraph appears from actor toward target cell.
Telegraph uses same iso projection as map.
Telegraph disappears after lifecycle completes.
No actor damage required in first spell prototype.
```

---

## 12. Code Examples

### 12.1 Velocity to Facing

```ts
import type { IsoFacing } from '../contracts/isoActor.schema';

export function velocityToFacing(dx: number, dy: number): IsoFacing {
  if (dx === 0 && dy === 0) return 'S';

  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  const normalized = (angle + 360) % 360;

  if (normalized >= 337.5 || normalized < 22.5) return 'E';
  if (normalized < 67.5) return 'SE';
  if (normalized < 112.5) return 'S';
  if (normalized < 157.5) return 'SW';
  if (normalized < 202.5) return 'W';
  if (normalized < 247.5) return 'NW';
  if (normalized < 292.5) return 'N';
  return 'NE';
}
```

### 12.2 Resolve Animation Frame

```ts
export function resolveActorFrame({
  manifest,
  animation,
  facing,
  timeMs,
}: {
  manifest: PixelLotusAnimationManifest;
  animation: PixelLotusAnimationName;
  facing: IsoFacing;
  timeMs: number;
}) {
  const animationDef = manifest.animations[animation];
  const fps = Math.max(1, animationDef.fps);
  const frameDurationMs = 1000 / fps;
  const frameIndex = animationDef.loop
    ? Math.floor(timeMs / frameDurationMs) % animationDef.frames
    : Math.min(animationDef.frames - 1, Math.floor(timeMs / frameDurationMs));

  return {
    row: animationDef.rowsByFacing[facing] ?? 0,
    col: frameIndex,
    frameWidth: manifest.frameWidth,
    frameHeight: manifest.frameHeight,
  };
}
```

### 12.3 Layer Composition Order

```ts
export function sortActorLayers(layers: PixelLotusActorLayer[]) {
  return [...layers]
    .filter((layer) => layer.visible)
    .sort((left, right) => {
      if (left.zIndex !== right.zIndex) {
        return left.zIndex - right.zIndex;
      }

      return left.id.localeCompare(right.id);
    });
}
```

### 12.4 Iso Runtime Update Skeleton

```ts
export function updateIsoSceneRuntime(scene: IsoScene, deltaMs: number) {
  const nextActors = scene.actors.map((actor) => {
    const nextPosition = integrateActorMovement(actor, deltaMs);
    const facing = velocityToFacing(actor.velocity.x, actor.velocity.y);

    return {
      ...actor,
      worldPosition: nextPosition,
      facing,
      animation: isActorMoving(actor) ? 'walk' : 'idle',
    };
  });

  return {
    ...scene,
    actors: nextActors,
  };
}
```

### 12.5 Spell Telegraph Lifecycle

```ts
export function getSpellFieldPhase(field: IsoSpellField, nowMs: number) {
  const age = nowMs - field.createdAtMs;

  if (age < field.windupMs) return 'telegraph';
  if (age < field.windupMs + field.activeMs) return 'active';
  if (age < field.windupMs + field.activeMs + field.recoveryMs) return 'recovery';

  return 'expired';
}
```

---

## 13. Glossary

### Pixel Lotus

The deterministic raster composition layer for PixelBrain-derived visual outputs. It owns final pixel assembly, layer stacks, and canonical composed buffers.

### Actor Forge

A Pixel Lotus subsystem that builds game-ready actors from layered parts, palettes, animation manifests, and provenance metadata.

### Universal LPC

An open-source sprite sheet generator and asset ecosystem. In this PDR, it is a reference architecture and optional import format, not a native runtime dependency.

### Provenance Manifest

A record describing where an actor layer or sprite sheet came from, who authored it, what license applies, and whether it is allowed in production.

### IsoScene

The canonical isometric runtime state. It contains map tiles, actors, props, spell fields, projection constants, and scene metadata.

### Iso Projection

The math that converts grid cells to screen pixels and screen pixels back to grid cells.

### Depth Sort Key

A deterministic number used to sort tiles, props, actors, and spell effects so the scene renders in correct visual order.

### Spell Telegraph

A visible pre-impact combat field that tells the player where a spell will resolve before it becomes active.

### Real-Time Sigil Combat

A combat model where actors move in real time, but attacks and spells resolve through readable geometric fields.

### CELS

The layer-stack model used by Pixel Lotus to compose final raster output.

---

## 14. Q&A: Top Implementation Concerns

### Q1. Why not use Universal LPC directly?

Because Pixel Lotus needs to own its native contracts. Universal LPC can inspire composition logic and serve as an import source, but direct dependency risks style lock-in, license complexity, and runtime assumptions that do not belong to Scholomance.

### Q2. Can LPC assets be used for prototyping?

Yes, if they are tracked as external imports with provenance and license metadata. Production use requires explicit review.

### Q3. Should the combat page be replaced immediately?

No. Build `IsoMapSandbox` first. Only adapt the combat page after movement, animation, and depth sorting are stable.

### Q4. Why is movement before combat?

Because real-time combat depends on projection, hit testing, facing, animation, and collision. If walking is wrong, combat will be wrong in louder clothes.

### Q5. Should actors move on exact tiles or freely?

Phase 1 should use click-to-tile pathing. Later phases can support analog/free movement inside tile constraints.

### Q6. Should spell targeting use grid cells or pixel coordinates?

Both, but grid cells are source of truth. Pixel coordinates are render projection.

### Q7. Where should depth sorting happen?

In `src/game/iso/math/isoDepthSort.ts`, not inside React components.

### Q8. What happens when an actor walks behind a tall prop?

The prop and actor must sort by shared depth key plus layer offset. Tall props may also define occlusion volumes.

### Q9. Can PixelBrain formulas generate spell areas?

Yes. The spell field contract should support formula-backed geometry so future spells can use parametric curves, fractals, grids, and sigils.

### Q10. Is this a game engine rewrite?

No. It is a contained runtime slice. Existing combat behavior should remain behind its current path/flag until IsoScene proves itself.

---

## 15. QA Plan

### 15.1 Schema Tests

* Valid actor build passes.
* Missing actor ID fails.
* Invalid layer slot fails.
* Invalid blend mode fails.
* Invalid animation name fails.
* Missing provenance defaults safely.
* External import without license sets `productionAllowed: false`.

### 15.2 Composition Tests

* Same input produces same output hash.
* Layer order affects output deterministically.
* Hidden layer does not affect output.
* Palette swap does not mutate source.
* Missing optional layer does not crash.
* Blend mode output is stable.

### 15.3 Import Adapter Tests

* LPC-style manifest imports into Pixel Lotus actor build.
* LPC-style animation rows map to native animation manifest.
* Missing license triggers warning/error.
* Import adapter output can be removed from runtime and native actor still works.

### 15.4 Projection Tests

* `isoCellToScreen(0,0,0)` returns scene origin.
* `screenToIsoCell(isoCellToScreen(x,y,z))` returns expected cell for test grid.
* Negative screen coordinates fail safely.
* Edge cells resolve correctly.
* Depth sort order is deterministic.

### 15.5 Movement Tests

* Actor receives click target.
* Actor path resolves to walkable cells.
* Actor avoids blocked cells.
* Actor stops at destination.
* Actor returns to idle.
* Actor facing changes for all 8 directions.

### 15.6 Rendering Tests

* Tile layer renders before actor layer.
* Actor renders behind prop when appropriate.
* Actor renders in front of lower prop when appropriate.
* Debug overlay aligns with cells.
* No CSS scaling blur on pixel/raster assets.

### 15.7 Combat Telegraph Tests

* Telegraph appears during windup.
* Telegraph enters active phase.
* Telegraph fades or exits during recovery.
* Expired telegraph is removed.
* Telegraph geometry aligns with map cells.

### 15.8 Regression Tests

* Existing combat page loads unchanged when feature flag is off.
* Existing PixelBrain/Lotus render path still works.
* Existing image-to-pixel systems still work.
* Existing bytecode error format remains compatible.

---

## 16. Acceptance Criteria

Phase 1 is accepted when:

```txt
ActorForgeLab can preview a Pixel Lotus-native actor.
ActorForgeLab can preview at least idle and walk states.
ActorForgeLab can rotate actor through all supported directions.
IsoMapSandbox renders an isometric map.
IsoMapSandbox supports click-to-move.
Actor movement updates facing.
Actor switches idle/walk animation correctly.
Depth sorting works against at least one prop.
Debug overlay can be toggled.
Existing combat page remains available.
```

Phase 2 is accepted when:

```txt
LPC-style import adapter produces Pixel Lotus-native actor build.
Imported actor includes provenance metadata.
Imported actor can be previewed in ActorForgeLab.
Production-blocked provenance is visible in UI.
No LPC-specific assumptions leak into IsoScene runtime.
```

Phase 3 is accepted when:

```txt
One real-time spell telegraph renders on IsoMapSandbox.
Spell telegraph uses shared projection math.
Spell lifecycle is deterministic.
Expired spell fields are cleaned up.
No damage/combat balance required yet.
```

---

## 17. Risks and Mitigations

| Risk                           | Severity | Mitigation                                                    |
| ------------------------------ | -------: | ------------------------------------------------------------- |
| LPC license contamination      |     High | Adapter only, provenance required, no direct source copy.     |
| Style mismatch                 |   Medium | Pixel Lotus-native palettes/materials override imported look. |
| Projection math divergence     |     High | Centralized `isoProjection.ts`; no private math.              |
| Depth sorting bugs             |     High | Dedicated sort-key tests and debug overlay.                   |
| Combat page regression         |     High | Feature flag and internal sandbox first.                      |
| Asset pipeline sprawl          |   Medium | Native Actor Forge schema before adapters.                    |
| Real-time combat unreadability |   Medium | Mandatory telegraphs before active hit windows.               |
| Performance issues             |   Medium | Compose sheets offline/editor-side where possible.            |
| Unclear ownership              |   Medium | Architecture/file map ownership required before code.         |

---

## 18. Recommended Corrections to Current Direction

1. Rename the concept from “Dofus lookalike kit” to **Scholomance Isometric Diorama Kit**.
2. Treat Universal LPC as **reference architecture**, not dependency.
3. Build Actor Forge before battle mechanics.
4. Build IsoMapSandbox before combat page replacement.
5. Make projection math the shared source of truth.
6. Make provenance visible from day one.
7. Make spell telegraphs formula-capable from day one.
8. Keep imported assets quarantined behind adapter/provenance contracts.
9. Preserve current combat page until the sandbox passes QA.
10. Use Pixel Lotus as final composition owner, not React, Canvas, Phaser, or PixiJS.

---

## 19. Implementation Order

```txt
1. Discovery report
2. Actor Forge schemas
3. Actor Forge composer
4. Actor Forge Lab
5. IsoScene schemas
6. Iso projection/depth/hit-test math
7. IsoMapSandbox
8. Click-to-move actor
9. Depth sorting props
10. LPC import adapter
11. Spell telegraph prototype
12. Combat page feature-flag adapter
```

---

## 20. Final Verdict

This is the correct architectural evolution.

Pixel Lotus should not become a wrapper around Universal LPC. Pixel Lotus should become a native actor compiler. Universal LPC is useful because it proves the viability of layered sprite assembly and animation manifests, but Scholomance needs its own contracts, provenance, palettes, raster rules, and runtime projection math.

The first win condition is not “full battle system.” The first win condition is walking:

```txt
A Pixel Lotus actor
on an isometric Scholomance map
moving to a clicked tile
with correct facing, animation, depth, and debug truth.
```

Once that works, real-time sigil combat becomes a natural next layer instead of a tangled beast in a velvet hat.

The disciplined architecture is:

```txt
External Sprite Logic Pattern
→ Pixel Lotus Native Actor Forge
→ IsoScene Runtime
→ Real-Time Sigil Combat
→ Full Game Map Evolution
```

Build the forge. Then build the stage. Then let the spells bite.
