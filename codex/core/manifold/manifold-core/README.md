# manifold-core

Pure-Rust Cochlear Manifold audio engine (sub-project 1). Loads
`manifold.bytecode.v1` programs and drives a reactive DSP graph. No
`wasm-bindgen`, no `nih-plug`, no GUI — see
`docs/superpowers/specs/2026-07-09-cochlear-manifold-core-design.md`.

## Public API
- `ManifoldCore::new()`
- `prepare(PrepareConfig) -> Result<(), PrepareError>` — all allocation
- `load_program(BytecodeProgram) -> Result<(), ProgramError>` — structural ABI gate
- `process(in_l, in_r, out_l, out_r, ProcessContext) -> ProcessReport` — zero-alloc

## Signal path (PDR §16)
InputSplitter → EarlyReflection (LFO-modulated) → FDN core (Hadamard-mixed) →
WallFilterBank → MicroDelaySpray → ResonatorBloom → SafetyLimiter → OutputRenderer,
with a sample-count-based ~10 ms control tick driving the bytecode VM
(features → classify → dispatch → parameter ramps).

## Bytecode gate (structural)
`load_program` validates `schemaVersion == "manifold.bytecode.v1"`, a compatible
`kernelSemver` major, well-formed instructions (known opcode/target/event), and
rejects `has_unsafe_cycles` — all before any audio. `contentHash` is an opaque
label checked only by the fixture ABI-drift test, never recomputed at runtime.
BPM comes from `ProcessContext.bpm`.

## Test
`cargo test --manifest-path codex/core/manifold/manifold-core/Cargo.toml`

Suites: unit (VM, params, safety, features, classifier, DSP nodes), plus
integration `tests/bytecode_abi.rs` (all 5 factory presets + hash guard),
`tests/torture.rs` (impulse/sweep/noise/silence/DC/panic), and
`tests/determinism.rs` (bit-exactness + variable block-size equivalence).

## Not in this crate (later sub-projects)
- `manifold-wasm` wasm-bindgen wrapper + Cargo workspace split
- `manifold-plugin` nih-plug VST3/CLAP wrapper
- Rust DSL compiler port (authoring stays JS this pass)
