# Ice Slime Staff — Void/Eldritch Beautification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four new profiles to the ice slime staff spec — an orbital ring around the orb, rune-lattice shaft engravings, asymmetric void-wing bezel, and a shadow-orb pommel — making it read as a void conduit.

**Architecture:** All six new profiles are registered in `part-profile-library.js` alongside the existing built-ins. The spec `specs/ice-slime-staff.v1.json` is updated to add/replace the parts that reference the new profiles. The existing alignment QA test is extended to cover the new parts.

**Tech Stack:** Node.js / Vitest, `registerPartProfile` in `part-profile-library.js`, JSON item spec.

---

## File Map

| File | Change |
|---|---|
| `codex/core/pixelbrain/part-profile-library.js` | Add 6 new profiles: `orb.ring`, `orb.ring_glow`, `shaft.rune_lattice`, `guard.void_wings`, `pommel.void_orb`, `pommel.void_orb_glow` |
| `specs/ice-slime-staff.v1.json` | Add `orb_ring`, `orb_ring_glow`, `shaft_rune_lattice`, `shaft_lattice_glow` parts; replace `bezel` with `guard.void_wings`; add `bezel_void_trim`, `bezel_void_glow`; replace `pommel` with `pommel.void_orb`; add `pommel_glow` |
| `tests/qa/pixelbrain/ice-slime-staff.alignment.test.js` | Extend with assertions for new part AABBs |

---

## Task 1: `orb.ring` and `orb.ring_glow` profiles

**Files:**
- Modify: `codex/core/pixelbrain/part-profile-library.js` (append after `orb.slime_frost`, ~line 426)
- Test: `tests/qa/pixelbrain/ice-slime-staff.alignment.test.js`

- [ ] **Step 1: Write failing test for `orb.ring`**

Open `tests/qa/pixelbrain/ice-slime-staff.alignment.test.js`. Add an import at the top for `getPartProfile` and add this test inside the describe block, after the existing `it`:

```js
import { getPartProfile } from '../../../codex/core/pixelbrain/part-profile-library.js';

// Inside describe block:
it('orb.ring wraps the orb perimeter with an elliptical halo', () => {
  const profile = getPartProfile('orb.ring');
  const result = profile({ r: 9 }, {});

  // Should emit cells — the ring is non-empty
  expect(result.cells.length).toBeGreaterThan(0);

  // All cells must lie on or outside the orb radius (ring wraps outside)
  for (const { x, y } of result.cells) {
    const d = Math.hypot(x, y * 0.85); // elliptical: Y squashed by 0.85
    expect(d).toBeGreaterThanOrEqual(8.5);
    expect(d).toBeLessThanOrEqual(12);
  }

  // Must declare a center anchor
  expect(result.anchors.center).toBeDefined();
  expect(result.anchors.center).toEqual({ x: 0, y: 0 });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx vitest run tests/qa/pixelbrain/ice-slime-staff.alignment.test.js --reporter=verbose
```

Expected: FAIL — `getPartProfile("orb.ring")` throws `Part profile "orb.ring" is not registered`.

- [ ] **Step 3: Implement `orb.ring` and `orb.ring_glow`**

In `codex/core/pixelbrain/part-profile-library.js`, append after the `orb.slime_frost` registration (after line ~426):

