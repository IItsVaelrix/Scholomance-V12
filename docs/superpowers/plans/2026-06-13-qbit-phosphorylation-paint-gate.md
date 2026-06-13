# QBIT Phosphorylation — Paint Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace imperative `paintCell` calls in the interactive editor with a gate-validated phosphorylation reaction that derives color from SDF + material — making it structurally impossible to write a wrong color to the lattice.

**Architecture:** A `KinaseDescriptor` (built once per material selection) carries the SDF context and material threshold alongside a pure `call({ sdfValue, normal })` function. `phosphorylate(layer, x, y, kinase)` runs the gate — sampling SDF, computing normal, calling the kinase, checking confidence — and only writes to the layer if all checks pass. `PhosphorylationCommand` wraps this for undo/redo, capturing the resolved color on first execution so redo never re-runs the kinase.

**Tech Stack:** JavaScript (ES modules), Vitest, `codex/core/pixelbrain/sdf-evaluator.js`, `codex/core/pixelbrain/template-grid-engine.js` (setCell/getCell/clearCell), `codex/core/pixelbrain/material-registry.js` (anchors), `codex/core/pixelbrain/editor-command-stack.js`.

---

## File Map

| File | Role |
|------|------|
| `codex/core/pixelbrain/qbit-phosphorylation.js` | **New** — `buildKinase`, `phosphorylate`, `COLLAPSE_THRESHOLD` |
| `codex/core/pixelbrain/editor-command-stack.js` | **Modify** — add `PhosphorylationCommand` + `createPhosphorylationCommand` |
| `codex/core/pixelbrain/qbit-sprite-cache.js` | **New** — piece-keyed JIT sprite cache |
| `src/pages/internal/pixel-lotus/ActorForgeLab.tsx` | **Modify** — wire brush stroke to `PhosphorylationCommand`, dampened rejection UI |
| `tests/core/pixelbrain/qbit-phosphorylation.test.js` | **New** — all 10 QA cases + `buildKinase` + redo purity test |
| `tests/core/pixelbrain/qbit-sprite-cache.test.js` | **New** — cache hit, invalidation, JIT fill |

---

## Task 1: Core gate — `qbit-phosphorylation.js`

**Files:**
- Create: `codex/core/pixelbrain/qbit-phosphorylation.js`
- Create: `tests/core/pixelbrain/qbit-phosphorylation.test.js`

- [ ] **Step 1: Write failing tests for `buildKinase`**

Create `tests/core/pixelbrain/qbit-phosphorylation.test.js`:

```js
import { describe, it, expect, vi } from 'vitest';
import {
  COLLAPSE_THRESHOLD,
  buildKinase,
  phosphorylate,
} from '../../../codex/core/pixelbrain/qbit-phosphorylation.js';

const VALID_MATERIAL = {
  id: 'test_metal',
  anchors: { rim: '#111111', mid: '#888888', core: '#FFFFFF' },
  phosphorylationThreshold: undefined,
};

const VALID_SDF = {
  primitives: [{ type: 'circle', params: { center: { x: 8, y: 8 }, radius: 8 } }],
};

// A layer with no cells (template-grid-engine compatible)
function makeLayer() {
  return { cells: new Map(), visible: true, opacity: 1, locked: false };
}

describe('buildKinase', () => {
  it('returns invalid descriptor for null material', () => {
    const k = buildKinase(null, VALID_SDF);
    expect(k.valid).toBe(false);
    expect(k.reason).toBe('MISSING_SUBSTRATE');
    expect(k.call).toBeNull();
  });

  it('returns invalid descriptor for null sdfDescriptor', () => {
    const k = buildKinase(VALID_MATERIAL, null);
    expect(k.valid).toBe(false);
    expect(k.reason).toBe('MISSING_SUBSTRATE');
  });

  it('returns valid descriptor for real material + SDF', () => {
    const k = buildKinase(VALID_MATERIAL, VALID_SDF);
    expect(k.valid).toBe(true);
    expect(k.reason).toBeNull();
    expect(typeof k.call).toBe('function');
    expect(k.sdfDescriptor).toBe(VALID_SDF);
  });

  it('exposes material phosphorylationThreshold when defined', () => {
    const mat = { ...VALID_MATERIAL, phosphorylationThreshold: 0.8 };
    const k = buildKinase(mat, VALID_SDF);
    expect(k.threshold).toBe(0.8);
  });

  it('threshold is undefined when material does not define one', () => {
    const k = buildKinase(VALID_MATERIAL, VALID_SDF);
    expect(k.threshold).toBeUndefined();
  });
});

describe('phosphorylate — gate logic', () => {
  it('commits and calls setCell on valid inputs inside the SDF shape', () => {
    const layer = makeLayer();
    const kinase = buildKinase(VALID_MATERIAL, VALID_SDF);
    // (4,8) is inside the circle (center 8,8 radius 8)
    const result = phosphorylate(layer, 4, 8, kinase);
    expect(result.committed).toBe(true);
    expect(result.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(layer.cells.has('4,8')).toBe(true);
  });

  it('rejects with MISSING_SUBSTRATE when kinase.valid is false (null material)', () => {
    const layer = makeLayer();
    const kinase = buildKinase(null, VALID_SDF);
    const result = phosphorylate(layer, 4, 8, kinase);
    expect(result.committed).toBe(false);
    expect(result.reason).toBe('MISSING_SUBSTRATE');
  });

  it('rejects with MISSING_SUBSTRATE when SDF is missing from descriptor', () => {
    const layer = makeLayer();
    const kinase = buildKinase(VALID_MATERIAL, null);
    const result = phosphorylate(layer, 4, 8, kinase);
    expect(result.committed).toBe(false);
    expect(result.reason).toBe('MISSING_SUBSTRATE');
  });

  it('rejects with MISSING_SUBSTRATE when cell is outside SDF shape (Infinity distance)', () => {
    const layer = makeLayer();
    const kinase = buildKinase(VALID_MATERIAL, VALID_SDF);
    // (100, 100) is far outside the circle
    const result = phosphorylate(layer, 100, 100, kinase);
    expect(result.committed).toBe(false);
    expect(result.reason).toBe('MISSING_SUBSTRATE');
  });

  it('rejects with INVALID_REACTION when kinase.call throws', () => {
    const layer = makeLayer();
    const kinase = {
      valid: true, reason: null, threshold: undefined, sdfDescriptor: VALID_SDF,
      call: () => { throw new Error('kaboom'); },
    };
    const result = phosphorylate(layer, 4, 8, kinase);
    expect(result.committed).toBe(false);
    expect(result.reason).toBe('INVALID_REACTION');
  });

  it('rejects with INVALID_REACTION when kinase returns invalid color', () => {
    const layer = makeLayer();
    const kinase = {
      valid: true, reason: null, threshold: undefined, sdfDescriptor: VALID_SDF,
      call: () => ({ color: 'not-a-color', confidence: 0.9 }),
    };
    const result = phosphorylate(layer, 4, 8, kinase);
    expect(result.committed).toBe(false);
    expect(result.reason).toBe('INVALID_REACTION');
  });

  it('rejects with LOW_CONFIDENCE when confidence is below threshold', () => {
    const layer = makeLayer();
    const kinase = {
      valid: true, reason: null, threshold: undefined, sdfDescriptor: VALID_SDF,
      call: () => ({ color: '#FF0000', confidence: 0.1 }),
    };
    const result = phosphorylate(layer, 4, 8, kinase);
    expect(result.committed).toBe(false);
    expect(result.reason).toBe('LOW_CONFIDENCE');
  });

  it('respects options.threshold over COLLAPSE_THRESHOLD', () => {
    const layer = makeLayer();
    const kinase = {
      valid: true, reason: null, threshold: undefined, sdfDescriptor: VALID_SDF,
      call: () => ({ color: '#FF0000', confidence: 0.3 }),
    };
    // confidence 0.3 would fail default threshold 0.5, but passes options.threshold 0.2
    const result = phosphorylate(layer, 4, 8, kinase, { threshold: 0.2 });
    expect(result.committed).toBe(true);
  });

  it('respects kinase.threshold over COLLAPSE_THRESHOLD', () => {
    const layer = makeLayer();
    const kinase = {
      valid: true, reason: null, threshold: 0.2, sdfDescriptor: VALID_SDF,
      call: () => ({ color: '#FF0000', confidence: 0.3 }),
    };
    const result = phosphorylate(layer, 4, 8, kinase);
    expect(result.committed).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests, confirm all fail (module not found)**

```bash
npx vitest run tests/core/pixelbrain/qbit-phosphorylation.test.js
```

Expected: all tests fail with `Cannot find module`.

- [ ] **Step 3: Implement `qbit-phosphorylation.js`**

Create `codex/core/pixelbrain/qbit-phosphorylation.js`:

```js
import { evaluateSDF } from './sdf-evaluator.js';
import { setCell } from './template-grid-engine.js';

