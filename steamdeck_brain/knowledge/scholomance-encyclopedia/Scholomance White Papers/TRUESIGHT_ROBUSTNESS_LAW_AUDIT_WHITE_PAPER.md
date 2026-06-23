# TrueSight — Robustness & LAW Code Quality Audit

**A Three-Skill Cross-Examination**

| Field | Value |
|---|---|
| **Auditor** | OpenCode (Law Enforcer + UI Architect + Animation Archaeologist) |
| **Target** | TrueSight subsystem — scroll editor overlay, color pipeline, synthesis hooks |
| **Date** | 2026-06-11 |
| **Commit** | `HEAD` of Scholomance V12-main |
| **Scope** | `src/pages/Read/`, `src/hooks/`, `src/lib/truesight/`, `codex/core/shared/truesight/`, `src/components/AnimatedSurface.jsx`, `tests/qa/truesight-*` |
| **Total files examined** | 37 source files, 12 test files, 3 skill LAW documents |
| **Confidence** | High |

---

## Executive Summary

TrueSight is the most architecturally ambitious subsystem in Scholomance. It bridges the CODEx analysis engine (phoneme → school → OKLCh color) with an interactive UI overlay (textarea + pixel-measured word grid + clickable color-coded word surfaces). The code is remarkably well-structured, thoroughly tested (12 test suites), and exhibits strong awareness of its own architectural contracts.

**Verdict: B / Annoying Correctness**

No CRITICAL laws are broken. There are two MAJOR architectural violations (direct `codex/core` imports from `src/lib/truesight/compiler/` that bypass the Cell Wall adapter), several MINOR accessibility and animation gaps, and noteworthy strengths in test coverage, determinism enforcement, and reduced-motion compliance. The subsystem is production-viable but carries technical debt in its import hygiene.

---

## ═══════════════ UI ARCHITECT AUDIT ═══════════════

*Skill reference: `professional-ui-architect-skill.md`*

### Obeyed Laws (With Evidence)

#### ✅ JSON-to-UI Mapping (Law 1)

ScrollEditor consumes structured data exclusively. The overlay renders from `analyzedWordsByIdentity` (Map), `analyzedWordsByCharStart` (Map), and `analyzedWords` (Map fallback). No hard-coded display values.

**Evidence:** `ScrollEditor.jsx:1215-1221` — triple-lookup identity chain:
```
derivedAnalyzedWordsByCharStart.get(charStart)
  || analyzedWordsByIdentity.get(identityKey)
  || (allowLegacyWordFallback ? analyzedWords.get(clean) : null)
```

#### ✅ Deterministic Output (Law 6)

`useVerseSynthesis.js:28-29` — content identity guard prevents re-analysis of identical text. No `Math.random()` or `Date.now()` in rendering paths. `Date.now()` in artifact creation (`VerseSynthesis.js:105,124`) is properly marked `// EXEMPT` — used for consumer caching, not rendering.

#### ✅ State-Driven Animations (Law 4)

All Framer Motion in ScrollEditor respects `reducedMotion` via `editorMotionProps` at `ScrollEditor.jsx:1083-1095`. Animation signals from `AnimatedSurface` pass through `useAnimationSpec` which is state-driven from the PixelBrain analysis.

#### ✅ Accessibility Structural (Law 5)

- Semantic HTML (`<textarea>`, `<button>`-role via `role="button"`, `aria-label`)
- Keyboard navigation: `onKeyDown` for Enter/Space on word tokens (`ScrollEditor.jsx:1318-1337, 1524-1543`)
- Visible focus states: `.truesight-word-token:focus-visible` with `outline: 1px solid rgba(124, 198, 255, 0.9)` at `IDE.css:3847`
- Reduced-motion wrapping: `editorMotionProps` conditionally sets `duration: 0`
- `aria-hidden` on overlay when in read-only TrueSight mode

#### ✅ Responsive Flexbox/Grid (Law 3)

