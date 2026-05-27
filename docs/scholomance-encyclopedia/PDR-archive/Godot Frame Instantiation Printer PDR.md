# Godot Frame Instantiation Printer PDR.md

## 1. Executive summary

The **Godot Frame Instantiation Printer** is a deterministic bridge layer that converts Scholomance / Codex visual instructions into concrete Godot-compatible frame packets.

The missing problem is not asset generation, bytecode authoring, or animation theory. The missing problem is **printing**: taking a resolved timeline and emitting stable `create`, `update`, and `destroy` instructions that Godot can instantiate as `Node2D`, `Sprite2D`, `Label`, `AnimatedSprite2D`, `TileMap`, particles, or future packed scene equivalents.

This PDR defines a small, composable bridge module that sits between PixelBrain / Lotus / VerseIR / TrueSight bytecode timeline output and the Godot bridge runtime.

```txt
Text / PixelBrain / Lotus / Bytecode / Timeline Resolver
        ↓
VerseIR / TrueSight bytecode contracts
        ↓
Frame Instantiation Printer
        ↓
Godot Bridge Adapter
        ↓
Godot Nodes / Scenes / Animation Tracks
```

The first implementation should not attempt to solve every possible renderer or animation format. It should create a deterministic, testable packet format and a v0 printer that can output a simple frame sequence from normalized scene object state.

Primary value:

- Makes Godot export deterministic.
- Prevents hard-coded one-off bridge cases.
- Preserves PixelBrain / Lotus composition semantics.
- Enables visual bytecode to become playable or renderable Godot scenes.
- Preserves VerseIR / TrueSight bytecode truth without reimplementing analyzers in Godot.
- Creates a future-compatible path toward `.tscn`, `AnimationPlayer`, runtime JSON ingestion, and recording pipelines.
- Reduces drift between web preview, raster composition, and Godot runtime.

---

## 2. Change classification

**Classification:** Architectural + structural.

This change introduces a new bridge boundary and a new canonical packet contract.

It is not cosmetic because it changes the rendering/export architecture.

It is not directly behavioral at first because the safest rollout begins in shadow mode: generate packets, validate them, hash them, and compare them without changing existing Godot bridge behavior.

It becomes behavioral only when the Godot bridge begins consuming the packets for actual runtime instantiation.

---

## 3. Spec sheet

| Field | Specification |
|---|---|
| Feature name | Godot Frame Instantiation Printer |
| Suggested module name | `FrameInstantiationPrinter` |
| Optional lore name | `ChronoPress` |
| Primary purpose | Convert deterministic visual timeline state into Godot-compatible frame packets |
| Input | Normalized frame states or timeline keyframes from PixelBrain / Lotus / VerseIR / TrueSight bytecode systems |
| Output | `FrameInstantiationTimeline` containing ordered `FrameInstantiationPacket[]` |
| First target | JSON packet output |
| Later targets | Godot runtime loader, `.tscn` generation, `AnimationPlayer` track generation, packed scene output |
| Determinism requirement | Same input + same seed must produce identical packets and hash |
| Rollout mode | Shadow → warn → gated consumer → enforced bridge |
| Public API preservation | Existing Godot bridge APIs should remain unchanged until adapter consumption is proven |
| Core packet operations | `create`, `update`, `destroy` |
| Required validation | Stable IDs, valid frame order, no invalid deletes, no unsupported node types, no nondeterministic fields |
| Test runner | Vitest via `pnpm` |
| First QA file | `tests/godot/frameInstantiationPrinter.test.ts` |
| Main risk | Over-instantiating every frame instead of diffing states |
| Risk countermeasure | Frame diffing is mandatory in v0 |

---

## 4. Assumptions and unknowns

### Assumptions

1. The codebase already has or will soon have a Godot bridge area.
2. PixelBrain / Lotus / bytecode systems can eventually emit normalized visual state or timeline state.
3. The current Godot bridge does not yet have a canonical frame-by-frame instantiation packet layer.
4. Existing behavior should not break while this system is introduced.
5. The safest first artifact is JSON because it is easy to inspect, validate, snapshot, hash, and adapt.
6. The frame printer should be engine-facing, not UI-facing.
7. Frame packets should represent concrete runtime instructions, not high-level creative intent.
8. VerseIR solves text structure before Godot sees it.
9. TrueSight solves visual/text overlay semantics as bytecode before Godot sees it.
10. Godot must consume VerseIR / TrueSight bytecode contracts; it must not duplicate the browser or CODEx analyzer logic.

### Unknowns

| Unknown | Safe handling |
|---|---|
| Exact current Godot bridge folder | Use adapter folder and avoid direct invasive rewrites |
| Existing bytecode timeline schema | Create a normalizer adapter rather than coupling directly |
| Whether Godot consumes JSON, GDScript, or `.tscn` first | Emit JSON first; create consumer adapters later |
| Whether Godot should use custom GDScript annotations | Prefer exported fields and scene metadata; arbitrary custom annotations are not the v0 contract |
| Whether Lotus cels already map cleanly to Godot layers | Keep `celId`, `sourceId`, and `zIndex` metadata optional |
| Whether IDs already exist upstream | Add deterministic ID derivation helper |
| Whether frame rate is global or scene-specific | Store `fps` on timeline object |
| Whether Godot runtime should diff or printer should diff | Printer should diff; Godot should consume simple instructions |
| Whether transforms are 2D only | v0 should be 2D only; reserve `props` for future expansion |

---

## 5. Architecture diagram / file map

### Proposed file map

```txt
src/
  lib/
    godot/
      frame-printer/
        types.ts
        constants.ts
        deterministicHash.ts
        stableId.ts
        validateFramePacket.ts
        diffFrameState.ts
        printFrameTimeline.ts
        adapters/
          fromNormalizedScene.ts
          toGodotRuntimeJson.ts
        index.ts

tests/
  godot/
    frameInstantiationPrinter.test.ts
    framePacketValidation.test.ts
    frameDiffing.test.ts
```

### Dependency direction

```txt
PixelBrain / Lotus / VerseIR / TrueSight bytecode systems
        ↓
Adapter: fromNormalizedScene
        ↓
FrameInstantiationPrinter core
        ↓
Adapter: toGodotRuntimeJson
        ↓
Godot bridge consumer
```

### Boundary rule

The frame printer should not import React, route modules, UI state, DOM utilities, or Godot-specific runtime execution code.

