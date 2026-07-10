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
    /// Host macro state: `macro_targets` is set by the wrapper (block rate),
    /// `macro_cur` chases it with a one-pole (MACRO_TAU) so knob/automation
    /// moves are zipper-safe.
    macro_targets: Macros,
    macro_cur: Macros,
    /// Panic gain envelope: 1.0 = passing audio, ramps toward 0 while panic
    /// is held (PANIC_FADE_OUT_S) and back to 1 on release (PANIC_FADE_IN_S)
    /// so the mute is click-free in both directions.
    panic_gain: f32,
    panic_resetted: bool,
    #[allow(dead_code)]
    scratch_l: Vec<f32>,
    #[allow(dead_code)]
    scratch_r: Vec<f32>,
}

/// Macro smoothing time constant (seconds). Applied at block rate:
/// `a = exp(-n / (tau * fs))`, `cur = target + a * (cur - target)`.
const MACRO_TAU: f32 = 0.020;
/// Panic fade-out time constant (seconds) — fast enough to feel immediate,
/// slow enough (~150 samples at 48k) to be click-free.
const PANIC_FADE_OUT_S: f32 = 0.003;
/// Panic release fade-in time constant (seconds).
const PANIC_FADE_IN_S: f32 = 0.015;

/// Classifier-confidence gain from the Reactivity macro (neutral 1.0 at 0.5):
/// `conf_eff = conf * (0.4 + 1.2 * reactivity)` before the block threshold.
#[inline]
pub(crate) fn reactivity_confidence_gain(reactivity: f32) -> f32 {
    0.4 + 1.2 * reactivity.clamp(0.0, 1.0)
}

/// Macro -> low-level parameter mapping law, applied to the bytecode-driven
/// snapshot every block (the event system keeps modulating around the
/// macro-set operating point; macros never fight the ramps directly):
///
///   m_size = 0.5 + size                       (0.5..1.5, neutral 1.0)
///   feedback'   = min(feedback * m_size, ceiling_eff)
///   decay_low'  = clamp(decay_low * m_size, 0, 1)
///   absorption' = clamp(absorption * (1.5 - size), 0, 1)   (big rooms absorb less)
///   ceiling_eff = clamp(0.15 + 1.7 * stability, 0, 1)      (neutral: no cap at 0.5;
///       the low end must reach below the FDN's governor range — the graph maps
///       param feedback as fdn_fb = clamp(0.4 + 0.55*fb, <= program maxFeedback),
///       so only caps under ~0.33 tighten a program that already rides its ceiling)
///   scatter'    = clamp(scatter * (1.4 - 0.8 * stability), 0, 1)
pub(crate) fn shape_snapshot(p: params::ManifoldParams, m: &Macros) -> params::ManifoldParams {
    let size = m.size.clamp(0.0, 1.0);
    let stability = m.stability.clamp(0.0, 1.0);
    let m_size = 0.5 + size;
    let ceiling_eff = (0.15 + 1.7 * stability).clamp(0.0, 1.0);
    params::ManifoldParams {
        feedback: (p.feedback * m_size).min(ceiling_eff).clamp(0.0, 1.0),
        decay_low: (p.decay_low * m_size).clamp(0.0, 1.0),
        absorption_low: (p.absorption_low * (1.5 - size)).clamp(0.0, 1.0),
        absorption_high: (p.absorption_high * (1.5 - size)).clamp(0.0, 1.0),
        scatter: (p.scatter * (1.4 - 0.8 * stability)).clamp(0.0, 1.0),
        diffusion: p.diffusion,
        brightness: p.brightness,
        width: p.width,
    }
}

impl ManifoldCore {
    pub fn new() -> Self {
        Self {
            prepared: false,
            loaded: false,
            sample_rate: 48_000.0,
            tick_period: 480,
            tick_accum: 0,
            blocks: Vec::new(),
            governor: None,
            params: None,
            graph: None,
            features: FeatureExtractor::new(),
            classifier: Classifier::new(),
            macro_targets: Macros::default(),
            macro_cur: Macros::default(),
            panic_gain: 1.0,
            panic_resetted: false,
            scratch_l: Vec::new(),
            scratch_r: Vec::new(),
        }
    }

    /// Set the host macro targets (block rate; smoothed internally with
    /// MACRO_TAU before application, so callers may pass raw knob values).
    /// See `shape_snapshot` / `reactivity_confidence_gain` / `Macros` for the
    /// exact mapping law.
    pub fn set_macros(&mut self, m: Macros) {
        self.macro_targets = Macros {
            size: m.size.clamp(0.0, 1.0),
            reactivity: m.reactivity.clamp(0.0, 1.0),
            stability: m.stability.clamp(0.0, 1.0),
            wet: m.wet.clamp(0.0, 1.0),
        };
    }

