# PDR: SubstrateLens — Voxel Microcosm Inspector for DivWand

**Bytecode Search Code:** `SCHOL-ENC-PDR-SUBSTRATE-LENS-v1`
**Date:** 2026-06-16
**Status:** Proposed
**Classification:** DivWand UI | QBIT-Voxel Layer 4 Companion | Inspector Tooling
**Priority:** Medium
**Related PDRs / papers:**
- `docs/Scholo-Theory/QBIT-VOXEL-SYNTHESIS.md` — §6 Failure 5 (Inspector Dead Zone) — this PDR is the partial fix
- `docs/scholomance-encyclopedia/PDR-archive/PDR-2026-06-05-WORLD-REIFICATION-ENGINE.md` — peer contract for runtime entity inspection
- `2026-06-15-pixelbrain-volume-container-and-blender-bridge-pdr.md` — same microcosm/macrocosm distinction, 3D side

---

## Owner(s)

- **Claude (UI surface):** Implements `src/pages/DivWand/components/SubstrateLens.jsx`, the `Substrate` toggle in the `DivWandPage` header, the lens HUD overlay, and the `aria-live` announcements. Owns the screen-space face index and the inverse projection math.
- **Codex (architecture / schema):** Defines the `SubstrateLensFace` packet, the `LENS-OP-v1` operation class for the Photonic Bridge, and the `src/lib/substrate-lens.adapter.js` re-export contract.
- **Gemini (backend impl / tests):** Implements `codex/core/pixelbrain/substrate-lens.js` (face indexer, point-in-polygon fallback, byte-identical rebuild), the immunity rule that rejects non-axis-aligned face quads, and `tests/core/pixelbrain/substrate-lens.test.js` golden files.
- **Escalation owner (cross-domain conflicts):** Angel. Specifically: the DOM inspector vs. SubstrateLens authority split, and any change to `IsoProjector` face schema.

---

## Context (seed — not the Executive Summary)

The QBIT-Voxel Synthesis paper §6 Failure 5 (Inspector Dead Zone) names the problem this PDR fixes by name: a `voxel-scene` node renders a tree of voxel faces as pre-baked SVG via `VoxelScenePortal`'s `dangerouslySetInnerHTML`. The regular DivWand Inspector — which uses React's event delegation over real DOM nodes — sees only the wrapper `<div>`. The hundreds of polygon faces inside the SVG are invisible to it. The Inspector HUD reports "720×300, role: voxel-scene" and that is the end of the story.

`SubstrateLens` is the second inspector the paper called for. Its job is to peer through the rendered macrocosm (the SVG) and surface the microcosm (per-cell `materialId` / `qbitState` / `energyType` / occupancy). It is not a replacement for the DOM Inspector — it is a sibling that owns the volume substrate and nothing else. The two inspectors coexist in the same UI; the user picks which lens they need per node.

The name is intentional. *Substrate*: the underlying lattice the macrocosm is projected from. *Lens*: an instrument that magnifies the invisible into the visible. Where the regular Inspector shows you the box, SubstrateLens shows you what is inside the box.

---

## Target Integration Area

- `src/pages/DivWand/components/` — new `SubstrateLens.jsx`, new `SubstrateLensHUD.jsx`.
- `src/pages/DivWand/DivWandPage.jsx` — add `substrateLensActive` state, "Substrate" toggle button next to the existing "Inspector" button, conditional render of the lens HUD.
- `codex/core/pixelbrain/` — new `substrate-lens.js` exporting `buildFaceIndex`, `hitTestFace`, `inverseProject`.
- `codex/core/pixelbrain/iso-projector.js` — additive change: extend `makeFace` to also return `polygon` (the 3 screen-space vertices for the face quad). Non-breaking.
- `codex/core/immunity/` — new `lens-3d` rule group: rejects non-axis-aligned face quads, rejects face indices with `Uint32` overflow at > 4K × 4K canvases.
- `src/lib/` — new `substrate-lens.adapter.js` re-exporting the public surface (mirrors `engine.adapter.js` shape).
- `tests/core/pixelbrain/substrate-lens.test.js` — golden tests for face index byte-identity, hit-test determinism, and the inverse-projection inverse-check (project → inverse → identity).
- `tests/visual/` — baselines for the lens HUD appearance in `DivWandPage.jsx`.
- `docs/scholomance-encyclopedia/Scholomance LAW/SCHEMA_CONTRACT.md` — register the `LENS-FACE-v1` packet and `LENS-OP-v1` operation class.

