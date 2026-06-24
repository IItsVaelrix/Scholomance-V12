# PDR: World Reification Engine
## Canonical Scene/Entity IR and Bidirectional Runtime Reconciliation Bridge

**Status:** Draft
**Classification:** Architectural | World IR | Godot Interop | Runtime Reconciliation | Determinism
**Priority:** Critical
**Primary Goal:** Define the engine-neutral world contract that lets Scholomance compile semantic intent into a live Godot scene, observe runtime changes, and reconcile those changes back into editable meaning without losing identity, causality, provenance, or deterministic replay.
**Bytecode Search Code:** `SCHOL-ENC-BYKE-SEARCH-PDR-WORLD-REIFICATION-ENGINE`

---

# 1. Executive Summary

Scholomance already has partial round-trip machinery for assets: visual features can become semantic parameters, images can become formulas, formulas can become coordinates, and coordinates can render back into images. That loop is powerful, but it stops at the asset boundary.

A game world is not an asset collection. It is a living set of persistent identities, relationships, authored intentions, runtime state transitions, behaviors, collisions, signals, timelines, and player-caused changes. The missing system is therefore not only a "reverse compiler"; it is a round-trip world compiler.

This PDR defines the **World Reification Engine**: a canonical Scene/Entity Intermediate Representation plus a bidirectional runtime reconciliation bridge between Scholomance compilers and Godot. It turns abstract meaning into concrete runtime entities, watches those entities change, and translates observed runtime state back into canonical, editable world meaning.

The first implementation must be schema-first and shadow-mode only. It should produce and validate `WorldIR` artifacts, compile them into Godot-facing scene packets, accept runtime observations, and emit deterministic diffs without mutating existing combat, PixelBrain, Wand, DivWand, or Godot bridge behavior.

---

# 2. Problem Statement

The current architecture can answer:

- What should this asset mean?
- What should it look like?
- Which formula or coordinates produced it?
- Can an image be analyzed back into editable parameters?

It cannot yet answer the world-level questions that a living game requires:

- What canonical entity does this Godot node represent?
- Which semantic intention created this entity?
- Which formula, behavior machine, or timeline controls it?
- What changed during runtime?
- Was the change authored, procedural, transient, or player-caused?
- Can the altered runtime result become the new source of truth?
- Can this exact world state be reproduced deterministically?
- Can a recompile preserve identity, health, animation progress, and player interaction history?

A normal compiler can discard previous output and rebuild. A game runtime cannot do that continuously. It needs reconciliation: create what is missing, update what changed, preserve what is alive, and destroy only what the canonical world no longer owns.

Without a canonical World IR, each subsystem must speak directly to every other subsystem. That creates schema drift, hidden runtime authority, and one-off bridge logic. With World IR, semantic compilers, visual compilers, behavior compilers, the Wand, the Eye, and Godot all negotiate through one treaty.

---

# 3. Product Goal

Create a canonical, engine-neutral `WorldIR` contract and reconciliation pipeline that supports this loop:

```txt
Intent
  ↓
Semantic Compiler
  ↓
Asset + Behavior + Timeline Compilers
  ↓
Canonical World IR
  ↓
Scene Compiler
  ↓
Godot Runtime
  ↓
Runtime Telemetry + State Capture
  ↓
Runtime Decompiler
  ↓
World IR Diff
  ↓
Wand / Eye / Semantic Explanation
  ↓
Recompile or Accept as Canon
```

The v0 deliverable is not a full game rewrite. It is the smallest deterministic world bridge that can prove:

1. A semantic entity can become a stable runtime object.
2. Runtime object identity can be observed and mapped back to the same entity.
3. Authored state and transient runtime state can be separated.
4. A runtime diff can be accepted into canonical World IR without destroying unrelated state.

---

# 4. Non-Goals

- Do not move combat scoring, phoneme analysis, VerseIR, PixelBrain, Wand, or DivWand authority into Godot.
- Do not replace the existing Combat page or Phaser/Godot spike routes.
- Do not implement a full open-world ECS in the first phase.
- Do not make Godot the source of truth for authored semantics.
- Do not persist unsaved user-authored world edits without explicit user action.
- Do not invent a final schema in implementation files before `SCHEMA_CONTRACT.md` reserves the contract.
- Do not require the runtime bridge to solve multiplayer, network replication, or cloud save synchronization in v0.
- Do not bake visual assets into World IR when a bytecode/formula/provenance reference is sufficient.

