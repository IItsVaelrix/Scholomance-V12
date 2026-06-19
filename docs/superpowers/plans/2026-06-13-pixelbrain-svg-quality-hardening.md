# Pixelbrain SVG Quality Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close 7 architectural disparities found in the Pixelbrain illustrated SVG renderer to guarantee 100% quality asset output — no silent regressions, engine-aligned contracts, cell-unit scalable output.

**Architecture:** Seven independent changes applied in dependency order: (1) rename `isOutline → isRim` across the character fill pipeline to align with the AMP engine contract; (2) fix `isOutlineCell()` O(n²) perf; (3) add fills shape contract + golden SVG snapshot tests; (4) fix `viewBox` to use cell units so SVG is CSS-resizable at any scale without re-baking; (5) move shader-to-partId assignments into the part-profile registry metadata; (6) document the shadow algorithm divergence from the design spec.

**Tech Stack:** Vitest (test runner), `codex/core/pixelbrain/` pure JS modules, no DOM — every function is a pure string/array transformer.

**Baseline test state:** `npm run test -- tests/core/pixelbrain/character-to-svg.test.js tests/core/pixelbrain/cell-boundary-tracer.test.js` → 25 passed, 0 failed. Keep it green throughout.

---

## File Map

| File | Action | What changes |
|---|---|---|
| `codex/core/pixelbrain/character-foundry.js` | Modify | Rename `isOutline → isRim` in `applyCharacterFills()` output; fix `isOutlineCell()` to accept a pre-built Set |
| `codex/core/pixelbrain/character-to-svg.js` | Modify | Rename `isOutline → isRim` reads; fix `viewBox` to cell units; pass `scale: 1` to `buildPath`; fix shader filter values; add shadow algorithm comment |
| `codex/core/pixelbrain/part-profile-library.js` | Modify | Add optional `metadata` arg to `registerPartProfile()`; add `METADATA_REGISTRY`; export `getPartProfileMeta()` |
| `codex/core/pixelbrain/character-accessory-profiles.js` | Modify | Add `{ shader: 'ice-glow' }` metadata to halo, wings; `{ shader: 'crystal-rim' }` to crown, pendant |
| `codex/core/pixelbrain/character-detail-profiles.js` | Modify | Add `{ shader: 'ice-glow' }` to eyeGlow, hairShine, cheekSigil; `{ shader: 'crystal-rim' }` to robeTrim |
| `tests/core/pixelbrain/character-to-svg.test.js` | Modify | Add fills shape contract test; add cell-unit viewBox test; add golden snapshot test |
| `tests/core/pixelbrain/golden/npc-void-illustrated.svg` | Create | Committed golden SVG output for regression detection |
| `docs/superpowers/specs/2026-06-13-pixelbrain-svg-renderer-design.md` | Modify | Update shadow algorithm section to match actual adjacency implementation |

---

## Task 1: Write the Failing Shape Contract Test

**Purpose:** TDD baseline. The test asserts the fills output has `isRim` — it will FAIL now (field is `isOutline`). This guards the rename in Task 2.

**Files:**
- Modify: `tests/core/pixelbrain/character-to-svg.test.js`

- [ ] **Step 1.1: Add the contract test**

Open `tests/core/pixelbrain/character-to-svg.test.js` and add this block after the last existing `it()` block, before the closing `});` of the `describe('characterToSVG', ...)`:

```js
describe('applyCharacterFills → characterToSVG shape contract', () => {
  it('applyCharacterFills output carries isRim (not isOutline) to match the AMP engine contract', () => {
    // This test imports applyCharacterFills indirectly through forgeCharacter.
    // It validates the coordinate shape that characterToSVG() reads.
    const result = forgeCharacter({
      contract: 'CHARACTER-SPEC-v1',
      id: 'contract-shape-test',
      class: 'character',
      archetype: 'human',
      canvas: { width: 32, height: 48, gridSize: 1 },
      seed: 42,
      bytecode: 'VW-SCHOLAR-COMMON-RESONANT',
      presentation: { gender: 'feminine', heightClass: 'average', buildClass: 'average' },
      directions: ['south'],
      materials: { skin: 'skin_light', hair: 'hair_brown', eyes: 'eye_brown' },
      body: { profile: 'character.body.human.androgynous' },
      face: [
        { id: 'leftEye',  profile: 'character.face.eye.round', attach: { parent: 'body', at: 'face.eyeLeft' } },
        { id: 'rightEye', profile: 'character.face.eye.round', attach: { parent: 'body', at: 'face.eyeRight' } },
      ],
      hair: { profile: 'character.hair.short' },
      clothing: [{ id: 'top', profile: 'character.clothing.top.beginnerRobe' }],
      combatProfile: { school: 'VOID' },
    }, { renderer: 'illustrated', scale: 1 });

    // result.fills['south'] is the applyCharacterFills() output
    const fills = result.fills['south'];
    expect(fills).toHaveProperty('coordinates');
    expect(fills.coordinates.length).toBeGreaterThan(0);

    // Every coordinate must have isRim (not isOutline)
    const sample = fills.coordinates[0];
    expect(sample).toHaveProperty('isRim');
    expect(sample).not.toHaveProperty('isOutline');

    // Must have partId, x, y, color
    expect(sample).toHaveProperty('partId');
    expect(sample).toHaveProperty('x');
    expect(sample).toHaveProperty('y');
    expect(sample).toHaveProperty('color');

    // At least one rim cell and one non-rim cell must exist
    const rimCells    = fills.coordinates.filter(c => c.isRim === true);
    const fillCells   = fills.coordinates.filter(c => c.isRim === false);
    expect(rimCells.length).toBeGreaterThan(0);
    expect(fillCells.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 1.2: Run test to confirm it fails**

```bash
npm run test -- tests/core/pixelbrain/character-to-svg.test.js
```

Expected: The new test FAILS with something like `expect(received).toHaveProperty('isRim')` / `expect(received).not.toHaveProperty('isOutline')`. All existing 12 tests still pass.

- [ ] **Step 1.3: Commit the failing test**

```bash
git add tests/core/pixelbrain/character-to-svg.test.js
git commit -m "test(pixelbrain): failing contract test for isRim field on applyCharacterFills output"
```

---

## Task 2: Rename `isOutline → isRim` and Fix O(n²) in `character-foundry.js`

**Purpose:** Align `applyCharacterFills()` output with the AMP engine contract (`isRim` is the canonical field name used by every other Pixelbrain module). Also fix the O(n²) `isOutlineCell()` that rebuilds a full Set per cell.

**Files:**
- Modify: `codex/core/pixelbrain/character-foundry.js:52-112`

- [ ] **Step 2.1: Replace `isOutlineCell` and `applyCharacterFills` in `character-foundry.js`**

Find the two functions `isOutlineCell` and `applyCharacterFills` (lines ~52–112) and replace them entirely with:

```js
function isRimCell(x, y, cellKeySet) {
  if (!cellKeySet.has(`${x},${y}`)) return false;
  for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
    if (!cellKeySet.has(`${x+dx},${y+dy}`)) return true;
  }
  return false;
}

