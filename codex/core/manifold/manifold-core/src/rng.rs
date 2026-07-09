pub struct Pcg32 {
    state: u64,
    inc: u64,
}

impl Pcg32 {
    pub fn seed(seed: u64, seq: u64) -> Self {
        let mut rng = Self {
            state: 0,
            inc: (seq << 1) | 1,
        };
        rng.next_u32();
        rng.state = rng.state.wrapping_add(seed);
        rng.next_u32();
        rng
    }

    pub fn next_u32(&mut self) -> u32 {
        let old = self.state;
        self.state = old.wrapping_mul(6364136223846793005).wrapping_add(self.inc);
        let xorshifted = (((old >> 18) ^ old) >> 27) as u32;
        let rot = (old >> 59) as u32;
        xorshifted.rotate_right(rot)
    }

    pub fn next_f32(&mut self) -> f32 {
        (self.next_u32() >> 8) as f32 / (1u32 << 24) as f32
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn deterministic_same_seed() {
        let mut a = Pcg32::seed(0x1234_5678, 1);
        let mut b = Pcg32::seed(0x1234_5678, 1);
        for _ in 0..64 {
            assert_eq!(a.next_u32(), b.next_u32());
        }
    }

    #[test]
    fn f32_in_unit_interval() {
        let mut r = Pcg32::seed(99, 1);
        for _ in 0..10_000 {
            let x = r.next_f32();
            assert!((0.0..1.0).contains(&x));
        }
    }

    #[test]
    fn different_seeds_diverge() {
        let mut a = Pcg32::seed(1, 1);
        let mut b = Pcg32::seed(2, 1);
        assert_ne!(a.next_u32(), b.next_u32());
    }
}
