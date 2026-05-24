import { describe, it, expect } from 'vitest';
import * as mod from '../../../../../../codex/core/shared/truesight/compiler/adaptiveWhitespaceGrid.ts';

describe('codex/core/shared/truesight/compiler/adaptiveWhitespaceGrid', () => {
  it('exports at least one named export', () => {
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });

  it('exports measureTextWidth as a function if present', () => {
    if ('measureTextWidth' in mod) {
      expect(typeof mod.measureTextWidth).toBe('function');
    }
  });
});
