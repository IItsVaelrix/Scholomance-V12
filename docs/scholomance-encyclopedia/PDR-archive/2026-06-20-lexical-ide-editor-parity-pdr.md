# PDR: Lexical IDE Editor Parity

## Migrating the Scribe ScrollEditor from Absolute Overlay to Native Contenteditable

## Bytecode Search Code
`SCHOL-ENC-BYKE-SEARCH-LEXICAL-IDE-EDITOR-PARITY-PDR`

**Status:** Proposed
**Classification:** Architectural | Read/Scribe IDE | Editor Substrate | TrueSight
**Priority:** High
**Primary Goal:** Bring the new Lexical-based `LexicalScrollEditor` to full functional parity with the archived textarea+overlay `ScrollEditor`, eliminating the absolute-overlay bug class while restoring every feature ReadPage depends on.

---

# 1. Executive Summary

The Scribe editor has been re-platformed from a `<textarea>` + absolutely-positioned annotation overlay onto Meta's **Lexical** contenteditable framework. In the new model each word is a `TruesightWordNode` (a `TextNode` subclass) colored inline — the rendered word *is* the text, so there is no second layer to keep aligned.

This structurally eliminates the entire bug class the previous architecture suffered: overlay-vs-textarea measurement drift, the bold/viseme "text morph" misalignment, hit-boxes drifting off glyphs, and `#NaN` colors poisoning annotation boxes. (See companion findings: BUG-2026-06-20-TRUESIGHT-LATTICE-METRIC-DRIFT, PB-ERR-v1-TRUESIGHT-CHROMA-BLEED.)

The scaffold is in place and renders, but most features ReadPage passes are stubbed or unimplemented. This PDR defines the parity contract and the three-wave plan to make every bell and whistle functional.

---

# 2. Problem Statement

`ReadPage.jsx` mounts the editor with ~35 props (the full IDE feature contract). The current `LexicalScrollEditor` consumes ~10 and stubs the rest. Concretely:

- **Saving is broken.** `onSave` is consumed only by the archived editor; the Lexical `save()` ref method is a `console.log` no-op and there is no Ctrl+S binding. Work cannot be persisted from inside the editor.
- **IntelliSense never inserts.** Accept clears the dropdown but does not write the completion into the document.
- **Cursor reporting is dead.** `onCursorChange` is never called; `cursorCoords.lineIndex` is never set, so the status bar Ln/Col and the Gutter current-line indicator are frozen at 1.
- **`jumpToLine()` and `replaceContent()` are no-ops**, breaking Search/rhyme "jump to line" and word transmute/suggestion replacement.
- **Missing entirely:** spellcheck + misspelling orbs, rhyme `highlightedLines`, `pinnedLines`/ghost lines, `onFocus/onBlur` → EDIT-mode transition, `mirrored`, `isLatticeGrid`, bytecode/viseme glow visuals (flat color only), title editing, and charStart/identity-based analysis (current lookup is fuzzy text-match, so repeated words share one analysis).

---

# 3. Product Goal

Make `LexicalScrollEditor` a drop-in replacement for the archived `ScrollEditor` against ReadPage's existing prop contract, such that every feature that worked before works again — with equal or better fidelity — on the new substrate.

---

# 4. Non-Goals

- Do not reintroduce the absolutely-positioned `.word-background-layer` overlay or the canvas `buildTruesightOverlayLines` geometry engine. The overlay is intentionally retired.
- Do not change ReadPage's prop contract or the persistence/`saveScroll` flow.
- Do not alter the TrueSight color authority (`wordTruesight`) or the VerseIR chroma engine beyond the already-applied NaN guards.
- Do not add new editor features beyond archived-parity in this effort (rich text, tables, collaborative cursors, etc.).
- Do not delete the `Archive/` copies until parity is verified and accepted.

---

# 5. Core Design Principles

