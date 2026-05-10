# PDR-2026-05-08-IDE-BYTECODE-PROFESSIONAL — Gemini Implementation Spec

> **Heuristic Note:** GrimDesign analyzer at `localhost:3000/api/grimdesign/analyze` was unreachable at authoring time. The signal envelope below is heuristic per the `/grimdesign` fallback protocol. Re-run analysis once the dev server is live; signal values may shift but the architecture is stable under any plausible signal.

> **Author:** Claude (UI agent) — per `CLAUDE.md` jurisdiction. **Implementer:** Gemini (substrate, runtime, contracts, tests). **Consumer:** Claude (UI surface bindings, visual regression baselines).

> **Read order:** `SHARED_PREAMBLE.md` → `VAELRIX_LAW.md` → `SCHEMA_CONTRACT.md` → `CLAUDE.md` → `GEMINI.md` → this file.

---

## 0. Mandate

The Read IDE is functional but reads as a *parchment-skinned generic editor*. The user has named the failure mode: it does not yet read as professional grade. Professional-grade in Scholomance is not a visual style — it is **substrate consistency**: every surface is a deterministic projection of phonemic state, no surface is hand-styled, and the system is so internally coherent that no external imitation (Steam / Apple / VS Code) is needed.

This PDR specifies the work Gemini owns to lay that substrate. Claude follows with surface bindings. Codex owns schema review.

The architectural premise:

```
Phonemic Signal (Codex)
   ↓
GrimDesign Decision Layer (Gemini — expanded scope this PDR)
   ↓
Bytecode-Driven CSS Variable Substrate (Gemini — new layer this PDR)
   ↓
IDE Surface Components (Claude — consumes vars, no hex literals)
```

If a surface cannot explain its appearance in terms of a phonemic signal, **it does not belong in the IDE**.

---

## 1. GrimDesign Signal Envelope (target shape)

The current `GrimSignal` is single-component scoped (one chip, one cooldown indicator). For an IDE-scale substrate it must compose. Gemini extends `codex/core/grimdesign/` to emit a *substrate-scoped* signal:

```ts
interface IDEBytecodeSignal {
  version: 'v1.0';
  generatedAt: number;                       // Date.now() at signal emission
  sourceArtifact: string | null;             // verseId or 'idle'
  dominantSchool: SchoolId;                  // resolved from blended HSL
  blendedHsl: { h: number; s: number; l: number };
  schoolWeights: Record<SchoolId, number>;   // 0..1, sums to 1
  phonemicEnergyDensity: number;             // 0..1, derived from syllables/cadence
  syllableCadenceMs: number;                 // dominant rhythmic period
  effectClass: 'INERT' | 'HARMONIC' | 'RESONANT';
  atmosphereLevel: 'NONE' | 'SUBTLE' | 'MODERATE' | 'HEAVY';
  decisions: IDEDesignDecisions;
  provenance: string[];                      // human-readable reasons, append-only
}

interface IDEDesignDecisions {
  // Chrome (IDE shell — topbar, statusbar, sidebar, activity bar)
  chromeColor: string;            // hsl()
  chromeBorderAlpha: number;      // 0..1
  chromeGlowRadius: number;       // px, 0 if INERT
  chromeTransitionMs: number;     // 120..400
  // Editor body
  editorAccentColor: string;
  editorFocusRingColor: string;
  editorFocusRingAlpha: number;
  editorCaretColor: string;
  editorAnimationClass: 'INERT' | 'grim-breathe' | 'grim-pulse' | 'grim-shimmer';
  editorAnimationDurationMs: number;
  // Atmosphere
  vignetteIntensity: number;      // 0..1
  auroraIntensity: number;        // 0..1
  scanlineOpacity: number;        // 0..0.15 (capped)
  // Density
  density: 'COMPACT' | 'COMFORTABLE' | 'SPACIOUS';
  baseLineHeightPx: number;
  // Motion economy
  reducedMotionFallback: { editorAnimationClass: 'INERT' };
}
```

**Determinism contract:** the same input artifact at the same school selection must produce a byte-for-byte identical signal. No `Date.now()` in the decision computation (only in `generatedAt` metadata). No `Math.random()`. Signal hash MUST be stable across runs given the same inputs.

---

## 2. Bytecode-Driven CSS Variable Substrate (the new substrate)

Gemini emits one composite payload from `codex/runtime/ideBytecodeBridge.ts` that the UI applies to `:root` via a new hook `useIDEBytecode()`. The payload binds these CSS variables, all of which are **computed**, not hardcoded:

