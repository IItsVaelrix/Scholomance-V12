# PDR: PixelBrain Silhouette Blueprint & Three-View Shadow Gate
## A sealed `.silh` blueprint language that moulds the forge and judges the voxel solid by the three shadows it casts — at rest and across animation

**Bytecode Search Code:** `SCHOL-ENC-PDR-PIXELBRAIN-SILHOUETTE-BLUEPRINT-GATE-v1.0`
**Date:** 2026-06-19
**Status:** Ratified
**Classification:** PixelBrain | Immunity | Blueprint Language | Forge Mould | Three-View Shadow Gate | Animation | Deterministic Asset Pipeline
**Priority:** High
**Primary Goal:** Define a sealed, digest-stamped silhouette blueprint language (`.silh`) extracted from reference imagery, that (a) **moulds** the forge — the pour happens inside the front shadow — and (b) **inspects** the finished voxel solid by projecting it into front/side/top shadows and grading them against the blueprint, at rest and across the blueprint's own animation phases.
**Companion:** Extends [`2026-06-19-pixelbrain-craft-gate-immunity-pdr.md`](./2026-06-19-pixelbrain-craft-gate-immunity-pdr.md). Reuses the [`Blueprint AMP Operating Manual`](../BLUEPRINT-AMP-OPERATING-MANUAL.md) digest covenant and the animation blueprint grammar in `codex/core/animation/bytecode/blueprintParser.ts`.

---

# 1. Executive Summary

The Craft Gate proves a forged asset is *internally* consistent — deterministic, in-bounds, material-authoritative. It does not prove the asset matches an *intended structure*. This PDR adds that missing oracle. A reference image (AI-generated or hand-drawn, made **once, outside the engine**) is scanned into a sealed `.silh` blueprint: the three orthographic shadows of the item (front, side, top), plus an optional animation block written in the existing `ANIM` vocabulary. The blueprint is frozen with a sha256 digest — sealed in glass, never re-summoned.

That sealed blueprint plays two roles at once: it is the **mould** (its front shadow constrains the forge pour) and the **inspector** (after forging, the gate projects the `voxelPacket` into three shadows and grades each against the blueprint). Because the item moves, the gate pulls the **same deterministic transform on both the voxel solid and the sealed shadow** at each sampled animation phase, then checks they stayed in lockstep. The first target is `specs/voidmetal-pickaxe.v1.json` remade in 3D against a sealed pickaxe blueprint.

# 2. Problem Statement

`forgeItemAsset()` can emit a deterministic, in-bounds, on-palette voxel packet that nonetheless does not look like the thing it is supposed to be. "Generated correctly" is not "shaped correctly." There is no canonical, replayable description of the *intended* form for the gate to enforce, and no way to force the forge to replicate an artist's or model's structural intent. With `.volume` and `.voxelPacket` now live, a wrong silhouette becomes wrong geometry across three dimensions and across every animation frame. We need an external, deterministic, hashable structural contract — and a gate that refuses any forge that does not cast the right shadows.

# 3. Product Goal

```bash
# Seal a portrait: scan 1-3 reference PNGs into a .silh blueprint (AI lives here, once, offline)
node scripts/pixelbrain-silhouette-scan.mjs \
  --front ref/pickaxe-front.png --side ref/pickaxe-side.png --top ref/pickaxe-top.png \
  --id weapon.tool.pickaxe-v1 --out specs/voidmetal-pickaxe.silh

# Forge + gate against the sealed blueprint (mould + inspector)
node scripts/pixelbrain-forge-gate.mjs specs/voidmetal-pickaxe.v1.json \
  --blueprint specs/voidmetal-pickaxe.silh --strict
```

Pipeline:

```text
reference PNG(s)
  -> silhouette-scan  (generateSilhouetteFromImage / extractEdgePoints)
  -> .silh form block (VIEW front|side|top + CONTOUR) + hand-authored ANIM block
  -> parseSilhouetteBlueprint()  (delegates ANIM block to blueprintParser.ts)
  -> SilhouetteBlueprint IR + sha256 digest   [SEALED]
       |- MOULD:     front filled mask constrains forgeItemAsset() silhouette input
       |- INSPECTOR: project voxelPacket -> {front,side,top} shadows
       |             compare vs blueprint masks within hashed TOLERANCE
       |             per ANIM phase: apply M(t) to BOTH voxel and blueprint shadow,
       |             compare in lockstep + rigid invariants
  -> PB-XP-v1 vaccine on pass / PB-ERR-v1 on blocking fail
```

