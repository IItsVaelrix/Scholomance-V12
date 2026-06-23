# BUG-2026-06-20-TRUESIGHT-LATTICE-METRIC-DRIFT

## Bytecode Search Code
`SCHOL-ENC-BYKE-SEARCH-LING-0F08`

## Bug Description
The Truesight overlay positions every clickable word box from a canvas
`measureText()` taken at the wrapper's **base** font (`adaptiveWhitespaceGrid`).
CSS rarity signifiers `.vb-rarity--rare` / `.vb-rarity--inexplicable` styled the
painted word with `font-weight` + `letter-spacing`, which changes the rendered
glyph **advance**. The painted word then no longer fit its measured box: the
annotation lattice desynced — only part of a rare word stayed clickable, and
every word after it on the line drifted out of its hit box.

Because vector/adaptive immunity reads code phonosemantics and cannot see CSS,
nothing guarded against this class of regression — any future stylesheet edit
could silently reintroduce advance drift on a measured overlay-word class.

## Root Cause
Two layers:

1. **The CSS defect.** Advance-changing metric properties (`font-weight`,
   `letter-spacing`) were applied to the *measured* `.vb-rarity--*` word classes.
   Rarity should be signified by **glow only** (`text-shadow`), which does not
   move glyphs.

2. **No deterministic guard.** There was no immunity rule pinning "no
   advance-metric properties on measured overlay-word selectors," so the fix
   was not regression-proof.

## Thought Process
1. **First observation:** The bug-report file shipped empty; the live state of
   the fix lived in the working tree — a new immunity rule `LING-0F08` plus the
   CSS rarity refactor (`font-weight`/`letter-spacing` → `text-shadow` glow).

2. **Investigation path:**
   - Ran the innate scanner against the *fixed* `IDE.css`. It still reported
     **one** `LING-0F08` violation — the rule fired on the very file it protects.
   - Traced it to
     `.truesight-line span:not(.truesight-word):not(.grimoire-word)… { font-size: 0.85em }`
     (and a sibling at the read-only variant). These target the de-emphasized
     **non-word filler** spans — explicitly *excluded* from the measured lattice.
   - The detector's `OVERLAY_WORD_SELECTOR` regex matched the `.truesight-word`
     substring **inside** the `:not()` negation, so a selector that *excludes*
     the measured word was treated as if it *targeted* it. False positive.

3. **Dead ends avoided:** The filler `font-size` is correct CSS, not a bug —
   "fixing" the stylesheet would have been wrong. The defect was in the rule.

4. **Breakthrough:** A selector references a measured word *positively* only if a
   word class survives removal of its `:not(...)` negation groups.

5. **Solution derived:** Strip `:not(...)` groups from the selector before
   testing `OVERLAY_WORD_SELECTOR`; register the rule's `repairKey`; lock the
   behavior with stasis tests.

## Changes Made

| File | Change | Rationale |
|------|--------|-----------|
| `src/pages/Read/IDE.css` | `.vb-rarity--rare` / `--inexplicable`: `font-weight`+`letter-spacing` → `text-shadow` glow | Remove the actual advance drift; rarity = glow, not metrics |
| `codex/core/immunity/innate.rules.js` | New rule `LING-0F08` + `detectOverlayMetricDrift()` | Deterministic CSS antigen for advance-metric drift on measured overlay words |
| `codex/core/immunity/innate.rules.js` | Strip `:not(...)` before `OVERLAY_WORD_SELECTOR` test | Fix false positive on `:not(.truesight-word)` non-word filler selectors |
| `codex/core/immunity/repair.recommendations.js` | Register `repair.overlay-metrics.inherit` | Rule referenced an unregistered repairKey (fell back to the unknown stub) |
| `scripts/immunity-pre-commit.js` | Scan `.css` files; skip adaptive (code-only) scan for CSS | The new rule is CSS-only and must run in pre-commit |
| `tests/qa/immunity.stasis.test.js` | 7 `LING-0F08` cases | positive, glow-negative, `:not()` filler guard, word-qualified-by-`:not()`, escape hatch, CSS-only, repair registered |

## Testing
1. `node tests/qa/immunity.stasis.test.js` — full gauntlet green, including all 7
   new `LING-0F08` cases.
2. Scanned all 64 tracked `*.css` files — **0** `LING-0F08` violations.
3. Verified empirically: the old `font-weight: 600; letter-spacing: 0.01em` on
   `.vb-rarity--rare` is caught; the glow-only replacement passes; the
   `:not(.truesight-word)` filler passes; a word qualified by `:not()` is still
   caught; the `IMMUNE_ALLOW: overlay-metrics` escape hatch suppresses; non-CSS
   files are ignored.

## Lessons Learned
1. **Run the gate against its own protected file.** The rule and the CSS fix
   shipped together, but the detector was never run across the whole stylesheet —
   so a false positive on the file it guards went unnoticed. A guard that flags
   its own clean target is not finished.

2. **`:not()` is exclusion, not targeting.** Substring-matching a selector for a
   class name treats `:not(.x)` as if it targeted `.x`. Negation groups must be
   stripped before deciding what a selector positively matches.

3. **A `repairKey` is a contract.** Referencing an unregistered key silently
   degrades to an "unknown repair" stub; every rule's repair belongs in
   `repair.recommendations.js`.

4. **CSS is invisible to adaptive immunity.** Layout/metric invariants that live
   in stylesheets need a deterministic innate rule — the vector layer reads code
   phonosemantics, not paint.

---

*Entry Status: RESOLVED | Rule: LING-0F08 | Last Updated: 2026-06-20*
