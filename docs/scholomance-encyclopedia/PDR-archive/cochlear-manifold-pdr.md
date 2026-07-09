# Product Design Requirements: Cochlear Manifold — Compiled Adaptive DSP Manifold

## 1. Summary

Build **Cochlear Manifold**, a real-time audio effect that uses a **compiler-driven acoustic behavior engine** instead of an ML-controlled black box. V1 runs in the browser as a Rust/WASM kernel inside an AudioWorklet; a native plugin build is a later phase (see 4).

Incoming audio is analyzed into stable musical events such as `sub_transient`, `high_crunch`, `harmonic_sustain`, or `silence_gap`. Those events trigger prevalidated spatial DSP transformations across a virtual acoustic manifold.

The core system is:

```text
Audio Input
→ Feature Extractor
→ Event Classifier
→ Compiled Manifold Program
→ Safety Governor
→ DSP Manifold Engine
→ Audio Output
```

The product should feel like a living room made of reactive materials, but internally it must remain deterministic, bounded, inspectable, and safe.

## 2. Why

The original ML-based concept had strong creative potential but introduced major risks:

* unpredictable parameter decisions
* difficult QA
* unclear training data requirements
* possible feedback instability
* nondeterministic preset recall
* high CPU/runtime complexity
* user confusion around what the system is doing

A compiler solves the central problem better.

Instead of asking a model to “guess the ideal acoustic state,” users or presets define acoustic behavior through a DSL or visual editor. The compiler validates that behavior, clamps unsafe values, optimizes the DSP graph, and emits deterministic runtime bytecode.

This keeps the fantasy:

> “The walls listen and mutate.”

But implements it as:

> “Audio events trigger compiled, safe, musical DSP transformations.”

## 3. Change Classification

**Architectural / behavioral / DSP product foundation**

This is not a cosmetic feature. This creates the core execution model for the plugin.

Primary impact areas:

* DSP graph design
* preset system
* event detection
* parameter automation
* runtime safety
* UI authoring model
* future ML/AI assistant integration

## 4. Target Platform

The following platform decisions are approved for V1.

### 4.1 Product Name

The product is named **Cochlear Manifold**. "Compiled Adaptive DSP Manifold" is the architecture; Cochlear Manifold is the product.

### 4.2 Kernel: One Rust Crate, Compiled to WASM

V1 targets a single Rust crate, `manifold-kernel`, at:

```text
codex/core/manifold/rust-kernel/
```

compiled to WebAssembly via `wasm-bindgen`, repurposing the repo's turboquant rust-kernel pattern at `src/lib/math/quantization/rust-kernel/`.

The **same crate** contains both:

* the compiler: DSL lexer → parser → AST → semantic validation → safety validation → bytecode emission
* the runtime: bytecode VM, safety governor, feature extractor, event classifier, DSP engine

Single authority: the compiler and the VM live in one crate and can never drift.

The TypeScript type blocks in this document remain as interface documentation — they describe the JSON surface the WASM module exposes. The authoritative types live in Rust with serde.

### 4.3 Two Consumers of the WASM Module

1. The **main thread** calls `compile(dsl)` → `{ bytecode, safetyManifest, errors }` as JSON.
2. An **AudioWorkletProcessor** (`src/audio/manifold/manifold.worklet.js`) instantiates the module for realtime `process()`:

* 128-frame blocks
* ~10 ms control tick
* zero allocation in the audio path — all buffers preallocated at `prepare(sampleRate)`

Bytecode travels main → worklet via `port.postMessage` as bytes. Classified events stream back over the same port for a debug overlay.

### 4.4 UI

React page at `src/pages/Manifold/`:

* simple-mode macro controls
* advanced DSL editor with compile report
* 2D zone panel (explicitly **not** 3D voxels in V1)
* audio file drop plus optional mic input
* internal BPM clock for tempo divisions (no DAW host in V1)
* wet/dry, Freeze, Panic

### 4.5 Presets

Presets are stored at `presets/manifold/*.json`.

### 4.6 Future Native Plugin Path (Not V1)

The Rust core stays dependency-light so it can later be wrapped with **nih-plug** for VST3/CLAP. JUCE is not used. Host sync, transport, and PDC are native-plugin concerns deferred to that phase.

## 5. Core Product Goal

Create a plugin where users can author, load, and perform with adaptive acoustic behaviors.

A preset is not just a static snapshot of knobs. A preset is a **compiled behavior program**.

Example behavior:

```text
When a sub-heavy transient hits, the floor absorbs bass and shortens low decay.
When high-frequency crunch appears, the ceiling scatters into crystalline micro-delays.
When harmonic sustain appears, the rear wall blooms into resonant width.
When silence appears, the chamber expands.
```

## 6. Non-Goals for V1

V1 must avoid scope poison.

Do **not** implement:

* generative audio ML
* cloud inference
* per-voxel independent feedback loops
* fully physical acoustic simulation
* unrestricted user scripting
* arbitrary runtime graph mutation
* uncontrolled feedback routing
* nondeterministic preset behavior
* audio-thread memory allocation
* “AI decides everything” behavior

ML can be added later as an optional authoring assistant. It must not be the core runtime spine.

## 7. Design Principles

### 7.1 Determinism First

Given identical:

* preset
* input audio
* sample rate
* block size
* kernel version

The system must produce **bit-exact** output.

The guarantee is explicitly **not** bit-exact across different sample rates. FDN and reverb DSP cannot deliver that: delay-line lengths round differently and filter coefficients are derived per rate. Across sample rates the requirement is perceptual equivalence only.

All randomness comes from a PCG32 generator seeded from the preset.

### 7.2 Compiler Owns Safety

Unsafe behavior should be rejected or rewritten before it reaches the DSP runtime.

Examples:

* feedback above safe maximum
* filter Q above safe range
* delay time jumps without smoothing
* recursive routes without limiter
* CPU budget overflow
* invalid modulation depth
* impossible material mappings

### 7.3 DSP Runtime Must Be Dumb and Fast

The runtime should execute precompiled instructions.

It should not interpret complex user text, allocate memory, infer ML state, or perform expensive graph rebuilding on the audio thread.

### 7.4 Spatial Fantasy, Compact Graph

The UI may present a 3D manifold or voxel grid, but the DSP should use a compact graph of zones and nodes.

The visual model can be rich.
The DSP model must be lean.

### 7.5 Repeatable Weirdness

The system should create bizarre, reactive, cinematic textures, but the weirdness must be controllable and recallable.

Randomness must be seeded (PCG32 from the preset, see 7.1) or avoided.

## 8. User Experience

### 8.1 Primary User Types

| User Type           | Need                                               |
| ------------------- | -------------------------------------------------- |
| Producer            | Wants unique reverb/delay textures fast            |
| Sound designer      | Wants reactive spatial behavior                    |
| Mixing engineer     | Wants safe, controllable adaptive ambience         |
| Experimental artist | Wants strange tearing, glitch, bloom, and movement |
| Power user          | Wants DSL-level control                            |

### 8.2 User-Facing Concept

Avoid marketing the feature as a “compiler” first.

The product name is decided: **Cochlear Manifold** (see 4.1). Candidate names for internal engine/mode branding:

* Manifold Engine
* Adaptive Space Designer
* Reactive Room
* Material Morph Engine
* Acoustic Behavior Engine
* Spatial Spell Compiler

The compiler can be exposed in advanced mode.

### 8.3 Core Controls

| Control       | Purpose                               |
| ------------- | ------------------------------------- |
| Wet/Dry       | Standard blend                        |
| Manifold Size | Overall decay and spatial scale       |
| Reactivity    | Strength of event response            |
| Stability     | Limits mutation speed and chaos       |
| Material      | Base acoustic profile                 |
| Scatter       | Diffusion and micro-delay spread      |
| Fracture      | Glitch and broken reflection behavior |
| Gravity       | Low-end damping and pull              |
| Bloom         | Harmonic sustain expansion            |
| BPM / Clock   | Internal clock for tempo divisions (tap-tempo optional); V1 has no host sync — host sync is a future native-plugin concern |
| Freeze        | Holds current manifold state          |
| Panic         | Instantly kills runaway energy        |

## 9. System Architecture

```text
┌────────────────────┐
│ Audio Input         │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ Feature Extractor   │
│ RMS, crest, bands,  │
│ flux, harmonicity   │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ Event Classifier    │
│ sub_transient,      │
│ high_crunch, etc.   │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ Runtime Bytecode VM │
│ Executes compiled   │
│ manifold behavior   │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ Safety Governor     │
│ clamps, smoothing,  │
│ feedback control    │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ DSP Manifold Engine │
│ delay, diffusion,   │
│ filters, resonators │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ Audio Output        │
└────────────────────┘
```

## 10. Feature Extraction Layer

The feature extractor converts incoming audio into control-rate analysis data.