```js
// ORB.RING — thin elliptical halo around the slime orb.
// Slightly squashed vertically (aspect 0.85) so it reads as orbiting rather
// than flat. Cells at outer radius (r+1) to (r+2) in part-local space.
registerPartProfile('orb.ring', (params = {}, options = {}) => {
  const cx = roundInt(params.cx ?? 0);
  const cy = roundInt(params.cy ?? 0);
  const r = roundInt(params.r ?? 9);
  const outerR = r + 2;
  const innerR = r + 1;
  const aspect = 0.85; // Y compression
  const cells = [];
  for (let y = cy - outerR; y <= cy + outerR; y += 1) {
    for (let x = cx - outerR; x <= cx + outerR; x += 1) {
      const d = Math.hypot(x - cx, (y - cy) / aspect);
      if (d >= innerR && d <= outerR) {
        // Upper-left quadrant highlight break (makes it read as a 3D ring)
        if (x - cx < -1 && y - cy < -1) continue;
        cells.push({ x, y });
      }
    }
  }
  return { cells, anchors: { center: { x: cx, y: cy } } };
});

// ORB.RING_GLOW — 1px larger bleed layer for the spectral halo.
registerPartProfile('orb.ring_glow', (params = {}, options = {}) => {
  const cx = roundInt(params.cx ?? 0);
  const cy = roundInt(params.cy ?? 0);
  const r = roundInt(params.r ?? 9);
  const outerR = r + 3;
  const innerR = r + 2;
  const aspect = 0.85;
  const cells = [];
  for (let y = cy - outerR; y <= cy + outerR; y += 1) {
    for (let x = cx - outerR; x <= cx + outerR; x += 1) {
      const d = Math.hypot(x - cx, (y - cy) / aspect);
      if (d >= innerR && d <= outerR) cells.push({ x, y });
    }
  }
  return { cells, anchors: { center: { x: cx, y: cy } } };
});
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
npx vitest run tests/qa/pixelbrain/ice-slime-staff.alignment.test.js --reporter=verbose
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add codex/core/pixelbrain/part-profile-library.js tests/qa/pixelbrain/ice-slime-staff.alignment.test.js
git commit -m "feat(pixelbrain): add orb.ring and orb.ring_glow profiles for ice staff spectral cage"
```

---

## Task 2: `shaft.rune_lattice` profile

**Files:**
- Modify: `codex/core/pixelbrain/part-profile-library.js`
- Test: `tests/qa/pixelbrain/ice-slime-staff.alignment.test.js`

- [ ] **Step 1: Write failing test**

Add inside the describe block in `tests/qa/pixelbrain/ice-slime-staff.alignment.test.js`:

```js
it('shaft.rune_lattice emits periodic marks along the shaft span', () => {
  const profile = getPartProfile('shaft.rune_lattice');
  const result = profile({ cx: 24, span: [30, 90], half: 2 }, {});

  // Non-empty
  expect(result.cells.length).toBeGreaterThan(0);

  // All cells must fall within the span
  for (const { y } of result.cells) {
    expect(y).toBeGreaterThanOrEqual(30);
    expect(y).toBeLessThanOrEqual(90);
  }

  // Marks must be centered near cx (offset up to half+1 for off-center engraving)
  for (const { x } of result.cells) {
    expect(x).toBeGreaterThanOrEqual(24 - 4);
    expect(x).toBeLessThanOrEqual(24 + 4);
  }

  // Must have marks at intervals — expect at least 6 distinct Y rows
  const ySet = new Set(result.cells.map(c => c.y));
  expect(ySet.size).toBeGreaterThanOrEqual(6);

  expect(result.anchors.base).toBeDefined();
  expect(result.anchors.tip).toBeDefined();
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx vitest run tests/qa/pixelbrain/ice-slime-staff.alignment.test.js --reporter=verbose
```

Expected: FAIL — `Part profile "shaft.rune_lattice" is not registered`.

- [ ] **Step 3: Implement `shaft.rune_lattice`**

Append after the `orb.ring_glow` registration:

```js
// SHAFT.RUNE_LATTICE — sparse repeating single-pixel rune marks along the
// shaft. Every 8px a 3-cell crosshatch fragment, offset 1px right of center
// so marks read as engravings rather than surface decoration.
registerPartProfile('shaft.rune_lattice', (params = {}, options = {}) => {
  const { height } = options;
  const span = Array.isArray(params.span) && params.span.length === 2
    ? [roundInt(params.span[0]), roundInt(params.span[1])]
    : [0, Math.max(1, (height || 96) - 1)];
  const cx = roundInt(params.cx ?? 0);
  const cells = [];
  const period = 8;
  for (let y = span[0]; y <= span[1]; y += 1) {
    const offset = y - span[0];
    if (offset % period === 0) {
      // Crosshatch: one horizontal tick + one vertical tick, offset +1 from center
      cells.push({ x: cx + 1, y });
      cells.push({ x: cx + 2, y });
      cells.push({ x: cx + 1, y: y + 1 });
    }
    if (offset % period === 4) {
      // Alternate: mirror on the left
      cells.push({ x: cx - 1, y });
      cells.push({ x: cx - 2, y });
      cells.push({ x: cx - 1, y: y + 1 });
    }
  }
  return {
    cells,
    anchors: { base: { x: cx, y: span[1] }, tip: { x: cx, y: span[0] } },
  };
});
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
npx vitest run tests/qa/pixelbrain/ice-slime-staff.alignment.test.js --reporter=verbose
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add codex/core/pixelbrain/part-profile-library.js tests/qa/pixelbrain/ice-slime-staff.alignment.test.js
git commit -m "feat(pixelbrain): add shaft.rune_lattice profile for void engraving effect"
```

---

## Task 3: `guard.void_wings` profile

**Files:**
- Modify: `codex/core/pixelbrain/part-profile-library.js`
- Test: `tests/qa/pixelbrain/ice-slime-staff.alignment.test.js`

- [ ] **Step 1: Write failing test**

Add inside the describe block:

```js
it('guard.void_wings emits an asymmetric jagged guard with left wing longer than right', () => {
  const profile = getPartProfile('guard.void_wings');
  const result = profile({}, {});

  expect(result.cells.length).toBeGreaterThan(0);

  // Asymmetry check: leftmost X must be further from center than rightmost X
  const xs = result.cells.map(c => c.x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  expect(Math.abs(minX)).toBeGreaterThan(Math.abs(maxX));

  // Anchors
  expect(result.anchors.base).toBeDefined();
  expect(result.anchors.tip).toBeDefined();

  // Must span at least 8 rows vertically (has diamond core + wings)
  const ys = result.cells.map(c => c.y);
  expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThanOrEqual(7);
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx vitest run tests/qa/pixelbrain/ice-slime-staff.alignment.test.js --reporter=verbose
```

Expected: FAIL — `Part profile "guard.void_wings" is not registered`.

- [ ] **Step 3: Implement `guard.void_wings`**

Append after `shaft.rune_lattice`. The diamond core reuses the same row-map pattern as `guard.marquise`. Wings extend from the widest rows, left jagged to 12px, right jagged to 8px (4px asymmetry):

```js
// GUARD.VOID_WINGS — marquise diamond core with jagged asymmetric lateral
// extensions. Left wing is 3-4px longer than right to signal eldritch
// asymmetry. Anchors: base = top (attach to shaft), tip = bottom (attach to grip).
registerPartProfile('guard.void_wings', (params = {}, options = {}) => {
  const cx = roundInt(params.cx ?? 0);
  const cells = [];

  // Diamond core (same shape as guard.marquise default)
  const coreRows = { 0: 3, 1: 5, 2: 7, 3: 8, 4: 8, 5: 7, 6: 5, 7: 3 };
  const yKeys = Object.keys(coreRows).map(Number).sort((a, b) => a - b);
  for (const y of yKeys) {
    const half = coreRows[y];
    for (let dx = -half; dx <= half; dx += 1) cells.push({ x: cx + dx, y });
  }

  // Left wing — jagged, extends from rows 2–5, longest at row 3 (cx-12)
  const leftWing = {
    2: [-9, -10],
    3: [-9, -10, -11, -12],
    4: [-9, -10, -11],
    5: [-9, -10],
  };
  for (const [row, xs] of Object.entries(leftWing)) {
    for (const x of xs) cells.push({ x: cx + x, y: Number(row) });
  }

  // Right wing — jagged, extends from rows 2–5, longest at row 3 (cx+8)
  const rightWing = {
    2: [9],
    3: [9, 10],
    4: [9],
    5: [9],
  };
  for (const [row, xs] of Object.entries(rightWing)) {
    for (const x of xs) cells.push({ x: cx + x, y: Number(row) });
  }

  return {
    cells,
    anchors: {
      base: { x: cx, y: yKeys[0] },
      tip: { x: cx, y: yKeys[yKeys.length - 1] },
      center: { x: cx, y: 3 },
    },
  };
});
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
npx vitest run tests/qa/pixelbrain/ice-slime-staff.alignment.test.js --reporter=verbose
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add codex/core/pixelbrain/part-profile-library.js tests/qa/pixelbrain/ice-slime-staff.alignment.test.js
git commit -m "feat(pixelbrain): add guard.void_wings profile — asymmetric eldritch bezel"
```

