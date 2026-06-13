# PixelBrain SVG Illustrated Renderer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an `'illustrated'` renderer to `forgeCharacter()` that outputs an SVG string instead of PNG bytes — smooth ink-outline characters with flat fills + a one-cell shadow fringe, infinitely scalable, school-CSS-themeable.

**Architecture:** Four new pure modules (`cell-boundary-tracer`, `svg-path-builder`, `character-to-svg`, `renderer-registry`) are composed bottom-up. `character-foundry.js` gains a `renderer` option at its output stage only — the entire AMP pipeline runs unchanged. `ActorForgeLab` renders an SVG preview panel; `CharacterShaderRenderer.bake()` loads the SVG as a Phaser texture via the existing `addBase64` path.

**Tech Stack:** Pure JS (no DOM), Vitest, React (ActorForgeLab), Phaser 4 (bake)

---

## Important Data-Shape Note

`character-foundry.js` uses its own `applyCharacterFills()` (line 49), NOT `region-fill-amp`. Character fill coordinates look like:

```js
{ x: number, y: number, color: string, partId: string, isOutline: boolean }
```

There is no `slot`, no `slotRanges`, no `partOf` Map on the fills object. The shadow zone is computed from adjacency to `isOutline` cells inside `character-to-svg.js`, not from slot bands.

---

## File Map

| File | Status | Notes |
|---|---|---|
| `codex/core/pixelbrain/cell-boundary-tracer.js` | **CREATE** | Cell set → polygon vertices + bezier segments |
| `codex/core/pixelbrain/svg-path-builder.js` | **CREATE** | Vertices/segments → SVG `d` string + element strings |
| `codex/core/pixelbrain/character-to-svg.js` | **CREATE** | Full SVG assembly from character fills + spec |
| `codex/core/pixelbrain/renderer-registry.js` | **CREATE** | Registry: name → `{ render, outputType }` |
| `tests/core/pixelbrain/cell-boundary-tracer.test.js` | **CREATE** | Unit tests |
| `tests/core/pixelbrain/character-to-svg.test.js` | **CREATE** | Unit tests |
| `codex/core/pixelbrain/character-foundry.js` | **MODIFY** | Add `renderer` option at output stage only (line ~344) |
| `src/pages/Combat/scenes/CharacterShaderRenderer.js` | **MODIFY** | `bake()` detects SVG output, uses data URL |
| `src/pages/internal/pixel-lotus/ActorForgeLab.tsx` | **MODIFY** | SVG preview panel alongside existing sprite view |

---

## Task 1: `cell-boundary-tracer.js`

**Files:**
- Create: `codex/core/pixelbrain/cell-boundary-tracer.js`
- Create: `tests/core/pixelbrain/cell-boundary-tracer.test.js`

This module traces the outer boundary of a set of cells (identified by `"x,y"` string keys) into an ordered polygon, then optionally converts that polygon to smooth Catmull-Rom bezier segments.

**Algorithm — edge-chain tracing:**
Each boundary cell contributes edges where it has no occupied neighbor. Edges connect cell-corner coordinates. We collect all boundary edges into a `corner → [connected corners]` adjacency map, then walk the chain starting from the topmost-leftmost cell's top-left corner.

- [ ] **Step 1: Write the failing tests**

Create `tests/core/pixelbrain/cell-boundary-tracer.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { traceBoundary } from '../../../codex/core/pixelbrain/cell-boundary-tracer.js';

describe('traceBoundary', () => {
  it('empty set returns empty result without throwing', () => {
    expect(() => traceBoundary(new Set())).not.toThrow();
    const { vertices, segments } = traceBoundary(new Set());
    expect(vertices).toHaveLength(0);
    expect(segments).toHaveLength(0);
  });

  it('single cell produces exactly 4 vertices', () => {
    const { vertices } = traceBoundary(new Set(['2,3']), { smooth: false });
    expect(vertices).toHaveLength(4);
    // Cell at (2,3) has corners at (2,3),(3,3),(3,4),(2,4)
    const keys = vertices.map(([x, y]) => `${x},${y}`);
    expect(keys).toContain('2,3');
    expect(keys).toContain('3,3');
    expect(keys).toContain('3,4');
    expect(keys).toContain('2,4');
  });

  it('2×2 block has exactly 4 outer corners (no internal edges)', () => {
    const cells = new Set(['0,0', '1,0', '0,1', '1,1']);
    const { vertices } = traceBoundary(cells, { smooth: false });
    expect(vertices).toHaveLength(4);
  });

  it('1×3 column has exactly 4 corners', () => {
    const cells = new Set(['0,0', '0,1', '0,2']);
    const { vertices } = traceBoundary(cells, { smooth: false });
    expect(vertices).toHaveLength(4);
  });

  it('L-shape (3 cells in column + 1 extending right at bottom) has 6 corners', () => {
    // Column: (0,0),(0,1),(0,2) + extension (1,2)
    const cells = new Set(['0,0', '0,1', '0,2', '1,2']);
    const { vertices } = traceBoundary(cells, { smooth: false });
    expect(vertices).toHaveLength(6);
  });

  it('smooth=true returns non-empty segments array for shapes with > 3 vertices', () => {
    const cells = new Set(['0,0', '1,0', '2,0', '0,1', '1,1', '0,2']);
    const { segments } = traceBoundary(cells, { smooth: true, tension: 0.4 });
    expect(Array.isArray(segments)).toBe(true);
    expect(segments.length).toBeGreaterThan(0);
  });

  it('smooth=false returns empty segments array', () => {
    const cells = new Set(['0,0', '1,0']);
    const { segments } = traceBoundary(cells, { smooth: false });
    expect(segments).toHaveLength(0);
  });

  it('each segment has p1, cp1, cp2, p2 with 2-element arrays', () => {
    const cells = new Set(['0,0','1,0','2,0','1,1','0,1','0,2']);
    const { segments } = traceBoundary(cells, { smooth: true });
    for (const seg of segments) {
      expect(seg).toHaveProperty('p1');
      expect(seg).toHaveProperty('cp1');
      expect(seg).toHaveProperty('cp2');
      expect(seg).toHaveProperty('p2');
      expect(seg.p1).toHaveLength(2);
      expect(seg.cp1).toHaveLength(2);
    }
  });

  it('is deterministic — same input → same output', () => {
    const cells = new Set(['1,1','2,1','3,1','1,2','2,2','1,3']);
    const a = traceBoundary(cells, { smooth: true });
    const b = traceBoundary(cells, { smooth: true });
    expect(a.vertices).toEqual(b.vertices);
    expect(a.segments).toEqual(b.segments);
  });
});
```

