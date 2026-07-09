//! Factory presets: characteristic macro values + embedded bytecode program.
//! Macro values mirror `presets/manifold/*.json`; bytecode mirrors the
//! `manifold-core` fixtures so a chip both retunes macros and swaps the program.

pub struct Preset {
    pub name: &'static str,
    pub size: f32,
    pub reactivity: f32,
    pub stability: f32,
    pub bytecode: &'static str,
}

macro_rules! fixture {
    ($f:literal) => {
        include_str!(concat!("../../manifold-core/tests/fixtures/", $f))
    };
}

pub const PRESETS: [Preset; 5] = [
    Preset { name: "void-glass",         size: 0.55, reactivity: 0.65, stability: 0.72, bytecode: fixture!("void-glass.bytecode.json") },
    Preset { name: "ice-circuit",        size: 0.52, reactivity: 0.74, stability: 0.70, bytecode: fixture!("ice-circuit.bytecode.json") },
    Preset { name: "ash-lung",           size: 0.80, reactivity: 0.50, stability: 0.82, bytecode: fixture!("ash-lung.bytecode.json") },
    Preset { name: "cathedral-of-teeth", size: 0.70, reactivity: 0.62, stability: 0.72, bytecode: fixture!("cathedral-of-teeth.bytecode.json") },
    Preset { name: "substrate-maw",      size: 0.66, reactivity: 0.78, stability: 0.60, bytecode: fixture!("substrate-maw.bytecode.json") },
];

pub fn by_name(name: &str) -> Option<&'static Preset> {
    PRESETS.iter().find(|p| p.name == name)
}

use std::sync::atomic::{AtomicI32, Ordering};

/// Audio↔GUI preset-swap handshake: the editor stores a PRESETS index, the
/// audio thread consumes it exactly once per buffer. -1 means "nothing pending".
pub fn take_pending(cell: &AtomicI32) -> Option<usize> {
    let v = cell.swap(-1, Ordering::AcqRel);
    if v >= 0 { Some(v as usize) } else { None }
}

#[cfg(test)]
mod tests {
    use super::*;
    use manifold_core::BytecodeProgram;

    #[test]
    fn five_presets_present_and_named() {
        let names: Vec<_> = PRESETS.iter().map(|p| p.name).collect();
        assert_eq!(
            names,
            vec!["void-glass", "ice-circuit", "ash-lung", "cathedral-of-teeth", "substrate-maw"]
        );
    }

    #[test]
    fn every_preset_bytecode_parses() {
        for p in PRESETS.iter() {
            serde_json::from_str::<BytecodeProgram>(p.bytecode)
                .unwrap_or_else(|e| panic!("{} bytecode invalid: {e}", p.name));
        }
    }

    #[test]
    fn macros_in_unit_range() {
        for p in PRESETS.iter() {
            for v in [p.size, p.reactivity, p.stability] {
                assert!((0.0..=1.0).contains(&v), "{} macro out of range: {v}", p.name);
            }
        }
    }

    #[test]
    fn lookup_by_name() {
        assert!(by_name("substrate-maw").is_some());
        assert!(by_name("nope").is_none());
    }

    #[test]
    fn take_pending_consumes_once() {
        use std::sync::atomic::AtomicI32;
        let cell = AtomicI32::new(-1);
        assert_eq!(take_pending(&cell), None);
        cell.store(3, std::sync::atomic::Ordering::Release);
        assert_eq!(take_pending(&cell), Some(3));
        assert_eq!(take_pending(&cell), None); // consumed — resets to -1
    }

    #[test]
    fn take_pending_ignores_negative_garbage() {
        use std::sync::atomic::AtomicI32;
        let cell = AtomicI32::new(-7);
        assert_eq!(take_pending(&cell), None);
        // and it still resets the cell to -1 so garbage doesn't persist
        assert_eq!(cell.load(std::sync::atomic::Ordering::Acquire), -1);
    }
}
