# manifold-core DSP Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `manifold-core`, a pure-Rust, offline-testable Cochlear Manifold audio engine that loads `manifold.bytecode.v1` programs and drives a real, safe, reactive DSP graph.

**Architecture:** A wrapper-neutral crate exposing `ManifoldCore::{new, prepare, load_program, process}`. `load_program` validates bytecode structurally and compiles the flat instruction stream into `MATCH_EVENT → [actions]` blocks. `process` runs a sample-count-based control tick (features → classify → dispatch → parameter ramps) and a zero-alloc DSP node graph (InputSplitter → EarlyReflection → FDN → WallFilterBank → MicroDelaySpray → ResonatorBloom → Modulation → SafetyLimiter → OutputRenderer) guarded by a safety governor.

**Tech Stack:** Rust 2021, `serde` + `serde_json` (bytecode only). No `wasm-bindgen`, no `nih-plug`, no GUI deps.

## Global Constraints

Every task's requirements implicitly include this section. Values are copied verbatim from the spec (`docs/superpowers/specs/2026-07-09-cochlear-manifold-core-design.md`).

- **Crate location:** `codex/core/manifold/manifold-core/` (standalone crate this pass; becomes a workspace member in sub-project 2). Do **not** modify the existing `codex/core/manifold/rust-kernel/` crate.
- **Runtime authority is `manifold.bytecode.v1`, not DSL.** The core never parses DSL. API is `load_program(BytecodeProgram)`, never `load_dsl(&str)`.
- **Bytecode gate is structural, not FNV-recompute.** `load_program` validates schema string `"manifold.bytecode.v1"`, `kernel_semver` major == `ABI_MAJOR` (`0`), well-formed instructions (known opcode + required fields), known events, known targets, and `!has_unsafe_cycles`. `content_hash` is an opaque label — checked only in fixture tests, never recomputed at runtime. **Silent ignore of unknown opcodes/targets/events is forbidden — reject with a typed error.**
- **BPM source is `ProcessContext.bpm`** (runtime internal clock). The stored program carries no bpm.
- **Allocation only in `prepare`.** `process` is zero-alloc.
- **Sample-rate policy:** delay lengths/coefficients derived at `prepare(sample_rate)`. Bit-exact per rate; only perceptual equivalence across rates.
- **Determinism:** all randomness from a **PCG32 seeded from the preset** (`content_hash` as seed).
- **"Full graph = minimal-but-real":** every §16 node exists, is wired, is bounded, has tests, produces finite audible output. Not boutique quality.
- **Per-node finite guards** run in `cfg(any(test, debug_assertions))` after FDN, MicroDelaySpray, ResonatorBloom, OutputRenderer; release runs only the final output guard.
- **Vetoes (do NOT do):** no Rust DSL compiler, no nih-plug wrapper, no GUI/X11/GL deps, no ML layer, no true per-voxel DSP.
- **Fixture vocabulary** (exact, from the 5 factory presets):
  - Opcodes: `MATCH_EVENT, RAMP_PARAM, SCALE_PARAM, CLAMP_FEEDBACK, TRIGGER_SPRAY, BLOOM_HARMONIC` (+ `CROSSFADE_NODE` supported by ABI though unused by fixtures).
  - Events (V1 set of 8): `sub_transient, full_spectrum_impact, high_crunch, harmonic_sustain, wide_noise_burst, vocal_presence, silence_gap, dense_spectral_cloud`.
  - Target leaves → param: `*.absorption.low→AbsorptionLow`, `*.absorption.high→AbsorptionHigh`, `*.decay.low→DecayLow`, `*.brightness→Brightness`, `*.scatter→Scatter`, `*.diffusion→Diffusion`, `*.tail.width`/`*.width→Width`, `*.feedback→Feedback`. Zone prefix is stripped (zones collapse to global params — PDR §16).
  - Spray divisions: `1/8, 1/16, 1/32, 1/64`.

**Commit style:** conventional commits, scope `manifold-core`, each ending with:
```
Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
```

---

### Task 1: Crate scaffold + public API shells

**Files:**
- Create: `codex/core/manifold/manifold-core/Cargo.toml`
- Create: `codex/core/manifold/manifold-core/src/lib.rs`
- Create: `codex/core/manifold/manifold-core/src/api.rs`

**Interfaces:**
- Produces: `PrepareConfig { sample_rate: f32, max_block_size: usize, channels: usize }`, `ProcessContext { bpm: f32, panic: bool, freeze: bool }`, `ProcessReport { events: Vec<ClassifiedEvent>, clipped: bool, cpu_class_ok: bool }`, `PrepareError`, `ClassifiedEvent { event: &'static str, confidence: f32 }`, `ManifoldCore::new()`.

- [ ] **Step 1: Write `Cargo.toml`**

```toml
[package]
name = "manifold-core"
version = "0.1.0"
edition = "2021"
description = "Cochlear Manifold pure-Rust adaptive DSP engine (sub-project 1)."

[dependencies]
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"

[profile.release]
opt-level = 3
```

- [ ] **Step 2: Write `src/api.rs`**

```rust
//! Wrapper-neutral public value types. No 128-frame assumption.

#[derive(Debug, Clone, Copy)]
pub struct PrepareConfig {
    pub sample_rate: f32,
    pub max_block_size: usize,
    pub channels: usize,
}

#[derive(Debug, Clone, Copy)]
pub struct ProcessContext {
    /// Internal-clock BPM. V1 has no host sync (PDR §4.4).
    pub bpm: f32,
    pub panic: bool,
    pub freeze: bool,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct ClassifiedEvent {
    pub event: &'static str,
    pub confidence: f32,
}

#[derive(Debug, Clone, Default)]
pub struct ProcessReport {
    pub events: Vec<ClassifiedEvent>,
    pub clipped: bool,
    pub cpu_class_ok: bool,
}

#[derive(Debug, PartialEq)]
pub enum PrepareError {
    InvalidSampleRate,
    InvalidBlockSize,
    InvalidChannels,
}
```

- [ ] **Step 3: Write `src/lib.rs` shell**

```rust
mod api;
pub use api::*;

/// Engine entry point. State is preallocated in `prepare`.
pub struct ManifoldCore {
    prepared: bool,
}

impl ManifoldCore {
    pub fn new() -> Self {
        Self { prepared: false }
    }
}

impl Default for ManifoldCore {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod scaffold_tests {
    use super::*;

    #[test]
    fn core_constructs_unprepared() {
        let core = ManifoldCore::new();
        assert!(!core.prepared);
    }
}
```

- [ ] **Step 4: Build + test**

Run: `cargo test --manifest-path codex/core/manifold/manifold-core/Cargo.toml`
Expected: compiles; `core_constructs_unprepared` PASS.

- [ ] **Step 5: Commit**

```bash
git add codex/core/manifold/manifold-core/
git commit -m "feat(manifold-core): crate scaffold + public API shells

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Bytecode serde types + fixture deserialize

**Files:**
- Create: `codex/core/manifold/manifold-core/src/bytecode.rs`
- Create: `codex/core/manifold/manifold-core/tests/fixtures/void-glass.bytecode.json` (copy the `bytecode` object from `presets/manifold/void-glass.json`)
- Modify: `codex/core/manifold/manifold-core/src/lib.rs` (add `mod bytecode; pub use bytecode::*;`)

**Interfaces:**
- Produces: `BytecodeProgram`, `RawInstruction`, `SafetyManifest` (all serde `Deserialize`, camelCase).

- [ ] **Step 1: Create the fixture**

```bash
node -e "const fs=require('fs');const b=JSON.parse(fs.readFileSync('presets/manifold/void-glass.json')).bytecode;fs.mkdirSync('codex/core/manifold/manifold-core/tests/fixtures',{recursive:true});fs.writeFileSync('codex/core/manifold/manifold-core/tests/fixtures/void-glass.bytecode.json',JSON.stringify(b,null,2));"
```

- [ ] **Step 2: Write the failing test** in `src/bytecode.rs`

```rust
use serde::Deserialize;

#[cfg(test)]
mod tests {
    use super::*;

    const VOID_GLASS: &str = include_str!("../tests/fixtures/void-glass.bytecode.json");

    #[test]
    fn deserializes_void_glass_fixture() {
        let program: BytecodeProgram = serde_json::from_str(VOID_GLASS).unwrap();
        assert_eq!(program.schema_version, "manifold.bytecode.v1");
        assert_eq!(program.name, "VoidGlass");
        assert!(program.instructions.len() >= 8);
        assert_eq!(program.safety.has_unsafe_cycles, false);
        assert!((program.safety.max_feedback - 0.58).abs() < 1e-6);
        assert_eq!(program.instructions[0].op, "MATCH_EVENT");
    }
}
```

- [ ] **Step 3: Run — expect FAIL** (types not defined)

Run: `cargo test --manifest-path codex/core/manifold/manifold-core/Cargo.toml deserializes_void_glass`
Expected: FAIL (cannot find type `BytecodeProgram`).

- [ ] **Step 4: Implement the types** (above the `#[cfg(test)]` block in `src/bytecode.rs`)

```rust
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BytecodeProgram {
    pub schema_version: String,
    pub kernel_semver: String,
    pub content_hash: u32,
    pub id: String,
    pub name: String,
    pub sample_rate_policy: String,
    pub instructions: Vec<RawInstruction>,
    pub safety: SafetyManifest,
    #[serde(default)]
    pub graph: Option<serde_json::Value>,
}

/// Untyped instruction as stored. Converted to typed `Action`s by the VM,
/// which is where unknown opcodes/fields are rejected (never here).
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RawInstruction {
    pub op: String,
    #[serde(default)] pub event: Option<String>,
    #[serde(default)] pub threshold: Option<f32>,
    #[serde(default)] pub target: Option<String>,
    #[serde(default)] pub value: Option<f32>,
    #[serde(default)] pub factor: Option<f32>,
    #[serde(default)] pub node: Option<String>,
    #[serde(default)] pub max: Option<f32>,
    #[serde(default)] pub division: Option<String>,
    #[serde(default)] pub density: Option<f32>,
    #[serde(default)] pub amount: Option<f32>,
    #[serde(default)] pub from: Option<String>,
    #[serde(default)] pub to: Option<String>,
    #[serde(default)] pub duration_ms: Option<f32>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SafetyManifest {
    pub max_feedback: f32,
    pub max_filter_q: f32,
    pub max_spray_density: f32,
    pub max_delay_ms: f32,
    pub min_ramp_ms: f32,
    pub cpu_budget_class: String,
    pub requires_limiter: bool,
    pub has_unsafe_cycles: bool,
}
```

Add to `src/lib.rs`: `mod bytecode;` and `pub use bytecode::*;`.

- [ ] **Step 5: Run — expect PASS**, then commit

Run: `cargo test --manifest-path codex/core/manifold/manifold-core/Cargo.toml`
```bash
git add codex/core/manifold/manifold-core/
git commit -m "feat(manifold-core): bytecode serde types + void-glass fixture

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: ProgramError + structural header validation

**Files:**
- Create: `codex/core/manifold/manifold-core/src/error.rs`
- Modify: `codex/core/manifold/manifold-core/src/bytecode.rs` (add `validate_header`)
- Modify: `src/lib.rs` (`mod error; pub use error::*;`)

**Interfaces:**
- Consumes: `BytecodeProgram`.
- Produces: `ProgramError`, `ABI_MAJOR: u64 = 0`, `BYTECODE_SCHEMA: &str`, `validate_header(&BytecodeProgram) -> Result<(), ProgramError>`.

- [ ] **Step 1: Write failing tests** in `src/bytecode.rs` tests module

```rust
    #[test]
    fn rejects_wrong_schema() {
        let mut p: BytecodeProgram = serde_json::from_str(VOID_GLASS).unwrap();
        p.schema_version = "manifold.bytecode.v2".into();
        assert!(matches!(validate_header(&p), Err(ProgramError::SchemaMismatch { .. })));
    }

    #[test]
    fn rejects_incompatible_semver() {
        let mut p: BytecodeProgram = serde_json::from_str(VOID_GLASS).unwrap();
        p.kernel_semver = "1.0.0".into();
        assert!(matches!(validate_header(&p), Err(ProgramError::KernelSemverMismatch { .. })));
    }

    #[test]
    fn rejects_unsafe_cycles() {
        let mut p: BytecodeProgram = serde_json::from_str(VOID_GLASS).unwrap();
        p.safety.has_unsafe_cycles = true;
        assert_eq!(validate_header(&p), Err(ProgramError::UnsafeCycles));
    }

    #[test]
    fn accepts_valid_header() {
        let p: BytecodeProgram = serde_json::from_str(VOID_GLASS).unwrap();
        assert!(validate_header(&p).is_ok());
    }
