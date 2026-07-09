# Cochlear Manifold Plugin — UI Kit & Editor (GrimDesign) Design

**Date:** 2026-07-09
**Status:** Approved design → pending implementation plan
**Surface:** `codex/core/manifold/manifold-plugin` (native VST3/CLAP, nih-plug + `nih_plug_vizia`)
**Origin:** `/grimdesign` world-law analysis (server route `POST :3000/api/grimdesign/analyze`)

---

## 1. Problem & Goal

The native plugin (sub-project 3) currently ships **host params only** — no editor GUI. It
deliberately builds with `nih_plug` `default-features = false, features = ["vst3"]` to avoid the
X11/OpenGL/GUI dependency tree.

**Goal:** give the plugin its first editor GUI, built on a **reusable UI Kit** whose entire visual
treatment (color, glow, motion, transition timing) is *computed* from Scholomance phonemic signals
via GrimDesign — not chosen by preference. The editor must honor four principles: fluid interaction,
native OS integration, ergonomic control placement, clutter-free information architecture, and
accessibility.

**Backend decision:** `nih_plug_vizia`. It is the only nih-plug backend with a real CSS stylesheet,
so the "UI Kit" becomes a genuine design-token system (`theme.css`) plus reusable composed views.

**Scope decision (pass 1):** *Full kit + editor* — all 7 kit components, both Simple/Advanced modes,
the ManifoldMap hero visualizer, and accessibility toggles.

---

## 2. World-Law Signal Provenance (derived palette — reproducible)

Every surface's treatment comes from `computeBlendedHsl` + `decisionEngine`. Re-run:
`node .claude/skills/grimdesign/scripts/grimdesign.mjs "<intent>"`.

| Surface | School / Effect | Color | Glow | Transition | Motion |
|---|---|---|---|---|---|
| Instrument shell | WILL / TRANSCENDENT | `hsl(340 85% 51%)` magenta | 32px | 360ms | shimmer |
| Freeze toggle | ALCHEMY / HARMONIC | `hsl(239 82% 53%)` indigo | 12px | 300ms | breathe |
| Panic button | WILL / HARMONIC | `hsl(12 85% 51%)` red-orange | 12px | 360ms | breathe |
| Reactivity macro | NECROMANCY / HARMONIC | `hsl(145 80% 47%)` green | 12px | 400ms | breathe |
| preset `void-glass` | WILL | `hsl(0 85% 48%)` red | 12px | 360ms | breathe |
| preset `ash-lung` | WILL | `hsl(0 85% 48%)` red | 12px | 360ms | breathe |
| preset `ice-circuit` | ABJURATION | `hsl(90 83% 58%)` chartreuse | 12px | 320ms | breathe |
| preset `cathedral-of-teeth` | PSYCHIC / TRANSCENDENT | `hsl(290 88% 54%)` violet | 32px | 280ms | shimmer |
| preset `substrate-maw` | DIVINATION / TRANSCENDENT | `hsl(23 88% 58%)` amber | 32px | 350ms | shimmer |

Wet/Dry, Size, Stability inherit the instrument-shell hue (no distinct phonemic anchor). Reactivity
keeps its NECROMANCY green as the single "living" macro. School transition table (from
`decisionEngine.js`): SONIC 210 / PSYCHIC 280 / ALCHEMY 300 / WILL 360 / VOID 520 / NECROMANCY 400 /
ABJURATION 320 / DIVINATION 350 (ms). Glow tiers: 0 / 8 / 16 / 28px by effect class.

---

## 3. The UI Kit

### 3.1 `theme.css` — design tokens (vizia stylesheet)

Tokens promote the GrimDesign decisions to custom properties consumed by every widget (never
hardcoded in a view). Named groups:

- **School hues:** `--grim-shell`, `--grim-freeze`, `--grim-panic`, `--grim-react`, and
  `--preset-<name>` for each of the five presets.
