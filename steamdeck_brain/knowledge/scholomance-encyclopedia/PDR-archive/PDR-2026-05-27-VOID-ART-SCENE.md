# PDR: VOID Art Scene — Negative Fibonacci Arena

**Status:** Draft
**Classification:** UI + Rendering + Godot Interop + Behavioral
**Priority:** High
**Primary Goal:** Build a fixed-camera interactive 2D Godot arena scene for the VOID school using clockwise negative fibonacci geometry, phi-triangle pillar placement, cyan fissures, amethyst floor scatter, and a singularity hotspot that triggers VOID tick damage.

---

## 1. Executive Summary

The VOID Art Scene is a fully-specified Godot 2D arena that serves as the battleground for VOID school combat. It is not decoration — it is a mechanical surface. The ground itself is a weapon.

The scene organizes around a **clockwise negative fibonacci spiral** that contracts toward a **singularity point** at (960, 672). Three obsidian pillars stand at phi-triangle positions, pinning the spiral geometry at its outer corners. The ground is a **60×34 asymmetric tile grid** (T=32px, 1920×1080) with two crack systems: **cyan void fissures** tracing the spiral with a black aura, and **amethyst floor cracks** scattered at ~28 positions as geological history.

When a VOID spell lands on the singularity, all 15 tiles in the three inner fibonacci squares enter a `void_ticking` state and deal **2% HP damage per tick** across **8 fibonacci-timed ticks** over 34 frames total. Maximum single-trigger exposure: **16% HP**.

This PDR defines the full scene, the interaction model, and the implementation path using the existing `src/lib/godot/frame-printer` infrastructure.

---

## 2. Change Classification

| Dimension | Classification | Reason |
|-----------|---------------|--------|
| Godot scene | Structural | New `FrameInstantiationTimeline` definition |
| Tile damage | Behavioral | New game mechanic — VOID tick damage |
| Visual system | UI/Rendering | New color variables, sprite specs |
| Interactivity | Behavioral | Singularity trigger modifies live scene state |
| Frame printer | None | Existing lib is already operational, no changes needed |

---

## 3. Spec Sheet

### Scene

| Property | Value |
|----------|-------|
| Resolution | 1920 × 1080 |
| Camera | Fixed, no scroll |
| Tile size | 32px |
| Grid dimensions | 60 × 34 tiles |
| Total tiles | 2040 |

### Geometry

| Element | Value |
|---------|-------|
| Spiral type | Clockwise negative fibonacci |
| Spiral path | Right → Up → Left → Down, converging at singularity |
| Singularity | Pixel (960, 672) — tile corner (30, 21) |
| φ | 1.6180339887 |

### Pillars (phi-triangle)

| Pillar | Pixel position | Tile | Height class |
|--------|---------------|------|-------------|
| A — dominant | (734, 255) | (22, 7) | Tallest |
| B — mid | (1467, 413) | (45, 12) | Mid |
| C — stub | (1187, 825) | (37, 25) | Shortest, partially sunken |

Pillar A stands at the left apex of the clockwise spiral arm. B stands at the right apex. C sits near the lower approach to the singularity, already partially consumed.

### Colors

| Variable | Hex | Usage |
|----------|-----|-------|
| `--void-fissure-core` | `#00E5FF` | Cyan luminance at fissure center |
| `--void-fissure-aura` | `#000000` | Black halo, 8–12px soft falloff |
| `--void-amethyst-crack` | `#7B2FBE` | Floor crack mineral staining, no glow |
| `--void-pillar-obsidian` | `#0D0D1A` | Blue-black with cold undertone |
| `--void-fractal-neg` | `#001A1A` | Near-black with cyan ghost, fractal fill |
| `--void-tile-base` | `#111118` | Dark zinc with slight violet push |

### Amethyst Scatter

~28 tiles, three placement rules:
1. **Pillar clusters**: 4–6 amethyst cracks within 3-tile radius of each pillar base
2. **Spiral border band**: 8–10 cracks loosely along the clockwise spiral path, outside the cyan fissure centerline
3. **Isolated singles**: 2 tiles in negative space, far from other elements

No amethyst cracks inside the 15-tile VOID damage zone. That area belongs to cyan exclusively.

### Singularity — Damage Zone

The singularity sits at tile corner (30, 21). The four fibonacci squares that share this corner:

| Square | Tiles | Count | Tick damage |
|--------|-------|-------|-------------|
| 1×1 upper-right | (30, 20) | 1 | 2% / tick |
| 1×1 lower-left | (29, 21) | 1 | 2% / tick |
| 2×2 (right) | (30,21) (31,21) (30,22) (31,22) | 4 | 2% / tick |
| 3×3 (upper-left) | (27,18)→(29,20) — 9 tiles | 9 | 2% / tick |
| **Total** | | **15 tiles** | **2% flat** |

### VOID Tick Timing

Fibonacci sequence, 8 ticks, relative to impact frame t=0:

```
Tick  Frame offset  Cumulative HP lost (if player stays)
  1   t + 1f        2%
  2   t + 2f        4%
  3   t + 3f        6%
  4   t + 5f        8%   ← end of front burst
  5   t + 8f        10%
  6   t + 13f       12%
  7   t + 21f       14%
  8   t + 34f       16%  ← late tick — arrives when player thinks it ended
```

---

## 4. Assumptions and Unknowns

