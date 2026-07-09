use super::delayline::DelayLine;
use crate::params::ManifoldParams;
use crate::safety::{flush_denormal, SafetyGovernor};

const LINES: usize = 4;
// Mutually-prime delay lengths in ms for a smooth tail.
const DELAY_MS: [f32; LINES] = [29.7, 37.1, 41.3, 43.7];

pub struct FdnCore {
    lines: Vec<DelayLine>,
    lengths: [usize; LINES],
    damp_state: [f32; LINES],
}

impl FdnCore {
    pub fn prepare(sr: f32) -> Self {
        let mut lines = Vec::with_capacity(LINES);
        let mut lengths = [0usize; LINES];
        for (k, len) in lengths.iter_mut().enumerate() {
            let n = ((DELAY_MS[k] / 1000.0) * sr) as usize + 2;
            *len = n;
            lines.push(DelayLine::with_capacity(n + 4));
        }
        Self {
            lines,
            lengths,
            damp_state: [0.0; LINES],
        }
    }

    pub fn reset(&mut self) {
        for l in self.lines.iter_mut() {
            l.reset();
        }
        self.damp_state = [0.0; LINES];
    }

    pub fn process(&mut self, x: f32, p: &ManifoldParams, gov: &SafetyGovernor) -> f32 {
        // Read the delay lines.
        let mut s = [0.0f32; LINES];
        for (k, sk) in s.iter_mut().enumerate() {
            *sk = self.lines[k].read(self.lengths[k]);
        }

        // Normalized 4x4 Hadamard mixing (energy-preserving).
        let h = 0.5;
        let m = [
            h * (s[0] + s[1] + s[2] + s[3]),
            h * (s[0] - s[1] + s[2] - s[3]),
            h * (s[0] + s[1] - s[2] - s[3]),
            h * (s[0] - s[1] - s[2] + s[3]),
        ];

        // Feedback gain from decay, hard-clamped by the governor.
        let fb = gov.clamp_feedback(0.4 + 0.55 * p.feedback.clamp(0.0, 1.0));
        // Damping: shorter low tail as decay_low drops and low absorption rises.
        let damp = ((1.0 - p.decay_low.clamp(0.0, 1.0)) * 0.5
            + p.absorption_low.clamp(0.0, 1.0) * 0.4)
            .clamp(0.0, 0.95);

        let mut out = 0.0f32;
        for (k, sk) in s.iter().enumerate() {
            self.damp_state[k] = (1.0 - damp) * m[k] + damp * self.damp_state[k];
            let fed = flush_denormal(x * 0.5 + self.damp_state[k] * fb);
            self.lines[k].write(fed);
            out += *sk;
        }
        out * 0.5
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::bytecode::SafetyManifest;
    use crate::params::ManifoldParams;
    use crate::safety::SafetyGovernor;

    fn gov() -> SafetyGovernor {
        SafetyGovernor::from_manifest(&SafetyManifest {
            max_feedback: 0.85,
            max_filter_q: 12.0,
            max_spray_density: 0.7,
            max_delay_ms: 750.0,
            min_ramp_ms: 20.0,
            cpu_budget_class: "medium".into(),
            requires_limiter: true,
            has_unsafe_cycles: false,
        })
    }

    #[test]
    fn impulse_decays_and_stays_finite() {
        let mut f = FdnCore::prepare(48_000.0);
        let g = gov();
        let p = ManifoldParams {
            feedback: 0.7,
            decay_low: 0.5,
            diffusion: 0.5,
            ..Default::default()
        };
        let mut energy_early = 0.0;
        let mut energy_late = 0.0;
        let mut x = 1.0;
        for i in 0..48_000 {
            let y = f.process(x, &p, &g);
            assert!(y.is_finite(), "NaN at {i}");
            if i < 2400 {
                energy_early += y * y;
            }
            if i > 40_000 {
                energy_late += y * y;
            }
            x = 0.0;
        }
        assert!(energy_late < energy_early, "reverb tail did not decay");
    }

    #[test]
    fn max_feedback_does_not_explode() {
        let mut f = FdnCore::prepare(48_000.0);
        let g = gov();
        let p = ManifoldParams {
            feedback: 1.0,
            decay_low: 1.0,
            diffusion: 1.0,
            ..Default::default()
        };
        let mut x = 1.0;
        for _ in 0..96_000 {
            let y = f.process(x, &p, &g);
            assert!(y.is_finite() && y.abs() < 16.0, "runaway feedback");
            x = 0.0;
        }
    }
}
