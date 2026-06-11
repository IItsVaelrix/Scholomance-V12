import { describe, it, expect } from 'vitest';
import { createTemplateGrid } from '../../../codex/core/pixelbrain/template-grid-engine.js';

describe('PixelBrain — Grid Limits', () => {
  it('160x144 safe grid passes without warnings', () => {
    const grid = createTemplateGrid({ width: 160, height: 144 });
    expect(grid.warnings).toEqual([]);
  });

  it('512x512 warning grid passes with warning message', () => {
    const grid = createTemplateGrid({ width: 513, height: 512 });
    expect(grid.warnings.length).toBeGreaterThan(0);
    expect(grid.warnings[0]).toContain('exceed warning limits');
  });

  it('1025x1024 hard max grid fails by throwing BytecodeError', () => {
    expect(() => createTemplateGrid({ width: 1025, height: 1024 }))
      .toThrow(/PB-ERR-v1-RANGE/);
  });
});