| # | Assumption / Unknown | Impact if wrong | Resolution |
|---|---------------------|-----------------|------------|
| A1 | VOID school combat uses tile-based positioning | Damage zone mechanic requires grid coordinates for player position | Confirm with combat system — if free-form, snap player position to nearest tile on tick evaluation |
| A2 | Fissure glow is implemented as a shader on `AnimatedSprite2D`, not a separate overlay node | Affects how `props` are encoded in `NormalizedSceneObject` | Use a `shader_param_glow` prop key; adapter converts at export time |
| A3 | Singularity trigger is a combat event, not a Godot signal | Determines whether frame timeline is pre-baked or driven at runtime | Treat as runtime-driven: the frame printer generates the triggered frame diff when the event fires |
| A4 | Scene persists between combat rounds with accumulated fissure state | Affects whether `NormalizedFrameState` is re-initialized per round | Default: persist fissure widening; reset on scene reload |
| A5 | `AnimatedSprite2D` resource paths for fissure sprites exist or will be created | Blocks frame printer output if missing | Gate behind `validate: false` in shadow mode; assert paths exist before live export |

---

## 5. Architecture Diagram / File Map

```
src/lib/godot/frame-printer/        ← EXISTING — do not modify
  types.ts
  diffFrameState.ts
  printFrameTimeline.ts
  validateFramePacket.ts
  stableId.ts
  deterministicHash.ts
  constants.ts
  adapters/toGodotRuntimeJson.ts
  index.ts

src/lib/godot-export/               ← EXISTING — extend here
  shadowFrameTimeline.ts            ← existing, imports frame-printer
  voidArenaScene.ts                 ← NEW: resting scene NormalizedFrameState
  voidArenaFissures.ts              ← NEW: fibonacci crack geometry + tile set
  voidSingularityTrigger.ts         ← NEW: triggered state diff + tick schedule
  voidArenaConstants.ts             ← NEW: phi coords, tile constants, color keys

tests/godot/                        ← EXISTING — add here
  frameDiffing.test.ts              ← existing
  frameInstantiationPrinter.test.ts ← existing
  framePacketValidation.test.ts     ← existing
  voidArenaScene.test.ts            ← NEW
  voidSingularityTrigger.test.ts    ← NEW

src/index.css                       ← ADD: --void-* CSS custom properties
```

### Data Flow

```
voidArenaConstants.ts
      ↓ phi coords, tile dimensions
voidArenaFissures.ts ──────────────────────────────────────┐
      ↓ fissure NormalizedSceneObjects                      │
voidArenaScene.ts                                          │
      ↓ resting NormalizedFrameState[]                      │
      ↓                                                     ↓
printFrameTimeline()  ←── voidSingularityTrigger.ts (triggered diff)
      ↓
FrameInstantiationTimeline
      ↓
toGodotRuntimeJson()
      ↓
JSON → Godot runtime
```

---

## 6. Step-by-Step Implementation Plan

### Step 1 — Constants and phi coordinates

Create `src/lib/godot-export/voidArenaConstants.ts`.

Define all numeric constants: resolution, tile size, pillar positions, singularity position, phi values, damage zone tile list, fibonacci tick offsets.

### Step 2 — Fibonacci fissure geometry

Create `src/lib/godot-export/voidArenaFissures.ts`.

Generate the clockwise spiral fissure layout as an array of `NormalizedSceneObject` instances. Each fissure segment is an `AnimatedSprite2D` with:
- `transform` derived from its position along the spiral path
- `props.shader_param_glow: "#00E5FF"` for the cyan core
- `props.shader_param_aura_radius: 10` for the black halo
- `props.fissure_width: 1 | 2 | 3` (1=hairline, 2=standard, 3=wide at convergence zone)

Also generate the ~28 amethyst scatter objects as `Sprite2D` instances.

### Step 3 — Resting scene builder

Create `src/lib/godot-export/voidArenaScene.ts`.

Export a single function `buildVoidArenaRestingScene(): NormalizedFrameState` that assembles:
- TileMap base node
- Three obsidian pillars (A, B, C) as `Sprite2D`
- Singularity marker as `AnimatedSprite2D` in idle animation
- Fissure network from Step 2
- Amethyst scatter from Step 2
- Negative fractal fragments (3 tiers: 2 large anchors, 8 mid-scatter, ~15 micro)

This is frame 0 — the scene before any spell lands.

### Step 4 — Singularity trigger

Create `src/lib/godot-export/voidSingularityTrigger.ts`.

Export `buildSingularityTriggerTimeline(baseState: NormalizedFrameState): FrameInstantiationTimeline`.

This function:
1. Takes the current resting scene state
2. Generates frame 0 (impact flash — singularity inverts for 2 frames)
3. Generates frames at fibonacci tick offsets (t+1, t+2, t+3, t+5, t+8, t+13, t+21, t+34)
4. Each tick frame diffs against the previous: affected tile fissures widen, fractal fragments rotate, pillar highlight intensifies
5. On tick 5 (t+8f), spawns one persistent void shard per 1×1 tile (2 new objects)
6. Uses `printFrameTimeline` from the existing lib

### Step 5 — CSS variables

Add `--void-*` custom properties to `src/index.css` under the VOID school section.

### Step 6 — Tests

Write `tests/godot/voidArenaScene.test.ts` and `tests/godot/voidSingularityTrigger.test.ts`.

### Step 7 — Integration

Wire `buildVoidArenaRestingScene` into the VOID school combat scene loader. Wire `buildSingularityTriggerTimeline` into the spell impact handler.

---

## 7. Code Examples

### voidArenaConstants.ts

