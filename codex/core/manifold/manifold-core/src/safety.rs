use crate::bytecode::SafetyManifest;

pub fn sanitize(x: f32) -> f32 {
    if x.is_finite() {
        x
    } else {
        0.0
    }
}

pub fn flush_denormal(x: f32) -> f32 {
    if x.abs() < 1e-20 {
        0.0
    } else {
        x
    }
}

pub struct SafetyGovernor {
    max_feedback: f32,
}

impl SafetyGovernor {
    pub fn from_manifest(m: &SafetyManifest) -> Self {
        // V1 policy: the output limiter is always active (see graph soft-clip),
        // so `requires_limiter` is not gated on here.
        Self {
            max_feedback: m.max_feedback.clamp(0.0, 0.95),
        }
    }
    pub fn clamp_feedback(&self, x: f32) -> f32 {
        x.clamp(0.0, self.max_feedback)
    }
    /// tanh soft clip; output strictly within [-1, 1].
    pub fn soft_clip(&self, x: f32) -> f32 {
        sanitize(x).tanh()
    }
}

pub struct DcBlocker {
    x1: f32,
    y1: f32,
}
impl DcBlocker {
    pub fn new() -> Self {
        Self { x1: 0.0, y1: 0.0 }
    }
    pub fn process(&mut self, x: f32) -> f32 {
        let y = x - self.x1 + 0.995 * self.y1;
        self.x1 = x;
        self.y1 = y;
        y
    }
    pub fn reset(&mut self) {
        self.x1 = 0.0;
        self.y1 = 0.0;
    }
}

impl Default for DcBlocker {
    fn default() -> Self {
        Self::new()
    }
}

/// Debug/test-only per-node finite guard (Global Constraints).
#[macro_export]
macro_rules! finite_guard {
    ($label:expr, $buf:expr) => {
        #[cfg(any(test, debug_assertions))]
        {
            for &s in $buf.iter() {
                debug_assert!(s.is_finite(), "non-finite sample after {}", $label);
            }
        }
    };
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::bytecode::SafetyManifest;

    fn manifest() -> SafetyManifest {
        SafetyManifest {
            max_feedback: 0.58,
            max_filter_q: 12.0,
            max_spray_density: 0.7,
            max_delay_ms: 750.0,
            min_ramp_ms: 20.0,
            cpu_budget_class: "medium".into(),
            requires_limiter: true,
            has_unsafe_cycles: false,
        }
    }

    #[test]
    fn sanitize_kills_nan_inf() {
        assert_eq!(sanitize(f32::NAN), 0.0);
        assert_eq!(sanitize(f32::INFINITY), 0.0);
        assert_eq!(sanitize(0.25), 0.25);
    }

    #[test]
    fn soft_clip_bounds_output() {
        let g = SafetyGovernor::from_manifest(&manifest());
        for x in [-100.0, -1.5, 0.0, 1.5, 100.0f32] {
            assert!(g.soft_clip(x).abs() <= 1.0);
        }
    }

    #[test]
    fn clamp_feedback_respects_manifest() {
        let g = SafetyGovernor::from_manifest(&manifest());
        assert!(g.clamp_feedback(0.99) <= 0.58 + 1e-6);
    }

    #[test]
    fn dc_blocker_removes_offset() {
        let mut dc = DcBlocker::new();
        let mut last = 0.0;
        for _ in 0..2000 {
            last = dc.process(1.0);
        }
        assert!(last.abs() < 0.05);
    }
}
