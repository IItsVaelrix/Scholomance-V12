# BUG-2026-05-08 — INPUT LAG (KEYSTROKE CRITICAL PATH CONTAMINATION)

## Bytecode Search Code
`SCHOL-ENC-BUG-INPUT-LAG-COMPLETIONS-V1`

## Pathogen
`pathogen.keystroke-critical-path` (Adaptive Layer 2; threshold 0.85; vector `TQ-SIGNATURE-KEYSTROKE-CRITICAL-PATH-V1`).

## Containment
`SISP-FIX-v1-INPUT-LAG-001` — `src/pages/Read/ScrollEditor.jsx`. Debounce + monotonic request-id guard around `updateCompletions`.

## Bug Description
Typing in the Read editor felt slightly delayed. Lag was perceptibly tied to keystroke cadence and worsened under burst input. The Truesight overlay was not the cause — the cursor stasis seal (400ms `isTypingRef` freeze) was already in place and operating correctly. Coloring was confirmed debounced at 600ms via `useVerseSynthesis.js`. The lag came from a different surface on the same critical path: **IntelliSense / completions compute fired synchronously per keystroke**, including a layout-forcing DOM measurement and an unguarded async `getCompletions` call.

## Root Cause
1. **Per-keystroke unbounded work.** `handleContentChange` (ScrollEditor.jsx:806-841) called `updateCompletions(nextValue, pos)` once per `onChange` event with no debounce.
2. **Synchronous layout reflow.** Inside `updateCompletions`, `getCursorCoordsFromTextarea(textareaRef.current, mirrored, adaptiveTopology)` (line 802) read textarea geometry, forcing the browser to flush pending layout work synchronously. On a 12-keystroke/sec typist, this produces ~12 forced reflows/sec.
3. **Fire-and-forget async with no stale-response guard.** `await getCompletions(...)` (line 797) suspended; subsequent keystrokes started concurrent invocations; out-of-order resolution could overwrite fresher state with older suggestions.
4. **State cascade across an await boundary.** Pre-await setState calls auto-batched, but post-await `setIntellisenseSuggestions` + `setIntellisenseIndex` + `setCursorCoords` fell outside React 18's auto-batching window, producing extra render passes per keystroke.

## TurboQuant Substantiation
TurboQuant semantic search for `"typing input lag keystroke delay per-keystroke analysis batching debounce throttle editor textarea onChange"` returned a tight cluster around 26.27. Top hit (`BUG-2026-05-08-TRUESIGHT-SEMANTIC-AMBIGUITY.md`) was thematically adjacent but not the active cause. Forensic trace of the keystroke handler chain identified the actual surface in `ScrollEditor.jsx:761-841`. The user's hypothesis "coloring per keystroke" was disproved (color pipeline debounces at 600ms via `useVerseSynthesis.js:110-113`); the related-but-distinct pathogen "completions per keystroke" was substantiated.

## Thought Process
1. **Phenomenology first.** User reported the lag was tied 1:1 to keystrokes. That is the signature of a synchronous per-stroke side effect, not a debounced one.
2. **Eliminate the obvious.** Confirmed all three known debounces are intact: heavy analysis (600ms), Truesight overlay (400ms typing freeze), autosave (2500ms). None were the offender.
3. **Trace the handler chain.** `handleContentChange` → `setContent` (cheap), `emitCursorChange` (event-bus dispatch, cheap), branch on `isTruesight` (typing-freeze schedule, cheap), `onContentChange` (parent setState, cheap), `updateCompletions` (regex + syntax-layer lookup + async call + **layout-forcing DOM read** + setState).
4. **Identify the pathogen class.** This is the *same disease* as the recently-sealed cursor stasis: synchronous cost on the keystroke critical path that doesn't strictly need to fire per-stroke. Different organ (completions vs overlay), same pattern.

## Changes Made
| File | Lines Changed | Rationale |
|------|---------------|-----------|
| `src/pages/Read/ScrollEditor.jsx` | +2 refs near 280; +1 guard at 769; +1 stale-return at 802; +5 debounce at 849 | Defer completions compute by 120ms (below user-perceptible threshold; strictly less than 400ms typing-freeze so the two timers do not contend). Add monotonic request-id so out-of-order async resolutions cannot overwrite fresher state. |
| `codex/core/immunity/pathogenRegistry.js` | +17 lines | Register `pathogen.keystroke-critical-path` so adaptive immunity recognizes future recurrences. |

## Anti-Recursion Rule
- Single-shot setTimeout with explicit clearTimeout — at most one `updateCompletions` invocation can be scheduled.
- Request-id guard — only the most recent `updateCompletions` can mutate `intellisenseSuggestions` / `cursorCoords`.
- 120ms debounce < 400ms typing-freeze → no timer contention with the cursor stasis seal.
- The setTimeout callback is fire-and-forget; it does not chain a follow-up timer.
- `setIntellisenseSuggestions` / `setCursorCoords` do not feed back into the textarea's `onChange` path.

## Verification
1. **Build:** `npm run dev` — type a 200-char verse rapidly; confirm no per-keystroke jank, suggestions appear within ~150ms of pause.
2. **Lint:** `npm run lint` — clean.
3. **Stasis preservation:** Toggle Truesight on, type rapidly. Confirm the cursor stasis seal still holds AND no new input lag appears — the 120ms completions debounce and the 400ms overlay freeze coexist.
4. **Predictor disable:** Set `isPredictive=false`; confirm suggestions clear instantly on deactivation (early-return at line 762 still fires per keystroke; cheap).

## Lessons Learned
1. **Debounce coverage is per-surface, not per-component.** Truesight overlay was correctly debounced; completions on the same component were not. "Is the editor debounced?" is the wrong question — the right question is "for which side effect?"
2. **Synchronous DOM measurement is a stealth tax.** `getBoundingClientRect`, `offsetTop`, `getCursorCoordsFromTextarea` — anything that reads layout — forces a reflow flush. In a keystroke handler, it costs proportionally to the typing rate.
3. **Fire-and-forget async without a request-id is a race waiting to happen.** Even with a debounce, slow predictors can resolve out-of-order across the debounce boundary. The monotonic ref pattern (already used in `useVerseSynthesis.js` and `useAutoSave.js`) is the local standard — match it.
4. **The cursor stasis seal and this fix share a pathogen class.** Both are instances of `pathogen.keystroke-critical-path`. Future audits should treat any synchronous work in a textarea `onChange` as a presumed pathogen until proven otherwise.

## Related
- `pathogen.keystroke-critical-path` — `codex/core/immunity/pathogenRegistry.js`
- `ARCH_CONTRACT_OVERLAY_INTEGRITY.md` — Typing Freeze Contract (sister pattern)
- `src/hooks/useVerseSynthesis.js:110-113` — 600ms heavy-analysis debounce (canonical)
- `src/hooks/useAutoSave.js:4,127` — 2500ms persistence debounce (canonical)
