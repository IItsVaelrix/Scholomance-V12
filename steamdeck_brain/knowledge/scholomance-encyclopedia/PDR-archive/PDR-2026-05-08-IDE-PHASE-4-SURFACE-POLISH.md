# PDR-2026-05-08-IDE-PHASE-4-SURFACE-POLISH — Claude Implementation Spec

> **Successor to:** `PDR-2026-05-08-IDE-PHASE-3-SUBSTRATE-APPLICATION.md`
> **Author / Implementer:** Claude (UI agent)
> **Prerequisite:** Phase 3 complete (zero off-substrate hex on chrome paths)
> **Sibling reference:** Parent PDR `PDR-2026-05-08-IDE-BYTECODE-PROFESSIONAL.md` §1 (signal), §2 (substrate)

---

## 0. Mandate

Phase 3 made the IDE *correct* (every surface paints from signal). Phase 4 makes it *expressive* — the substrate breathes. Each surface gains its motion economy, focus rhythm, density transition, and atmosphere binding.

Phase 4 is where the IDE crosses from "professionally consistent" to "professionally alive." Without it, the substrate is a corpse — well-organized but inert. With it, the IDE inhales when the user focuses the editor, exhales when they pin a rhyme group, and modulates density when the verse becomes phonemically dense.

The constraint: motion is expressive, **never decorative**. If a movement cannot be explained by a phonemic signal change, it does not belong.

---

## 1. Surface Polish Inventory

Eight surfaces, each with a single-page sub-spec below.

| Surface | Files | Polish work |
|---|---|---|
| 1.1 Editor body | `ScrollEditor.jsx`, `IDE.css` `.editor-textarea*` | Focus-driven `grim-breathe`, signal-bound caret, density row height |
| 1.2 Gutter | `Gutter.jsx`, `.editor-gutter*` | Density-aware row height, syllable-count typography |
| 1.3 Tools sidebar | `ToolsSidebar.jsx`, `.tools-sidebar*` | Hover/focus rings, active-state pulse, status-dot motion |
| 1.4 IntelliSense | `IntelliSense.jsx` | Gilding alpha breathing, badge motion economy, scroll lock |
| 1.5 Topbar | `IDE.css` `.ide-topbar*` | Logo weight transitions, school badge, atmosphere toggle motion |
| 1.6 Statusbar | `.ide-statusbar*` | Telemetry typography per density, status-chip motion |
| 1.7 Floating panels | `.spellcheck-panel`, `.spellcheck-tooltip`, FloatingPanel | Substrate-derived shadows, panel transitions |
| 1.8 Atmosphere primitives | NEW: `AtmosphereLayer.jsx` + CSS | Vignette mask, aurora canvas, scanlines as composable layers |

---

## 1.1 Editor Body

**Goal:** when the editor has focus, the textarea-wrapper border breathes with `grim-breathe` at 1600ms tied to the signal's `editorAnimationClass`. When focus leaves, it settles to INERT.

**Files:**
- `src/pages/Read/ScrollEditor.jsx` — add `data-focused` attribute reflecting `:focus-within`
- `src/pages/Read/IDE.css` — add `.editor-textarea-wrapper[data-focused="true"]` rule

**JSX delta (ScrollEditor.jsx, near `<div ref={wrapperRef} className="editor-textarea-wrapper">`):**
```jsx
const [isFocused, setIsFocused] = useState(false);
// pass to wrapper
<div
  ref={wrapperRef}
  className="editor-textarea-wrapper"
  data-focused={isFocused}
  onFocusCapture={() => setIsFocused(true)}
  onBlurCapture={(e) => {
    // only blur when focus leaves the wrapper entirely
    if (!wrapperRef.current?.contains(e.relatedTarget)) setIsFocused(false);
  }}
>
```

