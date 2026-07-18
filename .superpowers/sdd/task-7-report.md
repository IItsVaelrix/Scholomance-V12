# Task 7 Report — SongStatsPanel UI

## Status

Implemented the standalone `SongStatsPanel` surface and its component tests. ReadPage wiring remains untouched for Task 8.

## UI Spec

- **Component:** `src/components/SongStatsPanel.jsx`
- **World-law connection:** Presents song structure as a compact CODEx measurement ledger: one composite seal and three canonical metric pillars.
- **Data consumed:** `SongStatsResult` through `stats`; visibility and presentation through `visible`, `isEmbedded`, and `onClose`.
- **State:** No local or global mutable state. The component only renders its immutable input.
- **Accessibility:** Named complementary region, labeled close control, keyboard focus treatment, native provisional tooltip, and reduced-motion handling.
- **School theming:** Reuses project typography, spacing, radius, shadow, and text variables with the existing dark/brass metrics palette.
- **Animation:** A single Framer Motion panel reveal, disabled when reduced motion is preferred.
- **Regression risk:** Isolated until Task 8 mounts the panel; no existing page wiring changed.

## Implementation

- Added Technical Density value and band with a provisional badge explaining that the metric is not artistic quality.
- Added cards for CODEx Rhyme Density with Malmi baseline, CODEx Lexical Diversity, and Flow.
- Flow distinguishes estimated `stressDisplacementProxy` as “Syncopation proxy” from aligned `syncopationIndex`, with a fidelity chip.
- Added footer metadata for word count, rhyme window, 40/35/25 weights, engine version, and calibration version.
- Excluded the legacy heuristic list and its Phoneme Density terminology.

## TDD and Verification

- RED: `npx vitest run tests/components/SongStatsPanel.test.jsx` failed because the component did not exist.
- GREEN: the same command passed 3/3 tests.
- Scoped ESLint passed for the component and test.
- `npm run typecheck` passed.
- `npm run verify:css-tokens` passed.
- Full `npm run lint` remains red on 72 pre-existing errors outside Task 7; the new files produced no lint errors.
- Full `npm run test:qa` passed 1,369/1,371 tests. Existing performance-sensitive failures remained in Cleri Probe determinism (timeout) and PixelBrain noise-grid budget.

## Scope and Concerns

- Task 8 must mount and supply `SongStatsResult`.
- The collab plane accepted UI file locks but rejected locks for the QA-owned test and unowned report paths; both files were nevertheless explicitly required by Task 7.
- No schema, engine, hook, ReadPage, or unrelated dirty file was changed.
# Task 7 Report: Mount AnalyzePanel in Analyze mode

## Status: DONE (commit 3abf36b3)

## What was done

### Step 1 — Import
Added `import AnalyzePanel from "./AnalyzePanel.jsx";` immediately after the existing `AnalysisPanel` import.

### Step 2 — Branch both render sites
- Desktop right-panel site (`isAnalysisPanelVisible`): wraps with `isAnalyzeMode ? <AnalyzePanel …/> : <AnalysisPanel …/>`.
- Narrow-viewport FloatingPanel site: same branch.
- AnalyzePanel props: `initialQuery={currentLineText?.split(/\s+/)[0] || ''}`, `onCraftAction={handleAnalyzeCraft}` (handler from Task 6).
- Astrology / non-Analyze keeps `AnalysisPanel` with all existing props unchanged.

### Step 3 — Verification
- `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -iE "ReadPage|AnalyzePanel" || echo clean` → **clean**
- `npx eslint src/pages/Read/ReadPage.jsx` → **0 errors**, 17 pre-existing `no-unused-vars` warnings (no new ones from this task; `handleAnalyzeCraft` is now consumed).

### Step 4 — Commit
`3abf36b3 feat(analyze): render AnalyzePanel in Read IDE Analyze mode`

## Git hygiene
Staged only Task 7 hunks against HEAD (import + two render branches) via a HEAD+Task7 staging copy; restored the unrelated Control Console working-tree diff afterward (`MM` → post-commit `M` on ReadPage.jsx for Control Console only).

## Files changed
- `src/pages/Read/ReadPage.jsx` (Task 7 hunks only in the commit)

## Concerns / handoff for Task 8
- Manual/headed E2E (submit-only, groups, craft actions, screenshot) is Task 8.
- Control Console dirt remains unstaged in the working tree — do not `git add -A` ReadPage in Task 8 fixups unless isolating hunks.
