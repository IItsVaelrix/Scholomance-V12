use nih_plug::prelude::*;
use std::collections::BTreeMap;
use std::sync::Arc;

use crate::bands::BandCatalog;
use crate::dsp::filter_band::FilterType;

pub struct BandParamSet {
    pub enabled: BoolParam,
    pub filter_type: EnumParam<FilterType>,
    pub channel: EnumParam<crate::dsp::filter_band::ChannelKind>,
    pub freq: FloatParam,
    pub gain: FloatParam,
    pub q: FloatParam,
}

pub struct ScholoCandyParams {
    pub editor_state: Arc<nih_plug_egui::EguiState>,
    pub output_gain: FloatParam,
    pub bands: Vec<BandParamSet>,
}

/// Log-spaced default center frequency so bands fan out across the spectrum instead
/// of stacking on top of each other at 1 kHz (which read as a single node). Keeps a
/// musical 40 Hz .. 16 kHz spread for any band count (PDR Phase 6 editor usability).
fn default_band_freq(index: usize, count: usize) -> f32 {
    if count <= 1 {
        return 1000.0;
    }
    let (min, max) = (40.0_f32, 16000.0_f32);
    let t = index as f32 / (count - 1) as f32;
    min * (max / min).powf(t)
}

impl Default for ScholoCandyParams {
    fn default() -> Self {
        let count = BandCatalog::count();
        let mut bands = Vec::with_capacity(count);

        for i in 0..count {
            let name_prefix = format!("Band {}", i + 1);
            bands.push(BandParamSet {
                enabled: BoolParam::new(format!("{} Enabled", name_prefix), true),
                filter_type: EnumParam::new(format!("{} Type", name_prefix), FilterType::Bell),
                channel: EnumParam::new(format!("{} Channel", name_prefix), crate::dsp::filter_band::ChannelKind::Stereo),
                freq: FloatParam::new(
                    format!("{} Freq", name_prefix),
                    default_band_freq(i, count),
                    FloatRange::Skewed { min: 20.0, max: 20000.0, factor: FloatRange::skew_factor(-2.0) },
                )
                .with_unit(" Hz")
                .with_smoother(SmoothingStyle::Linear(5.0)),
                gain: FloatParam::new(
                    format!("{} Gain", name_prefix),
                    0.0,
                    FloatRange::Linear { min: -24.0, max: 24.0 },
                )
                .with_unit(" dB")
                .with_smoother(SmoothingStyle::Linear(5.0)),
                q: FloatParam::new(
                    format!("{} Q", name_prefix),
                    1.0,
                    FloatRange::Skewed { min: 0.1, max: 18.0, factor: FloatRange::skew_factor(-1.0) },
                ),
            });
        }

        Self {
            editor_state: nih_plug_egui::EguiState::from_size(800, 600),
            output_gain: FloatParam::new(
                "Output Gain",
                0.0,
                FloatRange::Linear { min: -24.0, max: 24.0 },
            )
            .with_unit(" dB")
            .with_smoother(SmoothingStyle::Linear(5.0)),
            bands,
        }
    }
}

unsafe impl Params for ScholoCandyParams {
    fn param_map(&self) -> Vec<(String, nih_plug::params::internals::ParamPtr, String)> {
        let mut map = Vec::new();
        
        map.push((
            "out_gain".to_string(),
            self.output_gain.as_ptr(),
            "".to_string(),
        ));

        for (i, band) in self.bands.iter().enumerate() {
            let id_prefix = format!("b{}", i + 1);
            let group = format!("Band {}", i + 1);
            map.push((format!("{}_en", id_prefix), band.enabled.as_ptr(), group.clone()));
            map.push((format!("{}_type", id_prefix), band.filter_type.as_ptr(), group.clone()));
            map.push((format!("{}_channel", id_prefix), band.channel.as_ptr(), group.clone()));
            map.push((format!("{}_freq", id_prefix), band.freq.as_ptr(), group.clone()));
            map.push((format!("{}_gain", id_prefix), band.gain.as_ptr(), group.clone()));
            map.push((format!("{}_q", id_prefix), band.q.as_ptr(), group.clone()));
        }

        map
    }

    fn serialize_fields(&self) -> BTreeMap<String, String> {
        let mut map = BTreeMap::new();
        let serialized = nih_plug::params::persist::PersistentField::map(&self.editor_state, |v| serde_json::to_string(v).unwrap());
        map.insert("editor".to_string(), serialized);
        map
    }

    fn deserialize_fields(&self, serialized: &BTreeMap<String, String>) {
        if let Some(serialized_value) = serialized.get("editor") {
            if let Ok(deserialized) = serde_json::from_str(serialized_value) {
                nih_plug::params::persist::PersistentField::set(&self.editor_state, deserialized);
            }
        }
    }
}
