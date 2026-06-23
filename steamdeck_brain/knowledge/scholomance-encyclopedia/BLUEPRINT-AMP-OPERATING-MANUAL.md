# Blueprint AMP — Operating Manual

**Bytecode Search Code:** `APOTH-ENC-BYKE-SEARCH-WP-BLUEPRINT-AMP`

**Classification:** White Paper — Tier 1 Engine Substrate
**Companion PDR:** [`PDR-2026-05-16-BLUEPRINT-AMP.md`](../PDR-archive/PDR-2026-05-16-BLUEPRINT-AMP.md)
**Companion Spec:** [`SPEC-BLUEPRINT-AMP-v1.md`](../tech-specs/SPEC-BLUEPRINT-AMP-v1.md)
**Companion PIR:** [`PIR-2026-05-16-BLUEPRINT-AMP.md`](../post-implementation-reports/PIR-2026-05-16-BLUEPRINT-AMP.md)
**Status:** Ratified — Phases A–E Inertial

**Audience:** Humans (developers extending the renderer, debugging deterministic regressions, adding processors) and AI agents (Claude in CLI, Claude over MCP, future autonomous processors). Both use the same APIs. The differences are in how they verify their work — humans look at PNGs; agents call `pixelbrain.preview` and vision-inspect base64.

---

## Invocation

Blueprint AMP is the foundational sketch layer of the PixelBrain renderer. It is not a feature. It is not optional infrastructure. It is the substrate every render now sits on.

Before Blueprint AMP, the lattice was authority: layouts declared slot positions, the lattice was generated, the renderer rasterized. Composition errors only surfaced as bad pixels. The sketch was implicit and could not be audited, diffed, or validated separately from the final image.

After Blueprint AMP, the **SketchArtifact** is authority. Every render begins with a deterministic vector artifact (golden-ratio sections, anchor points, sketch lines, optional resonance field) whose digest can be compared across runs in milliseconds. The lattice is derived from the sketch. The renderer rasterizes the lattice. CRT runs last. Anything an agent or human did to the renderer can be verified against the sketch first, the pixels second.

This document is the field manual. It assumes you have read the PDR (`PDR-2026-05-16-BLUEPRINT-AMP.md`). The PDR is the constitution. This is the techniques manual — how to invoke, how to debug, how to extend, and the invariants that separate a working sketch from a broken one.

---

## Mental Model

### The pipeline

```
layoutId + paletteId + options
  └── runBlueprintAmp(layoutSeed)             [PHASE A]
       └── SketchArtifact { sections, anchors, sketch, depthField, resonance, digest }
            └── deriveLattice(sketch, paletteId)
                 └── Lattice (cells carry depth)
                      └── renderScene(scene, { renderMode, ... })   [PHASE B]
                           ├── flat mode: pixel coords scaled into canvas
                           └── iso mode:  projectIso applied per coord, painters z-sort
                                └── styleCRT final pass
                                     └── PNG buffer
```

### The four artifacts you will encounter

| Artifact | Lives in | Lifetime | Mutable? |
|---|---|---|---|
| **SketchArtifact** | `scene.sketch` (and returned standalone from `runBlueprintAmp`) | Per render request | No (frozen post-digest) |
| **Lattice** | `scene.lattice` | Per render request | Cell `depth` is the only field Blueprint AMP injects |
| **Render buffer** | `result.buffer` (PNG bytes) | Per render call | No |
| **CoordBuffer** | Worker boundary only | Per worker dispatch | No (transferred, not shared) |

### Why sketch-first matters

1. **Compositional correctness becomes checkable before pixels.** Two SketchArtifacts with identical digests are guaranteed to produce identical pixels (for fixed render options). Two SketchArtifacts with different digests will produce different pixels — but the *diff at the sketch level* is human-readable in milliseconds where the pixel diff requires loading two images.
2. **Iso mode is free.** Depth lives on the sketch. Iso projection is a coord transform applied at the renderer. No separate iso lattice, no separate iso layout.
3. **MCP preview becomes deterministic.** Agents calling `pixelbrain.preview` with identical args get identical digests. The preview cache can short-circuit on digest match. The PNG is a function of the sketch + render options.
4. **WebWorkers become trivial.** Pure processors (verified by `core/processor-contract.js`) can run in workers without refactor. The audit at `PURITY-AUDIT-2026-05-16.md` confirms all 14 shipping processors pass.
5. **Real TurboQuant is a swap, not a rewrite.** The shim → real-field transition changes a single function call site behind an env flag. The SketchArtifact shape does not change.

---

## Core Stats — Substrate Dimensions

Every SketchArtifact has a measurable stat profile. These are not metaphors. They determine whether the sketch passes downstream gates.

### Primary Attributes

