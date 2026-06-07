// history.rs handles undo/redo and A/B states via safe parameter snapshots

use crate::params::ScholoCandyParams;
use crate::dsp::filter_band::{ChannelKind, FilterType};
use nih_plug::prelude::{Enum, ParamSetter};

#[derive(Clone)]
pub struct ParamSnapshot {
    // This will hold the serialized state or raw values of all parameters
    pub output_gain: f32,
    pub bands: Vec<BandSnapshot>,
}

#[derive(Clone)]
pub struct BandSnapshot {
    pub enabled: bool,
    pub filter_type: i32,
    pub channel: i32,
    pub freq: f32,
    pub gain: f32,
    pub q: f32,
}

pub struct HistoryState {
    pub undo_stack: Vec<ParamSnapshot>,
    pub redo_stack: Vec<ParamSnapshot>,
    pub state_a: Option<ParamSnapshot>,
    pub state_b: Option<ParamSnapshot>,
    pub is_b_active: bool,
}

impl HistoryState {
    pub fn new() -> Self {
        Self {
            undo_stack: Vec::new(),
            redo_stack: Vec::new(),
            state_a: None,
            state_b: None,
            is_b_active: false,
        }
    }

    pub fn capture_snapshot(&self, params: &ScholoCandyParams) -> ParamSnapshot {
        let mut bands = Vec::new();
        for b in &params.bands {
            bands.push(BandSnapshot {
                enabled: b.enabled.value(),
                filter_type: b.filter_type.value() as i32,
                channel: b.channel.value() as i32,
                freq: b.freq.value(),
                gain: b.gain.value(),
                q: b.q.value(),
            });
        }
        ParamSnapshot {
            output_gain: params.output_gain.value(),
            bands,
        }
    }

    pub fn push_undo(&mut self, params: &ScholoCandyParams) {
        let snap = self.capture_snapshot(params);
        self.undo_stack.push(snap);
        if self.undo_stack.len() > 32 {
            self.undo_stack.remove(0);
        }
        self.redo_stack.clear();
    }

    pub fn pop_undo(&mut self, params: &ScholoCandyParams) -> Option<ParamSnapshot> {
        if let Some(snap) = self.undo_stack.pop() {
            let current = self.capture_snapshot(params);
            self.redo_stack.push(current);
            return Some(snap);
        }
        None
    }

    pub fn pop_redo(&mut self, params: &ScholoCandyParams) -> Option<ParamSnapshot> {
        if let Some(snap) = self.redo_stack.pop() {
            let current = self.capture_snapshot(params);
            self.undo_stack.push(current);
            return Some(snap);
        }
        None
    }

    pub fn swap_ab(&mut self, params: &ScholoCandyParams) -> Option<ParamSnapshot> {
        let current = self.capture_snapshot(params);
        if self.is_b_active {
            self.state_b = Some(current);
            self.is_b_active = false;
            self.state_a.clone()
        } else {
            self.state_a = Some(current);
            self.is_b_active = true;
            self.state_b.clone()
        }
    }
}

pub fn apply_snapshot(snap: &ParamSnapshot, params: &ScholoCandyParams, setter: &ParamSetter) {
    setter.begin_set_parameter(&params.output_gain);
    setter.set_parameter(&params.output_gain, snap.output_gain);
    setter.end_set_parameter(&params.output_gain);

    for (i, b) in params.bands.iter().enumerate() {
        if i >= snap.bands.len() { break; }
        let s = &snap.bands[i];
        
        setter.begin_set_parameter(&b.enabled);
        setter.set_parameter(&b.enabled, s.enabled);
        setter.end_set_parameter(&b.enabled);

        setter.begin_set_parameter(&b.filter_type);
        // We know it casts directly from i32 if the EnumParam logic matches,
        // but `nih_plug` Enum trait has `from_index`.
        if let Some(t) = FilterType::from_index(s.filter_type as usize) {
            setter.set_parameter(&b.filter_type, t);
        }
        setter.end_set_parameter(&b.filter_type);

        setter.begin_set_parameter(&b.channel);
        if let Some(c) = ChannelKind::from_index(s.channel as usize) {
            setter.set_parameter(&b.channel, c);
        }
        setter.end_set_parameter(&b.channel);

        setter.begin_set_parameter(&b.freq);
        setter.set_parameter(&b.freq, s.freq);
        setter.end_set_parameter(&b.freq);

        setter.begin_set_parameter(&b.gain);
        setter.set_parameter(&b.gain, s.gain);
        setter.end_set_parameter(&b.gain);

        setter.begin_set_parameter(&b.q);
        setter.set_parameter(&b.q, s.q);
        setter.end_set_parameter(&b.q);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use nih_plug::prelude::Param;

    #[test]
    fn test_undo_ring_caps_at_32() {
        let params = ScholoCandyParams::default();
        let mut history = HistoryState::new();
        
        for _ in 0..40 {
            history.push_undo(&params);
        }
        
        assert_eq!(history.undo_stack.len(), 32);
    }

    #[test]
    fn test_ab_swap_preserves_parameters() {
        let params = ScholoCandyParams::default();
        let mut history = HistoryState::new();
        
        // Let's create a distinct snapshot by mocking
        let mut snap_a = history.capture_snapshot(&params);
        snap_a.bands[0].gain = 5.0; // Mock change for state A
        
        let mut snap_b = history.capture_snapshot(&params);
        snap_b.bands[0].gain = -10.0; // Mock change for state B
        
        // Manually place them in history
        history.state_a = Some(snap_a);
        history.state_b = Some(snap_b);
        history.is_b_active = false;
        
        // Swap to B. This should save current params to state_a and return state_b
        let result = history.swap_ab(&params);
        assert!(history.is_b_active);
        
        // result should be the old state_b, which has gain = -10.0
        assert_eq!(result.unwrap().bands[0].gain, -10.0);
        
        // Swap back to A. Returns state_a, which is now the default params we passed in above
        let result2 = history.swap_ab(&params);
        assert!(!history.is_b_active);
        assert_eq!(result2.unwrap().bands[0].gain, 0.0); // the default gain from capture_snapshot
    }
}
