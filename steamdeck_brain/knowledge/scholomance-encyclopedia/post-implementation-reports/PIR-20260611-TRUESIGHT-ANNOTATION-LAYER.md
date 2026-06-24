# Post-Implementation Report

## 1. Change Identity
- **Report ID:** PIR-20260611-TRUESIGHT-ANNOTATION-LAYER
- **Feature / Fix Name:** TrueSight Per-Word Annotation Boxes
- **Author / Agent:** Codex
- **Date:** 2026-06-11
- **Branch / Environment:** local workspace
- **Related Task / Ticket / Prompt:** Add annotation layer with pixel-perfect orientation so each word is individually wrapped in its own annotation box
- **Classification:** UI Behavior
- **Priority:** High

---

## 2. Executive Summary
TrueSight now renders a non-interactive annotation frame for every word token in the overlay. Each frame is derived from the same token geometry used by the clickable word chip: `x`, `width`, `globalCharStart`, and `lineHeightPx`. The boxes sit behind the existing word activation surface, so tooltip click and keyboard behavior remain unchanged. CSS was added to prevent the existing non-word dimming selector from altering annotation boxes or word-shell wrappers.

---

## 3. Intent and Reasoning
### Problem Statement
The overlay showed colored words but did not expose the exact token boundaries as visible annotation cells. The requested behavior requires every word to be individually boxed in the same coordinate system used for TrueSight activation.

### Why This Change Was Chosen
Using `overlayLines[].tokens` keeps the boxes aligned to the bytecode/adaptive whitespace grid instead of approximating layout with DOM flow. The annotation layer is visual-only and pointer-transparent, preserving existing word activation.

### Assumptions Made
- The token geometry from `buildTruesightOverlayLines` is the authoritative pixel layout.
- Annotation boxes should not become separate interactive targets.
- Ghost/pinned TrueSight lines should receive the same word boundary treatment.

### Alternatives Considered
- CSS borders directly on word chips: rejected because chip animation/effects can change perceived bounds.
- A separate full overlay pass: rejected because duplicated token mapping increases drift risk.
- Absolute wrapper refactor: rejected as too risky for current tooltip/caret behavior.

---

## 4. Scope of Change
### In Scope
- Add one annotation box per rendered TrueSight word.
- Style annotation boxes with token/school color variables.
- Keep annotation boxes pointer-transparent.
- Add regression coverage for box count and geometry parity.

### Out of Scope
- New annotation data model.
- Server-side annotation persistence.
- Replacing the existing word tooltip interaction model.

### Change Type
- [x] UI only
- [x] Styling / layout
- [x] Accessibility preservation
- [x] Testing

---

## 5. Verification
- `npx eslint src/pages/Read/ScrollEditor.jsx tests/pages/read-scroll-editor.truesight.test.jsx --quiet`
- `npx vitest run tests/pages/read-scroll-editor.truesight.test.jsx tests/qa/truesight-alignment.qa.test.jsx tests/qa/truesight-state-isolation.qa.test.jsx 2>&1`

Both commands passed. `npm run build:app` was attempted twice, but the Vite build process was terminated during transform with exit code 143 and no diagnostic output.
