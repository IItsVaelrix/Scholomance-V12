import { MANIFOLD_WORKLET_MESSAGES, createManifoldMessage } from './manifold.messages.js';

function createOwnedAudioContext() {
  const AudioCtx = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioCtx) return null;
  try {
    return new AudioCtx();
  } catch {
    return null;
  }
}

export function createCochlearManifold(options = {}) {
  const externalContext = options.audioContext ?? null;
  let audioContext = externalContext ?? createOwnedAudioContext();
  const ownsContext = externalContext === null;
  let node = null;
  let input = null;
  let output = null;
  let disposed = false;
  const listeners = new Set();

  async function ensureReady() {
    if (disposed || !audioContext) return false;
    if (!node) {
      await audioContext.audioWorklet.addModule(new URL('./manifold.worklet.js', import.meta.url));
      node = new AudioWorkletNode(audioContext, 'cochlear-manifold-processor', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [2],
      });
      input = audioContext.createGain();
      output = audioContext.createGain();
      input.connect(node).connect(output);
      node.port.onmessage = (event) => {
        for (const listener of listeners) listener(event.data);
      };
      post(MANIFOLD_WORKLET_MESSAGES.PREPARE, { sampleRate: audioContext.sampleRate });
    }
    if (audioContext.state === 'suspended' || audioContext.state === 'interrupted') {
      await audioContext.resume().catch(() => {});
    }
    return audioContext.state === 'running' || audioContext.state === 'suspended';
  }

  function post(type, payload = {}) {
    node?.port.postMessage(createManifoldMessage(type, payload));
  }

  return {
    get ready() {
      return !disposed && Boolean(node);
    },

    get context() {
      return audioContext;
    },

    get input() {
      return input;
    },

    get output() {
      return output;
    },

    async prepare() {
      return ensureReady();
    },

    async loadProgram(program) {
      const ready = await ensureReady();
      if (!ready) return false;
      post(MANIFOLD_WORKLET_MESSAGES.LOAD_PROGRAM, { program });
      return true;
    },

    async setMacros(macros) {
      const ready = await ensureReady();
      if (!ready) return false;
      post(MANIFOLD_WORKLET_MESSAGES.SET_MACROS, { macros });
      return true;
    },

    async setFreeze(enabled) {
      const ready = await ensureReady();
      if (!ready) return false;
      post(MANIFOLD_WORKLET_MESSAGES.FREEZE, { enabled });
      return true;
    },

    panic() {
      post(MANIFOLD_WORKLET_MESSAGES.PANIC);
    },

    onMessage(listener) {
      if (typeof listener !== 'function') return () => {};
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    connect(destination) {
      output?.connect(destination);
    },

    disconnect() {
      input?.disconnect();
      node?.disconnect();
      output?.disconnect();
    },

    dispose({ closeAudioContext = false } = {}) {
      if (disposed) return;
      disposed = true;
      this.disconnect();
      listeners.clear();
      node?.port.close?.();
      node = null;
      input = null;
      output = null;
      if (audioContext && ownsContext && closeAudioContext) {
        audioContext.close().catch(() => {});
      }
      audioContext = null;
    },
  };
}
