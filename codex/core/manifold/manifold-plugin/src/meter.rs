//! Lock-free bridge from the audio thread to the GUI for meters and the
//! ManifoldMap room visualizer. `process()` publishes once per block; the
//! GUI reads the atomics during draw (vizia's baseview backend renders every
//! frame, so draw-time reads animate without any polling thread). No locks,
//! no allocation.

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

// Reconciliation note: nih_plug re-exports `atomic_float::AtomicF32` through
// `nih_plug::prelude::AtomicF32` (prelude.rs:34 at the pinned rev); the path
// adds no new dependency.
use nih_plug::prelude::AtomicF32;

/// One block's worth of visualization state. Every field is written by the
/// audio thread in `process()` and read by the GUI in `draw()`:
///
///   peak_l/peak_r     -> meter rail bars (via `peak_to_meter`)
///   rms               -> ManifoldMap core orb (overall energy)
///   band_low/mid/high -> ManifoldMap floor / back wall / ceiling glow
///   clipped/cpu_ok    -> Advanced-mode status readouts (ProcessReport)
pub struct MeterSnapshot {
    peak_l: AtomicF32,
    peak_r: AtomicF32,
    rms: AtomicF32,
    band_low: AtomicF32,
    band_mid: AtomicF32,
    band_high: AtomicF32,
    clipped: AtomicBool,
    cpu_ok: AtomicBool,
}

impl MeterSnapshot {
    pub fn new() -> Arc<Self> {
        Arc::new(Self {
            peak_l: AtomicF32::new(0.0),
            peak_r: AtomicF32::new(0.0),
            rms: AtomicF32::new(0.0),
            band_low: AtomicF32::new(0.0),
            band_mid: AtomicF32::new(0.0),
            band_high: AtomicF32::new(0.0),
            clipped: AtomicBool::new(false),
            cpu_ok: AtomicBool::new(true),
        })
    }

    pub fn publish_levels(&self, l: f32, r: f32, rms: f32) {
        self.peak_l.store(l, Ordering::Relaxed);
        self.peak_r.store(r, Ordering::Relaxed);
        self.rms.store(rms, Ordering::Relaxed);
    }

    pub fn publish_bands(&self, low: f32, mid: f32, high: f32) {
        self.band_low.store(low, Ordering::Relaxed);
        self.band_mid.store(mid, Ordering::Relaxed);
        self.band_high.store(high, Ordering::Relaxed);
    }

    pub fn publish_report(&self, clipped: bool, cpu_ok: bool) {
        self.clipped.store(clipped, Ordering::Relaxed);
        self.cpu_ok.store(cpu_ok, Ordering::Relaxed);
    }

    pub fn peak_l(&self) -> f32 {
        self.peak_l.load(Ordering::Relaxed)
    }
    pub fn peak_r(&self) -> f32 {
        self.peak_r.load(Ordering::Relaxed)
    }
    pub fn rms(&self) -> f32 {
        self.rms.load(Ordering::Relaxed)
    }
    pub fn bands(&self) -> (f32, f32, f32) {
        (
            self.band_low.load(Ordering::Relaxed),
            self.band_mid.load(Ordering::Relaxed),
            self.band_high.load(Ordering::Relaxed),
        )
    }
    pub fn clipped(&self) -> bool {
        self.clipped.load(Ordering::Relaxed)
    }
    pub fn cpu_ok(&self) -> bool {
        self.cpu_ok.load(Ordering::Relaxed)
    }
}

/// Linear peak -> 0..1 meter position across a -60..0 dBFS window.
pub fn peak_to_meter(peak: f32) -> f32 {
    if peak <= 0.0 {
        return 0.0;
    }
    let db = 20.0 * peak.log10();
    ((db + 60.0) / 60.0).clamp(0.0, 1.0)
}

/// Per-block spectral split + envelope state for the visualizer. Two one-pole
/// low-passes (600 Hz and 4 kHz) split the mono sum into low/mid/high; block
/// means are smoothed at block rate so the GUI sees stable envelopes. All
/// f32 state, no allocation — realtime-safe.
pub struct BandSplit {
    a_low: f32,
    a_high: f32,
    lp_low: f32,
    lp_high: f32,
    env: [f32; 3],
}