```css
:root {
  /* IDE chrome — driven by school weights + atmosphere */
  --ide-bytecode-h: <int>;          /* hue of dominant blend */
  --ide-bytecode-s: <int>%;         /* saturation gated by atmosphere */
  --ide-bytecode-l: <int>%;         /* lightness anchored to theme polarity */
  --ide-chrome-bg: hsl(var(--ide-bytecode-h), calc(var(--ide-bytecode-s) * 0.3), 8%);
  --ide-chrome-fg: hsl(var(--ide-bytecode-h), calc(var(--ide-bytecode-s) * 0.5), 75%);
  --ide-chrome-border: hsla(var(--ide-bytecode-h), var(--ide-bytecode-s), 50%, var(--ide-chrome-border-alpha));
  --ide-chrome-border-alpha: 0.18;  /* signal-driven */
  --ide-chrome-glow-radius: 0px;    /* signal-driven */
  --ide-chrome-transition: 200ms;   /* signal-driven */

  /* Editor */
  --ide-editor-accent: <hsl>;
  --ide-editor-focus-ring: <hsla>;
  --ide-editor-caret: gold;          /* preserved from current Truesight law */
  --ide-editor-anim-duration: 1600ms;

  /* Atmosphere */
  --ide-vignette-intensity: 0;       /* 0..1 */
  --ide-aurora-intensity: 0;         /* 0..1 */
  --ide-scanline-opacity: 0;         /* 0..0.15 */

  /* Density */
  --ide-density-row: 28px;           /* computed from baseLineHeightPx */
  --ide-density-pad-x: 12px;
  --ide-density-pad-y: 6px;
}
```

**Critical rule for Claude (downstream):** every existing hex literal and rgba() in `src/pages/Read/IDE.css` that paints chrome must be replaced with one of the above vars. The signal-driven values are the only legal source of color/glow/motion in the IDE.

---

## 3. File-by-File Modification Plan (Gemini deliverables)

### 3.1 NEW — `codex/core/grimdesign/ideSignalCompositor.ts`
Composes `IDEBytecodeSignal` from existing `GrimSignal` outputs across the active scroll. Pure function. No I/O.

**Inputs:** `analyzedDocument`, `selectedSchool`, `userSettings.atmosphereLevel`, `prefersReducedMotion`.
**Outputs:** `IDEBytecodeSignal` (above).
**Contract test:** 12 fixtures × 5 schools × 4 atmosphere levels = 240 deterministic snapshot tests.

### 3.2 NEW — `codex/runtime/ideBytecodeBridge.ts`
Adapter: subscribes to `analyzedDocument` changes via existing `useVerseSynthesis` event stream, debounces to ≥200ms, calls `ideSignalCompositor`, emits to `useIDEBytecode()` consumers.

**Determinism guard:** request-id pattern (per `pathogen.keystroke-critical-path` containment). Stale signals rejected.

### 3.3 NEW — `src/hooks/useIDEBytecode.js`
Thin hook. Subscribes to the runtime, returns the latest `IDEBytecodeSignal`, applies decisions to `document.documentElement.style.setProperty('--ide-bytecode-*', ...)`. Cleanup on unmount.

### 3.4 MODIFY — `codex/core/grimdesign/decisions.ts` (or equivalent existing module)
Extend the decision computation with the IDE-scoped fields enumerated in §1. Keep current per-component decisions intact (`computeChipDecisions` etc.). Add `computeIDEDecisions(signal)`.

### 3.5 NEW — `src/data/atmosphereProfiles.ts`
Static lookup mapping `atmosphereLevel` → `{ vignetteIntensity, auroraIntensity, scanlineOpacity }`. Codex/Gemini owns this table.

| Level | Vignette | Aurora | Scanline |
|---|---|---|---|
| NONE | 0 | 0 | 0 |
| SUBTLE | 0.12 | 0.06 | 0 |
| MODERATE | 0.22 | 0.14 | 0.04 |
| HEAVY | 0.34 | 0.22 | 0.08 |

**Cap:** scanlines NEVER exceed 0.08 opacity (Apple minimalism — they whisper, not shout).

### 3.6 NEW — `tests/codex/grimdesign/ideSignal.test.js`
Determinism tests:
- Same input → identical signal hash (run 100×, assert one unique hash)
- All 5 schools × 4 atmosphere levels produce valid signals (no NaN, no out-of-range)
- `prefersReducedMotion=true` ALWAYS forces `editorAnimationClass = 'INERT'` regardless of effectClass
- Snapshot tests over 12 verse fixtures

### 3.7 NEW — `tests/runtime/ideBytecodeBridge.test.js`
- Stale-signal rejection (request-id guard)
- Debounce timing (≥200ms between emissions)
- Cleanup on unmount

### 3.8 MODIFY — `SCHEMA_CONTRACT.md`
Add the `IDEBytecodeSignal` and `IDEDesignDecisions` interfaces. Codex review required before merge.

---

## 4. Surface Inventory (Claude follow-up — for context only, not Gemini's scope)