| Attribute | Symbol | Range | Meaning |
|---|---|---|---|
| **Recursion Depth** | `RecDp` | 1–5 | Golden-section subdivision tree depth. 1 = root + 2 children. 5 = root + 62 leaves. Default 4. |
| **Section Count** | `SecN` | 3–63 | Total sections at the given recursion depth: `2^(d+1) - 1`. |
| **Anchor Count** | `AncN` | 0–~64 typical | One anchor per layout slot, pre-symmetry. Default layouts ship 4–18. |
| **Sketch Line Count** | `LnN` | sections + anchors + categories | Section edges + anchor crosses + flow lines per category. Tall organic cabinet at depth 4 = 31 + 18 + ~5 = ~54 lines. |
| **Depth Range** | `DpRng` | [0, 1] | Anchor depth in unit space. Glowing reaches 1.0, scrolls 0.0. |
| **Digest** | `Digest` | sha256 hex | The single source of truth for "did anything change." 64 chars. |
| **Resonance Source** | `ResSrc` | `null` \| `shim` \| `turboquant-v1` | Provider of the resonance field. `null` when `useTurboQuant: false`. |

### Render-mode Attributes

| Attribute | Symbol | Range | Meaning |
|---|---|---|---|
| **Render Mode** | `Mode` | `flat` \| `iso` | Flat is the default. Iso applies depth as upward lift. |
| **Iso Depth Scale** | `DScale` | px > 0 | Pixels of upward lift per unit depth. Default `cellSize * 0.5`. |
| **Projected Bounds** | `PBnd` | computed | In iso, the bounding box of the projected lattice including max depth-lift. |
| **Z-sort Key** | `ZKey` | mode-dependent | Flat: category Z (or `cell.z` override). Iso: projected Y of cell base (painters). |

### Phase D — Worker Substrate Attributes

| Attribute | Symbol | Range | Meaning |
|---|---|---|---|
| **Coord Stride** | `Stride` | 4 (fixed) | Float32 components per coord: `[x, y, depth, emphasis]` |
| **Coord Count** | `CCnt` | 0–~10⁵ | Per packed buffer |
| **Purity Verdict** | `Pur` | pass \| fail | Per processor, from `core/processor-contract.js#isPure` |

### Derived Stats

| Stat | Formula | Notes |
|---|---|---|
| **Sketch Density** | `LnN / (RecDp × AncN)` | Higher = more debug detail relative to anchor count |
| **Anchor Coverage** | `AncN / max_anchors_for(layout)` | Should be 1.0 after Phase A (one-to-one with slots) |
| **Digest Stability** | `n_runs_with_same_digest / total_runs` | Must be 1.0 |
| **Iso Bounds Expansion** | `PBnd.width × PBnd.height / (lattice.w × lattice.h)` | Roughly 0.8–1.2 for typical cabinets |

---

## Three Invocation Forms

The substrate accepts three forms of address.

### Form 1: Default — `composeApothecaryScene`

The canonical path. The adapter routes through Blueprint AMP automatically.

```js
import { composeApothecaryScene } from './adapters/apothecary.adapter.js';
import { renderScene }            from './adapters/poster-renderer.js';

const scene = await composeApothecaryScene({
  layoutId: 'tall-organic-cabinet',
  paletteId: 'cosmic-herbal',
  // Optional Blueprint AMP knobs:
  seed:           1234,    // determinism seed (default: hash(layoutId))
  recursionDepth: 4,       // golden-section depth (default: 4, range 1–5)
  useTurboQuant:  false,   // sample resonance field per anchor (default: false)
});

console.log('sketch digest:', scene.sketch.digest);
console.log('lattice cells:', scene.lattice.cells.size);

const rendered = await renderScene(scene, {
  scaledSize: 512,
  applyCrt:   true,
  renderMode: 'flat',      // 'flat' | 'iso'
  isoDepthScale: undefined // px per depth unit, defaults to cellSize * 0.5
});
fs.writeFileSync('out.png', rendered.buffer);
```

`scene.sketch` is the full SketchArtifact. Inspect it freely; it is read-only after `runBlueprintAmp` returns.

### Form 2: Direct — `runBlueprintAmp` + `deriveLattice`

For pipelines that want explicit control over the sketch (e.g., diffing two sketches before rendering, batching renders, exporting sketch JSON for offline inspection).

```js
import { readFile } from 'node:fs/promises';
import { runBlueprintAmp } from './core/blueprint-amp.js';
import { deriveLattice }   from './adapters/blueprint-to-lattice.js';
import { renderScene }     from './adapters/poster-renderer.js';

const layouts = JSON.parse(await readFile('presets/cabinet-layouts.json', 'utf8')).layouts;
const layoutSeed = layouts.find(l => l.id === 'wide-low-cabinet');

const sketch = runBlueprintAmp({ layoutSeed, seed: 7, recursionDepth: 4 });
const scene  = await deriveLattice(sketch, 'cosmic-herbal');
const out    = await renderScene(scene, { scaledSize: 256 });
```