The frame printer also should not reproduce CODEx, VerseIR, or TrueSight analysis logic. Those systems remain upstream authorities. The printer consumes normalized state and bytecode-derived facts only.

Correct authority flow:

```txt
Text
        ↓
VerseIR
        ↓
visualBytecode / trueSightBytecode / PixelBrain bytecode
        ↓
AMP or Godot Bridge adapter
        ↓
FrameInstantiationPrinter
        ↓
Godot metadata / exported resource fields / scene nodes
```

Godot may attach bytecode to nodes, resources, or scenes:

```gdscript
node.set_meta("scholomance_kind", "verseir.truesight.v1")
node.set_meta("scholomance_bytecode", bytecode)
node.set_meta("truesight_bytecode", truesight_bytecode)
```

or:

```gdscript
@export var scholomance_kind: String
@export var scholomance_bytecode: String
@export var verseir_payload: Dictionary
@export var truesight_bytecode: PackedStringArray
```

The v0 contract must prefer metadata/exported fields over relying on arbitrary custom GDScript annotations.

Allowed dependencies:

- Type definitions
- Deterministic hash helper
- Stable ID helper
- Validation helper
- Data-only adapters

Disallowed dependencies:

- `Math.random`
- DOM APIs
- React components
- live Godot bridge execution functions
- VerseIR compiler internals
- TrueSight analyzer internals
- current route state
- non-deterministic timestamps

---

## 5.1 Canonical authority rule: VerseIR AMP + TrueSight bytecode bridge

The Godot Frame Instantiation Printer must treat Scholomance analysis systems as upstream authorities, not logic to be reimplemented.

### VerseIR as AMP source

VerseIR should be wired into Godot through an AMP adapter. Godot is not a separate animation or semantic compiler. It is an execution target for already-resolved intent.

Correct flow:

```txt
VerseIR
        ↓
Godot AMP adapter
        ↓
FrameInstantiationPrinter
        ↓
Godot node packets
```

## 6. Step-by-step implementation plan

### Step 1: Add packet types

Create:

```txt
src/lib/godot/frame-printer/types.ts
```

Purpose:

Define stable, serializable contracts before adding logic.

```ts
export type GodotNodeType =
  | "Node2D"
  | "Sprite2D"
  | "AnimatedSprite2D"
  | "Label"
  | "TileMap"
  | "ParticleEmitter2D";

export type GodotTransform2D = {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  zIndex?: number;
};

export type GodotCreateInstruction = {
  op: "create";
  id: string;
  type: GodotNodeType;
  parentId?: string;
  resource?: string;
  transform: GodotTransform2D;
  props?: Record<string, unknown>;
};

export type GodotUpdateInstruction = {
  op: "update";
  id: string;
  transform?: Partial<GodotTransform2D>;
  /** Omitted when visibility is unchanged or the source has no explicit visibility preference. */
  visible?: boolean;
  props?: Record<string, unknown>;
};

export type GodotDestroyInstruction = {
  op: "destroy";
  id: string;
};

export type GodotFrameInstruction =
  | GodotCreateInstruction
  | GodotUpdateInstruction
  | GodotDestroyInstruction;

export type FrameInstantiationPacket = {
  frame: number;
  timestampMs: number;
  sceneId: string;
  seed: string;
  create: GodotCreateInstruction[];
  update: GodotUpdateInstruction[];
  destroy: GodotDestroyInstruction[];
  metadata?: {
    sourceBytecodeId?: string;
    verseIrId?: string;
    trueSightBytecodeId?: string;
    bytecodeAuthority?: "verseir" | "truesight" | "pixelbrain" | "lotus" | "manual";
    celId?: string;
    passId?: string;
    deterministicHash?: string;
  };
};

export type FrameInstantiationTimeline = {
  schemaVersion: 1;
  sceneId: string;
  fps: number;
  /** Exclusive upper bound of frame numbers, not the number of packets in sparse timelines. */
  durationFrames: number;
  seed: string;
  frames: FrameInstantiationPacket[];
  metadata?: {
    printerVersion?: string;
    sourceSystem?: "pixelbrain" | "lotus" | "bytecode" | "verseir" | "truesight" | "manual";
    verseIrId?: string;
    trueSightBytecodeId?: string;
    bytecodeContract?: "visualBytecode" | "trueSightBytecode" | "pixelBrainBytecode" | "framePacket";
    deterministicHash?: string;
  };
};

export type NormalizedSceneObject = {
  id: string;
  type: GodotNodeType;
  parentId?: string;
  resource?: string;
  transform: GodotTransform2D;
  /** Undefined means no explicit visibility preference; it is not serialized as a reset. */
  visible?: boolean;
  props?: Record<string, unknown>;
};

export type NormalizedFrameState = {
  frame: number;
  timestampMs: number;
  sceneId: string;
  seed: string;
  objects: NormalizedSceneObject[];
};
```

---

### Step 2: Add supported node registry

Create:

```txt
src/lib/godot/frame-printer/constants.ts
```

Purpose:

Avoid hard-coded conditionals scattered across printer logic.

```ts
import type { GodotNodeType } from "./types";

export const FRAME_PRINTER_SCHEMA_VERSION = 1;

export const SUPPORTED_GODOT_NODE_TYPES: ReadonlySet<GodotNodeType> =
  new Set<GodotNodeType>([
    "Node2D",
    "Sprite2D",
    "AnimatedSprite2D",
    "Label",
    "TileMap",
    "ParticleEmitter2D",
  ]);

export const DEFAULT_FRAME_PRINTER_VERSION = "0.1.0";
```

---

### Step 3: Add deterministic stable ID helper

Create:

```txt
src/lib/godot/frame-printer/stableId.ts
```

Purpose:

Ensure generated object IDs are repeatable and safe for Godot-facing packets.

```ts
export function toStableGodotId(parts: Array<string | number | undefined>): string {
  const raw = parts
    .filter((part) => part !== undefined && part !== "")
    .map((part) => String(part).trim())
    .join("__");

  const normalized = raw
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (!normalized) {
    throw new Error("Cannot create stable Godot ID from empty parts.");
  }

  return normalized;
}
```

---

### Step 4: Add deterministic hash helper

Create:

```txt
src/lib/godot/frame-printer/deterministicHash.ts
```

Purpose:

Provide a stable QA-friendly hash without relying on insertion-order accidents.