function applyCharacterFills({ silhouette, spec, direction } = {}) {
  const canvas = spec?.canvas || CHARACTER_DEFAULTS.canvas;
  const cells = [];
  const colors = new Set();
  const mat = materialFromSpec(spec);

  const partColors = {
    'body': resolveCharacterMaterial(mat.skin),
    'hair': resolveCharacterMaterial(mat.hair),
    'leftEye': resolveCharacterMaterial(mat.eyes),
    'rightEye': resolveCharacterMaterial(mat.eyes),
    'nose': resolveCharacterMaterial(mat.skin),
    'mouth': resolveCharacterMaterial(mat.skin),
    'leftEar': resolveCharacterMaterial(mat.skin),
    'rightEar': resolveCharacterMaterial(mat.skin),
    'top': resolveCharacterMaterial('cloth_linen', '#C8C0B0'),
    'bottom': resolveCharacterMaterial('cloth_wool', '#807870'),
    'shoes': resolveCharacterMaterial('leather_brown', '#6A4030'),
  };

  const outlineColor = '#1A1A20';

  // Build Set once — O(n) not O(n²)
  const cellKeySet = new Set(silhouette.cells.map(c => `${c.x},${c.y}`));

  for (const c of silhouette.cells) {
    const partId = silhouette.partOf.get(`${c.x},${c.y}`) || 'body';
    const rawExplicitColor = silhouette.colorOf?.get(`${c.x},${c.y}`);
    const explicitColor = rawExplicitColor ? resolveCharacterMaterial(rawExplicitColor, rawExplicitColor) : null;
    let color = explicitColor || partColors[partId] || partColors.body;

    const isRim = isRimCell(c.x, c.y, cellKeySet);
    if (isRim && !explicitColor) {
      color = outlineColor;
    }

    colors.add(color);
    cells.push({ x: c.x, y: c.y, color, partId, isRim });
  }

  const palette = [...colors].sort();

  return {
    coordinates: Object.freeze(cells),
    palette: Object.freeze(palette),
    partColors,
    diagnostics: {
      totalCells: cells.length,
      uniqueColors: palette.length,
      rimCells: cells.filter(c => c.isRim).length,
    },
  };
}
```

- [ ] **Step 2.2: Run the tests**

```bash
npm run test -- tests/core/pixelbrain/character-to-svg.test.js
```

Expected: The Task 1 shape contract test now **passes**. But the other `characterToSVG` unit tests that call `characterToSVG(MOCK_FILLS, ...)` directly will still pass because the `MOCK_FILLS` fixture uses `isOutline` and `characterToSVG` still reads `isOutline`. The integration test (Task 1) is what changed.

Check the integration test (`renders accessory and detail profile classes`) and any other tests calling `forgeCharacter` with `renderer: 'illustrated'` — they should still pass because `characterToSVG` hasn't been updated yet.

- [ ] **Step 2.3: Commit**

```bash
git add codex/core/pixelbrain/character-foundry.js
git commit -m "fix(pixelbrain): rename isOutline → isRim in applyCharacterFills; O(1) rim cell detection"
```

---

## Task 3: Update `character-to-svg.js` to Read `isRim`

**Purpose:** Complete the rename by updating the SVG compositor to read `isRim` instead of `isOutline`. Update the doc comment. Update the `MOCK_FILLS` fixture in the test to use `isRim` so unit tests remain meaningful.

**Files:**
- Modify: `codex/core/pixelbrain/character-to-svg.js`
- Modify: `tests/core/pixelbrain/character-to-svg.test.js`

- [ ] **Step 3.1: Update the doc comment in `character-to-svg.js`**

Find the file header comment (lines 1–12). Replace:

```js
 *   { coordinates: [{ x, y, color, partId, isOutline }], palette, partColors, diagnostics }
```

With:

```js
 *   { coordinates: [{ x, y, color, partId, isRim }], palette, partColors, diagnostics }
```

- [ ] **Step 3.2: Update `getFillColor()` to read `isRim`**

Find:

```js
function getFillColor(cells) {
  const nonOutline = cells.find((c) => !c.isOutline);
  return (nonOutline ?? cells[0])?.color ?? '#888888';
}
```

Replace with:

```js
function getFillColor(cells) {
  const nonRim = cells.find((c) => !c.isRim);
  return (nonRim ?? cells[0])?.color ?? '#888888';
}
```

- [ ] **Step 3.3: Update the cell grouping loop in `characterToSVG()` to read `isRim`**

Find (around line 161–170 of the function body):

```js
  for (const cell of fills.coordinates || []) {
    if (!partAllCells.has(cell.partId)) {
      partAllCells.set(cell.partId, []);
      partOutlineCells.set(cell.partId, []);
    }
    partAllCells.get(cell.partId).push(cell);
    if (cell.isOutline) {
      partOutlineCells.get(cell.partId).push(cell);
      allOutlineCells.push(cell);
    }
  }
