pub struct DelayLine {
    buf: Vec<f32>,
    write: usize,
}

impl DelayLine {
    pub fn with_capacity(n: usize) -> Self {
        Self {
            buf: vec![0.0; n.max(1)],
            write: 0,
        }
    }
    pub fn capacity(&self) -> usize {
        self.buf.len()
    }
    pub fn reset(&mut self) {
        for s in self.buf.iter_mut() {
            *s = 0.0;
        }
        self.write = 0;
    }

    pub fn write(&mut self, x: f32) {
        self.buf[self.write] = x;
        self.write = (self.write + 1) % self.buf.len();
    }

    /// `delay` = samples back from the most recently written sample.
    /// `read(0)` returns the most recent sample, `read(1)` the one before it, etc.
    pub fn read(&self, delay: usize) -> f32 {
        let cap = self.buf.len();
        let d = delay.min(cap - 1);
        let pos = (self.write + cap - 1 - d) % cap;
        self.buf[pos]
    }

    pub fn read_frac(&self, delay: f32) -> f32 {
        let cap = self.buf.len() as f32;
        let d = delay.clamp(0.0, cap - 2.0);
        let i = d.floor() as usize;
        let frac = d - i as f32;
        let a = self.read(i);
        let b = self.read(i + 1);
        a * (1.0 - frac) + b * frac
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_back_written_sample() {
        let mut d = DelayLine::with_capacity(16);
        d.write(1.0);
        d.write(0.0);
        d.write(0.0);
        assert!((d.read(2) - 1.0).abs() < 1e-6);
    }

    #[test]
    fn fractional_read_interpolates() {
        let mut d = DelayLine::with_capacity(16);
        d.write(0.0);
        d.write(2.0);
        let v = d.read_frac(0.5);
        assert!(v > 0.0 && v < 2.0);
    }

    #[test]
    fn never_reads_out_of_bounds() {
        let mut d = DelayLine::with_capacity(8);
        for _ in 0..100 {
            d.write(0.3);
        }
        assert!(d.read(9999).is_finite());
    }
}
