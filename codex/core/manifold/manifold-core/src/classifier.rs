use crate::api::ClassifiedEvent;
use crate::features::AudioFeatures;
use crate::vm::V1_EVENTS;

const COOLDOWN_TICKS: u32 = 3;

pub struct Classifier {
    active: [bool; 8],
    cooldown: [u32; 8],
}

impl Classifier {
    pub fn new() -> Self {
        Self {
            active: [false; 8],
            cooldown: [0; 8],
        }
    }

    pub fn classify(&mut self, f: &AudioFeatures) -> Vec<ClassifiedEvent> {
        let scores = raw_scores(f);
        let mut out = Vec::new();
        for (idx, (score, on_thresh)) in scores.iter().enumerate() {
            if self.cooldown[idx] > 0 {
                self.cooldown[idx] -= 1;
            }
            let off_thresh = on_thresh - 0.08;
            let was = self.active[idx];
            let now = if was {
                *score >= off_thresh
            } else {
                *score >= *on_thresh
            };
            self.active[idx] = now;
            if now && !was && self.cooldown[idx] == 0 {
                self.cooldown[idx] = COOLDOWN_TICKS;
                out.push(ClassifiedEvent {
                    event: V1_EVENTS[idx],
                    confidence: round2(*score),
                });
            }
        }
        out
    }
}

impl Default for Classifier {
    fn default() -> Self {
        Self::new()
    }
}

fn c01(v: f32) -> f32 {
    if v.is_finite() {
        v.clamp(0.0, 1.0)
    } else {
        0.0
    }
}
fn avg(v: &[f32]) -> f32 {
    v.iter().sum::<f32>() / v.len() as f32
}
fn round2(v: f32) -> f32 {
    (v * 100.0).round() / 100.0
}

/// (score, on-threshold) per V1 event, indexed like `V1_EVENTS`.
fn raw_scores(f: &AudioFeatures) -> [(f32, f32); 8] {
    let sub = avg(&[
        c01(f.low_energy),
        c01(f.transient_sharpness),
        c01(f.crest_factor),
    ]);
    let full = avg(&[
        c01(f.rms),
        c01(f.low_energy),
        c01(f.high_energy),
        c01(f.transient_sharpness),
    ]);
    let high = avg(&[
        c01(f.high_energy),
        c01(f.spectral_flux),
        c01(f.spectral_centroid),
    ]);
    let sustain = avg(&[c01(f.harmonicity), c01(f.rms)]);
    let wide = avg(&[c01(f.input_width), c01(f.high_energy), c01(f.spectral_flux)]);
    let vocal = avg(&[
        c01(f.harmonicity),
        c01(f.mid_energy),
        c01(f.spectral_centroid),
    ]);
    let silence = avg(&[
        1.0 - c01(f.rms),
        1.0 - c01(f.peak),
        1.0 - c01(f.spectral_flux),
    ]);
    let dense = avg(&[
        c01(f.rms),
        c01(f.spectral_flux),
        c01(f.mid_energy),
        c01(f.high_energy),
    ]);
    [
        (sub, 0.60),
        (full, 0.70),
        (high, 0.65),
        (sustain, 0.55),
        (wide, 0.62),
        (vocal, 0.62),
        (silence, 0.78),
        (dense, 0.66),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::features::AudioFeatures;

    fn loud() -> AudioFeatures {
        AudioFeatures {
            rms: 0.9,
            peak: 0.95,
            crest_factor: 0.8,
            spectral_centroid: 0.3,
            spectral_flux: 0.2,
            low_energy: 0.9,
            mid_energy: 0.8,
            high_energy: 0.4,
            transient_sharpness: 0.9,
            harmonicity: 0.9,
            input_width: 0.2,
        }
    }

    #[test]
    fn detects_sub_transient_on_low_heavy_hit() {
        let mut c = Classifier::new();
        let events = c.classify(&loud());
        assert!(events.iter().any(|e| e.event == "sub_transient"));
    }

    #[test]
    fn detects_silence_gap() {
        let mut c = Classifier::new();
        let f = AudioFeatures::default();
        let events = c.classify(&f);
        assert!(events.iter().any(|e| e.event == "silence_gap"));
    }

    #[test]
    fn cooldown_prevents_reflicker() {
        let mut c = Classifier::new();
        let f = loud();
        let first = c.classify(&f);
        let second = c.classify(&f);
        let count_sub =
            |v: &Vec<ClassifiedEvent>| v.iter().filter(|e| e.event == "sub_transient").count();
        assert_eq!(count_sub(&first), 1);
        assert_eq!(count_sub(&second), 0);
    }
}