```

Replace with:

```js
  for (const cell of fills.coordinates || []) {
    if (!partAllCells.has(cell.partId)) {
      partAllCells.set(cell.partId, []);
      partOutlineCells.set(cell.partId, []);
    }
    partAllCells.get(cell.partId).push(cell);
    if (cell.isRim) {
      partOutlineCells.get(cell.partId).push(cell);
      allOutlineCells.push(cell);
    }
  }
```

Also update the variable names for clarity. Find:

```js
  const partAllCells = new Map(); // partId → all cells (incl. outline)
  const partOutlineCells = new Map(); // partId → outline cells only
  const allOutlineCells = [];
```

Replace with:

```js
  const partAllCells = new Map();    // partId → all cells (incl. rim)
  const partRimCells = new Map();    // partId → rim cells only
  const allRimCells = [];
```

Then update every reference to `partOutlineCells` → `partRimCells` and `allOutlineCells` → `allRimCells` in the rest of the function body. There are 4 references total:

1. `partOutlineCells.set(cell.partId, []);` → `partRimCells.set(cell.partId, []);`
2. `partOutlineCells.get(cell.partId).push(cell);` → `partRimCells.get(cell.partId).push(cell);`
3. In the shadow block: `const outlineCells = partOutlineCells.get(partId) || [];` → `const rimCells = partRimCells.get(partId) || [];`
4. `if (outlineCells.length === 0) continue;` → `if (rimCells.length === 0) continue;`
5. `const outlineKeySet = cellsToKeySet(outlineCells);` → `const rimKeySet = cellsToKeySet(rimCells);`
6. `for (const key of outlineKeySet)` → `for (const key of rimKeySet)`
7. `&& !outlineKeySet.has(nk)` → `&& !rimKeySet.has(nk)`
8. In the outline layer block: `const outlineColor = allOutlineCells[0]?.color ?? '#1a1a20';` → `const rimColor = allRimCells[0]?.color ?? '#1a1a20';`
9. `const outlineKeySet = cellsToKeySet(allOutlineCells);` → `const rimKeySet = cellsToKeySet(allRimCells);`
10. `if (allOutlineCells.length > 0)` → `if (allRimCells.length > 0)`
11. `const trace = traceBoundary(outlineKeySet, { smooth });` (outline layer) → `const trace = traceBoundary(rimKeySet, { smooth });`

Also: `stroke: outlineColor,` → `stroke: rimColor,`

- [ ] **Step 3.4: Update `MOCK_FILLS` in the test to use `isRim`**

In `tests/core/pixelbrain/character-to-svg.test.js`, the top-level `MOCK_FILLS` fixture uses `isOutline`. Update it:

Find:

```js
const MOCK_FILLS = {
  coordinates: [
    { x: 1, y: 1, partId: 'body', color: '#aaaaaa', isOutline: false },
    { x: 1, y: 2, partId: 'body', color: '#aaaaaa', isOutline: false },
    { x: 1, y: 3, partId: 'body', color: '#1a1a20', isOutline: true  },
  ],
  palette: ['#1a1a20', '#aaaaaa'],
  partColors: { body: '#aaaaaa' },
  diagnostics: { totalCells: 3, uniqueColors: 2, rimCells: 1 },
};
```

Replace with:

```js
const MOCK_FILLS = {
  coordinates: [
    { x: 1, y: 1, partId: 'body', color: '#aaaaaa', isRim: false },
    { x: 1, y: 2, partId: 'body', color: '#aaaaaa', isRim: false },
    { x: 1, y: 3, partId: 'body', color: '#1a1a20', isRim: true  },
  ],
  palette: ['#1a1a20', '#aaaaaa'],
  partColors: { body: '#aaaaaa' },
  diagnostics: { totalCells: 3, uniqueColors: 2, rimCells: 1 },
};
```

Also update the shader test fixture that uses `isOutline`. Find in `'emits SVG filter shaders by default...'`:

```js
    const shaderFills = {
      ...MOCK_FILLS,
      coordinates: [
        { x: 1, y: 1, partId: 'halo', color: '#dff6ff', isOutline: false },
        { x: 3, y: 1, partId: 'halo', color: '#dff6ff', isOutline: false },
        { x: 2, y: 3, partId: 'body', color: '#1a1a20', isOutline: true },
      ],
    };
```

Replace with:

```js
    const shaderFills = {
      ...MOCK_FILLS,
      coordinates: [
        { x: 1, y: 1, partId: 'halo', color: '#dff6ff', isRim: false },
        { x: 3, y: 1, partId: 'halo', color: '#dff6ff', isRim: false },
        { x: 2, y: 3, partId: 'body', color: '#1a1a20', isRim: true },
      ],
    };
```

And the disconnected cells fixture:

```js
    const disconnectedFills = {
      ...MOCK_FILLS,
      coordinates: [
        { x: 1, y: 1, partId: 'halo', color: '#dff6ff', isOutline: false },
        { x: 4, y: 1, partId: 'halo', color: '#dff6ff', isOutline: false },
      ],
    };
```

Replace with:

```js
    const disconnectedFills = {
      ...MOCK_FILLS,
      coordinates: [
        { x: 1, y: 1, partId: 'halo', color: '#dff6ff', isRim: false },
        { x: 4, y: 1, partId: 'halo', color: '#dff6ff', isRim: false },
      ],
    };
