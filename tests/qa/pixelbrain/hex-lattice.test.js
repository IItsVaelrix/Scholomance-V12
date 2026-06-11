/**
 * HEXAGONAL LATTICE CONTRACT TESTS
 *
 * The hex grid is one lattice with three views: snap, preview, hit-test.
 * These tests pin the contract that all three views agree on the same set
 * of hex centers (pointy-top, odd-r offset rows), and that the bucket tool
 * respects region boundaries.
 */

import { describe, it, expect } from 'vitest';
import {
  createTemplateGrid,
  snapToGrid,
  generateGridPreview,
  getCellAtPosition,
  getCellOrigin,
  getGridMetrics,
  floodFill,
  createLayer,
  setCell,
  getCell,
  exportToAseprite,
  importFromAseprite,
  GRID_TYPES,
} from '../../../codex/core/pixelbrain/template-grid-engine.js';

const CELL = 10;
const HEX_H = CELL * Math.sqrt(3) / 2; // row pitch ≈ 8.66
const HEX_R = CELL / Math.sqrt(3);     // circumradius of a tiling pointy-top hex

function hexGrid(overrides = {}) {
  return createTemplateGrid({
    gridType: GRID_TYPES.HEXAGONAL,
    cellSize: CELL,
    width: 100,
    height: 100,
    snapStrength: 1,
    ...overrides,
  });
}