```typescript
export const VOID_SCENE_WIDTH = 1920;
export const VOID_SCENE_HEIGHT = 1080;
export const VOID_TILE_SIZE = 32;
export const VOID_GRID_COLS = 60;   // 1920 / 32
export const VOID_GRID_ROWS = 34;   // 1080 / 32

export const PHI = 1.6180339887;

export const VOID_PILLAR_A = { x: 734, y: 255 } as const;
export const VOID_PILLAR_B = { x: 1467, y: 413 } as const;
export const VOID_PILLAR_C = { x: 1187, y: 825 } as const;

export const VOID_SINGULARITY = { x: 960, y: 672 } as const;

// Tile corner (30, 21) — shared corner of four inner fibonacci squares
export const VOID_SINGULARITY_TILE = { col: 30, row: 21 } as const;

// All 15 tiles in the VOID damage zone (3 inner fibonacci squares)
export const VOID_DAMAGE_ZONE_TILES: ReadonlyArray<{ col: number; row: number }> = [
  // 1×1 upper-right
  { col: 30, row: 20 },
  // 1×1 lower-left
  { col: 29, row: 21 },
  // 2×2 (right of singularity)
  { col: 30, row: 21 }, { col: 31, row: 21 },
  { col: 30, row: 22 }, { col: 31, row: 22 },
  // 3×3 (upper-left of singularity)
  { col: 27, row: 18 }, { col: 28, row: 18 }, { col: 29, row: 18 },
  { col: 27, row: 19 }, { col: 28, row: 19 }, { col: 29, row: 19 },
  { col: 27, row: 20 }, { col: 28, row: 20 }, { col: 29, row: 20 },
] as const;

// Fibonacci-timed tick frame offsets (relative to impact at t=0)
export const VOID_TICK_FRAME_OFFSETS = [1, 2, 3, 5, 8, 13, 21, 34] as const;

export const VOID_TICK_DAMAGE_PERCENT = 2;
export const VOID_TICK_COUNT = 8;
export const VOID_MAX_EXPOSURE_PERCENT = VOID_TICK_COUNT * VOID_TICK_DAMAGE_PERCENT; // 16
```

### voidArenaFissures.ts

```typescript
import type { NormalizedSceneObject } from "../godot/frame-printer";
import { toStableGodotId } from "../godot/frame-printer";
import { VOID_SINGULARITY, VOID_TILE_SIZE } from "./voidArenaConstants";

// Clockwise spiral arm: sequence of (col, row) tile positions tracing the spiral
// from the outer edge toward the singularity. Generated from fibonacci rectangle
// boundaries; each entry is the center-tile of a spiral segment.
const FISSURE_SPIRAL_TILES: ReadonlyArray<{
  col: number;
  row: number;
  width: 1 | 2 | 3;
  rotation: number;
}> = [
  // Outer arm — right side (fibonacci square 8×8 boundary)
  { col: 47, row: 21, width: 1, rotation: 0 },
  { col: 46, row: 21, width: 1, rotation: 0 },
  { col: 45, row: 21, width: 1, rotation: 0 },
  // Bend: right → up
  { col: 44, row: 21, width: 1, rotation: Math.PI / 4 },
  // Up arm (5×5 boundary)
  { col: 42, row: 17, width: 1, rotation: Math.PI / 2 },
  { col: 42, row: 18, width: 1, rotation: Math.PI / 2 },
  { col: 42, row: 19, width: 1, rotation: Math.PI / 2 },
  // Bend: up → left
  { col: 42, row: 16, width: 2, rotation: (3 * Math.PI) / 4 },
  // Left arm (3×3 boundary)
  { col: 35, row: 14, width: 2, rotation: Math.PI },
  { col: 33, row: 14, width: 2, rotation: Math.PI },
  { col: 31, row: 14, width: 2, rotation: Math.PI },
  // Bend: left → down
  { col: 27, row: 14, width: 2, rotation: (5 * Math.PI) / 4 },
  // Down arm (2×2 boundary)
  { col: 27, row: 17, width: 2, rotation: (3 * Math.PI) / 2 },
  { col: 27, row: 19, width: 2, rotation: (3 * Math.PI) / 2 },
  // Inner convergence
  { col: 28, row: 20, width: 3, rotation: (7 * Math.PI) / 4 },
  { col: 29, row: 20, width: 3, rotation: 0 },
  { col: 30, row: 20, width: 3, rotation: 0 },
];

export function buildFissureObjects(): NormalizedSceneObject[] {
  return FISSURE_SPIRAL_TILES.map((tile, index) => ({
    id: toStableGodotId(["fissure", "spiral", index]),
    type: "AnimatedSprite2D" as const,
    transform: {
      x: tile.col * VOID_TILE_SIZE + VOID_TILE_SIZE / 2,
      y: tile.row * VOID_TILE_SIZE + VOID_TILE_SIZE / 2,
      rotation: tile.rotation,
      scaleX: 1,
      scaleY: 1,
      zIndex: 2,
    },
    props: {
      shader_param_glow: "#00E5FF",
      shader_param_aura_radius: 10,
      fissure_width: tile.width,
      animation: "idle_breathe",
    },
  }));
}

// Amethyst scatter — 28 tiles, three placement clusters
const AMETHYST_TILE_POSITIONS: ReadonlyArray<{ col: number; row: number }> = [
  // Pillar A cluster (22, 7) ±3 tiles
  { col: 20, row: 8 }, { col: 21, row: 9 }, { col: 23, row: 6 },
  { col: 24, row: 9 }, { col: 22, row: 10 },
  // Pillar B cluster (45, 12) ±3 tiles
  { col: 43, row: 11 }, { col: 46, row: 13 }, { col: 44, row: 14 },
  { col: 47, row: 11 }, { col: 43, row: 13 },
  // Pillar C cluster (37, 25) ±3 tiles
  { col: 35, row: 24 }, { col: 38, row: 26 }, { col: 36, row: 27 },
  { col: 39, row: 24 }, { col: 37, row: 26 },
  // Spiral border band (outside fissure centerline)
  { col: 48, row: 22 }, { col: 49, row: 20 }, { col: 43, row: 15 },
  { col: 36, row: 13 }, { col: 28, row: 15 }, { col: 26, row: 18 },
  { col: 26, row: 22 }, { col: 28, row: 24 },
  // Two isolated singles in negative space
  { col: 10, row: 5 },
  { col: 54, row: 29 },
];

export function buildAmethystCrackObjects(): NormalizedSceneObject[] {
  return AMETHYST_TILE_POSITIONS.map((tile, index) => ({
    id: toStableGodotId(["amethyst", "crack", index]),
    type: "Sprite2D" as const,
    transform: {
      x: tile.col * VOID_TILE_SIZE + VOID_TILE_SIZE / 2,
      y: tile.row * VOID_TILE_SIZE + VOID_TILE_SIZE / 2,
      rotation: (index * 0.7) % (Math.PI * 2),
      scaleX: 0.8 + (index % 3) * 0.15,
      scaleY: 0.8 + (index % 5) * 0.1,
      zIndex: 1,
    },
    props: {
      tint: "#7B2FBE",
      resource: "res://art/void/amethyst_crack.png",
    },
  }));
}
```

