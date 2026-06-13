# PixelBrain SVG Renderer — Illustrated Character Style

## Goal

Add an `'illustrated'` renderer to PixelBrain's character forge that outputs SVG instead of PNG. Characters render as smooth ink-outline illustrations with flat base fills + one shadow zone — the FFTA2 style. Output is infinitely scalable, CSS-themeable per school, and usable in both Phaser and the Actor Forge Lab preview without any format conversion.

The existing pixel art renderer is untouched. This is a parallel output path.

---

## What PixelBrain Already Computes

The AMP pipeline produces everything needed. Nothing new is computed — only the final rendering step changes.

| Already computed | What the SVG renderer uses |
|---|---|
| `region-fill-amp` → `coordinates[].isRim` | Outline cells = the ink line |
| `region-fill-amp` → `coordinates[].partId` | Grouping for per-region fills |
| `region-fill-amp` → `coordinates[].color` | Base fill color for each part |
| `region-fill-amp` → `coordinates[].slot` | Shadow zone: cells with slot ≤ midpoint get darkened tone |
| `region-fill-amp` → `slotRanges` | Per-part slot min/max → shadow threshold |
| `selout-amp` → light-modulated `isRim` color | Outline color varies by light direction |

---

## Architecture

```
CHARACTER-SPEC-v1
  ↓
forgeCharacter(spec, { renderer: 'illustrated' })
  ↓
[existing AMP pipeline — unchanged]
  ↓
region-fill-amp output
  { coordinates[], partOf, outline, slotRanges }
  ↓
cell-boundary-tracer.js   ← new
  ↓
svg-path-builder.js       ← new
  ↓
character-to-svg.js       ← new
  ↓
'<svg>...</svg>' string
  ↓
┌──────────────────────────────────────┐
│ ActorForgeLab                        │
│   <img src="data:image/svg+xml;…">  │
│   infinite resolution preview        │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│ CharacterShaderRenderer.bake()       │
│   SVG → data URL → addBase64()       │
│   Phaser loads at combat resolution  │
└──────────────────────────────────────┘
```

---

## SVG Output Structure

```svg
<svg xmlns="http://www.w3.org/2000/svg"
     viewBox="0 0 32 48"
     class="pb-character school-void"
     width="256" height="384">

  <!-- Layer 1: base fills — one <path> per body part -->
  <g class="pb-fills">
    <path class="pb-part-body"     fill="#7a6888" d="M...Z"/>
    <path class="pb-part-hair"     fill="#0a0018" d="M...Z"/>
    <path class="pb-part-robe-top" fill="#1a0830" d="M...Z"/>
    <path class="pb-part-legs"     fill="#100820" d="M...Z"/>
    <path class="pb-part-boots"    fill="#080410" d="M...Z"/>
  </g>

  <!-- Layer 2: shadow zones — cells with slot ≤ midSlot get darkened overlay -->
  <g class="pb-shading" opacity="0.45">
    <path class="pb-part-body-shadow"     fill="#3a1840" d="M...Z"/>
    <path class="pb-part-robe-top-shadow" fill="#0a0418" d="M...Z"/>
  </g>

  <!-- Layer 3: ink outline — all rim cells traced as one closed path -->
  <g class="pb-outlines">
    <path class="pb-outline"
          fill="none"
          stroke="#0a0414"
          stroke-width="1.5"
          stroke-linejoin="round"
          stroke-linecap="round"
          d="M...Z"/>
  </g>

</svg>
```

The `class="school-void"` on the root element lets existing Scholomance CSS variables re-theme the character with zero re-render:

```css
.school-void  .pb-part-robe-top { fill: var(--void-robe-color);    }
.school-void  .pb-outline        { stroke: var(--void-ink-color);  }
.school-psychic .pb-part-robe-top { fill: var(--psychic-robe-color); }
```

---

## Component Specs

### `cell-boundary-tracer.js`

**Input:** `Set<"x,y">` of occupied cell keys, `{ width, height }` canvas dimensions  
**Output:** `Array<[x, y]>` — ordered boundary polygon vertices in cell-corner space

**Algorithm:** Grid perimeter walk.

Cell corners live at integer coordinates. Cell at (cx, cy) occupies corners (cx, cy), (cx+1, cy), (cx+1, cy+1), (cx, cy+1).