    pub fn prepare(&mut self, cfg: PrepareConfig) -> Result<(), PrepareError> {
        if !(cfg.sample_rate.is_finite() && cfg.sample_rate >= 8000.0) {
            return Err(PrepareError::InvalidSampleRate);
        }
        if cfg.max_block_size == 0 {
            return Err(PrepareError::InvalidBlockSize);
        }
        if cfg.channels == 0 || cfg.channels > 2 {
            return Err(PrepareError::InvalidChannels);
        }
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
                if let Action::ClampFeedback { max } = a {
                    params.set_feedback_ceiling(*max);
                }
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
        // Program swap replaces the DSP graph, which hard-cuts the running
        // tail — mask the discontinuity with the panic fade-in ramp (15 ms)
        // so preset changes are click-safe (law: preset load must not click).
        self.panic_gain = 0.0;
        Ok(())
    }

    pub fn process(
        &mut self,
        in_l: &[f32],
        in_r: &[f32],
        out_l: &mut [f32],
        out_r: &mut [f32],
        ctx: ProcessContext,
    ) -> ProcessReport {
        let n = out_l.len();
        // Panic path, fully faded: energy is dead and the gate is closed —
        // reset once, then output cheap silence until release.
        if ctx.panic && self.panic_gain <= 1.0e-4 {
            if !self.panic_resetted {
                if let Some(g) = self.graph.as_mut() {
                    g.reset();
                }
                self.panic_resetted = true;
            }
            for i in 0..n {
                out_l[i] = 0.0;
                if i < out_r.len() {
                    out_r[i] = 0.0;
                }
            }
            return ProcessReport {
                events: Vec::new(),
                clipped: false,
                cpu_class_ok: true,
            };
        }
        if !ctx.panic {
            self.panic_resetted = false;
        }
        // Passthrough when unprepared/unloaded.
        if !self.prepared || !self.loaded {
            for i in 0..n {
                out_l[i] = in_l[i];
                if i < out_r.len() {
                    out_r[i] = *in_r.get(i).unwrap_or(&in_l[i]);
                }
            }
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
        if let Some(p) = self.params.as_mut() {
            p.tick(n);
        }

        // Chase the host macro targets (zipper-safe: a = exp(-n/(tau*fs))).
        let a_macro = (-(n as f32) / (MACRO_TAU * self.sample_rate)).exp();
        let chase = |cur: f32, target: f32| target + a_macro * (cur - target);
        self.macro_cur = Macros {
            size: chase(self.macro_cur.size, self.macro_targets.size),
            reactivity: chase(self.macro_cur.reactivity, self.macro_targets.reactivity),
            stability: chase(self.macro_cur.stability, self.macro_targets.stability),
            wet: chase(self.macro_cur.wet, self.macro_targets.wet),
        };

        // Macro law: shape the bytecode-driven snapshot around the host
        // operating point (see shape_snapshot for the equations).
        let snap = shape_snapshot(
            self.params
                .as_ref()
                .map(|p| p.snapshot())
                .unwrap_or_default(),
            &self.macro_cur,
        );
        let gov = self.governor.as_ref().unwrap();
        if let Some(g) = self.graph.as_mut() {
            g.process_block(in_l, in_r, out_l, out_r, &snap, gov, self.macro_cur.wet, ctx.freeze);
        }

        // Panic gain envelope (per sample, both directions click-free):
        //   a = exp(-1/(tau*fs)); g[n] = target + a*(g[n-1] - target)
        if ctx.panic || self.panic_gain < 0.9999 {
            let (target, tau) = if ctx.panic {
                (0.0, PANIC_FADE_OUT_S)
            } else {
                (1.0, PANIC_FADE_IN_S)
            };
            let a = (-1.0 / (tau * self.sample_rate)).exp();
            let mut g = self.panic_gain;
            for i in 0..n {
                g = target + a * (g - target);
                out_l[i] *= g;
                if i < out_r.len() {
                    out_r[i] *= g;
                }
            }
            self.panic_gain = g;
            // Kill the stored energy at the end of the FIRST panic block:
            // the block above was rendered from the still-energized graph so
            // the fade stays continuous, but even a single-block panic tap
            // must leave the network silent (panic is the runaway-feedback
            // escape hatch, not a volume dip).
            if ctx.panic && !self.panic_resetted {
                if let Some(gr) = self.graph.as_mut() {
                    gr.reset();
                }
                self.panic_resetted = true;
            }
        }

        let clipped = out_l.iter().any(|s| s.abs() >= 0.999);
        ProcessReport {
            events: report_events,
            clipped,
            cpu_class_ok: true,
        }
    }

    fn dispatch(&mut self, events: &[ClassifiedEvent], bpm: f32) {
        // Reactivity macro gates how eagerly classified events reach the
        // bytecode rules: conf_eff = conf * (0.4 + 1.2 * reactivity).
        let conf_gain = reactivity_confidence_gain(self.macro_cur.reactivity);
        // Split borrows: params + graph are distinct fields.
        let params = match self.params.as_mut() {
            Some(p) => p,
            None => return,
        };
        for ev in events {
            for block in &self.blocks {
                if block.event != ev.event || ev.confidence * conf_gain < block.threshold {
                    continue;
                }
                for action in &block.actions {
                    match action {
                        Action::RampParam {
                            id,
                            value,
                            duration_ms,
                        } => params.ramp_to(*id, *value, *duration_ms),
                        Action::ScaleParam {
                            id,
                            factor,
                            duration_ms,
                        } => params.scale(*id, *factor, *duration_ms),
                        Action::ClampFeedback { max } => params.set_feedback_ceiling(*max),
                        Action::TriggerSpray {
                            division,
                            density,
                            duration_ms,
                        } => {
                            if let Some(g) = self.graph.as_mut() {
                                g.trigger_spray(*division, *density, *duration_ms, bpm);
                            }
                        }
                        Action::BloomHarmonic {
                            amount,
                            duration_ms,
                        } => {
                            if let Some(g) = self.graph.as_mut() {
                                g.trigger_bloom(*amount, *duration_ms);
                            }
                        }
                        Action::CrossfadeNode { .. } => { /* freeze/crossfade via ProcessContext.freeze in V1 */
                        }
                    }
                }
            }
        }
    }
}

impl Default for ManifoldCore {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod core_tests {
    use super::*;

