import { describe, expect, it } from 'vitest';
import { analyzePhotonicQuantizationBridge } from '../../src/lib/photonic-quantization/index.js';
import { encodeToPhotonicRetina } from '../../src/lib/photonic-retina/index.js';

describe('retina bridge compatibility', () => {
  it('produces packets accepted by the Photonic Quantization Bridge validator', () => {
    const packet = encodeToPhotonicRetina(
      {
        sourceKind: 'colors',
        payload: ['#44ccff', '#ffffff', '#111111'],
      },
      {
        targetDimension: 16,
        bitWidth: 4,
      }
    );
    const report = analyzePhotonicQuantizationBridge(packet);

    expect(report.ok).toBe(true);
    expect(report.packetId).toBe(packet.packetId);
    expect(report.operationGraph).not.toBeNull();
    expect(report.reportHash).toMatch(/^[A-F0-9]+$/);
  });

  it('keeps bridge reports deterministic for the same Retina packet', () => {
    const packet = encodeToPhotonicRetina(
      { sourceKind: 'colors', payload: ['#44ccff'] },
      { targetDimension: 16 }
    );

    const first = analyzePhotonicQuantizationBridge(packet);
    const second = analyzePhotonicQuantizationBridge(packet);

    expect(first.reportHash).toBe(second.reportHash);
  });
});
