import { encodeToPhotonicRetina } from './retina-adapter.js';
import { stableHash } from './retina-hash.js';
import { normalizeRetinaConfig } from './retina-schema.js';

const DEFAULT_MAX_CACHE_ENTRIES = 128;

function normalizeMaxEntries(value) {
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric > 0 ? numeric : DEFAULT_MAX_CACHE_ENTRIES;
}

export function createPhotonicRetinaPacketCache(options = {}) {
  const maxEntries = normalizeMaxEntries(options.maxEntries);
  const entries = new Map();

  function getKey(input, retinaOptions = {}) {
    return stableHash({
      input,
      config: normalizeRetinaConfig(retinaOptions),
    });
  }

  function get(packetKey) {
    if (!entries.has(packetKey)) return null;
    const packet = entries.get(packetKey);
    entries.delete(packetKey);
    entries.set(packetKey, packet);
    return packet;
  }

  function remember(key, packet) {
    if (!packet) return null;

    if (entries.has(key)) {
      entries.delete(key);
    }

    entries.set(key, packet);

    while (entries.size > maxEntries) {
      const oldestKey = entries.keys().next().value;
      entries.delete(oldestKey);
    }

    return packet;
  }

  return Object.freeze({
    get size() {
      return entries.size;
    },
    clear() {
      entries.clear();
    },
    getKey,
    get,
    getOrEncode(input, retinaOptions = {}) {
      const key = getKey(input, retinaOptions);
      const cached = get(key);
      if (cached) return cached;
      return remember(key, encodeToPhotonicRetina(input, retinaOptions));
    },
  });
}
