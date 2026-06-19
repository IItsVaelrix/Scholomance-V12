# QBIT-Voxel Level 2 — Album Cover Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the Level 1 voxel crystal pipeline into DivWand as a `voxel` node type, and add `glyph_monuments` seeding so artist-name text can be rendered as stone obelisk formations.

**Architecture:** `GravityAMP` stacks flat XZ seeds vertically with an Obelisk energy taper. `glyph-rasterizer` converts a text string to outline pixel cells via Canvas 2D. `wand-seed-lift` gains a `generateVectorizedTextSeeds` entry point that chains rasterizer → outline → XZ lift → GravityAMP. `VoxelScenePortal` is a React component that runs the 8-step voxel pipeline synchronously in `useMemo` and renders the SVG string via `dangerouslySetInnerHTML`. DivWand gains a `voxel` node type whose sole role is `voxel-scene`; the validator, React dispatch, and CSS all get minimal targeted additions.

**Tech Stack:** Vitest (test runner), jsdom + canvas npm package (already configured), React 18, existing voxel pipeline modules in `codex/core/pixelbrain/`.

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| **Create** | `codex/core/pixelbrain/gravity-amp.js` | XZ seeds → vertical Obelisk seed stack |
| **Create** | `codex/core/pixelbrain/glyph-rasterizer.js` | Text string → outline pixel cells via Canvas 2D |
| **Modify** | `codex/core/pixelbrain/wand-seed-lift.js` | Add `generateVectorizedTextSeeds` export |
| **Create** | `src/pages/DivWand/components/VoxelScenePortal.jsx` | React component: runs pipeline, embeds SVG |
| **Modify** | `codex/core/modulation/planner/div-layout-validator.js` | Add `voxel` type, `voxel-scene` role, `seed`/`volumeSize` props |
| **Modify** | `src/pages/DivWand/DivWandPage.jsx` | Add `voxel` dispatch branch in `LayoutNode` |
| **Modify** | `src/pages/DivWand/DivWandPage.css` | Add `.div-voxel-scene` container styling |
| **Create** | `tests/pixelbrain/gravity-amp.test.js` | Unit tests for GravityAMP |
| **Create** | `tests/pixelbrain/glyph-rasterizer.test.js` | Unit tests for glyph rasterizer |
| **Modify** | `tests/pixelbrain/wand-seed-lift.test.js` | Add `generateVectorizedTextSeeds` tests |
| **Modify** | `tests/qa/modulation/div-layout.test.js` | Add voxel node type validation tests |

---

## Task 1: GravityAMP

Takes flat XZ seed positions and stacks them vertically following an Obelisk energy taper: full energy at base, decaying toward peak. This is what creates pillar-shaped voxel geometry from a flat set of XZ coordinates.

**Files:**
- Create: `codex/core/pixelbrain/gravity-amp.js`
- Create: `tests/pixelbrain/gravity-amp.test.js`

- [ ] **Step 1: Write the failing test**