    const VOID_GLASS: &str = include_str!("../tests/fixtures/void-glass.bytecode.json");

    fn prepared_core() -> ManifoldCore {
        let mut c = ManifoldCore::new();
        c.prepare(PrepareConfig {
            sample_rate: 48_000.0,
            max_block_size: 128,
            channels: 2,
        })
        .unwrap();
        c
    }

    #[test]
    fn rejects_bad_prepare() {
        let mut c = ManifoldCore::new();
        assert_eq!(
            c.prepare(PrepareConfig {
                sample_rate: 0.0,
                max_block_size: 128,
                channels: 2
            }),
            Err(PrepareError::InvalidSampleRate)
        );
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
        let ctx = ProcessContext {
            bpm: 120.0,
            panic: false,
            freeze: false,
        };
        let mut rng = crate::rng::Pcg32::seed(3, 1);
        let mut ol = [0.0f32; 128];
        let mut or = [0.0f32; 128];
        for _ in 0..500 {
            let il: Vec<f32> = (0..128).map(|_| rng.next_f32() * 1.6 - 0.8).collect();
            let rep = c.process(&il, &il, &mut ol, &mut or, ctx);
            for i in 0..128 {
                assert!(ol[i].is_finite() && or[i].is_finite());
            }
            let _ = rep.events;
        }
    }

    fn loaded_core() -> ManifoldCore {
        let mut c = prepared_core();
        let p: BytecodeProgram = serde_json::from_str(VOID_GLASS).unwrap();
        c.load_program(p).unwrap();
        c
    }

    fn ctx(panic: bool, freeze: bool) -> ProcessContext {
        ProcessContext { bpm: 120.0, panic, freeze }
    }

    /// Drive the core with a sine for `blocks` blocks, fade the drive out
    /// (an abrupt cut makes the output DC blockers ring down for ~10 blocks,
    /// which would swamp the reverb tail being measured), skip `skip` blocks
    /// of settling, then return per-block output RMS for `tail_blocks`
    /// blocks of silence input.
    fn tail_rms(c: &mut ManifoldCore, blocks: usize, skip: usize, tail_blocks: usize) -> Vec<f32> {
        let sine = |amp_scale: f32| -> Vec<f32> {
            (0..128)
                .map(|i| {
                    (2.0 * std::f32::consts::PI * 220.0 * i as f32 / 48_000.0).sin()
                        * 0.5
                        * amp_scale
                })
                .collect()
        };
        let drive = sine(1.0);
        let silence = [0.0f32; 128];
        let mut ol = [0.0f32; 128];
        let mut or = [0.0f32; 128];
        for _ in 0..blocks {
            c.process(&drive, &drive, &mut ol, &mut or, ctx(false, false));
        }
        // Fade the drive out over a few blocks to avoid the step transient.
        for k in (0..4).rev() {
            let faded = sine(k as f32 / 4.0);
            c.process(&faded, &faded, &mut ol, &mut or, ctx(false, false));
        }
        for _ in 0..skip {
            c.process(&silence, &silence, &mut ol, &mut or, ctx(false, false));
        }
        (0..tail_blocks)
            .map(|_| {
                c.process(&silence, &silence, &mut ol, &mut or, ctx(false, false));
                (ol.iter().map(|s| s * s).sum::<f32>() / 128.0).sqrt()
            })
            .collect()
    }