**CSS delta:**
```css
.editor-textarea-wrapper {
  border: 1px solid var(--ide-chrome-border);
  transition: border-color var(--ide-chrome-transition),
              box-shadow var(--ide-chrome-transition);
}

.editor-textarea-wrapper[data-focused="true"] {
  border-color: var(--ide-editor-focus-ring);
  box-shadow: 0 0 0 2px hsla(
    var(--ide-bytecode-h),
    var(--ide-bytecode-s),
    50%,
    var(--ide-editor-focus-ring-alpha)
  );
}

@media (prefers-reduced-motion: no-preference) {
  .editor-textarea-wrapper[data-focused="true"] {
    animation: grim-breathe var(--ide-editor-anim-duration, 1600ms) ease-in-out infinite;
  }
}

@keyframes grim-breathe {
  0%, 100% {
    box-shadow: 0 0 0 2px hsla(var(--ide-bytecode-h), var(--ide-bytecode-s), 50%, calc(var(--ide-editor-focus-ring-alpha) * 0.5));
  }
  50% {
    box-shadow: 0 0 0 3px hsla(var(--ide-bytecode-h), var(--ide-bytecode-s), 50%, var(--ide-editor-focus-ring-alpha));
  }
}
```

**Reduced motion:** the `@media (prefers-reduced-motion: no-preference)` gate disables the animation; static focus ring still applies. **Determinism:** `var(--ide-editor-anim-duration)` comes from signal; if signal forces INERT (via reduced-motion at compositor), the animation duration is set to `0s` and the `@keyframes` is a no-op.

---

## 1.2 Gutter

**Goal:** row height responds to signal `density`. Syllable counts use mono font weight that shifts with `phonemicEnergyDensity`.

**CSS delta (IDE.css `.gutter-row` and `.syllable-count-mini`):**
```css
.gutter-row {
  min-height: var(--ide-density-row);
  height: var(--ide-density-row);
  padding-inline: var(--ide-density-pad-x);
  transition: min-height var(--ide-chrome-transition),
              padding-inline var(--ide-chrome-transition);
}

.syllable-count-mini {
  font-weight: calc(400 + (var(--ide-phonemic-energy, 0) * 200));
  /* signal-driven: low energy → 400, high energy → 600 */
  opacity: calc(0.5 + (var(--ide-phonemic-energy, 0) * 0.5));
  transition: font-weight var(--ide-chrome-transition),
              opacity var(--ide-chrome-transition);
}
```

**Substrate addition (Gemini, retroactive — flag in Phase 3 review):**
The compositor must emit `--ide-phonemic-energy` (0..1) so gutter typography can resolve it. If absent, default 0 → minimum weight, half opacity.

---

## 1.3 Tools Sidebar

**Goal:** every interactive button in `ToolsSidebar.jsx` gets a substrate-bound focus ring, hover state, and active-state visual pulse. Status dots animate when state changes.

**CSS delta:**
```css
.sidebar-tool-btn {
  border: 1px solid transparent;
  transition: background-color var(--ide-chrome-transition),
              border-color var(--ide-chrome-transition),
              transform var(--ide-chrome-transition);
}

.sidebar-tool-btn:hover {
  background-color: hsla(var(--ide-bytecode-h), var(--ide-bytecode-s), 50%, 0.06);
  border-color: var(--ide-chrome-border);
}

.sidebar-tool-btn:focus-visible {
  outline: 2px solid var(--ide-editor-focus-ring);
  outline-offset: 2px;
}

.sidebar-tool-btn.active {
  background-color: hsla(var(--ide-bytecode-h), var(--ide-bytecode-s), 50%, 0.12);
  border-color: var(--ide-editor-accent);
}

@media (prefers-reduced-motion: no-preference) {
  .sidebar-tool-btn.active::before {
    /* subtle leftward edge accent that pulses on activation */
    content: '';
    position: absolute;
    inset-block: 0;
    inset-inline-start: 0;
    width: 2px;
    background: var(--ide-editor-accent);
    animation: grim-pulse 2400ms ease-in-out infinite;
  }
}

.status-dot {
  transition: background-color var(--ide-chrome-transition),
              box-shadow var(--ide-chrome-transition);
}

.status-dot.on {
  background-color: var(--ide-status-success);
  box-shadow: 0 0 var(--ide-chrome-glow-radius, 0px) var(--ide-status-success);
}

.status-dot.off {
  background-color: var(--ide-chrome-border);
}
```

**Accessibility:** focus-visible outline always renders (not gated by reduced-motion). `aria-pressed` already on toggle buttons via existing JSX.

---

## 1.4 IntelliSense

**Goal:** the gilding edge breathes when suggestions arrive (signal: completion event); list items modulate hover state via substrate; resize handle becomes a substrate-bound corner flourish.

