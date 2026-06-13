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
QBIT substrate (col, row, sdfValue, material, normal)
  + kinase function
  → { color, confidence }
```

- **SDF value** at cell position — tells the kinase where in the shape the cell lives (rim, mid, core)
- **Material spec** (pre-bound in the kinase closure by the caller) — tells the kinase how to respond to that position
- **Normal vector** from the lattice cell — resolves directional shading

All three inputs are derivable from the cell's own position and the active material context. The caller provides only the kinase. The color emerges from the reaction.

---

## Architecture

### New module: `codex/core/pixelbrain/qbit-phosphorylation.js`

**Primary function:**

```js
phosphorylate(lattice, col, row, kinase, options)
  → { committed: boolean, color?: string, confidence: number, reason?: string }
```

The kinase is a **closure** constructed by the caller (ActorForgeLab) with the active material already bound. Its signature is:

```js
kinase({ sdfValue, normal }) → { color, confidence }
```

The material is pre-baked into the kinase — not looked up per-cell. This keeps the gate logic pure: it only derives position-dependent inputs from the lattice.

**Gate logic (in order):**

1. Sample SDF at `(col, row)` via `sdfEvaluator` — if missing → `{ committed: false, reason: 'MISSING_SDF' }`
2. Read normal from the lattice cell via `normal-estimation.js` — if degenerate → `{ committed: false, reason: 'DEGENERATE_NORMAL' }`
3. Call `kinase({ sdfValue, normal })`
4. If `confidence < COLLAPSE_THRESHOLD` → `{ committed: false, reason: 'LOW_CONFIDENCE', confidence }`
5. If valid → call `paintCell(lattice, col, row, color)` internally, return `{ committed: true, color, confidence }`

`paintCell` remains the low-level primitive. Phosphorylation is the only path the interactive editor uses for user-driven strokes.

**`COLLAPSE_THRESHOLD`:** exported constant, default `0.5`. Allows per-material override.

### `editor-command-stack.js` — `PhosphorylationCommand`

Sibling to `PaintCommand`. Wraps `phosphorylate()` instead of `setCell()` directly.

```js
class PhosphorylationCommand extends Command {
  constructor(lattice, col, row, kinase, previousColor)
  // doFn: calls phosphorylate(), stores resolved color
  // undoFn: restores previousColor (dephosphorylate = restore prior state)
}
```

Undo/redo is identical to `PaintCommand` — the resolved color is captured on first execution and restored on undo.

If phosphorylation returns `committed: false`, the command does not push to the history stack — a rejected stroke leaves no undo footprint.

### ActorForgeLab wiring

The brush tool constructs a kinase closure from the currently active material + SDF context and passes it to `PhosphorylationCommand` on each stroke event.

Failed phosphorylations surface immediately in the UI: the cell stays unpainted, the `reason` is shown as an in-world signal (not an alert box — a glyph pulse or brief lattice cell flash consistent with world-law design).

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
| `codex/core/pixelbrain/qbit-phosphorylation.js` | **New** — core phosphorylation function + `COLLAPSE_THRESHOLD` |
| `codex/core/pixelbrain/editor-command-stack.js` | **Add** `PhosphorylationCommand` class + `createPhosphorylationCommand` factory |
| `src/pages/internal/pixel-lotus/ActorForgeLab.tsx` | **Wire** brush stroke to `PhosphorylationCommand` with active kinase |
| `tests/core/pixelbrain/qbit-phosphorylation.test.js` | **New** — unit tests for gate logic, confidence threshold, missing substrate |

---

## Out of Scope

- Cascade phosphorylation (pulse radius spreading to adjacent cells) — future
- Foundry pipeline batch phosphorylation — future  
- Replacing `PaintCommand` for programmatic use — not needed, phosphorylation is an interactive-editor concern
