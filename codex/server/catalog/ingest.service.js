/**
 * Ingest orchestration — the upload pipeline's core, minus transport.
 *
 *   bytes → fingerprint → store audio → compile sidecar → store sidecar →
 *   bind fingerprint + assets to the track → register the resonance sidecar.
 *
 * I/O is injected via a `storage` adapter and a `catalogPersistence`-shaped
 * `api`, so this is unit-testable with mocks (no disk, no HTTP). The route layer
 * provides a real disk/object-storage adapter.
 *
 * PDR-2026-06-05-SONIC-EXCHANGE-NATIVE-LISTENING §12 (audio ingest).
 */

import { computeAudioFingerprint } from './audio.fingerprint.js';
import { compileSidecar } from './sidecar.compiler.js';

/**
 * @typedef {object} IngestStorage
 * @property {(args:{fingerprintId:string,sha256:string,bytes:Uint8Array,format:string,trackId:number})=>Promise<{url:string}>} putAudio
 * @property {(args:{fingerprintId:string,json:object,trackId:number})=>Promise<{url:string}>} putSidecar
 */

/**
 * Ingest an uploaded audio file for an existing track row.
 *
 * @param {object} args
 * @param {object} args.api            - catalogPersistence-shaped
 * @param {number} args.trackId
 * @param {Uint8Array|Buffer} args.bytes
 * @param {IngestStorage} args.storage
 * @param {number} [args.durationMsHint] - used only when the file can't be decoded
 * @param {number} [args.frameIntervalMs]
 * @returns {Promise<object>} ingest summary
 */
export async function ingestTrackAudio({ api, trackId, bytes, storage, durationMsHint, frameIntervalMs = 100 }) {
  if (!api) throw new Error('ingestTrackAudio requires a catalog api');
  if (!storage?.putAudio || !storage?.putSidecar) throw new Error('ingestTrackAudio requires a storage adapter');
  if (!Number.isInteger(trackId)) throw new Error('ingestTrackAudio requires a numeric trackId');
  if (!bytes || !(bytes.byteLength ?? bytes.length)) throw new Error('ingestTrackAudio requires audio bytes');

  const track = await api.tracks.findById(trackId);
  if (!track) throw new Error(`Track ${trackId} not found`);

  // 1. Fingerprint the raw bytes (the deterministic identity).
  const fingerprint = computeAudioFingerprint(bytes);

  // 2. Store the audio asset → stream URL.
  const audio = await storage.putAudio({
    fingerprintId: fingerprint.fingerprintId,
    sha256: fingerprint.sha256,
    bytes,
    format: fingerprint.format,
    trackId,
  });

  // 3. Compile the resonance sidecar (real DSP for WAV, deterministic synth otherwise).
  const { sidecar, analysisVersion, source } = compileSidecar({
    bytes,
    trackId: `track:${trackId}`,
    fingerprintId: fingerprint.fingerprintId,
    durationMsHint,
    frameIntervalMs,
  });

  // 4. Store the sidecar JSON → sidecar URL.
  const sidecarAsset = await storage.putSidecar({
    fingerprintId: fingerprint.fingerprintId,
    json: sidecar,
    trackId,
  });

  // 5. Bind everything to the track + register the sidecar.
  await api.tracks.setFingerprint(trackId, fingerprint.fingerprintId);
  await api.tracks.setAssets(trackId, {
    streamUrl: audio.url,
    durationMs: sidecar.sourceDurationMs,
  });
  await api.resonance.register({
    fingerprintId: fingerprint.fingerprintId,
    trackId,
    sidecarUrl: sidecarAsset.url,
    schemaVersion: sidecar.schemaVersion,
    analysisVersion,
    sourceDurationMs: sidecar.sourceDurationMs,
    status: 'ready',
  });

  return {
    trackId,
    fingerprintId: fingerprint.fingerprintId,
    sha256: fingerprint.sha256,
    format: fingerprint.format,
    streamUrl: audio.url,
    sidecarUrl: sidecarAsset.url,
    analysisVersion,
    analysisSource: source,
    durationMs: sidecar.sourceDurationMs,
    frameCount: sidecar.frames.length,
  };
}
