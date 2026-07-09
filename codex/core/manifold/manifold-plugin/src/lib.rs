//! Cochlear Manifold native plugin: a thin nih-plug wrapper over
//! `manifold-core`, exporting VST3 + CLAP. No editor GUI this pass (host params
//! only). The DSP engine, VM, and safety governor all live in `manifold-core`.

use std::num::NonZeroU32;
use std::sync::Arc;

use manifold_core::{BytecodeProgram, ManifoldCore, PrepareConfig, ProcessContext as MfCtx};
use nih_plug::prelude::*;

#[cfg(feature = "gui")]
mod editor;

mod meter;
mod presets;

use meter::MeterSnapshot;

#[cfg(feature = "gui")]
use nih_plug_vizia::ViziaState;

/// One factory preset is embedded so the plugin makes sound out of the box.
const FACTORY_BYTECODE: &str =
    include_str!("../../manifold-core/tests/fixtures/void-glass.bytecode.json");

struct ManifoldPlugin {
    params: Arc<ManifoldPluginParams>,
    core: ManifoldCore,
    scratch_l: Vec<f32>,
    scratch_r: Vec<f32>,
    meter: std::sync::Arc<MeterSnapshot>,
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
        editor::create_editor(self.params.editor_state.clone(), self.params.clone())
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
        match serde_json::from_str::<BytecodeProgram>(FACTORY_BYTECODE) {
            Ok(program) => self.core.load_program(program).is_ok(),
            Err(_) => false,
        }
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
        self.core.process(
            &self.scratch_l[..n],
            &self.scratch_r[..n],
            &mut out_l[..n],
            &mut out_r[..n],
            ctx,
        );

        let peak_l = out_l[..n].iter().fold(0.0_f32, |a, s| a.max(s.abs()));
        let peak_r = out_r[..n].iter().fold(0.0_f32, |a, s| a.max(s.abs()));
        self.meter.publish(peak_l, peak_r, (peak_l + peak_r) * 0.5);

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