---

# 5. Core Design Principles

1. **World IR is the treaty.** It is neither a Godot scene, nor a semantic prompt, nor a visual formula. It is the canonical data contract between all three.
2. **Identity survives recompilation.** Existing runtime entities are preserved unless the reconciler proves they should be destroyed.
3. **Bytecode remains truth.** Persistent world artifacts must encode to a reserved bytecode family before they become long-lived exports or saves.
4. **Provenance is mandatory.** Every entity, component, relationship, behavior, and runtime observation must carry enough source context to explain why it exists.
5. **Runtime is observed, not blindly trusted.** Godot can report state, but Codex-owned reconciliation determines how observations become canonical state.
6. **State classes are explicit.** Authored, procedural, transient, simulation-derived, and player-caused changes are separated in diffs.
7. **Determinism gates promotion.** Same World IR plus same seed and accepted runtime diff must produce the same scene and replay hash.
8. **Shadow mode first.** v0 generates, validates, decompiles, and diffs without altering shipping gameplay.
9. **No analyzer duplication.** Godot receives compiled facts and emits observations. It does not reimplement Scholomance analysis logic.
10. **Sovereign editing applies.** Unsaved world edits and runtime captures remain local until the user explicitly accepts or exports them.

---

# 6. Feature Overview

The World Reification Engine has seven cooperating pieces:

| Component | Responsibility |
|---|---|
| World IR | Canonical engine-neutral description of entities, components, relationships, behaviors, timelines, signals, provenance, and runtime state |
| Scene Compiler | Converts World IR into Godot node/resource/script instantiation packets |
| Runtime Decompiler | Converts Godot scene state and telemetry into World IR observations |
| Reconciler | Decides what to create, update, preserve, retire, or destroy |
| Provenance Ledger | Records why each runtime object exists and which compiler/source created it |
| State Diff Engine | Separates authored changes from transient, procedural, simulation, and player-caused runtime changes |
| Behavior/Timeline Compilers | Convert semantic behavior and temporal intent into executable state machines, signals, event tracks, and replayable timelines |

World-level round trip:

```txt
Semantic Compiler ─┐
Visual Compiler ───┤
Behavior Compiler ─┼──► World IR ◄──► Runtime Bridge ◄──► Godot
Timeline Compiler ─┤
Wand ──────────────┤
Eye ───────────────┘
```

---

# 7. Architecture

## 7.1 Proposed File Map

```txt
codex/
  core/
    world-ir/
      types.ts
      constants.ts
      stableWorldId.ts
      validateWorldIR.ts
      hashWorldIR.ts
      diffWorldState.ts
      reconcileWorldIR.ts
      provenanceLedger.ts
      runtimeObservation.ts
      index.ts

src/
  lib/
    godot/
      world-bridge/
        compileWorldToGodotPackets.ts
        decompileGodotObservation.ts
        toGodotMetadata.ts
        fromGodotMetadata.ts
        index.ts

tests/
  world-ir/
    worldIRValidation.test.ts
    worldIRDeterminism.test.ts
    worldStateDiff.test.ts
    worldReconciliation.test.ts
  godot/
    worldBridgePackets.test.ts
    godotRuntimeObservation.test.ts
```

Final file ownership must be confirmed before implementation. The schema and pure reconciliation logic are Codex territory. Godot bridge implementation and tests require Gemini coordination. Any UI surface for Wand/Eye editing requires Claude coordination.

## 7.2 Dependency Direction

```txt
Semantic / Visual / Behavior / Timeline compilers
        ↓
World IR builders
        ↓
World IR validation + hashing
        ↓
Scene Compiler adapter
        ↓
Godot packet bridge
        ↓
Godot runtime metadata / nodes / resources
        ↓
Runtime observations
        ↓
Runtime Decompiler
        ↓
World State Diff + Reconciler
        ↓
Canonical World IR or reviewable Wand/Eye proposal
```

## 7.3 Boundary Rule

World IR core must not import React, DOM APIs, live Godot execution code, nondeterministic timestamps, random generators without explicit seeds, or compiler internals that are not contract-level APIs.

Godot-facing adapters may translate into engine concepts, but the canonical contract remains engine-neutral. Godot metadata must point back to `worldId`, `entityId`, component IDs, source intent IDs, bytecode IDs, compiler versions, and replay hashes.