# 4. Non-Goals

- **No live AI in the path.** The engine never calls an image model during forge or gate. AI produces the reference once, offline; the engine only scans, seals, and enforces. No `Math.random`, `Date.now`, or network in the blueprint or gate path.
- **No new written grammar for animation.** The `ANIM` block reuses the existing `blueprintParser.ts` directive set (`ID/TARGET/DURATION/EASE/LOOP/PHASE/ROTATE/TRANSLATE_*/SCALE/OPACITY/GLOW`). We do not invent a parallel motion language.
- **No repainting.** The gate diagnoses and blocks; the scanner seals. Neither crafts pixels.
- **No PNG/shader as authority.** Shadows are computed from the canonical `voxelPacket`, never from a rendered frame.
- **No silent schema.** `PB-SILH-BLUEPRINT-v1` does not persist until Codex registers it in `SCHEMA_CONTRACT.md`.
- **No fuzzy oracle.** Tolerance is an explicit integer, authored into the blueprint and hashed. There is no heuristic "looks close enough."

# 5. Core Design Principles

- **The shadow is law.** A forged item is immune only if the three shadows it casts match the three shadows in its sealed blueprint, at rest and at every sampled phase.
- **Seal, then enforce forever.** Once scanned, a blueprint is frozen by digest. Same blueprint, same verdict, every machine, every run.
- **Mould and inspector are the same blueprint.** The front shadow shapes the pour; all three shadows grade the result. There is no way to satisfy the inspector by cheating the mould.
- **Motion is applied to both sides.** Animation never relaxes the contract into guesswork. The same `M(t)` transforms the voxel and the sealed shadow; the gate checks lockstep.
- **Projection is integer set math.** Shadows are sets of integer cells. No floats, no anti-aliasing, no thresholds beyond the hashed tolerance.
- **The DSL is a skin over a digest.** `.silh` is the readable, hand-authorable transport; the parser compiles it to an IR that is canonicalized and hashed exactly like a `SketchArtifact`.

# 6. The `.silh` Blueprint Language

Line-based, sibling to `blueprintParser.ts`. `SILH_START … SILH_END` wraps a form section and an optional `ANIM_START … ANIM_END` block parsed by the existing animation parser.

```text
SILH_START
ID            weapon.tool.pickaxe-v1
SOURCE        ai-portrait sealed 2026-06-19
GRID          32 48 16            # w h d - the lattice the shadows live on
SNAP          integer
TOLERANCE     front 0 side 6 top 6   # max disagreeing cells per view (Hamming)

VIEW front
CONTOUR       6,0 20,0 26,6 26,10 20,10 18,14 16,46 12,46 ...
VIEW side
CONTOUR       4,0 12,0 12,46 8,46 ...
VIEW top
CONTOUR       6,4 26,4 26,12 6,12 ...

ANIM_START
ID            pickaxe-swing
TARGET        id weapon.tool.pickaxe-v1
DURATION      400
EASE          token ease-out
LOOP          infinite
PHASE         windup
ROTATE        base 0 peak -35
PHASE         strike
ROTATE        base -35 peak 60
ANIM_END

CONSTRAINT    DETERMINISTIC true
QA            INVARIANT shadows-match-blueprint
QA            INVARIANT pose-lockstep
QA            INVARIANT digest-stable
SILH_END
```

Directive semantics:

| Directive | Meaning |
|---|---|
| `GRID w h d` | The integer lattice the three shadows are defined on. Must match the forge `voxelPacket` dimensions (or be projectable onto them without scaling drift). |
| `SNAP integer` | All contour vertices and projected shadows are integer cells. |
| `TOLERANCE front N side N top N` | Per-view maximum Hamming distance (count of disagreeing cells) for a PASS. **Hashed.** `front 0` = exact, because the front shadow is the mould. |
| `VIEW front\|side\|top` + `CONTOUR x,y …` | A closed polygon outline per wall, filled deterministically by `fillShapeWithEvenOddWinding` into a binary mask. |
| `ANIM_START … ANIM_END` | Optional. Parsed verbatim by `blueprintParser.ts`. Drives the deterministic pose transform `M(t)`. |
| `CONSTRAINT DETERMINISTIC true` | Asserts the blueprint and its consumers stay in the no-random covenant. |
| `QA INVARIANT …` | Named invariants the gate must report on. |

# 7. SilhouetteBlueprint IR + Digest

