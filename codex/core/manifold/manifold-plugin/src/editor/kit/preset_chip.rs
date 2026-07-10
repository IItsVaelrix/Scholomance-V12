use nih_plug_vizia::vizia::prelude::*;

use crate::editor::tokens::{hsl_to_rgb, preset_hue, Hsl};

/// Converts a world-law `Hsl` into a vizia `Color` via the pure math in
/// `tokens::hsl_to_rgb`.
///
/// Reconciled against the pinned vizia rev (e3fab55): `Color::from(&str)`
/// does route through the CSS parser (`cssparser` does understand
/// `hsl(...)` syntax), but on any parse failure it silently falls back to
/// `Color::default()` (`CurrentColor`) via `unwrap_or_default()` — a
/// footgun for a string we're hand-formatting. Doing the HSL->RGB
/// conversion ourselves in pure math and constructing `Color::rgb(..)`
/// directly avoids that failure mode entirely.
fn hsl_to_color(c: Hsl) -> Color {
    let (r, g, b) = hsl_to_rgb(c);
    Color::rgb(r, g, b)
}

/// Preset selector chip (spec §3.2 #5), self-colored by world-law hue.
///
/// Reconciled against the pinned vizia rev (e3fab55):
/// - `Button::new` takes `(cx, action, content)`, not the brief's
///   `.on_press(..)` modifier form — same pattern as `ActionButton` in
///   `toggle_tile.rs`.
/// - `.checked(lens)` is `StyleModifiers::checked<U: Into<bool>>(self, impl
///   Res<U>)`, blanket-implemented for `Handle<'a, V: View>`; any
///   `Lens<Target = bool>` satisfies `Res<bool>` via vizia's blanket
///   `impl<L: Lens> Res<L::Target> for L`, so `selected` can be passed
///   straight through with no extra bound.
pub struct PresetChip;

impl PresetChip {
    pub fn new<'a, LSel, F>(
        cx: &'a mut Context,
        name: &'static str,
        selected: LSel,
        on_select: F,
    ) -> Handle<'a, impl View>
    where
        LSel: Lens<Target = bool>,
        F: Fn(&mut EventContext) + 'static,
    {
        let color = hsl_to_color(preset_hue(name));
        Button::new(cx, move |cx| on_select(cx), move |cx| Label::new(cx, name))
            .checked(selected)
            .border_color(color)
            .class("preset-chip")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn preset_hue_derivation_feeds_distinct_colors() {
        // Sanity check that the chip's color still comes from
        // `tokens::preset_hue` (a known preset differs from the unknown
        // fallback), not a hardcoded literal in this file.
        let known = hsl_to_color(preset_hue("cathedral-of-teeth"));
        let unknown = hsl_to_color(preset_hue("totally-unknown-preset"));
        assert_ne!((known.r(), known.g(), known.b()), (unknown.r(), unknown.g(), unknown.b()));
    }
}
