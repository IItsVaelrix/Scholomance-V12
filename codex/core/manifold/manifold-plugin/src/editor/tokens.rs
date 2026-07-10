//! Pure, window-free color derivation from GrimDesign world-law signals.
//! Values are authoritative from the design spec §2 and never chosen ad hoc.

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Hsl {
    pub h: f32,
    pub s: f32,
    pub l: f32,
}

// Consumed both by theme.css (literal declarations locked to these values by
// the drift-guard test in `editor::theme_tests`) and at runtime by the
// canvas-drawn kit views (ManifoldMap, Meter, StatusDot).
pub const SHELL: Hsl = Hsl { h: 340.0, s: 85.0, l: 51.0 };
pub const FREEZE: Hsl = Hsl { h: 239.0, s: 82.0, l: 53.0 };
pub const PANIC: Hsl = Hsl { h: 12.0, s: 85.0, l: 51.0 };
pub const REACT: Hsl = Hsl { h: 145.0, s: 80.0, l: 47.0 };

/// GrimDesign preset hues (spec §2). Unknown names inherit the instrument shell.
pub fn preset_hue(name: &str) -> Hsl {
    match name {
        "void-glass" | "ash-lung" => Hsl { h: 0.0, s: 85.0, l: 48.0 },
        "ice-circuit" => Hsl { h: 90.0, s: 83.0, l: 58.0 },
        "cathedral-of-teeth" => Hsl { h: 290.0, s: 88.0, l: 54.0 },
        "substrate-maw" => Hsl { h: 23.0, s: 88.0, l: 58.0 },
        _ => SHELL,
    }
}

/// Converts a world-law `Hsl` (spec §2 units: `h` in degrees 0-360, `s`/`l`
/// in percent 0-100) into 8-bit RGB channels. Standard CSS-Color HSL->RGB.
/// Pure math so it stays window-free and unit-testable; the vizia `Color`
/// wrapper lives in `kit::preset_chip`.
pub fn hsl_to_rgb(c: Hsl) -> (u8, u8, u8) {
    let h = c.h.rem_euclid(360.0) / 360.0;
    let s = (c.s / 100.0).clamp(0.0, 1.0);
    let l = (c.l / 100.0).clamp(0.0, 1.0);

    if s == 0.0 {
        let v = (l * 255.0).round() as u8;
        return (v, v, v);
    }

    let q = if l < 0.5 { l * (1.0 + s) } else { l + s - l * s };
    let p = 2.0 * l - q;

    let r = hue_to_channel(p, q, h + 1.0 / 3.0);
    let g = hue_to_channel(p, q, h);
    let b = hue_to_channel(p, q, h - 1.0 / 3.0);

    (
        (r * 255.0).round() as u8,
        (g * 255.0).round() as u8,
        (b * 255.0).round() as u8,
    )
}

/// Lowercase `#rrggbb` form of a derived color — the format `theme.css`
/// declares its static tokens in. Consumed only by the drift-guard test in
/// `editor::theme_tests`, which locks the stylesheet's declarations to these
/// derivations (hence the allow: no runtime caller, by design).
#[allow(dead_code)]
pub fn css_hex(c: Hsl) -> String {
    let (r, g, b) = hsl_to_rgb(c);
    format!("#{r:02x}{g:02x}{b:02x}")
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

/// In high-contrast mode push lightness up to at least 72 (on the 0-100 `l`
/// scale used throughout this module — not a 0.0-1.0 fraction) for AA
/// legibility. Not yet wired into the render path: today `.contrast-high` in
/// `theme.css` handles high-contrast styling (label color + border width)
/// directly, independent of this function. Kept as the spec-mandated lift
/// rule for when derived colors move to runtime.
#[allow(dead_code)]
pub fn contrast_lift(base: Hsl, high_contrast: bool) -> Hsl {
    if !high_contrast {
        return base;
    }
    Hsl { l: base.l.max(72.0), ..base }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn preset_hues_match_spec() {
        assert_eq!(preset_hue("void-glass"), Hsl { h: 0.0, s: 85.0, l: 48.0 });
        assert_eq!(preset_hue("cathedral-of-teeth"), Hsl { h: 290.0, s: 88.0, l: 54.0 });
        assert_eq!(preset_hue("ice-circuit"), Hsl { h: 90.0, s: 83.0, l: 58.0 });
        assert_eq!(preset_hue("substrate-maw"), Hsl { h: 23.0, s: 88.0, l: 58.0 });
        assert_eq!(preset_hue("ash-lung"), Hsl { h: 0.0, s: 85.0, l: 48.0 });
    }

    #[test]
    fn unknown_preset_falls_back_to_shell() {
        assert_eq!(preset_hue("nonexistent"), SHELL);
    }

    #[test]
    fn high_contrast_raises_lightness() {
        let base = Hsl { h: 145.0, s: 80.0, l: 47.0 };
        assert_eq!(contrast_lift(base, false), base);
        assert!(contrast_lift(base, true).l > base.l);
    }

    #[test]
    fn hsl_to_rgb_matches_known_primaries() {
        assert_eq!(hsl_to_rgb(Hsl { h: 0.0, s: 100.0, l: 50.0 }), (255, 0, 0));
        assert_eq!(hsl_to_rgb(Hsl { h: 120.0, s: 100.0, l: 50.0 }), (0, 255, 0));
        assert_eq!(hsl_to_rgb(Hsl { h: 240.0, s: 100.0, l: 50.0 }), (0, 0, 255));
    }

    #[test]
    fn hsl_to_rgb_achromatic_is_gray() {
        assert_eq!(hsl_to_rgb(Hsl { h: 0.0, s: 0.0, l: 50.0 }), (128, 128, 128));
    }

    #[test]
    fn css_hex_formats_lowercase_rrggbb() {
        assert_eq!(css_hex(Hsl { h: 0.0, s: 100.0, l: 50.0 }), "#ff0000");
        assert_eq!(css_hex(preset_hue("void-glass")), "#e21212");
    }
}