---

## Task 4: `pommel.void_orb` and `pommel.void_orb_glow` profiles

**Files:**
- Modify: `codex/core/pixelbrain/part-profile-library.js`
- Test: `tests/qa/pixelbrain/ice-slime-staff.alignment.test.js`

- [ ] **Step 1: Write failing test**

Add inside the describe block:

```js
it('pommel.void_orb is a small filled circle parameterised by r', () => {
  const profile = getPartProfile('pommel.void_orb');
  const result = profile({ r: 3 }, {});

  expect(result.cells.length).toBeGreaterThan(0);

  // All cells within radius
  for (const { x, y } of result.cells) {
    expect(x * x + y * y).toBeLessThanOrEqual(3 * 3 + 1); // +1 for rounding
  }

  expect(result.anchors.base).toBeDefined();
  expect(result.anchors.tip).toBeDefined();
});

it('pommel.void_orb_glow is 1px larger than pommel.void_orb', () => {
  const orb = getPartProfile('pommel.void_orb')({ r: 3 }, {});
  const glow = getPartProfile('pommel.void_orb_glow')({ r: 3 }, {});

  // Glow must have more cells (larger radius)
  expect(glow.cells.length).toBeGreaterThan(orb.cells.length);

  // Glow extent must be wider
  const orbMaxR = Math.max(...orb.cells.map(c => Math.hypot(c.x, c.y)));
  const glowMaxR = Math.max(...glow.cells.map(c => Math.hypot(c.x, c.y)));
  expect(glowMaxR).toBeGreaterThan(orbMaxR);
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx vitest run tests/qa/pixelbrain/ice-slime-staff.alignment.test.js --reporter=verbose
```

Expected: FAIL — `Part profile "pommel.void_orb" is not registered`.

- [ ] **Step 3: Implement `pommel.void_orb` and `pommel.void_orb_glow`**

Append after `guard.void_wings`:

```js
// POMMEL.VOID_ORB — small filled circle; echoes the top orb in miniature.
// No cradle, no outline — sits bare against the grip.
registerPartProfile('pommel.void_orb', (params = {}, options = {}) => {
  const cx = roundInt(params.cx ?? 0);
  const cy = roundInt(params.cy ?? 0);
  const r = roundInt(params.r ?? 3);
  const cells = [];
  for (let y = -r; y <= r; y += 1) {
    for (let x = -r; x <= r; x += 1) {
      if (x * x + y * y <= r * r) cells.push({ x: cx + x, y: cy + y });
    }
  }
  return {
    cells,
    anchors: {
      base: { x: cx, y: cy - r },
      tip: { x: cx, y: cy + r },
      center: { x: cx, y: cy },
    },
  };
});

// POMMEL.VOID_ORB_GLOW — 1px larger bleed ring for the shadow orb halo.
registerPartProfile('pommel.void_orb_glow', (params = {}, options = {}) => {
  const cx = roundInt(params.cx ?? 0);
  const cy = roundInt(params.cy ?? 0);
  const r = roundInt(params.r ?? 3) + 1;
  const cells = [];
  for (let y = -r; y <= r; y += 1) {
    for (let x = -r; x <= r; x += 1) {
      if (x * x + y * y <= r * r) cells.push({ x: cx + x, y: cy + y });
    }
  }
  return {
    cells,
    anchors: {
      base: { x: cx, y: cy - r },
      tip: { x: cx, y: cy + r },
      center: { x: cx, y: cy },
    },
  };
});
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
npx vitest run tests/qa/pixelbrain/ice-slime-staff.alignment.test.js --reporter=verbose
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add codex/core/pixelbrain/part-profile-library.js tests/qa/pixelbrain/ice-slime-staff.alignment.test.js
git commit -m "feat(pixelbrain): add pommel.void_orb and pommel.void_orb_glow — shadow orb pommel"
```

---

## Task 5: Update `specs/ice-slime-staff.v1.json`

**Files:**
- Modify: `specs/ice-slime-staff.v1.json`

All six profiles now exist. Wire them into the spec.

- [ ] **Step 1: Add `orb_ring` and `orb_ring_glow` parts**

In `specs/ice-slime-staff.v1.json`, after the `orb_highlight` part (around line 74), insert:

```json
{
  "id": "orb_ring",
  "profile": "orb.ring",
  "params": { "r": 9 },
  "attach": { "parent": "orb", "at": "center" },
  "fill": { "material": "void_ice", "anchor": "deep" },
  "outline": { "material": "void_ice", "anchor": "spectral" }
},
{
  "id": "orb_ring_glow",
  "profile": "orb.ring_glow",
  "params": { "r": 9 },
  "attach": { "parent": "orb", "at": "center" },
  "fill": { "material": "void_ice", "anchor": "frost" }
},
```

- [ ] **Step 2: Add `shaft_rune_lattice` and `shaft_lattice_glow` parts**

After `shaft_glint` (around line 38), insert:

```json
{
  "id": "shaft_rune_lattice",
  "profile": "shaft.rune_lattice",
  "params": { "cx": 24, "span": [30, 90], "half": 2 },
  "attach": { "parent": "shaft", "at": "base" },
  "fill": { "material": "void_ice", "anchor": "deep" }
},
{
  "id": "shaft_lattice_glow",
  "profile": "shaft.rune_lattice",
  "params": { "cx": 24, "span": [30, 90], "half": 2 },
  "attach": { "parent": "shaft", "at": "base" },
  "fill": { "material": "cyan_glow", "anchor": "shadow" }
},
```

- [ ] **Step 3: Replace the `bezel` profile and add void trim + glow parts**

Find the `bezel` part (around line 161) and change its `"profile"` from `"guard.marquise"` to `"guard.void_wings"`. Then after `bezel_highlight`, insert:

```json
{
  "id": "bezel_void_trim",
  "profile": "guard.void_wings",
  "attach": { "parent": "shaft", "at": "base" },
  "fill": { "material": "void_ice", "anchor": "deep" }
},
{
  "id": "bezel_void_glow",
  "profile": "guard.void_wings",
  "attach": { "parent": "shaft", "at": "base" },
  "fill": { "material": "cyan_glow", "anchor": "spectral" }
},
```

- [ ] **Step 4: Replace `pommel` and add `pommel_glow`**

Find the `pommel` part (around line 203) and replace it entirely with:

```json
{
  "id": "pommel",
  "profile": "pommel.void_orb",
  "params": { "r": 3 },
  "attach": { "parent": "grip", "at": "tip" },
  "fill": { "material": "void_ice", "anchor": "deep" }
},
{
  "id": "pommel_glow",
  "profile": "pommel.void_orb_glow",
  "params": { "r": 3 },
  "attach": { "parent": "grip", "at": "tip" },
  "fill": { "material": "cyan_glow", "anchor": "spectral" }
}
```

