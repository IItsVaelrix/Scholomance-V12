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
    #[allow(dead_code)]
    scratch_l: Vec<f32>,
    #[allow(dead_code)]
    scratch_r: Vec<f32>,
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
            scratch_l: Vec::new(),
            scratch_r: Vec::new(),
        }
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
        // Panic path: kill energy and reset.
        if ctx.panic {
            if let Some(g) = self.graph.as_mut() {
                g.reset();
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

        let snap = self
            .params
            .as_ref()
            .map(|p| p.snapshot())
            .unwrap_or_default();
        let gov = self.governor.as_ref().unwrap();
        if let Some(g) = self.graph.as_mut() {
            g.process_block(in_l, in_r, out_l, out_r, &snap, gov, 0.7, ctx.freeze);
        }
        let clipped = out_l.iter().any(|s| s.abs() >= 0.999);
        ProcessReport {
            events: report_events,
            clipped,
            cpu_class_ok: true,
        }
    }

    fn dispatch(&mut self, events: &[ClassifiedEvent], bpm: f32) {
        // Split borrows: params + graph are distinct fields.
        let params = match self.params.as_mut() {
            Some(p) => p,
            None => return,
        };
        for ev in events {
            for block in &self.blocks {
                if block.event != ev.event || ev.confidence < block.threshold {
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

    #[test]
    fn panic_silences_output() {
        let mut c = prepared_core();
        let p: BytecodeProgram = serde_json::from_str(VOID_GLASS).unwrap();
        c.load_program(p).unwrap();
        let il = [0.9f32; 128];
        let mut ol = [0.0f32; 128];
        let mut or = [0.0f32; 128];
        let ctx = ProcessContext {
            bpm: 120.0,
            panic: true,
            freeze: false,
        };
        c.process(&il, &il, &mut ol, &mut or, ctx);
        assert!(ol.iter().all(|&s| s.abs() < 1e-4));
    }
}
