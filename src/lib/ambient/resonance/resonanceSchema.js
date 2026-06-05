/**
 * Validates a loaded Resonance sidecar JSON against the canonical schema.
 * Rejects malformed structures immediately.
 */

export const INTERPOLATION = {
  LINEAR: 'linear',
  STEP: 'step',
};

export const RESONANCE_DURATION_TOLERANCE_MS = 2500; // Allow 2.5s drift (e.g. slight compression differences)

export function validateResonanceSchema(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid resonance data: must be an object');
  }

  if (data.schemaVersion !== 1) {
    throw new Error(`Unsupported schemaVersion: ${data.schemaVersion}. Expected 1.`);
  }

  if (!data.trackId || typeof data.trackId !== 'string') {
    throw new Error('Invalid resonance data: missing trackId');
  }

  if (!Number.isFinite(data.sourceDurationMs)) {
    throw new Error('Invalid resonance data: missing sourceDurationMs');
  }

  if (!data.channels || typeof data.channels !== 'object') {
    throw new Error('Invalid resonance data: missing channels definition');
  }

  // Validate channels
  for (const layer of ['spectral', 'resonance']) {
    if (data.channels[layer]) {
      for (const [key, config] of Object.entries(data.channels[layer])) {
        if (!config || !Object.values(INTERPOLATION).includes(config.interpolation)) {
          throw new Error(`Invalid interpolation policy for ${layer}.${key}`);
        }
      }
    }
  }

  if (!Array.isArray(data.frames)) {
    throw new Error('Invalid resonance data: frames must be an array');
  }

  // Validate frames structure
  let lastTimestamp = -1;
  for (let i = 0; i < data.frames.length; i++) {
    const frame = data.frames[i];
    if (!Number.isInteger(frame.timestampMs)) {
      throw new Error(`Invalid frame at index ${i}: timestampMs must be an integer`);
    }
    if (frame.timestampMs <= lastTimestamp) {
      throw new Error(`Invalid frame at index ${i}: timestampMs must be strictly ascending (duplicate or backwards)`);
    }
    lastTimestamp = frame.timestampMs;

    for (const layer of ['spectral', 'resonance']) {
      if (!frame[layer] || typeof frame[layer] !== 'object') {
        throw new Error(`Invalid frame at index ${i}: missing ${layer} data`);
      }
      
      if (data.channels[layer]) {
        for (const [key, config] of Object.entries(data.channels[layer])) {
          if (frame[layer][key] === undefined) {
            if (config.required) {
              throw new Error(`Invalid frame at index ${i}: missing required ${layer} channel '${key}'`);
            } else if (config.default !== undefined) {
              frame[layer][key] = config.default;
            }
          }
        }
      }
    }
  }

  return true;
}

export function validateDurationSync(actualDurationMs, sourceDurationMs) {
  if (!Number.isFinite(actualDurationMs) || !Number.isFinite(sourceDurationMs)) return true;
  
  const durationDeltaMs = Math.abs(actualDurationMs - sourceDurationMs);
  if (durationDeltaMs > RESONANCE_DURATION_TOLERANCE_MS) {
    console.warn(`Resonance Duration Mismatch: audio duration (${actualDurationMs}ms) differs from fingerprint source duration (${sourceDurationMs}ms) by ${durationDeltaMs}ms.`);
    return false;
  }
  return true;
}
