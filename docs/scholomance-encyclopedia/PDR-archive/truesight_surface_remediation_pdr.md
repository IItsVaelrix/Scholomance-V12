# PDR: TrueSight Surface Remediation
## Restoring authoritative paint, responsive analysis, and bounded motion on the Read surface

**Status:** In Progress  
**Classification:** Rendering + Runtime + UI + Performance  
**Priority:** Critical  
**Primary Goal:** Eliminate the six concrete seams that keep TrueSight paint, analysis synchronicity, and motion performance from reflecting the existing AMP/backend architecture.

---

# 1. Executive Summary

TrueSight already has a backend/runtime path capable of producing richer analysis and authoritative color bytecode. The persistent failures are not caused by one missing subsystem. They come from six surface-level seams:

1. analysis updates arrive late because the Read page adds its own visual commit delay on top of hook debounce,
2. frontend normalization mutates backend bytecode and rhyme coloring overrides explicit backend color,
3. AMP-oriented color modes exist in code but are not reachable from the normal Read controls,
4. every token can fall into a default infinite animation path despite lacking an explicit motion signal,
5. the worker offload path is wired incorrectly and the hook ignores the existing environment toggle for server-vs-local panel analysis,
6. the overlay compiler remeasures growing text prefixes, making token layout work scale worse than necessary.

This PDR defines a surgical remediation. The aim is not a redesign. The aim is to make the current architecture truthful: backend bytecode stays authoritative, local analysis can actually be enabled, UI commits stop stalling, and word-level rendering stops paying for motion and measurement work it did not ask for.

---

# 2. Problem Statement

The current Read surface violates the intended authoritative flow:

```text
Server / Runtime analysis -> normalized word profiles -> Read overlay -> player sees law
```

Instead, the actual flow behaves more like:

```text
Server / Runtime analysis
  -> frontend normalization mutates color bytecode
  -> Read page delays committing the result while typing
  -> ScrollEditor reinterprets rhyme color on top of backend color
  -> AnimatedSurface assigns fallback infinite motion to tokens with no explicit motion signal
  -> overlay compiler performs repeated cumulative measurements
```

That divergence produces three player-visible defects:

- paint drift: words do not always use the color law already emitted by VerseIR / PixelBrain,
- synchronicity lag: the editor surface feels behind the player’s input even before network cost is considered,
- frame pressure: the overlay pays animation and layout costs continuously instead of only when the data asks for them.

---

# 3. Product Goals

1. Backend-emitted `visualBytecode` and `trueVisionBytecode` remain authoritative unless the UI is explicitly in a registry-first legacy path.
2. Read-page analysis visuals commit as soon as new normalized analysis exists.
3. PixelBrain and Void Echo analysis modes are reachable through the existing Truesight controls.
4. Tokens without an explicit motion signal render statically.
5. The worker offload path is usable and the environment flag for server analysis is honored.
6. Overlay token positioning is computed incrementally rather than by repeatedly measuring expanding prefixes.

---

# 4. Non-Goals

- No changes to rhyme scoring, VerseIR compilation rules, or combat mechanics.
- No redesign of the Read page layout or visual language.
- No change to backend `panelAnalysis` payload shape beyond honoring what it already emits.
- No attempt to replace Framer Motion globally.
- No attempt to remove the rhyme registry system entirely; it remains available as a fallback for legacy rhyme surfaces.

---

# 5. The Six Fixes

## 5.1 Fix One: Collapse stacked analysis wait states

**Current defect**

- `usePanelAnalysis` debounces analysis work.
- `ReadPage` then adds a second 400ms holding pattern before committing analysis maps to the editor surface.

**Required change**

- Keep a single debounce boundary in `usePanelAnalysis`.
- Remove the extra Read-page commit gate so `committedAnalysis` mirrors the latest normalized analysis maps directly.

**Acceptance criteria**

- analysis maps update immediately when `deepAnalysis` changes,
- the Read surface no longer withholds fresh paint while a typing timeout is running.

## 5.2 Fix Two: Keep backend paint authoritative

**Current defect**

- `usePanelAnalysis` rewrites token bytecode through color hygiene,
- `ScrollEditor` lets the rhyme registry override explicit backend color.

**Required change**

- stop mutating token bytecode during normalization,
- treat explicit backend color as authoritative,
- use rhyme registry color only as a legacy fallback when no explicit bytecode color is present and the surface is in a rhyme-oriented mode.

**Acceptance criteria**

- tokens with explicit `visualBytecode.color` keep that color,
- stop-word and singleton suppression happens in consumer logic, not by mutating bytecode,
- registry colors apply only when the backend has not already spoken.

## 5.3 Fix Three: Expose AMP color modes in the Read controls

**Current defect**

- `pixelbrain_transverse` and `void_echo` are supported downstream,
- the player cannot reach them from the regular controls.