    #[test]
    fn panic_fades_then_silences_click_free() {
        let mut c = loaded_core();
        let il = [0.9f32; 128];
        let mut ol = [0.0f32; 128];
        let mut or = [0.0f32; 128];
        // Establish signal first.
        for _ in 0..20 {
            c.process(&il, &il, &mut ol, &mut or, ctx(false, false));
        }
        let last_running = ol[127];
        // First panic block: must FADE, not slam to zero (click-safety), and
        // must be continuous with the previous block's last sample.
        c.process(&il, &il, &mut ol, &mut or, ctx(true, false));
        assert!(
            ol[0].abs() > 1e-4 || last_running.abs() < 1e-3,
            "panic must not hard-mute instantly (got first sample {} after {last_running})",
            ol[0]
        );
        let max_step = ol.windows(2).map(|w| (w[1] - w[0]).abs()).fold(0.0f32, f32::max);
        assert!(max_step < 0.25, "panic fade steps too hard: {max_step}");
        // A few blocks later (~27ms: fade + the DC-blocker transient from
        // the energy reset re-charging on this test's DC input) the output
        // must be fully silent.
        for _ in 0..10 {
            c.process(&il, &il, &mut ol, &mut or, ctx(true, false));
        }
        assert!(ol.iter().all(|&s| s.abs() < 1e-4), "panic must reach silence");
        // Release: fade back in, no instant jump on the first sample.
        c.process(&il, &il, &mut ol, &mut or, ctx(false, false));
        assert!(ol[0].abs() < 0.2, "release must fade in, got {}", ol[0]);
    }

    #[test]
    fn wet_zero_leaves_no_tail_wet_default_does() {
        let mut dry_core = loaded_core();
        dry_core.set_macros(Macros { wet: 0.0, ..Macros::default() });
        let dry_tail = tail_rms(&mut dry_core, 100, 6, 8);
        // With the wet path silenced, stopping the input stops the output.
        assert!(
            dry_tail.iter().all(|&r| r < 2e-3),
            "wet=0 must have no reverb tail: {dry_tail:?}"
        );

        let mut wet_core = loaded_core();
        let wet_tail = tail_rms(&mut wet_core, 100, 0, 8);
        assert!(
            wet_tail.iter().take(4).any(|&r| r > 1e-3),
            "default wet must leave an audible tail: {wet_tail:?}"
        );
    }

    #[test]
    fn size_extends_the_tail() {
        let mut small = loaded_core();
        small.set_macros(Macros { size: 0.0, ..Macros::default() });
        let small_tail: f32 = tail_rms(&mut small, 100, 40, 20).iter().sum();

        let mut big = loaded_core();
        big.set_macros(Macros { size: 1.0, ..Macros::default() });
        let big_tail: f32 = tail_rms(&mut big, 100, 40, 20).iter().sum();

        assert!(
            big_tail > small_tail * 1.2,
            "size=1 tail ({big_tail}) must exceed size=0 tail ({small_tail})"
        );
    }

    #[test]
    fn stability_tightens_the_tail() {
        let mut loose = loaded_core();
        loose.set_macros(Macros { stability: 0.0, size: 1.0, ..Macros::default() });
        let loose_tail: f32 = tail_rms(&mut loose, 100, 40, 20).iter().sum();

        let mut tight = loaded_core();
        tight.set_macros(Macros { stability: 1.0, size: 1.0, ..Macros::default() });
        // stability=0 caps param feedback at 0.15 (fdn fb ~0.48, under the
        // program's 0.58 governor ceiling); at 1.0 the cap is released, so
        // with size=1 pushing feedback up the loose cap must shorten the tail.
        assert!(
            loose_tail < tail_rms(&mut tight, 100, 40, 20).iter().sum::<f32>(),
            "stability=0 must cap the tail below stability=1"
        );
    }

    #[test]
    fn neutral_macros_match_legacy_defaults() {
        // Macros::default() must reproduce the pre-macro engine exactly:
        // wet = the old hardwired 0.7, and shape_snapshot must be identity
        // (modulo the stability ceiling, which is 1.0 -> no cap at neutral).
        let m = Macros::default();
        assert_eq!(m.wet, 0.7);
        let p = params::ManifoldParams {
            feedback: 0.5,
            decay_low: 0.5,
            absorption_low: 0.3,
            absorption_high: 0.4,
            scatter: 0.6,
            diffusion: 0.5,
            brightness: 0.5,
            width: 0.5,
        };
        let shaped = shape_snapshot(p, &m);
        for (a, b) in [
            (shaped.feedback, p.feedback),
            (shaped.decay_low, p.decay_low),
            (shaped.absorption_low, p.absorption_low),
            (shaped.absorption_high, p.absorption_high),
            (shaped.scatter, p.scatter),
        ] {
            assert!((a - b).abs() < 1e-6, "neutral macros must be identity: {a} vs {b}");
        }
        assert!((reactivity_confidence_gain(0.5) - 1.0).abs() < 1e-6);
    }