```ts
interface SilhouetteBlueprint {
  contract: "PB-SILH-BLUEPRINT-v1";
  schemaVersion: "0.1.0";
  id: string;
  source: string | null;
  grid: { w: number; h: number; d: number };
  snap: "integer";
  tolerance: { front: number; side: number; top: number };
  views: {
    front: { contour: [number, number][]; maskDigest: string };
    side:  { contour: [number, number][]; maskDigest: string };
    top:   { contour: [number, number][]; maskDigest: string };
  };
  animation: AnimationBlueprintV1 | null;   // from blueprintParser.ts
  digest: string;                            // sha256(canonicalStringify(blueprint_without_digest))
}
```

Digest discipline is identical to `SketchArtifact`: `canonicalStringify` (canonical key order), `generatedAt` dropped, `digest` field excluded before hashing. Two identical `.silh` files produce one digest on every machine.

# 8. Three-View Projection (the shadows)

Pure integer set operations over `voxelPacket.voxels`:

| Shadow | Definition |
|---|---|
| front | `{ (x, y) : ∃ voxel at (x, y, *) }` — collapse z |
| side  | `{ (z, y) : ∃ voxel at (*, y, z) }` — collapse x |
| top   | `{ (x, z) : ∃ voxel at (x, *, z) }` — collapse y |

`silhouette-projection.js` exposes `projectVoxelShadows(packet) -> { front, side, top }` (each a `Set` of packed integer keys) and `transformVoxels(packet, M) -> packet'` for animated poses. A view PASSES when `hamming(voxelShadow, blueprintMask) <= tolerance[view]`.

# 9. Animation Verification

For each sampled phase `t` derived deterministically from the `ANIM` easing curve:

1. Compute the rigid transform `M(t)` from the active `PHASE` directives (e.g. `ROTATE` about the declared pivot). Sampling is fixed and integer-snapped — no wall clock.
2. `voxelShadow(t) = projectVoxelShadows(transformVoxels(packet, M(t)))`.
3. `expectedShadow(t) = project(M(t) · blueprintMask)` — the **same** `M(t)` applied to the sealed shadow.
4. PASS iff `hamming(voxelShadow(t), expectedShadow(t)) <= tolerance[view]` for all three views.

Plus rigid invariants across all phases (cheap guards against torn motion):

- **Count conservation:** voxel count under rigid motion is constant within tolerance.
- **Connectivity:** exactly one connected component (no shards fly off mid-swing).

# 10. Mould Wiring

The forge already accepts a silhouette constraint (`sketchToSilhouette` / `applyConstructionLines` in `item-foundry.js`). The mould feeds the blueprint's **front filled mask** as that constraint so the pour cannot spill past the front shadow. For v1 the front view is the load-bearing mould; side/top remain inspector-only because front-to-back depth comes from the existing `VolumeLiftAMP` profiles. (A later phase may add side/top moulding once profile authoring is blueprint-driven.)

# 11. Bytecode IR Design

No new persisted bytecode family. Blocking failures use existing `PB-ERR-v1` categories; passes emit a `PB-XP-v1` vaccine, exactly as the Craft Gate does today.

| Failure | Category | Module | Notes |
|---|---|---|---|
| shadow spills past front contour (mould breach) | `STATE` | `IMMUNE` | invariant violation; cite view + cell delta |
| side/top shadow off-tolerance | `STATE` | `IMMUNE` | report `hamming` vs `tolerance` |
| blueprint digest unstable / re-seal mismatch | `STATE` | `IMMUNE` | sealed-in-glass breach |
| animated pose not in lockstep | `STATE` | `IMMUNE` | cite phase `t`, view |
| voxel count not conserved / silhouette torn | `STATE` | `IMMUNE` | rigid-invariant breach |
| malformed `.silh` directive / contour | `VALUE` (or `SCHEMA` if encoder supports) | `SCHEMA`/`IMMUNE` | parser-level |
| `GRID` mismatch vs `voxelPacket` dims | `COORD` or `RANGE` | `COORD` | dimension drift |

If Gemini needs dedicated `SILH`/`LATTICE` encoder constants, escalate to Codex before adding them.

# 12. Feature Overview / Files