```

- [ ] **Step 3.5: Run all pixelbrain SVG tests**

```bash
npm run test -- tests/core/pixelbrain/character-to-svg.test.js tests/core/pixelbrain/cell-boundary-tracer.test.js
```

Expected: **All 26 tests pass** (25 original + 1 new shape contract test).

- [ ] **Step 3.6: Commit**

```bash
git add codex/core/pixelbrain/character-to-svg.js tests/core/pixelbrain/character-to-svg.test.js
git commit -m "fix(pixelbrain): align character-to-svg with engine contract — isRim throughout"
```

---

## Task 4: Fix `viewBox` to Use Cell Units

**Purpose:** The spec's CSS theming story requires `viewBox="0 0 32 48"` (cell units) with `width/height` in pixels. Currently both are pixel-scale. With cell-unit `viewBox`, the SVG is CSS-resizable at any display size without re-baking. Path coordinates move to cell units. SVG filter magnitudes are divided by `scale` to keep visual equivalence.

**Files:**
- Modify: `codex/core/pixelbrain/character-to-svg.js`
- Modify: `tests/core/pixelbrain/character-to-svg.test.js`

- [ ] **Step 4.1: Add a failing test for cell-unit viewBox at non-1 scale**

In the `describe('characterToSVG', ...)` block, add this test after `'viewBox matches canvas dimensions × scale'`:

```js
  it('viewBox uses cell dimensions regardless of scale — pixel size is width/height only', () => {
    const svg = characterToSVG(MOCK_FILLS, MOCK_SPEC, { scale: 8 });
    // Cell dims are 4×6 (from MOCK_SPEC.canvas). At scale=8, viewBox stays 4×6.
    expect(svg).toContain('viewBox="0 0 4 6"');
    // But rendered pixel size scales correctly.
    expect(svg).toContain('width="32"');
    expect(svg).toContain('height="48"');
  });
```

Run to confirm failure:

```bash
npm run test -- tests/core/pixelbrain/character-to-svg.test.js
```

Expected: The new test FAILS — current viewBox at scale=8 is `"0 0 32 48"` (pixel dims).

- [ ] **Step 4.2: Update `buildShaderDefs` to accept `scale` and produce scale-invariant filter values**

In `character-to-svg.js`, find `buildShaderDefs(enabled)` and replace it with:

```js
function buildShaderDefs(enabled, scale = 1) {
  if (!enabled) return '';
  // Filter primitive values are in user-coordinate space.
  // With cell-unit viewBox, divide pixel-magnitude values by scale
  // so visual output is equivalent at any rendered size.
  const s = scale;
  return [
    `<filter id="pb-shader-ink-shadow" x="-35%" y="-35%" width="170%" height="170%" color-interpolation-filters="sRGB">`,
    `<feDropShadow dx="${(0.9/s).toFixed(4)}" dy="${(1.2/s).toFixed(4)}" stdDeviation="${(0.65/s).toFixed(4)}" flood-color="#05060a" flood-opacity="0.72"/>`,
    `</filter>`,
    `<filter id="pb-shader-ice-glow" x="-80%" y="-80%" width="260%" height="260%" color-interpolation-filters="sRGB">`,
    `<feGaussianBlur in="SourceAlpha" stdDeviation="${(1.35/s).toFixed(4)}" result="blur"/>`,
    `<feFlood flood-color="#42d9ff" flood-opacity="0.72" result="glowColor"/>`,
    `<feComposite in="glowColor" in2="blur" operator="in" result="glow"/>`,
    `<feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge>`,
    `</filter>`,
    `<filter id="pb-shader-crystal-rim" x="-45%" y="-45%" width="190%" height="190%" color-interpolation-filters="sRGB">`,
    `<feTurbulence type="fractalNoise" baseFrequency="${(0.9*s).toFixed(4)}" numOctaves="2" seed="14" result="noise"/>`,
    `<feColorMatrix in="noise" type="matrix" values="0 0 0 0 0.82 0 0 0 0 0.96 0 0 0 0 1 0 0 0 0.38 0" result="spark"/>`,
    `<feBlend in="SourceGraphic" in2="spark" mode="screen"/>`,
    `</filter>`,
    `<filter id="pb-shader-melt-field" x="-50%" y="-20%" width="200%" height="160%" color-interpolation-filters="sRGB">`,
    `<feTurbulence type="fractalNoise" baseFrequency="${(0.045*s).toFixed(4)} ${(0.18*s).toFixed(4)}" numOctaves="2" seed="26" result="meltNoise"/>`,
    `<feDisplacementMap in="SourceGraphic" in2="meltNoise" scale="${(1.65/s).toFixed(4)}" xChannelSelector="R" yChannelSelector="G"/>`,
    `</filter>`,
  ].join('');
}
```

Note on `baseFrequency`: turbulence frequencies scale INVERSELY — higher baseFrequency = finer noise. With cell-unit viewBox and scale=8, each "unit" is 8px, so noise at 0.045 (per cell) = 0.045/8 per pixel ≈ coarser. To keep visual equivalence, multiply by scale (`0.045 * s`). Displacement `scale` attribute is a pixel offset — divide by scale.

- [ ] **Step 4.3: Update `characterToSVG()` to produce cell-unit viewBox and pass scale to filters**

Find the `characterToSVG` function. Replace the opening lines that compute dimensions:

```js
  const svgWidth = (spec?.canvas?.width ?? 32) * scale;
  const svgHeight = (spec?.canvas?.height ?? 48) * scale;
```

With:

```js
  const canvasW  = spec?.canvas?.width  ?? 32;
  const canvasH  = spec?.canvas?.height ?? 48;
  const svgWidth  = canvasW * scale;
  const svgHeight = canvasH * scale;