```ts
function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, sortValue(nested)])
    );
  }

  return value;
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

export function deterministicHash(value: unknown): string {
  const input = stableStringify(value);
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `fnv1a_${(hash >>> 0).toString(16).padStart(8, "0")}`;
}
```

This is not cryptographic. It is a deterministic QA checksum.

---

### Step 5: Add packet validation

Create:

```txt
src/lib/godot/frame-printer/validateFramePacket.ts
```

Purpose:

Fail closed before Godot consumes malformed packets.

```ts
import { SUPPORTED_GODOT_NODE_TYPES } from "./constants";
import type {
  FrameInstantiationPacket,
  FrameInstantiationTimeline,
  GodotCreateInstruction,
  GodotDestroyInstruction,
  GodotUpdateInstruction,
} from "./types";

export type FrameValidationIssue = {
  code: string;
  message: string;
  frame?: number;
  id?: string;
};

export type FrameValidationResult = {
  ok: boolean;
  issues: FrameValidationIssue[];
};

function validateCreate(
  instruction: GodotCreateInstruction,
  frame: number,
  seenIds: Set<string>
): FrameValidationIssue[] {
  const issues: FrameValidationIssue[] = [];

  if (!instruction.id) {
    issues.push({
      code: "FRAME_CREATE_MISSING_ID",
      message: "Create instruction is missing an id.",
      frame,
    });
  }

  if (seenIds.has(instruction.id)) {
    issues.push({
      code: "FRAME_CREATE_DUPLICATE_ID",
      message: `Create instruction reused existing id: ${instruction.id}`,
      frame,
      id: instruction.id,
    });
  }

  if (!SUPPORTED_GODOT_NODE_TYPES.has(instruction.type)) {
    issues.push({
      code: "FRAME_CREATE_UNSUPPORTED_NODE_TYPE",
      message: `Unsupported Godot node type: ${instruction.type}`,
      frame,
      id: instruction.id,
    });
  }

  return issues;
}

function validateUpdate(
  instruction: GodotUpdateInstruction,
  frame: number,
  seenIds: Set<string>
): FrameValidationIssue[] {
  if (!seenIds.has(instruction.id)) {
    return [
      {
        code: "FRAME_UPDATE_UNKNOWN_ID",
        message: `Update instruction targets unknown id: ${instruction.id}`,
        frame,
        id: instruction.id,
      },
    ];
  }

  return [];
}

function validateDestroy(
  instruction: GodotDestroyInstruction,
  frame: number,
  seenIds: Set<string>
): FrameValidationIssue[] {
  if (!seenIds.has(instruction.id)) {
    return [
      {
        code: "FRAME_DESTROY_UNKNOWN_ID",
        message: `Destroy instruction targets unknown id: ${instruction.id}`,
        frame,
        id: instruction.id,
      },
    ];
  }

  return [];
}

export function validateFrameTimeline(
  timeline: FrameInstantiationTimeline
): FrameValidationResult {
  const issues: FrameValidationIssue[] = [];
  const seenIds = new Set<string>();
  let previousFrame = -1;

  for (const packet of timeline.frames) {
    if (packet.frame <= previousFrame) {
      issues.push({
        code: "FRAME_ORDER_INVALID",
        message: `Frame ${packet.frame} is not strictly after frame ${previousFrame}.`,
        frame: packet.frame,
      });
    }

    previousFrame = packet.frame;

    for (const create of packet.create) {
      issues.push(...validateCreate(create, packet.frame, seenIds));
      seenIds.add(create.id);
    }

    for (const update of packet.update) {
      issues.push(...validateUpdate(update, packet.frame, seenIds));
    }

    for (const destroy of packet.destroy) {
      issues.push(...validateDestroy(destroy, packet.frame, seenIds));
      seenIds.delete(destroy.id);
    }
  }

  return {
    ok: issues.length === 0,
    issues,
  };
}

export function assertValidFrameTimeline(
  timeline: FrameInstantiationTimeline
): void {
  const result = validateFrameTimeline(timeline);

  if (!result.ok) {
    const printable = result.issues
      .map((issue) => `${issue.code}: ${issue.message}`)
      .join("\n");

    throw new Error(`Invalid frame instantiation timeline:\n${printable}`);
  }
}
```

---

### Step 6: Add frame diffing

Create:

```txt
src/lib/godot/frame-printer/diffFrameState.ts
```

Purpose:

Prevent recreating every object every frame.

```ts
import type {
  GodotCreateInstruction,
  GodotDestroyInstruction,
  GodotUpdateInstruction,
  GodotTransform2D,
  NormalizedFrameState,
  NormalizedSceneObject,
} from "./types";

function deepEqualValue(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true;
  }

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
      return false;
    }

    return left.every((leftValue, index) => deepEqualValue(leftValue, right[index]));
  }

  if (
    left &&
    right &&
    typeof left === "object" &&
    typeof right === "object"
  ) {
    const leftEntries = Object.entries(left as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b)
    );
    const rightEntries = Object.entries(right as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b)
    );

    if (leftEntries.length !== rightEntries.length) {
      return false;
    }

    return leftEntries.every(([key, leftValue], index) => {
      const [rightKey, rightValue] = rightEntries[index];
      return key === rightKey && deepEqualValue(leftValue, rightValue);
    });
  }

  return false;
}

function deepEqualProps(
  left: Record<string, unknown> | undefined,
  right: Record<string, unknown> | undefined
): boolean {
  return deepEqualValue(left ?? {}, right ?? {});
}

function diffTransform(
  previous: GodotTransform2D,
  next: GodotTransform2D
): Partial<GodotTransform2D> | undefined {
  const diff: Partial<GodotTransform2D> = {};

  for (const key of ["x", "y", "rotation", "scaleX", "scaleY", "zIndex"] as const) {
    if (previous[key] !== next[key]) {
      diff[key] = next[key] as never;
    }
  }

  return Object.keys(diff).length > 0 ? diff : undefined;
}

function toCreateInstruction(object: NormalizedSceneObject): GodotCreateInstruction {
  return {
    op: "create",
    id: object.id,
    type: object.type,
    parentId: object.parentId,
    resource: object.resource,
    transform: object.transform,
    props: object.props,
  };
}

export type FrameStateDiff = {
  create: GodotCreateInstruction[];
  update: GodotUpdateInstruction[];
  destroy: GodotDestroyInstruction[];
};

export function diffFrameState(
  previousFrame: NormalizedFrameState | undefined,
  nextFrame: NormalizedFrameState
): FrameStateDiff {
  const previousObjects = new Map(
    previousFrame?.objects.map((object) => [object.id, object]) ?? []
  );

  const nextObjects = new Map(nextFrame.objects.map((object) => [object.id, object]));

  const create: GodotCreateInstruction[] = [];
  const update: GodotUpdateInstruction[] = [];
  const destroy: GodotDestroyInstruction[] = [];

  for (const nextObject of nextFrame.objects) {
    const previousObject = previousObjects.get(nextObject.id);

    if (!previousObject) {
      create.push(toCreateInstruction(nextObject));
      continue;
    }

    const transformDiff = diffTransform(previousObject.transform, nextObject.transform);
    const propsChanged = !deepEqualProps(previousObject.props, nextObject.props);
    const visibleChanged = nextObject.visible !== undefined && previousObject.visible !== nextObject.visible;

    if (transformDiff || propsChanged || visibleChanged) {
      update.push({
        op: "update",
        id: nextObject.id,
        transform: transformDiff,
        visible: visibleChanged ? nextObject.visible : undefined,
        props: propsChanged ? nextObject.props : undefined,
      });
    }
  }

  for (const previousObject of previousObjects.values()) {
    if (!nextObjects.has(previousObject.id)) {
      destroy.push({
        op: "destroy",
        id: previousObject.id,
      });
    }
  }

  return { create, update, destroy };
}
```

