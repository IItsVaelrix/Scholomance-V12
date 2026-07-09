//! Thin `wasm-bindgen` browser wrapper over `manifold-core`.
//!
//! Exposes the real Rust DSP engine to the browser. The DSL compiler stays in
//! JS (authoritative); the browser compiles DSL to `manifold.bytecode.v1` and
//! hands the bytecode JSON to `ManifoldEngine::load_program`.

use manifold_core::{
    BytecodeProgram, ManifoldCore, PrepareConfig, ProcessContext, KERNEL_SEMVER,
};
use serde::Serialize;
use wasm_bindgen::prelude::*;

#[wasm_bindgen(start)]
pub fn start() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

#[wasm_bindgen(js_name = kernelSemver)]
pub fn kernel_semver() -> String {
    KERNEL_SEMVER.to_string()
}

#[derive(Serialize)]
struct EventOut {
    event: String,
    confidence: f32,
}

/// Browser-facing handle around the pure-Rust engine.
#[wasm_bindgen]
pub struct ManifoldEngine {
    core: ManifoldCore,
    last_events: Vec<EventOut>,
    last_clipped: bool,
}

#[wasm_bindgen]
impl ManifoldEngine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            core: ManifoldCore::new(),
            last_events: Vec::new(),
            last_clipped: false,
        }
    }

    /// Allocate engine state. Must be called before `process`.
    pub fn prepare(
        &mut self,
        sample_rate: f32,
        max_block_size: usize,
        channels: usize,
    ) -> Result<(), JsValue> {
        self.core
            .prepare(PrepareConfig {
                sample_rate,
                max_block_size,
                channels,
            })
            .map_err(|e| JsValue::from_str(&format!("prepare failed: {e:?}")))
    }

    /// Load a `manifold.bytecode.v1` program from its JSON text.
    #[wasm_bindgen(js_name = loadProgram)]
    pub fn load_program(&mut self, json: &str) -> Result<(), JsValue> {
        let program: BytecodeProgram = serde_json::from_str(json)
            .map_err(|e| JsValue::from_str(&format!("bytecode parse failed: {e}")))?;
        self.core
            .load_program(program)
            .map_err(|e| JsValue::from_str(&format!("load_program rejected: {e:?}")))
    }

    /// Process one block. Returns interleaved stereo `[L0, R0, L1, R1, ...]`.
    /// Classified events for this block are available via `lastEvents()`.
    pub fn process(
        &mut self,
        in_l: &[f32],
        in_r: &[f32],
        bpm: f32,
        panic: bool,
        freeze: bool,
    ) -> Vec<f32> {
        let n = in_l.len();
        let mut out_l = vec![0.0f32; n];
        let mut out_r = vec![0.0f32; n];
        let report = self.core.process(
            in_l,
            in_r,
            &mut out_l,
            &mut out_r,
            ProcessContext { bpm, panic, freeze },
        );
        self.last_events = report
            .events
            .iter()
            .map(|e| EventOut {
                event: e.event.to_string(),
                confidence: e.confidence,
            })
            .collect();
        self.last_clipped = report.clipped;

        let mut interleaved = Vec::with_capacity(n * 2);
        for i in 0..n {
            interleaved.push(out_l[i]);
            interleaved.push(out_r[i]);
        }
        interleaved
    }

    /// Events classified during the most recent `process` call, as JSON.
    #[wasm_bindgen(js_name = lastEvents)]
    pub fn last_events(&self) -> JsValue {
        serde_wasm_bindgen::to_value(&self.last_events).unwrap_or(JsValue::NULL)
    }

    #[wasm_bindgen(js_name = lastClipped)]
    pub fn last_clipped(&self) -> bool {
        self.last_clipped
    }
}

impl Default for ManifoldEngine {
    fn default() -> Self {
        Self::new()
    }
}
