# PDR: Super In-Depth Analysis Channel
## IDE-Gated Deep Verse Analysis Surface

**Status:** Draft
**Classification:** UI + Analysis Workflow + Privacy Boundary + Runtime Orchestration
**Priority:** High
**Primary Goal:** Add an explicit IDE analysis channel that performs richer, slower, user-requested verse analysis without changing live Truesight or violating the Sovereign Editor principle.

---

## Owner(s)
- **Codex:** Analysis channel contract, local adapter boundary, bytecode/error semantics, and any new shared schema proposal.
- **Claude:** IDE surface, panel layout, accessibility, Truesight/analysis visual treatment.
- **Gemini:** Runtime/server implementation if a consented backend path is approved, test coverage, CI gate wiring.
- **Escalation owner:** Angel.

## Context
The IDE currently has live Truesight, analysis modes, tooltips, and panels, but no dedicated “go deep now” channel for long-form analysis. This feature creates a deliberate analysis lane: the user presses a command, the IDE snapshots the current text locally, and the result appears as a structured channel beside the editor.

## Target Integration Area
- `src/pages/Read/ReadPage.jsx`
- `src/pages/Read/ScrollEditor.jsx`
- `src/pages/Read/AnalysisPanel.jsx`
- `src/pages/Read/IDE.css`
- `src/hooks/`
- `src/lib/`
- `tests/pages/`
- `tests/qa/`

## Core Concept
The channel is a ritual microscope for the IDE. Live Truesight answers “what is this word doing right now?”; the Super In-Depth Analysis Channel answers “what is the whole scroll structurally becoming?” It should gather VerseIR, phoneme density, school distribution, rhyme/near-rhyme structures, repetition, meter drift, rare word pressure, narrative movement, and concrete revision suggestions into a single user-requested report.

## Implementation Philosophy
Treat this as a real engineering handoff for an AI coding agent and future maintainers. Prefer small composable edits, deterministic behavior, adapter layers where existing contracts are uncertain, and no unnecessary rewrites. Preserve existing behavior unless a change is explicitly justified.

## Ownership & Law Compliance
This PDR respects `VAELRIX_LAW.md`, `SCHEMA_CONTRACT.md`, and the root `AGENTS.md` read order. The IDE must not send unsaved editor content to any server path unless the user explicitly requests a consented remote/deep run. All writes appear in Section 7 with ownership. Any schema field not already present in `SCHEMA_CONTRACT.md` must be proposed by Codex before implementation spreads it across modules.

---

# 1. Executive Summary

The Super In-Depth Analysis Channel adds a deliberate, high-signal analysis surface to the Scholomance IDE. Unlike live Truesight, it is not a keystroke-driven overlay; it runs from an explicit user command and renders a durable report panel for the current editor snapshot. The first implementation should run locally against existing VerseIR/phoneme/rhyme engines, then optionally add a consented backend path later. The blast radius is mostly the Read IDE surface, with a small adapter layer for deterministic analysis output. The feature is Draft status and must ship behind a feature flag until local QA, accessibility, and privacy checks pass.

# 2. Out of Scope / Non-Goals

- No automatic server submission of unsaved editor text.
- No replacement of live Truesight.
- No replacement of `AnalysisPanel`; this is a channel that can reuse pieces but has a distinct workflow.
- No AI model call in Phase 1.
- No schema mutation without Codex-owned `SCHEMA_CONTRACT.md` update.
- No persistent storage of analysis snapshots unless the user saves/export them explicitly.
- No new scoring authority for combat; this channel is advisory until a server contract promotes any result.

# 3. Spec Sheet

## Functional Spec

- Add a “Deep Analysis” channel entry point in the IDE tools/analysis area.
- User action creates a local immutable snapshot:
  - `text`
  - `title`
  - `createdAt`
  - `contentHash`
  - `source: "local-editor-snapshot"`
- Render channel states:
  - idle
  - queued
  - analyzing
  - complete
  - failed
  - stale snapshot, when editor text changes after report generation
- Report sections:
  - Executive reading: 3 to 5 compact findings.
  - Phoneme pressure: dominant vowel families, school distribution, dense clusters.
  - Rhyme topology: exact rhymes, slant rhymes, repeated tails, unresolved echoes.
  - Meter / pacing drift: line-by-line syllable estimates and drift notes.
  - Lexical pressure: rare words, repeated words, function-word ratio.
  - Structural movement: opening, escalation, turn, closure.
  - Revision queue: actionable suggestions with line references.
  - Diagnostics: deterministic warnings and bytecode error payloads where applicable.
