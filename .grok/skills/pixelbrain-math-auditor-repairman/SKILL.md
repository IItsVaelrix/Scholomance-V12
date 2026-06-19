---
name: pixelbrain-math-auditor-repairman
description: Use when auditing or repairing PixelBrain character body profile math — foot overlap, unenforced CHIBI_SILHOUETTE_GUARDS constants, arm outset drift, or profile-view leg collapse. Source of truth for the gap between declared invariants and executed geometry in character-body-profiles.js.
---

# PixelBrain Math Auditor & Repairman

## Overview

`CHIBI_SILHOUETTE_GUARDS` in `character-body-profiles.js` declares the structural contract for the Starbound Esper chibi silhouette. **Most guards are declared but never enforced** — the body generation functions compute geometry independently. This skill documents every known divergence, the exact math behind it, and how to repair each one.

**Canonical source file:** `codex/core/pixelbrain/character-body-profiles.js`

---

## The Guard Object vs Reality

```js
// Declared at line ~41
const CHIBI_SILHOUETTE_GUARDS = Object.freeze({
  maxShoulderWidthRatio: 0.72,   // ← partially honored (shoulderHalfW computed, not checked)
  maxArmOutsetPx: 2,             // ← satisfied by accident; not asserted
  maxHandOutsetPx: 1,            // ← no hand geometry exists to violate this
  minHeadDominanceRatio: 0.42,   // ← VIOLATED: actual ~0.29–0.33
  maxLegColumnHeightPx: 7,       // ← VIOLATED: actual 12px
  footSpacingPx: 1,              // ← VIOLATED: actual overlap of 3px
});
```

None of these values are read back inside any `bodyCells_*` function. They are a spec memo, not a contract.

---

## Known Violations

### V-1 · Foot Overlap (south + north)

**Guard:** `footSpacingPx = 1` — feet should have at least 1px gap between them  
**Files:** `bodyCells_south` (~line 146), `bodyCells_north` (~line 329)

**South math at ws=1:**
| Variable | Value | Formula |
|---|---|---|
| `legGap` | 2 | `round(2 * ws)` |
| `footHalfW` | 3 | `max(2, round(3 * ws))` |
| Left foot spans | x = cx−5 → cx+1 | center at `cx − 2` |
| Right foot spans | x = cx−1 → cx+5 | center at `cx + 2` |
| **Overlap zone** | **cx−1 → cx+1 (3px)** | footHalfW(3) > legGap(2) |

**Required for no overlap:** `footHalfW ≤ legGap − footSpacingPx` → `3 ≤ 2 − 1 = 1` ← FAILS

**Visual proof:** Golden SVG shoes are one continuous path `M 12,40 L 21,40 L 21,46 L 12,46` — a single 9px block, not two nubs.

**North has the same bug**, worse at ws=1.3: uses `round(3 * ws)` without the `max(2,...)` floor — footHalfW can reach 4, overlap increases.

---

### V-2 · Leg Column Height (south + north)

**Guard:** `maxLegColumnHeightPx = 7`  
**Actual:** `legBot(40) − legTop(28) = 12px` at default scale — 71% over cap

**Likely intent:** The 7px guard probably describes the *visible* leg below a standard clothing hem (~row 33), not total leg height. But this isn't documented and nothing enforces it. `legBot − legTop` is always 12 at ws=1.

---

### V-3 · Head Dominance Ratio (south + north)

**Guard:** `minHeadDominanceRatio = 0.42` — head height ≥ 42% of figure  
**Actual:** Head rows 2–16 = 14px; canvas 48px → 14/48 = **0.29**  
Even relative to figure height (rows 2–44 = 42px): 14/42 = **0.33** — still fails

