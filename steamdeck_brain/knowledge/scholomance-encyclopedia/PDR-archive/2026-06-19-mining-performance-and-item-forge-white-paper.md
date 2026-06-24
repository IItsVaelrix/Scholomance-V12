# White Paper: Mining Performance, GPU-Honest Lighting, Threaded Remesh, and the Path to a 3D Item Forge

**Bytecode Search Code:** `SCHOL-ENC-WP-MINING-PERF-ITEM-FORGE-v1.0`
**Date:** 2026-06-19
**Status:** Record (post-session)
**Classification:** Performance | Renderer | Concurrency | Foundry Architecture | Retrospective
**Scope:** `godot_project/scripts/VoidmetalCaveWorld.gd`, plus a proposed (un-built) foundry stage specified in `2026-06-19-structural-energy-lift-volumeamp-pdr.md`.

> A note on honesty: this paper separates **what is done and verified on the real renderer** from **what is designed but not yet built.** Several items in §4 are proposals, not accomplishments. They are labelled as such.

---

## 1. Executive summary

A single session on the Voidmetal Cave scene began as "Alt+C doesn't work" and ended with: a real 3D voxel scholar with a walk-cycle rig, a free-orbit third-person camera, mining stutter cut from **~250 ms to a smooth <16 ms main-thread cost**, and a worked-out architecture for giving the item foundry true 3D output. The performance win came almost entirely from **removing work**, not adding cleverness — including the discovery that the most expensive computation in the rebuild was being **discarded by the renderer** before it ever reached a pixel.

---

## 2. What was actually accomplished (done + verified)

**Input / camera**
- `Alt+C` camera toggle was never broken in code; the user's keyboard could not register the modifier chord (matrix ghosting / AltGr). Rebound to plain **`C`**. Root cause was hardware, not software.
- Replaced a welded follow-camera with a **free-orbit third-person camera** (middle-mouse drag), decoupling camera yaw from the physics body so the body no longer double-applied yaw.

**Scholar avatar**
- Swapped a flat SVG billboard for the real **blue/black voxel scholar**, rendered as per-part MultiMeshes.
- Added a **GDScript rig** (body bob, opposite-phase arm and leg swing) that animates while walking and settles to rest when idle. Legs were split out of the `body` block specifically so they could step.

**Mining performance (the core result)** — measured on the Steam Deck (Van Gogh APU, GDScript):

| Stage | Per-mine main-thread cost |
|---|---|
| Baseline | ~225–264 ms (quarter-second freeze) |
| Stop wiping the light cache + reuse the MeshInstance | ~60–75 ms |
| **Remove the (invisible) per-vertex CPU lighting** | ~30 ms, spikes gone |
| Integer-keyed neighbour tests (`_occ`) | ~20 ms real (profiling `print()` was adding ~9 ms) |
| **Threaded remesh** (snapshot → worker → swap) | **~10 ms snapshot on the dispatch frame; the ~30 ms build is off-main** |

Stress-tested under rapid cross-seam mining: no races, no stale-mesh flicker. Collider removal stays synchronous, so collision is correct instantly; the visual mesh catches up within a few frames.

---

## 3. The two findings that mattered most

**Finding 1 — the expensive lighting was never rendered.** The terrain material never sets `vertex_color_use_as_albedo`, so in Godot 4 the per-vertex colours produced by the voxel-lighting pass (cone-traced against every emissive voxel, 30–285 ms of it) were **silently discarded.** The visible cave lighting comes entirely from the GPU environment (SSIL/SSAO/fog + directional). Deleting the entire CPU lighting path was a *zero-visual-change* operation that erased the dominant cost. Verified by before/after screenshot diff (only volumetric-fog/TAA shimmer differed).

**Finding 2 — the profiler was lying, and so was the original bug report.** A pasted analysis blamed `generate_normals()` and `commit()`. Direct measurement showed those cost **0.2 ms each**; the cost was entirely in the greedy build. Worse, the `print()` statements used to measure were themselves adding ~9 ms per call and inflating every reading. The lesson is old but earned again: **measure, distrust the report, and keep the instrument out of the timed region.**

---

## 4. The proposed "solves" — honest assessment

The session's design ideas were largely the user's, reasoned by analogy from physical systems. My assessment of each:

**Speedee Service System → assembly-line / time-sliced rebuild.** *Strong framing, ultimately not the chosen path.* It correctly reframed the goal as "never let one frame do the whole job." We didn't need the assembly line because removing invisible work shrank the job enough that a single worker thread sufficed. The instinct was right; the constraint changed under it.

