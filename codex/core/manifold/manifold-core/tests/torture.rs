use manifold_core::*;

fn loaded_core(sr: f32) -> ManifoldCore {
    let mut c = ManifoldCore::new();
    c.prepare(PrepareConfig {
        sample_rate: sr,
        max_block_size: 128,
        channels: 2,
    })
    .unwrap();
    let json = include_str!("fixtures/void-glass.bytecode.json");
    c.load_program(serde_json::from_str(json).unwrap()).unwrap();
    c
}

fn run(core: &mut ManifoldCore, mut gen: impl FnMut(usize) -> f32, blocks: usize) -> f32 {
    let ctx = ProcessContext {
        bpm: 120.0,
        panic: false,
        freeze: false,
    };
    let mut ol = [0.0f32; 128];
    let mut or = [0.0f32; 128];
    let mut peak = 0.0f32;
    let mut idx = 0;
    for _ in 0..blocks {
        let il: Vec<f32> = (0..128)
            .map(|_| {
                let v = gen(idx);
                idx += 1;
                v
            })
            .collect();
        core.process(&il, &il, &mut ol, &mut or, ctx);
        for i in 0..128 {
            assert!(ol[i].is_finite() && or[i].is_finite(), "non-finite sample");
            peak = peak.max(ol[i].abs());
        }
    }
    peak
}

#[test]
fn impulse_is_stable() {
    let mut c = loaded_core(48_000.0);
    run(&mut c, |i| if i == 0 { 1.0 } else { 0.0 }, 400);
}

#[test]
fn sine_sweep_is_stable() {
    let mut c = loaded_core(48_000.0);
    let sr = 48_000.0f32;
    run(
        &mut c,
        |i| {
            let t = i as f32 / sr;
            let f = 20.0 + 12_000.0 * (t / 5.0).min(1.0);
            (std::f32::consts::TAU * f * t).sin() * 0.8
        },
        2000,
    );
}

#[test]
fn white_noise_is_stable() {
    let mut c = loaded_core(44_100.0);
    let mut rng = 0x2545F4914F6CDD1Du64;
    run(
        &mut c,
        |_| {
            rng ^= rng << 13;
            rng ^= rng >> 7;
            rng ^= rng << 17;
            (rng as f32 / u64::MAX as f32) * 1.6 - 0.8
        },
        2000,
    );
}

#[test]
fn silence_stays_silent() {
    let mut c = loaded_core(48_000.0);
    let peak = run(&mut c, |_| 0.0, 500);
    assert!(peak < 1e-3, "silence produced output: {peak}");
}

#[test]
fn max_amplitude_dc_bomb_is_bounded() {
    let mut c = loaded_core(48_000.0);
    let peak = run(&mut c, |_| 1.0, 3000);
    assert!(peak <= 1.01, "output exceeded limiter ceiling: {peak}");
}

#[test]
fn panic_recovers_after_loud_input() {
    let mut c = loaded_core(48_000.0);
    run(&mut c, |_| 0.9, 200);
    let mut ol = [0.0f32; 128];
    let mut or = [0.0f32; 128];
    c.process(
        &[0.9; 128],
        &[0.9; 128],
        &mut ol,
        &mut or,
        ProcessContext {
            bpm: 120.0,
            panic: true,
            freeze: false,
        },
    );
    let peak = run(&mut c, |_| 0.0, 200);
    assert!(peak < 1e-2, "did not recover after panic: {peak}");
}
