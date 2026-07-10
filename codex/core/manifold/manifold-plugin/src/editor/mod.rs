//! vizia editor for the Cochlear Manifold plugin. All GUI code is gated behind
//! the `gui` feature so the lean VST3/CLAP validator build pulls no X11/GL deps.

pub mod kit;
pub mod state;
pub mod tokens;

use std::sync::atomic::{AtomicI32, Ordering};
use std::sync::Arc;

use nih_plug::prelude::{Editor, Param};
use nih_plug_vizia::vizia::prelude::*;
use nih_plug_vizia::widgets::RawParamEvent;
use nih_plug_vizia::{create_vizia_editor, ViziaState, ViziaTheming};

use crate::editor::kit::knob::Knob;
use crate::editor::kit::manifold_map::ManifoldMap;
use crate::editor::kit::meter::{Meter, MeterChannel};
use crate::editor::kit::panel_card::PanelCard;
use crate::editor::kit::preset_chip::PresetChip;
use crate::editor::kit::status_dot::{StatusDot, StatusKind};
use crate::editor::kit::toggle_tile::{ActionButton, ToggleTile};
use crate::editor::state::{
    root_classes, select_preset, set_mode, toggle_contrast, toggle_motion, Mode, UiState,
};
use crate::meter::MeterSnapshot;
use crate::presets::PRESETS;
use crate::ManifoldPluginParams;

const WINDOW_W: u32 = 720;
const WINDOW_H: u32 = 480;

pub fn default_state() -> Arc<ViziaState> {
    ViziaState::new(|| (WINDOW_W, WINDOW_H))
}

pub const THEME_CSS: &str = include_str!("theme.css");

/// PRESETS table index for a chip name. Pure so it is testable without a display.
fn preset_index(name: &str) -> Option<usize> {
    PRESETS.iter().position(|p| p.name == name)
}

/// Whether `root_classes` (the single source of truth for UiState-driven CSS
/// classes) currently emits `class`. The editor root binds one `toggle_class`
/// per known class through this, so the applied classes can never drift from
/// the pure reducer's output.
fn root_class_active(s: &UiState, class: &str) -> bool {
    root_classes(s).split_whitespace().any(|c| c == class)
}

#[derive(Lens)]
struct Data {
    // Struct and fields stay private: the `Lens` derive mirrors the struct's
    // visibility onto the generated lens module, and a `pub Data` lens would
    // leak the crate-private `ManifoldPluginParams` type through a public
    // interface (E0446). Everything that needs these lenses lives in this file.
    //
    // Live meter/visualizer values are NOT mirrored here: the canvas views
    // (Meter, ManifoldMap, StatusDot) read the lock-free snapshot directly in
    // draw() — baseview renders every frame, so no polling thread or event
    // traffic is needed (same pattern as nih_plug_vizia's PeakMeter).
    params: Arc<ManifoldPluginParams>,
    ui: UiState,
    #[lens(ignore)]
    pending_preset: Arc<AtomicI32>,
    /// Guards the momentary Panic automation gesture: begin/end must pair
    /// exactly once per hold even though release can be reported through
    /// several redundant hooks (mouse-up, keyboard press, focus loss).
    #[lens(ignore)]
    panic_held: bool,
}

enum AppEvent {
    ToggleContrast,
    ToggleMotion,
    SetMode(Mode),
    SelectPreset(&'static str),
    /// Momentary Panic: hold to silence (begin gesture + panic -> 1.0).
    PanicPressed,
    /// Momentary Panic: release (panic -> 0.0 + end gesture).
    PanicReleased,
}

impl Data {
    /// Full preset apply (amendment A2): record the selection, retune the
    /// macro params through a proper begin/set/end automation gesture, and
    /// hand the PRESETS index to the audio thread for the bytecode hot-swap.
    fn apply_preset(&mut self, cx: &mut EventContext, name: &'static str) {
        select_preset(&mut self.ui, name);
        let Some(idx) = preset_index(name) else { return };
        let Some(preset) = crate::presets::by_name(name) else { return };

        // Macro params are Linear 0..1, so plain value == normalized value.
        for (param, value) in [
            (&self.params.size, preset.size),
            (&self.params.reactivity, preset.reactivity),
            (&self.params.stability, preset.stability),
        ] {
            let ptr = param.as_ptr();
            cx.emit(RawParamEvent::BeginSetParameter(ptr));
            cx.emit(RawParamEvent::SetParameterNormalized(ptr, value));
            cx.emit(RawParamEvent::EndSetParameter(ptr));
        }

        // Audio thread consumes this via presets::take_pending at the top of
        // process() and hot-swaps the bytecode program.
        self.pending_preset.store(idx as i32, Ordering::Release);
    }