**AMP-as-head-chef → pure transformer + stateful scheduler.** *Correct and durable.* This is the shared-nothing message-passing pattern, and it maps cleanly onto the existing AMP convention. It is the conceptual backbone of both the threaded remesh and the proposed VolumeAMP.

**"Lighting is computed per-face, not per-chunk."** *Correct diagnosis ahead of the measurement.* This predicted Finding 1's neighbourhood before the data confirmed it.

**"The CPU is doing the GPU's job."** *The key unlock.* It pointed straight at Finding 1. The voxel-light pass was a CPU re-implementation of work the GPU was already doing (and the result was being thrown away). This single reframing collapsed the whole problem.

**Two-sided kitchen / one-way slots → SPSC, lock-free.** *Right down to the metal.* The user independently derived single-producer/single-consumer queues. The one honest correction was that the cross-core memory barrier is irreducible — it cannot be "encoded into a memory cell," because the cell *is* the barrier and the cost lives in cache coherency, not in the data structure. `WorkerThreadPool` provides exactly that one handshake; we built the rest.

**"Turboquant memory cell removes the handshake."** *The one over-reach, correctly abandoned.* A useful question to ask once; the answer is no, for hardware reasons. Worth recording because the *reasoning* that produced it was sound — it just met a physical floor.

**"Improve the foundry / the bridge to 3D is missing."** *Correct, and sharper than first stated.* Both foundries emit only 2D; the sole 3D asset (scholar) was hand-carved. The fix is one new stage, not a rewrite — specified in the companion PDR.

**STRUCTURAL-energy lift.** *The most elegant idea, and unproven.* Reinterpreting SketchAMP's chamfer field as STRUCTURAL energy is genuinely insightful: it dissolves the "surface the depth map" problem instead of patching it, and it is *consistent with the existing meaning of STRUCTURAL energy in the mining lattice* (material support). But it is **designed, not built.** Its real risks are mundane — normalization convention, generalizing the Godot builder, the front/back-symmetry limit — and those are where it will actually succeed or fail, not in the elegant part.

---

## 5. The threading decision, candidly

Threading was the user's explicit ask and it is implemented and race-clean. But honesty requires noting: **the lighting removal + integer keys had already taken us from 250 ms to ~20 ms.** Threading bought the last few milliseconds of guarantee (and content-independence) at the cost of a snapshot copy (~10 ms) and real concurrency machinery. A defensible alternative was to stop at ~20 ms single-threaded. We threaded because the user wanted a hard ceiling regardless of chunk content, and because removing the lighting made the worker's data needs small enough that the safe (snapshot) version was cheap. It was the right call for the stated goal; it was not the *only* defensible call.

---

## 6. Why the Steam Deck deserves credit

The result is notable partly *because* of the hardware: a TDP-limited 4-core handheld, running interpreted GDScript, greedy-meshing thousands of cells on a background thread while the iGPU runs screen-space GI. But the deeper point is that **the constraint did the design work.** On a desktop, a 40 ms freeze would have been ignored and never fixed. The Deck made the waste loud enough to force the right architecture. Tight hardware is a good editor.

---

## 7. Cleanup / debt recorded

- Dead code removed: the entire CPU voxel-lighting path (`_voxel_light_at`, AO, direct/bounce, cone trace, occlusion, cache + invalidator, emissive index, `prune_emissive_at`, `_material_emission_color`, `VOXEL_LIGHT_*`).
- Added integer-keyed mirrors (`_occ`, `_block_ids_v`, per-chunk `solid_cells`) — note: the Vector3i mirrors did *not* meaningfully reduce build time (the cost is allocation churn, not strings); they remain because they are correct and feed the threaded snapshot, but the "Vector3i will break 16 ms" prediction was wrong.
- `PixelBrainItemBuilder`'s flat-extrude path is now a stopgap pending the VolumeAMP lift.
- Standing recommendation: extract the inline scholar voxel builder into a shared `VoxelModelBuilder` before items are wired to it.

---

## 8. One-line conclusions

- **Performance:** the fastest code is the code you delete; the second fastest is the code you move off the main thread.
- **Process:** measure before fixing, distrust pasted diagnoses, and keep the instrument out of the experiment.
- **Architecture:** the item forge already owns its parts (`voxel-volume`, the route, STRUCTURAL energy, a 3D renderer) — it only lacks the one stage that lifts 2D into 3D. Build that, and items and characters share a single forge.