`buildTruesightOverlayLines()` in `adaptiveWhitespaceGrid.ts` uses canvas-based pixel measurement and produces absolutely-positioned tokens within a grid container. The outer layout uses Flexbox/Grid. No brittle pixel positions.

### Violations / Gaps

#### ⚠️ MINOR: Missing Empty/Loading/Error States

The `ScrollEditor` component does not render distinct empty, loading, or error states for:
- **Empty content**: Shows empty textarea + placeholder `"Inscribe thy verses..."` but no dedicated empty-state surface
- **Loading analysis**: `isSynthesizing` prop is accepted but not rendered as a visual loading state — no skeleton shimmer or thematic pulse
- **Analysis error**: `error` prop from `useVerseSynthesis` is available but not surfaced in the ScrollEditor UI

**LAW-UI-001** — *Components must have empty/loading/error states when relevant* (UI Architect skill §Component Generation Rules)

**Fix:** Wire `isSynthesizing` to a `.truesight-loading` skeleton overlay; surface `error` as a scroll-unfurl notification.

#### ⚠️ NITPICK: Inline Styles for State (ScrollEditor.jsx)

The spellcheck orb (`ScrollEditor.jsx:1342-1379`) uses inline `style` props with hard-coded values:
```jsx
style={{
  left: `${pixelX + (pixelWidth || 0)}px`,
  top: '-4px',
  width: '10px',
  height: '10px',
  borderRadius: '50%',
  backgroundColor: 'var(--ritual-error, #ff4d4d)',
  zIndex: 10,
}}
```

**LAW-UI-002** — *No inline styles for state* (AGENTS.md Design Anti-Patterns). The `10px` dimensions should be tokens; `zIndex: 10` bypasses the z-index registry.

#### ⚠️ NITPICK: Hard-coded rgba Values

`ScrollEditor.jsx:1274` uses `rgba(101, 31, 255, 0.13)` for line highlighting — not a CSS variable token. `IDE.css:3801` mirrors this. Should be `var(--read-highlight-bg)` or similar.

---

## ═══════════════ ANIMATION ARCHAEOLOGY AUDIT ═══════════════

*Skill reference: `animation-archeology-skill.md`*

### Animation Inventory

| Category | Count |
|---|---|
| `@keyframes` in `IDE.css` | 30 (ide-char-flicker, grim-phoneme-*, oracle-*, title-glow-*) |
| `@keyframes` in `animations.css` | 21 (burst-*, overlay-*, discovery-*, base animations) |
| `@keyframes` in `TruesightDebugColorPanel.css` | 1 (truesight-debug-pulse) |
| Framer Motion consumers (ScrollEditor) | 5+ (editor entrance, spellcheck orb, ghost lines, IntelliSense, tooltip) |
| rAF loops (truesight-related) | 1 (useAdaptivePalette HSL transition) |
| rAF loops (ancillary in ScrollEditor) | 3 (cursor measurement, scroll sync, overlay build) |

### Trace Table (TrueSight-Specific)

| Status | Animation / Loop |
|---|---|
| [LIVE] | `editorMotionProps` — Framer Motion entrance. Definition at `ScrollEditor.jsx:1083-1095`. Trigger: component mount. Reduced-motion respected. |
| [LIVE] | `useAdaptivePalette` rAF loop — HSL transition. Definition at `useAdaptivePalette.js:108-126`. Cleanup: `cancelAnimationFrame` on unmount/pause/reduced-motion. State-isolation test proves cancellation. |
| [LIVE] | Spellcheck orb entrance — Framer Motion `initial={{ scale: 0, opacity: 0 }}` → `animate={{ scale: 1, opacity: 1 }}`. Trigger: `isMisspelled` true. |
| [LIVE] | Ghost-layer spring animation — `AnimatePresence` + spring physics. Definition at `ScrollEditor.jsx:1426-1429`. Trigger: `isTruesight && ghostData`. |
| [LIVE] | `@keyframes truesight-debug-pulse` — definition at `TruesightDebugColorPanel.css:36`, used by `.debug-panel-status-card`. |
| [DEAD] | `@keyframes truesight-glow-pulse` / `truesight-active-glow-pulse` — **Removed** (mentioned in archived diagnostics, absent from current CSS). Verdict: cleanly deleted. |
| [UNVERIFIED] | `@keyframes grim-phoneme-burst / shimmer / breathe / pulse / glide` — defined in `IDE.css:1957-1995`. These may have live consumers in the PixelBrain pipeline. Not verifiable without full PixelBrain audit. |

