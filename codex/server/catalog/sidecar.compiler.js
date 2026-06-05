/**
 * Sidecar compiler — the moat. Turns an uploaded audio file into a precompiled
 * ResonanceTimeline JSON (schema v1) so the right-page visual plays as a
 * deterministic, browser-independent score (no live FFT at render time).
 *
 * Two paths, both deterministic and schema-conforming:
 *   • PCM WAV  → real offline DSP: per-frame RMS energy, spectral-flux onset,
 *                and FFT low/mid/high band energies. analysisVersion 'pcm-fft-1'.
 *   • other    → fingerprint-seeded synthesis (a codec is needed to decode
 *                mp3/flac; the transcode worker will produce a WAV to re-run the
 *                real path). Same file → same sidecar. analysisVersion 'synth-fp-1'.
 *
 * Pure / dependency-free. Output is engine-loadable by ResonanceTimeline
 * (verified in tests against the real validator). PDR §12.
 */

import { mulberry32 } from '../../core/shared/math/seededRng.js';
import { parseWav, detectFormat } from './audio.fingerprint.js';
import { fnv1a } from './visual.genome.js';
import { magnitudeSpectrum, floorPow2 } from './fft.js';

export const SIDECAR_SCHEMA_VERSION = 1;

const CHANNELS = Object.freeze({
  spectral: {
    low: { interpolation: 'linear', required: false, default: 0 },
    mid: { interpolation: 'linear', required: false, default: 0 },
    high: { interpolation: 'linear', required: false, default: 0 },
  },
  resonance: {
    energy: { interpolation: 'linear', required: false, default: 0 },
    pulse: { interpolation: 'linear', required: false, default: 0 },
  },
});

function normalizeInPlace(arr) {
  let max = 0;
  for (let i = 0; i < arr.length; i += 1) if (arr[i] > max) max = arr[i];
  const inv = max > 1e-9 ? 1 / max : 0;
  for (let i = 0; i < arr.length; i += 1) arr[i] = Math.round(arr[i] * inv * 1000) / 1000;
  return arr;
}

/** Real offline analysis of a decoded PCM signal. */
function analyzePcm({ samples, sampleRate, durationMs }, frameIntervalMs) {
  const hop = Math.max(1, Math.round((sampleRate * frameIntervalMs) / 1000));
  const win = Math.max(256, floorPow2(hop * 2));
  const frameCount = Math.max(1, Math.ceil(samples.length / hop));

  const energyRaw = new Float64Array(frameCount);
  const fluxRaw = new Float64Array(frameCount);
  const lowRaw = new Float64Array(frameCount);
  const midRaw = new Float64Array(frameCount);
  const highRaw = new Float64Array(frameCount);

  let prevMag = null;
  const binHz = sampleRate / win;
  const lowMax = Math.floor(250 / binHz);
  const midMax = Math.floor(4000 / binHz);

  for (let f = 0; f < frameCount; f += 1) {
    const start = f * hop;
    const window = samples.subarray(start, Math.min(start + win, samples.length));

    // RMS energy.
    let sumSq = 0;
    for (let i = 0; i < window.length; i += 1) sumSq += window[i] * window[i];
    energyRaw[f] = window.length ? Math.sqrt(sumSq / window.length) : 0;

    // Spectral analysis (bands + flux).
    const mag = magnitudeSpectrum(window);
    let low = 0;
    let mid = 0;
    let high = 0;
    let flux = 0;
    for (let i = 1; i < mag.length; i += 1) {
      if (i <= lowMax) low += mag[i];
      else if (i <= midMax) mid += mag[i];
      else high += mag[i];
      if (prevMag) {
        const d = mag[i] - prevMag[i];
        if (d > 0) flux += d; // half-wave rectified spectral flux = onset strength
      }
    }
    lowRaw[f] = low;
    midRaw[f] = mid;
    highRaw[f] = high;
    fluxRaw[f] = flux;
    prevMag = mag;
  }

  normalizeInPlace(energyRaw);
  normalizeInPlace(fluxRaw);
  normalizeInPlace(lowRaw);
  normalizeInPlace(midRaw);
  normalizeInPlace(highRaw);

  const frames = [];
  for (let f = 0; f < frameCount; f += 1) {
    frames.push({
      timestampMs: Math.round((f * hop * 1000) / sampleRate),
      spectral: { low: lowRaw[f], mid: midRaw[f], high: highRaw[f] },
      resonance: { energy: energyRaw[f], pulse: fluxRaw[f] },
    });
  }
  return { frames, sourceDurationMs: durationMs, analysisVersion: 'pcm-fft-1' };
}

