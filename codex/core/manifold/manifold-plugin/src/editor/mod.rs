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
use crate::editor::kit::meter::Meter;
use crate::editor::kit::panel_card::PanelCard;
use crate::editor::kit::preset_chip::PresetChip;
use crate::editor::kit::toggle_tile::{ActionButton, ToggleTile};
use crate::editor::state::{
    root_classes, select_preset, set_mode, toggle_contrast, toggle_motion, Mode, UiState,
};
use crate::meter::{peak_to_meter, MeterSnapshot};
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
    params: Arc<ManifoldPluginParams>,
    ui: UiState,
    meter_l: f32,
    meter_r: f32,
    energy: f32,
    #[lens(ignore)]
    meter_src: Arc<MeterSnapshot>,
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
    Poll,
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
            AppEvent::Poll => {
                let (l, r, e) = self.meter_src.read();
                self.meter_l = peak_to_meter(l);
                self.meter_r = peak_to_meter(r);
                self.energy = e;
            }
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
            meter_l: 0.0,
            meter_r: 0.0,
            energy: 0.0,
            meter_src: meter_src.clone(),
            pending_preset: pending_preset.clone(),
            panic_held: false,
        }
        .build(cx);

        // Poll meters ~30fps. ContextProxy::emit returns Err once the editor's
        // event loop is gone (reconciled: Result<(), ProxyEmitError>), which
        // is this thread's exit signal.
        cx.spawn(|cx| loop {
            std::thread::sleep(std::time::Duration::from_millis(33));
            if cx.emit(AppEvent::Poll).is_err() {
                break;
            }
        });

        VStack::new(cx, |cx| {
            header(cx);
            body(cx);
            macro_deck(cx);
        })
        .class("editor-root")
        .toggle_class("mode-simple", Data::ui.map(|u| root_class_active(u, "mode-simple")))
        .toggle_class("mode-advanced", Data::ui.map(|u| root_class_active(u, "mode-advanced")))
        .toggle_class("contrast-high", Data::ui.map(|u| root_class_active(u, "contrast-high")))
        .toggle_class("motion-off", Data::ui.map(|u| root_class_active(u, "motion-off")));
    })
}

fn header(cx: &mut Context) {
    HStack::new(cx, |cx| {
        Label::new(cx, "COCHLEAR MANIFOLD").class("brand");

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

fn body(cx: &mut Context) {
    HStack::new(cx, |cx| {
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
        // Hero map.
        ManifoldMap::new(cx, Data::energy);
        // Meter rail.
        PanelCard::new(cx, "METERS", |cx| {
            Meter::new(cx, Data::meter_l);
            Meter::new(cx, Data::meter_r);
            // Advanced-only readouts.
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
            ".editor-root", ".editor-header", ".editor-body",
            ".macro-deck", ".brand", ".segmented",
        ] {
            assert!(THEME_CSS.contains(token), "theme.css missing `{token}`");
        }
    }

    /// The stylesheet's static school/preset hex declarations must equal the
    /// world-law derivations in `tokens` — colors are computed, never chosen,
    /// and this is what keeps the CSS from silently drifting (it already had,
    /// once, before this guard existed).
    #[test]
    fn stylesheet_hex_matches_world_law_derivation() {
        use crate::editor::tokens::{css_hex, preset_hue, FREEZE, PANIC, REACT, SHELL};

        fn declared(var: &str) -> &'static str {
            let start = THEME_CSS
                .find(var)
                .unwrap_or_else(|| panic!("theme.css missing `{var}`"))
                + var.len();
            let rest = &THEME_CSS[start..];
            let end = rest.find(';').expect("declaration not terminated");
            rest[..end].trim_start_matches([':', ' ']).trim()
        }

        for (var, hsl) in [
            ("--grim-shell", SHELL),
            ("--grim-freeze", FREEZE),
            ("--grim-panic", PANIC),
            ("--grim-react", REACT),
            ("--preset-void-glass", preset_hue("void-glass")),
            ("--preset-ice-circuit", preset_hue("ice-circuit")),
            ("--preset-ash-lung", preset_hue("ash-lung")),
            ("--preset-cathedral-of-teeth", preset_hue("cathedral-of-teeth")),
            ("--preset-substrate-maw", preset_hue("substrate-maw")),
        ] {
            let expected = css_hex(hsl);
            let actual = declared(var);
            assert!(
                actual.starts_with(&expected),
                "theme.css `{var}` is `{actual}` but the world-law derivation is `{expected}`"
            );
        }
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
