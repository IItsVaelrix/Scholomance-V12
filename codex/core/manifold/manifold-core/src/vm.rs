use crate::bytecode::RawInstruction;
use crate::error::ProgramError;

pub const V1_EVENTS: [&str; 8] = [
    "sub_transient",
    "full_spectrum_impact",
    "high_crunch",
    "harmonic_sustain",
    "wide_noise_burst",
    "vocal_presence",
    "silence_gap",
    "dense_spectral_cloud",
];

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum ParamId {
    Feedback,
    DecayLow,
    AbsorptionLow,
    AbsorptionHigh,
    Scatter,
    Diffusion,
    Brightness,
    Width,
}

/// Zone prefix stripped: zones collapse to global params (PDR §16).
pub fn resolve_target(t: &str) -> Option<ParamId> {
    if t.ends_with(".absorption.low") {
        Some(ParamId::AbsorptionLow)
    } else if t.ends_with(".absorption.high") {
        Some(ParamId::AbsorptionHigh)
    } else if t.ends_with(".decay.low") {
        Some(ParamId::DecayLow)
    } else if t.ends_with(".brightness") {
        Some(ParamId::Brightness)
    } else if t.ends_with(".scatter") {
        Some(ParamId::Scatter)
    } else if t.ends_with(".diffusion") {
        Some(ParamId::Diffusion)
    } else if t.ends_with(".tail.width") || t.ends_with(".width") {
        Some(ParamId::Width)
    } else if t.ends_with(".feedback") {
        Some(ParamId::Feedback)
    } else {
        None
    }
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum SprayDivision {
    D8,
    D16,
    D32,
    D64,
}

impl SprayDivision {
    fn parse(s: &str) -> Option<Self> {
        match s {
            "1/8" => Some(Self::D8),
            "1/16" => Some(Self::D16),
            "1/32" => Some(Self::D32),
            "1/64" => Some(Self::D64),
            _ => None,
        }
    }
    /// Beats-per-division for tempo math (1/8 = 0.5 beat, 1/64 = 1/16 beat).
    pub fn beats(self) -> f32 {
        match self {
            Self::D8 => 0.5,
            Self::D16 => 0.25,
            Self::D32 => 0.125,
            Self::D64 => 0.0625,
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub enum Action {
    RampParam {
        id: ParamId,
        value: f32,
        duration_ms: f32,
    },
    ScaleParam {
        id: ParamId,
        factor: f32,
        duration_ms: f32,
    },
    ClampFeedback {
        max: f32,
    },
    TriggerSpray {
        division: SprayDivision,
        density: f32,
        duration_ms: f32,
    },
    BloomHarmonic {
        amount: f32,
        duration_ms: f32,
    },
    CrossfadeNode {
        duration_ms: f32,
    },
}

#[derive(Debug, Clone)]
pub struct EventBlock {
    pub event: String,
    pub threshold: f32,
    pub actions: Vec<Action>,
}

macro_rules! req {
    ($opt:expr, $op:expr, $field:literal) => {
        $opt.ok_or(ProgramError::MalformedInstruction {
            op: $op.into(),
            detail: $field,
        })?
    };
}

pub fn compile_blocks(instrs: &[RawInstruction]) -> Result<Vec<EventBlock>, ProgramError> {
    let mut blocks: Vec<EventBlock> = Vec::new();
    for i in instrs {
        match i.op.as_str() {
            "MATCH_EVENT" => {
                let event = req!(i.event.clone(), "MATCH_EVENT", "event");
                let threshold = req!(i.threshold, "MATCH_EVENT", "threshold");
                if !V1_EVENTS.contains(&event.as_str()) {
                    return Err(ProgramError::UnknownEvent { event });
                }
                blocks.push(EventBlock {
                    event,
                    threshold,
                    actions: Vec::new(),
                });
            }
            other => {
                let action = compile_action(other, i)?;
                let block = blocks
                    .last_mut()
                    .ok_or(ProgramError::MalformedInstruction {
                        op: other.into(),
                        detail: "action before MATCH_EVENT",
                    })?;
                block.actions.push(action);
            }
        }
    }
    Ok(blocks)
}

fn compile_action(op: &str, i: &RawInstruction) -> Result<Action, ProgramError> {
    match op {
        "RAMP_PARAM" => {
            let target = req!(i.target.clone(), op, "target");
            let id = resolve_target(&target).ok_or(ProgramError::UnknownTarget { target })?;
            Ok(Action::RampParam {
                id,
                value: req!(i.value, op, "value"),
                duration_ms: req!(i.duration_ms, op, "durationMs"),
            })
        }
        "SCALE_PARAM" => {
            let target = req!(i.target.clone(), op, "target");
            let id = resolve_target(&target).ok_or(ProgramError::UnknownTarget { target })?;
            Ok(Action::ScaleParam {
                id,
                factor: req!(i.factor, op, "factor"),
                duration_ms: req!(i.duration_ms, op, "durationMs"),
            })
        }
        "CLAMP_FEEDBACK" => {
            let node = req!(i.node.clone(), op, "node");
            if resolve_target(&node) != Some(ParamId::Feedback) {
                return Err(ProgramError::UnknownTarget { target: node });
            }
            Ok(Action::ClampFeedback {
                max: req!(i.max, op, "max"),
            })
        }
        "TRIGGER_SPRAY" => {
            let div = req!(i.division.clone(), op, "division");
            let division =
                SprayDivision::parse(&div).ok_or(ProgramError::MalformedInstruction {
                    op: op.into(),
                    detail: "division",
                })?;
            Ok(Action::TriggerSpray {
                division,
                density: req!(i.density, op, "density"),
                duration_ms: req!(i.duration_ms, op, "durationMs"),
            })
        }
        "BLOOM_HARMONIC" => Ok(Action::BloomHarmonic {
            amount: req!(i.amount, op, "amount"),
            duration_ms: req!(i.duration_ms, op, "durationMs"),
        }),
        "CROSSFADE_NODE" => {
            let _ = req!(i.from.clone(), op, "from");
            let _ = req!(i.to.clone(), op, "to");
            Ok(Action::CrossfadeNode {
                duration_ms: req!(i.duration_ms, op, "durationMs"),
            })
        }
        other => Err(ProgramError::UnsupportedOpcode { op: other.into() }),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::bytecode::RawInstruction;

    fn raw(op: &str) -> RawInstruction {
        RawInstruction {
            op: op.into(),
            event: None,
            threshold: None,
            target: None,
            value: None,
            factor: None,
            node: None,
            max: None,
            division: None,
            density: None,
            amount: None,
            from: None,
            to: None,
            duration_ms: None,
        }
    }

    #[test]
    fn groups_match_event_blocks() {
        let mut m = raw("MATCH_EVENT");
        m.event = Some("sub_transient".into());
        m.threshold = Some(0.65);
        let mut r = raw("RAMP_PARAM");
        r.target = Some("floor.absorption.low".into());
        r.value = Some(0.95);
        r.duration_ms = Some(60.0);
        let blocks = compile_blocks(&[m, r]).unwrap();
        assert_eq!(blocks.len(), 1);
        assert_eq!(blocks[0].event, "sub_transient");
        assert_eq!(blocks[0].actions.len(), 1);
        assert!(matches!(
            blocks[0].actions[0],
            Action::RampParam {
                id: ParamId::AbsorptionLow,
                ..
            }
        ));
    }

    #[test]
    fn rejects_unknown_opcode() {
        let mut m = raw("MATCH_EVENT");
        m.event = Some("sub_transient".into());
        m.threshold = Some(0.5);
        let bad = raw("SELF_DESTRUCT");
        assert!(matches!(
            compile_blocks(&[m, bad]),
            Err(ProgramError::UnsupportedOpcode { .. })
        ));
    }

    #[test]
    fn rejects_unknown_event() {
        let mut m = raw("MATCH_EVENT");
        m.event = Some("banana_event".into());
        m.threshold = Some(0.5);
        assert!(matches!(
            compile_blocks(&[m]),
            Err(ProgramError::UnknownEvent { .. })
        ));
    }

    #[test]
    fn rejects_unknown_target() {
        let mut m = raw("MATCH_EVENT");
        m.event = Some("sub_transient".into());
        m.threshold = Some(0.5);
        let mut r = raw("RAMP_PARAM");
        r.target = Some("floor.mystery".into());
        r.value = Some(0.5);
        r.duration_ms = Some(10.0);
        assert!(matches!(
            compile_blocks(&[m, r]),
            Err(ProgramError::UnknownTarget { .. })
        ));
    }

    #[test]
    fn rejects_malformed_ramp_missing_value() {
        let mut m = raw("MATCH_EVENT");
        m.event = Some("sub_transient".into());
        m.threshold = Some(0.5);
        let mut r = raw("RAMP_PARAM");
        r.target = Some("floor.feedback".into());
        r.duration_ms = Some(10.0);
        assert!(matches!(
            compile_blocks(&[m, r]),
            Err(ProgramError::MalformedInstruction { .. })
        ));
    }

    #[test]
    fn parses_spray_division() {
        let mut m = raw("MATCH_EVENT");
        m.event = Some("high_crunch".into());
        m.threshold = Some(0.55);
        let mut s = raw("TRIGGER_SPRAY");
        s.division = Some("1/64".into());
        s.density = Some(0.7);
        s.duration_ms = Some(180.0);
        let blocks = compile_blocks(&[m, s]).unwrap();
        assert!(matches!(
            blocks[0].actions[0],
            Action::TriggerSpray {
                division: SprayDivision::D64,
                ..
            }
        ));
    }
}
