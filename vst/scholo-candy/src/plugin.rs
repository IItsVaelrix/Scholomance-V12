use nih_plug::prelude::*;
use nih_plug_egui::{create_egui_editor, egui};
use std::sync::Arc;
use crate::params::ScholoCandyParams;
use crate::dsp::ScholoCandyEq;
use crate::dsp::analyzer::SpectrumAnalyzer;

pub struct ScholoCandyPlugin {
    params: Arc<ScholoCandyParams>,
    eq: ScholoCandyEq,
    analyzer: Arc<SpectrumAnalyzer>,
}

impl Default for ScholoCandyPlugin {
    fn default() -> Self {
        Self {
            params: Arc::new(ScholoCandyParams::default()),
            eq: ScholoCandyEq::new(48000.0),
            analyzer: Arc::new(SpectrumAnalyzer::new()),
        }
    }
}

impl Plugin for ScholoCandyPlugin {
    const NAME: &'static str = "ScholoCandy V2";
    const VENDOR: &'static str = "Scholomance";
    const URL: &'static str = "https://github.com/Scholomance";
    const EMAIL: &'static str = "info@scholomance.com";
    const VERSION: &'static str = env!("CARGO_PKG_VERSION");
    const AUDIO_IO_LAYOUTS: &'static [AudioIOLayout] = &[
        AudioIOLayout {
            main_input_channels: NonZeroU32::new(2),
            main_output_channels: NonZeroU32::new(2),
            aux_input_ports: &[],
            aux_output_ports: &[],
            names: PortNames::const_default(),
        },
    ];
    const MIDI_INPUT: MidiConfig = MidiConfig::None;
    // Parameters are applied at control rate (once per block) with smoothing, not
    // re-evaluated per sample, so we do not advertise sample-accurate automation.
    const SAMPLE_ACCURATE_AUTOMATION: bool = false;

    type SysExMessage = ();
    type BackgroundTask = ();

fn editor(&mut self, _async_executor: AsyncExecutor<Self>) -> Option<Box<dyn Editor>> {
        crate::editor::create_editor(self.params.clone(), self.analyzer.clone())
    }

    fn params(&self) -> Arc<dyn Params> {


        self.params.clone()
    }

    fn initialize(
        &mut self,
        _audio_io_layout: &AudioIOLayout,
        buffer_config: &BufferConfig,
        _context: &mut impl InitContext<Self>,
    ) -> bool {
        self.eq.set_sample_rate(buffer_config.sample_rate);
        self.analyzer.set_sample_rate(buffer_config.sample_rate);
        _context.set_latency_samples(self.eq.latency_samples());
        true
    }

    fn reset(&mut self) {
        for band in &mut self.eq.bands {
            band.reset();
        }
    }

    fn process(
        &mut self,
        buffer: &mut Buffer,
        _aux: &mut AuxiliaryBuffers,
        _context: &mut impl ProcessContext<Self>,
    ) -> ProcessStatus {
        // Advance every smoother by the full block length so the smoothing time
        // constant is honored. Calling `.next()` once per block (as before) advanced
        // the ramp a single sample per buffer, stretching a 5 ms smooth across
        // thousands of milliseconds. Coefficients are recomputed once per block from
        // the block-end value (control-rate updates).
        let num_samples = buffer.samples() as u32;

        self.eq.output_gain_db = self.params.output_gain.smoothed.next_step(num_samples);

        for i in 0..self.eq.bands.len() {
            let band_params = &self.params.bands[i];
            self.eq.bands[i].set_params(
                band_params.enabled.value(),
                band_params.filter_type.value(),
                band_params.channel.value(),
                band_params.freq.smoothed.next_step(num_samples),
                band_params.gain.smoothed.next_step(num_samples),
                band_params.q.smoothed.next_step(num_samples)
            );
        }

        let channels = buffer.as_slice();
        if channels.len() >= 2 {
            let (left, right) = channels.split_at_mut(1);
            // Feed the pre-EQ input to the spectrum analyzer (lock-free).
            let n = left[0].len().min(right[0].len());
            for i in 0..n {
                self.analyzer.push(0.5 * (left[0][i] + right[0][i]));
            }
            self.eq.process_block(&mut left[0], &mut right[0]);
        }

        ProcessStatus::Normal
    }
}

impl ClapPlugin for ScholoCandyPlugin {
    const CLAP_ID: &'static str = "com.scholomance.scholocandyeq.v2";
    const CLAP_DESCRIPTION: Option<&'static str> = Some("ScholoCandy V2 — Parametric EQ with WebAudio Parity");
    const CLAP_MANUAL_URL: Option<&'static str> = None;
    const CLAP_SUPPORT_URL: Option<&'static str> = None;
    const CLAP_FEATURES: &'static [ClapFeature] = &[ClapFeature::AudioEffect, ClapFeature::Equalizer];
}

impl Vst3Plugin for ScholoCandyPlugin {
    const VST3_CLASS_ID: [u8; 16] = *b"ScholoCandyEQ_V2";
    const VST3_SUBCATEGORIES: &'static [Vst3SubCategory] = &[Vst3SubCategory::Fx, Vst3SubCategory::Eq];
}

nih_export_clap!(ScholoCandyPlugin);
nih_export_vst3!(ScholoCandyPlugin);
