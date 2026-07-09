use manifold_core::*;

const FIXTURES: &[(&str, u32)] = &[
    (
        include_str!("fixtures/void-glass.bytecode.json"),
        3425010933,
    ),
    (include_str!("fixtures/ash-lung.bytecode.json"), 3500602270),
    (
        include_str!("fixtures/cathedral-of-teeth.bytecode.json"),
        3250905319,
    ),
    (
        include_str!("fixtures/ice-circuit.bytecode.json"),
        1355917232,
    ),
    (
        include_str!("fixtures/substrate-maw.bytecode.json"),
        40942810,
    ),
];

#[test]
fn all_fixtures_load_and_match_expected_hash() {
    for (json, expected_hash) in FIXTURES {
        let program: BytecodeProgram = serde_json::from_str(json).expect("fixture parses");
        assert_eq!(
            program.content_hash, *expected_hash,
            "ABI drift in {}",
            program.name
        );
        let mut core = ManifoldCore::new();
        core.prepare(PrepareConfig {
            sample_rate: 48_000.0,
            max_block_size: 128,
            channels: 2,
        })
        .unwrap();
        core.load_program(program).expect("factory preset loads");
    }
}

#[test]
fn tampered_program_with_unsafe_cycles_is_rejected_before_audio() {
    let json = FIXTURES[0].0;
    let mut program: BytecodeProgram = serde_json::from_str(json).unwrap();
    program.safety.has_unsafe_cycles = true;
    let mut core = ManifoldCore::new();
    core.prepare(PrepareConfig {
        sample_rate: 48_000.0,
        max_block_size: 128,
        channels: 2,
    })
    .unwrap();
    assert_eq!(core.load_program(program), Err(ProgramError::UnsafeCycles));
}
