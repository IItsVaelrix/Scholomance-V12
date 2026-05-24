import { describe, it, expect } from 'vitest';
import * as pcaChromaModule from '../../../../../src/lib/truesight/color/pcaChroma.js';

describe('pcaChroma re-exports', () => {
  it('exports resolveVerseIrColor as a function', () => {
    expect(typeof pcaChromaModule.resolveVerseIrColor).toBe('function');
  });

  it('exports computeBlendedHsl as a function', () => {
    expect(typeof pcaChromaModule.computeBlendedHsl).toBe('function');
  });

  it('exports VERSE_IR_PALETTE_FAMILIES', () => {
    expect(pcaChromaModule.VERSE_IR_PALETTE_FAMILIES).toBeDefined();
  });

  it('exports resolveSonicColor as a function', () => {
    expect(typeof pcaChromaModule.resolveSonicColor).toBe('function');
  });
});