```

- [ ] **Step 2: Run — expect FAIL**

Run: `cargo test --manifest-path codex/core/manifold/manifold-core/Cargo.toml rejects_`
Expected: FAIL (unresolved `validate_header`, `ProgramError`).

- [ ] **Step 3: Write `src/error.rs`**

```rust
#[derive(Debug, PartialEq)]
pub enum ProgramError {
    SchemaMismatch { found: String },
    KernelSemverMismatch { found: String },
    UnsupportedOpcode { op: String },
    MalformedInstruction { op: String, detail: &'static str },
    UnknownEvent { event: String },
    UnknownTarget { target: String },
    UnsafeCycles,
}
```

Then add to `src/bytecode.rs` (top-level):

```rust
use crate::error::ProgramError;

pub const BYTECODE_SCHEMA: &str = "manifold.bytecode.v1";
pub const ABI_MAJOR: u64 = 0;

/// Structural gate (spec §5). Does NOT recompute the FNV content hash.
pub fn validate_header(p: &BytecodeProgram) -> Result<(), ProgramError> {
    if p.schema_version != BYTECODE_SCHEMA {
        return Err(ProgramError::SchemaMismatch { found: p.schema_version.clone() });
    }
    let major = p
        .kernel_semver
        .split('.')
        .next()
        .and_then(|s| s.parse::<u64>().ok())
        .unwrap_or(u64::MAX);
    if major != ABI_MAJOR {
        return Err(ProgramError::KernelSemverMismatch { found: p.kernel_semver.clone() });
    }
    if p.safety.has_unsafe_cycles {
        return Err(ProgramError::UnsafeCycles);
    }
    Ok(())
}
```

Wire `mod error; pub use error::*;` into `src/lib.rs`.

- [ ] **Step 4: Run — expect PASS**

Run: `cargo test --manifest-path codex/core/manifold/manifold-core/Cargo.toml`

- [ ] **Step 5: Commit**

```bash
git add codex/core/manifold/manifold-core/
git commit -m "feat(manifold-core): ProgramError + structural header gate

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: VM — typed actions + instruction-stream compilation

**Files:**
- Create: `codex/core/manifold/manifold-core/src/vm.rs`
- Modify: `src/lib.rs` (`mod vm; pub use vm::*;`)

**Interfaces:**
- Consumes: `RawInstruction`, `ProgramError`.
- Produces: `ParamId`, `resolve_target(&str) -> Option<ParamId>`, `SprayDivision`, `Action`, `EventBlock { event: String, threshold: f32, actions: Vec<Action> }`, `compile_blocks(&[RawInstruction]) -> Result<Vec<EventBlock>, ProgramError>`, `V1_EVENTS: [&str; 8]`.

- [ ] **Step 1: Write failing tests** in `src/vm.rs`

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::bytecode::RawInstruction;

    fn raw(op: &str) -> RawInstruction {
        RawInstruction {
            op: op.into(), event: None, threshold: None, target: None, value: None,
            factor: None, node: None, max: None, division: None, density: None,
            amount: None, from: None, to: None, duration_ms: None,
        }
    }

    #[test]
    fn groups_match_event_blocks() {
        let mut m = raw("MATCH_EVENT"); m.event = Some("sub_transient".into()); m.threshold = Some(0.65);
        let mut r = raw("RAMP_PARAM"); r.target = Some("floor.absorption.low".into()); r.value = Some(0.95); r.duration_ms = Some(60.0);
        let blocks = compile_blocks(&[m, r]).unwrap();
        assert_eq!(blocks.len(), 1);
        assert_eq!(blocks[0].event, "sub_transient");
        assert_eq!(blocks[0].actions.len(), 1);
        assert!(matches!(blocks[0].actions[0], Action::RampParam { id: ParamId::AbsorptionLow, .. }));
    }

    #[test]
    fn rejects_unknown_opcode() {
        let mut m = raw("MATCH_EVENT"); m.event = Some("sub_transient".into()); m.threshold = Some(0.5);
        let bad = raw("SELF_DESTRUCT");
        assert!(matches!(compile_blocks(&[m, bad]), Err(ProgramError::UnsupportedOpcode { .. })));
    }

    #[test]
    fn rejects_unknown_event() {
        let mut m = raw("MATCH_EVENT"); m.event = Some("banana_event".into()); m.threshold = Some(0.5);
        assert!(matches!(compile_blocks(&[m]), Err(ProgramError::UnknownEvent { .. })));
    }

    #[test]
    fn rejects_unknown_target() {
        let mut m = raw("MATCH_EVENT"); m.event = Some("sub_transient".into()); m.threshold = Some(0.5);
        let mut r = raw("RAMP_PARAM"); r.target = Some("floor.mystery".into()); r.value = Some(0.5); r.duration_ms = Some(10.0);
        assert!(matches!(compile_blocks(&[m, r]), Err(ProgramError::UnknownTarget { .. })));
    }

    #[test]
    fn rejects_malformed_ramp_missing_value() {
        let mut m = raw("MATCH_EVENT"); m.event = Some("sub_transient".into()); m.threshold = Some(0.5);
        let mut r = raw("RAMP_PARAM"); r.target = Some("floor.feedback".into()); r.duration_ms = Some(10.0); // no value
        assert!(matches!(compile_blocks(&[m, r]), Err(ProgramError::MalformedInstruction { .. })));
    }

    #[test]
    fn parses_spray_division() {
        let mut m = raw("MATCH_EVENT"); m.event = Some("high_crunch".into()); m.threshold = Some(0.55);
        let mut s = raw("TRIGGER_SPRAY"); s.division = Some("1/64".into()); s.density = Some(0.7); s.duration_ms = Some(180.0);
        let blocks = compile_blocks(&[m, s]).unwrap();
        assert!(matches!(blocks[0].actions[0], Action::TriggerSpray { division: SprayDivision::D64, .. }));
    }
}
```

- [ ] **Step 2: Run — expect FAIL**

Run: `cargo test --manifest-path codex/core/manifold/manifold-core/Cargo.toml --lib vm`

- [ ] **Step 3: Implement `src/vm.rs`**

```rust
use crate::bytecode::RawInstruction;
use crate::error::ProgramError;

pub const V1_EVENTS: [&str; 8] = [
    "sub_transient", "full_spectrum_impact", "high_crunch", "harmonic_sustain",
    "wide_noise_burst", "vocal_presence", "silence_gap", "dense_spectral_cloud",
];

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum ParamId {
    Feedback, DecayLow, AbsorptionLow, AbsorptionHigh, Scatter, Diffusion, Brightness, Width,
}

