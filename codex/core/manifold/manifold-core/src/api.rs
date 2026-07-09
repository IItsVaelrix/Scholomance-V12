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
