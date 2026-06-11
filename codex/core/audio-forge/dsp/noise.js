/**
 * Audio Forge DSP — Noise Generators
 *
 * Seeded stochastic buffer generation.
 * All randomness via rng parameter. Zero Math.random calls.
 *
 * CLASSIFICATION: core / pure / DSP
 * LAYER: codex/core — NO DOM, NO AudioContext, NO side effects.
 * DETERMINISM: same noiseType + same rng stream → same output always.
 */

// ─── White Noise ──────────────────────────────────────────────────────────────

/**
 * Uniform white noise in [-1, 1].
 *
 * @param {number} durationSamples
 * @param {() => number} rng
 * @returns {Float32Array}
 */
export function buildWhiteNoise(durationSamples, rng) {
  const buffer = new Float32Array(durationSamples);
  for (let i = 0; i < durationSamples; i++) {
    buffer[i] = rng() * 2 - 1;
  }
  return buffer;
}

// ─── Pink Noise ───────────────────────────────────────────────────────────────

/**
 * Pink noise via Paul Kellet's approximation.
 * ~-3dB/octave rolloff. Deterministic with provided rng.
 *
 * @param {number} durationSamples
 * @param {() => number} rng
 * @returns {Float32Array}
 */
export function buildPinkNoise(durationSamples, rng) {
  const buffer = new Float32Array(durationSamples);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < durationSamples; i++) {
    const white = rng() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    const pink = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
    buffer[i] = Math.max(-1, Math.min(1, pink));
  }
  return buffer;
}

// ─── Brown Noise ──────────────────────────────────────────────────────────────

/**
 * Brown (Brownian / red) noise: ~-6dB/octave. Integrated white noise.
 *
 * @param {number} durationSamples
 * @param {() => number} rng
 * @returns {Float32Array}
 */
export function buildBrownNoise(durationSamples, rng) {
  const buffer = new Float32Array(durationSamples);
  let last = 0;
  for (let i = 0; i < durationSamples; i++) {
    const white = rng() * 2 - 1;
    last = Math.max(-1, Math.min(1, last + white * 0.02));
    buffer[i] = last;
  }
  return buffer;
}

// ─── Crackle Noise ────────────────────────────────────────────────────────────

/**
 * Crackle noise: sparse impulse bursts simulating vinyl crackle or magic sparks.
 * Ported from the pattern in ambientPlayer.service.js (createCrackleCurve),
 * adapted to sample-domain output.
 *
 * @param {number} durationSamples
 * @param {() => number} rng
 * @returns {Float32Array}
 */
export function buildCrackleNoise(durationSamples, rng) {
  const buffer = new Float32Array(durationSamples);
  for (let i = 0; i < durationSamples; i++) {
    const baseNoise = Math.pow(rng(), 1.9) * 0.2;
    const hasBurst = rng() > 0.84;
    const burst = hasBurst ? 0.32 + rng() * 0.5 : 0;
    buffer[i] = Math.min(1, baseNoise + burst) * (rng() > 0.5 ? 1 : -1);
  }
  return buffer;
}

// ─── Dust Noise ───────────────────────────────────────────────────────────────

/**
 * Dust noise: very sparse, random impulses. Used for magical dust effects.
 *
 * @param {number} durationSamples
 * @param {() => number} rng
 * @param {number} [density=0.001] - Probability of a non-zero sample
 * @returns {Float32Array}
 */
export function buildDustNoise(durationSamples, rng, density = 0.001) {
  const buffer = new Float32Array(durationSamples);
  for (let i = 0; i < durationSamples; i++) {
    if (rng() < density) {
      buffer[i] = rng() * 2 - 1;
    }
  }
  return buffer;
}

// ─── Spark Noise ──────────────────────────────────────────────────────────────

/**
 * Spark noise: clustered bursts simulating electrical discharge.
 *
 * @param {number} durationSamples
 * @param {() => number} rng
 * @returns {Float32Array}
 */
export function buildSparkNoise(durationSamples, rng) {
  const buffer = new Float32Array(durationSamples);
  let burstLen = 0;
  let burstAmp = 0;
  for (let i = 0; i < durationSamples; i++) {
    if (burstLen > 0) {
      buffer[i] = (rng() * 2 - 1) * burstAmp;
      burstLen--;
    } else if (rng() < 0.003) {
      burstLen = Math.floor(rng() * 80) + 10;
      burstAmp = 0.5 + rng() * 0.5;
      buffer[i] = (rng() * 2 - 1) * burstAmp;
    }
  }
  return buffer;
}

// ─── Void Static ──────────────────────────────────────────────────────────────

/**
 * Void static: pink noise with heavy low-frequency emphasis and occasional
 * deep rumbles. Used for VOID affinity spells.
 *
 * @param {number} durationSamples
 * @param {() => number} rng
 * @returns {Float32Array}
 */
export function buildVoidStatic(durationSamples, rng) {
  // Pink noise base
  const pink = buildPinkNoise(durationSamples, rng);
  // Add slow-moving low-frequency component
  const buffer = new Float32Array(durationSamples);
  let slow = 0;
  for (let i = 0; i < durationSamples; i++) {
    const rumble = rng() * 2 - 1;
    slow = 0.9995 * slow + 0.0005 * rumble;
    buffer[i] = Math.max(-1, Math.min(1, pink[i] * 0.6 + slow * 2.0));
  }
  return buffer;
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

/**
 * Builds a noise buffer by type name.
 *
 * @param {object} params
 * @param {'white'|'pink'|'brown'|'crackle'|'dust'|'spark'|'void_static'} params.noiseType
 * @param {number} params.durationSamples
 * @param {() => number} rng - Seeded PRNG (mandatory)
 * @returns {Float32Array}
 */
export function buildNoiseBuffer({ noiseType, durationSamples }, rng) {
  const n = Math.max(1, Math.round(durationSamples));
  switch (noiseType) {
    case 'pink':        return buildPinkNoise(n, rng);
    case 'brown':       return buildBrownNoise(n, rng);
    case 'crackle':     return buildCrackleNoise(n, rng);
    case 'dust':        return buildDustNoise(n, rng);
    case 'spark':       return buildSparkNoise(n, rng);
    case 'void_static': return buildVoidStatic(n, rng);
    case 'white':
    default:            return buildWhiteNoise(n, rng);
  }
}