```

Find the `buildContourPathElements` call pattern. The helper currently passes `scale` through to `buildPath`. Change it to pass `scale: 1` everywhere, since paths are now in cell units and the viewBox handles the render scaling.

Find `buildContourPathElements`:

```js
function buildContourPathElements(trace, pathOptions) {
  const contours = trace?.contours?.length ? trace.contours : [trace];
  return contours
    .map((contour) => buildPath(contour, { smooth: pathOptions.smooth, scale: pathOptions.scale }))
    .filter(Boolean)
    .map((d) => buildPathElement({ ...pathOptions, d }));
}
```

Replace with:

```js
function buildContourPathElements(trace, pathOptions) {
  const contours = trace?.contours?.length ? trace.contours : [trace];
  return contours
    .map((contour) => buildPath(contour, { smooth: pathOptions.smooth, scale: 1 }))
    .filter(Boolean)
    .map((d) => buildPathElement({ ...pathOptions, d }));
}
```

Find the `buildShaderDefs` call at the final assembly. Change:

```js
  return buildSVGElement(
    'svg',
    {
      xmlns: 'http://www.w3.org/2000/svg',
      viewBox: `0 0 ${svgWidth} ${svgHeight}`,
      width: svgWidth,
      height: svgHeight,
      class: `pb-character school-${school}`,
    },
    buildShaderDefs(shaderEffects) + fillLayer + shadowLayer + outlineLayer
  );
```

Replace with:

```js
  return buildSVGElement(
    'svg',
    {
      xmlns: 'http://www.w3.org/2000/svg',
      viewBox: `0 0 ${canvasW} ${canvasH}`,
      width: svgWidth,
      height: svgHeight,
      class: `pb-character school-${school}`,
    },
    buildShaderDefs(shaderEffects, scale) + fillLayer + shadowLayer + outlineLayer
  );
```

- [ ] **Step 4.4: Update the `'viewBox matches canvas dimensions × scale'` test name**

This test passes at `scale: 1` both before and after the fix (cell dims = pixel dims when scale=1). Just rename it to be accurate:

Find:

```js
  it('viewBox matches canvas dimensions × scale', () => {
    const svg = characterToSVG(MOCK_FILLS, MOCK_SPEC, { scale: 1 });
    expect(svg).toContain('viewBox="0 0 4 6"');
  });
```

Replace with:

```js
  it('viewBox uses canvas cell dimensions (scale-independent)', () => {
    const svg = characterToSVG(MOCK_FILLS, MOCK_SPEC, { scale: 1 });
    expect(svg).toContain('viewBox="0 0 4 6"');
  });
```

- [ ] **Step 4.5: Run all pixelbrain SVG tests**

```bash
npm run test -- tests/core/pixelbrain/character-to-svg.test.js tests/core/pixelbrain/cell-boundary-tracer.test.js
```

Expected: **All 27 tests pass** (26 + 1 new cell-unit viewBox test). The `is deterministic` test also still passes since the filter values are deterministic for a given scale.

- [ ] **Step 4.6: Commit**

```bash
git add codex/core/pixelbrain/character-to-svg.js tests/core/pixelbrain/character-to-svg.test.js
git commit -m "fix(pixelbrain): SVG viewBox in cell units — CSS-resizable at any scale without re-bake"
```

---

## Task 5: Add Shader Metadata to Part-Profile Registry

**Purpose:** `shaderForPart()` in `character-to-svg.js` has hardcoded partId lists that must be manually synced as profiles grow. Moving shader assignments into the profile registration (`{ shader: 'ice-glow' }` metadata) makes them self-documenting and co-located.

**Files:**
- Modify: `codex/core/pixelbrain/part-profile-library.js`
- Modify: `codex/core/pixelbrain/character-accessory-profiles.js`
- Modify: `codex/core/pixelbrain/character-detail-profiles.js`
- Modify: `codex/core/pixelbrain/character-to-svg.js`

- [ ] **Step 5.1: Add metadata registry and `getPartProfileMeta()` to `part-profile-library.js`**

In `part-profile-library.js`, find the line `const REGISTRY = Object.create(null);` (line ~24) and add a second registry below it:

```js
const REGISTRY = Object.create(null);
const METADATA_REGISTRY = Object.create(null);
```

Find `registerPartProfile(id, profile)` and replace it with a version that accepts optional metadata:

```js
export function registerPartProfile(id, profile, metadata = {}) {
  if (typeof id !== 'string' || !id) {
    throw new Error('registerPartProfile: id must be a non-empty string');
  }
  if (typeof profile !== 'function') {
    throw new Error('registerPartProfile: profile must be a function');
  }
  REGISTRY[id] = profile;
  if (Object.keys(metadata).length > 0) {
    METADATA_REGISTRY[id] = metadata;
  }
  return REGISTRY[id];
}
```

After `listPartProfiles()`, add:

```js
export function getPartProfileMeta(id) {
  return METADATA_REGISTRY[id] ?? null;
}
```

- [ ] **Step 5.2: Add shader metadata to accessory profiles**

In `character-accessory-profiles.js`, update each `registerPartProfile` call to include metadata:

`character.accessory.halo.ice` → add `{ shader: 'ice-glow' }`:
```js
registerPartProfile('character.accessory.halo.ice', (params = {}) => {
  // ... existing function body unchanged ...
}, { shader: 'ice-glow' });
```

`character.accessory.crown.crystal` → add `{ shader: 'crystal-rim' }`:
```js
registerPartProfile('character.accessory.crown.crystal', (params = {}) => {
  // ... existing function body unchanged ...
}, { shader: 'crystal-rim' });
```

`character.accessory.wings.snow` → add `{ shader: 'ice-glow' }`:
```js
registerPartProfile('character.accessory.wings.snow', (params = {}) => {
  // ... existing function body unchanged ...
}, { shader: 'ice-glow' });
```

`character.accessory.jewelry.runePendant` → add `{ shader: 'crystal-rim' }`:
```js
registerPartProfile('character.accessory.jewelry.runePendant', (params = {}) => {
  // ... existing function body unchanged ...
}, { shader: 'crystal-rim' });
```

`character.accessory.shoulderMantle` → no shader (leave as-is, no third arg).

- [ ] **Step 5.3: Add shader metadata to detail profiles**

In `character-detail-profiles.js`:

`character.detail.robeTrim.snow` → add `{ shader: 'crystal-rim' }`:
```js
registerPartProfile('character.detail.robeTrim.snow', (params = {}) => {
  // ... existing function body unchanged ...
}, { shader: 'crystal-rim' });
```

`character.detail.eyeGlow` → add `{ shader: 'ice-glow' }`:
```js
registerPartProfile('character.detail.eyeGlow', (params = {}) => {
  // ... existing function body unchanged ...
}, { shader: 'ice-glow' });
```

`character.detail.hairShine` → add `{ shader: 'ice-glow' }`:
```js
registerPartProfile('character.detail.hairShine', (params = {}) => {
  // ... existing function body unchanged ...
}, { shader: 'ice-glow' });
```

`character.detail.cheekSigil.snow` → add `{ shader: 'ice-glow' }`:
```js
registerPartProfile('character.detail.cheekSigil.snow', (params = {}) => {
  // ... existing function body unchanged ...
}, { shader: 'ice-glow' });
```

- [ ] **Step 5.4: Refactor `shaderForPart()` in `character-to-svg.js` to use the registry**

Add the import at the top of `character-to-svg.js` (alongside the existing imports):

```js
import { getPartProfileMeta } from './part-profile-library.js';
```

Find `shaderForPart(partId, enabled)` and replace it:

```js
const SHADER_FILTERS = {
  'ice-glow':    'url(#pb-shader-ice-glow)',
  'crystal-rim': 'url(#pb-shader-crystal-rim)',
};

