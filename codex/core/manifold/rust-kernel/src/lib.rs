use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

const BYTECODE_SCHEMA: &str = "manifold.bytecode.v1";
const KERNEL_SEMVER: &str = "0.1.0";

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct CompileResponse {
    ok: bool,
    program: Option<CompiledProgram>,
    errors: Vec<KernelError>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct CompiledProgram {
    schema_version: &'static str,
    kernel_semver: &'static str,
    content_hash: u32,
    id: String,
    name: String,
    sample_rate_policy: &'static str,
    instructions: Vec<Instruction>,
    safety: SafetyManifest,
}

#[derive(Debug, Serialize)]
#[serde(tag = "op")]
enum Instruction {
    #[serde(rename = "MATCH_EVENT")]
    MatchEvent { event: String, threshold: f32 },
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SafetyManifest {
    max_feedback: f32,
    max_filter_q: f32,
    max_spray_density: f32,
    max_delay_ms: u32,
    min_ramp_ms: u32,
    cpu_budget_class: &'static str,
    requires_limiter: bool,
    has_unsafe_cycles: bool,
}

#[derive(Debug, Serialize)]
struct KernelError {
    code: &'static str,
    message: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioFeatures {
    rms: f32,
    peak: f32,
    crest_factor: f32,
    spectral_centroid: f32,
    spectral_flux: f32,
    low_energy: f32,
    mid_energy: f32,
    high_energy: f32,
    transient_sharpness: f32,
    harmonicity: f32,
    input_width: f32,
}

#[derive(Debug, Serialize)]
struct ClassifiedEvent {
    event: &'static str,
    confidence: f32,
}

#[wasm_bindgen(start)]
pub fn start() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

#[wasm_bindgen(js_name = kernelSemver)]
pub fn kernel_semver() -> String {
    KERNEL_SEMVER.to_string()
}

#[wasm_bindgen(js_name = compile)]
pub fn compile(dsl_source: &str) -> JsValue {
    let response = compile_inner(dsl_source);
    serde_wasm_bindgen::to_value(&response).unwrap_or(JsValue::NULL)
}

#[wasm_bindgen(js_name = classify)]
pub fn classify(features: JsValue) -> JsValue {
    let features: AudioFeatures = match serde_wasm_bindgen::from_value(features) {
        Ok(value) => value,
        Err(_) => return serde_wasm_bindgen::to_value(&Vec::<ClassifiedEvent>::new()).unwrap_or(JsValue::NULL),
    };
    serde_wasm_bindgen::to_value(&classify_inner(&features)).unwrap_or(JsValue::NULL)
}

fn compile_inner(dsl_source: &str) -> CompileResponse {
    let Some(name) = parse_name(dsl_source) else {
        return CompileResponse {
            ok: false,
            program: None,
            errors: vec![KernelError {
                code: "MANIFOLD_PARSE_FAILED",
                message: "Expected `manifold Name { ... }`".to_string(),
            }],
        };
    };

    let instructions = parse_listeners(dsl_source);
    let canonical = format!("{}:{:?}", name, instructions);
    let hash = fnv1a32(&canonical);
    CompileResponse {
        ok: true,
        program: Some(CompiledProgram {
            schema_version: BYTECODE_SCHEMA,
            kernel_semver: KERNEL_SEMVER,
            content_hash: hash,
            id: format!("MANIFOLD-{hash:08X}"),
            name,
            sample_rate_policy: "adaptive",
            instructions,
            safety: SafetyManifest {
                max_feedback: 0.58,
                max_filter_q: 12.0,
                max_spray_density: 0.0,
                max_delay_ms: 750,
                min_ramp_ms: 20,
                cpu_budget_class: "low",
                requires_limiter: true,
                has_unsafe_cycles: false,
            },
        }),
        errors: Vec::new(),
    }
}

fn parse_name(source: &str) -> Option<String> {
    let source = source.trim_start();
    let rest = source.strip_prefix("manifold ")?;
    let name = rest.split_whitespace().next()?;
    if name.is_empty() {
        return None;
    }
    Some(name.trim_matches('{').to_string())
}

fn parse_listeners(source: &str) -> Vec<Instruction> {
    source
        .lines()
        .filter_map(|line| {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() == 4 && parts[0] == "listen" && parts[2] == "threshold" {
                let threshold = parts[3].parse::<f32>().ok()?;
                Some(Instruction::MatchEvent {
                    event: parts[1].to_string(),
                    threshold,
                })
            } else {
                None
            }
        })
        .collect()
}

fn classify_inner(features: &AudioFeatures) -> Vec<ClassifiedEvent> {
    let mut events = Vec::new();
    let sub = average(&[
        clamp01(features.low_energy),
        clamp01(features.transient_sharpness),
        clamp01(features.crest_factor),
    ]) - 0.01;
    if sub >= 0.60 {
        events.push(ClassifiedEvent { event: "sub_transient", confidence: round2(sub) });
    }

    let high = average(&[
        clamp01(features.high_energy),
        clamp01(features.spectral_flux),
        clamp01(features.spectral_centroid),
    ]);
    if high >= 0.65 {
        events.push(ClassifiedEvent { event: "high_crunch", confidence: round2(high) });
    }

    let sustain = average(&[clamp01(features.harmonicity), clamp01(features.rms)]) - 0.02;
    if sustain >= 0.55 {
        events.push(ClassifiedEvent { event: "harmonic_sustain", confidence: round2(sustain) });
    }

    let silence = average(&[1.0 - clamp01(features.rms), 1.0 - clamp01(features.peak), 1.0 - clamp01(features.spectral_flux)]);
    if silence >= 0.78 {
        events.push(ClassifiedEvent { event: "silence_gap", confidence: round2(silence) });
    }

    let wide = average(&[
        clamp01(features.input_width),
        clamp01(features.high_energy),
        clamp01(features.spectral_flux),
    ]);
    if wide >= 0.62 {
        events.push(ClassifiedEvent { event: "wide_noise_burst", confidence: round2(wide) });
    }

    let dense = average(&[
        clamp01(features.rms),
        clamp01(features.spectral_flux),
        clamp01(features.mid_energy),
        clamp01(features.high_energy),
    ]) + 0.02;
    if dense >= 0.66 {
        events.push(ClassifiedEvent { event: "dense_spectral_cloud", confidence: round2(dense) });
    }

    events
}

fn average(values: &[f32]) -> f32 {
    values.iter().sum::<f32>() / values.len() as f32
}

fn clamp01(value: f32) -> f32 {
    if value.is_finite() {
        value.clamp(0.0, 1.0)
    } else {
        0.0
    }
}

fn round2(value: f32) -> f32 {
    (value * 100.0).round() / 100.0
}

fn fnv1a32(value: &str) -> u32 {
    let mut hash = 2_166_136_261u32;
    for byte in value.as_bytes() {
        hash ^= *byte as u32;
        hash = hash.wrapping_mul(16_777_619);
    }
    hash
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn compiles_named_manifold() {
        let response = compile_inner("manifold VoidGlass {\n listen sub_transient threshold 0.65\n}");
        assert!(response.ok);
        let program = response.program.unwrap();
        assert_eq!(program.name, "VoidGlass");
        assert_eq!(program.schema_version, BYTECODE_SCHEMA);
        assert_eq!(program.kernel_semver, KERNEL_SEMVER);
    }

    #[test]
    fn rejects_non_manifold_source() {
        let response = compile_inner("room Bad {}");
        assert!(!response.ok);
        assert_eq!(response.errors[0].code, "MANIFOLD_PARSE_FAILED");
    }
}
