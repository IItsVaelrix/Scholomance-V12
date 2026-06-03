import { describe, expect, it } from 'vitest';
import { buildPhotonicOperationGraph } from '../../src/lib/photonic-quantization/operation-graph.js';

describe('buildPhotonicOperationGraph', () => {
  it('builds a stable graph for rotated quantized KV packets', () => {
    const graph = buildPhotonicOperationGraph({
      packetId: 'kv',
      sourceKind: 'kv-cache',
      dimension: 4096,
      bitWidth: 3,
      storageKind: 'packed',
      rotationKind: 'random-rotation',
      quantizationKind: 'polar',
      residualKind: 'qjl',
      targetOperation: 'inner-product',
      metadata: {},
    });

    expect(graph.operations.map((operation) => operation.id)).toEqual([
      'op_input_load',
      'op_rotation',
      'op_quantize',
      'op_residual',
      'op_target_compute',
    ]);

    expect(graph.linearPath).toContain('op_rotation');
    expect(graph.linearPath).toContain('op_target_compute');
    expect(graph.graphHash).toMatch(/^[0-9A-F]{8}$/);
  });
});
