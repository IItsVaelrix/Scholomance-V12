# PDR: Structural-Energy Lift → VolumeAMP (2D Foundry → True 3D Items)

## Lift the foundry's 2D pixel output into real 3D voxels by reinterpreting SketchAMP's chamfer field as STRUCTURAL energy, then transducing that energy into per-part voxel depth

**Bytecode Search Code:** `SCHOL-ENC-PDR-STRUCT-ENERGY-LIFT-v1.0`
**Date:** 2026-06-19
**Status:** Draft (design only — not yet implemented)
**Classification:** QBIT-Voxel | Foundry Stage | Energy Transduction | 2D→3D Lift | Item Geometry
**Priority:** High
**Primary Goal:** Give the item foundry a true 3D output. Today both `item-foundry` and `character-foundry` emit flat 2D pixel art; the Godot side then *extrudes* that into a thin slab (`PixelBrainItemBuilder`), so held items read as cardboard cut-outs. Introduce a single new pure stage — **VolumeAMP** — that lifts the existing 2D design into a real voxel volume by treating depth as **STRUCTURAL energy**, and route the result through the voxel container and Godot bridge that already render the (hand-authored) scholar.

---

## Related PDRs / papers

- `2026-06-18-voxedit-conventions-adoption-pdr.md` — shipped the 3D voxel authoring primitives (`voxel-axes`, `voxel-block`, `voxel-rig`, `voxel-keyframe`). **This PDR is the consumer:** VolumeAMP produces volumes those primitives describe; the lift is what finally feeds the generative pipeline into them.
- `2026-06-11-pixelbrain-item-foundry-pdr.md` — the 2D foundry this stage extends (not forks). VolumeAMP slots after `fills` as a new route step.
- `2026-06-11-super-depth-analysis-channel-pdr.md` / `2026-06-11-pixelbrain-directional-light-finish-pdr.md` — prior depth/shading work; the chamfer field VolumeAMP reuses is the same field those passes consume for *fake* depth (light). This promotes it to *real* depth (geometry).
- `2026-06-15-pixelbrain-volume-container-and-blender-bridge-pdr.md` — the `voxel-volume` container VolumeAMP writes into.

---

## Owner(s)

- **Codex (architecture / schema / contract):** Owns the STRUCTURAL-energy contract below (range, meaning, normalization law) and the new serialized item-voxel artifact schema (sibling of `PB-VOXEL-CHAR`). Authors the pure `VolumeAMP` stage.
- **Gemini (engine / route / tests):** Wires VolumeAMP as a `microprocessor-route` step with a seam contract (`requires: structural energy field`, `emits: voxel volume`); changes SketchAMP to *emit* its chamfer field as energy; vitest coverage.
- **Claude (Godot bridge / renderer):** Generalizes the bespoke scholar avatar builder (currently inline in `VoidmetalCaveWorld.gd`) into a shared voxel-packet → MultiMesh loader; registers the item-voxel artifact kind in `artifact_loader.gd`; retires the flat-extrude path in `PixelBrainItemBuilder` for items.
- **Escalation owner:** Angel. Specifically the STRUCTURAL-energy *semantic* reconciliation with the mining lattice (`chunked-world-volume.js` already seeds/propagates `ENERGY_TYPES.STRUCTURAL`) — confirm the foundry's per-item normalized field shares meaning without sharing scale.

---

## Context (seed — not the Executive Summary)

The foundry is excellent at 2D and blind to 3D. `forgeItemAsset` composes sketch-amp (chamfer distance transform), silhouette-composer, region-fill, motif/heraldry, and shader stages, then exports a `.pbrain` artifact whose `coordinates` are `{x, y, color, partId}` with at most a per-part `z` hint. `PixelBrainItemBuilder.build_extruded_item` turns each pixel into a column of cubes of a fixed `depth` — a stamped silhouette pressed a few millimetres thick. Held in first person it reads as a flat cut-out (observed directly: the voidmetal pickaxe).

The only genuine 3D content in the game (the void scholar) did **not** come from a foundry — it was hand-authored in `scratch/scholar-cells.mjs` as explicit `{x,y,z}` cells and rendered by a bespoke voxel builder. So the generative pipeline has never produced 3D; the 3D renderer and the 3D container exist but nothing in the foundry feeds them.

Two facts make the fix small rather than large:

1. **The depth map already exists.** SketchAMP's chamfer distance transform is, per cell, "how far am I from the silhouette edge" — i.e., a height/mass field. Today it is consumed *privately* to brighten interior pixels (fake roundness). It is never emitted.
2. **The system already has a currency for per-cell scalar fields: energy.** `voxel-volume.js` stores `energyField: Float32Array` + `energyTypes: Uint8Array` with `ENERGY_TYPES.STRUCTURAL = 2`, and `chunked-world-volume.js` already seeds/propagates STRUCTURAL energy through the mining lattice with the meaning *"structural material/support at this cell."* That meaning is identical to "how thick should this cell be."