`deriveLattice` is async because it loads `prop-catalog.json` + `composition-rules.json` on first call (cached afterward). `runBlueprintAmp` is sync and pure.

### Form 3: MCP Preview — `pixelbrain.preview`

For agents (Claude over MCP, automation scripts). Requires `npm --prefix ui run dev` running so the Vite plugin's HTTP endpoints are live at `http://localhost:5173/__pixelbrain__/`.

```js
// Agent-side (from a Claude Code tool call):
const result = await callTool('pixelbrain.preview', {
  layout:     'tall-organic-cabinet',
  palette:    'cosmic-herbal',
  size:       512,
  renderMode: 'iso',
  timeMs:     0,
});
// result.png   — base64 PNG (vision-inspectable by Claude)
// result.digest — sha256 of the underlying SketchArtifact
// result.latencyMs — server-side render time
```

`pixelbrain.diff({ digestA, digestB })` short-circuits the "did the sketch change" question with zero pixel comparison.

`pixelbrain.list_layouts()` returns the catalog so an agent can discover available layouts without reading JSON.

---

## Anatomy of a SketchArtifact

A complete example for `tall-organic-cabinet` (abbreviated):

```jsonc
{
  "schemaVersion": "blueprint.v1",
  "generatedAt": 0,                     // intentionally 0 for digest stability
  "seed": 2166136261,                   // hash("tall-organic-cabinet")
  "layoutId": "tall-organic-cabinet",
  "cellSize": 8,
  "bounds": { "width": 128, "height": 192 },
  "sections": {
    "phi": 1.6180339887498949,
    "rootAxis": "vertical",
    "recursionDepth": 4,
    "sections": [
      { "id": "root", "rect": {...}, "parentId": null, "depth": 0, "depthBand": 0, "role": "cabinet" },
      { "id": "root.major", "rect": {...}, "parentId": "root", "depth": 1, "depthBand": 0.25, "role": "frame" },
      { "id": "root.minor", ... },
      // ... 31 sections total at recursionDepth=4
    ]
  },
  "anchors": [
    {
      "id": "anchor-root.minor-0",
      "x": 12, "y": 36,
      "depth": 0.2,                     // CATEGORY_DEPTH.jars
      "preferredCategory": "jars",
      "sectionId": "root.minor",
      "resonance": 0.5                  // 0.5 when useTurboQuant:false
    },
    // ... one per slot
  ],
  "sketch": [
    { "id": "section-edge-root", "kind": "section-edge", "points": [...], "weight": 1, "source": "section" },
    { "id": "anchor-cross-anchor-root.minor-0", "kind": "anchor-cross", "points": [...], "weight": 0.75, "source": "anchor" },
    { "id": "flow-jars", "kind": "flow", "points": [...], "weight": 0.3, "source": "section" },
    // ...
  ],
  "depthField": {
    "sections": [
      { "rect": {...}, "depth": 1.0 },  // sorted deepest-first
      ...
    ]
  },
  "resonance": null,                    // or { source, cachedAt, samples } when useTurboQuant:true
  "digest": "a3b8c9e2f1d4..."           // sha256 over the rest, with canonical key order
}
```

### Field-by-field semantics

| Field | Authoritative? | Mutable? | Notes |
|---|---|---|---|
| `schemaVersion` | yes | no | Bump on any breaking SketchArtifact change |
| `generatedAt` | no (fixed to 0) | no | Wall-clock timestamps break digests; sketch artifact intentionally drops them |
| `seed` | yes | no | The determinism axis. Same `seed` + `layoutSeed` → same digest, every machine, every Node version |
| `layoutId` | yes | no | Identifies the source layout |
| `cellSize` | yes | no | Pixel size of a lattice cell |
| `bounds` | yes | no | Pixel bounds of the lattice — `cols × cellSize, rows × cellSize` |
| `sections.sections[]` | yes | no | Flat list of section nodes; first is `root` (depth 0), then breadth-first |
| `anchors[]` | yes | no | One per layout slot in Phase A. Order is preserved from `layoutSeed.slots` |
| `sketch[]` | descriptive | no | Vector lines for debug/preview. Removing them does not change rendering output. |
| `depthField.sections[]` | yes (when iso renders) | no | Sorted deepest-first for O(N) point-in-rect lookup |
| `resonance` | yes (when `useTurboQuant`) | no | `null` when `useTurboQuant: false`. `{ source, cachedAt, samples }` otherwise. |
| `digest` | computed | no | `sha256(canonicalStringify(artifact_without_digest))`. The contract |

### What changes the digest

A digest change means the sketch is logically different from any previous sketch with the same `seed`. The following ARE in the digest:

- `seed`, `layoutId`, `cellSize`, `bounds`
- Every `section.rect`, `depth`, `role`
- Every `anchor.x`, `y`, `depth`, `preferredCategory`, `sectionId`, `resonance`
- Every `sketch[].points`, `weight`, `kind`, `source`
- `depthField.sections`
- `resonance.source` and `resonance.samples` (if present)

