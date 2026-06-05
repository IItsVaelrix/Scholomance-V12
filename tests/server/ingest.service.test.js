import { describe, it, expect } from 'vitest';
import { ingestTrackAudio } from '../../codex/server/catalog/ingest.service.js';
import { validateResonanceSchema } from '../../src/lib/ambient/resonance/resonanceSchema.js';

function makeWav(samples, sampleRate = 8000) {
  const dataLen = samples.length * 2;
  const buf = Buffer.alloc(44 + dataLen);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + dataLen, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22); buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(dataLen, 40);
  for (let i = 0; i < samples.length; i += 1) {
    buf.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 30000), 44 + i * 2);
  }
  return buf;
}

/** Mock catalog api that records the binding calls. */
function makeMockApi() {
  const track = { id: 42, release_id: 5, position: 1, title: 'Echoes', fingerprint_id: null, stream_url: null };
  const calls = { setFingerprint: [], setAssets: [], register: [] };
  return {
    calls,
    track,
    api: {
      tracks: {
        findById: async (id) => (Number(id) === 42 ? track : null),
        setFingerprint: async (id, fp) => { calls.setFingerprint.push([id, fp]); track.fingerprint_id = fp; },
        setAssets: async (id, assets) => { calls.setAssets.push([id, assets]); Object.assign(track, assets); },
      },
      resonance: {
        register: async (row) => { calls.register.push(row); return row; },
      },
    },
  };
}

/** In-memory storage adapter. */
function makeMockStorage() {
  const stored = { audio: [], sidecars: [] };
  return {
    stored,
    putAudio: async ({ fingerprintId, bytes, format }) => {
      stored.audio.push({ fingerprintId, size: bytes.byteLength ?? bytes.length, format });
      return { url: `https://cdn.test/audio/${fingerprintId}.${format}` };
    },
    putSidecar: async ({ fingerprintId, json }) => {
      stored.sidecars.push({ fingerprintId, json });
      return { url: `https://cdn.test/sidecar/${fingerprintId}.json` };
    },
  };
}

describe('[Server] ingestTrackAudio', () => {
  it('fingerprints, stores, compiles a real sidecar, and binds it to the track', async () => {
    const { api, calls } = makeMockApi();
    const storage = makeMockStorage();
    const wav = makeWav(new Float32Array(8000), 8000);

    const result = await ingestTrackAudio({ api, trackId: 42, bytes: wav, storage });

    expect(result.format).toBe('wav');
    expect(result.analysisSource).toBe('pcm');
    expect(result.analysisVersion).toBe('pcm-fft-1');
    expect(result.durationMs).toBe(1000);
    expect(result.fingerprintId).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/);

    // Track was bound.
    expect(calls.setFingerprint[0]).toEqual([42, result.fingerprintId]);
    expect(calls.setAssets[0][1].streamUrl).toBe(result.streamUrl);

    // Sidecar registered as ready and is engine-valid.
    expect(calls.register[0].status).toBe('ready');
    expect(calls.register[0].fingerprintId).toBe(result.fingerprintId);
    expect(storage.stored.sidecars).toHaveLength(1);
    expect(validateResonanceSchema(storage.stored.sidecars[0].json)).toBe(true);
  });

  it('falls back to deterministic synthesis for compressed audio', async () => {
    const { api } = makeMockApi();
    const storage = makeMockStorage();
    const mp3ish = Buffer.concat([Buffer.from('ID3'), Buffer.alloc(128, 9)]);

    const result = await ingestTrackAudio({ api, trackId: 42, bytes: mp3ish, storage, durationMsHint: 9000 });
    expect(result.format).toBe('mp3');
    expect(result.analysisSource).toBe('synth');
    expect(result.durationMs).toBe(9000);
    expect(validateResonanceSchema(storage.stored.sidecars[0].json)).toBe(true);
  });

  it('rejects missing inputs', async () => {
    const { api } = makeMockApi();
    const storage = makeMockStorage();
    await expect(ingestTrackAudio({ api, trackId: 42, bytes: Buffer.alloc(0), storage })).rejects.toThrow(/audio bytes/);
    await expect(ingestTrackAudio({ api, trackId: 999, bytes: Buffer.from('x'), storage })).rejects.toThrow(/not found/);
  });
});
