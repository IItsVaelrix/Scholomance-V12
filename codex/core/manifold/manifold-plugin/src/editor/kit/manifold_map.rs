use std::sync::Arc;

use nih_plug_vizia::vizia::prelude::*;
use nih_plug_vizia::vizia::vg;

use crate::editor::kit::vg_color;
use crate::editor::tokens::{FREEZE, PANIC, REACT, SHELL};
use crate::meter::MeterSnapshot;
use crate::ManifoldPluginParams;

/// Hero visualizer (spec §3.2 #7): a one-point-perspective wireframe room
/// whose surfaces glow with the live spectral state of the manifold. Every
/// visual quantity maps to a named signal — nothing is decorative:
///
///   room depth        <- Manifold Size param (bigger = deeper room)
///   floor glow        <- low band   (REACT green: the "living" energy hue)
///   back-wall glow    <- mid band   (SHELL magenta: the instrument voice)
///   ceiling glow      <- high band  (FREEZE indigo: air/shimmer)
///   left/right walls  <- channel peaks (stereo balance at a glance)
///   core orb radius   <- block RMS, gain-scaled by Reactivity
///   overall intensity <- Wet/Dry (dry = the room goes dormant)
///   frozen veil       <- Freeze param (indigo wash while latched)
///   red frame flash   <- safety governor clip report (PANIC red-orange)
///
/// Reads the lock-free snapshot + params during `draw()`; baseview renders
/// every frame so the room animates with zero event traffic (the same
/// pattern as nih_plug_vizia's PeakMeter). Fully deterministic: same
/// state -> same pixels.
pub struct ManifoldMap {
    viz: Arc<MeterSnapshot>,
    params: Arc<ManifoldPluginParams>,
}

impl ManifoldMap {
    pub fn new<'a>(
        cx: &'a mut Context,
        viz: Arc<MeterSnapshot>,
        params: Arc<ManifoldPluginParams>,
    ) -> Handle<'a, Self> {
        Self { viz, params }.build(cx, |_| {}).class("manifold-map")
    }
}

/// Front + back rectangles of the perspective room, in pixels.
struct Room {
    fx: f32,
    fy: f32,
    fw: f32,
    fh: f32,
    bx: f32,
    by: f32,
    bw: f32,
    bh: f32,
}

impl Room {
    /// `depth` 0..1: how far away the back wall sits (Manifold Size).
    fn new(bounds: &BoundingBox, depth: f32) -> Self {
        let margin = bounds.w.min(bounds.h) * 0.08;
        let fx = bounds.x + margin;
        let fy = bounds.y + margin;
        let fw = bounds.w - margin * 2.0;
        let fh = bounds.h - margin * 2.0;
        // Back wall shrinks toward the vanishing point as depth grows.
        let k = 0.72 - depth * 0.42; // depth 0 -> 0.72, depth 1 -> 0.30
        let bw = fw * k;
        let bh = fh * k;
        let bx = fx + (fw - bw) / 2.0;
        // Horizon slightly above center reads as a floor-heavy room.
        let by = fy + (fh - bh) * 0.44;
        Self { fx, fy, fw, fh, bx, by, bw, bh }
    }
}

fn quad(path: &mut vg::Path, p: [(f32, f32); 4]) {
    path.move_to(p[0].0, p[0].1);
    path.line_to(p[1].0, p[1].1);
    path.line_to(p[2].0, p[2].1);
    path.line_to(p[3].0, p[3].1);
    path.close();
}

