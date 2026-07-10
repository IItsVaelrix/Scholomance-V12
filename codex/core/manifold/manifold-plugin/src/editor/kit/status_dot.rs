use std::sync::Arc;

use nih_plug_vizia::vizia::prelude::*;
use nih_plug_vizia::vizia::vg;

use crate::editor::kit::vg_color;
use crate::editor::tokens::{PANIC, REACT};
use crate::meter::MeterSnapshot;

/// Which safety-governor signal (ProcessReport) this LED reflects.
#[derive(Clone, Copy)]
pub enum StatusKind {
    /// Green while the CPU class budget holds, red-orange when exceeded.
    Cpu,
    /// Green while output is clean, red-orange while the governor clips.
    Clip,
}

/// Tiny live LED for the Advanced readout row. Reads the lock-free snapshot
/// during draw (per-frame render, no events). Healthy = REACT green,
/// fault = PANIC red-orange — the paired text Label carries the meaning, so
/// state is not conveyed by color alone.
pub struct StatusDot {
    viz: Arc<MeterSnapshot>,
    kind: StatusKind,
}

impl StatusDot {
    pub fn new<'a>(
        cx: &'a mut Context,
        viz: Arc<MeterSnapshot>,
        kind: StatusKind,
    ) -> Handle<'a, Self> {
        Self { viz, kind }.build(cx, |_| {}).class("status-dot")
    }
}

impl View for StatusDot {
    fn element(&self) -> Option<&'static str> {
        Some("status-dot")
    }

    fn draw(&self, cx: &mut DrawContext, canvas: &mut Canvas) {
        let bounds = cx.bounds();
        if bounds.w <= 0.0 || bounds.h <= 0.0 {
            return;
        }
        let healthy = match self.kind {
            StatusKind::Cpu => self.viz.cpu_ok(),
            StatusKind::Clip => !self.viz.clipped(),
        };
        let color = if healthy { REACT } else { PANIC };
        let alpha = if healthy { 0.55 } else { 1.0 };
        let r = (bounds.w.min(bounds.h) / 2.0) - 1.0;
        let mut dot = vg::Path::new();
        dot.circle(bounds.x + bounds.w / 2.0, bounds.y + bounds.h / 2.0, r.max(1.0));
        canvas.fill_path(&dot, &vg::Paint::color(vg_color(color, alpha * cx.opacity())));
    }
}
