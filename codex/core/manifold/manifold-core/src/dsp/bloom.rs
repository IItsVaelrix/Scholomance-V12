/// Two resonant band-pass "blooms" summed, gated by a decay envelope.
pub struct ResonatorBloom {
    biquads: [Biquad; 2],
    env: f32,
    env_dec: f32,
    amount: f32,
}

impl ResonatorBloom {
    pub fn prepare(sr: f32) -> Self {
        Self {
            biquads: [
                Biquad::bandpass(sr, 220.0, 12.0),
                Biquad::bandpass(sr, 440.0, 12.0),
            ],
            env: 0.0,
            env_dec: 0.0,
            amount: 0.0,
        }
    }
    pub fn trigger(&mut self, amount: f32, dur_ms: f32) {
        self.amount = amount.clamp(0.0, 1.0);
        self.env = 1.0;
        self.env_dec = 1.0 / dur_ms.max(1.0);
    }
    pub fn process(&mut self, x: f32) -> f32 {
        if self.env <= 0.0 {
            return 0.0;
        }
        self.env = (self.env - self.env_dec * 0.02).max(0.0);
        let mut y = 0.0;
        for b in self.biquads.iter_mut() {
            y += b.process(x);
        }
        (y * 0.5 * self.amount * self.env).clamp(-4.0, 4.0)
    }
    pub fn reset(&mut self) {
        self.env = 0.0;
        self.amount = 0.0;
        for b in self.biquads.iter_mut() {
            b.reset();
        }
    }
}

struct Biquad {
    b0: f32,
    b1: f32,
    b2: f32,
    a1: f32,
    a2: f32,
    x1: f32,
    x2: f32,
    y1: f32,
    y2: f32,
}
impl Biquad {
    fn bandpass(sr: f32, freq: f32, q: f32) -> Self {
        let w0 = std::f32::consts::TAU * freq / sr;
        let (sn, cs) = w0.sin_cos();
        let alpha = sn / (2.0 * q);
        let b0 = alpha;
        let b1 = 0.0;
        let b2 = -alpha;
        let a0 = 1.0 + alpha;
        let a1 = -2.0 * cs;
        let a2 = 1.0 - alpha;
        Self {
            b0: b0 / a0,
            b1: b1 / a0,
            b2: b2 / a0,
            a1: a1 / a0,
            a2: a2 / a0,
            x1: 0.0,
            x2: 0.0,
            y1: 0.0,
            y2: 0.0,
        }
    }
    fn process(&mut self, x: f32) -> f32 {
        let y = self.b0 * x + self.b1 * self.x1 + self.b2 * self.x2
            - self.a1 * self.y1
            - self.a2 * self.y2;
        self.x2 = self.x1;
        self.x1 = x;
        self.y2 = self.y1;
        self.y1 = y;
        y
    }
    fn reset(&mut self) {
        self.x1 = 0.0;
        self.x2 = 0.0;
        self.y1 = 0.0;
        self.y2 = 0.0;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn bloom_finite_and_bounded() {
        let mut b = ResonatorBloom::prepare(48_000.0);
        b.trigger(0.45, 600.0);
        let mut x = 1.0;
        for _ in 0..48_000 {
            let y = b.process(x);
            assert!(y.is_finite() && y.abs() < 8.0);
            x = 0.0;
        }
    }
}
