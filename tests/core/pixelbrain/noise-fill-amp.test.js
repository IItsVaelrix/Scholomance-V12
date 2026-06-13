import { describe, it, expect } from 'vitest';
import { NoiseFillAMP } from '../../../codex/core/pixelbrain/noise-fill-amp.js';
import { normalizePB_NOISE_v1 } from '../../../codex/core/pixelbrain/pixelbrain-asset-packet.js';

describe('NoiseFillAMP', () => {
  it('modulates intensity on existing cells deterministically', () => {
    const cells = [{ x: 10, y: 10, color: '#fff', partId: 'blade' }];
    const noise = normalizePB_NOISE_v1({ contract: 'PB-NOISE-v1', type: 'fbm', seed: 123, frequency: 0.1, amplitude: 0.5 });
    const result = NoiseFillAMP(cells, noise);
    expect(result.fills.length).toBe(1);
    expect(result.fills[0].intensity).toBeDefined();
    expect(typeof result.fills[0].intensity).toBe('number');
  });

  it('is deterministic for same seed', () => {
    const cells = [{ x: 5, y: 5, color: '#fff' }];
    const noise = normalizePB_NOISE_v1({ contract: 'PB-NOISE-v1', seed: 42, type: 'value' });
    const a = NoiseFillAMP(cells, noise).fills[0].intensity;
    const b = NoiseFillAMP(cells, noise).fills[0].intensity;
    expect(a).toBe(b);
  });
});