The following are NOT in the digest (they would corrupt determinism):

- `generatedAt` (fixed to 0)
- `resonance.cachedAt` (per-run wall-clock)
- The `digest` field itself (excluded by `digestArtifact` before hashing)

### What does NOT change the digest but DOES change the rendered PNG

- `paletteId` (sketch is palette-agnostic; palette is applied by `deriveLattice`)
- `renderMode` (`flat` vs `iso`)
- `scaledSize`
- `applyCrt`
- `time`

This is why two MCP preview calls with different palettes but otherwise identical args produce different PNGs but the same digest. Verified by test (`tests/integration/mcp-preview.test.mjs`: "different palette → same digest").

---

## Golden Section Substrate

### The subdivision algorithm

`subdivideGoldenSections(bounds, recursionDepth, rootAxis)` in `core/golden-sections.js`. Pure function. Tested in `tests/blueprint-amp.test.mjs`.

At each depth `d`, every leaf at depth `d-1` is split in two along the axis `rootAxis if d odd else flip(rootAxis)`. The major child gets `1/φ` of the dimension; the minor child gets the remainder (`1 - 1/φ ≈ 0.382`). This produces nested golden rectangles that visually anchor composition where the eye expects mass.

### Section role assignment

Heuristic, deterministic, runs after every split:

| Position in tree | Inferred role |
|---|---|
| `root` (the outermost rect) | `cabinet` |
| `.major` child at vertical cut | `shelf` |
| `.minor` child at horizontal cut | `frame` |
| Depth ≥ 2 `.minor` in bottom half | `label-strip` |
| Depth ≥ 2 `.major` in top half | `glow-band` |
| Depth ≥ 3 center band | `symbol-field` |
| Otherwise | `frame` |

