# Skill: Rust/VST3 DSP Functionality and UI Architect

## Purpose

Generate professional, deterministic, mathematically rigorous Rust audio plugin code for VST3 DSP systems, including signal processing engines, parameter models, UI state renderers, automation behavior, and validation tests.

This skill treats an audio plugin as a **sample-accurate signal system**, not a collection of knobs and vibes. Every audible behavior must be traceable to mathematical transforms, parameter state, sample rate, buffer topology, latency rules, and tested numerical constraints.

The goal is pristine DSP behavior: stable filters, controlled nonlinearities, predictable parameter smoothing, artifact-safe modulation, silence safety, denormal protection, sample-rate independence, and UI controls that accurately represent the underlying DSP state.

This hardened version adds research-team style validation: explicit hypotheses, baseline comparison, ablation testing, objective measurement, perceptual listening protocols, reproducibility bundles, and release gates. A DSP claim is not accepted because it sounds plausible. It must survive math, measurement, host behavior, and listening evidence.

---

## Use This Skill When

Use this skill for:

- Rust audio plugin development
- VST3 plugin architecture
- NIH-plug, vst3-rs, baseview, egui, iced, Vizia, or custom Rust plugin UIs
- EQs, compressors, limiters, clippers, saturators, reverbs, delays, modulation effects, spatial processors, analyzers, and metering tools
- Parameter smoothing and automation-safe DSP
- Oversampling and anti-aliasing pipelines
- Filter coefficient design and stability checks
- DSP unit tests and golden audio regression tests
- UI-to-DSP parameter synchronization
- Real-time safe audio callback design
- Plugin preset/state serialization
- Host integration behavior

Do **not** use this skill to create vague audio concepts, static plugin mockups, untested DSP pseudocode, or visually impressive UI that is disconnected from the audio engine.

---

## Core Principle

A professional audio plugin is not a knob panel.

A professional audio plugin is:

```txt
host state
  -> normalized parameters
  -> smoothed control signals
  -> mathematically stable DSP
  -> real-time safe processing
  -> deterministic audio output
  -> truthful UI feedback
  -> validated regression behavior
  -> reproducible measurement evidence
  -> perceptual evaluation when sonic claims require it
```

If the sample rate changes, the DSP must retune predictably.

If the buffer size changes, the audio must remain stable.

If automation moves a parameter, the transition must be click-safe.

If the UI displays a value, it must reflect the real parameter state.

If nonlinear processing adds harmonics, aliasing must be measured and controlled.

If the plugin claims to be transparent, pristine, analog, mastering-safe, low-latency, musical, or artifact-free, the claim must be backed by a declared test protocol and reproducible evidence.

---

## Required Inputs

Before generating code, identify or infer:

```txt
targetPluginFormat: vst3 | clap | au | standalone | multi-format
rustFramework: nih-plug | vst3-rs | raw-vst3 | other
pluginType: eq | compressor | limiter | saturator | reverb | delay | modulation | analyzer | synth | hybrid
sampleFormat: f32 | f64 internal | mixed
channelLayout: mono | stereo | surround | dynamic
sampleRates: supported host rates, usually 44.1k, 48k, 88.2k, 96k, 192k
maxBlockSize: expected host buffer range
latencySamples: zero-latency | fixed | dynamic
oversampling: none | 2x | 4x | 8x | adaptive
parameterModel: normalized range, display range, unit, taper, smoothing
stateModel: bypass, reset, preset load, sample-rate change, transport-aware state
uiFramework: egui | iced | Vizia | baseview | native | other
meteringModel: peak | RMS | LUFS-ish | gain reduction | spectrum | phase
mathModel: exact equations for filters, envelopes, nonlinearities, delays, interpolation
safetyRequirements: no allocations in process, denormal protection, NaN handling, panic-free audio thread
qualityTarget: transparent | musical coloration | aggressive | analyzer-grade | mastering-safe
researchClaimLevel: none | engineering-validated | perceptual-validated | publication-grade
referenceImplementation: bypass | naive-baseline | previous-version | known-algorithm | measured-hardware | commercial-reference-when-legal
testMaterial: sine | impulse | sweep | noise | drums | bass | vocals | full-mix | project-specific WAVs
objectiveMetrics: THD+N | SNR | alias-floor | null-error | peak/RMS | latency | CPU | memory | denormal-stability
perceptualProtocol: none | ABX | MUSHRA | preference | expert-review
reproducibilityBundle: commit hash, Rust version, framework version, input WAVs, rendered WAVs, plots, settings
```

If any input is missing, make the smallest safe assumption and state it.

---

## Non-Negotiable Laws

### 1. DSP Must Be Equation-Driven