## 7.4 Authority Matrix

The following matrix is a Phase 0 contract requirement. Any implementation that writes around it creates a parallel source of truth and must fail review.

| Field Domain | Canonical Authority | Runtime May Change? | Auto-Promote? |
|---|---|---|---|
| Entity identity | World IR | No | Never |
| Archetype | World IR | No | Never |
| Authored semantics | World IR | Observe only | Explicit accept |
| Visual formula reference | World IR | No | Explicit accept |
| Position during simulation | Runtime projection | Yes | Usually no |
| Player-moved persistent object | Runtime observation | Yes | Save/accept only |
| Health | Runtime/save state | Yes | According to save policy |
| Animation frame | Runtime | Yes | Never |
| Behavior current state | Runtime | Yes | Usually no |
| Behavior machine definition | World IR | No | Explicit accept |
| Procedural seed | World IR | No | Explicit accept |
| Procedural generated result | Runtime/compiler output | Yes | Promote seed/rule instead |
| Provenance | World IR ledger | Append only | Controlled |

## 7.5 Mutation Protocol

No subsystem mutates World IR directly.

Every proposed change must travel through the same pipeline:

```txt
WorldRuntimeObservation
  ↓
WorldIRDiff
  ↓
validation
  ↓
explicit promotion policy
  ↓
new WorldIR
```

This applies to Godot adapters, Wand/Eye tools, debug panels, save-state importers, and convenience helpers. The canonical World IR object is immutable: promotion creates a new artifact with a new checksum, or the attempt fails without changing canonical state.

## 7.6 Deterministic Canonicalization

Phase 0 must define exact canonicalization rules before hashing or bytecode export:

- Object keys sort lexicographically.
- `entities` sort by `entityId`.
- `relationships` sort by `relationshipId`.
- Components sort by `componentId`.
- Signals sort by `signalId`.
- Timelines sort by `timelineId`.
- Diff decisions sort by `decisionId`.
- Arrays preserve semantic order only where order is explicitly meaningful, such as timeline frames.
- Floating-point values normalize to fixed precision chosen by `SCHEMA_CONTRACT.md`.
- `undefined` is forbidden.
- `NaN`, `Infinity`, and `-Infinity` are forbidden.
- Wall-clock timestamps and human-facing metadata are excluded from canonical checksums.
- Checksums are computed from canonical payloads only, with the checksum field itself omitted from the hash input.

---

# 8. Module Breakdown

## 8.1 World IR Validator

Validates structural integrity before anything reaches Godot:

- Unique `worldId`, `sceneId`, `entityId`, and component IDs.
- Unique `relationshipId`, `timelineId`, `signalId`, and stable runtime projection IDs.
- Valid parent/child and relationship references.
- Valid component kinds and versioned component payloads.
- Valid transform units and finite numeric values.
- No runtime-only field promoted into authored state without a diff decision.
- Provenance exists for every entity and authored component.
- Relationship provenance exists and survives relationship updates.
- Bytecode/provenance references are stable strings, not opaque live objects.
- Canonical payloads contain no wall-clock timestamp fields in hash-covered locations.

## 8.2 Scene Compiler

Consumes validated World IR and emits Godot-facing packets:

- `createEntityNode`
- `updateEntityNode`
- `destroyEntityNode`
- `attachComponentResource`
- `setTransform`
- `bindBehaviorMachine`
- `bindTimeline`
- `setCollisionShape`
- `setMetadata`

The compiler should build on the existing Godot Frame Instantiation Printer work where practical, but World IR remains one layer above frame-level visual packets.

## 8.3 Runtime Decompiler

Consumes runtime observations emitted by Godot:

- Node metadata snapshots.
- Transform changes.
- Component state snapshots.
- Signal events.
- Collision events.
- Behavior state transitions.
- Timeline frame markers.
- Player interaction events.

It maps observations back to canonical entities and produces `WorldRuntimeObservation` artifacts, not direct mutations.

## 8.4 Reconciler

Compares canonical World IR, prior runtime projection, and new observations:

- Preserve entity identity when runtime metadata matches canonical IDs.
- Update mutable runtime fields without resetting authored fields.
- Flag missing entities as `missing_runtime_object`.
- Flag unknown runtime nodes as `unclaimed_runtime_object`.
- Separate accepted edits from temporary simulation state.
- Produce deterministic create/update/preserve/destroy decisions.

