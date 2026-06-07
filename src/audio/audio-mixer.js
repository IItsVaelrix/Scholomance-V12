/**
 * Audio Forge — Mixer Bus
 *
 * WebAudio routing and bus management.
 * Creates a GainNode + DynamicsCompressorNode per bus, all chained to master.
 *
 * Stereo panning is applied by the scheduler (StereoPannerNode) BEFORE
 * routing into a bus, not inside the mixer.
 *
 * LAYER: src/audio (browser adapter) — AudioContext required.
 */

// ─── Bus Names ────────────────────────────────────────────────────────────────

export const AUDIO_BUSES = Object.freeze({
  MASTER:   'master',
  MUSIC:    'music',
  COMBAT:   'combat',
  MAGIC:    'combat.magic',
  UI:       'ui',
  ORACLE:   'oracle',
  NEXUS:    'nexus',
  AMBIENCE: 'ambience',
});

const BUS_NAMES = Object.values(AUDIO_BUSES);

// ─── Default Bus Gains ────────────────────────────────────────────────────────

const DEFAULT_BUS_GAINS = Object.freeze({
  [AUDIO_BUSES.MASTER]:   1.0,
  [AUDIO_BUSES.MUSIC]:    0.8,
  [AUDIO_BUSES.COMBAT]:   0.9,
  [AUDIO_BUSES.MAGIC]:    0.85,
  [AUDIO_BUSES.UI]:       0.7,
  [AUDIO_BUSES.ORACLE]:   0.75,
  [AUDIO_BUSES.NEXUS]:    1.0,
  [AUDIO_BUSES.AMBIENCE]: 0.6,
});

// ─── Mixer Factory ────────────────────────────────────────────────────────────

/**
 * Creates an audio mixer with named buses, each compressed and chained to master.
 *
 * @param {AudioContext} audioContext
 * @returns {AudioMixerInstance}
 */
export function createAudioMixer(audioContext) {
  // Master gain → compressor → destination
  const masterGain = audioContext.createGain();
  masterGain.gain.value = DEFAULT_BUS_GAINS[AUDIO_BUSES.MASTER];

  const masterCompressor = audioContext.createDynamicsCompressor();
  masterCompressor.threshold.value = -18;
  masterCompressor.knee.value = 6;
  masterCompressor.ratio.value = 4;
  masterCompressor.attack.value = 0.003;
  masterCompressor.release.value = 0.25;

  masterGain.connect(masterCompressor);
  masterCompressor.connect(audioContext.destination);

  // Per-bus nodes
  const buses = {};
  for (const busName of BUS_NAMES) {
    if (busName === AUDIO_BUSES.MASTER) continue;

    const busGain = audioContext.createGain();
    busGain.gain.value = DEFAULT_BUS_GAINS[busName] ?? 0.8;

    const busCompressor = audioContext.createDynamicsCompressor();
    busCompressor.threshold.value = -24;
    busCompressor.knee.value = 8;
    busCompressor.ratio.value = 3;
    busCompressor.attack.value = 0.005;
    busCompressor.release.value = 0.3;

    busGain.connect(busCompressor);
    busCompressor.connect(masterGain);

    buses[busName] = { gain: busGain, compressor: busCompressor };
  }

  // For combat.magic: sub-route through combat bus first if both exist
  // In MVP, all buses independently route to master — sub-routing deferred

  let muted = false;
  const savedGains = {};

  return {
    /** Routes an AudioNode into a named bus. */
    connectNode(sourceNode, busName) {
      const safeBus = buses[busName] ?? buses[AUDIO_BUSES.COMBAT];
      sourceNode.connect(safeBus.gain);
    },

    /** Sets the gain for a specific bus. Value clamped to [0, 1]. */
    setVolume(busName, value) {
      const clamped = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
      if (busName === AUDIO_BUSES.MASTER) {
        masterGain.gain.setTargetAtTime(clamped, audioContext.currentTime, 0.01);
        return;
      }
      const bus = buses[busName];
      if (bus) {
        bus.gain.gain.setTargetAtTime(clamped, audioContext.currentTime, 0.01);
      }
    },

    /** Gets the current gain for a bus (approximate — reads .value). */
    getVolume(busName) {
      if (busName === AUDIO_BUSES.MASTER) return masterGain.gain.value;
      return buses[busName]?.gain.gain.value ?? 0;
    },

    /** Mutes all buses instantly. */
    muteAll() {
      if (muted) return;
      muted = true;
      savedGains[AUDIO_BUSES.MASTER] = masterGain.gain.value;
      masterGain.gain.setTargetAtTime(0, audioContext.currentTime, 0.005);
    },

    /** Restores all buses from before muteAll(). */
    unmuteAll() {
      if (!muted) return;
      muted = false;
      const target = savedGains[AUDIO_BUSES.MASTER] ?? 1.0;
      masterGain.gain.setTargetAtTime(target, audioContext.currentTime, 0.01);
    },

    /** Whether the mixer is globally muted. */
    get isMuted() { return muted; },

    /** Disconnects all nodes. Call when disposing the forge. */
    disconnect() {
      try {
        for (const bus of Object.values(buses)) {
          bus.gain.disconnect();
          bus.compressor.disconnect();
        }
        masterGain.disconnect();
        masterCompressor.disconnect();
      } catch {
        // Ignore teardown errors
      }
    },
  };
}
