//! Dev-only windowed runner for render verification of the vizia editor
//! (`cargo run --bin manifold_standalone --features standalone`). Headless
//! builds cannot catch layout/style regressions; this opens the real editor
//! in a window so it can be screenshotted and eyeballed against spec §2/§4.

fn main() {
    nih_plug::nih_export_standalone::<manifold_plugin::ManifoldPlugin>();
}