export const COLLAPSE_THRESHOLD = 0.5;

const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

/**
 * Build a KinaseDescriptor from a material and SDF descriptor.
 * Returns invalid descriptor (committed: false) if either is missing.
 *
 * @param {Object|null} material - Material from material-registry
 * @param {Object|null} sdfDescriptor - SDF descriptor with .primitives[]
 * @returns {KinaseDescriptor}
 */
export function buildKinase(material, sdfDescriptor) {
  if (!material || !sdfDescriptor) {
    return { valid: false, reason: 'MISSING_SUBSTRATE', threshold: undefined, sdfDescriptor: null, call: null };
  }

  const anchors = Object.values(material.anchors || {});

  return {
    valid: true,
    reason: null,
    threshold: material.phosphorylationThreshold,
    sdfDescriptor,
    call({ sdfValue, normal }) {
      // sdfValue > 0 means outside the shape — zero confidence
      if (sdfValue > 0) return { color: null, confidence: 0 };

      // Depth: 0 at rim (sdfValue ≈ 0), 1 at deep core (large negative sdfValue)
      // Clamp at 20 pixels deep — enough for any sprite piece
      const depth = Math.min(1, -sdfValue / 20);

      // Normal-based shading: dot product with top-left light
      const lightNx = -0.707, lightNy = -0.707;
      const lit = Math.max(0, normal.nx * lightNx + normal.ny * lightNy);
      const shading = 0.4 + 0.6 * lit; // ambient 0.4 + diffuse

      if (anchors.length === 0) return { color: null, confidence: 0 };

      // Map depth to anchor index
      const idx = Math.min(anchors.length - 1, Math.floor(depth * anchors.length));
      const baseColor = anchors[idx];

      if (!HEX_COLOR_RE.test(baseColor)) return { color: null, confidence: 0 };

      const color = shadedHex(baseColor, shading);
      const confidence = 0.5 + 0.5 * depth; // deeper = more confident

      return { color, confidence };
    },
  };
}

/**
 * Gate-validated paint operation.
 *
 * @param {Object} layer - Template grid layer (from template-grid-engine)
 * @param {number} x - Cell x coordinate
 * @param {number} y - Cell y coordinate
 * @param {KinaseDescriptor} kinase - From buildKinase()
 * @param {{ threshold?: number }} [options]
 * @returns {{ committed: boolean, color?: string, confidence: number, reason?: string }}
 */
export function phosphorylate(layer, x, y, kinase, options = {}) {
  // Step 1: kinase validity
  if (!kinase || !kinase.valid) {
    return { committed: false, reason: kinase?.reason ?? 'MISSING_SUBSTRATE', confidence: 0 };
  }

  // Step 2: SDF sample
  const sdfValue = evaluateSDF(kinase.sdfDescriptor, x, y);
  if (!Number.isFinite(sdfValue)) {
    return { committed: false, reason: 'MISSING_SUBSTRATE', confidence: 0 };
  }

  // Step 3: Normal via finite-difference gradient of SDF
  const normal = sdfNormal(kinase.sdfDescriptor, x, y);
  if (normal.nx === 0 && normal.ny === 0) {
    return { committed: false, reason: 'MISSING_SUBSTRATE', confidence: 0 };
  }

  // Step 4: Kinase call
  let result;
  try {
    result = kinase.call({ sdfValue, normal });
  } catch {
    return { committed: false, reason: 'INVALID_REACTION', confidence: 0 };
  }

  if (!result || !HEX_COLOR_RE.test(result.color)) {
    return { committed: false, reason: 'INVALID_REACTION', confidence: result?.confidence ?? 0 };
  }

  // Step 5: Threshold resolution
  const threshold = options.threshold ?? kinase.threshold ?? COLLAPSE_THRESHOLD;
  if (result.confidence < threshold) {
    return { committed: false, reason: 'LOW_CONFIDENCE', confidence: result.confidence };
  }

  // Step 6: Commit
  setCell(layer, x, y, result.color);
  return { committed: true, color: result.color, confidence: result.confidence };
}

