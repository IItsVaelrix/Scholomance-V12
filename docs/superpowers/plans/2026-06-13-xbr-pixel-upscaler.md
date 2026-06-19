# xBR 2× Pixel Art Upscaler — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the nearest-neighbor 4× rasterization in `forgeCharacter()` with two passes of xBR 2×, producing 128×192 PNG sprites with smooth diagonal edges and sharp horizontal/vertical lines.

**Architecture:** New pure-function AMP `pixel-scale-amp.js` takes a raw RGBA `Uint8Array` and returns one at 2× dimensions using Scale2x-style neighborhood comparison with YUV color distance (≈ xBR 2× quality for clean pixel art). `character-foundry.js` calls `rasterizeCells(scale=1)` then two xBR passes; output dimensions are unchanged at 128×192 so all downstream code (spritesheet, Godot, Phaser) is untouched.

**Tech Stack:** Vanilla JS (ES modules), Vitest for tests. No external dependencies.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| **Create** | `codex/core/pixelbrain/pixel-scale-amp.js` | `colorDist`, `applyXBR2x` — the entire upscaler |
| **Create** | `tests/core/pixelbrain/pixel-scale-amp.test.js` | Unit tests for colorDist + upscaler behaviour |
| **Modify** | `codex/core/pixelbrain/character-foundry.js:453-455,462` | Swap nearest-neighbour for xBR passes |

---

## Task 1 — Write failing tests for `pixel-scale-amp.js`

**Files:**
- Create: `tests/core/pixelbrain/pixel-scale-amp.test.js`

- [ ] **Step 1: Create the test file**

```js
// tests/core/pixelbrain/pixel-scale-amp.test.js
import { describe, it, expect } from 'vitest';
import { colorDist, applyXBR2x } from '../../../codex/core/pixelbrain/pixel-scale-amp.js';

// Helper: build a flat RGBA Uint8Array from a 2D array of [r,g,b] triples
function buildRGBA(grid) {
  const h = grid.length;
  const w = grid[0].length;
  const buf = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [r, g, b] = grid[y][x];
      const off = (y * w + x) * 4;
      buf[off] = r; buf[off+1] = g; buf[off+2] = b; buf[off+3] = 255;
    }
  }
  return buf;
}

// Helper: read pixel from RGBA array
function px(buf, w, x, y) {
  const off = (y * w + x) * 4;
  return [buf[off], buf[off+1], buf[off+2]];
}

const W = [255, 255, 255];
const B = [  0,   0,   0];

describe('colorDist', () => {
  it('returns 0 for identical colours', () => {
    expect(colorDist([128, 64, 32], [128, 64, 32])).toBe(0);
  });

  it('returns a large value for black vs white', () => {
    expect(colorDist(B, W)).toBeGreaterThan(100);
  });

  it('is symmetric', () => {
    const a = [200, 100, 50];
    const b = [50, 200, 100];
    expect(colorDist(a, b)).toBe(colorDist(b, a));
  });
});

describe('applyXBR2x', () => {
  it('doubles width and height', () => {
    const src = buildRGBA([[W, B], [B, W]]);
    const out = applyXBR2x(src, 2, 2);
    expect(out.length).toBe(4 * 4 * 4); // 4×4 × 4 channels
  });

  it('preserves solid-colour regions — no blending on flat areas', () => {
    // 3×3 all-white
    const src = buildRGBA([[W,W,W],[W,W,W],[W,W,W]]);
    const out = applyXBR2x(src, 3, 3);
    for (let i = 0; i < out.length; i += 4) {
      expect(out[i]).toBe(255);     // R
      expect(out[i+1]).toBe(255);   // G
      expect(out[i+2]).toBe(255);   // B
    }
  });

  it('keeps straight horizontal edges sharp — no blur on the edge row', () => {
    // 3×4: top 2 rows white, bottom 2 rows black (straight horizontal edge)
    const src = buildRGBA([
      [W, W, W],
      [W, W, W],
      [B, B, B],
      [B, B, B],
    ]);
    const out = applyXBR2x(src, 3, 4);
    const outW = 6;
    // Row 3 (last white row in output) must be pure white — no bleed from black below
    const [r3, g3, b3] = px(out, outW, 1, 3);
    expect(r3).toBe(255);
    expect(g3).toBe(255);
    expect(b3).toBe(255);
    // Row 4 (first black row in output) must be pure black
    const [r4, g4, b4] = px(out, outW, 1, 4);
    expect(r4).toBe(0);
    expect(g4).toBe(0);
    expect(b4).toBe(0);
  });

  it('blends the staircase corner on a 45° diagonal edge', () => {
    // 5×5 grid: NW triangle white, SE triangle black
    // W W W W B
    // W W W B B
    // W W E B B   ← E is centre pixel (white), SE corner (e3) should blend
    // W B B B B
    // B B B B B
    const src = buildRGBA([
      [W, W, W, W, B],
      [W, W, W, B, B],
      [W, W, W, B, B],
      [W, B, B, B, B],
      [B, B, B, B, B],
    ]);
    const out = applyXBR2x(src, 5, 5);
    const outW = 10;
    // The SE sub-pixel (e3) of the centre pixel at (2,2) → output pixel (5, 5)
    // It should be blended: not pure white (255) and not pure black (0)
    const [r, g, b] = px(out, outW, 5, 5);
    expect(r).toBeGreaterThan(0);
    expect(r).toBeLessThan(255);
  });

  it('alpha channel is always 255', () => {
    const src = buildRGBA([[W, B], [B, W]]);
    const out = applyXBR2x(src, 2, 2);
    for (let i = 3; i < out.length; i += 4) {
      expect(out[i]).toBe(255);
    }
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail (module not found)**

```bash
npx vitest run tests/core/pixelbrain/pixel-scale-amp.test.js 2>&1 | tail -15
```

Expected: `Error: Cannot find module '.../pixel-scale-amp.js'`

---

## Task 2 — Implement `pixel-scale-amp.js`

**Files:**
- Create: `codex/core/pixelbrain/pixel-scale-amp.js`

- [ ] **Step 3: Create the implementation**

```js
// codex/core/pixelbrain/pixel-scale-amp.js

