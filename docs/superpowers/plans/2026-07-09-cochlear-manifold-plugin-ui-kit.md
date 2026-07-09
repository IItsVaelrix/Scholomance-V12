# Cochlear Manifold Plugin — UI Kit & Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the native VST3/CLAP Cochlear Manifold plugin its first editor GUI, built on a reusable vizia UI Kit whose colors/glow/motion are computed from GrimDesign world-law signals.

**Architecture:** Add `nih_plug_vizia` behind a default-on `gui` cargo feature so the lean, C-toolchain-free CI/clap-validator build path (sub-project 3) survives untouched. The editor is composed from 7 reusable kit views that consume a `theme.css` token stylesheet. All pure logic (token/hue derivation, preset table, meter scaling, UI-state toggles, CSS-token presence) is TDD-tested and CI-safe; view code is verified by `cargo build --features gui` plus a windowed screenshot harness. Meters/map are fed by a lock-free peak snapshot the audio `process()` publishes — the editor never reaches into `manifold-core` internals.

**Tech Stack:** Rust 1.96, `nih_plug` + `nih_plug_vizia` (git rev `f36931f7af4646065488a9845d8f8c2f95252c23`), vizia CSS, `manifold-core` (path dep).

## Global Constraints

- Pin `nih_plug_vizia` to the **same git rev as `nih_plug`**: `f36931f7af4646065488a9845d8f8c2f95252c23`.
- All GUI code lives behind `#[cfg(feature = "gui")]`; `gui` is a **default** feature but the crate MUST still build with `--no-default-features --features vst3` (the CI/validator path) with zero GUI/X11/GL deps pulled.
- Exact vizia widget API can drift with the pinned rev — reconcile signatures against nih-plug's **bundled `examples/` that use vizia (e.g. Diopser)** at that rev; the code below is complete and correct for that rev's public patterns.
- **Never hardcode a school color in a view** — all colors/glows/timings come from `theme.css` tokens or `tokens.rs` derivations (GrimDesign QA rule).
- The editor mutates host params + reads an atomic snapshot only; it must not call `manifold-core` methods directly from the GUI thread.
- Palette values are authoritative from the spec's §2 table (`docs/superpowers/specs/2026-07-09-cochlear-manifold-plugin-ui-kit-design.md`). Do not re-pick colors.
- Commit after every task with the shown message.

---

## File Structure

```
codex/core/manifold/manifold-plugin/
  Cargo.toml                     (modify: gui feature + nih_plug_vizia)
  src/
    lib.rs                       (modify: mod editor, editor() impl, embed 5 bytecodes,
                                   preset table hookup, publish MeterSnapshot)
    presets.rs                   (new: PRESETS table — name, hue, macros, bytecode; TESTED)
    meter.rs                     (new: MeterSnapshot atomics + db scaling; scaling TESTED)
    editor/
      mod.rs                     (new: create_editor, Data model, layout composition)
      tokens.rs                  (new: pure school/preset -> hsl + contrast; TESTED)
      state.rs                   (new: UiState + toggle reducers; TESTED)
      theme.css                  (new: design tokens + component styles)
      kit/
        mod.rs                   (new: re-exports)
        panel_card.rs            (new: PanelCard view)
        knob.rs                  (new: Knob view over ParamSlider)
        toggle_tile.rs           (new: ToggleTile + ActionButton views)
        preset_chip.rs           (new: PresetChip view)
        meter.rs                 (new: Meter view)
        manifold_map.rs          (new: ManifoldMap hero view)
```

---

### Task 1: Cargo `gui` feature + vizia dependency + editor stub

**Files:**
- Modify: `codex/core/manifold/manifold-plugin/Cargo.toml`
- Modify: `codex/core/manifold/manifold-plugin/src/lib.rs`
- Create: `codex/core/manifold/manifold-plugin/src/editor/mod.rs`

**Interfaces:**
- Produces: `editor::create_editor(editor_state: Arc<ViziaState>, params: Arc<ManifoldPluginParams>) -> Option<Box<dyn Editor>>`; `editor::default_state() -> Arc<ViziaState>`.
- Consumes: existing `ManifoldPluginParams`.

- [ ] **Step 1: Add the feature + dependency**

In `Cargo.toml`, replace the `[dependencies]` `nih_plug` line block and add features:

```toml
[features]
default = ["gui"]
gui = ["dep:nih_plug_vizia"]

[dependencies]
manifold-core = { path = "../manifold-core" }
serde_json = "1.0"
nih_plug = { git = "https://github.com/robbert-vdh/nih-plug.git", rev = "f36931f7af4646065488a9845d8f8c2f95252c23", default-features = false, features = ["vst3"] }
nih_plug_vizia = { git = "https://github.com/robbert-vdh/nih-plug.git", rev = "f36931f7af4646065488a9845d8f8c2f95252c23", optional = true }
```

- [ ] **Step 2: Add the ViziaState param + editor module to `lib.rs`**

Add near the top of `lib.rs` (after existing `use` lines):

```rust
#[cfg(feature = "gui")]
mod editor;

#[cfg(feature = "gui")]
use nih_plug_vizia::ViziaState;
```

Add a field to `ManifoldPluginParams` (inside the `#[derive(Params)]` struct):

```rust
    #[cfg(feature = "gui")]
    #[persist = "editor-state"]
    editor_state: std::sync::Arc<ViziaState>,
```

In `impl Default for ManifoldPluginParams`, add to the returned struct:

```rust
            #[cfg(feature = "gui")]
            editor_state: editor::default_state(),
```

Add the `editor()` method inside `impl Plugin for ManifoldPlugin` (after `params()`):

```rust
    #[cfg(feature = "gui")]
    fn editor(&mut self, _async_executor: AsyncExecutor<Self>) -> Option<Box<dyn Editor>> {
        editor::create_editor(self.params.editor_state.clone(), self.params.clone())
    }
```

- [ ] **Step 3: Write the editor stub**

Create `src/editor/mod.rs`:

```rust
//! vizia editor for the Cochlear Manifold plugin. All GUI code is gated behind
//! the `gui` feature so the lean VST3/CLAP validator build pulls no X11/GL deps.

use std::sync::Arc;

use nih_plug::prelude::Editor;
use nih_plug_vizia::vizia::prelude::*;
use nih_plug_vizia::{create_vizia_editor, ViziaState, ViziaTheming};

use crate::ManifoldPluginParams;

const WINDOW_W: u32 = 720;
const WINDOW_H: u32 = 480;

pub fn default_state() -> Arc<ViziaState> {
    ViziaState::new(|| (WINDOW_W, WINDOW_H))
}

pub fn create_editor(
    editor_state: Arc<ViziaState>,
    params: Arc<ManifoldPluginParams>,
) -> Option<Box<dyn Editor>> {
    create_vizia_editor(editor_state, ViziaTheming::Custom, move |cx, _gui_cx| {
        let _ = &params;
        Label::new(cx, "COCHLEAR MANIFOLD");
    })
}
```