## 8.5 Provenance Ledger

Tracks the answer to "why does this exist?":

- `createdBy`
- `sourceIntentId`
- `sourceCompiler`
- `sourceArtifactId`
- `sourceBytecode`
- `compilerVersion`
- `createdAtTick`
- `acceptedAtTick`
- `changeReason`

## 8.6 State Diff Engine

Classifies every observed change:

| Change Class | Meaning | Canon Promotion |
|---|---|---|
| `authored` | User or compiler-intended canonical change | Can become source after validation |
| `procedural` | Deterministic generation from seed/rules | Promote rule/seed, not only result |
| `simulation` | Runtime physics/behavior consequence | Usually runtime state only |
| `transient` | Animation, particles, cooldown visuals | Never canonical by default |
| `player_caused` | Player action changed world state | Promote only through save/accept flow |
| `diagnostic` | Bridge/decompiler observation metadata | Never gameplay source |

---

# 9. ByteCode IR Design

The World Reification Engine requires a new reserved bytecode family before implementation:

```txt
SCHOL-WORLD-v1
```

This PDR proposes the reservation only. `SCHEMA_CONTRACT.md` must define the authoritative shape before code depends on it.

## 9.1 Proposed Top-Level Shape

```ts
type WorldStateClass =
  | "authored"
  | "procedural"
  | "simulation"
  | "transient"
  | "player_caused"
  | "diagnostic";

interface WorldIR {
  schema: "SCHOL-WORLD-v1";
  worldId: string;
  sceneId: string;
  tick: number;
  seed: string | null;
  entities: WorldEntityIR[];
  relationships: WorldRelationshipIR[];
  timelines: WorldTimelineIR[];
  signals: WorldSignalIR[];
  provenance: WorldProvenance;
  replay: WorldReplayDescriptor;
  metadata?: {
    createdAtIso?: string; // excluded from canonical checksum
    notes?: string; // excluded from canonical checksum
  };
  checksum: string;
}
```

## 9.2 Proposed Entity Shape

```ts
type WorldAuthority = "world_ir" | "runtime" | "save_state";

interface WorldStateValue<T> {
  value: T;
  stateClass: WorldStateClass;
  authority: WorldAuthority;
  lastChangedTick: number;
}

interface WorldEntityIR {
  entityId: string;
  archetypeId: string | null;
  displayName?: string;
  semantics: {
    role: string;
    mood?: string;
    threatLevel?: number;
    tags: string[];
  };
  transform: {
    position: WorldStateValue<{ x: number; y: number; z?: number }>;
    rotation: WorldStateValue<number>;
    scale: WorldStateValue<{ x: number; y: number; z?: number }>;
  };
  visual?: {
    assetFormulaId?: string;
    visualBytecode?: string;
    animationState?: WorldStateValue<string>;
    paletteId?: string;
  };
  physics?: {
    collider: "none" | "circle" | "rect" | "capsule" | "polygon";
    mass: number;
    collisionLayers: string[];
  };
  behavior?: {
    machineId: string;
    state: WorldStateValue<string>;
    targetEntityId: WorldStateValue<string | null>;
  };
  runtime: {
    health?: WorldStateValue<number>;
    spawnedAtTick?: WorldStateValue<number>;
    persistent: WorldStateValue<boolean>;
  };
  provenance: {
    createdBy: string;
    sourceIntentId: string | null;
    sourceArtifactId?: string;
    sourceBytecode?: string;
    compilerVersion: string;
  };
}
```

Entity-level `stateClass` is intentionally rejected for the canonical schema. One entity can hold multiple state classes at once: health may be `player_caused`, position may be `simulation`, animation state may be `transient`, and persistence may be `authored`. Field-level wrappers and path-level diffs are therefore mandatory for mutable fields.

## 9.3 Proposed Relationship Shape

```ts
interface WorldRelationshipIR {
  relationshipId: string;
  kind:
    | "parent_of"
    | "targets"
    | "owns"
    | "blocks"
    | "collides_with"
    | "dialogue_with";
  sourceEntityId: string;
  targetEntityId: string;
  state: WorldStateValue<"active" | "inactive" | "blocked" | "pending">;
  provenance: WorldProvenance;
}
```

Relationships are first-class canonical objects. They need stable IDs because they can change independently, carry provenance, survive recompilation, and appear in runtime observations or diffs.