The PDR Claude will execute *after* Gemini lands the substrate. Listed here so Gemini knows what consumes his output.

| Surface | File | Current State | Will Become |
|---|---|---|---|
| IDE topbar | `src/pages/Read/IDE.css` `.ide-topbar` | hex literals | `var(--ide-chrome-bg/fg/border)` |
| Status bar | `.ide-statusbar` | hex literals | computed substrate |
| Activity bar | `.ide-activity-bar` | hex + hardcoded transitions | substrate + `--ide-chrome-transition` |
| Sidebar | `.ide-sidebar`, `.sidebar-*` | partial school theming | full substrate consumption |
| Tools sidebar | `src/pages/Read/ToolsSidebar.jsx` + `.sidebar-tool-btn` | static | hover/focus rings via `--ide-editor-focus-ring*` |
| Editor wrapper | `.editor-textarea-wrapper` | static | focus-driven `grim-breathe` (signal-gated) |
| Gutter | `src/pages/Read/Gutter.jsx` | static | density-aware via `--ide-density-row` |
| IntelliSense | `src/components/IntelliSense.jsx` | hardcoded gilding | substrate-driven gilding alpha |
| Floating panels | `.spellcheck-panel` etc. | hardcoded | substrate |
| Toasts | `.toast-*` | hardcoded | substrate-driven success/error/warn vars |

Claude's PDR (separate, follow-on) is the substitution sweep. Zero hex literals will remain in `IDE.css` for chrome. Allow-listed exceptions: pure-black masks, pure-white SVG strokes, brand glyph colors that are explicitly art-directed (≤10 total, all to be enumerated and justified in Claude's follow-up).

---

## 5. Bytecode Determinism Contracts (the load-bearing invariants)

These are the contracts that, if violated, make the system *non-professional* by definition. They are non-negotiable.

### 5.1 Signal hash stability
For any (`analyzedDocument`, `selectedSchool`, `atmosphereLevel`, `prefersReducedMotion`) tuple, `hash(IDEBytecodeSignal)` MUST be identical across runs. Test: 100 invocations, exactly 1 unique hash. If this fails, the IDE is non-deterministic and the substrate guarantee is broken.

### 5.2 No client-side mutation of decisions
Decisions computed by `ideSignalCompositor` are immutable. UI consumes; UI does not modify. Any UI-side adjustment to a decision value is a `pathogen.client-combat-scorer`-class violation and will be caught by Layer 2 immunity.

### 5.3 Reduced motion is total
`prefersReducedMotion=true` MUST collapse `editorAnimationClass` to `INERT` and zero all atmosphere intensities except vignette (which stays for visual hierarchy, not motion). Tested at the compositor layer, not the CSS layer — defense in depth.

### 5.4 Stale-signal rejection
Bridge emits every signal with a monotonic `seq` number. UI hook compares against last applied; older `seq` rejected. Identical stale-response gate as `pathogen.keystroke-critical-path` containment (`ScrollEditor.completionsRequestRef`, `OracleScribe.predictRequestRef`).

### 5.5 Atmosphere caps
Scanline opacity ≤ 0.08, aurora intensity ≤ 0.32, vignette intensity ≤ 0.4. These are *system limits*, not user preferences — they preserve the Apple-restraint posture even when the user sets HEAVY atmosphere. Whatever the user picks, the IDE never screams.

---

## 6. Phased Rollout

**Phase 0 — Schema & Contract (Codex + Gemini, ~½ day)**
- Land §1 schemas in `SCHEMA_CONTRACT.md`
- Codex review pass
- Acceptance: schemas merged, no breaking changes to existing `GrimSignal`

**Phase 1 — Compositor & Tests (Gemini, ~1–2 days)**
- `ideSignalCompositor.ts` + 240 fixture tests
- `atmosphereProfiles.ts`
- Acceptance: 100% determinism, all snapshots green, hash-stability suite passes

**Phase 2 — Bridge & Hook (Gemini, ~½ day)**
- `ideBytecodeBridge.ts` + tests
- `useIDEBytecode.js` + integration test
- Acceptance: stale-signal gate proven via test, debounce timing verified

**Phase 3 — Substrate Application (Claude, ~1–2 days, separate PDR)**
- IDE.css refactor: hex → var
- Visual regression baseline regen
- Acceptance: zero hex literals in chrome paths, all baselines updated

**Phase 4 — Surface Polish (Claude, ~2 days, separate PDR)**
- Per-surface focus rings, density transitions, atmosphere binding
- Acceptance: ToolsSidebar, IntelliSense, Gutter, statusbar, topbar all consume substrate

**Phase 5 — Verification & Sign-Off**
- Visual regression diff review
- Determinism re-test under load (1000 signal emissions)
- Manual UX pass: open Read IDE, switch schools, switch atmosphere levels, type into editor — every transition under 240ms, no jank, no flash-of-unstyled, no off-substrate hex

