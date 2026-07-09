# Cochlear Manifold — `manifold-core` DSP Engine (Sub-Project 1)

- **Date:** 2026-07-09
- **Status:** Approved (design); pending spec review
- **Author / Agent:** Codex
- **Related:**
  - PDR: `docs/scholomance-encyclopedia/PDR-archive/cochlear-manifold-pdr.md`
  - PIR: `docs/scholomance-encyclopedia/post-implementation-reports/PIR-20260709-COCHLEAR-MANIFOLD.md`
- **Supersedes/extends:** the Rust crate skeleton at `codex/core/manifold/rust-kernel/` (currently `compile` + `classify` only, plus a built `pkg/` WASM artifact).

---

## 0. The Law (put this first)

> **For sub-project 1 (and the later native plugin), the runtime authority is `manifold.bytecode.v1` — not the DSL source.**

`manifold.bytecode.v1` is treated as a **stable ABI and sacred law**, not a temporary blob format. The core deserializes and validates bytecode, rejects stale/invalid/unsafe bytecode, and never parses DSL. A future Rust DSL compiler port (separate sub-project) must emit **byte-identical semantics** to this ABI.

---

## 1. Context & Motivation

The existing Cochlear Manifold V1 foundation has: a JS compiler/classifier/preset system (`codex/core/manifold/index.js`), five factory presets carrying full compiled bytecode (`presets/manifold/*.json`), an AudioWorklet **shell** (`src/audio/manifold/manifold.worklet.js` — currently a gain/passthrough that classifies events but drives **no DSP**), an internal React authoring page (`/manifold`), and a Rust crate skeleton (`compile`/`classify`, now compiled to WASM `pkg/`).

The PIR explicitly defers "full DSP quality and Rust/WASM runtime parity." The real, un-built algorithmic risk is therefore:

> **Can a compiled behavior program drive a real, safe, reactive DSP graph?**

`manifold-core` answers exactly that question, in isolation, before any wrapper complexity (WASM, native plugin, GUI) is introduced.

## 2. Decomposition & Build Order

Three sequential sub-projects. **This spec covers sub-project 1 only.**

1. **`manifold-core`** — pure-Rust audio engine (bytecode model, runtime VM, safety governor, feature extractor, event classifier, full §16 DSP node graph, `prepare`/zero-alloc `process`), fully `cargo test`-able offline. ← **this pass**
2. **Workspace split + `manifold-wasm`** — refactor `manifold-kernel` into a Cargo workspace: `manifold-core` (pure) + `manifold-wasm` (thin `wasm-bindgen` wrapper), rebuild the browser `pkg/`. *(later)*
3. **`manifold-plugin`** — `nih-plug` wrapper exporting VST3 + CLAP, bundled, no GUI. *(later)*

## 3. Approved Decisions

| ID | Decision | Verdict | Constraint |
|----|----------|---------|------------|
| D1 | Workspace split: `manifold-core` / `manifold-wasm` / `manifold-plugin` | **Approved** | `manifold-core` depends on **neither** `wasm-bindgen` nor `nih-plug`. Wrapper bugs must never masquerade as DSP bugs. |
| D2 | Plugin/core consume **precompiled bytecode**, no Rust DSL compiler this pass | **Approved (with constraint)** | Bytecode is a stable, validated ABI (see §0, §5). API is `load_program(BytecodeProgram)`, **never** `load_dsl(&str)` this pass. |
| D6 | **No editor GUI** this pass | **Approved** | Host-automatable params only (arrives in sub-project 3). No X11/GL/egui deps. |

## 4. Core API (wrapper-neutral)

The core must **not** assume 128-frame blocks (that is a browser AudioWorklet detail). Hosts vary. The control-rate accumulator is **sample-count based** so behavior is stable across block sizes.

