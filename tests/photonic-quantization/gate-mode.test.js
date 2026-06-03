import { describe, expect, it } from 'vitest';
import {
  analyzePhotonicQuantizationBridge,
  PHOTONIC_BRIDGE_MODES,
} from '../../src/lib/photonic-quantization/index.js';

describe('Photonic bridge gate mode', () => {
  it('marks report as not ok when below gate threshold', () => {
    const report = analyzePhotonicQuantizationBridge({
      packetId: 'gate_low',
      sourceKind: 'manual',
      dimension: 32,
      bitWidth: 32,
      storageKind: 'float32',
      rotationKind: 'none',
      quantizationKind: 'none',
      residualKind: 'none',
      targetOperation: 'diagnostic',
    }, {
      mode: PHOTONIC_BRIDGE_MODES.GATE,
      config: {
        minGateScore: 0.99,
      },
    });

    expect(report.ok).toBe(false);
    expect(report.blockedReasons.length).toBeGreaterThan(0);
  });
});