Every processor must declare the equations that define its behavior.

Bad:

```rust
sample *= 1.2;
sample = sample.tanh();
```

Good:

```txt
linear_gain = 10^(gain_db / 20)
drive_gain = 10^(drive_db / 20)
saturated = tanh(drive_gain * x) / tanh(drive_gain)
y = dry * (1 - mix) + saturated * mix
```

```rust
#[inline]
fn db_to_gain(db: f32) -> f32 {
    10.0_f32.powf(db / 20.0)
}

#[inline]
fn normalized_tanh_saturation(x: f32, drive_db: f32) -> f32 {
    let drive = db_to_gain(drive_db).max(1.0e-6);
    (x * drive).tanh() / drive.tanh().max(1.0e-6)
}
```

The implementation must map:

```txt
parameter -> mathematical variable -> coefficient/control signal -> sample transform
```

---

### 2. Sample Rate Independence Is Mandatory

Any time-based or frequency-based behavior must use `sample_rate` explicitly.

Required formulas:

```txt
normalized_frequency = frequency_hz / sample_rate
omega = 2π * frequency_hz / sample_rate
one_pole_alpha = exp(-1 / (time_seconds * sample_rate))
dc_blocker_r = exp(-2π * cutoff_hz / sample_rate)
```

Bad:

```rust
let alpha = 0.99;
```

Good:

```rust
#[inline]
fn one_pole_alpha(time_seconds: f32, sample_rate: f32) -> f32 {
    if time_seconds <= 0.0 {
        0.0
    } else {
        (-1.0 / (time_seconds * sample_rate)).exp()
    }
}
```

Retune coefficients whenever the sample rate changes.

---

### 3. Parameter Smoothing Is Required For Audible Parameters

Any parameter that can change during playback must be smoothed unless the parameter is explicitly discrete.

Required smoothing model:

```txt
a = exp(-1 / (tau * fs))
y[n] = target[n] + a * (y[n-1] - target[n])
```

Equivalent update form:

```txt
y += (1 - a) * (target - y)
```

Rust shape:

```rust
pub struct SmoothedValue {
    current: f32,
    target: f32,
    coeff: f32,
}

impl SmoothedValue {
    pub fn set_time(&mut self, time_seconds: f32, sample_rate: f32) {
        self.coeff = one_pole_alpha(time_seconds, sample_rate);
    }

    pub fn set_target(&mut self, target: f32) {
        self.target = target;
    }

    #[inline]
    pub fn next(&mut self) -> f32 {
        self.current += (1.0 - self.coeff) * (self.target - self.current);
        self.current
    }
}
```

Use faster smoothing for bypass fades, moderate smoothing for tone controls, and domain-appropriate smoothing for modulation depth, threshold, ratio, drive, delay time, and wet/dry mix.

---

### 4. Filter Stability Must Be Proven

Every filter must state:

- coefficient equation
- coefficient normalization
- stable parameter ranges
- pole or integrator stability conditions
- sample-rate behavior
- reset behavior

For biquad filters, normalize by `a0` and validate finite coefficients.

RBJ-style lowpass coefficient shape:

```txt
omega = 2πf0/fs
alpha = sin(omega)/(2Q)
b0 = (1 - cos(omega))/2
b1 = 1 - cos(omega)
b2 = (1 - cos(omega))/2
a0 = 1 + alpha
a1 = -2cos(omega)
a2 = 1 - alpha
normalized: b0/a0, b1/a0, b2/a0, a1/a0, a2/a0
```

Safe constraints:

```txt
20 Hz <= f0 <= 0.45 * fs
0.1 <= Q <= 24
all coefficients must be finite
internal state must clear on reset, preset load, and sample-rate change when required
```

For topology-preserving transform filters, use:

```txt
g = tan(π * f / fs)
R = 1 / (2Q)
h = 1 / (1 + 2Rg + g^2)
```

Clamp `f` below Nyquist before calculating `tan`.

---

### 5. Nonlinear DSP Must Control Aliasing

Any saturation, clipping, waveshaping, rectification, wavefolding, FM-like modulation, or nonlinear feedback must declare an aliasing strategy.

Allowed strategies:

- oversampling with anti-alias filters
- bandlimited nonlinear approximation
- drive limits with measured alias floor
- user-selectable quality mode
- disabled oversampling only when documented as intentional coloration

Oversampling pipeline:

```txt
input
  -> anti-imaging upsampler
  -> nonlinear processor at N * fs
  -> anti-alias downsampler
  -> latency compensation if required
  -> output
```

Never call nonlinear DSP “pristine” unless aliasing is measured or bounded.

---

### 6. Dynamics Processing Must Define Detector Math