```rust
pub struct PrepareConfig {
    pub sample_rate: f32,
    pub max_block_size: usize,
    pub channels: usize,        // 1 or 2 in V1
}

pub struct ProcessContext {
    pub bpm: f32,               // internal clock; no host-sync assumption
    pub panic: bool,            // runtime control, not compile-time behavior
    pub freeze: bool,           // runtime control
}

pub struct ProcessReport {
    pub events: Vec<ClassifiedEvent>, // for debug overlay
    pub clipped: bool,
    pub cpu_class_ok: bool,
}

pub struct ManifoldCore { /* preallocated state */ }

impl ManifoldCore {
    pub fn new() -> Self;
    pub fn prepare(&mut self, config: PrepareConfig) -> Result<(), PrepareError>;
    pub fn load_program(&mut self, program: BytecodeProgram) -> Result<(), ProgramError>;
    pub fn process(
        &mut self,
        input_l: &[f32],
        input_r: &[f32],
        output_l: &mut [f32],
        output_r: &mut [f32],
        context: ProcessContext,
    ) -> ProcessReport;
}
```

- `prepare` performs **all allocation** (delay lines, buffers, scratch). `process` is **zero-alloc**.
- Delay-line lengths and filter coefficients are derived at `prepare(sample_rate)`: **bit-exact per rate, perceptually equivalent across rates** (PDR §7.1).
- All randomness comes from a **PCG32 seeded from the preset** (PDR §7.1/§7.5).

## 5. Bytecode ABI & Compatibility Gate

```rust
pub struct BytecodeHeader {
    pub schema_version: String, // must equal "manifold.bytecode.v1"
    pub kernel_semver: String,
    pub content_hash: u32,      // FNV-1a-32 over canonical serialized bytecode bytes
}
```

`BytecodeProgram` mirrors `CompiledManifoldProgram` (PDR §15) via serde: `{ schemaVersion, kernelSemver, contentHash, id, name, sampleRatePolicy, instructions, safety, graph? }`.

`load_program` MUST:

1. Reject `schema_version != "manifold.bytecode.v1"` → `ProgramError::SchemaMismatch`.
2. Recompute `content_hash` over the canonical bytes and reject a mismatch → `ProgramError::HashMismatch` (stale/corrupt bytecode).
3. Reject `safety.has_unsafe_cycles == true` → `ProgramError::UnsafeCycles` (must not load for realtime use — PDR §17). **Before any audio is processed.**
4. Reject any unknown opcode → `ProgramError::UnsupportedOpcode`. **Silent ignore is forbidden.**
5. Group the flat instruction stream into `MATCH_EVENT → [actions]` blocks.

Factory presets ship as **bytecode fixtures**; tests assert their `content_hash` against expected values (see §9).

## 6. DSP Node Graph (§16 — "minimal-but-real", not boutique)

Signal path (PDR §16):

```
InputSplitter → EarlyReflection → FDN Core → WallFilterBank
→ MicroDelaySpray → ResonatorBloom → Modulation → SafetyLimiter → OutputRenderer
```

**"Full graph" this pass means:** each node **exists, is wired, is bounded, has tests, and produces audible, finite output.** It does **not** mean final premium DSP quality. Boutique tuning is a later pass.

| Node | Minimal-but-real responsibility |
|------|--------------------------------|
| InputSplitter | Split bands + transient/body content; feeds features and per-zone sends |
| EarlyReflection | Short fixed tapped delay for spatial immediacy |
| FDN Core | Hadamard/Householder-mixed feedback delay network; stable reverb/diffusion base |
| WallFilterBank | Per-zone damping / tonal shaping (one-pole/biquad) |
| MicroDelaySpray | Tempo-divided micro-delay grains (glitch/fracture); density-bounded |
| ResonatorBloom | Harmonic resonators for sustain expansion |
| Modulation | LFO(s) on delay taps for movement (bounded depth) |
| SafetyLimiter | Feedback-spike catch + soft-clip |
| OutputRenderer | Wet/dry blend + stereo width |

Compact graph only — **no true per-voxel DSP** (PDR §16 constraint; see Veto V5).

## 7. Runtime VM

Mental model:

```
MATCH_EVENT → [actions]     (parsed at load_program)

each control tick (~10 ms, sample-count based):
  features → classify → dispatch matched events → param ramp scheduler → DSP params
```

- Classifier reuses the existing rule thresholds; adds **hysteresis + cooldown** to prevent flicker (PDR §11, Risk 3).
- Opcode → action mapping (PDR §13.5/§15), all seven supported:
  - `MATCH_EVENT` — gate/threshold for the following action block
  - `RAMP_PARAM` — ramp target to absolute value over `durationMs`
  - `SCALE_PARAM` — multiply target's current value by `factor` over `durationMs`
  - `CLAMP_FEEDBACK` — set governor feedback ceiling on a node
  - `TRIGGER_SPRAY` — fire MicroDelaySpray (division/density/duration)
  - `BLOOM_HARMONIC` — fire ResonatorBloom (amount/duration)
  - `CROSSFADE_NODE` — crossfade node state (also backs Freeze)
