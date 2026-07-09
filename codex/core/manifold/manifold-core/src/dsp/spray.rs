use super::delayline::DelayLine;
use crate::rng::Pcg32;
use crate::vm::SprayDivision;

pub struct MicroDelaySpray {
    line: DelayLine,
    rng: Pcg32,
    sr: f32,
    env: f32,     // 0..1 gate envelope
    env_dec: f32, // per-sample decay
    density: f32,
    interval: usize, // samples between grains
    counter: usize,
    tap: usize,
}

impl MicroDelaySpray {
    pub fn prepare(sr: f32, seed: u32) -> Self {
        let cap = ((0.25) * sr) as usize + 2; // up to 250ms of grains
        Self {
            line: DelayLine::with_capacity(cap),
            rng: Pcg32::seed(seed as u64, 1),
            sr,
            env: 0.0,
            env_dec: 0.0,
            density: 0.0,
            interval: 1,
            counter: 0,
            tap: 1,
        }
    }

    pub fn trigger(&mut self, division: SprayDivision, density: f32, dur_ms: f32, bpm: f32) {
        let bpm = if bpm.is_finite() && bpm > 1.0 {
            bpm
        } else {
            120.0
        };
        let beat_sec = 60.0 / bpm;
        let interval_sec = (division.beats() * beat_sec).max(0.001);
        self.interval = (interval_sec * self.sr) as usize + 1;
        self.density = density.clamp(0.0, 1.0);
        self.env = 1.0;
        let dur_samples = ((dur_ms.max(1.0) / 1000.0) * self.sr).max(1.0);
        self.env_dec = 1.0 / dur_samples;
        self.counter = 0;
    }

    pub fn process(&mut self, x: f32) -> f32 {
        self.line.write(x);
        if self.env <= 0.0 {
            return 0.0;
        }
        self.env = (self.env - self.env_dec).max(0.0);
        self.counter += 1;
        if self.counter >= self.interval {
            self.counter = 0;
            let jitter = (self.rng.next_f32() * self.interval as f32) as usize;
            self.tap = (self.interval / 2 + jitter).clamp(1, self.line.capacity() - 1);
        }
        self.line.read(self.tap) * self.env * self.density
    }

    pub fn reset(&mut self) {
        self.env = 0.0;
        self.counter = 0;
        self.line.reset();
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::vm::SprayDivision;

    #[test]
    fn spray_silent_until_triggered() {
        let mut s = MicroDelaySpray::prepare(48_000.0, 0xABCD);
        for _ in 0..1000 {
            assert_eq!(s.process(0.0), 0.0);
        }
        s.trigger(SprayDivision::D32, 0.7, 180.0, 120.0);
        let mut nonzero = false;
        let mut x = 1.0;
        for _ in 0..9000 {
            if s.process(x).abs() > 1e-6 {
                nonzero = true;
            }
            x = 0.0;
        }
        assert!(nonzero, "spray produced no output after trigger");
    }

    #[test]
    fn spray_envelope_expires() {
        let mut s = MicroDelaySpray::prepare(48_000.0, 1);
        s.trigger(SprayDivision::D64, 0.7, 50.0, 120.0);
        for _ in 0..48_000 {
            let _ = s.process(0.5);
        }
        let mut tail = 0.0f32;
        for _ in 0..2000 {
            tail = tail.max(s.process(0.0).abs());
        }
        assert!(tail < 1e-3);
    }
}
