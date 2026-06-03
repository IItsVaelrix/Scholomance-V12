import { describe, expect, it } from 'vitest';
import { analyzePhotonicQuantizationBridge } from '../../src/lib/photonic-quantization/index.js';

describe('Photonic bridge deterministic output', () => {
  it('produces identical reportHash for identical input', () => {
    const input = {
      packetId: 'same',
      sourceKind: 'kv-cache',
      dimension: 4096,
      bitWidth: 3,
      storageKind: 'packed',
      rotationKind: 'random-rotation',
      quantizationKind: 'polar',
      residualKind: 'qjl',
      targetOperation: 'inner-product',
    };

    const first = analyzePhotonicQuantizationBridge(input);
    const second = analyzePhotonicQuantizationBridge(input);

    expect(first.reportHash).toBe(second.reportHash);
    expect(first.operationGraph.graphHash).toBe(second.operationGraph.graphHash);
  });
});