Compressors, limiters, gates, expanders, and transient processors must define detector type and gain computer equations.

RMS detector:

```txt
p[n] = x[n]^2
e[n] = a * e[n-1] + (1 - a) * p[n]
rms[n] = sqrt(max(e[n], epsilon))
level_db = 20log10(rms + epsilon)
```

Peak detector:

```txt
level = abs(x)
if level > env:
    coeff = attack_coeff
else:
    coeff = release_coeff
env = coeff * env + (1 - coeff) * level
```

Static compression curve above threshold:

```txt
if level_db > threshold_db:
    gain_reduction_db = threshold_db + (level_db - threshold_db) / ratio - level_db
else:
    gain_reduction_db = 0
makeup_gain = 10^(makeup_db / 20)
y = x * 10^(gain_reduction_db / 20) * makeup_gain
```

Soft knee must specify knee width and interpolation curve.

---

### 7. Delay, Reverb, and Modulation Must Use Safe Interpolation

Delay reads at fractional positions must use declared interpolation.

Allowed interpolation modes:

- linear for low CPU or intentionally vintage behavior
- cubic/Lagrange for smoother delay modulation
- allpass interpolation for delay networks where phase behavior matters

Fractional read shape:

```txt
read_pos = write_pos - delay_samples
i0 = floor(read_pos)
frac = read_pos - i0
y = lerp(buffer[i0], buffer[i0 + 1], frac)
```

Modulated delay must smooth or bandlimit delay-time changes to prevent zipper noise.

Feedback networks must clamp feedback safely:

```txt
-0.999 <= feedback <= 0.999
```

Reverb matrices must document energy behavior and avoid runaway feedback.

---

### 8. Real-Time Safety Is Law

The audio processing path must not perform:

- heap allocation
- locking mutexes that can block
- file I/O
- network I/O
- logging per sample or per block
- panics
- unbounded loops
- UI calls
- dynamic dispatch in hot loops unless justified

Audio-thread-safe patterns:

```rust
// Good: preallocated buffers
scratch.resize(max_block_size, 0.0); // prepare phase only

// Good: process phase only reads and writes known buffers
for sample in channel.iter_mut() {
    *sample = processor.process_sample(*sample);
}
```

Plugin initialization, sample-rate updates, and prepare phases may allocate. The processing callback must remain deterministic and bounded.

---

### 9. Denormals, NaN, and Infinity Must Be Controlled

DSP must handle pathological values.

Required guards:

```txt
very small values must not trigger denormal CPU spikes
NaN must never propagate through the output
infinity must be clamped or silenced
filter states must sanitize after instability
```

Rust helper:

```rust
#[inline]
fn sanitize_audio(x: f32) -> f32 {
    if x.is_finite() {
        if x.abs() < 1.0e-20 { 0.0 } else { x.clamp(-32.0, 32.0) }
    } else {
        0.0
    }
}
```

Use framework denormal guards when available, but do not rely on them as the only safety layer for unstable algorithms.

---

### 10. Gain Staging Must Be Explicit

Every processor must define input gain, internal headroom, wet/dry mix behavior, and output gain.

Required formulas:

```txt
gain_linear = 10^(gain_db / 20)
power = x^2
rms = sqrt(mean(power))
peak = max(abs(x))
headroom_db = 20log10(max_abs + epsilon)
```

Wet/dry mix must specify whether it is linear, equal-power, or phase-compensated.

Linear mix:

```txt
y = dry * (1 - mix) + wet * mix
```

Equal-power mix:

```txt
dry_gain = cos(mix * π/2)
wet_gain = sin(mix * π/2)
y = dry * dry_gain + wet * wet_gain
```

For parallel compression, saturation, or latency-inducing effects, dry/wet paths must be phase-aligned.

---

### 11. UI Must Be A Parameter State Renderer

Plugin UI must not be a decorative shell. Every visible control must map to actual DSP state.

UI mapping:

```txt
parameter id -> normalized value -> display formatter -> control widget -> automation gesture -> DSP smoothed target
```

Controls must show:

- unit label
- legal range
- default value
- automation state when available
- disabled state when bypassed or unavailable
- tooltip or description for complex DSP behavior
- accessible label or equivalent semantic description where the UI framework supports it

Bad:

```rust
ui.knob("Warmth", 0.7);
```

Good:

```txt
ParameterId::DriveDb
range: -12 dB to +36 dB
default: 0 dB
taper: logarithmic or perceptual
display: "{value:.1} dB"
smoothing: 5 ms
DSP target: drive_gain = 10^(drive_db / 20)
```

---

### 12. Automation Must Be Sample-Accurate Where Possible

If the host provides parameter changes inside a block, apply them at the correct sample offset or use framework-supported sample-accurate smoothing.