The role is informational in Phase A — it does not currently drive anchor placement (anchors come from the layout's slot positions). Phase F (a future PDR) may use the role to relocate anchors via section snapping, at which point the heuristic becomes load-bearing.

### Depth band

`section.depthBand = section.depth / recursionDepth`. Root is `0`. Deepest leaves are `1`. Used by:

- Sketch-line weight (deeper = thinner)
- Anchor depth fallback (`depth = max(CATEGORY_DEPTH[category], section.depthBand × 0.5)`)
- `DepthField.sample(x, y)` (deepest-matching-rect lookup)

---

## Anchor Placement

Phase A: **one anchor per layout slot, pinned to slot cell center.** This guarantees the 27-case integration suite remains regression-clean and budget validation continues to pass. Future phases may relocate anchors to golden-section snap targets.

For each slot:

```js
const cx = slot.col * cellSize + cellSize / 2;
const cy = slot.row * cellSize + cellSize / 2;
const section = sectionForPoint(sectionGrid.sections, cx, cy); // deepest match wins
const categoryDepth = CATEGORY_DEPTH[slot.category] ?? 0.5;
const depth = Math.max(categoryDepth, section.depthBand * 0.5);
```

### `CATEGORY_DEPTH`

| Category | Depth | Iso visual |
|---|---|---|
| `scrolls` | 0.0 | flat on shelf |
| `jars` | 0.2 | slight lift |
| `herbs` | 0.4 | mid-lift |
| `mushrooms` | 0.6 | further up |
| `symbols` | 0.8 | nearly tall |
| `glowing` | 1.0 | maximum lift |

These map to `cell.depth` in the lattice. In iso mode, `projectIso` subtracts `depth × isoDepthScale` from the projected y, lifting depth values toward the top of the canvas.

---

## Iso Projection

Pure function in `core/iso-projection.js`:

```js
export function projectIso(point, cellSize, depthScale) {
  const d = point.depth ?? 0;
  return {
    x: (point.x - point.y) * 0.5 + cellSize * 2,
    y: (point.x + point.y) * 0.25 - d * depthScale,
  };
}
```

Two shear coefficients (X: 0.5, Y: 0.25) produce the classic 2:1 isometric ratio. Depth lifts toward smaller y. Origin nudged right by `cellSize * 2` so the lattice's `(0,0)` corner does not sit at the canvas edge.

### When iso engages

- `renderScene(scene, { renderMode: 'iso' })`
- CLI `--render-mode iso [--depth-scale N]`
- MCP `pixelbrain.preview({ renderMode: 'iso' })`

### What changes in iso mode

1. `computeIsoBounds(lattice, cellSize, depthScale, maxDepth)` replaces the flat `(latticeW, latticeH)` bounds. The projected bounds are wider than tall (~2:1) and include the max depth-lift at the top.
2. The cabinet renders as a parallelogram (`isoCabinetCorners`) instead of a rectangle.
3. Z-sort flips from category Z to **painters-algorithm by projected base Y** (`projectedYBase`). This ignores depth lift; sorting uses where the cell would sit on the floor plane.
4. Every formula coord is transformed through `projectIso` with the cell's `depth` before rasterization.

### What does NOT change in iso mode

- Flat-mode output is byte-identical to Phase A's output (verified by integration suite regression).
- Sketch digest is render-mode-agnostic (sketches are pre-render).
- `validateNoModernity` continues to sample the rasterized output the same way.

---

## MCP Preview Loop

The Vite plugin at `ui/vite-plugins/pixelbrain-preview.js` is the rendering authority. The MCP shim at `services/mcp-pixelbrain-server.js` is a thin stdio JSON-RPC transport that proxies to the plugin's HTTP endpoints.

### HTTP endpoints

| Method | Path | Body | Returns |
|---|---|---|---|
| `GET` | `/__pixelbrain__/` | — | HTML preview pane (vanilla `<canvas>` + HMR ws listener) |
| `POST` | `/__pixelbrain__/render` | `{ layout?, palette?, size?, renderMode?, isoDepthScale?, timeMs? }` | `{ png, layout, palette, size, renderMode, timeMs, digest, latencyMs }` |
| `POST` | `/__pixelbrain__/diff` | `{ digestA, digestB }` | `{ digestsMatch, digestA, digestB }` |
| `GET` | `/__pixelbrain__/layouts` | — | `[{ id, name, cols, rows }]` |
| `GET` | `/__pixelbrain__/last` | — | last broadcast payload (or `{ png: null }`) |

### HMR WebSocket events

Sent by the plugin, listened to by the browser pane and any subscribing client:

| Event | Payload | When |
|---|---|---|
| `pixelbrain:render` | full payload (png, digest, latencyMs, …) | After every successful re-render (debounced) |
| `pixelbrain:error` | `{ message }` | On render failure; pane displays last good render with red strip |

### Configure as a Claude Code MCP server

```json
{
  "mcpServers": {
    "pixelbrain": {
      "command": "node",
      "args": ["services/mcp-pixelbrain-server.js"],
      "env": { "PIXELBRAIN_HOST": "http://localhost:5173" }
    }
  }
}
```

Restart Claude Code. Then `pixelbrain.preview`, `pixelbrain.diff`, `pixelbrain.list_layouts` become available. The plugin must be running (`npm --prefix ui run dev`).

### Watch paths

Default: `presets/`, `core/`, `adapters/`. Override at registration:

```ts
pixelbrainPreview({
  watch: ['presets', 'core', 'adapters', 'docs/reference'],
  debounceMs: 200,
  layout: 'wide-low-cabinet',
  palette: 'earth-dead',
  size: 256,
  renderMode: 'iso',
})
```

### Determinism in the loop

Every `/__pixelbrain__/render` response carries the sketch digest. An agent that has rendered `(layout, palette, size, renderMode)` once can call `pixelbrain.diff` with the cached digest and the new digest to short-circuit redundant work. The contract is enforced by `tests/integration/mcp-preview.test.mjs`: identical args → identical digests.

---

## WebWorker Substrate

### When to use the bridge

- Multi-frame export workloads where the main thread should stay responsive
- Future APNG/GIF emitters that batch many renders
- Any workload that benefits from `OffscreenCanvas` parallelism

### When NOT to use it

- Single-frame renders called from a CLI (the worker setup cost exceeds the render cost for small workloads)
- Anywhere outside a browser context (Node has no `OffscreenCanvas`)

### Coord packing

```js
import { packCoords, unpackCoords } from './core/coord-buffer.js';

const buf = packCoords([
  { x: 10, y: 20, depth: 0.2, emphasis: 0.85 },
  { x: 30, y: 40, depth: 0.2, emphasis: 0.85 },
]);
// buf.data is Float32Array of length 8 (stride 4)
// transfer via: worker.postMessage({ buf }, [buf.data.buffer])
```

### Worker protocol

```js
// to worker:
self.postMessage({
  type: 'render',
  payload: {
    canvas:         offscreenCanvas,        // transferred
    size:           512,
    bgColor:        '#2D1B4E',
    cabinetColor:   '#3E2723',
    cabinetBounds:  { x: 20, y: 20, w: 216, h: 216 },
    ops: [
      { kind: 'polygon', coords: float32, count, stride, fillStyle, emphasis },
      { kind: 'scatter', coords: float32, count, stride, fillStyle, emphasis, dotSize },
      { kind: 'glow',    coords: float32, count, stride, fillStyle, emphasis, glowColor, bloomRadius },
    ],
  }
}, [offscreenCanvas, ...op_buffer_transferables]);

// from worker:
{ type: 'rendered', bitmap: ImageBitmap, latencyMs: number }
{ type: 'error',    message: string, stack: string }
```

### Bridge usage

```js
import { createWorkerBridge } from '../../src/lib/worker-bridge.js';

const bridge = createWorkerBridge();
const { bitmap, latencyMs } = await bridge.render({
  size: 512,
  bgColor: '#000',
  ops: [...],
});
mainCanvasCtx.drawImage(bitmap, 0, 0);
bridge.dispose(); // when done
```

### Processor purity contract

Any new processor under `core/modulation/processors/` should pass `isPure(processor)`. The test in `tests/coord-buffer.test.mjs` enforces this for the 14 shipping processors. Add new ones to the import list.

```js
import { isPure } from './core/processor-contract.js';

isPure({
  id: 'my-processor.v1',
  version: '1.0.0',
  accepts: ['frame-state'],
  emits: ['frame-state'],
  determinism: 'pure',         // or 'seeded'
  run(input, ctx) { ... }
});
// → { ok: true } or { ok: false, reason: '...' }
```

### Realistic performance ceiling (recorded honestly)

| Optimization | Realistic gain |
|---|---|
| Parallel processors (6-core) | 3–5× |
| Transferable buffers vs structured clone | 1.5–2× on hot path |
| OffscreenCanvas (off-main-thread) | 0 raw fps gain, **eliminates UI jank** |
| WASM SIMD (e.g. Sierpinski subdivide) | 2–4× on that evaluator |
| **Combined ceiling** | **~8–12×** for the right workload |

The 20× number that was originally scoped is aspirational. Phase D's PDR gate is ≥4× on multi-frame APNG (currently unmeasurable because APNG export doesn't exist yet). The qualitative gate — "main-thread frame time during render ≤ 5ms" — stands regardless.

