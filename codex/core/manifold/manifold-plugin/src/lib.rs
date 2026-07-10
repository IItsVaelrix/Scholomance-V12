//! Cochlear Manifold native plugin: a thin nih-plug wrapper over
//! `manifold-core`, exporting VST3 + CLAP, with an optional vizia editor
//! behind the `gui` feature. The DSP engine, VM, and safety governor all live
//! in `manifold-core`.

use std::num::NonZeroU32;
use std::sync::Arc;

use manifold_core::{
    BytecodeProgram, Macros, ManifoldCore, PrepareConfig, ProcessContext as MfCtx,
};
use nih_plug::prelude::*;

#[cfg(feature = "gui")]
mod editor;

mod meter;
mod presets;

use meter::MeterSnapshot;

#[cfg(feature = "gui")]
use nih_plug_vizia::ViziaState;

pub struct ManifoldPlugin {
    params: Arc<ManifoldPluginParams>,
    core: ManifoldCore,
    scratch_l: Vec<f32>,
    scratch_r: Vec<f32>,
    meter: std::sync::Arc<MeterSnapshot>,
    /// Spectral split + envelopes feeding the visualizer (audio-thread state).
    bands: meter::BandSplit,
    /// Host sample rate (initialize()); used for the CPU-budget measurement.
    sample_rate: f32,
    /// Factory programs pre-parsed off the audio thread (initialize()).
    programs: Vec<BytecodeProgram>,
    /// PRESETS index the editor wants loaded; -1 = none. Shared with the editor (Task 13).
    pending_preset: Arc<std::sync::atomic::AtomicI32>,
}

#[derive(Params)]
struct ManifoldPluginParams {
    #[id = "wet"]
    wet: FloatParam,
    #[id = "size"]
    size: FloatParam,
    #[id = "react"]
    reactivity: FloatParam,
    #[id = "stab"]
    stability: FloatParam,
    #[id = "freeze"]
    freeze: BoolParam,
    #[id = "panic"]
    panic: BoolParam,

    #[cfg(feature = "gui")]
    #[persist = "editor-state"]
    editor_state: std::sync::Arc<ViziaState>,
}

impl Default for ManifoldPluginParams {
    fn default() -> Self {
        Self {
            wet: FloatParam::new("Wet/Dry", 0.7, FloatRange::Linear { min: 0.0, max: 1.0 }),
            size: FloatParam::new("Manifold Size", 0.5, FloatRange::Linear { min: 0.0, max: 1.0 }),
            reactivity: FloatParam::new(
                "Reactivity",
                0.5,
                FloatRange::Linear { min: 0.0, max: 1.0 },
            ),
            stability: FloatParam::new("Stability", 0.5, FloatRange::Linear { min: 0.0, max: 1.0 }),
            freeze: BoolParam::new("Freeze", false),
            panic: BoolParam::new("Panic", false),

            #[cfg(feature = "gui")]
            editor_state: editor::default_state(),
        }
    }
}

impl Default for ManifoldPlugin {
    fn default() -> Self {
        Self {
            params: Arc::new(ManifoldPluginParams::default()),
            core: ManifoldCore::new(),
            scratch_l: Vec::new(),
            scratch_r: Vec::new(),
            meter: MeterSnapshot::new(),
            bands: meter::BandSplit::new(48_000.0),
            sample_rate: 48_000.0,
            programs: Vec::new(),
            pending_preset: Arc::new(std::sync::atomic::AtomicI32::new(-1)),
        }
    }
}

impl Plugin for ManifoldPlugin {
    const NAME: &'static str = "Cochlear Manifold";
    const VENDOR: &'static str = "Scholomance";
    const URL: &'static str = "https://scholomance.invalid";
    const EMAIL: &'static str = "info@scholomance.invalid";
    const VERSION: &'static str = env!("CARGO_PKG_VERSION");

