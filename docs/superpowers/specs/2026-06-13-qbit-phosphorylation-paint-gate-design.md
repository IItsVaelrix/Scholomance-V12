# QBIT Phosphorylation — Interactive Paint Gate

**Date:** 2026-06-13  
**Status:** Approved

---

## Problem

`paintCell(lattice, col, row, color)` accepts the color as a caller-supplied argument. The cell trusts the caller. Any error in the call site — wrong material lookup, bad SDF sample, wrong layer — silently writes incorrect data into the lattice. The error is invisible until render time.

---

## Core Insight

If the color is not an argument but the *output* of a pure calculation, there is no argument to get wrong. The cell cannot receive a bad color because no color is passed in — the kinase function derives it from the cell's own substrate context.

**Molecular reaction model:**

```
QBIT substrate (col, row, sdfValue, normal)
  + kinase closure (material pre-bound)
  → { color, confidence }
```

- **SDF value** at cell position — tells the kinase where in the shape the cell lives (rim, mid, core)
- **Material spec** (pre-bound in the kinase closure by the caller) — tells the kinase how to respond to that position
- **Normal vector** from the lattice cell — resolves directional shading

The caller provides only the kinase. The color emerges from the reaction.

---

## Architecture

### New module: `codex/core/pixelbrain/qbit-phosphorylation.js`

**Primary function:**

```js
phosphorylate(lattice, col, row, kinase, options)
  → { committed: boolean, color?: string, confidence: number, reason?: string }
```

The kinase is a **`KinaseDescriptor` object** constructed by `buildKinase(material, sdfContext)` at material-selection time. This is not a bare function — it carries metadata that `phosphorylate()` needs without receiving `material` directly.

```js
// KinaseDescriptor shape
{
  valid: boolean,          // false if material was null/missing at build time
  reason: string | null,   // 'MISSING_SUBSTRATE' if !valid, else null
  threshold: number | undefined, // material.phosphorylationThreshold if defined
  call: ({ sdfValue, normal }) => ({ color, confidence }) // null if !valid
}
```

`buildKinase(material, sdfContext)` is a first-class module export from `qbit-phosphorylation.js`. It validates the material at construction time and returns a null descriptor if material is missing — so the gate never needs to inspect material itself.

**Gate logic (in order):**

1. If `!kinase.valid` → `{ committed: false, reason: kinase.reason }`
2. Sample SDF at `(col, row)` via `sdfEvaluator` — if missing → `{ committed: false, reason: 'MISSING_SUBSTRATE' }`
3. Read normal from the lattice cell via `normal-estimation.js` — if degenerate or missing → `{ committed: false, reason: 'MISSING_SUBSTRATE' }`
4. Call `kinase.call({ sdfValue, normal })` — if it throws or returns an invalid color → `{ committed: false, reason: 'INVALID_REACTION' }`
5. Resolve threshold: `options.threshold ?? kinase.threshold ?? COLLAPSE_THRESHOLD` — if `confidence < threshold` → `{ committed: false, reason: 'LOW_CONFIDENCE', confidence }`
6. If valid → call `paintCell(lattice, col, row, color)` internally, return `{ committed: true, color, confidence }`

`paintCell` remains the low-level primitive. Phosphorylation is the only path the interactive editor uses for user-driven strokes.

`COLLAPSE_THRESHOLD` is an exported constant, default `0.5`.

---

### `editor-command-stack.js` — `PhosphorylationCommand`

Sibling to `PaintCommand`. Wraps `phosphorylate()` instead of `setCell()` directly.

**Critical: redo must not re-run the kinase.** The resolved color is captured on first `doFn` execution and replayed on redo. If the kinase is nondeterministic, redo would drift. The command does not allow kinase re-execution after the first commit.

```js
class PhosphorylationCommand extends Command {
  constructor(lattice, col, row, kinase, previousColor) {
    let resolvedColor = null; // captured once on first execute

    super({
      doFn: () => {
        if (resolvedColor !== null) {
          // redo path: replay stored color, never re-run kinase
          paintCell(lattice, col, row, resolvedColor);
          return { committed: true, color: resolvedColor };
        }
        const result = phosphorylate(lattice, col, row, kinase);
        if (result.committed) resolvedColor = result.color;
        return result;
      },
      undoFn: () => {
        // dephosphorylate: restore prior cell state
        if (previousColor === null) clearCell(lattice, col, row);
        else paintCell(lattice, col, row, previousColor);
        return { col, row, color: previousColor };
      },
      description: `Phosphorylate (${col},${row})`,
      meta: { type: 'phosphorylation', col, row }
    });
  }
}
```

If phosphorylation returns `committed: false`, the command is **not pushed to the history stack** — a rejected stroke leaves no undo footprint.

---

### Kinase Purity Contract

The kinase **must be a pure function**. Impure kinases break redo determinism.

**Forbidden inside a kinase:**
- `Math.random()`
- `Date.now()` / `performance.now()`
- External mutable brush state reads
- Side effects of any kind

