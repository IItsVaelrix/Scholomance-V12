import { describe, it, expect } from 'vitest';
import { validatePhotonicVectorPacket } from '../../src/lib/photonic-quantization/vector-packet.schema.js';
import { buildPhotonicOperationGraph } from '../../src/lib/photonic-quantization/operation-graph.js';
import { classifyVectorCodec } from '../../src/lib/photonic-quantization/vector-codec.js';
import { scorePhotonicCompatibility } from '../../src/lib/photonic-quantization/compatibility-score.js';
import { analyzePhotonicQuantizationBridge } from '../../src/lib/photonic-quantization/index.js';

function makeQbitPacket(overrides = {}) {
  return {
    packetId: 'qbit-test',
    sourceKind: 'qbit-field',
    dimension: 64,
    bitWidth: 4,
    storageKind: 'int8',
    rotationKind: 'random-rotation',
    quantizationKind: 'scalar',
    residualKind: 'qjl',
    targetOperation: 'matrix-vector',
    data: new Int8Array(64),
    metadata: { attenuationModel: 'inverse_square', seedCount: 32 },
    ...overrides,
  };
}

describe('photonic-quantization qbit-field packet support', () => {
  describe('validatePhotonicVectorPacket', () => {
    it('accepts qbit-field as a valid sourceKind', () => {
      const result = validatePhotonicVectorPacket(makeQbitPacket());
      expect(result.ok).toBe(true);
      expect(result.packet.sourceKind).toBe('qbit-field');
    });

    it('previously valid kv-cache packets still validate (no regression)', () => {
      const result = validatePhotonicVectorPacket({
        packetId: 'kv',
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
      expect(result.packet.sourceKind).toBe('kv-cache');
    });
  });

  describe('buildPhotonicOperationGraph', () => {
    it('injects a PROPAGATE op for qbit-field packets', () => {
      const packet = makeQbitPacket();
      const graph = buildPhotonicOperationGraph(packet);
      const propagateOp = graph.operations.find((op) => op.kind === 'PROPAGATE');
      expect(propagateOp).toBeDefined();
      expect(propagateOp.id).toBe('op_qbit_propagate');
      expect(propagateOp.executionClass).toBe('photonic-friendly');
    });

    it('PROPAGATE op carries the attenuationModel from packet metadata', () => {
      const packet = makeQbitPacket({
        metadata: { attenuationModel: 'phi_attenuation' },
      });
      const graph = buildPhotonicOperationGraph(packet);
      const propagateOp = graph.operations.find((op) => op.kind === 'PROPAGATE');
      expect(propagateOp.params.attenuationModel).toBe('phi_attenuation');
    });

    it('linearPath includes the PROPAGATE op for qbit-field packets', () => {
      const packet = makeQbitPacket();
      const graph = buildPhotonicOperationGraph(packet);
      expect(graph.linearPath).toContain('op_qbit_propagate');
    });

    it('non-qbit-field packets do NOT get a PROPAGATE op', () => {
      const packet = {
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
      };
      const graph = buildPhotonicOperationGraph(packet);
      const propagateOp = graph.operations.find((op) => op.kind === 'PROPAGATE');
      expect(propagateOp).toBeUndefined();
    });
  });

  describe('scorePhotonicCompatibility', () => {
    it('grades qbit-field packets at A or S (spec §4 Level 4 target)', () => {
      const packet = makeQbitPacket();
      const codec = classifyVectorCodec(packet);
      const graph = buildPhotonicOperationGraph(packet);
      const score = scorePhotonicCompatibility(packet, codec, graph);
      expect(['A', 'S']).toContain(score.grade);
    });

    it('targetFit for qbit-field is at least 0.9 even when targetOperation is diagnostic', () => {
      const packet = makeQbitPacket({ targetOperation: 'diagnostic' });
      const codec = classifyVectorCodec(packet);
      const graph = buildPhotonicOperationGraph(packet);
      const score = scorePhotonicCompatibility(packet, codec, graph);
      expect(score.factors.targetFit).toBeGreaterThanOrEqual(0.9);
    });
  });

  describe('analyzePhotonicQuantizationBridge end-to-end', () => {
    it('returns a bridge report with grade A or S for qbit-field packets', () => {
      const packet = makeQbitPacket();
      const report = analyzePhotonicQuantizationBridge(packet);
      expect(report.ok).toBe(true);
      expect(['A', 'S']).toContain(report.compatibilityGrade);
    });

    it('produces a stable reportHash for the same qbit-field packet', () => {
      const packet = makeQbitPacket();
      const a = analyzePhotonicQuantizationBridge(packet);
      const b = analyzePhotonicQuantizationBridge(packet);
      expect(a.reportHash).toBe(b.reportHash);
    });
  });
});