**Required change**

- add PixelBrain and Void Echo mode controls to `TruesightControls.jsx` and `ToolsSidebar.jsx`.

**Acceptance criteria**

- the mode can be toggled from both the compact control strip and the sidebar,
- the existing mode state wiring in `ReadPage` remains unchanged.

## 5.4 Fix Four: Remove default infinite token animation

**Current defect**

- `AnimatedSurface` + `useAnimationSpec` + `computeAnimationSpec` assign `anim-breathe` whenever a signal lacks `dominantSchool`,
- word tokens are wrapped in `AnimatedSurface` despite not carrying an explicit animation contract.

**Required change**

- only derive an animation spec when a deterministic animation signal exists,
- return `null` for absent/incomplete motion signals,
- make `AnimatedSurface` ref-safe so word surfaces can still receive direct DOM refs when needed.

**Acceptance criteria**

- tokens without explicit motion metadata render without an animation class,
- components with real animation signals still work,
- `AnimatedSurface` supports refs cleanly.

## 5.5 Fix Five: Repair offload and respect the env toggle

**Current defect**

- the worker/client message protocol does not match,
- the worker is only a stub,
- `VITE_USE_SERVER_PANEL_ANALYSIS` exists but the hook ignores it because the server toggle is hardcoded.

**Required change**

- implement a real worker that returns `{ id, result, error }`,
- support `warmup` and `analyze`,
- honor `VITE_USE_SERVER_PANEL_ANALYSIS` through `parseBooleanEnvFlag`.

**Acceptance criteria**

- local panel analysis mode can be enabled again,
- worker warmup resolves,
- worker analyze requests resolve instead of hanging.

## 5.6 Fix Six: Remove prefix-measurement churn from overlay layout

**Current defect**

- `buildTruesightOverlayLines()` measures the whole prefix before each token,
- layout work grows with cumulative line length rather than only token width.

**Required change**

- maintain a running width accumulator per visual line,
- compute each token’s x-position from the accumulated width instead of measuring the whole prefix substring.

**Acceptance criteria**

- token x positions remain deterministic,
- whitespace gaps remain preserved,
- per-line measurement cost scales linearly with token count.

---

# 6. Module Breakdown

## `src/hooks/usePanelAnalysis.js`

- honor `VITE_USE_SERVER_PANEL_ANALYSIS`,
- reduce the trailing debounce to a single, explicit boundary,
- remove bytecode mutation from normalization.

## `src/pages/Read/ReadPage.jsx`

- remove the secondary commit timer,
- keep `committedAnalysis` in direct sync with normalized analysis maps.

## `src/pages/Read/ScrollEditor.jsx`

- use explicit backend color before rhyme-registry fallback,
- only allow registry fallback on rhyme-oriented surfaces,
- stop passing token refs through a non-forwarding component path,
- carry viseme variables through inline style where appropriate.

## `src/pages/Read/TruesightControls.jsx`

- expose PixelBrain and Void Echo mode toggles.

## `src/pages/Read/ToolsSidebar.jsx`

- expose the same mode toggles in the sidebar tool rail.

## `src/components/AnimatedSurface.jsx`

- forward refs,
- render statically when no animation spec exists.

## `src/hooks/useAnimationSpec.js`

- refuse to synthesize animation from incomplete data.

## `src/lib/animation/computeAnimationSpec.js`

- return `null` for incomplete signals instead of manufacturing a default infinite animation.

## `src/lib/workers/analysis.worker.js`

- implement the real worker protocol.

## `src/lib/truesight/color/rhymeColorRegistry.js`

- make explicit backend color authoritative by default,
- support an opt-in registry-first mode for legacy consumers.

## `src/lib/truesight/compiler/adaptiveWhitespaceGrid.ts`

- replace prefix remeasurement with incremental width accumulation.

---

# 7. QA Requirements

1. `tests/lib/truesight/rhymeColorRegistry.test.js` must verify that explicit backend color wins by default and registry-first behavior is opt-in.
2. `tests/pages/read-scroll-editor.truesight.test.jsx` must keep overlay rendering stable after paint precedence changes.
3. `tests/qa/ui-stasis-bytecode.test.jsx` and Read-surface QA should be rerun after removing the extra commit delay and reducing overlay churn.
4. Manual verification should confirm that:
   - typing paint feels immediate relative to the previous build,
   - PixelBrain / Void Echo modes are reachable,
   - ordinary word tokens no longer breathe continuously by default.

---

# 8. Success Criteria

This remediation is complete when:

- the Read surface no longer rewrites backend color truth during normalization,
- explicit bytecode color survives into rendered token paint,
- local analysis mode can be enabled through the env flag and worker path,
- token overlays render without default infinite motion,
- and overlay measurement cost no longer grows through repeated prefix measurement.

In world-law terms: the surface stops improvising over the law already written by the engine.