    #[test]
    fn macro_targets_are_smoothed_not_snapped() {
        let mut c = loaded_core();
        // Drive with signal at wet=0.7, then slam wet to 0.
        let _ = tail_rms(&mut c, 50, 0, 0);
        c.set_macros(Macros { wet: 0.0, ..Macros::default() });
        let sine: Vec<f32> = (0..128)
            .map(|i| (2.0 * std::f32::consts::PI * 220.0 * i as f32 / 48_000.0).sin() * 0.5)
            .collect();
        let mut ol = [0.0f32; 128];
        let mut or = [0.0f32; 128];
        c.process(&sine, &sine, &mut ol, &mut or, ctx(false, false));
        // One block (~2.7ms) is well under MACRO_TAU: the wet level must not
        // have collapsed to zero yet.
        assert!(
            c.macro_cur.wet > 0.3,
            "macro must chase, not snap: wet_cur = {}",
            c.macro_cur.wet
        );
    }

    /// Goertzel magnitude of `signal` at `freq` (exact-bin lengths only).
    fn goertzel(signal: &[f32], freq: f32, sr: f32) -> f32 {
        let w = 2.0 * std::f32::consts::PI * freq / sr;
        let coeff = 2.0 * w.cos();
        let (mut s1, mut s2) = (0.0f32, 0.0f32);
        for &x in signal {
            let s0 = x + coeff * s1 - s2;
            s2 = s1;
            s1 = s0;
        }
        ((s1 * s1 + s2 * s2 - coeff * s1 * s2).max(0.0)).sqrt() * 2.0 / signal.len() as f32
    }

    const EXCITER_SR: f32 = 48_000.0;

    /// Multi-tone generator: sum of (freq, amp) sines at absolute sample
    /// `phase` — keeps tones phase-continuous across process blocks.
    fn tone_block(tones: &[(f32, f32)], phase: usize, n: usize) -> Vec<f32> {
        (0..n)
            .map(|i| {
                tones
                    .iter()
                    .map(|&(f, a)| {
                        (2.0 * std::f32::consts::PI * f * (phase + i) as f32 / EXCITER_SR).sin()
                            * a
                    })
                    .sum()
            })
            .collect()
    }

    /// Run the engine at wet=0 (the only nonlinearity left is the output
    /// stage), settle macros/filters, then capture `n` output samples along
    /// with the exact input that produced them.
    fn capture_wet_zero(tones: &[(f32, f32)], n: usize) -> (Vec<f32>, Vec<f32>) {
        let mut c = loaded_core();
        c.set_macros(Macros { wet: 0.0, ..Macros::default() });
        let mut ol = [0.0f32; 128];
        let mut or = [0.0f32; 128];
        let mut phase = 0usize;
        for _ in 0..200 {
            let b = tone_block(tones, phase, 128);
            c.process(&b, &b, &mut ol, &mut or, ctx(false, false));
            phase += 128;
        }
        let mut input = Vec::with_capacity(n + 128);
        let mut output = Vec::with_capacity(n + 128);
        while output.len() < n {
            let b = tone_block(tones, phase, 128);
            c.process(&b, &b, &mut ol, &mut or, ctx(false, false));
            input.extend_from_slice(&b);
            output.extend_from_slice(&ol);
            phase += 128;
        }
        input.truncate(n);
        output.truncate(n);
        (input, output)
    }

    fn rms_of(x: &[f32]) -> f32 {
        (x.iter().map(|s| s * s).sum::<f32>() / x.len() as f32).sqrt()
    }

    /// The always-on output `tanh` limiter is a documented gentle harmonic
    /// exciter on EVERYTHING it passes — including the dry path. For a pure
    /// sine of amplitude a, tanh(x) ~ x - x^3/3 puts a third harmonic near
    /// a^2/12 relative (-26.7 dB at a = 0.8, measured). Pin the coloration
    /// as an intentional number instead of folklore.
    #[test]
    fn output_stage_adds_bounded_odd_harmonics() {
        let (_, out) = capture_wet_zero(&[(1_000.0, 0.8)], 4800);
        let fund = goertzel(&out, 1_000.0, EXCITER_SR);
        let h3 = goertzel(&out, 3_000.0, EXCITER_SR);
        assert!(fund > 0.5, "fundamental should pass (~0.69 after tanh): {fund}");
        let rel3 = h3 / fund;
        assert!(
            (0.01..0.12).contains(&rel3),
            "third harmonic out of the documented window: {rel3} ({h3} vs {fund})"
        );
    }

