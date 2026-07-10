//! Wrapper-neutral public value types. No 128-frame assumption.

#[derive(Debug, Clone, Copy)]
pub struct PrepareConfig {
    pub sample_rate: f32,
    pub max_block_size: usize,
    pub channels: usize,
}

#[derive(Debug, Clone, Copy)]
pub struct ProcessContext {
    /// Internal-clock BPM. V1 has no host sync (PDR §4.4).
    pub bpm: f32,
    pub panic: bool,
    pub freeze: bool,
}

/// Host macro controls. These are the performer-facing knobs; the engine maps
/// them onto the low-level `ParamStore` state per block (see
/// `ManifoldCore::set_macros` for the exact mapping law). All fields 0..1.
///
/// Neutral point: `size`/`reactivity`/`stability` at 0.5 leave the bytecode
/// program's behavior untouched; `wet` at 0.7 reproduces the engine's
/// historical hardwired wet level, so old sessions sound identical.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Macros {
    /// Room scale: multiplies feedback/decay, divides absorption.
    pub size: f32,
    /// Event-system sensitivity: scales classifier confidence into dispatch.
    pub reactivity: f32,
    /// Chaos governor: caps feedback ceiling and damps scatter below 0.5.
    pub stability: f32,
    /// Wet blend level: `y = dry + wet * wet_sample` (additive wet — 0 is
    /// fully dry, 0.7 is the legacy level; documented, not an equal-power
    /// crossfade).
    pub wet: f32,
}

impl Default for Macros {
    fn default() -> Self {
        Self { size: 0.5, reactivity: 0.5, stability: 0.5, wet: 0.7 }
    }
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct ClassifiedEvent {
    pub event: &'static str,
    pub confidence: f32,
}

#[derive(Debug, Clone, Default)]
pub struct ProcessReport {
    pub events: Vec<ClassifiedEvent>,
    pub clipped: bool,
    pub cpu_class_ok: bool,
}

#[derive(Debug, PartialEq)]
pub enum PrepareError {
    InvalidSampleRate,
    InvalidBlockSize,
    InvalidChannels,
}
