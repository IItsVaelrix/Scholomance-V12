# PDR: PixelBrain Volume Container + Blender Bridge

**Bytecode Search Code:** `SCHOL-ENC-PDR-PIXELBRAIN-VOLUME-BLENDER-v1`
**Date:** 2026-06-15
**Status:** Proposed
**Classification:** PixelBrain + Schema Contract + External Asset Bridge + Adapter Layer
**Priority:** High
**Related PDRs:**
- `2026-06-12-foundry-aseprite-bridge-pdr.md` — pattern this PDR mirrors
- `2026-06-12-pixelbrain-character-creator-pdr.md` — primary consumer (`CHARACTER-VOLUME-SPEC-v1` follow-up)
- `2026-06-12-pixelbrain-sdf-and-coherent-noise-integration-pdr.md` — `PB-SDF-v1` / `PB-NOISE-v1` are the new volume's generation-time descriptors
- `PIR-20260613-SCHOLOTIME-TYPOGRAPHY-MOVIES.md` — the deferred Three.js path becomes a volume consumer

---

## Owner(s)

- **Codex (architecture / schemas):** Defines the `PB-VOLUME-v1` packet contract, the `foundry-blender-bridge.js` public surface, the `PB-VOLUME-v1` entry in `SCHEMA_CONTRACT.md`, and the `src/lib/blender.adapter.js` re-export contract. Owns the `PB-VOLUME-v1` schema test and the `assertPixelBrainVolumeContainer` guard.
- **Gemini (backend impl / tests / encyclopedia):** Implements `codex/core/pixelbrain/pixelbrain-volume-container.js`, the `foundry-blender-bridge.js` module, the `blender-binary-codec.js` codec, the glTF codec, the service-layer `codex/services/adapters/blender-bridge.adapter.js`, the `scripts/blender/pb_import.py` and `pb_export.py` companion scripts, the `tests/core/pixelbrain/foundry-blender-bridge.test.js` + `pixelbrain-volume-container.test.js` files, and the `codex/core/immunity/` rule that rejects non-integer z-coords.
- **Claude (UI surface):** Adds the import/export affordance to the existing `src/pages/PixelBrain/PixelBrainPage.jsx` once §8 phase 3 is reachable, the loading-surface for Blender import (in-world scroll unfurl, not a modal), and the visual baselines in `tests/visual/`.
- **Escalation owner (cross-domain conflicts):** Angel. Specifically: schema sovereignty questions, "what counts as canonical" for the volume, and any change to material registry authority.

## Context (seed — not the Executive Summary)

PixelBrain's canonical container (`PixelBrainAssetPacket`) is a 2D integer lattice with a vestigial `z` that nothing honors. The `volume-amp.js` and `shield-volume-amp.js` AMPs fake 3D shading by mutating slot/colors. A real 3D voxel container is the natural generalization, and Blender is the artist-facing 3D editor that needs a round-trip bridge analogous to the existing Aseprite bridge.

## Target Integration Area

- `codex/core/pixelbrain/` — new `pixelbrain-volume-container.js`, new `foundry-blender-bridge.js`, new `blender-binary-codec.js`, new `gltf-codec.js`; small additions to `pixelbrain-asset-packet.js` (projection helpers) and `material-registry.js` (volume-3D material profiles).
- `codex/services/adapters/` — new `blender-bridge.adapter.js` service-layer adapter (mirrors `codex/services/adapters/datamuse.adapter.js` shape).
- `src/lib/` — new `blender.adapter.js` (UI-side re-export), small additions to `src/lib/pixelbrain.adapter.js` to forward the new exports.
- `scripts/blender/` — new directory with `pb_import.py`, `pb_export.py`, and a `README.md` (mirrors `scripts/aseprite/`).
- `tests/core/pixelbrain/` — `pixelbrain-volume-container.test.js`, `foundry-blender-bridge.test.js`, `gltf-codec.test.js`, `blender-binary-codec.test.js`.
- `tests/qa/pixelbrain/` — at least one end-to-end test that emits a known volume, exports to glTF, re-imports, and asserts lattice equality (determinism).
- `tests/visual/` — baselines for the new import/export affordance in `PixelBrainPage.jsx` (Claude).
- `codex/core/immunity/` — new `volume-3d` rule group.
- `docs/scholomance-encyclopedia/Scholomance LAW/SCHEMA_CONTRACT.md` — add `PB-VOLUME-v1` to the schema registry.
- `codex/core/immunity/registry.js` (or equivalent) — register the new immunity rule.
- `package.json` — add `vitest` config entry if new test path patterns are required (no new runtime deps in v1; glTF codec is hand-rolled JSON+GLB only).

## Core Concept

PixelBrain becomes three-dimensional. A `PixelBrainVolumeContainer` (`PB-VOLUME-v1`) is the new canonical packet. Every existing `PixelBrainAssetPacket` is provably a `PB-VOLUME-v1` with `volume.depth = 1` and `lattice.cells` projected onto `z = 0`. SDF and noise descriptors (`PB-SDF-v1`, `PB-NOISE-v1` from the 2026-06-12 PDR) become true 3D primitives — sphere, box, capsule, cylinder — that quantize to integer voxels and never store floats in the canonical lattice. The `foundry-blender-bridge.js` round-trips a volume to Blender via glTF 2.0 (canonical interchange, schema-validated, no Blender runtime required for tests) and an optional `.blend` binary codec (mirrors the Aseprite Binary Codec role). On import, every float gets re-quantized to the volume's `cellSize` — and if a cell cannot be represented, a `PB-ERR-v1-VOLUME-3D-CR-COORD-*` loud failure fires. The artist owns presentation; the lattice owns truth.

## Implementation Philosophy

Small, composable, deterministic. Every byte the bridge emits is reproducible from `(volume, targetFormat)`. The bridge is a seam: it does not touch the lattice, it does not invent geometry, and it does not mutate the source packet on round-trip. The volume is a generalization, not a replacement — `PixelBrainAssetPacket` consumers keep working, with the new module emitting packets they already understand when the caller asks for a 2D slice.

---

## Required Sections

### 1. Executive Summary

PixelBrain's canonical 2D asset packet is generalized to a 3D voxel container (`PB-VOLUME-v1`) with deterministic, integer-cell semantics. Every existing `PixelBrainAssetPacket` becomes a 2D slice of the new container, preserving all in-flight work (`derivePixelBrainRenderPacket`, the Foundry, the Item Foundry, the character creator). A new `foundry-blender-bridge.js` round-trips volumes to and from Blender through glTF 2.0 (canonical, schema-validated) with an optional native `.blend` codec — mirroring the Foundry Aseprite bridge's structure and Aseprite Binary Codec's role. `PB-SDF-v1` and `PB-NOISE-v1` are extended with 3D primitives (sphere, box, capsule, cylinder) that quantize to integer voxels. The blast radius is contained: no existing public API changes; the only additive change to `pixelbrain-asset-packet.js` is a 2D-slice projection helper, and the immunity system gains one rule group that rejects non-integer z. Status is **Proposed** — no code lands until phases 1–2 of §8 are green.

### 2. Out of Scope / Non-Goals

- **Replacing** `PixelBrainAssetPacket` or any of its existing producers/consumers.
- **Storing floats in the canonical lattice.** SDFs, noise, and Blender-imported geometry quantize to integer cells.
- **Implementing a Three.js / WebGL volume renderer in this PDR.** The volume's role in this PDR is *data*; the deferred Three.js path (`PIR-20260613-SCHOLOTIME-TYPOGRAPHY-MOVIES.md` line 58) becomes a downstream consumer.
- **Live Blender RPC.** The bridge is file-based (`glb` / `blend`). A live socket layer is a separate PDR if ever needed.
- **Material editor features beyond what already lives in `codex/core/pixelbrain/material-registry.js`.** A volume uses the same registry; no new authoring UI.
- **Animating the volume.** The cell wall is static; animation lives in `PB-ANIM-v1` (separate PDR per AOM §3).
- **Multi-resolution (mip) volumes.** v1 is a single-resolution lattice. Mip-levels are a follow-up.
- **Runtime PBR shading.** Lightfield is a deterministic descriptor for re-projection only; no real-time lighting engine in v1.
- **Requiring Blender installed for CI.** Non-goal #2 of the Aseprite bridge PDR is inherited verbatim.
- **Replacing the existing `volume-amp.js` and `shield-volume-amp.js`.** They keep working on 2D slices; they are presentation, not geometry authority.

### 3. Spec Sheet

#### 3.1 Functional spec

