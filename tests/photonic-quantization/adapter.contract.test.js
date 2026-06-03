import { describe, expect, it } from 'vitest';
import { analyzePhotonicQuantizationBridge } from '../../src/lib/engine.adapter.js';

describe('photonic adapter contract', () => {
  it('exports analyzePhotonicQuantizationBridge through the engine adapter', () => {
    expect(typeof analyzePhotonicQuantizationBridge).toBe('function');
  });
});