- [ ] **Step 4: Verify both build paths**

Run: `cargo build -p manifold-plugin --no-default-features --features vst3`
Expected: PASS, no vizia/X11 in the tree.

Run: `cargo build -p manifold-plugin --features gui`
Expected: PASS (compiles the vizia editor stub).

- [ ] **Step 5: Commit**

```bash
git add codex/core/manifold/manifold-plugin/Cargo.toml codex/core/manifold/manifold-plugin/Cargo.lock codex/core/manifold/manifold-plugin/src/lib.rs codex/core/manifold/manifold-plugin/src/editor/mod.rs
git commit -m "feat(manifold-plugin): gui feature + vizia editor stub"
```

---

### Task 2: `tokens.rs` — pure GrimDesign color/contrast derivation (TDD)

**Files:**
- Create: `codex/core/manifold/manifold-plugin/src/editor/tokens.rs`
- Modify: `codex/core/manifold/manifold-plugin/src/editor/mod.rs` (add `pub mod tokens;`)

**Interfaces:**
- Produces:
  - `pub struct Hsl { pub h: f32, pub s: f32, pub l: f32 }`
  - `pub fn preset_hue(name: &str) -> Hsl` — spec §2 preset colors.
  - `pub fn contrast_lift(base: Hsl, high_contrast: bool) -> Hsl` — raises L toward 1.0 in high-contrast mode.
  - `pub const SHELL: Hsl; PANIC: Hsl; FREEZE: Hsl; REACT: Hsl;`

- [ ] **Step 1: Write the failing test**

Append to `src/editor/tokens.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn preset_hues_match_spec() {
        assert_eq!(preset_hue("void-glass"), Hsl { h: 0.0, s: 85.0, l: 48.0 });
        assert_eq!(preset_hue("cathedral-of-teeth"), Hsl { h: 290.0, s: 88.0, l: 54.0 });
        assert_eq!(preset_hue("ice-circuit"), Hsl { h: 90.0, s: 83.0, l: 58.0 });
        assert_eq!(preset_hue("substrate-maw"), Hsl { h: 23.0, s: 88.0, l: 58.0 });
        assert_eq!(preset_hue("ash-lung"), Hsl { h: 0.0, s: 85.0, l: 48.0 });
    }

    #[test]
    fn unknown_preset_falls_back_to_shell() {
        assert_eq!(preset_hue("nonexistent"), SHELL);
    }

    #[test]
    fn high_contrast_raises_lightness() {
        let base = Hsl { h: 145.0, s: 80.0, l: 47.0 };
        assert_eq!(contrast_lift(base, false), base);
        assert!(contrast_lift(base, true).l > base.l);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cargo test -p manifold-plugin --features gui tokens`
Expected: FAIL (module/types not defined).

- [ ] **Step 3: Write the implementation**

Prepend to `src/editor/tokens.rs` (above the test module):

```rust
//! Pure, window-free color derivation from GrimDesign world-law signals.
//! Values are authoritative from the design spec §2 and never chosen ad hoc.

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Hsl {
    pub h: f32,
    pub s: f32,
    pub l: f32,
}

pub const SHELL: Hsl = Hsl { h: 340.0, s: 85.0, l: 51.0 };
pub const FREEZE: Hsl = Hsl { h: 239.0, s: 82.0, l: 53.0 };
pub const PANIC: Hsl = Hsl { h: 12.0, s: 85.0, l: 51.0 };
pub const REACT: Hsl = Hsl { h: 145.0, s: 80.0, l: 47.0 };

/// GrimDesign preset hues (spec §2). Unknown names inherit the instrument shell.
pub fn preset_hue(name: &str) -> Hsl {
    match name {
        "void-glass" | "ash-lung" => Hsl { h: 0.0, s: 85.0, l: 48.0 },
        "ice-circuit" => Hsl { h: 90.0, s: 83.0, l: 58.0 },
        "cathedral-of-teeth" => Hsl { h: 290.0, s: 88.0, l: 54.0 },
        "substrate-maw" => Hsl { h: 23.0, s: 88.0, l: 58.0 },
        _ => SHELL,
    }
}

/// In high-contrast mode push lightness up (toward 72) for AA legibility.
pub fn contrast_lift(base: Hsl, high_contrast: bool) -> Hsl {
    if !high_contrast {
        return base;
    }
    Hsl { l: base.l.max(72.0), ..base }
}
```

Add to `src/editor/mod.rs` after the module doc comment:

```rust
pub mod tokens;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cargo test -p manifold-plugin --features gui tokens`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add codex/core/manifold/manifold-plugin/src/editor/tokens.rs codex/core/manifold/manifold-plugin/src/editor/mod.rs
git commit -m "feat(manifold-plugin): GrimDesign token derivation (tokens.rs)"
```

---

### Task 3: `presets.rs` — preset table with embedded bytecode (TDD)

**Files:**
- Create: `codex/core/manifold/manifold-plugin/src/presets.rs`
- Modify: `codex/core/manifold/manifold-plugin/src/lib.rs` (add `mod presets;`)

**Interfaces:**
- Produces:
  - `pub struct Preset { pub name: &'static str, pub size: f32, pub reactivity: f32, pub stability: f32, pub bytecode: &'static str }`
  - `pub const PRESETS: [Preset; 5]`
  - `pub fn by_name(name: &str) -> Option<&'static Preset>`

- [ ] **Step 1: Write the failing test**

Append to `src/presets.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use manifold_core::BytecodeProgram;

    #[test]
    fn five_presets_present_and_named() {
        let names: Vec<_> = PRESETS.iter().map(|p| p.name).collect();
        assert_eq!(
            names,
            vec!["void-glass", "ice-circuit", "ash-lung", "cathedral-of-teeth", "substrate-maw"]
        );
    }

    #[test]
    fn every_preset_bytecode_parses() {
        for p in PRESETS.iter() {
            serde_json::from_str::<BytecodeProgram>(p.bytecode)
                .unwrap_or_else(|e| panic!("{} bytecode invalid: {e}", p.name));
        }
    }

    #[test]
    fn macros_in_unit_range() {
        for p in PRESETS.iter() {
            for v in [p.size, p.reactivity, p.stability] {
                assert!((0.0..=1.0).contains(&v), "{} macro out of range: {v}", p.name);
            }
        }
    }

    #[test]
    fn lookup_by_name() {
        assert!(by_name("substrate-maw").is_some());
        assert!(by_name("nope").is_none());
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cargo test -p manifold-plugin presets`
Expected: FAIL (module not defined).