---

### Step 7: Add timeline printer

Create:

```txt
src/lib/godot/frame-printer/printFrameTimeline.ts
```

Purpose:

Convert ordered normalized frames into final packet timeline.

```ts
import {
  DEFAULT_FRAME_PRINTER_VERSION,
  FRAME_PRINTER_SCHEMA_VERSION,
} from "./constants";
import { deterministicHash } from "./deterministicHash";
import { diffFrameState } from "./diffFrameState";
import { assertValidFrameTimeline } from "./validateFramePacket";
import type {
  FrameInstantiationPacket,
  FrameInstantiationTimeline,
  NormalizedFrameState,
} from "./types";

export type PrintFrameTimelineOptions = {
  sceneId: string;
  fps: number;
  seed: string;
  sourceSystem?: "pixelbrain" | "lotus" | "bytecode" | "verseir" | "truesight" | "manual";
  verseIrId?: string;
  trueSightBytecodeId?: string;
  bytecodeContract?: "visualBytecode" | "trueSightBytecode" | "pixelBrainBytecode" | "framePacket";
  validate?: boolean;
};

export function printFrameTimeline(
  frames: NormalizedFrameState[],
  options: PrintFrameTimelineOptions
): FrameInstantiationTimeline {
  if (frames.length === 0) {
    throw new Error("Cannot print frame timeline from empty frames.");
  }

  const orderedFrames = [...frames].sort((left, right) => left.frame - right.frame);
  const packets: FrameInstantiationPacket[] = [];

  for (let index = 0; index < orderedFrames.length; index += 1) {
    const previousFrame = index > 0 ? orderedFrames[index - 1] : undefined;
    const nextFrame = orderedFrames[index];
    const diff = diffFrameState(previousFrame, nextFrame);

    const packetWithoutHash: FrameInstantiationPacket = {
      frame: nextFrame.frame,
      timestampMs: nextFrame.timestampMs,
      sceneId: options.sceneId,
      seed: options.seed,
      create: diff.create,
      update: diff.update,
      destroy: diff.destroy,
      metadata: {},
    };

    packets.push({
      ...packetWithoutHash,
      metadata: {
        deterministicHash: deterministicHash(packetWithoutHash),
      },
    });
  }

  const timelineWithoutHash: FrameInstantiationTimeline = {
    schemaVersion: FRAME_PRINTER_SCHEMA_VERSION,
    sceneId: options.sceneId,
    fps: options.fps,
    durationFrames: orderedFrames[orderedFrames.length - 1].frame + 1,
    seed: options.seed,
    frames: packets,
    metadata: {
      printerVersion: DEFAULT_FRAME_PRINTER_VERSION,
      sourceSystem: options.sourceSystem ?? "manual",
      verseIrId: options.verseIrId,
      trueSightBytecodeId: options.trueSightBytecodeId,
      bytecodeContract: options.bytecodeContract,
    },
  };

  const timeline: FrameInstantiationTimeline = {
    ...timelineWithoutHash,
    metadata: {
      ...timelineWithoutHash.metadata,
      deterministicHash: deterministicHash(timelineWithoutHash),
    },
  };

  if (options.validate ?? true) {
    assertValidFrameTimeline(timeline);
  }

  return timeline;
}
```

---

### Step 8: Add JSON adapter

Create:

```txt
src/lib/godot/frame-printer/adapters/toGodotRuntimeJson.ts
```

Purpose:

Keep Godot output formatting separate from printer core.

```ts
import { stableStringify } from "../deterministicHash";
import type { FrameInstantiationTimeline } from "../types";

export function toGodotRuntimeJson(timeline: FrameInstantiationTimeline): string {
  return `${stableStringify(timeline)}\n`;
}
```

---

### Step 9: Add index exports

Create:

```txt
src/lib/godot/frame-printer/index.ts
```

Purpose:

Make the module easy to consume without exposing internal path chaos.

```ts
export * from "./types";
export * from "./constants";
export * from "./deterministicHash";
export * from "./stableId";
export * from "./diffFrameState";
export * from "./printFrameTimeline";
export * from "./validateFramePacket";
export * from "./adapters/toGodotRuntimeJson";
```

---

### Step 10: Add shadow-mode usage

Do not wire this into live Godot instantiation immediately.

First, create a shadow mode call from the existing bridge or export flow.

Example:

```ts
import {
  printFrameTimeline,
  toGodotRuntimeJson,
  type NormalizedFrameState,
} from "@/lib/godot/frame-printer";

export function shadowPrintGodotFrameTimeline(frames: NormalizedFrameState[]): string {
  const timeline = printFrameTimeline(frames, {
    sceneId: "shadow_scene",
    fps: 60,
    seed: "shadow_seed_v1",
    sourceSystem: "manual",
    validate: true,
  });

  return toGodotRuntimeJson(timeline);
}
```

This should log, snapshot, or export the packet without changing runtime behavior.

---

## 7. Code examples for each major step

### Example A: Build a 3-frame test scene

