# Post-Implementation Report

## 1. Change Identity
- **Report ID:** PIR-20260611-TRUESIGHT-WORDTOOLTIP-HIERARCHY
- **Feature / Fix Name:** TrueSight WordTooltip Mode Hierarchy
- **Author / Agent:** Codex
- **Date:** 2026-06-11
- **Branch / Environment:** local workspace
- **Related Task / Ticket / Prompt:** TrueSight causes WordToolTips to not show up
- **Classification:** Behavioral
- **Priority:** High

---

## 2. Executive Summary
TrueSight visual state was incorrectly derived from `ideMode` inside `ScrollEditor`. When a click or focus transition changed `ideMode` to `EDIT` or `NEUTRAL`, the overlay could be suppressed even though the parent `isTruesight` state was still enabled. The fix separates the visual authority (`isTruesight` prop) from focus/interaction mode (`ideMode`) and allows textarea word activation while TrueSight is active. TrueSight word chips now also have stable accessible labels and prevent mouse focus from flipping mode before click activation runs.

---

## 3. Intent and Reasoning
### Problem Statement
Clicking TrueSight words did not reliably open `WordTooltip`. The suspected null/type hierarchy issue was confirmed as a state hierarchy bug: focus mode overrode visual TrueSight state.

### Why This Change Was Chosen
The parent Read page already owns whether TrueSight is enabled. `ScrollEditor` should render from that explicit prop and use `ideMode` only as an interaction/focus mode, not as visual authority.

### Assumptions Made
- `isTruesight` is the canonical visual state for the overlay.
- `ideMode` can change during focus/blur without disabling TrueSight.
- Word activation should work even when analysis is not ready, so lookup can populate the tooltip.

### Alternatives Considered
- Force ReadPage to keep `ideMode="TRUESIGHT"` whenever TrueSight is on: rejected because focus modes are still useful for editor behavior.
- Require analysis before activation: rejected because it preserves the null-state tooltip failure.
- Raise z-index only: rejected because the root issue was state authority, not just stacking.

---

## 4. Scope of Change
### In Scope
- Decouple `ScrollEditor` visual TrueSight state from `ideMode`.
- Permit textarea tap activation in TrueSight even during `EDIT` mode.
- Add accessible labels and mouse-focus prevention to TrueSight word chips.
- Add regression tests for activation without analysis and across `EDIT` / `NEUTRAL` mode.

### Out of Scope
- Redesigning the tooltip card.
- Rewriting the IDE mode state machine.
- Changing server analysis contracts.

### Change Type
- [x] UI behavior
- [x] Accessibility
- [x] State hierarchy
- [x] Testing

---

## 5. Verification
- `npx eslint src/pages/Read/ScrollEditor.jsx src/pages/Read/ReadPage.jsx tests/pages/read-scroll-editor.truesight.test.jsx --quiet`
- `npx vitest run tests/pages/read-scroll-editor.truesight.test.jsx tests/qa/truesight-state-isolation.qa.test.jsx 2>&1`

Both commands passed. A Playwright smoke attempt was made after sandbox escalation. It exposed unrelated instability in the existing smoke spec: the first case still expects `/` to redirect to `/read`, and the isolated second case later failed before reaching the editor title field.