The head IS visually dominant (it's wide relative to the narrow body), but the ratio as written measures height share, where it loses to the tall torso+legs.

---

### V-4 · East Profile — Legs Merge (no depth stagger)

**Location:** `bodyCells_east`, leg section (~line 234)

```js
const legCx = torsoCx; // same center for both legs
for (let y = legTop; y <= legBot; y += 1) {
  // dx loop centered on legCx — both legs render as one column
  cells.push({ x: legCx + dx, y });
}
```

**This is correct behavior for a profile view** — front leg overlaps back leg. But there is **zero depth stagger**: the back leg doesn't peek out behind the front, which would read as more dimensional. The current result is a solid merged leg column with no visual separation.

**If depth stagger is ever desired:**
```js
// Back leg: shift +1 to the rear (left in east = negative x side)
const backLegOffset = -1;
// Render back leg first, then front leg clips it
```

---

### V-5 · North Arm Position (landmark difference from south)

**South arms:** `ax = headCx ± shoulderHalfW ∓ armHalfW` — arms attach just inside the shoulder edge  
**North arms:** `ax = headCx ± shoulderHalfW` — arms center ON the shoulder edge  
**Width:** north arm loop uses `-1-bulge to +1+bulge` (narrower than south's `armHalfW`)

This means north arms are slightly more forward-set and 1px narrower than south. Clothing that anchors to arm position will see a 1px lateral shift switching directions. Not a bug per se — but an undocumented asymmetry.

---

## Audit Checklist

Run this whenever modifying body geometry or adding a new view direction:

- [ ] **Foot non-overlap** — verify `footHalfW ≤ legGap − footSpacingPx` for each view
- [ ] **Guards read-back** — does any new clamp/assert reference the guard constants, or are they still memos?
- [ ] **Scale escape** — confirm all dimension math uses `hs`/`ws` (clamped), not raw `heightScale`/`widthScale`
- [ ] **Anchor export** — new views must return anchor points matching what `character-construction-skeleton.js` consumes
- [ ] **North/south parity** — if fixing a bug in `bodyCells_south`, apply the same fix to `bodyCells_north` (they share identical foot/leg logic)
- [ ] **Golden SVG** — run `tests/core/pixelbrain/character-creator.test.js` and diff `golden/npc-void-illustrated.svg`; any geometry change breaks this

---

## Repair Patterns

### Pattern A — Fix foot overlap (preferred: clamp footHalfW)

```js
// In bodyCells_south and bodyCells_north, replace:
const footHalfW = Math.max(2, roundInt(3 * ws));

// With:
const maxFootHalfW = Math.max(1, legGap - CHIBI_SILHOUETTE_GUARDS.footSpacingPx);
const footHalfW = Math.min(maxFootHalfW, Math.max(1, roundInt(3 * ws)));
// At ws=1: min(1, max(1, 3)) = 1  →  feet are 3px wide, separated by 1px gap
// At ws=1.3: min(1, max(1, 4)) = 1  →  capped
```

**Side effect:** Feet become visually narrower (1px half-width = 3px total per foot). This is the correct chibi nub. The shoe layer painted on top can extend further.

### Pattern B — Clip approach (preserves widths, clips inner edge)

```js
const footSpacing = CHIBI_SILHOUETTE_GUARDS.footSpacingPx;
for (const side of [-1, 1]) {
  const fx = headCx + side * legGap;
  const innerClip = headCx + side * Math.ceil(footSpacing / 2);
  for (let y = footTop; y <= footBot; y += 1) {
    const hw = footHalfW + roundInt(1 * Math.sin(...));
    for (let dx = -hw; dx <= hw; dx += 1) {
      const gx = fx + dx;
      if (side === -1 && gx > innerClip) continue; // left foot: clip right edge
      if (side ===  1 && gx < innerClip) continue; // right foot: clip left edge
      cells.push({ x: gx, y });
    }
  }
}
```

### Pattern C — Promote a guard from memo to assertion

```js
// After generating cells, verify guard holds
function assertGuard(name, actual, cap, mode = 'max') {
  const violated = mode === 'max' ? actual > cap : actual < cap;
  if (violated) throw new Error(
    `bodyCells_south: guard ${name} violated — actual ${actual}, limit ${cap}`
  );
}

// Example:
assertGuard('maxLegColumnHeightPx', legBot - legTop, CHIBI_SILHOUETTE_GUARDS.maxLegColumnHeightPx);
```

Use in dev/test mode only; wrap in `if (process.env.NODE_ENV !== 'production')` for the renderer.

---

## What's Actually Correct

Not everything that looks wrong is wrong:

| Observation | Status |
|---|---|
| East profile legs = one merged column | **Correct** — profile view occludes back leg |
| East only one arm rendered | **Correct** — front arm only in profile |
| North arms narrower than south arms | **Undocumented asymmetry**, not a bug |
| Arms barely extend past torso | **Intentional** — maxArmOutsetPx:2 is satisfied (arm math produces ≤2px outset at default scale) |
| Head wider than torso | **By design** — head dominance is visual width dominance, not height ratio |
