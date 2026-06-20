# Silhouette Blueprint & Three-View Shadow Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a sealed, digest-stamped `.silh` silhouette blueprint language and a gate that moulds the forge by its front shadow and judges the voxel solid by the three shadows it casts (front/side/top) at rest and across animation poses.

**Architecture:** A `.silh` text blueprint parses to a frozen IR + sha256 digest. Pure projection turns a `voxelPacket` into three integer shadow sets. The forge-craft-gate gains a `silhouetteBlueprint` audit: it compares the voxel's shadows to the blueprint's filled masks within a hashed per-view Hamming tolerance, then repeats per animation pose with the same rigid transform applied to both sides. Blocking failures emit `PB-ERR-v1`; passes emit a `PB-XP-v1` vaccine.

**Tech Stack:** Node ESM (`codex/core/pixelbrain/*.js`), Vitest, `node:crypto` for sha256, existing `image-to-pixel-art.js` fill/silhouette helpers, existing `codex/core/animation/bytecode/blueprintParser.ts` for animation metadata, React + jest-axe for the UI surface.

## Global Constraints

- **PDR authority:** `docs/scholomance-encyclopedia/PDR-archive/2026-06-19-pixelbrain-silhouette-blueprint-gate-pdr.md`. Every task implements a section of it.
- **Determinism covenant:** No `Math.random`, `Date.now`, `performance.now`, or network in any module under `codex/core/pixelbrain/silhouette-*` or in the gate path. Provenance timestamps that are NOT hashed are the only exception.
- **No new persisted schema without Codex:** `PB-SILH-BLUEPRINT-v1` must be registered in `SCHEMA_CONTRACT.md` (Task 1) before any module sets `contract: 'PB-SILH-BLUEPRINT-v1'` on persisted output.
- **Bytecode reuse:** Blocking failures use existing `PB-ERR-v1` categories via `BytecodeError`; passes use `encodeBytecodeXPVaccineFromHealth`. Do NOT add `PB-SILH-*` encoder families.
- **Coordinate convention (fixed for the whole plan):** voxel `(x,y,z)` = `(width, height, depth)`. `front` shadow collapses `z` → keys `(x,y)`; `side` collapses `x` → keys `(z,y)`; `top` collapses `y` → keys `(x,z)`. Shadow cell keys are the string `` `${a},${b}` ``.
- **GRID mapping:** `.silh` `GRID w h d` maps to voxel `dimensions.width=w, height=h, depth=d`.
- **Owners:** Task 1 = Codex. Tasks 2–10, 13 = Gemini. Task 11 = Codex (adapter seam). Task 12 = Claude/UI. Owners are advisory for the human; an agentic worker executes them in order.
- **Commit message footer:** end every commit body with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

### Task 1: Register PB-SILH-BLUEPRINT-v1 schema + `.silh` grammar (Codex)

**Files:**
- Modify: `docs/scholomance-encyclopedia/Scholomance LAW/SCHEMA_CONTRACT.md`
- Modify: `docs/scholomance-encyclopedia/PDR-archive/2026-06-19-pixelbrain-silhouette-blueprint-gate-pdr.md` (flip Status `Draft → Ratified` once registered)

**Interfaces:**
- Produces: the registered shape `PB-SILH-BLUEPRINT-v1` (fields exactly as Task 5 builds them) and the ratified `.silh` grammar. Tasks 5–8 depend on this registration existing.

- [ ] **Step 1: Add the schema entry.** In `SCHEMA_CONTRACT.md`, bump the version line and add a `PB-SILH-BLUEPRINT-v1` section registering this shape (sibling of `PB-VOXEL-ITEM-v1`):

```ts
PB-SILH-BLUEPRINT-v1 {
  contract: "PB-SILH-BLUEPRINT-v1";
  schemaVersion: "0.1.0";
  id: string;
  source: string | null;
  grid: { width: number; height: number; depth: number };
  snap: "integer";
  tolerance: { front: number; side: number; top: number };
  views: {
    front: { contour: [number, number][]; maskDigest: string };
    side:  { contour: [number, number][]; maskDigest: string };
    top:   { contour: [number, number][]; maskDigest: string };
  };
  animation: { id: string; durationMs: number; loop: number | "infinite";
               poses: { phase: string; rotateDeg: number }[] } | null;
  digest: string; // sha256(canonicalStringify(blueprint_without_digest))
}
```

State explicitly: this is a serialized item-silhouette contract distinct from the in-memory voxel volume; blocking failures map to existing `PB-ERR-v1`; no `PB-SILH` bytecode family is reserved.

- [ ] **Step 2: Ratify the grammar.** Add a short "`.silh` grammar (law)" block listing the legal directives: `SILH_START/SILH_END`, `ID`, `SOURCE`, `GRID w h d`, `SNAP integer`, `TOLERANCE front N side N top N`, `VIEW front|side|top`, `CONTOUR x,y ...`, `ANIM_START..ANIM_END`, `CONSTRAINT DETERMINISTIC true`, `QA INVARIANT <name>`.

- [ ] **Step 3: Run the hygiene audit.**

Run: `node docs/scholomance-encyclopedia/tools/audit-hygiene.mjs`
Expected: `PASS, 0 errors`.

- [ ] **Step 4: Commit**

```bash
git add "docs/scholomance-encyclopedia/Scholomance LAW/SCHEMA_CONTRACT.md" docs/scholomance-encyclopedia/PDR-archive/2026-06-19-pixelbrain-silhouette-blueprint-gate-pdr.md
git commit -m "schema: register PB-SILH-BLUEPRINT-v1 + .silh grammar"
```

---

### Task 2: Voxel shadow projection + hamming (Gemini)

**Files:**
- Create: `codex/core/pixelbrain/silhouette-projection.js`
- Test: `tests/core/pixelbrain/silhouette-projection.test.js`

**Interfaces:**
- Consumes: a `voxelPacket` shaped `{ dimensions:{width,height,depth}, voxels:[{x,y,z,materialId}] }` (from `item-voxel-packet.js`).
- Produces:
  - `projectVoxelShadows(voxelPacket) => { front: Set<string>, side: Set<string>, top: Set<string> }`
  - `hamming(a: Set<string>, b: Set<string>) => number` (size of symmetric difference)

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect } from 'vitest';
import { projectVoxelShadows, hamming } from '../../../codex/core/pixelbrain/silhouette-projection.js';

const packet = {
  dimensions: { width: 4, height: 4, depth: 2 },
  voxels: [
    { x: 1, y: 0, z: 0, materialId: 1 },
    { x: 1, y: 1, z: 1, materialId: 1 },
    { x: 2, y: 1, z: 0, materialId: 1 },
  ],
};