### Required Features

```ts
type AudioFeatures = {
  rms: number;
  peak: number;
  crestFactor: number;
  spectralCentroid: number;
  spectralFlux: number;
  lowEnergy: number;
  midEnergy: number;
  highEnergy: number;
  transientSharpness: number;
  harmonicity: number;
  inputWidth: number;
};
```

Note on naming: the analysis feature is `inputWidth` (measured stereo width of the incoming signal), deliberately distinct from the `widen` action, which changes the *output* width. The two must not share vocabulary.

### Timing Requirements

Feature extraction should update at control rate, not per sample.

Recommended cadence:

```text
Feature update: 5 ms to 20 ms
Event update: 10 ms to 50 ms
Parameter smoothing: 20 ms to 250 ms depending on target
```

### Latency and Smoothing Policy

V1 uses no lookahead. Reported latency is zero — there is no plugin delay compensation to report. Transient detection is causal.

This creates an inherent trade-off: parameter smoothing (20 ms to 250 ms) and event reactivity pull in opposite directions. The conflict is resolved by the SafetyManifest `minRampMs` floor per parameter class (see 17): feedback-affecting parameters get long floors, tonal parameters get short ones.

### Risk Reduced

This prevents audio-thread overload and keeps modulation responsive without becoming unstable.

## 11. Event Classifier

The classifier maps raw features into named musical events.

### Required V1 Events

```ts
type ManifoldEvent =
  | "sub_transient"
  | "full_spectrum_impact"
  | "high_crunch"
  | "harmonic_sustain"
  | "wide_noise_burst"
  | "vocal_presence"
  | "silence_gap"
  | "dense_spectral_cloud";
```

### Event Example

```ts
if (
  features.lowEnergy > 0.7 &&
  features.transientSharpness > 0.6 &&
  features.crestFactor > 0.5
) {
  emit("sub_transient");
}
```

### V1 Classifier Strategy

Use deterministic rule-based classification.

Do not use ML in V1.

### Future Classifier Strategy

Optional ML may later improve classification of nuanced sound types, but it must output symbolic events only.

It must not directly control feedback, topology, or dangerous DSP values.

## 12. Manifold DSL

The DSL defines acoustic behavior.

### Example

```text
manifold VoidGlass {
  clock internal 120

  material crystal {
    scatter 0.8
    brightness 0.7
    diffusion 0.6
  }

  material ash {
    absorption low 0.8
    absorption high 0.3
    diffusion 0.2
  }

  zone floor uses ash {
    listen sub_transient threshold 0.65

    on trigger {
      morph absorption.low to 0.95 in 60ms
      morph decay.low scale 0.40 in 100ms
      clamp feedback max 0.58
    }
  }

  zone ceiling uses crystal {
    listen high_crunch threshold 0.55

    on trigger {
      spray micro_delay division 1/64 density 0.7 duration 180ms
      morph scatter to 0.92 in 30ms
    }
  }

  zone rear_wall uses crystal {
    listen harmonic_sustain threshold 0.5

    on trigger {
      bloom harmonic amount 0.45 duration 600ms
      widen tail to 0.65 in 300ms
    }
  }
}
```

Every action in this example maps to a bytecode instruction (see 13.5 and 15): the absolute `morph … to` form compiles to `RAMP_PARAM`, the relative `morph … scale` form compiles to `SCALE_PARAM`, and `widen` compiles to `RAMP_PARAM` on a width-class target. Tempo divisions resolve against the internal BPM clock (V1 has no DAW host; see 4.4).

## 13. DSL Concepts

### 13.1 Manifold

The full acoustic behavior program.

### 13.2 Material

A reusable acoustic profile.

Examples:

* ash
* crystal
* metal
* void
* flesh
* glass
* stone
* ice
* cloth

### 13.3 Zone

A spatial behavior region.

V1 zones:

```text
floor
ceiling
left_wall
right_wall
front_wall
rear_wall
core
void_layer
```

### 13.4 Event Listener

A rule binding a zone to an event.

### 13.5 Action

A safe behavior instruction. Every V1 action keyword maps to a bytecode instruction in the union (see 15); anything that does not map is not in V1.

V1 actions and their instructions:

```text
morph      → RAMP_PARAM (absolute "to" form) / SCALE_PARAM (relative "scale" form)
spray      → TRIGGER_SPRAY
bloom      → BLOOM_HARMONIC
clamp      → CLAMP_FEEDBACK
widen      → RAMP_PARAM on a width-class target
freeze     → CROSSFADE_NODE into the held/frozen tail state
crossfade  → CROSSFADE_NODE
```