| ID | Requirement | Acceptance criterion |
|---|---|---|
| F-1 | `PB-VOLUME-v1` packet round-trips losslessly through `JSON.stringify → JSON.parse`. | `JSON.stringify(v) === JSON.stringify(JSON.parse(JSON.stringify(v)))` for 100 random volumes. |
| F-2 | `deriveVolumeSlice(volume, axis='z', index=0)` produces a valid `PixelBrainAssetPacket` whose lattice matches the volume's `axis=index` slice. | `assertPixelBrainAssetPacket(slice)` passes; lattice equality `assertVolumeSliceEqual(volume, slice)`. |
| F-3 | `forgeVolume(spec)` is deterministic for identical input + seed. | Two back-to-back calls produce byte-identical packets. |
| F-4 | `exportVolumeToGltf(volume)` emits glTF 2.0 JSON + optional binary buffer; `importGltfToVolume(payload)` round-trips with deterministic re-quantization. | Golden file in `tests/core/pixelbrain/golden/volume-cube.gltf` matches byte-for-byte; round-trip `fingerprint` matches. |
| F-5 | `exportVolumeToBlenderBinary(volume)` and `importBlenderBinaryToVolume(buffer)` are deterministic. | Golden `.blend` round-trip with codec version `BLENDER-CODEC-v1`. |
| F-6 | `forgeVolume` from a 3D `CHARACTER-VOLUME-SPEC-v1` (consumer PDR, not this one) emits a 4-direction slice set identical to the character creator's 2D output. | Slice at `z = 0` matches `forgeCharacter(spec2d)` for the corresponding spec. |
| F-7 | Blender import rejects non-quantizable geometry with a `PB-ERR-v1-VOLUME-3D-CR-COORD-0101` loud failure (no silent snap). | Test imports a buffer with sub-cell offsets → expect loud failure. |
| F-8 | Material colors on import must match the registry; any non-registry color is rejected as `PB-ERR-v1-VOLUME-3D-CR-MATERIAL-0101`. | Test imports a glTF with `#123456` not in registry → expect loud failure. |
| F-9 | Volume container is immutable (`Object.freeze`) on creation. | Mutating any field throws in strict mode. |
| F-10 | `volume.depth = 1` packets pass `assertPixelBrainAssetPacket` via the projection helper. | Backward-compat test in `pixelbrain-volume-container.test.js`. |

#### 3.2 Non-functional spec

- **Determinism:** Same `(spec, seed, target)` → same bytes, every time, on every machine. No `Date.now()`, no `Math.random()`, no environment reads.
- **Latency:** `forgeVolume` for a 16³ voxel volume with 5 SDF primitives completes in < 50 ms on a developer laptop (Apple M-series, x86_64 baseline). glTF encode for 32³ ≤ 250 ms.
- **Memory:** A 64³ volume with 3 bytes/cell metadata + palette stays under 4 MB heap at rest.
- **CPU:** glTF decode does not allocate beyond the input size + 1× cell array.
- **Accessibility (UI):** Claude's import/export affordance in `PixelBrainPage.jsx` must use the scroll-unfurl pattern (AGENTS.md anti-pattern: no native modal for non-destructive actions), expose `aria-label` on the file input, and announce progress via the in-world glyph surface.
- **Test coverage:** Lines and branches of `pixelbrain-volume-container.js` ≥ 95%; `foundry-blender-bridge.js` ≥ 90%. Phase 1 must be ≥ 80% before phase 2 starts.
- **Security:** No `eval`, no `new Function`, no shell-out in the JS side. The Python companion script is read/write only to the user-supplied file path; no network.
- **Backward compatibility:** Zero breaking change to `PixelBrainAssetPacket` consumers. The 2D projection helper is additive.

#### 3.3 Contracts

```ts
// PB-VOLUME-v1
interface PixelBrainVolumeContainer {
  kind: 'pixelbrain.volume.v1';
  id: string;                   // stableId('pbvol', seed)
  schemaVersion: 1;
  source: { kind: string; id: string | null; label: string | null; importedAt: string | null };
  volume: { width: number; height: number; depth: number; cellSize: number };
  lattice: {
    cells: ReadonlyArray<{
      x: number; y: number; z: number;          // integers
      color: string;                             // hex, registry-resolved
      emphasis: number;                          // integer in [0, 4]
      partId: string | null;
      normal?: { x: number; y: number; z: number };  // quantized to int8
      ao?: number;                                  // integer in [0, 7]
    }>;
  };
  layers: ReadonlyArray<{
    id: string;
    kind: 'structure' | 'energy' | 'focal' | 'shading' | 'glow' | 'reference' | 'final';
    zRange: { min: number; max: number };
    semantic: string;
  }>;
  materials: { perPartId: Record<string, string> };  // partId → materialId
  lightfield: { keyDir: { x: number; y: number; z: number }; ambient: number; fillDir: { x: number; y: number; z: number } };
  sdfDescriptors: ReadonlyArray<PB_SDF_v1>;
  noiseDescriptors: ReadonlyArray<PB_NOISE_v1>;
  palette: {
    sourcePalette: ReadonlyArray<{ key: string; colors: ReadonlyArray<string>; byteMap: Record<string, number> }>;
    materialPalette: ReadonlyArray<{ key: string; colors: ReadonlyArray<string> }>;
    authority: string;
  };
  provenance: { createdBy: string; operations: ReadonlyArray<unknown> };
  metadata: { tags: ReadonlyArray<string>; notes: ReadonlyArray<string>; compatibility: Record<string, unknown> };
}
```

Public surface of `pixelbrain-volume-container.js`:

```text
PB_VOLUME_KIND                 = 'pixelbrain.volume.v1'
forgeVolume(spec, options?)     -> PixelBrainVolumeContainer
normalizePixelBrainVolume(input)-> PixelBrainVolumeContainer
assertPixelBrainVolumeContainer(v) -> boolean   // throws on invalid
deriveVolumeSlice(v, axis?, index?) -> PixelBrainAssetPacket
quantizePointToLattice(point, volume) -> { x, y, z } | null
```

Public surface of `foundry-blender-bridge.js`:

```text
FOUNDRY_BLENDER_BRIDGE_VERSION = '0.1.0'
exportVolumeToGltf(volume)               -> { json: GltfDocument; bin?: Uint8Array }
importGltfToVolume(gltf, options?)       -> PixelBrainVolumeContainer
exportVolumeToBlenderBinary(volume)      -> Uint8Array   // .blend
importBlenderBinaryToVolume(buffer)      -> PixelBrainVolumeContainer
```

Public surface of `codex/services/adapters/blender-bridge.adapter.js`:

```text
{ bridge, version, capabilities: ['gltf:2.0', 'blend:v1'], endianness: 'little' }
ensureBlenderBridgeReady() -> { ok: boolean; reason?: string }
normalizeBlenderImportRequest(req) -> GltfDocument | { error: { code, message } }
```

Public surface of `src/lib/blender.adapter.js` (UI-side re-export only):

```text
export { exportVolumeToGltf, importGltfToVolume } from '...'
export { exportVolumeToBlenderBinary, importBlenderBinaryToVolume } from '...'
export { PB_VOLUME_KIND } from '...'
```

#### 3.4 Deferred to follow-up PDRs

- **`CHARACTER-VOLUME-SPEC-v1`** — the 3D character spec; consumes the volume container; emits 4-direction slices equal to the 2D character creator.
- **`VOLUME-ANIM-v1`** — frame-level volume containers for animation; this PDR's container is single-frame.
- **`VOLUME-MIP-v1`** — multi-resolution volumes for streaming/LOD.
- **`PB-VOLUME-SHADER-v1`** — GLSL fragment shader for volume slicing/ray-march, exported to Phaser/Godot like `PB-SHADER-v1`.
- **Live Blender RPC** — file-based exchange is enough for v1; live socket is a separate PDR.

### 4. Change Classification

- **Architectural** — adds a new top-level packet contract (`PB-VOLUME-v1`) to the schema registry and a new external asset bridge family. Justification: this is the generalization the entire stack has been circling.
- **Structural** — new files in `codex/core/pixelbrain/`, `codex/services/adapters/`, `src/lib/`, `scripts/blender/`, `tests/`. No reshuffling of existing modules. Justification: mirror the Aseprite bridge's directory shape so future maintainers recognize it instantly.
- **Behavioral** — one addition to `codex/core/immunity/` rejects non-integer `z` in any coordinate. Justification: a 2D coordinate sneaking in with `z = 0.5` is a silent drift bug; the immunity rule makes it loud.
- **Cosmetic** — Claude's import/export affordance in `PixelBrainPage.jsx` is in-world scroll-unfurl, no native modal. Justification: AGENTS.md anti-pattern forbids modals for non-destructive actions.

### 5. Assumptions and Unknowns

**Assumptions:**

- A-1: The volume container is consumed as data, not rendered in v1. Downstream renderer PDRs may pick it up.
- A-2: glTF 2.0 is the right canonical interchange. It is open, versioned, schema-validatable, and well-understood by every 3D tool. Mirrors Aseprite JSON's role for 2D.
- A-3: The vestigial `z` field in `normalizePixelBrainCoordinate` (`pixelbrain-asset-packet.js:60`) was always intended for this. A-3 is the *why* of A-1.
- A-4: The existing 32-color per-part budget from the character creator PDR applies per part, not per volume. A volume may use up to 32 colors per part profile.
- A-5: Blender's `.blend` file format is stable enough for a hand-rolled read/write codec for the subset we need (mesh + vertex colors + per-face material index). The codec only supports this subset; richer features fall back to glTF.
- A-6: The Aseprite bridge's structure (`foundry-aseprite-bridge.js` + `aseprite-binary-codec.js` + `scripts/aseprite/*` + UI adapter) is the canonical bridge pattern. The Blender bridge follows it 1:1.

**Unknowns:**

