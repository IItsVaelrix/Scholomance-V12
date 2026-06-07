use std::fs;
use serde::Deserialize;
use scholo_candy::dsp::filter_band::{FilterBand, FilterType};

#[derive(Deserialize)]
struct Params {
    #[serde(rename = "type")]
    filter_type: String,
    f0: f32,
    #[serde(rename = "Q")]
    q: f32,
    gain: f32,
}

#[derive(Deserialize)]
struct Coefficients {
    b0: f32,
    b1: f32,
    b2: f32,
    a1: f32,
    a2: f32,
}

#[derive(Deserialize)]
struct Fixture {
    params: Params,
    #[serde(rename = "sampleRate")]
    sample_rate: f32,
    #[allow(dead_code)]
    frequencies: Vec<f32>,
    coefficients: Coefficients,
    #[allow(dead_code)]
    #[serde(rename = "magnitudeResponseLinear")]
    magnitude_response_linear: Vec<f32>,
}

#[test]
fn test_dsp_no_nans() {
    let mut band = FilterBand::new(48000.0);
    band.set_params(true, FilterType::Bell, scholo_candy::dsp::filter_band::ChannelKind::Stereo, 1000.0, 24.0, 18.0);
    
    // Process impulse
    let (out_l, out_r) = band.process_stereo(1.0, 1.0);
    assert!(!out_l.is_nan());
    assert!(!out_r.is_nan());
    
    // Process silence
    for _ in 0..1000 {
        let (l, r) = band.process_stereo(0.0, 0.0);
        assert!(!l.is_nan());
        assert!(!r.is_nan());
    }
}