```
function traceBoundary(cellSet, width, height):
  1. Find start: topmost then leftmost occupied cell → start at its top-left corner, moving right
  2. Walk the perimeter:
     - At each step, check if the cell to the LEFT of the current direction is occupied
       - YES → turn left, advance
       - NO and cell AHEAD is occupied → go straight
       - NO → turn right (corner reached), record corner point
  3. Collect all corner turn points
  4. Stop when back at start position and direction
  5. Return ordered array of corner coordinates

function smoothPath(vertices, tension = 0.4):
  // Catmull-Rom → cubic bezier conversion
  // For each consecutive triplet P0, P1, P2, P3:
  //   CP1 = P1 + (P2 - P0) * tension / 3
  //   CP2 = P2 - (P3 - P1) * tension / 3
  // Returns array of bezier segments: { p1, cp1, cp2, p2 }
```

**Exports:**
```js
export function traceBoundary(cellSet, options = {})
// options: { smooth: boolean = true, tension: number = 0.4 }
// returns: { vertices: [x,y][], segments: BezierSegment[] }
```

**Edge cases:**
- Single cell → 4-vertex square, no smoothing applied
- Disconnected parts → trace largest connected component (characters should be contiguous)
- Empty set → return `{ vertices: [], segments: [] }`

---

### `svg-path-builder.js`

**Input:** `{ vertices, segments }` from cell-boundary-tracer  
**Output:** SVG `d` attribute string

```js
export function buildPath(traceResult, options = {})
// options: { smooth: boolean = true, scale: number = 8 }
// returns: string — e.g. "M 24,4 C 28,2 36,2 40,4 L 42,8 ... Z"

export function buildSVGElement(tag, attrs, children = '')
// Minimal SVG element builder — no DOM dependency

export function buildPathElement({ d, fill, stroke, strokeWidth, className, opacity })
// Returns: '<path class="..." fill="..." d="..."/>'
```

Scale is applied here: multiply all coordinates by `scale` before emitting. Default scale 8 means a 32-cell-wide character emits as a 256px-wide SVG.

---

### `character-to-svg.js`

**Input:**
- `fills` — output of `applyRegionFills()` (from `region-fill-amp.js`)
- `spec` — `CHARACTER-SPEC-v1`
- `options` — `{ scale, twoTone, strokeWidth, smooth, width, height }`

**Output:** SVG string

**Logic:**

```js
export function characterToSVG(fills, spec, options = {}) {
  const {
    scale = 8,
    twoTone = true,
    strokeWidth = 1.5,
    smooth = true,
  } = options;

  const svgWidth  = (spec.canvas?.width  ?? 32) * scale;
  const svgHeight = (spec.canvas?.height ?? 48) * scale;

  // 1. Group cells by partId and zone
  //
  // Fill layer  = ALL non-rim cells for the part (traces the complete part region)
  // Shadow layer = subset: cells with slot ≤ mid (painted OVER the fill as a darker overlay)
  //
  // Why fill = ALL: the fill path must be contiguous (traceable). If we only put
  // light-slot cells in it, isolated clusters at part edges break the tracer.
  const partAllCells    = new Map(); // partId → [cell, ...]  ALL non-rim cells
  const partShadowCells = new Map(); // partId → [cell, ...]  slot ≤ mid only
  const rimCells        = [];        // all rim cells → outline

  fills.coordinates.forEach(cell => {
    if (cell.isRim) {
      rimCells.push(cell);
      return;
    }
    if (!partAllCells.has(cell.partId)) partAllCells.set(cell.partId, []);
    partAllCells.get(cell.partId).push(cell);

    if (twoTone) {
      const range = fills.slotRanges[cell.partId] ?? { min: 0, max: cell.slot };
      const mid   = (range.min + range.max) / 2;
      if (cell.slot <= mid) {
        if (!partShadowCells.has(cell.partId)) partShadowCells.set(cell.partId, []);
        partShadowCells.get(cell.partId).push(cell);
      }
    }
  });

  // 2. Build fill paths — one per partId from partAllCells
  //    Fill color = the first cell's color (region-fill-amp guarantees uniform color per part+slot)
  // 3. Build shadow paths — one per partId from partShadowCells
  //    Shadow color = darkenHex(fillColor, 0.30)  (reduce HSL lightness by 30%)
  // 4. Build outline path — trace all rimCells as a single closed path
  // 5. Assemble SVG
}

// darkenHex(hex, amount): reduce lightness by `amount` (0–1) using HSL conversion.
// e.g. darkenHex('#2d1b4e', 0.3) → '#1a0f2e'
// Implementation: parse hex → rgb → hsl → reduce L → rgb → hex
// Pure function, no dependencies.
function darkenHex(hex, amount) { /* ~10 lines, pure HSL math */ }
```