function shaderForPart(partId, enabled) {
  if (!enabled) return null;
  const meta = getPartProfileMeta(partId);
  return SHADER_FILTERS[meta?.shader] ?? null;
}
```

- [ ] **Step 5.5: Run all pixelbrain SVG tests**

```bash
npm run test -- tests/core/pixelbrain/character-to-svg.test.js tests/core/pixelbrain/cell-boundary-tracer.test.js
```

Expected: All 27 tests pass. The `'emits SVG filter shaders by default and can disable them'` test verifies `filter="url(#pb-shader-ice-glow)"` on the `halo` part — this still works because the profile now has `{ shader: 'ice-glow' }` registered.

- [ ] **Step 5.6: Commit**

```bash
git add codex/core/pixelbrain/part-profile-library.js \
        codex/core/pixelbrain/character-accessory-profiles.js \
        codex/core/pixelbrain/character-detail-profiles.js \
        codex/core/pixelbrain/character-to-svg.js
git commit -m "refactor(pixelbrain): shader-to-part mapping into profile registry metadata"
```

---

## Task 6: Document Shadow Algorithm Divergence

**Purpose:** The finalized spec describes slot-based shadow shading (from `slotRanges`). The implementation uses adjacency-based shading (simpler, no AMP dependency). One comment in `character-to-svg.js` and one spec update closes this doc-rot.

**Files:**
- Modify: `codex/core/pixelbrain/character-to-svg.js`
- Modify: `docs/superpowers/specs/2026-06-13-pixelbrain-svg-renderer-design.md`

- [ ] **Step 6.1: Add comment to `character-to-svg.js` shadow block**

In `character-to-svg.js`, find the shadow layer comment (around line 189):

```js
  // ── Layer 2: shadow fringe (cells adjacent to outline, inside the shape) ──
```

Replace with:

```js
  // ── Layer 2: shadow fringe ────────────────────────────────────────────────
  // Adjacency-based: cells touching the rim ring (inside the shape) get a
  // darkened overlay. Simpler than the slot-based approach (slotRanges from
  // region-fill-amp) in the original design spec — no AMP pipeline dependency.
```

- [ ] **Step 6.2: Update the spec doc shadow section**

In `docs/superpowers/specs/2026-06-13-pixelbrain-svg-renderer-design.md`, find the shadow layer description in `character-to-svg.js` logic block:

```
  // Shadow layer = subset: cells with slot ≤ mid (painted OVER the fill as a darker overlay)
```

And the prose comment:
```
  // Fill layer  = ALL non-rim cells for the part (traces the complete part region)
  // Shadow layer = subset: cells with slot ≤ mid (painted OVER the fill as a darker overlay)
```

Replace with:

```
  // Fill layer   = ALL non-rim cells for the part (traces the complete part region)
  // Shadow layer = subset: cells 4-adjacent to rim cells, inside the shape
  //   (adjacency-based — simpler than slot-based; no slotRanges dependency)
```

- [ ] **Step 6.3: Run tests to verify no breakage**

```bash
npm run test -- tests/core/pixelbrain/character-to-svg.test.js
```

Expected: All 27 tests pass (comment-only changes).

- [ ] **Step 6.4: Commit**

```bash
git add codex/core/pixelbrain/character-to-svg.js \
        docs/superpowers/specs/2026-06-13-pixelbrain-svg-renderer-design.md
git commit -m "docs(pixelbrain): document adjacency shadow algorithm; update spec to match implementation"
```

---

## Task 7: Golden SVG Snapshot Test

**Purpose:** The strongest quality guard: commit a known-good SVG output for a real NPC character forge. Any regression in fill algorithm, shadow fringe, outline tracer, shader filters, or CSS classes fails the test immediately.

**Files:**
- Create: `tests/core/pixelbrain/golden/npc-void-illustrated.svg`
- Modify: `tests/core/pixelbrain/character-to-svg.test.js`

- [ ] **Step 7.1: Generate the golden SVG file**

Run this one-shot node script from the project root to generate the golden file:

```bash
node --experimental-vm-modules -e "
import { forgeCharacter } from './codex/core/pixelbrain/character-foundry.js';
import { writeFileSync, mkdirSync } from 'fs';

