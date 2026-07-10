//! Reusable vizia view kit. Views consume theme.css classes for chrome and
//! the `tokens` derivations for any world-law color they paint themselves
//! (the pinned vizia rev has no CSS custom properties, so canvas-drawn views
//! take their colors straight from the sanctioned Rust derivation table).
pub mod knob;
pub mod manifold_map;
pub mod meter;
pub mod panel_card;
pub mod preset_chip;
pub mod status_dot;
pub mod toggle_tile;

use crate::editor::tokens::{hsl_to_rgb, Hsl};
use nih_plug_vizia::vizia::vg;

/// World-law `Hsl` -> femtovg color with alpha, for canvas-drawn views.
pub(crate) fn vg_color(hsl: Hsl, alpha: f32) -> vg::Color {
    let (r, g, b) = hsl_to_rgb(hsl);
    vg::Color::rgba(r, g, b, (alpha.clamp(0.0, 1.0) * 255.0) as u8)
}