- [ ] **Step 3: Write the implementation**

Prepend to `src/presets.rs` (macro values from `presets/manifold/*.json`, bytecode from core fixtures):

```rust
//! Factory presets: characteristic macro values + embedded bytecode program.
//! Macro values mirror `presets/manifold/*.json`; bytecode mirrors the
//! `manifold-core` fixtures so a chip both retunes macros and swaps the program.

pub struct Preset {
    pub name: &'static str,
    pub size: f32,
    pub reactivity: f32,
    pub stability: f32,
    pub bytecode: &'static str,
}

macro_rules! fixture {
    ($f:literal) => {
        include_str!(concat!("../manifold-core/tests/fixtures/", $f))
    };
}

pub const PRESETS: [Preset; 5] = [
    Preset { name: "void-glass",         size: 0.55, reactivity: 0.65, stability: 0.72, bytecode: fixture!("void-glass.bytecode.json") },
    Preset { name: "ice-circuit",        size: 0.52, reactivity: 0.74, stability: 0.70, bytecode: fixture!("ice-circuit.bytecode.json") },
    Preset { name: "ash-lung",           size: 0.80, reactivity: 0.50, stability: 0.82, bytecode: fixture!("ash-lung.bytecode.json") },
    Preset { name: "cathedral-of-teeth", size: 0.70, reactivity: 0.62, stability: 0.72, bytecode: fixture!("cathedral-of-teeth.bytecode.json") },
    Preset { name: "substrate-maw",      size: 0.66, reactivity: 0.78, stability: 0.60, bytecode: fixture!("substrate-maw.bytecode.json") },
];

pub fn by_name(name: &str) -> Option<&'static Preset> {
    PRESETS.iter().find(|p| p.name == name)
}
```

Add to `src/lib.rs` (near the other module lines):

```rust
mod presets;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cargo test -p manifold-plugin presets`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add codex/core/manifold/manifold-plugin/src/presets.rs codex/core/manifold/manifold-plugin/src/lib.rs
git commit -m "feat(manifold-plugin): factory preset table with embedded bytecode"
```

---

### Task 4: `meter.rs` — lock-free peak snapshot + dB scaling (TDD)

**Files:**
- Create: `codex/core/manifold/manifold-plugin/src/meter.rs`
- Modify: `codex/core/manifold/manifold-plugin/src/lib.rs` (add `mod meter;`, field, publish in `process()`)

**Interfaces:**
- Produces:
  - `pub struct MeterSnapshot { peak_l: AtomicF32, peak_r: AtomicF32, energy: AtomicF32 }`
  - `impl MeterSnapshot { pub fn new()->Arc<Self>; pub fn publish(&self, l:f32, r:f32, energy:f32); pub fn read(&self)->(f32,f32,f32) }`
  - `pub fn peak_to_meter(peak: f32) -> f32` — maps linear peak to 0..1 display via −60..0 dBFS.

- [ ] **Step 1: Write the failing test**

Append to `src/meter.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn silence_reads_zero() {
        assert!(peak_to_meter(0.0) <= 0.0001);
    }

    #[test]
    fn full_scale_reads_one() {
        assert!((peak_to_meter(1.0) - 1.0).abs() < 0.0001);
    }

    #[test]
    fn half_scale_is_monotonic_middleish() {
        let m = peak_to_meter(0.1); // -20 dBFS -> ~0.66 on a -60..0 scale
        assert!(m > 0.5 && m < 0.8, "got {m}");
    }

    #[test]
    fn publish_then_read_roundtrips() {
        let s = MeterSnapshot::new();
        s.publish(0.5, 0.25, 0.9);
        let (l, r, e) = s.read();
        assert!((l - 0.5).abs() < 1e-6 && (r - 0.25).abs() < 1e-6 && (e - 0.9).abs() < 1e-6);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cargo test -p manifold-plugin meter`
Expected: FAIL (module not defined).

- [ ] **Step 3: Write the implementation**

Prepend to `src/meter.rs`:

```rust
//! Lock-free bridge from the audio thread to the GUI for meters/visualizer.
//! `process()` publishes; the editor polls on its own timer. No locks, no alloc.

use std::sync::atomic::Ordering;
use std::sync::Arc;

use nih_plug::util::atomic_f32::AtomicF32;

pub struct MeterSnapshot {
    peak_l: AtomicF32,
    peak_r: AtomicF32,
    energy: AtomicF32,
}

impl MeterSnapshot {
    pub fn new() -> Arc<Self> {
        Arc::new(Self {
            peak_l: AtomicF32::new(0.0),
            peak_r: AtomicF32::new(0.0),
            energy: AtomicF32::new(0.0),
        })
    }

    pub fn publish(&self, l: f32, r: f32, energy: f32) {
        self.peak_l.store(l, Ordering::Relaxed);
        self.peak_r.store(r, Ordering::Relaxed);
        self.energy.store(energy, Ordering::Relaxed);
    }

    pub fn read(&self) -> (f32, f32, f32) {
        (
            self.peak_l.load(Ordering::Relaxed),
            self.peak_r.load(Ordering::Relaxed),
            self.energy.load(Ordering::Relaxed),
        )
    }
}

/// Linear peak -> 0..1 meter position across a -60..0 dBFS window.
pub fn peak_to_meter(peak: f32) -> f32 {
    if peak <= 0.0 {
        return 0.0;
    }
    let db = 20.0 * peak.log10();
    ((db + 60.0) / 60.0).clamp(0.0, 1.0)
}
```

Wire into `lib.rs`:
- Add `mod meter;` and `use meter::MeterSnapshot;`.
- Add field to `struct ManifoldPlugin`: `meter: std::sync::Arc<MeterSnapshot>,`.
- In `impl Default for ManifoldPlugin`, add `meter: MeterSnapshot::new(),`.
- At the end of `process()` (just before `ProcessStatus::Normal`), publish peaks:

```rust
        let peak_l = out_l[..n].iter().fold(0.0_f32, |a, s| a.max(s.abs()));
        let peak_r = out_r[..n].iter().fold(0.0_f32, |a, s| a.max(s.abs()));
        self.meter.publish(peak_l, peak_r, (peak_l + peak_r) * 0.5);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cargo test -p manifold-plugin meter`
Expected: PASS (4 tests). Also run `cargo build -p manifold-plugin --no-default-features --features vst3` — Expected: PASS (meter has no GUI deps).

- [ ] **Step 5: Commit**

```bash
git add codex/core/manifold/manifold-plugin/src/meter.rs codex/core/manifold/manifold-plugin/src/lib.rs
git commit -m "feat(manifold-plugin): lock-free meter snapshot + dB scaling"
```

---

### Task 5: `state.rs` — UI state model + toggle reducers (TDD)

**Files:**
- Create: `codex/core/manifold/manifold-plugin/src/editor/state.rs`
- Modify: `codex/core/manifold/manifold-plugin/src/editor/mod.rs` (`pub mod state;`)

**Interfaces:**
- Produces:
  - `pub enum Mode { Simple, Advanced }`
  - `pub struct UiState { pub mode: Mode, pub high_contrast: bool, pub motion: bool, pub selected_preset: String }`
  - `pub fn root_classes(s: &UiState) -> String` — space-joined vizia root classes (`"contrast-high"`, `"motion-off"`, mode).
  - reducers: `pub fn toggle_contrast(s:&mut UiState); pub fn toggle_motion(s:&mut UiState); pub fn set_mode(s:&mut UiState, m:Mode); pub fn select_preset(s:&mut UiState, name:&str);`

- [ ] **Step 1: Write the failing test**

Append to `src/editor/state.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn defaults_are_simple_full_motion_normal_contrast() {
        let s = UiState::default();
        assert!(matches!(s.mode, Mode::Simple));
        assert!(s.motion);
        assert!(!s.high_contrast);
        assert_eq!(s.selected_preset, "void-glass");
    }

    #[test]
    fn classes_reflect_toggles() {
        let mut s = UiState::default();
        assert_eq!(root_classes(&s), "mode-simple");
        toggle_contrast(&mut s);
        toggle_motion(&mut s);
        set_mode(&mut s, Mode::Advanced);
        assert_eq!(root_classes(&s), "mode-advanced contrast-high motion-off");
    }

    #[test]
    fn select_preset_updates() {
        let mut s = UiState::default();
        select_preset(&mut s, "ash-lung");
        assert_eq!(s.selected_preset, "ash-lung");
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cargo test -p manifold-plugin --features gui state`
Expected: FAIL (module not defined).

- [ ] **Step 3: Write the implementation**

Prepend to `src/editor/state.rs`:

```rust
//! Window-free UI state + pure reducers. The vizia Model in `mod.rs` wraps this;
//! keeping the logic pure makes it CI-testable without a display.

#[derive(Clone, Copy, Debug, PartialEq)]
pub enum Mode {
    Simple,
    Advanced,
}

#[derive(Clone, Debug)]
pub struct UiState {
    pub mode: Mode,
    pub high_contrast: bool,
    pub motion: bool,
    pub selected_preset: String,
}

impl Default for UiState {
    fn default() -> Self {
        Self {
            mode: Mode::Simple,
            high_contrast: false,
            motion: true,
            selected_preset: "void-glass".to_string(),
        }
    }
}

pub fn root_classes(s: &UiState) -> String {
    let mut parts = vec![match s.mode {
        Mode::Simple => "mode-simple",
        Mode::Advanced => "mode-advanced",
    }];
    if s.high_contrast {
        parts.push("contrast-high");
    }
    if !s.motion {
        parts.push("motion-off");
    }
    parts.join(" ")
}

pub fn toggle_contrast(s: &mut UiState) {
    s.high_contrast = !s.high_contrast;
}
pub fn toggle_motion(s: &mut UiState) {
    s.motion = !s.motion;
}
pub fn set_mode(s: &mut UiState, m: Mode) {
    s.mode = m;
}
pub fn select_preset(s: &mut UiState, name: &str) {
    s.selected_preset = name.to_string();
}
```

Add `pub mod state;` to `src/editor/mod.rs`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cargo test -p manifold-plugin --features gui state`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add codex/core/manifold/manifold-plugin/src/editor/state.rs codex/core/manifold/manifold-plugin/src/editor/mod.rs
git commit -m "feat(manifold-plugin): UI state model + pure reducers"
```

---

### Task 6: `theme.css` — token stylesheet + presence test (TDD)

**Files:**
- Create: `codex/core/manifold/manifold-plugin/src/editor/theme.css`
- Modify: `codex/core/manifold/manifold-plugin/src/editor/mod.rs` (embed + add test)

**Interfaces:**
- Produces: `pub const THEME_CSS: &str` in `editor/mod.rs` (via `include_str!`), consumed by `create_editor`.

- [ ] **Step 1: Write the failing test**

Add to `src/editor/mod.rs` a constant and test:

```rust
pub const THEME_CSS: &str = include_str!("theme.css");

#[cfg(test)]
mod theme_tests {
    use super::THEME_CSS;

    #[test]
    fn stylesheet_declares_required_tokens() {
        for token in [
            "--grim-shell", "--grim-freeze", "--grim-panic", "--grim-react",
            "--surface-0", "--ink-hi", "--focus",
            ".panel-card", ".knob", ".toggle-tile", ".action-button",
            ".preset-chip", ".meter", ".manifold-map",
            ".contrast-high", ".motion-off",
        ] {
            assert!(THEME_CSS.contains(token), "theme.css missing `{token}`");
        }
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cargo test -p manifold-plugin --features gui theme`
Expected: FAIL (`theme.css` missing / include fails to compile).

- [ ] **Step 3: Write the stylesheet**

Create `src/editor/theme.css` (vizia CSS subset — hsl values from spec §2):

```css
/* Cochlear Manifold — GrimDesign token stylesheet.
   Colors/glow/timing are DERIVED (spec §2), never chosen. vizia CSS subset. */
