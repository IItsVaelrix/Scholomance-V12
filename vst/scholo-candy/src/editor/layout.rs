use nih_plug_egui::egui;
use crate::params::ScholoCandyParams;
use nih_plug::prelude::ParamSetter;
use crate::editor::EditorState;
use std::path::Path;

pub fn draw_layout(
    egui_ctx: &egui::Context,
    setter: &ParamSetter,
    params: &ScholoCandyParams,
    state: &mut EditorState,
) {
    // Top Panel: Title and A/B, Undo/Redo
    egui::TopBottomPanel::top("top_panel").show(egui_ctx, |ui| {
        ui.horizontal(|ui| {
            ui.heading("ScholoCandy");
            ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                let is_b = state.history_state.is_b_active;
                let b_color = if is_b { egui::Color32::from_rgb(100, 100, 150) } else { egui::Color32::TRANSPARENT };
                let a_color = if !is_b { egui::Color32::from_rgb(100, 100, 150) } else { egui::Color32::TRANSPARENT };

                if ui.add(egui::Button::new("B").fill(b_color)).clicked() && !is_b {
                    if let Some(snap) = state.history_state.swap_ab(params) {
                        crate::editor::history::apply_snapshot(&snap, params, setter);
                    }
                }
                if ui.add(egui::Button::new("A").fill(a_color)).clicked() && is_b {
                    if let Some(snap) = state.history_state.swap_ab(params) {
                        crate::editor::history::apply_snapshot(&snap, params, setter);
                    }
                }
                ui.separator();
                if ui.button("Redo").clicked() {
                    if let Some(snap) = state.history_state.pop_redo(params) {
                        crate::editor::history::apply_snapshot(&snap, params, setter);
                    }
                }
                if ui.button("Undo").clicked() {
                    if let Some(snap) = state.history_state.pop_undo(params) {
                        crate::editor::history::apply_snapshot(&snap, params, setter);
                    }
                }
            });
        });
    });

    // Left Panel: Preset Browser
    egui::SidePanel::left("preset_browser").show(egui_ctx, |ui| {
        ui.heading("Scrolls");
        if ui.button("Refresh").clicked() {
            state.browser_state.refresh_from_dir(Path::new("golden/factory_scrolls"));
        }
        
        egui::ScrollArea::vertical().show(ui, |ui| {
            for (idx, preset) in state.browser_state.presets.iter().enumerate() {
                let is_selected = state.browser_state.selected == Some(idx);
                if ui.selectable_label(is_selected, &preset.name).clicked() {
                    state.browser_state.selected = Some(idx);
                    if let Ok(file) = std::fs::File::open(&preset.path) {
                        if let Ok(loaded) = serde_json::from_reader::<_, crate::dsp::codec::Preset>(file) {
                            // Apply preset to params
                            setter.begin_set_parameter(&params.output_gain);
                            setter.set_parameter(&params.output_gain, loaded.output_gain_db);
                            setter.end_set_parameter(&params.output_gain);

                            for (i, b) in params.bands.iter().enumerate() {
                                if i >= loaded.bands.len() { break; }
                                let loaded_band = &loaded.bands[i];
                                
                                setter.begin_set_parameter(&b.enabled);
                                setter.set_parameter(&b.enabled, !loaded_band.bypass);
                                setter.end_set_parameter(&b.enabled);

                                setter.begin_set_parameter(&b.filter_type);
                                setter.set_parameter(&b.filter_type, loaded_band.kind);
                                setter.end_set_parameter(&b.filter_type);

                                setter.begin_set_parameter(&b.channel);
                                let mapped_channel = match loaded_band.channel {
                                    crate::dsp::codec::ChannelKind::Stereo => crate::dsp::filter_band::ChannelKind::Stereo,
                                    crate::dsp::codec::ChannelKind::Mid => crate::dsp::filter_band::ChannelKind::Mid,
                                    crate::dsp::codec::ChannelKind::Side => crate::dsp::filter_band::ChannelKind::Side,
                                    crate::dsp::codec::ChannelKind::L => crate::dsp::filter_band::ChannelKind::Left,
                                    crate::dsp::codec::ChannelKind::R => crate::dsp::filter_band::ChannelKind::Right,
                                };
                                setter.set_parameter(&b.channel, mapped_channel);
                                setter.end_set_parameter(&b.channel);

                                setter.begin_set_parameter(&b.freq);
                                setter.set_parameter(&b.freq, loaded_band.frequency);
                                setter.end_set_parameter(&b.freq);

                                setter.begin_set_parameter(&b.gain);
                                setter.set_parameter(&b.gain, loaded_band.gain);
                                setter.end_set_parameter(&b.gain);

                                setter.begin_set_parameter(&b.q);
                                setter.set_parameter(&b.q, loaded_band.q);
                                setter.end_set_parameter(&b.q);
                            }
                            
                            state.history_state.push_undo(params);
                        }
                    }
                }
            }
        });
        
        if let Some(ref err) = state.browser_state.last_scan_error {
            ui.colored_label(egui::Color32::RED, format!("Error: {}", err));
        }
    });

    // Central Panel: Analyzer + Bands
    egui::CentralPanel::default().show(egui_ctx, |ui| {
        let (response, painter) = ui.allocate_painter(
            ui.available_size(),
            egui::Sense::click_and_drag(),
        );
        let rect = response.rect;
        
        // Draw background
        painter.rect_filled(rect, 0.0, egui::Color32::from_rgb(20, 20, 25));
        
        crate::editor::band_node::draw_band_nodes(
            ui,
            rect,
            &painter,
            params,
            setter,
            &state.analyzer,
            &mut state.analyzer_peaks,
            &mut state.active_inspector_band,
        );
        crate::editor::inspector::draw_inspector(ui, params, setter, &mut state.active_inspector_band);
    });
}
