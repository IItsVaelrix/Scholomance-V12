# PDR-2026-05-08-IDE-PHASE-3-SUBSTRATE-APPLICATION — Claude Implementation Spec

> **Successor to:** `PDR-2026-05-08-IDE-BYTECODE-PROFESSIONAL.md` (parent, defines substrate)
> **Author / Implementer:** Claude (UI agent)
> **Prerequisite:** Gemini Phases 0–2 complete; `--ide-bytecode-*` and `--ide-chrome-*` variables emitting from `useIDEBytecode()` and applied to `:root`
> **Read order:** parent PDR §1 (signal envelope) → §2 (substrate vars) → this file

---

## 0. Mandate

Apply the bytecode-driven substrate to every chrome surface in the Read IDE. After Phase 3, **zero hardcoded color values paint chrome**. Every `background-color`, `color`, `border`, `box-shadow`, and `outline` on a chrome surface must trace to a substrate variable, a school variable, or an explicitly justified allow-listed exception.

This is the **substitution sweep**: a mechanical, auditable refactor of `src/pages/Read/IDE.css` (and adjacent CSS files) where hand-picked colors are replaced by signal-derived ones.

---

## 1. Inventory (concrete starting state — `IDE.css` 5096 lines)

| Literal kind | Occurrences | Disposition |
|---|---|---|
| `#hex` colors | 63 | substitute |
| `rgba(...)` | 333 | substitute |
| `hsla(...)` | 89 | substitute (most are already hue-bearing — easiest port) |
| Existing `var(--ritual/--ide/--school-*)` | 18 | already-correct; preserve |

**Adjacent files in scope** (also painted as IDE chrome):
- `src/pages/Read/ReadPage.jsx` inline styles → already minimal; audit only
- `src/components/IntelliSense.css` (if present) → in scope
- `src/index.css` global tokens → preserve; expand if substrate needs new tokens

**Out of scope for Phase 3** (handled in Phase 4 polish):
- Per-surface focus-ring tuning
- Motion economy / animation timing
- Density transitions
- Atmosphere primitives (vignette, aurora, scanlines as discrete layers)

---

## 2. Substitution Map (the contract)

Every literal is replaced according to this map. Implementation MUST not deviate without an entry in §3 (allow-list).

### 2.1 Surface roles → variables

| Surface role | Old literal pattern (typical) | New variable |
|---|---|---|
| Chrome background (topbar, statusbar, sidebar shell) | `#0e0d10`, `#1a1916`, `rgba(0,0,0,0.8)` | `var(--ide-chrome-bg)` |
| Chrome foreground (label text, telemetry) | `#ede8d4`, `#cdc5a8`, `#a89d80` | `var(--ide-chrome-fg)` *or* `var(--text-secondary)` |
| Chrome border (panel separators, hairlines) | `rgba(255,255,255,0.08)`, `#3a3530` | `var(--ide-chrome-border)` |
| Chrome glow (active state ring) | `rgba(213,179,75,0.3)` | `var(--ide-editor-focus-ring)` w/ alpha from `--ide-editor-focus-ring-alpha` |
| Chrome transition timing | `transition: 0.2s` | `transition: var(--ide-chrome-transition)` |
| Active accent (selected nav item, active tool) | `#d5b34b`, `#c9a84c` | `var(--ide-editor-accent)` |
| School-themed surface (oracle search by `data-school`) | per-school hex blocks | `var(--school-primary)` / `var(--school-glow)` (already partially in place — finish the sweep) |
| Toast — success | `#4ab46e` | `var(--ide-status-success)` *new* |
| Toast — error | `#ef4444`, `#ff4d4d` | `var(--ide-status-error)` *new* |
| Toast — warn | `#ffd65a`, `#e8b84a` | `var(--ide-status-warn)` *new* |
| Spellcheck error | `#ef4444` | `var(--ide-status-error)` |
| Caret | `gold` | `var(--ide-editor-caret)` (already aligned) |

### 2.2 New semantic vars Claude adds to `index.css`

These are **derived** from the substrate but expose semantic meaning at the consumption site. They live in `:root` and resolve via `var(--ide-bytecode-*)`:

```css
:root {
  /* Semantic status colors — derived, not signal-driven */
  --ide-status-success: hsl(142, 50%, 56%);
  --ide-status-error:   hsl(0, 70%, 60%);
  --ide-status-warn:    hsl(40, 80%, 60%);
  --ide-status-info:    hsl(220, 60%, 65%);

  /* Density tokens (bound to signal at runtime; defaults here are COMFORTABLE) */
  --ide-density-row:   var(--ide-density-row, 28px);
  --ide-density-pad-x: var(--ide-density-pad-x, 12px);
  --ide-density-pad-y: var(--ide-density-pad-y, 6px);
  --ide-density-gap:   var(--ide-density-gap, 8px);
}
```

The `--ide-status-*` vars are **fixed semantic colors** (success/error/warn don't morph with school — accessibility / pattern recognition). All other surfaces resolve to substrate.

---

## 3. Allow-List of Preserved Literals (max 10)

Hardcoded values that survive Phase 3. Each one named, justified, scoped.

| # | File:line (after refactor) | Value | Justification |
|---|---|---|---|
| 1 | `IDE.css` `.intellisense-gilding` | `gold` keyword | Brand mark — gold leaf gilding is identity, not theme |
| 2 | `IDE.css` `.editor-textarea.truesight-transparent` | `caret-color: gold` | TrueSight-mode caret law (preserved per `CLAUDE.md` §Truesight) |
| 3 | `IDE.css` SVG mask backgrounds | `#000` / `#fff` | Pure black/white masks for compositing — not surface color |
| 4 | `IDE.css` `.toast-item--success` accent | `#4ab46e` → `var(--ide-status-success)` | (substituted; not preserved — example of correct conversion) |
| 5–10 | _reserved_ | — | Add only with PR-time justification |

**Rule:** any literal not on this allow-list at PR review must be substituted before merge.

---

## 4. Methodology (how Claude executes)

The refactor is mechanical and auditable. Six passes, each landed as its own commit on a branch (`ide-substrate-application`):

### Pass 1 — Chrome shell (~600 lines of IDE.css)
Topbar, statusbar, activity bar, sidebar shell, panel resize handle, main panel-group bg.
- Replace `#hex` chrome bg → `var(--ide-chrome-bg)`
- Replace chrome fg → `var(--ide-chrome-fg)` or `var(--text-secondary)`
- Replace hairline borders → `var(--ide-chrome-border)`
- **Smoke test:** Read IDE renders identically (visually) before signal-driven values diverge from defaults

### Pass 2 — Editor body (~400 lines)
`.editor-textarea-wrapper`, `.editor-textarea`, `.editor-gutter`, `.gutter-track`, `.gutter-row`.
- Caret already correct; verify only
- Focus ring → `var(--ide-editor-focus-ring)`
- Selection background → derived `var(--ide-editor-accent)` w/ 0.18 alpha

### Pass 3 — Sidebar tools (~500 lines)
`.tools-sidebar`, `.sidebar-tool-btn`, `.toolbar-btn`, `.format-toolbar`.
- Hover/active states → substrate
- Status dots → semantic status vars

### Pass 4 — Oracle search panel (~1500 lines, school-themed)
Already partially school-aware; complete the sweep so every per-school hex block resolves via `var(--school-primary)` / `var(--school-glow)` / `var(--school-accent)`.

### Pass 5 — IntelliSense + floating panels + toasts (~600 lines)
`.intellisense-*`, `.spellcheck-panel`, `.spellcheck-tooltip`, `.toast-*`.
- IntelliSense gilding alpha bound to substrate
- Toasts on `var(--ide-status-*)` semantic vars
- Floating panel shadows on substrate-derived `box-shadow`

### Pass 6 — Audit & lint
- `grep -E "#[0-9a-fA-F]{3,8}|rgba?\(" src/pages/Read/IDE.css` returns ≤10 lines (allow-list only)
- ESLint pass (no warnings)
- Manual visual sweep: school switch 5×, atmosphere 4×, no flash-of-unsubstrate

---

## 5. Visual Regression Strategy

**Pre-flight:**
1. Run full visual regression suite against `master` to capture **before** baselines:
   ```
   npx playwright test tests/visual/ --update-snapshots
   ```
2. Commit baselines as `tests/visual/baselines/pre-substrate-2026-05-08/` (manual archive — for retro comparison only, not a test path)

**During each pass:**
- Run only the affected baselines (`read-page.spec.js`, `scroll-editor.spec.js`, `read-layout-regression.spec.js`)
- Diff each against pre-substrate archive
- Acceptable diff: any change must be **explainable** by a substrate value (e.g., "chrome border alpha shifted from 0.08 to 0.12 because signal default is 0.18 capped by atmosphere SUBTLE")
- Unexplainable diff = bug; fix before continuing

**Post-Phase 3:**
- Regenerate all baselines (one commit, message: `chore(visual): re-baseline IDE after substrate application`)
- Tag the commit `ide-substrate-application-baseline-2026-05-08`

**Affected baseline files:**
- `tests/visual/read-page.spec.js`
- `tests/visual/scroll-editor.spec.js`
- `tests/visual/read-layout-regression.spec.js`
- `tests/visual/viewport-precision-audit.spec.js`
- `tests/visual/read-page.spec.js-snapshots/` (snapshot directory)

---

## 6. Acceptance Criteria

Phase 3 is complete when **all** are true:

- [ ] `grep -cE "#[0-9a-fA-F]{3,8}" src/pages/Read/IDE.css` ≤ 4 (allow-list count)
- [ ] `grep -cE "rgba?\(" src/pages/Read/IDE.css` ≤ 10 (allow-list count for SVG masks / brand marks)
- [ ] All chrome surfaces consume `--ide-chrome-*` vars
- [ ] All semantic status surfaces consume `--ide-status-*` vars
- [ ] `npm run lint` passes with `--max-warnings=0`
- [ ] Visual regression baselines updated and reviewed
- [ ] Manual UX pass: open Read IDE, switch schools 5×, switch atmosphere 4× — no flash, no jank, every transition under `var(--ide-chrome-transition)` (default 200ms)
- [ ] No new ARIA regressions (axe-core sweep stays green)
- [ ] PR includes a one-page change-log itemizing every literal substituted (auto-generated from grep diff)

---

## 7. Risk Register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Substrate vars not yet emitting (Gemini incomplete) | Med | Block Phase 3 start until Phase 2 acceptance signed |
| Visual regression false positives (sub-pixel rounding) | Med | Use `maxDiffPixelRatio: 0.001` in Playwright; accept micro-diffs |
| School-themed oracle blocks resist mechanical sweep | Med | Per-school blocks already isolated by `data-school` attr; substitute one school at a time |
| Toast color regression breaks pattern recognition | Low | Semantic vars are fixed (not signal-driven); test at every density level |
| Browser fallback for unsupported `hsl(var() var() var())` syntax | Low | Modern browsers fully support; provide `@supports` fallback only if QA flags |

---

## 8. Out-of-Scope (deferred to Phase 4)

- Focus-ring animation timing — Phase 4
- IntelliSense scroll-lock motion economy — Phase 4
- Gutter density-aware row height transitions — Phase 4
- Editor `grim-breathe` on focus — Phase 4
- Atmosphere primitives as discrete layers (vignette mask div, aurora canvas, scanline overlay) — Phase 4
- Reduced-motion total fallback at the visual layer — Phase 4

---

## 9. Estimated Effort

| Pass | Estimate | Notes |
|---|---|---|
| 1 — Chrome shell | 3–4 hr | Largest LOC but most mechanical |
| 2 — Editor body | 2 hr | Small surface, careful with caret/focus |
| 3 — Sidebar tools | 2–3 hr | Many buttons, states |
| 4 — Oracle search | 4–5 hr | School-themed blocks; care with `data-school` cascade |
| 5 — IntelliSense + panels + toasts | 2 hr | Smaller surface |
| 6 — Audit & baseline regen | 1–2 hr | Includes visual review |
| **Total** | **14–18 hr (~2 days)** | Single-agent, single-branch |

---

## 10. Handoff to Phase 4

When Phase 3 lands:
- Substrate vars consumed everywhere
- All chrome paints from signal
- Foundation ready for the **expressive** layer

Phase 4 (next PDR) adds the *motion / density / atmosphere* polish that makes the substrate feel professional at the human-perception layer — focus rings that breathe with the active scroll's school, density that shifts with verse cadence, atmosphere primitives that compose the world-law into the chrome.

---

**Status:** READY (blocked on Gemini Phase 2 acceptance).
**Filed:** `docs/scholomance-encyclopedia/PDR-2026-05-08-IDE-PHASE-3-SUBSTRATE-APPLICATION.md`