- [ ] **Step 2: Run tests — confirm they all fail**

```bash
cd /home/deck/Desktop/Scholomance-V12-main
npx vitest run tests/core/pixelbrain/cell-boundary-tracer.test.js 2>&1 | tail -20
```

Expected: `Cannot find module` or similar — the file doesn't exist yet.

- [ ] **Step 3: Implement `cell-boundary-tracer.js`**

Create `codex/core/pixelbrain/cell-boundary-tracer.js`:

```js
/**
 * CELL-BOUNDARY-TRACER
 * Traces the outer boundary of a set of occupied cells into a polygon.
 * Optionally converts the polygon to smooth Catmull-Rom bezier segments.
 *
 * Cell at (cx,cy) occupies grid square from corner (cx,cy) to (cx+1,cy+1).
 * Output vertices are in cell-corner space (integer coordinates).
 */

function addEdge(adj, x1, y1, x2, y2) {
  const k1 = `${x1},${y1}`, k2 = `${x2},${y2}`;
  if (!adj.has(k1)) adj.set(k1, []);
  if (!adj.has(k2)) adj.set(k2, []);
  adj.get(k1).push(k2);
  adj.get(k2).push(k1);
}

function buildEdgeAdjacency(cellSet) {
  const adj = new Map();
  for (const key of cellSet) {
    const [cx, cy] = key.split(',').map(Number);
    if (!cellSet.has(`${cx - 1},${cy}`)) addEdge(adj, cx, cy,     cx, cy + 1);
    if (!cellSet.has(`${cx + 1},${cy}`)) addEdge(adj, cx + 1, cy, cx + 1, cy + 1);
    if (!cellSet.has(`${cx},${cy - 1}`)) addEdge(adj, cx, cy,     cx + 1, cy);
    if (!cellSet.has(`${cx},${cy + 1}`)) addEdge(adj, cx, cy + 1, cx + 1, cy + 1);
  }
  return adj;
}

function findStart(cellSet) {
  let sx = Infinity, sy = Infinity;
  for (const key of cellSet) {
    const [cx, cy] = key.split(',').map(Number);
    if (cy < sy || (cy === sy && cx < sx)) { sx = cx; sy = cy; }
  }
  return `${sx},${sy}`; // top-left corner of topmost-leftmost cell
}

function walkChain(adj, startKey) {
  const vertices = [];
  const visited = new Set();
  let current = startKey;
  let prev = null;

  for (let i = 0; i < adj.size * 4; i++) {
    if (visited.has(current)) break;
    visited.add(current);
    const [x, y] = current.split(',').map(Number);
    vertices.push([x, y]);

    const neighbors = adj.get(current) || [];
    // Prefer not backtracking; among valid choices pick lowest key for determinism
    const candidates = neighbors.filter(n => n !== prev).sort();
    const next = candidates[0];
    if (!next) break;
    prev = current;
    current = next;
  }

  return vertices;
}

function catmullRomSegments(vertices, tension) {
  const n = vertices.length;
  if (n < 3) return [];
  const segments = [];
  for (let i = 0; i < n; i++) {
    const p0 = vertices[(i - 1 + n) % n];
    const p1 = vertices[i];
    const p2 = vertices[(i + 1) % n];
    const p3 = vertices[(i + 2) % n];
    segments.push({
      p1,
      cp1: [
        p1[0] + (p2[0] - p0[0]) * tension / 3,
        p1[1] + (p2[1] - p0[1]) * tension / 3,
      ],
      cp2: [
        p2[0] - (p3[0] - p1[0]) * tension / 3,
        p2[1] - (p3[1] - p1[1]) * tension / 3,
      ],
      p2,
    });
  }
  return segments;
}

/**
 * Trace the outer boundary of an occupied cell set.
 *
 * @param {Set<string>} cellSet   — Set of "x,y" cell keys
 * @param {object}      [options]
 * @param {boolean}     [options.smooth=true]    — emit Catmull-Rom segments
 * @param {number}      [options.tension=0.4]    — curve tension (0=sharp, 1=loose)
 * @returns {{ vertices: [number,number][], segments: object[] }}
 */
export function traceBoundary(cellSet, options = {}) {
  const { smooth = true, tension = 0.4 } = options;

  if (!cellSet || cellSet.size === 0) return { vertices: [], segments: [] };

  const adj = buildEdgeAdjacency(cellSet);
  if (adj.size === 0) return { vertices: [], segments: [] };

  const startKey = findStart(cellSet);
  const vertices = walkChain(adj, startKey);

  const segments = smooth && vertices.length >= 3
    ? catmullRomSegments(vertices, tension)
    : [];

  return { vertices, segments };
}
```