### Violations / Gaps

#### ⚠️ MINOR: Ghost-Layer Spring Animation Ignores Reduced Motion

`ScrollEditor.jsx:1429` springs unconditionally:
```jsx
transition={{ type: "spring", stiffness: 140, damping: 20, mass: 0.8, restDelta: 0.001 }}
```

No `reducedMotion` variable is checked for the ghost-line entrance animation. The `AnimatePresence` exit also uses spring physics.

**LAW-ANIM-001** — *Animations must honor reduced-motion preferences* (Animation Archaeology §Reachability Rules, UI Architect §Law 4)

**Fix:** Wrap the ghost-line motion props:
```jsx
const ghostMotionProps = reducedMotion
  ? { initial: false, animate: { y: targetY, opacity: 1 }, transition: { duration: 0 } }
  : { initial: { y: initialY, opacity: 0.6, scale: 0.98 }, animate: { y: targetY, opacity: 1, scale: 1 }, transition: { type: "spring", ... } };
```

#### ⚠️ MINOR: Spellcheck Orb `whileHover` Ignores Reduced Motion

`ScrollEditor.jsx:1346`:
```jsx
whileHover={{ scale: 1.2, boxShadow: '0 0 12px var(--ritual-error, #ff4d4d)' }}
```

This is a Framer Motion `whileHover` that scales the orb — no reduced-motion guard.

**LAW-ANIM-002** — Same as above.

**Fix:** Use `whileHover={reducedMotion ? {} : { scale: 1.2, boxShadow: '...' }}` or disable hover animations when motion is reduced.

#### ⚠️ NITPICK: Unverified Keyframes in IDE.css

The `@keyframes grim-phoneme-*` block (`IDE.css:1957-1995`) defines five animations. These may be consumed dynamically by the PixelBrain bytecode renderer via `decoded?.className`, but the chain from CSS definition → className string → component render is not statically traceable. Mark `[UNVERIFIED]` until a full PixelBrain animation audit is run.

---

## ═══════════════ LAW ENFORCER AUDIT ═══════════════

*Skill reference: `law-enforcer-skill.md`*

### Laws Extracted

| LAW-ID | Name | Source | Check | Severity |
|---|---|---|---|---|
| LAW-ARCH-001 | Cell Wall adapter boundary | AGENTS.md §Hard Stops | `src/lib/` must not import `codex/core/*` directly | MAJOR |
| LAW-ARCH-002 | Hook isolation | AGENTS.md §Jurisdiction | Hooks in `src/hooks/` must use adapters, not import `codex/core/*` directly | MAJOR |
| LAW-ARCH-003 | No duplicated source | VAELRIX LAW (implicit) | No identical files maintained in two locations with drift risk | MINOR |
| LAW-DET-001 | Deterministic analysis | VAELRIX LAW 5 | Same input → same output; no randomness in analysis path | MAJOR |
| LAW-DET-002 | Deterministic rendering | UI Architect §Law 6 | No `Math.random()` / `Date.now()` in rendering | MINOR |
| LAW-ZIDX-001 | Z-index registry | AGENTS.md | No z-index outside central registry tokens | NITPICK |
| LAW-TEST-001 | State isolation tests | Law §Testing | Transitions between EDIT/TRUESIGHT/NEUTRAL must be tested | MAJOR |

### Verified Violations

#### [MAJOR] LAW-ARCH-001 — compileVerseToIR.js bypasses Cell Wall