- Ramp scheduler enforces the `minRampMs` floor per parameter class from the SafetyManifest (PDR §10 latency/smoothing policy).
- **Unknown opcode → `ProgramError::UnsupportedOpcode` at load** (never silently ignored).

## 8. Safety Governor

Responsibilities (PDR §17): hard parameter clamps, feedback ceilings, ramp smoothing, topology crossfades, denormal flush, NaN/Inf guards, DC blocking, energy compensation, panic reset, internal limiter/soft-clip, CPU-budget class check.

- Clamps sourced from the loaded `SafetyManifest` (`maxFeedback`, `maxFilterQ`, `maxSprayDensity`, `maxDelayMs`, `minRampMs`, `cpuBudgetClass`, `requiresLimiter`).
- **Per-node finite guard:** in `debug`/`test` builds, a finite/bounded check runs **after every major node** (FDN, MicroDelaySpray, ResonatorBloom, OutputRenderer) so a NaN's origin node is pinpointed. In `release`, only the final output guard runs.
- `panic` → immediate energy kill + state reset. `freeze` → hold current manifold/tail state (via CROSSFADE_NODE into held state).

## 9. Testing Plan (offline `cargo test`)

**Unit / behavioral**
- VM dispatch (each opcode routes to the correct action)
- Ramp scheduler (absolute ramp, relative scale, `minRampMs` floor)
- Safety clamps (feedback/Q/delay/spray ceilings honored)

**DSP torture suite** — for each: impulse, sine sweep, white-noise burst, silence, maximum feedback. Assert: all output finite, bounded (no denormal storms), tail decays, and **panic reset works** mid-signal.

**Determinism / regression**
- **Golden render hash** on one preset (fixed input → stable output hash) for regression.
- Bit-exact-per-rate check (same rate → identical output across runs).

**Added tests (from review)**
1. **Variable block-size equivalence** — process identical input as 128-frame, 256-frame, and irregular chunks. Output need not be bit-identical across chunkings, but must stay **finite, bounded, and musically equivalent**; the sample-count-based control accumulator keeps tick alignment stable.
2. **Program rejection** — a program with `hasUnsafeCycles: true` (and, separately, schema mismatch / hash mismatch / unknown opcode) **must fail `load_program` before any audio is processed.**

**Fixtures**
- The 5 factory-preset bytecode blobs are checked in as fixtures; tests assert their `content_hash` matches expected values (bytecode ABI freshness).

## 10. Non-Goals / Vetoes (explicit)

| # | Veto | Rationale |
|---|------|-----------|
| V1 | **No live DSL compiler in Rust** this pass | Would starve the audio engine of oxygen; `load_program(bytecode)` only. |
| V2 | **No `nih-plug` wrapper** this pass | Sub-project 3. `manifold-core` stays wrapper-free. |
| V3 | **No GUI / X11 / GL / egui deps** | D6. |
| V4 | **No ML / smart-assistant runtime layer** | PDR §20 keeps ML out of V1 runtime. |
| V5 | **No true per-voxel DSP** | PDR §16 — voxel/grid is an authoring abstraction; DSP stays a compact zone graph. |

## 11. Verification Ceiling (honest)

This is a headless SteamOS box with **no DAW and a broken C toolchain** (why `cargo install wasm-pack` failed — it fell back to a prebuilt musl binary). For sub-project 1 this is fine: `manifold-core` is **pure Rust and fully offline-testable** via `cargo test`. DAW/host loading and bundle validation are sub-project-3 concerns and cannot be performed on this machine; that limitation does not affect the deliverable of this pass.

## 12. Deliverables (this pass)

- `manifold-core` crate: `PrepareConfig`/`ProcessContext`/`ProcessReport`/`ManifoldCore`, `BytecodeProgram` + compatibility gate, runtime VM, safety governor, feature extractor, classifier, and the 9-node DSP graph.
- Checked-in factory-preset bytecode fixtures + hash assertions.
- Offline `cargo test` suite per §9, green.
- No wasm, no nih-plug, no GUI touched.