    fn panic_pressed(&mut self, cx: &mut EventContext) {
        if self.panic_held {
            return;
        }
        self.panic_held = true;
        let ptr = self.params.panic.as_ptr();
        cx.emit(RawParamEvent::BeginSetParameter(ptr));
        cx.emit(RawParamEvent::SetParameterNormalized(ptr, 1.0));
    }

    fn panic_released(&mut self, cx: &mut EventContext) {
        if !self.panic_held {
            return;
        }
        self.panic_held = false;
        let ptr = self.params.panic.as_ptr();
        cx.emit(RawParamEvent::SetParameterNormalized(ptr, 0.0));
        cx.emit(RawParamEvent::EndSetParameter(ptr));
    }
}

impl Model for Data {
    fn event(&mut self, cx: &mut EventContext, event: &mut Event) {
        event.map(|e, _| match e {
            AppEvent::ToggleContrast => toggle_contrast(&mut self.ui),
            AppEvent::ToggleMotion => toggle_motion(&mut self.ui),
            AppEvent::SetMode(m) => set_mode(&mut self.ui, *m),
            AppEvent::SelectPreset(name) => self.apply_preset(cx, name),
            AppEvent::PanicPressed => self.panic_pressed(cx),
            AppEvent::PanicReleased => self.panic_released(cx),
        });
    }
}

pub fn create_editor(
    editor_state: Arc<ViziaState>,
    params: Arc<ManifoldPluginParams>,
    meter_src: Arc<MeterSnapshot>,
    pending_preset: Arc<AtomicI32>,
) -> Option<Box<dyn Editor>> {
    create_vizia_editor(editor_state, ViziaTheming::Custom, move |cx, _gui_cx| {
        // MUST come first: with `ViziaTheming::Custom`, nih_plug_vizia sets the
        // default font family to "Noto Sans" (editor.rs at the pinned rev) but
        // registering the font DATA is the plugin's job. Without these the
        // window thread panics during first-frame text layout and the editor
        // never appears (observed in REAPER's journal). Same two registrations
        // as every upstream vizia example (Diopser, gain_gui_vizia, ...).
        nih_plug_vizia::assets::register_noto_sans_light(cx);
        nih_plug_vizia::assets::register_noto_sans_thin(cx);

        cx.add_stylesheet(THEME_CSS).ok();

        Data {
            params: params.clone(),
            ui: UiState::default(),
            pending_preset: pending_preset.clone(),
            panic_held: false,
        }
        .build(cx);

        let viz = meter_src.clone();
        let params_for_views = params.clone();
        VStack::new(cx, move |cx| {
            header(cx);
            body(cx, viz.clone(), params_for_views.clone());
            macro_deck(cx);
        })
        .class("editor-root")
        .toggle_class("mode-simple", Data::ui.map(|u| root_class_active(u, "mode-simple")))
        .toggle_class("mode-advanced", Data::ui.map(|u| root_class_active(u, "mode-advanced")))
        .toggle_class("contrast-high", Data::ui.map(|u| root_class_active(u, "contrast-high")))
        .toggle_class("motion-off", Data::ui.map(|u| root_class_active(u, "motion-off")));

        // Spec §4: resizable window, size persisted via the ViziaState in the
        // params (#[persist = "editor-state"]). The whole layout is
        // stretch-based (1s units), so it reflows at any size the host allows.
        nih_plug_vizia::widgets::ResizeHandle::new(cx);
    })
}

fn header(cx: &mut Context) {
    HStack::new(cx, |cx| {
        Label::new(cx, "COCHLEAR MANIFOLD").class("brand");
        Element::new(cx).class("header-spacer");

        // Mode segmented control.
        HStack::new(cx, |cx| {
            Button::new(
                cx,
                |cx| cx.emit(AppEvent::SetMode(Mode::Simple)),
                |cx| Label::new(cx, "Simple"),
            )
            .checked(Data::ui.map(|u| matches!(u.mode, Mode::Simple)));
            Button::new(
                cx,
                |cx| cx.emit(AppEvent::SetMode(Mode::Advanced)),
                |cx| Label::new(cx, "Advanced"),
            )
            .checked(Data::ui.map(|u| matches!(u.mode, Mode::Advanced)));
        })
        .class("segmented");

        // Accessibility segmented control (drives the root classes).
        HStack::new(cx, |cx| {
            Button::new(
                cx,
                |cx| cx.emit(AppEvent::ToggleContrast),
                |cx| Label::new(cx, "Contrast"),
            )
            .checked(Data::ui.map(|u| u.high_contrast));
            Button::new(
                cx,
                |cx| cx.emit(AppEvent::ToggleMotion),
                |cx| Label::new(cx, "Motion"),
            )
            .checked(Data::ui.map(|u| u.motion));
        })
        .class("segmented");

        ToggleTile::new(cx, "Freeze", Data::params, |p| &p.freeze);
        // Amendment A1: Panic is a momentary hold, not a latching toggle.
        ActionButton::momentary(
            cx,
            "PANIC",
            |cx| cx.emit(AppEvent::PanicPressed),
            |cx| cx.emit(AppEvent::PanicReleased),
        );
    })
    .class("editor-header");
}

fn body(cx: &mut Context, viz: Arc<MeterSnapshot>, params: Arc<ManifoldPluginParams>) {
    HStack::new(cx, move |cx| {
        // Preset rail.
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
        // Hero map: the perspective room, lit by the live spectral snapshot.
        ManifoldMap::new(cx, viz.clone(), params.clone());
        // Meter rail.
        let viz_meters = viz.clone();
        PanelCard::new(cx, "METERS", move |cx| {
            Label::new(cx, "OUT L").class("meter-label");
            Meter::new(cx, viz_meters.clone(), MeterChannel::Left);
            Label::new(cx, "OUT R").class("meter-label");
            Meter::new(cx, viz_meters.clone(), MeterChannel::Right);
            // Advanced-only safety-governor readouts (live ProcessReport).
            let viz_status = viz_meters.clone();
            VStack::new(cx, move |cx| {
                HStack::new(cx, |cx| {
                    StatusDot::new(cx, viz_status.clone(), StatusKind::Cpu);
                    Label::new(cx, "CPU").class("meter-label");
                })
                .class("status-row");
                HStack::new(cx, |cx| {
                    StatusDot::new(cx, viz_status.clone(), StatusKind::Clip);
                    Label::new(cx, "CLIP").class("meter-label");
                })
                .class("status-row");
            })
            .class("status-rows")
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

#[cfg(test)]
mod theme_tests {
    use super::THEME_CSS;

    #[test]
    fn stylesheet_declares_required_tokens() {
        for token in [
            ":root",
            ".panel-card", ".knob", ".toggle-tile", ".action-button",
            ".preset-chip", ".meter", ".meter-label", ".manifold-map",
            ".status-dot", ".status-row",
            ".contrast-high", ".motion-off",
            ".editor-root", ".editor-header", ".editor-body",
            ".macro-deck", ".brand", ".segmented",
        ] {
            assert!(THEME_CSS.contains(token), "theme.css missing `{token}`");
        }
    }

    /// vizia at the pinned rev does NOT support CSS custom properties: every
    /// `--token` declaration is skipped ("Custom Property" warning) and
    /// `var()` never resolves — which shipped an all-defaults white editor
    /// once. Guard both halves: no custom-property syntax may reappear, and
    /// the literal school hexes must equal the world-law derivations in
    /// `tokens` (colors are computed, never chosen — and they HAD silently
    /// drifted before this guard existed).
    #[test]
    fn stylesheet_hex_matches_world_law_derivation() {
        use crate::editor::tokens::{css_hex, FREEZE, PANIC, REACT, SHELL};

        assert!(
            !THEME_CSS.contains("var(") && !THEME_CSS.contains("\n    --"),
            "theme.css uses custom properties, which the pinned vizia rev silently ignores"
        );

        // Colors the stylesheet declares directly. REACT is not in this list:
        // since the canvas rewrite it is consumed only at runtime (Meter /
        // ManifoldMap / StatusDot draw from tokens.rs), which the compiler
        // enforces — CSS never mentions it.
        for (name, hsl) in [("shell", SHELL), ("freeze", FREEZE), ("panic", PANIC)] {
            let expected = css_hex(hsl);
            assert!(
                THEME_CSS.contains(&format!(": {expected};")),
                "theme.css never declares the derived {name} color `{expected}`"
            );
        }
        // REACT still participates in the derivation law even though it is
        // painted in Rust; keep its derivation pinned so a retune shows up
        // in review.
        assert_eq!(css_hex(REACT), "#18d868");
    }
}

#[cfg(test)]
mod compose_tests {
    use super::*;

    #[test]
    fn preset_index_matches_presets_table_order() {
        assert_eq!(preset_index("void-glass"), Some(0));
        assert_eq!(preset_index("substrate-maw"), Some(4));
        assert_eq!(preset_index("nope"), None);
    }

    #[test]
    fn root_class_active_mirrors_root_classes() {
        let mut s = UiState::default();
        assert!(root_class_active(&s, "mode-simple"));
        assert!(!root_class_active(&s, "mode-advanced"));
        assert!(!root_class_active(&s, "contrast-high"));
        assert!(!root_class_active(&s, "motion-off"));
        toggle_contrast(&mut s);
        toggle_motion(&mut s);
        set_mode(&mut s, Mode::Advanced);
        assert!(root_class_active(&s, "mode-advanced"));
        assert!(root_class_active(&s, "contrast-high"));
        assert!(root_class_active(&s, "motion-off"));
        assert!(!root_class_active(&s, "mode-simple"));
    }
}
