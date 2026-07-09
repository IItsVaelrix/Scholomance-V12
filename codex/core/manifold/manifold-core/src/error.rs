#[derive(Debug, PartialEq)]
pub enum ProgramError {
    SchemaMismatch { found: String },
    KernelSemverMismatch { found: String },
    UnsupportedOpcode { op: String },
    MalformedInstruction { op: String, detail: &'static str },
    UnknownEvent { event: String },
    UnknownTarget { target: String },
    UnsafeCycles,
}