```ts
import {
  printFrameTimeline,
  type NormalizedFrameState,
} from "@/lib/godot/frame-printer";

const frames: NormalizedFrameState[] = [
  {
    frame: 0,
    timestampMs: 0,
    sceneId: "glyph_test",
    seed: "glyph_seed_001",
    objects: [
      {
        id: "glyph_orb",
        type: "Sprite2D",
        resource: "res://sprites/glyph_orb.png",
        visible: true,
        transform: {
          x: 0,
          y: 0,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          zIndex: 10,
        },
      },
    ],
  },
  {
    frame: 1,
    timestampMs: 16.6667,
    sceneId: "glyph_test",
    seed: "glyph_seed_001",
    objects: [
      {
        id: "glyph_orb",
        type: "Sprite2D",
        resource: "res://sprites/glyph_orb.png",
        visible: true,
        transform: {
          x: 8,
          y: 0,
          rotation: 0.05,
          scaleX: 1,
          scaleY: 1,
          zIndex: 10,
        },
      },
    ],
  },
  {
    frame: 2,
    timestampMs: 33.3334,
    sceneId: "glyph_test",
    seed: "glyph_seed_001",
    objects: [],
  },
];

const timeline = printFrameTimeline(frames, {
  sceneId: "glyph_test",
  fps: 60,
  seed: "glyph_seed_001",
  sourceSystem: "manual",
});
```

Expected behavior:

- Frame `0` creates `glyph_orb`.
- Frame `1` updates only changed transform fields.
- Frame `2` destroys `glyph_orb`.
- Same input produces same timeline hash.

---

### Example B: Consume packet in Godot later

This is not the first implementation target, but it shows why the contract exists.

```gdscript
extends Node2D

var nodes_by_id := {}

func apply_frame_packet(packet: Dictionary) -> void:
    for create_instruction in packet.get("create", []):
        _create_node(create_instruction)

    for update_instruction in packet.get("update", []):
        _update_node(update_instruction)

    for destroy_instruction in packet.get("destroy", []):
        _destroy_node(destroy_instruction)

func _create_node(instruction: Dictionary) -> void:
    var node_type = instruction.get("type", "Node2D")
    var node: Node2D

    match node_type:
        "Sprite2D":
            node = Sprite2D.new()
        "Label":
            node = Label.new()
        _:
            node = Node2D.new()

    node.name = instruction["id"]
    _apply_transform(node, instruction.get("transform", {}))
    add_child(node)
    nodes_by_id[instruction["id"]] = node

func _update_node(instruction: Dictionary) -> void:
    var node = nodes_by_id.get(instruction["id"])
    if node == null:
        push_warning("Unknown node id: " + instruction["id"])
        return

    if instruction.has("transform"):
        _apply_transform(node, instruction["transform"])

    if instruction.has("visible"):
        node.visible = instruction["visible"]

func _destroy_node(instruction: Dictionary) -> void:
    var node = nodes_by_id.get(instruction["id"])
    if node == null:
        push_warning("Cannot destroy unknown node id: " + instruction["id"])
        return

    nodes_by_id.erase(instruction["id"])
    node.queue_free()

func _apply_transform(node: Node2D, transform: Dictionary) -> void:
    if transform.has("x"):
        node.position.x = transform["x"]
    if transform.has("y"):
        node.position.y = transform["y"]
    if transform.has("rotation"):
        node.rotation = transform["rotation"]
    if transform.has("scaleX"):
        node.scale.x = transform["scaleX"]
    if transform.has("scaleY"):
        node.scale.y = transform["scaleY"]
    if transform.has("zIndex"):
        node.z_index = transform["zIndex"]
```

---

### Example C: Feature flag wrapper

```ts
type FramePrinterMode = "off" | "shadow" | "warn" | "gate";

export function getFramePrinterMode(): FramePrinterMode {
  const raw = import.meta.env.VITE_GODOT_FRAME_PRINTER_MODE;

  if (raw === "shadow" || raw === "warn" || raw === "gate") {
    return raw;
  }

  return "off";
}
```

Usage:

```ts
import { getFramePrinterMode } from "./getFramePrinterMode";

export function maybePrintGodotFrames(frames: NormalizedFrameState[]): void {
  const mode = getFramePrinterMode();

  if (mode === "off") {
    return;
  }

  try {
    const timeline = printFrameTimeline(frames, {
      sceneId: "bridge_shadow",
      fps: 60,
      seed: "bridge_shadow_seed",
      sourceSystem: "bytecode",
      validate: true,
    });

    if (mode === "shadow") {
      console.debug("[FramePrinter:shadow]", timeline.metadata?.deterministicHash);
    }

    if (mode === "warn") {
      console.warn("[FramePrinter:warn]", timeline);
    }

    if (mode === "gate") {
      // Later: pass timeline to actual Godot bridge consumer.
    }
  } catch (error) {
    if (mode === "gate") {
      throw error;
    }

    console.warn("[FramePrinter:nonblocking-error]", error);
  }
}
```

---

## 8. Glossary of all important terms

### Frame Instantiation Printer

The module that converts normalized visual frame state into concrete Godot-facing frame packets.

### ChronoPress

Optional lore name for the same system. Use only in UI or documentation if desired. Keep code names plain unless the repo convention favors lore names.

### Frame packet

A single frame's list of `create`, `update`, and `destroy` instructions.

### Timeline

The full ordered list of frame packets for a scene.

### Normalized frame state

A renderer-neutral snapshot of what objects should exist at a given frame.

### Create instruction

An instruction telling Godot to instantiate a node.

### Update instruction

An instruction telling Godot to mutate an existing node.

### Destroy instruction

An instruction telling Godot to remove an existing node.

### Stable ID

A deterministic object identifier that remains consistent across frames.

### Deterministic hash

A repeatable checksum used for QA, snapshot testing, and drift detection.

### Shadow mode

A rollout stage where packets are generated and inspected but not consumed by the live Godot bridge.

### Warn mode

A rollout stage where validation issues are visible but do not block existing behavior.

### Gate mode

A rollout stage where valid packets are allowed to control bridge behavior.

### Enforced mode

Future final stage where invalid packets fail closed and prevent bridge export.

### Adapter layer

A thin conversion layer between uncertain existing contracts and the new canonical packet format.

### Godot bridge

The system that transfers Scholomance / Codex output into Godot runtime or project assets.

### Lotus

The raster composition engine responsible for cels, blending, masks, buffers, lighting, and final image assembly.

### PixelBrain

The deterministic visual / bytecode / formula engine that produces visual composition instructions.

---