    /// Hardening #1: tanh is odd-symmetric — even harmonics must sit at
    /// least 20 dB below H3, not merely "lower".
    #[test]
    fn even_harmonics_stay_20db_below_h3() {
        let (_, out) = capture_wet_zero(&[(1_000.0, 0.8)], 4800);
        let h2 = goertzel(&out, 2_000.0, EXCITER_SR);
        let h3 = goertzel(&out, 3_000.0, EXCITER_SR);
        let h4 = goertzel(&out, 4_000.0, EXCITER_SR);
        let margin = 10.0f32.powf(-20.0 / 20.0); // -20 dB
        assert!(h2 < h3 * margin, "H2 too hot: h2={h2} h3={h3}");
        assert!(h4 < h3 * margin, "H4 too hot: h4={h4} h3={h3}");
    }

    /// Hardening #2: peak sweep 0.05..0.95. The H3 curve must (a) grow
    /// monotonically with level and (b) track a pure-tanh reference computed
    /// on the same signal in-test (self-deriving golden — if the output
    /// stage ever changes character, this snapshot breaks loudly).
    #[test]
    fn h3_level_sweep_matches_pure_tanh_reference() {
        let mut prev_rel = 0.0f32;
        for step in 0..10 {
            let a = 0.05 + step as f32 * 0.1;
            let (input, out) = capture_wet_zero(&[(1_000.0, a)], 4800);
            let rel_engine =
                goertzel(&out, 3_000.0, EXCITER_SR) / goertzel(&out, 1_000.0, EXCITER_SR);
            let reference: Vec<f32> = input.iter().map(|&x| x.tanh()).collect();
            let rel_ref = goertzel(&reference, 3_000.0, EXCITER_SR)
                / goertzel(&reference, 1_000.0, EXCITER_SR);
            assert!(
                rel_engine >= prev_rel * 0.98,
                "H3 curve must be monotonic: {rel_engine} < {prev_rel} at a={a}"
            );
            // 20% relative tolerance + small absolute floor for the tiny end
            // (DC blocker phase shear and float noise dominate below -60 dB).
            assert!(
                (rel_engine - rel_ref).abs() <= rel_ref * 0.2 + 2e-4,
                "engine H3 diverges from pure tanh at a={a}: engine {rel_engine} vs ref {rel_ref}"
            );
            prev_rel = rel_engine;
        }
    }

    /// Hardening #3: two-tone intermodulation (440 + 997 Hz, 0.4 each).
    /// Exciters flatter single tones and fall apart on dense material; the
    /// governor earns its crown only if IMD stays controlled. For an odd
    /// memoryless nonlinearity the 3rd-order products (2f1±f2, 2f2±f1) are
    /// expected near a²b/4 (≈ -27 dB rel here) and 2nd-order products
    /// (f2±f1) must be absent.
    #[test]
    fn two_tone_intermodulation_is_controlled_and_odd_only() {
        let (f1, f2) = (440.0, 997.0);
        let (_, out) = capture_wet_zero(&[(f1, 0.4), (f2, 0.4)], 48_000);
        let fund = goertzel(&out, f1, EXCITER_SR).max(goertzel(&out, f2, EXCITER_SR));
        let imd3: Vec<f32> = [2.0 * f1 - f2, 2.0 * f1 + f2, 2.0 * f2 - f1, 2.0 * f2 + f1]
            .iter()
            .map(|&f| goertzel(&out, f.abs(), EXCITER_SR))
            .collect();
        let imd2: Vec<f32> = [f2 - f1, f2 + f1]
            .iter()
            .map(|&f| goertzel(&out, f, EXCITER_SR))
            .collect();
        let ceiling = 10.0f32.powf(-20.0 / 20.0); // every product <= -20 dB rel
        let floor = 10.0f32.powf(-45.0 / 20.0); // measurement sanity: exciter is real
        for (k, p) in imd3.iter().enumerate() {
            assert!(
                p / fund <= ceiling,
                "IMD3 product {k} too hot: {} dB",
                20.0 * (p / fund).log10()
            );
        }
        assert!(
            imd3.iter().any(|p| p / fund >= floor),
            "no measurable IMD3 — measurement broken? {imd3:?}"
        );
        let max_imd3 = imd3.iter().fold(0.0f32, |a, &b| a.max(b));
        for p in &imd2 {
            assert!(
                *p < max_imd3 * 0.1,
                "even-order IMD present (should vanish for odd symmetry): {p} vs {max_imd3}"
            );
        }
    }