Minimum acceptable behavior:

```txt
block-start parameter read -> smoothed target update -> click-safe transition
```

Preferred behavior:

```txt
sample-offset parameter events -> target update at event sample -> smoothed or ramped control signal
```

Never snap audible parameters directly to new values unless the parameter is truly discrete.

---

### 13. Bypass Must Be Artifact-Safe

Bypass must not click, explode feedback buffers, or cause phase jumps.

Required behavior:

```txt
bypass requested
  -> fade processed signal out or crossfade dry/wet
  -> preserve or clear state based on processor type
  -> report latency consistently
  -> resume with fade in when re-enabled
```

For delays and reverbs, define whether tails continue, mute instantly, or fade out.

---

### 14. State Serialization Must Be Versioned

Presets and plugin state must be stable across versions.

Required state fields:

```txt
schema_version
plugin_version
parameter_values
quality_mode
oversampling_mode
ui_state when useful
migration path for old presets
```

Never silently reinterpret old preset values without a migration rule.


---

### 15. Research Claims Require Evidence

Do not make sonic claims without a matching validation level.

Claim mapping:

```txt
"stable"          -> coefficient bounds, finite-state tests, long-run stress tests
"transparent"     -> null tests, level-matched renders, objective error thresholds
"pristine"        -> alias-floor, THD+N, noise-floor, latency, and perceptual checks
"analog"          -> circuit/model reference, saturation curve, spectra, or hardware comparison
"mastering-safe"  -> oversampling proof, gain staging proof, no hidden clipping, headroom test
"low-latency"     -> reported latency, measured round-trip or plugin latency, host verification
"CPU efficient"   -> benchmark table across sample rates, block sizes, and quality modes
```

Every claim must define:

```txt
hypothesis
input signals
test parameters
expected behavior
objective metric
failure threshold
reproducibility steps
```

Bad:

```txt
This saturator is clean and analog.
```

Good:

```txt
Claim: 4x oversampled tanh saturator reduces foldback aliases below -96 dBFS for 997 Hz, 5 kHz, and 10 kHz sine inputs at 48 kHz with drive <= +18 dB.
Protocol: render tones at drive values 0, +6, +12, +18 dB; FFT size 262144; Hann window; compare aliases above Nyquist-folded harmonic positions against non-oversampled baseline.
Failure: any alias component above -96 dBFS in mastering-safe mode.
```

---

### 16. Baseline Comparison Is Mandatory For DSP Changes

Every behavioral DSP change must compare against at least one baseline.

Required baseline options:

```txt
bypass
previous plugin version
naive implementation
known textbook implementation
reference implementation
measured hardware or SPICE simulation when applicable
```

Baseline report shape:

```txt
processor: Saturator
change: add 4x oversampling and ADAA option
baseline: non-oversampled tanh shaper
inputs: 997 Hz sine, 10 kHz sine, drum loop, vocal stem
sample rates: 44.1k, 48k, 96k
metrics: alias floor, CPU, latency, peak level, null error
result: alias floor improved from -61 dBFS to -103 dBFS at +18 dB drive, CPU +18%, latency +32 samples
```

Never replace a stable DSP path without showing what improves, what worsens, and what risk is reduced.

---

### 17. Ablation Testing Must Prove Each Safety Feature Earns Its Cost

If a system includes smoothing, oversampling, denormal guards, interpolation, lookahead, anti-aliasing, or quality modes, test what happens when each is removed.

Ablation matrix:

```txt
feature_on/off -> measured effect -> audible risk -> CPU/latency cost -> keep/remove decision
```

Examples:

```txt
no smoothing      -> zipper sidebands at -48 dBFS during automation -> keep smoothing
no oversampling   -> aliases at -57 dBFS under +24 dB drive -> keep 4x in high quality mode
no denormal guard -> CPU spike after 40 seconds of feedback decay -> keep guard
linear delay interp -> modulation sidebands stronger than cubic by 14 dB -> use cubic in clean mode
```

A feature that cannot prove its value must be simplified, removed, or marked experimental.

---

### 18. Objective Measurement Protocol Must Be Declared

Objective tests must define signal generation, rendering, analysis, and thresholds.

Required measurement fields:

```txt
test_id
sample_rate
block_size
input_signal
input_level_dbfs
plugin_parameters
analysis_window
fft_size when spectral
latency_compensation
metric_formula
pass_threshold
artifact_output_path
```

Core metrics:

```txt
peak_dbfs = 20log10(max(abs(x)) + epsilon)
rms_dbfs = 20log10(sqrt(mean(x^2)) + epsilon)
null_error = processed_a - processed_b
max_abs_error = max(abs(null_error))
mean_squared_error = mean(null_error^2)
snr_db = 10log10(signal_power / noise_power)
thd_n_db = 10log10((total_power - fundamental_power) / fundamental_power)
alias_floor_dbfs = max_nonharmonic_foldback_component_dbfs
latency_samples = detected_output_impulse_index - input_impulse_index
cpu_ratio = process_time_seconds / audio_duration_seconds
```

Minimum objective test set:

```txt
Impulse response
Log sine sweep
Stepped sine tones
Silence stress
White/pink noise
Automation slam
Preset-load transition
Bypass transition
Long feedback decay
Host block-size sweep
```

Use multiple block sizes because host behavior changes how bugs appear:

```txt
1, 16, 32, 64, 128, 256, 512, 1024, 2048 samples
```

---

### 19. Perceptual Claims Require Listening Protocols

If a generated answer claims the DSP sounds better, more transparent, more analog, more musical, smoother, wider, warmer, or more natural, add a listening protocol.

Allowed protocols:

```txt
ABX: can listeners distinguish A from B?
MUSHRA: can listeners rank quality against hidden reference and anchors?
Preference: which version do listeners prefer under blind level-matched conditions?
Expert review: structured notes from experienced engineers using fixed material
```

Required listening-test controls:

```txt
level matched within <= 0.1 dB when possible
blind or hidden labels
randomized order
same playback chain
same source material
short enough trials to reduce listener fatigue
notes separated from implementation details
```

Minimum source-material spread for music plugins:

```txt
solo vocal
drum bus
bass instrument
clean guitar or keys
full mix
sparse transient material
sustained harmonic material
```

Never use louder output as proof of better quality. Loudness must be matched before preference claims.

---

### 20. Reproducibility Bundle Is Required For Release-Grade DSP

A release-grade DSP change must include enough artifacts for another engineer or agent to reproduce the result.

Bundle contents:

```txt
commit_hash
Rust version
plugin framework version
OS and architecture
host DAWs tested
sample rates tested
block sizes tested
input WAVs or generation scripts
parameter preset files
rendered output WAVs
measurement scripts
FFT plots or numeric spectral reports
CPU benchmark output
latency report
known deviations
```

Artifact naming:

```txt
<plugin>_<processor>_<test>_<sampleRate>_<qualityMode>_<commit>.wav
<plugin>_<processor>_<metric>_<sampleRate>_<qualityMode>_<commit>.json
```

No release should depend on memory, taste, or “it sounded fine yesterday.”

---

### 21. Release Gates Must Be Explicit

A DSP/plugin change cannot be considered complete until it passes the appropriate gate.

Gate levels:

```txt
Prototype Gate:
- builds locally
- processes audio without panic
- no NaN/inf propagation
- basic UI controls map to parameters

Engineering Gate:
- deterministic golden tests pass
- real-time safety checks pass
- coefficient and stability tests pass
- sample-rate and block-size sweeps pass
- automation and bypass tests pass

Release Gate:
- objective measurement report complete
- baseline comparison complete
- ablation report complete for added safety/quality features
- host smoke tests complete
- preset migration verified
- CPU/latency documented

Research/Publication Gate:
- methodology documented
- reproducibility bundle complete
- perceptual protocol run when claims require it
- statistical or structured analysis included
- limitations documented
```

When asked to implement a feature, state which gate the answer targets.

---

## Required Output Format

When producing Rust/VST3 DSP work, respond using this structure:

## Summary

What is being built or changed.

## Classification

Classify the change:

```txt
cosmetic | structural | behavioral | architectural | DSP-math | UI-integration | performance | safety
```

## Assumptions

Missing plugin format, framework, sample rate, UI, quality, or math assumptions.

## DSP Data Contract

The processor state, parameter schema, sample-rate assumptions, channel layout, and buffer expectations.

## Mathematical Model

Exact equations used for filters, envelopes, saturation, delay, modulation, metering, and gain staging.

## Parameter Model

Parameter IDs, display ranges, normalized ranges, tapers, units, default values, smoothing times, automation behavior, and DSP targets.

## Component Architecture

Rust modules, DSP structs, parameter structs, UI components, shared state, and host integration boundaries.

## Code

Changed or generated Rust code. Show changed sections only when modifying an existing project.

## UI Behavior

How controls, meters, bypass, quality modes, tooltips, automation gestures, and parameter displays work.

## Real-Time Safety Notes

Allocations, locks, denormals, panic safety, NaN handling, thread communication, and buffer constraints.

## Audio Quality Notes

Aliasing control, coefficient stability, gain staging, phase behavior, latency, oversampling, and expected sonic tradeoffs.