- [ ] **Step 4: Run tests — confirm they all pass**

```bash
npx vitest run tests/core/pixelbrain/cell-boundary-tracer.test.js 2>&1 | tail -20
```

Expected: `9 passed`.

- [ ] **Step 5: Commit**

```bash
git add codex/core/pixelbrain/cell-boundary-tracer.js tests/core/pixelbrain/cell-boundary-tracer.test.js
git commit -m "$(cat <<'EOF'
feat(pixelbrain): cell-boundary-tracer — cell set → polygon + bezier segments

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: `svg-path-builder.js`

**Files:**
- Create: `codex/core/pixelbrain/svg-path-builder.js`

Pure functions that convert tracer output to SVG strings. No tests needed — covered by integration in Task 3.

- [ ] **Step 1: Implement `svg-path-builder.js`**

Create `codex/core/pixelbrain/svg-path-builder.js`:

```js
/**
 * SVG-PATH-BUILDER
 * Converts cell-boundary-tracer output to SVG string fragments.
 * No DOM dependency — pure string concatenation.
 */

/**
 * Build an SVG `d` attribute string from tracer output.
 *
 * @param {{ vertices: [number,number][], segments: object[] }} traceResult
 * @param {{ smooth?: boolean, scale?: number }} [options]
 * @returns {string}  SVG path `d` value, or '' if no vertices
 */
export function buildPath(traceResult, options = {}) {
  const { smooth = true, scale = 8 } = options;
  const { vertices = [], segments = [] } = traceResult;

  if (vertices.length === 0) return '';

  const s = scale;

  if (!smooth || segments.length === 0) {
    const [sx, sy] = vertices[0];
    const parts = [`M ${sx * s},${sy * s}`];
    for (let i = 1; i < vertices.length; i++) {
      const [x, y] = vertices[i];
      parts.push(`L ${x * s},${y * s}`);
    }
    parts.push('Z');
    return parts.join(' ');
  }

  const [sx, sy] = segments[0].p1;
  const parts = [`M ${sx * s},${sy * s}`];
  for (const seg of segments) {
    const [cp1x, cp1y] = seg.cp1;
    const [cp2x, cp2y] = seg.cp2;
    const [p2x, p2y]   = seg.p2;
    parts.push(
      `C ${(cp1x * s).toFixed(2)},${(cp1y * s).toFixed(2)} ` +
      `${(cp2x * s).toFixed(2)},${(cp2y * s).toFixed(2)} ` +
      `${p2x * s},${p2y * s}`
    );
  }
  parts.push('Z');
  return parts.join(' ');
}

/**
 * Build a `<path .../>` element string.
 */
export function buildPathElement({ d, fill = 'none', stroke, strokeWidth, className, opacity }) {
  if (!d) return '';
  const attrs = [];
  if (className)   attrs.push(`class="${className}"`);
  attrs.push(`fill="${fill}"`);
  if (stroke)      attrs.push(`stroke="${stroke}"`);
  if (strokeWidth != null) attrs.push(`stroke-width="${strokeWidth}"`);
  if (strokeWidth != null) attrs.push(`stroke-linejoin="round" stroke-linecap="round"`);
  if (opacity != null) attrs.push(`opacity="${opacity}"`);
  attrs.push(`d="${d}"`);
  return `<path ${attrs.join(' ')}/>`;
}

/**
 * Build any SVG element string: `<tag attrs...>children</tag>` or self-closing.
 * attrs values are plain strings/numbers — no escaping (internal use only).
 */
export function buildSVGElement(tag, attrs = {}, children = '') {
  const attrStr = Object.entries(attrs)
    .map(([k, v]) => `${k}="${v}"`)
    .join(' ');
  if (!children && children !== 0) return `<${tag} ${attrStr}/>`;
  return `<${tag} ${attrStr}>${children}</${tag}>`;
}
```

- [ ] **Step 2: Run full test suite to ensure no breakage**

```bash
npx vitest run tests/core/pixelbrain/ 2>&1 | tail -20
```

Expected: all existing tests pass.

- [ ] **Step 3: Commit**

```bash
git add codex/core/pixelbrain/svg-path-builder.js
git commit -m "$(cat <<'EOF'
feat(pixelbrain): svg-path-builder — tracer output → SVG path strings

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: `character-to-svg.js` + tests

