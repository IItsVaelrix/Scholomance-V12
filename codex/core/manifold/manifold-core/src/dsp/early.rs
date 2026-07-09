use super::delayline::DelayLine;

pub struct EarlyReflection {
    line: DelayLine,
    taps: [usize; 4],
    gains: [f32; 4],
}
impl EarlyReflection {
    pub fn prepare(sr: f32) -> Self {
        let ms = |m: f32| ((m / 1000.0) * sr) as usize + 1;
        let cap = ms(60.0);
        Self {
            line: DelayLine::with_capacity(cap),
            taps: [ms(7.0), ms(13.0), ms(23.0), ms(41.0)],
            gains: [0.7, 0.55, 0.4, 0.3],
        }
    }
    pub fn reset(&mut self) {
        self.line.reset();
    }
    /// `mod_offset` (samples) fractionally shifts the tap positions for movement.
    pub fn process(&mut self, x: f32, mod_offset: f32) -> f32 {
        self.line.write(x);
        let mut y = 0.0;
        for (gain, tap) in self.gains.iter().zip(self.taps.iter()) {
            y += gain * self.line.read_frac(*tap as f32 + mod_offset);
        }
        y
    }
}