## Experimental Protocol

Hypothesis, input material, metrics, thresholds, baselines, ablations, and reproducibility requirements.

## Baseline and Ablation Results

What was compared, what changed numerically, what worsened, what improved, and why the new design earns its complexity.

## Perceptual Evaluation

ABX, MUSHRA, preference, or expert-review protocol when sonic quality claims require listener evidence.

## Reproducibility Bundle

Commit hash, toolchain, host list, sample rates, input files/scripts, rendered outputs, plots, presets, and measurement artifacts.

## Release Gate

Prototype, Engineering, Release, or Research/Publication gate and its pass/fail status.

## QA Checklist

Exact tests and manual checks.

## Risks

What could break or need follow-up.

---

## Rust Module Architecture

Preferred project shape:

```txt
src/
  lib.rs
  params.rs
  dsp/
    mod.rs
    smoothing.rs
    filters.rs
    saturation.rs
    dynamics.rs
    delay.rs
    meter.rs
    math.rs
  ui/
    mod.rs
    widgets.rs
    meters.rs
    layout.rs
  state.rs
  tests/
    golden.rs
    stability.rs
    automation.rs
    aliasing.rs
    ablation.rs
    baseline.rs
    latency.rs
    host_smoke.rs
  benches/
    process_block.rs
    oversampling_modes.rs
  measurements/
    render_fixtures.rs
    analyze_fft.rs
    report_metrics.rs
```

Preferred DSP object shape:

```rust
pub struct Processor {
    sample_rate: f32,
    params: ProcessorParams,
    smoothers: ProcessorSmoothers,
    channels: Vec<ChannelState>,
    meter: MeterState,
}

impl Processor {
    pub fn prepare(&mut self, sample_rate: f32, max_block_size: usize, channels: usize) {
        self.sample_rate = sample_rate;
        self.resize_channels(channels);
        self.update_coefficients();
        self.reset_meters();
    }

    pub fn process_block(&mut self, buffer: &mut [&mut [f32]]) {
        for sample_index in 0..buffer[0].len() {
            self.process_sample_frame(buffer, sample_index);
        }
    }
}
```

Avoid components that secretly depend on global mutable state.

---

## Parameter Generation Rules

Every parameter must include:

```txt
id
name
unit
minimum display value
maximum display value
default display value
normalized mapping
skew/taper
smoothing time
is_discrete
is_automatable
DSP variable target
formatter
parser if text input exists
```

Example:

```txt
id: drive_db
name: Drive
unit: dB
range: -12.0 to 36.0
default: 0.0
taper: linear in dB
smoothing: 5 ms
DSP target: drive_gain = 10^(drive_db / 20)
automation: smoothed sample-safe
```

---

## Mathematical Reference Library

Use these formulas unless a better project-specific model is declared.

### Decibels

```txt
gain = 10^(dB / 20)
dB = 20log10(max(abs(x), epsilon))
power_dB = 10log10(max(power, epsilon))
```

### One-Pole Lowpass

```txt
a = exp(-2πfc/fs)
y[n] = (1 - a)x[n] + ay[n-1]
```

### Parameter Smoothing

```txt
a = exp(-1/(tau*fs))
y[n] = y[n-1] + (1 - a)(target - y[n-1])
```

### DC Blocker

```txt
R = exp(-2πfc/fs)
y[n] = x[n] - x[n-1] + R*y[n-1]
```

### RMS Envelope

```txt
e[n] = a*e[n-1] + (1-a)*x[n]^2
rms[n] = sqrt(max(e[n], epsilon))
```

### Equal-Power Crossfade

```txt
dry = cos(mix * π/2)
wet = sin(mix * π/2)
y = dry*x + wet*fx
```

### Normalized Soft Clip

```txt
y = tanh(kx) / tanh(k)
```

### Hard Clip

```txt
y = clamp(x, -threshold, threshold)
```

Hard clipping must not be used in mastering-safe modes without oversampling or explicit aliasing documentation.

### Slew Limiter

```txt
max_delta = slew_rate_per_second / fs
y[n] = y[n-1] + clamp(x[n] - y[n-1], -max_delta, max_delta)
```

### Fractional Delay Linear Interpolation

```txt
i = floor(read_index)
frac = read_index - i
y = buffer[i] * (1 - frac) + buffer[i + 1] * frac
```


---

## Research-Hardened Measurement Library

Use these formulas and protocols when evaluating DSP claims.

### Deterministic Error

```txt
error[n] = candidate[n] - reference[n]
max_abs_error = max(abs(error[n]))
mse = mean(error[n]^2)
rmse = sqrt(mse)
```

### Signal-to-Noise Ratio

