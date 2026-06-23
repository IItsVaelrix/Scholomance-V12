# PDR: VoxEdit Conventions → Scholomance Standards Adoption

## Adopt VoxEdit's authoring conventions as canonical Scholomance voxel standards, binding each to the module that owns it

**Bytecode Search Code:** `SCHOL-ENC-PDR-VOXEDIT-CONVENTIONS-v1.0`
**Date:** 2026-06-18
**Status:** Draft
**Classification:** QBIT-Voxel | Authoring Standards | Pivots & Rigging | Build-Plane | Animation Binding | Convention Catalog
**Priority:** High
**Primary Goal:** Close the fault line between a 3D voxel world (`{x,y,z}`, Y-up) and a 2D authoring/pivot layer (`{x,y}`, no agreed Z). Adopt VoxEdit's proven conventions as the canonical Scholomance rule for each gap, and ship the pure, deterministic primitives that A (axes/canvas), B (pivots), C (blocks/rigging), and D (animation binding) require.

---

## Related PDRs / papers

- `2026-06-17-qbit-3d-lattice-unification_pdr.md` — promotes the 3D `VoxelVolume` to canonical and demotes `iso-projector` to a derived view. **This PDR is the direct successor:** it defines the *authoring* conventions that sit on top of the now-canonical 3D lattice.
- `2026-06-16-qbit-voxel-level3-multi-biome-pdr.md` — multi-chunk world; pivots/rigs are chunk-local and consume the same axis frame defined here.
- `2026-06-15-pixelbrain-volume-container-and-blender-bridge-pdr.md` — export container; the unit-scale / axis frame defined here is what the Blender/Godot bridges must honor.
- `2026-06-15-pixelbrain-animation-encoding-white-paper.md` — the existing animation bytecode pipeline. D-row primitives here are the *spatial* layer that pipeline binds to (rotate-about-pivot), not a rewrite of it.
- `2026-06-12-pixelbrain-editor-aseprite-rival-pdr.md` — the editor surface that A2 (build-plane) extends with a Z axis.

---

## Owner(s)

- **Codex (architecture / schema / standards):** Owns this catalog and the canonical-rule decisions below. Defines the axis frame, pivot type, half-voxel alignment rule, rotation order, and the `PB-VOXEL-STD-v1` contract string. Authors the pure standard modules (`voxel-axes`, `voxel-pivot`, `build-plane`).
- **Gemini (engine / rigging / tests):** Owns `voxel-block`, `voxel-rig`, `voxel-keyframe`, the skeleton 3D-lift, and all vitest suites under `tests/pixelbrain/`.
- **Claude (UI surface):** Wires `activePlane` into the editor command stack as a follow-on (A2 UI). No web-view change required for the standards layer to land.
- **Escalation owner (cross-domain conflicts):** Angel. Specifically: the up-axis/handedness declaration (must stay aligned with the Godot Y-up right-handed bridge), and the default-pivot policy (feet-on-ground vs bbox-center).

---

## Context (seed — not the Executive Summary)

The voxel volume is already 3D. `createVoxelVolume(width, height, depth)` and `cellIndex = y*W*D + z*W + x` (YZX storage) treat **Y as up (height)** and **Z as depth**. `iso-projector.project(x, y, z)` already flattens that volume to screen.

But the authoring layer never followed the volume into 3D:

- **Pivots/anchors are 2D.** `part-profile-library.js` declares `anchors: Object<string,{x,y}>` and `character-construction-skeleton.js` consumes the same `{x,y}` points (`validateCharacterSkeleton` checks only `x` and `y`). There is no Z on a pivot.
- **The canvas has no depth axis.** Authoring happens on a single 2D plane; there is no notion of an active build depth.
- **The animation pipeline has nothing 3D to rotate about.** `transformProcessors.ts` applies `translateX/Y`, `scale`, etc., but no rotation about a 3D pivot, because no 3D pivot exists.

VoxEdit solved all of this years ago with a small set of conventions. Rather than invent ours, we **adopt VoxEdit's** and bind each to the Scholomance module that will enforce it.

---

## The Catalog

Columns: **VoxEdit pattern** → **Canonical Scholomance rule (the decision)** → **Bound module** → **Status**.

### A. Axes & Canvas

| # | VoxEdit pattern | Canonical Scholomance rule | Bound module | Status |
|---|---|---|---|---|
| A1 | Y-up 3D viewport, fixed handedness | **Y-up, right-handed**, axis order `X`(right) `Y`(up) `Z`(depth, +Z toward camera). Matches the volume (`Y`=height) and the Godot bridge. Storage stays YZX. The frame is the source of truth; `iso-projector` is a declared view of it. | `voxel-axes.js` (new) + `iso-projector.js` docstring | **Decided** |
| A2 | Movable build plane / active depth slice | The authoring surface carries an **active plane** `{ axis, index }`, default `axis:'z'`. A plane cursor `(u,v)` maps to volume coords via the axis. Pure, total, clamped. | `build-plane.js` (new); `editor-command-stack.js` gains `activePlane` (UI follow-on) | **Decided** |
| A3 | Mirror/symmetry planes on each axis | A mirror plane lives **between voxels at `n+0.5`** (half-voxel). `mirror(p, axis, planeHalf) → 2*planeHalf − p`. Z mirroring now possible. | `voxel-axes.js` (helper); extends `symmetry-amp.js` | **Decided** |

### B. Pivots

