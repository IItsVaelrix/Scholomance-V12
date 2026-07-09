import { MANIFOLD_WORKLET_MESSAGES, createManifoldMessage } from './manifold.messages.js';

const DEFAULT_MACROS = Object.freeze({
  wetDry: 0.4,
  size: 0.55,
  reactivity: 0.65,
  stability: 0.72,
});

class CochlearManifoldProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.sampleRate = globalThis.sampleRate || 44100;
    this.program = null;
    this.macros = { ...DEFAULT_MACROS };
    this.frozen = false;
    this.panicActive = false;
    this.blockCounter = 0;
    this.lastFeatures = null;
    this.port.onmessage = (event) => this.handleMessage(event.data);
  }

  handleMessage(message) {
    if (!message || typeof message !== 'object') return;
    const payload = message.payload ?? {};
    switch (message.type) {
      case MANIFOLD_WORKLET_MESSAGES.PREPARE:
        if (Number.isFinite(payload.sampleRate) && payload.sampleRate > 0) {
          this.sampleRate = payload.sampleRate;
        }
        this.panicActive = false;
        this.postStatus('prepared');
        break;
      case MANIFOLD_WORKLET_MESSAGES.LOAD_PROGRAM:
        this.program = payload.program ?? null;
        this.panicActive = false;
        this.postStatus(this.program ? 'program_loaded' : 'program_cleared');
        break;
      case MANIFOLD_WORKLET_MESSAGES.SET_MACROS:
        this.macros = { ...this.macros, ...(payload.macros ?? {}) };
        break;
      case MANIFOLD_WORKLET_MESSAGES.FREEZE:
        this.frozen = Boolean(payload.enabled);
        this.postStatus(this.frozen ? 'frozen' : 'unfrozen');
        break;
      case MANIFOLD_WORKLET_MESSAGES.PANIC:
        this.panicActive = true;
        this.frozen = false;
        this.postStatus('panic');
        break;
      default:
        break;
    }
  }

  process(inputs, outputs) {
    const input = inputs[0] ?? [];
    const output = outputs[0] ?? [];
    const leftIn = input[0] ?? null;
    const rightIn = input[1] ?? leftIn;
    const leftOut = output[0] ?? null;
    const rightOut = output[1] ?? leftOut;

    if (!leftOut) return true;

    const wetDry = this.panicActive ? 0 : clamp01(this.macros.wetDry);
    for (let index = 0; index < leftOut.length; index += 1) {
      const left = sanitizeSample(leftIn?.[index] ?? 0);
      const right = sanitizeSample(rightIn?.[index] ?? left);
      const mono = (left + right) * 0.5;
      const wet = this.frozen ? 0 : mono * (0.65 + clamp01(this.macros.size) * 0.25);
      leftOut[index] = limitSample(left * (1 - wetDry) + wet * wetDry);
      if (rightOut) {
        rightOut[index] = limitSample(right * (1 - wetDry) + wet * wetDry);
      }
    }

    this.blockCounter += 1;
    if (this.blockCounter % 4 === 0 && leftIn) {
      this.lastFeatures = extractBlockFeatures(leftIn, rightIn ?? leftIn);
      const events = classifyWorkletEvents(this.lastFeatures);
      if (events.length > 0) {
        this.port.postMessage(createManifoldMessage(MANIFOLD_WORKLET_MESSAGES.EVENT_BATCH, {
          events,
          features: this.lastFeatures,
          programId: this.program?.id ?? null,
        }));
      }
    }

    return true;
  }

  postStatus(status) {
    this.port.postMessage(createManifoldMessage(MANIFOLD_WORKLET_MESSAGES.STATUS, {
      status,
      programId: this.program?.id ?? null,
    }));
  }
}

function extractBlockFeatures(left, right) {
  let peak = 0;
  let sumSq = 0;
  let highFlux = 0;
  let previous = 0;
  let side = 0;
  for (let index = 0; index < left.length; index += 1) {
    const mono = sanitizeSample((left[index] + right[index]) * 0.5);
    const abs = Math.abs(mono);
    peak = Math.max(peak, abs);
    sumSq += mono * mono;
    highFlux += Math.abs(mono - previous);
    side += Math.abs(sanitizeSample(left[index]) - sanitizeSample(right[index]));
    previous = mono;
  }
  const rms = Math.sqrt(sumSq / Math.max(1, left.length));
  const spectralFlux = clamp01(highFlux / Math.max(1, left.length) * 4);
  return {
    rms: clamp01(rms),
    peak: clamp01(peak),
    crestFactor: clamp01(peak - rms),
    spectralCentroid: spectralFlux,
    spectralFlux,
    lowEnergy: clamp01(rms * 1.2),
    midEnergy: clamp01(rms + spectralFlux * 0.2),
    highEnergy: spectralFlux,
    transientSharpness: clamp01(peak * 0.8 + spectralFlux * 0.2),
    harmonicity: clamp01(1 - spectralFlux * 0.5),
    inputWidth: clamp01(side / Math.max(1, left.length)),
  };
}

function classifyWorkletEvents(features) {
  const events = [];
  if (features.lowEnergy > 0.7 && features.transientSharpness > 0.6 && features.crestFactor > 0.2) {
    events.push({ event: 'sub_transient', confidence: round2((features.lowEnergy + features.transientSharpness) * 0.5) });
  }
  if (features.highEnergy > 0.65 && features.spectralFlux > 0.6) {
    events.push({ event: 'high_crunch', confidence: round2((features.highEnergy + features.spectralFlux) * 0.5) });
  }
  if (features.rms < 0.04 && features.peak < 0.08) {
    events.push({ event: 'silence_gap', confidence: round2(1 - features.peak) });
  }
  return events;
}

function sanitizeSample(value) {
  return Number.isFinite(value) ? value : 0;
}

function limitSample(value) {
  return Math.max(-0.98, Math.min(0.98, sanitizeSample(value)));
}

function clamp01(value) {
  if (!Number.isFinite(Number(value))) return 0;
  return Math.max(0, Math.min(1, Number(value)));
}

function round2(value) {
  return Number(value.toFixed(2));
}

registerProcessor('cochlear-manifold-processor', CochlearManifoldProcessor);