```txt
signal_power = mean(reference[n]^2)
noise_power = mean((candidate[n] - reference[n])^2)
snr_db = 10log10((signal_power + epsilon) / (noise_power + epsilon))
```

### THD+N Estimate

```txt
fundamental_bin = bin nearest test frequency
fundamental_power = sum(power around fundamental_bin)
total_power = sum(power across analysis band)
thd_n = (total_power - fundamental_power) / fundamental_power
thd_n_db = 10log10(max(thd_n, epsilon))
```

State the FFT size, sample rate, window, bin grouping, and whether DC is excluded.

### Aliasing Report

```txt
harmonic_frequency_h = input_frequency * harmonic_index
folded_frequency = abs(((harmonic_frequency_h + fs/2) mod fs) - fs/2)
alias_component = spectral peak at folded non-harmonic location
alias_floor_dbfs = max(alias_component_dbfs)
```

Report aliasing at multiple input frequencies because low-frequency tests can hide high-frequency foldback.

Required sine inputs:

```txt
997 Hz
5 kHz
10 kHz
15 kHz when sample rate allows meaningful analysis
```

Required drive points for nonlinear DSP:

```txt
minimum drive
default drive
+6 dB
+12 dB
maximum intended drive
```

### Latency Detection

```txt
input impulse at sample i
output impulse peak at sample j
latency_samples = j - i
latency_ms = latency_samples / fs * 1000
```

For oversampling, FIR filters, lookahead limiters, convolution, or linear-phase processing, report host-compensated plugin latency.

### CPU Safety

```txt
cpu_ratio = processing_time / rendered_audio_duration
realtime_safe = cpu_ratio < budget
```

Benchmark matrix:

```txt
sample rates: 44.1k, 48k, 96k, 192k
block sizes: 32, 64, 128, 512, 1024
quality modes: eco, normal, high, pristine
channels: mono, stereo, declared maximum
```

### Denormal Stress

```txt
input: silence or exponentially decaying feedback tail
run duration: >= 60 seconds simulated audio
pass: CPU does not spike, output remains finite, states converge or remain bounded
```

---

## UI Rules

Prefer:

- grouped modules that match DSP stages
- truthful meters with defined ballistics
- stable layout that does not resize unpredictably during playback
- parameter labels with units
- keyboard input for exact values when practical
- accessible contrast and visible focus
- reduced-motion behavior for animated meters or panels
- no decorative animation that implies false signal behavior

Avoid:

- fake meters
- unsynchronized knob values
- magic colors disconnected from state
- unlabeled controls
- UI-only bypass that does not affect DSP
- values shown in percent when DSP uses dB, Hz, ms, ratio, samples, or semitones
- animated analyzers that are not driven by measured audio

---

## Metering Rules

Meters must define ballistics.

Peak hold example:

```txt
instant_peak = max(abs(samples))
held_peak = max(instant_peak, held_peak * release_coeff)
```

RMS meter example:

```txt
rms = sqrt(mean(x^2))
rms_db = 20log10(rms + epsilon)
```

Gain reduction meter:

```txt
gr_db = computed_gain_reduction_db
meter_value = smooth(gr_db, attack_ms, release_ms)
```

UI meters must not read directly from the audio thread with unsafe shared mutation. Use lock-free atomics, ring buffers, framework-safe parameter channels, or decimated meter state.

---

## QA Checklist

Before finalizing any Rust/VST3 DSP plugin, verify:

- [ ] Same input and same parameters produce deterministic output.
- [ ] No heap allocation occurs inside the process callback.
- [ ] No blocking locks occur inside the process callback.
- [ ] No file, network, or UI calls occur inside the audio thread.
- [ ] Sample-rate changes retune all coefficients.
- [ ] Audible parameters are smoothed or sample-accurate.
- [ ] Bypass does not click.
- [ ] Preset load does not click or corrupt state.
- [ ] All coefficients are finite.
- [ ] Filter states remain stable under legal parameter ranges.
- [ ] NaN and infinity inputs do not propagate to output.
- [ ] Silence input remains silence unless intentional noise generation is documented.
- [ ] Denormals do not cause CPU spikes.
- [ ] Nonlinear processors document aliasing behavior.
- [ ] Oversampling filters are tested for latency and phase behavior.
- [ ] Dry/wet paths are phase-aligned when latency exists.
- [ ] Delay feedback cannot exceed safe bounds.
- [ ] Meter values match measured signal behavior.
- [ ] UI controls map to real parameter IDs.
- [ ] UI values display correct units.
- [ ] Automation gestures are correctly reported to host.
- [ ] State serialization is versioned.
- [ ] Old presets migrate safely.
- [ ] Plugin opens in at least two hosts if available.
- [ ] Plugin processes mono and stereo correctly.
- [ ] CPU usage is bounded at supported oversampling modes.
- [ ] Golden audio tests pass within defined tolerance.
- [ ] Every sonic claim has a declared validation level.
- [ ] Baseline comparison exists for behavioral DSP changes.
- [ ] Ablation tests justify smoothing, oversampling, denormal guards, interpolation, lookahead, and anti-alias features.
- [ ] Objective measurement protocol states FFT size, window, sample rate, block size, inputs, parameters, and thresholds.
- [ ] Aliasing report exists for nonlinear DSP.
- [ ] THD+N, SNR, null-error, latency, and CPU metrics are reported where relevant.
- [ ] Perceptual listening protocol exists for claims like transparent, analog, musical, warm, pristine, or better.
- [ ] Listening comparisons are level-matched and blind/randomized when possible.
- [ ] Reproducibility bundle includes toolchain, commit, fixtures, renders, plots/reports, and presets.
- [ ] Release gate is named and pass/fail status is explicit.

