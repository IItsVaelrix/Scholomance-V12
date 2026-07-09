#[derive(Debug, Clone, Copy, Default)]
pub struct AudioFeatures {
    pub rms: f32,
    pub peak: f32,
    pub crest_factor: f32,
    pub spectral_centroid: f32,
    pub spectral_flux: f32,
    pub low_energy: f32,
    pub mid_energy: f32,
    pub high_energy: f32,
    pub transient_sharpness: f32,
    pub harmonicity: f32,
    pub input_width: f32,
}

pub struct FeatureExtractor {
    prev: f32,
    lp: f32,
    prev_rms: f32,
}

impl FeatureExtractor {
    pub fn new() -> Self {
        Self {
            prev: 0.0,
            lp: 0.0,
            prev_rms: 0.0,
        }
    }

    pub fn analyze(&mut self, left: &[f32], right: &[f32]) -> AudioFeatures {
        let n = left.len().max(1);
        let mut peak = 0.0f32;
        let mut sum_sq = 0.0f32;
        let mut flux = 0.0f32;
        let mut low_sq = 0.0f32;
        let mut high_sq = 0.0f32;
        let mut side = 0.0f32;
        let mut weighted = 0.0f32;
        for (i, &lv) in left.iter().enumerate() {
            let l = sanitize(lv);
            let r = sanitize(*right.get(i).unwrap_or(&l));
            let mono = 0.5 * (l + r);
            let a = mono.abs();
            peak = peak.max(a);
            sum_sq += mono * mono;
            flux += (mono - self.prev).abs();
            self.lp = 0.05 * mono + 0.95 * self.lp;
            let low = self.lp;
            let high = mono - low;
            low_sq += low * low;
            high_sq += high * high;
            weighted += high.abs();
            side += (l - r).abs();
            self.prev = mono;
        }
        let rms = (sum_sq / n as f32).sqrt().clamp(0.0, 1.0);
        let flux = clamp01(flux / n as f32 * 4.0);
        let low_energy = clamp01((low_sq / n as f32).sqrt() * 2.0);
        let high_energy = clamp01((high_sq / n as f32).sqrt() * 2.0);
        let transient = clamp01((rms - self.prev_rms).max(0.0) * 4.0 + peak * 0.5);
        self.prev_rms = rms;
        AudioFeatures {
            rms,
            peak: clamp01(peak),
            crest_factor: clamp01(peak - rms),
            spectral_centroid: clamp01(weighted / n as f32 * 4.0),
            spectral_flux: flux,
            low_energy,
            mid_energy: clamp01(rms),
            high_energy,
            transient_sharpness: transient,
            harmonicity: clamp01(1.0 - flux * 0.5),
            input_width: clamp01(side / n as f32),
        }
    }
}

impl Default for FeatureExtractor {
    fn default() -> Self {
        Self::new()
    }
}

fn sanitize(x: f32) -> f32 {
    if x.is_finite() {
        x
    } else {
        0.0
    }
}
fn clamp01(x: f32) -> f32 {
    if x.is_finite() {
        x.clamp(0.0, 1.0)
    } else {
        0.0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn silence_has_low_energy() {
        let mut fx = FeatureExtractor::new();
        let z = [0.0f32; 128];
        let f = fx.analyze(&z, &z);
        assert!(f.rms < 0.01 && f.peak < 0.01);
        assert!(f.rms.is_finite() && f.peak.is_finite());
    }

    #[test]
    fn impulse_has_high_peak() {
        let mut fx = FeatureExtractor::new();
        let mut x = [0.0f32; 128];
        x[0] = 1.0;
        let f = fx.analyze(&x, &x);
        assert!(f.peak > 0.5);
        assert!(f.transient_sharpness > 0.0);
    }

    #[test]
    fn all_features_bounded_unit() {
        let mut fx = FeatureExtractor::new();
        let x: Vec<f32> = (0..256).map(|i| ((i as f32) * 0.3).sin()).collect();
        let f = fx.analyze(&x, &x);
        for v in [
            f.rms,
            f.peak,
            f.crest_factor,
            f.spectral_centroid,
            f.spectral_flux,
            f.low_energy,
            f.mid_energy,
            f.high_energy,
            f.transient_sharpness,
            f.harmonicity,
            f.input_width,
        ] {
            assert!((0.0..=1.0).contains(&v), "feature out of [0,1]: {v}");
        }
    }
}