## 9.4 Proposed Runtime Observation Shape

```ts
interface WorldRuntimeObservation {
  schema: "SCHOL-WORLD-OBS-v1";
  worldId: string;
  sceneId: string;
  observedAtTick: number;
  sourceRuntime: "godot";
  entities: Array<{
    runtimeObjectId: string;
    entityId: string | null;
    nodePath: string;
    metadata: Record<string, string>;
    transform?: WorldEntityIR["transform"];
    componentState?: Record<string, unknown>;
    signals?: string[];
  }>;
  events: Array<{
    eventId: string;
    kind: "collision" | "signal" | "behavior_transition" | "timeline_marker" | "player_action";
    entityIds: string[];
    tick: number;
    payload: Record<string, unknown>;
  }>;
  checksum: string;
}
```

## 9.5 Proposed Diff Shape

```ts
interface WorldIRDiff {
  schema: "SCHOL-WORLD-DIFF-v1";
  worldId: string;
  fromChecksum: string;
  toObservationChecksum: string;
  decisions: Array<{
    decisionId: string;
    entityId: string | null;
    relationshipId?: string | null;
    path: string;
    previousValue: unknown;
    observedValue: unknown;
    action: "create" | "update" | "preserve" | "destroy" | "quarantine";
    stateClass: WorldStateClass;
    authority: WorldAuthority;
    reason: string;
    promotionPolicy: "never" | "explicit_accept" | "save_policy" | "promote_seed_or_rule";
    patch: Record<string, unknown> | null;
  }>;
  replayImpact: {
    deterministic: boolean;
    reason: string | null;
  };
  checksum: string;
}
```

Diff classification is path-level, not entity-level. A single runtime observation may produce a persistent health update, a rejected animation-frame change, and a quarantined unknown node in one diff artifact.

---

# 10. Spec Sheet

| Field | Specification |
|---|---|
| Feature name | World Reification Engine |
| Internal shorthand | WRE |
| Optional component names | `WorldIR`, `SceneCompiler`, `RuntimeDecompiler`, `WorldReconciler`, `ProvenanceLedger`, `StateDiffEngine` |
| Primary purpose | Round-trip semantic world intent into Godot runtime state and back into editable canonical meaning |
| Canonical artifact | `WorldIR` |
| Proposed bytecode family | `SCHOL-WORLD-v1` |
| Runtime observation artifact | `SCHOL-WORLD-OBS-v1` |
| Diff artifact | `SCHOL-WORLD-DIFF-v1` |
| First runtime target | Godot 4.x |
| First transport target | JSON packets with deterministic field ordering |
| First rollout mode | Shadow validation and diff reporting only |
| Minimum entity support | Identity, semantics, transform, visual reference, physics reference, behavior state, runtime state, provenance |
| Minimum relationship support | Parent/child, targets, owns, blocks, collides-with, dialogue-with |
| Minimum behavior support | Named machine ID, current state, target entity, emitted signal list |
| Minimum timeline support | Timeline ID, tick/frame markers, deterministic replay hash |
| Determinism requirement | Same World IR + same seed + same accepted diff yields identical scene packet hash |
| Authority requirement | All changes obey the Authority Matrix and Mutation Protocol |
| Security requirement | No unsaved world edits or runtime captures leave the browser without explicit accept/export/save action |
| Validation posture | Fail closed for malformed entity IDs, missing provenance, invalid references, nondeterministic fields, and unsupported component versions |
| First QA files | `tests/world-ir/worldIRValidation.test.ts`, `tests/world-ir/worldStateDiff.test.ts`, `tests/godot/worldBridgePackets.test.ts` |
| Main risk | Letting Godot runtime state become a hidden parallel source of truth |
| Risk countermeasure | Runtime decompiler emits observations only; reconciler promotes changes through explicit diff decisions |

---

# 11. Implementation Phases

## Phase 0: Contract Reservation

- Add `SCHOL-WORLD-v1`, `SCHOL-WORLD-OBS-v1`, and `SCHOL-WORLD-DIFF-v1` to `SCHEMA_CONTRACT.md` after Angel approval.
- Define stable TypeScript shapes.
- Define checksum rules and deterministic serialization.
- Define forbidden nondeterministic fields.
- Define the Authority Matrix and Mutation Protocol as normative schema behavior.
- Define field-level `WorldStateValue<T>` or equivalent path-level state classification before implementation.

