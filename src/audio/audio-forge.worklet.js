/**
 * Audio Forge — AudioWorklet Processor Stub
 *
 * Phase 2 stub. Registers 'pb-sfx-processor' as a no-op AudioWorkletProcessor.
 * Full realtime oscillator synthesis is deferred to Phase 2.
 *
 * This file must be loaded via:
 *   audioContext.audioWorklet.addModule('/src/audio/audio-forge.worklet.js')
 *
 * LAYER: src/audio (browser adapter) — AudioWorklet scope only.
 * MVP: BufferSourceNode handles playback. This stub holds the architecture slot.
 */

class PbSfxProcessor extends AudioWorkletProcessor {
  process(_inputs, _outputs, _parameters) {
    // Phase 2: realtime oscillator synthesis will run here.
    // For MVP, all synthesis happens in audio-forge.worker.js (Web Worker).
    // Returning true keeps the processor alive; false would terminate it.
    return true;
  }
}

registerProcessor('pb-sfx-processor', PbSfxProcessor);