---

## TurboQuant Field

### What it provides

```ts
interface TurboQuantField {
  source: 'turboquant-v1';
  seed: number;
  measureAt(x: number, y: number): {
    strength: number;        // [0, 1] — two-octave Perlin
    vectorSum: number;       // [0, 1] — single-octave Perlin
    semanticWeight: number;  // [0, 1] — smoothest Perlin
  };
}
```

Three independent Perlin permutations seeded off the user-provided `seed`. Multi-octave on `strength` gives it visible peaks; single-octave on the others gives them smoother gradients. All three outputs are clamped to `[0, 1]` (Perlin is roughly `[-1, 1]` raw).

### Construct + sample

```js
import { createTurboQuantField } from './core/turboquant/field.js';

const field = createTurboQuantField(42);
const { strength, vectorSum, semanticWeight } = field.measureAt(100, 200);
```

`measureAt` is pure and synchronous (the legacy `turboQuantShim.measureAt` was async; the real field is not). The hero adapter wraps it in `async (x, y) => field.measureAt(x, y)` for protocol compatibility.

### Feature flag

```bash
FEATURE_TURBOQUANT_REAL=1 node adapters/cli.js ...
```

| Flag | `useTurboQuant: true` | `useTurboQuant: false` |
|---|---|---|
| `=1` | `resonance.source = 'turboquant-v1'`, Perlin field | `resonance = null` |
| unset / `=0` | `resonance.source = 'shim'`, sin-hash | `resonance = null` |

The shim path is byte-identical across flag states (proven by test: `useTurboQuant: false digest unaffected by flag`).

### Spatial coherence test

`tests/turboquant-field.test.mjs` enforces that adjacent-sample deltas are less than half the magnitude of far-sample deltas. Random/white noise would fail this. Perlin passes.

---

## Determinism Contract

The substrate guarantees the following for fixed inputs:

| Layer | Same input → same output? |
|---|---|
| `runBlueprintAmp({ layoutSeed, seed, recursionDepth, useTurboQuant })` | Byte-identical SketchArtifact. Same `digest`. |
| `deriveLattice(sketch, paletteId)` | Same cell count, same `(col, row)` keys, same `cell.depth` per cell. |
| `renderScene(scene, { scaledSize, applyCrt, time, renderMode, isoDepthScale })` | Same PNG bytes (when all options match). |
| `pixelbrain.preview(args)` over MCP | Same `digest` for same `args` (palette/renderMode etc. affect pixels but not digest). |

Things that BREAK determinism (do not introduce):

- `Date.now()`, `performance.now()`, `Math.random()` in the SketchArtifact or render pipeline
- Module-level `let`/`var` that mutates across calls
- Filesystem reads inside the render path (read at module init, not per render)
- Network requests during render
- Iteration over `Map`/`Set` without sorting first (insertion order is "deterministic" but version-fragile)

Things that are SAFE:

- `performance.now()` in *diagnostics* that are not in the digest
- Module-level `const` (including frozen objects)
- Per-render `Map` / cache passed via `ctx`
- Reading process.env at module top level (env is a constant for the run)

---

## Diagnostics + Debugging Recipes

### "The render looks wrong — where do I start?"