const spec = {
  contract: 'CHARACTER-SPEC-v1',
  id: 'npc.void.v1',
  class: 'character',
  archetype: 'human',
  canvas: { width: 32, height: 48, gridSize: 1 },
  seed: 86,
  bytecode: 'VW-SCHOLAR-COMMON-RESONANT',
  presentation: { gender: 'feminine', heightClass: 'average', buildClass: 'average' },
  directions: ['south'],
  materials: { skin: 'skin_voidborne', hair: 'hair_void', eyes: 'eye_void_glow' },
  body: { profile: 'character.body.human.androgynous' },
  face: [
    { id: 'leftEye',  profile: 'character.face.eye.round', attach: { parent: 'body', at: 'face.eyeLeft' } },
    { id: 'rightEye', profile: 'character.face.eye.round', attach: { parent: 'body', at: 'face.eyeRight' } },
    { id: 'nose',     profile: 'character.face.nose.small', attach: { parent: 'body', at: 'face.nose' } },
    { id: 'mouth',    profile: 'character.face.mouth.small', attach: { parent: 'body', at: 'face.mouth' } },
  ],
  hair: { profile: 'character.hair.short', params: { color: 'hair_void' }, attach: { parent: 'body', at: 'headTop' } },
  clothing: [
    { id: 'bottom', profile: 'character.clothing.bottom.beginnerPants' },
    { id: 'top',    profile: 'character.clothing.top.beginnerRobe' },
    { id: 'shoes',  profile: 'character.clothing.shoes.beginnerBoots' },
  ],
  combatProfile: { school: 'VOID' },
};

const result = forgeCharacter(spec, { renderer: 'illustrated', scale: 1, smooth: false });
mkdirSync('tests/core/pixelbrain/golden', { recursive: true });
writeFileSync('tests/core/pixelbrain/golden/npc-void-illustrated.svg', result.svg, 'utf8');
console.log('Golden SVG written: ' + result.svg.length + ' bytes');
" 2>&1
```

If ESM import syntax causes issues with `-e`, create a temporary script instead:

```bash
cat > /tmp/gen-golden.mjs << 'EOF'
import { forgeCharacter } from './codex/core/pixelbrain/character-foundry.js';
import { writeFileSync, mkdirSync } from 'fs';

const spec = {
  contract: 'CHARACTER-SPEC-v1',
  id: 'npc.void.v1',
  class: 'character',
  archetype: 'human',
  canvas: { width: 32, height: 48, gridSize: 1 },
  seed: 86,
  bytecode: 'VW-SCHOLAR-COMMON-RESONANT',
  presentation: { gender: 'feminine', heightClass: 'average', buildClass: 'average' },
  directions: ['south'],
  materials: { skin: 'skin_voidborne', hair: 'hair_void', eyes: 'eye_void_glow' },
  body: { profile: 'character.body.human.androgynous' },
  face: [
    { id: 'leftEye',  profile: 'character.face.eye.round', attach: { parent: 'body', at: 'face.eyeLeft' } },
    { id: 'rightEye', profile: 'character.face.eye.round', attach: { parent: 'body', at: 'face.eyeRight' } },
    { id: 'nose',     profile: 'character.face.nose.small', attach: { parent: 'body', at: 'face.nose' } },
    { id: 'mouth',    profile: 'character.face.mouth.small', attach: { parent: 'body', at: 'face.mouth' } },
  ],
  hair: { profile: 'character.hair.short', params: { color: 'hair_void' }, attach: { parent: 'body', at: 'headTop' } },
  clothing: [
    { id: 'bottom', profile: 'character.clothing.bottom.beginnerPants' },
    { id: 'top',    profile: 'character.clothing.top.beginnerRobe' },
    { id: 'shoes',  profile: 'character.clothing.shoes.beginnerBoots' },
  ],
  combatProfile: { school: 'VOID' },
};