**Files:**
- Create: `codex/core/pixelbrain/character-to-svg.js`
- Create: `tests/core/pixelbrain/character-to-svg.test.js`

Assembles a complete SVG from character fill output (`applyCharacterFills` returns `coordinates[{ x, y, color, partId, isOutline }]`). Shadow zone = cells adjacent to `isOutline` cells (1-cell inner fringe). No `slot` or `slotRanges` needed.

- [ ] **Step 1: Write the failing tests**

Create `tests/core/pixelbrain/character-to-svg.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { characterToSVG } from '../../../codex/core/pixelbrain/character-to-svg.js';

// Minimal character fills — matches applyCharacterFills() output shape.
// A 3-cell "body" region: two interior cells + one outline cell.
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

const MOCK_SPEC = {
  contract: 'CHARACTER-SPEC-v1',
  canvas: { width: 4, height: 6 },
  combatProfile: { school: 'VOID' },
};

describe('characterToSVG', () => {
  it('returns a non-empty string starting with <svg', () => {
    const svg = characterToSVG(MOCK_FILLS, MOCK_SPEC, {});
    expect(typeof svg).toBe('string');
    expect(svg.trimStart()).toMatch(/^<svg/);
  });

  it('viewBox matches canvas dimensions × scale', () => {
    const svg = characterToSVG(MOCK_FILLS, MOCK_SPEC, { scale: 1 });
    expect(svg).toContain('viewBox="0 0 4 6"');
  });

  it('width and height attributes match canvas × scale', () => {
    const svg = characterToSVG(MOCK_FILLS, MOCK_SPEC, { scale: 4 });
    expect(svg).toContain('width="16"');
    expect(svg).toContain('height="24"');
  });

  it('root element has pb-character class', () => {
    const svg = characterToSVG(MOCK_FILLS, MOCK_SPEC, {});
    expect(svg).toContain('pb-character');
  });

  it('root element has school class from combatProfile.school', () => {
    const svg = characterToSVG(MOCK_FILLS, MOCK_SPEC, {});
    expect(svg).toContain('school-void');
  });

  it('contains a fill path for the body part', () => {
    const svg = characterToSVG(MOCK_FILLS, MOCK_SPEC, {});
    expect(svg).toContain('pb-part-body');
  });

  it('contains an outline path with stroke attribute', () => {
    const svg = characterToSVG(MOCK_FILLS, MOCK_SPEC, {});
    expect(svg).toContain('pb-outline');
    expect(svg).toContain('stroke=');
  });

  it('twoTone=false omits the pb-shading group', () => {
    const svg = characterToSVG(MOCK_FILLS, MOCK_SPEC, { twoTone: false });
    expect(svg).not.toContain('pb-shading');
  });

  it('is deterministic — same input → same output 50 times', () => {
    const first = characterToSVG(MOCK_FILLS, MOCK_SPEC, {});
    for (let i = 0; i < 49; i++) {
      expect(characterToSVG(MOCK_FILLS, MOCK_SPEC, {})).toBe(first);
    }
  });

  it('handles missing canvas on spec — defaults to 32×48 viewBox at scale 1', () => {
    const specNoCanvas = { contract: 'CHARACTER-SPEC-v1', combatProfile: { school: 'SONIC' } };
    const svg = characterToSVG(MOCK_FILLS, specNoCanvas, { scale: 1 });
    expect(svg).toContain('viewBox="0 0 32 48"');
  });

  it('handles empty coordinates without throwing', () => {
    const emptyFills = { ...MOCK_FILLS, coordinates: [] };
    expect(() => characterToSVG(emptyFills, MOCK_SPEC, {})).not.toThrow();
  });
});
```

- [ ] **Step 2: Run tests — confirm they all fail**

```bash
npx vitest run tests/core/pixelbrain/character-to-svg.test.js 2>&1 | tail -20
```

Expected: `Cannot find module`.

- [ ] **Step 3: Implement `character-to-svg.js`**

Create `codex/core/pixelbrain/character-to-svg.js`:

```js
/**
 * CHARACTER-TO-SVG
 * Converts applyCharacterFills() output into a styled SVG string.
 *
 * Input fills shape:
 *   { coordinates: [{ x, y, color, partId, isOutline }], palette, partColors, diagnostics }
 *
 * Layers (bottom to top):
 *   1. pb-fills    — one <path> per partId, base fill color
 *   2. pb-shading  — one <path> per partId for the 1-cell inner shadow fringe
 *   3. pb-outlines — single <path> for all outline cells
 */

import { traceBoundary } from './cell-boundary-tracer.js';
import { buildPath, buildPathElement, buildSVGElement } from './svg-path-builder.js';

function darkenHex(hex, amount) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  let l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  l = Math.max(0, l - amount);
  function hue2rgb(p, q, t) {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  }
  let nr, ng, nb;
  if (s === 0) {
    nr = ng = nb = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    nr = hue2rgb(p, q, h + 1/3);
    ng = hue2rgb(p, q, h);
    nb = hue2rgb(p, q, h - 1/3);
  }
  const toHex = v => Math.round(v * 255).toString(16).padStart(2, '0');
  return `#${toHex(nr)}${toHex(ng)}${toHex(nb)}`;
}

