import { expect, test, describe } from 'vitest';
import { ResonanceTimeline } from '../../../../src/lib/ambient/resonance/ResonanceTimeline.js';
import { INTERPOLATION, validateResonanceSchema } from '../../../../src/lib/ambient/resonance/resonanceSchema.js';

const VALID_SCHEMA = {
  schemaVersion: 1,
  analysisVersion: "resonance-compiler-v1",
  trackId: "test-track",
  sourceDurationMs: 10000,
  sync: {
    analysisOffsetMs: 0
  },
  channels: {
    spectral: {
      rms: { interpolation: INTERPOLATION.LINEAR, required: true },
      onset: { interpolation: INTERPOLATION.STEP, default: 0 }
    },
    resonance: {
      violence: { interpolation: INTERPOLATION.LINEAR, required: true }
    }
  },
  frames: [
    {
      timestampMs: 1000,
      spectral: { rms: 0, onset: 0 },
      resonance: { violence: 0 }
    },
    {
      timestampMs: 2000,
      spectral: { rms: 1, onset: 1 },
      resonance: { violence: 0.5 }
    },
    {
      timestampMs: 3000,
      spectral: { rms: 0.5, onset: 0 },
      resonance: { violence: 1 }
    }
  ]
};

describe('ResonanceTimeline', () => {
  describe('Schema Validation', () => {
    test('accepts valid schema', () => {
      expect(() => new ResonanceTimeline(VALID_SCHEMA)).not.toThrow();
    });

    test('rejects missing schemaVersion', () => {
      const invalid = { ...VALID_SCHEMA, schemaVersion: 2 };
      expect(() => new ResonanceTimeline(invalid)).toThrow(/Unsupported schemaVersion/);
    });

    test('rejects unsorted frames', () => {
      const invalid = {
        ...VALID_SCHEMA,
        frames: [
          { timestampMs: 2000, spectral: { rms: 1 }, resonance: { violence: 1 } },
          { timestampMs: 1000, spectral: { rms: 1 }, resonance: { violence: 1 } }
        ]
      };
      expect(() => new ResonanceTimeline(invalid)).toThrow(/must be strictly ascending/);
    });

    test('rejects duplicate frames', () => {
      const invalid = {
        ...VALID_SCHEMA,
        frames: [
          { timestampMs: 1000, spectral: { rms: 1 }, resonance: { violence: 1 } },
          { timestampMs: 1000, spectral: { rms: 1 }, resonance: { violence: 1 } }
        ]
      };
      expect(() => new ResonanceTimeline(invalid)).toThrow(/must be strictly ascending/);
    });

    test('applies defaults for missing optional channels', () => {
      const data = JSON.parse(JSON.stringify(VALID_SCHEMA));
      delete data.frames[0].spectral.onset; // should default to 0
      
      const timeline = new ResonanceTimeline(data);
      expect(timeline.frames[0].spectral.onset).toBe(0);
    });
  });

  describe('sampleAt(playbackTimeMs)', () => {
    const timeline = new ResonanceTimeline(VALID_SCHEMA);

    test('before first frame clamps to first frame', () => {
      const tick = timeline.sampleAt(0);
      expect(tick.spectral.rms).toBe(0);
      expect(tick.spectral.onset).toBe(0);
      expect(tick.resonance.violence).toBe(0);
    });

    test('after final frame clamps to final frame', () => {
      const tick = timeline.sampleAt(5000);
      expect(tick.spectral.rms).toBe(0.5);
      expect(tick.spectral.onset).toBe(0);
      expect(tick.resonance.violence).toBe(1);
    });

    test('exactly on a frame returns exact values', () => {
      const tick = timeline.sampleAt(2000);
      expect(tick.spectral.rms).toBe(1);
      expect(tick.spectral.onset).toBe(1);
      expect(tick.resonance.violence).toBe(0.5);
    });

    test('interpolates linearly between frames', () => {
      // Halfway between 1000ms (rms:0) and 2000ms (rms:1)
      const tick = timeline.sampleAt(1500);
      expect(tick.spectral.rms).toBeCloseTo(0.5);
      expect(tick.resonance.violence).toBeCloseTo(0.25);
    });

    test('holds step interpolation values', () => {
      // Halfway between 1000ms (onset:0) and 2000ms (onset:1)
      // Should hold the f0 value (0) because policy is STEP
      const tick = timeline.sampleAt(1500);
      expect(tick.spectral.onset).toBe(0);
      
      // Halfway between 2000ms (onset:1) and 3000ms (onset:0)
      // Should hold f0 value (1)
      const tick2 = timeline.sampleAt(2500);
      expect(tick2.spectral.onset).toBe(1);
    });

    test('respects analysisOffsetMs', () => {
      const dataWithOffset = JSON.parse(JSON.stringify(VALID_SCHEMA));
      dataWithOffset.sync.analysisOffsetMs = 500; // timeline is shifted +500ms
      const offsetTimeline = new ResonanceTimeline(dataWithOffset);
      
      // Playback at 2500ms should sample timeline at 2000ms
      const tick = offsetTimeline.sampleAt(2500);
      expect(tick.spectral.rms).toBe(1);
    });
  });
});
