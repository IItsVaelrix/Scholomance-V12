/**
 * QUANTIZATION FIDELITY GRADER — the eye's self-awareness.
 *
 * TurboQuant compresses a 256-d float vector to packed 4-bit codes. Any
 * similarity score computed on those codes is only trustworthy if the
 * compression preserved the vector's *direction* (dot-products are angular).
 * This grader measures that distortion directly: it replays the deterministic
 * transform (normalize → seed sign-flip → Hadamard), quantizes+dequantizes in
 * the transformed domain, and reports the cosine between the original transformed
 * vector and its 4-bit reconstruction.
 *
 * High cosine → the compressed representation points the same way → the
 * inner-product estimates downstream are faithful → trust the resonance score.
 *
 * Core-owned (turboquant primitives only) so the diagnostic/probe/search layers
 * can grade fidelity without importing the src/ photonic bridge.
 *
 * Deterministic: same (vector, seed) → same grade. No clocks, no randomness.
 */

import {
  fastHadamardTransform,
  quantizeF32To4Bit,
  dequantize4BitToF32,
} from './turboquant.js';

// Empirically calibrated (256-d, 4-bit). Measured reconstruction cosine for
// energy-spread phonosemantic vectors sits ~0.86 — which corresponds to a regime
// where downstream similarity RANKING is already being scrambled by quantization
// (verified: the 4-bit ranking diverges from the full-precision ranking). So the
// honest bands put that regime at D, not A. A/B are reserved for genuinely
// low-loss vectors (concentrated energy, or wider bit-width).
const GRADE_BANDS = Object.freeze([
  { grade: 'A', min: 0.97 },
  { grade: 'B', min: 0.93 },
  { grade: 'C', min: 0.88 },
  { grade: 'D', min: 0.80 },
  { grade: 'F', min: -Infinity },
]);

export function gradeFromScore(score) {
  for (const band of GRADE_BANDS) {
    if (score >= band.min) return band.grade;
  }
  return 'F';
}

/**
 * Replay the TurboQuant transform up to (but not including) quantization.
 * Returns the unit vector in the rotated/Hadamard domain.
 */
function transform(vector, seed) {
  const dim = vector.length;
  const vec = new Float32Array(vector);

  let sumSq = 0;
  for (let i = 0; i < dim; i += 1) sumSq += vec[i] * vec[i];
  const norm = Math.sqrt(sumSq);
  if (norm > 0) {
    for (let i = 0; i < dim; i += 1) vec[i] /= norm;
  }

  for (let i = 0; i < dim; i += 1) {
    let value = seed ^ i;
    let setBits = 0;
    while (value > 0) {
      value &= value - 1;
      setBits += 1;
    }
    if (setBits % 2 === 1) vec[i] *= -1.0;
  }

  fastHadamardTransform(vec);
  return { vec, norm };
}

/**
 * Grade the quantization fidelity of a single vector.
 *
 * @param {Float32Array | number[]} vector
 * @param {number} seed
 * @returns {{ grade: string, score: number, dim: number, norm: number, trustworthy: boolean }}
 */
export function gradeQuantizationFidelity(vector, seed = 1337) {
  const dim = vector.length;
  if (dim === 0) {
    return { grade: 'F', score: 0, dim: 0, norm: 0, trustworthy: false };
  }

  const { vec, norm } = transform(vector, seed);

  // A zero/degenerate input has no direction to preserve — unmeasurable, not an A.
  if (norm === 0) {
    return { grade: 'F', score: 0, dim, norm: 0, trustworthy: false };
  }

  let dot = 0;
  let magT = 0;
  let magR = 0;
  for (let i = 0; i < dim; i += 1) {
    const t = vec[i];
    const r = dequantize4BitToF32(quantizeF32To4Bit(t));
    dot += t * r;
    magT += t * t;
    magR += r * r;
  }

  const denom = Math.sqrt(magT) * Math.sqrt(magR);
  const score = denom > 0 ? dot / denom : 0;
  const rounded = Number(score.toFixed(4));
  const grade = gradeFromScore(rounded);

  return {
    grade,
    score: rounded,
    dim,
    norm: Number(norm.toFixed(4)),
    trustworthy: grade === 'A' || grade === 'B',
  };
}
