pub mod topology;
pub mod filter_band;
pub mod analyzer;
pub mod codec;
pub mod ms;
pub mod oversample;

use filter_band::{FilterBand, FilterType};
use oversample::Oversampler2x;

pub struct ScholoCandyEq {
    pub bands: Vec<FilterBand>,
    pub output_gain_db: f32,
    pub oversample_enabled: bool,
    sample_rate: f32,
    os_l: Oversampler2x,
    os_r: Oversampler2x,
}

impl ScholoCandyEq {
    pub fn new(sample_rate: f32) -> Self {
        let count = crate::bands::BandCatalog::count();
        let mut bands = Vec::with_capacity(count);
        for _ in 0..count {
            bands.push(FilterBand::new(sample_rate));
        }
        
        Self {
            bands,
            output_gain_db: 0.0,
            oversample_enabled: true,
            sample_rate,
            os_l: Oversampler2x::new(),
            os_r: Oversampler2x::new(),
        }
    }

    pub fn set_sample_rate(&mut self, sample_rate: f32) {
        self.sample_rate = sample_rate;
        let band_sr = if self.oversample_enabled { sample_rate * 2.0 } else { sample_rate };
        for band in &mut self.bands {
            band.set_sample_rate(band_sr);
        }
    }
    
    /// Processing latency in samples that must be reported to the host so PDC can
    /// time-align this track. Non-zero only while oversampling (linear-phase FIR).
    pub fn latency_samples(&self) -> u32 {
        if self.oversample_enabled {
            oversample::Oversampler2x::LATENCY_SAMPLES
        } else {
            0
        }
    }

    pub fn set_oversample(&mut self, enabled: bool) {
        if self.oversample_enabled != enabled {
            self.oversample_enabled = enabled;
            self.set_sample_rate(self.sample_rate); // Re-calculate sample rate for bands
            self.os_l.reset();
            self.os_r.reset();
        }
    }

    pub fn magnitude_response(&self, freq_hz: f32) -> f32 {
        let mut mag = 10.0_f32.powf(self.output_gain_db / 20.0);
        for band in &self.bands {
            if band.enabled {
                mag *= band.magnitude_response(freq_hz);
            }
        }
        mag
    }

    pub fn process_block(&mut self, left: &mut [f32], right: &mut [f32]) {
        let len = left.len().min(right.len());
        let out_gain = 10.0_f32.powf(self.output_gain_db / 20.0);

        // To avoid borrow checker issues with `self.bands` inside a closure,
        // we can write a small inline block for processing single samples.
        // Wait, if we use `os_l.process`, it takes a closure `|s| self.process_sample_mono(s)`.
        // But `self` is borrowed. Instead, we can process L and R separately, but bands are stereo!
        // Oversampler currently takes a closure. Let's process stereo simultaneously inside a custom loop 
        // without the closure to avoid double-borrow, OR update Oversampler2x to be stereo!
        
        if self.oversample_enabled {
            for i in 0..len {
                let mut l_in = left[i];
                let mut r_in = right[i];
                
                let (mut out_l, mut out_r) = self.os_l.process_stereo(&mut self.os_r, l_in, r_in, |mut l, mut r| {
                    let (mut m, mut s) = crate::dsp::ms::encode_ms(l, r);
                    for band in &mut self.bands {
                        if band.enabled {
                            let (ol, or, om, os) = band.process_routed(l, r, m, s);
                            l = ol; r = or; m = om; s = os;
                        }
                    }
                    (l, r)
                });
                
                left[i] = out_l * out_gain;
                right[i] = out_r * out_gain;
            }
        } else {
            for i in 0..len {
                let mut l = left[i];
                let mut r = right[i];
                let (mut m, mut s) = crate::dsp::ms::encode_ms(l, r);
                
                for band in &mut self.bands {
                    if band.enabled {
                        let (ol, or, om, os) = band.process_routed(l, r, m, s);
                        l = ol; r = or; m = om; s = os;
                    }
                }
                
                left[i] = l * out_gain;
                right[i] = r * out_gain;
            }
        }
    }
}