1. **Get the digest.** `console.log(scene.sketch.digest)`. Re-run. Same digest? Then the change is downstream of the sketch (palette, renderer, CRT). Different digest? The change is upstream.
2. **Render flat mode.** Iso adds projection; rule it out first. `--render-mode flat` should match Phase A's output exactly. If not, the bug is in the renderer's flat path (rare; gated by integration suite).
3. **Inspect the sketch.** `console.log(JSON.stringify(scene.sketch.sections, null, 2))`. Sections should fully tile the bounds. Anchors should all be inside their declared `sectionId`.
4. **Inspect cell depth.** `scene.lattice.cells.forEach(c => console.log(c.col, c.row, c.depth))`. Every cell should have a `depth` ∈ `[0, 1]`.

### "MCP preview is stale / not updating"

1. Check `npm --prefix ui run dev` is running and you have no other process bound to port 5173.
2. Hit `http://localhost:5173/__pixelbrain__/last` — returns the last broadcast payload. If `png: null`, the plugin hasn't rendered yet (initial render is fire-and-forget; check stderr for `[pixelbrain] render failed: ...`).
3. The plugin watches `presets/`, `core/`, `adapters/` by default. Edits outside those paths do not trigger re-renders. Adjust `watch` in `vite.config.ts` if needed.
4. Debounce is 150ms; rapid edits coalesce trailing-edge.

### "Two sketches with same inputs have different digests"

This should be impossible. If it happens:
1. Confirm both are reading the same `cabinet-layouts.json`. The plugin caches; if you edited the layout and the plugin still has the old cache, restart `npm run dev`.
2. Check that `generatedAt` is `0` in both artifacts. If it's not, the canonicalizer is wrong.
3. Check `process.env.FEATURE_TURBOQUANT_REAL` — same value across both runs?
4. Open an issue with both artifacts attached.

### "Iso mode renders flat-mode output"

`renderMode` is a string. `'iso'` lowercase. Other values fall through to flat. Verify:

```js
const result = await renderScene(scene, { renderMode: 'iso' });
// In adapters/poster-renderer.js, search for: renderMode === 'iso'
```

### "Worker won't accept ops"

The `coords` field in each op must be a `Float32Array`. If you serialize through JSON anywhere (e.g., via the MCP transport), they round-trip as regular arrays — re-wrap with `new Float32Array(plainArray)` before passing into `worker.postMessage`.

### Sanity script

```js
import { runBlueprintAmp } from './core/blueprint-amp.js';
import { validateArtifact } from './core/sketch-artifact.js';
import layouts from './presets/cabinet-layouts.json' assert { type: 'json' };

for (const layout of layouts.layouts) {
  const a = runBlueprintAmp({ layoutSeed: layout });
  const v = validateArtifact(a);
  console.log(`${layout.id}: ${v.ok ? 'OK' : 'FAIL'} digest=${a.digest.slice(0,8)} anchors=${a.anchors.length}`);
}
```

---

## Extending the Substrate

### Adding a new layout

1. Add an entry to `presets/cabinet-layouts.json` with `id, cols, rows, cellSize, slots: [{col, row, category}]`.
2. Run `node tests/integration/full-pipeline.mjs` — the suite picks up new layouts automatically via the loader.
3. The sketch digest for the new layout is determined automatically by `hashString(layout.id)`.

### Adding a new palette

1. Edit `core/color-apothecary-presets.js`. Add to `APOTHACARIUM_PRESETS` keyed by id.
2. Provide `colors[]` and `use: { bg, herbs, glow, accent, labels, cabinet, borders }` index map.
3. The Blueprint AMP path is palette-agnostic — your palette appears wherever the layout × palette combinatorial is rendered. Sketch digest is unaffected.

### Adding a new prop category

This is more involved. Required edits:

1. `presets/prop-catalog.json` — add the category with `occupancy`, `colorUse`, `emphasis`, `budget`.
2. `presets/prop-formulas.json` — add a default formula entry.
3. `core/blueprint-amp.js` — add to `CATEGORY_DEPTH` (controls iso lift).
4. `adapters/poster-renderer.js` — add to `CATEGORY_Z` (controls flat z-order).
5. If the formula type is novel, add a new `evaluate*` to `core/formula-to-coordinates.js`.
6. Add the new layout slot category to a layout and verify.

### Adding a new processor (with worker safety)

1. Author the processor with the required fields: `id`, `version`, `accepts: string[]`, `emits: string[]`, `determinism: 'pure' | 'seeded'`, `run(input, ctx)`.
2. **No module-level `let`.** Use `const` only at module scope. Per-call state goes in `ctx.cache` (a `Map`).
3. **No `Date.now()`, `Math.random()` in the frame body.** OK in diagnostic provenance entries.
4. Import the processor in `tests/coord-buffer.test.mjs` and add it to the `ALL` map. The test will fail loudly if your processor violates the contract.

### Adding a new sketch line kind

