# Post-Implementation Report

## 1. Change Identity
- **Report ID:** PIR-20260611-SCROLL-SAVE-AUTOSAVE
- **Feature / Fix Name:** Scroll Save and Untitled Autosave Guard
- **Author / Agent:** Codex
- **Date:** 2026-06-11
- **Branch / Environment:** local workspace
- **Related Task / Ticket / Prompt:** Save Scroll does not generate a new scroll; blank-title scroll autosaves as `Untitled Scroll`
- **Classification:** Behavioral
- **Priority:** High

---

## 2. Executive Summary
Explicit Save was reusing the autosaved draft id because autosave set `activeScrollId` before the user clicked Save Scroll. The Save handler now treats an unsubmitted active draft as a draft source and creates a submitted scroll with a fresh id, while submitted scrolls still update in place. The scroll context can replace a draft id locally and delete the replaced draft from the server after the new submitted scroll is saved. Autosave also no longer creates or mutates drafts when the title is blank, so idle untitled content does not become an `Untitled Scroll` unless the user explicitly saves it.

---

## 3. Intent and Reasoning
### Problem Statement
Autosave and explicit Save shared the same persistence path. That made explicit Save behave like an update whenever autosave had already created a draft id, and blank-title autosave normalized the title to `Untitled Scroll` without user intent.

### Why This Change Was Chosen
The existing `submittedAt` contract already separates drafts from submitted scrolls. Using that field to decide whether Save should update or create a new submitted record keeps the change scoped and preserves update behavior for real saved scrolls.

### Assumptions Made
- An active scroll with no `submittedAt` is an autosave draft.
- Clicking Save Scroll is explicit consent to use `Untitled Scroll` if the title field is blank.
- Autosave without a title should not create a persisted draft.

### Alternatives Considered
- Disabling autosave entirely: rejected because it would be a larger behavior change.
- Updating draft ids in place on Save: rejected because it is the reported bug.
- Letting autosave store blank titles: rejected because display normalization still surfaces them as `Untitled Scroll`.

---

## 4. Scope of Change
### In Scope
- Add fresh-id save support for replacing an unsubmitted draft.
- Wire explicit Save to create a submitted scroll from unsubmitted drafts.
- Prevent autosave when the title is blank.
- Fix the Read page hook dependency exposed by ESLint.

### Out of Scope
- Server route redesign.
- Scroll list visual redesign.
- New non-visual test files.

### Change Type
- [x] UI behavior
- [x] Persistence behavior
- [x] Autosave logic

---

## 5. Verification
- `npx eslint src/context/ScrollsContext.jsx src/hooks/useAutoSave.js src/pages/Read/ReadPage.jsx --quiet`
- `npx vitest run tests/qa/features/editor.qa.test.jsx tests/pages/read-scroll-editor.truesight.test.jsx 2>&1`

Both commands passed. `tests/accessibility.test.jsx` was also attempted as part of an initial broader run, but it fails on unrelated existing mock/navigation issues: missing mocked `clearCsrfToken` and expected desktop nav links not rendered in that test viewport.