Therefore the chamfer field **is** a structural-energy field that was never labelled as one. The lift is: label it, then transduce it to geometry.

---

## The Contract (load-bearing)

### 1. The field

A cell carries `energy: Float32 ∈ [0,1]` at `energyType = STRUCTURAL (2)`.
Meaning: **normalized material support.** `1.0` = the part's spine (max buried); `0.0` = on the silhouette boundary.

### 2. Producer — SketchAMP (one change: emit, don't hide)

Given chamfer distance `dist(cell)` (cells to nearest empty) and the part's spine value `R_part = max(dist)` within that part:

```
structuralEnergy(cell) = clamp( dist(cell) / R_part, 0, 1 )
```

Per-part normalization emits **pure bulge shape**, decoupled from absolute thickness. Deterministic; no RNG. SketchAMP keeps computing exactly what it computes today — it merely writes it into `energy`/`energyType` as a seam emission instead of consuming it internally.

### 3. Consumer — VolumeAMP (new pure stage)

Per-part params: `maxDepth` (voxels — half-thickness at the spine) and `profile` (energy→[0,1] curve). For each 2D cell with structural energy `e`:

```
halfDepth = round( maxDepth * profile(e) )
emit voxels at integer z ∈ [-halfDepth, +halfDepth]   # symmetric about z = 0
if e > 0 and halfDepth == 0: emit z = 0               # never hole the silhouette
each emitted voxel inherits materialId; RADIANT/PHOTONIC energy passes through → glow
```

Profiles (the art-direction knob):

| profile | `profile(e)` | result |
|---|---|---|
| `flat` | `1` | slab (legacy parity) |
| `bevel` | `e` | faceted chamfer |
| `round` | `sqrt(1 − (1 − e)²)` | smooth dome (orbs, hafts) |
| `stepped` | `ceil(e·n)/n` | chunky voxel terraces (world-consistent) |
| `ridge` | `e^0.6` | blade spine |

Total spine thickness = `2·maxDepth + 1`. **Front/back symmetric** (see Non-Goals).

### 4. Type discipline (the safety rule)

VolumeAMP reads **only** `energyType == STRUCTURAL` for depth. RADIANT/PHOTONIC energy is carried through onto emitted voxels (→ Godot emission). No consumer ever reads "the energy" generically — always by type. This is what prevents glow from leaking into mass.

### 5. The one law

*Structural energy is pre-normalized `[0,1]` = "fraction of spine depth"; absolute thickness (`maxDepth`, voxels) lives in VolumeAMP's per-part table.* If SketchAMP ever emits raw pixel distance, VolumeAMP cannot recover `R_part` and the contract breaks. **Normalized-at-the-source is the law.**

---

## Worked example — voidmetal pickaxe

- **Haft** (2-wide column): `R_part ≈ 1` → energy ≈ 1 along the centre. `profile=round`, `maxDepth=1` → a 3-voxel round rod. A haft, not a wire.
- **Head/blade**: energy peaks ≈ 1 at the spine, tapers to 0 at the points. `profile=ridge`, `maxDepth=2` → a 5-voxel bladed body thinning to a sharp edge. Not toothpicks.
- **Rune**: STRUCTURAL (`maxDepth=1`) **and** RADIANT energy → a flush glowing inlay.

---

## Convergence (why this is worth doing once)

`voxel-volume` is the same container the scholar lives in, and the Godot voxel builder already renders that container as a real MultiMesh. The moment items flow into `voxel-volume`, **items and characters share one container and one renderer.** Two pipelines (2D stamp for items, hand-carving for characters) collapse into **one forge, one bridge, both content types.**

---

## Non-Goals / Deferred

- **Asymmetric / through-hole geometry.** Silhouette-lift is front/back mirrored; it cannot punch a pickaxe-eye hole or differ front from back, because that data is not in the 2D drawing. Deferred to a later rung (second orthographic view, or true-3D authoring). Acceptable for ~95% of held items.
- **Per-cell distinct profiles.** Profiles are per-part, not per-cell, in v1.
- **Animation.** Rigging the lifted volume reuses `voxel-rig`/`voxel-keyframe` (already shipped); out of scope here.

---

## Risks

1. **Normalization mismatch** (the load-bearing law). Mitigation: a single shared constant/contract module; vitest that round-trips distance → energy → depth.
2. **Builder duplication.** The Godot voxel renderer must be generalized out of `VoidmetalCaveWorld.gd`, not copied. Mitigation: extract a shared `VoxelModelBuilder` before wiring items.
3. **STRUCTURAL semantic drift vs. the lattice.** Foundry uses a *separate, per-item, normalized* volume — shares meaning/type with the mining lattice, never the buffer. Confirm with Angel.
4. **Transport vs. container.** `voxel-volume` is the in-memory buffer; the bridge needs a serialized artifact (new schema, sibling of `PB-VOXEL-CHAR`). Do not conflate.
