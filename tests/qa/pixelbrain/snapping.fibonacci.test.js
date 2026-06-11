import { describe, it, expect } from 'vitest';
import { snapToGrid, getCellAtPosition, getCellOrigin } from '../../../codex/core/pixelbrain/template-grid-engine.js';

describe('PixelBrain — Fibonacci Grid Snapping', () => {
  const grid = {
    width: 160,
    height: 144,
    cellSize: 8,
    gridType: 'fibonacci',
    snapStrength: 1.0,
  };

  it('resolves points to deterministic regions', () => {
    const res = snapToGrid(20, 20, grid);
    expect(res.cellId).toBeDefined();
    expect(res.cellId).toContain('fib_cell_');
  });

  it('same pointer always resolves to same cell', () => {
    const res1 = snapToGrid(50, 60, grid);
    const res2 = snapToGrid(50, 60, grid);
    expect(res1.cellId).toBe(res2.cellId);
    expect(res1.snappedX).toBe(res2.snappedX);
    expect(res1.snappedY).toBe(res2.snappedY);
  });

  it('getCellAtPosition and getCellOrigin round-trip correctly', () => {
    const x = 40;
    const y = 50;
    const cell = getCellAtPosition(grid, x, y);
    expect(cell.col).toBeDefined();
    expect(cell.row).toBeDefined();

    const origin = getCellOrigin(grid, cell.col, cell.row);
    expect(origin.x).toBeCloseTo(cell.x, 3);
    expect(origin.y).toBeCloseTo(cell.y, 3);
  });
});
