/**
 * Audio Forge DSP — Distortion / Soft Clip
 *
 * Soft-clip distortion applied at the sample level.
 * Formula: y = x / (1 + |drive * x|)   (tanh-adjacent)
 *
 * Intentionally does NOT use WaveShaperNode — the core layer
 * has no DOM / AudioContext access. Sample-level math only.
 *
 * CLASSIFICATION: core / pure / DSP
 * LAYER: codex/core — NO DOM, NO AudioContext, NO side effects.
 * DETERMINISM: same drive → same curve always.
 */

/**
 * Builds a soft-clip WaveShaper-compatible curve as a Float32Array.
 * Maps input [-1, 1] to output [-1, 1] through the soft-clip formula.
 * Can be used as a lookup table for efficient apply() calls.
 *
 * @param {object} params
 * @param {number} params.drive - [0, 1]. 0 = linear (no clipping), 1 = heavy clip
 * @param {number} [params.steps=256] - Curve resolution
 * @returns {Float32Array}
 */
export function buildSoftClipCurve({ drive, steps = 256 }) {
  const safeDrive = Math.max(0, Math.min(1, Number.isFinite(drive) ? drive : 0));
  const safeSteps = Math.max(2, Math.round(Number.isFinite(steps) ? steps : 256));
  const curve = new Float32Array(safeSteps);

  // Scale drive to a usable range: 0 = 0 (identity), 1 = 10 (saturated clip)
  const scaledDrive = safeDrive * 10;

  for (let i = 0; i < safeSteps; i++) {
    // Normalize i to [-1, 1]
    const x = (2 * i / (safeSteps - 1)) - 1;
    // Soft clip formula
    const y = x / (1 + scaledDrive * Math.abs(x));
    curve[i] = Math.max(-1, Math.min(1, Number.isFinite(y) ? y : 0));
  }

  return curve;
}

/**
 * Applies soft-clip distortion to a buffer in-place using the formula directly
 * (no lookup table needed at this resolution).
 *
 * @param {Float32Array} buffer
 * @param {number} drive - [0, 1]
 * @returns {Float32Array} Same buffer, modified in-place
 */
export function applySoftClip(buffer, drive) {
  const safeDrive = Math.max(0, Math.min(1, Number.isFinite(drive) ? drive : 0));
  const scaledDrive = safeDrive * 10;

  if (scaledDrive === 0) return buffer; // Identity — skip computation

  for (let i = 0; i < buffer.length; i++) {
    const x = buffer[i];
    const y = x / (1 + scaledDrive * Math.abs(x));
    buffer[i] = Math.max(-1, Math.min(1, Number.isFinite(y) ? y : 0));
  }

  return buffer;
}