**CSS delta (IntelliSense.css or co-located):**
```css
.intellisense {
  background: var(--ide-chrome-bg);
  border: 1px solid var(--ide-chrome-border);
  box-shadow: 0 12px 40px hsla(0, 0%, 0%, 0.4),
              0 0 0 1px hsla(var(--ide-bytecode-h), var(--ide-bytecode-s), 50%, 0.06);
  transition: opacity var(--ide-chrome-transition),
              transform var(--ide-chrome-transition);
}

.intellisense-gilding {
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    var(--ide-editor-accent) 30%,
    var(--ide-editor-accent) 70%,
    transparent
  );
  opacity: 0.7;
}

@media (prefers-reduced-motion: no-preference) {
  .intellisense-gilding {
    animation: grim-shimmer 800ms ease-in-out 1;
    /* fires once on mount; existing Framer Motion handles enter transition */
  }
}

.intellisense-item {
  transition: background-color var(--ide-chrome-transition),
              padding-inline var(--ide-chrome-transition);
  padding-inline: var(--ide-density-pad-x);
}

.intellisense-item--active,
.intellisense-item:hover {
  background-color: hsla(var(--ide-bytecode-h), var(--ide-bytecode-s), 50%, 0.10);
}

.intellisense-item--rhyme {
  border-left: 2px solid var(--ide-editor-accent);
}

.intellisense-item--correction {
  border-left: 2px solid var(--ide-status-warn);
}

.intellisense-resize {
  /* corner flourish — substrate-bound */
  background: linear-gradient(
    -45deg,
    transparent 50%,
    var(--ide-chrome-border) 50%,
    var(--ide-chrome-border) 60%,
    transparent 60%
  );
}
```

**Motion economy:** gilding shimmers **once** on mount, not in a loop. Loop animations are reserved for *active states* (focused editor) — anything else is decoration and forbidden.

---

## 1.5 Topbar

**Goal:** logo weight shifts at the user-perceptible threshold when `dominantSchool` changes; school badge transitions smoothly.

**CSS delta:**
```css
.ide-topbar {
  background: var(--ide-chrome-bg);
  border-block-end: 1px solid var(--ide-chrome-border);
  transition: border-color var(--ide-chrome-transition);
}

.ide-title {
  font-family: var(--font-display);
  color: var(--ide-chrome-fg);
  font-weight: calc(400 + (var(--ide-phonemic-energy, 0) * 100));
  transition: font-weight var(--ide-chrome-transition);
}

.ide-atmos-btn {
  border: 1px solid var(--ide-chrome-border);
  background: transparent;
  color: var(--ide-chrome-fg);
  transition: background-color var(--ide-chrome-transition),
              border-color var(--ide-chrome-transition);
}

.ide-atmos-btn:hover {
  background-color: hsla(var(--ide-bytecode-h), var(--ide-bytecode-s), 50%, 0.06);
}

.ide-atmos-btn--level-2 {
  border-color: var(--ide-editor-accent);
}
```

---

## 1.6 Statusbar

**Goal:** telemetry typography density-bound; status chips animate state changes; saving indicator uses signal-derived color.

**CSS delta:**
```css
.ide-statusbar {
  background: var(--ide-chrome-bg);
  border-block-start: 1px solid var(--ide-chrome-border);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  padding: var(--ide-density-pad-y) var(--ide-density-pad-x);
  transition: padding var(--ide-chrome-transition);
}

.status-item {
  color: var(--ide-chrome-fg);
  transition: color var(--ide-chrome-transition);
}

.syllable-status .syllable-count-value {
  font-weight: 600;
  color: var(--ide-editor-accent);
}

.ide-statusbar [data-saving="true"] {
  color: var(--ide-status-info);
}

.ide-statusbar [data-saving="error"] {
  color: var(--ide-status-error);
}
```

---

## 1.7 Floating Panels

**Goal:** drop shadows derive from substrate; panel transitions consistent; spellcheck tooltip on `--ide-status-error`.

**CSS delta:**
```css
.spellcheck-panel,
.spellcheck-tooltip,
.floating-panel {
  background: var(--ide-chrome-bg);
  border: 1px solid var(--ide-chrome-border);
  box-shadow:
    0 12px 40px hsla(0, 0%, 0%, 0.4),
    0 0 0 1px hsla(var(--ide-bytecode-h), var(--ide-bytecode-s), 50%, 0.04);
  transition: opacity var(--ide-chrome-transition),
              transform var(--ide-chrome-transition);
}

.spellcheck-tooltip {
  border-color: var(--ide-status-error);
}

.error-word--interactive {
  color: var(--ide-status-error);
  cursor: pointer;
}

.error-word--interactive:hover {
  background-color: hsla(0, 70%, 60%, 0.12);
}
```