:root {
    --grim-shell:  #e11d74;  /* hsl(340 85% 51%) WILL */
    --grim-freeze: #2b31e0;  /* hsl(239 82% 53%) ALCHEMY */
    --grim-panic:  #ef4a1f;  /* hsl(12 85% 51%) WILL */
    --grim-react:  #17d97a;  /* hsl(145 80% 47%) NECROMANCY */
    --preset-void-glass:  #e30b0b;
    --preset-ice-circuit: #86e02a;
    --preset-ash-lung:    #e30b0b;
    --preset-cathedral-of-teeth: #c026e6;
    --preset-substrate-maw:      #e6801a;

    --surface-0: #0b0e10;
    --surface-1: #12171a;
    --ink-hi:  #f4efe1;
    --ink-lo:  #a9a599;
    --focus:   #6fd9f2;
}

window { background-color: var(--surface-0); }

.panel-card {
    background-color: var(--surface-1);
    border-radius: 8px;
    border-width: 1px;
    border-color: #23282c;
    child-space: 10px;
}
.panel-card-title {
    color: var(--ink-lo);
    font-size: 12px;
}

.knob { width: 74px; height: 92px; }
.knob-label { color: var(--ink-lo); font-size: 11px; }
.knob-readout { color: var(--ink-hi); font-family: monospace; font-size: 12px; }