Gate: schema contract accepted; no implementation may consume ad hoc local shapes before this gate.

## Phase 1: Pure World IR Core

- Implement validation.
- Implement stable ID derivation.
- Implement stable hashing.
- Implement canonicalization with deterministic ordering, fixed float precision, and timestamp exclusion.
- Implement fixture builders for one room, one actor, one door, and one interactive object.

Gate: deterministic fixtures produce identical hashes across repeated runs.

## Phase 2: Scene Compiler Shadow Packets

- Compile World IR into Godot-facing create/update/destroy packets.
- Attach metadata for entity ID, component IDs, source intent, bytecode, compiler version, and replay hash.
- Reuse frame printer concepts where they fit.

Gate: packets validate and snapshot cleanly without running Godot.

## Phase 3: Runtime Observation Import

- Define Godot observation JSON shape.
- Create decompiler adapter from Godot observations into `WorldRuntimeObservation`.
- Quarantine unknown or malformed runtime nodes.

Gate: observations never mutate World IR directly.

## Phase 4: Reconciliation and Diff

- Compare World IR and runtime observations.
- Emit `WorldIRDiff` decisions.
- Classify changes by path-level state class and authority.
- Preserve identity across compile/decompile cycles.
- Fail closed on identity collisions or partial invalid diffs.

Gate: tests prove health/state changes can update without respawning the entity or resetting unrelated animation state.

## Phase 5: Accept-as-Canon Flow

- Add explicit accept/reject semantics for canonical promotion.
- Preserve Sovereign Editor rules: no unsaved world edits persist or export automatically.
- Produce replay hashes after accepted diffs.

Gate: accepted diff changes canonical World IR; rejected diff leaves it untouched.

## Phase 6: Wand/Eye Integration Proposal

- Expose runtime diff artifacts to future Wand/Eye surfaces.
- Show semantic explanation from provenance and diff decisions.
- Keep UI implementation under Claude-owned UI spec before any surface work.

Gate: UI spec approved before visible editor changes.

---

# 12. QA Requirements

- Validation tests for required IDs, references, component kinds, provenance, and checksums.
- Determinism tests for serialization, hashing, scene packet ordering, and replay descriptors.
- Reconciliation tests for create/update/preserve/destroy/quarantine decisions.
- Runtime observation tests for malformed metadata, unknown nodes, missing entity IDs, and unsupported component versions.
- Sovereign Editor tests proving no world edit, runtime capture, or accept-as-canon artifact persists without explicit action.
- Regression tests proving existing PixelBrain/Wand/DivWand/Godot export behavior remains unchanged in shadow mode.
- Bytecode error assertions for validation failures once the schema is formalized.
- No-op reconciliation: identical observation produces only preserve decisions and the same World IR checksum.
- Array-order independence: same entities, relationships, and components in different input order produce identical canonical hashes.
- Unknown-node quarantine: runtime-only Godot nodes cannot become canonical without explicit promotion.
- Transient exclusion: animation frames, particles, and cooldown visuals never alter canonical checksums.
- Procedural promotion: accepting a procedural change promotes its seed/rule rather than only the generated transform result.
- Partial failure atomicity: if one diff decision is invalid, canonical World IR remains entirely unchanged.
- Provenance continuity: updating health or behavior state must not rewrite creation provenance.
- Identity collision: two runtime nodes claiming the same `entityId` fail closed.
- Replay equivalence: accepted diff plus prior canonical world reproduces the same resulting checksum.
- Adapter isolation: Godot packet schema changes cannot alter World IR schema.

Minimum v0 fixtures:

- `room.single_actor`
- `room.actor_and_door`
- `encounter.guardian_patrol`
- `runtime.health_changed`
- `runtime.unknown_node_quarantined`
- `runtime.player_opened_door`

---

# 13. Success Criteria

The PDR is successful when the project can demonstrate a closed, deterministic world loop:

1. A canonical World IR fixture defines a scene with at least one actor and one interactive object.
2. The Scene Compiler emits stable Godot-facing packets with preserved provenance.
3. A Godot-shaped runtime observation maps back to the same canonical entity IDs.
4. The Reconciler emits a deterministic diff that separates authored, simulation, transient, procedural, and player-caused changes.
5. Accepting a player-caused change produces a new World IR checksum.
6. Rejecting a runtime change leaves canonical World IR unchanged.
7. Existing asset-level bridges continue to work without behavior changes.

