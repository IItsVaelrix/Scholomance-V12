import { describe, it, expect } from 'vitest';
import * as mod from '../../../../../../codex/core/shared/truesight/color/oklch.js';

describe('codex/core/shared/truesight/color/oklch', () => {
  it('exports oklchToRgb as a function', () => {
    expect(typeof mod.oklchToRgb).toBe('function');
  });

  it('exports oklchToHex as a function', () => {
    expect(typeof mod.oklchToHex).toBe('function');
  });

  it('exports deltaE as a function', () => {
    expect(typeof mod.deltaE).toBe('function');
  });

  it('oklchToRgb(0, 0, 0) returns black', () => {
    const { r, g, b } = mod.oklchToRgb(0, 0, 0);
    expect(r).toBe(0);
    expect(g).toBe(0);
    expect(b).toBe(0);
  });

  it('oklchToHex(1, 0, 0) returns white', () => {
    expect(mod.oklchToHex(1, 0, 0)).toBe('#ffffff');
  });

  it('deltaE of identical colors is 0', () => {
    const color = { l: 0.7, c: 0.2, h: 240 };
    expect(mod.deltaE(color, color)).toBe(0);
  });
});