**Determinism contract:** Given the same `fills` and `options`, returns the identical SVG string. Verified by test.

**CSS class naming:**
- Root: `pb-character school-{school.toLowerCase()}`
- Fill group: `pb-fills`
- Per part: `pb-part-{partId}` (e.g. `pb-part-body`, `pb-part-hair-void`)
- Shadow group: `pb-shading`
- Shadow per part: `pb-part-{partId}-shadow`
- Outline group: `pb-outlines`
- Outline path: `pb-outline`

---

### `renderer-registry.js`

```js
import { rasterizeCells } from './character-foundry.js';
import { characterToSVG  } from './character-to-svg.js';

export const RENDERERS = Object.freeze({
  pixelart:     { render: rasterizeCells,  outputType: 'png' },
  illustrated:  { render: characterToSVG,  outputType: 'svg' },
});

export function getRenderer(name) {
  const r = RENDERERS[name ?? 'pixelart'];
  if (!r) throw new Error(`[renderer-registry] unknown renderer: ${name}`);
  return r;
}
```

---

### `character-foundry.js` changes

`forgeCharacter(spec, options)` — add `renderer` option:

```js
// BEFORE (current return):
return { sprites: { south: pngBytes }, spec, fills };

// AFTER (renderer branch):
const rendererName = options?.renderer ?? 'pixelart';
const { render, outputType } = getRenderer(rendererName);

if (outputType === 'svg') {
  const svgString = render(fills, spec, options);
  return { svg: svgString, spec, fills };
}
// default: existing path unchanged
return { sprites: { south: pngBytes }, spec, fills };
```

No changes to the AMP pipeline. The branch is ONLY at the final output step.

---

### `CharacterShaderRenderer.js` changes

`bake(key, spec, scene)` — detect SVG output:

```js
export async function bake(key, spec, scene) {
  if (scene.textures.exists(key)) return key;

  const options = { renderer: 'illustrated', scale: 8 };
  const character = forgeCharacter(spec, options);

  let dataUrl;
  if (character.svg) {
    // SVG path — encode as base64 data URL
    dataUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(character.svg)));
  } else {
    // Existing PNG path
    dataUrl = pngBytesToDataUrl(character.sprites.south);
  }

  await new Promise((resolve, reject) => {
    scene.textures.addBase64(key, dataUrl);
    scene.textures.once('addtexture-' + key, resolve);
    scene.textures.once('onerror',           reject);
  });

  return key;
}
```

Note: `btoa(unescape(encodeURIComponent(svg)))` handles Unicode characters in SVG strings that plain `btoa` would reject.

---

### `ActorForgeLab.tsx` changes

In `handleForgeAndEnhance` (or wherever the preview renders), detect SVG result:

```tsx
// After forging:
if (forge.character.svg) {
  const svgDataUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(forge.character.svg)));
  setSvgPreview(svgDataUrl);
} else {
  // existing PNG preview path
}

// In JSX:
{svgPreview && (
  <img
    src={svgPreview}
    alt="Forged character preview"
    className="character-preview-svg"
    style={{ imageRendering: 'auto' }}  // NOT pixelated — SVG renders smooth
  />
)}
```

---

## Tests

### `tests/core/pixelbrain/cell-boundary-tracer.test.js`

```js
describe('traceBoundary', () => {
  it('single cell produces 4-vertex square', () => {
    const cells = new Set(['1,1']);
    const { vertices } = traceBoundary(cells, { smooth: false });
    expect(vertices).toHaveLength(4);
    expect(vertices).toContainEqual([1, 1]);
    expect(vertices).toContainEqual([2, 1]);
    expect(vertices).toContainEqual([2, 2]);
    expect(vertices).toContainEqual([1, 2]);
  });

  it('2×2 block traces outer square (no internal edges)', () => {
    const cells = new Set(['0,0','1,0','0,1','1,1']);
    const { vertices } = traceBoundary(cells, { smooth: false });
    expect(vertices).toHaveLength(4);
  });

  it('L-shape produces 6 unique corners', () => {
    const cells = new Set(['0,0','0,1','0,2','1,2']);
    const { vertices } = traceBoundary(cells, { smooth: false });
    expect(vertices).toHaveLength(6);
  });

  it('empty set returns empty result without throwing', () => {
    expect(() => traceBoundary(new Set(), { smooth: false })).not.toThrow();
    const { vertices } = traceBoundary(new Set(), { smooth: false });
    expect(vertices).toHaveLength(0);
  });

  it('smooth=true returns bezier segments array', () => {
    const cells = new Set(['0,0','1,0','2,0','1,1']);
    const { segments } = traceBoundary(cells, { smooth: true });
    expect(Array.isArray(segments)).toBe(true);
  });
});
```

