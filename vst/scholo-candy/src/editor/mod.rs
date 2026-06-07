use nih_plug::prelude::*;
use nih_plug_egui::egui;
use std::sync::Arc;
use crate::params::ScholoCandyParams;

pub mod ui;
pub mod layout;
pub mod theme;
pub mod band_node;
pub mod inspector;
pub mod preset_browser;
pub mod history;

use crate::dsp::analyzer::{SpectrumAnalyzer, NUM_COLUMNS};

pub struct EditorState {
    pub browser_state: preset_browser::PresetBrowserState,
    pub history_state: history::HistoryState,
    pub active_inspector_band: Option<usize>,
    /// Shared live spectrum source written by the audio thread (PDR #31).
    pub analyzer: Arc<SpectrumAnalyzer>,
    /// Per-column peak-hold envelope, persisted across frames.
    pub analyzer_peaks: Vec<f32>,
}

impl EditorState {
    pub fn new(analyzer: Arc<SpectrumAnalyzer>) -> Self {
        Self {
            browser_state: preset_browser::PresetBrowserState::new(),
            history_state: history::HistoryState::new(),
            active_inspector_band: None,
            analyzer,
            analyzer_peaks: vec![-120.0; NUM_COLUMNS],
        }
    }
}

pub fn create_editor(
    params: Arc<ScholoCandyParams>,
    analyzer: Arc<SpectrumAnalyzer>,
) -> Option<Box<dyn Editor>> {
    nih_plug_egui::create_egui_editor(
        params.editor_state.clone(),
        EditorState::new(analyzer),
        |_, _state| {
            // Can initialize fonts/themes here later
        },
        move |egui_ctx, setter, state| {
            ui::draw_ui(egui_ctx, setter, &params, state);
        },
    )
}