const result = forgeCharacter(spec, { renderer: 'illustrated', scale: 1, smooth: false });
mkdirSync('tests/core/pixelbrain/golden', { recursive: true });
writeFileSync('tests/core/pixelbrain/golden/npc-void-illustrated.svg', result.svg, 'utf8');
console.log('Golden SVG written: ' + result.svg.length + ' bytes');
EOF
node /tmp/gen-golden.mjs
```

Verify the file exists and is non-empty:

```bash
wc -c tests/core/pixelbrain/golden/npc-void-illustrated.svg
```

Expected: File exists, size > 500 bytes.

- [ ] **Step 7.2: Open the golden SVG visually to verify it looks correct**

Open the SVG in a browser or image viewer:

```bash
xdg-open tests/core/pixelbrain/golden/npc-void-illustrated.svg
```

Verify: a small character silhouette (32×48 cells) with fill regions, a shadow fringe, and an ink outline. If the SVG is blank or malformed, investigate `forgeCharacter` output before committing.

- [ ] **Step 7.3: Add the golden snapshot test**

In `tests/core/pixelbrain/character-to-svg.test.js`, add this import at the very top of the file (after existing imports):

```js
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
```

Then add a new describe block after the existing `describe('characterToSVG', ...)`:

```js
describe('golden SVG snapshot — npc.void.v1', () => {
  const GOLDEN_SPEC = {
    contract: 'CHARACTER-SPEC-v1',
    id: 'npc.void.v1',
    class: 'character',
    archetype: 'human',
    canvas: { width: 32, height: 48, gridSize: 1 },
    seed: 86,
    bytecode: 'VW-SCHOLAR-COMMON-RESONANT',
    presentation: { gender: 'feminine', heightClass: 'average', buildClass: 'average' },
    directions: ['south'],
    materials: { skin: 'skin_voidborne', hair: 'hair_void', eyes: 'eye_void_glow' },
    body: { profile: 'character.body.human.androgynous' },
    face: [
      { id: 'leftEye',  profile: 'character.face.eye.round', attach: { parent: 'body', at: 'face.eyeLeft' } },
      { id: 'rightEye', profile: 'character.face.eye.round', attach: { parent: 'body', at: 'face.eyeRight' } },
      { id: 'nose',     profile: 'character.face.nose.small', attach: { parent: 'body', at: 'face.nose' } },
      { id: 'mouth',    profile: 'character.face.mouth.small', attach: { parent: 'body', at: 'face.mouth' } },
    ],
    hair: { profile: 'character.hair.short', params: { color: 'hair_void' }, attach: { parent: 'body', at: 'headTop' } },
    clothing: [
      { id: 'bottom', profile: 'character.clothing.bottom.beginnerPants' },
      { id: 'top',    profile: 'character.clothing.top.beginnerRobe' },
      { id: 'shoes',  profile: 'character.clothing.shoes.beginnerBoots' },
    ],
    combatProfile: { school: 'VOID' },
  };

  it('forged SVG matches committed golden output byte-for-byte', () => {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const goldenPath = join(__dirname, 'golden', 'npc-void-illustrated.svg');
    const golden = readFileSync(goldenPath, 'utf8');

    const result = forgeCharacter(GOLDEN_SPEC, { renderer: 'illustrated', scale: 1, smooth: false });
    expect(result.svg).toBe(golden);
  });

  it('golden SVG has expected structure — fills, shading, outline, school class', () => {
    const result = forgeCharacter(GOLDEN_SPEC, { renderer: 'illustrated', scale: 1, smooth: false });
    const svg = result.svg;

    expect(svg).toContain('pb-character');
    expect(svg).toContain('school-void');
    expect(svg).toContain('pb-fills');
    expect(svg).toContain('pb-shading');
    expect(svg).toContain('pb-outlines');
    expect(svg).toContain('pb-outline');
    expect(svg).toContain('pb-part-body');
    expect(svg).toContain('viewBox="0 0 32 48"');
    expect(svg).toContain('width="32"');
    expect(svg).toContain('height="48"');
  });
});
```

- [ ] **Step 7.4: Run all pixelbrain SVG tests**

```bash
npm run test -- tests/core/pixelbrain/character-to-svg.test.js tests/core/pixelbrain/cell-boundary-tracer.test.js
```

Expected: **All 29 tests pass** (27 + 2 golden snapshot tests).

- [ ] **Step 7.5: Commit golden file and test**

```bash
git add tests/core/pixelbrain/golden/npc-void-illustrated.svg \
        tests/core/pixelbrain/character-to-svg.test.js
git commit -m "test(pixelbrain): golden SVG snapshot for npc.void.v1 — regression contract"
```

---

## Final Verification

- [ ] **Run the full pixelbrain test suite**

```bash
npm run test -- tests/core/pixelbrain/
```

Expected: All pixelbrain tests pass. The 36 pre-existing failures in other modules are unrelated to this work.

- [ ] **Verify illustrated render works end-to-end**

```bash
node -e "
import('./codex/core/pixelbrain/character-foundry.js').then(({ forgeCharacter }) => {
  const r = forgeCharacter({
    contract: 'CHARACTER-SPEC-v1', id: 'smoke-test', class: 'character', archetype: 'human',
    canvas: { width: 32, height: 48, gridSize: 1 }, seed: 1, bytecode: 'VW-SCHOLAR-COMMON-RESONANT',
    presentation: { gender: 'feminine', heightClass: 'average', buildClass: 'average' },
    directions: ['south'],
    materials: { skin: 'skin_light', hair: 'hair_brown', eyes: 'eye_brown' },
    body: { profile: 'character.body.human.androgynous' },
    face: [{ id: 'leftEye', profile: 'character.face.eye.round', attach: { parent: 'body', at: 'face.eyeLeft' } }],
    hair: { profile: 'character.hair.short' },
    clothing: [{ id: 'top', profile: 'character.clothing.top.beginnerRobe' }],
    combatProfile: { school: 'SONIC' },
  }, { renderer: 'illustrated', scale: 8 });
  console.log('SVG length:', r.svg.length);
  console.log('viewBox:', r.svg.match(/viewBox=\"[^\"]+\"/)?.[0]);
  console.log('width attr:', r.svg.match(/width=\"[^\"]+\"/)?.[0]);
  console.log('Has pb-fills:', r.svg.includes('pb-fills'));
  console.log('Has school-sonic:', r.svg.includes('school-sonic'));
});
"
```

Expected output (approximate):
```
SVG length: 15000+
viewBox: viewBox="0 0 32 48"
width attr: width="256"
Has pb-fills: true
Has school-sonic: true
```

- [ ] **Final commit on branch**

```bash
git log --oneline -7
```

You should see 7 commits for the 7 tasks. Branch `fix/wand-divwand-audit-hardening` is ready for review.

---

## Self-Review

**Spec coverage:** All 7 disparities from the Emergent Disparity Reconciliation Report are addressed:
- ✅ `isRim`/`isOutline` naming split → Tasks 1–3
- ✅ O(n²) `isOutlineCell` → Task 2
- ✅ `fills` shape contract test → Task 1 + 3
- ✅ `viewBox` cell units → Task 4
- ✅ `shaderForPart` registry → Task 5
- ✅ Shadow algorithm doc → Task 6
- ✅ Golden SVG snapshot → Task 7

**Placeholder scan:** All steps contain exact code. No "TBD", "similar to above", or "add appropriate error handling."

**Type consistency:**
- `isRim` field: introduced in Task 2 (`character-foundry.js`), read in Task 3 (`character-to-svg.js`), validated in Task 1 test — consistent.
- `getPartProfileMeta(id)` introduced in Task 5.1, imported in Task 5.4 — consistent.
- `buildShaderDefs(enabled, scale)` new signature in Task 4.2, called with `(shaderEffects, scale)` in Task 4.3 — consistent.
- `MOCK_FILLS` uses `isRim` after Task 3.4 — tests using it after that point are correct.
- Golden spec in Task 7.1 (generation) and Task 7.3 (assertion) are identical — consistent.
