use crate::vm::ParamId;

#[derive(Debug, Clone, Copy, Default)]
pub struct ManifoldParams {
    pub feedback: f32,
    pub decay_low: f32,
    pub absorption_low: f32,
    pub absorption_high: f32,
    pub scatter: f32,
    pub diffusion: f32,
    pub brightness: f32,
    pub width: f32,
}

#[derive(Clone, Copy)]
struct Ramp {
    current: f32,
    target: f32,
    step: f32,
    left: u32,
}

impl Ramp {
    fn new(v: f32) -> Self {
        Self {
            current: v,
            target: v,
            step: 0.0,
            left: 0,
        }
    }
    fn set(&mut self, target: f32, dur_samples: u32) {
        self.target = target;
        if dur_samples == 0 {
            self.current = target;
            self.left = 0;
            self.step = 0.0;
        } else {
            self.step = (target - self.current) / dur_samples as f32;
            self.left = dur_samples;
        }
    }
    fn tick(&mut self, n: u32) {
        if self.left == 0 {
            return;
        }
        let m = n.min(self.left);
        self.current += self.step * m as f32;
        self.left -= m;
        if self.left == 0 {
            self.current = self.target;
        }
    }
}

const N: usize = 8;
fn idx(id: ParamId) -> usize {
    match id {
        ParamId::Feedback => 0,
        ParamId::DecayLow => 1,
        ParamId::AbsorptionLow => 2,
        ParamId::AbsorptionHigh => 3,
        ParamId::Scatter => 4,
        ParamId::Diffusion => 5,
        ParamId::Brightness => 6,
        ParamId::Width => 7,
    }
}

pub struct ParamStore {
    ramps: [Ramp; N],
    #[allow(dead_code)]
    sample_rate: f32,
    min_ramp_samples: u32,
    feedback_ceiling: f32,
}

impl ParamStore {
    pub fn new(sample_rate: f32, min_ramp_ms: f32) -> Self {
        // Sensible V1 defaults so a freshly loaded engine already reverberates.
        let mut ramps = [Ramp::new(0.0); N];
        ramps[idx(ParamId::Feedback)] = Ramp::new(0.5);
        ramps[idx(ParamId::DecayLow)] = Ramp::new(0.5);
        ramps[idx(ParamId::Diffusion)] = Ramp::new(0.5);
        ramps[idx(ParamId::Brightness)] = Ramp::new(0.5);
        ramps[idx(ParamId::Width)] = Ramp::new(0.5);
        Self {
            ramps,
            sample_rate,
            min_ramp_samples: ms_to_samples(min_ramp_ms, sample_rate),
            feedback_ceiling: 1.0,
        }
    }

    fn dur_samples(&self, dur_ms: f32) -> u32 {
        ms_to_samples(dur_ms, self.sample_rate).max(self.min_ramp_samples)
    }

    pub fn ramp_to(&mut self, id: ParamId, value: f32, dur_ms: f32) {
        let d = self.dur_samples(dur_ms);
        self.ramps[idx(id)].set(value.clamp(0.0, 1.0), d);
    }

    pub fn scale(&mut self, id: ParamId, factor: f32, dur_ms: f32) {
        let d = self.dur_samples(dur_ms);
        let cur = self.ramps[idx(id)].current;
        self.ramps[idx(id)].set((cur * factor).clamp(0.0, 1.0), d);
    }

    pub fn set_feedback_ceiling(&mut self, max: f32) {
        self.feedback_ceiling = max.clamp(0.0, 1.0);
    }

    #[cfg(test)]
    pub fn get(&self, id: ParamId) -> f32 {
        self.ramps[idx(id)].current
    }

    pub fn tick(&mut self, n_samples: usize) {
        let n = n_samples as u32;
        for r in self.ramps.iter_mut() {
            r.tick(n);
        }
    }

    pub fn snapshot(&self) -> ManifoldParams {
        let g = |id| self.ramps[idx(id)].current;
        ManifoldParams {
            feedback: g(ParamId::Feedback).min(self.feedback_ceiling),
            decay_low: g(ParamId::DecayLow),
            absorption_low: g(ParamId::AbsorptionLow),
            absorption_high: g(ParamId::AbsorptionHigh),
            scatter: g(ParamId::Scatter),
            diffusion: g(ParamId::Diffusion),
            brightness: g(ParamId::Brightness),
            width: g(ParamId::Width),
        }
    }
}

fn ms_to_samples(ms: f32, sr: f32) -> u32 {
    ((ms.max(0.0) / 1000.0) * sr).round() as u32
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::vm::ParamId;

    #[test]
    fn ramp_reaches_target_after_duration() {
        let mut s = ParamStore::new(48_000.0, 20.0);
        s.ramp_to(ParamId::Scatter, 1.0, 100.0);
        s.tick(4_800);
        assert!((s.get(ParamId::Scatter) - 1.0).abs() < 1e-3);
    }

    #[test]
    fn ramp_honors_min_ramp_floor() {
        // Requested 1ms ramp but floor is 20ms: target not reached after 1ms.
        // (Feedback defaults to 0.5, so ramp toward 1.0 to have distance to cover.)
        let mut s = ParamStore::new(48_000.0, 20.0);
        s.ramp_to(ParamId::Feedback, 1.0, 1.0);
        s.tick(48); // 1ms @ 48k
        assert!(s.get(ParamId::Feedback) < 1.0);
        assert!(s.get(ParamId::Feedback) > 0.5); // but it did start moving
    }

    #[test]
    fn scale_multiplies_current() {
        let mut s = ParamStore::new(48_000.0, 0.0);
        s.ramp_to(ParamId::DecayLow, 1.0, 0.0);
        s.tick(1);
        s.scale(ParamId::DecayLow, 0.4, 0.0);
        s.tick(1);
        assert!((s.get(ParamId::DecayLow) - 0.4).abs() < 1e-3);
    }

    #[test]
    fn feedback_ceiling_clamps_snapshot() {
        let mut s = ParamStore::new(48_000.0, 0.0);
        s.ramp_to(ParamId::Feedback, 0.99, 0.0);
        s.tick(1);
        s.set_feedback_ceiling(0.58);
        assert!(s.snapshot().feedback <= 0.58 + 1e-6);
    }
}
