/**
 * Audio Forge — Web Worker
 *
 * Off-main-thread synthesis jobs. Receives job packets, runs DSP,
 * returns Float32Array via Transferable postMessage.
 *
 * Message contract:
 *   Request:  { id, type, packet, sampleRate }
 *   Response: { id, ok, buffer: Float32Array|null, analysis, diagnostics, error }
 *
 * LAYER: src/audio (browser adapter) — Worker scope only.
 * No DOM. No AudioContext. No Math.random() (all DSP is seeded).
 */

import { renderSfxBuffer } from '../../codex/core/audio-forge/dsp/buffer-renderer.js';
import { buildNoiseBuffer } from '../../codex/core/audio-forge/dsp/noise.js';
import { buildWavetable } from '../../codex/core/audio-forge/dsp/oscillators.js';
import { rngFromStringSeed } from '../../codex/core/audio-forge/dsp/seeded-rng-bridge.js';

// ─── Job Types ────────────────────────────────────────────────────────────────

export const AUDIO_WORKER_JOB_TYPES = Object.freeze({
  RENDER_ONE_SHOT:      'RENDER_ONE_SHOT',
  GENERATE_WAVETABLE:   'GENERATE_WAVETABLE',
  GENERATE_NOISE_BUFFER:'GENERATE_NOISE_BUFFER',
  ANALYZE_BUFFER:       'ANALYZE_BUFFER',
});

// ─── Analysis Helpers ─────────────────────────────────────────────────────────

function analyzePcmBuffer(buffer) {
  let peak = 0;
  let sumSq = 0;
  for (let i = 0; i < buffer.length; i++) {
    const abs = Math.abs(buffer[i]);
    if (abs > peak) peak = abs;
    sumSq += buffer[i] * buffer[i];
  }
  const rms = buffer.length > 0 ? Math.sqrt(sumSq / buffer.length) : 0;
  return { peak, rms };
}

// ─── Job Handlers ─────────────────────────────────────────────────────────────

function handleRenderOneShot({ id, packet, sampleRate }) {
  try {
    const result = renderSfxBuffer(packet, sampleRate ?? 44100);
    if (!result.ok) {
      return {
        id,
        ok: false,
        buffer: null,
        analysis: null,
        diagnostics: result.diagnostics,
        error: 'RENDER_FAILED: ' + result.diagnostics.join('; '),
      };
    }

    return {
      id,
      ok: true,
      buffer: result.channelData,
      analysis: result.analysis,
      diagnostics: result.diagnostics,
      error: null,
    };
  } catch (err) {
    return {
      id,
      ok: false,
      buffer: null,
      analysis: null,
      diagnostics: [],
      error: `WORKER_EXCEPTION: ${err?.message ?? String(err)}`,
    };
  }
}

function handleGenerateWavetable({ id, harmonics, phaseWarp, tableSize, seed }) {
  try {
    const rng = rngFromStringSeed(String(seed ?? 'wavetable_default'));
    const table = buildWavetable({ harmonics, phaseWarp, tableSize }, rng);
    return { id, ok: true, buffer: table, analysis: null, diagnostics: [], error: null };
  } catch (err) {
    return { id, ok: false, buffer: null, analysis: null, diagnostics: [], error: String(err?.message ?? err) };
  }
}

function handleGenerateNoiseBuffer({ id, noiseType, durationSamples, seed }) {
  try {
    const rng = rngFromStringSeed(String(seed ?? 'noise_default'));
    const buffer = buildNoiseBuffer({ noiseType: noiseType ?? 'white', durationSamples }, rng);
    const { peak, rms } = analyzePcmBuffer(buffer);
    return {
      id,
      ok: true,
      buffer,
      analysis: { peak, rms, durationSamples: buffer.length, sampleRate: null, checksum: null },
      diagnostics: [],
      error: null,
    };
  } catch (err) {
    return { id, ok: false, buffer: null, analysis: null, diagnostics: [], error: String(err?.message ?? err) };
  }
}

function handleAnalyzeBuffer({ id, buffer }) {
  try {
    if (!(buffer instanceof Float32Array)) {
      return { id, ok: false, buffer: null, analysis: null, diagnostics: [], error: 'ANALYZE_BUFFER: input is not Float32Array' };
    }
    const { peak, rms } = analyzePcmBuffer(buffer);
    return {
      id,
      ok: true,
      buffer: null,
      analysis: { peak, rms, durationSamples: buffer.length, sampleRate: null, checksum: null },
      diagnostics: [],
      error: null,
    };
  } catch (err) {
    return { id, ok: false, buffer: null, analysis: null, diagnostics: [], error: String(err?.message ?? err) };
  }
}

// ─── Message Router ───────────────────────────────────────────────────────────

self.onmessage = function workerMessageHandler(event) {
  const msg = event.data;
  if (!msg || typeof msg !== 'object') return;

  let response;
  switch (msg.type) {
    case AUDIO_WORKER_JOB_TYPES.RENDER_ONE_SHOT:
      response = handleRenderOneShot(msg);
      break;
    case AUDIO_WORKER_JOB_TYPES.GENERATE_WAVETABLE:
      response = handleGenerateWavetable(msg);
      break;
    case AUDIO_WORKER_JOB_TYPES.GENERATE_NOISE_BUFFER:
      response = handleGenerateNoiseBuffer(msg);
      break;
    case AUDIO_WORKER_JOB_TYPES.ANALYZE_BUFFER:
      response = handleAnalyzeBuffer(msg);
      break;
    default:
      self.postMessage({ id: msg.id, ok: false, buffer: null, analysis: null, diagnostics: [], error: `UNKNOWN_JOB_TYPE:${msg.type}` });
      return;
  }

  // Transfer Float32Array ownership back to main thread (zero-copy)
  if (response.buffer instanceof Float32Array) {
    self.postMessage(response, [response.buffer.buffer]);
  } else {
    self.postMessage(response);
  }
};
