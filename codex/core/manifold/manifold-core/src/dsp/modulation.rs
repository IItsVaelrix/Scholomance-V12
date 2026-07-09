pub struct Modulation {
    phase: f32,
    inc: f32,
}
impl Modulation {
    pub fn prepare(sr: f32) -> Self {
        Self {
            phase: 0.0,
            inc: (0.7 / sr) * std::f32::consts::TAU, // 0.7 Hz LFO
        }
    }
    /// Returns a delay offset in samples in [-depth, depth].
    pub fn process(&mut self, depth: f32) -> f32 {
        self.phase += self.inc;
        if self.phase > std::f32::consts::TAU {
            self.phase -= std::f32::consts::TAU;
        }
        self.phase.sin() * depth
    }
    pub fn reset(&mut self) {
        self.phase = 0.0;
    }
}