- Clicking a finding should optionally highlight relevant lines in the editor.
- Re-running should replace the prior report for the active snapshot unless pinned/exported.

## Acceptance Criteria

- A user can run deep analysis manually from the IDE.
- The channel produces a deterministic report for identical text.
- If the editor changes after the report, the report displays stale status.
- Report line references map back to editor lines.
- The feature can be disabled by flag without breaking existing IDE behavior.

## Non-Functional Spec

- Local Phase 1 target: complete under 500 ms for 2,000 words on a normal dev machine.
- Memory target: avoid retaining more than two full text snapshots in React state.
- Accessibility: keyboard reachable entry point, `aria-live="polite"` status changes, headings for report sections.
- Determinism: same input and options produce same section order, counts, line references, and report IDs.
- Privacy: no unsaved content leaves the browser in Phase 1.

## Contracts

Phase 1 must use a local adapter-returned object, not an implicit ad hoc component shape:

```ts
type DeepAnalysisChannelStatus = "idle" | "queued" | "analyzing" | "complete" | "failed";

interface DeepAnalysisSnapshot {
  id: string;
  title: string;
  text: string;
  contentHash: string;
  createdAt: number;
  source: "local-editor-snapshot";
}

interface DeepAnalysisFinding {
  id: string;
  severity: "info" | "notice" | "warning";
  title: string;
  body: string;
  lineRefs: number[];
  tags: string[];
}

interface DeepAnalysisReport {
  version: "deep-analysis-channel-v1";
  snapshotId: string;
  contentHash: string;
  generatedAt: number;
  engine: "local-verseir-v1";
  summary: DeepAnalysisFinding[];
  sections: Array<{
    id: string;
    title: string;
    findings: DeepAnalysisFinding[];
  }>;
  diagnostics: string[];
}
```

If this contract becomes shared beyond the IDE, Codex must publish it in `SCHEMA_CONTRACT.md`.

# 4. Change Classification

- **Behavioral:** Adds a new explicit user workflow.
- **UI:** Adds a visible IDE analysis channel.
- **Structural:** Adds a local adapter/hook boundary for report generation.
- **Privacy boundary:** Creates an explicit consent gate for any future non-local analysis path.

# 5. Assumptions and Unknowns

- Assumption: Phase 1 can use existing local VerseIR/phoneme/rhyme utilities without server calls.
- Assumption: Users want this as an IDE channel/panel, not only a modal or tooltip.
- Assumption: The report is advisory and should not alter saved scroll data.
- Unknown: Whether a later Phase 2 should use backend analysis, an LLM, or only deterministic CODEx engines.
- Unknown: Whether report exports should become bytecode artifacts or plain Markdown.
- Unknown: Whether this channel should be visible on mobile first launch or hidden under the Tools tab.

# 6. Open Questions / Escalations

No current conflict blocks Phase 1 local implementation.

Future backend/LLM path requires explicit escalation:

```text
ESCALATION: PRIVACY_BOUNDARY_REMOTE_DEEP_ANALYSIS
- Clause: Sovereign Editor Principle
- Conflict: Remote deep analysis would send unsaved editor text outside the browser.
- Proposed Direction: Add an explicit "Run remote analysis" consent action and never run it automatically.
- Needs: Angel approval before implementation.
```

# 7. Architecture / File Map

| Path | Action | Owner | Notes |
|---|---|---|---|
| `src/lib/deep-analysis/channel.js` | Create | Codex | Deterministic local report adapter. |
| `src/hooks/useDeepAnalysisChannel.js` | Create | Codex | Hook for snapshot, status, run/cancel/stale state. |
| `src/pages/Read/DeepAnalysisChannel.jsx` | Create | Claude | IDE report surface. |
| `src/pages/Read/ReadPage.jsx` | Modify | Claude | Wire channel state, line highlighting, entry point. |
| `src/pages/Read/ToolsSidebar.jsx` | Modify | Claude | Add trigger/visibility control if appropriate. |
| `src/pages/Read/IDE.css` | Modify | Claude | Channel styles; school-aware, accessible, no modal dependency. |
| `tests/qa/deep-analysis-channel.qa.test.jsx` | Create | Gemini | Behavior and privacy assertions. |
| `tests/pages/read-deep-analysis-channel.test.jsx` | Create | Gemini | Component interaction tests. |
| `docs/scholomance-encyclopedia/post-implementation-reports/PIR-20260611-DEEP_ANALYSIS_CHANNEL.md` | Create after implementation | Implementing agent | PIR required by Law 15. |

