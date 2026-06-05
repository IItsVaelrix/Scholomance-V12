import { validateResonanceSchema, INTERPOLATION } from './resonanceSchema.js';

export class ResonanceTimeline {
  constructor(data) {
    validateResonanceSchema(data);
    this.data = data;
    this.frames = data.frames;
    this.channels = data.channels;
    
    // Derived for quick lookups
    this.sourceDurationMs = data.sourceDurationMs;
    this.trackId = data.trackId;
    this.analysisVersion = data.analysisVersion;
    this.schemaVersion = data.schemaVersion;
    this.fingerprintId = data.fingerprintId || data.trackId;
    this.sync = data.sync || {};
    
    // Offset applied directly to queries
    this.offsetMs = this.sync.analysisOffsetMs || 0;
  }

  /**
   * Sample the timeline at an explicit playback time.
   * Returns interpolated spectral and resonance frames.
   */
  sampleAt(rawPlaybackTimeMs) {
    const timeMs = rawPlaybackTimeMs - this.offsetMs;
    
    if (this.frames.length === 0) {
      return this._createEmptyTick(rawPlaybackTimeMs);
    }

    // Before first frame
    if (timeMs <= this.frames[0].timestampMs) {
      return this._buildTick(rawPlaybackTimeMs, this.frames[0]);
    }

    // After last frame
    const lastIdx = this.frames.length - 1;
    if (timeMs >= this.frames[lastIdx].timestampMs) {
      return this._buildTick(rawPlaybackTimeMs, this.frames[lastIdx]);
    }

    // Binary search for surrounding frames
    let left = 0;
    let right = lastIdx;
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (this.frames[mid].timestampMs === timeMs) {
        return this._buildTick(rawPlaybackTimeMs, this.frames[mid]);
      }
      if (this.frames[mid].timestampMs < timeMs) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    // 'right' is the frame before, 'left' is the frame after
    const f0 = this.frames[right];
    const f1 = this.frames[left];
    
    const progress = (timeMs - f0.timestampMs) / (f1.timestampMs - f0.timestampMs);
    
    return this._buildInterpolatedTick(rawPlaybackTimeMs, f0, f1, progress);
  }

  _interpolateLayer(layerName, f0Data, f1Data, progress) {
    const layerConfig = this.channels[layerName] || {};
    const result = {};
    
    // Determine all keys in this layer from both frames
    const keys = new Set([...Object.keys(f0Data), ...Object.keys(f1Data)]);
    
    for (const key of keys) {
      const val0 = f0Data[key] ?? 0;
      const val1 = f1Data[key] ?? 0;
      const policy = layerConfig[key]?.interpolation || INTERPOLATION.STEP; // Default to step if undeclared
      
      if (policy === INTERPOLATION.STEP) {
        result[key] = val0;
      } else if (policy === INTERPOLATION.LINEAR) {
        result[key] = val0 + (val1 - val0) * progress;
      }
    }
    
    return result;
  }

  _buildInterpolatedTick(playbackTimeMs, f0, f1, progress) {
    return {
      trackId: this.trackId,
      fingerprintId: this.fingerprintId,
      playbackTimeMs,
      schemaVersion: this.schemaVersion,
      analysisVersion: this.analysisVersion,
      spectral: this._interpolateLayer('spectral', f0.spectral, f1.spectral, progress),
      resonance: this._interpolateLayer('resonance', f0.resonance, f1.resonance, progress),
      source: 'compiled-sidecar',
    };
  }

  _buildTick(playbackTimeMs, frame) {
    return {
      trackId: this.trackId,
      fingerprintId: this.fingerprintId,
      playbackTimeMs,
      schemaVersion: this.schemaVersion,
      analysisVersion: this.analysisVersion,
      // Clone to prevent mutation by consumers
      spectral: { ...frame.spectral },
      resonance: { ...frame.resonance },
      source: 'compiled-sidecar',
    };
  }

  _createEmptyTick(playbackTimeMs) {
    return {
      trackId: this.trackId,
      fingerprintId: this.fingerprintId,
      playbackTimeMs,
      schemaVersion: this.schemaVersion,
      analysisVersion: this.analysisVersion,
      spectral: {},
      resonance: {},
      source: 'compiled-sidecar',
    };
  }
}
