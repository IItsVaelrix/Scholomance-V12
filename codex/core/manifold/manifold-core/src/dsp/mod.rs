pub mod bloom;
pub mod delayline;
pub mod early;
pub mod fdn;
pub mod graph;
pub mod modulation;
pub mod renderer;
pub mod splitter;
pub mod spray;
pub mod wall_filter;

#[cfg(test)]
mod node_tests {
    use super::*;
    use crate::params::ManifoldParams;

    #[test]
    fn splitter_sums_back_to_input() {
        let mut s = splitter::InputSplitter::new();
        let (lo, hi) = s.split(0.7);
        assert!((lo + hi - 0.7).abs() < 1e-5);
    }

    #[test]
    fn early_reflection_finite_and_bounded() {
        let mut e = early::EarlyReflection::prepare(48_000.0);
        let mut x = 1.0;
        for _ in 0..1000 {
            let y = e.process(x, 0.0);
            assert!(y.is_finite() && y.abs() < 8.0);
            x = 0.0;
        }
    }

    #[test]
    fn wall_filter_passes_bounded() {
        let mut w = wall_filter::WallFilterBank::new();
        let p = ManifoldParams {
            brightness: 0.5,
            absorption_high: 0.3,
            ..Default::default()
        };
        for i in 0..1000 {
            let y = w.process((i as f32 * 0.1).sin(), &p);
            assert!(y.is_finite() && y.abs() <= 2.0);
        }
    }

    #[test]
    fn renderer_width_zero_is_mono() {
        let (l, r) = renderer::OutputRenderer::render(0.0, 0.0, 0.8, 0.0);
        assert!((l - r).abs() < 1e-6);
    }
}
