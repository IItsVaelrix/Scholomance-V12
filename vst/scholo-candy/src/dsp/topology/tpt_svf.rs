use std::f32::consts::PI;
use crate::dsp::filter_band::FilterType;
use super::Topology;

#[derive(Debug, Clone, Copy, Default)]
pub struct TptSvfState {
    ic1eq: f32,
    ic2eq: f32,
    a1: f32,
    a2: f32,
    a3: f32,
    m0: f32,
    m1: f32,
    m2: f32,
    
    // For magnitude response fallback
    rbj_fallback: super::rbj::RbjState,
}

impl TptSvfState {
    pub fn new() -> Self {
        Self::default()
    }
}

impl Topology for TptSvfState {
    #[inline]
    fn process(&mut self, input: f32) -> f32 {
        let v3 = input - self.ic2eq;
        let v1 = self.a1 * self.ic1eq + self.a2 * v3;
        let v2 = self.ic2eq + self.a2 * self.ic1eq + self.a3 * v3;
        
        // Flush denormals in the recursive state (ic1eq/ic2eq), where they accumulate.
        self.ic1eq = super::flush_denormal(2.0 * v1 - self.ic1eq);
        self.ic2eq = super::flush_denormal(2.0 * v2 - self.ic2eq);

        self.m0 * input + self.m1 * v1 + self.m2 * v2
    }

    fn magnitude_response(&self, freq_hz: f32, sample_rate: f32) -> f32 {
        // Approximate the SVF magnitude with the matching RBJ biquad. The two share a
        // bilinear-transform lineage and agree closely through most of the band, but
        // they use different prewarping (RBJ alpha = sin(w0)/2Q vs SVF g = tan(w0/2),
        // k = 1/Q), so the curves diverge slightly toward Nyquist. Good enough for a
        // UI overlay; not a bit-exact match to the processed audio near Nyquist.
        self.rbj_fallback.magnitude_response(freq_hz, sample_rate)
    }

    fn reset(&mut self) {
        self.ic1eq = 0.0;
        self.ic2eq = 0.0;
        self.rbj_fallback.reset();
    }

    fn update_params(&mut self, filter_type: FilterType, freq: f32, q: f32, gain: f32, sample_rate: f32) {
        // Keep rbj_fallback updated so magnitude_response matches
        self.rbj_fallback.update_params(filter_type, freq, q, gain, sample_rate);

        let g = (PI * freq / sample_rate).tan();
        let mut k = 1.0 / q;
        let a = 10.0_f32.powf(gain / 40.0);

        let mut m0 = 0.0;
        let mut m1 = 0.0;
        let mut m2 = 0.0;

        match filter_type {
            FilterType::Bell => {
                k = 1.0 / (q * a);
                m0 = 1.0;
                m1 = k * (a * a - 1.0);
                m2 = 0.0;
            }
            FilterType::LowShelf => {
                let a_sqrt = a.sqrt();
                k = 1.0 / q;
                let g_prime = g / a_sqrt;
                let a1 = 1.0 / (1.0 + g_prime * (g_prime + k));
                let a2 = g_prime * a1;
                let a3 = g_prime * a2;
                self.a1 = a1;
                self.a2 = a2;
                self.a3 = a3;
                m0 = 1.0;
                m1 = k * (a - 1.0);
                m2 = a * a - 1.0;
            }
            FilterType::HighShelf => {
                let a_sqrt = a.sqrt();
                k = 1.0 / q;
                let g_prime = g * a_sqrt;
                let a1 = 1.0 / (1.0 + g_prime * (g_prime + k));
                let a2 = g_prime * a1;
                let a3 = g_prime * a2;
                self.a1 = a1;
                self.a2 = a2;
                self.a3 = a3;
                m0 = a * a;
                m1 = k * (1.0 - a) * a;
                m2 = 1.0 - a * a;
            }
            FilterType::LowPass => {
                m0 = 0.0;
                m1 = 0.0;
                m2 = 1.0;
            }
            FilterType::HighPass => {
                m0 = 1.0;
                m1 = -k;
                m2 = -1.0;
            }
            FilterType::BandPass => {
                m0 = 0.0;
                m1 = 1.0;
                m2 = 0.0;
            }
            FilterType::Notch => {
                m0 = 1.0;
                m1 = -k;
                m2 = 0.0;
            }
            FilterType::AllPass => {
                m0 = 1.0;
                m1 = -2.0 * k;
                m2 = 0.0;
            }
            FilterType::Tilt => {
                m0 = 1.0;
            }
        }

        if !matches!(filter_type, FilterType::LowShelf | FilterType::HighShelf) {
            self.a1 = 1.0 / (1.0 + g * (g + k));
            self.a2 = g * self.a1;
            self.a3 = g * self.a2;
        }
        
        self.m0 = m0;
        self.m1 = m1;
        self.m2 = m2;
    }
}