---

## Regression Test Suggestions

### Impulse Test

Feed a single-sample impulse and inspect:

```txt
filter response
latency
ringing
stability
channel independence
```

### Sine Sweep Test

Feed logarithmic sine sweeps at common sample rates:

```txt
44.1k
48k
96k
192k
```

Validate frequency response, aliasing, and modulation artifacts.

### Silence Test

Feed silence for long blocks and verify:

```txt
output remains finite
CPU does not spike
meters decay correctly
feedback networks remain bounded
```

### Automation Slam Test

Move all audible parameters rapidly while processing audio and verify:

```txt
no clicks beyond expected transient threshold
no NaN
no panic
no zipper noise above accepted tolerance
```

### Golden Render Test

Render known input through fixed parameters and compare against a stored golden file using tolerance:

```txt
absolute_error <= 1.0e-5 for transparent DSP
absolute_error <= 1.0e-4 for nonlinear or oversampled DSP, unless justified
```


### Aliasing Ladder Test

For nonlinear DSP, render stepped sine tones and inspect foldback:

```txt
frequencies: 997 Hz, 5 kHz, 10 kHz, 15 kHz
levels: -18, -12, -6, -1 dBFS
sample rates: 44.1k, 48k, 96k
drive: default, medium, maximum
quality: oversampling off/on for comparison
```

Pass only if the selected quality mode meets its declared alias-floor target.

### Baseline Regression Test

Compare the changed processor against a baseline:

```txt
bypass vs processed
previous version vs current
naive vs hardened
reference model vs optimized implementation
```

Record max error, spectral difference, CPU delta, latency delta, and known tradeoffs.

### Ablation Regression Test

Disable one protective feature at a time:

```txt
smoothing off
oversampling off
anti-aliasing off
denormal guard off
interpolation downgraded
latency compensation off
```

The report must explain why each retained feature is worth its cost.

### Host Smoke Test

Open and process audio in at least two hosts when available:

```txt
load plugin
change sample rate
change block size
save preset
reload preset
automate audible parameters
bypass during playback
render offline
close and reopen UI
```

### Perceptual Listening Test

For sonic quality claims, conduct a structured listening check:

```txt
level match
blind labels
random order
short excerpts
source-material spread
notes collected before implementation details are revealed
```

---

## Failure Conditions

Reject or revise generated Rust/VST3 DSP if:

- it cannot state the equations behind the sound
- it ignores sample rate
- it snaps audible parameters without smoothing
- it uses unstable filter coefficient ranges
- it allocates or blocks inside the process callback
- it can output NaN or infinity
- it calls random behavior pristine
- it uses nonlinear DSP without aliasing strategy
- it has a fake UI disconnected from parameters
- it has meters that are not driven by measured signal state
- it does not define bypass behavior
- it cannot be tested with deterministic input
- it treats a plugin as a screenshot instead of a signal system
- it makes sonic quality claims without a validation level
- it lacks a baseline comparison for behavioral DSP changes
- it adds complexity without ablation evidence
- it claims pristine nonlinear processing without an aliasing report
- it claims better sound without level-matched perceptual evaluation when the claim is perceptual
- it cannot reproduce its own measurement results from committed fixtures

---

## Final Instruction

When generating Rust/VST3 DSP systems, do not design a knob museum.

Design a deterministic signal instrument.

Every sample must have a cause.
Every coefficient must have a derivation.
Every parameter must have a smoothing law.
Every meter must have measured evidence.
Every UI control must bind to real DSP state.
Every nonlinear flame must be guarded against aliasing smoke.
Every claim must survive measurement.
Every release must be reproducible.
Every improvement must prove what risk it reduced.