---

## 1.8 Atmosphere Primitives (NEW component)

**Goal:** vignette, aurora, scanlines become discrete *composable layers* — independently togglable, signal-bound, motion-economy-aware.

**New file:** `src/components/AtmosphereLayer.jsx`

```jsx
import { useIDEBytecode } from '../hooks/useIDEBytecode';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

export default function AtmosphereLayer() {
  const signal = useIDEBytecode();
  const reducedMotion = usePrefersReducedMotion();

  // Reduced motion zeros aurora/scanline (preserves vignette for hierarchy)
  const aurora = reducedMotion ? 0 : signal?.decisions.auroraIntensity ?? 0;
  const scanline = reducedMotion ? 0 : signal?.decisions.scanlineOpacity ?? 0;
  const vignette = signal?.decisions.vignetteIntensity ?? 0;

  return (
    <div className="atmosphere-layer" aria-hidden="true">
      {vignette > 0 && (
        <div
          className="atmosphere-vignette"
          style={{ '--atmos-vignette': vignette }}
        />
      )}
      {aurora > 0 && (
        <div
          className="atmosphere-aurora"
          style={{ '--atmos-aurora': aurora }}
        />
      )}
      {scanline > 0 && (
        <div
          className="atmosphere-scanline"
          style={{ '--atmos-scanline': scanline }}
        />
      )}
    </div>
  );
}
```

**CSS delta (new file `src/components/AtmosphereLayer.css`):**
```css
.atmosphere-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: -1; /* behind all content */
}

.atmosphere-vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse at center,
    transparent 40%,
    hsla(0, 0%, 0%, calc(var(--atmos-vignette) * 0.6)) 100%
  );
}

.atmosphere-aurora {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(
      ellipse 80% 50% at 50% 0%,
      hsla(var(--ide-bytecode-h), var(--ide-bytecode-s), 50%, calc(var(--atmos-aurora) * 0.3)) 0%,
      transparent 60%
    ),
    radial-gradient(
      ellipse 60% 40% at 80% 100%,
      hsla(var(--ide-bytecode-h), var(--ide-bytecode-s), 50%, calc(var(--atmos-aurora) * 0.2)) 0%,
      transparent 50%
    );
}

@media (prefers-reduced-motion: no-preference) {
  .atmosphere-aurora {
    animation: aurora-drift 24000ms ease-in-out infinite alternate;
  }
}

@keyframes aurora-drift {
  0%   { transform: translate3d(0, 0, 0); }
  100% { transform: translate3d(2%, 1%, 0); }
}

.atmosphere-scanline {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent 0px,
    transparent 2px,
    hsla(0, 0%, 100%, calc(var(--atmos-scanline) * 0.6)) 2px,
    hsla(0, 0%, 100%, calc(var(--atmos-scanline) * 0.6)) 3px
  );
  mix-blend-mode: overlay;
}
```

**Mount point:** `src/App.jsx` near the route shell, OUTSIDE all page transitions, so atmosphere persists across navigation. Single instance, lives at app root.

**Cap enforcement:** the substrate compositor (Gemini) caps these per parent PDR §5.5; AtmosphereLayer trusts the signal. No client-side capping (would be a `pathogen.client-combat-scorer`-class violation).

---

## 2. Cross-Cutting Concerns

### 2.1 Reduced motion is total
Every animation in this PDR is wrapped in `@media (prefers-reduced-motion: no-preference)`. AtmosphereLayer also zeros aurora/scanline at the JSX layer for defense in depth. Vignette stays for hierarchy.

### 2.2 No inline styles for state
All state changes flow through CSS classes or `data-*` attributes. The only inline styles allowed are CSS-variable bindings (`style={{'--atmos-vignette': 0.2}}`) — these are signal-derived numeric values, not state.

### 2.3 ARIA preserved
Every existing ARIA label and `aria-pressed` is preserved. Phase 4 adds `aria-hidden="true"` to AtmosphereLayer (decorative). No new ARIA regressions.