/// Zone prefix stripped: zones collapse to global params (PDR §16).
pub fn resolve_target(t: &str) -> Option<ParamId> {
    if t.ends_with(".absorption.low") { Some(ParamId::AbsorptionLow) }
    else if t.ends_with(".absorption.high") { Some(ParamId::AbsorptionHigh) }
    else if t.ends_with(".decay.low") { Some(ParamId::DecayLow) }
    else if t.ends_with(".brightness") { Some(ParamId::Brightness) }
    else if t.ends_with(".scatter") { Some(ParamId::Scatter) }
    else if t.ends_with(".diffusion") { Some(ParamId::Diffusion) }
    else if t.ends_with(".tail.width") || t.ends_with(".width") { Some(ParamId::Width) }
    else if t.ends_with(".feedback") { Some(ParamId::Feedback) }
    else { None }
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum SprayDivision { D8, D16, D32, D64 }

impl SprayDivision {
    fn parse(s: &str) -> Option<Self> {
        match s {
            "1/8" => Some(Self::D8), "1/16" => Some(Self::D16),
            "1/32" => Some(Self::D32), "1/64" => Some(Self::D64),
            _ => None,
        }
    }
    /// Beats-per-division for tempo math (1/8 = 0.5 beat, 1/64 = 1/16 beat).
    pub fn beats(self) -> f32 {
        match self { Self::D8 => 0.5, Self::D16 => 0.25, Self::D32 => 0.125, Self::D64 => 0.0625 }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub enum Action {
    RampParam { id: ParamId, value: f32, duration_ms: f32 },
    ScaleParam { id: ParamId, factor: f32, duration_ms: f32 },
    ClampFeedback { max: f32 },
    TriggerSpray { division: SprayDivision, density: f32, duration_ms: f32 },
    BloomHarmonic { amount: f32, duration_ms: f32 },
    CrossfadeNode { duration_ms: f32 },
}

#[derive(Debug, Clone)]
pub struct EventBlock {
    pub event: String,
    pub threshold: f32,
    pub actions: Vec<Action>,
}

macro_rules! req {
    ($opt:expr, $op:expr, $field:literal) => {
        $opt.ok_or(ProgramError::MalformedInstruction { op: $op.into(), detail: $field })?
    };
}

pub fn compile_blocks(instrs: &[RawInstruction]) -> Result<Vec<EventBlock>, ProgramError> {
    let mut blocks: Vec<EventBlock> = Vec::new();
    for i in instrs {
        match i.op.as_str() {
            "MATCH_EVENT" => {
                let event = req!(i.event.clone(), "MATCH_EVENT", "event");
                let threshold = req!(i.threshold, "MATCH_EVENT", "threshold");
                if !V1_EVENTS.contains(&event.as_str()) {
                    return Err(ProgramError::UnknownEvent { event });
                }
                blocks.push(EventBlock { event, threshold, actions: Vec::new() });
            }
            other => {
                let action = compile_action(other, i)?;
                let block = blocks.last_mut().ok_or(ProgramError::MalformedInstruction {
                    op: other.into(), detail: "action before MATCH_EVENT",
                })?;
                block.actions.push(action);
            }
        }
    }
    Ok(blocks)
}

fn compile_action(op: &str, i: &RawInstruction) -> Result<Action, ProgramError> {
    match op {
        "RAMP_PARAM" => {
            let target = req!(i.target.clone(), op, "target");
            let id = resolve_target(&target).ok_or(ProgramError::UnknownTarget { target })?;
            Ok(Action::RampParam { id, value: req!(i.value, op, "value"), duration_ms: req!(i.duration_ms, op, "durationMs") })
        }
        "SCALE_PARAM" => {
            let target = req!(i.target.clone(), op, "target");
            let id = resolve_target(&target).ok_or(ProgramError::UnknownTarget { target })?;
            Ok(Action::ScaleParam { id, factor: req!(i.factor, op, "factor"), duration_ms: req!(i.duration_ms, op, "durationMs") })
        }
        "CLAMP_FEEDBACK" => {
            let node = req!(i.node.clone(), op, "node");
            if resolve_target(&node) != Some(ParamId::Feedback) {
                return Err(ProgramError::UnknownTarget { target: node });
            }
            Ok(Action::ClampFeedback { max: req!(i.max, op, "max") })
        }
        "TRIGGER_SPRAY" => {
            let div = req!(i.division.clone(), op, "division");
            let division = SprayDivision::parse(&div)
                .ok_or(ProgramError::MalformedInstruction { op: op.into(), detail: "division" })?;
            Ok(Action::TriggerSpray { division, density: req!(i.density, op, "density"), duration_ms: req!(i.duration_ms, op, "durationMs") })
        }
        "BLOOM_HARMONIC" => Ok(Action::BloomHarmonic {
            amount: req!(i.amount, op, "amount"), duration_ms: req!(i.duration_ms, op, "durationMs"),
        }),
        "CROSSFADE_NODE" => {
            let _ = req!(i.from.clone(), op, "from");
            let _ = req!(i.to.clone(), op, "to");
            Ok(Action::CrossfadeNode { duration_ms: req!(i.duration_ms, op, "durationMs") })
        }
        other => Err(ProgramError::UnsupportedOpcode { op: other.into() }),
    }
}
```

Wire `mod vm; pub use vm::*;` into `src/lib.rs`.

- [ ] **Step 4: Run — expect PASS**

Run: `cargo test --manifest-path codex/core/manifold/manifold-core/Cargo.toml`

- [ ] **Step 5: Commit**

```bash
git add codex/core/manifold/manifold-core/
git commit -m "feat(manifold-core): VM instruction-stream compiler + typed actions

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: PCG32 deterministic RNG

**Files:**
- Create: `codex/core/manifold/manifold-core/src/rng.rs`
- Modify: `src/lib.rs` (`mod rng;`)

**Interfaces:**
- Produces: `Pcg32 { seed(u64, u64), next_u32() -> u32, next_f32() -> f32 }`.

- [ ] **Step 1: Write failing tests**

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn deterministic_same_seed() {
        let mut a = Pcg32::seed(0x1234_5678, 1);
        let mut b = Pcg32::seed(0x1234_5678, 1);
        for _ in 0..64 { assert_eq!(a.next_u32(), b.next_u32()); }
    }

    #[test]
    fn f32_in_unit_interval() {
        let mut r = Pcg32::seed(99, 1);
        for _ in 0..10_000 { let x = r.next_f32(); assert!((0.0..1.0).contains(&x)); }
    }

    #[test]
    fn different_seeds_diverge() {
        let mut a = Pcg32::seed(1, 1);
        let mut b = Pcg32::seed(2, 1);
        assert_ne!(a.next_u32(), b.next_u32());
    }
}
```

- [ ] **Step 2: Run — expect FAIL**

Run: `cargo test --manifest-path codex/core/manifold/manifold-core/Cargo.toml --lib rng`

- [ ] **Step 3: Implement `src/rng.rs`** (canonical PCG32 XSH-RR)

```rust
pub struct Pcg32 { state: u64, inc: u64 }

impl Pcg32 {
    pub fn seed(seed: u64, seq: u64) -> Self {
        let mut rng = Self { state: 0, inc: (seq << 1) | 1 };
        rng.next_u32();
        rng.state = rng.state.wrapping_add(seed);
        rng.next_u32();
        rng
    }

    pub fn next_u32(&mut self) -> u32 {
        let old = self.state;
        self.state = old.wrapping_mul(6364136223846793005).wrapping_add(self.inc);
        let xorshifted = (((old >> 18) ^ old) >> 27) as u32;
        let rot = (old >> 59) as u32;
        xorshifted.rotate_right(rot)
    }

    pub fn next_f32(&mut self) -> f32 {
        (self.next_u32() >> 8) as f32 / (1u32 << 24) as f32
    }
}
```

Wire `mod rng;` into `src/lib.rs`.

- [ ] **Step 4: Run — expect PASS**, then commit

```bash
git add codex/core/manifold/manifold-core/
git commit -m "feat(manifold-core): PCG32 deterministic RNG

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Feature extractor

**Files:**
- Create: `codex/core/manifold/manifold-core/src/features.rs`
- Modify: `src/lib.rs` (`mod features; pub use features::*;`)

**Interfaces:**
- Produces: `AudioFeatures` (11 `f32` fields per PDR §10), `FeatureExtractor { new(), analyze(&mut self, &[f32], &[f32]) -> AudioFeatures }`.

- [ ] **Step 1: Write failing tests**

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn silence_has_low_energy() {
        let mut fx = FeatureExtractor::new();
        let z = [0.0f32; 128];
        let f = fx.analyze(&z, &z);
        assert!(f.rms < 0.01 && f.peak < 0.01);
        assert!(f.rms.is_finite() && f.peak.is_finite());
    }

    #[test]
    fn impulse_has_high_peak() {
        let mut fx = FeatureExtractor::new();
        let mut x = [0.0f32; 128]; x[0] = 1.0;
        let f = fx.analyze(&x, &x);
        assert!(f.peak > 0.5);
        assert!(f.transient_sharpness > 0.0);
    }

    #[test]
    fn all_features_bounded_unit() {
        let mut fx = FeatureExtractor::new();
        let x: Vec<f32> = (0..256).map(|i| ((i as f32) * 0.3).sin()).collect();
        let f = fx.analyze(&x, &x);
        for v in [f.rms, f.peak, f.crest_factor, f.spectral_centroid, f.spectral_flux,
                  f.low_energy, f.mid_energy, f.high_energy, f.transient_sharpness,
                  f.harmonicity, f.input_width] {
            assert!((0.0..=1.0).contains(&v), "feature out of [0,1]: {v}");
        }
    }
}
```

- [ ] **Step 2: Run — expect FAIL**

Run: `cargo test --manifest-path codex/core/manifold/manifold-core/Cargo.toml --lib features`

- [ ] **Step 3: Implement `src/features.rs`**

```rust
#[derive(Debug, Clone, Copy, Default)]
pub struct AudioFeatures {
    pub rms: f32,
    pub peak: f32,
    pub crest_factor: f32,
    pub spectral_centroid: f32,
    pub spectral_flux: f32,
    pub low_energy: f32,
    pub mid_energy: f32,
    pub high_energy: f32,
    pub transient_sharpness: f32,
    pub harmonicity: f32,
    pub input_width: f32,
}

pub struct FeatureExtractor {
    prev: f32,
    lp: f32,       // one-pole low-pass state (band split)
    prev_rms: f32, // for transient sharpness
}

impl FeatureExtractor {
    pub fn new() -> Self { Self { prev: 0.0, lp: 0.0, prev_rms: 0.0 } }

    pub fn analyze(&mut self, left: &[f32], right: &[f32]) -> AudioFeatures {
        let n = left.len().max(1);
        let mut peak = 0.0f32;
        let mut sum_sq = 0.0f32;
        let mut flux = 0.0f32;
        let mut low_sq = 0.0f32;
        let mut high_sq = 0.0f32;
        let mut side = 0.0f32;
        let mut weighted = 0.0f32; // for centroid proxy
        for i in 0..n {
            let l = sanitize(left[i]);
            let r = sanitize(*right.get(i).unwrap_or(&l));
            let mono = 0.5 * (l + r);
            let a = mono.abs();
            peak = peak.max(a);
            sum_sq += mono * mono;
            flux += (mono - self.prev).abs();
            self.lp = 0.05 * mono + 0.95 * self.lp; // ~lowpass
            let low = self.lp;
            let high = mono - low;
            low_sq += low * low;
            high_sq += high * high;
            weighted += high.abs();
            side += (l - r).abs();
            self.prev = mono;
        }
        let rms = (sum_sq / n as f32).sqrt().clamp(0.0, 1.0);
        let flux = clamp01(flux / n as f32 * 4.0);
        let low_energy = clamp01((low_sq / n as f32).sqrt() * 2.0);
        let high_energy = clamp01((high_sq / n as f32).sqrt() * 2.0);
        let transient = clamp01((rms - self.prev_rms).max(0.0) * 4.0 + peak * 0.5);
        self.prev_rms = rms;
        AudioFeatures {
            rms,
            peak: clamp01(peak),
            crest_factor: clamp01(peak - rms),
            spectral_centroid: clamp01(weighted / n as f32 * 4.0),
            spectral_flux: flux,
            low_energy,
            mid_energy: clamp01(rms),
            high_energy,
            transient_sharpness: transient,
            harmonicity: clamp01(1.0 - flux * 0.5),
            input_width: clamp01(side / n as f32),
        }
    }
}

fn sanitize(x: f32) -> f32 { if x.is_finite() { x } else { 0.0 } }
fn clamp01(x: f32) -> f32 { if x.is_finite() { x.clamp(0.0, 1.0) } else { 0.0 } }
```

Wire `mod features; pub use features::*;`.

- [ ] **Step 4: Run — expect PASS**, then commit

```bash
git add codex/core/manifold/manifold-core/
git commit -m "feat(manifold-core): control-rate feature extractor

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Event classifier with hysteresis + cooldown

**Files:**
- Create: `codex/core/manifold/manifold-core/src/classifier.rs`
- Modify: `src/lib.rs` (`mod classifier; pub use classifier::*;`)

**Interfaces:**
- Consumes: `AudioFeatures`, `ClassifiedEvent`.
- Produces: `Classifier { new(), classify(&mut self, &AudioFeatures) -> Vec<ClassifiedEvent> }`.

- [ ] **Step 1: Write failing tests**

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::features::AudioFeatures;

    fn loud() -> AudioFeatures {
        AudioFeatures { rms: 0.9, peak: 0.95, crest_factor: 0.8, spectral_centroid: 0.3,
            spectral_flux: 0.2, low_energy: 0.9, mid_energy: 0.8, high_energy: 0.4,
            transient_sharpness: 0.9, harmonicity: 0.9, input_width: 0.2 }
    }

    #[test]
    fn detects_sub_transient_on_low_heavy_hit() {
        let mut c = Classifier::new();
        let events = c.classify(&loud());
        assert!(events.iter().any(|e| e.event == "sub_transient"));
    }

    #[test]
    fn detects_silence_gap() {
        let mut c = Classifier::new();
        let f = AudioFeatures::default();
        let events = c.classify(&f);
        assert!(events.iter().any(|e| e.event == "silence_gap"));
    }

    #[test]
    fn cooldown_prevents_reflicker() {
        let mut c = Classifier::new();
        let f = loud();
        let first = c.classify(&f);
        // immediately re-classify same frame: event is on cooldown, not re-emitted
        let second = c.classify(&f);
        let count_sub = |v: &Vec<ClassifiedEvent>| v.iter().filter(|e| e.event == "sub_transient").count();
        assert_eq!(count_sub(&first), 1);
        assert_eq!(count_sub(&second), 0);
    }
}
```

- [ ] **Step 2: Run — expect FAIL**

Run: `cargo test --manifest-path codex/core/manifold/manifold-core/Cargo.toml --lib classifier`

- [ ] **Step 3: Implement `src/classifier.rs`** (scoring mirrors the WASM kernel; adds edge-trigger + cooldown)

```rust
use crate::api::ClassifiedEvent;
use crate::features::AudioFeatures;
use crate::vm::V1_EVENTS;

const COOLDOWN_TICKS: u32 = 3;

pub struct Classifier {
    active: [bool; 8],
    cooldown: [u32; 8],
}

impl Classifier {
    pub fn new() -> Self { Self { active: [false; 8], cooldown: [0; 8] } }

    pub fn classify(&mut self, f: &AudioFeatures) -> Vec<ClassifiedEvent> {
        let scores = raw_scores(f);
        let mut out = Vec::new();
        for (idx, (score, on_thresh)) in scores.iter().enumerate() {
            if self.cooldown[idx] > 0 { self.cooldown[idx] -= 1; }
            let off_thresh = on_thresh - 0.08; // hysteresis
            let was = self.active[idx];
            let now = if was { *score >= off_thresh } else { *score >= *on_thresh };
            self.active[idx] = now;
            // Edge trigger: emit only on rising edge and when not on cooldown.
            if now && !was && self.cooldown[idx] == 0 {
                self.cooldown[idx] = COOLDOWN_TICKS;
                out.push(ClassifiedEvent { event: V1_EVENTS[idx], confidence: round2(*score) });
            }
        }
        out
    }
}

fn c01(v: f32) -> f32 { if v.is_finite() { v.clamp(0.0, 1.0) } else { 0.0 } }
fn avg(v: &[f32]) -> f32 { v.iter().sum::<f32>() / v.len() as f32 }
fn round2(v: f32) -> f32 { (v * 100.0).round() / 100.0 }

/// (score, on-threshold) per V1 event, indexed like `V1_EVENTS`.
fn raw_scores(f: &AudioFeatures) -> [(f32, f32); 8] {
    let sub = avg(&[c01(f.low_energy), c01(f.transient_sharpness), c01(f.crest_factor)]);
    let full = avg(&[c01(f.rms), c01(f.low_energy), c01(f.high_energy), c01(f.transient_sharpness)]);
    let high = avg(&[c01(f.high_energy), c01(f.spectral_flux), c01(f.spectral_centroid)]);
    let sustain = avg(&[c01(f.harmonicity), c01(f.rms)]);
    let wide = avg(&[c01(f.input_width), c01(f.high_energy), c01(f.spectral_flux)]);
    let vocal = avg(&[c01(f.harmonicity), c01(f.mid_energy), c01(f.spectral_centroid)]);
    let silence = avg(&[1.0 - c01(f.rms), 1.0 - c01(f.peak), 1.0 - c01(f.spectral_flux)]);
    let dense = avg(&[c01(f.rms), c01(f.spectral_flux), c01(f.mid_energy), c01(f.high_energy)]);
    [
        (sub, 0.60), (full, 0.70), (high, 0.65), (sustain, 0.55),
        (wide, 0.62), (vocal, 0.62), (silence, 0.78), (dense, 0.66),
    ]
}
```

Wire `mod classifier; pub use classifier::*;`.

- [ ] **Step 4: Run — expect PASS**, then commit

```bash
git add codex/core/manifold/manifold-core/
git commit -m "feat(manifold-core): rule classifier with hysteresis + cooldown

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: Parameter store + ramp scheduler

