/**
 * Audio Forge DSP — Parametric EQ & Biquad Filter
 *
 * Pure biquad coefficient calculation (no Web Audio dependency)
 * and sample-level Direct Form I filter application.
 *
 * Formulas from: "Cookbook formulae for audio equalizer biquad filter coefficients"
 * by Robert Bristow-Johnson (audio EQ cookbook, public domain).
 *
 * CLASSIFICATION: core / pure / DSP
 * LAYER: codex/core — NO DOM, NO AudioContext, NO side effects.
 * DETERMINISM: same inputs → same coefficients and filtered output always.
 */

// ─── Coefficient Computation ──────────────────────────────────────────────────

/**
 * Computes biquad filter coefficients.
 *
 * @param {object} params
 * @param {'highpass'|'lowpass'|'bandpass'|'notch'|'peaking'|'lowshelf'|'highshelf'} params.type
 * @param {number} params.frequencyHz - Center/cutoff frequency
 * @param {number} params.q           - Q / resonance (typically 0.1–10)
 * @param {number} [params.gainDb=0]  - Gain in dB (peaking/shelf only)
 * @param {number} params.sampleRate
 * @returns {{ b0: number, b1: number, b2: number, a1: number, a2: number }}
 */
export function computeBiquadCoefficients({ type, frequencyHz, q, gainDb = 0, sampleRate }) {
  const f0 = Math.max(1, Math.min(frequencyHz, sampleRate / 2 - 1));
  const safeQ = Math.max(0.0001, Number.isFinite(q) ? q : 1.0);
  const w0 = 2 * Math.PI * f0 / sampleRate;
  const cosW0 = Math.cos(w0);
  const sinW0 = Math.sin(w0);
  const A = Math.pow(10, (gainDb ?? 0) / 40); // Linear amplitude
  const alpha = sinW0 / (2 * safeQ);
  const sqrtA = Math.sqrt(A);

  let b0, b1, b2, a0, a1, a2;

  switch (type) {
    case 'lowpass':
      b0 = (1 - cosW0) / 2;
      b1 = 1 - cosW0;
      b2 = (1 - cosW0) / 2;
      a0 = 1 + alpha;
      a1 = -2 * cosW0;
      a2 = 1 - alpha;
      break;

    case 'highpass':
      b0 = (1 + cosW0) / 2;
      b1 = -(1 + cosW0);
      b2 = (1 + cosW0) / 2;
      a0 = 1 + alpha;
      a1 = -2 * cosW0;
      a2 = 1 - alpha;
      break;

    case 'bandpass':
      b0 = sinW0 / 2;
      b1 = 0;
      b2 = -sinW0 / 2;
      a0 = 1 + alpha;
      a1 = -2 * cosW0;
      a2 = 1 - alpha;
      break;

    case 'notch':
      b0 = 1;
      b1 = -2 * cosW0;
      b2 = 1;
      a0 = 1 + alpha;
      a1 = -2 * cosW0;
      a2 = 1 - alpha;
      break;

    case 'peaking':
      b0 = 1 + alpha * A;
      b1 = -2 * cosW0;
      b2 = 1 - alpha * A;
      a0 = 1 + alpha / A;
      a1 = -2 * cosW0;
      a2 = 1 - alpha / A;
      break;

    case 'lowshelf':
      b0 = A * ((A + 1) - (A - 1) * cosW0 + 2 * sqrtA * alpha);
      b1 = 2 * A * ((A - 1) - (A + 1) * cosW0);
      b2 = A * ((A + 1) - (A - 1) * cosW0 - 2 * sqrtA * alpha);
      a0 = (A + 1) + (A - 1) * cosW0 + 2 * sqrtA * alpha;
      a1 = -2 * ((A - 1) + (A + 1) * cosW0);
      a2 = (A + 1) + (A - 1) * cosW0 - 2 * sqrtA * alpha;
      break;

    case 'highshelf':
      b0 = A * ((A + 1) + (A - 1) * cosW0 + 2 * sqrtA * alpha);
      b1 = -2 * A * ((A - 1) + (A + 1) * cosW0);
      b2 = A * ((A + 1) + (A - 1) * cosW0 - 2 * sqrtA * alpha);
      a0 = (A + 1) - (A - 1) * cosW0 + 2 * sqrtA * alpha;
      a1 = 2 * ((A - 1) - (A + 1) * cosW0);
      a2 = (A + 1) - (A - 1) * cosW0 - 2 * sqrtA * alpha;
      break;

    default:
      // Unknown type: identity filter (pass-through)
      return { b0: 1, b1: 0, b2: 0, a1: 0, a2: 0 };
  }

  // Normalize by a0
  return {
    b0: b0 / a0,
    b1: b1 / a0,
    b2: b2 / a0,
    a1: a1 / a0,
    a2: a2 / a0,
  };
}

// ─── Direct Form I Filter Application ────────────────────────────────────────