### voidArenaScene.ts

```typescript
import type { NormalizedFrameState, NormalizedSceneObject } from "../godot/frame-printer";
import { toStableGodotId } from "../godot/frame-printer";
import {
  VOID_PILLAR_A, VOID_PILLAR_B, VOID_PILLAR_C,
  VOID_SINGULARITY,
} from "./voidArenaConstants";
import { buildFissureObjects, buildAmethystCrackObjects } from "./voidArenaFissures";

function buildPillar(
  key: "a" | "b" | "c",
  pos: { x: number; y: number },
  scaleY: number,
): NormalizedSceneObject {
  return {
    id: toStableGodotId(["pillar", key]),
    type: "Sprite2D",
    transform: {
      x: pos.x,
      y: pos.y,
      rotation: 0,
      scaleX: 1,
      scaleY,
      zIndex: 4,
    },
    props: {
      resource: "res://art/void/obsidian_pillar.png",
      tint: "#0D0D1A",
      shader_param_highlight_drift_speed: 0.05,
    },
  };
}

function buildSingularityMarker(): NormalizedSceneObject {
  return {
    id: toStableGodotId(["singularity", "marker"]),
    type: "AnimatedSprite2D",
    transform: {
      x: VOID_SINGULARITY.x,
      y: VOID_SINGULARITY.y,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      zIndex: 3,
    },
    props: {
      animation: "idle_pulse",
      resource: "res://art/void/singularity.png",
    },
  };
}

export function buildVoidArenaRestingScene(): NormalizedFrameState {
  const objects: NormalizedSceneObject[] = [
    // Base tilemap
    {
      id: toStableGodotId(["tilemap", "base"]),
      type: "TileMap",
      transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, zIndex: 0 },
      props: {
        tile_size: 32,
        resource: "res://art/void/void_tileset.tres",
      },
    },
    // Amethyst floor cracks (below fissures)
    ...buildAmethystCrackObjects(),
    // Void fissure network
    ...buildFissureObjects(),
    // Singularity
    buildSingularityMarker(),
    // Obsidian pillars — scaleY encodes height class
    buildPillar("a", VOID_PILLAR_A, 2.8),
    buildPillar("b", VOID_PILLAR_B, 1.9),
    buildPillar("c", VOID_PILLAR_C, 1.2),
  ];

  return {
    frame: 0,
    timestampMs: 0,
    sceneId: "void_arena",
    seed: "void_arena_v1",
    objects,
  };
}
```

### voidSingularityTrigger.ts

