import { describe, it, expect } from 'vitest';
import * as harness from './truesight.renderHarness.jsx';

describe('truesight.renderHarness exports', () => {
  it('exports at least one named export', () => {
    expect(Object.keys(harness).length).toBeGreaterThan(0);
  });

  it('all exports are functions or objects', () => {
    for (const [, value] of Object.entries(harness)) {
      const t = typeof value;
      expect(['function', 'object']).toContain(t);
    }
  });
});