// ── Internals ────────────────────────────────────────────────────────────────

function sdfNormal(sdfDescriptor, x, y, eps = 0.5) {
  const dx = evaluateSDF(sdfDescriptor, x + eps, y) - evaluateSDF(sdfDescriptor, x - eps, y);
  const dy = evaluateSDF(sdfDescriptor, x, y + eps) - evaluateSDF(sdfDescriptor, x, y - eps);
  const len = Math.hypot(dx, dy);
  if (len < 1e-8) return { nx: 0, ny: 0 };
  return { nx: dx / len, ny: dy / len };
}

function shadedHex(hex, factor) {
  const r = Math.round(parseInt(hex.slice(1, 3), 16) * factor);
  const g = Math.round(parseInt(hex.slice(3, 5), 16) * factor);
  const b = Math.round(parseInt(hex.slice(5, 7), 16) * factor);
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('').toUpperCase();
}
```

- [ ] **Step 4: Run tests, confirm they pass**

```bash
npx vitest run tests/core/pixelbrain/qbit-phosphorylation.test.js
```

Expected: all 10 tests pass, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add codex/core/pixelbrain/qbit-phosphorylation.js tests/core/pixelbrain/qbit-phosphorylation.test.js
git commit -m "feat(pixelbrain): QBIT phosphorylation gate — buildKinase + phosphorylate"
```

---

## Task 2: `PhosphorylationCommand` in `editor-command-stack.js`

**Files:**
- Modify: `codex/core/pixelbrain/editor-command-stack.js`
- Modify: `tests/core/pixelbrain/qbit-phosphorylation.test.js` (add command tests)

- [ ] **Step 1: Write failing tests for `PhosphorylationCommand`**

Append to `tests/core/pixelbrain/qbit-phosphorylation.test.js`:

```js
import {
  createCommandStack,
  PhosphorylationCommand,
  createPhosphorylationCommand,
} from '../../../codex/core/pixelbrain/editor-command-stack.js';

describe('PhosphorylationCommand', () => {
  it('does not push to history on rejected phosphorylation', () => {
    const layer = makeLayer();
    const kinase = buildKinase(null, VALID_SDF); // invalid — will reject
    const stack = createCommandStack();
    const cmd = createPhosphorylationCommand(layer, 4, 8, kinase);
    stack.execute(cmd);
    expect(stack.canUndo()).toBe(false); // nothing was pushed
    expect(layer.cells.has('4,8')).toBe(false);
  });

  it('pushes to history on successful phosphorylation', () => {
    const layer = makeLayer();
    const kinase = buildKinase(VALID_MATERIAL, VALID_SDF);
    const stack = createCommandStack();
    stack.execute(createPhosphorylationCommand(layer, 4, 8, kinase));
    expect(stack.canUndo()).toBe(true);
    expect(layer.cells.has('4,8')).toBe(true);
  });

  it('undo restores previous cell state', () => {
    const layer = makeLayer();
    // Pre-paint a cell so previousColor is captured
    layer.cells.set('4,8', { x: 4, y: 8, color: '#AAAAAA', emphasis: 1 });
    const kinase = buildKinase(VALID_MATERIAL, VALID_SDF);
    const stack = createCommandStack();
    stack.execute(createPhosphorylationCommand(layer, 4, 8, kinase, '#AAAAAA'));
    const committedColor = layer.cells.get('4,8')?.color;
    stack.undo();
    expect(layer.cells.get('4,8')?.color).toBe('#AAAAAA');
    expect(layer.cells.get('4,8')?.color).not.toBe(committedColor);
  });

  it('redo replays captured color — kinase is NOT re-run', () => {
    const layer = makeLayer();
    let callCount = 0;
    // Impure kinase stub: increments counter each call
    const impureKinase = {
      valid: true, reason: null, threshold: undefined, sdfDescriptor: VALID_SDF,
      call: ({ sdfValue }) => {
        callCount++;
        return { color: '#FF0000', confidence: 0.9 };
      },
    };
    const stack = createCommandStack();
    stack.execute(createPhosphorylationCommand(layer, 4, 8, impureKinase));
    expect(callCount).toBe(1);
    stack.undo();
    stack.redo();
    // Redo must NOT re-run the kinase — callCount stays at 1
    expect(callCount).toBe(1);
    expect(layer.cells.get('4,8')?.color).toBe('#FF0000');
  });
});
```