1. **The word is the text.** Coloring/annotation happens on the `TruesightWordNode` itself; never a shadow layer. Alignment is impossible to lose.
2. **Lexical state is the source of truth.** Cursor, content, and selection derive from the editor state, not DOM measurement.
3. **Determinism via position.** Analysis is keyed by `charStart`/identity, not by word text, so repeated words resolve to their own per-position analysis.
4. **Parity, not redesign.** Each restored feature maps to a named archived behavior and the ReadPage prop that drives it.
5. **Guarded color.** All color flows through the NaN-total pipeline; the editor never renders an invalid color.
6. **Verified by the immune system.** Restored features are proven by the existing chromatic/geometric probes plus new parity tests, not by assertion.

---

# 6. Feature Overview — Parity Matrix

| Feature | ReadPage prop | Archived behavior | Current state | Wave |
|---|---|---|---|---|
| Save (Ctrl+S + button) | `onSave`, ref `save()` | `onSave(title, content)` | no-op log | 1 |
| IntelliSense accept | `getCompletions` | inserts completion | clears only | 1 |
| Cursor → status/Gutter | `onCursorChange` | `(line, col)` | never called | 1 |
| Jump to line | ref `jumpToLine()` | scroll + caret to line | no-op | 1 |
| Replace content / transmute | ref `replaceContent()` | splice word | empty | 1 |
| Analysis by position | `analyzedWordsByCharStart/Identity` | charStart lookup | fuzzy text-match | 2 |
| Spellcheck + orbs | `checkSpelling`, `getSpellingSuggestions` | red orbs + suggestions | unimplemented | 2 |
| Rhyme line highlight | `highlightedLines` | line tint | unimplemented | 2 |
| Pinned / ghost lines | `pinnedLines` | floating ghost lines | unimplemented | 2 |
| Bytecode/viseme glow | (from analysis) | `decodeBytecode` style | flat color (`decodedStyle=null`) | 3 |
| Lattice grid | `isLatticeGrid` | grid annotation boxes | unimplemented | 3 |
| Mirror mode | `mirrored` | mirrored layout | unimplemented | 3 |
| Focus → EDIT mode | `onFocus`, `onBlur` | ideMode transition | not wired | 3 |
| Title editing | `title`, `onTitleChange` | title field | not wired | 3 |

---

# 7. Architecture

```
ReadPage.jsx
  -> LexicalScrollEditor (forwardRef API bridge: save/jumpToLine/replaceContent/scrollTo)
       LexicalComposer
         ExternalContentSyncPlugin   (programmatic load only; no caret reset on type)
         PlainTextPlugin + ContentEditable
         TruesightPlugin             (TextNode transform -> TruesightWordNode, inline color)
         WordClickPlugin             (CLICK_COMMAND -> onWordActivate w/ anchorRect)
         CursorAndIntelliSensePlugin (selection -> line/col + prefix; key nav)
         SavePlugin            [NEW] (Ctrl+S -> onSave(title, content))
         SpellcheckPlugin      [NEW] (checkSpelling -> __isMisspelled + orb decoration)
         LineDecorationPlugin  [NEW] (highlightedLines / pinnedLines -> paragraph classes)
         OnChangePlugin + HistoryPlugin
       Gutter / IntelliSense / WordTooltip (rendered by parent)
```

Key shift: line/word geometry comes from Lexical node keys and `getSelection()`/DOM Range, never from re-simulated canvas measurement.

---

# 8. Module Breakdown

- `LexicalScrollEditor.jsx` — composition root + ref bridge. Owns content/title state, IntelliSense state, and the imperative API. **Real implementations replace the stubs.**
- `TruesightNode.js` — `TruesightWordNode`. Already supports `__color`, `__truesightClass`, `__decodedStyle`, `__isMisspelled`, `__tokenData`. Wave 2/3 populate `decodedStyle` and `isMisspelled`.
- `TruesightPlugin.jsx` — TextNode→word transform. Wave 2 switches analysis lookup from text-match to `analyzedWordsByCharStart`/identity and feeds `decodedStyle` from `decodeBytecode`.
- `CursorAndIntelliSensePlugin.jsx` — emit `{ line, col, x, y }` (currently only x/y); drive `onCursorChange`.
- **New plugins:** `SavePlugin`, `SpellcheckPlugin`, `LineDecorationPlugin`, focus/blur listener.