Not verbs: `absorb`, `scatter`, and `diffuse` are **material parameter targets**, not actions. They are addressed through `morph` (for example `morph absorption.low to 0.95 in 60ms`).

Deferred beyond V1: `duck`, `route`.

## 14. Compiler Pipeline

```text
DSL Source
→ Lexer
→ Parser
→ AST
→ Semantic Validation
→ Safety Validation
→ DSP Graph Planning
→ Optimization Pass
→ Bytecode Emission
→ Runtime Program
```

### 14.1 Parser

Produces an AST from DSL source.

```ts
type ManifoldAst = {
  name: string;
  clock: "internal" | "free"; // host sync is a future native-plugin concern
  materials: MaterialAst[];
  zones: ZoneAst[];
};
```

### 14.2 Semantic Validation

Checks:

* referenced materials exist
* referenced zones are valid
* event names are valid
* action names are valid
* parameter targets exist
* time units are valid
* values are numeric and bounded

### 14.3 Safety Validation

Checks:

* feedback bounds
* filter Q bounds
* delay time bounds
* modulation bounds
* spray density bounds
* CPU budget
* no unsafe cycles
* no instantaneous delay jumps
* no impossible routing

### 14.4 Optimization Pass

Collapses visual/spatial abstractions into efficient DSP routes.

Example:

```text
ceiling + high_crunch + crystal scatter
→ high band send
→ micro-delay spray node
→ diffusion bus
→ wet output
```

### 14.5 Bytecode Emission

Emits deterministic instructions for runtime execution.

## 15. Bytecode Model

### Instruction Shape

```ts
type Instruction =
  | {
      op: "MATCH_EVENT";
      event: ManifoldEvent;
      threshold: number;
    }
  | {
      op: "RAMP_PARAM";
      target: string;
      value: number;
      durationMs: number;
    }
  | {
      op: "SCALE_PARAM";
      target: string;
      factor: number;
      durationMs: number;
    }
  | {
      op: "CLAMP_FEEDBACK";
      node: string;
      max: number;
    }
  | {
      op: "TRIGGER_SPRAY";
      division: "1/8" | "1/16" | "1/32" | "1/64";
      density: number;
      durationMs: number;
    }
  | {
      op: "BLOOM_HARMONIC";
      amount: number;
      durationMs: number;
    }
  | {
      op: "CROSSFADE_NODE";
      from: string;
      to: string;
      durationMs: number;
    };
```

`RAMP_PARAM` sets a target to an absolute value; `SCALE_PARAM` multiplies the target's current compiled value by `factor` (the DSL `morph … scale` form). `widen` emits `RAMP_PARAM` on a width-class target rather than having its own op.

### Compiled Program

```ts
type CompiledManifoldProgram = {
  schemaVersion: "manifold.bytecode.v1";
  kernelSemver: string; // semver of the manifold-kernel crate that emitted this program
  contentHash: number;  // FNV-1a-32 over the canonical serialized bytecode bytes
  id: string;
  name: string;
  sampleRatePolicy: "adaptive"; // delay lines and coefficients derived at prepare(sampleRate); bit-exact per rate, perceptually equivalent across rates (see 7.1)
  instructions: Instruction[];
  safety: SafetyManifest;
  graph: DspGraphPlan;
};
```

### Bytecode Versioning

`schemaVersion` alone is insufficient: a compiler bugfix can change emission under the same schema. Every compiled program therefore carries the triple `{schemaVersion, kernelSemver, contentHash}`, where `contentHash` is FNV-1a-32 over the canonical serialized bytecode bytes. The preset system uses this triple to decide when a cached program is stale (see 18).

## 16. DSP Manifold Engine

The DSP engine should be compact, stable, and modular.

### Required V1 Nodes

| Node                  | Responsibility                             |
| --------------------- | ------------------------------------------ |
| Input Splitter        | separates bands and transient/body content |
| Early Reflection Node | creates spatial immediacy                  |
| FDN Core              | stable reverb/diffusion base               |
| Wall Filter Bank      | per-zone damping and tonal shaping         |
| Micro-Delay Spray     | glitch/fracture behavior                   |
| Resonator Bloom       | harmonic expansion                         |
| Modulation Node       | movement and instability flavor            |
| Safety Limiter        | catches feedback spikes                    |
| Output Renderer       | stereo/wide/binaural-like output           |

