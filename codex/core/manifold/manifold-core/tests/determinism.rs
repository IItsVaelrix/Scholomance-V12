use manifold_core::*;

fn core(sr: f32) -> ManifoldCore {
    let mut c = ManifoldCore::new();
    c.prepare(PrepareConfig {
        sample_rate: sr,
        max_block_size: 512,
        channels: 2,
    })
    .unwrap();
    c.load_program(
        serde_json::from_str(include_str!("fixtures/void-glass.bytecode.json")).unwrap(),
    )
    .unwrap();
    c
}

fn signal(n: usize) -> Vec<f32> {
    (0..n)
        .map(|i| ((i as f32) * 0.05).sin() * 0.6 + if i % 997 == 0 { 0.9 } else { 0.0 })
        .collect()
}

/// Render `input` through `core` using fixed `block` size; return output L.
fn render(core: &mut ManifoldCore, input: &[f32], block: usize) -> Vec<f32> {
    let ctx = ProcessContext {
        bpm: 120.0,
        panic: false,
        freeze: false,
    };
    let mut out = Vec::with_capacity(input.len());
    let mut i = 0;
    while i < input.len() {
        let end = (i + block).min(input.len());
        let chunk = &input[i..end];
        let mut ol = vec![0.0f32; chunk.len()];
        let mut or = vec![0.0f32; chunk.len()];
        core.process(chunk, chunk, &mut ol, &mut or, ctx);
        out.extend_from_slice(&ol);
        i = end;
    }
    out
}

#[test]
fn identical_runs_are_bit_exact() {
    let input = signal(48_000);
    let a = render(&mut core(48_000.0), &input, 128);
    let b = render(&mut core(48_000.0), &input, 128);
    assert_eq!(a, b, "same input+rate+blocksize must be bit-exact");
}

#[test]
fn variable_block_size_stays_finite_and_equivalent() {
    let input = signal(48_000);
    let fixed = render(&mut core(48_000.0), &input, 128);
    let irregular = {
        let mut c = core(48_000.0);
        let ctx = ProcessContext {
            bpm: 120.0,
            panic: false,
            freeze: false,
        };
        let sizes = [64usize, 200, 37, 128, 300, 1];
        let mut out = Vec::new();
        let mut i = 0;
        let mut k = 0;
        while i < input.len() {
            let block = sizes[k % sizes.len()].min(input.len() - i);
            k += 1;
            let chunk = &input[i..i + block];
            let mut ol = vec![0.0; block];
            let mut or = vec![0.0; block];
            c.process(chunk, chunk, &mut ol, &mut or, ctx);
            out.extend_from_slice(&ol);
            i += block;
        }
        out
    };
    assert_eq!(fixed.len(), irregular.len());
    let energy = |v: &[f32]| v.iter().map(|s| s * s).sum::<f32>();
    for s in &irregular {
        assert!(s.is_finite() && s.abs() <= 1.01);
    }
    let (ef, ei) = (energy(&fixed), energy(&irregular));
    let ratio = (ef.max(1e-6)) / (ei.max(1e-6));
    assert!(
        ratio > 0.5 && ratio < 2.0,
        "energy not equivalent across chunkings: {ratio}"
    );
}

#[test]
fn per_rate_runs_are_stable() {
    let input = signal(44_100);
    let out = render(&mut core(44_100.0), &input, 128);
    for s in &out {
        assert!(s.is_finite() && s.abs() <= 1.01);
    }
}