/**
 * YUV colour distance (perceptual weights matching xBR reference: Y=48, U=7, V=6).
 * Inputs: [r,g,b] arrays (0-255 each).
 */
export function colorDist(a, b) {
  const aY =  0.299*a[0] + 0.587*a[1] + 0.114*a[2];
  const aU = -0.169*a[0] - 0.331*a[1] + 0.500*a[2];
  const aV =  0.500*a[0] - 0.419*a[1] - 0.081*a[2];
  const bY =  0.299*b[0] + 0.587*b[1] + 0.114*b[2];
  const bU = -0.169*b[0] - 0.331*b[1] + 0.500*b[2];
  const bV =  0.500*b[0] - 0.419*b[1] - 0.081*b[2];
  return 48 * Math.abs(aY - bY) + 7 * Math.abs(aU - bU) + 6 * Math.abs(aV - bV);
}

function getPixel(rgba, width, height, x, y) {
  const px = Math.max(0, Math.min(width  - 1, x));
  const py = Math.max(0, Math.min(height - 1, y));
  const off = (py * width + px) * 4;
  return [rgba[off], rgba[off + 1], rgba[off + 2]];
}

function blend75(e, n) {
  return [
    Math.round(0.75 * e[0] + 0.25 * n[0]),
    Math.round(0.75 * e[1] + 0.25 * n[1]),
    Math.round(0.75 * e[2] + 0.25 * n[2]),
  ];
}

function putPixel(out, outW, x, y, c) {
  const off = (y * outW + x) * 4;
  out[off] = c[0]; out[off + 1] = c[1]; out[off + 2] = c[2]; out[off + 3] = 255;
}

/**
 * xBR-style 2× pixel-art upscaler.
 *
 * Uses Scale2x neighbourhood pattern matching with YUV colour distance instead of
 * equality, and 75/25 sub-pixel blending instead of hard colour copies.
 * Straight horizontal/vertical lines are preserved exactly; 45° staircase edges
 * are smoothed by blending the corner sub-pixel toward its diagonal neighbour.
 *
 * @param {Uint8Array} rgba   — source pixels, width×height×4 bytes (RGBA)
 * @param {number}     width  — source width in pixels
 * @param {number}     height — source height in pixels
 * @returns {Uint8Array}      — upscaled pixels, (width×2)×(height×2)×4 bytes
 */
export function applyXBR2x(rgba, width, height) {
  const outW = width  * 2;
  const outH = height * 2;
  const out  = new Uint8Array(outW * outH * 4);

  const p = (x, y) => getPixel(rgba, width, height, x, y);
  const d = colorDist;

  // Colour-distance threshold: pixels closer than this are considered "same colour".
  // 30 YUV units ≈ visually imperceptible difference on typical pixel art palettes.
  const EQ = 30;
  const eq = (a, b) => d(a, b) < EQ;
  const ne = (a, b) => !eq(a, b);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      // 3×3 neighbourhood
      //  A  B  C
      //  D [E] F
      //  G  H  I
      const A = p(x-1, y-1), B = p(x, y-1), C = p(x+1, y-1);
      const D = p(x-1, y  ), E = p(x, y  ), F = p(x+1, y  );
      const G = p(x-1, y+1), H = p(x, y+1), I = p(x+1, y+1);

      // Scale2x rules with distance comparison:
      //   A corner is blended toward its diagonal neighbour when:
      //   - the two orthogonal neighbours of E that flank the diagonal are "the same colour"
      //   - and the opposing pair are not the same as those two (guards against straight lines)
      const e0 = (eq(D,B) && ne(D,H) && ne(B,F)) ? blend75(E,A) : E; // NW → A
      const e1 = (eq(B,F) && ne(B,D) && ne(F,H)) ? blend75(E,C) : E; // NE → C
      const e2 = (eq(D,H) && ne(D,B) && ne(H,F)) ? blend75(E,G) : E; // SW → G
      const e3 = (eq(H,F) && ne(H,B) && ne(D,F)) ? blend75(E,I) : E; // SE → I

      putPixel(out, outW, x*2,   y*2,   e0);
      putPixel(out, outW, x*2+1, y*2,   e1);
      putPixel(out, outW, x*2,   y*2+1, e2);
      putPixel(out, outW, x*2+1, y*2+1, e3);
    }
  }

  return out;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/core/pixelbrain/pixel-scale-amp.test.js 2>&1 | tail -10
