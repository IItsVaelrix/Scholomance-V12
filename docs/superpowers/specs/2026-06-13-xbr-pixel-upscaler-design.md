# xBR 2× Pixel Art Upscaler — Design Spec

**Date:** 2026-06-13  
**Status:** Approved  
**Scope:** PNG spritesheet output only. SVG renderer and all AMP logic unchanged.

---

## Goal

Replace the current nearest-neighbor 4× rasterization in `character-foundry.js` with two passes of xBR 2×, producing the same 128×192 PNG output dimensions at significantly higher visual quality. Diagonal staircase edges smooth out; horizontal/vertical lines stay perfectly sharp. No downstream changes required.

---

## Architecture

### New file: `codex/core/pixelbrain/pixel-scale-amp.js`

Pure function module. No imports from the rest of the pipeline.

```js
export function applyXBR2x(rgba, width, height) → Uint8Array
```

Input: raw RGBA `Uint8Array` of size `width × height × 4`  
Output: new `Uint8Array` of size `(width×2) × (height×2) × 4`  
Side effects: none. Original array untouched.

### Changed: `character-foundry.js` — `forgeCharacter()`

Two lines change inside the per-direction render loop:

**Before:**
```js
const rgba = rasterizeCells(fills.coordinates, canvas.width, canvas.height, pngScale);
```

**After:**
```js
let rgba = rasterizeCells(fills.coordinates, canvas.width, canvas.height, 1);
rgba = applyXBR2x(rgba, canvas.width, canvas.height);
rgba = applyXBR2x(rgba, canvas.width * 2, canvas.height * 2);
```

`pngScale` is no longer passed to `rasterizeCells` for the character path. The final dimensions are unchanged: `canvas.width * 4` × `canvas.height * 4` = 128×192.

`assembleSpritesheet`, `encodePng`, Godot export, and Phaser pipeline config are all untouched.

---

## Algorithm: xBR 2×

### Color distance (YUV space)

```
wy = 48, wu = 7, wv = 6

Y  =  0.299·R + 0.587·G + 0.114·B
U  = -0.169·R - 0.331·G + 0.500·B
V  =  0.500·R - 0.419·G - 0.081·B

dist(a, b) = wy·|Ya−Yb| + wu·|Ua−Ub| + wv·|Va−Vb|
```

YUV weighting matches human luminance sensitivity. More accurate than RGB distance for pixel art color regions.

### Neighborhood sampling

For each source pixel E at `(x, y)`, sample a 5×5 window clamped to image bounds:

```
A  B  C
D  E  F
G  H  I
```

(The full xBR kernel labels a 5×5 region; these 9 immediately-adjacent pixels drive the 2× decisions.)

### Per-pixel output

Each source pixel E produces a 2×2 block:

```
E0  E1
E2  E3
```

Each sub-pixel is initially set to E's color, then optionally blended toward a diagonal neighbor based on 12 edge comparisons.

### Blend rules (12 comparisons)

For each of the 4 diagonal directions (NE, NW, SE, SW), evaluate:

1. **Dominant edge test** — is the diagonal direction favored over its two orthogonal neighbors?  
   `blend = dist(E,F) + dist(E,B) + dist(H,C) + dist(D,G) < dist(E,D) + dist(E,H) + dist(B,F) + dist(F,C)` (example for NE)

2. **Anti-false-positive guard** — suppress blend if a straight line would be broken.

When blend is true for a direction, the corresponding sub-pixel(s) of the 2×2 block receive a 75%/25% mix of E and the diagonal neighbor. This ratio preserves the pixel art palette feel while smoothing the edge.

### Blend weights

```
blended = round(0.75 · E + 0.25 · neighbor)
```

Applied per channel (R, G, B). Alpha is always copied from E (opaque pixel art has no transparency mid-pixel).

---

## Integration Contract

| Property | Value |
|----------|-------|
| Input canvas size | 32×48 (character default) |
| After pass 1 | 64×96 |
| After pass 2 | 128×192 |
| Output PNG dimensions | 128×192 (unchanged) |
| Spritesheet layout | 4 frames horizontal, unchanged |
| Godot `scale` | Vector2(4,4) — unchanged |
| Phaser `frameWidth` | 32 — unchanged |

---

## What Does Not Change

- `rasterizeCells()` signature (scale param still accepted, just called with 1)
- `assembleSpritesheet()` — receives same 128×192 RGBA per frame
- `encodePng()` — same call
- SVG renderer path — completely separate
- All AMPs (`pixel-aa-amp`, `selout-amp`, etc.) — run before rasterization, unaffected
- Godot scene export
- Phaser pipeline config
- All tests — existing golden PNG hashes will update (expected, intentional quality change)

---

## Testing

- Existing `character-creator.test.js` — 13 tests must still pass (functional contract unchanged)
- Golden PNG snapshot in `tests/core/pixelbrain/golden/` — update baseline after implementation (visual regression, intentional)
- Manual verify: render `scholar.starbound.esper.v1` in all 4 directions and inspect diagonal edges

---

## Out of Scope

- xBR 4× (single-pass quad upscale) — not needed; two 2× passes achieve the same result
- SVG renderer changes
- Item/weapon pipelines (`generate-pixelbrain-scimitar.mjs`) — separate rasterization path, not touched
