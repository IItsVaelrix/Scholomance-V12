import { describe, it, expect } from 'vitest';
import * as rhymeColorRegistryModule from '../../../../../src/lib/truesight/color/rhymeColorRegistry.js';

describe('rhymeColorRegistry re-exports', () => {
  it('exports buildResonancePalette as a function', () => {
    expect(typeof rhymeColorRegistryModule.buildResonancePalette).toBe('function');
  });

  it('exports resolveResonanceColor as a function', () => {
    expect(typeof rhymeColorRegistryModule.resolveResonanceColor).toBe('function');
  });
});
