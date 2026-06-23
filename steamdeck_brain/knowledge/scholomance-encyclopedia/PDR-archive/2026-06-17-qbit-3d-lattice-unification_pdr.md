# PDR: QBIT 3D Lattice Unification

## Lift the 3D Voxel Volume as Canonical; Derive 2D Faces and 3D Meshes as Views

**Bytecode Search Code:** `SCHOL-ENC-PDR-QBIT-3D-LATTICE-v1.2`
**Date:** 2026-06-17
**Status:** Draft
**Classification:** QBIT-Voxel | 3D Lattice | Lifting Faces to Volume | 2D Projection as Derived View | Godot 3D Game World | Schema
**Priority:** High
**Primary Goal:** Make the 3D QBIT voxel volume the canonical artifact, derive the existing 2D iso projection from it on demand, and add a 3D game world scene that consumes the volume directly. The 2D website view does not change; the 3D game view stops being a lossy 2D simulation.

---

## Related PDRs / papers

- `2026-06-16-qbit-voxel-level3-multi-biome-pdr.md` — sibling PDR that scales the 3D lattice to multi-chunk worlds. This PDR is the *predecessor* that ensures the lattice is actually 3D in the first place. Level 3 is impossible if the generation pipeline is still dropping depth.
- `PDR-2026-06-05-WORLD-REIFICATION-ENGINE.md` — broader engine-neutral world contract. Out of scope here; this PDR is a focused refactor of the QBIT generation artifact, not a runtime reconciliation system.
- `PDR-2026-05-27-VOID-ARENA-GODOT-VIEWER.md` — pattern reference for Godot scene packaging and interop.
- `PDR-2026-06-04-GODOT-WASM-COMBAT-SPIKE.md` — Godot rendering substrate decisions; relevant for the 3D scene's render approach.
- `codex/core/pixelbrain/voxel-volume.js` — the 3D `VoxelVolume` data structure that already exists and that this PDR promotes to canonical.
- `codex/core/pixelbrain/iso-projector.js` — the 2D iso projection that this PDR demotes to a derived view.

---

## Owner(s)

- **Codex (architecture / schema):** Defines the `qworld.volume` field shape (including the Flyweight `resourcePalette` / `resourceIndex` pair), updates `SCHEMA_CONTRACT.md` (schema change with notice), edits the docstring of `iso-projector.js` to declare "projection, not canonical", defines the `assertQbitWorldArtifact` immunity guard, and names the coordinate-matrix module that the Godot exporter uses to map generator space into Godot's Y-up world.
- **Gemini (backend / engine / tests):** Refactors `qbit-world-game-loop.js` to return `{ volume, faces }` instead of just faces, extends `qbitWorldGodotExport.js` to carry the volume, adds the FNV-1a checksum for the volume, writes the parity test in `tests/pixelbrain/qbit-world-game-loop.test.js`, implements the new `QbitWorld3D.gd` Godot scene (mirroring `VoidmetalCaveWorld.gd` patterns: greedy mesh per chunk, raycast mining, face hit-test projection), and implements the explicit coordinate-matrix function.
- **Claude (UI surface):** No change. `src/pages/QbitWorld/QbitWorldPage.jsx` keeps consuming the 2D faces from the artifact. The web surface is the unchanged derived view.
- **Escalation owner (cross-domain conflicts):** Angel. Specifically: the choice of voxel volume coordinate system mapping (Godot 3D uses y-up; the exporter must enforce explicit mapping to prevent axis-flipping), and the volume face-set policy.

---

## Context (seed — not the Executive Summary)

The QBIT-Voxel pipeline currently produces a 2D artifact. `codex/core/pixelbrain/qbit-world-game-loop.js:99` calls `collectFaces` from `iso-projector.js`, which projects a 3D voxel volume into a flat 2D face list, sorts by depth, and discards the volume. The 2D face list is the only thing that survives the pipeline. The 3D lattice that produced the faces is gone.

Two consumers read the output:

1. **The website** — `src/pages/QbitWorld/QbitWorldPage.jsx` renders the 2D faces as SVG. Correct use of a 2D projection.
2. **The 3D Godot game** — currently *no* consumer. `VoidmetalCaveWorld.gd` reads a different format (`voidmetal-cave.qworld` with `gameplay.collisionSolids`, `walkable`, `mineables`). The QBIT lattice has no 3D game world.

The user explicitly chose path 3 (true 3D orbit) for the QbitWorld's movable camera. The user's framing was: "convert all logic from the 2D to 3D but keep the 2D for the website." That sentence is the PDR: lift the 3D lattice as canonical, derive 2D for the web, derive 3D meshes for the game.

The 3D data is not missing — it is *buried* in `qbit-field.js` and `voxel-volume.js`. The refactor is to stop throwing it away at the export boundary.

---

## Target Integration Area