## 9. Q&A: confusing implementation concerns and solves

### 1. Should the printer instantiate every object every frame?

No.

It must diff frame state. Recreating everything every frame will create performance problems and make Godot behavior unstable. The printer should emit creates only when an object first appears, updates only when fields change, and destroys only when an object disappears.

---

### 2. Should Godot perform the diff instead?

No for v0.

The printer should emit simple packets so the Godot bridge stays dumb, stable, and easy to debug. Godot should apply instructions, not infer intent.

---

### 3. Should this output `.tscn` files immediately?

No.

Start with JSON. JSON is easier to test, hash, snapshot, validate, and review. `.tscn` generation can become a later adapter.

---

### 4. Should this directly import PixelBrain or Lotus modules?

Not at first.

Use adapters. The printer core should accept normalized frame state. PixelBrain / Lotus-specific conversion should live in adapter files.

---

### 5. Should the printer know about UI routes?

No.

This is engine infrastructure. It should not import route state, React components, DOM helpers, or editor-specific UI state.

---

### 6. Should Godot duplicate TrueSight analysis logic?

No.

Godot should duplicate the bytecode contract, not the analyzer. TrueSight analysis belongs upstream in Scholomance / CODEx. Godot consumes `trueSightBytecode`, node metadata, and already-normalized frame state. If Godot re-analyzes text, the browser and Godot can drift.

Correct:

```txt
VerseIR / TrueSight analyzer -> trueSightBytecode -> Godot metadata -> renderer
```

Incorrect:

```txt
Text -> independent Godot TrueSight analyzer -> separate Godot truth
```

---

### 7. Should VerseIR be recompiled inside Godot?

No for v0.

VerseIR solves text structure before the printer. The printer and Godot bridge should consume VerseIR-derived identifiers, bytecode references, and normalized frame state. A future Godot-side compiler would require its own schema proposal and parity battery.

---

### 8. Should the Godot bridge use GDScript annotations for bytecode?

Use Godot metadata or exported fields first.

Built-in GDScript annotations such as `@tool` and `@export` are stable, but arbitrary custom annotation semantics are not the v0 bridge contract. Attach Scholomance data this way:

```gdscript
node.set_meta("scholomance_bytecode", bytecode)
node.set_meta("truesight_bytecode", truesight_bytecode)
```

or:

```gdscript
@export var scholomance_bytecode: String
@export var truesight_bytecode: PackedStringArray
```

---

### 9. How are object IDs created?

Use stable IDs from upstream when available. If upstream does not provide IDs, derive them deterministically using `toStableGodotId([sceneId, celId, objectRole, index])`.

Never use random IDs.

---

### 10. How should unsupported Godot node types be handled?

Fail validation in gate/enforced mode. Warn in shadow/warn mode.

Do not silently coerce unsupported types unless a named adapter explicitly maps them.

---

### 11. How should frame timing be represented?

Use both `frame` and `timestampMs`.

`frame` is canonical for ordering. `timestampMs` is useful for playback, debugging, and future audio sync.

---

### 12. What if two systems disagree about transform units?

Do not solve that inside the printer.

Create an adapter that normalizes coordinate systems before packet creation. The printer assumes normalized Godot-ready 2D coordinates.

---

### 13. What is the smallest useful first demo?

A 60-frame scene with:

- one background `Node2D` or `Sprite2D`
- one moving glyph `Sprite2D`
- one `Label`
- deterministic hash
- validation passing
- snapshot test proving stable output

This proves the architecture without summoning the whole cathedral at once.

---

## 10. QA plan with exact tests to create, file names, commands, and code examples

### Test command

Run:

```bash
pnpm vitest run tests/godot/frameInstantiationPrinter.test.ts
pnpm vitest run tests/godot/framePacketValidation.test.ts
pnpm vitest run tests/godot/frameDiffing.test.ts
```

If the repo uses a broader test command:

```bash
pnpm test
```

or:

```bash
pnpm vitest run
```

---

### Test 1: deterministic output

Create:

```txt
tests/godot/frameInstantiationPrinter.test.ts
```

```ts
import { describe, expect, it } from "vitest";
import {
  printFrameTimeline,
  type NormalizedFrameState,
} from "../../src/lib/godot/frame-printer";

function makeFrames(): NormalizedFrameState[] {
  return [
    {
      frame: 0,
      timestampMs: 0,
      sceneId: "determinism_test",
      seed: "seed_a",
      objects: [
        {
          id: "orb",
          type: "Sprite2D",
          resource: "res://orb.png",
          visible: true,
          transform: {
            x: 0,
            y: 0,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
          },
        },
      ],
    },
  ];
}

describe("printFrameTimeline", () => {
  it("prints deterministic timelines for identical input", () => {
    const left = printFrameTimeline(makeFrames(), {
      sceneId: "determinism_test",
      fps: 60,
      seed: "seed_a",
      sourceSystem: "manual",
    });

    const right = printFrameTimeline(makeFrames(), {
      sceneId: "determinism_test",
      fps: 60,
      seed: "seed_a",
      sourceSystem: "manual",
    });

    expect(left).toEqual(right);
    expect(left.metadata?.deterministicHash).toBe(right.metadata?.deterministicHash);
  });
});
```

---

### Test 2: first frame creates object

```ts
import { describe, expect, it } from "vitest";
import {
  printFrameTimeline,
  type NormalizedFrameState,
} from "../../src/lib/godot/frame-printer";

describe("FrameInstantiationPrinter create behavior", () => {
  it("creates objects that appear in the first frame", () => {
    const frames: NormalizedFrameState[] = [
      {
        frame: 0,
        timestampMs: 0,
        sceneId: "create_test",
        seed: "seed_create",
        objects: [
          {
            id: "label_intro",
            type: "Label",
            visible: true,
            transform: {
              x: 10,
              y: 20,
              rotation: 0,
              scaleX: 1,
              scaleY: 1,
            },
            props: {
              text: "ChronoPress online",
            },
          },
        ],
      },
    ];

    const timeline = printFrameTimeline(frames, {
      sceneId: "create_test",
      fps: 60,
      seed: "seed_create",
      sourceSystem: "manual",
    });

    expect(timeline.frames[0].create).toHaveLength(1);
    expect(timeline.frames[0].create[0].id).toBe("label_intro");
    expect(timeline.frames[0].update).toHaveLength(0);
    expect(timeline.frames[0].destroy).toHaveLength(0);
  });
});
```

---

