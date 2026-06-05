import { describe, expect, it } from 'vitest';
import { createPhotonicRetinaPacketCache } from '../../src/lib/photonic-retina/index.js';

function sampleInput(x = 1) {
  return {
    sourceKind: 'coordinates',
    payload: [{ x, y: 2, color: '#44ccff' }],
    dimensions: { width: 10, height: 10 },
  };
}

describe('retina-cache', () => {
  it('returns the cached packet for the same input and config', () => {
    const cache = createPhotonicRetinaPacketCache({ maxEntries: 2 });
    const input = sampleInput();
    const first = cache.getOrEncode(input, { targetDimension: 8 });
    const second = cache.getOrEncode(input, { targetDimension: 8 });

    expect(first).toBe(second);
    expect(cache.size).toBe(1);
  });

  it('supports destructured cache methods', () => {
    const cache = createPhotonicRetinaPacketCache({ maxEntries: 2 });
    const { getOrEncode } = cache;
    const packet = getOrEncode(sampleInput(), { targetDimension: 8 });

    expect(packet.packetId).toMatch(/^retina_v1_/);
    expect(cache.size).toBe(1);
  });

  it('evicts least recently used packets deterministically', () => {
    const cache = createPhotonicRetinaPacketCache({ maxEntries: 2 });
    const first = cache.getOrEncode(sampleInput(1), { targetDimension: 8 });
    cache.getOrEncode(sampleInput(2), { targetDimension: 8 });
    cache.getOrEncode(sampleInput(3), { targetDimension: 8 });
    const recoded = cache.getOrEncode(sampleInput(1), { targetDimension: 8 });

    expect(cache.size).toBe(2);
    expect(recoded.packetId).toBe(first.packetId);
    expect(recoded).not.toBe(first);
  });
});
