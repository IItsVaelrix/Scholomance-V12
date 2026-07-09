pub struct OutputRenderer;
impl OutputRenderer {
    /// Blend wet (mono) into dry L/R with stereo width from a decorrelated split.
    pub fn render(dry_l: f32, dry_r: f32, wet: f32, width: f32) -> (f32, f32) {
        let w = width.clamp(0.0, 1.0);
        let l = dry_l + wet * (1.0 + w * 0.5);
        let r = dry_r + wet * (1.0 - w * 0.5);
        (l, r)
    }
}