function cellsToKeySet(cells) {
  const s = new Set();
  for (const c of cells) s.add(`${c.x},${c.y}`);
  return s;
}

function getFillColor(cells) {
  const nonOutline = cells.find(c => !c.isOutline);
  return (nonOutline ?? cells[0])?.color ?? '#888888';
}

/**
 * Convert character fills to an SVG string.
 *
 * @param {object} fills      — output of applyCharacterFills()
 * @param {object} spec       — CHARACTER-SPEC-v1
 * @param {object} [options]
 * @param {number} [options.scale=8]          — pixels per cell in output SVG
 * @param {boolean} [options.twoTone=true]    — render shadow fringe
 * @param {number} [options.strokeWidth=1.5]  — outline stroke width
 * @param {boolean} [options.smooth=true]     — Catmull-Rom smoothing
 * @returns {string}  Complete SVG markup
 */
export function characterToSVG(fills, spec, options = {}) {
  const { scale = 8, twoTone = true, strokeWidth = 1.5, smooth = true } = options;
  const svgWidth  = (spec?.canvas?.width  ?? 32) * scale;
  const svgHeight = (spec?.canvas?.height ?? 48) * scale;
  const school    = spec?.combatProfile?.school?.toLowerCase() ?? 'unknown';

  // Group coordinates by partId
  const partAllCells    = new Map(); // partId → all cells (incl. outline)
  const partOutlineCells = new Map(); // partId → outline cells only
  const allOutlineCells = [];

  for (const cell of (fills.coordinates || [])) {
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

  // ── Layer 1: fill paths ──────────────────────────────────────────────
  const fillPaths = [];
  for (const [partId, cells] of partAllCells) {
    if (cells.length === 0) continue;
    const fillColor = getFillColor(cells);
    const keySet = cellsToKeySet(cells);
    const trace = traceBoundary(keySet, { smooth });
    const d = buildPath(trace, { smooth, scale });
    if (d) fillPaths.push(buildPathElement({ d, fill: fillColor, className: `pb-part-${partId}` }));
  }

  // ── Layer 2: shadow fringe (cells adjacent to outline, inside the shape) ──
  const shadowPaths = [];
  if (twoTone) {
    for (const [partId, cells] of partAllCells) {
      const outlineCells = partOutlineCells.get(partId) || [];
      if (outlineCells.length === 0) continue;

      const allKeySet     = cellsToKeySet(cells);
      const outlineKeySet = cellsToKeySet(outlineCells);
      const fillColor     = getFillColor(cells);

      // Collect cells that are NOT outline but ARE adjacent to an outline cell
      const shadowKeys = new Set();
      for (const key of outlineKeySet) {
        const [x, y] = key.split(',').map(Number);
        for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
          const nk = `${x + dx},${y + dy}`;
          if (allKeySet.has(nk) && !outlineKeySet.has(nk)) shadowKeys.add(nk);
        }
      }

      if (shadowKeys.size === 0) continue;
      const shadowColor = darkenHex(fillColor, 0.28);
      const trace = traceBoundary(shadowKeys, { smooth });
      const d = buildPath(trace, { smooth, scale });
      if (d) shadowPaths.push(buildPathElement({ d, fill: shadowColor, className: `pb-part-${partId}-shadow` }));
    }
  }

  // ── Layer 3: ink outline (all outline cells as one path) ──────────────
  let outlineLayerPath = '';
  if (allOutlineCells.length > 0) {
    const outlineColor  = allOutlineCells[0]?.color ?? '#1a1a20';
    const outlineKeySet = cellsToKeySet(allOutlineCells);
    const trace = traceBoundary(outlineKeySet, { smooth });
    const d = buildPath(trace, { smooth, scale });
    if (d) outlineLayerPath = buildPathElement({ d, fill: 'none', stroke: outlineColor, strokeWidth, className: 'pb-outline' });
  }

  // ── Assemble ─────────────────────────────────────────────────────────
  const fillLayer    = buildSVGElement('g', { class: 'pb-fills' }, fillPaths.join(''));
  const shadowLayer  = (twoTone && shadowPaths.length > 0)
    ? buildSVGElement('g', { class: 'pb-shading', opacity: '0.45' }, shadowPaths.join(''))
    : '';
  const outlineLayer = buildSVGElement('g', { class: 'pb-outlines' }, outlineLayerPath);

  return buildSVGElement('svg', {
    xmlns: 'http://www.w3.org/2000/svg',
    viewBox: `0 0 ${svgWidth} ${svgHeight}`,
    width: svgWidth,
    height: svgHeight,
    class: `pb-character school-${school}`,
  }, fillLayer + shadowLayer + outlineLayer);
}
```

- [ ] **Step 4: Run tests — confirm they all pass**

```bash
npx vitest run tests/core/pixelbrain/character-to-svg.test.js 2>&1 | tail -20
```

Expected: `11 passed`.

- [ ] **Step 5: Run existing pixelbrain tests to confirm no regressions**

```bash
npx vitest run tests/core/pixelbrain/ 2>&1 | tail -20
```

Expected: all existing tests still pass.

- [ ] **Step 6: Commit**

```bash
git add codex/core/pixelbrain/character-to-svg.js tests/core/pixelbrain/character-to-svg.test.js
git commit -m "$(cat <<'EOF'
feat(pixelbrain): character-to-svg — character fills → illustrated SVG