(Remove the closing `]` and `}` before pasting — they follow naturally after `pommel_glow`.)

- [ ] **Step 5: Validate the spec forges without error**

```bash
node -e "
import { readFileSync } from 'fs';
import { forgeItemAsset } from './codex/core/pixelbrain/item-foundry.js';
const spec = JSON.parse(readFileSync('specs/ice-slime-staff.v1.json', 'utf8'));
const bundle = forgeItemAsset(spec, { includeShader: false, includePng: false });
console.log('parts:', bundle.silhouette.parts.map(p => p.id).join(', '));
" --input-type=module
```

Expected: prints all part IDs including `orb_ring`, `shaft_rune_lattice`, `bezel_void_trim`, `pommel_glow` without throwing.

- [ ] **Step 6: Run the full alignment test suite**

```bash
npx vitest run tests/qa/pixelbrain/ice-slime-staff.alignment.test.js --reporter=verbose
```

Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add specs/ice-slime-staff.v1.json
git commit -m "feat(ice-staff): wire void/eldritch profiles into ice slime staff spec"
```

---

## Task 6: Extend alignment test for new parts

**Files:**
- Modify: `tests/qa/pixelbrain/ice-slime-staff.alignment.test.js`

- [ ] **Step 1: Add integration assertions inside the existing alignment `it` block**

In the existing `it('enforces mathematically correct physical alignment...')` test, after the `expect(orb.anchorOut.base.y).toBe(31)` line, add:

```js
// 7. Orb ring wraps the orb — must exist as a part
const orbRing = getPart('orb_ring');
expect(orbRing).toBeDefined();
// orb_ring attaches at orb center (y=24), ring cells extend above and below
expect(orbRing.aabb.minY).toBeLessThan(24);
expect(orbRing.aabb.maxY).toBeGreaterThan(24);

// 8. Shaft rune lattice falls within shaft span
const lattice = getPart('shaft_rune_lattice');
expect(lattice.aabb.minY).toBeGreaterThanOrEqual(30);
expect(lattice.aabb.maxY).toBeLessThanOrEqual(91);

// 9. Bezel void trim co-locates with bezel
const bezelVoidTrim = getPart('bezel_void_trim');
expect(bezelVoidTrim.aabb.minY).toBe(bezel.aabb.minY);

// 10. Pommel glow overlaps pommel
const pommelGlow = getPart('pommel_glow');
expect(pommelGlow.aabb.minY).toBeLessThanOrEqual(pommel.aabb.minY + 1);
```

- [ ] **Step 2: Run the full alignment suite**

```bash
npx vitest run tests/qa/pixelbrain/ice-slime-staff.alignment.test.js --reporter=verbose
```

Expected: all tests PASS.

- [ ] **Step 3: Run the broader pixelbrain suite to check for regressions**

```bash
npx vitest run tests/qa/pixelbrain/ --reporter=verbose
```

Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add tests/qa/pixelbrain/ice-slime-staff.alignment.test.js
git commit -m "test(ice-staff): extend alignment QA with void/eldritch part assertions"
```

---

## Self-Review Notes

- **Spec coverage:** All four design sections (orb ring, shaft lattice, void wings bezel, shadow orb pommel) have corresponding tasks.
- **Placeholder scan:** No TBDs. All code blocks are complete.
- **Type consistency:** `orb.ring` uses `r` param throughout tasks 1, 5. `guard.void_wings` uses no params (cx defaults to 0) throughout tasks 3, 5. `pommel.void_orb` uses `r: 3` throughout tasks 4, 5.
- **Asymmetry invariant:** The `guard.void_wings` left-wing cells go to `cx-12`, right to `cx+10` — the test asserts `Math.abs(minX) > Math.abs(maxX)` which this satisfies.