| # | VoxEdit pattern | Canonical Scholomance rule | Bound module | Status |
|---|---|---|---|---|
| B1 | Pivot is a 3D grid point | Pivot type is **`{x,y,z}`**. Existing 2D anchors are lifted via `liftAnchor2D(a, zDefault)`; default `z` = block depth centerline. 2D profiles keep working unchanged. | `voxel-pivot.js` (new) | **Decided** |
| B2 | Per-node pivot, sensible default | Default pivot for a block bbox = **X center, Y min (feet-on-ground), Z center**. Rigging-friendly: blocks stack vertically and rotate about their base. Override per node. | `voxel-pivot.js` `defaultPivot(bbox)` | **Decided** |
| B3 | Pivot can sit on voxel boundary | Pivots are stored in **half-voxel units** (multiples of `0.5`). Even-size blocks → integer corner; odd-size → `n+0.5` center; both centers are *exactly* representable. Keeps 90° rotation lattice-aligned. | `voxel-pivot.js` `snapToHalfVoxel(p)` | **Decided** |

### C. Blocks & Rigging

| # | VoxEdit pattern | Canonical Scholomance rule | Bound module | Status |
|---|---|---|---|---|
| C1 | Model = named blocks, each with local origin | A **Block** = `{ name, cells, bbox, pivot }`. Local origin **is** the pivot. `createBlock` computes bbox and the B2 default pivot. | `voxel-block.js` (new) | **Decided** |
| C2 | Node tree; child pivot relative to parent | A **Rig** is a tree of `{ name, block?, pivot, children }`. Child pivot is stored in **parent-local** voxel space; `worldPivot(node)` resolves up the chain. The character skeleton's anchors become rig joints. | `voxel-rig.js` (new) | **Decided** |
| C3 | Fixed Euler rotation convention | Rotation order is **intrinsic XYZ, right-handed, degrees** (matches Three.js default `'XYZ'`). | `voxel-rig.js` `ROTATION_ORDER` | **Decided** |

### D. Animation (binding the existing pipeline)

| # | VoxEdit pattern | Canonical Scholomance rule | Bound module | Status |
|---|---|---|---|---|
| D1 | Keyframe transform about the pivot | A keyframe = `{ t, translate, rotateDeg, scale }`, composed as `T(−pivot) → S → R(XYZ) → T(+pivot) → T(translate)`. This is the spatial primitive the existing animation pipeline calls. | `voxel-keyframe.js` (new) | **Decided** |
| D2 | fps timeline | Canonical **fps = 12** (pixel-art standard). Keyframe `t` is seconds; `frameAt(t, fps) = round(t*fps)`. | `voxel-keyframe.js` `FPS_DEFAULT` | **Decided** |

### E. Materials — **Open** (catalogued, not in this PDR's build)

| # | VoxEdit pattern | Direction | Bound module | Status |
|---|---|---|---|---|
| E1 | Indexed palette + per-material attrs (emissive/metal/rough) | Map onto existing `material-registry.js`; declare which attrs are canonical. | `material-registry.js` | **Open** |

### F. Interop — **Deferred**

| # | VoxEdit pattern | Direction | Bound module | Status |
|---|---|---|---|---|
| F1 | `.vox` / `.gltf` export | Export from the now-canonical volume + rig. | volume/blender bridge | **Deferred** |
| F2 | Voxel → world unit scale | One voxel = a fixed world unit; honor in bridges. | export bridges | **Deferred** |

---

## Contract

All new standard modules export and assert the contract string **`PB-VOXEL-STD-v1`**. Every function is a **pure, total, deterministic** function of its inputs (no RNG, no hidden state) — consistent with the QBIT-Voxel determinism guarantee. Same input → same output on every machine.

---

## Implementation Map (A–D)

New files under `codex/core/pixelbrain/`:

1. `voxel-axes.js` — A1 + A3: `AXES`, `UP_AXIS`, `HANDEDNESS`, `VOXEL_STD_CONTRACT`, `mirror(p, axis, planeHalf)`.
2. `voxel-pivot.js` — B1/B2/B3: `liftAnchor2D`, `defaultPivot(bbox)`, `snapToHalfVoxel`, `isPivot3D`.
3. `build-plane.js` — A2: `createPlane(axis, index)`, `planeToVoxel(plane, u, v)`, `voxelToPlane(plane, p)`, `clampPlane(plane, vol)`.
4. `voxel-block.js` — C1: `createBlock(name, cells, pivotOverride?)`, `blockBBox(cells)`.
5. `voxel-rig.js` — C2/C3: `createRig`, `addNode`, `worldPivot(rig, name)`, `ROTATION_ORDER`, `rotatePointAboutPivot(p, eulerDeg, pivot)`, `skeletonToRig(skeleton)`.
6. `voxel-keyframe.js` — D1/D2: `composeTransform(keyframe, pivot)`, `applyTransform(point, transform)`, `FPS_DEFAULT`, `frameAt(t, fps)`.

Plus: a `lift3D` path so `character-construction-skeleton.js` anchors can be lifted to 3D pivots without rewriting every 2D profile (B1 adoption at the boundary, not a mass rewrite).

Each module ships with a matching `tests/pixelbrain/<module>.test.js` vitest suite, written test-first.

### Explicit non-goals (this PDR)

- **No mass rewrite of 2D profiles.** Anchors lift to 3D at the skeleton/rig boundary; `part-profile-library` profiles stay 2D and keep rendering.
- **No live editor UI for the build-plane.** A2 ships the pure model + mapping; the `activePlane` UI wiring is a Claude follow-on.
- **E/F not built.** Catalogued as Open/Deferred so the table is complete.

---

## Success Criteria

- All six modules exist, export `PB-VOXEL-STD-v1`, and pass their vitest suites.
- A skeleton produced by `createCharacterSkeleton` can be lifted to a 3D rig and a point rotated about a joint pivot, deterministically.
- A keyframe composes to the exact `T(−pivot)→S→R→T(+pivot)→T` order and round-trips a no-op transform to identity.
- No existing `tests/pixelbrain/` suite regresses.