Ink outline + flat fills + shadow fringe from adjacency to outline cells.
School CSS classes on root element for zero-cost re-theming.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: `renderer-registry.js` + `character-foundry.js` renderer option

**Files:**
- Create: `codex/core/pixelbrain/renderer-registry.js`
- Modify: `codex/core/pixelbrain/character-foundry.js` (lines 344–406)

The registry holds a map of renderer names → `{ render, outputType }`. The `pixelart` renderer has no `render` function (handled inline by character-foundry). `character-foundry.js` consults the registry at its output stage.

**Note on circular imports:** The registry imports `characterToSVG` from `character-to-svg.js`. `character-foundry.js` imports `getRenderer` from `renderer-registry.js`. `character-to-svg.js` does NOT import from `character-foundry.js`. No cycle.

- [ ] **Step 1: Create `renderer-registry.js`**

Create `codex/core/pixelbrain/renderer-registry.js`:

```js
import { characterToSVG } from './character-to-svg.js';

export const RENDERERS = Object.freeze({
  pixelart:    { outputType: 'png' },
  illustrated: { render: characterToSVG, outputType: 'svg' },
});

export function getRenderer(name) {
  const r = RENDERERS[name ?? 'pixelart'];
  if (!r) throw new Error(`[renderer-registry] unknown renderer: ${name}`);
  return r;
}
```

- [ ] **Step 2: Modify `character-foundry.js` — add import + renderer branch**

At the top of `codex/core/pixelbrain/character-foundry.js`, add the import after the existing imports:

```js
import { getRenderer } from './renderer-registry.js';
```

Then replace the `forgeCharacter` return block (currently lines 382–405, starting with `const character = Object.freeze({`):

**Before** (lines 380–406):
```js
  const spritesheet = assembleSpritesheet(dirRgbas, canvas.width, canvas.height, pngScale);

  const character = Object.freeze({
    spec,
    specHash,
    canvas,
    silhouette: silhouettes,
    fills: filledResults,
    sprites: Object.fromEntries(
      Object.entries(dirPngs).map(([dir, png]) => [dir, png])
    ),
    spritesheet,
    construction: skeletons,
    phaserPipeline: exportCharacterToPhaserPipeline({ spritesheet, canvas, spec }),
    godotScene: exportCharacterToGodotScene({ spritesheet, canvas, spec }),
    pixelLotusActor: exportCharacterToPixelLotusActor({ spritesheet, canvas, spec }),
    diagnostics: {
      totalCells: allCells.length,
      paletteSizes: Object.fromEntries(
        Object.entries(filledResults).map(([dir, fills]) => [dir, fills.diagnostics.uniqueColors])
      ),
      directions,
    },
  });

  return character;
```

**After**:
```js
  const spritesheet = assembleSpritesheet(dirRgbas, canvas.width, canvas.height, pngScale);

  const rendererName = opts?.renderer ?? 'pixelart';
  const { render, outputType } = getRenderer(rendererName);

  if (outputType === 'svg') {
    const primaryDir = directions[0];
    const primaryFills = filledResults[primaryDir];
    const svgString = render(primaryFills, spec, opts);
    return Object.freeze({ svg: svgString, spec, specHash, canvas, fills: filledResults });
  }

  const character = Object.freeze({
    spec,
    specHash,
    canvas,
    silhouette: silhouettes,
    fills: filledResults,
    sprites: Object.fromEntries(
      Object.entries(dirPngs).map(([dir, png]) => [dir, png])
    ),
    spritesheet,
    construction: skeletons,
    phaserPipeline: exportCharacterToPhaserPipeline({ spritesheet, canvas, spec }),
    godotScene: exportCharacterToGodotScene({ spritesheet, canvas, spec }),
    pixelLotusActor: exportCharacterToPixelLotusActor({ spritesheet, canvas, spec }),
    diagnostics: {
      totalCells: allCells.length,
      paletteSizes: Object.fromEntries(
        Object.entries(filledResults).map(([dir, fills]) => [dir, fills.diagnostics.uniqueColors])
      ),
      directions,
    },
  });

  return character;
```

- [ ] **Step 3: Run all pixelbrain tests — confirm existing tests still pass**

```bash
npx vitest run tests/core/pixelbrain/ 2>&1 | tail -20
```

Expected: all existing tests pass. The change only adds a branch at the return — when `opts.renderer` is not set (the default), behavior is identical.

- [ ] **Step 4: Smoke-test the illustrated renderer manually**

