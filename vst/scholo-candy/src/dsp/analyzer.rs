//! Live spectrum analyzer source (PDR Phase 6 #31, F-5).
//!
//! The audio thread pushes downmixed input samples into a lock-free ring buffer
//! (atomic stores only — no locks, no allocation). The UI thread reads the most
//! recent window, applies a Hann window + radix-2 FFT, and reduces it to a small set
//! of log-spaced magnitude columns for drawing. When no host FFT is available this
//! input-signal analysis is the "live overlay"; the editor still draws the offline
//! `magnitude_response` curve on top of it.

use std::f32::consts::PI;
use std::sync::atomic::{AtomicU32, AtomicUsize, Ordering};

const RING: usize = 8192; // power of two so we can mask instead of modulo
const FFT_SIZE: usize = 4096; // 4096-pt window per PDR F-5
pub const NUM_COLUMNS: usize = 192; // log-spaced draw columns
const MIN_F: f32 = 20.0;
const MAX_F: f32 = 20000.0;

pub struct SpectrumAnalyzer {
    ring: Vec<AtomicU32>,
    write: AtomicUsize,
    sample_rate: AtomicU32,
}

impl Default for SpectrumAnalyzer {
    fn default() -> Self {
        Self::new()
    }
}

impl SpectrumAnalyzer {
    pub fn new() -> Self {
        Self {
            ring: (0..RING).map(|_| AtomicU32::new(0)).collect(),
            write: AtomicUsize::new(0),
            sample_rate: AtomicU32::new(48000.0_f32.to_bits()),
        }
    }

    pub fn set_sample_rate(&self, sr: f32) {
        self.sample_rate.store(sr.to_bits(), Ordering::Relaxed);
    }

    /// Audio thread: push one (downmixed mono) sample. Lock-free, allocation-free.
    #[inline]
    pub fn push(&self, sample: f32) {
        let i = self.write.fetch_add(1, Ordering::Relaxed) & (RING - 1);
        self.ring[i].store(sample.to_bits(), Ordering::Relaxed);
    }

    /// UI thread: fill `out` with per-column magnitude in dBFS over 20 Hz..20 kHz.
    pub fn compute_columns(&self, out: &mut [f32; NUM_COLUMNS]) {
        let sr = f32::from_bits(self.sample_rate.load(Ordering::Relaxed)).max(1.0);
        let w = self.write.load(Ordering::Relaxed);

        let mut re = vec![0.0f32; FFT_SIZE];
        let mut im = vec![0.0f32; FFT_SIZE];
        for k in 0..FFT_SIZE {
            let idx = (w + RING - FFT_SIZE + k) & (RING - 1);
            let s = f32::from_bits(self.ring[idx].load(Ordering::Relaxed));
            // Hann window
            let win = 0.5 - 0.5 * (2.0 * PI * k as f32 / (FFT_SIZE as f32 - 1.0)).cos();
            re[k] = s * win;
        }

        fft_radix2(&mut re, &mut im);

        let min_log = MIN_F.log2();
        let max_log = MAX_F.log2();
        let bin_hz = sr / FFT_SIZE as f32;
        // Hann coherent gain ~0.5; normalize a single-sided bin to ~full-scale.
        let norm = 1.0 / (FFT_SIZE as f32 * 0.5 * 0.5);

        for c in 0..NUM_COLUMNS {
            let t = c as f32 / (NUM_COLUMNS as f32 - 1.0);
            let f = 2.0_f32.powf(min_log + t * (max_log - min_log));
            let center = (f / bin_hz).round() as usize;
            let lo = center.saturating_sub(1).clamp(1, FFT_SIZE / 2 - 1);
            let hi = (center + 1).clamp(1, FFT_SIZE / 2 - 1);

            // Take the max magnitude across the small bin neighborhood.
            let mut mag = 0.0f32;
            for b in lo..=hi {
                let m = (re[b] * re[b] + im[b] * im[b]).sqrt();
                if m > mag {
                    mag = m;
                }
            }
            let mag = mag * norm;
            out[c] = if mag > 1e-9 { 20.0 * mag.log10() } else { -120.0 };
        }
    }
}

/// In-place iterative radix-2 Cooley-Tukey FFT. `re.len()` must be a power of two.
fn fft_radix2(re: &mut [f32], im: &mut [f32]) {
    let n = re.len();
    debug_assert!(n.is_power_of_two());

    // Bit-reversal permutation.
    let mut j = 0usize;
    for i in 1..n {
        let mut bit = n >> 1;
        while j & bit != 0 {
            j ^= bit;
            bit >>= 1;
        }
        j |= bit;
        if i < j {
            re.swap(i, j);
            im.swap(i, j);
        }
    }

    let mut len = 2;
    while len <= n {
        let ang = -2.0 * PI / len as f32;
        let (wlr, wli) = (ang.cos(), ang.sin());
        let mut i = 0;
        while i < n {
            let (mut wr, mut wi) = (1.0f32, 0.0f32);
            for k in 0..len / 2 {
                let a = i + k;
                let b = i + k + len / 2;
                let tr = re[b] * wr - im[b] * wi;
                let ti = re[b] * wi + im[b] * wr;
                re[b] = re[a] - tr;
                im[b] = im[a] - ti;
                re[a] += tr;
                im[a] += ti;
                let nwr = wr * wlr - wi * wli;
                wi = wr * wli + wi * wlr;
                wr = nwr;
            }
            i += len;
        }
        len <<= 1;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fft_peaks_at_input_frequency() {
        // A pure cosine at bin 8 should put nearly all energy in bin 8.
        let n = 64;
        let mut re: Vec<f32> = (0..n)
            .map(|k| (2.0 * PI * 8.0 * k as f32 / n as f32).cos())
            .collect();
        let mut im = vec![0.0f32; n];
        fft_radix2(&mut re, &mut im);

        let mag: Vec<f32> = (0..n).map(|i| (re[i] * re[i] + im[i] * im[i]).sqrt()).collect();
        let peak_bin = (1..n / 2).max_by(|&a, &b| mag[a].partial_cmp(&mag[b]).unwrap()).unwrap();
        assert_eq!(peak_bin, 8, "FFT should peak at the input bin");
    }

    #[test]
    fn silence_reads_floor() {
        let analyzer = SpectrumAnalyzer::new();
        analyzer.set_sample_rate(48000.0);
        let mut cols = [0.0f32; NUM_COLUMNS];
        analyzer.compute_columns(&mut cols);
        assert!(cols.iter().all(|&d| d <= -100.0), "silence should sit near the floor");
    }

    #[test]
    fn tone_lifts_a_column() {
        let analyzer = SpectrumAnalyzer::new();
        analyzer.set_sample_rate(48000.0);
        // Push a 1 kHz sine for more than one window.
        for k in 0..(RING) {
            let s = (2.0 * PI * 1000.0 * k as f32 / 48000.0).sin();
            analyzer.push(s);
        }
        let mut cols = [0.0f32; NUM_COLUMNS];
        analyzer.compute_columns(&mut cols);
        let peak = cols.iter().cloned().fold(f32::MIN, f32::max);
        assert!(peak > -24.0, "a full-scale tone should lift a column well above the floor (got {peak})");
    }
}