Currently five kinds: `section-edge`, `anchor-cross`, `flow`, `depth-tick`, `symmetry-axis`. To add a sixth:

1. Update `SketchLine.kind` enum in `SPEC-BLUEPRINT-AMP-v1.md` §1.5.
2. Emit it from `buildSketchLines` in `core/blueprint-amp.js`.
3. Existing readers (browser preview pane, future visualizers) silently ignore unknown kinds — backward-compatible.

This requires a new PDR per PDR §12 ("This PDR forbids `SketchLine.kind` beyond the five listed values; new kinds require a new PDR").

---

## Hard Rules & Invariants

These are the constraints the substrate enforces. Violations are bugs, not features.

1. **The sketch is authoritative.** Never bypass `runBlueprintAmp` to inject ad-hoc anchors. Use the legacy path (`composeApothecaryScene({ legacy: true })`) only for parity verification; do not ship code that depends on the legacy path being reachable.
2. **The digest is sha256 of canonical-key-sorted JSON.** Never compute a digest with raw `JSON.stringify` — Node's iteration order is not portable. Always go through `canonicalStringify` from `core/sketch-artifact.js`.
3. **Anchors must fall inside their declared section rect.** Enforced by `tests/blueprint-amp.test.mjs`. If you relocate anchors, update both fields atomically.
4. **`cell.depth ∈ [0, 1]`.** Iso projection assumes this range; values outside it lift cells off-canvas.
5. **Flat-mode output is sacrosanct.** Any change to the renderer that affects flat-mode output is a regression unless explicitly documented. The 27-case integration suite catches it.
6. **Processors with `determinism: 'pure'` produce identical output for identical input.** Enforced structurally by `isPure`. Authors are responsible for runtime adherence.
7. **MCP preview tools are deterministic.** `pixelbrain.preview` with identical args MUST return identical digests. Enforced by `tests/integration/mcp-preview.test.mjs`.
8. **`FEATURE_TURBOQUANT_REAL` only affects `useTurboQuant: true` callsites.** When `useTurboQuant: false`, the flag is a no-op. Enforced by test.
9. **Worker render output equals main-thread render output.** Asserted as a future browser-side gate (Phase D §11). Currently smoke-tested at module-structure level.
10. **Sketch JSON is round-trippable.** Serialize → parse → re-serialize → identical bytes. The canonicalizer guarantees this. Useful for offline sketch diffing.

---

## Two End-to-End Recipes

### Recipe A — Human: render two iso variants and compare

```bash
node adapters/cli.js --layout tall-organic-cabinet --palette cosmic-herbal \
  --size 512 --render-mode iso --depth-scale 4 \
  --out output/iso-depth4.png

node adapters/cli.js --layout tall-organic-cabinet --palette cosmic-herbal \
  --size 512 --render-mode iso --depth-scale 8 \
  --out output/iso-depth8.png

# Sketch digests should be identical (depth-scale is a render-time option,
# not in the sketch). Pixels differ.
```

### Recipe B — Agent: iterate on a layout until anchors land in expected sections

```ts
async function iterate(layoutId) {
  let attempts = 0;
  while (attempts++ < 5) {
    const result = await callTool('pixelbrain.preview', { layout: layoutId, palette: 'cosmic-herbal', size: 256 });
    const sketch = JSON.parse(result.png_meta_sketch ?? '{}'); // future: surface sketch via tool
    const ok = sketch.anchors?.every(a => sketch.sections.sections.find(s => s.id === a.sectionId));
    if (ok) return result;
    // Edit the layout JSON or change a preset, then loop.
  }
}
```

(Sketch is not yet surfaced through the MCP tool response; Phase F task.)

---

## Cross-references

- PDR: [`PDR-2026-05-16-BLUEPRINT-AMP.md`](../PDR-archive/PDR-2026-05-16-BLUEPRINT-AMP.md) — the constitution
- Spec: [`SPEC-BLUEPRINT-AMP-v1.md`](../tech-specs/SPEC-BLUEPRINT-AMP-v1.md) — the contracts
- PIR: [`PIR-2026-05-16-BLUEPRINT-AMP.md`](../post-implementation-reports/PIR-2026-05-16-BLUEPRINT-AMP.md) — what shipped vs what was planned
- Purity Audit: [`PURITY-AUDIT-2026-05-16.md`](../post-implementation-reports/PURITY-AUDIT-2026-05-16.md) — per-processor verdict
- Operating Manual (Modulation Bus): [`PIXELBRAIN-MODULATION-BUS-OPERATING-MANUAL.md`](./PIXELBRAIN-MODULATION-BUS-OPERATING-MANUAL.md) — sister manual for the downstream Bus
- LAW: [`Apothacarium LAW/README.md`](../Apothacarium%20LAW/README.md) — no-modernity, prop budget, palette constraint, CRT mandate

---

*Filed 2026-05-16. Manual will be updated as Phase F and subsequent PDRs land.*