/**
 * Applies a biquad filter to an input buffer using Direct Form I.
 *
 * y[n] = b0*x[n] + b1*x[n-1] + b2*x[n-2] - a1*y[n-1] - a2*y[n-2]
 *
 * @param {Float32Array} inputBuffer
 * @param {{ b0: number, b1: number, b2: number, a1: number, a2: number }} coefficients
 * @returns {Float32Array}
 */
export function applyBiquadFilter(inputBuffer, coefficients) {
  const { b0, b1, b2, a1, a2 } = coefficients;
  const output = new Float32Array(inputBuffer.length);
  let x1 = 0, x2 = 0;
  let y1 = 0, y2 = 0;

  for (let i = 0; i < inputBuffer.length; i++) {
    const x0 = inputBuffer[i];
    let y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;

    // NaN guard: if filter blows up, substitute zero.
    if (!Number.isFinite(y0)) y0 = 0;

    // Do NOT hard-clip here. A biquad can legitimately produce values beyond
    // unity (resonance, gain bands), and clamping the output would (a) inject
    // hard-clip distortion and (b) corrupt downstream bands in a chain, which
    // receive this buffer as their input. Bounding to [-1, 1] is the renderer's
    // final responsibility (peak-limit pass), not the filter's. Feedback state
    // already uses the unclamped y0, so the math stays correct.
    output[i] = y0;
    x2 = x1; x1 = x0;
    y2 = y1; y1 = y0;
  }

  return output;
}

// ─── EQ Chain ────────────────────────────────────────────────────────────────

const SUPPORTED_BAND_TYPES = new Set([
  'highpass', 'lowpass', 'bandpass', 'notch', 'peaking', 'lowshelf', 'highshelf',
]);

/**
 * Applies a series of EQ bands to a buffer.
 * Unsupported band types produce a diagnostic warning and are skipped (not crashed).
 *
 * @param {Float32Array} inputBuffer
 * @param {Array<{ type: string, frequencyHz: number, q: number, gainDb?: number }>} bands
 * @param {number} sampleRate
 * @returns {{ output: Float32Array, diagnostics: string[] }}
 */
export function applyEqChain(inputBuffer, bands, sampleRate) {
  const diagnostics = [];

  if (!Array.isArray(bands) || bands.length === 0) {
    return { output: inputBuffer, diagnostics };
  }

  let current = inputBuffer;

  for (let i = 0; i < bands.length; i++) {
    const band = bands[i];
    if (!band || typeof band !== 'object') {
      diagnostics.push(`EQ_BAND_SKIPPED:index ${i} — null or not an object`);
      continue;
    }
    if (!SUPPORTED_BAND_TYPES.has(band.type)) {
      diagnostics.push(`EQ_BAND_SKIPPED:${band.type} at index ${i} — unsupported in MVP`);
      continue;
    }
    // Guard against malformed numeric fields that would produce NaN coefficients
    // and silently zero the entire signal. Skip the band loudly instead.
    if (!Number.isFinite(band.frequencyHz) || band.frequencyHz <= 0) {
      diagnostics.push(`EQ_BAND_SKIPPED:${band.type} at index ${i} — invalid frequencyHz:${band.frequencyHz}`);
      continue;
    }
    const coefficients = computeBiquadCoefficients({
      type: band.type,
      frequencyHz: band.frequencyHz,
      q: band.q ?? 1.0,
      gainDb: band.gainDb ?? 0,
      sampleRate,
    });
    // Final safety net: if coefficients are non-finite for any reason, skip
    // rather than letting the filter null the buffer with no trace.
    if (!Number.isFinite(coefficients.b0) || !Number.isFinite(coefficients.a1)) {
      diagnostics.push(`EQ_BAND_SKIPPED:${band.type} at index ${i} — non-finite coefficients`);
      continue;
    }
    current = applyBiquadFilter(current, coefficients);
  }

  return { output: current, diagnostics };
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validates an array of EQ band definitions.
 *
 * @param {Array} bands
 * @returns {{ ok: boolean, errors: string[], warnings: string[] }}
 */
export function validateEqBands(bands) {
  const errors = [];
  const warnings = [];

  if (!Array.isArray(bands)) {
    return { ok: false, errors: ['EQ_BANDS_NOT_ARRAY'], warnings };
  }

  bands.forEach((band, i) => {
    if (!band || typeof band !== 'object') {
      errors.push(`BAND[${i}]_NULL_OR_INVALID`);
      return;
    }
    if (!SUPPORTED_BAND_TYPES.has(band.type)) {
      warnings.push(`BAND[${i}]_TYPE_UNSUPPORTED_IN_MVP:${band.type}`);
    }
    if (typeof band.frequencyHz !== 'number' || !Number.isFinite(band.frequencyHz) || band.frequencyHz <= 0) {
      errors.push(`BAND[${i}]_FREQUENCY_INVALID:${band.frequencyHz}`);
    }
    if (typeof band.q !== 'number' || !Number.isFinite(band.q) || band.q <= 0) {
      warnings.push(`BAND[${i}]_Q_INVALID:${band.q} — defaulting to 1.0`);
    }
  });

  return { ok: errors.length === 0, errors, warnings };
}