    /// Hardening #4: WET=0 against bypass must null to a NONZERO residue that
    /// is exactly the documented tanh color — the output equals tanh(input)
    /// (within DC-blocker shear), and the (output - input) residue carries
    /// the same energy as the analytic (tanh(x) - x).
    #[test]
    fn wet_zero_null_residue_is_the_tanh_color() {
        let (input, out) = capture_wet_zero(&[(1_000.0, 0.8)], 4800);
        let reference: Vec<f32> = input.iter().map(|&x| x.tanh()).collect();
        let in_rms = rms_of(&input);

        // The engine's wet-zero path IS tanh followed by the 38 Hz-corner DC
        // blocker. The blocker's gain at 1 kHz is ~unity but its ~2 degree
        // phase lead alone produces ~3% sample-aligned rms error against a
        // pure tanh reference — so gate at 5%: tight enough to catch any real
        // change of nonlinearity, loose enough for the documented shear.
        let err: Vec<f32> = out.iter().zip(&reference).map(|(o, r)| o - r).collect();
        assert!(
            rms_of(&err) < 0.05 * in_rms,
            "wet-zero output is not tanh(input): err rms {} vs input rms {in_rms}",
            rms_of(&err)
        );

        // The bypass-null residue is nonzero and matches the analytic color.
        let residue: Vec<f32> = out.iter().zip(&input).map(|(o, i)| o - i).collect();
        let expected: Vec<f32> = input.iter().map(|&x| x.tanh() - x).collect();
        let (r, e) = (rms_of(&residue), rms_of(&expected));
        assert!(r > 0.01 * in_rms, "null residue vanished — exciter gone? {r}");
        assert!(
            (r - e).abs() <= e * 0.25,
            "null residue does not match tanh color: got {r}, expected {e}"
        );
    }

    // ------------------------------------------------------------------
    // Research-hardening battery (skill laws 15-18): declared protocols,
    // measured aliasing, rate/block robustness, stress, transition safety.
    // ------------------------------------------------------------------

    /// Law 18 aliasing report: the un-oversampled tanh folds harmonics that
    /// land above Nyquist. Protocol: 48 kHz, wet=0 (isolates the output
    /// stage), 0.8-peak sines, Goertzel at the folded H3 positions
    /// (3x10 kHz = 30 kHz -> 18 kHz; 3x15 kHz = 45 kHz -> 3 kHz). Expected:
    /// same order as the direct H3 (~-27 dB rel) — this IS the documented
    /// intentional coloration; the test pins it so "intentional" stays a
    /// number, not an excuse.
    #[test]
    fn aliasing_report_folded_h3_is_the_documented_color() {
        for (f0, folded) in [(10_000.0, 18_000.0), (15_000.0, 3_000.0)] {
            let (_, out) = capture_wet_zero(&[(f0, 0.8)], 4800);
            let fund = goertzel(&out, f0, EXCITER_SR);
            let alias = goertzel(&out, folded, EXCITER_SR);
            let rel_db = 20.0 * (alias / fund).log10();
            assert!(
                (-38.0..=-18.0).contains(&rel_db),
                "folded H3 of {f0} Hz at {folded} Hz out of the documented window: {rel_db} dB"
            );
        }
    }

    /// Law 18: sample-rate sweep. Every time-based coefficient derives from
    /// the prepare-time sample rate; the engine must stay finite and bounded
    /// at all supported rates, not just 48 kHz.
    #[test]
    fn sample_rate_sweep_stays_finite() {
        for sr in [44_100.0, 48_000.0, 96_000.0, 192_000.0] {
            let mut c = ManifoldCore::new();
            c.prepare(PrepareConfig { sample_rate: sr, max_block_size: 256, channels: 2 })
                .unwrap();
            let p: BytecodeProgram = serde_json::from_str(VOID_GLASS).unwrap();
            c.load_program(p).unwrap();
            let sine: Vec<f32> = (0..256)
                .map(|i| (2.0 * std::f32::consts::PI * 440.0 * i as f32 / sr).sin() * 0.7)
                .collect();
            let mut ol = [0.0f32; 256];
            let mut or = [0.0f32; 256];
            for _ in 0..400 {
                c.process(&sine, &sine, &mut ol, &mut or, ctx(false, false));
                for &s in ol.iter() {
                    assert!(s.is_finite() && s.abs() < 4.0, "unbounded at sr={sr}: {s}");
                }
            }
        }
    }