- U-1: Should the volume's lattice be a flat array, a `Map<string, Cell>`, or a chunked structure? Decision deferred to phase 1; flat array wins for < 64³ on perf grounds, but chunking is on the table. **Escalated only if perf data contradicts.** *(No escalation needed yet.)*
- U-2: How do we represent ambient occlusion (`ao`) without inventing geometry? Proposed: per-cell integer `0..7` derived from neighbor counts at forge time. **No escalation needed**; this is a generation-time heuristic, not geometry invention.
- U-3: How should the bridge handle Blender's *non-quantizable* vertex positions (sub-cell floats)? The current answer is "reject loudly" (F-7). If artists need sub-cell geometry, that becomes a follow-up. **Escalate only** if a use case materializes that contradicts this.

### 6. Open Questions / Escalations

```
ESCALATION:
- Conflict: Schema sovereignty on whether PB-VOLUME-v1 is a sibling of pixelbrain.asset.v1 or a strict superset.
- My domain says (Codex): PB-VOLUME-v1 is the new canonical, and pixelbrain.asset.v1 is a 2D projection (z=0 slice) of it. This unifies the model and is more honest about the lattice.
- Other domain may say: Two packets is two schemas, which doubles the test matrix and could create a parallel-authority smell.
- Option A: Strict superset; PB-VOLUME-v1 is canonical, deriveAssetFromVolume is the only public way to get a 2D packet, the 2D packet is rebuilt on demand, never cached as a sibling. (Pro: one truth. Con: any consumer that mutates a 2D packet is in for a surprise.)
- Option B: Two siblings with explicit cross-version helper. PB-VOLUME-v1 and pixelbrain.asset.v1 are peers; assertVolumeCompatibleWithAsset(volume, asset) validates correspondence. (Pro: minimal disruption. Con: a parallel authority.)
- Recommendation: Option A. The "lattice is the asset" law (AOM §1) and the "shaders never invent geometry" law are easier to defend with one truth.
- Needs: Angel's decision. Until decided, phase 1 implements the packet in a way that supports both options at the seam (a `projectionMode` argument to `deriveVolumeSlice`).
```

```
ESCALATION:
- Conflict: The 2D character creator PDR is explicitly non-goal "3D character models." This PDR's volume + the follow-up CHARACTER-VOLUME-SPEC-v1 will re-open that. Is that acceptable?
- My domain says (Codex): The 2D path stays untouched; CHARACTER-VOLUME-SPEC-v1 is a new spec class with its own PDR, and the 4-direction slice set is a strict superset of the 2D output.
- Other domain may say (Gemini owning the character creator): "We just shipped the 2D path; please don't change scope mid-flight."
- Option A: Land this PDR, then file CHARACTER-VOLUME-SPEC-v1 as a separate proposal. (Pro: clean separation. Con: a small lag for users who want 3D characters.)
- Option B: Bundle CHARACTER-VOLUME-SPEC-v1 into this PDR. (Pro: ships faster. Con: scope creep.)
- Recommendation: Option A. Each PDR ships clean.
- Needs: Angel's decision (light touch — this is mostly a sequencing question).
```

### 7. Architecture / File Map

```
codex/core/pixelbrain/
  pixelbrain-volume-container.js     NEW   Codex (schema) + Gemini (impl)   — packet + assertions + slice projection
  pixelbrain-asset-packet.js         EDIT  Gemini                            — additive: deriveAssetFromVolume(volume)
  foundry-blender-bridge.js          NEW   Gemini                            — glTF/GLB + .blend round-trip
  gltf-codec.js                      NEW   Gemini                            — minimal glTF 2.0 JSON+GLB writer/reader
  blender-binary-codec.js            NEW   Gemini                            — .blend mesh+vertex-color codec (v1 subset only)
  material-registry.js               EDIT  Gemini                            — additive: 3D-friendly material profiles
  extension-registry.js              EDIT  Gemini                            — optional: new HOOK_PROPERTY_TO_TYPE 'onVolumeForge'

codex/core/immunity/
  registry.js (or equivalent)        EDIT  Gemini                            — register volume-3d rule group
  rules/volume-3d.js                 NEW   Gemini                            — reject non-integer z, non-registry color

codex/services/adapters/
  blender-bridge.adapter.js          NEW   Gemini                            — service-layer bridge guard

src/lib/
  blender.adapter.js                 NEW   Codex                              — UI-side re-export only
  pixelbrain.adapter.js              EDIT  Codex                              — forward new exports

scripts/blender/
  README.md                          NEW   Gemini
  pb_import.py                       NEW   Gemini                            — runs inside Blender
  pb_export.py                       NEW   Gemini                            — runs inside Blender

tests/
  core/pixelbrain/pixelbrain-volume-container.test.js   NEW   Gemini
  core/pixelbrain/foundry-blender-bridge.test.js         NEW   Gemini
  core/pixelbrain/gltf-codec.test.js                    NEW   Gemini
  core/pixelbrain/blender-binary-codec.test.js          NEW   Gemini
  core/pixelbrain/golden/volume-cube.gltf               NEW   Gemini  (golden file, deterministic)
  core/pixelbrain/golden/volume-cube.glb                NEW   Gemini
  core/pixelbrain/golden/volume-cube.blend              NEW   Gemini
  qa/pixelbrain/volume-blender-e2e.test.js              NEW   Gemini  (end-to-end with byte-equality)
  visual/pixelbrain-volume-import.spec.js               NEW   Claude
  visual/pixelbrain-volume-export.spec.js               NEW   Claude

docs/scholomance-encyclopedia/
  PDR-archive/2026-06-15-pixelbrain-volume-container-and-blender-bridge-pdr.md   NEW (this file)  Gemini (encyclopedia) authored at user's request
  Scholomance LAW/SCHEMA_CONTRACT.md                                  EDIT  Codex                  — register PB-VOLUME-v1
  post-implementation-reports/PIR-20260615-PIXELBRAIN-VOLUME-BLENDER.md          FUTURE  Gemini
```

Dependency graph (additions only):

```
pixelbrain-volume-container.js
  -> pixelbrain-asset-packet.js (assertPixelBrainAssetPacket)
  -> material-registry.js (resolveMaterialId)
  -> sdf-evaluator.js (PB-SDF-v1, extended for 3D)
  -> hashString, clamp01 (shared.js)
  -> bytecode-error.js (PB-ERR-v1-VOLUME-3D-*)

foundry-blender-bridge.js
  -> pixelbrain-volume-container.js
  -> gltf-codec.js
  -> blender-binary-codec.js
  -> material-registry.js (color authority on import)
  -> pixelbrain-asset-packet.js (slice projection on round-trip)

src/lib/blender.adapter.js
  -> re-exports from foundry-blender-bridge.js
  -> re-exports PB_VOLUME_KIND from pixelbrain-volume-container.js
  (UI modules import from here ONLY, per Cell Wall adapter rule)
```

### 8. Step-by-Step Implementation Plan

Each phase is independently shippable behind a feature flag.

#### Phase 1 — Volume packet + assertions (Codex-defined, Gemini-built, ~3 days)

- **Owner:** Codex (architecture + schema) → Gemini (impl + tests).
- **Time:** ~3 days.
- **Milestone:** `forgeVolume` produces a `PB-VOLUME-v1` for a 3D test spec; `assertPixelBrainVolumeContainer` guards it; `deriveVolumeSlice(volume, 'z', 0)` produces a `PixelBrainAssetPacket` whose lattice equals the source packet's lattice for any 2D input.
- **Exit criteria:**
  - `tests/core/pixelbrain/pixelbrain-volume-container.test.js` green, ≥ 95% coverage.
  - `npm run typecheck` clean for the new file.
  - `npm run lint` clean for the new file.
  - `codex/core/immunity/rules/volume-3d.js` rejects `z = 0.5` with `PB-ERR-v1-VOLUME-3D-CR-COORD-0101`.
  - Backward-compat test: every existing `tests/core/pixelbrain/*.test.js` still green (zero changes required to existing tests).
  - Feature flag `PIXELBRAIN_VOLUME_V1` defaults to `false` in production; `forgeVolume` is not yet called from any page.
- **Rollout:** Shadow mode only. Volume packets are produced by the new code path but no UI reads them. Existing `PixelBrainAssetPacket` consumers are unaffected.

#### Phase 2 — glTF codec + bridge round-trip (~3 days)

- **Owner:** Gemini.
- **Time:** ~3 days.
- **Milestone:** `exportVolumeToGltf` + `importGltfToVolume` round-trip a cube with byte-equal lattice.
- **Exit criteria:**
  - Golden file `tests/core/pixelbrain/golden/volume-cube.gltf` byte-stable across runs and machines.
  - Round-trip fingerprint equality.
  - Reject non-quantizable geometry with the loud failure from F-7.
  - Reject non-registry colors with the loud failure from F-8.
  - `codex/services/adapters/blender-bridge.adapter.js` exposes the contract; `ensureBlenderBridgeReady` returns `{ ok: true }` in CI.
  - Feature flag `PIXELBRAIN_BLENDER_BRIDGE_V1` defaults to `false`.
- **Rollout:** Shadow mode. `src/lib/blender.adapter.js` exists and re-exports, but the UI affordance is not yet wired (Claude phase 3 is the visible rollout).