```js
// tests/pixelbrain/gravity-amp.test.js
import { describe, it, expect } from 'vitest';
import { createVoxelVolume } from '../../codex/core/pixelbrain/voxel-volume.js';
import { applyGravityAMP } from '../../codex/core/pixelbrain/gravity-amp.js';

describe('applyGravityAMP', () => {
  it('produces multiple seeds per XZ input position', () => {
    const vol = createVoxelVolume(32, 32, 32);
    const xzSeeds = [{ vx: 16, vz: 16, energy: 1.0, energyType: 0 }];
    const seeds = applyGravityAMP(xzSeeds, vol);
    expect(seeds.length).toBeGreaterThan(1);
  });

  it('seeds span from baseY down to peakY', () => {
    const vol = createVoxelVolume(32, 32, 32);
    const xzSeeds = [{ vx: 10, vz: 10, energy: 1.0, energyType: 0 }];
    const seeds = applyGravityAMP(xzSeeds, vol, { steps: 4, baseYFraction: 0.75, peakYFraction: 0.1 });
    const yValues = seeds.map(s => s.vy);
    const baseY = Math.floor(32 * 0.75);
    const peakY = Math.floor(32 * 0.1);
    expect(Math.max(...yValues)).toBeLessThanOrEqual(baseY);
    expect(Math.min(...yValues)).toBeGreaterThanOrEqual(peakY);
  });

  it('base seed has higher energy than peak seed', () => {
    const vol = createVoxelVolume(32, 32, 32);
    const xzSeeds = [{ vx: 10, vz: 10, energy: 1.0, energyType: 0 }];
    const seeds = applyGravityAMP(xzSeeds, vol, { steps: 6 });
    // Sort by vy descending: highest vy = base (bottom of volume in voxel coords)
    const sorted = [...seeds].sort((a, b) => b.vy - a.vy);
    expect(sorted[0].energy).toBeGreaterThan(sorted[sorted.length - 1].energy);
  });

  it('all seed coordinates are within volume bounds', () => {
    const vol = createVoxelVolume(32, 32, 32);
    const xzSeeds = [{ vx: 0, vz: 0 }, { vx: 31, vz: 31 }];
    const seeds = applyGravityAMP(xzSeeds, vol);
    for (const s of seeds) {
      expect(s.vx).toBeGreaterThanOrEqual(0);
      expect(s.vx).toBeLessThan(32);
      expect(s.vy).toBeGreaterThanOrEqual(0);
      expect(s.vy).toBeLessThan(32);
      expect(s.vz).toBeGreaterThanOrEqual(0);
      expect(s.vz).toBeLessThan(32);
    }
  });

  it('is deterministic', () => {
    const vol = createVoxelVolume(32, 32, 32);
    const xzSeeds = [{ vx: 8, vz: 12, energy: 0.8, energyType: 0 }];
    const a = applyGravityAMP(xzSeeds, vol);
    const b = applyGravityAMP(xzSeeds, vol);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```
npx vitest run tests/pixelbrain/gravity-amp.test.js
```

Expected: FAIL — `Cannot find module '../../codex/core/pixelbrain/gravity-amp.js'`

- [ ] **Step 3: Implement GravityAMP**

```js
// codex/core/pixelbrain/gravity-amp.js
import { ENERGY_TYPES } from './voxel-volume.js';

export function applyGravityAMP(xzSeeds, volume, options = {}) {
  const {
    steps = 6,
    baseYFraction = 0.75,
    peakYFraction = 0.1,
    baseEnergy = 1.0,
    peakEnergy = 0.3,
    energyType = ENERGY_TYPES.STRUCTURAL,
  } = options;

  const baseY = Math.floor(volume.height * baseYFraction);
  const peakY = Math.floor(volume.height * peakYFraction);
  const seeds = [];

  for (const { vx, vz } of xzSeeds) {
    for (let step = 0; step < steps; step++) {
      const t = step / Math.max(1, steps - 1);
      const vy = Math.round(baseY + t * (peakY - baseY));
      const energy = baseEnergy + t * (peakEnergy - baseEnergy);
      seeds.push({
        vx: Math.max(0, Math.min(volume.width  - 1, vx)),
        vy: Math.max(0, Math.min(volume.height - 1, vy)),
        vz: Math.max(0, Math.min(volume.depth  - 1, vz)),
        energy,
        energyType,
      });
    }
  }

  return seeds;
}
```

- [ ] **Step 4: Run test to verify it passes**

```
npx vitest run tests/pixelbrain/gravity-amp.test.js
```

Expected: PASS — 5 tests

- [ ] **Step 5: Commit**

```bash
git add codex/core/pixelbrain/gravity-amp.js tests/pixelbrain/gravity-amp.test.js
git commit -m "feat(voxel): GravityAMP — XZ seeds to Obelisk vertical stack"
```

---

## Task 2: Glyph Rasterizer

Converts a text string into occupied pixel cells using Canvas 2D, then extracts outline boundary cells. The `createCanvas` parameter is injectable so tests can pass a mock without relying on font rendering.

**Files:**
- Create: `codex/core/pixelbrain/glyph-rasterizer.js`
- Create: `tests/pixelbrain/glyph-rasterizer.test.js`

- [ ] **Step 1: Write the failing tests**

```js
// tests/pixelbrain/glyph-rasterizer.test.js
import { describe, it, expect } from 'vitest';
import { rasterizeTextToPixels, extractGlyphOutline, RASTER_CANVAS_SIZE } from '../../codex/core/pixelbrain/glyph-rasterizer.js';

