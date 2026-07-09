//! Window-free UI state + pure reducers. The vizia Model in `mod.rs` wraps this;
//! keeping the logic pure makes it CI-testable without a display.

#[derive(Clone, Copy, Debug, PartialEq)]
pub enum Mode {
    Simple,
    Advanced,
}

#[derive(Clone, Debug)]
pub struct UiState {
    pub mode: Mode,
    pub high_contrast: bool,
    pub motion: bool,
    pub selected_preset: String,
}

impl Default for UiState {
    fn default() -> Self {
        Self {
            mode: Mode::Simple,
            high_contrast: false,
            motion: true,
            selected_preset: "void-glass".to_string(),
        }
    }
}

pub fn root_classes(s: &UiState) -> String {
    let mut parts = vec![match s.mode {
        Mode::Simple => "mode-simple",
        Mode::Advanced => "mode-advanced",
    }];
    if s.high_contrast {
        parts.push("contrast-high");
    }
    if !s.motion {
        parts.push("motion-off");
    }
    parts.join(" ")
}

pub fn toggle_contrast(s: &mut UiState) {
    s.high_contrast = !s.high_contrast;
}
pub fn toggle_motion(s: &mut UiState) {
    s.motion = !s.motion;
}
pub fn set_mode(s: &mut UiState, m: Mode) {
    s.mode = m;
}
pub fn select_preset(s: &mut UiState, name: &str) {
    s.selected_preset = name.to_string();
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn defaults_are_simple_full_motion_normal_contrast() {
        let s = UiState::default();
        assert!(matches!(s.mode, Mode::Simple));
        assert!(s.motion);
        assert!(!s.high_contrast);
        assert_eq!(s.selected_preset, "void-glass");
    }

    #[test]
    fn classes_reflect_toggles() {
        let mut s = UiState::default();
        assert_eq!(root_classes(&s), "mode-simple");
        toggle_contrast(&mut s);
        toggle_motion(&mut s);
        set_mode(&mut s, Mode::Advanced);
        assert_eq!(root_classes(&s), "mode-advanced contrast-high motion-off");
    }

    #[test]
    fn select_preset_updates() {
        let mut s = UiState::default();
        select_preset(&mut s, "ash-lung");
        assert_eq!(s.selected_preset, "ash-lung");
    }
}