/** Deterministic fingerprint-seeded synthesis when the audio can't be decoded. */
function synthesize({ fingerprintId, durationMs, frameIntervalMs }) {
  const rng = mulberry32(fnv1a(fingerprintId));
  // A few seeded oscillators per channel give smooth, song-stable motion.
  const osc = (count) => Array.from({ length: count }, () => ({
    freq: 0.05 + rng() * 0.9, phase: rng() * Math.PI * 2, amp: 0.4 + rng() * 0.6,
  }));
  const bands = { low: osc(2), mid: osc(3), high: osc(3), energy: osc(2), pulse: osc(4) };
  const evalOsc = (set, t) => {
    let v = 0;
    let norm = 0;
    for (const o of set) { v += o.amp * (0.5 + 0.5 * Math.sin(o.phase + t * o.freq)); norm += o.amp; }
    return norm ? v / norm : 0;
  };

  const frameCount = Math.max(1, Math.ceil(durationMs / frameIntervalMs));
  const frames = [];
  for (let f = 0; f < frameCount; f += 1) {
    const t = (f * frameIntervalMs) / 1000;
    const energy = evalOsc(bands.energy, t);
    const pulseBase = evalOsc(bands.pulse, t);
    frames.push({
      timestampMs: f * frameIntervalMs,
      spectral: {
        low: Math.round(evalOsc(bands.low, t) * 1000) / 1000,
        mid: Math.round(evalOsc(bands.mid, t) * 1000) / 1000,
        high: Math.round(evalOsc(bands.high, t) * 1000) / 1000,
      },
      resonance: {
        energy: Math.round(energy * 1000) / 1000,
        pulse: Math.round(Math.pow(pulseBase, 2) * 1000) / 1000, // sharpen into transients
      },
    });
  }
  return { frames, sourceDurationMs: durationMs, analysisVersion: 'synth-fp-1' };
}

/**
 * Compile a sidecar from audio bytes.
 *
 * @param {object} args
 * @param {Uint8Array|Buffer} args.bytes
 * @param {string} args.trackId        - stable string id (e.g. "track:42")
 * @param {string} args.fingerprintId  - content fingerprint (seeds synth path)
 * @param {number} [args.durationMsHint] - required when the file can't be decoded
 * @param {number} [args.frameIntervalMs=100]
 * @returns {{ sidecar: object, analysisVersion: string, source: 'pcm'|'synth' }}
 */
export function compileSidecar({ bytes, trackId, fingerprintId, durationMsHint, frameIntervalMs = 100 }) {
  if (!trackId) throw new Error('compileSidecar requires a trackId');
  const format = detectFormat(bytes);

  let analysis;
  let source;
  const wav = format === 'wav' ? parseWav(bytes) : null;
  if (wav && wav.samples.length > 0) {
    analysis = analyzePcm(wav, frameIntervalMs);
    source = 'pcm';
  } else {
    const durationMs = Number.isFinite(durationMsHint) && durationMsHint > 0 ? Math.round(durationMsHint) : 180000;
    analysis = synthesize({ fingerprintId: fingerprintId || trackId, durationMs, frameIntervalMs });
    source = 'synth';
  }

  const sidecar = {
    schemaVersion: SIDECAR_SCHEMA_VERSION,
    trackId: String(trackId),
    fingerprintId: fingerprintId || String(trackId),
    analysisVersion: analysis.analysisVersion,
    sourceDurationMs: analysis.sourceDurationMs,
    channels: CHANNELS,
    sync: { analysisOffsetMs: 0 },
    frames: analysis.frames,
  };

  return { sidecar, analysisVersion: analysis.analysisVersion, source };
}