---

## Core Concept

`SubstrateLens` is a parallel inspector that lives next to the existing DivWand Inspector. When the user toggles the "Substrate" button in the header, the lens activates. On `mousemove` over a `voxel-scene` wrapper, the lens runs an O(1) hit-test through a pre-built screen-space face index and shows a HUD panel with the underlying cell's `materialId`, `qbitState` value, energy gradient vector, occupancy, and voxel coordinates.

The lens does not modify the SVG, does not insert event listeners on the polygons (they are not React nodes), and does not depend on React reconciler. It reads the face array emitted by the same `runVoxelPipeline` that feeds the SVG renderer, builds a parallel `Uint32Array` index where each face owns a unique 24-bit color (R = face index high byte, G = face index mid, B = face index low), and uses `getImageData` to look up the hovered face in O(1).

The index is rebuilt only when the volume changes (same memo dependency as the portal's SVG memo). Mouse events never trigger a rebuild.

The lens is a seam, not a re-implementation. It consumes the same face data the SVG renderer consumes. It does not touch the QBIT field, the AMPs, the projection math, or the `material-registry`. It only adds one extra consumer at the very end of the pipeline.

---

## Implementation Philosophy

Three non-negotiable principles:

1. **The lens never invents data.** Every value in the HUD must come from a real field on the face descriptor or the underlying `VoxelVolume` cell. No computed "this is a wall" inference.
2. **The lens is byte-identical to its own rebuild.** Given the same `(volume, faces, width, height)`, two consecutive lens builds produce identical `Uint32Array` index buffers. No `Date.now()`, no `Math.random()`, no time-dependence.
3. **The lens is non-destructive.** It reads from the SVG, the face array, and the volume. It does not mutate any of them. Hovering the lens never changes what is rendered.

---

## Required Sections

### 1. Executive Summary

`SubstrateLens` is a sibling inspector to the DivWand DOM Inspector, scoped specifically to `voxel-scene` nodes. It closes the §6 Failure 5 inspector dead zone by hitting through the pre-baked SVG macrocosm to the per-cell microcosm underneath. Implementation cost is small: one core module (`substrate-lens.js`), one React component (`SubstrateLens.jsx` + `SubstrateLensHUD.jsx`), one header toggle, one immunity rule, and a handful of golden tests. The lens uses a screen-space face index (offscreen canvas, one color per face, `getImageData` for O(1) hover lookup) — the same pattern the QBIT-Voxel paper §9 Open Question 5 flagged as the most promising approach. It coexists with the regular DOM Inspector; the user chooses which lens applies per node. Status is **Proposed** — no code lands until §8 phases 1–2 are green.

### 2. Out of Scope / Non-Goals

- **Replacing the existing DOM Inspector.** The lens is a sibling, not a replacement. DOM nodes still get the regular HUD.
- **Editing the volume from the lens.** The lens is read-only. Editing voxels is a separate PDR (likely tied to the World Reification Engine).
- **Real-time ray tracing.** Hit-test is face-index lookup, not ray casting. No camera math, no per-frame intersection loops.
- **Inspecting face data the lens does not own.** The lens does not show wand formula details, energy-field gradients beyond the per-cell scalar, or material registry metadata. It shows only what is in the face descriptor and the cell.
- **Supporting non-`voxel-scene` nodes.** If the user hovers a non-voxel node while the lens is active, the lens HUD hides and the regular Inspector takes over. The lens and the regular Inspector can both be active simultaneously without conflict.
- **Cross-chunk volumes.** The lens inspects one volume at a time. `ChunkedWorldVolume` (paper §3 Difficulty 10) is deferred.
- **Sub-voxel precision.** The lens hit-tests per face, not per cell edge. Sub-face SDF detail (existing per the 2026-06-12 SDF PDR) is shown as a numeric value in the HUD, not as a hit-test target.
- **Animating the lens HUD.** The HUD respects `prefers-reduced-motion` (existing `usePrefersReducedMotion` hook, mirroring `DivWandPage.jsx`).

### 3. Spec Sheet

#### 3.1 Functional spec

| ID | Requirement | Acceptance criterion |
|---|---|---|
| L-1 | `buildFaceIndex(faces, width, height)` produces a `Uint32Array` of length `width × height` where each pixel holds the index of the topmost face under that screen pixel (or `0xFFFFFFFF` for empty). | Golden test: `crystal-level1` volume at 720×300 produces byte-identical index across 100 rebuilds. |
| L-2 | `hitTestFace(index, mx, my)` returns the face descriptor at screen coordinates `(mx, my)` in O(1). | Lookup is a single array read; no loop, no projection. |
| L-3 | `inverseProject(sx, sy, yHint)` returns the voxel coordinate `(vx, vy, vz)` the mouse is over, given the screen-space cursor and a candidate Y hint. | Round-trip: `project(inverseProject(p))` for a face center returns within `0.5` pixels of the input. |
| L-4 | The lens HUD shows: face `type` (`top`/`left`/`right`), `materialId`, `materialName` (from registry), `qbitState` (energy), `energyType`, occupancy, voxel coordinates `(vx, vy, vz)`, face normal (3-vector). | All 9 fields appear in the HUD when a face is hovered. |
| L-5 | Lens activation is gated by a header toggle button labeled "Substrate" with the same visual treatment as the existing "Inspector" button. | Toggle state stored in `DivWandPage` `useState`; `aria-pressed` reflects state; button is keyboard-focusable. |
| L-6 | The lens is non-destructive. Hovering with the lens active never mutates the SVG, the face array, the volume, or the QBIT field. | Property test: snapshot volume + faces before and after 1000 hover events → identical bytes. |
| L-7 | Lens index rebuilds exactly when the SVG rebuilds (same memo dependency: `seedKey`, `volumeSize`, `text`). | Test: lens index fingerprint matches SVG fingerprint at the same memo key. |
| L-8 | When both Inspectors are active, hovering a `voxel-scene` shows the lens HUD; hovering a non-voxel node shows the regular HUD. | Manual + visual test. |
| L-9 | Lens `aria-live` region announces the hovered cell's material name and voxel coordinates on change (debounced to 200ms to avoid screen-reader spam). | Accessibility test: lens active, mouse moves across 5 cells, screen reader reads 5 distinct announcements. |
| L-10 | Lens immunity rule rejects face quads with non-axis-aligned normals. | Test feeds a face with a 30°-rotated normal → `LENS-3D-NAXIS-*` loud failure. |

#### 3.2 Non-functional spec

- **Determinism:** Same `(volume, faces, width, height)` → byte-identical `Uint32Array` index, every time, on every machine. No time, no entropy, no environment reads.
- **Latency:** `buildFaceIndex` for a 64³ volume (~5K faces) at 720×300 completes in < 30ms. `hitTestFace` is < 0.1ms (single array read).
- **Memory:** Face index at 720×300 = 864KB. At 1280×720 = 3.5MB. Acceptable.
- **CPU:** `hitTestFace` allocates nothing. `buildFaceIndex` allocates exactly one `Uint32Array`.
- **Accessibility:** HUD respects `prefers-reduced-motion`, is keyboard-focusable, has `role="status"` with `aria-live="polite"`, and uses the existing `dw-hud` styles for visual parity with the regular Inspector.
- **Test coverage:** Lines and branches of `substrate-lens.js` ≥ 95%; `SubstrateLens.jsx` ≥ 85%. Phase 1 must be ≥ 80% before phase 2.
- **Security:** No `eval`, no `new Function`, no DOM injection outside the lens HUD's own React tree.
- **Backward compatibility:** Zero breaking change to `iso-projector.js`'s `makeFace` — the new `polygon` field is additive. Existing SVG renderer ignores it.

#### 3.3 Contracts

```ts
// LENS-FACE-v1 — additive extension to the existing face descriptor
interface LensFace {
  // inherited from makeFace (existing)
  x: number; y: number; z: number;
  faceType: 'top' | 'left' | 'right';
  materialId: number;
  sx: number; sy: number;        // face anchor screen coords
  sortKey: number;

  // NEW (additive, ignored by SVG renderer)
  polygon: ReadonlyArray<{ sx: number; sy: number }>;  // 3 vertices, axis-aligned quad
  normal: { nx: number; ny: number; nz: number };      // quantized to int8
}

// LENS-INDEX-v1 — offscreen face index buffer
interface LensIndex {
  kind: 'substrate-lens.index.v1';
  schemaVersion: 1;
  width: number;
  height: number;
  faceCount: number;
  fingerprint: string;           // stableId('lens', width, height, faces)
  buffer: Uint32Array;           // topmost face index per pixel, or 0xFFFFFFFF
}

// LENS-HUD-v1 — what the HUD panel renders
interface LensHudPayload {
  face: LensFace | null;
  cell: {
    vx: number; vy: number; vz: number;
    materialId: number;
    materialName: string;        // resolved from material-registry.js
    qbitState: number;           // [0..1] energy
    energyType: string;          // STRUCTURAL | RADIANT | KINETIC | …
    occupancy: boolean;
  };
  screen: { mx: number; my: number };
}

// LENS-OP-v1 — Photonic Bridge operation class (mirrors QBIT-Voxel paper §3 Difficulty 8)
interface LensOp {
  kind: 'substrate-lens.hit-test';
  input:  { indexFingerprint: string; mx: number; my: number };
  output: { faceFingerprint: string | null };
  latencyClass: 'photonic-friendly';   // O(1) array read maps to matrix element access
  estimatedLatencyNs: number;          // ~2ns
  estimatedPowerPj: number;            // ~0.5pJ
}
```

#### 3.4 Hit-test algorithm (screen-space index approach)

```
buildFaceIndex(faces, width, height):
  1. Create offscreen <canvas> at (width, height), get 2d context.
  2. Allocate Uint32Array(width * height) filled with 0xFFFFFFFF.
  3. For each face f in faces (already sorted by sortKey ascending — painter's order):
     a. Encode face index `i` as RGBA: R = (i >> 16) & 0xFF, G = (i >> 8) & 0xFF, B = i & 0xFF, A = 0xFF.
     b. ctx.fillStyle = `rgba(R, G, B, 1)`.
     c. Translate canvas to face anchor (f.sx, f.sy), then fill the axis-aligned quad.
  4. Read back via ctx.getImageData(0, 0, width, height).data.
  5. Pack into Uint32Array (little-endian: R | G<<8 | B<<16 | A<<24).
  6. Return LensIndex.

hitTestFace(index, mx, my):
  if (mx < 0 || my < 0 || mx >= index.width || my >= index.height) return null;
  packed = index.buffer[my * index.width + mx];
  if (packed === 0xFFFFFFFF) return null;
  faceIndex = packed & 0x00FFFFFF;   // ignore alpha
  return faces[faceIndex] ?? null;
```

The painter's-order sort guarantees the last face painted at a pixel is the topmost visible face at that screen position — which is exactly the face a user expects to be "looking at" when their cursor is there.

### 4. Architecture diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│  DivWand Page (DivWandPage.jsx)                                     │
│                                                                     │
│  ┌────────────────────┐         ┌────────────────────┐              │
│  │ Inspector button   │         │ Substrate button   │  (new)       │
│  │ (existing)         │         │ (new toggle)       │              │
│  └─────────┬──────────┘         └─────────┬──────────┘              │
│            │                              │                         │
│            ▼                              ▼                         │
│  ┌────────────────────┐         ┌────────────────────┐              │
│  │  DOM Inspector HUD │         │  SubstrateLensHUD   │  (new)       │
│  │  (existing)        │         │  (new component)    │              │
│  └─────────┬──────────┘         └─────────┬──────────┘              │
│            │                              │                         │
│            │ onMouseOver/Move            │ onMouseMove (new)        │
│            ▼                              ▼                         │
│  ┌─────────────────────────────────────────────────────┐            │
│  │  VoxelScenePortal (existing)                        │            │
│  │  ┌─────────────────────────────────────────────┐    │            │
│  │  │  useMemo: runVoxelPipeline(...) → svgString │    │            │
│  │  │  NEW export: lensIndex (Uint32Array)         │    │            │
│  │  │  NEW export: faces (the source face array)  │    │            │
│  │  └─────────────────────────────────────────────┘    │            │
│  └─────────────────────────┬───────────────────────────┘            │
│                            │                                        │
│                            ▼                                        │
│  ┌─────────────────────────────────────────────────────┐            │
│  │  codex/core/pixelbrain/substrate-lens.js (new)      │            │
│  │  - buildFaceIndex(faces, w, h) → LensIndex          │            │
│  │  - hitTestFace(index, mx, my) → LensFace | null     │            │
│  │  - inverseProject(sx, sy, yHint) → voxel coord      │            │
│  └─────────────────────────────────────────────────────┘            │
│                            │                                        │
│                            ▼                                        │
│  ┌─────────────────────────────────────────────────────┐            │
│  │  codex/core/pixelbrain/iso-projector.js (extended) │            │
│  │  - makeFace() now also returns `polygon` + `normal` │            │
│  │  - additive only, no breaking change                │            │
│  └─────────────────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────────────┘
```

### 5. UI surface

The lens HUD mirrors the existing `dw-hud` (Inspector) styling. It sits in the same top-right position when the lens is active and a voxel face is hovered. Distinct from the regular Inspector: gold border becomes psychic-blue, the field labels change from "role/type/intent w/intent h" to "face/material/energy/gradient/occupancy/cell", and a small 3D voxel glyph (a single cube wireframe SVG, 16×16) appears next to the face type to communicate "you're looking at a 3D substrate, not a 2D layout."

Toggle button: identical treatment to the existing "Inspector" button in the header. Same `dw-btn` class. Same icon pattern. Different glyph: instead of the sliders icon, use a layered-stack glyph (three offset squares). Tooltip: "Toggle SubstrateLens (Alt+I)". Keyboard shortcut: `Alt+I` toggles the lens, mirroring `Ctrl+Enter` for register and `Ctrl+Shift+F` for format.

### 6. Relationship to existing systems

| System | Role in SubstrateLens | Change required |
|---|---|---|
| `iso-projector.js` | Source of face data; extended to include `polygon` and `normal` | Additive only |
| `material-registry.js` | Resolves `materialId` → `materialName` for the HUD | None — already exports `getMaterialById` |
| `voxel-volume.js` | Source of per-cell `qbitState`, `energyType`, `occupancy` | None — reads via existing accessors |
| `VoxelScenePortal.jsx` | New export: `lensIndex` and `faces` alongside `svgString` | Additive — same memo, extra values |
| `DivWandPage.jsx` | Hosts the lens toggle button and HUD; subscribes to portal's new exports | Additive — new `useState` + render branch |
| DOM Inspector | Sibling, not a replacement; both can be active | None |
| Photonic Bridge | Recognizes `LENS-OP-v1` as a photonic-friendly operation class | New operation class registration |
| Immunity system | New `lens-3d` rule group rejects non-axis-aligned face quads | New rule + registration |

### 7. Failure modes (lens-specific)

**Lens Failure 1 — Canvas tainted by CORS.** If the volume ever sources geometry from a cross-origin URL, `getImageData` will throw. Mitigation: the lens never sources geometry from URLs. The face array is generated in-process by `runVoxelPipeline`. If a future extension introduces URL-sourced geometry, the lens must catch the `SecurityError` and degrade to point-in-polygon hit-test (slower but works on tainted canvases).

**Lens Failure 2 — Face index overflow.** A 4K × 4K face index is 64MB. Most machines can hold it, but the buffer allocation may fail on constrained devices. Mitigation: lens caps at the wrapper div's actual dimensions, which are bounded by the DivWand preview-root (max 800×480 → 1.5MB). The immunity rule rejects any wrapper larger than 2048×2048 (16MB) with a `LENS-3D-OVERFLOW-*` loud failure.

**Lens Failure 3 — Sub-face SDF detail invisible to lens.** The lens hit-tests per face, not per SDF region. A face with high-frequency SDF detail (e.g., a chiseled rune on a wall) is shown as a single material in the HUD. Mitigation: the HUD displays the SDF descriptor's integer `emphasis` value as a read-only field, so the user knows detail exists even if the lens cannot point at it. Sub-face hit-test is a follow-up PDR.

**Lens Failure 4 — Painter's-order inversion at boundary pixels.** At the exact edge between two faces (e.g., a cliff face meeting a floor), the painter's algorithm can paint either face depending on floating-point rounding. The lens reports the topmost (last-painted) face. Mitigation: documented as expected behavior. The user can `Alt+scroll` (future) to toggle between topmost and frontmost face at cursor. Not in v1.

### 8. Implementation phases

**Phase 1 — Core (no UI):**
- Extend `iso-projector.js` `makeFace` to return `polygon` (3 vertices) and `normal` (3-vector). Update existing `voxel-svg-renderer.js` to use `polygon` instead of computing vertex positions ad hoc. Both are additive.
- Implement `codex/core/pixelbrain/substrate-lens.js` with `buildFaceIndex`, `hitTestFace`, `inverseProject`.
- Implement `tests/core/pixelbrain/substrate-lens.test.js` — golden file for `crystal-level1` face index byte-identity, round-trip test for `inverseProject`.
- Add `lens-3d` immunity rule group.

**Phase 2 — UI:**
- Implement `SubstrateLens.jsx` — React component that takes the `LensIndex` from the portal's `useMemo` and renders a `SubstrateLensHUD` overlay.
- Add "Substrate" toggle to `DivWandPage.jsx` header.
- Wire `Alt+I` keyboard shortcut.
- Visual baseline in `tests/visual/`.

**Phase 3 — Photonic Bridge integration:**
- Register `LENS-OP-v1` operation class in `codex/core/photonic/operation-registry.js`.
- Implement bridge grading: hit-test is `photonic-friendly`, estimated 2ns / 0.5pJ, Grade A expected.
- Update the Photonic Bridge telemetry panel to show lens operation count alongside QBIT propagation.

**Phase 4 — Sub-face hit-test (deferred):**
- When SDF descriptors gain per-region metadata (per the 2026-06-12 SDF PDR), extend the lens to hit-test sub-face regions using the descriptor's region index. Out of scope for v1.

### 9. Open questions

1. **Should the lens support click-to-pin?** A pinned face would let the user keep a cell's data visible while moving the mouse to compare neighbors. Cost: trivial. Use case: useful for analyzing material bleeding at biome boundaries. Recommend: include in v1 if implementation fits; defer to v1.1 if it adds > 4 hours.
2. **Should the lens HUD show the cell's energy gradient vector as a 3D arrow inside the panel?** Cost: ~30 lines (render a small SVG arrow). Use case: lets the user visualize `qbitGradient` directionally. Recommend: yes, include in v1.
3. **Should the lens work on the regular DOM Inspector's hover events, or fire its own?** Two listeners on the same wrapper can produce subtle ordering bugs. Recommend: lens fires its own listener; the DOM Inspector continues to use React's synthetic events. The two are independent and the wrapper div is the same. If race conditions appear in QA, debounce both to the same `requestAnimationFrame` tick.
4. **What happens when the user hovers a `voxel-scene` while the lens is *not* active?** Nothing. The lens is opt-in. The regular DOM Inspector still fires and shows the wrapper div dimensions. This is the correct behavior — the lens is a separate tool, not a permanent overlay.

### 10. Conclusion

SubstrateLens is the second inspector the QBIT-Voxel paper called for. It does not redesign the existing Inspector; it does not modify the QBIT pipeline; it does not change how the SVG renders. It adds a single, scoped consumer at the end of the pipeline that turns the rendered macrocosm back into inspectable microcosm. The blast radius is contained: one new core module, one new React component, one new header toggle, one new immunity rule. The lens is deterministic, byte-identical across rebuilds, non-destructive, and respects every existing law (reduced motion, cell wall, determinism).

The architectural cost is small. The payoff — being able to debug voxel compositions at the cell level instead of staring at a wrapper div — is the difference between an inspector that works and an inspector that pretends to work.

---

*Companion to the QBIT-Voxel Synthesis paper. Where Layer 4 makes the world visible, SubstrateLens makes the world legible.*