---

# 14. Architectural Classification

**Change type:** Architectural.

Dependencies affected:

- Semantic compiler.
- Visual compiler.
- Behavior compiler.
- Timeline compiler.
- Godot bridge.
- Frame Instantiation Printer.
- Wand.
- Eye.
- Save-state system.
- Bytecode schema registry.
- Replay/determinism system.

Risk reduced: the project no longer needs direct pairwise bridges between every compiler, runtime, and editor surface. Without World IR, integrations scale as a mesh. With World IR, every system integrates through a shared spine.

```txt
Without World IR:

Semantic ↔ Godot
Visual ↔ Godot
Wand ↔ Godot
Eye ↔ Godot
Behavior ↔ Godot
Wand ↔ Semantic
Eye ↔ Visual

With World IR:

Semantic Compiler ─┐
Visual Compiler ───┤
Behavior Compiler ─┼──► World IR ◄──► Godot
Timeline Compiler ─┤
Wand ──────────────┤
Eye ───────────────┘
```

---

# 15. Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| World IR becomes too broad too early | Slow implementation and weak validation | Start with minimal entity/component set and fixture-driven growth |
| Godot becomes hidden source of truth | Schema drift and nondeterminism | Runtime observations are input to reconciler only |
| Recompiler resets living state | Player progress and interaction history loss | Identity-preserving reconciliation is a v0 gate |
| Provenance is omitted as "metadata" | No semantic explanation or reverse compilation | Make provenance required on authored entities/components |
| Runtime observations contain volatile noise | Unstable diffs | Explicit state classes and transient field filtering |
| Parallel schema emerges | Contract violation | Reserve in `SCHEMA_CONTRACT.md` before code implementation |
| User edits leak through telemetry/export | Sovereign Editor violation | Explicit accept/export/save action required for persistence |
| Convenience helper bypasses reconciler | Silent canonical corruption | Enforce Mutation Protocol: observations -> diff -> validation -> promotion -> new World IR |
| Single entity-level state class hides mixed authority fields | Incorrect promotion of runtime noise | Use field-level `WorldStateValue<T>` and path-level diff classification |
| Array order changes alter checksums | False nondeterminism | Canonical ordering rules are part of Phase 0 |
| Wall-clock timestamps poison replay hashes | Identical worlds hash differently | Exclude human-facing metadata from canonical checksums |

---

# 16. Jurisdiction and Handoff

- **Codex:** Owns schema proposal, World IR contract, pure validation, deterministic hashing, reconciliation architecture, and bytecode reservation.
- **Gemini:** Implements backend/runtime tests and Godot bridge fixtures after schema approval.
- **Claude:** Owns any future Wand/Eye/UI surfaces that visualize diffs or semantic explanations.
- **Angel:** Approves schema reservation, source-of-truth promotion semantics, and any shift from shadow mode to runtime enforcement.

Implementation handoff order:

```txt
Codex: schema + pure core contract
  ↓
Gemini: tests + runtime/Godot adapters
  ↓
Claude: optional Wand/Eye review surface
  ↓
Arbiter/Nexus/Unity: review, debug, and documentation synthesis
```

---

# 17. Open Questions

1. Should World IR live under `codex/core/world-ir/`, `src/lib/world-ir/`, or a shared package boundary?
2. Should `SCHOL-WORLD-v1` encode as pure JSON bytecode first, or wrap an ordered binary/string envelope after v0?
3. Which runtime fields are valid to promote by default when a user accepts a diff?
4. Should behavior machines be referenced by ID only in v0, or should their state machine graph be embedded in World IR?
5. Should Godot observations stream live or be captured at deterministic checkpoints only for v0?
6. What is the first canonical user-facing accept-as-canon action: Wand command, debug panel, file export, or dev-only CLI?

---

# 18. Law and Schema Notes

This PDR intentionally does not modify `SCHEMA_CONTRACT.md`. Under Vaelrix Law, the shapes above are proposals until Codex reserves them in the active schema contract with Angel's awareness.

Law update evaluation: no immediate Vaelrix Law amendment is required. Law 3 already blocks parallel schema creation, Law 8 already establishes bytecode priority, Law 13 governs this PDR archive location, and the Sovereign Editor principle already covers unsaved world edits and runtime captures.
