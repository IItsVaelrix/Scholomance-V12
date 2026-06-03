import { describe, expect, it } from 'vitest';
import {
  analyzePhotonicQuantizationBridge,
  PHOTONIC_BRIDGE_MODES,
} from '../../src/lib/photonic-quantization/index.js';

describe('Photonic bridge shadow mode', () => {
  it('does not block low-compatibility packets', () => {
    const report = analyzePhotonicQuantizationBridge({
      packetId: 'low',
      sourceKind: 'manual',
      dimension: 32,
      bitWidth: 32,
      storageKind: 'float32',
      rotationKind: 'none',
      quantizationKind: 'none',
      residualKind: 'none',
      targetOperation: 'diagnostic',
    }, {
      mode: PHOTONIC_BRIDGE_MODES.SHADOW,
    });

    expect(report.ok).toBe(true);
    expect(report.mode).toBe('shadow');
    expect(report.blockedReasons).toEqual([]);
  });
});
