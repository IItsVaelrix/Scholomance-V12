//! vizia editor for the Cochlear Manifold plugin. All GUI code is gated behind
//! the `gui` feature so the lean VST3/CLAP validator build pulls no X11/GL deps.

pub mod kit;
pub mod state;
pub mod tokens;

use std::sync::Arc;

use nih_plug::prelude::Editor;
use nih_plug_vizia::{create_vizia_editor, ViziaState, ViziaTheming};

use crate::ManifoldPluginParams;

const WINDOW_W: u32 = 720;
const WINDOW_H: u32 = 480;

pub fn default_state() -> Arc<ViziaState> {
    ViziaState::new(|| (WINDOW_W, WINDOW_H))
}

pub const THEME_CSS: &str = include_str!("theme.css");

pub fn create_editor(
    editor_state: Arc<ViziaState>,
    params: Arc<ManifoldPluginParams>,
) -> Option<Box<dyn Editor>> {
    create_vizia_editor(editor_state, ViziaTheming::Custom, move |cx, _gui_cx| {
        let _ = &params;
        cx.add_stylesheet(THEME_CSS).ok();
        kit::panel_card::PanelCard::new(cx, "TEST", |_| {});
    })
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
        ] {
            assert!(THEME_CSS.contains(token), "theme.css missing `{token}`");
        }
    }
}
