//! Pure, window-free color derivation from GrimDesign world-law signals.
//! Values are authoritative from the design spec §2 and never chosen ad hoc.

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Hsl {
    pub h: f32,
    pub s: f32,
    pub l: f32,
}

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

/// In high-contrast mode push lightness up (toward 72) for AA legibility.
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
}
