import { describe, expect, it } from 'vitest';
import { createRetinaBrushStrokeBatcher } from '../../src/lib/photonic-retina/index.js';

function createBatcher() {
  return createRetinaBrushStrokeBatcher({
    batchSize: 2,
    dimensions: { width: 100, height: 100 },
    strokeId: 'stroke-a',
    retinaOptions: { targetDimension: 10, rotationKind: 'none' },
  });
}

describe('retina-stream', () => {
  it('emits a brush-stroke packet when the batch reaches capacity', () => {
    const batcher = createBatcher();

    expect(batcher.addPoint({ x: 1, y: 2, pressure: 0.5 })).toBeNull();
    const packet = batcher.addPoint({ x: 3, y: 4, pressure: 1 });

    expect(packet.sourceKind).toBe('brush-stroke');
    expect(packet.dimension).toBe(10);
    expect(batcher.pendingCount).toBe(0);
  });

  it('creates deterministic packet IDs for identical stroke streams', () => {
    const left = createBatcher();
    const right = createBatcher();

    left.addPoint({ x: 1, y: 2, pressure: 0.5 });
    right.addPoint({ x: 1, y: 2, pressure: 0.5 });

    const leftPacket = left.flush();
    const rightPacket = right.flush();

    expect(leftPacket.packetId).toBe(rightPacket.packetId);
    expect(Array.from(leftPacket.data)).toEqual(Array.from(rightPacket.data));
  });
});
