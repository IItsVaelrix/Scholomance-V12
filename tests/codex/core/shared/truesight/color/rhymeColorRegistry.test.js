import { describe, it, expect } from 'vitest';
import * as mod from '../../../../../../codex/core/shared/truesight/color/rhymeColorRegistry.js';

describe('codex/core/shared/truesight/color/rhymeColorRegistry', () => {
  it('exports buildResonancePalette as a function', () => {
    expect(typeof mod.buildResonancePalette).toBe('function');
  });

  it('exports resolveResonanceColor as a function', () => {
    expect(typeof mod.resolveResonanceColor).toBe('function');
  });

  it('resolveResonanceColor returns a hex string for a known rhyme key', () => {
    const result = mod.resolveResonanceColor('AY1 T', 'DEFAULT');
    expect(typeof result).toBe('string');
    expect(result).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('resolveResonanceColor returns the fallback when rhymeKey is falsy', () => {
    expect(mod.resolveResonanceColor(null)).toBeNull();
    expect(mod.resolveResonanceColor('')).toBeNull();
  });

  it('buildResonancePalette returns an object', () => {
    expect(typeof mod.buildResonancePalette([], 'DEFAULT')).toBe('object');
  });
});
