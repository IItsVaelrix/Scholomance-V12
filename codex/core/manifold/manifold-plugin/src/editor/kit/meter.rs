use std::sync::Arc;

use nih_plug_vizia::vizia::prelude::*;
use nih_plug_vizia::vizia::vg;

use crate::editor::kit::vg_color;
use crate::editor::tokens::REACT;
use crate::meter::{peak_to_meter, MeterSnapshot};

/// Which channel of the snapshot this bar displays.
#[derive(Clone, Copy)]
pub enum MeterChannel {
    Left,
    Right,
}

/// Thin horizontal level bar (spec §3.2 #6). Reads its channel's peak from
/// the lock-free snapshot during `draw()` — the baseview backend renders
/// every frame, so no polling thread or event traffic is needed (same
/// pattern as nih_plug_vizia's own PeakMeter).
pub struct Meter {
    viz: Arc<MeterSnapshot>,
    channel: MeterChannel,
}

impl Meter {
    pub fn new<'a>(
        cx: &'a mut Context,
        viz: Arc<MeterSnapshot>,
        channel: MeterChannel,
    ) -> Handle<'a, Self> {
        Self { viz, channel }.build(cx, |_| {}).class("meter")
    }
}

impl View for Meter {
    fn element(&self) -> Option<&'static str> {
        Some("meter")
    }

    fn draw(&self, cx: &mut DrawContext, canvas: &mut Canvas) {
        let bounds = cx.bounds();
        if bounds.w <= 0.0 || bounds.h <= 0.0 {
            return;
        }
        let opacity = cx.opacity();
        let radius = cx.border_top_left_radius();

        // Track: the CSS background color (theme.css .meter).
        let mut track: vg::Color = cx.background_color().into();
        track.set_alphaf(track.a * opacity);
        let mut path = vg::Path::new();
        path.rounded_rect(bounds.x, bounds.y, bounds.w, bounds.h, radius);
        canvas.fill_path(&path, &vg::Paint::color(track));

        // Fill: NECROMANCY green (spec §2 Reactivity/energy), scaled by the
        // channel's peak on the -60..0 dBFS meter law.
        let peak = match self.channel {
            MeterChannel::Left => self.viz.peak_l(),
            MeterChannel::Right => self.viz.peak_r(),
        };
        let frac = peak_to_meter(peak);
        if frac > 0.001 {
            let mut fill = vg::Path::new();
            fill.rounded_rect(bounds.x, bounds.y, bounds.w * frac, bounds.h, radius);
            canvas.fill_path(&fill, &vg::Paint::color(vg_color(REACT, 0.9 * opacity)));
        }
    }
}