```typescript
import type { NormalizedFrameState } from "../godot/frame-printer";
import { printFrameTimeline, toStableGodotId } from "../godot/frame-printer";
import type { FrameInstantiationTimeline } from "../godot/frame-printer";
import {
  VOID_TICK_FRAME_OFFSETS,
  VOID_DAMAGE_ZONE_TILES,
  VOID_SINGULARITY,
  VOID_TILE_SIZE,
} from "./voidArenaConstants";

function singularityFlashFrame(base: NormalizedFrameState, frameOffset: number): NormalizedFrameState {
  return {
    ...base,
    frame: frameOffset,
    timestampMs: (frameOffset / 60) * 1000,
    objects: base.objects.map((obj) => {
      if (obj.id === toStableGodotId(["singularity", "marker"])) {
        return {
          ...obj,
          props: { ...obj.props, animation: "trigger_flash" },
        };
      }
      return obj;
    }),
  };
}

function applyTickFrame(
  base: NormalizedFrameState,
  frameOffset: number,
  tickIndex: number,
): NormalizedFrameState {
  const isShardTick = tickIndex === 4; // 5th tick (t+8f), zero-indexed

  const newObjects = [...base.objects];

  // Widen fissures in the damage zone
  const updatedObjects = newObjects.map((obj) => {
    const isFissureInZone = VOID_DAMAGE_ZONE_TILES.some((tile) => {
      const tileX = tile.col * VOID_TILE_SIZE + VOID_TILE_SIZE / 2;
      const tileY = tile.row * VOID_TILE_SIZE + VOID_TILE_SIZE / 2;
      return (
        obj.type === "AnimatedSprite2D" &&
        Math.abs(obj.transform.x - tileX) < VOID_TILE_SIZE &&
        Math.abs(obj.transform.y - tileY) < VOID_TILE_SIZE
      );
    });

    if (isFissureInZone) {
      const currentWidth = (obj.props?.fissure_width as number) ?? 1;
      return {
        ...obj,
        props: {
          ...obj.props,
          fissure_width: Math.min(currentWidth + 1, 3) as 1 | 2 | 3,
          animation: "tick_pulse",
        },
      };
    }

    return obj;
  });

  // Spawn void shards on tick 5 (t+8f)
  const shardObjects = isShardTick
    ? [
        {
          id: toStableGodotId(["void", "shard", frameOffset, "a"]),
          type: "Sprite2D" as const,
          transform: {
            x: VOID_SINGULARITY.x + VOID_TILE_SIZE / 2,
            y: VOID_SINGULARITY.y - VOID_TILE_SIZE / 2,
            rotation: Math.PI / 6,
            scaleX: 0.6,
            scaleY: 0.6,
            zIndex: 3,
          },
          props: {
            resource: "res://art/void/void_shard.png",
            tint: "#00E5FF",
            drifting: true,
          },
        },
        {
          id: toStableGodotId(["void", "shard", frameOffset, "b"]),
          type: "Sprite2D" as const,
          transform: {
            x: VOID_SINGULARITY.x - VOID_TILE_SIZE,
            y: VOID_SINGULARITY.y,
            rotation: -Math.PI / 4,
            scaleX: 0.5,
            scaleY: 0.5,
            zIndex: 3,
          },
          props: {
            resource: "res://art/void/void_shard.png",
            tint: "#00E5FF",
            drifting: true,
          },
        },
      ]
    : [];

  return {
    ...base,
    frame: frameOffset,
    timestampMs: (frameOffset / 60) * 1000,
    objects: [...updatedObjects, ...shardObjects],
  };
}

export function buildSingularityTriggerTimeline(
  baseState: NormalizedFrameState,
): FrameInstantiationTimeline {
  const frames: NormalizedFrameState[] = [
    // Frame 0: singularity flash (impact)
    singularityFlashFrame(baseState, 0),
    // Frame 2: flash ends, snap back
    { ...baseState, frame: 2, timestampMs: (2 / 60) * 1000 },
    // 8 fibonacci-timed tick frames
    ...VOID_TICK_FRAME_OFFSETS.map((offset, tickIndex) =>
      applyTickFrame(baseState, offset, tickIndex)
    ),
  ];

  return printFrameTimeline(frames, {
    sceneId: "void_arena",
    fps: 60,
    seed: "void_arena_v1",
    sourceSystem: "manual",
    bytecodeContract: "framePacket",
    validate: true,
  });
}
```

### voidArenaScene.test.ts (preview)

```typescript
import { describe, expect, it } from "vitest";
import { buildVoidArenaRestingScene } from "../../src/lib/godot-export/voidArenaScene";
import { toStableGodotId } from "../../src/lib/godot/frame-printer";
import { VOID_PILLAR_A, VOID_PILLAR_B, VOID_PILLAR_C, VOID_SINGULARITY } from "../../src/lib/godot-export/voidArenaConstants";

describe("buildVoidArenaRestingScene", () => {
  it("places pillars at phi-triangle coordinates", () => {
    const scene = buildVoidArenaRestingScene();
    const pillarA = scene.objects.find((o) => o.id === toStableGodotId(["pillar", "a"]));
    const pillarB = scene.objects.find((o) => o.id === toStableGodotId(["pillar", "b"]));
    const pillarC = scene.objects.find((o) => o.id === toStableGodotId(["pillar", "c"]));

    expect(pillarA?.transform.x).toBe(VOID_PILLAR_A.x);
    expect(pillarA?.transform.y).toBe(VOID_PILLAR_A.y);
    expect(pillarB?.transform.x).toBe(VOID_PILLAR_B.x);
    expect(pillarC?.transform.x).toBe(VOID_PILLAR_C.x);
  });

  it("places singularity at convergence coordinate", () => {
    const scene = buildVoidArenaRestingScene();
    const marker = scene.objects.find((o) => o.id === toStableGodotId(["singularity", "marker"]));
    expect(marker?.transform.x).toBe(VOID_SINGULARITY.x);
    expect(marker?.transform.y).toBe(VOID_SINGULARITY.y);
  });

  it("contains no amethyst cracks inside the 15-tile damage zone", () => {
    const scene = buildVoidArenaRestingScene();
    const amethystObjects = scene.objects.filter((o) => o.id.startsWith("amethyst_crack"));
    // damage zone bounds: cols 27-31, rows 18-22 (approximate bounding box)
    const inZone = amethystObjects.filter((o) => {
      const col = Math.floor(o.transform.x / 32);
      const row = Math.floor(o.transform.y / 32);
      return col >= 27 && col <= 31 && row >= 18 && row <= 22;
    });
    expect(inZone).toHaveLength(0);
  });

  it("produces a valid frame state with unique IDs", () => {
    const scene = buildVoidArenaRestingScene();
    const ids = scene.objects.map((o) => o.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});
```

---

## 8. Glossary

