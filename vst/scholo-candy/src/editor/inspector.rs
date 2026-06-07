use nih_plug_egui::egui;
use crate::params::ScholoCandyParams;
use nih_plug::prelude::{ParamSetter, Enum};
use crate::dsp::filter_band::{FilterType, ChannelKind};

pub fn draw_inspector(
    ui: &mut egui::Ui,
    params: &ScholoCandyParams,
    setter: &ParamSetter,
    active_inspector: &mut Option<usize>,
) {
    if let Some(idx) = *active_inspector {
        if idx >= params.bands.len() {
            *active_inspector = None;
            return;
        }
        
        let band = &params.bands[idx];
        let mut open = true;
        
        egui::Window::new(format!("Band {} Inspector", idx + 1))
            .open(&mut open)
            .collapsible(false)
            .resizable(false)
            .show(ui.ctx(), |ui| {
                ui.horizontal(|ui| {
                    ui.label("Enabled:");
                    let mut enabled = band.enabled.value();
                    if ui.checkbox(&mut enabled, "").changed() {
                        setter.begin_set_parameter(&band.enabled);
                        setter.set_parameter(&band.enabled, enabled);
                        setter.end_set_parameter(&band.enabled);
                    }
                });

                ui.horizontal(|ui| {
                    ui.label("Type:");
                    let mut current_type = band.filter_type.value();
                    egui::ComboBox::from_id_source("type_combo")
                        .selected_text(current_type.name())
                        .show_ui(ui, |ui| {
                            for variant in FilterType::variants() {
                                if ui.selectable_value(&mut current_type, variant, variant.name()).changed() {
                                    setter.begin_set_parameter(&band.filter_type);
                                    setter.set_parameter(&band.filter_type, current_type);
                                    setter.end_set_parameter(&band.filter_type);
                                }
                            }
                        });
                });

                ui.horizontal(|ui| {
                    ui.label("Channel:");
                    let mut current_channel = band.channel.value();
                    egui::ComboBox::from_id_source("channel_combo")
                        .selected_text(current_channel.name())
                        .show_ui(ui, |ui| {
                            for variant in ChannelKind::variants() {
                                if ui.selectable_value(&mut current_channel, variant, variant.name()).changed() {
                                    setter.begin_set_parameter(&band.channel);
                                    setter.set_parameter(&band.channel, current_channel);
                                    setter.end_set_parameter(&band.channel);
                                }
                            }
                        });
                });

                ui.horizontal(|ui| {
                    ui.label("Freq:");
                    let mut f = band.freq.value();
                    if ui.add(egui::DragValue::new(&mut f).speed(1.0).range(20.0..=20000.0)).changed() {
                        setter.begin_set_parameter(&band.freq);
                        setter.set_parameter(&band.freq, f);
                        setter.end_set_parameter(&band.freq);
                    }
                });

                ui.horizontal(|ui| {
                    ui.label("Gain:");
                    let mut g = band.gain.value();
                    if ui.add(egui::DragValue::new(&mut g).speed(0.1).range(-24.0..=24.0)).changed() {
                        setter.begin_set_parameter(&band.gain);
                        setter.set_parameter(&band.gain, g);
                        setter.end_set_parameter(&band.gain);
                    }
                });

                ui.horizontal(|ui| {
                    ui.label("Q:");
                    let mut q = band.q.value();
                    if ui.add(egui::DragValue::new(&mut q).speed(0.01).range(0.05..=24.0)).changed() {
                        setter.begin_set_parameter(&band.q);
                        setter.set_parameter(&band.q, q);
                        setter.end_set_parameter(&band.q);
                    }
                });
            });
            
        if !open {
            *active_inspector = None;
        }
    }
}