Dependency graph:

- `ReadPage.jsx`
- `useDeepAnalysisChannel.js`
- `src/lib/deep-analysis/channel.js`
- existing VerseIR / phoneme / rhyme utilities
- `DeepAnalysisChannel.jsx`
- editor line highlighting callbacks

# 8. Step-by-Step Implementation Plan

## Phase 0 — Flag and Local Contract

- **Owner:** Codex
- **Approximate time:** 1 hour
- **Milestone:** Add local contract types/JSDoc and feature flag.
- **Exit criteria:** Feature can be disabled by `VITE_ENABLE_DEEP_ANALYSIS_CHANNEL=false`.

## Phase 1 — Deterministic Local Adapter

- **Owner:** Codex
- **Approximate time:** 3 to 5 hours
- **Milestone:** `runLocalDeepAnalysis(snapshot)` returns a complete deterministic report.
- **Exit criteria:** Unit tests prove same input produces same JSON except `generatedAt` when normalized.

## Phase 2 — React Hook

- **Owner:** Codex
- **Approximate time:** 2 hours
- **Milestone:** `useDeepAnalysisChannel` manages snapshot, status, stale detection, cancellation.
- **Exit criteria:** Hook tests cover idle/run/complete/fail/stale paths.

## Phase 3 — IDE Channel Surface

- **Owner:** Claude
- **Approximate time:** 4 to 6 hours
- **Milestone:** Panel renders sections and line-reference actions.
- **Exit criteria:** Keyboard and screen-reader flows pass Testing Library assertions.

## Phase 4 — QA and Stasis

- **Owner:** Gemini
- **Approximate time:** 2 to 4 hours
- **Milestone:** Add QA tests and run stasis battery.
- **Exit criteria:** Existing Read IDE, Truesight, and stasis tests pass.

## Phase 5 — Optional Remote Consent Spike

- **Owner:** Codex + Gemini, with Angel approval
- **Approximate time:** separate PDR
- **Milestone:** None in this PDR.
- **Exit criteria:** Escalation approved and new schema published.

# 9. Code Examples for the 5-10 Most Pivotal Changes

## 9.1 Feature Flag

```js
// src/lib/deep-analysis/flags.js
export function isDeepAnalysisChannelEnabled(env = import.meta.env) {
  return String(env.VITE_ENABLE_DEEP_ANALYSIS_CHANNEL ?? "true") !== "false";
}
```

## 9.2 Snapshot Builder

```js
// src/lib/deep-analysis/channel.js
export function stableHashText(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function createDeepAnalysisSnapshot({ title, text, now = Date.now() }) {
  const safeText = String(text || "");
  return {
    id: `deep-${stableHashText(`${title}\n${safeText}`)}-${now}`,
    title: String(title || "Untitled Scroll"),
    text: safeText,
    contentHash: stableHashText(safeText),
    createdAt: now,
    source: "local-editor-snapshot",
  };
}
```

## 9.3 Local Report Runner

```js
// src/lib/deep-analysis/channel.js
export function runLocalDeepAnalysis(snapshot, adapters) {
  const lines = snapshot.text.split("\n");
  const tokens = adapters.tokenize(snapshot.text);
  const schoolWeights = adapters.computeSchoolWeights(tokens);

  return {
    version: "deep-analysis-channel-v1",
    snapshotId: snapshot.id,
    contentHash: snapshot.contentHash,
    generatedAt: Date.now(),
    engine: "local-verseir-v1",
    summary: buildSummaryFindings({ lines, tokens, schoolWeights }),
    sections: [
      buildPhonemePressureSection(tokens),
      buildRhymeTopologySection(tokens),
      buildMeterDriftSection(lines, adapters),
      buildRevisionQueueSection(lines, tokens),
    ],
    diagnostics: [],
  };
}
```

## 9.4 Hook State

```js
// src/hooks/useDeepAnalysisChannel.js
export function useDeepAnalysisChannel({ title, text, runAnalysis }) {
  const [state, setState] = useState({ status: "idle", snapshot: null, report: null, error: null });

  const run = useCallback(async () => {
    const snapshot = createDeepAnalysisSnapshot({ title, text });
    setState({ status: "analyzing", snapshot, report: null, error: null });
    try {
      const report = await runAnalysis(snapshot);
      setState({ status: "complete", snapshot, report, error: null });
    } catch (error) {
      setState({ status: "failed", snapshot, report: null, error });
    }
  }, [title, text, runAnalysis]);

  const stale = state.report ? state.report.contentHash !== stableHashText(text) : false;
  return { ...state, stale, run };
}
```

