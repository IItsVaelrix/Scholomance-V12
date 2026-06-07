use nih_plug_egui::egui::{self, Color32, Rect, Sense, Stroke};
use crate::editor::theme::get_school_colors;
use crate::editor::theme::SchoolTheme;
use crate::dsp::analyzer::{SpectrumAnalyzer, NUM_COLUMNS};
use crate::params::ScholoCandyParams;
use nih_plug::prelude::ParamSetter;
use std::time::Duration;

pub fn draw_band_nodes(
    ui: &mut egui::Ui,
    rect: Rect,
    painter: &egui::Painter,
    params: &ScholoCandyParams,
    setter: &ParamSetter,
    analyzer: &SpectrumAnalyzer,
    peaks: &mut Vec<f32>,
    active_inspector: &mut Option<usize>,
) {
    // Temporary EQ for curve rendering
    let mut temp_eq = crate::dsp::ScholoCandyEq::new(48000.0);
    temp_eq.output_gain_db = params.output_gain.value();
    for i in 0..temp_eq.bands.len() {
        let band_params = &params.bands[i];
        temp_eq.bands[i].set_params(
            band_params.enabled.value(),
            band_params.filter_type.value(),
            band_params.channel.value(),
            band_params.freq.value(),
            band_params.gain.value(),
            band_params.q.value()
        );
    }

    let min_f = 20.0_f32;
    let max_f = 20000.0_f32;
    let freq_to_x = |f: f32| -> f32 {
        let log_f = f.log2();
        let min_log = min_f.log2();
        let max_log = max_f.log2();
        rect.left() + rect.width() * ((log_f - min_log) / (max_log - min_log))
    };

    let x_to_freq = |x: f32| -> f32 {
        let norm = (x - rect.left()) / rect.width();
        let min_log = min_f.log2();
        let max_log = max_f.log2();
        2.0_f32.powf(min_log + norm * (max_log - min_log))
    };

    let gain_to_y = |g: f32| -> f32 {
        let norm = (g + 24.0) / 48.0; // -24 to 24 mapping
        rect.bottom() - rect.height() * norm
    };
    
    let y_to_gain = |y: f32| -> f32 {
        let norm = (rect.bottom() - y) / rect.height();
        norm * 48.0 - 24.0
    };

    // ---- Live spectrum analyzer (drawn first, behind the EQ curve) (#31, F-5) ----
    {
        let mut cols = [0.0f32; NUM_COLUMNS];
        analyzer.compute_columns(&mut cols);
        if peaks.len() != NUM_COLUMNS {
            *peaks = vec![-120.0; NUM_COLUMNS];
        }
        let dt = ui.input(|i| i.stable_dt).clamp(0.0, 0.1);
        let fall_db = 20.0 * dt; // ~20 dB/s peak-hold fall
        let db_to_y = |db: f32| {
            let n = ((db + 90.0) / 90.0).clamp(0.0, 1.0);
            rect.bottom() - rect.height() * n
        };
        let spec = get_school_colors(SchoolTheme::Sonic);
        let bar = Color32::from_rgba_unmultiplied(spec.stroke.r(), spec.stroke.g(), spec.stroke.b(), 76); // ~30%
        let col_w = (rect.width() / NUM_COLUMNS as f32).max(1.0);
        let mut peak_pts = Vec::with_capacity(NUM_COLUMNS);
        for c in 0..NUM_COLUMNS {
            peaks[c] = (peaks[c] - fall_db).max(cols[c]);
            let t = c as f32 / (NUM_COLUMNS as f32 - 1.0);
            let x = rect.left() + rect.width() * t;
            painter.line_segment(
                [egui::pos2(x, rect.bottom()), egui::pos2(x, db_to_y(cols[c]))],
                Stroke::new(col_w, bar),
            );
            peak_pts.push(egui::pos2(x, db_to_y(peaks[c])));
        }
        let peak_col =
            Color32::from_rgba_unmultiplied(spec.stroke.r(), spec.stroke.g(), spec.stroke.b(), 140);
        painter.add(egui::Shape::line(peak_pts, Stroke::new(1.0, peak_col)));
        // Animate ~30 fps without busy-looping the UI thread (PDR: RAF capped 30 fps).
        ui.ctx().request_repaint_after(Duration::from_millis(33));
    }

    // Draw center line (0dB)
    let center_y = gain_to_y(0.0);
    painter.line_segment(
        [egui::pos2(rect.left(), center_y), egui::pos2(rect.right(), center_y)],
        (1.0, egui::Color32::from_rgb(100, 100, 100))
    );

    // Draw curve
    let mut points = vec![];
    let steps = 400;
    for i in 0..=steps {
        let x = rect.left() + rect.width() * (i as f32 / steps as f32);
        let freq = x_to_freq(x);
        let mag = temp_eq.magnitude_response(freq);
        let mag_db = if mag > 1e-6 { 20.0 * mag.log10() } else { -100.0 };
        let y = gain_to_y(mag_db).clamp(rect.top(), rect.bottom());
        points.push(egui::pos2(x, y));
    }

    painter.add(egui::Shape::line(
        points,
        egui::Stroke::new(2.0, egui::Color32::from_rgb(200, 150, 255))
    ));

    // Handle interaction
    // We need to capture input from the rect area
    let response = ui.interact(rect, ui.id().with("band_nodes"), Sense::click_and_drag());
    let mouse_pos = response.hover_pos();
    let mut interact_idx = None;

    for (i, band) in params.bands.iter().enumerate() {
        let enabled = band.enabled.value();
        // Per-band school color (PDR §6 / DoD §5) instead of a single hardcoded gray.
        let theme = get_school_colors(SchoolTheme::for_band(i));

        let x = freq_to_x(band.freq.value());
        let y = gain_to_y(band.gain.value());
        let pos = egui::pos2(x, y);

        // Bypassed bands ghost out (so they stay grabbable to re-enable) rather than
        // vanishing entirely (PDR F-6, #32).
        let (glow, fill, stroke) = if enabled {
            (theme.glow, theme.fill, theme.stroke)
        } else {
            (ghost(theme.glow), ghost(theme.fill), ghost(theme.stroke))
        };

        painter.circle_filled(pos, 12.0, glow);
        painter.circle_filled(pos, 6.0, fill);
        painter.circle_stroke(pos, 6.0, Stroke::new(1.5, stroke));

        // Band number, so overlapping/nearby nodes stay distinguishable.
        painter.text(
            pos,
            egui::Align2::CENTER_CENTER,
            format!("{}", i + 1),
            egui::FontId::proportional(10.0),
            egui::Color32::from_rgb(12, 12, 18),
        );

        if let Some(mp) = mouse_pos {
            if pos.distance(mp) < 12.0 {
                interact_idx = Some(i);
            }
        }
    }

    // Drag logic
    if response.dragged() {
        if let Some(idx) = interact_idx {
            if let Some(pos) = response.interact_pointer_pos() {
                let band = &params.bands[idx];
                let new_f = x_to_freq(pos.x).clamp(20.0, 20000.0);
                let new_g = y_to_gain(pos.y).clamp(-24.0, 24.0);
                
                setter.begin_set_parameter(&band.freq);
                setter.set_parameter(&band.freq, new_f);
                setter.end_set_parameter(&band.freq);
                
                setter.begin_set_parameter(&band.gain);
                setter.set_parameter(&band.gain, new_g);
                setter.end_set_parameter(&band.gain);
            }
        }
    }

    // Scroll wheel for Q and fine gain
    if response.hovered() {
        if let Some(idx) = interact_idx {
            let band = &params.bands[idx];
            let scroll = ui.input(|i| i.raw_scroll_delta.y);
            if scroll != 0.0 {
                let modifiers = ui.input(|i| i.modifiers);
                if modifiers.shift {
                    // Fine gain
                    let current_g = band.gain.value();
                    let new_g = (current_g + scroll * 0.01).clamp(-24.0, 24.0);
                    setter.begin_set_parameter(&band.gain);
                    setter.set_parameter(&band.gain, new_g);
                    setter.end_set_parameter(&band.gain);
                } else if modifiers.alt {
                    // Fine Q
                    let current_q = band.q.value();
                    let new_q = (current_q + scroll * 0.001).clamp(0.05, 24.0);
                    setter.begin_set_parameter(&band.q);
                    setter.set_parameter(&band.q, new_q);
                    setter.end_set_parameter(&band.q);
                } else {
                    // Normal Q
                    let current_q = band.q.value();
                    let new_q = (current_q + scroll * 0.01).clamp(0.05, 24.0);
                    setter.begin_set_parameter(&band.q);
                    setter.set_parameter(&band.q, new_q);
                    setter.end_set_parameter(&band.q);
                }
            }
        }
    }

    // Right-click inspector
    if response.clicked_by(egui::PointerButton::Secondary) {
        if let Some(idx) = interact_idx {
            *active_inspector = Some(idx);
        } else {
            *active_inspector = None;
        }
    } else if response.clicked_by(egui::PointerButton::Primary) {
        // If clicking on empty space, close inspector
        if interact_idx.is_none() {
            *active_inspector = None;
        }
    }

    // Cmd/Ctrl+B toggles bypass on the hovered band (#32 "Rite of Bypass").
    if let Some(idx) = interact_idx {
        let toggle_bypass = ui.input(|i| i.modifiers.command && i.key_pressed(egui::Key::B));
        if toggle_bypass {
            let band = &params.bands[idx];
            let new_enabled = !band.enabled.value();
            setter.begin_set_parameter(&band.enabled);
            setter.set_parameter(&band.enabled, new_enabled);
            setter.end_set_parameter(&band.enabled);
        }
    }
}

/// Dim a color to ~15% opacity for ghosting bypassed band nodes.
fn ghost(c: Color32) -> Color32 {
    Color32::from_rgba_unmultiplied(c.r(), c.g(), c.b(), 40)
}