#### Phase 3 — UI affordance + visual baselines (~1.5 days)

- **Owner:** Claude.
- **Time:** ~1.5 days.
- **Milestone:** "Export to glTF" and "Import from glTF" actions on `PixelBrainPage.jsx`; visual baselines in `tests/visual/`.
- **Exit criteria:**
  - The action uses the scroll-unfurl pattern, not a native modal.
  - `aria-label="Export volume to glTF"` and `aria-label="Import volume from glTF"` on the file inputs.
  - `tests/visual/pixelbrain-volume-import.spec.js` and `pixelbrain-volume-export.spec.js` baselines captured and stable.
  - `npm run test:visual` green.
  - `npm run test:qa` green.
  - Reduced-motion respected on the scroll-unfurl animation.
  - Feature flag `PIXELBRAIN_VOLUME_UI_V1` defaults to `false`; rollout is gated on Angel's go.
- **Rollout:** Canary — visible only to developer role in the auth role list; expand after one week of clean telemetry.

#### Phase 4 — `.blend` codec + Python companion scripts (~2 days)

- **Owner:** Gemini.
- **Time:** ~2 days.
- **Milestone:** `exportVolumeToBlenderBinary` + `importBlenderBinaryToVolume` round-trip; `scripts/blender/pb_import.py` and `pb_export.py` work in Blender 4.2+ with documented assumptions.
- **Exit criteria:**
  - Golden `.blend` byte-stable.
  - Python script install/usage documented in `scripts/blender/README.md`.
  - The script never requires network access; it only reads/writes the user-supplied file.
  - No `os.system`, no `subprocess` with `shell=True`, no `eval`/`exec` in the Python.
  - Feature flag `PIXELBRAIN_BLENDER_NATIVE_V1` defaults to `false`.
- **Rollout:** Developer-only. Ships after phase 3 is in canary for a week.

#### Phase 5 — Rollout, monitoring, and PIR (~1 day, then 1 week of telemetry)

- **Owner:** Codex (PIR signoff) + Gemini (operational).
- **Time:** 1 day + 1 week of telemetry.
- **Milestone:** All four feature flags flipped to `true`; PIR filed.
- **Exit criteria:**
  - PIR `docs/.../post-implementation-reports/PIR-20260615-PIXELBRAIN-VOLUME-BLENDER.md` written and reviewed.
  - One week of `collab://activity` shows no `PB-ERR-v1-VOLUME-3D-*` spikes in non-developer roles.
  - Volume forge latency p95 within budget.
- **Rollout:** Full, behind the four flags all set to `true`. Rollback: any flag flipped to `false` reverts to phase 1 shadow-only state.

### 9. Code Examples for the 5–10 Most Pivotal Changes

#### 9.1 Packet creation and projection (`codex/core/pixelbrain/pixelbrain-volume-container.js`)

```js
// codex/core/pixelbrain/pixelbrain-volume-container.js
import { hashString, clamp01 } from './shared.js';
import { resolveMaterialId, SOURCE_MATERIAL } from './material-registry.js';
import { assertPixelBrainAssetPacket } from './pixelbrain-asset-packet.js';
import { createExtensionError, MODULE_IDS } from './bytecode-error.js';

export const PB_VOLUME_KIND = 'pixelbrain.volume.v1';
const DEFAULT_CELL_SIZE = 1;

function toInt(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) && Number.isInteger(n) ? n : fallback;
}

function quantizeNormal({ x = 0, y = 0, z = 0 } = {}) {
  return Object.freeze({
    x: clamp01((x + 1) / 2) * 255 | 0,
    y: clamp01((y + 1) / 2) * 255 | 0,
    z: clamp01((z + 1) / 2) * 255 | 0,
  });
}

export function quantizePointToLattice(point = {}, volume = {}) {
  const cell = Math.max(1, toInt(volume.cellSize, DEFAULT_CELL_SIZE));
  const w = toInt(volume.width, 0);
  const h = toInt(volume.height, 0);
  const d = toInt(volume.depth, 0);
  const x = toInt(point.x);
  const y = toInt(point.y);
  const z = toInt(point.z);
  if (x % cell !== 0 || y % cell !== 0 || z % cell !== 0) return null;
  if (x < 0 || y < 0 || z < 0 || x >= w || y >= h || z >= d) return null;
  return Object.freeze({ x, y, z });
}

export function normalizePixelBrainVolume(input = {}) {
  const width = toInt(input.volume?.width ?? input.canvas?.width);
  const height = toInt(input.volume?.height ?? input.canvas?.height);
  const depth = Math.max(1, toInt(input.volume?.depth ?? 1));
  const cellSize = Math.max(1, toInt(input.volume?.cellSize, DEFAULT_CELL_SIZE));
  if (width <= 0 || height <= 0) {
    throw createExtensionError(MODULE_IDS.VOLUME_3D, 'INVALID_BOUNDS', input, { width, height });
  }
  const cells = Object.freeze((input.lattice?.cells ?? input.geometry?.coordinates ?? []).map((c) => {
    const z = toInt(c.z ?? 0);
    if (z !== (c.z ?? 0)) {
      throw createExtensionError(MODULE_IDS.VOLUME_3D, 'NON_INTEGER_Z', c, { providedZ: c.z });
    }
    return Object.freeze({
      x: toInt(c.x), y: toInt(c.y), z,
      color: String(c.color || '#FFFFFF'),
      emphasis: clamp01(Number(c.emphasis) || 0) * 4 | 0,
      partId: c.partId ?? null,
      normal: c.normal ? quantizeNormal(c.normal) : undefined,
      ao: c.ao != null ? Math.max(0, Math.min(7, toInt(c.ao))) : undefined,
    });
  }));
  return Object.freeze({
    kind: PB_VOLUME_KIND,
    id: input.id ?? `pbvol_${hashString(JSON.stringify({ width, height, depth, cells })).toString(16).padStart(8, '0')}`,
    schemaVersion: 1,
    source: Object.freeze({
      kind: input.source?.kind ?? 'unknown',
      id: input.source?.id ?? null,
      label: input.source?.label ?? null,
      importedAt: input.source?.importedAt ?? null,
    }),
    volume: Object.freeze({ width, height, depth, cellSize }),
    lattice: Object.freeze({ cells }),
    layers: Object.freeze((input.layers ?? []).map((l) => Object.freeze({
      id: String(l.id),
      kind: l.kind ?? 'structure',
      zRange: Object.freeze({ min: toInt(l.zRange?.min, 0), max: toInt(l.zRange?.max, depth - 1) }),
      semantic: String(l.semantic ?? ''),
    }))),
    materials: Object.freeze({ perPartId: Object.freeze({ ...(input.materials?.perPartId ?? {}) }) }),
    lightfield: Object.freeze({
      keyDir: Object.freeze({ x: Number(input.lightfield?.keyDir?.x) || 0, y: Number(input.lightfield?.keyDir?.y) || -1, z: Number(input.lightfield?.keyDir?.z) || 0 }),
      ambient: clamp01(Number(input.lightfield?.ambient) || 0.3),
      fillDir: Object.freeze({ x: Number(input.lightfield?.fillDir?.x) || 0, y: Number(input.lightfield?.fillDir?.y) || 0, z: Number(input.lightfield?.fillDir?.z) || 0 }),
    }),
    sdfDescriptors: Object.freeze(input.sdfDescriptors ?? []),
    noiseDescriptors: Object.freeze(input.noiseDescriptors ?? []),
    palette: Object.freeze(input.palette ?? { sourcePalette: [], materialPalette: [], authority: 'pixelbrain.volume.v1' }),
    provenance: Object.freeze({ createdBy: input.provenance?.createdBy ?? 'pixelbrain.volume', operations: Object.freeze([...(input.provenance?.operations ?? [])]) }),
    metadata: Object.freeze({
      tags: Object.freeze([...(input.metadata?.tags ?? [])]),
      notes: Object.freeze([...(input.metadata?.notes ?? [])]),
      compatibility: Object.freeze({ ...(input.metadata?.compatibility ?? {}) }),
    }),
  });
}

export function forgeVolume(spec = {}, options = {}) {
  const seed = options.seed ?? spec.seed ?? 1;
  const w = Math.max(1, toInt(spec.volume?.width, 16));
  const h = Math.max(1, toInt(spec.volume?.height, 16));
  const d = Math.max(1, toInt(spec.volume?.depth, 16));
  const material = resolveMaterialId(spec.material?.id ?? SOURCE_MATERIAL);
  // Deterministic voxel fill: a single deterministic seed → FNV-1a hash chain.
  const cells = [];
  for (let z = 0; z < d; z++) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const v = hashString(`${seed}|${x}|${y}|${z}|${material}`) % 256;
        if (v < 192) continue;
        cells.push({ x, y, z, color: '#FFFFFF', emphasis: 1, partId: 'core' });
      }
    }
  }
  return normalizePixelBrainVolume({
    source: { kind: 'forge', id: spec.id ?? null, label: spec.label ?? null, importedAt: null },
    volume: { width: w, height: h, depth: d, cellSize: 1 },
    lattice: { cells },
    materials: { perPartId: { core: material } },
    metadata: { tags: ['forge', 'deterministic'], notes: [`seed=${seed}`], compatibility: {} },
  });
}

export function assertPixelBrainVolumeContainer(v) {
  if (!v || v.kind !== PB_VOLUME_KIND || v.schemaVersion !== 1) {
    throw createExtensionError(MODULE_IDS.VOLUME_3D, 'INVALID_PACKET', v, { kind: v?.kind, schemaVersion: v?.schemaVersion });
  }
  return true;
}

export function deriveVolumeSlice(volume, axis = 'z', index = 0) {
  assertPixelBrainVolumeContainer(volume);
  if (axis !== 'z') {
    throw createExtensionError(MODULE_IDS.VOLUME_3D, 'UNSUPPORTED_SLICE_AXIS', axis, { axis });
  }
  const sliceCells = volume.lattice.cells
    .filter((c) => c.z === index)
    .map(({ z, ...rest }) => Object.freeze({ ...rest, z: 0 }));
  return Object.freeze({
    kind: 'pixelbrain.asset.v1',
    id: `pbslice_${volume.id}_${axis}${index}`,
    schemaVersion: 1,
    canvas: Object.freeze({ width: volume.volume.width, height: volume.volume.height, cellSize: volume.volume.cellSize, gridSize: volume.volume.cellSize, transparent: true, background: '#00000000' }),
    geometry: Object.freeze({
      mode: 'coordinates',
      bounds: Object.freeze({}),
      coordinates: Object.freeze(sliceCells),
      cells: Object.freeze([]),
    }),
    palette: volume.palette,
    material: Object.freeze({ id: 'slice', variant: null, registryVersion: 1, parameters: Object.freeze({}) }),
    chromatic: Object.freeze({ transformId: 'slice', diagnostics: Object.freeze([]) }),
    photonic: Object.freeze({ routeId: null, packetId: null, status: 'idle' }),
    provenance: Object.freeze({ createdBy: 'pixelbrain.volume.slice', operations: Object.freeze([{ op: 'deriveVolumeSlice', axis, index }]) }),
    metadata: Object.freeze({ tags: Object.freeze(['slice', axis, String(index)]), notes: Object.freeze([]), compatibility: Object.freeze({ sourceVolumeId: volume.id }) }),
    sdfDescriptors: volume.sdfDescriptors,
    noiseDescriptors: volume.noiseDescriptors,
  });
}
```