## 9.5 ReadPage Wiring

```jsx
const deepAnalysis = useDeepAnalysisChannel({
  title: editorTitle,
  text: truesightContent,
  runAnalysis: runLocalDeepAnalysis,
});

<DeepAnalysisChannel
  state={deepAnalysis}
  onRun={deepAnalysis.run}
  onLineSelect={(lineIndex) => setHighlightedLines([lineIndex])}
/>
```

## 9.6 Channel Component

```jsx
export default function DeepAnalysisChannel({ state, onRun, onLineSelect }) {
  return (
    <section className="deep-analysis-channel" aria-label="Super in-depth analysis channel">
      <header>
        <h2>Deep Analysis</h2>
        <button type="button" onClick={onRun} disabled={state.status === "analyzing"}>
          {state.status === "analyzing" ? "Analyzing..." : "Run Deep Analysis"}
        </button>
      </header>
      <div aria-live="polite">{state.stale ? "Report is stale; editor changed." : state.status}</div>
      {state.report?.sections.map((section) => (
        <article key={section.id}>
          <h3>{section.title}</h3>
          {section.findings.map((finding) => (
            <button key={finding.id} type="button" onClick={() => onLineSelect(finding.lineRefs[0])}>
              {finding.title}
            </button>
          ))}
        </article>
      ))}
    </section>
  );
}
```

## 9.7 Privacy Guard Test

```jsx
it("does not fetch during local deep analysis", async () => {
  vi.stubGlobal("fetch", vi.fn());
  render(<ReadPage />);
  fireEvent.click(screen.getByRole("button", { name: /run deep analysis/i }));
  await screen.findByLabelText(/super in-depth analysis channel/i);
  expect(fetch).not.toHaveBeenCalled();
});
```

# 10. Glossary

- **Channel:** A persistent IDE surface for a workflow, not a modal.
- **Snapshot:** Immutable local copy of editor text at the moment analysis starts.
- **Stale report:** A report whose content hash no longer matches current editor text.
- **VerseIR:** Scholomance intermediate representation for verse analysis.
- **Sovereign Editor:** Law that unsaved user work stays in browser memory unless explicitly saved or consented.
- **Phoneme pressure:** Distribution and density of phoneme/vowel-family signals across the text.
- **Rhyme topology:** The network of exact and near-rhyme relationships.

# 11. Q&A — Top 10 Most Confusing Implementation Concerns

1. **Does this replace Truesight?** No. Truesight remains live word/overlay feedback.
2. **Can it analyze unsaved work?** Yes, locally only in Phase 1.
3. **Can it call a server?** Not without a separate consent gate and Angel-approved escalation.
4. **Should it save reports?** No by default. Export/pin can be a follow-up.
5. **Does it affect combat scoring?** No. It is advisory.
6. **What if text changes during analysis?** Complete the run for the old snapshot and mark the report stale.
7. **What if analysis fails?** Render a failed state with bytecode diagnostics where available.
8. **Should findings mutate editor text?** No. Suggestions are copyable or line-linked only.
9. **Should it run on every keystroke?** No. Manual run only.
10. **Can implementation reuse `AnalysisPanel`?** Yes for display pieces, but not by coupling to its state assumptions.

# 12. QA Plan

## New Tests

- `tests/lib/deep-analysis-channel.test.js`
- `tests/hooks/useDeepAnalysisChannel.test.jsx`
- `tests/pages/read-deep-analysis-channel.test.jsx`
- `tests/qa/deep-analysis-channel.qa.test.jsx`

## Commands

```bash
npx vitest run tests/lib/deep-analysis-channel.test.js
npx vitest run tests/hooks/useDeepAnalysisChannel.test.jsx
npx vitest run tests/pages/read-deep-analysis-channel.test.jsx
npx vitest run tests/qa/deep-analysis-channel.qa.test.jsx
npm run test:qa:stasis
```

## Test Code Examples

```js
it("returns deterministic section ids for identical snapshots", () => {
  const snapshot = createDeepAnalysisSnapshot({ title: "T", text: "night light", now: 1 });
  const a = runLocalDeepAnalysis(snapshot, testAdapters);
  const b = runLocalDeepAnalysis(snapshot, testAdapters);
  expect(a.sections.map((s) => s.id)).toEqual(b.sections.map((s) => s.id));
});
```

