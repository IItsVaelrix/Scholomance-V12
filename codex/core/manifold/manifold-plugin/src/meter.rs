//! Lock-free bridge from the audio thread to the GUI for meters/visualizer.
//! `process()` publishes; the editor polls on its own timer. No locks, no alloc.

use std::sync::atomic::Ordering;
use std::sync::Arc;

// Reconciliation note: the brief's `nih_plug::util::atomic_f32::AtomicF32`
// path does not exist at pinned rev f36931f7. nih_plug re-exports the
// `atomic_float` crate's `AtomicF32` (same store/load/Ordering API) at
// `nih_plug::params::smoothing::AtomicF32`, which is also re-exported
// through `nih_plug::prelude::AtomicF32` (see prelude.rs:34). Using the
// prelude path avoids depending on the `params::smoothing` internal path
// and adds no new dependency.
use nih_plug::prelude::AtomicF32;

pub struct MeterSnapshot {
    peak_l: AtomicF32,
    peak_r: AtomicF32,
    energy: AtomicF32,
}

impl MeterSnapshot {
    pub fn new() -> Arc<Self> {
        Arc::new(Self {
            peak_l: AtomicF32::new(0.0),
            peak_r: AtomicF32::new(0.0),
            energy: AtomicF32::new(0.0),
        })
    }

    pub fn publish(&self, l: f32, r: f32, energy: f32) {
        self.peak_l.store(l, Ordering::Relaxed);
        self.peak_r.store(r, Ordering::Relaxed);
        self.energy.store(energy, Ordering::Relaxed);
    }

    pub fn read(&self) -> (f32, f32, f32) {
        (
            self.peak_l.load(Ordering::Relaxed),
            self.peak_r.load(Ordering::Relaxed),
            self.energy.load(Ordering::Relaxed),
        )
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
        s.publish(0.5, 0.25, 0.9);
        let (l, r, e) = s.read();
        assert!((l - 0.5).abs() < 1e-6 && (r - 0.25).abs() < 1e-6 && (e - 0.9).abs() < 1e-6);
    }
}
