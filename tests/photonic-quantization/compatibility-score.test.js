import { describe, expect, it } from 'vitest';
import { classifyVectorCodec } from '../../src/lib/photonic-quantization/vector-codec.js';
import { buildPhotonicOperationGraph } from '../../src/lib/photonic-quantization/operation-graph.js';
import { scorePhotonicCompatibility } from '../../src/lib/photonic-quantization/compatibility-score.js';

describe('scorePhotonicCompatibility', () => {
  it('returns the same score for the same packet', () => {
    const packet = {
      packetId: 'stable',
      sourceKind: 'kv-cache',
      dimension: 4096,
      bitWidth: 3,
      storageKind: 'packed',
      rotationKind: 'random-rotation',
      quantizationKind: 'polar',
      residualKind: 'qjl',
      targetOperation: 'inner-product',
      metadata: {},
    };

    const codecProfile = classifyVectorCodec(packet);
    const graph = buildPhotonicOperationGraph(packet);

    const first = scorePhotonicCompatibility(packet, codecProfile, graph);
    const second = scorePhotonicCompatibility(packet, codecProfile, graph);

    expect(first).toEqual(second);
    expect(first.score).toBeGreaterThan(0);
    expect(['S', 'A', 'B', 'C', 'D']).toContain(first.grade);
  });
});