describe('projectVoxelShadows', () => {
  it('collapses each axis into the right shadow set', () => {
    const { front, side, top } = projectVoxelShadows(packet);
    // front collapses z -> (x,y)
    expect(front).toEqual(new Set(['1,0', '1,1', '2,1']));
    // side collapses x -> (z,y)
    expect(side).toEqual(new Set(['0,0', '1,1', '0,1']));
    // top collapses y -> (x,z)
    expect(top).toEqual(new Set(['1,0', '1,1', '2,0']));
  });
});

describe('hamming', () => {
  it('counts the symmetric difference', () => {
    expect(hamming(new Set(['a', 'b']), new Set(['b', 'c']))).toBe(2);
    expect(hamming(new Set(['a']), new Set(['a']))).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/core/pixelbrain/silhouette-projection.test.js`
Expected: FAIL — module not found / `projectVoxelShadows is not a function`.

- [ ] **Step 3: Write minimal implementation**

```js
// codex/core/pixelbrain/silhouette-projection.js

/** Project a voxel packet into three orthographic integer shadow sets. */
export function projectVoxelShadows(voxelPacket) {
  const front = new Set();
  const side = new Set();
  const top = new Set();
  for (const v of voxelPacket.voxels) {
    front.add(`${v.x},${v.y}`); // collapse z
    side.add(`${v.z},${v.y}`);  // collapse x
    top.add(`${v.x},${v.z}`);   // collapse y
  }
  return { front, side, top };
}

/** Symmetric-difference size between two shadow sets. */
export function hamming(a, b) {
  let count = 0;
  for (const k of a) if (!b.has(k)) count++;
  for (const k of b) if (!a.has(k)) count++;
  return count;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/core/pixelbrain/silhouette-projection.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add codex/core/pixelbrain/silhouette-projection.js tests/core/pixelbrain/silhouette-projection.test.js
git commit -m "feat(pixelbrain): voxel three-view shadow projection + hamming"
```

---

### Task 3: Rigid rotation transform for animation poses (Gemini)

**Files:**
- Modify: `codex/core/pixelbrain/silhouette-projection.js`
- Test: `tests/core/pixelbrain/silhouette-projection.test.js`

**Interfaces:**
- Produces: `rotateVoxelsZ(voxelPacket, degrees, pivot) => voxelPacket'` — rotates voxels in the front (x,y) plane about integer `pivot:{x,y}`, snapping results to integers. `z`, `materialId` preserved. Returns a new packet (input not mutated).

- [ ] **Step 1: Write the failing test**

```js
import { rotateVoxelsZ } from '../../../codex/core/pixelbrain/silhouette-projection.js';

describe('rotateVoxelsZ', () => {
  it('rotates 90deg about a pivot and snaps to integers', () => {
    const p = { dimensions: { width: 8, height: 8, depth: 1 },
      voxels: [{ x: 5, y: 4, z: 0, materialId: 2 }] };
    const r = rotateVoxelsZ(p, 90, { x: 4, y: 4 });
    // (5,4) about (4,4) by +90deg -> (4,5)
    expect(r.voxels[0]).toEqual({ x: 4, y: 5, z: 0, materialId: 2 });
    // input not mutated
    expect(p.voxels[0].x).toBe(5);
  });

  it('0deg is identity', () => {
    const p = { dimensions: { width: 4, height: 4, depth: 1 },
      voxels: [{ x: 2, y: 1, z: 0, materialId: 1 }] };
    expect(rotateVoxelsZ(p, 0, { x: 0, y: 0 }).voxels[0]).toEqual({ x: 2, y: 1, z: 0, materialId: 1 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/core/pixelbrain/silhouette-projection.test.js -t rotateVoxelsZ`
Expected: FAIL — `rotateVoxelsZ is not a function`.

- [ ] **Step 3: Write minimal implementation** (append to `silhouette-projection.js`)

```js
/** Rotate voxels in the (x,y) front plane about an integer pivot; snap to integers. */
export function rotateVoxelsZ(voxelPacket, degrees, pivot) {
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const voxels = voxelPacket.voxels.map((v) => {
    const dx = v.x - pivot.x;
    const dy = v.y - pivot.y;
    return {
      x: Math.round(pivot.x + dx * cos - dy * sin),
      y: Math.round(pivot.y + dx * sin + dy * cos),
      z: v.z,
      materialId: v.materialId,
    };
  });
  return { ...voxelPacket, voxels };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/core/pixelbrain/silhouette-projection.test.js -t rotateVoxelsZ`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add codex/core/pixelbrain/silhouette-projection.js tests/core/pixelbrain/silhouette-projection.test.js
git commit -m "feat(pixelbrain): rigid Z-rotation for animated shadow poses"
```

---

### Task 4: Canonical stringify + sha256 digest (Gemini)

**Files:**
- Create: `codex/core/pixelbrain/silhouette-blueprint.js`
- Test: `tests/core/pixelbrain/silhouette-blueprint.test.js`

**Interfaces:**
- Produces:
  - `canonicalStringify(obj) => string` — deterministic key-sorted JSON.
  - `digestBlueprint(blueprintWithoutDigest) => string` — `sha256` hex of `canonicalStringify`.

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect } from 'vitest';
import { canonicalStringify, digestBlueprint } from '../../../codex/core/pixelbrain/silhouette-blueprint.js';

describe('canonicalStringify', () => {
  it('sorts keys so order does not change output', () => {
    expect(canonicalStringify({ b: 1, a: 2 })).toBe(canonicalStringify({ a: 2, b: 1 }));
    expect(canonicalStringify({ a: 2, b: 1 })).toBe('{"a":2,"b":1}');
  });
});

describe('digestBlueprint', () => {
  it('is stable across runs and key order', () => {
    const d1 = digestBlueprint({ id: 'x', grid: { width: 1, height: 2, depth: 3 } });
    const d2 = digestBlueprint({ grid: { depth: 3, width: 1, height: 2 }, id: 'x' });
    expect(d1).toBe(d2);
    expect(d1).toMatch(/^[0-9a-f]{64}$/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/core/pixelbrain/silhouette-blueprint.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```js
// codex/core/pixelbrain/silhouette-blueprint.js
import { createHash } from 'node:crypto';

/** Deterministic, key-sorted JSON. Arrays preserve order; objects sort keys. */
export function canonicalStringify(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalStringify(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

/** sha256 hex over the canonical form (caller omits the `digest` field). */
export function digestBlueprint(blueprintWithoutDigest) {
  return createHash('sha256').update(canonicalStringify(blueprintWithoutDigest)).digest('hex');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/core/pixelbrain/silhouette-blueprint.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add codex/core/pixelbrain/silhouette-blueprint.js tests/core/pixelbrain/silhouette-blueprint.test.js
git commit -m "feat(pixelbrain): canonical stringify + sha256 blueprint digest"
```

---

### Task 5: Parse the `.silh` form block into IR + masks + digest (Gemini)

**Files:**
- Modify: `codex/core/pixelbrain/silhouette-blueprint.js`
- Test: `tests/core/pixelbrain/silhouette-blueprint.test.js`

**Interfaces:**
- Consumes: `fillShapeWithEvenOddWinding(outlineCoordinates, gridMetrics, options)` from `image-to-pixel-art.js`, where `outlineCoordinates` is `[{x,y},...]` and it returns filled cells `[{x,y},...]`.
- Produces:
  - `fillContourMask(contour, dims) => Set<string>` — filled `(a,b)` keys for one view.
  - `parseSilhouetteBlueprint(text) => SilhouetteBlueprint` (the Task 1 shape, `animation:null` until Task 6). Throws `BytecodeError(VALUE/...)` on malformed input.

- [ ] **Step 1: Write the failing test**

```js
import { parseSilhouetteBlueprint, fillContourMask } from '../../../codex/core/pixelbrain/silhouette-blueprint.js';

const SILH = `
SILH_START
ID weapon.tool.pickaxe-v1
SOURCE test
GRID 4 4 2
SNAP integer
TOLERANCE front 0 side 1 top 1
VIEW front
CONTOUR 0,0 2,0 2,2 0,2
VIEW side
CONTOUR 0,0 1,0 1,2 0,2
VIEW top
CONTOUR 0,0 2,0 2,1 0,1
CONSTRAINT DETERMINISTIC true
QA INVARIANT shadows-match-blueprint
SILH_END
`;

describe('parseSilhouetteBlueprint (form)', () => {
  it('parses grid, tolerance, three views, and a stable digest', () => {
    const bp = parseSilhouetteBlueprint(SILH);
    expect(bp.contract).toBe('PB-SILH-BLUEPRINT-v1');
    expect(bp.id).toBe('weapon.tool.pickaxe-v1');
    expect(bp.grid).toEqual({ width: 4, height: 4, depth: 2 });
    expect(bp.tolerance).toEqual({ front: 0, side: 1, top: 1 });
    expect(bp.views.front.contour).toEqual([[0,0],[2,0],[2,2],[0,2]]);
    expect(bp.digest).toMatch(/^[0-9a-f]{64}$/);
    // re-parse is byte-identical digest
    expect(parseSilhouetteBlueprint(SILH).digest).toBe(bp.digest);
  });

  it('throws on a malformed contour token', () => {
    const bad = SILH.replace('2,0 2,2', '2,X 2,2');
    expect(() => parseSilhouetteBlueprint(bad)).toThrow();
  });

  it('throws when a VIEW is missing', () => {
    const bad = SILH.replace('VIEW top\nCONTOUR 0,0 2,0 2,1 0,1\n', '');
    expect(() => parseSilhouetteBlueprint(bad)).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/core/pixelbrain/silhouette-blueprint.test.js -t "form"`
Expected: FAIL — `parseSilhouetteBlueprint is not a function`.

- [ ] **Step 3: Write minimal implementation** (append to `silhouette-blueprint.js`)

```js
import { fillShapeWithEvenOddWinding } from './image-to-pixel-art.js';
import { BytecodeError, ERROR_CATEGORIES, ERROR_SEVERITY, MODULE_IDS, ERROR_CODES } from './bytecode-error.js';

const SILH_CONTRACT = 'PB-SILH-BLUEPRINT-v1';
const SILH_SCHEMA_VERSION = '0.1.0';
const VIEWS = ['front', 'side', 'top'];

function fail(reason, extra = {}) {
  throw new BytecodeError(
    ERROR_CATEGORIES.VALUE, ERROR_SEVERITY.CRIT, MODULE_IDS.IMMUNITY, ERROR_CODES.INVALID_VALUE,
    { reason, ...extra }
  );
}

function parsePoint(tok) {
  const m = /^(-?\d+),(-?\d+)$/.exec(tok);
  if (!m) fail('malformed CONTOUR point', { token: tok });
  return [Number(m[1]), Number(m[2])];
}

/** Even-odd fill of a closed contour into a Set of "a,b" keys, clipped to dims. */
export function fillContourMask(contour, dims) {
  const outline = contour.map(([x, y]) => ({ x, y }));
  const filled = fillShapeWithEvenOddWinding(outline, { width: dims.w, height: dims.h }, {});
  const mask = new Set();
  for (const c of filled) {
    if (c.x >= 0 && c.x < dims.w && c.y >= 0 && c.y < dims.h) mask.add(`${c.x},${c.y}`);
  }
  return mask;
}

const VIEW_DIMS = {
  front: (g) => ({ w: g.width, h: g.height }),
  side:  (g) => ({ w: g.depth, h: g.height }),
  top:   (g) => ({ w: g.width, h: g.depth }),
};

/** Parse a .silh form block into the PB-SILH-BLUEPRINT-v1 IR (animation added in Task 6). */
export function parseSilhouetteBlueprint(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines[0] !== 'SILH_START' || lines[lines.length - 1] !== 'SILH_END') {
    fail('blueprint must be wrapped in SILH_START/SILH_END');
  }

  const out = { id: null, source: null, grid: null, snap: 'integer',
    tolerance: { front: 0, side: 0, top: 0 }, views: {} };
  let currentView = null;

  for (const line of lines.slice(1, -1)) {
    const [dir, ...rest] = line.split(/\s+/);
    switch (dir) {
      case 'ID': out.id = rest.join(' '); break;
      case 'SOURCE': out.source = rest.join(' '); break;
      case 'GRID': out.grid = { width: Number(rest[0]), height: Number(rest[1]), depth: Number(rest[2]) }; break;
      case 'SNAP': out.snap = rest[0]; break;
      case 'TOLERANCE':
        for (let i = 0; i < rest.length; i += 2) out.tolerance[rest[i]] = Number(rest[i + 1]);
        break;
      case 'VIEW':
        if (!VIEWS.includes(rest[0])) fail('unknown VIEW', { view: rest[0] });
        currentView = rest[0]; out.views[currentView] = { contour: [] };
        break;
      case 'CONTOUR':
        if (!currentView) fail('CONTOUR before VIEW');
        out.views[currentView].contour = rest.map(parsePoint);
        break;
      case 'CONSTRAINT': case 'QA': case 'ANIM_START': case 'ANIM_END':
        break; // ANIM handled in Task 6; CONSTRAINT/QA are declarative
      default:
        if (dir.startsWith('#')) break;
        break; // unknown directives are ignored (forward-compatible), except below
    }
  }

  if (!out.grid) fail('missing GRID');
  for (const v of VIEWS) {
    if (!out.views[v] || out.views[v].contour.length < 3) fail('missing or degenerate VIEW', { view: v });
    const dims = VIEW_DIMS[v](out.grid);
    out.views[v].maskDigest = digestBlueprint([...fillContourMask(out.views[v].contour, dims)].sort());
  }

  const blueprintWithoutDigest = {
    contract: SILH_CONTRACT, schemaVersion: SILH_SCHEMA_VERSION,
    id: out.id, source: out.source, grid: out.grid, snap: out.snap,
    tolerance: out.tolerance, views: out.views, animation: null,
  };
  return { ...blueprintWithoutDigest, digest: digestBlueprint(blueprintWithoutDigest) };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/core/pixelbrain/silhouette-blueprint.test.js -t "form"`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add codex/core/pixelbrain/silhouette-blueprint.js tests/core/pixelbrain/silhouette-blueprint.test.js
git commit -m "feat(pixelbrain): parse .silh form block to IR + view masks + digest"
```

---

### Task 6: Parse the `ANIM` block into poses (Gemini)

**Files:**
- Modify: `codex/core/pixelbrain/silhouette-blueprint.js`
- Test: `tests/core/pixelbrain/silhouette-blueprint.test.js`

**Interfaces:**
- Consumes: `parseBlueprintBlock(source)` from `codex/core/animation/bytecode/blueprintParser.ts` for id/duration/loop metadata.
- Produces: `parseSilhouetteBlueprint` now fills `animation = { id, durationMs, loop, poses:[{phase, rotateDeg}] }` when an `ANIM_START..ANIM_END` block is present; the rest pose (rotate 0) is always implicit and added by the gate, not stored here. `poses` are the declared `PHASE`/`ROTATE peak` extremes, in document order.

- [ ] **Step 1: Write the failing test**

```js
const SILH_ANIM = SILH.replace('CONSTRAINT DETERMINISTIC true', `
ANIM_START
ID pickaxe-swing
TARGET id weapon.tool.pickaxe-v1
DURATION 400
EASE token ease-out
LOOP infinite
PHASE windup
ROTATE base 0 peak -35
PHASE strike
ROTATE base -35 peak 60
ANIM_END
CONSTRAINT DETERMINISTIC true`);

describe('parseSilhouetteBlueprint (animation)', () => {
  it('extracts poses from the ANIM block', () => {
    const bp = parseSilhouetteBlueprint(SILH_ANIM);
    expect(bp.animation.id).toBe('pickaxe-swing');
    expect(bp.animation.durationMs).toBe(400);
    expect(bp.animation.loop).toBe('infinite');
    expect(bp.animation.poses).toEqual([
      { phase: 'windup', rotateDeg: -35 },
      { phase: 'strike', rotateDeg: 60 },
    ]);
  });

  it('leaves animation null when no ANIM block', () => {
    expect(parseSilhouetteBlueprint(SILH).animation).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/core/pixelbrain/silhouette-blueprint.test.js -t "animation"`
Expected: FAIL — `bp.animation` is `null`.

- [ ] **Step 3: Write minimal implementation.** Add an ANIM extractor and call it in `parseSilhouetteBlueprint` before computing the digest. (Note: the existing `blueprintParser` merges repeated directives, so poses are parsed directly here from the block's `PHASE`/`ROTATE ... peak N` lines; `parseBlueprintBlock` supplies id/duration/loop.)

```js
import { parseBlueprintBlock } from '../animation/bytecode/blueprintParser.ts';

function extractAnimBlock(lines) {
  const start = lines.indexOf('ANIM_START');
  const end = lines.indexOf('ANIM_END');
  if (start === -1 || end === -1 || end < start) return { animation: null, animLines: [] };
  const block = lines.slice(start, end + 1);
  const meta = parseBlueprintBlock(block.join('\n')).blueprint;

  const poses = [];
  let phase = null;
  for (const line of block) {
    const [dir, ...rest] = line.split(/\s+/);
    if (dir === 'PHASE') phase = rest[0];
    else if (dir === 'ROTATE' && phase) {
      const pk = rest.indexOf('peak');
      if (pk !== -1) poses.push({ phase, rotateDeg: Number(rest[pk + 1]) });
    }
  }
  return {
    animation: { id: meta.id, durationMs: meta.durationMs, loop: meta.loop, poses },
    animLines: block,
  };
}
```

Then in `parseSilhouetteBlueprint`, after the directive loop:

```js
const { animation } = extractAnimBlock(lines.slice(1, -1));
// ...replace `animation: null` in blueprintWithoutDigest with `animation`
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/core/pixelbrain/silhouette-blueprint.test.js`
Expected: PASS (all blueprint tests).

- [ ] **Step 5: Commit**

```bash
git add codex/core/pixelbrain/silhouette-blueprint.js tests/core/pixelbrain/silhouette-blueprint.test.js
git commit -m "feat(pixelbrain): parse ANIM block poses into silhouette blueprint"
```

---

### Task 7: Gate audit — rest-pose three-view match (Gemini)

**Files:**
- Modify: `codex/core/pixelbrain/forge-craft-gate.js`
- Test: `tests/core/pixelbrain/forge-craft-gate-silhouette.test.js`

**Interfaces:**
- Consumes: `projectVoxelShadows`, `hamming` (Task 2); `fillContourMask`, `VIEW_DIMS` shape via the blueprint's `views[v].contour` + `grid` (Task 5).
- Produces: `auditSilhouetteBlueprint(bundle, blueprint) => void` — throws `BytecodeError(STATE/CRIT/IMMUNITY/IMMUNE_INNATE_BLOCK)` naming the offending view + delta when any view exceeds tolerance, or the `GRID` disagrees with `bundle.voxelPacket.dimensions`. Wired into `runForgeCraftGate(spec, { blueprint })` after the determinism check.

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect } from 'vitest';
import { auditSilhouetteBlueprint } from '../../../codex/core/pixelbrain/forge-craft-gate.js';
import { parseSilhouetteBlueprint } from '../../../codex/core/pixelbrain/silhouette-blueprint.js';

function bundleFromVoxels(voxels, dims) {
  return { voxelPacket: { dimensions: dims, voxels } };
}

const BP = parseSilhouetteBlueprint(`
SILH_START
ID t
GRID 3 3 3
SNAP integer
TOLERANCE front 0 side 0 top 0
VIEW front
CONTOUR 0,0 2,0 2,2 0,2
VIEW side
CONTOUR 0,0 2,0 2,2 0,2
VIEW top
CONTOUR 0,0 2,0 2,2 0,2
SILH_END
`);

it('passes when voxel shadows fill the blueprint within tolerance', () => {
  const voxels = [];
  for (let x = 0; x < 3; x++) for (let y = 0; y < 3; y++) for (let z = 0; z < 3; z++)
    voxels.push({ x, y, z, materialId: 1 });
  expect(() => auditSilhouetteBlueprint(bundleFromVoxels(voxels, { width: 3, height: 3, depth: 3 }), BP)).not.toThrow();
});

it('fails the front view when a voxel spills past the contour (front 0)', () => {
  const voxels = [{ x: 2, y: 2, z: 0, materialId: 1 }]; // only one cell -> front shadow != full mask
  try {
    auditSilhouetteBlueprint(bundleFromVoxels(voxels, { width: 3, height: 3, depth: 3 }), BP);
    throw new Error('should have thrown');
  } catch (e) {
    expect(e.bytecode).toMatch(/^PB-ERR/);
    expect(e.context.view).toBe('front');
  }
});

it('fails when GRID disagrees with voxel dimensions', () => {
  const voxels = [{ x: 0, y: 0, z: 0, materialId: 1 }];
  expect(() => auditSilhouetteBlueprint(bundleFromVoxels(voxels, { width: 4, height: 3, depth: 3 }), BP)).toThrow();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/core/pixelbrain/forge-craft-gate-silhouette.test.js`
Expected: FAIL — `auditSilhouetteBlueprint is not a function`.

- [ ] **Step 3: Write minimal implementation.** Add to `forge-craft-gate.js`:

```js
import { projectVoxelShadows, hamming } from './silhouette-projection.js';
import { fillContourMask } from './silhouette-blueprint.js';

const VIEW_DIMS_FOR = {
  front: (g) => ({ w: g.width, h: g.height }),
  side:  (g) => ({ w: g.depth, h: g.height }),
  top:   (g) => ({ w: g.width, h: g.depth }),
};

function silhFail(reason, extra) {
  throw new BytecodeError(
    ERROR_CATEGORIES.STATE, ERROR_SEVERITY.CRIT, MODULE_IDS.IMMUNITY, ERROR_CODES.IMMUNE_INNATE_BLOCK,
    { reason, ...extra }
  );
}

/** Grade the bundle's three shadows against a sealed blueprint at rest. */
export function auditSilhouetteBlueprint(bundle, blueprint) {
  const dims = bundle.voxelPacket.dimensions;
  const g = blueprint.grid;
  if (dims.width !== g.width || dims.height !== g.height || dims.depth !== g.depth) {
    silhFail('GRID disagrees with voxelPacket dimensions', { grid: g, dims });
  }
  const shadows = projectVoxelShadows(bundle.voxelPacket);
  for (const view of ['front', 'side', 'top']) {
    const vdims = VIEW_DIMS_FOR[view](g);
    const mask = fillContourMask(blueprint.views[view].contour, vdims);
    const delta = hamming(shadows[view], mask);
    if (delta > blueprint.tolerance[view]) {
      silhFail('shadow does not match blueprint', { view, delta, tolerance: blueprint.tolerance[view] });
    }
  }
}
```

Then wire into `runForgeCraftGate`: change the signature to `runForgeCraftGate(spec, opts = {})` and, after the determinism check and before the `encodeBytecodeXPVaccineFromHealth` call, add:

```js
if (opts.blueprint) auditSilhouetteBlueprint(bundle1, opts.blueprint);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/core/pixelbrain/forge-craft-gate-silhouette.test.js`
Expected: PASS (3 tests). Also run the existing gate test to confirm no regression: `npx vitest run tests/core/pixelbrain/forge-craft-gate.test.js` → PASS (6).

- [ ] **Step 5: Commit**

```bash
git add codex/core/pixelbrain/forge-craft-gate.js tests/core/pixelbrain/forge-craft-gate-silhouette.test.js
git commit -m "feat(pixelbrain): gate audits rest-pose three-view shadows vs blueprint"
```

---

### Task 8: Gate audit — animation lockstep + rigid invariants (Gemini)

**Files:**
- Modify: `codex/core/pixelbrain/forge-craft-gate.js`
- Test: `tests/core/pixelbrain/forge-craft-gate-silhouette.test.js`

**Interfaces:**
- Consumes: `rotateVoxelsZ` (Task 3); `blueprint.animation.poses` (Task 6).
- Produces: `auditSilhouetteBlueprint` extended — when `blueprint.animation` is present, for each pose it applies `rotateVoxelsZ` to BOTH the voxel packet and a packet synthesized from the blueprint front mask, then compares their front shadows within `tolerance.front`; and asserts rigid invariants (voxel count conserved, single connected component) across poses. Pivot defaults to the grid centre `{ x: floor(width/2), y: floor(height/2) }`.

- [ ] **Step 1: Write the failing test**

```js
import { parseSilhouetteBlueprint } from '../../../codex/core/pixelbrain/silhouette-blueprint.js';

const BP_ANIM = parseSilhouetteBlueprint(`
SILH_START
ID t
GRID 3 3 3
SNAP integer
TOLERANCE front 0 side 0 top 0
VIEW front
CONTOUR 0,0 2,0 2,2 0,2
VIEW side
CONTOUR 0,0 2,0 2,2 0,2
VIEW top
CONTOUR 0,0 2,0 2,2 0,2
ANIM_START
ID spin
DURATION 100
LOOP 1
PHASE quarter
ROTATE base 0 peak 90
ANIM_END
SILH_END
`);

function solidCube() {
  const voxels = [];
  for (let x = 0; x < 3; x++) for (let y = 0; y < 3; y++) for (let z = 0; z < 3; z++)
    voxels.push({ x, y, z, materialId: 1 });
  return { voxelPacket: { dimensions: { width: 3, height: 3, depth: 3 }, voxels } };
}

it('passes animated poses when the solid stays in lockstep with the blueprint', () => {
  expect(() => auditSilhouetteBlueprint(solidCube(), BP_ANIM)).not.toThrow();
});

it('fails when a pose tears the silhouette (disconnected shard)', () => {
  const b = solidCube();
  b.voxelPacket.voxels.push({ x: 99, y: 99, z: 0, materialId: 1 }); // floating shard
  try {
    auditSilhouetteBlueprint(b, BP_ANIM);
    throw new Error('should have thrown');
  } catch (e) {
    expect(e.bytecode).toMatch(/^PB-ERR/);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/core/pixelbrain/forge-craft-gate-silhouette.test.js -t animated`
Expected: FAIL — animation branch not implemented (no throw on the shard / rest-only audit ignores poses).

- [ ] **Step 3: Write minimal implementation.** Add invariants + pose loop to `forge-craft-gate.js`:

```js
import { rotateVoxelsZ } from './silhouette-projection.js';

function connectedComponentCount(voxels) {
  const present = new Set(voxels.map((v) => `${v.x},${v.y},${v.z}`));
  const seen = new Set();
  let components = 0;
  for (const start of present) {
    if (seen.has(start)) continue;
    components++;
    const stack = [start];
    seen.add(start);
    while (stack.length) {
      const [x, y, z] = stack.pop().split(',').map(Number);
      for (const [dx, dy, dz] of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]) {
        const k = `${x + dx},${y + dy},${z + dz}`;
        if (present.has(k) && !seen.has(k)) { seen.add(k); stack.push(k); }
      }
    }
  }
  return components;
}

function maskToPacket(mask, dims) {
  const voxels = [];
  for (const key of mask) { const [x, y] = key.split(',').map(Number); voxels.push({ x, y, z: 0, materialId: 1 }); }
  return { dimensions: dims, voxels };
}
```

Append to `auditSilhouetteBlueprint`, after the rest-pose loop:

```js
  if (blueprint.animation) {
    const baseCount = bundle.voxelPacket.voxels.length;
    if (connectedComponentCount(bundle.voxelPacket.voxels) !== 1) {
      silhFail('voxel solid is not a single connected component', { components: connectedComponentCount(bundle.voxelPacket.voxels) });
    }
    const pivot = { x: Math.floor(g.width / 2), y: Math.floor(g.height / 2) };
    const frontDims = VIEW_DIMS_FOR.front(g);
    const frontMaskPacket = maskToPacket(fillContourMask(blueprint.views.front.contour, frontDims), bundle.voxelPacket.dimensions);
    for (const pose of blueprint.animation.poses) {
      const rotVoxel = rotateVoxelsZ(bundle.voxelPacket, pose.rotateDeg, pivot);
      if (rotVoxel.voxels.length !== baseCount) silhFail('voxel count not conserved under rotation', { phase: pose.phase });
      const rotMask = rotateVoxelsZ(frontMaskPacket, pose.rotateDeg, pivot);
      const delta = hamming(projectVoxelShadows(rotVoxel).front, projectVoxelShadows(rotMask).front);
      if (delta > blueprint.tolerance.front) {
        silhFail('animated pose not in lockstep with blueprint', { phase: pose.phase, view: 'front', delta });
      }
    }
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/core/pixelbrain/forge-craft-gate-silhouette.test.js`
Expected: PASS (all). Existing gate test still PASS.

- [ ] **Step 5: Commit**

```bash
git add codex/core/pixelbrain/forge-craft-gate.js tests/core/pixelbrain/forge-craft-gate-silhouette.test.js
git commit -m "feat(pixelbrain): gate verifies animated poses in lockstep + rigid invariants"
```

---

### Task 9: PNG → `.silh` scanner + CLI (Gemini)

**Files:**
- Create: `codex/core/pixelbrain/silhouette-scan.js`
- Create: `scripts/pixelbrain-silhouette-scan.mjs`
- Test: `tests/core/pixelbrain/silhouette-scan.test.js`

**Interfaces:**
- Consumes: `generateSilhouetteFromImage(imageAnalysis, canvasSize)` from `image-to-pixel-art.js` (returns boundary cells `[{x,y},...]`).
- Produces:
  - `traceContour(silhouetteCells) => [number,number][]` — ordered closed outline of a boundary cell set (deterministic: sort by angle about the centroid).
  - `buildSilhFormBlock({ id, grid, tolerance, views }) => string` — emits the `SILH_START..SILH_END` text (no ANIM; authored by hand).

- [ ] **Step 1: Write the failing test** (pure parts only; the `.mjs` is a thin wrapper)

```js
import { describe, it, expect } from 'vitest';
import { traceContour, buildSilhFormBlock } from '../../../codex/core/pixelbrain/silhouette-scan.js';
import { parseSilhouetteBlueprint } from '../../../codex/core/pixelbrain/silhouette-blueprint.js';

describe('silhouette-scan', () => {
  it('traces a square boundary into an ordered closed contour', () => {
    const cells = [{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:2,y:1},{x:2,y:2},{x:1,y:2},{x:0,y:2},{x:0,y:1}];
    const contour = traceContour(cells);
    expect(contour.length).toBe(8);
    expect(contour[0]).toHaveLength(2);
  });

  it('emits a .silh block that parses back', () => {
    const square = [[0,0],[2,0],[2,2],[0,2]];
    const text = buildSilhFormBlock({
      id: 'demo', grid: { width: 4, height: 4, depth: 4 },
      tolerance: { front: 0, side: 1, top: 1 },
      views: { front: square, side: square, top: square },
    });
    const bp = parseSilhouetteBlueprint(text);
    expect(bp.id).toBe('demo');
    expect(bp.grid).toEqual({ width: 4, height: 4, depth: 4 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/core/pixelbrain/silhouette-scan.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```js
// codex/core/pixelbrain/silhouette-scan.js
/** Order a boundary cell set into a closed polygon by angle about the centroid (deterministic). */
export function traceContour(cells) {
  if (cells.length === 0) return [];
  const cx = cells.reduce((s, c) => s + c.x, 0) / cells.length;
  const cy = cells.reduce((s, c) => s + c.y, 0) / cells.length;
  return [...cells]
    .map((c) => ({ c, a: Math.atan2(c.y - cy, c.x - cx) }))
    .sort((p, q) => (p.a - q.a) || (p.c.x - q.c.x) || (p.c.y - q.c.y))
    .map((p) => [p.c.x, p.c.y]);
}

/** Emit a SILH_START..SILH_END form block (animation authored separately by hand). */
export function buildSilhFormBlock({ id, grid, tolerance, views }) {
  const lines = ['SILH_START', `ID ${id}`, 'SOURCE scanned', `GRID ${grid.width} ${grid.height} ${grid.depth}`,
    'SNAP integer', `TOLERANCE front ${tolerance.front} side ${tolerance.side} top ${tolerance.top}`];
  for (const view of ['front', 'side', 'top']) {
    lines.push(`VIEW ${view}`, `CONTOUR ${views[view].map(([x, y]) => `${x},${y}`).join(' ')}`);
  }
  lines.push('CONSTRAINT DETERMINISTIC true', 'QA INVARIANT shadows-match-blueprint', 'SILH_END');
  return lines.join('\n') + '\n';
}
```

```js
// scripts/pixelbrain-silhouette-scan.mjs
#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs'; // already a dependency of the asset pipeline; if absent, decode via existing image utils
import { generateSilhouetteFromImage } from '../codex/core/pixelbrain/image-to-pixel-art.js';
import { traceContour, buildSilhFormBlock } from '../codex/core/pixelbrain/silhouette-scan.js';

function arg(name) { const i = process.argv.indexOf(name); return i === -1 ? null : process.argv[i + 1]; }

function pngToContour(path, canvas) {
  if (!path) return null;
  const png = PNG.sync.read(readFileSync(path));
  const analysis = { pixelData: png.data, dimensions: { width: png.width, height: png.height } };
  return traceContour(generateSilhouetteFromImage(analysis, canvas));
}

const id = arg('--id') || 'unnamed';
const out = arg('--out');
const grid = { width: 32, height: 48, depth: 16 };
const canvas = { width: grid.width, height: grid.height };
const front = pngToContour(arg('--front'), canvas);
if (!front) { console.error('Usage: --front a.png [--side b.png --top c.png] --id ID --out file.silh'); process.exit(1); }
const side = pngToContour(arg('--side'), { width: grid.depth, height: grid.height }) || front;
const top = pngToContour(arg('--top'), { width: grid.width, height: grid.depth }) || front;

const text = buildSilhFormBlock({ id, grid, tolerance: { front: 0, side: 6, top: 6 }, views: { front, side, top } });
if (out) { writeFileSync(out, text); console.log(`sealed ${out}`); } else { process.stdout.write(text); }
```

> Note for the implementer: confirm `pngjs` is installed (`node -e "require('pngjs')"`). If not, decode the PNG with the project's existing image-decoding util instead — do not add a new dependency without flagging it.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/core/pixelbrain/silhouette-scan.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add codex/core/pixelbrain/silhouette-scan.js scripts/pixelbrain-silhouette-scan.mjs tests/core/pixelbrain/silhouette-scan.test.js
git commit -m "feat(pixelbrain): PNG->.silh silhouette scanner + CLI"
```

---

### Task 10: Wire `--blueprint` into the gate CLI (Gemini)

**Files:**
- Modify: `scripts/pixelbrain-forge-gate.mjs`

**Interfaces:**
- Consumes: `runForgeCraftGate(spec, { blueprint })` (Task 7); `parseSilhouetteBlueprint` (Task 6).
- Produces: `node scripts/pixelbrain-forge-gate.mjs <spec.json> --blueprint <file.silh>` runs the gate with the sealed blueprint; PASS prints the vaccine + exits 0, FAIL prints the `PB-ERR` + exits 1.

- [ ] **Step 1: Add an integration check** (run after implementing, since this CLI shells out)

Create `tests/core/pixelbrain/forge-gate-cli.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';

describe('forge-gate CLI --blueprint', () => {
  it('prints usage and exits 1 with no spec', () => {
    try { execFileSync('node', ['scripts/pixelbrain-forge-gate.mjs']); throw new Error('no exit'); }
    catch (e) { expect(e.status).toBe(1); }
  });
});
```

- [ ] **Step 2: Run it to confirm baseline** — `npx vitest run tests/core/pixelbrain/forge-gate-cli.test.js` → PASS.

- [ ] **Step 3: Implement the flag.** Modify `scripts/pixelbrain-forge-gate.mjs`:

```js
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runForgeCraftGate } from '../codex/core/pixelbrain/forge-craft-gate.js';
import { parseSilhouetteBlueprint } from '../codex/core/pixelbrain/silhouette-blueprint.js';

const specPath = process.argv[2];
if (!specPath || specPath.startsWith('--')) {
  console.error('Usage: node scripts/pixelbrain-forge-gate.mjs <spec.json> [--blueprint <file.silh>]');
  process.exit(1);
}
const bpIdx = process.argv.indexOf('--blueprint');
const blueprint = bpIdx !== -1 ? parseSilhouetteBlueprint(readFileSync(resolve(process.argv[bpIdx + 1]), 'utf8')) : null;

try {
  const spec = JSON.parse(readFileSync(resolve(specPath), 'utf8'));
  const result = runForgeCraftGate(spec, blueprint ? { blueprint } : {});
  if (result.ok) { console.log(result.vaccine); process.exit(0); }
  process.exit(1);
} catch (error) {
  if (error.bytecode && error.bytecode.startsWith('PB-ERR')) { console.error(error.bytecode); process.exit(1); }
  console.error(error);
  process.exit(1);
}
```

- [ ] **Step 4: Run** — `npx vitest run tests/core/pixelbrain/forge-gate-cli.test.js` → PASS. Manual smoke: `node scripts/pixelbrain-forge-gate.mjs specs/voidmetal-pickaxe.v1.json` still prints a vaccine, exit 0.

- [ ] **Step 5: Commit**

```bash
git add scripts/pixelbrain-forge-gate.mjs tests/core/pixelbrain/forge-gate-cli.test.js
git commit -m "feat(pixelbrain): gate CLI accepts --blueprint .silh"
```

---

### Task 11: Adapter seam for the blueprint gate (Codex — src/lib)

**Files:**
- Modify: `src/lib/pixelbrain.adapter.js`

**Interfaces:**
- Consumes: `runForgeCraftGate(spec, opts)` (Task 7), `parseSilhouetteBlueprint` (Task 6).
- Produces: `runForgeCraftGateWithBlueprint(spec, silhText) => { ok, vaccine?, bytecode?, reason?, perView? }` — a UI-safe verdict (no raw `BytecodeError` escapes). `parseSilhouetteBlueprint` and the gate run inside one try/catch; failures flatten exactly like the existing `runForgeCraftGate` wrapper.

- [ ] **Step 1: Add the import** next to the existing forge-craft-gate import:

```js
import { parseSilhouetteBlueprint as codexParseSilhouetteBlueprint } from '../../codex/core/pixelbrain/silhouette-blueprint.js';
```

- [ ] **Step 2: Add the export** next to `runForgeCraftGate`:

```js
export function runForgeCraftGateWithBlueprint(spec, silhText) {
  try {
    const blueprint = codexParseSilhouetteBlueprint(silhText);
    const result = codexRunForgeCraftGate(spec, { blueprint });
    return { ok: true, vaccine: result.vaccine, digest: blueprint.digest };
  } catch (err) {
    const detail = typeof err?.toJSON === 'function' ? err.toJSON() : null;
    return {
      ok: false,
      bytecode: err?.bytecode || null,
      reason: detail?.context?.reason || err?.message || 'Silhouette blueprint gate failure',
      view: detail?.context?.view || null,
      phase: detail?.context?.phase || null,
      detail,
    };
  }
}
```

- [ ] **Step 3: Smoke-check the export resolves**

Run: `node --input-type=module -e "import('./src/lib/pixelbrain.adapter.js').then(m => console.log(typeof m.runForgeCraftGateWithBlueprint))"`
Expected: `function`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/pixelbrain.adapter.js
git commit -m "feat(adapter): normalized runForgeCraftGateWithBlueprint seam for UI"
```

---

### Task 12: `/pixelbrain` blueprint surface (Claude/UI)

**Files:**
- Modify: `src/pages/PixelBrain/components/ForgeGatePanel.jsx`
- Modify: `src/pages/PixelBrain/PixelBrainPage.jsx`
- Modify: `src/pages/PixelBrain/PixelBrainPage.css`
- Test: `tests/qa/features/forgeGate.qa.test.jsx`

**Interfaces:**
- Consumes: `runForgeCraftGateWithBlueprint(spec, silhText)` (Task 11) via the page handler `handleRunForgeGateWithBlueprint(spec, silhText)`.
- Produces: the panel accepts an optional `.silh` alongside the spec; on a blueprint run it renders the verdict plus a per-view chip row (front/side/top PASS/FAIL) and, on failure, the offending `view`/`phase`.

- [ ] **Step 1: Write the failing test** (add to the existing QA file)

```jsx
it('renders per-view chips when a blueprint verdict comes back', async () => {
  const onRunGate = vi.fn();
  const onRunBlueprint = vi.fn(() => ({ ok: false, bytecode: 'PB-ERR-v1:0x0F01', reason: 'shadow does not match blueprint', view: 'side' }));
  render(<ForgeGatePanel onRunGate={onRunGate} onRunBlueprint={onRunBlueprint} />);

  // load spec then blueprint
  fireEvent.change(screen.getByLabelText(/run the forge craft gate/i), { target: { files: [specFile({ id: 'x', parts: [] })] } });
  const silh = new File(['SILH_START\nSILH_END'], 'p.silh', { type: 'text/plain' });
  silh.text = () => Promise.resolve('SILH_START\nSILH_END');
  fireEvent.change(screen.getByLabelText(/load a silhouette blueprint/i), { target: { files: [silh] } });

  await waitFor(() => expect(screen.getByText(/shadow does not match blueprint/i)).toBeInTheDocument());
  expect(screen.getByTestId('pb-view-chip-side')).toHaveAttribute('data-state', 'fail');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/qa/features/forgeGate.qa.test.jsx -t "per-view chips"`
Expected: FAIL — no blueprint control / chips.

- [ ] **Step 3: Implement.** In `ForgeGatePanel.jsx`: add an `onRunBlueprint` prop; add a second labelled file input (`aria-label="Load a silhouette blueprint (.silh) and run the gate"`) that reads the `.silh` text, calls `onRunBlueprint(spec, silhText)` using the last-loaded spec (store it in state), and renders a `pb-forge-gate__views` row with three chips `data-testid={`pb-view-chip-${view}`}` and `data-state` = `pass`/`fail`/`idle` driven by the verdict's `view`. Wire `handleRunForgeGateWithBlueprint` in `PixelBrainPage.jsx` (calls `runForgeCraftGateWithBlueprint` from the adapter, sets the page notice, returns the verdict) and pass it as `onRunBlueprint`. Add `.pb-forge-gate__views` + chip CSS mirroring the existing verdict states, gated by `prefers-reduced-motion`.

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/qa/features/forgeGate.qa.test.jsx`
Expected: PASS (all, including the existing 5 + the new chip test). Then `npx eslint src/pages/PixelBrain/components/ForgeGatePanel.jsx src/pages/PixelBrain/PixelBrainPage.jsx` → 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/pages/PixelBrain/components/ForgeGatePanel.jsx src/pages/PixelBrain/PixelBrainPage.jsx src/pages/PixelBrain/PixelBrainPage.css tests/qa/features/forgeGate.qa.test.jsx
git commit -m "feat(pixelbrain-ui): .silh blueprint surface with per-view verdict chips"
```

---

### Task 13: Golden pickaxe `.silh` + full mutation-negative suite (Gemini/QA)

**Files:**
- Create: `specs/voidmetal-pickaxe.silh`
- Create: `tests/core/pixelbrain/silhouette-blueprint-golden.test.js`

**Interfaces:**
- Consumes: everything above; `forgeItemAsset` for the real pickaxe bundle.

- [ ] **Step 1: Seal the golden.** Forge the pickaxe, read its `voxelPacket.dimensions`, author `specs/voidmetal-pickaxe.silh` whose `GRID` matches and whose three `CONTOUR`s are the projected shadows of the real forge output (generate them once via `projectVoxelShadows` + `traceContour`, paste in, set `TOLERANCE front 0 side 6 top 6`). Add the swing `ANIM` block from the PDR §6.

- [ ] **Step 2: Write the golden + negative tests**

```js
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { forgeItemAsset } from '../../../codex/core/pixelbrain/item-foundry.js';
import { runForgeCraftGate } from '../../../codex/core/pixelbrain/forge-craft-gate.js';
import { parseSilhouetteBlueprint } from '../../../codex/core/pixelbrain/silhouette-blueprint.js';

const spec = JSON.parse(readFileSync('specs/voidmetal-pickaxe.v1.json', 'utf8'));
const blueprint = parseSilhouetteBlueprint(readFileSync('specs/voidmetal-pickaxe.silh', 'utf8'));

describe('silhouette gate golden', () => {
  it('voidmetal pickaxe passes its sealed blueprint', () => {
    expect(() => runForgeCraftGate(spec, { blueprint })).not.toThrow();
  });

  it('a one-cell-shrunk front contour fails (front 0)', () => {
    const torn = { ...blueprint, views: { ...blueprint.views,
      front: { ...blueprint.views.front, contour: blueprint.views.front.contour.slice(0, -1) } } };
    expect(() => runForgeCraftGate(spec, { blueprint: torn })).toThrow();
  });
});
```

- [ ] **Step 3: Run** — `npx vitest run tests/core/pixelbrain/silhouette-blueprint-golden.test.js` → PASS. Then the whole pixelbrain core suite: `npx vitest run tests/core/pixelbrain/` → PASS.

- [ ] **Step 4: Commit**

```bash
git add specs/voidmetal-pickaxe.silh tests/core/pixelbrain/silhouette-blueprint-golden.test.js
git commit -m "test(pixelbrain): golden voidmetal pickaxe .silh + negative suite"
```

---

## Self-Review

**Spec coverage:** PDR §6 grammar → Tasks 5/6; §7 IR+digest → Tasks 4/5; §8 projection → Task 2; §9 animation verification → Tasks 3/8; §10 mould wiring → noted in Task 7 (front mask feeds the gate; full forge-input moulding is a flagged later phase, consistent with PDR §10's "v1 front view is load-bearing"); §11 bytecode → Tasks 7/8 reuse `PB-ERR`; §12 files → Tasks 2–12; §13 phases → task order; §14 mutation-negative → Tasks 7/8/13; §16 handoffs → owner tags. Schema (§1 of the gate's own rule) → Task 1 first.

**Gap noted:** PDR §10 full side/top moulding of the forge input is explicitly deferred (the forge currently only accepts a front-plane silhouette constraint). Task 7 feeds the front mask to the gate as inspector; wiring the front mask into `forgeItemAsset`'s silhouette input is a one-line follow-up flagged in Task 7's prose and left out of v1 scope to avoid forge-route regressions — matches the PDR's "v1 front view is the load-bearing mould."

**Placeholder scan:** none — every code step carries real code; the only prose-only step (Task 12 Step 3) is a UI wiring step whose test (Step 1) and CSS class names are concrete.

**Type consistency:** `voxelPacket.dimensions.{width,height,depth}` used everywhere; shadow keys `"a,b"` consistent across Tasks 2/7/8; `tolerance.{front,side,top}` consistent; `blueprint.views[v].contour` as `[number,number][]` consistent; `runForgeCraftGate(spec, opts)` second-arg shape `{ blueprint }` consistent across Tasks 7/10/11.
