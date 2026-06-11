import { describe, it, expect } from 'vitest';
import { snapToGrid, getCellAtPosition, getCellOrigin } from '../../../codex/core/pixelbrain/template-grid-engine.js';

describe('PixelBrain — Circular Grid Snapping', () => {
  const grid = {
    width: 160,
    height: 144,
    cellSize: 8,
    gridType: 'circular',
    snapStrength: 1.0,
  };

  it('center point resolves to legal center cell', () => {
    const res = snapToGrid(80, 72, grid);
    expect(res.snappedX).toBe(80);
    expect(res.snappedY).toBe(72);
    expect(res.cellId).toBe('circ_0_0');
  });

  it('same pointer always resolves to same cell', () => {
    const res1 = snapToGrid(90, 80, grid);
    const res2 = snapToGrid(90, 80, grid);
    expect(res1.cellId).toBe(res2.cellId);
    expect(res1.snappedX).toBe(res2.snappedX);
    expect(res1.snappedY).toBe(res2.snappedY);
  });

  it('getCellAtPosition and getCellOrigin round-trip correctly', () => {
    const x = 100;
    const y = 90;
    const cell = getCellAtPosition(grid, x, y);
    expect(cell.col).toBeDefined();
    expect(cell.row).toBeDefined();

    const origin = getCellOrigin(grid, cell.col, cell.row);
    expect(origin.x).toBeCloseTo(cell.x, 3);
    expect(origin.y).toBeCloseTo(cell.y, 3);
  });
});