| File | Owner | Purpose |
|---|---|---|
| `codex/core/pixelbrain/silhouette-blueprint.js` | Gemini under Codex schema | `parseSilhouetteBlueprint(text)` -> IR + digest; reuses `canonicalStringify` + `blueprintParser`. |
| `codex/core/pixelbrain/silhouette-projection.js` | Gemini | `projectVoxelShadows`, `transformVoxels`, `hamming`. Pure. |
| `codex/core/pixelbrain/silhouette-scan.js` | Gemini | PNG(s) -> `.silh` form block. Reuses `generateSilhouetteFromImage` / `extractEdgePoints`. |
| `codex/core/pixelbrain/forge-craft-gate.js` (extend) | Gemini | Add `silhouetteBlueprint` audit (mould + inspector + animation). |
| `scripts/pixelbrain-silhouette-scan.mjs` | Gemini | Scanner CLI (`--front/--side/--top/--id/--out`). |
| `scripts/pixelbrain-forge-gate.mjs` (extend) | Gemini | Add `--blueprint x.silh`. |
| `SCHEMA_CONTRACT.md` (register) | Codex | `PB-SILH-BLUEPRINT-v1` + the `.silh` grammar law + gate-contract extension. |
| `src/lib/pixelbrain.adapter.js` (extend) | Codex seam | Re-export a normalized blueprint-gate runner for UI. |
| `src/pages/PixelBrain/components/ForgeGatePanel.jsx` (extend) | Claude/UI | Load a `.silh`, render per-view + per-phase shadow PASS/FAIL chips. |
| `tests/core/pixelbrain/silhouette-*.test.js` | Gemini + QA | Unit, golden, mutation-negative. |

# 13. Implementation Phases

| Phase | Deliverable | Acceptance |
|---|---|---|
| 0 | `silhouette-projection.js` + `silhouette-blueprint.js` (parser, digest) | Known voxel -> known shadows; `.silh` round-trips; digest stable across runs. |
| 1 | `silhouette-scan.js` + scanner CLI | A reference PNG seals into a deterministic `.silh`; re-scan -> identical digest. |
| 2 | Gate `silhouetteBlueprint` audit (rest pose, 3 views, mould check) | Voidmetal pickaxe + sealed `.silh` -> PASS; spilled/missing/wrong shadow -> PB-ERR. |
| 3 | Animation verification (lockstep + rigid invariants) | Swing blueprint passes; a torn or out-of-lockstep pose -> PB-ERR at the offending phase. |
| 4 | Adapter + `/pixelbrain` UI surface | Per-view and per-phase verdict chips render; no direct codex import in UI. |
| 5 | Mutation-negative suite | Every malformed case in §14 fails with PB-ERR evidence. |

# 14. QA Requirements (mutation-negative)

- Valid `specs/voidmetal-pickaxe.v1.json` + sealed `.silh` passes.
- Front shadow spilling one cell past the contour fails (mould breach, exact `front 0`).
- Missing side mass / wrong top footprint fails beyond tolerance; within tolerance passes.
- Re-scanning the same PNG yields an identical digest; a one-pixel reference change yields a different digest.
- Malformed `.silh` (bad `CONTOUR`, unknown directive, missing `VIEW`) fails at parse.
- `GRID` dimensions disagreeing with the `voxelPacket` fail.
- A swing that **tears the silhouette** (pose shadow out of lockstep) fails at the offending phase `t`.
- Voxel count not conserved under rotation, or a disconnected shard mid-swing, fails the rigid invariants.
- Off-tolerance by exactly one cell on side/top fails; exactly at tolerance passes.

# 15. Success Criteria

The voidmetal pickaxe, forged from its current spec and moulded by a sealed `.silh`, casts front/side/top shadows that match the blueprint within the hashed tolerance — at rest and across the full swing — and the gate emits a `PB-XP-v1` vaccine. Any intentional corruption (spilled mould, wrong view, torn motion, unstable seal) fails with `PB-ERR-v1` evidence naming the view and phase. The `.silh` is human-readable, hand-authorable, diffable, and digest-stable. No PNG or shader is ever read as authority; no `Math.random`/`Date.now`/network enters the path.

# 16. Handoffs

- **Codex** — Register `PB-SILH-BLUEPRINT-v1` in `SCHEMA_CONTRACT.md`, ratify the `.silh` grammar as law, and extend the Craft Gate contract to include the silhouette/animation audits. Owns the schema half exactly as it did for `PB-VOXEL-ITEM-v1`.
- **Gemini** — Implement the parser, projection, scanner, gate audit, and CLIs as pure functions; own the core tests and mutation-negative suite. Map blocking failures to existing `PB-ERR-v1` categories; escalate to Codex before adding any new encoder constant.
- **Claude/UI** — After the core CLI/contract lands, surface the blueprint flow in `/pixelbrain` (load `.silh`, per-view + per-phase verdict chips) through the adapter seam, with no direct codex import.