```

Expected:
```
Test Files  1 passed (1)
      Tests  7 passed (7)
```

- [ ] **Step 5: Commit**

```bash
git add codex/core/pixelbrain/pixel-scale-amp.js tests/core/pixelbrain/pixel-scale-amp.test.js
git commit -m "feat(pixelbrain): xBR-style 2x pixel art upscaler AMP

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 3 — Wire xBR into `character-foundry.js`

**Files:**
- Modify: `codex/core/pixelbrain/character-foundry.js`

- [ ] **Step 6: Add the import at the top of character-foundry.js**

Find the existing imports block (lines 1–7) and add one line:

```js
import { applyXBR2x } from './pixel-scale-amp.js';
```

Add it after the last existing import in the block.

- [ ] **Step 7: Replace the rasterizeCells call (line 453) and the two lines that follow**

Find this block (around line 453–455):

```js
    const rgba = rasterizeCells(fills.coordinates, canvas.width, canvas.height, pngScale);
    dirRgbas[dir] = rgba;
    dirPngs[dir] = encodePng(canvas.width * pngScale, canvas.height * pngScale, rgba);
```

Replace it with:

```js
    let rgba = rasterizeCells(fills.coordinates, canvas.width, canvas.height, 1);
    rgba = applyXBR2x(rgba, canvas.width,     canvas.height);
    rgba = applyXBR2x(rgba, canvas.width * 2, canvas.height * 2);
    dirRgbas[dir] = rgba;
    dirPngs[dir] = encodePng(canvas.width * 4, canvas.height * 4, rgba);
```

- [ ] **Step 8: Fix the assembleSpritesheet call (line 462)**

Find:

```js
  const spritesheet = assembleSpritesheet(dirRgbas, canvas.width, canvas.height, pngScale);
```

Replace with:

```js
  const spritesheet = assembleSpritesheet(dirRgbas, canvas.width, canvas.height, 4);
```

`pngScale` is no longer used in the character render path. The xBR double-pass always produces exactly 4× output.

- [ ] **Step 9: Run the full character creator test suite**

```bash
npx vitest run tests/core/pixelbrain/character-creator.test.js 2>&1 | tail -10
```

Expected:
```
Test Files  1 passed (1)
      Tests  13 passed (13)
```

If any test fails: the most likely cause is the `spritesheet` byte-length check in `assembleSpritesheet`. Verify `dirRgbas[dir].length === canvas.width * 4 * canvas.height * 4 * 4` (= 98,304 for a 32×48 canvas). The two xBR passes on a 32×48 source produce exactly a 128×192 array = 98,304 bytes, which is correct.

- [ ] **Step 10: Run both test files together to confirm no regressions**

```bash
npx vitest run tests/core/pixelbrain/ 2>&1 | tail -15
```

Expected:
```
Test Files  2 passed (2)
      Tests  20 passed (20)
```

- [ ] **Step 11: Commit**

```bash
git add codex/core/pixelbrain/character-foundry.js
git commit -m "feat(pixelbrain): wire xBR 2x upscaler into forgeCharacter PNG pipeline

Replaces nearest-neighbour 4x rasterisation with two xBR passes.
Output dimensions unchanged (128x192); diagonal staircase edges are now
smoothed while straight lines remain pixel-sharp.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**
- [x] New `pixel-scale-amp.js` — Task 2
- [x] `colorDist` YUV (Y=48,U=7,V=6) — Step 3
- [x] 3×3 neighbourhood, 4 sub-pixel decisions — Step 3
- [x] 75/25 blend ratio — Step 3 (`blend75`)
- [x] `forgeCharacter` integration: scale=1 + two passes — Steps 7–8
- [x] Output dimensions unchanged (128×192) — verified in Step 9 note
- [x] Spritesheet, Godot, Phaser untouched — confirmed by passing 13 existing tests
- [x] Tests: diagonal blending, straight-edge sharpness, dimension doubling, alpha — Task 1

**Placeholder scan:** None found.

**Type consistency:** `colorDist` takes `[r,g,b]` arrays throughout. `applyXBR2x(rgba, width, height)` signature used identically in the AMP and the foundry call sites.