```bash
node --input-type=module <<'EOF'
import { forgeCharacter } from './codex/core/pixelbrain/character-foundry.js';

const spec = {
  contract: 'CHARACTER-SPEC-v1',
  id: 'test.void.v1',
  class: 'character',
  archetype: 'human',
  canvas: { width: 32, height: 48, gridSize: 1 },
  seed: 42,
  bytecode: 'VW-SCHOLAR-COMMON-RESONANT',
  presentation: { gender: 'feminine', heightClass: 'average', buildClass: 'average' },
  directions: ['south'],
  materials: { skin: 'skin_voidborne', hair: 'hair_void', eyes: 'eye_void_glow' },
  body: { profile: 'character.body.human.androgynous' },
  face: [
    { id: 'leftEye',  profile: 'character.face.eye.round', attach: { parent: 'body', at: 'face.eyeLeft'  } },
    { id: 'rightEye', profile: 'character.face.eye.round', attach: { parent: 'body', at: 'face.eyeRight' } },
    { id: 'nose',     profile: 'character.face.nose.small', attach: { parent: 'body', at: 'face.nose'  } },
    { id: 'mouth',    profile: 'character.face.mouth.small', attach: { parent: 'body', at: 'face.mouth' } },
  ],
  hair: { profile: 'character.hair.short', params: { color: 'hair_void' }, attach: { parent: 'body', at: 'headTop' } },
  clothing: [
    { id: 'bottom', profile: 'character.clothing.bottom.beginnerPants' },
    { id: 'top',    profile: 'character.clothing.top.beginnerRobe'    },
    { id: 'shoes',  profile: 'character.clothing.shoes.beginnerBoots' },
  ],
  combatProfile: { school: 'VOID' },
};

const result = forgeCharacter(spec, { renderer: 'illustrated', scale: 8 });
if (!result.svg) throw new Error('No svg in result');
if (!result.svg.startsWith('<svg')) throw new Error('Not an SVG');
console.log('OK — SVG length:', result.svg.length);
console.log('First 200 chars:', result.svg.slice(0, 200));
EOF
```

Expected: prints `OK — SVG length: <number>` and the first 200 characters of the SVG.

- [ ] **Step 5: Commit**

```bash
git add codex/core/pixelbrain/renderer-registry.js codex/core/pixelbrain/character-foundry.js
git commit -m "$(cat <<'EOF'
feat(pixelbrain): renderer-registry + forgeCharacter illustrated option

forgeCharacter(spec, { renderer: 'illustrated' }) returns { svg, spec, fills }.
Default pixelart path unchanged — all existing callers unaffected.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: `ActorForgeLab.tsx` — SVG preview panel

**Files:**
- Modify: `src/pages/internal/pixel-lotus/ActorForgeLab.tsx`
- Modify: `src/pages/internal/pixel-lotus/ActorForgeLab.css`

Add a second `useMemo` that calls `forgeCharacter` with `renderer: 'illustrated'` for the SVG preview. Keep the existing `forge` memo (pixel art, 4 directions) entirely unchanged — it still drives `spriteUrl`, `sheetUrl`, and Enter the Void.

- [ ] **Step 1: Read the current ActorForgeLab.tsx state section to confirm line numbers**

```bash
grep -n "const forge\|const spriteUrl\|const sheetUrl\|const svgPreview\|return (" /home/deck/Desktop/Scholomance-V12-main/src/pages/internal/pixel-lotus/ActorForgeLab.tsx | head -15
```

- [ ] **Step 2: Add `svgPreviewUrl` memo after the existing `sheetUrl` memo**

In `src/pages/internal/pixel-lotus/ActorForgeLab.tsx`, after the `sheetUrl` useMemo block (currently ending around line 169), add:

```tsx
  const svgPreviewUrl = useMemo(() => {
    if (!forge.character) return null;
    try {
      const spec = { ...forge.character.spec, directions: ['south'] };
      const result = forgeCharacter(spec, { renderer: 'illustrated', scale: 8 });
      if (!result.svg) return null;
      return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(result.svg)));
    } catch {
      return null;
    }
  }, [forge.character]);
```

- [ ] **Step 3: Add the SVG preview panel to the JSX**

Find the existing sprite preview `<img>` element in the JSX (the one that renders `spriteUrl`). Add the SVG preview immediately after it, inside the same container:

```tsx
{svgPreviewUrl && (
  <div className="svg-preview-panel">
    <div className="svg-preview-label">Illustrated ✦</div>
    <img
      src={svgPreviewUrl}
      alt="Illustrated character preview"
      className="svg-preview-img"
      style={{ imageRendering: 'auto' }}
    />
  </div>
)}
```

- [ ] **Step 4: Add CSS for the SVG preview panel**

In `src/pages/internal/pixel-lotus/ActorForgeLab.css`, append:

```css
.svg-preview-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  margin-top: 1rem;
}

.svg-preview-label {
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--school-accent, #c9a84c);
  opacity: 0.8;
}