#### 9.2 glTF codec writer (`codex/core/pixelbrain/gltf-codec.js`)

```js
// codex/core/pixelbrain/gltf-codec.js
import { assertPixelBrainVolumeContainer } from './pixelbrain-volume-container.js';
import { resolveMaterialId, SOURCE_MATERIAL } from './material-registry.js';
import { hashString } from './shared.js';

const GLTF_VERSION = '2.0';
const GENERATOR = 'pixelbrain.blender-bridge.v1';

export function encodeGltf(volume) {
  assertPixelBrainVolumeContainer(volume);
  const { width, height, depth, cellSize } = volume.volume;
  const cellCount = volume.lattice.cells.length;
  // Pack lattice as a single POSITION float buffer (x, y, z) + a u8 color index buffer.
  const positions = new Float32Array(cellCount * 3);
  const colorInts = new Uint8Array(cellCount * 4);
  const partIds = new Map();
  const materialIds = new Map();
  volume.lattice.cells.forEach((cell, i) => {
    positions[i * 3 + 0] = cell.x * cellSize;
    positions[i * 3 + 1] = cell.y * cellSize;
    positions[i * 3 + 2] = cell.z * cellSize;
    const [r, g, b] = parseHexColor(cell.color);
    colorInts[i * 4 + 0] = r;
    colorInts[i * 4 + 1] = g;
    colorInts[i * 4 + 2] = b;
    colorInts[i * 4 + 3] = 255;
    if (!partIds.has(cell.partId ?? 'core')) partIds.set(cell.partId ?? 'core', partIds.size);
    const mat = resolveMaterialId(volume.materials.perPartId[cell.partId ?? 'core'] ?? SOURCE_MATERIAL);
    if (!materialIds.has(mat)) materialIds.set(mat, materialIds.size);
  });
  // Compose the binary buffer (positions + colorInts + partId indices).
  const bin = new Uint8Array(positions.byteLength + colorInts.byteLength);
  bin.set(new Uint8Array(positions.buffer), 0);
  bin.set(colorInts, positions.byteLength);
  const json = {
    asset: { version: GLTF_VERSION, generator: GENERATOR },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ name: `pbvol-${volume.id}`, mesh: 0 }],
    meshes: [{
      name: 'pixelbrain-lattice',
      primitives: [{
        mode: 0, // POINTS — the lattice is a point cloud by construction
        attributes: { POSITION: 0, COLOR_0: 1 },
        material: 0,
      }],
    }],
    materials: [{ name: 'pixelbrain-material', pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1], metallicFactor: 0, roughnessFactor: 1 } }],
    accessors: [
      { bufferView: 0, componentType: 5126, count: cellCount, type: 'VEC3', min: [0, 0, 0], max: [width * cellSize, height * cellSize, depth * cellSize] },
      { bufferView: 1, componentType: 5121, count: cellCount, type: 'VEC4', normalized: false },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: positions.byteLength, target: 34962 },
      { buffer: 0, byteOffset: positions.byteLength, byteLength: colorInts.byteLength, target: 34962 },
    ],
    buffers: [{ byteLength: bin.byteLength }],
    extensionsUsed: ['PB_VOLUME_META'],
    extensions: {
      PB_VOLUME_META: {
        id: volume.id,
        width, height, depth, cellSize,
        fingerprint: hashString(JSON.stringify({ width, height, depth, cellCount, partIds, materialIds })).toString(16).padStart(8, '0'),
      },
    },
  };
  return { json, bin };
}

function parseHexColor(hex = '#FFFFFF') {
  const v = parseInt(String(hex).replace('#', ''), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}
```

#### 9.3 Blender bridge import (loud failure on non-registry color) (`codex/core/pixelbrain/foundry-blender-bridge.js`)

```js
// codex/core/pixelbrain/foundry-blender-bridge.js (excerpt)
import { assertPixelBrainVolumeContainer, normalizePixelBrainVolume, quantizePointToLattice } from './pixelbrain-volume-container.js';
import { encodeGltf, decodeGltf } from './gltf-codec.js';
import { encodeBlenderBinary, decodeBlenderBinary } from './blender-binary-codec.js';
import { isRegisteredColor } from './material-registry.js';
import { createExtensionError, MODULE_IDS } from './bytecode-error.js';

export const FOUNDRY_BLENDER_BRIDGE_VERSION = '0.1.0';

export function exportVolumeToGltf(volume) {
  return encodeGltf(volume);
}

export function importGltfToVolume(gltf, options = {}) {
  const { json, bin } = decodeGltf(gltf);
  const meta = json.extensions?.PB_VOLUME_META;
  if (!meta) {
    throw createExtensionError(MODULE_IDS.VOLUME_3D, 'MISSING_VOLUME_META', gltf, { generator: json?.asset?.generator });
  }
  const { width, height, depth, cellSize } = meta;
  const positions = readFloat32View(bin, json.accessors[0], json.bufferViews[0]);
  const colors = readU8View(bin, json.accessors[1], json.bufferViews[1]);
  const cells = [];
  for (let i = 0; i < positions.length / 3; i++) {
    const point = {
      x: Math.round(positions[i * 3 + 0] / cellSize),
      y: Math.round(positions[i * 3 + 1] / cellSize),
      z: Math.round(positions[i * 3 + 2] / cellSize),
    };
    const lattice = quantizePointToLattice(point, { width, height, depth, cellSize });
    if (!lattice) {
      throw createExtensionError(MODULE_IDS.VOLUME_3D, 'NON_QUANTIZABLE_GEOMETRY', point, { point, volume: meta });
    }
    const color = `#${[colors[i * 4], colors[i * 4 + 1], colors[i * 4 + 2]].map((c) => c.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
    if (!isRegisteredColor(color)) {
      throw createExtensionError(MODULE_IDS.VOLUME_3D, 'UNREGISTERED_COLOR', color, { color, lattice });
    }
    cells.push({ x: lattice.x, y: lattice.y, z: lattice.z, color, emphasis: 1, partId: 'core' });
  }
  return normalizePixelBrainVolume({
    source: { kind: 'blender', id: meta.id, label: json.nodes?.[0]?.name ?? null, importedAt: new Date(0).toISOString() },
    volume: { width, height, depth, cellSize },
    lattice: { cells },
    metadata: { tags: ['blender', 'gltf'], notes: [], compatibility: { fingerprint: meta.fingerprint } },
  });
}

export function exportVolumeToBlenderBinary(volume) {
  assertPixelBrainVolumeContainer(volume);
  return encodeBlenderBinary(volume);
}

export function importBlenderBinaryToVolume(buffer) {
  const volume = decodeBlenderBinary(buffer);
  assertPixelBrainVolumeContainer(volume);
  return volume;
}

function readFloat32View(bin, accessor, view) {
  const offset = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  return new Float32Array(bin.buffer, bin.byteOffset + offset, accessor.count * 3);
}