- `codex/core/pixelbrain/qbit-world-game-loop.js` — change `buildQbitWorldGameLoop` to return `{ volume: VoxelVolume, faces: FaceDescriptor[] }` instead of `{ faces: FaceDescriptor[] }`. The `faces` array is now a *derived projection* of `volume`, not the primary output. The volume's cells carry a Flyweight `resourceIndex` (F-8) instead of inlined `resource` objects.
- `codex/core/pixelbrain/iso-projector.js` — docstring-only change (§3.4). Add a header that reads: "Iso projection is a *view* of a `VoxelVolume`, not the canonical form. Consumers that need 3D data (mining, collision, lighting) must consume the volume directly."
- `codex/core/pixelbrain/voxel-volume.js` — additive: export `serializeVoxelVolume(volume)` and `deserializeVoxelVolume(json)` for the artifact bridge. Implement Flyweight extraction for resource palettes (F-8): cells reference a root-level `resourcePalette` by integer index.
- `src/lib/godot-export/qbitWorldGodotExport.js` — extend the `.qworld` schema to carry `volume`. Apply explicit coordinate-matrix mapping to ensure the generator's `(x, y, z)` data aligns safely with Godot's Y-up `Vector3` space (the matrix is named, versioned, and unit-tested, not implicit). Compute a separate FNV-1a `volumeChecksum` so the volume and the faces are independently auditable.
- `addons/scholomance_godot_bridge/runtime/qbit_world_builder.gd` — additive: a new builder function `build_qbit_world_3d_scene(artifact)` that reads the new `volume` field and returns a `PackedScene` containing a `Node3D` with chunked greedy mesh children.
- `godot_project/scripts/QbitWorld3D.gd` — **new file**, mirrors the structure of `VoidmetalCaveWorld.gd:1-500`. Camera is first-person with mouse-look. Click-to-harvest preserved via raycast → volume lookup → derive 2D face for hit-test return. No walkable-floor collision in v1 (F-13).
- `godot_project/scenes/QbitWorld3D.tscn` — **new file**, scene root with `Node3D` script + `Camera3D` child.
- `codex/core/immunity/registry.js` — register `qbit-world-volume` rule group: rejects artifacts whose `volume` and `faces` are inconsistent, and rejects cells whose `resourceIndex` is out of range.
- `docs/scholomance-encyclopedia/Scholomance LAW/SCHEMA_CONTRACT.md` — add the `qbitWorldArtifact.volume` field (with Flyweight palette) to the schema registry. Add a SCHEMA CHANGE NOTICE (version bump).
- `tests/qa/pixelbrain/qbit-volume-faces-parity.test.js` — new: golden test. Ensure determinism and that face derivation remains unchanged.

---

## Core Concept

A QBIT world is a 3D voxel volume, period. The 2D face list is a derived projection for a specific view (iso, top-down-right). The 3D game world is a derived mesh (greedy-meshed per chunk) for a freely-moving camera. Both are views; the volume is the source.

```
                 ┌─ iso projection (QbitWorldPage.jsx, 2D Godot static)
                 │
QBIT 3D volume ──┤
                 │
                 └─ greedy mesh per chunk (QbitWorld3D.gd)
```

The volume carries everything a 3D world needs, optimized via a Flyweight pattern to prevent payload bloat (F-8):

| Field | Type | Purpose |
|---|---|---|
| `w`, `h`, `d` | integer | World dimensions |
| `resourcePalette` | `Array<{ id, yield, rarity }>` | Flyweight dictionary for mineables (root-level, deduplicated) |
| `cells` | `Array<{ x, y, z, materialId, resourceIndex }>` | Occupied voxel set; `resourceIndex` is an integer pointer into `resourcePalette` (or `null`) |

The face list carries everything a 2D view needs (back-compat preserved):

| Field | Type | Source | Purpose |
|---|---|---|---|
| `id` | string | `iso-projector.js:32` | Polygon ID for picking |
| `type` | "top" \| "left" \| "right" | iso projection face kind | Render hint |
| `materialId` | integer | cell's material | Color / texture selection |
| `voxel` | `{ x, y, z }` | cell coordinate | 2D click → 3D cell lookup |
| `polygon` | `Array<{ x, y }>` | iso projection math | Render geometry |
| `resource` | optional | cell's resolved resource | Web-side harvest display |
| `sortKey` | integer | `(z + y) * 10000 + x * 10 + faceTypeIndex` | Painter's order (web) |

The two views are *guaranteed consistent*: F-1 (parity) is the witness. The Flyweight pattern is applied at the volume level; the 2D face list inlines the resolved `resource` object on each face (de-duplicated for the web) because the web surface is the unchanged derived view.

---

## Implementation Philosophy

Small, additive, back-compat. The 2D view does not change. The 3D scene mirrors an existing pattern (`VoidmetalCaveWorld.gd`) using Godot's stock 3D renderer.

No new schemas. The QBIT artifact is *extended*, not replaced. Existing `.qworld` files in `godot_project/assets/` remain valid; the 3D scene falls back to deriving the volume from faces when the new `volume` field is absent, so legacy artifacts keep working. New artifacts always include the volume; the fallback is a single deprecation cycle.

No new RNG. The volume is a deterministic function of `(schoolWeights, options, seed)` just like the face list was. Same input → same volume.

No implicit coordinate mappings. The Godot exporter performs an explicit, named, versioned coordinate-matrix operation when translating generator `(x, y, z)` to Godot `Vector3(x, y, z)` — the matrix is a function, not a global constant, and it carries its own unit test (F-11).

The architectural cut is: **the volume is the source, the faces are the view, the mesh is the view.** Three names, one shape, three consumers.

---

## Required Sections

### 1. Executive Summary

The QBIT pipeline stops being a 2D projection that throws away depth. The 3D voxel volume becomes the canonical artifact; the 2D iso face list becomes a derived projection, computed on demand from the volume by the existing `iso-projector.js`. The 2D web view (`QbitWorldPage.jsx`) and the 2D Godot static scene (`QbitWorldScene.gd`) consume the derived faces as they always have. A new 3D Godot game world scene (`QbitWorld3D.gd`) consumes the volume directly, mirroring the established `VoidmetalCaveWorld.gd` patterns for greedy chunked meshing, raycast mining, and mouse-look first-person camera. The `.qworld` artifact schema gains a `volume` field with an independent FNV-1a checksum, a Flyweight `resourcePalette` to prevent payload bloat (F-8), and an explicit coordinate-matrix module in the exporter to map generator space safely into Godot's Y-up world (F-11). Legacy artifacts without the field are accepted for one deprecation cycle, with the 3D scene deriving the volume from face voxel coordinates as a fallback. The blast radius is contained: additive schema field, additive Godot builder, one new Godot scene, additive `qbit-world-game-loop.js` return value, docstring-only edit on `iso-projector.js`, one new immunity rule, additive tests. The 2D website surface does not change. Status is **Draft** — no code lands until §5 phase 1 is green and the parity test (F-1) is in place.