### Test 3: update only changed transform fields

Create:

```txt
tests/godot/frameDiffing.test.ts
```

```ts
import { describe, expect, it } from "vitest";
import { diffFrameState } from "../../src/lib/godot/frame-printer";
import type { NormalizedFrameState } from "../../src/lib/godot/frame-printer";

describe("diffFrameState", () => {
  it("updates only changed transform fields", () => {
    const previousFrame: NormalizedFrameState = {
      frame: 0,
      timestampMs: 0,
      sceneId: "diff_test",
      seed: "seed_diff",
      objects: [
        {
          id: "orb",
          type: "Sprite2D",
          visible: true,
          transform: {
            x: 0,
            y: 0,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
          },
        },
      ],
    };

    const nextFrame: NormalizedFrameState = {
      frame: 1,
      timestampMs: 16.6667,
      sceneId: "diff_test",
      seed: "seed_diff",
      objects: [
        {
          id: "orb",
          type: "Sprite2D",
          visible: true,
          transform: {
            x: 10,
            y: 0,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
          },
        },
      ],
    };

    const diff = diffFrameState(previousFrame, nextFrame);

    expect(diff.create).toHaveLength(0);
    expect(diff.destroy).toHaveLength(0);
    expect(diff.update).toEqual([
      {
        op: "update",
        id: "orb",
        transform: {
          x: 10,
        },
        visible: undefined,
        props: undefined,
      },
    ]);
  });
});
```

---

### Test 4: object removal emits destroy

```ts
import { describe, expect, it } from "vitest";
import { diffFrameState } from "../../src/lib/godot/frame-printer";
import type { NormalizedFrameState } from "../../src/lib/godot/frame-printer";

describe("diffFrameState destroy behavior", () => {
  it("emits destroy when an object disappears", () => {
    const previousFrame: NormalizedFrameState = {
      frame: 0,
      timestampMs: 0,
      sceneId: "destroy_test",
      seed: "seed_destroy",
      objects: [
        {
          id: "temporary_glyph",
          type: "Sprite2D",
          transform: {
            x: 0,
            y: 0,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
          },
        },
      ],
    };

    const nextFrame: NormalizedFrameState = {
      frame: 1,
      timestampMs: 16.6667,
      sceneId: "destroy_test",
      seed: "seed_destroy",
      objects: [],
    };

    const diff = diffFrameState(previousFrame, nextFrame);

    expect(diff.destroy).toEqual([
      {
        op: "destroy",
        id: "temporary_glyph",
      },
    ]);
  });
});
```

---

### Test 5: validation catches unsupported node type

Create:

```txt
tests/godot/framePacketValidation.test.ts
```

```ts
import { describe, expect, it } from "vitest";
import { validateFrameTimeline } from "../../src/lib/godot/frame-printer";
import type { FrameInstantiationTimeline } from "../../src/lib/godot/frame-printer";

describe("validateFrameTimeline", () => {
  it("rejects unsupported node types", () => {
    const timeline: FrameInstantiationTimeline = {
      schemaVersion: 1,
      sceneId: "invalid_type_test",
      fps: 60,
      durationFrames: 1,
      seed: "seed_invalid",
      frames: [
        {
          frame: 0,
          timestampMs: 0,
          sceneId: "invalid_type_test",
          seed: "seed_invalid",
          create: [
            {
              op: "create",
              id: "bad_node",
              type: "UnsupportedNode" as never,
              transform: {
                x: 0,
                y: 0,
                rotation: 0,
                scaleX: 1,
                scaleY: 1,
              },
            },
          ],
          update: [],
          destroy: [],
        },
      ],
    };

    const result = validateFrameTimeline(timeline);

    expect(result.ok).toBe(false);
    expect(result.issues.some(
      (issue) => issue.code === "FRAME_CREATE_UNSUPPORTED_NODE_TYPE"
    )).toBe(true);
  });
});
```

---

### Test 6: validation catches invalid update target

```ts
import { describe, expect, it } from "vitest";
import { validateFrameTimeline } from "../../src/lib/godot/frame-printer";
import type { FrameInstantiationTimeline } from "../../src/lib/godot/frame-printer";

describe("validateFrameTimeline update target checks", () => {
  it("rejects updates targeting unknown ids", () => {
    const timeline: FrameInstantiationTimeline = {
      schemaVersion: 1,
      sceneId: "unknown_update_test",
      fps: 60,
      durationFrames: 1,
      seed: "seed_unknown_update",
      frames: [
        {
          frame: 0,
          timestampMs: 0,
          sceneId: "unknown_update_test",
          seed: "seed_unknown_update",
          create: [],
          update: [
            {
              op: "update",
              id: "missing_node",
              transform: {
                x: 100,
              },
            },
          ],
          destroy: [],
        },
      ],
    };

    const result = validateFrameTimeline(timeline);

    expect(result.ok).toBe(false);
    expect(result.issues.some(
      (issue) => issue.code === "FRAME_UPDATE_UNKNOWN_ID"
    )).toBe(true);
  });
});
```

---

## 11. Regression risks and specific retest checklist

### Risk 1: Existing Godot bridge behavior changes too early

**Cause:** Directly wiring printer output into live Godot bridge before shadow validation.

**Mitigation:** Use `VITE_GODOT_FRAME_PRINTER_MODE=off` by default.

**Retest:**

```bash
VITE_GODOT_FRAME_PRINTER_MODE=off pnpm vitest run
```

Manual retest:

- Existing Godot bridge export still runs.
- No new packet errors appear in normal editor usage.
- No runtime calls depend on frame printer.

---

### Risk 2: Frame printer recreates all objects every frame

**Cause:** Missing or broken diff logic.

**Mitigation:** Unit-test diff output.

**Retest:**

```bash
pnpm vitest run tests/godot/frameDiffing.test.ts
```

Expected:

- Stable object emits `update`, not `destroy + create`.
- Unchanged object emits no instruction.
- Removed object emits `destroy`.

---

### Risk 3: Nondeterministic hashes

**Cause:** Object key order, random IDs, current time, unsorted inputs.

**Mitigation:** Stable stringify and explicit seeded inputs.

**Retest:**

```bash
pnpm vitest run tests/godot/frameInstantiationPrinter.test.ts
```

Expected:

- Same input equals same output.
- Same hash across repeated test runs.

---

### Risk 4: Unsupported node types silently pass

**Cause:** Validation not applied or registry bypassed.

