import { describe, it, expect } from 'vitest';
import * as adaptiveGridModule from '../../../../../src/lib/truesight/compiler/adaptiveWhitespaceGrid.ts';

describe('adaptiveWhitespaceGrid re-exports', () => {
  it('exports at least one named export', () => {
    const exports = Object.keys(adaptiveGridModule);
    expect(exports.length).toBeGreaterThan(0);
  });

  it('exports measureTextWidth as a function if present', () => {
    if ('measureTextWidth' in adaptiveGridModule) {
      expect(typeof adaptiveGridModule.measureTextWidth).toBe('function');
    }
  });
});