---

# 9. Implementation Phases

## Phase / Wave 1 — Core Correctness (no data loss, working loop)
1. **Save:** add a `KEY_MODIFIER_COMMAND`/`Ctrl+S` listener and wire ref `save()` → `onSave(currentTitle, currentContent)`; ensure header Save + Ctrl+S both persist.
2. **Cursor:** `CursorAndIntelliSensePlugin` computes `line`/`col` from text-before-cursor and calls `onCursorChange({ line, col })`; set `cursorCoords.lineIndex` so the Gutter current-line tracks.
3. **IntelliSense accept:** insert the accepted completion at the caret via `editor.update()` (replace the active prefix), then clear.
4. **`jumpToLine()`:** move selection to the line start and `scrollIntoView`.
5. **`replaceContent()`:** implement word/range replacement via `editor.update()` for transmute + suggestion replace.

## Phase / Wave 2 — Analysis Fidelity
6. Switch `TruesightPlugin` analysis lookup to `analyzedWordsByCharStart` (compute running charStart in the transform), falling back to identity, then text.
7. **Spellcheck:** run `checkSpelling` over content; mark `TruesightWordNode.__isMisspelled`; render the orb + wire `getSpellingSuggestions` into WordTooltip.
8. **Rhyme highlight / pinned lines:** `LineDecorationPlugin` adds paragraph classes from `highlightedLines`/`pinnedLines`.

## Phase / Wave 3 — Visual Richness
9. Feed `decodedStyle` from `decodeBytecode` into `TruesightWordNode` for glow/viseme (NaN-guarded).
10. `isLatticeGrid`, `mirrored` body classes; `onFocus/onBlur` → ideMode EDIT transition; title editing via `onTitleChange`.

---

# 10. QA Requirements

- **Existing instruments reused:** the chromatic immune probe (`chromaticImmuneProbe`) and geometric probe (`truesightImmuneProbe`) must stay green against the Lexical DOM; the cross-mode advance test must show ≤0.5px (no morph) since there is no second layer.
- **New parity tests (Playwright, real Chromium):**
  - Save: type → Ctrl+S → assert `onSave` fired with current title+content.
  - Cursor: move caret → assert reported `line/col` and Gutter current-line.
  - IntelliSense: accept → assert completion text present in document.
  - jumpToLine/replaceContent: assert caret position / spliced text.
  - Spellcheck: known-misspelled word → assert `truesight-word--misspelled` + orb.
- **Regression:** the existing Read visual + QA suites must not regress beyond the known pre-existing failures.

---

# 11. Success Criteria

1. Every row in the Parity Matrix reaches "functional," verified by a test or a real-browser check.
2. No save path silently drops content; Ctrl+S and the header button both persist title+content.
3. Cursor line/col and Gutter current-line track the caret.
4. Immune probes (chromatic + geometric) and the cross-mode test pass against the Lexical editor.
5. The archived overlay engine remains unused (no `.word-background-layer` in the Lexical render path).

---

# 12. Implementation Notes

- Lexical 0.45.x (`lexical`, `@lexical/react`, `@lexical/history`, `@lexical/selection`, `@lexical/utils`).
- `WORD_TOKEN_REGEX` is imported from `src/lib/wordTokenization.js`; keep tokenization consistent with `codex/core/constants/regex.js` so analysis charStart aligns.
- Color must continue to flow through the NaN-total `oklchToHex`/`clamp` guards; never assign an unvalidated color to `__color`.
- Keep `Archive/ReadPage.jsx.archive` and `Archive/ScrollEditor.jsx.archive` until parity is accepted, then remove in a dedicated cleanup commit.