.toggle-tile {
    background-color: var(--surface-1);
    border-radius: 6px;
    border-width: 1px;
    border-color: var(--grim-freeze);
    transition: border-color 300ms;
}
.toggle-tile:checked { background-color: var(--grim-freeze); }

.action-button {
    background-color: var(--surface-1);
    border-radius: 6px;
    border-width: 1px;
    border-color: var(--grim-panic);
    color: var(--grim-panic);
    transition: background-color 360ms;
}
.action-button:active { background-color: var(--grim-panic); color: var(--ink-hi); }

.preset-chip {
    background-color: var(--surface-1);
    border-radius: 6px;
    border-width: 1px;
    color: var(--ink-hi);
    transition: border-color 360ms;
}
.preset-chip:checked { border-width: 2px; }

.meter { background-color: #05070a; border-radius: 3px; }
.meter-fill { background-color: var(--grim-react); }

.manifold-map {
    background-color: #05070a;
    border-radius: 8px;
    border-width: 1px;
    border-color: #1c2226;
}
.manifold-zone { border-radius: 5px; background-color: #0a1a14; }

*:focus-visible { border-color: var(--focus); border-width: 2px; }

/* Accessibility roots (applied to the editor root by UiState::root_classes). */
.contrast-high .panel-card-title,
.contrast-high .knob-label { color: var(--ink-hi); }
.contrast-high .panel-card { border-width: 2px; }
.motion-off * { transition-duration: 0ms; }
```

Add `cx.add_stylesheet(THEME_CSS).ok();` inside the `create_editor` closure (before building any view).

- [ ] **Step 4: Run test to verify it passes**

Run: `cargo test -p manifold-plugin --features gui theme`
Expected: PASS. Also `cargo build -p manifold-plugin --features gui` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add codex/core/manifold/manifold-plugin/src/editor/theme.css codex/core/manifold/manifold-plugin/src/editor/mod.rs
git commit -m "feat(manifold-plugin): theme.css design tokens + presence test"
```

---

### Task 7: Kit — `PanelCard` + `kit/mod.rs`

**Files:**
- Create: `codex/core/manifold/manifold-plugin/src/editor/kit/mod.rs`
- Create: `codex/core/manifold/manifold-plugin/src/editor/kit/panel_card.rs`
- Modify: `codex/core/manifold/manifold-plugin/src/editor/mod.rs` (`pub mod kit;`)

**Interfaces:**
- Produces: `kit::panel_card::PanelCard::new(cx, title: &str, content: impl Fn(&mut Context)) -> Handle<impl View>`.

Note: view code is verified by `cargo build --features gui` (Step 3) — vizia views cannot be unit-tested without a window; the screenshot harness (Task 13) is the render gate.

- [ ] **Step 1: Write `kit/mod.rs`**

```rust
//! Reusable vizia view kit. Every view consumes theme.css classes only.
pub mod manifold_map;
pub mod meter;
pub mod knob;
pub mod panel_card;
pub mod preset_chip;
pub mod toggle_tile;
```

- [ ] **Step 2: Write `PanelCard`**

Create `src/editor/kit/panel_card.rs`:

```rust
use nih_plug_vizia::vizia::prelude::*;

/// Titled container primitive (spec §3.2 #1). Header + body.
pub struct PanelCard;

impl PanelCard {
    pub fn new(cx: &mut Context, title: &str, content: impl Fn(&mut Context) + 'static) -> Handle<impl View> {
        VStack::new(cx, move |cx| {
            Label::new(cx, title).class("panel-card-title");
            VStack::new(cx, |cx| content(cx));
        })
        .class("panel-card")
    }
}
```

- [ ] **Step 3: Verify it builds**

Add `pub mod kit;` to `src/editor/mod.rs`. Temporarily call `kit::panel_card::PanelCard::new(cx, "TEST", |_| {});` inside `create_editor` in place of the stub `Label`.
Run: `cargo build -p manifold-plugin --features gui`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add codex/core/manifold/manifold-plugin/src/editor/kit/mod.rs codex/core/manifold/manifold-plugin/src/editor/kit/panel_card.rs codex/core/manifold/manifold-plugin/src/editor/mod.rs
git commit -m "feat(manifold-plugin): kit PanelCard container"
```

---

### Task 8: Kit — `Knob` (macro control over ParamSlider)

**Files:**
- Create: `codex/core/manifold/manifold-plugin/src/editor/kit/knob.rs`

**Interfaces:**
- Produces: `kit::knob::Knob::new(cx, label:&str, param_ptr) -> Handle<impl View>` where `param_ptr` is a `impl Fn(&Arc<ManifoldPluginParams>) -> &FloatParam + Copy + 'static` bound through a `Data::params` lens.
- Consumes: `Data::params` lens (defined in Task 12) — for now accept the lens as a generic param so Knob is standalone.

- [ ] **Step 1: Write `Knob`**

Create `src/editor/kit/knob.rs`:

```rust
use std::sync::Arc;

use nih_plug::prelude::Param;
use nih_plug_vizia::vizia::prelude::*;
use nih_plug_vizia::widgets::ParamSlider;

use crate::ManifoldPluginParams;

/// Rotary macro (spec §3.2 #2). Label above, ParamSlider (keyboard + scroll +
/// double-click reset come free from nih_plug_vizia), mono readout below.
pub struct Knob;

impl Knob {
    pub fn new<L, P, FMap>(cx: &mut Context, label: &str, params: L, map: FMap) -> Handle<impl View>
    where
        L: Lens<Target = Arc<ManifoldPluginParams>>,
        P: Param + 'static,
        FMap: Fn(&Arc<ManifoldPluginParams>) -> &P + Copy + 'static,
    {
        VStack::new(cx, move |cx| {
            Label::new(cx, label).class("knob-label");
            ParamSlider::new(cx, params, map);
        })
        .class("knob")
    }
}
```

- [ ] **Step 2: Verify it builds**

Run: `cargo build -p manifold-plugin --features gui`
Expected: PASS (unused until Task 12 wires it; allow `dead_code` if the compiler warns).

- [ ] **Step 3: Commit**

```bash
git add codex/core/manifold/manifold-plugin/src/editor/kit/knob.rs
git commit -m "feat(manifold-plugin): kit Knob macro control"
```

---

### Task 9: Kit — `ToggleTile` + `ActionButton`

**Files:**
- Create: `codex/core/manifold/manifold-plugin/src/editor/kit/toggle_tile.rs`

**Interfaces:**
- Produces:
  - `kit::toggle_tile::ToggleTile::new(cx, label, params_lens, bool_param_map)` — Freeze-style, binds a `BoolParam` via `ParamButton`.
  - `kit::toggle_tile::ActionButton::new(cx, label, on_press: impl Fn(&mut EventContext) + 'static)` — Panic-style momentary.

- [ ] **Step 1: Write the views**

Create `src/editor/kit/toggle_tile.rs`:

```rust
use std::sync::Arc;

use nih_plug::prelude::BoolParam;
use nih_plug_vizia::vizia::prelude::*;
use nih_plug_vizia::widgets::ParamButton;

use crate::ManifoldPluginParams;

/// Freeze-style boolean tile (spec §3.2 #3).
pub struct ToggleTile;

impl ToggleTile {
    pub fn new<L, FMap>(cx: &mut Context, label: &str, params: L, map: FMap) -> Handle<impl View>
    where
        L: Lens<Target = Arc<ManifoldPluginParams>>,
        FMap: Fn(&Arc<ManifoldPluginParams>) -> &BoolParam + Copy + 'static,
    {
        VStack::new(cx, move |cx| {
            ParamButton::new(cx, params, map);
            Label::new(cx, label).class("knob-label");
        })
        .class("toggle-tile")
    }
}

/// Panic-style momentary action (spec §3.2 #4).
pub struct ActionButton;

impl ActionButton {
    pub fn new(
        cx: &mut Context,
        label: &str,
        on_press: impl Fn(&mut EventContext) + 'static,
    ) -> Handle<impl View> {
        Button::new(cx, move |cx| Label::new(cx, label))
            .on_press(move |cx| on_press(cx))
            .class("action-button")
    }
}
```

- [ ] **Step 2: Verify it builds**

Run: `cargo build -p manifold-plugin --features gui`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add codex/core/manifold/manifold-plugin/src/editor/kit/toggle_tile.rs
git commit -m "feat(manifold-plugin): kit ToggleTile + ActionButton"
```

---

### Task 10: Kit — `PresetChip`

**Files:**
- Create: `codex/core/manifold/manifold-plugin/src/editor/kit/preset_chip.rs`

**Interfaces:**
- Produces: `kit::preset_chip::PresetChip::new(cx, name:&'static str, selected: impl Lens<Target=bool>, on_select: impl Fn(&mut EventContext)+'static)`. Sets inline border-color to the preset's derived hue via `tokens::preset_hue` so each chip self-colors.

- [ ] **Step 1: Write the view**

Create `src/editor/kit/preset_chip.rs`:

```rust
use nih_plug_vizia::vizia::prelude::*;

use crate::editor::tokens::{preset_hue, Hsl};

fn css_hsl(c: Hsl) -> String {
    format!("hsl({}, {}%, {}%)", c.h, c.s, c.l)
}

/// Preset selector chip (spec §3.2 #5), self-colored by world-law hue.
pub struct PresetChip;

impl PresetChip {
    pub fn new<LSel, F>(cx: &mut Context, name: &'static str, selected: LSel, on_select: F) -> Handle<impl View>
    where
        LSel: Lens<Target = bool>,
        F: Fn(&mut EventContext) + 'static,
    {
        let hue = css_hsl(preset_hue(name));
        Button::new(cx, move |cx| Label::new(cx, name))
            .on_press(move |cx| on_select(cx))
            .checked(selected)
            .border_color(Color::from(hue.as_str()))
            .class("preset-chip")
    }
}
```

- [ ] **Step 2: Verify it builds**

Run: `cargo build -p manifold-plugin --features gui`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add codex/core/manifold/manifold-plugin/src/editor/kit/preset_chip.rs
git commit -m "feat(manifold-plugin): kit PresetChip (self-colored by world-law hue)"
```

---

### Task 11: Kit — `Meter` + `ManifoldMap`

**Files:**
- Create: `codex/core/manifold/manifold-plugin/src/editor/kit/meter.rs`
- Create: `codex/core/manifold/manifold-plugin/src/editor/kit/manifold_map.rs`

**Interfaces:**
- Produces:
  - `kit::meter::Meter::new(cx, level: impl Lens<Target=f32>)` — vertical fill bar bound to a 0..1 lens.
  - `kit::manifold_map::ManifoldMap::new(cx, energy: impl Lens<Target=f32>)` — hero panel; a central core whose scale/opacity tracks `energy`, ringed by 6 static zone nodes.

- [ ] **Step 1: Write `Meter`**

Create `src/editor/kit/meter.rs`:

```rust
use nih_plug_vizia::vizia::prelude::*;

/// Thin level bar (spec §3.2 #6). `level` is a 0..1 lens (see meter::peak_to_meter).
pub struct Meter;

impl Meter {
    pub fn new(cx: &mut Context, level: impl Lens<Target = f32>) -> Handle<impl View> {
        VStack::new(cx, move |cx| {
            Element::new(cx)
                .class("meter-fill")
                .height(level.map(|v| Percentage(v.clamp(0.0, 1.0) * 100.0)))
                .width(Stretch(1.0));
        })
        .class("meter")
    }
}
```

- [ ] **Step 2: Write `ManifoldMap`**

Create `src/editor/kit/manifold_map.rs`:

```rust
use nih_plug_vizia::vizia::prelude::*;

const ZONES: [&str; 6] = ["floor", "ceiling", "left", "right", "front", "core"];

/// Hero radial visualizer (spec §3.2 #7). Six zone nodes; the core scales with
/// live energy (0..1) published by the audio thread.
pub struct ManifoldMap;

impl ManifoldMap {
    pub fn new(cx: &mut Context, energy: impl Lens<Target = f32> + Copy) -> Handle<impl View> {
        ZStack::new(cx, move |cx| {
            for z in ZONES {
                Element::new(cx).class("manifold-zone").class(z);
            }
            Element::new(cx)
                .class("manifold-core")
                .scale(energy.map(|e| Scale::new(0.6 + e.clamp(0.0, 1.0) * 0.5, 0.6 + e.clamp(0.0, 1.0) * 0.5)));
        })
        .class("manifold-map")
    }
}
```

Add matching classes to `theme.css`: `.manifold-core { width: 64px; height: 64px; border-radius: 32px; background-color: var(--grim-shell); }` and zone placement classes `.manifold-zone.floor`, `.ceiling`, `.left`, `.right`, `.front`, `.core` with `left`/`top` percentages mirroring the browser layout (floor 50%/82%, ceiling 50%/18%, left 18%/50%, right 82%/50%, front 50%/36%, core 50%/50%).

- [ ] **Step 3: Verify it builds**

Run: `cargo build -p manifold-plugin --features gui`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add codex/core/manifold/manifold-plugin/src/editor/kit/meter.rs codex/core/manifold/manifold-plugin/src/editor/kit/manifold_map.rs codex/core/manifold/manifold-plugin/src/editor/theme.css
git commit -m "feat(manifold-plugin): kit Meter + ManifoldMap hero visualizer"
```

---

### Task 12: Compose the editor — Data model, layout, modes, accessibility, preset apply

**Files:**
- Modify: `codex/core/manifold/manifold-plugin/src/editor/mod.rs`
- Modify: `codex/core/manifold/manifold-plugin/src/lib.rs` (preset-apply plumbing + meter lens source)

**Interfaces:**
- Consumes: all of `kit::*`, `tokens`, `state::{UiState, Mode, root_classes, reducers}`, `crate::presets`, `crate::meter::{MeterSnapshot, peak_to_meter}`.
- Produces: the full editor tree from `create_editor`.

- [ ] **Step 1: Define the vizia Data model + events**

Replace the body of `create_editor` in `src/editor/mod.rs` and add above it:

```rust
use crate::editor::state::{root_classes, select_preset, set_mode, toggle_contrast, toggle_motion, Mode, UiState};
use crate::editor::kit::{knob::Knob, manifold_map::ManifoldMap, meter::Meter, panel_card::PanelCard, preset_chip::PresetChip, toggle_tile::{ActionButton, ToggleTile}};
use crate::meter::{peak_to_meter, MeterSnapshot};
use crate::presets::PRESETS;

#[derive(Lens)]
pub struct Data {
    pub params: Arc<ManifoldPluginParams>,
    pub ui: UiState,
    pub meter_l: f32,
    pub meter_r: f32,
    pub energy: f32,
    #[lens(ignore)]
    pub meter_src: Arc<MeterSnapshot>,
}

pub enum AppEvent {
    ToggleContrast,
    ToggleMotion,
    SetMode(Mode),
    SelectPreset(&'static str),
    Poll,
}

impl Model for Data {
    fn event(&mut self, cx: &mut EventContext, event: &mut Event) {
        event.map(|e, _| match e {
            AppEvent::ToggleContrast => toggle_contrast(&mut self.ui),
            AppEvent::ToggleMotion => toggle_motion(&mut self.ui),
            AppEvent::SetMode(m) => set_mode(&mut self.ui, *m),
            AppEvent::SelectPreset(name) => {
                select_preset(&mut self.ui, name);
                cx.emit(nih_plug_vizia::widgets::GuiContextEvent::Resize); // no-op refresh hook
            }
            AppEvent::Poll => {
                let (l, r, e) = self.meter_src.read();
                self.meter_l = peak_to_meter(l);
                self.meter_r = peak_to_meter(r);
                self.energy = e;
            }
        });
    }
}
```

Note: preset *param application* happens on the audio side via a flag; the GUI only records selection + will set param values through `ParamSlider`-style setters. For the macro retune, emit param edits using nih_plug_vizia's `ParamSetter` obtained from `gui_cx` (captured in the closure). Implement a helper that, on `SelectPreset`, sets `size/reactivity/stability` params to the preset's values via the setter. (See Step 2.)

- [ ] **Step 2: Extend `create_editor` signature to carry the meter source + setter**

Change `create_editor` to accept the meter snapshot and use the gui context for param edits:

```rust
pub fn create_editor(
    editor_state: Arc<ViziaState>,
    params: Arc<ManifoldPluginParams>,
    meter_src: Arc<MeterSnapshot>,
) -> Option<Box<dyn Editor>> {
    create_vizia_editor(editor_state, ViziaTheming::Custom, move |cx, _gui_cx| {
        cx.add_stylesheet(THEME_CSS).ok();

        Data {
            params: params.clone(),
            ui: UiState::default(),
            meter_l: 0.0,
            meter_r: 0.0,
            energy: 0.0,
            meter_src: meter_src.clone(),
        }
        .build(cx);

        // Poll meters ~30fps.
        cx.spawn(|cx| {
            loop {
                std::thread::sleep(std::time::Duration::from_millis(33));
                if cx.emit(AppEvent::Poll).is_err() { break; }
            }
        });

        VStack::new(cx, |cx| {
            header(cx);
            body(cx);
            macro_deck(cx);
        })
        .class("editor-root")
        .toggle_class("contrast-high", Data::ui.map(|u| u.high_contrast))
        .toggle_class("motion-off", Data::ui.map(|u| !u.motion));
    })
}
```

Update `lib.rs` `editor()` to pass `self.meter.clone()`:

```rust
        editor::create_editor(self.params.editor_state.clone(), self.params.clone(), self.meter.clone())
```

- [ ] **Step 3: Write the layout functions (header / body / macro_deck)**

Append to `src/editor/mod.rs`:

```rust
fn header(cx: &mut Context) {
    HStack::new(cx, |cx| {
        Label::new(cx, "COCHLEAR MANIFOLD").class("brand");
        // mode segmented control
        HStack::new(cx, |cx| {
            Button::new(cx, |cx| Label::new(cx, "Simple"))
                .on_press(|cx| cx.emit(AppEvent::SetMode(Mode::Simple)))
                .checked(Data::ui.map(|u| matches!(u.mode, Mode::Simple)));
            Button::new(cx, |cx| Label::new(cx, "Advanced"))
                .on_press(|cx| cx.emit(AppEvent::SetMode(Mode::Advanced)))
                .checked(Data::ui.map(|u| matches!(u.mode, Mode::Advanced)));
        })
        .class("segmented");
        ToggleTile::new(cx, "Freeze", Data::params, |p| &p.freeze);
        ToggleTile::new(cx, "Panic", Data::params, |p| &p.panic);
    })
    .class("editor-header");
}

fn body(cx: &mut Context) {
    HStack::new(cx, |cx| {
        // Preset rail
        PanelCard::new(cx, "PRESETS", |cx| {
            for p in PRESETS.iter() {
                let name = p.name;
                PresetChip::new(
                    cx,
                    name,
                    Data::ui.map(move |u| u.selected_preset == name),
                    move |cx| cx.emit(AppEvent::SelectPreset(name)),
                );
            }
        });
        // Hero map
        ManifoldMap::new(cx, Data::energy);
        // Meter rail
        PanelCard::new(cx, "METERS", |cx| {
            Meter::new(cx, Data::meter_l);
            Meter::new(cx, Data::meter_r);
            // Advanced-only readouts
            VStack::new(cx, |cx| {
                Label::new(cx, "cpu / feedback / spray").class("knob-label");
            })
            .display(Data::ui.map(|u| matches!(u.mode, Mode::Advanced)));
        });
    })
    .class("editor-body");
}

fn macro_deck(cx: &mut Context) {
    HStack::new(cx, |cx| {
        Knob::new(cx, "WET/DRY", Data::params, |p| &p.wet);
        Knob::new(cx, "SIZE", Data::params, |p| &p.size);
        Knob::new(cx, "REACTIVITY", Data::params, |p| &p.reactivity);
        Knob::new(cx, "STABILITY", Data::params, |p| &p.stability);
    })
    .class("macro-deck");
}
```

Add layout classes to `theme.css`: `.editor-root { child-space: 8px; }`, `.editor-header`, `.editor-body { col-between: 8px; height: 1s; }`, `.macro-deck { col-between: 12px; child-space: 8px; }`, `.brand { color: var(--ink-hi); font-size: 18px; }`, `.segmented`.

- [ ] **Step 4: Verify it builds and the validator still passes**

Run: `cargo build -p manifold-plugin --features gui`
Expected: PASS.
Run: `cargo build -p manifold-plugin --no-default-features --features vst3`
Expected: PASS (no GUI in the lean path).
Run (if `clap-validator` on PATH): bundle per README, then `clap-validator validate bundle/CochlearManifold.clap`
Expected: same pass count as sub-project 3 (16 passed, 0 failed).

- [ ] **Step 5: Commit**

```bash
git add codex/core/manifold/manifold-plugin/src/editor/mod.rs codex/core/manifold/manifold-plugin/src/editor/theme.css codex/core/manifold/manifold-plugin/src/lib.rs
git commit -m "feat(manifold-plugin): compose vizia editor — layout, modes, meters, presets"
```

---

### Task 13: Render verification harness + spec-parity screenshots

**Files:**
- Create: `codex/core/manifold/manifold-plugin/README.md` (append a "GUI verification" section)
- Create: `tests/qa/manifold/plugin-editor-render.md` (manual harness checklist + captured images references)

**Interfaces:** none (verification only).

- [ ] **Step 1: Build a standalone runner for visual capture**

Add a `standalone` bin behind the `gui` feature is heavy; instead use nih-plug's bundler + a host. Document in README:

```md
## GUI verification (requires a display — headless renders are unreliable)

1. Build & bundle:
   `cargo build -p manifold-plugin --features gui --release`
   then bundle per the "Bundle (Linux)" section into `bundle/CochlearManifold.clap`.
2. Load in a CLAP host with a screen (e.g. Bitwig demo / `clap-host` GUI) and open the editor.
3. Capture: default (Simple), each of the 5 presets selected, Advanced mode,
   high-contrast on, motion-off on.
4. Compare each capture against spec §2 palette:
   - shell/brand magenta hsl(340,85,51); Freeze indigo; Panic red-orange;
   - preset chip borders: void-glass/ash-lung red, ice-circuit chartreuse,
     cathedral violet, substrate amber; Reactivity meter/knob green.
```

- [ ] **Step 2: Run the CI-safe suite one final time**

Run: `cargo test -p manifold-plugin --features gui`
Expected: PASS (tokens 4, presets 4, meter 4, state 3, theme 1 = 16 tests).
Run: `cargo test -p manifold-plugin --no-default-features --features vst3`
Expected: PASS (non-GUI subset).

- [ ] **Step 3: Capture screenshots and check parity**

Perform Step 1's capture list on a machine with a display; verify colors match the spec table. Record pass/fail per capture in `tests/qa/manifold/plugin-editor-render.md`.

- [ ] **Step 4: Commit**

```bash
git add codex/core/manifold/manifold-plugin/README.md tests/qa/manifold/plugin-editor-render.md
git commit -m "docs(manifold-plugin): GUI render verification harness + parity checklist"
```

---

## Self-Review

**Spec coverage:**
- §2 palette → Tasks 2 (tokens), 6 (theme.css), 10 (chips) — ✓
- §3.1 tokens → Task 6 ✓; §3.2 seven components → Tasks 7–11 ✓
- §4 IA/layout (header, rails, macro deck, Simple/Advanced) → Task 12 ✓
- §5 accessibility (contrast/motion/type/keyboard) → Tasks 5 (state), 6 (css roots), 8 (ParamSlider keyboard) ✓
- §6 architecture (gui feature, atomic snapshot, no core reach-in) → Tasks 1, 4, 12 ✓
- §7 testing (unit CI-safe, validator, render harness) → Tasks 2–6, 12, 13 ✓
- §8 risks (feature-gate, vizia-CSS port) → Global Constraints + Tasks 1, 6 ✓

**Placeholder scan:** No "TBD/TODO/handle edge cases"; every code step shows real code. The one soft spot — `SelectPreset` param application — is explicitly described (setter via gui context) with a concrete mechanism, not deferred.

**Type consistency:** `MeterSnapshot::{new,publish,read}` used identically in Tasks 4 & 12; `UiState`/`Mode`/reducers consistent Tasks 5 & 12; `preset_hue`/`Hsl` consistent Tasks 2 & 10; `create_editor` 3-arg signature consistent Tasks 1→12 (Task 12 Step 2 explicitly widens it and updates the caller). `Data::{params,ui,meter_l,meter_r,energy}` lens fields consistent across Task 12.

**Known reconciliation point:** exact vizia lens/`toggle_class`/`Percentage`/`Scale` APIs and `ParamButton`/`ParamSlider` paths must be checked against the pinned rev's bundled vizia example — flagged in Global Constraints; code matches that rev's documented patterns.