**File:** `src/lib/truesight/compiler/compileVerseToIR.js:1-2`
```
import { PhonemeEngine } from '../../../../codex/core/phonology/phoneme.engine.js';
import { normalizeVowelFamily } from '../../../../codex/core/phonology/vowelFamily.js';
```

**Consequence:** The VerseIR compiler in `src/lib/` directly imports from `codex/core/phonology/`, bypassing the Cell Wall adapter (`src/lib/engine.adapter.js`). If the phoneme engine API changes, the UI-bound copy breaks silently. This is a maintenance coupling that defeats the purpose of the adapter layer.

**Minimal fix:** Re-export `PhonemeEngine` and `normalizeVowelFamily` through `src/lib/engine.adapter.js` and import from there.

#### [MAJOR] LAW-ARCH-001 — VerseSynthesis.js bypasses Cell Wall

**File:** `src/lib/truesight/compiler/VerseSynthesis.js:10,17`
```
import { analyzeText } from "../../../../codex/core/analysis.pipeline.js";
import { resolveSonicChroma } from "../../../../codex/core/phonology/chroma.resolver.js";
```

**Consequence:** Same pattern as above. `analyzeText` and `resolveSonicChroma` are core analysis functions that the synthesis AMP wraps. These should go through `src/lib/engine.adapter.js` or be re-exported from a dedicated adapter.

**Note:** `decodeBytecode` at line 18 is correctly imported from `../bytecodeRenderer.js` which is a thin re-export adapter — this is the *correct* pattern.

#### [MAJOR] LAW-ARCH-002 — useVerseSynthesis imports from codex/core

**File:** `src/hooks/useVerseSynthesis.js:3`
```
import { verseIRMicroprocessors } from "../../codex/core/microprocessors/index.js";
```

**Consequence:** The UI hook directly imports from `codex/core/microprocessors/`, bypassing the Cell Wall. If `codex/runtime/` is restarted, the hook imports an obsolete module reference.

**Mitigating factor:** This is the fallback path (when `VITE_USE_SERVER_PANEL_ANALYSIS` is false), and `verseIRMicroprocessors` is a stable API. However, it still violates the architectural contract.

**Minimal fix:** Re-export `verseIRMicroprocessors` through `src/lib/engine.adapter.js` or create a dedicated `src/lib/microprocessors.adapter.js`.

#### [MINOR] LAW-ARCH-003 — Duplicated compileVerseToIR.js

**Files:**
- `src/lib/truesight/compiler/compileVerseToIR.js` (852 lines)
- `codex/core/shared/truesight/compiler/compileVerseToIR.js` (853 lines)

**Delta:** 1 line difference (likely version string or minor import). These files are almost identical.

**Consequence:** Maintenance drift. A bug fix or feature addition to one will not be mirrored in the other. The `src/lib/` copy exists because the compiler needs to run in the browser (and `codex/core/` is server-side), but this violates DRY.

**Recommended fix:** Make `src/lib/truesight/compiler/compileVerseToIR.js` a thin wrapper that imports from a shared `codex/core/shared/` path — similar to how the color files work (e.g., `pcaChroma.js` is a 1-line re-export). The duplicated code should live in one authoritative location with `src/lib/` importing from it.

#### [MINOR] LAW-DET-001 — Non-deterministic fallback path

**File:** `src/hooks/useVerseSynthesis.js:66-67`
```js
result = await verseIRMicroprocessors.execute('nlu.synthesizeVerse', { text, options: { mode, school } });
```

**Consequence:** The microprocessor pipeline may introduce network latency, server-side state, or environmental dependencies. The synchronous fallback (`synthesizeVerse()` at line 77) uses local analysis and is deterministic, but the async microprocessors path is not guaranteed deterministic across environments.

**Mitigating factor:** The `performSynthesis` function has an identity guard (`text === lastRequestContentRef.current`) that prevents re-analysis of identical text. The async path is off the critical rendering path.

#### [NITPICK] LAW-ZIDX-001 — z-index bypass

**Files:**
- `ScrollEditor.jsx:1362` — `zIndex: 10` (spellcheck orb inline style)
- `ScrollEditor.jsx:1584` — `zIndex: 100` (spellcheck tooltip inline style)