### Critical Constraint

Do not implement true per-voxel DSP in V1.

The voxel/grid UI should compile down to zone weights and graph routing.

## 17. Safety Governor

The Safety Governor is mandatory.

### Responsibilities

* hard parameter clamps
* feedback ceilings
* ramp smoothing
* topology crossfades
* denormal protection
* NaN/Inf guards
* DC blocking
* energy compensation
* panic reset
* internal limiter/clipper
* CPU budget enforcement

### Safety Manifest

```ts
type SafetyManifest = {
  maxFeedback: number;
  maxFilterQ: number;
  maxSprayDensity: number;
  maxDelayMs: number;
  minRampMs: number;
  cpuBudgetClass: "low" | "medium" | "high";
  requiresLimiter: boolean;
  hasUnsafeCycles: boolean;
};
```

Programs with `hasUnsafeCycles: true` must not compile for realtime use.

## 18. Preset System

A preset must store:

* DSL source
* compiled bytecode
* compiler version
* safety manifest
* macro control defaults
* material definitions
* optional visual layout

```ts
type ManifoldPreset = {
  schemaVersion: "manifold.preset.v1";
  name: string;
  author?: string;
  dslSource: string;
  bytecode: CompiledManifoldProgram;
  macros: Record<string, number>;
  visualLayout?: ManifoldVisualLayout;
};
```

### Preset Recall Requirement

Loading a preset should not require recompilation unless:

* compiler version changed
* sample rate policy requires regeneration
* DSL source changed
* bytecode schema changed

## 19. Visual UI Model

V1 UI should support both simple and advanced users.

### Simple Mode

Macro controls:

* Size
* Reactivity
* Stability
* Material
* Scatter
* Fracture
* Gravity
* Bloom
* Wet/Dry

### Advanced Mode

Expose:

* event listeners
* zone behaviors
* material editor
* DSL editor
* bytecode/safety report
* CPU budget report

### Visual Manifold

A 3D or pseudo-3D grid may be used to represent zones.

Important:

The visual grid is an authoring abstraction, not a literal DSP simulation.

## 20. ML Policy

ML is not part of V1 runtime.

### Allowed Future Uses

* generate DSL from natural language
* suggest preset variations
* classify complex events
* analyze user automation offline
* recommend safer mappings
* create material templates

### Forbidden ML Uses

* direct audio generation
* direct feedback control
* direct topology mutation
* unbounded parameter output
* audio-thread inference
* required cloud dependency
* nondeterministic preset playback

### Correct Future Architecture

```text
User prompt
→ ML assistant drafts DSL
→ Compiler validates DSL
→ Safety pass approves or rejects
→ DSP executes bytecode
```

The compiler remains the authority.

## 21. Implementation Phases

### Phase 0: Research Spike

Goal:

Prove adaptive event-driven DSP sounds musically valuable without ML.

Deliverables:

* feature extractor prototype
* deterministic event classifier
* basic reverb/delay DSP graph
* 3 to 5 hardcoded behavior presets

Exit Criteria:

* sub transients can change low decay safely
* high crunch can trigger micro-delay scatter
* harmonic sustain can trigger bloom
* no feedback explosion under torture tests

### Phase 1: Core DSP Manifold

Goal:

Create stable DSP foundation.

Deliverables:

* FDN or diffusion core
* early reflection node
* wall filter bank
* micro-delay spray node
* resonator bloom node
* wet/dry and output renderer
* safety limiter

Exit Criteria:

* plugin runs in realtime
* no allocations on audio thread
* stable under impulse, sine sweep, noise burst, drum loop, and vocal tests

### Phase 2: Event Classifier

Goal:

Convert audio features into symbolic events.

Deliverables:

* feature extraction module
* event thresholds
* smoothing/hysteresis
* event cooldowns
* event debug overlay

Exit Criteria:

* events are stable
* no rapid flickering
* no false-trigger chaos on dense mixes
* event output is deterministic

### Phase 3: DSL Parser

Goal:

Create the first authoring language.

Deliverables:

* lexer
* parser
* AST types
* parser errors
* minimal valid programs
* snapshot tests

Exit Criteria:

* valid DSL parses consistently
* invalid DSL gives useful errors
* no runtime execution yet

### Phase 4: Compiler Validation

Goal:

Reject unsafe or invalid behavior before runtime.

Deliverables:

* semantic validation
* safety validation
* CPU budget validation
* material validation
* zone validation

