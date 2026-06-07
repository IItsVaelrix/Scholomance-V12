// Regression tests for the 2x oversampler. The original 15-tap FIR was not
// normalized and dropped ~1.8 dB through the up/down chain (with oversampling on by
// default), and the plugin never reported its processing latency to the host.
use scholo_candy::dsp::ScholoCandyEq;

/// Build a transparent EQ: oversampling on (default), every band disabled, 0 dB out.
fn flat_eq(sample_rate: f32) -> ScholoCandyEq {
    let mut eq = ScholoCandyEq::new(sample_rate);
    for band in &mut eq.bands {
        band.enabled = false;
    }
    eq
}

fn db(ratio: f32) -> f32 {
    20.0 * ratio.abs().log10()
}

#[test]
fn oversampler_passes_dc_at_unity() {
    let mut eq = flat_eq(48000.0);
    let mut l = vec![1.0_f32; 4096];
    let mut r = vec![1.0_f32; 4096];
    eq.process_block(&mut l, &mut r);

    // Skip the FIR warm-up region, then check steady-state level.
    let y = l[2048];
    assert!(db(y).abs() < 0.05, "DC gain {:.4} dB should be ~0 dB", db(y));
}

#[test]
fn oversampler_passes_midband_sine_at_unity() {
    let fs = 48000.0_f32;
    let f = 1000.0_f32;
    let mut eq = flat_eq(fs);
    let n = 8192;
    let mut l: Vec<f32> = (0..n)
        .map(|i| (2.0 * std::f32::consts::PI * f * i as f32 / fs).sin())
        .collect();
    let mut r = l.clone();
    eq.process_block(&mut l, &mut r);

    let peak = l[2048..].iter().fold(0.0_f32, |m, &v| m.max(v.abs()));
    assert!(
        db(peak).abs() < 0.1,
        "1 kHz gain {:.4} dB should be ~0 dB",
        db(peak)
    );
}

#[test]
fn reports_oversampling_latency() {
    let eq = flat_eq(48000.0);
    // 31-tap half-band cascade => (31-1)/2 = 15 base-rate samples.
    assert_eq!(eq.latency_samples(), 15);

    let mut eq_no_os = ScholoCandyEq::new(48000.0);
    eq_no_os.set_oversample(false);
    assert_eq!(eq_no_os.latency_samples(), 0);
}