impl BandSplit {
    pub fn new(sample_rate: f32) -> Self {
        let coef = |hz: f32| 1.0 - (-2.0 * std::f32::consts::PI * hz / sample_rate.max(1.0)).exp();
        Self {
            a_low: coef(600.0),
            a_high: coef(4000.0),
            lp_low: 0.0,
            lp_high: 0.0,
            env: [0.0; 3],
        }
    }

    /// Feed one block (stereo), returns smoothed (low, mid, high) envelopes.
    pub fn process_block(&mut self, l: &[f32], r: &[f32]) -> (f32, f32, f32) {
        let n = l.len().min(r.len());
        if n == 0 {
            return (self.env[0], self.env[1], self.env[2]);
        }
        let (mut low_acc, mut mid_acc, mut high_acc) = (0.0f32, 0.0f32, 0.0f32);
        for i in 0..n {
            let m = (l[i] + r[i]) * 0.5;
            self.lp_low += self.a_low * (m - self.lp_low);
            self.lp_high += self.a_high * (m - self.lp_high);
            low_acc += self.lp_low.abs();
            mid_acc += (self.lp_high - self.lp_low).abs();
            high_acc += (m - self.lp_high).abs();
        }
        let inv = 1.0 / n as f32;
        // Block-rate smoothing: fast enough to feel live at typical block
        // sizes, slow enough not to strobe.
        const SMOOTH: f32 = 0.35;
        for (env, acc) in self.env.iter_mut().zip([low_acc, mid_acc, high_acc]) {
            let target = (acc * inv).clamp(0.0, 1.0);
            *env += SMOOTH * (target - *env);
        }
        (self.env[0], self.env[1], self.env[2])
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn silence_reads_zero() {
        assert!(peak_to_meter(0.0) <= 0.0001);
    }

    #[test]
    fn full_scale_reads_one() {
        assert!((peak_to_meter(1.0) - 1.0).abs() < 0.0001);
    }

    #[test]
    fn half_scale_is_monotonic_middleish() {
        let m = peak_to_meter(0.1); // -20 dBFS -> ~0.66 on a -60..0 scale
        assert!(m > 0.5 && m < 0.8, "got {m}");
    }

    #[test]
    fn publish_then_read_roundtrips() {
        let s = MeterSnapshot::new();
        s.publish_levels(0.5, 0.25, 0.9);
        s.publish_bands(0.1, 0.2, 0.3);
        s.publish_report(true, false);
        assert!((s.peak_l() - 0.5).abs() < 1e-6);
        assert!((s.peak_r() - 0.25).abs() < 1e-6);
        assert!((s.rms() - 0.9).abs() < 1e-6);
        let (lo, mi, hi) = s.bands();
        assert!((lo - 0.1).abs() < 1e-6 && (mi - 0.2).abs() < 1e-6 && (hi - 0.3).abs() < 1e-6);
        assert!(s.clipped());
        assert!(!s.cpu_ok());
    }

    #[test]
    fn band_split_separates_low_from_high() {
        let sr = 48_000.0;
        let mut split_low = BandSplit::new(sr);
        let mut split_high = BandSplit::new(sr);
        let sine = |hz: f32| -> Vec<f32> {
            (0..4096)
                .map(|i| (2.0 * std::f32::consts::PI * hz * i as f32 / sr).sin() * 0.8)
                .collect()
        };
        let low_tone = sine(100.0);
        let high_tone = sine(10_000.0);
        // Run several blocks so the envelopes settle.
        let mut low_result = (0.0, 0.0, 0.0);
        let mut high_result = (0.0, 0.0, 0.0);
        for _ in 0..8 {
            low_result = split_low.process_block(&low_tone, &low_tone);
            high_result = split_high.process_block(&high_tone, &high_tone);
        }
        assert!(
            low_result.0 > low_result.2 * 2.0,
            "100 Hz should read mostly low: {low_result:?}"
        );
        assert!(
            high_result.2 > high_result.0 * 2.0,
            "10 kHz should read mostly high: {high_result:?}"
        );
    }

    #[test]
    fn band_split_empty_block_is_safe() {
        let mut split = BandSplit::new(48_000.0);
        let (lo, mi, hi) = split.process_block(&[], &[]);
        assert_eq!((lo, mi, hi), (0.0, 0.0, 0.0));
    }
}