    const AUDIO_IO_LAYOUTS: &'static [AudioIOLayout] = &[AudioIOLayout {
        main_input_channels: NonZeroU32::new(2),
        main_output_channels: NonZeroU32::new(2),
        ..AudioIOLayout::const_default()
    }];

    const MIDI_INPUT: MidiConfig = MidiConfig::None;
    const MIDI_OUTPUT: MidiConfig = MidiConfig::None;
    const SAMPLE_ACCURATE_AUTOMATION: bool = false;

    type SysExMessage = ();
    type BackgroundTask = ();

    fn params(&self) -> Arc<dyn Params> {
        self.params.clone()
    }

    #[cfg(feature = "gui")]
    fn editor(&mut self, _async_executor: AsyncExecutor<Self>) -> Option<Box<dyn Editor>> {
        editor::create_editor(
            self.params.editor_state.clone(),
            self.params.clone(),
            self.meter.clone(),
            self.pending_preset.clone(),
        )
    }

    fn initialize(
        &mut self,
        _audio_io_layout: &AudioIOLayout,
        buffer_config: &BufferConfig,
        _context: &mut impl InitContext<Self>,
    ) -> bool {
        let max = (buffer_config.max_buffer_size as usize).max(1);
        if self
            .core
            .prepare(PrepareConfig {
                sample_rate: buffer_config.sample_rate,
                max_block_size: max,
                channels: 2,
            })
            .is_err()
        {
            return false;
        }
        self.scratch_l = vec![0.0; max];
        self.scratch_r = vec![0.0; max];
        self.bands = meter::BandSplit::new(buffer_config.sample_rate);
        self.sample_rate = buffer_config.sample_rate;

        let mut programs = Vec::with_capacity(presets::PRESETS.len());
        for preset in presets::PRESETS.iter() {
            match serde_json::from_str::<BytecodeProgram>(preset.bytecode) {
                Ok(program) => programs.push(program),
                Err(_) => return false,
            }
        }
        self.programs = programs;

        self.core.load_program(self.programs[0].clone()).is_ok()
    }

    fn process(
        &mut self,
        buffer: &mut Buffer,
        _aux: &mut AuxiliaryBuffers,
        context: &mut impl ProcessContext<Self>,
    ) -> ProcessStatus {
        let n = buffer.samples();
        if n == 0 {
            return ProcessStatus::Normal;
        }

        // Preset hot-swap: consume the editor's request exactly once. load_program()
        // re-compiles the program and re-prepares the full DSP graph, all allocating
        // synchronously on the audio thread — an accepted, user-initiated tradeoff
        // (brief click-time glitch on preset change beats cross-thread program plumbing).
        if let Some(i) = presets::take_pending(&self.pending_preset) {
            if let Some(program) = self.programs.get(i) {
                let _ = self.core.load_program(program.clone());
            }
        }

        // Grow scratch if the host ever exceeds the reported max block.
        if self.scratch_l.len() < n {
            self.scratch_l.resize(n, 0.0);
            self.scratch_r.resize(n, 0.0);
        }

        let bpm = context.transport().tempo.unwrap_or(120.0) as f32;
        let ctx = MfCtx {
            bpm,
            panic: self.params.panic.value(),
            freeze: self.params.freeze.value(),
        };
        // Host macro knobs -> engine, block rate. The core smooths these
        // (MACRO_TAU one-pole) before applying its mapping law, so raw values
        // are automation-safe here.
        self.core.set_macros(Macros {
            size: self.params.size.value(),
            reactivity: self.params.reactivity.value(),
            stability: self.params.stability.value(),
            wet: self.params.wet.value(),
        });

        let slices = buffer.as_slice();
        if slices.len() < 2 {
            return ProcessStatus::Normal;
        }
        let (left, right) = slices.split_at_mut(1);
        let out_l = &mut left[0];
        let out_r = &mut right[0];

        // Copy the in-place buffers to scratch inputs, then render into outputs.
        self.scratch_l[..n].copy_from_slice(&out_l[..n]);
        self.scratch_r[..n].copy_from_slice(&out_r[..n]);
        // Time the engine against its block budget so the Advanced CPU
        // readout shows a MEASURED value (the core's own cpu_class_ok field
        // is not yet instrumented). Meter-only: never feeds back into audio
        // behavior, so determinism of the signal path is preserved.
        let t0 = std::time::Instant::now();
        let report = self.core.process(
            &self.scratch_l[..n],
            &self.scratch_r[..n],
            &mut out_l[..n],
            &mut out_r[..n],
            ctx,
        );
        let block_budget_s = n as f32 / self.sample_rate.max(1.0);
        let cpu_ok = t0.elapsed().as_secs_f32() < 0.7 * block_budget_s;

        // Publish the visualization snapshot (all lock-free, no allocation):
        // peaks + RMS for the meter rail and core orb, spectral bands for the
        // room glow, and the safety-governor report for the Advanced readouts.
        let mut peak_l = 0.0_f32;
        let mut peak_r = 0.0_f32;
        let mut sq = 0.0_f32;
        for i in 0..n {
            let (l, r) = (out_l[i], out_r[i]);
            peak_l = peak_l.max(l.abs());
            peak_r = peak_r.max(r.abs());
            sq += l * l + r * r;
        }
        let rms = (sq / (2.0 * n as f32)).sqrt();
        self.meter.publish_levels(peak_l, peak_r, rms);
        let (low, mid, high) = self.bands.process_block(&out_l[..n], &out_r[..n]);
        self.meter.publish_bands(low, mid, high);
        self.meter.publish_report(report.clipped, cpu_ok);

        ProcessStatus::Normal
    }
}

impl ClapPlugin for ManifoldPlugin {
    const CLAP_ID: &'static str = "com.scholomance.cochlear-manifold";
    const CLAP_DESCRIPTION: Option<&'static str> =
        Some("Compiled adaptive spatial DSP manifold");
    const CLAP_MANUAL_URL: Option<&'static str> = None;
    const CLAP_SUPPORT_URL: Option<&'static str> = None;
    const CLAP_FEATURES: &'static [ClapFeature] = &[
        ClapFeature::AudioEffect,
        ClapFeature::Stereo,
        ClapFeature::Reverb,
    ];
}

impl Vst3Plugin for ManifoldPlugin {
    const VST3_CLASS_ID: [u8; 16] = *b"CochlearManifld1";
    const VST3_SUBCATEGORIES: &'static [Vst3SubCategory] =
        &[Vst3SubCategory::Fx, Vst3SubCategory::Reverb];
}

nih_export_clap!(ManifoldPlugin);
nih_export_vst3!(ManifoldPlugin);