### `tests/core/pixelbrain/character-to-svg.test.js`

```js
describe('characterToSVG', () => {
  // Minimal fill mock — a 3-cell shape: two fill + one rim
  const MOCK_FILLS = {
    coordinates: [
      { x: 1, y: 1, partId: 'body', color: '#aaaaaa', isRim: false, slot: 2 },
      { x: 1, y: 2, partId: 'body', color: '#aaaaaa', isRim: false, slot: 1 },
      { x: 1, y: 3, partId: 'body', color: '#888888', isRim: true,  slot: 0 },
    ],
    partOf: new Map([['1,1','body'],['1,2','body'],['1,3','body']]),
    outline: new Set(['1,3']),
    slotRanges: { body: { min: 0, max: 2 } },
  };
  const MOCK_SPEC = {
    contract: 'CHARACTER-SPEC-v1',
    canvas: { width: 4, height: 6 },
    combatProfile: { school: 'VOID' },
  };

  it('returns a string starting with <svg', () => {
    const svg = characterToSVG(MOCK_FILLS, MOCK_SPEC, {});
    expect(typeof svg).toBe('string');
    expect(svg.trimStart()).toMatch(/^<svg/);
  });

  it('viewBox matches canvas dimensions', () => {
    const svg = characterToSVG(MOCK_FILLS, MOCK_SPEC, { scale: 1 });
    expect(svg).toContain('viewBox="0 0 4 6"');
  });

  it('contains school CSS class', () => {
    const svg = characterToSVG(MOCK_FILLS, MOCK_SPEC, {});
    expect(svg).toContain('school-void');
  });

  it('contains pb-character class', () => {
    const svg = characterToSVG(MOCK_FILLS, MOCK_SPEC, {});
    expect(svg).toContain('pb-character');
  });

  it('contains outline path with stroke', () => {
    const svg = characterToSVG(MOCK_FILLS, MOCK_SPEC, {});
    expect(svg).toContain('pb-outline');
    expect(svg).toContain('stroke=');
  });

  it('contains fill path for each partId', () => {
    const svg = characterToSVG(MOCK_FILLS, MOCK_SPEC, {});
    expect(svg).toContain('pb-part-body');
  });

  it('is deterministic — same input → same output 50 times', () => {
    const first = characterToSVG(MOCK_FILLS, MOCK_SPEC, {});
    for (let i = 0; i < 49; i++) {
      expect(characterToSVG(MOCK_FILLS, MOCK_SPEC, {})).toBe(first);
    }
  });
});
```

---

## Invariants

1. `forgeCharacter(spec, {})` is byte-for-byte identical to pre-change behavior — pixel art output unaffected
2. `forgeCharacter(spec, { renderer: 'illustrated' })` returns `{ svg: string, spec, fills }` — no `sprites` key
3. SVG is valid XML (no unclosed tags, no unescaped characters)
4. SVG is deterministic for the same spec+options
5. Scale parameter only affects the final SVG coordinate values — all cell math runs at unit scale
6. All existing `region-fill-amp` and `character-foundry` tests remain green

---

## What This Unlocks After Ship

Once the renderer registry exists, future renderers are isolated new files + one registry line:

| Future renderer | Adds |
|---|---|
| `'sdf-smooth'` | Sample SDF at every pixel → perfectly smooth shapes from the SDF evaluator |
| `'silhouette'` | Filled black outline only → shadow puppet / tarot aesthetic |
| `'lineart'` | Outline only, no fill → coloring-book style |
| `'animated-svg'` | Same SVG structure + CSS `@keyframes` per body part → walk cycle in pure CSS |

The school CSS class pattern also means a future `/api/character/theme` endpoint can serve school-specific CSS overrides that apply to all characters in the client without re-baking any assets.
