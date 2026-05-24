import { describe, it, expect } from 'vitest';
import { mapFormantsToMetrics, getVisemeStyles } from '../../../../../src/lib/truesight/color/visemeMapping.js';

describe('mapFormantsToMetrics', () => {
  it('returns null for null, empty, or single-element formant arrays', () => {
    expect(mapFormantsToMetrics(null)).toBeNull();
    expect(mapFormantsToMetrics([])).toBeNull();
    expect(mapFormantsToMetrics([500])).toBeNull();
  });

  it('normalizes schwa-center [500, 1500] correctly', () => {
    const m = mapFormantsToMetrics([500, 1500]);
    expect(m).not.toBeNull();
    // spreadNorm = (500 - 200) / 800 = 0.375
    expect(m.spreadNorm).toBeCloseTo(0.375, 4);
    // centroidNorm = (1500 - 600) / 1900 ≈ 0.4737
    expect(m.centroidNorm).toBeCloseTo(0.4737, 3);
    // distinctNorm near 0 (schwa is the center)
    expect(m.distinctNorm).toBeCloseTo(0, 1);
  });

  it('clamps spreadNorm and centroidNorm to [0, 1] for extreme low values', () => {
    const m = mapFormantsToMetrics([0, 0]);
    expect(m.spreadNorm).toBe(0);
    expect(m.centroidNorm).toBe(0);
  });

  it('clamps spreadNorm and centroidNorm to [0, 1] for extreme high values', () => {
    const m = mapFormantsToMetrics([2000, 5000]);
    expect(m.spreadNorm).toBe(1);
    expect(m.centroidNorm).toBe(1);
  });

  it('skewNorm is positive for front vowels (high F2) and negative for back vowels (low F2)', () => {
    const front = mapFormantsToMetrics([300, 2400]);
    const back = mapFormantsToMetrics([700, 800]);
    expect(front.skewNorm).toBeGreaterThan(0);
    expect(back.skewNorm).toBeLessThan(0);
  });

  it('returns all five metric keys', () => {
    const m = mapFormantsToMetrics([400, 1200]);
    expect(m).toHaveProperty('centroidNorm');
    expect(m).toHaveProperty('spreadNorm');
    expect(m).toHaveProperty('skewNorm');
    expect(m).toHaveProperty('sharpnessNorm');
    expect(m).toHaveProperty('distinctNorm');
  });

  it('is deterministic — same formants produce same metrics', () => {
    const a = mapFormantsToMetrics([600, 1200]);
    const b = mapFormantsToMetrics([600, 1200]);
    expect(a).toEqual(b);
  });

  it('sharpnessNorm floor is at least 0.3', () => {
    const m = mapFormantsToMetrics([500, 1500]);
    expect(m.sharpnessNorm).toBeGreaterThanOrEqual(0.3);
  });
});

describe('getVisemeStyles', () => {
  it('returns empty object for null or undefined metrics', () => {
    expect(getVisemeStyles(null)).toEqual({});
    expect(getVisemeStyles(undefined)).toEqual({});
  });

  it('returns all eight CSS custom property keys', () => {
    const styles = getVisemeStyles(mapFormantsToMetrics([500, 1500]));
    expect(styles).toHaveProperty('--vb-viseme-radius');
    expect(styles).toHaveProperty('--vb-viseme-tracking');
    expect(styles).toHaveProperty('--vb-viseme-padding-x');
    expect(styles).toHaveProperty('--vb-viseme-skew');
    expect(styles).toHaveProperty('--vb-viseme-contrast');
    expect(styles).toHaveProperty('--vb-viseme-weight');
    expect(styles).toHaveProperty('--vb-viseme-shadow-blur');
    expect(styles).toHaveProperty('--vb-viseme-brightness');
  });

  it('anchor words have zero shadow blur', () => {
    const styles = getVisemeStyles(mapFormantsToMetrics([500, 1500]), true);
    expect(styles['--vb-viseme-shadow-blur']).toBe('0px');
  });

  it('non-anchor words have nonzero shadow blur', () => {
    const styles = getVisemeStyles(mapFormantsToMetrics([500, 1500]), false);
    expect(styles['--vb-viseme-shadow-blur']).not.toBe('0px');
  });

  it('front vowels (high centroid) get smaller radius than back vowels', () => {
    const frontStyles = getVisemeStyles(mapFormantsToMetrics([300, 2400]));
    const backStyles = getVisemeStyles(mapFormantsToMetrics([700, 800]));
    const frontRadius = parseInt(frontStyles['--vb-viseme-radius']);
    const backRadius = parseInt(backStyles['--vb-viseme-radius']);
    expect(frontRadius).toBeLessThan(backRadius);
  });

  it('weight is a number in the range 400–800', () => {
    const styles = getVisemeStyles(mapFormantsToMetrics([500, 1500]));
    const weight = styles['--vb-viseme-weight'];
    expect(weight).toBeGreaterThanOrEqual(400);
    expect(weight).toBeLessThanOrEqual(800);
  });

  it('defaults work when metrics object has no properties', () => {
    const styles = getVisemeStyles({});
    expect(styles).toHaveProperty('--vb-viseme-radius');
  });
});