function readU8View(bin, accessor, view) {
  const offset = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  return new Uint8Array(bin.buffer, bin.byteOffset + offset, accessor.count * 4);
}
```

#### 9.4 Immunity rule rejecting non-integer z (`codex/core/immunity/rules/volume-3d.js`)

```js
// codex/core/immunity/rules/volume-3d.js
import { createExtensionError, MODULE_IDS } from '../../bytecode-error.js';

export const VOLUME_3D_RULES = Object.freeze([
  {
    id: 'PB-VOLUME-3D-CR-COORD-0101',
    severity: 'CRIT',
    appliesTo: ['pixelbrain-volume-container.js', 'foundry-blender-bridge.js'],
    check(input) {
      const cells = input?.lattice?.cells ?? input?.geometry?.coordinates ?? [];
      const offenders = cells.filter((c) => !Number.isInteger(c.z));
      if (offenders.length === 0) return { ok: true };
      throw createExtensionError(MODULE_IDS.VOLUME_3D, 'NON_INTEGER_Z', offenders[0], {
        offendersCount: offenders.length,
        sample: offenders[0],
      });
    },
  },
  {
    id: 'PB-VOLUME-3D-CR-MATERIAL-0101',
    severity: 'CRIT',
    appliesTo: ['foundry-blender-bridge.js'],
    check(input) {
      const cells = input?.lattice?.cells ?? [];
      const bad = cells.find((c) => !c.color?.match(/^#[0-9A-F]{6}$/));
      if (!bad) return { ok: true };
      throw createExtensionError(MODULE_IDS.VOLUME_3D, 'UNREGISTERED_COLOR', bad.color, { cell: bad });
    },
  },
]);
```

#### 9.5 UI-side re-export adapter (`src/lib/blender.adapter.js`)

```js
// src/lib/blender.adapter.js
// UI modules MUST import from here, never from codex/core/* directly (Cell Wall).
export {
  PB_VOLUME_KIND,
  forgeVolume,
  assertPixelBrainVolumeContainer,
  deriveVolumeSlice,
} from '../../codex/core/pixelbrain/pixelbrain-volume-container.js';

export {
  FOUNDRY_BLENDER_BRIDGE_VERSION,
  exportVolumeToGltf,
  importGltfToVolume,
  exportVolumeToBlenderBinary,
  importBlenderBinaryToVolume,
} from '../../codex/core/pixelbrain/foundry-blender-bridge.js';
```

#### 9.6 Python companion script head (`scripts/blender/pb_export.py`)

```python
# scripts/blender/pb_export.py
# Run inside Blender: blender --background --python scripts/blender/pb_export.py -- --input vol.json --output out.glb
import json, sys, argparse, pathlib

def parse_args():
    argv = sys.argv
    if "--" not in argv:
        argv = []  # blender prepends args before "--"
    else:
        argv = argv[argv.index("--") + 1:]
    p = argparse.ArgumentParser()
    p.add_argument("--input", required=True, type=pathlib.Path)
    p.add_argument("--output", required=True, type=pathlib.Path)
    return p.parse_args(argv)

def main():
    args = parse_args()
    data = json.loads(args.input.read_text("utf-8"))
    if data.get("kind") != "pixelbrain.volume.v1":
        raise SystemExit(f"Refusing non-PB-VOLUME-v1 payload (kind={data.get('kind')!r})")
    import bpy
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()
    cell_size = data["volume"]["cellSize"]
    mesh = bpy.data.meshes.new("pb_lattice")
    mesh.from_pydata(
        [(c["x"] * cell_size, c["y"] * cell_size, c["z"] * cell_size) for c in data["lattice"]["cells"]],
        [],
        [],
    )
    obj = bpy.data.objects.new("pb_lattice", mesh)
    bpy.context.collection.objects.link(obj)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=str(args.output), export_format='GLB')
    print(f"wrote {args.output}")

if __name__ == "__main__":
    main()
```

#### 9.7 Feature flag wiring (in `codex/runtime/feature-flags.js` or equivalent)

```js
// Add to the feature-flag registry, gated by env var in production.
export const PIXELBRAIN_VOLUME_V1 = process.env.PIXELBRAIN_VOLUME_V1 === '1' || false;
export const PIXELBRAIN_BLENDER_BRIDGE_V1 = process.env.PIXELBRAIN_BLENDER_BRIDGE_V1 === '1' || false;
export const PIXELBRAIN_VOLUME_UI_V1 = process.env.PIXELBRAIN_VOLUME_UI_V1 === '1' || false;
export const PIXELBRAIN_BLENDER_NATIVE_V1 = process.env.PIXELBRAIN_BLENDER_NATIVE_V1 === '1' || false;
```

### 10. Glossary

- **PB-VOLUME-v1** — the new 3D voxel container packet. Source of truth for everything in this PDR.
- **PixelBrainAssetPacket** — the existing 2D packet. From this PDR forward it is a `PB-VOLUME-v1` with `depth = 1` projected onto `z = 0`.
- **Volume** — short for `PB-VOLUME-v1`.
- **Lattice** — the integer cells of a volume or 2D packet. The "asset" in the AOM sense.
- **Slice** — the 2D `PixelBrainAssetPacket` derived from a volume at a given `axis/index`. The seam between 2D and 3D.
- **glTF 2.0** — Khronos Group's open 3D interchange format. The 3D analogue of Aseprite JSON.
- **.blend** — Blender's native file format. Optional codec in v1; mesh + vertex colors only.
- **CODEx** — the four-layer engine (Core / Services / Runtime / Server) that owns PixelBrain. The volume sits in Core.
- **Cell Wall** — the architectural rule that `src/lib/*` imports `codex/core/*` only through the adapter layer (`src/lib/blender.adapter.js` for this PDR).
- **Loud failure** — every protocol violation emits a `PB-ERR-v1-VOLUME-3D-*` bytecode error instead of silently snapping.
- **Fingerprint** — a deterministic `hashString` of the lattice summary, used in glTF metadata to detect drift across a round-trip.
- **Re-quantize** — convert float geometry to integer voxel cells on Blender import. Sub-cell offsets are rejected (F-7).
- **Registry authority** — `codex/core/pixelbrain/material-registry.js` is the only allowed source of colors. Imported colors not in the registry are rejected (F-8).
- **Schema sovereignty** — the rule that no new schema is invented outside `SCHEMA_CONTRACT.md`; `PB-VOLUME-v1` must be added there.

### 11. Q&A — Top 10 Most Confusing Implementation Concerns

1. **Why is `PB-VOLUME-v1` a generalization, not a replacement for `PixelBrainAssetPacket`?** Because the 2D packet is in production across the Foundry, character creator, template editor, and shaders. Replacing it would break every consumer. Generalizing it (`depth = 1` is a valid volume) keeps everyone working. The "lattice is the asset" law is preserved.
2. **What happens to existing 2D-only consumers when a volume is loaded?** Nothing changes for them. They get a 2D slice via `deriveVolumeSlice(volume)` and the lattice is identical to what the volume would have had at `z = 0`. They never see `z > 0`.
3. **How is the volume different from just a 2D packet with a 3D SDF generator?** The 2D packet has no `z` in its cells. The volume has integer `z` in every cell. A 2D packet with an SDF descriptor that happens to be 3D is *not* a volume — it's a 2D packet whose generation used a 3D tool. Subtle, important, the immunity rule enforces it.
4. **Why reject sub-cell geometry instead of snapping?** Snapping silently drops information. Loud rejection forces the artist to round-trip with an explicit `cellSize` they have chosen. The "no silent snap" rule is a Pillar of PixelBrain determinism.
5. **Why is glTF the canonical interchange and not `.blend`?** glTF is open, versioned, schema-validatable, and readable by every 3D tool. `.blend` is Blender's binary; its format documentation is incomplete. glTF plays the same role Aseprite JSON plays for 2D. `.blend` is the optional codec, not the canonical.
6. **Why does the bridge reject non-registry colors instead of mapping them?** Material authority is registry-only (AOM §3). Mapping would invent palette semantics; rejection forces the artist to choose a registry color, which is what the rest of PixelBrain already does.
7. **Why a 2D projection helper instead of dual write?** Two packets, two truths, two bug classes. A projection helper has one truth (the volume) and one mechanical derivation. The "parallel schema" anti-pattern is dodged.
8. **Why is the codec hand-rolled and not a library dep?** The codec supports only the subset we need (mesh + vertex colors). Pulling a `gltf-transform` or `pygltflib` dependency is a runtime cost for a tiny feature surface. The codec is ~150 lines of code and is itself testable byte-by-byte. If the surface grows, revisit.
9. **Why is this PDR's authority `pixelbrain.volume.v1` and not `pixelbrain.asset.v1`?** The packet *is* a different kind, with different schema, even though it generalizes. Authority names the packet, not the superset relation. The 2D packet's authority remains `pixelbrain.asset-packet.v1` (unchanged).
10. **Why ship in five phases instead of one?** Each phase is independently valuable and shippable. Phase 1 alone (volume packet) is useful for the deferred Three.js path. Phase 2 (glTF) is useful even without the UI. Phase 3 (UI) is the visible surface but not load-bearing. Phase 4 (`.blend`) is a power-user addition. Phase 5 (PIR) is the gate. Any phase can be rolled back by flipping its feature flag.

### 12. QA Plan

#### 12.1 New tests (file paths, exact)

- `tests/core/pixelbrain/pixelbrain-volume-container.test.js` — packet creation, normalization, projection, assertions, immunity integration.
- `tests/core/pixelbrain/foundry-blender-bridge.test.js` — round-trip, glTF codec, non-quantizable geometry rejection, unregistered color rejection.
- `tests/core/pixelbrain/gltf-codec.test.js` — encode/decode byte stability, accessor count, view offsets.
- `tests/core/pixelbrain/blender-binary-codec.test.js` — `.blend` round-trip; codec version stamping.
- `tests/core/pixelbrain/golden/volume-cube.gltf` — golden glTF JSON (commit-locked).
- `tests/core/pixelbrain/golden/volume-cube.glb` — golden glb binary (commit-locked).
- `tests/core/pixelbrain/golden/volume-cube.blend` — golden `.blend` (commit-locked).
- `tests/qa/pixelbrain/volume-blender-e2e.test.js` — emit a known volume, export, re-import, assert lattice equality, assert `fingerprint` equality.
- `tests/visual/pixelbrain-volume-import.spec.js` — visual regression for Claude's import affordance.
- `tests/visual/pixelbrain-volume-export.spec.js` — visual regression for Claude's export affordance.

#### 12.2 Commands (the project's actual package manager and runner)

```bash
# Focused bridge and packet tests
npx vitest run tests/core/pixelbrain/pixelbrain-volume-container.test.js
npx vitest run tests/core/pixelbrain/foundry-blender-bridge.test.js
npx vitest run tests/core/pixelbrain/gltf-codec.test.js
npx vitest run tests/core/pixelbrain/blender-binary-codec.test.js

# End-to-end with byte equality
npx vitest run tests/qa/pixelbrain/volume-blender-e2e.test.js

# Broad PixelBrain regression (must remain green)
npx vitest run tests/qa/pixelbrain
npx vitest run tests/core/pixelbrain

# Quality gates (full project, as per AGENTS.md)
npm run lint
npm run typecheck
npm run test:qa
npm run test:visual
npm run dead:scan     # advisory
npm run verify:css-tokens
```

#### 12.3 Sample test code (runnable, not pseudocode)

```js
// tests/core/pixelbrain/pixelbrain-volume-container.test.js
import { describe, expect, it } from 'vitest';
import {
  PB_VOLUME_KIND,
  assertPixelBrainVolumeContainer,
  deriveVolumeSlice,
  forgeVolume,
  normalizePixelBrainVolume,
  quantizePointToLattice,
} from '../../../codex/core/pixelbrain/pixelbrain-volume-container.js';

describe('PixelBrain volume container', () => {
  it('creates a deterministic volume from a spec and seed', () => {
    const spec = { id: 'cube.v1', volume: { width: 8, height: 8, depth: 8 }, seed: 7 };
    const a = forgeVolume(spec);
    const b = forgeVolume(spec);
    expect(a.id).toBe(b.id);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('rejects non-integer z in cells with a loud failure', () => {
    expect(() => normalizePixelBrainVolume({
      volume: { width: 4, height: 4, depth: 4, cellSize: 1 },
      lattice: { cells: [{ x: 0, y: 0, z: 0.5, color: '#FFFFFF' }] },
    })).toThrowError(/NON_INTEGER_Z/);
  });

  it('projects a z=0 slice equal to a hand-built 2D packet', () => {
    const volume = forgeVolume({ id: 's.v1', volume: { width: 4, height: 4, depth: 2 }, seed: 3 });
    const slice = deriveVolumeSlice(volume, 'z', 0);
    expect(slice.kind).toBe('pixelbrain.asset.v1');
    expect(slice.geometry.coordinates.every((c) => c.z === 0)).toBe(true);
    expect(slice.geometry.coordinates).toHaveLength(
      volume.lattice.cells.filter((c) => c.z === 0).length
    );
  });

  it('quantizePointToLattice rejects sub-cell coordinates', () => {
    const v = { width: 8, height: 8, depth: 8, cellSize: 2 };
    expect(quantizePointToLattice({ x: 3, y: 0, z: 0 }, v)).toBeNull();
    expect(quantizePointToLattice({ x: 4, y: 4, z: 4 }, v)).toEqual({ x: 4, y: 4, z: 4 });
  });

  it('assertPixelBrainVolumeContainer guards the kind', () => {
    expect(() => assertPixelBrainVolumeContainer({ kind: 'wrong' })).toThrowError(/INVALID_PACKET/);
    expect(assertPixelBrainVolumeContainer(forgeVolume({ volume: { width: 2, height: 2, depth: 2 } }))).toBe(true);
  });
});
```

```js
// tests/core/pixelbrain/foundry-blender-bridge.test.js (excerpt)
import { describe, expect, it } from 'vitest';
import { exportVolumeToGltf, importGltfToVolume } from '../../../codex/core/pixelbrain/foundry-blender-bridge.js';
import { forgeVolume } from '../../../codex/core/pixelbrain/pixelbrain-volume-container.js';

describe('Foundry Blender bridge', () => {
  it('round-trips a volume through glTF with byte-equal lattice', () => {
    const v = forgeVolume({ id: 'rt.v1', volume: { width: 4, height: 4, depth: 4 }, seed: 11 });
    const { json, bin } = exportVolumeToGltf(v);
    const v2 = importGltfToVolume({ json, bin });
    expect(v2.lattice.cells).toEqual(v.lattice.cells);
  });

  it('loudly rejects sub-cell geometry on import', () => {
    const v = forgeVolume({ volume: { width: 4, height: 4, depth: 4 }, seed: 13 });
    const { json, bin } = exportVolumeToGltf(v);
    const positions = new Float32Array(bin.buffer, bin.byteOffset, bin.byteLength / 4);
    positions[0] = 1.5; // sub-cell offset
    expect(() => importGltfToVolume({ json, bin })).toThrowError(/NON_QUANTIZABLE_GEOMETRY/);
  });
});
```

### 13. Regression Risks and Specific Retest Checklist

- **Risk: 2D packet consumers break because a new field is required.** Mitigation: zero required-field additions to `PixelBrainAssetPacket`. Re-run every `tests/core/pixelbrain/*.test.js`. Re-run `tests/qa/pixelbrain` and `tests/visual/` per the AOM §7.4 "Broader PixelBrain QA" command.
- **Risk: `assertPixelBrainAssetPacket` rejects a slice.** Mitigation: `deriveVolumeSlice` returns a packet that passes the assertion by construction. Backward-compat test in `pixelbrain-volume-container.test.js`.
- **Risk: glTF codec emits a non-canonical accessor count.** Mitigation: `gltf-codec.test.js` asserts accessor count = 2 and `bufferViews[0].byteLength = positions.byteLength`.
- **Risk: `.blend` codec silently truncates meshes above 65 535 vertices.** Mitigation: codec enforces a hard ceiling and throws `PB-ERR-v1-VOLUME-3D-CR-CODEC-0101` above it. Tested in `blender-binary-codec.test.js`.
- **Risk: material registry lookup fails on import because the registry has changed.** Mitigation: import maps incoming colors to the closest *registered* material via the existing `resolveMaterialId` and fails loud on `isRegisteredColor` = false. Tested in `foundry-blender-bridge.test.js`.
- **Risk: Claude's UI affordance regresses the existing `PixelBrainPage.jsx` visual baselines.** Mitigation: `tests/visual/pixelbrain-volume-{import,export}.spec.js` are additive; existing baselines are untouched. `npm run test:visual` must remain green.
- **Risk: determinism broken by `Date.now()` or `Math.random()` in any new file.** Mitigation: ESLint rule `no-restricted-globals` already bans `Math.random` in `codex/core/**`. The new files use `hashString` for any seed. Verified by the byte-equal golden tests.
- **Risk: schema sovereignty violation (parallel schema).** Mitigation: `SCHEMA_CONTRACT.md` update is a hard prerequisite for phase 1 sign-off.
- **Specific retest checklist (file paths and commands):**

  ```bash
  npx vitest run tests/core/pixelbrain/pixelbrain-volume-container.test.js
  npx vitest run tests/core/pixelbrain/foundry-blender-bridge.test.js
  npx vitest run tests/core/pixelbrain/gltf-codec.test.js
  npx vitest run tests/core/pixelbrain/blender-binary-codec.test.js
  npx vitest run tests/qa/pixelbrain/volume-blender-e2e.test.js
  npx vitest run tests/qa/pixelbrain
  npx vitest run tests/core/pixelbrain
  npm run test:qa
  npm run test:visual
  npm run typecheck
  npm run lint
  npm run dead:scan
  ```

### 14. Rollout Plan

- **Incomplete-but-safe clause:** while the four feature flags are `false`, the new code paths are inert. The volume forge function is not called from any UI or production pipeline. The bridge is not exposed via the UI adapter. The existing 2D packet production is unaffected. CI runs the new tests in shadow.
- **Feature flags (default `false` in production; `true` only in dev/CI):**
  - `PIXELBRAIN_VOLUME_V1` — gates `forgeVolume` and `assertPixelBrainVolumeContainer`.
  - `PIXELBRAIN_BLENDER_BRIDGE_V1` — gates `exportVolumeToGltf` / `importGltfToVolume` and the bridge module.
  - `PIXELBRAIN_VOLUME_UI_V1` — gates Claude's UI affordance in `PixelBrainPage.jsx`.
  - `PIXELBRAIN_BLENDER_NATIVE_V1` — gates the `.blend` codec and the Python scripts.
- **Shadow mode (phase 1+2):** new code paths are exercised by tests and dev-only routes. No user-visible change. Telemetry: `collab://activity` records `forgeVolume` calls and bridge round-trips in dev only.
- **Canary (phase 3):** Claude's UI affordance is visible to the `developer` role only. The user role does not see it. `npm run test:visual` baselines are captured before any user sees the change.
- **Full rollout (phase 5):** all four flags flipped to `true`; PIR filed; one week of telemetry. Rollback: any flag → `false` reverts that layer to inert.
- **Rollback steps:**
  1. Flip the offending feature flag to `false` in `.env` and redeploy.
  2. The volume packet and bridge are inert; the 2D packet path is unchanged.
  3. If the issue is in a packet on disk, the renderer falls back to the 2D projection via `deriveVolumeSlice`; no data loss.
  4. If the issue is in the codec, switch the UI to glTF-only (`PIXELBRAIN_BLENDER_NATIVE_V1 = false`).
  5. If the issue is in the schema contract, the contract is additive — rollback is `git revert` on the `SCHEMA_CONTRACT.md` edit.

### 15. Definition of Done

Mechanically checkable. Every box must be ticked.

- [ ] `tests/core/pixelbrain/pixelbrain-volume-container.test.js` exists and is green.
- [ ] `tests/core/pixelbrain/foundry-blender-bridge.test.js` exists and is green.
- [ ] `tests/core/pixelbrain/gltf-codec.test.js` exists and is green.
- [ ] `tests/core/pixelbrain/blender-binary-codec.test.js` exists and is green.
- [ ] `tests/qa/pixelbrain/volume-blender-e2e.test.js` exists and is green.
- [ ] `tests/core/pixelbrain/golden/volume-cube.gltf`, `.glb`, `.blend` are byte-stable across two CI runs on two different runners.
- [ ] `npm run lint` is green (max-warnings=0).
- [ ] `npm run typecheck` is green except for the known intentional failure on `applyFormat` (AGENTS.md, Tooling Gates).
- [ ] `npm run test:qa` is green.
- [ ] `npm run test:visual` is green.
- [ ] `npm run dead:scan` reports no new dead exports from this PDR.
- [ ] `codex/core/immunity/rules/volume-3d.js` is registered in the immunity registry.
- [ ] `docs/scholomance-encyclopedia/Scholomance LAW/SCHEMA_CONTRACT.md` lists `PB-VOLUME-v1`.
- [ ] `src/lib/blender.adapter.js` re-exports the new public surface; `src/lib/pixelbrain.adapter.js` forwards.
- [ ] `scripts/blender/{pb_import.py,pb_export.py,README.md}` exist and are documented.
- [ ] All four feature flags exist and default to `false`.
- [ ] No `Math.random`, no `Date.now`, no `eval`/`new Function` in any new file (lint-enforced).
- [ ] No silent sub-cell snap; loud failure on non-quantizable import (F-7).
- [ ] No parallel schema; `PB-VOLUME-v1` lives in `SCHEMA_CONTRACT.md`.
- [ ] The 2D packet's public API is unchanged.
- [ ] Every existing `tests/core/pixelbrain/*.test.js` is green.
- [ ] `tests/visual/pixelbrain-volume-{import,export}.spec.js` are captured by Claude.
- [ ] PIR `docs/scholomance-encyclopedia/post-implementation-reports/PIR-20260615-PIXELBRAIN-VOLUME-BLENDER.md` is written, dated, and signed by Codex.

### 16. Final Architectural Verdict

**Complete with acceptable risk.** The PDR is implementable in five independently shippable phases, each behind a feature flag and each with a roll-back step. The risk profile is dominated by (a) the schema-sovereignty question (one open escalation), (b) the determinism guarantees on the glTF and `.blend` codecs (mitigated by golden files), and (c) the cell-wall adapter contract on the UI side (mitigated by the `src/lib/blender.adapter.js` re-export). All three are addressable before phase 5 sign-off. The 2D packet and its 60+ existing tests are untouched; the volume and bridge are additive.

### 17. References

- `codex/core/pixelbrain/pixelbrain-asset-packet.js` — the existing 2D packet; the projection helper targets its public shape.
- `codex/core/pixelbrain/foundry-aseprite-bridge.js` — the canonical bridge pattern this PDR mirrors.
- `codex/core/pixelbrain/aseprite-binary-codec.js` — the binary codec pattern mirrored by `blender-binary-codec.js`.
- `codex/core/pixelbrain/material-registry.js` — the only color authority; imported colors are validated against it.
- `codex/core/pixelbrain/sdf-evaluator.js` — extended for 3D SDF primitives (sphere, box, capsule, cylinder).
- `codex/core/pixelbrain/shared.js` — `hashString` / `clamp01` for deterministic byte stability.
- `codex/core/pixelbrain/bytecode-error.js` — `MODULE_IDS.VOLUME_3D` and the `PB-ERR-v1-VOLUME-3D-*` family.
- `codex/core/pixelbrain/volume-amp.js` and `shield-volume-amp.js` — kept working on 2D slices; presentation, not geometry.
- `codex/services/adapters/datamuse.adapter.js` (and siblings) — the service-layer adapter shape mirrored by `blender-bridge.adapter.js`.
- `codex/server/collab/mcp-bridge.js` and `collab://activity` — the telemetry surface for shadow-mode and canary monitoring.
- `docs/scholomance-encyclopedia/Scholomance LAW/SCHEMA_CONTRACT.md` — `PB-VOLUME-v1` is registered here.
- `docs/scholomance-encyclopedia/Scholomance LAW/VAELRIX_LAW.md` — escalation block format used in §6; §14 is the Law under which the collab plane and feature flags live.
- `docs/scholomance-encyclopedia/Scholomance LAW/AGENTS.md` — the agent jurisdiction table; §7 file map is grounded in it.
- `docs/scholomance-encyclopedia/Scholomance White Papers/PIXELBRAIN_AGENT_OPERATING_MANUAL.md` — AOM §1–§3 (lattice is the asset; shaders never invent geometry; materials resolve through registry authority).
- `docs/scholomance-encyclopedia/Scholomance White Papers/PIXELBRAIN_CONNECTIVE_TISSUE_WHITE_PAPER.md` — §6 (palette authority bridge), §9 (template grid asset bridge), §11 (Pixel Lotus actor bridge); the bridge taxonomy this PDR joins.
- `docs/scholomance-encyclopedia/Scholomance White Papers/PIXELBRAIN_AGENT_OPERATING_MANUAL.md §11` — maturity map; the volume and Blender bridge become new rows.
- `docs/scholomance-encyclopedia/PDR-archive/2026-06-12-foundry-aseprite-bridge-pdr.md` — structural template.
- `docs/scholomance-encyclopedia/PDR-archive/2026-06-12-pixelbrain-character-creator-pdr.md` — primary consumer of the volume; "3D character models" non-goal revisited via the deferred `CHARACTER-VOLUME-SPEC-v1`.
- `docs/scholomance-encyclopedia/PDR-archive/2026-06-12-pixelbrain-sdf-and-coherent-noise-integration-pdr.md` — `PB-SDF-v1` / `PB-NOISE-v1` are the new volume's generation-time descriptors.
- `docs/superpowers/plans/2026-06-14-ice-slime-staff-void-eldritch.md` (line 85, 3D ring mention) — confirms artist demand for real 3D-aware rendering, supporting the AOM §11 maturity-map upgrade.
- `docs/superpowers/specs/2026-06-12-character-gpu-effects-design.md` — GLSL pattern reused by the future `PB-VOLUME-SHADER-v1` (out of scope here).
- `docs/scholomance-encyclopedia/post-implementation-reports/PIR-20260613-SCHOLOTIME-TYPOGRAPHY-MOVIES.md` — the deferred Three.js path becomes a downstream consumer.
- `docs/scholomance-encyclopedia/post-implementation-reports/PIR-20260612-FOUNDRY-ASEPRITE-BRIDGE.md` — PIR format and rigor to match.
- `Khronos glTF 2.0 spec` — `https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html` — the canonical interchange format this PDR standardizes on.

### 18. Post-Implementation Report Handoff

- **PIR file:** `docs/scholomance-encyclopedia/post-implementation-reports/PIR-20260615-PIXELBRAIN-VOLUME-BLENDER.md`
- **Date:** 2026-06-15
- **Owner of PIR:** Codex (signoff) + Gemini (operational evidence). PIR is required for this PDR to be considered complete; a PDR that ships without a corresponding PIR is incomplete (template acceptance criterion).
- **PIR sections must include:** feature-flag rollout timeline, telemetry from `collab://activity` over the canary week, any `PB-ERR-v1-VOLUME-3D-*` spikes, the schema-contract diff, the immunity-rule diff, golden-file byte-stability proof, and the retest commands from §13. The PIR reuses the format of `PIR-20260612-FOUNDRY-ASEPRITE-BRIDGE.md`.
