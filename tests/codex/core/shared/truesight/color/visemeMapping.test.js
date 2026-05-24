import { describe, it, expect } from 'vitest';
import { mapFormantsToMetrics, getVisemeStyles } from '../../../../../../codex/core/shared/truesight/color/visemeMapping.js';

describe('codex mapFormantsToMetrics', () => {
  it('returns null for missing input', () => {
    expect(mapFormantsToMetrics(null)).toBeNull();
    expect(mapFormantsToMetrics([500])).toBeNull();
  });

  it('returns five metric keys for valid formants', () => {
    const m = mapFormantsToMetrics([500, 1500]);
    expect(m).toHaveProperty('centroidNorm');
    expect(m).toHaveProperty('spreadNorm');
    expect(m).toHaveProperty('skewNorm');
    expect(m).toHaveProperty('sharpnessNorm');
    expect(m).toHaveProperty('distinctNorm');
  });

  it('is deterministic', () => {
    expect(mapFormantsToMetrics([600, 1200])).toEqual(mapFormantsToMetrics([600, 1200]));
  });
});

describe('codex getVisemeStyles', () => {
  it('returns empty object for null input', () => {
    expect(getVisemeStyles(null)).toEqual({});
  });

  it('returns all eight CSS custom property keys', () => {
    const styles = getVisemeStyles(mapFormantsToMetrics([500, 1500]));
    expect(styles).toHaveProperty('--vb-viseme-radius');
    expect(styles).toHaveProperty('--vb-viseme-shadow-blur');
  });
});
