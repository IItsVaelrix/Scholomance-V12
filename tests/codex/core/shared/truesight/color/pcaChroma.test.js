import { describe, it, expect } from 'vitest';
import * as mod from '../../../../../../codex/core/shared/truesight/color/pcaChroma.js';

describe('codex/core/shared/truesight/color/pcaChroma', () => {
  it('exports resolveVerseIrColor as a function', () => {
    expect(typeof mod.resolveVerseIrColor).toBe('function');
  });

  it('exports computeBlendedHsl as a function', () => {
    expect(typeof mod.computeBlendedHsl).toBe('function');
  });

  it('exports VERSE_IR_PALETTE_FAMILIES', () => {
    expect(mod.VERSE_IR_PALETTE_FAMILIES).toBeDefined();
  });

  it('exports resolveSonicColor as a function', () => {
    expect(typeof mod.resolveSonicColor).toBe('function');
  });

  it('resolveVerseIrColor returns a hex string for a known vowel family', () => {
    const result = mod.resolveVerseIrColor('IY');
    expect(result.hex).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('resolveVerseIrColor returns null hex for an unknown family', () => {
    const result = mod.resolveVerseIrColor('INVALID_FAMILY');
    expect(result.hex).toBeNull();
  });

  it('resolveVerseIrColor hex is deterministic for the same input', () => {
    const a = mod.resolveVerseIrColor('AE', 'SONIC');
    const b = mod.resolveVerseIrColor('AE', 'SONIC');
    expect(a.hex).toBe(b.hex);
  });
});