// Mock canvas factory: renders a 3×3 block of white pixels at center of a 16×16 canvas.
// Simulates what fillText would produce without needing real font rendering.
function makeMockCanvas(whitePixels) {
  return () => {
    const W = 16, H = 16;
    const data = new Uint8ClampedArray(W * H * 4); // all black
    for (const { x, y } of whitePixels) {
      const idx = (y * W + x) * 4;
      data[idx] = 255; data[idx + 1] = 255; data[idx + 2] = 255; data[idx + 3] = 255;
    }
    return {
      width: W, height: H,
      getContext: () => ({
        fillStyle: '',
        font: '',
        textAlign: '',
        textBaseline: '',
        fillRect: () => {},
        fillText: () => {},
        getImageData: () => ({ data }),
      }),
    };
  };
}

describe('rasterizeTextToPixels', () => {
  it('returns empty array when canvas context is null', () => {
    const createCanvas = () => ({ width: 16, height: 16, getContext: () => null });
    const cells = rasterizeTextToPixels('X', { createCanvas, canvasSize: { width: 16, height: 16 } });
    expect(cells).toEqual([]);
  });

  it('returns cells for white pixels in mock canvas', () => {
    const whitePixels = [{ x: 7, y: 7 }, { x: 8, y: 7 }, { x: 8, y: 8 }];
    const createCanvas = makeMockCanvas(whitePixels);
    const cells = rasterizeTextToPixels('A', { createCanvas, canvasSize: { width: 16, height: 16 } });
    expect(cells.length).toBe(3);
    expect(cells).toContainEqual({ x: 7, y: 7 });
    expect(cells).toContainEqual({ x: 8, y: 8 });
  });

  it('is deterministic for the same input', () => {
    const whitePixels = [{ x: 5, y: 5 }, { x: 6, y: 6 }];
    const createCanvas = makeMockCanvas(whitePixels);
    const a = rasterizeTextToPixels('B', { createCanvas, canvasSize: { width: 16, height: 16 } });
    const b = rasterizeTextToPixels('B', { createCanvas, canvasSize: { width: 16, height: 16 } });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe('extractGlyphOutline', () => {
  it('returns only boundary cells (cells with at least one empty 4-neighbor)', () => {
    // 3×3 filled block — only the 8 perimeter cells are outline; center is interior
    const cells = [];
    for (let y = 5; y <= 7; y++)
      for (let x = 5; x <= 7; x++)
        cells.push({ x, y });
    const outline = extractGlyphOutline(cells);
    // Center cell (6,6) has all 4 neighbors occupied — should NOT be in outline
    expect(outline).not.toContainEqual({ x: 6, y: 6 });
    // Corner cell (5,5) has neighbors missing — must be in outline
    expect(outline).toContainEqual({ x: 5, y: 5 });
  });

  it('returns all cells when input is a single pixel', () => {
    const cells = [{ x: 8, y: 8 }];
    const outline = extractGlyphOutline(cells);
    expect(outline).toEqual([{ x: 8, y: 8 }]);
  });

  it('returns empty array for empty input', () => {
    expect(extractGlyphOutline([])).toEqual([]);
  });
});

describe('RASTER_CANVAS_SIZE', () => {
  it('has width and height', () => {
    expect(RASTER_CANVAS_SIZE.width).toBeGreaterThan(0);
    expect(RASTER_CANVAS_SIZE.height).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```
npx vitest run tests/pixelbrain/glyph-rasterizer.test.js
```

Expected: FAIL — `Cannot find module '../../codex/core/pixelbrain/glyph-rasterizer.js'`

- [ ] **Step 3: Implement glyph-rasterizer**

```js
// codex/core/pixelbrain/glyph-rasterizer.js
export const RASTER_CANVAS_SIZE = Object.freeze({ width: 256, height: 128 });

export function rasterizeTextToPixels(text, options = {}) {
  const {
    fontSize = 48,
    fontFamily = 'serif',
    createCanvas: createCanvasFn = () => document.createElement('canvas'),
    canvasSize = RASTER_CANVAS_SIZE,
  } = options;

  const canvas = createCanvasFn();
  canvas.width  = canvasSize.width;
  canvas.height = canvasSize.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
  ctx.fillStyle = '#ffffff';
  ctx.font          = `${fontSize}px ${fontFamily}`;
  ctx.textAlign     = 'center';
  ctx.textBaseline  = 'middle';
  ctx.fillText(text, canvasSize.width / 2, canvasSize.height / 2);

  const { data } = ctx.getImageData(0, 0, canvasSize.width, canvasSize.height);
  const cells = [];
  for (let y = 0; y < canvasSize.height; y++) {
    for (let x = 0; x < canvasSize.width; x++) {
      if (data[(y * canvasSize.width + x) * 4] > 128) {
        cells.push({ x, y });
      }
    }
  }
  return cells;
}

export function extractGlyphOutline(cells) {
  if (cells.length === 0) return [];
  const occupied = new Set(cells.map(c => `${c.x},${c.y}`));
  return cells.filter(c =>
    !occupied.has(`${c.x - 1},${c.y}`) ||
    !occupied.has(`${c.x + 1},${c.y}`) ||
    !occupied.has(`${c.x},${c.y - 1}`) ||
    !occupied.has(`${c.x},${c.y + 1}`)
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```
npx vitest run tests/pixelbrain/glyph-rasterizer.test.js
```

Expected: PASS — 7 tests

- [ ] **Step 5: Commit**

```bash
git add codex/core/pixelbrain/glyph-rasterizer.js tests/pixelbrain/glyph-rasterizer.test.js
git commit -m "feat(voxel): glyph-rasterizer — text to outline pixel cells via Canvas 2D"
```

---

## Task 3: Wire `vectorized_text` in `wand-seed-lift.js`

Add `generateVectorizedTextSeeds` which chains rasterizer → outline → XZ lift → GravityAMP. This is the public entry point for the `vectorized_text` / `glyph_monuments` formula type.

**Files:**
- Modify: `codex/core/pixelbrain/wand-seed-lift.js`
- Modify: `tests/pixelbrain/wand-seed-lift.test.js`

- [ ] **Step 1: Write the failing tests**

Append to `tests/pixelbrain/wand-seed-lift.test.js`:

```js
import { generateVectorizedTextSeeds } from '../../codex/core/pixelbrain/wand-seed-lift.js';

// Reuse the same mock canvas factory pattern from glyph-rasterizer tests.
function makeMockCanvas(whitePixels, W = 64, H = 32) {
  return () => {
    const data = new Uint8ClampedArray(W * H * 4);
    for (const { x, y } of whitePixels) {
      if (x < W && y < H) {
        const idx = (y * W + x) * 4;
        data[idx] = 255; data[idx + 1] = 255; data[idx + 2] = 255; data[idx + 3] = 255;
      }
    }
    return {
      width: W, height: H,
      getContext: () => ({
        fillStyle: '', font: '', textAlign: '', textBaseline: '',
        fillRect: () => {}, fillText: () => {},
        getImageData: () => ({ data }),
      }),
    };
  };
}

describe('generateVectorizedTextSeeds', () => {
  it('returns seeds when mock canvas has white pixels', () => {
    const whitePixels = [{ x: 10, y: 8 }, { x: 11, y: 8 }, { x: 10, y: 9 }];
    const v = createVoxelVolume(32, 32, 32);
    const seeds = generateVectorizedTextSeeds('A', v, {
      createCanvas: makeMockCanvas(whitePixels, 64, 32),
      canvasSize: { width: 64, height: 32 },
    });
    expect(seeds.length).toBeGreaterThan(0);
  });

  it('each seed has vx, vy, vz, energy, energyType', () => {
    const whitePixels = [{ x: 20, y: 10 }];
    const v = createVoxelVolume(32, 32, 32);
    const seeds = generateVectorizedTextSeeds('B', v, {
      createCanvas: makeMockCanvas(whitePixels, 64, 32),
      canvasSize: { width: 64, height: 32 },
    });
    for (const s of seeds) {
      expect(typeof s.vx).toBe('number');
      expect(typeof s.vy).toBe('number');
      expect(typeof s.vz).toBe('number');
      expect(typeof s.energy).toBe('number');
      expect(typeof s.energyType).toBe('number');
    }
  });

  it('all seeds are within volume bounds', () => {
    const whitePixels = [{ x: 5, y: 5 }, { x: 50, y: 25 }];
    const v = createVoxelVolume(32, 32, 32);
    const seeds = generateVectorizedTextSeeds('C', v, {
      createCanvas: makeMockCanvas(whitePixels, 64, 32),
      canvasSize: { width: 64, height: 32 },
    });
    for (const s of seeds) {
      expect(s.vx).toBeGreaterThanOrEqual(0); expect(s.vx).toBeLessThan(32);
      expect(s.vy).toBeGreaterThanOrEqual(0); expect(s.vy).toBeLessThan(32);
      expect(s.vz).toBeGreaterThanOrEqual(0); expect(s.vz).toBeLessThan(32);
    }
  });

  it('returns empty array when canvas produces no white pixels', () => {
    const v = createVoxelVolume(32, 32, 32);
    const seeds = generateVectorizedTextSeeds('X', v, {
      createCanvas: makeMockCanvas([], 64, 32),
      canvasSize: { width: 64, height: 32 },
    });
    expect(seeds).toEqual([]);
  });

  it('is deterministic', () => {
    const whitePixels = [{ x: 15, y: 10 }, { x: 16, y: 10 }];
    const v = createVoxelVolume(32, 32, 32);
    const opts = { createCanvas: makeMockCanvas(whitePixels, 64, 32), canvasSize: { width: 64, height: 32 } };
    const a = generateVectorizedTextSeeds('D', v, opts);
    const b = generateVectorizedTextSeeds('D', v, opts);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```
npx vitest run tests/pixelbrain/wand-seed-lift.test.js
```

Expected: FAIL — `generateVectorizedTextSeeds is not a function`

- [ ] **Step 3: Add `generateVectorizedTextSeeds` to `wand-seed-lift.js`**

Add these lines at the top of `codex/core/pixelbrain/wand-seed-lift.js` (after the existing import of `ENERGY_TYPES`):

```js
import { rasterizeTextToPixels, extractGlyphOutline } from './glyph-rasterizer.js';
import { applyGravityAMP } from './gravity-amp.js';
```

Add this function at the end of `codex/core/pixelbrain/wand-seed-lift.js`:

```js
export function generateVectorizedTextSeeds(text, volume, options = {}) {
  const { canvasSize, createCanvas, gravityOptions = {} } = options;

  const cells = rasterizeTextToPixels(text, { ...options, createCanvas, canvasSize });
  const outlineCells = extractGlyphOutline(cells);

  if (outlineCells.length === 0) return [];

  const xzSeeds = liftToVoxelSeeds(outlineCells, volume, { ...options, canvasSize });
  return applyGravityAMP(xzSeeds, volume, gravityOptions);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```
npx vitest run tests/pixelbrain/wand-seed-lift.test.js
```

Expected: PASS — all existing tests + 5 new tests

- [ ] **Step 5: Commit**

```bash
git add codex/core/pixelbrain/wand-seed-lift.js tests/pixelbrain/wand-seed-lift.test.js
git commit -m "feat(voxel): generateVectorizedTextSeeds — glyph outline → GravityAMP vertical seeds"
```

---

## Task 4: VoxelScenePortal React Component

A React component that runs the full 8-step voxel pipeline synchronously in `useMemo` and renders the resulting SVG string as inline HTML. Accepts `node.props.text` for glyph_monuments mode or `node.props.seed` for Fibonacci crystal mode.

**Files:**
- Create: `src/pages/DivWand/components/VoxelScenePortal.jsx`

There are no isolated unit tests for this component — it's verified by running DivWand in the browser (Task 5 wires it in). The pipeline itself is already tested by `tests/pixelbrain/voxel-pipeline.test.js`.

- [ ] **Step 1: Create the component**

```jsx
// src/pages/DivWand/components/VoxelScenePortal.jsx
import { useMemo } from 'react';

import { createVoxelVolume, cellIndex, getCellMaterialId, isCellOccupied, setCellMaterial, ENERGY_TYPES } from '../../../codex/core/pixelbrain/voxel-volume.js';
import { generateFibonacciSeeds, generateVectorizedTextSeeds } from '../../../codex/core/pixelbrain/wand-seed-lift.js';
import { propagate, assignMaterial } from '../../../codex/core/pixelbrain/qbit-field.js';
import { applyHollownessAMP } from '../../../codex/core/pixelbrain/hollowness-amp.js';
import { runBiomeCoherenceAMP } from '../../../codex/core/pixelbrain/biome-coherence-amp.js';
import { collectFaces } from '../../../codex/core/pixelbrain/iso-projector.js';
import { renderFacesToSVG } from '../../../codex/core/pixelbrain/voxel-svg-renderer.js';

function runVoxelPipeline(volumeSize, seedCfg, text) {
  const SIZE = volumeSize;
  const volume = createVoxelVolume(SIZE, SIZE, SIZE);

  // Step 1–2: Generate seeds
  let rawSeeds;
  if (text) {
    rawSeeds = generateVectorizedTextSeeds(text, volume, {
      gravityOptions: { steps: seedCfg.gravitySteps ?? 6 },
    });
  } else {
    rawSeeds = generateFibonacciSeeds(
      { iterations: seedCfg.iterations ?? 6, scale: seedCfg.scale ?? 0.75 },
      volume,
      { energyType: ENERGY_TYPES.STRUCTURAL, initialEnergy: seedCfg.initialEnergy ?? 0.5 }
    );
  }

  // Remap { vx, vy, vz } → { x, y, z } for propagate
  const seeds = rawSeeds.map(s => ({ x: s.vx, y: s.vy, z: s.vz, energy: s.energy, energyType: s.energyType }));

  // Step 3: Propagate energy field
  const field = propagate(seeds, SIZE, SIZE, SIZE, {
    decay: seedCfg.decay ?? 0.15,
    iterations: seedCfg.propagationIterations ?? 3,
  });

  // Step 4: Assign materials
  for (let y = 0; y < SIZE; y++) {
    for (let z = 0; z < SIZE; z++) {
      for (let x = 0; x < SIZE; x++) {
        const energy = field.energyAt(x, y, z);
        volume.energyField[cellIndex(volume, x, y, z)] = energy;
        setCellMaterial(volume, x, y, z, assignMaterial(energy));
      }
    }
  }

  // Step 5: HollownessAMP
  applyHollownessAMP(volume, seedCfg.hollowIterations ?? 3);

  // Step 6: BiomeCoherenceAMP — wrap field to cell-object API
  runBiomeCoherenceAMP(volume, {
    energyAt: (cell) => field.energyAt(cell.x, cell.y, cell.z),
  });

  // Step 7: Collect faces
  const rawFaces = collectFaces(
    volume,
    (x, y, z) => getCellMaterialId(volume, x, y, z),
    (x, y, z) => isCellOccupied(volume, x, y, z)
  );

  // Remap faceType → type for SVG renderer
  const faces = rawFaces.map(f => ({ ...f, type: f.faceType }));

  // Step 8: Render SVG
  return renderFacesToSVG(faces);
}

export function VoxelScenePortal({ node }) {
  const seed       = node.props?.seed       ?? {};
  const volumeSize = node.props?.volumeSize ?? 32;
  const text       = node.props?.text       ?? null;

  const svgString = useMemo(
    () => runVoxelPipeline(volumeSize, seed, text),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(seed), volumeSize, text]
  );

  const layoutStyle = {
    width:  node.layout?.width  != null ? `${node.layout.width}px`  : '100%',
    height: node.layout?.height != null ? `${node.layout.height}px` : '300px',
    overflow: 'hidden',
  };

  return (
    <div
      id={node.id}
      className="div-node div-voxel-scene"
      style={layoutStyle}
      dangerouslySetInnerHTML={{ __html: svgString }}
    />
  );
}
```

- [ ] **Step 2: Verify the file exists and has no syntax errors**

```
node --input-type=module < /dev/null && npx vitest run tests/pixelbrain/voxel-pipeline.test.js
```

Expected: existing pipeline tests still pass (no import breakage from new files)

- [ ] **Step 3: Commit**

```bash
git add src/pages/DivWand/components/VoxelScenePortal.jsx
git commit -m "feat(divwand): VoxelScenePortal — React component wrapping 8-step voxel pipeline"
```

---

## Task 5: DivWand `voxel` Node Type

Wire the validator, React dispatch, and CSS so a `voxel` node type renders `VoxelScenePortal`. Add tests for the new validation rules.

**Files:**
- Modify: `codex/core/modulation/planner/div-layout-validator.js`
- Modify: `src/pages/DivWand/DivWandPage.jsx`
- Modify: `src/pages/DivWand/DivWandPage.css`
- Modify: `tests/qa/modulation/div-layout.test.js`

- [ ] **Step 1: Write the failing validator tests**

Append to `tests/qa/modulation/div-layout.test.js`:

```js
describe('voxel node type', () => {
  it('accepts a valid voxel node', () => {
    const node = {
      id: 'crystal-bg',
      type: 'voxel',
      role: 'voxel-scene',
      props: { volumeSize: 32 },
    };
    const errors = validateDivLayout(node);
    expect(errors).toEqual([]);
  });

  it('accepts voxel node with text prop', () => {
    const node = {
      id: 'glyph-monuments',
      type: 'voxel',
      role: 'voxel-scene',
      props: { text: 'DAMIEN', volumeSize: 32 },
    };
    const errors = validateDivLayout(node);
    expect(errors).toEqual([]);
  });

  it('accepts voxel node with seed prop', () => {
    const node = {
      id: 'fibonacci-crystal',
      type: 'voxel',
      role: 'voxel-scene',
      props: { seed: { iterations: 6, scale: 0.75 }, volumeSize: 32 },
    };
    const errors = validateDivLayout(node);
    expect(errors).toEqual([]);
  });

  it('rejects voxel node with wrong role', () => {
    const node = {
      id: 'bad-voxel',
      type: 'voxel',
      role: 'text',
      props: {},
    };
    const errors = validateDivLayout(node);
    expect(errors.some(e => e.includes('voxel') || e.includes('role'))).toBe(true);
  });

  it('rejects unknown props on voxel node', () => {
    const node = {
      id: 'bad-props',
      type: 'voxel',
      role: 'voxel-scene',
      props: { unknownField: true },
    };
    const errors = validateDivLayout(node);
    expect(errors.some(e => e.includes('unknownField'))).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```
npx vitest run tests/qa/modulation/div-layout.test.js
```

Expected: FAIL — `'voxel' not in allowed types` and `'voxel-scene' not in valid roles`

- [ ] **Step 3: Update `div-layout-validator.js`**

In `div-layout-validator.js`, make three targeted edits:

**Edit 1** — type allowlist (line 35):

Old:
```js
  } else if (!['container', 'element'].includes(node.type)) {
    errors.push(`Invalid node type: "${node.type}". Allowed: container, element`);
  }
```

New:
```js
  } else if (!['container', 'element', 'voxel'].includes(node.type)) {
    errors.push(`Invalid node type: "${node.type}". Allowed: container, element, voxel`);
  }
```

**Edit 2** — validRoles array (after line 54, add `'voxel-scene'`):

Old:
```js
      'glow-container'
    ];
```

New:
```js
      'glow-container',
      'voxel-scene',
    ];
```

**Edit 3** — role/type coupling: `voxel` type must use `voxel-scene` role. Add after the `validRoles` check block (after the `if (!validRoles.includes(node.role))` block closes):

```js
    if (node.type === 'voxel' && node.role !== 'voxel-scene') {
      errors.push(`Nodes with type "voxel" must use role "voxel-scene", got "${node.role}"`);
    }
```

**Edit 4** — allowedProps (line 153):

Old:
```js
      const allowedProps = ['text', 'icon', 'title', 'subtitle', 'interactive', 'onClickAction'];
```

New:
```js
      const allowedProps = ['text', 'icon', 'title', 'subtitle', 'interactive', 'onClickAction', 'seed', 'volumeSize'];
```

- [ ] **Step 4: Run validator tests to verify they pass**

```
npx vitest run tests/qa/modulation/div-layout.test.js
```

Expected: PASS — all existing tests + 5 new voxel tests

- [ ] **Step 5: Update `DivWandPage.jsx` — add import and dispatch branch**

At the top of `src/pages/DivWand/DivWandPage.jsx`, add the import after existing imports:

```js
import { VoxelScenePortal } from './components/VoxelScenePortal.jsx';
```

In the `LayoutNode` component, add a dispatch branch before the `if (node.type === 'element')` block (line 278):

```js
  if (node.type === 'voxel') {
    return <VoxelScenePortal node={node} />;
  }
```

- [ ] **Step 6: Update `DivWandPage.css` — add voxel scene container style**

Append to `src/pages/DivWand/DivWandPage.css`:

```css
/* Voxel scene portal — SVG fills the container, no scroll */
.div-voxel-scene {
  display: block;
  overflow: hidden;
  background: #0a0a0f;
}

.div-voxel-scene svg {
  width: 100%;
  height: 100%;
  display: block;
}
```

- [ ] **Step 7: Run the full test suite to confirm no regressions**

```
npx vitest run
```

Expected: all tests pass

- [ ] **Step 8: Commit**

```bash
git add codex/core/modulation/planner/div-layout-validator.js \
        src/pages/DivWand/DivWandPage.jsx \
        src/pages/DivWand/DivWandPage.css \
        tests/qa/modulation/div-layout.test.js
git commit -m "feat(divwand): voxel node type — validator, dispatch, CSS, VoxelScenePortal integration"
```

---

## Task 6: Browser Verification

Confirm the crystal renders in DivWand by adding a `voxel` node to the editor JSON.

**No files to commit** — this is a manual verification step.

- [ ] **Step 1: Start the dev server**

```
npm run dev
```

- [ ] **Step 2: Open DivWand in the browser**

Navigate to the DivWand page in the running dev server.

- [ ] **Step 3: Paste this node JSON into the editor**

```json
{
  "id": "fibonacci-crystal",
  "type": "voxel",
  "role": "voxel-scene",
  "layout": { "width": 400, "height": 350 },
  "props": { "volumeSize": 32, "seed": { "iterations": 6, "scale": 0.75 } }
}
```

Expected: isometric Fibonacci crystal SVG renders inside the layout node at 400×350px.

- [ ] **Step 4: Test glyph_monuments mode**

Replace `props` with:

```json
{ "volumeSize": 32, "text": "DAMIEN" }
```

Expected: obelisk formation SVG renders — stone columns derived from letter outlines.

- [ ] **Step 5: Confirm inspector HUD still works**

Activate the inspector, hover the voxel node.

Expected: HUD shows `type: voxel`, `role: voxel-scene`, correct `actualRect` dimensions.

---

## Self-Review

**Spec coverage check:**

| Level 2 requirement | Task |
|---|---|
| VoxelScenePortal — React canvas escape hatch | Task 4 |
| `voxel.scene` node type in DivWand | Task 5 |
| Wand `glyph_monuments` text lift | Tasks 1–3 |
| DivWand composition: crystal background | Task 6 (verification) |

**Placeholder scan:** None found — all steps have concrete code.

**Type consistency:**
- `applyGravityAMP(xzSeeds, volume, options)` — consistent across Task 1 implementation and Task 3 call site
- `generateVectorizedTextSeeds(text, volume, options)` — consistent across Task 3 implementation and Task 4 call site
- Seed shape `{ vx, vy, vz, energy, energyType }` — consistent throughout; remapped to `{ x, y, z }` only at the propagate call in Task 4, mirroring the exact pattern in `tests/pixelbrain/voxel-pipeline.test.js:33-39`
- `validateDivLayout` import — already present in `div-layout.test.js`; new tests extend the existing describe structure
