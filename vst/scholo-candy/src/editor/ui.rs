use nih_plug::prelude::*;
use nih_plug_egui::egui;
use crate::params::ScholoCandyParams;
use crate::editor::EditorState;

pub fn draw_ui(
    egui_ctx: &egui::Context,
    setter: &ParamSetter,
    params: &ScholoCandyParams,
    state: &mut EditorState,
) {
    // Custom global styles (PixelBrain font logic could go here later)
    crate::editor::layout::draw_layout(egui_ctx, setter, params, state);
}