**Mitigation:** Gate all create instructions through supported node registry.

**Retest:**

```bash
pnpm vitest run tests/godot/framePacketValidation.test.ts
```

Expected:

- Unsupported types return `FRAME_CREATE_UNSUPPORTED_NODE_TYPE`.

---

### Risk 5: Unknown IDs receive update or destroy instructions

**Cause:** Bad state tracking across frames.

**Mitigation:** Validation keeps a `seenIds` set.

**Retest:**

```bash
pnpm vitest run tests/godot/framePacketValidation.test.ts
```

Expected:

- Unknown update returns `FRAME_UPDATE_UNKNOWN_ID`.
- Unknown destroy returns `FRAME_DESTROY_UNKNOWN_ID`.

---

### Risk 6: Coordinate drift between web preview and Godot

**Cause:** Mismatched coordinate origin, scale, or anchor semantics.

**Mitigation:** Keep coordinate conversion in adapter layer, not core printer.

**Retest:**

Manual:

- Print simple object at center.
- Load in Godot.
- Compare expected x/y, scale, rotation, z-index.
- Add fixture for adapter once Godot coordinate contract is known.

---

### Risk 7: Bundle bloat or UI import cycles

**Cause:** Engine module imports UI or route code.

**Mitigation:** Keep printer under `src/lib/godot/frame-printer` with data-only exports.

**Retest:**

```bash
pnpm build
pnpm vitest run
```

Optional static check:

```bash
grep -R "from.*react" src/lib/godot/frame-printer || true
grep -R "Math.random" src/lib/godot/frame-printer || true
```

Expected:

- No React imports.
- No `Math.random`.

---

## 12. Rollout plan, including how the system should run before it is complete

### Phase 0: Off by default

Default mode:

```env
VITE_GODOT_FRAME_PRINTER_MODE=off
```

Behavior:

- No runtime behavior changes.
- Module exists.
- Unit tests pass.

---

### Phase 1: Shadow mode

Mode:

```env
VITE_GODOT_FRAME_PRINTER_MODE=shadow
```

Behavior:

- Existing bridge still works as before.
- Printer generates timelines from test or adapter-fed frames.
- Hashes and validation results are logged or snapshotted.
- Invalid output does not block user workflows.

Success criteria:

- Deterministic hashes stay stable.
- No runtime regressions.
- Generated packets are inspectable.

---

### Phase 2: Warn mode

Mode:

```env
VITE_GODOT_FRAME_PRINTER_MODE=warn
```

Behavior:

- Validation issues are surfaced.
- Existing bridge still remains source of truth.
- Packet output can be compared against existing bridge output.

Success criteria:

- Warnings are actionable.
- No false-positive flood.
- Unsupported object types are identified and mapped.

---

### Phase 3: Gate mode

Mode:

```env
VITE_GODOT_FRAME_PRINTER_MODE=gate
```

Behavior:

- Valid packet output can feed a controlled Godot bridge test scene.
- Invalid packets throw errors in bridge-specific test routes or dev-only flows.
- Production remains protected unless explicitly enabled.

Success criteria:

- Simple 60-frame scene renders in Godot.
- Create/update/destroy instructions behave correctly.
- No per-frame full re-instantiation.

---

### Phase 4: Enforced bridge mode

Future mode:

```env
VITE_GODOT_FRAME_PRINTER_MODE=enforced
```

Behavior:

- Frame packets become canonical bridge input.
- Invalid packet generation fails closed.
- Existing one-off bridge paths are gradually retired or wrapped as adapters.

Success criteria:

- Godot runtime loads packet timeline.
- Visual output matches expected positions and frame order.
- Deterministic replay works.

---

### How incomplete versions should safely run

Before final enforcement, the system should run like a diagnostic organ, not a load-bearing spine.

It may:

- Generate JSON timelines.
- Validate packets.
- Produce hashes.
- Write debug fixtures.
- Warn about unsupported node types.
- Compare existing bridge output with packet output.

It must not:

- Replace existing bridge behavior by default.
- Crash production flows in `shadow` or `warn`.
- Generate random IDs.
- Mutate global state.
- Import UI components.
- Depend on wall-clock time.

---

## 13. Definition of done

### v0.1 done

- `src/lib/godot/frame-printer` exists.
- Packet types are defined.
- Stable ID helper exists.
- Deterministic hash helper exists.
- Frame diffing exists.
- Timeline printer exists.
- Timeline validation exists.
- JSON adapter exists.
- Index exports exist.
- Tests exist and pass.
- Default rollout mode is `off`.
- Shadow mode can print a simple timeline.
- No existing Godot bridge behavior is changed.

### v0.2 done

- Adapter from one real upstream visual state exists.
- Shadow timeline output is generated from real PixelBrain / Lotus / bytecode data.
- Snapshot fixtures exist for at least one 60-frame scene.
- Warn mode reports unsupported node types and invalid IDs.

### v0.3 done

- Godot dev scene can consume packet JSON.
- Simple moving sprite / label / background scene plays correctly.
- Destroy instructions correctly remove nodes.
- Update instructions do not recreate nodes.
- Coordinate mapping is documented.

### v1.0 done

- Frame printer is the canonical Godot bridge packet source.
- Existing bridge-specific logic is reduced to adapters.
- `.tscn` or runtime JSON path is chosen and documented.
- Deterministic replay is verified across repeated runs.
- Godot bridge has a clear failure mode for invalid packets.
- Tests cover create, update, destroy, validation, hashing, and adapter conversion.

---

## 14. Final architectural verdict

This feature should be built.

The Godot Frame Instantiation Printer is not a decorative bridge module. It is the missing deterministic press between Scholomance's symbolic visual engines and Godot's concrete runtime object model.

Without it, the bridge risks becoming a nest of bespoke exporters, hard-coded animation cases, and runtime interpretation drift.

With it, the architecture gets a clean sequence:

```txt
text → VerseIR → bytecode truth → normalized state → frame packets → Godot nodes
```

That is the right seam.

The safest first move is a small v0.1 implementation: JSON timeline packets, stable IDs, deterministic hashing, diffed frame instructions, validation, and shadow-mode output. Once that works, Godot consumption becomes a downstream adapter problem instead of a fragile architectural improvisation.

The guiding principle:

> Godot should receive instructions. Scholomance should remain the source of law.

Corollary:

> Godot may attach VerseIR and TrueSight bytecode as metadata. It must not become a second TrueSight or VerseIR authority.