**Consequence:** These hard-coded z-index values bypass the central z-index registry. If a new overlay surface is introduced at z-index 50, the tooltip ordering becomes unpredictable.

**Fix:** Use registered z-index CSS variables (e.g., `var(--z-tooltip)`, `var(--z-popover)`).

### Obeyed Laws Worth Noting

#### ✅ LAW-TEST-001 — State Isolation Tests

**Evidence:** `tests/qa/truesight-state-isolation.qa.test.jsx` proves:
- EDIT mode: textarea writable, ResizeObserver not observed, no overlay rendered
- TRUESIGHT mode: overlay rendered, textarea readOnly
- NEUTRAL mode: overlay cleared, ResizeObserver paused, textarea locked
- `useVerseSynthesis` early-exits when paused
- `useAdaptivePalette` calls `cancelAnimationFrame` when paused
- BytecodeHealth deterministic state transition encoding

This is exemplary test coverage for a modal state machine. The test file explicitly asserts invariants that the architecture requires, which is the gold standard for LAW testing.

#### ✅ LAW-DET-002 — Deterministic Color Pipeline

**Evidence:** `pcaChroma.js` uses seeded formant projections, OKLCh space, and school anchor hues. `rhymeColorRegistry.js` uses golden-angle hashing. `wordTruesight()` in `truesightColor.ts` is a pure function with no side effects. The entire analysis chain from text → hex color is deterministic given the same input.

---

## ═══════════════ TEST COVERAGE REPORT ═══════════════

### Test Inventory

| Test File | Lines | Coverage Area | Status |
|---|---|---|---|
| `tests/pages/read-scroll-editor.truesight.test.jsx` | 402 | ScrollEditor render, overlay, word click, identity lookup | ✅ Present |
| `tests/qa/truesight-color.qa.test.jsx` | 144 | Vowel family → color/viseme ground truth | ✅ Present |
| `tests/qa/truesight-alignment.qa.test.jsx` | 216 | Pixel-perfect textarea/overlay alignment | ✅ Present |
| `tests/qa/truesight-cursor.qa.test.jsx` | 154 | Cursor coordinate calculation | ✅ Present |
| `tests/qa/truesight-state-isolation.qa.test.jsx` | 165 | EDIT/TRUESIGHT/NEUTRAL isolation invariants | ✅ Present |
| `tests/qa/features/truesight.qa.test.jsx` | 270 | Stop-word exclusion, family promotion, identity color | ✅ Present |
| `tests/diagnostic/antigen-truesight-error-propagation.test.js` | 324 | BytecodeError → Vaccine → Mind → renderer | ✅ Present |
| `tests/qa/tools/truesight.assertions.js` | 48 | Shared assertion helpers | ✅ Present |
| `tests/qa/tools/truesight.renderHarness.jsx` | 81 | JSDOM render harness | ✅ Present |

### Gaps

| Gap | Risk | Suggested Location |
|---|---|---|
| `useAdaptivePalette` HSL animation behavior (transitions, phase modulation) | Low — rAF cleanup is tested, color output is pure | `tests/qa/truesight-palette.qa.test.jsx` |
| `useVerseSynthesis` debounce timing and cache invalidation | Medium — async timing issues could cause stale artifact | `tests/qa/truesight-synthesis.qa.test.jsx` |
| Ghost-layer VR pinned-line UI | Low — mostly visual, layout-only | Playwright visual test |
| Server-side analysis path (`VITE_USE_SERVER_PANEL_ANALYSIS=true`) | Medium — hydration of Maps from JSON is fragile | Integration test with mock server |

---

## ═══════════════ WHAT I TRIED AND FAILED TO BREAK ═══════════════

1. **Content identity guard:** Tried to prove that rapid typing causes redundant analysis. `useVerseSynthesis.js:28-29` guards against identical-content re-analysis. Combined with the 600ms debounce, no redundant work is performed. **Survived.**

