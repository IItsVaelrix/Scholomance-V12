/// One-pole band split; low + high == input (energy preserved).
pub struct InputSplitter {
    lp: f32,
}
impl InputSplitter {
    pub fn new() -> Self {
        Self { lp: 0.0 }
    }
    pub fn split(&mut self, x: f32) -> (f32, f32) {
        self.lp = 0.15 * x + 0.85 * self.lp;
        (self.lp, x - self.lp)
    }
    pub fn reset(&mut self) {
        self.lp = 0.0;
    }
}

impl Default for InputSplitter {
    fn default() -> Self {
        Self::new()
    }
}
