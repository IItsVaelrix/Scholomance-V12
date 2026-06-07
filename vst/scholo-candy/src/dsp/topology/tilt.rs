use crate::dsp::filter_band::FilterType;
use super::Topology;
use super::rbj::RbjState;

#[derive(Debug, Clone, Copy, Default)]
pub struct TiltState {
    low_shelf: RbjState,
    high_shelf: RbjState,
}

impl TiltState {
    pub fn new() -> Self {
        Self::default()
    }
}

impl Topology for TiltState {
    #[inline]
    fn process(&mut self, input: f32) -> f32 {
        let v1 = self.low_shelf.process(input);
        self.high_shelf.process(v1)
    }

    fn magnitude_response(&self, freq_hz: f32, sample_rate: f32) -> f32 {
        self.low_shelf.magnitude_response(freq_hz, sample_rate) *
        self.high_shelf.magnitude_response(freq_hz, sample_rate)
    }

    fn reset(&mut self) {
        self.low_shelf.reset();
        self.high_shelf.reset();
    }

    fn update_params(&mut self, _filter_type: FilterType, freq: f32, q: f32, gain: f32, sample_rate: f32) {
        // A tilt filter cuts lows and boosts highs (or vice versa).
        // Low shelf gets -gain, High shelf gets +gain
        self.low_shelf.update_params(FilterType::LowShelf, freq, q, -gain, sample_rate);
        self.high_shelf.update_params(FilterType::HighShelf, freq, q, gain, sample_rate);
    }
}