    /// Law 18: host block-size sweep (1..2048). The control tick is
    /// sample-count based, so behavior must remain safe at every block size
    /// a host might use — including single-sample processing.
    #[test]
    fn block_size_sweep_stays_finite() {
        for bs in [1usize, 32, 128, 2048] {
            let mut c = ManifoldCore::new();
            c.prepare(PrepareConfig {
                sample_rate: 48_000.0,
                max_block_size: bs,
                channels: 2,
            })
            .unwrap();
            let p: BytecodeProgram = serde_json::from_str(VOID_GLASS).unwrap();
            c.load_program(p).unwrap();
            let mut ol = vec![0.0f32; bs];
            let mut or = vec![0.0f32; bs];
            let total = 9_600; // 0.2 s
            let mut phase = 0usize;
            while phase < total {
                let b = tone_block(&[(330.0, 0.6)], phase, bs);
                c.process(&b, &b, &mut ol, &mut or, ctx(false, false));
                for &s in ol.iter() {
                    assert!(s.is_finite() && s.abs() < 4.0, "unbounded at block={bs}: {s}");
                }
                phase += bs;
            }
        }
    }

    /// Law 18 automation slam: hammer every macro between extremes each
    /// block while audio runs. The chase smoothing must keep the engine
    /// finite, bounded, and the applied macro state inside [0,1].
    #[test]
    fn automation_slam_survives() {
        let mut c = loaded_core();
        let mut ol = [0.0f32; 128];
        let mut or = [0.0f32; 128];
        let mut phase = 0usize;
        for k in 0..400 {
            let hi = k % 2 == 0;
            c.set_macros(Macros {
                size: if hi { 1.0 } else { 0.0 },
                reactivity: if hi { 0.0 } else { 1.0 },
                stability: if hi { 1.0 } else { 0.0 },
                wet: if hi { 1.0 } else { 0.0 },
            });
            let b = tone_block(&[(220.0, 0.5), (997.0, 0.2)], phase, 128);
            c.process(&b, &b, &mut ol, &mut or, ctx(false, k % 7 == 0));
            phase += 128;
            for &s in ol.iter() {
                assert!(s.is_finite() && s.abs() < 4.0, "slam broke bounds: {s}");
            }
            for m in [c.macro_cur.size, c.macro_cur.reactivity, c.macro_cur.stability, c.macro_cur.wet]
            {
                assert!((0.0..=1.0).contains(&m), "macro escaped unit range: {m}");
            }
        }
    }

    /// Law 18 denormal / long-decay stress: one impulse, then 60 seconds of
    /// simulated silence. Output must remain finite and converge to silence;
    /// the FDN's flush_denormal keeps states from hovering in denormal range.
    #[test]
    fn sixty_second_decay_converges_to_silence() {
        let mut c = loaded_core();
        let mut impulse = [0.0f32; 128];
        impulse[0] = 1.0;
        let silence = [0.0f32; 128];
        let mut ol = [0.0f32; 128];
        let mut or = [0.0f32; 128];
        c.process(&impulse, &impulse, &mut ol, &mut or, ctx(false, false));
        let blocks = (60.0f32 * 48_000.0 / 128.0) as usize;
        let mut last_rms = f32::MAX;
        for k in 0..blocks {
            c.process(&silence, &silence, &mut ol, &mut or, ctx(false, false));
            for &s in ol.iter() {
                assert!(s.is_finite(), "non-finite during long decay at block {k}");
            }
            if k == blocks - 1 {
                last_rms = rms_of(&ol);
            }
        }
        assert!(last_rms < 1e-5, "tail did not converge to silence: {last_rms}");
    }

    /// Law 13 (preset load must not click): hot-swapping a program replaces
    /// the DSP graph and cuts the tail — the load fade (panic_gain = 0 on
    /// load_program) must mask that as a 15 ms dip, never a step.
    #[test]
    fn preset_swap_is_click_free() {
        let mut c = loaded_core();
        let mut ol = [0.0f32; 128];
        let mut or = [0.0f32; 128];
        let mut phase = 0usize;
        for _ in 0..100 {
            let b = tone_block(&[(220.0, 0.7)], phase, 128);
            c.process(&b, &b, &mut ol, &mut or, ctx(false, false));
            phase += 128;
        }
        // Hot-swap mid-stream.
        let p: BytecodeProgram = serde_json::from_str(VOID_GLASS).unwrap();
        c.load_program(p).unwrap();
        let b = tone_block(&[(220.0, 0.7)], phase, 128);
        c.process(&b, &b, &mut ol, &mut or, ctx(false, false));
        assert!(
            ol[0].abs() < 0.05,
            "first sample after swap must start from the fade, got {}",
            ol[0]
        );
        let max_step = ol.windows(2).map(|w| (w[1] - w[0]).abs()).fold(0.0f32, f32::max);
        assert!(max_step < 0.25, "preset swap stepped too hard: {max_step}");
        // And the engine comes back: a few blocks later signal flows again.
        for _ in 0..10 {
            phase += 128;
            let b = tone_block(&[(220.0, 0.7)], phase, 128);
            c.process(&b, &b, &mut ol, &mut or, ctx(false, false));
        }
        assert!(rms_of(&ol) > 0.1, "engine did not recover after swap: {}", rms_of(&ol));
    }
}