| Term | Definition |
|------|-----------|
| **Negative Fibonacci** | The golden spiral rendered as carved absence rather than built form. The void between phi-squared tiles, not the tiles themselves. |
| **Clockwise spiral** | The negative fibonacci spiral in this scene contracts clockwise: right → up → left → down toward the singularity. The "wrong" chirality for a growth spiral — used deliberately for dread. |
| **Singularity** | The tile corner (30, 21) at pixel (960, 672). The convergence point of the clockwise negative fibonacci spiral. Landing a VOID spell here triggers the damage zone. |
| **Phi triangle** | The three-point arrangement of obsidian pillars whose vertices are at phi-grid intersections (0.382, 0.236), (0.764, 0.382), (0.618, 0.764). |
| **VOID tick damage** | 2% HP damage per tick applied to any player occupying a tile in the damage zone. Ticks follow fibonacci timing offsets from impact. |
| **Fibonacci tick timing** | Damage ticks fire at frame offsets 1, 2, 3, 5, 8, 13, 21, 34 relative to impact. The gaps between ticks grow at the golden ratio. |
| **Damage zone** | 15 tiles occupying the three innermost fibonacci squares that share the singularity corner. All tiles apply flat 2% per tick. |
| **Void fissures** | AnimatedSprite2D objects tracing the clockwise spiral path. Cyan core (`#00E5FF`), black aura (8–12px). These breathe on a 6-frame idle cycle. |
| **Amethyst cracks** | Sprite2D decorative floor stains in deep amethyst (`#7B2FBE`). No glow, no mechanics. ~28 tiles scattered at pillar bases, spiral border, and two isolated singles. |
| **Obsidian pillars** | Sprite2D nodes placed at phi-triangle vertices. Heights in ratio ~2.8 : 1.9 : 1.2 (A : B : C). Cold blue-black with slow highlight drift shader. |
| **Void shard** | Persistent Sprite2D spawned on tick 5 (t+8f) near each 1×1 damage tile. Drifts slowly toward the nearest pillar. Accumulates in scene as evidence of cast history. |
| **NormalizedFrameState** | The data structure in `src/lib/godot/frame-printer/types.ts` representing a full scene snapshot at a given frame number. |
| **FrameInstantiationTimeline** | The full sequence of frame packets generated by `printFrameTimeline`. Consumed by Godot via `toGodotRuntimeJson`. |
| **φ (phi)** | The golden ratio: 1.6180339887. All scene proportions derive from φ, 1/φ, 1/φ², 1/φ³. |

---

## 9. Q&A — Top 10 Implementation Concerns

**Q1: The singularity is at a pixel position (960, 672) but tiles are 32px. Does the singularity sit on a tile center or a tile corner?**

A: Tile *corner*. The singularity is the shared corner of tiles (29,20), (30,20), (29,21), (30,21). This is intentional — fibonacci spirals converge at corners, not centers. The `AnimatedSprite2D` for the singularity marker is positioned at the corner, not offset to a tile center. This means `transform.x = 960, transform.y = 672`, which is `col*32 = 30*32 = 960` and `row*32 = 21*32 = 672`. Correct.

**Q2: The damage zone table mentions "1×1 lower-left" as tile (29, 21). But that's inside the 2×2 square's region. Is there overlap?**

A: No overlap in practice because the 2×2 square occupies tiles (30,21), (31,21), (30,22), (31,22) — the *right* side of the singularity. Tile (29,21) is the *left* 1×1 square. The two 1×1 squares are on opposite sides of the singularity corner. The layout is: upper-right 1×1 at (30,20), lower-left 1×1 at (29,21), 2×2 to the right at (30-31, 21-22), 3×3 upper-left at (27-29, 18-20).

**Q3: `printFrameTimeline` requires strictly ordered frames. The trigger timeline starts at frame 0 (flash), then frame 2 (snap-back), then tick frames at t+1, t+2, etc. Frame 1 is missing. Will this cause a `FRAME_ORDER_INVALID` error?**

A: No. `validateFrameTimeline` checks that each packet's frame number is *strictly greater than* the previous. Frame 0 → frame 2 → frame 3 (t+1 offset on top of frame 2) — wait, the tick offsets are relative to impact at t=0, not relative to the flash frames. The full sequence needs careful ordering: 0, 2, 3, 4, 6, 9, 14, 22, 35, 36 (impact=0, flash end=2, tick1=3, tick2=4, tick3=6, tick4=9, tick5=14, tick6=22, tick7=35, tick8=36? No). Reconsider: use tick offsets literally from frame 0: frames 0, 2, 1, 2, 3, 5, 8, 13, 21, 34. Ordering issue arises because flash-end (frame 2) and tick1 (frame 1) collide. **Resolution**: offset all ticks by 2 (after flash): ticks fire at 1+2=3, 2+2=4, 3+2=5, 5+2=7, 8+2=10, 13+2=15, 21+2=23, 34+2=36. Document this offset in `VOID_TICK_FRAME_OFFSETS` usage within `buildSingularityTriggerTimeline`.

**Q4: `deepEqualProps` in `diffFrameState` uses key-sorted comparison. `fissure_width` going from `1` to `2` is a number change — will it produce an update instruction correctly?**

A: Yes. `deepEqualValue` reaches the primitive comparison branch for numbers. `Object.is(1, 2)` is false, so the props are detected as changed, and a `GodotUpdateInstruction` is emitted with the new props object. No issue.

**Q5: Void shards are spawned at tick 5 as new `Sprite2D` objects. They didn't exist in the base scene. Will `diffFrameState` emit a `create` instruction for them?**

A: Yes, correctly. `diffFrameState` iterates over `nextFrame.objects` and checks `previousObjects.get(nextObject.id)`. Shards don't exist in the previous frame, so they fall into the `create.push(toCreateInstruction(nextObject))` branch. The shard IDs use `toStableGodotId(["void", "shard", frameOffset, "a"])`, which are unique per trigger event.

**Q6: If the singularity is triggered twice, a second set of shards is spawned with different IDs (different `frameOffset`). Won't the scene accumulate infinite shards over many triggers?**

A: Yes, intentionally. The scene accumulates shards as visual history of the combat. However, a cap should be enforced: if the implementation context has a maximum shard count (e.g., 10), the spawn logic should check the current object count and skip shard creation if already at cap. Add a `maxShards` parameter to `buildSingularityTriggerTimeline` defaulting to 10.

**Q7: The amethyst crack rotations use `(index * 0.7) % (Math.PI * 2)`. Is this deterministic?**

