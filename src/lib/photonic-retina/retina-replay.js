import { encodeToPhotonicRetina } from './retina-adapter.js';
import { stableHash } from './retina-hash.js';

function cloneReplayValue(value) {
  if (value === null || value === undefined) return value;

  if (ArrayBuffer.isView(value)) {
    return new value.constructor(value);
  }

  if (value instanceof Map) {
    return new Map(Array.from(value.entries()).map(([key, entryValue]) => [
      cloneReplayValue(key),
      cloneReplayValue(entryValue),
    ]));
  }

  if (Array.isArray(value)) {
    return Object.freeze(value.map(cloneReplayValue));
  }

  if (typeof value === 'object') {
    const clone = {};
    Object.keys(value).forEach((key) => {
      clone[key] = cloneReplayValue(value[key]);
    });
    return Object.freeze(clone);
  }

  return value;
}

export function createRetinaReplayEntry(input, options = {}) {
  const packet = encodeToPhotonicRetina(input, options);
  const replayInput = cloneReplayValue(input);
  const replayOptions = cloneReplayValue(options);

  return Object.freeze({
    input: replayInput,
    options: replayOptions,
    packetId: packet?.packetId || null,
    packetHash: packet ? stableHash(Array.from(packet.data)) : null,
  });
}

export function replayRetinaEntries(entries = []) {
  return Object.freeze(entries.map((entry) => {
    const packet = encodeToPhotonicRetina(entry.input, entry.options || {});
    const packetHash = packet ? stableHash(Array.from(packet.data)) : null;
    const expectedPacketId = entry.packetId || null;
    const expectedPacketHash = entry.packetHash || null;

    return Object.freeze({
      packet,
      expectedPacketId,
      expectedPacketHash,
      matches: packet
        ? packet.packetId === expectedPacketId && packetHash === expectedPacketHash
        : expectedPacketId === null && expectedPacketHash === null,
    });
  }));
}