Total Gemini effort: ~3–4 days. Claude follow-up: ~3–4 days. Codex review: ~½ day.

---

## 7. What This Buys (the why-it's-professional argument)

1. **Determinism is the shield.** The same scroll always renders the same chrome. Two users on two machines see byte-identical IDE state for the same input. That's what professional software does — it does not surprise you.
2. **No taste debt.** No one ever again argues "should the resize handle be more gold?" The signal answers. Disputes collapse to: "is the signal correct?" — a verifiable question.
3. **Atmosphere caps protect the brand.** Even at HEAVY, the IDE never reads as a goth-skinned MUD. The caps in §5.5 are the Apple-restraint floor.
4. **Substrate scales.** Every new surface (pixelbrain, combat, listen) plugs into `useIDEBytecode()` and is automatically professional-consistent. No per-surface theming work.
5. **Audit-friendly.** The signal hash makes every visual state forensically reconstructible. "Why did the IDE look like that on 2026-05-15?" — query the hash, replay the signal.
6. **Anti-imitation.** The IDE will resemble Steam/Apple/VS Code in *posture* (information density, motion economy, restraint) without copying their *vocabulary*. That's a stronger form of professional than imitation — it is *physical consistency with itself*.

---

## 8. QA Checklist (Gemini scope)

- [ ] `IDEBytecodeSignal` and `IDEDesignDecisions` schemas in `SCHEMA_CONTRACT.md`
- [ ] `ideSignalCompositor.ts` is a pure function (no I/O, no `Date.now()` in body, no `Math.random()`)
- [ ] 240 fixture snapshot tests in `tests/codex/grimdesign/ideSignal.test.js`
- [ ] Hash-stability test: 100 runs, 1 unique hash
- [ ] `prefersReducedMotion=true` collapses animations and intensities (tested)
- [ ] `ideBytecodeBridge.ts` request-id guard tested
- [ ] Debounce timing test (≥200ms)
- [ ] No imports from `src/` into `codex/`
- [ ] No `Math.random()` in decision computation (innate immunity rule QUANT-0101)
- [ ] No unseeded clocks in hot path (innate immunity rule QUANT-0102)
- [ ] Atmosphere caps enforced at compositor (not just at CSS) — defense in depth
- [ ] Documentation: Gemini emits a one-page reference at `docs/architecture/IDE_BYTECODE_SUBSTRATE.md` describing how to add new substrate-aware surfaces

---

## 9. Acceptance Criteria (sign-off gate)

The PDR is complete when:

1. **Determinism:** signal hash stable across 100 runs (automated)
2. **Coverage:** 5 schools × 4 atmosphere levels × 12 fixtures = 240 snapshots green
3. **Reduced motion:** verified at compositor layer, not just CSS
4. **No regressions:** all existing `tests/visual/` baselines either unchanged or explicitly re-baselined with diff review
5. **Codex review:** Schema review pass on `SCHEMA_CONTRACT.md` updates
6. **Live test:** open Read IDE, change schools 5×, change atmosphere 4×, type 200 characters — no jank, no off-substrate flash, no inconsistency between chrome elements

When all six pass, this PDR can be filed in `docs/scholomance-encyclopedia/PDR-archive/` and Phase 3 (Claude's substrate-application PDR) can begin.

---

## 10. References & Cross-Links

- `CLAUDE.md` — UI agent jurisdiction (this PDR is consumed by Claude)
- `GEMINI.md` — backend agent playbook (Gemini executes Phases 0–2)
- `SCHEMA_CONTRACT.md` — schemas to be amended
- `VAELRIX_LAW.md` — global law (determinism, immunity, world-law fidelity)
- `codex/core/immunity/pathogenRegistry.js` — pathogen vector reference (esp. `pathogen.keystroke-critical-path`, `pathogen.client-combat-scorer`)
- `docs/scholomance-encyclopedia/PDR-archive/grimdesign_pdr.md` — original GrimDesign PDR (extends here)
- `docs/scholomance-encyclopedia/PDR-archive/adaptive_palette_pdr.md` — palette computation (signal source)
- `docs/scholomance-encyclopedia/PDR-archive/animation_amp_pdr.md` — animation envelope (motion economy contract)
- `docs/scholomance-encyclopedia/PDR-archive/collab_vscode_experience_pdr.md` — prior IDE-shape work

---

**Status:** READY FOR GEMINI PHASE 0 KICKOFF.
**Filed:** `docs/scholomance-encyclopedia/PDR-2026-05-08-IDE-BYTECODE-PROFESSIONAL.md`
**Authoring agent:** Claude (UI)
**Implementing agent:** Gemini (substrate)
**Reviewing agent:** Codex (schema)
