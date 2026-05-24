import { describe, it, expect } from 'vitest';
import * as oklchModule from '../../../../../src/lib/truesight/color/oklch.js';

describe('oklch re-exports', () => {
  it('exports oklchToRgb as a function', () => {
    expect(typeof oklchModule.oklchToRgb).toBe('function');
  });

  it('exports oklchToHex as a function', () => {
    expect(typeof oklchModule.oklchToHex).toBe('function');
  });

  it('exports deltaE as a function', () => {
    expect(typeof oklchModule.deltaE).toBe('function');
  });
});
