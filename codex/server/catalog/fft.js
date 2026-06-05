/**
 * Compact radix-2 FFT for offline spectral analysis in the sidecar compiler.
 * Pure, deterministic, dependency-free. Real DSP — not a stub.
 *
 * PDR-2026-06-05-SONIC-EXCHANGE-NATIVE-LISTENING §12 (sidecar compilation).
 */

/** In-place iterative radix-2 Cooley–Tukey FFT. `re`/`im` length must be a power of 2. */
export function fftRadix2(re, im) {
  const n = re.length;
  // Bit-reversal permutation.
  for (let i = 1, j = 0; i < n; i += 1) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i]; re[i] = re[j]; re[j] = tr;
      const ti = im[i]; im[i] = im[j]; im[j] = ti;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wre = Math.cos(ang);
    const wim = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cre = 1;
      let cim = 0;
      for (let k = 0; k < len >> 1; k += 1) {
        const aIdx = i + k;
        const bIdx = i + k + (len >> 1);
        const ure = re[aIdx];
        const uim = im[aIdx];
        const vre = re[bIdx] * cre - im[bIdx] * cim;
        const vim = re[bIdx] * cim + im[bIdx] * cre;
        re[aIdx] = ure + vre;
        im[aIdx] = uim + vim;
        re[bIdx] = ure - vre;
        im[bIdx] = uim - vim;
        const nextCre = cre * wre - cim * wim;
        cim = cre * wim + cim * wre;
        cre = nextCre;
      }
    }
  }
}

/** Largest power of two <= n. */
export function floorPow2(n) {
  let p = 1;
  while (p << 1 <= n) p <<= 1;
  return p;
}

/**
 * Single-sided magnitude spectrum of a real signal window. `samples` is
 * truncated to the nearest lower power of two and Hann-windowed first.
 * Returns a Float64Array of `size/2` bin magnitudes.
 */
export function magnitudeSpectrum(samples) {
  const n = floorPow2(samples.length);
  if (n < 2) return new Float64Array(0);
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  for (let i = 0; i < n; i += 1) {
    // Hann window to reduce spectral leakage.
    const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
    re[i] = samples[i] * w;
  }
  fftRadix2(re, im);
  const half = n >> 1;
  const mag = new Float64Array(half);
  for (let i = 0; i < half; i += 1) {
    mag[i] = Math.hypot(re[i], im[i]) / half;
  }
  return mag;
}
