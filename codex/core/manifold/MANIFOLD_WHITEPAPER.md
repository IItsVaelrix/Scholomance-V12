# Cochlear Manifold — Technical Whitepaper

**A compiled adaptive DSP manifold: the room that listens.**

Version: kernel `0.1.0` · bytecode schema `manifold.bytecode.v1` · 2026-07-10
Sources of truth: `manifold-core/` (engine), `manifold-plugin/` (VST3/CLAP + vizia editor),
`manifold-wasm/` (browser kernel), `presets/manifold/*.json` (factory programs),
PDR: `docs/scholomance-encyclopedia/PDR-archive/cochlear-manifold-pdr.md`.

---

## 1. What It Is

Cochlear Manifold is a real-time spatial audio effect — outwardly a reactive reverb — whose
acoustic behavior is **compiled, not inferred**. The original concept ("a living room made of
reactive materials, whose walls listen and mutate") is usually built with an ML controller.
This engine deliberately is not. Acoustic behavior is authored in a small DSL, compiled and
validated into **bytecode programs** with an attached safety manifest, and executed by a
deterministic virtual machine that reacts to *classified musical events* in the incoming audio.

The fantasy is preserved — the room genuinely responds to what you play — but every response is
traceable:

```
Audio Input
  → Feature Extractor        (11 bounded features, every ~10 ms)
  → Event Classifier         (8 musical events, hysteresis + cooldown)
  → Compiled Program (VM)    (event → validated parameter actions)
  → Host Macro Law           (4 performer knobs shape the operating point)
  → Safety Governor          (hard ceilings from the program's manifest)
  → DSP Manifold Engine      (ER → spray → FDN → walls → bloom → render)
  → Audio Output
```

Same input + same program + same knobs ⇒ same output. No model, no training data, no black box.

---

## 2. The Program: Bytecode + Safety Manifest

A **program** (`BytecodeProgram`, `bytecode.rs`) is JSON with schema version, kernel semver, an
FNV content hash, a flat list of instructions, and a **safety manifest**:

```json
{
  "schemaVersion": "manifold.bytecode.v1",
  "kernelSemver": "0.1.x",
  "instructions": [
    { "op": "ON_EVENT",        "event": "sub_transient", "threshold": 0.6 },
    { "op": "RAMP_PARAM",      "target": "floor.decay.low", "value": 0.8, "durationMs": 120 },
    { "op": "TRIGGER_SPRAY",   "division": "1/32", "density": 0.7, "durationMs": 180 },
    { "op": "BLOOM_HARMONIC",  "amount": 0.45, "durationMs": 600 },
    { "op": "CLAMP_FEEDBACK",  "node": "floor.feedback", "max": 0.58 }
  ],
  "safety": {
    "maxFeedback": 0.58, "maxFilterQ": 12, "maxSprayDensity": 0.7,
    "maxDelayMs": 750, "minRampMs": 20, "cpuBudgetClass": "medium",
    "requiresLimiter": true, "hasUnsafeCycles": false
  }
}
```

Loading is gated twice (`validate_header` + `compile_blocks` in `vm.rs`): schema and ABI-major
must match, `hasUnsafeCycles` is rejected outright, unknown opcodes and malformed fields are
compile errors — a program that loads is a program that has already been proven shaped correctly.
Targets are written zone-style (`floor.decay.low`, `ceiling.absorption.high`); in V1 the zone
prefix is stripped and zones collapse onto eight global parameters (PDR §16):

`Feedback · DecayLow · AbsorptionLow · AbsorptionHigh · Scatter · Diffusion · Brightness · Width`

Five factory programs ship as fixtures and presets: **void-glass**, **ice-circuit**, **ash-lung**,
**cathedral-of-teeth**, **substrate-maw** — each a different personality of rules and manifest
ceilings, each with characteristic macro values.

---

## 3. Perception: Features and Events

### 3.1 Feature Extractor (`features.rs`)

Every control tick (~10 ms of samples, block-size independent), the input block is reduced to
eleven features, all clamped to `[0,1]` and NaN-sanitized. The estimators are deliberately cheap —
one shared one-pole and first differences, no FFT:

| Feature | Estimator |
|---|---|
| `rms` | `sqrt(Σ mono² / n)` |
| `peak` | `max |mono|` |
| `crest_factor` | `peak − rms` |
| `low_energy` / `high_energy` | one-pole LP at `lp += 0.05(x − lp)` splits low/high, then block RMS ×2 |
| `spectral_centroid` | mean |high| ×4 (brightness proxy) |
| `spectral_flux` | mean |x[n] − x[n−1]| ×4 |
| `transient_sharpness` | `max(rms − rms_prev, 0)·4 + 0.5·peak` |
| `harmonicity` | `1 − 0.5·flux` (steady tones score high) |
| `mid_energy` | ≡ rms |
| `input_width` | mean |L − R| |

### 3.2 Event Classifier (`classifier.rs`)

Eight V1 events are scored as fixed averages of feature subsets, e.g.:

```
sub_transient        = avg(low_energy, transient_sharpness, crest_factor)      on ≥ 0.60
full_spectrum_impact = avg(rms, low, high, transient)                          on ≥ 0.70
high_crunch          = avg(high, flux, centroid)                               on ≥ 0.65
harmonic_sustain     = avg(harmonicity, rms)                                   on ≥ 0.55
wide_noise_burst     = avg(width, high, flux)                                  on ≥ 0.62
vocal_presence       = avg(harmonicity, mid, centroid)                         on ≥ 0.62
silence_gap          = avg(1−rms, 1−peak, 1−flux)                              on ≥ 0.78
dense_spectral_cloud = avg(rms, flux, mid, high)                               on ≥ 0.66
```

Two stabilizers prevent flicker: **hysteresis** (the off-threshold sits 0.08 below the
on-threshold) and a **3-tick cooldown** per event. An event fires exactly once per onset, carrying
its rounded confidence.

### 3.3 Dispatch (VM)

Fired events are matched against the program's `ON_EVENT` blocks. The confidence is first scaled
by the **Reactivity macro** (§5) and must beat the block's threshold; then the block's actions
execute: `RampParam` / `ScaleParam` (into the ParamStore), `ClampFeedback` (ceiling),
`TriggerSpray` (tempo-synced granular burst), `BloomHarmonic` (resonator ring). Every ramp is
floored at the manifest's `minRampMs` — a program physically cannot zipper its own parameters.

### 3.4 ParamStore (`params.rs`)

Each of the eight parameters is a **linear sample-count ramp** (`current`, `target`, `step`,
`left`), ticked per block. `snapshot()` returns the current values with `feedback` pre-capped by
the program ceiling. This is the "state of matter" of the room at any instant, and the event
system is the only writer — host knobs never touch it directly (see §5 for why).

---

## 4. The DSP Manifold Engine (`dsp/`)

One mono processing spine, stereo in/out, per sample (`graph.rs::process_block`):

```
in L/R ─ sanitize ─ mono ─┬─ InputSplitter (one-pole, low + high ≡ x)
                          │
     ┌── EarlyReflection(mono, LFO offset)      4 taps @ 7/13/23/41 ms
     ├── MicroDelaySpray(mono)                  granular burst (when triggered)
     │
     diffuse = er·(0.6 + 0.4·scatter) + spray
     excitation = freeze ? 0 : diffuse + low·0.3
     │
     rev = FDN(excitation)                      4×4 Hadamard network
     │        (freeze holds rev at frozen_tail)
     shaped = WallFilterBank(rev)               brightness tilt / high absorption
     bloom  = ResonatorBloom(shaped)            220+440 Hz bandpass ring (when triggered)
     wet    = tanh(shaped + bloom)              governor soft clip
     │
     (L,R) = OutputRenderer(dryL, dryR, wet·w, width)
     out   = DcBlocker(tanh(·))                 per channel
```

### 4.1 Early reflections + motion
Four taps on a 60 ms line with gains `0.7/0.55/0.4/0.3`, read **fractionally** (linear
interpolation) at positions offset by a 0.7 Hz sine LFO whose depth is `1 + 3·diffusion` samples —
the tail's characteristic "breathing" movement, bounded and click-free by construction.

### 4.2 Micro-delay spray
A triggered granular scatter: tempo-synced grain interval (`division.beats() · 60/bpm · fs`
samples; divisions 1/8…1/64), a PCG32-seeded jittered tap (seeded by the program's content hash —
**deterministic per program**), and a linear gate envelope over the action's duration. Silent
unless a `TRIGGER_SPRAY` fires.

### 4.3 The FDN core (`fdn.rs`)
A four-line feedback delay network with mutually-prime lengths **29.7 / 37.1 / 41.3 / 43.7 ms**,
mixed by the normalized 4×4 Hadamard matrix (orthogonal ⇒ energy-preserving rotation, the
smooth-tail workhorse):

```
m = ½ · H₄ · s          H₄ rows: (+ + + +)(+ − + −)(+ + − −)(+ − − +)

fb   = clamp(0.4 + 0.55·feedback, ≤ manifest maxFeedback)     (governor)
damp = clamp((1 − decay_low)·0.5 + absorption_low·0.4, 0, 0.95)

state_k = (1 − damp)·m_k + damp·state_k                        (one-pole damping)
line_k ← flush_denormal(0.5·x + fb·state_k)
y = ½ Σ s_k
```

Stability is structural: the Hadamard rotation cannot add energy, `fb` is hard-clamped below 0.95
by the governor no matter what any program or macro asks, and the damping pole is capped at 0.95.
Torture tests drive it at maximum feedback for two full seconds and assert boundedness.

### 4.4 Walls, bloom, and the output law
The **WallFilterBank** collapses per-zone tonal shaping into a brightness-controlled one-pole tilt
(`cutoff = 0.1 + 0.8·brightness`) whose high band is attenuated by `1 − absorption_high`. The
**ResonatorBloom** is two RBJ bandpass biquads (220 Hz and 440 Hz, Q 12, a₀-normalized) summed
under a decay envelope — a triggered harmonic "ring" of the room. The wet signal is then
`tanh`-soft-clipped (always on; the manifest's `requiresLimiter` is satisfied unconditionally) and
rendered:

```
L = dryL + wet·w·(1 + 0.5·width)
R = dryR + wet·w·(1 − 0.5·width)
```

— an **additive wet blend** (`w = 0` silences the wet path entirely; `w = 0.7` is the engine's
historical voicing), decorrelated by the width split, then passed — dry component included —
through a final `tanh` soft clip and per-channel DC blocker (`y = x − x₁ + 0.995·y₁`).

### 4.6 The output stage is a harmonic exciter (by design, measured)

Because the final `tanh` limiter sits on the **summed** output, everything the plugin passes —
including the dry signal at `w = 0` — receives gentle odd-order saturation. For a sine of
amplitude `a`, `tanh(x) ≈ x − x³/3` puts the third harmonic at roughly `a³/12` relative:

| peak level | H3 relative | audibility |
|---|---|---|
| 0.4 | −37.8 dB | subliminal glue |
| 0.6 | −31.2 dB | gentle warmth |
| 0.8 | −26.7 dB | clear excitement (H5 at −51.7 dB) |
| 0.9 | −25.0 dB | forward presence |

Purely odd-symmetric (even harmonics vanish), level-dependent, zero attack/release artifacts —
i.e., a program-dependent harmonic exciter fused with the limiter. On dense material the same
odd nonlinearity produces third-order intermodulation (2f₁±f₂, 2f₂±f₁) near `a²b/4` — ≈ −27 dB
relative for a 0.4+0.4 two-tone — while second-order sum/difference products vanish by symmetry,
which is why it stays "gorgeous" rather than "crunchy" on mixes at sane levels.

The character is pinned by five Goertzel-based tests in `core_tests`:
`output_stage_adds_bounded_odd_harmonics` (H3/H1 inside 0.01–0.12 at 0.8 peak),
`even_harmonics_stay_20db_below_h3` (H2/H4 ≥ 20 dB under H3),
`h3_level_sweep_matches_pure_tanh_reference` (0.05→0.95 peak sweep: monotonic and within 20% of a
pure-tanh reference computed on the same signal — a self-deriving golden snapshot),
`two_tone_intermodulation_is_controlled_and_odd_only` (440+997 Hz: every IMD3 product ≤ −20 dB,
even-order IMD absent), and `wet_zero_null_residue_is_the_tanh_color` (bypass-null residue is
nonzero and equals the analytic `tanh(x) − x` energy; output tracks `tanh(input)` within the DC
blocker's ~2° phase shear). Combined with the event-triggered ResonatorBloom (220/440 Hz rings on
sustained harmonic material) and the LFO-modulated early reflections, this is why the plugin
audibly "excites" an instrumental even with all knobs untouched. Aliasing from the un-oversampled
`tanh` is accepted as intentional coloration (H5 already at −52 dB at typical levels; see §6).

### 4.5 Freeze
`ctx.freeze` zeroes the FDN excitation and holds the network output at its last value
(`frozen_tail`) — the room stops absorbing new sound and sustains its current state until
released.

---

## 5. The Host Macro Law

The four performer-facing knobs (WET/DRY, SIZE, REACTIVITY, STABILITY) do **not** write into the
ParamStore — that would fight the event system's ramps. Instead they define the **operating
point** around which the compiled program modulates. Targets set via `set_macros()` are chased by
a block-rate one-pole (`a = e^(−n/(τ·fs))`, τ = 20 ms — automation-slam safe), then applied:

```
m_size      = 0.5 + size                                (0.5…1.5, neutral 1.0)
feedback'   = min(feedback · m_size, ceiling_eff)
decay_low'  = clamp(decay_low · m_size)
absorption' = clamp(absorption · (1.5 − size))          big rooms absorb less
ceiling_eff = clamp(0.15 + 1.7·stability)               neutral: uncapped at 0.5
scatter'    = clamp(scatter · (1.4 − 0.8·stability))
conf_eff    = confidence · (0.4 + 1.2·reactivity)       classifier → dispatch gate
wet         = w                                          replaces the old hardwired 0.7
```

Two properties are load-bearing:

- **Neutral invariance** (test-enforced): at `size = reactivity = stability = 0.5, wet = 0.7` the
  law is the identity — the engine is bit-identical to its pre-macro self, so presets and
  sessions authored before the law sound unchanged.
- **The stability floor reaches below the governor.** The FDN maps parameter feedback as
  `0.4 + 0.55·fb` before the manifest clamp, so a program riding its own `maxFeedback` ceiling is
  untouched by any cap above `fb ≈ 0.33`. Stability's low end (0.15) deliberately dips under that
  range — it is the one knob that can *tighten* a program beyond what its author allowed, never
  loosen it.

Reactivity at 0 makes the room nearly deaf to events; at 1 it fires on whispers. Size stretches
and darkens the tail. Wet at 0 is bone dry.

---

## 6. Safety and Real-Time Discipline

- **No allocation, locks, I/O, or panics in `process()`** — with one documented exception: a
  user-initiated preset hot-swap clones the pre-parsed program and re-prepares the DSP graph
  synchronously (a deliberate click-time trade, commented at the call site).
- **Denormals** are flushed in the FDN feedback (`|x| < 1e-20 → 0`); **NaN/∞** are sanitized at
  input, inside features, and by a `finite_guard!` over every rendered block.
- **Panic** is a click-free escape hatch, not a volume dip: a per-sample gain envelope
  (`τ_out = 3 ms`, `τ_in = 15 ms`) fades the output while the first panic block still renders from
  the energized graph — then the network is reset at that block's end, so even a single-block tap
  kills runaway feedback. Fully-faded panic short-circuits to zero-cost silence.
- **The governor is the last word.** Program manifests set the ceilings; the engine clamps at the
  point of use. A hostile program cannot exceed `fb = 0.95` even if its manifest asks.
- **Aliasing stance:** the only nonlinearity is the `tanh` limiter, run at base rate without
  oversampling — declared as intentional coloration of the wet path, not "pristine" processing.
- **Determinism:** the spray RNG is seeded by program content hash; no wall-clock time or
  randomness enters the signal path. (The plugin's CPU meter reads a clock, but is meter-only and
  feeds nothing back into audio.)

---

## 7. Host Integrations

### 7.1 Native plugin (`manifold-plugin`, VST3 + CLAP via nih-plug)

Six host parameters (Wet/Dry, Manifold Size, Reactivity, Stability — linear 0..1 — plus Freeze
and Panic booleans), fed to the engine per block. `initialize()` pre-parses all five factory
bytecodes off the audio thread; a preset switch is a lock-free single-slot mailbox
(`AtomicI32`, `swap(−1, AcqRel)`) consumed once at the top of `process()`. Per block the plugin
also publishes a **visualization snapshot** (all `Relaxed` atomics, alloc-free): channel peaks,
true RMS, a three-band envelope split (one-pole crossovers at 600 Hz / 4 kHz, block-rate
smoothed), the governor's clip flag, and a *measured* CPU verdict (engine time vs. 0.7× the block
budget).

### 7.2 Editor (vizia, `gui` feature)

The GUI is a state renderer under two authored laws (`professional-ui-architect-skill`,
`rust-vst3-dsp-functionality-ui-skill`): every visible quantity binds to a real parameter or a
measured signal, and every color derives from the GrimDesign world-law table (`tokens.rs`,
test-locked against the stylesheet). The hero **ManifoldMap** is a one-point-perspective room
drawn every frame from the snapshot: floor glow = low band, back wall = mids, ceiling = highs,
side walls = stereo peaks, core orb radius = RMS × Reactivity, room depth = Size, overall light =
Wet, indigo veil = Freeze, red frame flash = clip. Meters and status LEDs read the same atomics at
draw time — there is no polling thread and no fake ballistics. Panic in the UI is a momentary
hold (balanced begin/end automation gestures); presets are chips that retune macros *and* hot-swap
the bytecode.

### 7.3 Browser (`manifold-wasm`)

The same core compiled to WASM behind an AudioWorklet for the Manifold page (prepare /
load_program / process / last_events / last_clipped). **Known gap:** the wasm wrapper does not yet
expose `set_macros`, so the browser page's macro knobs are currently display-only — the same
disconnect the plugin had before the macro law landed. Scheduled follow-up.

---

## 8. Verification

- **manifold-core:** 63 unit tests + torture/integration suites — filter boundedness at maximum
  feedback, NaN/DC-bomb torture, silence safety, classifier hysteresis/cooldown, macro-law
  neutrality/monotonicity (size extends the measured late tail; stability tightens it; wet = 0
  leaves none), click-free panic (bounded inter-sample steps), smoothing-not-snapping, the
  five-test exciter characterization (§4.6), and the research-hardening battery below.
  Methodological note baked into the harness: tail measurements must fade their drive signal out
  and skip ~40 blocks, or the ER drain and DC-blocker ring-down (R = 0.995) mask feedback
  differences entirely.
- **manifold-plugin:** 26 tests (tokens/theme drift guards, presets, meter math, band split,
  UI reducers, preset-index protocol) + `clap-validator` 16/16.
- **Render verification** is display-gated by design (headless renders lie); the manual parity
  checklist lives at `tests/qa/manifold/plugin-editor-render.md`.

### 8.1 Declared measurement battery (skill laws 15–18)

| Protocol | Test | Measured result |
|---|---|---|
| Aliasing report (997 Hz-class ladder at max intended level) | `aliasing_report_folded_h3_is_the_documented_color` | folded H3 of 10 kHz (→18 kHz) and 15 kHz (→3 kHz) inputs sits in the −38…−18 dB window — same order as the direct H3, i.e. the coloration *is* the alias floor |
| Sample-rate sweep | `sample_rate_sweep_stays_finite` | 44.1/48/96/192 kHz: bounded, finite |
| Host block-size sweep | `block_size_sweep_stays_finite` | 1/32/128/2048-sample blocks: bounded, finite (control tick is sample-count based) |
| Automation slam | `automation_slam_survives` | all four macros slammed rail-to-rail every block + freeze toggling: finite, bounded, applied macros never leave [0,1] |
| Denormal / long decay | `sixty_second_decay_converges_to_silence` | impulse + 60 s simulated silence: finite throughout, final block RMS < 1e−5 |
| Preset-load transition | `preset_swap_is_click_free` | hot-swap mid-signal: first post-swap sample < 0.05, max inter-sample step < 0.25, full recovery within 10 blocks |
| Bypass/panic transition | `panic_fades_then_silences_click_free`, `panic_recovers_after_loud_input` | fade both directions, single-block tap kills energy |
| Two-tone IMD | `two_tone_intermodulation_is_controlled_and_odd_only` | IMD3 ≤ −20 dB rel, even-order absent |
| Null / baseline | `wet_zero_null_residue_is_the_tanh_color`, `neutral_macros_match_legacy_defaults` | wet-zero output ≡ tanh(input) within DC-blocker shear; neutral macros ≡ pre-macro engine |

### 8.2 Baseline & ablation record (laws 16–17)

- **Baseline for the macro law:** the pre-macro engine itself — `neutral_macros_match_legacy_defaults`
  proves the change is a strict superset (identity at neutral). The wet-zero null test doubles as a
  bypass-baseline comparison for the output stage.
- **Ablation, panic fade:** the fade replaced an instant mute; `panic_fades_then_silences_click_free`
  fails against the ablated (hard-mute) behavior — that failing assertion is the recorded evidence
  the fade earns its ~150 samples of latency-to-silence.
- **Ablation, preset-load fade:** `preset_swap_is_click_free` fails without `panic_gain = 0` on
  `load_program` (the un-faded swap steps by the full tail amplitude).
- **Ablation, macro smoothing:** `macro_targets_are_smoothed_not_snapped` fails if the chase is
  removed (targets would apply instantly).
- **Denormal guard (`flush_denormal`):** kept by analysis — cost is one branch per FDN line per
  sample; the 60 s decay stress passes with it in place. CPU-spike ablation is not CI-measurable
  reliably and is documented rather than asserted.

### 8.3 Release gate status (law 21)

**Current gate: Engineering Gate — PASSED.** Builds both feature paths; deterministic tests
(`tests/determinism.rs`) pass; realtime-safety, coefficient/stability, sample-rate and block-size
sweeps, automation-slam, bypass/panic and preset-transition tests pass; golden-adjacent
self-deriving references (pure-tanh sweep, neutral-macro identity) pass.

**Remaining for Release Gate:** a second host smoke test (only REAPER is installed here), a stored
golden render (fixed input × fixed macros × void-glass, tolerance compare), CI running both
feature paths of the workspace-excluded crates, a CPU benchmark matrix across rates/blocks, and a
reproducibility bundle (rendered WAV artifacts + scripts). Perceptual claims in this document are
limited to mechanisms with objective measurements; no MUSHRA/ABX protocol has been run, and no
"better-sounding" claim is made that would require one.

---

## 9. Design Lineage

The engine exists because a compiler answers every question an ML controller raises: QA is a test
suite instead of a dataset, preset recall is bytecode instead of weights, stability is a manifest
instead of a hope, and the user can be told *exactly* why the walls just moved — an event fired, a
rule ran, a ramp completed. The room listens; nothing in it guesses.