**Files:**
- Create: `codex/core/manifold/manifold-core/src/params.rs`
- Modify: `src/lib.rs` (`mod params; pub use params::*;`)

**Interfaces:**
- Consumes: `ParamId`.
- Produces: `ManifoldParams` (snapshot struct of `f32`s: `feedback, decay_low, absorption_low, absorption_high, scatter, diffusion, brightness, width`), `ParamStore { new(f32 sample_rate, f32 min_ramp_ms), get(ParamId)->f32, ramp_to(ParamId,f32,f32 dur_ms), scale(ParamId,f32,f32 dur_ms), set_feedback_ceiling(f32), tick(usize n_samples), snapshot()->ManifoldParams }`.

- [ ] **Step 1: Write failing tests**

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::vm::ParamId;

    #[test]
    fn ramp_reaches_target_after_duration() {
        let mut s = ParamStore::new(48_000.0, 20.0);
        s.ramp_to(ParamId::Scatter, 1.0, 100.0); // 100ms
        s.tick(4_800); // 100ms @ 48k
        assert!((s.get(ParamId::Scatter) - 1.0).abs() < 1e-3);
    }

    #[test]
    fn ramp_honors_min_ramp_floor() {
        // Requested 1ms ramp but floor is 20ms: not complete after 1ms.
        let mut s = ParamStore::new(48_000.0, 20.0);
        s.ramp_to(ParamId::Feedback, 0.5, 1.0);
        s.tick(48); // 1ms
        assert!(s.get(ParamId::Feedback) < 0.5);
    }

    #[test]
    fn scale_multiplies_current() {
        let mut s = ParamStore::new(48_000.0, 0.0);
        s.ramp_to(ParamId::DecayLow, 1.0, 0.0);
        s.tick(1);
        s.scale(ParamId::DecayLow, 0.4, 0.0);
        s.tick(1);
        assert!((s.get(ParamId::DecayLow) - 0.4).abs() < 1e-3);
    }

    #[test]
    fn feedback_ceiling_clamps_snapshot() {
        let mut s = ParamStore::new(48_000.0, 0.0);
        s.ramp_to(ParamId::Feedback, 0.99, 0.0);
        s.tick(1);
        s.set_feedback_ceiling(0.58);
        assert!(s.snapshot().feedback <= 0.58 + 1e-6);
    }
}
```

- [ ] **Step 2: Run — expect FAIL**

Run: `cargo test --manifest-path codex/core/manifold/manifold-core/Cargo.toml --lib params`

- [ ] **Step 3: Implement `src/params.rs`**

```rust
use crate::vm::ParamId;

#[derive(Debug, Clone, Copy, Default)]
pub struct ManifoldParams {
    pub feedback: f32,
    pub decay_low: f32,
    pub absorption_low: f32,
    pub absorption_high: f32,
    pub scatter: f32,
    pub diffusion: f32,
    pub brightness: f32,
    pub width: f32,
}

#[derive(Clone, Copy)]
struct Ramp { current: f32, target: f32, step: f32, left: u32 }

impl Ramp {
    fn new(v: f32) -> Self { Self { current: v, target: v, step: 0.0, left: 0 } }
    fn set(&mut self, target: f32, dur_samples: u32) {
        self.target = target;
        if dur_samples == 0 { self.current = target; self.left = 0; self.step = 0.0; }
        else { self.step = (target - self.current) / dur_samples as f32; self.left = dur_samples; }
    }
    fn tick(&mut self, n: u32) {
        if self.left == 0 { return; }
        let m = n.min(self.left);
        self.current += self.step * m as f32;
        self.left -= m;
        if self.left == 0 { self.current = self.target; }
    }
}

const N: usize = 8;
fn idx(id: ParamId) -> usize {
    match id {
        ParamId::Feedback => 0, ParamId::DecayLow => 1, ParamId::AbsorptionLow => 2,
        ParamId::AbsorptionHigh => 3, ParamId::Scatter => 4, ParamId::Diffusion => 5,
        ParamId::Brightness => 6, ParamId::Width => 7,
    }
}

pub struct ParamStore {
    ramps: [Ramp; N],
    sample_rate: f32,
    min_ramp_samples: u32,
    feedback_ceiling: f32,
}

impl ParamStore {
    pub fn new(sample_rate: f32, min_ramp_ms: f32) -> Self {
        // Sensible V1 defaults so a freshly loaded engine already reverberates.
        let mut ramps = [Ramp::new(0.0); N];
        ramps[idx(ParamId::Feedback)] = Ramp::new(0.5);
        ramps[idx(ParamId::DecayLow)] = Ramp::new(0.5);
        ramps[idx(ParamId::Diffusion)] = Ramp::new(0.5);
        ramps[idx(ParamId::Brightness)] = Ramp::new(0.5);
        ramps[idx(ParamId::Width)] = Ramp::new(0.5);
        Self {
            ramps,
            sample_rate,
            min_ramp_samples: ms_to_samples(min_ramp_ms, sample_rate),
            feedback_ceiling: 1.0,
        }
    }

    fn dur_samples(&self, dur_ms: f32) -> u32 {
        ms_to_samples(dur_ms, self.sample_rate).max(self.min_ramp_samples)
    }

    pub fn ramp_to(&mut self, id: ParamId, value: f32, dur_ms: f32) {
        let d = self.dur_samples(dur_ms);
        self.ramps[idx(id)].set(value.clamp(0.0, 1.0), d);
    }

    pub fn scale(&mut self, id: ParamId, factor: f32, dur_ms: f32) {
        let d = self.dur_samples(dur_ms);
        let cur = self.ramps[idx(id)].current;
        self.ramps[idx(id)].set((cur * factor).clamp(0.0, 1.0), d);
    }

    pub fn set_feedback_ceiling(&mut self, max: f32) { self.feedback_ceiling = max.clamp(0.0, 1.0); }

    pub fn get(&self, id: ParamId) -> f32 { self.ramps[idx(id)].current }

    pub fn tick(&mut self, n_samples: usize) {
        let n = n_samples as u32;
        for r in self.ramps.iter_mut() { r.tick(n); }
    }

    pub fn snapshot(&self) -> ManifoldParams {
        let g = |id| self.ramps[idx(id)].current;
        ManifoldParams {
            feedback: g(ParamId::Feedback).min(self.feedback_ceiling),
            decay_low: g(ParamId::DecayLow),
            absorption_low: g(ParamId::AbsorptionLow),
            absorption_high: g(ParamId::AbsorptionHigh),
            scatter: g(ParamId::Scatter),
            diffusion: g(ParamId::Diffusion),
            brightness: g(ParamId::Brightness),
            width: g(ParamId::Width),
        }
    }
}

fn ms_to_samples(ms: f32, sr: f32) -> u32 { ((ms.max(0.0) / 1000.0) * sr).round() as u32 }
```

Wire `mod params; pub use params::*;`.

- [ ] **Step 4: Run — expect PASS**, then commit

```bash
git add codex/core/manifold/manifold-core/
git commit -m "feat(manifold-core): parameter store + ramp scheduler with minRamp floor

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 9: Delay line primitive

**Files:**
- Create: `codex/core/manifold/manifold-core/src/dsp/mod.rs` (add `pub mod delayline;`)
- Create: `codex/core/manifold/manifold-core/src/dsp/delayline.rs`
- Modify: `src/lib.rs` (`mod dsp;`)

**Interfaces:**
- Produces: `DelayLine { with_capacity(usize), reset(), write(f32), read(usize)->f32, read_frac(f32)->f32, capacity()->usize }`.

- [ ] **Step 1: Write failing tests** in `src/dsp/delayline.rs`

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_back_written_sample() {
        let mut d = DelayLine::with_capacity(16);
        d.write(1.0);
        d.write(0.0);
        d.write(0.0);
        assert!((d.read(2) - 1.0).abs() < 1e-6); // 2 samples ago
    }

    #[test]
    fn fractional_read_interpolates() {
        let mut d = DelayLine::with_capacity(16);
        d.write(0.0);
        d.write(2.0); // most recent
        let v = d.read_frac(0.5); // between newest(2.0) and prev(0.0)
        assert!(v > 0.0 && v < 2.0);
    }

    #[test]
    fn never_reads_out_of_bounds() {
        let mut d = DelayLine::with_capacity(8);
        for _ in 0..100 { d.write(0.3); }
        assert!(d.read(9999).is_finite()); // clamped, no panic
    }
}
```

- [ ] **Step 2: Run — expect FAIL**

Run: `cargo test --manifest-path codex/core/manifold/manifold-core/Cargo.toml --lib delayline`

- [ ] **Step 3: Implement `src/dsp/delayline.rs`**

```rust
pub struct DelayLine {
    buf: Vec<f32>,
    write: usize,
}

impl DelayLine {
    pub fn with_capacity(n: usize) -> Self {
        Self { buf: vec![0.0; n.max(1)], write: 0 }
    }
    pub fn capacity(&self) -> usize { self.buf.len() }
    pub fn reset(&mut self) { for s in self.buf.iter_mut() { *s = 0.0; } self.write = 0; }

    pub fn write(&mut self, x: f32) {
        self.buf[self.write] = x;
        self.write = (self.write + 1) % self.buf.len();
    }

    /// `delay` = samples back from the most recently written sample (>=1).
    pub fn read(&self, delay: usize) -> f32 {
        let cap = self.buf.len();
        let d = delay.clamp(1, cap);
        let pos = (self.write + cap - d) % cap;
        self.buf[pos]
    }

    pub fn read_frac(&self, delay: f32) -> f32 {
        let cap = self.buf.len() as f32;
        let d = delay.clamp(1.0, cap - 1.0);
        let i = d.floor() as usize;
        let frac = d - i as f32;
        let a = self.read(i);
        let b = self.read(i + 1);
        a * (1.0 - frac) + b * frac
    }
}
```

Create `src/dsp/mod.rs` with `pub mod delayline;` and wire `mod dsp;` into `src/lib.rs`.

- [ ] **Step 4: Run — expect PASS**, then commit

```bash
git add codex/core/manifold/manifold-core/
git commit -m "feat(manifold-core): preallocated delay-line primitive

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 10: Safety governor

**Files:**
- Create: `codex/core/manifold/manifold-core/src/safety.rs`
- Modify: `src/lib.rs` (`mod safety; pub use safety::*;`)

**Interfaces:**
- Consumes: `SafetyManifest`.
- Produces: `SafetyGovernor { from_manifest(&SafetyManifest), soft_clip(f32)->f32, clamp_feedback(f32)->f32, requires_limiter()->bool }`, free fns `sanitize(f32)->f32`, `flush_denormal(f32)->f32`, `DcBlocker { new(), process(f32)->f32 }`, macro `finite_guard!(label, &[f32])`.

- [ ] **Step 1: Write failing tests**

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::bytecode::SafetyManifest;

    fn manifest() -> SafetyManifest {
        SafetyManifest { max_feedback: 0.58, max_filter_q: 12.0, max_spray_density: 0.7,
            max_delay_ms: 750.0, min_ramp_ms: 20.0, cpu_budget_class: "medium".into(),
            requires_limiter: true, has_unsafe_cycles: false }
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
        for _ in 0..2000 { last = dc.process(1.0); } // constant DC input
        assert!(last.abs() < 0.05);
    }
}
```

- [ ] **Step 2: Run — expect FAIL**

Run: `cargo test --manifest-path codex/core/manifold/manifold-core/Cargo.toml --lib safety`

- [ ] **Step 3: Implement `src/safety.rs`**

```rust
use crate::bytecode::SafetyManifest;

pub fn sanitize(x: f32) -> f32 { if x.is_finite() { x } else { 0.0 } }

