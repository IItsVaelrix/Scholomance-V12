use nih_plug_vizia::vizia::prelude::*;

use crate::editor::tokens::{preset_hue, Hsl};

/// Converts a world-law `Hsl` (spec §2 units: `h` in degrees 0-360, `s`/`l`
/// in percent 0-100) into a vizia `Color`.
///
/// Reconciled against the pinned vizia rev (e3fab55): `Color::from(&str)`
/// does route through the CSS parser (`cssparser` does understand
/// `hsl(...)` syntax), but on any parse failure it silently falls back to
/// `Color::default()` (`CurrentColor`) via `unwrap_or_default()` — a
/// footgun for a string we're hand-formatting. Doing the HSL->RGB
/// conversion ourselves in pure math and constructing `Color::rgb(..)`
/// directly avoids that failure mode entirely and is unit-testable without
/// spinning up a CSS parser.
fn hsl_to_color(c: Hsl) -> Color {
    let h = c.h.rem_euclid(360.0) / 360.0;
    let s = (c.s / 100.0).clamp(0.0, 1.0);
    let l = (c.l / 100.0).clamp(0.0, 1.0);

    if s == 0.0 {
        let v = (l * 255.0).round() as u8;
        return Color::rgb(v, v, v);
    }

    let q = if l < 0.5 { l * (1.0 + s) } else { l + s - l * s };
    let p = 2.0 * l - q;

    let r = hue_to_channel(p, q, h + 1.0 / 3.0);
    let g = hue_to_channel(p, q, h);
    let b = hue_to_channel(p, q, h - 1.0 / 3.0);

    Color::rgb(
        (r * 255.0).round() as u8,
        (g * 255.0).round() as u8,
        (b * 255.0).round() as u8,
    )
}

/// Standard CSS-Color HSL->RGB hue channel helper (`t` pre-shifted by
/// 1/3 per channel by the caller).
fn hue_to_channel(p: f32, q: f32, mut t: f32) -> f32 {
    if t < 0.0 {
        t += 1.0;
    }
    if t > 1.0 {
        t -= 1.0;
    }
    if t < 1.0 / 6.0 {
        return p + (q - p) * 6.0 * t;
    }
    if t < 1.0 / 2.0 {
        return q;
    }
    if t < 2.0 / 3.0 {
        return p + (q - p) * (2.0 / 3.0 - t) * 6.0;
    }
    p
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
    fn hsl_to_color_matches_known_primaries() {
        let red = hsl_to_color(Hsl { h: 0.0, s: 100.0, l: 50.0 });
        assert_eq!((red.r(), red.g(), red.b()), (255, 0, 0));

        let green = hsl_to_color(Hsl { h: 120.0, s: 100.0, l: 50.0 });
        assert_eq!((green.r(), green.g(), green.b()), (0, 255, 0));

        let blue = hsl_to_color(Hsl { h: 240.0, s: 100.0, l: 50.0 });
        assert_eq!((blue.r(), blue.g(), blue.b()), (0, 0, 255));
    }

    #[test]
    fn hsl_to_color_achromatic_is_gray() {
        let gray = hsl_to_color(Hsl { h: 0.0, s: 0.0, l: 50.0 });
        assert_eq!((gray.r(), gray.g(), gray.b()), (128, 128, 128));
    }

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