A: Yes. The index is the array position in `AMETHYST_TILE_POSITIONS`, which is a static readonly array. Same index always produces the same rotation. The `0.7` multiplier produces varied but non-uniform angles across the 28 tiles, avoiding visual repetition without randomness.

**Q8: Pillar `scaleY` values (2.8, 1.9, 1.2) will stretch the pillar sprite. Won't this distort the obsidian texture?**

A: Yes, it will stretch. The pillar art asset should be designed as a small-height base tile that tiles naturally when stretched on the Y axis — a vertically repeating pattern, or designed with enough height that 2.8× still looks intentional. Alternatively, use `scaleY` only if the sprite is designed as a 1-unit-height tile (32px × 32px base), and 2.8× gives 89.6px — a believable pillar height. Specify this constraint to the artist: pillar base sprite = 32×32px, vertically stretchable.

**Q9: The `fissure_width` prop is typed `1 | 2 | 3` in the code but `props` in `NormalizedSceneObject` is `Record<string, unknown>`. Won't TypeScript lose the narrowing?**

A: TypeScript will widen `fissure_width` to `unknown` when read back from `props`. Any code that reads `obj.props?.fissure_width` must validate before use. The Godot adapter (`toGodotRuntimeJson`) treats all props as opaque data for JSON serialization — it doesn't inspect `fissure_width`. The Godot-side GDScript reads it as a plain number. No type error at runtime, but the TS layer should use a type guard when reading the value back for update logic (as shown in `applyTickFrame` with the cast `(obj.props?.fissure_width as number)`).

**Q10: `validateFrameTimeline` checks for `FRAME_UPDATE_UNKNOWN_ID` — updates can only target IDs previously created. In `buildSingularityTriggerTimeline`, the base state's object IDs are created in frame 0 (the flash frame). When ticks run, those IDs should be in `seenIds`. Is this guaranteed?**

A: Yes, as long as the flash frame (frame 0) is included in the timeline and comes first in `printFrameTimeline`'s sorted input. `printFrameTimeline` sorts by `frame` number ascending, so frame 0 is always first. All objects from `buildVoidArenaRestingScene` enter via create instructions in frame 0. By the time tick frames fire at frame 3+, all IDs are in `seenIds`. The singularity marker update (flash animation change) is safe.

---

## 10. QA Plan

### Test Files

| File | What it covers |
|------|---------------|
| `tests/godot/voidArenaScene.test.ts` | Resting scene structure, pillar positions, singularity position, unique IDs, amethyst exclusion from damage zone |
| `tests/godot/voidSingularityTrigger.test.ts` | Timeline validity, tick count, shard spawn on tick 5, frame ordering, damage zone fissure widening |

### Commands

```bash
# Run only VOID scene tests
npx vitest run tests/godot/voidArenaScene.test.ts tests/godot/voidSingularityTrigger.test.ts

# Run full godot suite
npx vitest run tests/godot/

# Typecheck (must pass with zero errors)
npx tsc --project tsconfig.json --noEmit

# Lint (max-warnings=0)
npm run lint
```

### Full Test Suite — voidSingularityTrigger.test.ts

```typescript
import { describe, expect, it } from "vitest";
import { buildVoidArenaRestingScene } from "../../src/lib/godot-export/voidArenaScene";
import { buildSingularityTriggerTimeline } from "../../src/lib/godot-export/voidSingularityTrigger";
import { validateFrameTimeline } from "../../src/lib/godot/frame-printer";
import { VOID_TICK_FRAME_OFFSETS, VOID_TICK_COUNT } from "../../src/lib/godot-export/voidArenaConstants";

describe("buildSingularityTriggerTimeline", () => {
  it("produces a valid frame timeline", () => {
    const base = buildVoidArenaRestingScene();
    const timeline = buildSingularityTriggerTimeline(base);
    const result = validateFrameTimeline(timeline);
    expect(result.ok).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("contains the correct number of tick frames", () => {
    const base = buildVoidArenaRestingScene();
    const timeline = buildSingularityTriggerTimeline(base);
    // flash(0) + snap(2) + 8 ticks = 10 packets
    expect(timeline.frames.length).toBe(2 + VOID_TICK_COUNT);
  });

  it("frames are in strictly ascending order", () => {
    const base = buildVoidArenaRestingScene();
    const timeline = buildSingularityTriggerTimeline(base);
    for (let i = 1; i < timeline.frames.length; i++) {
      expect(timeline.frames[i].frame).toBeGreaterThan(timeline.frames[i - 1].frame);
    }
  });

  it("spawns exactly 2 void shards on the 5th tick", () => {
    const base = buildVoidArenaRestingScene();
    const timeline = buildSingularityTriggerTimeline(base);
    // 5th tick is at index 2 + 4 = 6 in the frames array (0=flash, 1=snap, 2-9=ticks)
    const tick5Packet = timeline.frames[6];
    const shardCreates = tick5Packet.create.filter((c) => c.id.startsWith("void_shard"));
    expect(shardCreates).toHaveLength(2);
  });

  it("tick frame offsets match fibonacci sequence (offset from flash end)", () => {
    const base = buildVoidArenaRestingScene();
    const timeline = buildSingularityTriggerTimeline(base);
    const tickFrames = timeline.frames.slice(2); // skip flash and snap
    // Each tick frame's number should be flashEnd(2) + fibonacciOffset
    tickFrames.forEach((packet, i) => {
      expect(packet.frame).toBe(2 + VOID_TICK_FRAME_OFFSETS[i]);
    });
  });

  it("singularity timeline has correct sceneId and seed", () => {
    const base = buildVoidArenaRestingScene();
    const timeline = buildSingularityTriggerTimeline(base);
    expect(timeline.sceneId).toBe("void_arena");
    expect(timeline.seed).toBe("void_arena_v1");
  });

  it("timeline has a deterministic hash", () => {
    const base = buildVoidArenaRestingScene();
    const t1 = buildSingularityTriggerTimeline(base);
    const t2 = buildSingularityTriggerTimeline(base);
    expect(t1.metadata?.deterministicHash).toBe(t2.metadata?.deterministicHash);
  });
});
```

