import { describe, it, expect } from 'vitest';
import {
  computeAudioFingerprint, detectFormat, formatFingerprintId, parseWav,
} from '../../codex/server/catalog/audio.fingerprint.js';
import { magnitudeSpectrum } from '../../codex/server/catalog/fft.js';
import { compileSidecar } from '../../codex/server/catalog/sidecar.compiler.js';
// Validate compiler output against the REAL engine contract (cross-layer is fine in tests).
import { validateResonanceSchema } from '../../src/lib/ambient/resonance/resonanceSchema.js';
import { ResonanceTimeline } from '../../src/lib/ambient/resonance/ResonanceTimeline.js';

/** Build a mono 16-bit PCM WAV from a Float32 signal. */
function makeWav(samples, sampleRate = 8000) {
  const dataLen = samples.length * 2;
  const buf = Buffer.alloc(44 + dataLen);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + dataLen, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22); buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(dataLen, 40);
  for (let i = 0; i < samples.length; i += 1) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }
  return buf;
}

function sine(freq, sampleRate, n) {
  const out = new Float32Array(n);
  for (let i = 0; i < n; i += 1) out[i] = Math.sin((2 * Math.PI * freq * i) / sampleRate);
  return out;
}

describe('[Server] audio fingerprint', () => {
  it('hashes deterministically and formats the id like the concept', () => {
    const bytes = Buffer.from('the sound is code');
    const a = computeAudioFingerprint(bytes);
    const b = computeAudioFingerprint(Buffer.from('the sound is code'));
    expect(a.sha256).toBe(b.sha256);
    expect(a.fingerprintId).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/);
    expect(formatFingerprintId('7f3a9c1d2b6ee7a9rest')).toBe('7F3A-9C1D-2B6E-E7A9');
  });

  it('detects container formats from magic bytes', () => {
    expect(detectFormat(makeWav(sine(440, 8000, 256)))).toBe('wav');
    expect(detectFormat(Buffer.from([0x49, 0x44, 0x33, 0x04]))).toBe('mp3'); // ID3
    expect(detectFormat(Buffer.from([0xff, 0xfb, 0x90, 0x00]))).toBe('mp3'); // frame sync
    expect(detectFormat(Buffer.from('fLaC'))).toBe('flac');
    expect(detectFormat(Buffer.from([1, 2, 3, 4]))).toBe('unknown');
  });

  it('decodes a PCM WAV to mono float with correct rate and duration', () => {
    const wav = parseWav(makeWav(sine(440, 8000, 8000), 8000));
    expect(wav).not.toBeNull();
    expect(wav.sampleRate).toBe(8000);
    expect(wav.channels).toBe(1);
    expect(wav.samples.length).toBe(8000);
    expect(wav.durationMs).toBe(1000);
  });
});

describe('[Server] FFT', () => {
  it('peaks at the bin of a pure tone', () => {
    const sr = 8000;
    const n = 1024;
    const binTarget = 64;
    const freq = (binTarget * sr) / n; // exactly on a bin
    const mag = magnitudeSpectrum(sine(freq, sr, n));
    let argmax = 0;
    for (let i = 1; i < mag.length; i += 1) if (mag[i] > mag[argmax]) argmax = i;
    expect(Math.abs(argmax - binTarget)).toBeLessThanOrEqual(1);
  });
});

describe('[Server] sidecar compiler — PCM path', () => {
  const wav = makeWav(sine(440, 8000, 8000), 8000);
  const fp = computeAudioFingerprint(wav);

  it('produces a schema-valid, engine-loadable sidecar from real PCM analysis', () => {
    const { sidecar, analysisVersion, source } = compileSidecar({
      bytes: wav, trackId: 'track:42', fingerprintId: fp.fingerprintId, frameIntervalMs: 100,
    });
    expect(source).toBe('pcm');
    expect(analysisVersion).toBe('pcm-fft-1');
    expect(sidecar.sourceDurationMs).toBe(1000);

    // Passes the real engine validator + constructs a usable timeline.
    expect(validateResonanceSchema(sidecar)).toBe(true);
    const timeline = new ResonanceTimeline(sidecar);
    const tick = timeline.sampleAt(500);
    expect(tick.resonance).toHaveProperty('energy');
    expect(tick.spectral).toHaveProperty('mid');

    // 440Hz tone → mid band dominates low/high somewhere in the signal.
    const peakMid = Math.max(...sidecar.frames.map((f) => f.spectral.mid));
    expect(peakMid).toBeGreaterThan(0);
  });

  it('is deterministic: same bytes → identical sidecar', () => {
    const a = compileSidecar({ bytes: wav, trackId: 'track:42', fingerprintId: fp.fingerprintId });
    const b = compileSidecar({ bytes: wav, trackId: 'track:42', fingerprintId: fp.fingerprintId });
    expect(a.sidecar).toEqual(b.sidecar);
  });

  it('frame timestamps are strictly ascending integers', () => {
    const { sidecar } = compileSidecar({ bytes: wav, trackId: 'track:42', fingerprintId: fp.fingerprintId });
    for (let i = 1; i < sidecar.frames.length; i += 1) {
      expect(sidecar.frames[i].timestampMs).toBeGreaterThan(sidecar.frames[i - 1].timestampMs);
    }
  });
});

describe('[Server] sidecar compiler — synthesis fallback (compressed audio)', () => {
  const mp3ish = Buffer.concat([Buffer.from('ID3'), Buffer.alloc(64, 7)]);

  it('synthesizes a deterministic, valid sidecar seeded by the fingerprint', () => {
    const args = { bytes: mp3ish, trackId: 'track:7', fingerprintId: '7F3A-9C1D-2B6E-E7A9', durationMsHint: 12000 };
    const { sidecar, source, analysisVersion } = compileSidecar(args);
    expect(source).toBe('synth');
    expect(analysisVersion).toBe('synth-fp-1');
    expect(sidecar.sourceDurationMs).toBe(12000);
    expect(validateResonanceSchema(sidecar)).toBe(true);

    // Same fingerprint → byte-identical sidecar (deterministic right page).
    const again = compileSidecar(args);
    expect(again.sidecar).toEqual(sidecar);

    // Different fingerprint → different motion.
    const other = compileSidecar({ ...args, fingerprintId: 'DEAD-BEEF-CAFE-0001' });
    expect(other.sidecar.frames).not.toEqual(sidecar.frames);
  });
});