### 2. Out of Scope / Non-Goals

- **Replacing the 2D web view.** `QbitWorldPage.jsx` keeps consuming faces. The web surface is the unchanged derived view.
- **Replacing the 2D Godot static scene.** `QbitWorldScene.gd` keeps working. It's a sprite-cache deliverable, not gameplay.
- **Real-time gameplay layer for QBIT.** No torches, no inventory, no crafting, no pickaxe, no sword, no avatar, no walkable floors. `VoidmetalCaveWorld.gd` has those because the cave is a gameplay world; QBIT is a visualization + mining surface. Mining is in scope (raycast → volume → yield, F-5, F-14). Walking is in scope (first-person camera, WASD). Everything else is not.
- **Migrating QBIT to Photonic Bridge / WebGPU.** The 3D scene uses Godot's stock 3D renderer. Photonic acceleration is a separate PDR.
- **Implicit Coordinate Trust.** The mapping from generator space to Godot's Y-up world is not assumed. The exporter performs an explicit, named, unit-tested coordinate-matrix operation. Implicit axis flips are forbidden.
- **Energy / lighting propagation in the volume.** The `energy` field on cells is reserved for future work. v1 of the 3D scene uses Godot's `WorldEnvironment` + `OmniLight3D` ambient lights for visual flavor, not the QBIT energy field.
- **Multi-chunk worlds.** `2026-06-16-qbit-voxel-level3-multi-biome-pdr.md` is the path to that. This PDR does not conflict; this PDR is the predecessor that ensures the volume is canonical *before* Level 3 starts slicing it into chunks.
- **Replacing `VoidmetalCaveWorld.gd`.** The cave is a different artifact (a hand-authored cave with collision/walkable/mineables), not a QBIT volume. The two may converge in the future, but that's a separate PDR.
- **Editing the world after generation.** The volume is a projection of the seed (QBIT energy field). Editing means changing the seed; v1 does not support runtime editing. Mining is destruction-only (occupied cell becomes empty).
- **Three.js / WebGL / custom renderer.** The Godot 3D renderer is the renderer. The 2D web view is the React/SVG renderer. Both already exist; both are reused.
- **Animated QBIT lattice.** Out of scope. The volume is static after generation.

### 3. Spec Sheet

#### 3.1 Functional spec