Exit Criteria:

* unsafe feedback fails compile
* invalid zones fail compile
* excessive spray density fails compile
* bad event names fail compile

### Phase 5: Bytecode Runtime

Goal:

Execute compiled behavior deterministically.

Deliverables:

* bytecode instruction model
* runtime VM
* event-to-action dispatch
* parameter ramp scheduler
* safety governor integration

Exit Criteria:

* DSL behavior controls DSP
* no direct unsafe parameter writes
* preset recall is stable

### Phase 6: UI Authoring

Goal:

Make the system usable by producers.

Deliverables:

* macro controls
* material selector
* zone editor
* event behavior editor
* DSL advanced editor
* compile report panel

Exit Criteria:

* user can create a behavior without writing DSL
* advanced user can edit DSL directly
* compile errors are understandable

### Phase 7: Preset System

Goal:

Save, load, and share compiled manifold presets.

Deliverables:

* preset schema
* bytecode cache
* compiler version tracking
* factory presets
* compatibility checks

Exit Criteria:

* presets reload consistently
* bytecode cache works
* incompatible presets fail gracefully

### Phase 8: Optional AI Assistant

Goal:

Add ML/LLM as a non-authoritative authoring helper.

Deliverables:

* prompt-to-DSL generator
* safety-aware preset suggestions
* compiler-gated output
* opt-in only

Exit Criteria:

* generated DSL must pass compiler
* failed compile produces repair suggestions
* AI never bypasses safety

## 22. Factory Preset Targets

### 22.1 VoidGlass

High frequencies fracture into crystalline micro-delays. Low transients choke the chamber.

### 22.2 Cathedral of Teeth

Vocals excite narrow resonances. Sibilance scatters upward. Bass pulls the room inward.

### 22.3 Ash Lung

Silence expands the reverb. Impacts collapse the tail. Harmonic content breathes through slow modulation.

### 22.4 Ice Circuit

Bright transients create frozen glitch reflections. Sustained notes bloom into glassy width.

### 22.5 Substrate Maw

Low-end hits trigger heavy absorption and dark resonant movement.

## 23. QA Checklist

### DSP Stability

* impulse test
* sine sweep test
* white noise burst test
* kick loop test
* vocal phrase test
* dense full-mix test
* silence test
* maximum feedback test

### Compiler Safety

* reject feedback above max
* reject unknown events
* reject unknown zones
* reject invalid materials
* reject zero-time delay jumps
* reject excessive spray density
* reject unsafe recursive routes

### Runtime

* no audio-thread allocations
* no NaN or Inf propagation
* no denormal CPU spikes
* no zipper noise on morphs
* panic button always works
* preset recall is deterministic

### UI

* compile errors are readable
* macro controls affect expected behavior
* advanced DSL editor does not corrupt presets
* visual zones map clearly to sound changes

### Regression

* old presets load or fail with migration message
* compiler version changes are detected
* CPU budget remains within target
* bypass works cleanly
* wet/dry remains phase-stable

## 24. Main Risks

### Risk 1: DSL Becomes Too Complex

Mitigation:

Start with a small grammar. Add features only after presets prove the need.

### Risk 2: The Plugin Sounds Gimmicky

Mitigation:

Prioritize musical factory presets. Keep wild behavior controllable through Stability and Reactivity.

### Risk 3: Event Detection Feels Jittery

Mitigation:

Use smoothing, hysteresis, cooldowns, and confidence thresholds.

### Risk 4: Feedback Instability

Mitigation:

Use compile-time feedback validation plus runtime limiting.

### Risk 5: CPU Overload

Mitigation:

Compile visual complexity into a compact DSP graph. Do not run literal per-voxel feedback.

### Risk 6: Users Hate “Compiler” Language

Mitigation:

Expose “Manifold Engine” and “Behavior Designer” in normal UI. Keep compiler details in advanced mode.

## 25. Final Product Definition

This product is a:

```text
Compiled adaptive spatial DSP engine
```

It is not:

```text
An ML-generated reverb
```

The correct mental model:

```text
A deterministic acoustic behavior compiler that turns audio events into safe, reactive DSP transformations.
```

The fantasy:

```text
The room listens.
The walls mutate.
The sound fractures, blooms, chokes, and breathes.
```

The engineering truth:

```text
Feature extraction triggers symbolic events.
Symbolic events execute compiled bytecode.
Bytecode controls bounded DSP parameters.
The safety governor prevents chaos from becoming damage.
```

That is the spine.