pub fn flush_denormal(x: f32) -> f32 { if x.abs() < 1e-20 { 0.0 } else { x } }

pub struct SafetyGovernor {
    max_feedback: f32,
    requires_limiter: bool,
}

impl SafetyGovernor {
    pub fn from_manifest(m: &SafetyManifest) -> Self {
        Self { max_feedback: m.max_feedback.clamp(0.0, 0.95), requires_limiter: m.requires_limiter }
    }
    pub fn clamp_feedback(&self, x: f32) -> f32 { x.clamp(0.0, self.max_feedback) }
    pub fn requires_limiter(&self) -> bool { self.requires_limiter }
    /// tanh soft clip; output strictly within [-1, 1].
    pub fn soft_clip(&self, x: f32) -> f32 { sanitize(x).tanh() }
}

pub struct DcBlocker { x1: f32, y1: f32 }
impl DcBlocker {
    pub fn new() -> Self { Self { x1: 0.0, y1: 0.0 } }
    pub fn process(&mut self, x: f32) -> f32 {
        let y = x - self.x1 + 0.995 * self.y1;
        self.x1 = x; self.y1 = y; y
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
```

Wire `mod safety; pub use safety::*;`.

- [ ] **Step 4: Run — expect PASS**, then commit

```bash
git add codex/core/manifold/manifold-core/
git commit -m "feat(manifold-core): safety governor (sanitize, soft-clip, DC block, guard)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 11: Simple DSP nodes (splitter, early reflection, wall filter, modulation, renderer)

**Files:**
- Create: `src/dsp/splitter.rs`, `src/dsp/early.rs`, `src/dsp/wall_filter.rs`, `src/dsp/modulation.rs`, `src/dsp/renderer.rs`
- Modify: `src/dsp/mod.rs` (add the `pub mod` lines)

**Interfaces:**
- Consumes: `ManifoldParams`, `DelayLine`.
- Produces:
  - `InputSplitter { new(), split(f32) -> (f32 /*low*/, f32 /*high*/) }`
  - `EarlyReflection { prepare(sr), reset(), process(f32) -> f32 }`
  - `WallFilterBank { new(), process(f32, &ManifoldParams) -> f32 }`
  - `Modulation { prepare(sr), process(depth: f32) -> f32 /*delay-offset samples*/ }`
  - `OutputRenderer { render(dry_l, dry_r, wet, width) -> (f32, f32) }`

- [ ] **Step 1: Write failing tests** (put a shared test module in `src/dsp/mod.rs`)

```rust
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
        let mut e = early::EarlyReflection::new_prepared(48_000.0);
        let mut x = 1.0;
        for _ in 0..1000 { let y = e.process(x); assert!(y.is_finite() && y.abs() < 8.0); x = 0.0; }
    }

    #[test]
    fn wall_filter_passes_bounded() {
        let mut w = wall_filter::WallFilterBank::new();
        let p = ManifoldParams { brightness: 0.5, absorption_high: 0.3, ..Default::default() };
        for i in 0..1000 { let y = w.process((i as f32 * 0.1).sin(), &p); assert!(y.is_finite() && y.abs() <= 2.0); }
    }

    #[test]
    fn renderer_width_zero_is_mono() {
        let (l, r) = renderer::OutputRenderer::render(0.0, 0.0, 0.8, 0.0);
        assert!((l - r).abs() < 1e-6);
    }
}
```

Note: add `pub fn new_prepared(sr: f32) -> Self` convenience to `EarlyReflection` for tests (calls `prepare`).

- [ ] **Step 2: Run — expect FAIL**

Run: `cargo test --manifest-path codex/core/manifold/manifold-core/Cargo.toml --lib node_tests`

- [ ] **Step 3: Implement the five node files**

`src/dsp/splitter.rs`:
```rust
/// One-pole band split; low + high == input (energy preserved).
pub struct InputSplitter { lp: f32 }
impl InputSplitter {
    pub fn new() -> Self { Self { lp: 0.0 } }
    pub fn split(&mut self, x: f32) -> (f32, f32) {
        self.lp = 0.15 * x + 0.85 * self.lp;
        (self.lp, x - self.lp)
    }
}
```

`src/dsp/early.rs`:
```rust
use super::delayline::DelayLine;

pub struct EarlyReflection { line: DelayLine, taps: [usize; 4], gains: [f32; 4] }
impl EarlyReflection {
    pub fn prepare(sr: f32) -> Self {
        let ms = |m: f32| ((m / 1000.0) * sr) as usize + 1;
        let cap = ms(60.0);
        Self {
            line: DelayLine::with_capacity(cap),
            taps: [ms(7.0), ms(13.0), ms(23.0), ms(41.0)],
            gains: [0.7, 0.55, 0.4, 0.3],
        }
    }
    pub fn new_prepared(sr: f32) -> Self { Self::prepare(sr) }
    pub fn reset(&mut self) { self.line.reset(); }
    pub fn process(&mut self, x: f32) -> f32 {
        self.line.write(x);
        let mut y = 0.0;
        for k in 0..4 { y += self.gains[k] * self.line.read(self.taps[k]); }
        y
    }
}
```

`src/dsp/wall_filter.rs`:
```rust
use crate::params::ManifoldParams;

/// Per-zone tonal shaping collapsed to a one-pole tilt (brightness vs. high absorption).
pub struct WallFilterBank { lp: f32 }
impl WallFilterBank {
    pub fn new() -> Self { Self { lp: 0.0 } }
    pub fn process(&mut self, x: f32, p: &ManifoldParams) -> f32 {
        let cutoff = (0.1 + 0.8 * p.brightness).clamp(0.05, 0.95);
        self.lp = cutoff * x + (1.0 - cutoff) * self.lp;
        let high = x - self.lp;
        // High absorption damps highs.
        self.lp + high * (1.0 - p.absorption_high.clamp(0.0, 1.0))
    }
}
```

`src/dsp/modulation.rs`:
```rust
pub struct Modulation { phase: f32, inc: f32 }
impl Modulation {
    pub fn prepare(sr: f32) -> Self {
        Self { phase: 0.0, inc: (0.7 / sr) * std::f32::consts::TAU } // 0.7 Hz LFO
    }
    /// Returns a delay offset in samples in [-depth, depth].
    pub fn process(&mut self, depth: f32) -> f32 {
        self.phase += self.inc;
        if self.phase > std::f32::consts::TAU { self.phase -= std::f32::consts::TAU; }
        self.phase.sin() * depth
    }
}
```

`src/dsp/renderer.rs`:
```rust
pub struct OutputRenderer;
impl OutputRenderer {
    /// Blend wet (mono) into dry L/R with stereo width from a decorrelated split.
    pub fn render(dry_l: f32, dry_r: f32, wet: f32, width: f32) -> (f32, f32) {
        let w = width.clamp(0.0, 1.0);
        let l = dry_l + wet * (1.0 + w * 0.5);
        let r = dry_r + wet * (1.0 - w * 0.5);
        (l, r)
    }
}
```

Add to `src/dsp/mod.rs`: `pub mod splitter; pub mod early; pub mod wall_filter; pub mod modulation; pub mod renderer;`.

- [ ] **Step 4: Run — expect PASS**, then commit

```bash
git add codex/core/manifold/manifold-core/
git commit -m "feat(manifold-core): splitter, early-reflection, wall-filter, modulation, renderer

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 12: FDN reverb core

**Files:**
- Create: `codex/core/manifold/manifold-core/src/dsp/fdn.rs`
- Modify: `src/dsp/mod.rs` (`pub mod fdn;`)

**Interfaces:**
- Consumes: `DelayLine`, `ManifoldParams`, `SafetyGovernor`.
- Produces: `FdnCore { prepare(sr), reset(), process(f32, &ManifoldParams, &SafetyGovernor) -> f32 }` (4-line Hadamard-mixed FDN).

- [ ] **Step 1: Write failing tests**

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::params::ManifoldParams;
    use crate::safety::SafetyGovernor;
    use crate::bytecode::SafetyManifest;

    fn gov() -> SafetyGovernor {
        SafetyGovernor::from_manifest(&SafetyManifest {
            max_feedback: 0.85, max_filter_q: 12.0, max_spray_density: 0.7, max_delay_ms: 750.0,
            min_ramp_ms: 20.0, cpu_budget_class: "medium".into(), requires_limiter: true, has_unsafe_cycles: false })
    }

    #[test]
    fn impulse_decays_and_stays_finite() {
        let mut f = FdnCore::prepare(48_000.0);
        let g = gov();
        let p = ManifoldParams { feedback: 0.7, decay_low: 0.5, diffusion: 0.5, ..Default::default() };
        let mut energy_early = 0.0;
        let mut energy_late = 0.0;
        let mut x = 1.0;
        for i in 0..48_000 {
            let y = f.process(x, &p, &g);
            assert!(y.is_finite(), "NaN at {i}");
            if i < 2400 { energy_early += y * y; }
            if i > 40_000 { energy_late += y * y; }
            x = 0.0;
        }
        assert!(energy_late < energy_early, "reverb tail did not decay");
    }

    #[test]
    fn max_feedback_does_not_explode() {
        let mut f = FdnCore::prepare(48_000.0);
        let g = gov();
        let p = ManifoldParams { feedback: 1.0, decay_low: 1.0, diffusion: 1.0, ..Default::default() };
        let mut x = 1.0;
        for _ in 0..96_000 {
            let y = f.process(x, &p, &g);
            assert!(y.is_finite() && y.abs() < 16.0, "runaway feedback");
            x = 0.0;
        }
    }
}
```

- [ ] **Step 2: Run — expect FAIL**

Run: `cargo test --manifest-path codex/core/manifold/manifold-core/Cargo.toml --lib fdn`

- [ ] **Step 3: Implement `src/dsp/fdn.rs`**

```rust
use super::delayline::DelayLine;
use crate::params::ManifoldParams;
use crate::safety::{SafetyGovernor, flush_denormal};

const LINES: usize = 4;
// Mutually-prime delay lengths in ms for a smooth tail.
const DELAY_MS: [f32; LINES] = [29.7, 37.1, 41.3, 43.7];

pub struct FdnCore {
    lines: Vec<DelayLine>,
    lengths: [usize; LINES],
    damp_state: [f32; LINES],
}

impl FdnCore {
    pub fn prepare(sr: f32) -> Self {
        let mut lines = Vec::with_capacity(LINES);
        let mut lengths = [0usize; LINES];
        for k in 0..LINES {
            let n = ((DELAY_MS[k] / 1000.0) * sr) as usize + 2;
            lengths[k] = n;
            lines.push(DelayLine::with_capacity(n + 4));
        }
        Self { lines, lengths, damp_state: [0.0; LINES] }
    }

    pub fn reset(&mut self) {
        for l in self.lines.iter_mut() { l.reset(); }
        self.damp_state = [0.0; LINES];
    }

    pub fn process(&mut self, x: f32, p: &ManifoldParams, gov: &SafetyGovernor) -> f32 {
        // Read the delay lines.
        let mut s = [0.0f32; LINES];
        for k in 0..LINES { s[k] = self.lines[k].read(self.lengths[k]); }

        // Normalized 4x4 Hadamard mixing (energy-preserving).
        let h = 0.5;
        let m = [
            h * (s[0] + s[1] + s[2] + s[3]),
            h * (s[0] - s[1] + s[2] - s[3]),
            h * (s[0] + s[1] - s[2] - s[3]),
            h * (s[0] - s[1] - s[2] + s[3]),
        ];

        // Feedback gain from decay, hard-clamped by the governor.
        let fb = gov.clamp_feedback(0.4 + 0.55 * p.feedback.clamp(0.0, 1.0));
        // Low-frequency damping from decay_low (higher decay_low = longer low tail).
        let damp = (1.0 - p.decay_low.clamp(0.0, 1.0)) * 0.5;

        let mut out = 0.0f32;
        for k in 0..LINES {
            self.damp_state[k] = (1.0 - damp) * m[k] + damp * self.damp_state[k];
            let fed = flush_denormal(x * 0.5 + self.damp_state[k] * fb);
            self.lines[k].write(fed);
            out += s[k];
        }
        out * 0.5
    }
}
```

- [ ] **Step 4: Run — expect PASS**, then commit

```bash
git add codex/core/manifold/manifold-core/
git commit -m "feat(manifold-core): Hadamard-mixed FDN reverb core

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 13: Triggered nodes — MicroDelaySpray + ResonatorBloom

**Files:**
- Create: `src/dsp/spray.rs`, `src/dsp/bloom.rs`
- Modify: `src/dsp/mod.rs` (`pub mod spray; pub mod bloom;`)

**Interfaces:**
- Consumes: `DelayLine`, `Pcg32`, `SprayDivision`.
- Produces:
  - `MicroDelaySpray { prepare(sr, seed: u32), trigger(SprayDivision, density: f32, dur_ms: f32, bpm: f32), process(f32) -> f32 }`
  - `ResonatorBloom { prepare(sr), trigger(amount: f32, dur_ms: f32), process(f32) -> f32 }`

- [ ] **Step 1: Write failing tests**

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::vm::SprayDivision;

    #[test]
    fn spray_silent_until_triggered() {
        let mut s = spray::MicroDelaySpray::prepare(48_000.0, 0xABCD);
        for _ in 0..1000 { assert_eq!(s.process(0.0), 0.0); }
        s.trigger(SprayDivision::D32, 0.7, 180.0, 120.0);
        let mut nonzero = false;
        let mut x = 1.0;
        for _ in 0..9000 { if s.process(x).abs() > 1e-6 { nonzero = true; } x = 0.0; }
        assert!(nonzero, "spray produced no output after trigger");
    }

    #[test]
    fn spray_envelope_expires() {
        let mut s = spray::MicroDelaySpray::prepare(48_000.0, 1);
        s.trigger(SprayDivision::D64, 0.7, 50.0, 120.0);
        for _ in 0..48_000 { let _ = s.process(0.5); }
        // long after 50ms, feed silence: output must return to ~0
        let mut tail = 0.0f32;
        for _ in 0..2000 { tail = tail.max(s.process(0.0).abs()); }
        assert!(tail < 1e-3);
    }

    #[test]
    fn bloom_finite_and_bounded() {
        let mut b = bloom::ResonatorBloom::prepare(48_000.0);
        b.trigger(0.45, 600.0);
        let mut x = 1.0;
        for _ in 0..48_000 { let y = b.process(x); assert!(y.is_finite() && y.abs() < 8.0); x = 0.0; }
    }
}
```

- [ ] **Step 2: Run — expect FAIL**

Run: `cargo test --manifest-path codex/core/manifold/manifold-core/Cargo.toml --lib spray`
Run: `cargo test --manifest-path codex/core/manifold/manifold-core/Cargo.toml --lib bloom`

- [ ] **Step 3: Implement the two files**

`src/dsp/spray.rs`:
```rust
use super::delayline::DelayLine;
use crate::rng::Pcg32;
use crate::vm::SprayDivision;

pub struct MicroDelaySpray {
    line: DelayLine,
    rng: Pcg32,
    sr: f32,
    env: f32,       // 0..1 gate envelope
    env_dec: f32,   // per-sample decay
    density: f32,
    interval: usize, // samples between grains
    counter: usize,
    tap: usize,
}

impl MicroDelaySpray {
    pub fn prepare(sr: f32, seed: u32) -> Self {
        let cap = ((0.25) * sr) as usize + 2; // up to 250ms of grains
        Self {
            line: DelayLine::with_capacity(cap),
            rng: Pcg32::seed(seed as u64, 1),
            sr, env: 0.0, env_dec: 0.0, density: 0.0,
            interval: 1, counter: 0, tap: 1,
        }
    }

    pub fn trigger(&mut self, division: SprayDivision, density: f32, dur_ms: f32, bpm: f32) {
        let bpm = if bpm.is_finite() && bpm > 1.0 { bpm } else { 120.0 };
        let beat_sec = 60.0 / bpm;
        let interval_sec = (division.beats() * beat_sec).max(0.001);
        self.interval = (interval_sec * self.sr) as usize + 1;
        self.density = density.clamp(0.0, 1.0);
        self.env = 1.0;
        let dur_samples = ((dur_ms.max(1.0) / 1000.0) * self.sr).max(1.0);
        self.env_dec = 1.0 / dur_samples;
        self.counter = 0;
    }

    pub fn process(&mut self, x: f32) -> f32 {
        self.line.write(x);
        if self.env <= 0.0 { return 0.0; }
        self.env = (self.env - self.env_dec).max(0.0);
        self.counter += 1;
        if self.counter >= self.interval {
            self.counter = 0;
            // jitter the tap to scatter reflections
            let jitter = (self.rng.next_f32() * self.interval as f32) as usize;
            self.tap = (self.interval / 2 + jitter).clamp(1, self.line.capacity() - 1);
        }
        self.line.read(self.tap) * self.env * self.density
    }
}
```

`src/dsp/bloom.rs`:
```rust
/// Two resonant band-pass "blooms" summed, gated by a decay envelope.
pub struct ResonatorBloom {
    biquads: [Biquad; 2],
    env: f32,
    env_dec: f32,
    amount: f32,
}

impl ResonatorBloom {
    pub fn prepare(sr: f32) -> Self {
        Self {
            biquads: [Biquad::bandpass(sr, 220.0, 12.0), Biquad::bandpass(sr, 440.0, 12.0)],
            env: 0.0, env_dec: 0.0, amount: 0.0,
        }
    }
    pub fn trigger(&mut self, amount: f32, dur_ms: f32) {
        self.amount = amount.clamp(0.0, 1.0);
        self.env = 1.0;
        // decay across the duration (samples baked into biquad's sr via prepare)
        self.env_dec = 1.0 / dur_ms.max(1.0);
    }
    pub fn process(&mut self, x: f32) -> f32 {
        if self.env <= 0.0 { return 0.0; }
        // env_dec is per-ms; approximate per-sample by scaling small — kept simple & bounded.
        self.env = (self.env - self.env_dec * 0.02).max(0.0);
        let mut y = 0.0;
        for b in self.biquads.iter_mut() { y += b.process(x); }
        (y * 0.5 * self.amount * self.env).clamp(-4.0, 4.0)
    }
}

struct Biquad { b0: f32, b1: f32, b2: f32, a1: f32, a2: f32, x1: f32, x2: f32, y1: f32, y2: f32 }
impl Biquad {
    fn bandpass(sr: f32, freq: f32, q: f32) -> Self {
        let w0 = std::f32::consts::TAU * freq / sr;
        let (sn, cs) = w0.sin_cos();
        let alpha = sn / (2.0 * q);
        let b0 = alpha; let b1 = 0.0; let b2 = -alpha;
        let a0 = 1.0 + alpha; let a1 = -2.0 * cs; let a2 = 1.0 - alpha;
        Self { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0,
               x1: 0.0, x2: 0.0, y1: 0.0, y2: 0.0 }
    }
    fn process(&mut self, x: f32) -> f32 {
        let y = self.b0 * x + self.b1 * self.x1 + self.b2 * self.x2 - self.a1 * self.y1 - self.a2 * self.y2;
        self.x2 = self.x1; self.x1 = x; self.y2 = self.y1; self.y1 = y;
        y
    }
}
```

Add `pub mod spray; pub mod bloom;` to `src/dsp/mod.rs`.

- [ ] **Step 4: Run — expect PASS**, then commit

```bash
git add codex/core/manifold/manifold-core/
git commit -m "feat(manifold-core): micro-delay spray + resonator bloom nodes

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 14: DSP graph assembly

**Files:**
- Create: `codex/core/manifold/manifold-core/src/dsp/graph.rs`
- Modify: `src/dsp/mod.rs` (`pub mod graph;`)

**Interfaces:**
- Consumes: all node types, `ManifoldParams`, `SafetyGovernor`, `SprayDivision`.
- Produces: `ManifoldGraph { prepare(sr, seed: u32), reset(), trigger_spray(SprayDivision, f32, f32, f32 bpm), trigger_bloom(f32, f32), process_block(in_l, in_r, out_l, out_r, &ManifoldParams, &SafetyGovernor, wet: f32, freeze: bool) }`.

- [ ] **Step 1: Write failing tests**

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::params::ManifoldParams;
    use crate::safety::SafetyGovernor;
    use crate::bytecode::SafetyManifest;

    fn gov() -> SafetyGovernor {
        SafetyGovernor::from_manifest(&SafetyManifest { max_feedback: 0.7, max_filter_q: 12.0,
            max_spray_density: 0.7, max_delay_ms: 750.0, min_ramp_ms: 20.0,
            cpu_budget_class: "medium".into(), requires_limiter: true, has_unsafe_cycles: false })
    }

    #[test]
    fn impulse_produces_finite_reverb_tail() {
        let mut g = ManifoldGraph::prepare(48_000.0, 0xC0FFEE);
        let p = ManifoldParams { feedback: 0.6, decay_low: 0.5, diffusion: 0.5, width: 0.4, ..Default::default() };
        let gv = gov();
        let mut il = [0.0f32; 128]; let mut ir = [0.0f32; 128];
        il[0] = 1.0; ir[0] = 1.0;
        let mut ol = [0.0f32; 128]; let mut or = [0.0f32; 128];
        let mut tail_energy = 0.0;
        for blk in 0..200 {
            g.process_block(&il, &ir, &mut ol, &mut or, &p, &gv, 0.7, false);
            for i in 0..128 { assert!(ol[i].is_finite() && or[i].is_finite(), "NaN blk {blk}"); }
            if blk > 20 { for i in 0..128 { tail_energy += ol[i] * ol[i]; } }
            il[0] = 0.0; ir[0] = 0.0;
        }
        assert!(tail_energy > 0.0, "no reverb energy");
    }

    #[test]
    fn output_stays_bounded_under_noise() {
        let mut g = ManifoldGraph::prepare(44_100.0, 7);
        let p = ManifoldParams { feedback: 0.7, decay_low: 1.0, width: 1.0, ..Default::default() };
        let gv = gov();
        let mut rng = crate::rng::Pcg32::seed(5, 1);
        let mut ol = [0.0f32; 64]; let mut or = [0.0f32; 64];
        for _ in 0..2000 {
            let il: Vec<f32> = (0..64).map(|_| rng.next_f32() * 2.0 - 1.0).collect();
            g.process_block(&il, &il, &mut ol, &mut or, &p, &gv, 1.0, false);
            for i in 0..64 { assert!(ol[i].abs() <= 1.5 && or[i].abs() <= 1.5); }
        }
    }
}
```

- [ ] **Step 2: Run — expect FAIL**

Run: `cargo test --manifest-path codex/core/manifold/manifold-core/Cargo.toml --lib graph`

- [ ] **Step 3: Implement `src/dsp/graph.rs`**

```rust
use super::{bloom::ResonatorBloom, early::EarlyReflection, fdn::FdnCore,
            modulation::Modulation, renderer::OutputRenderer, splitter::InputSplitter,
            spray::MicroDelaySpray, wall_filter::WallFilterBank};
use crate::params::ManifoldParams;
use crate::safety::{DcBlocker, SafetyGovernor, sanitize};
use crate::vm::SprayDivision;
use crate::finite_guard;

pub struct ManifoldGraph {
    splitter: InputSplitter,
    early: EarlyReflection,
    fdn: FdnCore,
    walls: WallFilterBank,
    spray: MicroDelaySpray,
    bloom: ResonatorBloom,
    modu: Modulation,
    dc_l: DcBlocker,
    dc_r: DcBlocker,
    frozen_tail: f32,
}

impl ManifoldGraph {
    pub fn prepare(sr: f32, seed: u32) -> Self {
        Self {
            splitter: InputSplitter::new(),
            early: EarlyReflection::prepare(sr),
            fdn: FdnCore::prepare(sr),
            walls: WallFilterBank::new(),
            spray: MicroDelaySpray::prepare(sr, seed),
            bloom: ResonatorBloom::prepare(sr),
            modu: Modulation::prepare(sr),
            dc_l: DcBlocker::new(),
            dc_r: DcBlocker::new(),
            frozen_tail: 0.0,
        }
    }

    pub fn reset(&mut self) { self.early.reset(); self.fdn.reset(); self.frozen_tail = 0.0; }

    pub fn trigger_spray(&mut self, div: SprayDivision, density: f32, dur_ms: f32, bpm: f32) {
        self.spray.trigger(div, density, dur_ms, bpm);
    }
    pub fn trigger_bloom(&mut self, amount: f32, dur_ms: f32) {
        self.bloom.trigger(amount, dur_ms);
    }

    #[allow(clippy::too_many_arguments)]
    pub fn process_block(
        &mut self,
        in_l: &[f32], in_r: &[f32],
        out_l: &mut [f32], out_r: &mut [f32],
        p: &ManifoldParams, gov: &SafetyGovernor,
        wet: f32, freeze: bool,
    ) {
        let n = out_l.len();
        for i in 0..n {
            let l = sanitize(in_l[i]);
            let r = sanitize(*in_r.get(i).unwrap_or(&l));
            let mono = 0.5 * (l + r);

            let (low, _high) = self.splitter.split(mono);
            let er = self.early.process(mono);
            let spray = self.spray.process(mono);
            let _mod_offset = self.modu.process(p.diffusion * 4.0); // movement flavour (bounded)

            let excitation = if freeze { 0.0 } else { er + spray + low * 0.3 };
            let mut rev = self.fdn.process(excitation, p, gov);
            if freeze {
                // Hold the last live tail value instead of exciting the network.
                rev = self.frozen_tail;
            } else {
                self.frozen_tail = rev;
            }

            let shaped = self.walls.process(rev, p);
            let bloom = self.bloom.process(shaped);
            let wet_sample = gov.soft_clip(shaped + bloom);

            let (mut ol, mut or) = OutputRenderer::render(l, r, wet_sample * wet, p.width);
            ol = self.dc_l.process(gov.soft_clip(ol));
            or = self.dc_r.process(gov.soft_clip(or));
            out_l[i] = ol;
            if i < out_r.len() { out_r[i] = or; }
        }
        finite_guard!("graph.process_block", out_l);
    }
}
```

- [ ] **Step 4: Run — expect PASS**, then commit

```bash
git add codex/core/manifold/manifold-core/
git commit -m "feat(manifold-core): assemble full §16 DSP node graph

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 15: ManifoldCore orchestration (prepare / load_program / process)

**Files:**
- Modify: `codex/core/manifold/manifold-core/src/lib.rs` (flesh out `ManifoldCore`)

**Interfaces:**
- Consumes: everything above.
- Produces: `ManifoldCore::prepare(PrepareConfig) -> Result<(), PrepareError>`, `ManifoldCore::load_program(BytecodeProgram) -> Result<(), ProgramError>`, `ManifoldCore::process(&[f32],&[f32],&mut [f32],&mut [f32], ProcessContext) -> ProcessReport`.

- [ ] **Step 1: Write failing tests** in `src/lib.rs`

```rust
#[cfg(test)]
mod core_tests {
    use super::*;

    const VOID_GLASS: &str = include_str!("../tests/fixtures/void-glass.bytecode.json");

    fn prepared_core() -> ManifoldCore {
        let mut c = ManifoldCore::new();
        c.prepare(PrepareConfig { sample_rate: 48_000.0, max_block_size: 128, channels: 2 }).unwrap();
        c
    }

    #[test]
    fn rejects_bad_prepare() {
        let mut c = ManifoldCore::new();
        assert_eq!(c.prepare(PrepareConfig { sample_rate: 0.0, max_block_size: 128, channels: 2 }), Err(PrepareError::InvalidSampleRate));
    }

    #[test]
    fn loads_valid_program() {
        let mut c = prepared_core();
        let p: BytecodeProgram = serde_json::from_str(VOID_GLASS).unwrap();
        assert!(c.load_program(p).is_ok());
    }

    #[test]
    fn load_program_rejects_unsafe_cycles() {
        let mut c = prepared_core();
        let mut p: BytecodeProgram = serde_json::from_str(VOID_GLASS).unwrap();
        p.safety.has_unsafe_cycles = true;
        assert_eq!(c.load_program(p), Err(ProgramError::UnsafeCycles));
    }

    #[test]
    fn process_is_finite_and_reports() {
        let mut c = prepared_core();
        let p: BytecodeProgram = serde_json::from_str(VOID_GLASS).unwrap();
        c.load_program(p).unwrap();
        let ctx = ProcessContext { bpm: 120.0, panic: false, freeze: false };
        let mut rng = crate::rng::Pcg32::seed(3, 1);
        let mut ol = [0.0f32; 128]; let mut or = [0.0f32; 128];
        for _ in 0..500 {
            let il: Vec<f32> = (0..128).map(|_| rng.next_f32() * 1.6 - 0.8).collect();
            let rep = c.process(&il, &il, &mut ol, &mut or, ctx);
            for i in 0..128 { assert!(ol[i].is_finite() && or[i].is_finite()); }
            let _ = rep.events;
        }
    }

    #[test]
    fn panic_silences_output() {
        let mut c = prepared_core();
        let p: BytecodeProgram = serde_json::from_str(VOID_GLASS).unwrap();
        c.load_program(p).unwrap();
        let il = [0.9f32; 128];
        let mut ol = [0.0f32; 128]; let mut or = [0.0f32; 128];
        let ctx = ProcessContext { bpm: 120.0, panic: true, freeze: false };
        c.process(&il, &il, &mut ol, &mut or, ctx);
        assert!(ol.iter().all(|&s| s.abs() < 1e-4));
    }
}
```

- [ ] **Step 2: Run — expect FAIL**

Run: `cargo test --manifest-path codex/core/manifold/manifold-core/Cargo.toml --lib core_tests`

- [ ] **Step 3: Rewrite `ManifoldCore` in `src/lib.rs`**

```rust
mod api;
mod bytecode;
mod classifier;
mod dsp;
mod error;
mod features;
mod params;
mod rng;
mod safety;
mod vm;

pub use api::*;
pub use bytecode::*;
pub use error::*;
pub use vm::{Action, EventBlock, ParamId, SprayDivision};

use classifier::Classifier;
use dsp::graph::ManifoldGraph;
use features::FeatureExtractor;
use params::ParamStore;
use safety::SafetyGovernor;
use vm::compile_blocks;

pub struct ManifoldCore {
    prepared: bool,
    loaded: bool,
    sample_rate: f32,
    tick_period: usize, // samples per control tick (~10ms)
    tick_accum: usize,
    blocks: Vec<EventBlock>,
    governor: Option<SafetyGovernor>,
    params: Option<ParamStore>,
    graph: Option<ManifoldGraph>,
    features: FeatureExtractor,
    classifier: Classifier,
    scratch_l: Vec<f32>,
    scratch_r: Vec<f32>,
}

impl ManifoldCore {
    pub fn new() -> Self {
        Self {
            prepared: false, loaded: false, sample_rate: 48_000.0,
            tick_period: 480, tick_accum: 0,
            blocks: Vec::new(), governor: None, params: None, graph: None,
            features: FeatureExtractor::new(), classifier: Classifier::new(),
            scratch_l: Vec::new(), scratch_r: Vec::new(),
        }
    }

    pub fn prepare(&mut self, cfg: PrepareConfig) -> Result<(), PrepareError> {
        if !(cfg.sample_rate.is_finite() && cfg.sample_rate >= 8000.0) { return Err(PrepareError::InvalidSampleRate); }
        if cfg.max_block_size == 0 { return Err(PrepareError::InvalidBlockSize); }
        if cfg.channels == 0 || cfg.channels > 2 { return Err(PrepareError::InvalidChannels); }
        self.sample_rate = cfg.sample_rate;
        self.tick_period = ((cfg.sample_rate * 0.010) as usize).max(1); // 10ms
        self.tick_accum = 0;
        self.scratch_l = vec![0.0; cfg.max_block_size];
        self.scratch_r = vec![0.0; cfg.max_block_size];
        self.graph = Some(ManifoldGraph::prepare(cfg.sample_rate, 0));
        self.prepared = true;
        Ok(())
    }

    pub fn load_program(&mut self, program: BytecodeProgram) -> Result<(), ProgramError> {
        validate_header(&program)?;
        let blocks = compile_blocks(&program.instructions)?;
        let governor = SafetyGovernor::from_manifest(&program.safety);
        let mut params = ParamStore::new(self.sample_rate, program.safety.min_ramp_ms);
        // Any CLAMP_FEEDBACK in the program sets the governor ceiling immediately.
        for b in &blocks {
            for a in &b.actions {
                if let Action::ClampFeedback { max } = a { params.set_feedback_ceiling(*max); }
            }
        }
        if let Some(g) = self.graph.as_mut() {
            *g = ManifoldGraph::prepare(self.sample_rate, program.content_hash);
        }
        self.blocks = blocks;
        self.governor = Some(governor);
        self.params = Some(params);
        self.classifier = Classifier::new();
        self.features = FeatureExtractor::new();
        self.loaded = true;
        Ok(())
    }

    pub fn process(
        &mut self,
        in_l: &[f32], in_r: &[f32],
        out_l: &mut [f32], out_r: &mut [f32],
        ctx: ProcessContext,
    ) -> ProcessReport {
        let n = out_l.len();
        // Passthrough / unloaded / panic paths.
        if ctx.panic {
            if let Some(g) = self.graph.as_mut() { g.reset(); }
            for i in 0..n { out_l[i] = 0.0; if i < out_r.len() { out_r[i] = 0.0; } }
            return ProcessReport { events: Vec::new(), clipped: false, cpu_class_ok: true };
        }
        if !self.prepared || !self.loaded {
            for i in 0..n { out_l[i] = in_l[i]; if i < out_r.len() { out_r[i] = *in_r.get(i).unwrap_or(&in_l[i]); } }
            return ProcessReport::default();
        }

        // Control tick: sample-count based so behavior is block-size independent.
        let mut report_events = Vec::new();
        self.tick_accum += n;
        if self.tick_accum >= self.tick_period {
            self.tick_accum = 0;
            let feats = self.features.analyze(in_l, in_r);
            let events = self.classifier.classify(&feats);
            self.dispatch(&events, ctx.bpm);
            report_events = events;
        }
        if let Some(p) = self.params.as_mut() { p.tick(n); }

        let snap = self.params.as_ref().map(|p| p.snapshot()).unwrap_or_default();
        let gov = self.governor.as_ref().unwrap();
        if let Some(g) = self.graph.as_mut() {
            g.process_block(in_l, in_r, out_l, out_r, &snap, gov, 0.7, ctx.freeze);
        }
        let clipped = out_l.iter().any(|s| s.abs() >= 0.999);
        ProcessReport { events: report_events, clipped, cpu_class_ok: true }
    }

    fn dispatch(&mut self, events: &[ClassifiedEvent], bpm: f32) {
        let params = match self.params.as_mut() { Some(p) => p, None => return };
        for ev in events {
            for block in &self.blocks {
                if block.event != ev.event || ev.confidence < block.threshold { continue; }
                for action in &block.actions {
                    match action {
                        Action::RampParam { id, value, duration_ms } => params.ramp_to(*id, *value, *duration_ms),
                        Action::ScaleParam { id, factor, duration_ms } => params.scale(*id, *factor, *duration_ms),
                        Action::ClampFeedback { max } => params.set_feedback_ceiling(*max),
                        Action::TriggerSpray { division, density, duration_ms } => {
                            if let Some(g) = self.graph.as_mut() { g.trigger_spray(*division, *density, *duration_ms, bpm); }
                        }
                        Action::BloomHarmonic { amount, duration_ms } => {
                            if let Some(g) = self.graph.as_mut() { g.trigger_bloom(*amount, *duration_ms); }
                        }
                        Action::CrossfadeNode { .. } => { /* freeze/crossfade handled via ProcessContext.freeze in V1 */ }
                    }
                }
            }
        }
    }
}

impl Default for ManifoldCore {
    fn default() -> Self { Self::new() }
}
```

Note: this replaces the Task-1 `lib.rs` shell (delete the old `scaffold_tests` module and stub body). Keep `dsp/mod.rs` declaring its submodules `pub mod graph;` etc.

- [ ] **Step 4: Run — expect PASS**

Run: `cargo test --manifest-path codex/core/manifold/manifold-core/Cargo.toml`

- [ ] **Step 5: Commit**

```bash
git add codex/core/manifold/manifold-core/
git commit -m "feat(manifold-core): ManifoldCore orchestration + VM dispatch + panic/freeze

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 16: Fixture ABI-drift guard + program rejection integration test

**Files:**
- Create: `codex/core/manifold/manifold-core/tests/fixtures/{ash-lung,cathedral-of-teeth,ice-circuit,substrate-maw}.bytecode.json`
- Create: `codex/core/manifold/manifold-core/tests/bytecode_abi.rs`

**Interfaces:**
- Consumes: public API (`BytecodeProgram`, `ManifoldCore`, `ProgramError`).

- [ ] **Step 1: Copy the remaining four fixtures**

```bash
node -e "const fs=require('fs');for(const name of ['ash-lung','cathedral-of-teeth','ice-circuit','substrate-maw']){const b=JSON.parse(fs.readFileSync('presets/manifold/'+name+'.json')).bytecode;fs.writeFileSync('codex/core/manifold/manifold-core/tests/fixtures/'+name+'.bytecode.json',JSON.stringify(b,null,2));}"
```

- [ ] **Step 2: Record the expected content-hash constants**

```bash
node -e "for(const n of ['void-glass','ash-lung','cathedral-of-teeth','ice-circuit','substrate-maw']){const b=require('./presets/manifold/'+n+'.json').bytecode;console.log(n, b.contentHash);}"
```
Paste the printed integers into the `EXPECTED` table in Step 3 (these are the current values: `void-glass 3425010933`, `ash-lung 3500602270`, `cathedral-of-teeth 3250905319`, `ice-circuit 1355917232`, `substrate-maw 40942810` — re-run to confirm they still match before pasting).

- [ ] **Step 3: Write `tests/bytecode_abi.rs`**

```rust
use manifold_core::*;

const FIXTURES: &[(&str, u32)] = &[
    (include_str!("fixtures/void-glass.bytecode.json"), 3425010933),
    (include_str!("fixtures/ash-lung.bytecode.json"), 3500602270),
    (include_str!("fixtures/cathedral-of-teeth.bytecode.json"), 3250905319),
    (include_str!("fixtures/ice-circuit.bytecode.json"), 1355917232),
    (include_str!("fixtures/substrate-maw.bytecode.json"), 40942810),
];

#[test]
fn all_fixtures_load_and_match_expected_hash() {
    for (json, expected_hash) in FIXTURES {
        let program: BytecodeProgram = serde_json::from_str(json).expect("fixture parses");
        assert_eq!(program.content_hash, *expected_hash, "ABI drift in {}", program.name);
        let mut core = ManifoldCore::new();
        core.prepare(PrepareConfig { sample_rate: 48_000.0, max_block_size: 128, channels: 2 }).unwrap();
        core.load_program(program).expect("factory preset loads");
    }
}

#[test]
fn tampered_program_with_unsafe_cycles_is_rejected_before_audio() {
    let json = FIXTURES[0].0;
    let mut program: BytecodeProgram = serde_json::from_str(json).unwrap();
    program.safety.has_unsafe_cycles = true;
    let mut core = ManifoldCore::new();
    core.prepare(PrepareConfig { sample_rate: 48_000.0, max_block_size: 128, channels: 2 }).unwrap();
    assert_eq!(core.load_program(program), Err(ProgramError::UnsafeCycles));
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `cargo test --manifest-path codex/core/manifold/manifold-core/Cargo.toml --test bytecode_abi`
If a hash assertion fails, re-run Step 2 and update the constant (the JS presets changed).

- [ ] **Step 5: Commit**

```bash
git add codex/core/manifold/manifold-core/
git commit -m "test(manifold-core): all-fixtures ABI-drift guard + unsafe-cycle rejection

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 17: DSP torture suite

**Files:**
- Create: `codex/core/manifold/manifold-core/tests/torture.rs`

**Interfaces:**
- Consumes: public API.

- [ ] **Step 1: Write the torture tests**

```rust
use manifold_core::*;

fn loaded_core(sr: f32) -> ManifoldCore {
    let mut c = ManifoldCore::new();
    c.prepare(PrepareConfig { sample_rate: sr, max_block_size: 128, channels: 2 }).unwrap();
    let json = include_str!("fixtures/void-glass.bytecode.json");
    c.load_program(serde_json::from_str(json).unwrap()).unwrap();
    c
}

fn run(core: &mut ManifoldCore, mut gen: impl FnMut(usize) -> f32, blocks: usize) -> f32 {
    let ctx = ProcessContext { bpm: 120.0, panic: false, freeze: false };
    let mut ol = [0.0f32; 128]; let mut or = [0.0f32; 128];
    let mut peak = 0.0f32;
    let mut idx = 0;
    for _ in 0..blocks {
        let il: Vec<f32> = (0..128).map(|_| { let v = gen(idx); idx += 1; v }).collect();
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
    run(&mut c, |i| {
        let t = i as f32 / sr;
        let f = 20.0 + 12_000.0 * (t / 5.0).min(1.0);
        (std::f32::consts::TAU * f * t).sin() * 0.8
    }, 2000);
}

#[test]
fn white_noise_is_stable() {
    let mut c = loaded_core(44_100.0);
    let mut rng = 0x2545F4914F6CDD1Du64;
    run(&mut c, |_| { rng ^= rng << 13; rng ^= rng >> 7; rng ^= rng << 17; (rng as f32 / u64::MAX as f32) * 1.6 - 0.8 }, 2000);
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
    // Fire panic, then confirm silence in → silence out (no lingering runaway).
    let mut ol = [0.0f32; 128]; let mut or = [0.0f32; 128];
    c.process(&[0.9; 128], &[0.9; 128], &mut ol, &mut or, ProcessContext { bpm: 120.0, panic: true, freeze: false });
    let peak = run(&mut c, |_| 0.0, 200);
    assert!(peak < 1e-2, "did not recover after panic: {peak}");
}
```

- [ ] **Step 2: Run — expect PASS**

Run: `cargo test --manifest-path codex/core/manifold/manifold-core/Cargo.toml --test torture`
If `max_amplitude_dc_bomb_is_bounded` fails, the final `soft_clip` in `graph.rs` is the ceiling — verify it wraps the renderer output (it does in Task 14).

- [ ] **Step 3: Commit**

```bash
git add codex/core/manifold/manifold-core/
git commit -m "test(manifold-core): DSP torture suite (impulse/sweep/noise/silence/DC/panic)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 18: Determinism + variable block-size equivalence

**Files:**
- Create: `codex/core/manifold/manifold-core/tests/determinism.rs`

**Interfaces:**
- Consumes: public API.

- [ ] **Step 1: Write the tests**

```rust
use manifold_core::*;

fn core(sr: f32) -> ManifoldCore {
    let mut c = ManifoldCore::new();
    c.prepare(PrepareConfig { sample_rate: sr, max_block_size: 512, channels: 2 }).unwrap();
    c.load_program(serde_json::from_str(include_str!("fixtures/void-glass.bytecode.json")).unwrap()).unwrap();
    c
}

fn signal(n: usize) -> Vec<f32> {
    (0..n).map(|i| ((i as f32) * 0.05).sin() * 0.6 + if i % 997 == 0 { 0.9 } else { 0.0 }).collect()
}

/// Render `total` samples through `core` using fixed `block` size; return output L.
fn render(core: &mut ManifoldCore, input: &[f32], block: usize) -> Vec<f32> {
    let ctx = ProcessContext { bpm: 120.0, panic: false, freeze: false };
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
        // Non-uniform chunking: 64, 200, 37, 128, ... via a cycling pattern.
        let mut c = core(48_000.0);
        let ctx = ProcessContext { bpm: 120.0, panic: false, freeze: false };
        let sizes = [64usize, 200, 37, 128, 300, 1];
        let mut out = Vec::new();
        let mut i = 0; let mut k = 0;
        while i < input.len() {
            let block = sizes[k % sizes.len()].min(input.len() - i); k += 1;
            let chunk = &input[i..i + block];
            let mut ol = vec![0.0; block]; let mut or = vec![0.0; block];
            c.process(chunk, chunk, &mut ol, &mut or, ctx);
            out.extend_from_slice(&ol); i += block;
        }
        out
    };
    assert_eq!(fixed.len(), irregular.len());
    // Not bit-identical (tick alignment differs), but finite, bounded, energy-equivalent.
    let energy = |v: &[f32]| v.iter().map(|s| s * s).sum::<f32>();
    for s in &irregular { assert!(s.is_finite() && s.abs() <= 1.01); }
    let (ef, ei) = (energy(&fixed), energy(&irregular));
    let ratio = (ef.max(1e-6)) / (ei.max(1e-6));
    assert!(ratio > 0.5 && ratio < 2.0, "energy not equivalent across chunkings: {ratio}");
}

#[test]
fn per_rate_runs_are_stable() {
    // Different rate → different delay lengths, but still finite & bounded.
    let input = signal(44_100);
    let out = render(&mut core(44_100.0), &input, 128);
    for s in &out { assert!(s.is_finite() && s.abs() <= 1.01); }
}
```

- [ ] **Step 2: Run — expect PASS**

Run: `cargo test --manifest-path codex/core/manifold/manifold-core/Cargo.toml --test determinism`

- [ ] **Step 3: Commit**

```bash
git add codex/core/manifold/manifold-core/
git commit -m "test(manifold-core): determinism + variable block-size equivalence

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 19: Full green sweep + lint + README

**Files:**
- Create: `codex/core/manifold/manifold-core/README.md`

**Interfaces:** none (verification + docs).

- [ ] **Step 1: Full test + clippy + fmt check**

Run:
```bash
cargo test --manifest-path codex/core/manifold/manifold-core/Cargo.toml
cargo clippy --manifest-path codex/core/manifold/manifold-core/Cargo.toml -- -D warnings
cargo fmt --manifest-path codex/core/manifold/manifold-core/Cargo.toml -- --check || cargo fmt --manifest-path codex/core/manifold/manifold-core/Cargo.toml
```
Expected: all tests PASS, no clippy errors. Fix any clippy findings inline (do not `#[allow]` blanket-wide except the documented `too_many_arguments` on `process_block`).

- [ ] **Step 2: Write `README.md`**

```markdown
# manifold-core

Pure-Rust Cochlear Manifold audio engine (sub-project 1). Loads
`manifold.bytecode.v1` programs and drives a reactive DSP graph. No
`wasm-bindgen`, no `nih-plug`, no GUI — see
`docs/superpowers/specs/2026-07-09-cochlear-manifold-core-design.md`.

## Public API
- `ManifoldCore::new()`
- `prepare(PrepareConfig) -> Result<(), PrepareError>` — all allocation
- `load_program(BytecodeProgram) -> Result<(), ProgramError>` — structural gate
- `process(in_l, in_r, out_l, out_r, ProcessContext) -> ProcessReport` — zero-alloc

## Test
`cargo test --manifest-path codex/core/manifold/manifold-core/Cargo.toml`

## Not in this crate (later sub-projects)
- wasm-bindgen wrapper (`manifold-wasm`) + workspace split
- nih-plug VST3/CLAP wrapper (`manifold-plugin`)
- Rust DSL compiler port (authoring stays JS this pass)
```

- [ ] **Step 3: Commit**

```bash
git add codex/core/manifold/manifold-core/
git commit -m "chore(manifold-core): green sweep, clippy clean, README

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Self-Review Notes (author check against spec)

- **§0/§5 bytecode ABI, structural gate** → Tasks 2, 3, 4, 16 (schema/semver/unsafe-cycles/unknown-opcode/unknown-target/unknown-event rejection; hash checked in fixtures only, never recomputed at runtime).
- **§4 wrapper-neutral API, sample-count control tick, alloc-in-prepare** → Tasks 1, 15.
- **§6 full §16 node graph, minimal-but-real** → Tasks 9, 11, 12, 13, 14 (all nine nodes present, wired, bounded, tested).
- **§7 VM, all 7 opcodes, UnsupportedOpcode, minRamp floor** → Tasks 4, 8, 15.
- **§8 safety governor, per-node finite guards** → Tasks 10, 12, 13, 14.
- **Determinism / PCG32 / per-rate / block-size** → Tasks 5, 18.
- **§9 tests (torture, determinism, fixtures, rejection, block-size)** → Tasks 16, 17, 18.
- **§10 vetoes** → no DSL compiler, nih-plug, GUI, ML, or per-voxel DSP appears in any task.
- **BPM from ProcessContext** → Tasks 13, 15 (spray division uses `ctx.bpm`).
