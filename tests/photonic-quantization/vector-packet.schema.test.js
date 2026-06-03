import { describe, expect, it } from 'vitest';
import { validatePhotonicVectorPacket } from '../../src/lib/photonic-quantization/vector-packet.schema.js';

describe('validatePhotonicVectorPacket', () => {
  it('normalizes a valid packet deterministically', () => {
    const result = validatePhotonicVectorPacket({
      packetId: 'A',
      sourceKind: 'kv-cache',
      dimension: 4096,
      bitWidth: 3,
      storageKind: 'packed',
      rotationKind: 'random-rotation',
      quantizationKind: 'polar',
      residualKind: 'qjl',
      targetOperation: 'inner-product',
    });

    expect(result.ok).toBe(true);
    expect(result.packet.dimension).toBe(4096);
    expect(result.packet.bitWidth).toBe(3);
    expect(result.packet.rotationKind).toBe('random-rotation');
  });

  it('returns deterministic diagnostics for invalid input', () => {
    const result = validatePhotonicVectorPacket(null);

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0].code).toBe('PHOTONIC_PACKET_INVALID');
  });
});