impl View for ManifoldMap {
    fn element(&self) -> Option<&'static str> {
        Some("manifold-map")
    }

    fn draw(&self, cx: &mut DrawContext, canvas: &mut Canvas) {
        let bounds = cx.bounds();
        if bounds.w <= 0.0 || bounds.h <= 0.0 {
            return;
        }
        let opacity = cx.opacity();

        // ---- State in (the whole visual contract) --------------------------
        let (low, mid, high) = self.viz.bands();
        let rms = self.viz.rms();
        let peak_l = self.viz.peak_l();
        let peak_r = self.viz.peak_r();
        let clipped = self.viz.clipped();
        let size = self.params.size.value();
        let reactivity = self.params.reactivity.value();
        let wet = self.params.wet.value();
        let frozen = self.params.freeze.value();

        // Dry signal = dormant room; wet = fully lit.
        let master = (0.30 + 0.70 * wet) * opacity;
        // Reactivity is the visual gain of the living surfaces.
        let gain = 0.55 + reactivity * 0.9;
        let lvl = |v: f32| (v * gain).clamp(0.0, 1.0);

        // ---- Panel base -----------------------------------------------------
        let mut bg: vg::Color = cx.background_color().into();
        bg.set_alphaf(bg.a * opacity);
        let mut base = vg::Path::new();
        base.rounded_rect(bounds.x, bounds.y, bounds.w, bounds.h, cx.border_top_left_radius());
        canvas.fill_path(&base, &vg::Paint::color(bg));

        let room = Room::new(&bounds, size);
        let (fx, fy, fw, fh) = (room.fx, room.fy, room.fw, room.fh);
        let (bx, by, bw, bh) = (room.bx, room.by, room.bw, room.bh);
        // Front / back corners.
        let f = [(fx, fy), (fx + fw, fy), (fx + fw, fy + fh), (fx, fy + fh)];
        let b = [(bx, by), (bx + bw, by), (bx + bw, by + bh), (bx, by + bh)];

        // ---- Surface glows (spectral state of the room) ---------------------
        // Floor: low band, REACT green.
        let mut floor = vg::Path::new();
        quad(&mut floor, [f[3], f[2], b[2], b[3]]);
        canvas.fill_path(&floor, &vg::Paint::color(vg_color(REACT, lvl(low) * 0.55 * master)));
        // Ceiling: high band, FREEZE indigo.
        let mut ceil = vg::Path::new();
        quad(&mut ceil, [f[0], f[1], b[1], b[0]]);
        canvas.fill_path(&ceil, &vg::Paint::color(vg_color(FREEZE, lvl(high) * 0.45 * master)));
        // Back wall: mid band, SHELL magenta.
        let mut back = vg::Path::new();
        back.rect(bx, by, bw, bh);
        canvas.fill_path(&back, &vg::Paint::color(vg_color(SHELL, lvl(mid) * 0.40 * master)));
        // Side walls: channel peaks (stereo balance), REACT dimmed.
        let mut left_wall = vg::Path::new();
        quad(&mut left_wall, [f[0], b[0], b[3], f[3]]);
        canvas
            .fill_path(&left_wall, &vg::Paint::color(vg_color(REACT, lvl(peak_l) * 0.30 * master)));
        let mut right_wall = vg::Path::new();
        quad(&mut right_wall, [f[1], b[1], b[2], f[2]]);
        canvas
            .fill_path(&right_wall, &vg::Paint::color(vg_color(REACT, lvl(peak_r) * 0.30 * master)));

        // ---- Wireframe ------------------------------------------------------
        let frame = vg::Color::rgba(0x3a, 0x42, 0x48, (200.0 * opacity) as u8);
        let mut wire = vg::Path::new();
        wire.rect(bx, by, bw, bh);
        for i in 0..4 {
            wire.move_to(f[i].0, f[i].1);
            wire.line_to(b[i].0, b[i].1);
        }
        let mut wire_paint = vg::Paint::color(frame);
        wire_paint.set_line_width(1.0);
        canvas.stroke_path(&wire, &wire_paint);

        // Floor grid: depth lines brightening with the low band.
        let grid_alpha = (0.10 + lvl(low) * 0.45) * master;
        let mut grid = vg::Path::new();
        for step in 1..4 {
            let t = step as f32 / 4.0;
            let y = fy + fh + (by + bh - (fy + fh)) * t;
            let xl = fx + (bx - fx) * t;
            let xr = fx + fw + (bx + bw - (fx + fw)) * t;
            grid.move_to(xl, y);
            grid.line_to(xr, y);
        }
        for step in 1..4 {
            let t = step as f32 / 4.0;
            grid.move_to(fx + fw * t, fy + fh);
            grid.line_to(bx + bw * t, by + bh);
        }
        let mut grid_paint = vg::Paint::color(vg_color(REACT, grid_alpha));
        grid_paint.set_line_width(1.0);
        canvas.stroke_path(&grid, &grid_paint);

        // ---- Core orb (overall energy, Reactivity-scaled) -------------------
        let cx_orb = bx + bw / 2.0;
        let cy_orb = by + bh * 0.72; // seated toward the floor of the room
        let r_orb = (bounds.w.min(bounds.h) * (0.045 + lvl(rms) * 0.16)).max(3.0);
        let orb_paint = vg::Paint::radial_gradient(
            cx_orb,
            cy_orb,
            r_orb * 0.15,
            r_orb,
            vg_color(SHELL, 0.95 * master),
            vg_color(SHELL, 0.0),
        );
        let mut orb = vg::Path::new();
        orb.circle(cx_orb, cy_orb, r_orb);
        canvas.fill_path(&orb, &orb_paint);

        // ---- Latched / fault states -----------------------------------------
        if frozen {
            let mut veil = vg::Path::new();
            veil.rect(fx, fy, fw, fh);
            canvas.fill_path(&veil, &vg::Paint::color(vg_color(FREEZE, 0.14 * opacity)));
        }
        if clipped {
            let mut flash = vg::Path::new();
            flash.rect(fx, fy, fw, fh);
            let mut flash_paint = vg::Paint::color(vg_color(PANIC, 0.85 * opacity));
            flash_paint.set_line_width(2.0);
            canvas.stroke_path(&flash, &flash_paint);
        }
    }
}
