use std::f32::consts::PI;
use crate::dsp::filter_band::FilterType;
use super::Topology;

#[derive(Debug, Clone, Copy)]
pub struct RbjCoeffs {
    pub b0: f32,
    pub b1: f32,
    pub b2: f32,
    pub a1: f32,
    pub a2: f32,
}

impl Default for RbjCoeffs {
    fn default() -> Self {
        Self { b0: 1.0, b1: 0.0, b2: 0.0, a1: 0.0, a2: 0.0 }
    }
}

impl RbjCoeffs {
    pub fn magnitude_response(&self, freq_hz: f32, sample_rate: f32) -> f32 {
        let w = 2.0 * PI * freq_hz / sample_rate;
        let cos_w = w.cos();
        let cos_2w = (2.0 * w).cos();

        let num = self.b0 * self.b0
            + self.b1 * self.b1
            + self.b2 * self.b2
            + 2.0 * cos_w * (self.b0 * self.b1 + self.b1 * self.b2)
            + 2.0 * cos_2w * (self.b0 * self.b2);

        let den = 1.0
            + self.a1 * self.a1
            + self.a2 * self.a2
            + 2.0 * cos_w * (self.a1 + self.a1 * self.a2)
            + 2.0 * cos_2w * self.a2;

        (num / den).sqrt()
    }
}

#[derive(Debug, Clone, Copy, Default)]
pub struct RbjState {
    coeffs: RbjCoeffs,
    z1: f32,
    z2: f32,
}

impl RbjState {
    pub fn new() -> Self {
        Self::default()
    }
}

impl Topology for RbjState {
    #[inline]
    fn process(&mut self, input: f32) -> f32 {
        let output = self.coeffs.b0 * input + self.z1;
        self.z1 = super::flush_denormal(self.coeffs.b1 * input - self.coeffs.a1 * output + self.z2);
        self.z2 = super::flush_denormal(self.coeffs.b2 * input - self.coeffs.a2 * output);

        output
    }

    fn magnitude_response(&self, freq_hz: f32, sample_rate: f32) -> f32 {
        self.coeffs.magnitude_response(freq_hz, sample_rate)
    }

    fn reset(&mut self) {
        self.z1 = 0.0;
        self.z2 = 0.0;
    }

    fn update_params(&mut self, filter_type: FilterType, freq: f32, q: f32, gain: f32, sample_rate: f32) {
        let w0 = 2.0 * PI * freq / sample_rate;
        let alpha = w0.sin() / (2.0 * q);
        let a = 10.0_f32.powf(gain / 40.0);

        let (b0, b1, b2, a0, a1, a2) = match filter_type {
            FilterType::Bell => {
                (1.0 + alpha * a, -2.0 * w0.cos(), 1.0 - alpha * a, 1.0 + alpha / a, -2.0 * w0.cos(), 1.0 - alpha / a)
            }
            FilterType::LowPass => {
                let cos_w0 = w0.cos();
                ((1.0 - cos_w0) / 2.0, 1.0 - cos_w0, (1.0 - cos_w0) / 2.0, 1.0 + alpha, -2.0 * cos_w0, 1.0 - alpha)
            }
            FilterType::HighPass => {
                let cos_w0 = w0.cos();
                ((1.0 + cos_w0) / 2.0, -(1.0 + cos_w0), (1.0 + cos_w0) / 2.0, 1.0 + alpha, -2.0 * cos_w0, 1.0 - alpha)
            }
            FilterType::Notch => {
                let cos_w0 = w0.cos();
                (1.0, -2.0 * cos_w0, 1.0, 1.0 + alpha, -2.0 * cos_w0, 1.0 - alpha)
            }
            FilterType::BandPass => {
                let cos_w0 = w0.cos();
                (alpha, 0.0, -alpha, 1.0 + alpha, -2.0 * cos_w0, 1.0 - alpha)
            }
            FilterType::AllPass => {
                let cos_w0 = w0.cos();
                (1.0 - alpha, -2.0 * cos_w0, 1.0 + alpha, 1.0 + alpha, -2.0 * cos_w0, 1.0 - alpha)
            }
            FilterType::LowShelf => {
                let a_sqrt = a.sqrt();
                let cos_w0 = w0.cos();
                let a_plus_1 = a + 1.0;
                let a_minus_1 = a - 1.0;
                let two_sqrt_a_alpha = 2.0 * a_sqrt * alpha;
                
                (a * (a_plus_1 - a_minus_1 * cos_w0 + two_sqrt_a_alpha),
                 2.0 * a * (a_minus_1 - a_plus_1 * cos_w0),
                 a * (a_plus_1 - a_minus_1 * cos_w0 - two_sqrt_a_alpha),
                 a_plus_1 + a_minus_1 * cos_w0 + two_sqrt_a_alpha,
                 -2.0 * (a_minus_1 + a_plus_1 * cos_w0),
                 a_plus_1 + a_minus_1 * cos_w0 - two_sqrt_a_alpha)
            }
            FilterType::HighShelf => {
                let a_sqrt = a.sqrt();
                let cos_w0 = w0.cos();
                let a_plus_1 = a + 1.0;
                let a_minus_1 = a - 1.0;
                let two_sqrt_a_alpha = 2.0 * a_sqrt * alpha;
                
                (a * (a_plus_1 + a_minus_1 * cos_w0 + two_sqrt_a_alpha),
                 -2.0 * a * (a_minus_1 + a_plus_1 * cos_w0),
                 a * (a_plus_1 + a_minus_1 * cos_w0 - two_sqrt_a_alpha),
                 a_plus_1 - a_minus_1 * cos_w0 + two_sqrt_a_alpha,
                 2.0 * (a_minus_1 - a_plus_1 * cos_w0),
                 a_plus_1 - a_minus_1 * cos_w0 - two_sqrt_a_alpha)
            }
            _ => (1.0, 0.0, 0.0, 1.0, 0.0, 0.0)
        };

        self.coeffs.b0 = b0 / a0;
        self.coeffs.b1 = b1 / a0;
        self.coeffs.b2 = b2 / a0;
        self.coeffs.a1 = a1 / a0;
        self.coeffs.a2 = a2 / a0;
    }
}
