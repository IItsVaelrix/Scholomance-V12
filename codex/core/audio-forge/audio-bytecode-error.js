/**
 * Audio Forge — Bytecode Error Extensions
 *
 * Extends the PixelBrain bytecode error taxonomy with audio-domain error codes.
 * Does NOT modify the original frozen MODULE_IDS or ERROR_CODES objects;
 * instead exports extended versions that consumers can use.
 *
 * Format: PB-ERR-v1-{CATEGORY}-{SEVERITY}-AUDFOR-{CODE}-...
 *
 * CLASSIFICATION: core / error taxonomy
 * LAYER: codex/core — pure constants, no side effects.
 */

import {
  BytecodeError,
  ERROR_CATEGORIES,
  ERROR_SEVERITY,
  MODULE_IDS,
  ERROR_CODES,
} from '../pixelbrain/bytecode-error.js';

// ─── Audio Forge Module ID ────────────────────────────────────────────────────

export const AUDIO_FORGE_MODULE_ID = 'AUDFOR';

// ─── Audio Forge Error Codes (0x1000 range — no collision with existing) ──────

export const AUDIO_ERROR_CODES = Object.freeze({
  AUDIO_INVALID_PACKET:       0x1001,
  AUDIO_NAN_SAMPLE:           0x1002,
  AUDIO_PEAK_EXCEEDED:        0x1003,
  AUDIO_WORKER_TIMEOUT:       0x1004,
  AUDIO_WORKLET_UNAVAILABLE:  0x1005,
  AUDIO_CONTEXT_SUSPENDED:    0x1006,
  AUDIO_BUFFER_EMPTY:         0x1007,
  AUDIO_VOICE_RENDER_FAILED:  0x1008,
});

// Re-export core enums for convenience so audio-forge code only needs one import
export {
  BytecodeError,
  ERROR_CATEGORIES,
  ERROR_SEVERITY,
  MODULE_IDS,
  ERROR_CODES,
};

// ─── Convenience Factories ────────────────────────────────────────────────────

/**
 * Creates an AUDIO_INVALID_PACKET error with context.
 *
 * @param {string[]} errors - Validation error strings from validateSfxPacket
 * @param {object} [context]
 * @returns {BytecodeError}
 */
export function createInvalidPacketError(errors, context = {}) {
  return new BytecodeError(
    ERROR_CATEGORIES.VALUE,
    ERROR_SEVERITY.CRIT,
    AUDIO_FORGE_MODULE_ID,
    AUDIO_ERROR_CODES.AUDIO_INVALID_PACKET,
    { errors, ...context },
  );
}

/**
 * Creates an AUDIO_NAN_SAMPLE error.
 *
 * @param {number} sampleIndex - Index where NaN was detected
 * @param {string} [voiceType]
 * @returns {BytecodeError}
 */
export function createNanSampleError(sampleIndex, voiceType) {
  return new BytecodeError(
    ERROR_CATEGORIES.RENDER,
    ERROR_SEVERITY.CRIT,
    AUDIO_FORGE_MODULE_ID,
    AUDIO_ERROR_CODES.AUDIO_NAN_SAMPLE,
    { sampleIndex, voiceType },
  );
}

/**
 * Creates an AUDIO_WORKER_TIMEOUT error.
 *
 * @param {string} jobId
 * @param {number} timeoutMs
 * @returns {BytecodeError}
 */
export function createWorkerTimeoutError(jobId, timeoutMs) {
  return new BytecodeError(
    ERROR_CATEGORIES.STATE,
    ERROR_SEVERITY.WARN,
    AUDIO_FORGE_MODULE_ID,
    AUDIO_ERROR_CODES.AUDIO_WORKER_TIMEOUT,
    { jobId, timeoutMs },
  );
}