- [ ] **Step 2: Run tests, confirm new tests fail**

```bash
npx vitest run tests/core/pixelbrain/qbit-phosphorylation.test.js
```

Expected: the 4 new `PhosphorylationCommand` tests fail with `PhosphorylationCommand is not exported`.

- [ ] **Step 3: Add `PhosphorylationCommand` to `editor-command-stack.js`**

Add the import at the **top** of `codex/core/pixelbrain/editor-command-stack.js` with the existing imports:

```js
import { phosphorylate } from './qbit-phosphorylation.js';
```

Then append the class and factory to the **bottom** of the file:

```js
import { phosphorylate } from './qbit-phosphorylation.js';

export class PhosphorylationCommand extends Command {
  constructor(layer, x, y, kinase, previousColor = null) {
    let resolvedColor = null;

    super({
      doFn: () => {
        if (resolvedColor !== null) {
          // redo: replay stored color, never re-run kinase
          setCell(layer, x, y, resolvedColor);
          return { committed: true, color: resolvedColor };
        }
        const result = phosphorylate(layer, x, y, kinase);
        if (result.committed) resolvedColor = result.color;
        return result;
      },
      undoFn: () => {
        if (previousColor === null) {
          clearCell(layer, x, y);
        } else {
          setCell(layer, x, y, previousColor);
        }
        return { x, y, color: previousColor };
      },
      description: `Phosphorylate (${x},${y})`,
      meta: { type: 'phosphorylation', x, y },
    });

    this._kinase = kinase;
    this._layer = layer;
    this._x = x;
    this._y = y;
  }
}

export function createPhosphorylationCommand(layer, x, y, kinase, previousColor = null) {
  return new PhosphorylationCommand(layer, x, y, kinase, previousColor);
}
```

Also update the `execute` method of `createCommandStack` to skip history push for rejected phosphorylation. Replace the existing `execute`:

```js
execute(cmd) {
  if (!(cmd instanceof Command)) {
    throw new Error('Must execute a Command instance');
  }
  truncateRedo();
  const result = cmd.execute();
  // PhosphorylationCommand reports rejection via result.committed === false
  // Rejected commands leave no undo footprint
  if (result && result.committed === false) {
    return { result, description: cmd.description, meta: cmd.meta, rejected: true };
  }
  history.push(cmd);
  pointer = history.length - 1;
  return { result, description: cmd.description, meta: cmd.meta };
},
```

- [ ] **Step 4: Run all tests, confirm they pass**

```bash
npx vitest run tests/core/pixelbrain/qbit-phosphorylation.test.js
```

Expected: all 14 tests pass.

- [ ] **Step 5: Run the existing command stack tests to confirm no regression**

```bash
npx vitest run tests/core/pixelbrain/
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add codex/core/pixelbrain/editor-command-stack.js tests/core/pixelbrain/qbit-phosphorylation.test.js
git commit -m "feat(pixelbrain): PhosphorylationCommand with redo-safe color replay"
```

---

## Task 3: JIT piece sprite cache — `qbit-sprite-cache.js`

**Files:**
- Create: `codex/core/pixelbrain/qbit-sprite-cache.js`
- Create: `tests/core/pixelbrain/qbit-sprite-cache.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/core/pixelbrain/qbit-sprite-cache.test.js`:

