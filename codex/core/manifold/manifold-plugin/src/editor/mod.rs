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
