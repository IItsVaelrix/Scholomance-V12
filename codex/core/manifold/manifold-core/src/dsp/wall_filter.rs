use crate::params::ManifoldParams;

/// Per-zone tonal shaping collapsed to a one-pole tilt (brightness vs. high absorption).
pub struct WallFilterBank {
    lp: f32,
}
impl WallFilterBank {
    pub fn new() -> Self {
        Self { lp: 0.0 }
    }
    pub fn process(&mut self, x: f32, p: &ManifoldParams) -> f32 {
        let cutoff = (0.1 + 0.8 * p.brightness).clamp(0.05, 0.95);
        self.lp = cutoff * x + (1.0 - cutoff) * self.lp;
        let high = x - self.lp;
        self.lp + high * (1.0 - p.absorption_high.clamp(0.0, 1.0))
    }
    pub fn reset(&mut self) {
        self.lp = 0.0;
    }
}

impl Default for WallFilterBank {
    fn default() -> Self {
        Self::new()
    }
}