```js
import { describe, it, expect, vi } from 'vitest';
import { createSpriteCache } from '../../../codex/core/pixelbrain/qbit-sprite-cache.js';

describe('createSpriteCache', () => {
  it('calls fill on cache miss and returns sprite', async () => {
    const cache = createSpriteCache();
    const fill = vi.fn().mockResolvedValue({ pixels: new Uint8ClampedArray(4) });
    const sprite = await cache.get('torso', 'iron', fill);
    expect(fill).toHaveBeenCalledOnce();
    expect(sprite).toBeDefined();
  });

  it('returns cached sprite on second get without calling fill', async () => {
    const cache = createSpriteCache();
    const fill = vi.fn().mockResolvedValue({ pixels: new Uint8ClampedArray(4) });
    await cache.get('torso', 'iron', fill);
    await cache.get('torso', 'iron', fill);
    expect(fill).toHaveBeenCalledOnce();
  });

  it('invalidates only the swapped piece on equipment swap', async () => {
    const cache = createSpriteCache();
    const fill = vi.fn().mockResolvedValue({ pixels: new Uint8ClampedArray(4) });
    await cache.get('torso', 'iron', fill);
    await cache.get('pauldrons', 'iron', fill);
    cache.invalidatePiece('torso');
    await cache.get('torso', 'iron', fill);
    await cache.get('pauldrons', 'iron', fill);
    // torso re-filled, pauldrons still cached
    expect(fill).toHaveBeenCalledTimes(3);
  });

  it('different material = different cache entry', async () => {
    const cache = createSpriteCache();
    const fill = vi.fn().mockResolvedValue({ pixels: new Uint8ClampedArray(4) });
    await cache.get('torso', 'iron', fill);
    await cache.get('torso', 'gold', fill);
    expect(fill).toHaveBeenCalledTimes(2);
  });

  it('clear removes all entries', async () => {
    const cache = createSpriteCache();
    const fill = vi.fn().mockResolvedValue({ pixels: new Uint8ClampedArray(4) });
    await cache.get('torso', 'iron', fill);
    cache.clear();
    await cache.get('torso', 'iron', fill);
    expect(fill).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run tests, confirm all fail**

```bash
npx vitest run tests/core/pixelbrain/qbit-sprite-cache.test.js
```

Expected: fail with `Cannot find module`.

- [ ] **Step 3: Implement `qbit-sprite-cache.js`**

Create `codex/core/pixelbrain/qbit-sprite-cache.js`:

```js
/**
 * JIT Piece Sprite Cache
 *
 * Cache key: `${pieceId}:${materialId}`
 * Equipment swap invalidates one piece entry. Everything else hits cache.
 * fill() is called at most once per (pieceId, materialId) pair until invalidated.
 */

export function createSpriteCache() {
  const store = new Map();

  function key(pieceId, materialId) {
    return `${pieceId}:${materialId}`;
  }

  return {
    /**
     * Get a cached sprite or fill it JIT.
     * @param {string} pieceId
     * @param {string} materialId
     * @param {() => Promise<Object>} fill - Called on cache miss, must return sprite
     */
    async get(pieceId, materialId, fill) {
      const k = key(pieceId, materialId);
      if (store.has(k)) return store.get(k);
      const sprite = await fill();
      store.set(k, sprite);
      return sprite;
    },

    /**
     * Invalidate all cached entries for a piece (equipment swap).
     * @param {string} pieceId
     */
    invalidatePiece(pieceId) {
      for (const k of store.keys()) {
        if (k.startsWith(`${pieceId}:`)) store.delete(k);
      }
    },

    /**
     * Wipe entire cache (scene reset, character reload).
     */
    clear() {
      store.clear();
    },
  };
}
```

- [ ] **Step 4: Run tests, confirm all pass**

```bash
npx vitest run tests/core/pixelbrain/qbit-sprite-cache.test.js
```

Expected: all 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add codex/core/pixelbrain/qbit-sprite-cache.js tests/core/pixelbrain/qbit-sprite-cache.test.js
git commit -m "feat(pixelbrain): JIT piece sprite cache with equipment-swap invalidation"
```

---