- **Neutrals:** `--surface-0` (#0b0e10 panel base), `--surface-1` (#12171a raised), `--ink-hi`
  (#f4efe1), `--ink-lo` (rgba(244,239,225,.66)), `--focus` (hsl(190 90% 70%)).
- **Motion:** per-school transition ms; glow radius tiers.
- **Type scale:** Display (serif) · Label (sans) · Readout (mono).

### 3.2 Seven reusable vizia view builders (Rust)

| # | Component | Purpose |
|---|---|---|
| 1 | `PanelCard` | Titled surface (complexity 1–4); container primitive. |
| 2 | `Knob` | Rotary macro (wraps `ParamSlider`); school-hue arc fill, mono readout, keyboard + scroll + double-click-to-default. |
| 3 | `ToggleTile` | Boolean (Freeze-style); "breathe" pulse while active. |
| 4 | `ActionButton` | Momentary (Panic-style); danger variant. |
| 5 | `PresetChip` | Preset selector self-colored by world-law hue; "shimmer" on TRANSCENDENT presets. |
| 6 | `Meter` | Thin level/energy bar (output L/R, core, CPU). |
| 7 | `ManifoldMap` | Hero radial zone visualizer (core + floor/ceiling/walls); zones glow with energy. |

Each component: one clear purpose, consumes tokens only, independently testable.

---

## 4. Editor Information Architecture & Layout

```
┌──────────────────────────────────────────────────────────────┐
│  COCHLEAR MANIFOLD          [ Simple | Advanced ]  Freeze  Panic │  header: mode + urgent controls
├───────────┬──────────────────────────────────────┬───────────┤
│ PRESETS   │            MANIFOLD MAP                │  METERS   │
│ void-glass│      (radial hero visualizer,          │  out L    │
│ ash-lung  │       zones glow with energy)          │  out R    │
│ ice-circ. │                                        │  core     │  Advanced adds
│ cathedral │                                        │  cpu      │  safety/report
│ substrate │                                        │           │
├───────────┴──────────────────────────────────────┴───────────┤
│   WET/DRY       SIZE       REACTIVITY       STABILITY          │  macro deck (bottom-edge reach)
└──────────────────────────────────────────────────────────────┘
```

- **IA:** two flat modes, no cascading menus. *Simple* = presets + map + 4 knobs. *Advanced* reveals
  safety-governor readouts (CPU budget, max feedback, spray density) + per-zone detail in the right
  rail — nested, not cluttering the default view. **No DSL text editor in the native plugin** (YAGNI;
  DSL authoring stays on the browser page).
- **Ergonomics:** continuous macros seated on the bottom edge (thumb/pointer reach); Freeze/Panic
  pinned top-right and visually separated — Panic in danger red, never adjacent to a benign control.
- **Window:** default ~720×480, resizable via vizia `ResizeHandle`; size persisted in plugin state.

---

## 5. Accessibility & Motion (vizia-adapted)

- **High-contrast mode:** root `.contrast-high` class swaps `--ink-lo`→`--ink-hi`, drops glows,
  thickens borders to 2px. Exposed as a plugin toggle (vizia cannot read OS media queries).
- **Reduced motion:** root `.motion-off` class disables breathe/shimmer; user toggle persisted in
  plugin state (no `prefers-reduced-motion` in vizia).
- **Typographic hierarchy:** serif Display (title) · sans Label · mono Readout — three tiers, high
  luminance contrast.
- **Keyboard/gesture:** every control focusable with a visible `--focus` ring; knobs respond to
  arrows, scroll, and double-click-reset.

---

## 6. Architecture / Data Flow

- New crate members under `codex/core/manifold/manifold-plugin/`:
  - `src/editor/mod.rs` — `create_editor()` returning a `nih_plug_vizia` editor; builds the view tree.
  - `src/editor/kit/` — the 7 kit components, one module each.
  - `src/editor/theme.css` — the token stylesheet (embedded via `include_str!` + `cx.add_stylesheet`).
  - `src/editor/state.rs` — vizia `Model` holding UI-only state (mode, contrast, motion, selected
    preset, meter/energy snapshots).
- **Params:** existing `ManifoldPluginParams` (Wet/Dry, Size, Reactivity, Stability, Freeze, Panic)
  are the source of truth; knobs/toggles bind to them via `ParamSlider`/`ParamButton`. No new DSP.
- **Editor→DSP:** GUI never touches the audio thread directly; it mutates params (host-automatable)
  and reads a lock-free snapshot (e.g. `AtomicF32`/triple-buffer) the `process()` loop publishes for
  meters and the ManifoldMap. Presets set param values + load embedded bytecode via existing paths.
- **Cargo:** add `nih_plug_vizia` (git, same rev as `nih_plug`) behind a **`gui` feature** so the
  headless CI/clap-validator build stays lean and C-toolchain-free; `gui` on by default for local dev.

---

## 7. Testing & Verification

- **Unit (CI-safe):** pure helpers — hue/token derivation, preset→hue mapping, contrast/motion class
  logic — tested without a window (`cargo test`, `gui` feature off).
- **Load gate (CI-safe):** `clap-validator validate` must still pass (initialize + process +
  automation), unchanged from sub-project 3.
- **Render verification (requires display):** a windowed screenshot harness — headless renders lie
  (prior Godot/MultiMesh experience). Capture the editor at default + each preset + high-contrast +
  motion-off, eyeball against this spec's palette table.
- **Not verifiable here:** loading in a real DAW (none installed). clap-validator remains the closest
  automated evidence.

---

## 8. Risks / Non-Goals

- **Risk — vizia CSS ≠ web CSS.** GrimDesign emits web CSS (`filter: hue-rotate`, `@keyframes`,
  `@media prefers-reduced-motion`). We port the *computed values* faithfully and re-express motion in
  vizia's animation system; reduced-motion/contrast become toggles.
- **Risk — build/verify cost.** `nih_plug_vizia` pulls X11/OpenGL; isolate behind the `gui` feature so
  the lean build path survives. True render verification needs a display.
- **Non-goals:** no new DSP; no DSL editor in the native plugin; no changes to the browser
  ManifoldPage; no MIDI.