```jsx
it("marks a report stale after editor text changes", async () => {
  render(<ReadPage />);
  fireEvent.change(screen.getByLabelText(/scroll content/i), { target: { value: "night light" } });
  fireEvent.click(screen.getByRole("button", { name: /run deep analysis/i }));
  await screen.findByText(/phoneme pressure/i);
  fireEvent.change(screen.getByLabelText(/scroll content/i), { target: { value: "night light fire" } });
  expect(screen.getByText(/stale/i)).toBeTruthy();
});
```

# 13. Regression Risks and Specific Retest Checklist

- **Risk:** Live Truesight slows down.
  - Retest: `npx vitest run tests/pages/read-scroll-editor.truesight.test.jsx`
- **Risk:** Unsaved text leaves browser.
  - Retest: `npx vitest run tests/qa/deep-analysis-channel.qa.test.jsx`
- **Risk:** Line highlights target wrong lines.
  - Retest: `npx vitest run tests/pages/read-deep-analysis-channel.test.jsx`
- **Risk:** Mobile IDE becomes crowded.
  - Retest manually at widths under 640 px.
- **Risk:** Existing analysis panel breaks.
  - Retest: `npm run test:qa:stasis`

# 14. Rollout Plan

## Feature Flag

- `VITE_ENABLE_DEEP_ANALYSIS_CHANNEL`
- Default during development: `true`
- Default for production until QA approval: `false`

## Shadow Mode

Initial implementation may compute the report only after manual button press and log no user text. Shadow mode may record only timing metrics and section counts, never content.

## Canary

Enable for local development and internal preview first. Do not expose broadly until privacy and accessibility tests pass.

## Incomplete-But-Safe Clause

Before every phase is complete, the IDE must continue to run normally with the feature flag off. If the adapter fails, show a failed channel state and do not block editing, saving, Truesight, or scroll navigation.

## Rollback

1. Set `VITE_ENABLE_DEEP_ANALYSIS_CHANNEL=false`.
2. Hide the channel trigger in `ReadPage.jsx` / `ToolsSidebar.jsx`.
3. Leave local adapter files in place if unused; remove in a cleanup PR only after QA.

# 15. Definition of Done

- [ ] Feature flag exists and disables all UI entry points.
- [ ] Local run does not call `fetch`, server routes, or persistence APIs.
- [ ] Report sections render with accessible headings.
- [ ] Stale state appears when editor content changes.
- [ ] Line-reference click highlights the target line.
- [ ] Determinism tests pass.
- [ ] Privacy QA test passes.
- [ ] `npm run test:qa:stasis` passes.
- [ ] PIR exists at the filename in Section 18.

# 16. Final Architectural Verdict

**Functionally complete but needs follow-up.** Phase 1 is safe and useful as a local deterministic IDE channel. Any remote, LLM, persistence, or shared-schema expansion is intentionally excluded until Angel approves the privacy and schema boundary.

# 17. References

- `docs/scholomance-encyclopedia/Scholomance LAW/SHARED_PREAMBLE.md` — Sovereign Editor principle.
- `docs/scholomance-encyclopedia/Scholomance LAW/VAELRIX_LAW.md` — schema, determinism, quality gates, PDR/PIR law.
- `docs/scholomance-encyclopedia/Scholomance LAW/SCHEMA_CONTRACT.md` — existing shared shapes and schema ownership.
- `src/pages/Read/ReadPage.jsx` — IDE orchestration and analysis state.
- `src/pages/Read/ScrollEditor.jsx` — editor surface, Truesight overlay, line highlighting.
- `src/pages/Read/AnalysisPanel.jsx` — existing analysis display patterns.
- `src/hooks/useVerseSynthesis.js` — existing VerseIR synthesis path.
- `src/lib/truesight/compiler/compileVerseToIR.js` — local VerseIR compiler.
- `src/lib/engine.adapter.js` — approved UI access to CODEx engine functions.
- `docs/scholomance-encyclopedia/PDR-archive/truesight_surface_remediation_pdr.md` — adjacent Truesight surface remediation context.

# 18. Post-Implementation Report Handoff

Required PIR:

```text
docs/scholomance-encyclopedia/post-implementation-reports/PIR-20260611-DEEP_ANALYSIS_CHANNEL.md
```

The implementing agent must write this PIR after feature completion and include:

- final file list
- final privacy behavior
- QA commands and results
- screenshots or visual notes if Claude changes the IDE surface
- unresolved follow-up items
