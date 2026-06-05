/**
 * Audio fingerprint + WAV decoding — the "bytecode checksum extrapolated from
 * the uploaded .wav/.mp3" that anchors a track's deterministic identity (the
 * right-page genome + sidecar are both seeded from it).
 *
 * Pure, dependency-free (node:crypto only). PCM WAV is decoded natively here;
 * compressed formats are fingerprinted by content hash (decode requires a codec,
 * handled by the transcode worker in a later phase).
 *
 * PDR-2026-06-05-SONIC-EXCHANGE-NATIVE-LISTENING §12.
 */

import { createHash } from 'node:crypto';

/** SHA-256 hex of the raw bytes. */
export function sha256Hex(bytes) {
  return createHash('sha256').update(Buffer.from(bytes)).digest('hex');
}

/** Group the leading 16 hex chars into "7F3A-9C1D-2B6E-E7A9" (concept format). */
export function formatFingerprintId(hex) {
  const head = String(hex).slice(0, 16).toUpperCase();
  return (head.match(/.{1,4}/g) || [head]).join('-');
}

/**
 * Sniff container format from magic bytes.
 * @returns {'wav'|'mp3'|'flac'|'ogg'|'unknown'}
 */
export function detectFormat(bytes) {
  const b = Buffer.from(bytes.buffer ? bytes.buffer : bytes, bytes.byteOffset || 0, bytes.byteLength || bytes.length);
  if (b.length >= 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WAVE') return 'wav';
  if (b.length >= 4 && b.toString('ascii', 0, 4) === 'fLaC') return 'flac';
  if (b.length >= 4 && b.toString('ascii', 0, 4) === 'OggS') return 'ogg';
  if (b.length >= 3 && b.toString('ascii', 0, 3) === 'ID3') return 'mp3';
  if (b.length >= 2 && b[0] === 0xff && (b[1] & 0xe0) === 0xe0) return 'mp3';
  return 'unknown';
}

/**
 * Compute the content fingerprint.
 * @returns {{ sha256: string, fingerprintId: string, byteLength: number, format: string }}
 */
export function computeAudioFingerprint(bytes) {
  const sha256 = sha256Hex(bytes);
  return {
    sha256,
    fingerprintId: formatFingerprintId(sha256),
    byteLength: bytes.byteLength ?? bytes.length,
    format: detectFormat(bytes),
  };
}

/**
 * Decode a PCM WAV into a mono Float32 signal in [-1, 1].
 * Supports 8-bit unsigned, 16/24/32-bit signed PCM, and 32-bit float.
 * @returns {{ sampleRate, channels, samples: Float32Array, durationMs }|null}
 */
export function parseWav(bytes) {
  const buf = Buffer.from(bytes.buffer ? bytes.buffer : bytes, bytes.byteOffset || 0, bytes.byteLength || bytes.length);
  if (buf.length < 12 || buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') {
    return null;
  }

  let offset = 12;
  let fmt = null;
  let dataStart = -1;
  let dataLen = 0;
  while (offset + 8 <= buf.length) {
    const id = buf.toString('ascii', offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    const body = offset + 8;
    if (id === 'fmt ') {
      fmt = {
        audioFormat: buf.readUInt16LE(body),
        channels: buf.readUInt16LE(body + 2),
        sampleRate: buf.readUInt32LE(body + 4),
        bitsPerSample: buf.readUInt16LE(body + 14),
      };
    } else if (id === 'data') {
      dataStart = body;
      dataLen = Math.min(size, buf.length - body);
    }
    offset = body + size + (size & 1); // chunks are word-aligned
  }

  if (!fmt || dataStart < 0 || !fmt.channels || !fmt.sampleRate) return null;

  const { channels, sampleRate, bitsPerSample, audioFormat } = fmt;
  const bytesPerSample = bitsPerSample >> 3;
  if (!bytesPerSample) return null;
  const frameCount = Math.floor(dataLen / (bytesPerSample * channels));
  const samples = new Float32Array(frameCount);

  const readSample = (pos) => {
    if (audioFormat === 3 && bitsPerSample === 32) return buf.readFloatLE(pos);
    if (bitsPerSample === 8) return (buf.readUInt8(pos) - 128) / 128;
    if (bitsPerSample === 16) return buf.readInt16LE(pos) / 32768;
    if (bitsPerSample === 24) {
      const v = buf.readUIntLE(pos, 3);
      return (v >= 0x800000 ? v - 0x1000000 : v) / 0x800000;
    }
    if (bitsPerSample === 32) return buf.readInt32LE(pos) / 2147483648;
    return 0;
  };

  for (let i = 0; i < frameCount; i += 1) {
    let mix = 0;
    for (let c = 0; c < channels; c += 1) {
      mix += readSample(dataStart + (i * channels + c) * bytesPerSample);
    }
    samples[i] = mix / channels;
  }

  return {
    sampleRate,
    channels,
    samples,
    durationMs: Math.round((frameCount / sampleRate) * 1000),
  };
}
