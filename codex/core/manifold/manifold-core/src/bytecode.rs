use serde::Deserialize;

use crate::error::ProgramError;

pub const BYTECODE_SCHEMA: &str = "manifold.bytecode.v1";
pub const ABI_MAJOR: u64 = 0;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BytecodeProgram {
    pub schema_version: String,
    pub kernel_semver: String,
    pub content_hash: u32,
    pub id: String,
    pub name: String,
    pub sample_rate_policy: String,
    pub instructions: Vec<RawInstruction>,
    pub safety: SafetyManifest,
    #[serde(default)]
    pub graph: Option<serde_json::Value>,
}

/// Untyped instruction as stored. Converted to typed `Action`s by the VM,
/// which is where unknown opcodes/fields are rejected (never here).
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RawInstruction {
    pub op: String,
    #[serde(default)]
    pub event: Option<String>,
    #[serde(default)]
    pub threshold: Option<f32>,
    #[serde(default)]
    pub target: Option<String>,
    #[serde(default)]
    pub value: Option<f32>,
    #[serde(default)]
    pub factor: Option<f32>,
    #[serde(default)]
    pub node: Option<String>,
    #[serde(default)]
    pub max: Option<f32>,
    #[serde(default)]
    pub division: Option<String>,
    #[serde(default)]
    pub density: Option<f32>,
    #[serde(default)]
    pub amount: Option<f32>,
    #[serde(default)]
    pub from: Option<String>,
    #[serde(default)]
    pub to: Option<String>,
    #[serde(default)]
    pub duration_ms: Option<f32>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SafetyManifest {
    pub max_feedback: f32,
    pub max_filter_q: f32,
    pub max_spray_density: f32,
    pub max_delay_ms: f32,
    pub min_ramp_ms: f32,
    pub cpu_budget_class: String,
    pub requires_limiter: bool,
    pub has_unsafe_cycles: bool,
}

/// Structural gate (spec §5). Does NOT recompute the FNV content hash.
pub fn validate_header(p: &BytecodeProgram) -> Result<(), ProgramError> {
    if p.schema_version != BYTECODE_SCHEMA {
        return Err(ProgramError::SchemaMismatch {
            found: p.schema_version.clone(),
        });
    }
    let major = p
        .kernel_semver
        .split('.')
        .next()
        .and_then(|s| s.parse::<u64>().ok())
        .unwrap_or(u64::MAX);
    if major != ABI_MAJOR {
        return Err(ProgramError::KernelSemverMismatch {
            found: p.kernel_semver.clone(),
        });
    }
    if p.safety.has_unsafe_cycles {
        return Err(ProgramError::UnsafeCycles);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    const VOID_GLASS: &str = include_str!("../tests/fixtures/void-glass.bytecode.json");

    #[test]
    fn deserializes_void_glass_fixture() {
        let program: BytecodeProgram = serde_json::from_str(VOID_GLASS).unwrap();
        assert_eq!(program.schema_version, "manifold.bytecode.v1");
        assert_eq!(program.name, "VoidGlass");
        assert!(program.instructions.len() >= 8);
        assert!(!program.safety.has_unsafe_cycles);
        assert!((program.safety.max_feedback - 0.58).abs() < 1e-6);
        assert_eq!(program.instructions[0].op, "MATCH_EVENT");
    }

    #[test]
    fn rejects_wrong_schema() {
        let mut p: BytecodeProgram = serde_json::from_str(VOID_GLASS).unwrap();
        p.schema_version = "manifold.bytecode.v2".into();
        assert!(matches!(
            validate_header(&p),
            Err(ProgramError::SchemaMismatch { .. })
        ));
    }

    #[test]
    fn rejects_incompatible_semver() {
        let mut p: BytecodeProgram = serde_json::from_str(VOID_GLASS).unwrap();
        p.kernel_semver = "1.0.0".into();
        assert!(matches!(
            validate_header(&p),
            Err(ProgramError::KernelSemverMismatch { .. })
        ));
    }

    #[test]
    fn rejects_unsafe_cycles() {
        let mut p: BytecodeProgram = serde_json::from_str(VOID_GLASS).unwrap();
        p.safety.has_unsafe_cycles = true;
        assert_eq!(validate_header(&p), Err(ProgramError::UnsafeCycles));
    }

    #[test]
    fn accepts_valid_header() {
        let p: BytecodeProgram = serde_json::from_str(VOID_GLASS).unwrap();
        assert!(validate_header(&p).is_ok());
    }
}