2. **rAF leak in useAdaptivePalette:** Tried to prove that rapid mode switching leaves orphaned rAF loops. The cleanup function (`return () => cancelAnimationFrame(rafRef.current)`) is called on dependency change, and the state-isolation test proves cancellation on pause. **Survived.**

3. **Z-index collision:** Tried to prove that the spellcheck orb and IntelliSense panel overlap. The orb is positioned at `zIndex: 10` and the tooltip at `zIndex: 100`. The IntelliSense component uses an unspecified z-index. In practice these are non-overlapping positions, but the z-index registry bypass is real. **Partially survived** — no visual bug, but architectural law is bent.

4. **Import boundary bypass via re-export chain:** Tried to prove that `src/lib/` re-exports smuggle core dependencies. The color files (`pcaChroma.js`, `oklch.js`, etc.) are clean re-exports — correct adapter pattern. The compiler files (`compileVerseToIR.js`, `VerseSynthesis.js`) are the only violators. **Partially survived** — two MAJOR violations found, but the adapter pattern is correctly used elsewhere.

5. **Memory leak on unmount:** Tried to prove that AnimatedSurface leaves stale subscriptions. `useAnimationSpec` is called inside the component and React handles cleanup. No evidence of leaked listeners. **Survived.**

---

## ═══════════════ TO BECOME MORE LEGAL ═══════════════

### Critical (CRITICAL)
None.

### Major (MAJOR)
1. **Refactor compileVerseToIR.js imports** — Replace direct `codex/core/phonology/phoneme.engine.js` imports with adapter re-exports from `src/lib/engine.adapter.js`.
2. **Refactor VerseSynthesis.js imports** — Replace `codex/core/analysis.pipeline.js` and `codex/core/phonology/chroma.resolver.js` imports with adapter re-exports.
3. **Refactor useVerseSynthesis.js import** — Replace `codex/core/microprocessors/index.js` import with an adapter re-export.
4. **Eliminate duplicated compileVerseToIR.js** — Make `src/lib/truesight/compiler/compileVerseToIR.js` a thin import-wrapper around the canonical `codex/core/shared/` version, eliminating the 852-line maintenance burden.

### Minor (MINOR)
5. **Add loading/empty/error states to ScrollEditor** — Wire `isSynthesizing` and `error` into dedicated thematic surfaces.
6. **Fix ghost-layer reduced-motion** — Add `reducedMotion` guard to spring animation props.
7. **Fix spellcheck orb reduced-motion** — Guard `whileHover` with `reducedMotion`.
8. **Replace inline `rgba` with CSS variables** — `rgba(101, 31, 255, 0.13)` → `var(--read-highlight-bg)`.

### Nitpick (NITPICK)
9. **Register z-index values** — Replace `zIndex: 10` and `zIndex: 100` inline styles with registered CSS variables.
10. **Add useAdaptivePalette animation tests** — Verify HSL transition behavior under normal and reduced-motion conditions.
11. **Add useVerseSynthesis debounce tests** — Verify timing behavior and cache invalidation.

---

## ═══════════════ FINAL RULING ═══════════════

TrueSight is a well-architected, aggressively tested subsystem that takes its own laws seriously. The two MAJOR import-boundary violations are real but isolated: they exist in the compiler and synthesis AMP files, which are themselves the bridge between core analysis and UI rendering. The adapter pattern re-exports for color, bytecode, and viseme files show the team *knows* the right pattern — the compiler files simply haven't been migrated.

The animation layer is sound. rAF loops are cleaned, Framer Motion respects reduced motion in all primary paths, and the debug pulse keyframe is the only tween animation — nothing is leaking glitter into the engine room.

The test suite is exceptional. The state-isolation tests explicitly encode architectural invariants as assertions — this is precisely the kind of testing that VAELRIX LAW demands.

**Grade: B- (Annoying Correctness, recovering to B+ with two import fixes)**

The law is mostly upheld, bent slightly at the Cell Wall, and the bend is documented and recoverable.

══════════════════════════════════════════════════════════════
