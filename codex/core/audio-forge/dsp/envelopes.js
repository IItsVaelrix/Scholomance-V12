/**
 * Audio Forge DSP — Envelopes
 *
 * ADSR, pluck, and burst envelope curve builders.
 * Returns Float32Array of gain multipliers in [0, 1].
 *
 * All values are clamped. No NaN. No Infinity.
 *
 * CLASSIFICATION: core / pure / DSP
 * LAYER: codex/core — NO DOM, NO AudioContext, NO side effects.
 * DETERMINISM: same inputs → same output always (no randomness needed).
 */

const CLAMP01 = (v) => Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));

/**
 * Converts milliseconds to sample count.
 * @param {number} ms
 * @param {number} sampleRate
 * @returns {number}
 */
function msToSamples(ms, sampleRate) {
  return Math.max(1, Math.round((Number.isFinite(ms) ? ms : 0) * sampleRate / 1000));
}

// ─── ADSR ─────────────────────────────────────────────────────────────────────

/**
 * Builds an ADSR envelope curve.
 *
 * @param {object} params
 * @param {number} params.attackMs   - Attack duration in ms
 * @param {number} params.decayMs    - Decay duration in ms
 * @param {number} params.sustain    - Sustain level [0, 1]
 * @param {number} params.releaseMs  - Release duration in ms
 * @param {number} params.durationMs - Total buffer duration in ms
 * @param {number} params.sampleRate
 * @returns {Float32Array}
 */
export function buildAdsrCurve({ attackMs, decayMs, sustain, releaseMs, durationMs, sampleRate }) {
  const totalSamples = msToSamples(durationMs, sampleRate);
  const curve = new Float32Array(totalSamples);

  const sustainLevel = CLAMP01(sustain);
  const attackSamples = Math.min(msToSamples(attackMs, sampleRate), totalSamples);
  const decaySamples = Math.min(msToSamples(decayMs, sampleRate), totalSamples - attackSamples);
  const releaseSamples = Math.min(msToSamples(releaseMs, sampleRate), totalSamples);
  const sustainStart = attackSamples + decaySamples;
  const releaseStart = Math.max(sustainStart, totalSamples - releaseSamples);

  for (let i = 0; i < totalSamples; i++) {
    let gain;
    if (i < attackSamples) {
      gain = i / attackSamples;
    } else if (i < sustainStart) {
      const t = (i - attackSamples) / Math.max(1, decaySamples);
      gain = 1.0 - (1.0 - sustainLevel) * t;
    } else if (i < releaseStart) {
      gain = sustainLevel;
    } else {
      const t = (i - releaseStart) / Math.max(1, releaseSamples);
      gain = sustainLevel * (1.0 - t);
    }
    curve[i] = CLAMP01(gain);
  }

  return curve;
}

// ─── Pluck ────────────────────────────────────────────────────────────────────

/**
 * Builds a pluck envelope: fast attack, exponential decay to zero.
 * Models struck string / bell / percussive hit character.
 *
 * @param {object} params
 * @param {number} params.attackMs   - Usually very short (1–10ms)
 * @param {number} params.decayMs    - Main character of the sound
 * @param {number} params.durationMs
 * @param {number} params.sampleRate
 * @returns {Float32Array}
 */
export function buildPluckCurve({ attackMs, decayMs, durationMs, sampleRate }) {
  const totalSamples = msToSamples(durationMs, sampleRate);
  const curve = new Float32Array(totalSamples);

  const attackSamples = Math.min(msToSamples(attackMs, sampleRate), totalSamples);
  const decaySamples = Math.max(1, totalSamples - attackSamples);

  // Exponential decay time constant: tau = decayMs / ln(1000) ≈ decayMs / 6.9
  // At t = decayMs, amplitude = e^(-decayMs/tau) ≈ 0.001 (-60dB)
  const tau = decaySamples / Math.log(1000);

  for (let i = 0; i < totalSamples; i++) {
    let gain;
    if (i < attackSamples) {
      gain = i / attackSamples;
    } else {
      const t = i - attackSamples;
      gain = Math.exp(-t / tau);
    }
    curve[i] = CLAMP01(gain);
  }

  return curve;
}

// ─── Burst ────────────────────────────────────────────────────────────────────

/**
 * Builds a burst envelope: abrupt onset, very fast decay.
 * Used for impact transients, spell impacts, magic bursts.
 *
 * @param {object} params
 * @param {number} params.attackMs   - Typically 0–5ms
 * @param {number} params.decayMs    - Typically 20–100ms
 * @param {number} params.durationMs
 * @param {number} params.sampleRate
 * @returns {Float32Array}
 */
export function buildBurstCurve({ attackMs, decayMs, durationMs, sampleRate }) {
  // Burst is a pluck with extra short decay and a squared falloff for snap
  const totalSamples = msToSamples(durationMs, sampleRate);
  const curve = new Float32Array(totalSamples);

  const attackSamples = Math.min(msToSamples(attackMs ?? 1, sampleRate), totalSamples);
  const decaySamples = Math.max(1, totalSamples - attackSamples);
  const tau = decaySamples / Math.log(100); // faster than pluck

  for (let i = 0; i < totalSamples; i++) {
    let gain;
    if (i < attackSamples) {
      gain = i / attackSamples;
    } else {
      const t = i - attackSamples;
      // Squared exponential for a snap-then-gone character
      gain = Math.exp(-t / tau) ** 2;
    }
    curve[i] = CLAMP01(gain);
  }

  return curve;
}

/**
 * Selects an envelope builder by role name.
 *
 * @param {'adsr'|'pluck'|'burst'} role
 * @param {object} params
 * @returns {Float32Array}
 */
export function buildEnvelopeCurve(role, params) {
  switch (role) {
    case 'pluck': return buildPluckCurve(params);
    case 'burst': return buildBurstCurve(params);
    case 'adsr':
    default:      return buildAdsrCurve(params);
  }
}
