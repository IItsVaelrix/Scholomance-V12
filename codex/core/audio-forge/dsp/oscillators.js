/**
 * Audio Forge DSP — Oscillators
 *
 * Pure wavetable construction and sample generation.
 * All randomness via rng parameter. Zero Math.random calls.
 *
 * CLASSIFICATION: core / pure / DSP
 * LAYER: codex/core — NO DOM, NO AudioContext, NO side effects.
 * DETERMINISM: same inputs + same rng state → identical output always.
 */

const TWO_PI = Math.PI * 2;
const DEFAULT_TABLE_SIZE = 2048;

// ─── Wavetable ────────────────────────────────────────────────────────────────

/**
 * Builds an additive synthesis wavetable.
 *
 * Each harmonic contributes: amplitude_n * sin(2π * n * t + phase_n)
 * Phase warp applies an additional per-sample phase distortion for
 * character variety (crystal, glass, metal timbres).
 *
 * @param {object} params
 * @param {Array<{partial: number, amplitude: number, phase?: number}>} params.harmonics
 * @param {number} [params.phaseWarp=0]  - 0–1, 0 = none, 1 = maximum warp
 * @param {number} [params.tableSize=2048]
 * @param {() => number} rng - Seeded PRNG (must be provided, never internal)
 * @returns {Float32Array}
 */
export function buildWavetable({ harmonics, phaseWarp = 0, tableSize = DEFAULT_TABLE_SIZE }, rng) {
  const table = new Float32Array(tableSize);

  const safeHarmonics = Array.isArray(harmonics) && harmonics.length > 0
    ? harmonics
    : [{ partial: 1, amplitude: 1.0, phase: 0 }];

  const safePhaseWarp = Math.max(0, Math.min(1, Number.isFinite(phaseWarp) ? phaseWarp : 0));

  // Precompute phase offsets per harmonic (seeded, so deterministic)
  const warpOffsets = safeHarmonics.map(() => (rng() - 0.5) * safePhaseWarp * Math.PI);

  for (let i = 0; i < tableSize; i++) {
    const t = i / tableSize;
    let sample = 0;
    for (let h = 0; h < safeHarmonics.length; h++) {
      const { partial = 1, amplitude = 1.0, phase = 0 } = safeHarmonics[h];
      const safeAmp = Number.isFinite(amplitude) ? amplitude : 0;
      const safePartial = Number.isFinite(partial) && partial > 0 ? partial : 1;
      const safePhase = Number.isFinite(phase) ? phase : 0;
      sample += safeAmp * Math.sin(TWO_PI * safePartial * t + safePhase + warpOffsets[h]);
    }
    table[i] = sample;
  }

  return normalizeTable(table);
}

/**
 * Linear interpolation sample lookup from a wavetable.
 * Phase wraps around [0, 1).
 *
 * @param {Float32Array} table
 * @param {number} phase - [0, 1)
 * @returns {number}
 */
export function sampleWavetable(table, phase) {
  const len = table.length;
  const pos = ((phase % 1) + 1) % 1 * len;
  const i0 = Math.floor(pos) % len;
  const i1 = (i0 + 1) % len;
  const frac = pos - Math.floor(pos);
  return table[i0] + (table[i1] - table[i0]) * frac;
}

/**
 * Builds a buffer by reading a wavetable at a given frequency.
 *
 * @param {object} params
 * @param {Float32Array} params.wavetable
 * @param {number} params.frequencyHz
 * @param {number} params.durationSamples
 * @param {number} params.sampleRate
 * @returns {Float32Array}
 */
export function buildWavetableBuffer({ wavetable, frequencyHz, durationSamples, sampleRate }) {
  const buffer = new Float32Array(durationSamples);
  const safeFreq = Number.isFinite(frequencyHz) && frequencyHz > 0 ? frequencyHz : 440;
  const phaseIncrement = safeFreq / sampleRate;
  let phase = 0;
  for (let i = 0; i < durationSamples; i++) {
    buffer[i] = sampleWavetable(wavetable, phase);
    phase = (phase + phaseIncrement) % 1;
  }
  return buffer;
}

// ─── FM Synthesis ─────────────────────────────────────────────────────────────

/**
 * Builds an FM synthesis buffer.
 * carrier(t) = sin(2π * fc * t + index * sin(2π * fm * t))
 *
 * @param {object} params
 * @param {number} params.carrierFreq    - Hz
 * @param {number} params.modFreq        - Hz
 * @param {number} params.modIndex       - Modulation depth (0–20 typical)
 * @param {number} params.durationSamples
 * @param {number} params.sampleRate
 * @param {() => number} rng             - Seeded PRNG (used for subtle phase jitter)
 * @returns {Float32Array}
 */
export function buildFmBuffer({ carrierFreq, modFreq, modIndex, durationSamples, sampleRate }, rng) {
  const fc = Number.isFinite(carrierFreq) && carrierFreq > 0 ? carrierFreq : 440;
  const fm = Number.isFinite(modFreq) && modFreq > 0 ? modFreq : 220;
  const idx = Number.isFinite(modIndex) && modIndex >= 0 ? modIndex : 1;

  // Subtle per-instance phase jitter for natural variation (still seeded)
  const jitter = rng() * 0.02;

  const buffer = new Float32Array(durationSamples);
  for (let i = 0; i < durationSamples; i++) {
    const t = i / sampleRate;
    const modulator = Math.sin(TWO_PI * fm * t);
    buffer[i] = Math.sin(TWO_PI * fc * t + idx * modulator + jitter);
  }

  return buffer;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Normalizes a Float32Array to peak = 1.0 (or returns as-is if all-zero).
 * @param {Float32Array} table
 * @returns {Float32Array}
 */
function normalizeTable(table) {
  let peak = 0;
  for (let i = 0; i < table.length; i++) {
    const abs = Math.abs(table[i]);
    if (abs > peak) peak = abs;
  }
  if (peak === 0) return table;
  for (let i = 0; i < table.length; i++) {
    table[i] /= peak;
  }
  return table;
}
