pub mod rbj;
pub mod tpt_svf;
pub mod tilt;

use crate::dsp::filter_band::FilterType;

/// Flush near-zero values to zero. Applied to recursive *state* variables, which is
/// where denormals accumulate and trigger CPU spikes on the feedback path. The
/// threshold (~-300 dBFS) is far below audibility.
#[inline]
pub(crate) fn flush_denormal(x: f32) -> f32 {
    if x.abs() < 1e-15 {
        0.0
    } else {
        x
    }
}

pub trait Topology: Send + Sync {
    fn process(&mut self, input: f32) -> f32;
    fn magnitude_response(&self, freq_hz: f32, sample_rate: f32) -> f32;
    fn reset(&mut self);
    fn update_params(&mut self, filter_type: FilterType, freq: f32, q: f32, gain: f32, sample_rate: f32);
}

#[derive(Debug, Clone)]
pub enum TopologyState {
    Rbj(rbj::RbjState),
    TptSvf(tpt_svf::TptSvfState),
    Tilt(tilt::TiltState),
}

impl TopologyState {
    pub fn new(filter_type: FilterType) -> Self {
        match filter_type {
            FilterType::Tilt => Self::Tilt(tilt::TiltState::new()),
            FilterType::Bell | FilterType::LowShelf | FilterType::HighShelf 
            | FilterType::LowPass | FilterType::HighPass | FilterType::Notch
            | FilterType::BandPass | FilterType::AllPass => Self::TptSvf(tpt_svf::TptSvfState::new()),
        }
    }

    pub fn process(&mut self, input: f32) -> f32 {
        match self {
            Self::Rbj(state) => state.process(input),
            Self::TptSvf(state) => state.process(input),
            Self::Tilt(state) => state.process(input),
        }
    }

    pub fn magnitude_response(&self, freq_hz: f32, sample_rate: f32) -> f32 {
        match self {
            Self::Rbj(state) => state.magnitude_response(freq_hz, sample_rate),
            Self::TptSvf(state) => state.magnitude_response(freq_hz, sample_rate),
            Self::Tilt(state) => state.magnitude_response(freq_hz, sample_rate),
        }
    }

    pub fn reset(&mut self) {
        match self {
            Self::Rbj(state) => state.reset(),
            Self::TptSvf(state) => state.reset(),
            Self::Tilt(state) => state.reset(),
        }
    }

    pub fn update_params(&mut self, filter_type: FilterType, freq: f32, q: f32, gain: f32, sample_rate: f32) {
        match self {
            Self::Rbj(state) => state.update_params(filter_type, freq, q, gain, sample_rate),
            Self::TptSvf(state) => state.update_params(filter_type, freq, q, gain, sample_rate),
            Self::Tilt(state) => state.update_params(filter_type, freq, q, gain, sample_rate),
        }
    }
}