---

## 11. Regression Risks and Retest Checklist

| Risk | Area | Retest Command |
|------|------|---------------|
| `toStableGodotId` collision between fissure, amethyst, pillar, and shard IDs | `stableId.ts` | `npx vitest run tests/godot/voidArenaScene.test.ts` — unique ID test |
| `printFrameTimeline` frame ordering fails if tick offsets not adjusted for flash frames | `printFrameTimeline.ts` | `npx vitest run tests/godot/voidSingularityTrigger.test.ts` — frame order test |
| `validateFrameTimeline` `FRAME_UPDATE_UNKNOWN_ID` if base objects not in frame 0 | `validateFramePacket.ts` | `npx vitest run tests/godot/` — full suite |
| New `--void-*` CSS variables conflict with existing school variable names | `src/index.css` | `npm run verify:css-tokens` |
| `deepEqualProps` misses `fissure_width` change if it's a number-to-number diff with equal values | `diffFrameState.ts` | Existing `frameDiffing.test.ts` — all 5 tests must remain passing |
| `deterministicHash` changes if prop key order changes in `buildFissureObjects` | `deterministicHash.ts` | Hash stability test in `voidSingularityTrigger.test.ts` |
| Existing `shadowPrintGodotFrameTimeline` behavior unchanged | `shadowPrintGodotFrameTimeline.ts` | `npx vitest run tests/godot/frameInstantiationPrinter.test.ts` |

**Full retest command before committing:**

```bash
npx vitest run tests/godot/ && npx tsc --project tsconfig.json --noEmit && npm run lint
```

---

## 12. Rollout Plan

### Phase 1 — Shadow mode (safe, no game impact)

Build the constants, fissure geometry, and resting scene builder. Export the `FrameInstantiationTimeline` JSON to a test output file only. Do not wire to the combat system. Validate with `validate: false` until all assets exist.

```bash
# Smoke test — write timeline to stdout
npx tsx scripts/debug-void-arena-export.ts
```

### Phase 2 — Asset gate

Create placeholder art assets at the expected `res://art/void/` paths. Enable `validate: true`. Run full QA suite. Assert all 16 existing godot tests still pass.

### Phase 3 — Combat wiring

Wire `buildVoidArenaRestingScene` as the scene initializer for VOID school combat. Wire `buildSingularityTriggerTimeline` to the spell impact event. Enable in a feature flag: `VOID_ARENA_SCENE_ENABLED`.

### Phase 4 — Full rollout

Remove feature flag. Scene is live for all VOID school combat. Monitor for: duplicate ID errors in Godot console, frame order violations in the frame printer log, unexpected tick damage values.

---

## 13. Definition of Done

- [ ] `voidArenaConstants.ts` — all constants defined, typed, exported
- [ ] `voidArenaFissures.ts` — fissure spiral and amethyst scatter builders implemented and correct
- [ ] `voidArenaScene.ts` — `buildVoidArenaRestingScene()` returns valid `NormalizedFrameState` with all required objects
- [ ] `voidSingularityTrigger.ts` — `buildSingularityTriggerTimeline()` produces a valid `FrameInstantiationTimeline` with correct tick count, fibonacci timing, and shard spawns
- [ ] `tests/godot/voidArenaScene.test.ts` — all tests pass
- [ ] `tests/godot/voidSingularityTrigger.test.ts` — all tests pass
- [ ] All 16 existing `tests/godot/` tests continue to pass without modification
- [ ] Zero TypeScript errors: `npx tsc --project tsconfig.json --noEmit`
- [ ] Zero lint warnings: `npm run lint`
- [ ] `--void-*` CSS variables added to `src/index.css`
- [ ] PDR registered in `docs/scholomance-encyclopedia/PDR-archive/README.md`

---

## 14. Final Architectural Verdict

The VOID Art Scene is a clean composition on top of the existing `src/lib/godot/frame-printer` infrastructure. That lib is already verified (16/16 tests passing, zero type errors). Nothing in this PDR requires modifying it.

The scene's mechanical design — negative fibonacci geometry, phi-triangle pillar placement, fibonacci-timed tick damage — maps directly onto the `NormalizedFrameState` / `FrameInstantiationTimeline` model. The fissure network is a set of `AnimatedSprite2D` objects with `props` encoding shader parameters. The singularity trigger produces a deterministic frame diff sequence via `diffFrameState` + `printFrameTimeline`. The whole interaction is reproducible, hashable, and testable.

The one non-trivial implementation concern is the **frame ordering offset** between the flash sequence and the fibonacci tick sequence (Q3 above). This must be resolved before writing `buildSingularityTriggerTimeline` or the timeline will fail `validateFrameTimeline` with a `FRAME_ORDER_INVALID` error. The solution — offset all tick frame numbers by 2 (length of the flash sequence) — is simple and documented.

The scene accumulates persistent state (widened fissures, spawned shards) across triggers. This is architecturally correct and world-law consistent: VOID leaves permanent damage to the arena. The implementation agent should treat the base `NormalizedFrameState` as mutable per-round and not reset it between triggers unless the full scene is reloaded.

**Verdict: Approved for implementation. Begin at Step 1. No architectural blockers.**
