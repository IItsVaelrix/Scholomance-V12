use super::{
    bloom::ResonatorBloom, early::EarlyReflection, fdn::FdnCore, modulation::Modulation,
    renderer::OutputRenderer, splitter::InputSplitter, spray::MicroDelaySpray,
    wall_filter::WallFilterBank,
};
use crate::finite_guard;
use crate::params::ManifoldParams;
use crate::safety::{sanitize, DcBlocker, SafetyGovernor};
use crate::vm::SprayDivision;

pub struct ManifoldGraph {
    splitter: InputSplitter,
    early: EarlyReflection,
    fdn: FdnCore,
    walls: WallFilterBank,
    spray: MicroDelaySpray,
    bloom: ResonatorBloom,
    modu: Modulation,
    dc_l: DcBlocker,
    dc_r: DcBlocker,
    frozen_tail: f32,
}

impl ManifoldGraph {
    pub fn prepare(sr: f32, seed: u32) -> Self {
        Self {
            splitter: InputSplitter::new(),
            early: EarlyReflection::prepare(sr),
            fdn: FdnCore::prepare(sr),
            walls: WallFilterBank::new(),
            spray: MicroDelaySpray::prepare(sr, seed),
            bloom: ResonatorBloom::prepare(sr),
            modu: Modulation::prepare(sr),
            dc_l: DcBlocker::new(),
            dc_r: DcBlocker::new(),
            frozen_tail: 0.0,
        }
    }

    pub fn reset(&mut self) {
        self.splitter.reset();
        self.early.reset();
        self.fdn.reset();
        self.walls.reset();
        self.spray.reset();
        self.bloom.reset();
        self.modu.reset();
        self.dc_l.reset();
        self.dc_r.reset();
        self.frozen_tail = 0.0;
    }

    pub fn trigger_spray(&mut self, div: SprayDivision, density: f32, dur_ms: f32, bpm: f32) {
        self.spray.trigger(div, density, dur_ms, bpm);
    }
    pub fn trigger_bloom(&mut self, amount: f32, dur_ms: f32) {
        self.bloom.trigger(amount, dur_ms);
    }

    #[allow(clippy::too_many_arguments)]
    pub fn process_block(
        &mut self,
        in_l: &[f32],
        in_r: &[f32],
        out_l: &mut [f32],
        out_r: &mut [f32],
        p: &ManifoldParams,
        gov: &SafetyGovernor,
        wet: f32,
        freeze: bool,
    ) {
        let n = out_l.len();
        for i in 0..n {
            let l = sanitize(in_l[i]);
            let r = sanitize(*in_r.get(i).unwrap_or(&l));
            let mono = 0.5 * (l + r);

            let (low, _high) = self.splitter.split(mono);
            // Modulated early reflections (bounded LFO depth) give the tail movement.
            let mod_offset = self.modu.process(1.0 + p.diffusion * 3.0);
            let er = self.early.process(mono, mod_offset);
            let spray = self.spray.process(mono);

            // Scatter widens the diffuse feed into the reverb network.
            let scatter = p.scatter.clamp(0.0, 1.0);
            let diffuse = er * (0.6 + scatter * 0.4) + spray;
            let excitation = if freeze { 0.0 } else { diffuse + low * 0.3 };
            let mut rev = self.fdn.process(excitation, p, gov);
            if freeze {
                rev = self.frozen_tail;
            } else {
                self.frozen_tail = rev;
            }

            let shaped = self.walls.process(rev, p);
            let bloom = self.bloom.process(shaped);
            let wet_sample = gov.soft_clip(shaped + bloom);

            let (mut ol, mut or) = OutputRenderer::render(l, r, wet_sample * wet, p.width);
            ol = self.dc_l.process(gov.soft_clip(ol));
            or = self.dc_r.process(gov.soft_clip(or));
            out_l[i] = ol;
            if i < out_r.len() {
                out_r[i] = or;
            }
        }
        finite_guard!("graph.process_block", out_l);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::bytecode::SafetyManifest;
    use crate::params::ManifoldParams;
    use crate::safety::SafetyGovernor;

    fn gov() -> SafetyGovernor {
        SafetyGovernor::from_manifest(&SafetyManifest {
            max_feedback: 0.7,
            max_filter_q: 12.0,
            max_spray_density: 0.7,
            max_delay_ms: 750.0,
            min_ramp_ms: 20.0,
            cpu_budget_class: "medium".into(),
            requires_limiter: true,
            has_unsafe_cycles: false,
        })
    }

    #[test]
    fn impulse_produces_finite_reverb_tail() {
        let mut g = ManifoldGraph::prepare(48_000.0, 0xC0FFEE);
        let p = ManifoldParams {
            feedback: 0.6,
            decay_low: 0.5,
            diffusion: 0.5,
            width: 0.4,
            ..Default::default()
        };
        let gv = gov();
        let mut il = [0.0f32; 128];
        let mut ir = [0.0f32; 128];
        il[0] = 1.0;
        ir[0] = 1.0;
        let mut ol = [0.0f32; 128];
        let mut or = [0.0f32; 128];
        let mut tail_energy = 0.0;
        for blk in 0..200 {
            g.process_block(&il, &ir, &mut ol, &mut or, &p, &gv, 0.7, false);
            for i in 0..128 {
                assert!(ol[i].is_finite() && or[i].is_finite(), "NaN blk {blk}");
            }
            if blk > 20 {
                tail_energy += ol.iter().map(|s| s * s).sum::<f32>();
            }
            il[0] = 0.0;
            ir[0] = 0.0;
        }
        assert!(tail_energy > 0.0, "no reverb energy");
    }

    #[test]
    fn output_stays_bounded_under_noise() {
        let mut g = ManifoldGraph::prepare(44_100.0, 7);
        let p = ManifoldParams {
            feedback: 0.7,
            decay_low: 1.0,
            width: 1.0,
            ..Default::default()
        };
        let gv = gov();
        let mut rng = crate::rng::Pcg32::seed(5, 1);
        let mut ol = [0.0f32; 64];
        let mut or = [0.0f32; 64];
        for _ in 0..2000 {
            let il: Vec<f32> = (0..64).map(|_| rng.next_f32() * 2.0 - 1.0).collect();
            g.process_block(&il, &il, &mut ol, &mut or, &p, &gv, 1.0, false);
            for i in 0..64 {
                assert!(ol[i].abs() <= 1.5 && or[i].abs() <= 1.5);
            }
        }
    }
}