If kinase purity cannot be guaranteed statically, the `PhosphorylationCommand` stores the resolved color on first execution and replays it on redo regardless — this is the fallback correctness guarantee. But the purity contract should be documented and enforced by convention.

---

### ActorForgeLab wiring

The brush tool constructs a kinase closure from the currently active material + SDF context at stroke-start and passes it to `PhosphorylationCommand` on each stroke event. The kinase closure is built once per stroke, not per cell.

**UI feedback — dampened rejection signals:**

Failed phosphorylations must not spam the UI during drag strokes.

| Rejection event | Signal |
|-----------------|--------|
| First rejection in a stroke | Visible glyph pulse on the cell |
| Repeated same reason during same stroke | Dampened — no additional pulse |
| Stroke end with any rejections | Single summary signal (reason + count) |

No alert boxes. No per-cell flicker. Aggregation window = one stroke gesture.

---

## QA Checklist

Tests live in `tests/core/pixelbrain/qbit-phosphorylation.test.js`.

| Test | Expected |
|------|----------|
| Valid SDF, material, normal, confidence ≥ threshold | Commits and calls `paintCell` |
| Missing SDF | Rejects with `MISSING_SUBSTRATE` |
| `buildKinase(null, ctx)` → descriptor passed to phosphorylate | Rejects with `MISSING_SUBSTRATE` via `kinase.valid === false` |
| Missing or degenerate normal | Rejects with `MISSING_SUBSTRATE` |
| Confidence below threshold | Rejects with `LOW_CONFIDENCE` |
| Kinase throws | Rejects with `INVALID_REACTION` |
| Kinase returns invalid color | Rejects with `INVALID_REACTION` |
| Rejected phosphorylation command | Does not push to history stack |
| Undo after valid phosphorylation | Restores previous color |
| Redo after undo | Replays captured resolved color — kinase is NOT re-run |

The redo test is the most important: confirm the stored color is replayed verbatim, not recalculated. Pass a nondeterministic kinase stub (increments a counter per call) and verify redo does not increment the counter.

---

## Correctness Guarantee

The gate is structural, not procedural. There is no code path through the interactive editor that can write a color to a lattice cell without the kinase validation. Wrong material → rejected at stroke time. SDF out of bounds → rejected at stroke time. Degenerate normal → rejected at stroke time. The error cannot reach the lattice.

---

## What Does Not Change

- `paintCell` in `lattice-grid-engine.js` — unchanged, remains the low-level primitive
- `PaintCommand` — unchanged, still valid for programmatic/foundry use where color is already known
- `lattice-grid-engine.js` cell data shape — no new fields required on the cell itself
- SDF evaluator, material registry, normal estimation — consumed, not modified

---

## Files Affected

| File | Change |
|------|--------|
| `codex/core/pixelbrain/qbit-phosphorylation.js` | **New** — `phosphorylate()`, `buildKinase()`, `COLLAPSE_THRESHOLD`, threshold resolution |
| `codex/core/pixelbrain/editor-command-stack.js` | **Add** `PhosphorylationCommand` + `createPhosphorylationCommand` factory |
| `src/pages/internal/pixel-lotus/ActorForgeLab.tsx` | **Wire** brush stroke to `PhosphorylationCommand`, dampened rejection UI |
| `tests/core/pixelbrain/qbit-phosphorylation.test.js` | **New** — all 10 QA checklist cases |

---

## JIT Sprite Creation

Phosphorylation at the cell level scales directly to JIT sprite creation at the piece level.

The PixelBrain lattice already models the character as discrete pieces (chestplate, pauldrons, hair, clothing, etc.) assembled into a whole. Each piece has its own SDF context and material. This means piece sprites can be phosphorylated independently and composited into the full character.

**Cache model:**

- Cache key per piece: `${pieceId}:${materialId}` — deterministic because phosphorylation is deterministic
- On first render: phosphorylate all pieces, cache each piece sprite
- On equipment swap: invalidate only the swapped piece's cache entry, re-phosphorylate that region only, recomposite
- Everything else hits cache — no recompilation of unchanged pieces

**Why this works without coordination overhead:** the lattice already knows piece boundaries from the character construction skeleton. The JIT pass doesn't need to discover regions — it phosphorylates what the piece spec defines. The compositor assembles cached piece sprites into the full character sprite exactly as before.

**First-render latency:** acceptable because phosphorylation is deterministic and per-piece parallelizable. Each piece can be phosphorylated independently. Composite only after all pieces resolve.

**Cache invalidation is equipment-swap only.** Material changes on the same piece (e.g., worn/damaged state) extend the key: `${pieceId}:${materialId}:${stateId}` if needed. SDF context does not change on equipment swap — only material changes.

---

## Out of Scope

- Cascade phosphorylation (pulse radius spreading to adjacent cells) — future
- Replacing `PaintCommand` for programmatic use — not needed, phosphorylation is an interactive-editor concern
- Static kinase purity enforcement (linting) — future
- Parallel per-piece phosphorylation workers — future (current: sequential per piece)