## Task 4: ActorForgeLab wiring

**Files:**
- Modify: `src/pages/internal/pixel-lotus/ActorForgeLab.tsx`

This task wires the interactive brush to `PhosphorylationCommand`. Read `ActorForgeLab.tsx` first to find the active brush stroke handler before making changes — the exact event name and handler location will vary. The pattern to apply:

**Where you currently see a `paintCell` or `PaintCommand` call on brush stroke:**

```tsx
// BEFORE
stack.execute(createPaintCommand(grid, layerIndex, x, y, activeBrushColor));

// AFTER — build kinase once per stroke start, reuse per cell
const kinase = buildKinase(activeMaterial, activePieceSDF);
// ...then per cell:
const prev = getCell(layer, x, y)?.color ?? null;
const cmd = createPhosphorylationCommand(layer, x, y, kinase, prev);
const result = stack.execute(cmd);
if (result.rejected) {
  notifyRejection(result.result.reason, x, y);
}
```

**Dampened rejection signals — add to ActorForgeLab state:**

```tsx
const strokeRejections = useRef<{ reason: string; count: number } | null>(null);

function notifyRejection(reason: string, x: number, y: number) {
  if (!strokeRejections.current) {
    // First rejection in this stroke — pulse the cell
    strokeRejections.current = { reason, count: 1 };
    triggerCellPulse(x, y, reason); // single visible glyph pulse
  } else if (strokeRejections.current.reason === reason) {
    strokeRejections.current.count++;
    // Same reason repeated — no additional pulse (dampened)
  } else {
    // Reason changed — allow one more pulse
    strokeRejections.current = { reason, count: 1 };
    triggerCellPulse(x, y, reason);
  }
}

function onStrokeEnd() {
  if (strokeRejections.current && strokeRejections.current.count > 0) {
    showStrokeSummary(strokeRejections.current); // summary at stroke end
  }
  strokeRejections.current = null;
}
```

`triggerCellPulse` and `showStrokeSummary` should use existing in-world UI patterns (glyph pulse, lattice flash) consistent with world-law design — no alert boxes.

- [ ] **Step 1: Read `ActorForgeLab.tsx` and locate the brush stroke paint handler**

```bash
grep -n "paintCell\|PaintCommand\|onMouseMove\|onPointerMove\|stroke\|brush" src/pages/internal/pixel-lotus/ActorForgeLab.tsx | head -30
```

- [ ] **Step 2: Add imports at the top of `ActorForgeLab.tsx`**

```tsx
import { buildKinase } from '../../../codex/core/pixelbrain/qbit-phosphorylation.js';
import { createPhosphorylationCommand } from '../../../codex/core/pixelbrain/editor-command-stack.js';
import { getCell } from '../../../codex/core/pixelbrain/template-grid-engine.js';
```

- [ ] **Step 3: Replace the paint handler with phosphorylation pattern (per step above)**

Apply the BEFORE → AFTER pattern found in Step 1. Add `strokeRejections` ref and `notifyRejection`/`onStrokeEnd` per the dampening pattern above.

- [ ] **Step 4: Run lint and typecheck**

```bash
npm run lint && npm run typecheck
```

Expected: 0 errors, 0 warnings.

- [ ] **Step 5: Commit**

```bash
git add src/pages/internal/pixel-lotus/ActorForgeLab.tsx
git commit -m "feat(actor-forge): wire brush stroke to PhosphorylationCommand with dampened rejection UI"
```

---

## Verification

```bash
# All new unit tests
npx vitest run tests/core/pixelbrain/qbit-phosphorylation.test.js tests/core/pixelbrain/qbit-sprite-cache.test.js

# Full suite — confirm no regressions
npm run test

# Type and lint gates
npm run typecheck && npm run lint
```

**Manual smoke test in ActorForgeLab:**
1. Open the app (`npm run dev`)
2. Navigate to ActorForgeLab
3. Select a piece with a valid material and SDF → paint strokes should commit normally
4. Select a piece with no material assigned → brush strokes should be silently rejected with a single glyph pulse, no history entry
5. Undo after valid strokes → cell restores to previous color
6. Redo → same color restored, not recalculated
