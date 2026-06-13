/**
 * QA Validation: PixelBrain Construction Guides
 *
 * Regression test for the savage-audit finding that the page-level guide
 * builder produced fractional center coordinates (cx = 31.5 on a 64-wide
 * grid), writing off-lattice cells like "31.5,31.5" into a lattice engine
 * whose contract is integer cell keys.
 */

import { describe, it, expect } from 'vitest';
import { buildConstructionGuideCells } from '../../../codex/core/pixelbrain/construction-guides.js';

describe('buildConstructionGuideCells', () => {
  it('produces only integer, in-bounds coordinates on an even-sized grid', () => {
    const cells = buildConstructionGuideCells({ width: 64, height: 64 });
    expect(cells.length).toBeGreaterThan(0);
    for (const cell of cells) {
      expect(Number.isInteger(cell.x)).toBe(true);
      expect(Number.isInteger(cell.y)).toBe(true);
      expect(cell.x).toBeGreaterThanOrEqual(0);
      expect(cell.x).toBeLessThan(64);
      expect(cell.y).toBeGreaterThanOrEqual(0);
      expect(cell.y).toBeLessThan(64);
      expect(typeof cell.color).toBe('string');
    }
  });

  it('places the construction cross at the grid center', () => {
    const cells = buildConstructionGuideCells({ width: 64, height: 64 });
    const cx = 31; // floor((64 - 1) / 2)
    expect(cells.some(c => c.x === cx && c.y === cx)).toBe(true);
    // Cardinal ticks around the center
    expect(cells.some(c => c.x === cx + 2 && c.y === cx)).toBe(true);
    expect(cells.some(c => c.x === cx && c.y === cx - 2)).toBe(true);
  });

  it('adapts to non-square grids without leaving bounds', () => {
    const cells = buildConstructionGuideCells({ width: 64, height: 80 });
    for (const cell of cells) {
      expect(cell.x).toBeGreaterThanOrEqual(0);
      expect(cell.x).toBeLessThan(64);
      expect(cell.y).toBeGreaterThanOrEqual(0);
      expect(cell.y).toBeLessThan(80);
    }
  });

  it('includes rings and radials, not just the cross', () => {
    const cells = buildConstructionGuideCells({ width: 64, height: 64 });
    expect(cells.some(c => typeof c.ring === 'number')).toBe(true);
    expect(cells.some(c => typeof c.radial === 'number')).toBe(true);
  });
});