| ID | Requirement | Acceptance criterion |
|---|---|---|
| F-1 | `buildQbitWorldGameLoop(schoolWeights, options)` returns `{ volume, faces, telemetry, ... }` where `volume` is a valid `VoxelVolume` and every face's `voxel` cell is present in `volume.cells`. | Parity test in `tests/pixelbrain/qbit-world-game-loop.test.js` — for each preset (QBIT, VOID, ALCHEMY, SONIC, PSYCHIC, WILL), assert the property. |
| F-2 | The exported `.qworld` artifact contains a `volume` field with `{ w, h, d, resourcePalette, cells }` and a `volumeChecksum` (FNV-1a of the canonicalized volume JSON). | Golden test in `tests/godot-export/qbitWorldGodotExport.test.js` — re-import the artifact and assert the volume is byte-identical to the source. |
| F-3 | Legacy `.qworld` artifacts without the `volume` field are accepted by the 3D scene. The 3D scene derives a synthetic volume by collecting unique voxel positions from the face `voxel` metadata, with each cell's `materialId` taken from the face's `materialId`. | Backward-compat test: load `qbit-world-void.qworld` (a legacy artifact from a pre-refactor export) and assert the synthetic volume has the same cell set as the parity test on the equivalent fresh export. |
| F-4 | `QbitWorld3D.gd` builds a greedy chunked mesh from the volume using the same `_build_greedy_chunk_mesh` pattern as `VoidmetalCaveWorld.gd:376-411`, with `DEFAULT_CHUNK_SIZE_X = DEFAULT_CHUNK_SIZE_Z = 12`, `DEFAULT_ACTIVE_CHUNK_RADIUS = 1`. | Visual: the 3D scene renders the same world geometry as the 2D iso projection's 3 visible faces per voxel, plus the 3 hidden faces (back, front, bottom). |
| F-5 | The 3D scene's first-person camera moves with WASD, looks with mouse, and supports click-to-harvest via raycast. The raycast returns a `qbit_resource` for the hit voxel, matching the 2D web view's click-to-harvest contract. | Manual: load `QbitWorld3D.tscn` with `qbit-world.qworld`, walk into the volume, click an emissive voxel, observe the resource log. |
| F-6 | The 2D web view (`QbitWorldPage.jsx`) and the 2D Godot static scene (`QbitWorldScene.gd`) consume the same `faces` array as before. Their render output is byte-identical to the pre-refactor output. | Regression: the visual baseline in `tests/visual/qbit-world-baseline.png` matches the pre-refactor export. |
| F-7 | `assertQbitWorldArtifact` (new immunity guard) rejects artifacts where any face's `voxel` cell is missing from the volume's `cells` set, with a `PB-ERR-v1-QBIT-WORLD-CR-VOLUME-FACE-MISMATCH-xxxx` bytecode error. | Loud-failure test: an artifact with a face whose `voxel` is `(0, 0, 0)` but whose volume has no cell at `(0, 0, 0)` emits the error. |
| F-8 | **Flyweight Resources.** The volume uses a Flyweight pattern: cells carry an integer `resourceIndex` (or `null`) pointing to a root-level `resourcePalette` array. The palette is deduplicated (no two entries with the same `id`+`yield`+`rarity` triple). The 2D face list resolves and inlines the resource on each face (de-duplicated) for back-compat. | Unit test in `qbit-world-game-loop.test.js`: for a known preset, assert `cells.length === volume.cells.length`, `resourcePalette.length < cells.length` when resources repeat, and the inlined `faces[i].resource` matches `resourcePalette[cells[i].resourceIndex]`. Loud-failure test: a cell with `resourceIndex >= resourcePalette.length` emits `PB-ERR-v1-QBIT-WORLD-CR-RESOURCE-INDEX-OOR-xxxx`. |
| F-9 | `serializeVoxelVolume` and `deserializeVoxelVolume` round-trip losslessly through `JSON.stringify → JSON.parse` for any deterministic state, including the `resourcePalette` ordering. | Golden test: serialize a 32³ volume with 1000 occupied cells and a 50-entry palette, parse, assert cell set, palette, and Flyweight indices are identical. |
| F-10 | The 3D scene's chunk visibility culling uses the same `_update_chunk_visibility` pattern as `VoidmetalCaveWorld.gd:1341-1363`, hiding chunks beyond `DEFAULT_ACTIVE_CHUNK_RADIUS = 1`. | Visual: walk 3+ chunks away from the origin; distant chunks disappear; nearby chunks reappear when the camera returns. |
| F-11 | The Godot exporter's coordinate-matrix mapping is a named, exported, versioned function (e.g., `generatorToGodot(volumeCell, options) → Vector3`). The function is unit-tested for: (a) identity mapping when axes are aligned, (b) correct 90° rotations when a rotation is requested, (c) no implicit axis flips. The `iso-projector.js` docstring is updated (F-12) to declare the volume as canonical and the iso projection as a derived view. | Unit test in `qbitWorldGodotExport.test.js`: a known `(x, y, z)` cell produces a known `Vector3` under the default identity mapping; a rotation option produces a rotated Vector3. Docstring test: assert `iso-projector.js` header contains the phrase "projection, not canonical". |
| F-12 | The `volumeChecksum` is independent of the artifact's existing checksum. Tampering with the volume does not invalidate the face checksum. The volume checksum is computed over the canonicalized `{ w, h, d, resourcePalette, cells }` (sort cells by `(x, y, z)` first, sort palette by `id` first, both stable). | Parity test: re-import a tampered volume (one cell moved) and assert `volumeChecksum` differs while the face list still imports. |
| F-13 | The 3D scene's first-person camera default position is at the world center, raised 0.72 above the highest occupied voxel, looking horizontally. The camera is in noclip-style first-person; v1 has no walkable-floor collision (out of scope per Non-Goals). | Manual: launch `QbitWorld3D.tscn` and observe a clear view of the world without falling through the floor. |
| F-14 | Click-to-harvest in the 3D scene returns the same `qbit_resource` that the 2D web view returns for the same voxel. The 3D scene resolves the `resourceIndex` from the volume to the inlined `resource` object (matching the face's `resource` shape) before returning. | Test: for each preset, hit a known emissive voxel via raycast and assert the resolved resource matches the 2D web view's harvest result. |
| F-15 | The 3D scene's greedy mesh uses the same material palette as the 2D web view's fill colors, mapped 1:1 via `MATERIAL_COLORS` in `src/lib/godot-export/qbitWorldGodotExport.js:8-12`. | Visual: a voxel that renders as `#6b7280` (top, material 1) in the 2D web view renders as the same color in the 3D scene's top face. |

#### 3.2 Non-functional spec

- **Determinism:** Same `(schoolWeights, options, seed)` → same volume and same faces, every time, on every machine. No `Date.now()`, no `Math.random()`, no environment reads. The volume checksum is stable across runs and machines.
- **Back-compat:** Existing `.qworld` artifacts in `godot_project/assets/` keep working in the 2D pipeline. The 3D scene's F-3 fallback handles the missing `volume` field for one deprecation cycle. After the cycle, the fallback is removed.
- **Schema discipline:** One additive `volume` field on the qworld shape. No new top-level schemas. The volume's internal cell shape is the existing `voxel-volume.js` cell shape plus the Flyweight `resourceIndex`. The `resourcePalette` is an additive array, not a new schema.
- **Coordinate discipline:** The Godot exporter's coordinate-matrix is a named, exported, versioned function. Its name and signature are part of the schema (F-11). The function carries a unit test for every transformation it supports. Implicit axis swaps are forbidden by the immunity system.
- **Latency:** The volume adds at most 5% to `buildQbitWorldGameLoop` runtime for the QBIT preset (the volume is already built internally — it's the *export* that changes). The 3D scene's chunk mesh builds in under 200 ms per chunk on a developer laptop.
- **Memory:** The 3D scene's volume matches the 2D web view's face count in occupied cells (the volume is smaller, actually — it has 1 entry per occupied voxel vs N entries per visible face). The Flyweight palette reduces the per-cell resource payload from ~80 bytes (inlined object) to 4 bytes (integer index).
- **Test coverage:** Phase 1 lands with F-1, F-2, F-6, F-7, F-8, F-9, F-11, F-12, F-14 covered. Phase 2 lands with F-3, F-4, F-5, F-10, F-13, F-15 covered. Lines and branches of the new code ≥ 90%.
- **Security:** No `eval`, no `new Function`, no shell-out. The volume is pure data.

#### 3.3 Contracts

```ts
// codex/core/pixelbrain/qbit-world-game-loop.js (additive)
//
// Before:
//   function buildQbitWorldGameLoop(schoolWeights, options): { faces, params, telemetry, ... }
//
// After:
//   function buildQbitWorldGameLoop(schoolWeights, options): {
//     volume: VoxelVolume,         // NEW: canonical 3D
//     faces:  FaceDescriptor[],    // EXISTING: derived iso projection (resources inlined)
//     params: ...,
//     telemetry: ...,
//     ...
//   }
```

```ts
// codex/core/pixelbrain/voxel-volume.js (additive)
//
// Existing API: createVoxelVolume, getCell, setCell, isCellOccupied, ENERGY_TYPES, SENTINEL_MATERIAL_ID
// New API:
function serializeVoxelVolume(volume: VoxelVolume): SerializedVoxelVolume;
function deserializeVoxelVolume(json: SerializedVoxelVolume): VoxelVolume;

interface SerializedVoxelVolume {
  w: number;
  h: number;
  d: number;
  resourcePalette: Array<{ id: string; yield?: number; rarity?: string }>; // NEW: Flyweight palette (F-8)
  cells: Array<{
    x: number;
    y: number;
    z: number;
    materialId: number;
    resourceIndex?: number | null;  // NEW: Flyweight pointer into resourcePalette (F-8)
  }>;
  checksum: string;  // FNV-1a of canonicalized cells array
}
```

```ts
// src/lib/godot-export/qbitWorldGodotExport.js (additive)
//
// qbitWorldArtifact shape extension:
//   interface QbitWorldArtifact {
//     // ... existing fields (faces, telemetry, params, pixelBrainAsset, wandProposal, divWandNode)
//     volume: SerializedVoxelVolume;   // NEW
//     volumeChecksum: string;           // NEW (FNV-1a, separate from existing checksum)
//   }

// Coordinate-matrix module (F-11):
//
//   function generatorToGodot(
//     cell: { x: number, y: number, z: number },
//     options?: { rotateX?: 0 | 90 | 180 | 270; rotateZ?: 0 | 90 | 180 | 270; scale?: number }
//   ): { x: number, y: number, z: number };
//
// Default mapping is identity. The function is named, exported, versioned, and unit-tested.
// Implicit axis swaps are forbidden (F-11, F-12).
```

```ts
// codex/core/immunity/registry.js (additive)
//
// New rule group: qbit-world-volume
// Loud-failure error: PB-ERR-v1-QBIT-WORLD-CR-VOLUME-FACE-MISMATCH-0001
//   condition: artifact.faces[i].voxel not in artifact.volume.cells
// Loud-failure error: PB-ERR-v1-QBIT-WORLD-CR-RESOURCE-INDEX-OOR-0003
//   condition: any cell.resourceIndex >= resourcePalette.length (F-8)
// Loud-failure warning: PB-ERR-v1-QBIT-WORLD-WARN-VOLUME-MISSING-0002
//   condition: artifact.volume is null and 3D scene requested (warning only, F-3 back-compat)
```

```gdscript
# godot_project/scripts/QbitWorld3D.gd (new)
#
# Mirrors VoidmetalCaveWorld.gd patterns:
#   - _build_lookup_tables(), _build_terrain(), _build_player(), _build_lighting()
#   - _build_greedy_chunk_mesh(), _chunk_key_for_cell(), _update_chunk_visibility()
#   - _exposed_faces(), _add_cube_face()
#
# Differences from VoidmetalCaveWorld.gd:
#   - No torches, no inventory, no crafting, no pickaxe, no sword, no avatar
#   - No walkable floor collision (F-13: noclip-style first-person only)
#   - Click-to-harvest via raycast resolves the volume's resourceIndex to the
#     inlined resource object (F-14), matching the 2D web view's harvest result
#   - Volume source is the qworld artifact, not the cave's collisionSolids array
#   - Coordinate-matrix import: cells are translated via generatorToGodot() (F-11)
```

#### 3.4 Docstring update

The single most important change for future maintainers is the docstring of `codex/core/pixelbrain/iso-projector.js`. It currently reads as if the projection is the canonical output. The new docstring:

```js
/**
 * Iso projection of a 3D voxel volume.
 *
 * The projection is a *view*, not the canonical form. The canonical QBIT
 * artifact is the 3D `VoxelVolume` from `voxel-volume.js`. This module
 * derives 2D face lists from a volume for 2D consumers (the website SVG
 * renderer, the static Godot 2D scene). 3D consumers (the new
 * `QbitWorld3D.gd` game world) must consume the volume directly.
 *
 * If you find yourself wanting to mutate the face list to change what the
 * 3D world renders, you are solving the problem in the wrong layer.
 * Mutate the volume; re-project.
 *
 * @see codex/core/pixelbrain/voxel-volume.js for the canonical 3D type.
 * @see docs/scholomance-encyclopedia/PDR-archive/2026-06-17-qbit-3d-lattice-unification_pdr.md
 */
```

### 4. Test Plan

#### 4.1 Unit tests (Phase 1 — must pass before phase 2)

- `tests/pixelbrain/qbit-world-game-loop.test.js` (extend)
  - F-1: `buildQbitWorldGameLoop(...).volume` is a `VoxelVolume` for each preset.
  - F-1: every face's `voxel` cell exists in `volume.cells`.
  - F-1: the volume's occupied cell count is ≥ the face count / 3 (each voxel has at most 3 visible iso faces).
  - F-8: emissive voxels carry a `resourceIndex` matching the inlined `faces[i].resource`.
  - F-8: `resourcePalette` is deduplicated; `resourcePalette.length < cells.length` for repeating resources.

- `tests/pixelbrain/voxel-volume.test.js` (new, if it doesn't exist; otherwise extend)
  - F-9: `serializeVoxelVolume` round-trips through `JSON.stringify → JSON.parse` losslessly.
  - F-9: `serializeVoxelVolume` produces a deterministic output (sort cells by `(x, y, z)` and palette by `id` before hashing).

- `tests/godot-export/qbitWorldGodotExport.test.js` (extend)
  - F-2: exported artifact contains `volume` and `volumeChecksum`.
  - F-2: re-importing the artifact produces a byte-identical volume (including palette).
  - F-11: `generatorToGodot` returns the identity for a known `(x, y, z)` under default options.
  - F-11: `generatorToGodot` returns a rotated Vector3 when `rotateX` or `rotateZ` is requested.
  - F-12: tampering with the volume changes `volumeChecksum` but not the face list.

- `tests/qa/pixelbrain/qbit-volume-faces-parity.test.js` (new)
  - F-1 + F-6: golden test. For each preset, assert the post-refactor artifact's faces are byte-identical to the pre-refactor faces, and the volume contains exactly the cells referenced by those faces (with `resourceIndex` resolved).
  - F-7 + F-8: tamper tests. An artifact with a face whose `voxel` is missing from the volume fails the immunity guard with the correct bytecode error. An artifact with a `resourceIndex` out of range fails the immunity guard with the F-8 error.

#### 4.2 Integration tests (Phase 2)

- `tests/godot/qbit-world-3d-scene.test.gd` (new, GUT-style)
  - F-4: `QbitWorld3D.gd._ready()` builds the terrain and the player camera without errors.
  - F-4: the greedy mesh contains one chunk per active chunk radius.
  - F-10: `_update_chunk_visibility` hides chunks beyond `DEFAULT_ACTIVE_CHUNK_RADIUS = 1`.

- `tests/godot/qbit-world-3d-click-harvest.test.gd` (new)
  - F-5: a click raycast at the position of a known emissive voxel returns the correct `qbit_resource` (resolved from the volume's `resourceIndex`).
  - F-14: the 3D scene's harvest result matches the 2D web view's harvest result for the same voxel.

- `tests/visual/qbit-world-3d-baseline.png` (new, Claude-owned)
  - F-15: the 3D scene's first frame matches the 2D web view's first frame in colors and layout, modulo the camera angle (the 3D scene starts at an angle that shows the volume's top + two sides, the 2D view is fixed iso).

- `tests/visual/qbit-world-2d-regression.png` (existing, no change)
  - F-6: the 2D web view's first frame is byte-identical to the pre-refactor baseline.

#### 4.3 Backward-compat tests (Phase 1 — gates the back-compat claim)

- F-3: a fixture `.qworld` artifact *without* the `volume` field (committed to `tests/fixtures/qbit-world-legacy.qworld`, generated by checking out a pre-refactor commit) is accepted by the 3D scene. The synthetic volume derived from face voxels is identical to the equivalent fresh export's volume.
- F-6: the 2D web view's output is byte-identical for a fresh export and a legacy export.

#### 4.4 Schema tests (Phase 1)

- `tests/qa/schema/qbit-world-artifact-schema.test.js` (new)
  - The artifact's `volume` field is a valid `SerializedVoxelVolume`.
  - The artifact's `volumeChecksum` is a valid FNV-1a string (8 hex chars).
  - The artifact's `volume.resourcePalette` is a deduplicated array of `{ id, yield?, rarity? }` objects.
  - Every cell in `volume.cells` has a valid `materialId` in the `MATERIAL_NAMES` set.
  - Every cell's `resourceIndex` (when not null) is in range `[0, resourcePalette.length)`.

### 5. Migration / Rollout Plan

#### 5.1 Phase 1 — Core (volume canonical, schema extended, back-compat preserved)

- **Step 1.1:** Edit `iso-projector.js` docstring (F-12). No code change. Pass.
- **Step 1.2:** Add `serializeVoxelVolume` and `deserializeVoxelVolume` to `voxel-volume.js` (with `resourcePalette` and `resourceIndex`). Write F-9 unit tests. Pass.
- **Step 1.3:** Refactor `qbit-world-game-loop.js` to return `{ volume, faces, ... }`. The `volume` is built by collecting occupied cells from the existing `qbit-field.js` propagation output. The Flyweight extraction (F-8) populates `resourcePalette` and `resourceIndex` on each cell; `faces` inlines the resolved `resource` for back-compat. Write F-1, F-8 unit tests. Pass.
- **Step 1.4:** Extend `qbitWorldGodotExport.js` to carry the `volume` and `volumeChecksum`. Implement `generatorToGodot(cell, options)` as a named, exported, versioned function (F-11). Write F-2, F-11, F-12 unit tests. Pass.
- **Step 1.5:** Add `assertQbitWorldArtifact` to the immunity registry (F-7, F-8). Write loud-failure tests. Pass.
- **Step 1.6:** Backward-compat: commit `tests/fixtures/qbit-world-legacy.qworld` from the pre-refactor commit. Write F-3, F-6 back-compat tests. Pass.
- **Step 1.7:** Run the visual regression baseline. The 2D web view output must be byte-identical to the pre-refactor baseline. Pass.
- **Step 1.8:** Update `SCHEMA_CONTRACT.md` with the `qbitWorldArtifact.volume` field (with Flyweight palette) and a SCHEMA CHANGE NOTICE. Pass.
- **Step 1.9:** Regenerate the seven `qbit-world*.qworld` artifacts in `godot_project/assets/` with the new volume field. Commit them.
- **Gate:** Phase 1 is green. The 2D pipeline works identically. The artifact carries the new field. The schema change is documented.

#### 5.2 Phase 2 — 3D game world (new Godot scene, no gameplay layer)

- **Step 2.1:** Implement `QbitWorld3D.gd`. Mirror `VoidmetalCaveWorld.gd:1-500` (constants, lookup tables, terrain build, player, lighting). Drop the gameplay layer (no torches, no inventory, no avatar, no walkable floor collision). Add the volume source (load from `.qworld`, fall back to F-3 synthesis if absent). Use `generatorToGodot` to map each cell to Godot space (F-11). Write F-4, F-10, F-13 unit tests. Pass.
- **Step 2.2:** Add click-to-harvest via raycast → volume lookup → resolve `resourceIndex` to inlined `resource` object (F-14). Print the `qbit_resource` to console (matches the 2D web view's behavior). Write F-5, F-14 integration tests. Pass.
- **Step 2.3:** Create `QbitWorld3D.tscn` with `Node3D` script + `Camera3D` child.
- **Step 2.4:** Wire the lighting to use the same `MATERIAL_COLORS` palette as the 2D web view, so the 3D scene's voxels render in the same colors as the 2D scene's faces. Write F-15 visual baseline. Pass.
- **Step 2.5:** Update `godot_project/project.godot` if needed to register the new scene in the runnable list. (Likely not needed if the scene is loaded by path.)
- **Gate:** Phase 2 is green. The 3D scene launches, walks around, and harvests voxels. The 2D pipeline is untouched. The artifacts on disk include the volume field.

#### 5.3 Phase 3 — Polish (PIR, visual regression, encyclopedia)

- **Step 3.1:** Profile `QbitWorld3D.gd` chunk build time. If > 200 ms per chunk, add memoization keyed on the chunk's cell set FNV-1a.
- **Step 3.2:** Update the QBIT world visual regression baseline if the 2D web view's output changed (it shouldn't, per F-6).
- **Step 3.3:** Write the post-implementation report (PIR) following the VAELRIX_LAW.md §15 template. Place at `docs/scholomance-encyclopedia/post-implementation-reports/PIR-20260617-QBIT-3D-LATTICE.md`.
- **Step 3.4:** Update the QBIT-Voxel theory paper (`docs/Scholo-Theory/QBIT-VOXEL-SYNTHESIS.md`) to reflect that the lattice is canonical 3D from this point forward.
- **Step 3.5:** Confirm the Level 3 PDR (`2026-06-16-qbit-voxel-level3-multi-biome-pdr.md`) can now proceed — its F-1 (round-trip through JSON) is feasible because the volume is now the canonical artifact with a checksum.
- **Step 3.6:** Schedule the deprecation of the F-3 fallback. After one release cycle, the synthetic-volume-from-faces path is removed and legacy artifacts are rejected by the immunity system.

### 6. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| The 2D web view output changes after the refactor (regression) | Low | High | F-6 visual regression is a phase 1 gate. The 2D pipeline is untouched in this PDR; the faces array is derived from the volume by the same `iso-projector.js`. The only way the output changes is if the volume's cell set differs from the pre-refactor implicit cell set, which F-1 parity test catches. |
| Flyweight `resourceIndex` out of range after dedup changes | Medium | High | F-8 loud-failure test emits `PB-ERR-v1-QBIT-WORLD-CR-RESOURCE-INDEX-OOR-0003` on the first bad cell. The dedup logic is unit-tested independently. The Flyweight is added in a separate step (1.3) so it can be reverted without losing the rest of the refactor. |
| The Godot exporter's coordinate-matrix has an implicit axis flip | Medium | High | F-11: the matrix is a named, exported, versioned function. It carries a unit test for the identity mapping and a unit test for at least one 90° rotation. The test fails if any axis is silently swapped. The docstring on `iso-projector.js` (F-12) makes the volume/face relationship explicit so future contributors don't reintroduce implicit assumptions. |
| Legacy artifacts break the 3D scene | Medium | Medium | F-3 backward-compat fallback: the 3D scene derives the volume from face voxel coordinates if the `volume` field is absent. One deprecation cycle. F-3 is a phase 1 test gate. |
| The volume is too large to fit in the artifact | Low | Medium | The volume is *smaller* than the face list (1 entry per occupied voxel vs N entries per visible face). For the QBIT preset, this is roughly 3x smaller. The Flyweight palette further reduces the resource payload by ~95% for repeating resources. |
| The 3D scene's first-person camera falls through the floor | Medium | Low | F-13: default camera position is at the world center, raised above the highest occupied voxel. The 3D scene does not implement walkable-floor collision in v1 (out of scope per Non-Goals). The player is in noclip-style first-person; future gameplay PDRs add walking. |
| The volume's `resource` field drifts from the face's `resource` field | Low | High | F-8: the volume's `resourceIndex` is the source of truth (assigned at cell construction in `qbit-world-game-loop.js`). The face's `resource` is resolved from the cell's `resourceIndex` at projection time. The two cannot drift because there's one source (the volume), and F-8's loud-failure test catches any index mismatch. |
| The `volumeChecksum` collides with the existing artifact checksum | Low | High | The volume checksum is a *separate* FNV-1a over the canonicalized cells array, namespaced `vol_` for grep-ability. F-12 verifies independence. |
| The QBIT 3D scene conflicts with `VoidmetalCaveWorld.gd` patterns | Low | Medium | The 3D scene mirrors `VoidmetalCaveWorld.gd`'s *structural* patterns (greedy mesh per chunk, raycast mining, mouse-look) but not its *content* (no torches, no inventory, no avatar). The two are siblings, not duplicates. |
| The `SCHEMA_CONTRACT.md` change requires a version bump and Codex review | High | Low | This is a Law 3 / SCHEMA CHANGE NOTICE requirement. Codex owns the schema. The PDR is the upstream of the schema change. Codex is an owner. |
| The 2D Godot static scene (`QbitWorldScene.gd`) needs the volume field | Low | Low | It does not. The 2D scene consumes faces only. F-6 regression test confirms. |
| The 3D scene exposes gameplay that should be in `VoidmetalCaveWorld.gd` | Low | Medium | The 3D scene is *narrower* than the cave: visualization + mining only. Walking, inventory, crafting, lighting, atmosphere are all out of scope. The cave remains the canonical gameplay world. |

### 7. Open Questions

These are tracked here as living decisions. Items marked *Settled* are closed but kept in the log for traceability.

1. **Resource field shape.** *Settled (v1.1, F-8):* Flyweight Pattern. To avoid exponential JSON payload bloat from 3D data, the schema uses a `resourcePalette` array at the root of the volume. Cells store a lightweight integer pointer (`resourceIndex`) that maps back to the palette. The 2D face list inlines the resolved `resource` object on each face for back-compat.

2. **Click-to-harvest mutability.** *Proposed (v1.1):* Read-only in v1, matching web view behavior. Destructive mining is a future PDR (likely tied to a QBIT gameplay world PDR that follows Level 3).

3. **Coordinate safety.** *Settled (v1.1, F-11):* The Godot exporter (`qbitWorldGodotExport.js`) handles the explicit mathematical translation of array indices to Godot's Y-up `Vector3` space via a named, exported, versioned function `generatorToGodot(cell, options)`. The mapping is never implicit; the function is unit-tested for identity and rotation.

4. **Volume face-set policy.** *Open.* Does the 3D scene render all 6 voxel faces, or only the 3 iso-visible ones plus their opposites? F-4 currently says "all 6"; the alternative is "iso-visible + bottom + back" which matches the 2D view's intuition. Decision: keep F-4 as written (all 6) for the v1 ship; revisit if performance is a concern.

5. **Destructive mining in the 3D scene.** *Open.* F-5 says the 3D scene's click-to-harvest is read-only (matching the 2D web view). The alternative is to mutate the volume in place (occupy → empty) and update the greedy mesh. Decision: keep read-only for v1; defer destructive mining to a follow-up PDR.

6. **Walkable floor in the 3D scene.** *Open.* F-13 says the 3D scene has no walkable-floor collision. The alternative is to borrow `VolumeAMP.apply_walkable_floor_volume` from `VoidmetalCaveWorld.gd:329-333`. Decision: keep no walkable floor for v1; defer to a follow-up PDR (the player is in noclip-style first-person).

---

## Self-Review

**Spec coverage check:**

| Goal from the user's framing | This PDR section |
|---|---|
| "Convert all logic from 2D to 3D" | §1, §3.1 F-1, F-2 — the volume is the canonical source; the faces are derived |
| "Keep the 2D for the website" | §2 Non-Goals, §3.1 F-6, §5.1 step 1.7 — the web view is unchanged |
| Path 3 (true 3D orbit) | §3.1 F-4, F-5, §5.2 — the 3D Godot scene with first-person camera |

**Anti-patterns avoided:**

- No `Math.random()` (determinism axiom 5)
- No parallel schema (Axiom 3 / Law 3 — one additive field on the existing qworld shape, with a SCHEMA CHANGE NOTICE)
- No new rendering system (the Godot 3D renderer is reused)
- No schema drift (the volume's `materialId` and `resourceIndex` are the same fields that the faces consume, by construction)
- No premature optimization (the volume is a literal `Array<{x, y, z, materialId, resourceIndex}>` + a deduplicated `resourcePalette` — no octree, no spatial hash, no R-tree)
- No new RNG (the volume is deterministic from the same `(schoolWeights, options, seed)` the faces are)
- No implicit coordinate mappings (the Godot exporter uses a named, exported function with unit tests)
- Single source of truth (the volume is the source; the faces are a view)
- Docstring declares the projection is not canonical (F-12, Law 12 application)

**Backward compatibility check:**

- `buildQbitWorldGameLoop` consumers that read `.faces` keep working — the return value is a superset of the previous shape.
- `QbitWorldPage.jsx` is unchanged.
- `QbitWorldScene.gd` is unchanged.
- The 2D web view's render output is byte-identical (F-6 regression test).
- The seven `qbit-world*.qworld` artifacts in `godot_project/assets/` will be regenerated with the new field; the old ones remain valid for the 2D pipeline and the 3D scene's F-3 fallback.
- `iso-projector.js` is docstring-only changed.
- `voxel-volume.js` is additive only.

**Law compliance check:**

- Law 3 (Schema Is Sovereign): The PDR is the upstream of a single additive schema change. Codex owns the schema delta.
- Law 7 (Security Before Features): No new input surface, no `eval`, no shell-out. The volume is pure data.
- Law 11 (Bug Fix Documentation): N/A — this PDR is a refactor, not a bug fix.
- Law 12 (Law Evolution Is Mandatory): The docstring update on `iso-projector.js` is a Law 12 application — the existing docstring permitted the projection to be treated as canonical, which was an architectural weakness. The PDR strengthens the law by declaring the projection as a view.
- Law 13 (PDR Archive Is Mandatory): This document satisfies Law 13.
- Law 14 (Collab Login / MCP): N/A — no agent activity in the PDR itself; ownership is named.
- Law 15 (Post-Implementation Report Is Mandatory): Step 3.3 writes the PIR after phase 2.
- Law 17 (Semantic Search): The PDR uses `mcp_scholomance_collab_search_codebase`-friendly bytecode search codes (`SCHOL-ENC-PDR-QBIT-3D-LATTICE-v1.2`).

**Domain handoff check (per VAELRIX_LAW.md Domain Map):**

| Piece | Owner | PDR section |
|---|---|---|
| Schema delta (`qbitWorldArtifact.volume` with Flyweight) | Codex | §5.1 step 1.8 |
| Core refactor (`qbit-world-game-loop.js`, `voxel-volume.js`) | Gemini | §5.1 steps 1.2, 1.3 |
| Godot exporter extension (volume + coordinate matrix) | Gemini | §5.1 step 1.4 |
| Godot 3D scene (new) | Gemini | §5.2 |
| 2D React page | Claude (no change) | §2 Non-Goals, F-6 |
| 2D Godot static scene | Claude (no change) | §2 Non-Goals, F-6 |
| Tests | Gemini | §4 |
| Visual baselines | Claude | §4.2 |
| PDR | Gemini (encyclopedia ownership) | This document |
| PIR | Gemini | §5.3 step 3.3 |

---

*Scholomance PDR — qbit-3d-lattice-unification-v1.2*
*Predecessor: PDR-2026-06-05-WORLD-REIFICATION-ENGINE.md (broader; not required), 2026-06-16-qbit-voxel-level3-multi-biome-pdr.md (succeeds this one)*
*Next: post-implementation report (PIR) after Phase 2 lands*