### 2.4 Determinism downstream
Every animation duration, every motion-economy decision, traces to a signal value. No magic numbers in CSS that aren't either:
- A substrate-derived `var()`
- A semantic token (`--text-xs`, `--space-4`)
- A reduced-motion-gated `@keyframes` value

---

## 3. Acceptance Criteria

Phase 4 is complete when:

- [ ] All 8 surfaces from §1 modified per spec
- [ ] AtmosphereLayer mounted at app root; signal-bound; vignette / aurora / scanline gated correctly
- [ ] `prefers-reduced-motion: reduce` disables every loop animation; static focus rings remain
- [ ] No new inline-style state (only numeric var bindings)
- [ ] `npm run lint` passes with `--max-warnings=0`
- [ ] `npm run test` passes (no behavior regressions)
- [ ] Visual regression baselines updated and reviewed
- [ ] Manual UX pass:
  - Focus the editor → border breathes (1600ms cycle)
  - Switch schools → topbar/sidebar accents transition smoothly within 200ms
  - Switch atmosphere from NONE → SUBTLE → MODERATE → HEAVY → vignette/aurora/scanline scale linearly, capped per parent PDR §5.5
  - Toggle reduced-motion → all loop animations cease; focus rings remain visible
- [ ] axe-core a11y sweep stays green
- [ ] No `pathogen.*` violations on Layer 2 immunity scan of modified files

---

## 4. Risk Register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Aurora drift animation causes mobile battery drain | Med | Cap `aurora-drift` at 24s cycle (slower than typical battery threshold); test on low-end device |
| Scanline `mix-blend-mode: overlay` performance on Safari | Med | Provide `@supports (mix-blend-mode: overlay)` fallback; degrade to plain alpha |
| Editor `grim-breathe` distracts during typing | Med | Animation gated by `:focus-within`; disabled during active keystroke (extension via JS class `data-typing="true"` if QA flags) |
| IntelliSense gilding shimmer-on-mount fires too often (per re-render) | Low | Use `useEffect` mount-only trigger; CSS animation fires once per element instantiation |
| AtmosphereLayer z-index conflicts with existing layers | Low | Use `Z_*` constants from `src/data/stacking_tiers` |

---

## 5. Estimated Effort

| Surface | Estimate |
|---|---|
| 1.1 Editor body | 2 hr |
| 1.2 Gutter | 1 hr |
| 1.3 Tools sidebar | 2 hr |
| 1.4 IntelliSense | 2 hr |
| 1.5 Topbar | 1 hr |
| 1.6 Statusbar | 1 hr |
| 1.7 Floating panels | 1 hr |
| 1.8 Atmosphere primitives (NEW) | 3–4 hr |
| Visual regression + manual UX | 3 hr |
| **Total** | **16–18 hr (~2 days)** |

---

## 6. After Phase 4

The IDE is now:
- **Substrate-correct** (Phase 3): every paint traces to signal
- **Substrate-expressive** (Phase 4): every motion traces to signal
- **Substrate-composed** (parent §1): the signal itself is deterministic

The system is professional-grade by structural definition: **no surface in the IDE can deviate from the world-law without violating a contract that has a test for it**.

What remains is **breadth**:
- Apply substrate to non-IDE surfaces (Combat, Listen, PixelBrain, Career)
- Each becomes its own follow-on PDR, each consumes `useIDEBytecode()` (or a sister hook scoped to that page)
- The substrate scales horizontally because it is signal-driven, not surface-coupled

---

## 7. References

- Parent: `PDR-2026-05-08-IDE-BYTECODE-PROFESSIONAL.md`
- Predecessor: `PDR-2026-05-08-IDE-PHASE-3-SUBSTRATE-APPLICATION.md`
- `CLAUDE.md` (UI agent jurisdiction, motion economy law, accessibility)
- `VAELRIX_LAW.md` (determinism shield, anti-decoration rule)
- `codex/core/immunity/pathogenRegistry.js` (`pathogen.client-combat-scorer` — no client-side decision mutation)
- `docs/scholomance-encyclopedia/PDR-archive/animation_amp_pdr.md` (motion envelope)
- `src/hooks/usePrefersReducedMotion.js` (existing reduced-motion gate)
- `src/data/stacking_tiers.js` (z-index constants)

---

**Status:** READY (blocked on Phase 3 acceptance).
**Filed:** `docs/scholomance-encyclopedia/PDR-2026-05-08-IDE-PHASE-4-SURFACE-POLISH.md`