describe('Hexagonal lattice — one lattice, three agreeing views', () => {
  it('snaps to odd-row offset centers, not a rectangular lattice', () => {
    const grid = hexGrid();
    // Odd row (row 1) centers sit at x = 5, 15, 25... — snap onto one exactly.
    const snapped = snapToGrid(15, HEX_H, grid);
    expect(snapped.snappedX).toBeCloseTo(15, 1);
    expect(snapped.snappedY).toBeCloseTo(HEX_H, 1);
  });

  it('snaps even rows to unshifted centers', () => {
    const grid = hexGrid();
    const snapped = snapToGrid(21, 2 * HEX_H + 1, grid);
    expect(snapped.snappedX).toBeCloseTo(20, 1);
    expect(snapped.snappedY).toBeCloseTo(2 * HEX_H, 1);
  });

  it('keeps the historical even-row snap behavior (regression pin)', () => {
    // Mirrors the original aseprite-emulation expectation: y=15 → row 2 ≈ 17.3
    const grid = hexGrid({ snapStrength: 0.85 });
    const snapped = snapToGrid(15, 15, grid);
    expect(snapped.snappedY).toBeCloseTo(17.3, 1);
  });

  it('hit-test resolves the nearest hex center, matching snap', () => {
    const grid = hexGrid();
    for (const [px, py] of [[15, HEX_H], [14.2, 9.1], [3, 3], [22, 12], [48, 31]]) {
      const cell = getCellAtPosition(grid, px, py);
      const snapped = snapToGrid(px, py, grid);
      expect(cell.x).toBeCloseTo(snapped.snappedX, 1);
      expect(cell.y).toBeCloseTo(snapped.snappedY, 1);
    }
  });

  it('hit-test on an odd row returns the offset center', () => {
    const grid = hexGrid();
    const cell = getCellAtPosition(grid, 15, HEX_H);
    expect(cell.row).toBe(1);
    expect(cell.x).toBeCloseTo(15, 1);
  });

  it('preview hexagons are regular, tiling, and centred on snap targets', () => {
    const grid = hexGrid();
    const lines = generateGridPreview(grid).filter(l => l.type === 'hex');
    expect(lines.length).toBeGreaterThan(0);

    // Every vertex must lie at the tiling circumradius from its hex centre.
    // Reconstruct: each emitted segment's endpoints must be HEX_R from SOME
    // lattice centre — verify via the snap function (the single authority).
    for (const line of lines.slice(0, 60)) {
      const midX = (line.x1 + line.x2) / 2;
      const midY = (line.y1 + line.y2) / 2;
      const { snappedX, snappedY } = snapToGrid(midX, midY, grid);
      const d1 = Math.hypot(line.x1 - snappedX, line.y1 - snappedY);
      const d2 = Math.hypot(line.x2 - snappedX, line.y2 - snappedY);
      expect(d1).toBeCloseTo(HEX_R, 1);
      expect(d2).toBeCloseTo(HEX_R, 1);
    }
  });

  it('preview does not emit duplicate shared edges', () => {
    const grid = hexGrid();
    const lines = generateGridPreview(grid).filter(l => l.type === 'hex');
    const keys = lines.map(l => {
      const a = `${l.x1.toFixed(1)},${l.y1.toFixed(1)}`;
      const b = `${l.x2.toFixed(1)},${l.y2.toFixed(1)}`;
      return [a, b].sort().join('|');
    });
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('Cell address round-trip — getCellOrigin inverts getCellAtPosition', () => {
  it('round-trips hex addresses through origin → position → address', () => {
    const grid = hexGrid();
    for (const [col, row] of [[0, 0], [1, 1], [3, 2], [0, 5], [4, 7]]) {
      const origin = getCellOrigin(grid, col, row);
      const resolved = getCellAtPosition(grid, origin.x, origin.y);
      expect(resolved.col).toBe(col);
      expect(resolved.row).toBe(row);
    }
  });

  it('round-trips rectangular addresses (corner anchoring)', () => {
    const grid = createTemplateGrid({
      gridType: GRID_TYPES.RECTANGULAR, cellSize: 8, width: 64, height: 64,
    });
    const origin = getCellOrigin(grid, 3, 5);
    expect(origin).toEqual({ x: 24, y: 40 });
    const resolved = getCellAtPosition(grid, origin.x + 1, origin.y + 1);
    expect(resolved.col).toBe(3);
    expect(resolved.row).toBe(5);
  });

  it('exposes hex metrics so renderers never re-derive geometry', () => {
    const hex = getGridMetrics(hexGrid());
    expect(hex.rowPitch).toBeCloseTo(HEX_H, 5);
    expect(hex.hexRadius).toBeCloseTo(HEX_R, 5);
    const rect = getGridMetrics(createTemplateGrid({ cellSize: 8 }));
    expect(rect.rowPitch).toBe(8);
    expect(rect.hexRadius).toBeNull();
  });
});

describe('Flood fill — bucket tool semantics', () => {
  it('does not leak from a colored cell into empty space', () => {
    const grid = createTemplateGrid({
      gridType: GRID_TYPES.RECTANGULAR, cellSize: 8, width: 64, height: 64,
    });
    const layer = createLayer('t');
    setCell(layer, 0, 0, '#FF0000');
    floodFill(grid, layer, 0, 0, '#00FF00');
    expect(layer.cells.size).toBe(1);
    expect(getCell(layer, 0, 0).color).toBe('#00FF00');
  });

  it('fills an empty region but stops at colored boundaries', () => {
    const grid = createTemplateGrid({
      gridType: GRID_TYPES.RECTANGULAR, cellSize: 8, width: 32, height: 8,
    });
    const layer = createLayer('t');
    setCell(layer, 16, 0, '#FF0000'); // wall at col 2 on a 4x1 strip
    floodFill(grid, layer, 0, 0, '#00FF00');
    expect(getCell(layer, 0, 0).color).toBe('#00FF00');
    expect(getCell(layer, 8, 0).color).toBe('#00FF00');
    expect(getCell(layer, 16, 0).color).toBe('#FF0000'); // wall untouched
    expect(getCell(layer, 24, 0)).toBeUndefined();        // beyond the wall
  });

  it('uses 6-connectivity and hex addressing on hexagonal grids', () => {
    const grid = hexGrid();
    const layer = createLayer('t');
    floodFill(grid, layer, 0, 0, '#00FF00');
    // Every painted key must be a real hex centre (odd rows offset),
    // and the diagonal hex neighbour (5, HEX_H) must be reached.
    const oddRowNeighbor = getCellAtPosition(grid, 5, HEX_H);
    expect(getCell(layer, oddRowNeighbor.x, oddRowNeighbor.y)).toBeDefined();
    layer.cells.forEach(cell => {
      const snapped = snapToGrid(cell.x, cell.y, grid);
      expect(cell.x).toBeCloseTo(snapped.snappedX, 1);
      expect(cell.y).toBeCloseTo(snapped.snappedY, 1);
    });
  });
});

describe('Diagonal symmetry on non-square grids', () => {
  it('maps coordinates back onto the grid and is an involution', async () => {
    const { applySymmetry, toggleSymmetryAxis } = await import(
      '../../../codex/core/pixelbrain/template-grid-engine.js'
    );
    const grid = createTemplateGrid({
      gridType: GRID_TYPES.RECTANGULAR, cellSize: 8, width: 160, height: 80,
    });
    toggleSymmetryAxis(grid, 'diagonal');

    const mirrored = applySymmetry([{ x: 40, y: 10 }], grid);
    expect(mirrored.length).toBe(2);
    mirrored.forEach(c => {
      expect(c.x).toBeGreaterThanOrEqual(0);
      expect(c.x).toBeLessThanOrEqual(grid.width);
      expect(c.y).toBeGreaterThanOrEqual(0);
      expect(c.y).toBeLessThanOrEqual(grid.height);
    });

    // Involution: mirroring the mirror returns the original point
    const twice = applySymmetry([mirrored[1]], grid);
    expect(twice[1].x).toBeCloseTo(40, 6);
    expect(twice[1].y).toBeCloseTo(10, 6);
  });
});

describe('Aseprite round-trip', () => {
  it('does not grow a phantom frame on import', () => {
    const grid = hexGrid();
    expect(grid.frames.length).toBe(1);
    const reimported = importFromAseprite(exportToAseprite(grid));
    expect(reimported.frames.length).toBe(1);
  });

  it('preserves snapStrength through export/import', () => {
    const grid = hexGrid({ snapStrength: 0.42 });
    const reimported = importFromAseprite(exportToAseprite(grid));
    expect(reimported.snapStrength).toBeCloseTo(0.42, 5);
  });

  it('keeps the layers convenience array in sync with frame 0', () => {
    const grid = hexGrid();
    const reimported = importFromAseprite(exportToAseprite(grid));
    expect(reimported.layers).toBe(reimported.frames[0].layers);
  });
});