.svg-preview-img {
  width: 128px;
  height: auto;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 4px;
}
```

- [ ] **Step 5: Run typecheck**

```bash
npm run typecheck 2>&1 | tail -20
```

Expected: passes with no new errors.

- [ ] **Step 6: Commit**

```bash
git add src/pages/internal/pixel-lotus/ActorForgeLab.tsx src/pages/internal/pixel-lotus/ActorForgeLab.css
git commit -m "$(cat <<'EOF'
feat(forge-lab): illustrated SVG preview panel in ActorForgeLab

Shows smooth ink-outline preview alongside existing pixel sprite.
Pixel art path and Enter the Void unchanged.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: `CharacterShaderRenderer.js` — Phaser SVG textures

**Files:**
- Modify: `src/pages/Combat/scenes/CharacterShaderRenderer.js`

Update `bake()` to forge characters with the illustrated renderer and encode the SVG as a base64 data URL for `scene.textures.addBase64()`.

- [ ] **Step 1: Read `bake()` in CharacterShaderRenderer.js to confirm current implementation**

```bash
grep -n "export async function bake\|forgeCharacter\|pngBytesToDataUrl\|addBase64\|dataUrl" /home/deck/Desktop/Scholomance-V12-main/src/pages/Combat/scenes/CharacterShaderRenderer.js
```

- [ ] **Step 2: Update `bake()` to use the illustrated renderer**

In `src/pages/Combat/scenes/CharacterShaderRenderer.js`, replace the `bake` function body. The current body calls `forgeCharacter(spec, {})` and uses `pngBytesToDataUrl`. Change it to:

```js
export async function bake(key, spec, scene) {
  if (scene.textures.exists(key)) return key;

  const character = forgeCharacter(spec, { renderer: 'illustrated', scale: 8, directions: ['south'] });

  let dataUrl;
  if (character.svg) {
    // btoa(unescape(encodeURIComponent(...))) handles non-ASCII in SVG strings
    dataUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(character.svg)));
  } else {
    // Fallback: existing PNG path (should not trigger with illustrated renderer)
    const pngBytes = character.sprites?.south;
    if (!pngBytes) throw new Error(`[CharacterShaderRenderer] no sprite for ${key}`);
    dataUrl = pngBytesToDataUrl(pngBytes);
  }

  await new Promise((resolve, reject) => {
    scene.textures.addBase64(key, dataUrl);
    scene.textures.once('addtexture-' + key, resolve);
    scene.textures.once('onerror',           reject);
  });

  return key;
}
```

Note: `directions: ['south']` in the options is passed through to `forgeCharacter` as part of `opts`. Check whether `character-foundry.js` currently respects an `opts.directions` override. If not, the spec's `directions` field already limits computation (the `npcSpec()` function sets `directions: ['south']`).

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck 2>&1 | tail -20
```

Expected: passes.

- [ ] **Step 4: Run QA tests**

```bash
npm run test:qa 2>&1 | tail -20
```

Expected: passes.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Combat/scenes/CharacterShaderRenderer.js
git commit -m "$(cat <<'EOF'
feat(combat): CharacterShaderRenderer uses illustrated SVG renderer

Characters bake as SVG textures in Phaser — infinite resolution,
school-themed ink-outline style. PNG fallback kept for safety.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Verify in browser

- [ ] **Step 1: Start the dev server if not running**

```bash
npm run dev &
```

- [ ] **Step 2: Open Actor Forge Lab and verify SVG preview appears**

Navigate to `http://localhost:5173/internal/pixel-lotus/actor-forge`.

Check:
- The "Illustrated ✦" label and SVG preview panel appear below the pixel art sprite
- The SVG is smooth (no pixel blockyness)
- Changing school/hair/skin updates the SVG preview
- Pixel art sprite and Enter the Void still function normally

- [ ] **Step 3: Open Combat page and verify illustrated sprites load**

Navigate to `http://localhost:5173/combat` (or start a battle from the app).

Check:
- No console errors about texture loading
- Characters appear in the arena (SVG textures load via addBase64)
- School glow effects still apply (postFX.addGlow runs on the SVG texture sprite)

- [ ] **Step 4: Final gate — run full test suite**

```bash
npm run typecheck && npm run test:qa 2>&1 | tail -20
```

Expected: both pass.

---

## Self-Review Checklist

- [x] **Spec coverage:** cell-boundary-tracer ✓, svg-path-builder ✓, character-to-svg ✓, renderer-registry ✓, character-foundry change ✓, CharacterShaderRenderer ✓, ActorForgeLab ✓
- [x] **Placeholder scan:** no TBDs — all code blocks are complete implementations
- [x] **Type consistency:** `traceBoundary` returns `{ vertices, segments }` in Task 1 and is consumed as `{ vertices, segments }` in Task 3 ✓. `buildPath(traceResult, options)` signature consistent ✓. `forgeCharacter(spec, { renderer: 'illustrated' })` returns `{ svg, spec, fills }` — consumed correctly in Tasks 5 and 6 ✓
- [x] **Data-shape correction:** spec assumed `region-fill-amp` shapes (`isRim`, `slotRanges`). Plan uses actual `applyCharacterFills` shapes (`isOutline`, no slotRanges). Shadow zone uses 1-cell adjacency, not DT slots.
