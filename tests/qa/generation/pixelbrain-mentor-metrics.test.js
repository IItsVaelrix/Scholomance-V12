/**
 * QA Validation: Mentor Critique Metrics
 *
 * Regression test for the savage-audit finding that the critique panel read
 * `grid.coordinates` while the page passed a layered template grid (cells in
 * `layers[].cells` Maps) — so the metrics always saw zero coordinates and the
 * mentor delivered the identical canned FAIL diagnosis for every canvas.
 */

import { describe, it, expect } from 'vitest';
import { computeMentorMetrics } from '../../../src/pages/PixelBrain/mentorMetrics.js';

function makeLayeredGrid({ width = 64, height = 64 } = {}) {
  return {
    width,
    height,
    symmetryAxes: [],
    layers: [],
  };
}

function layerWithCells(cells, overrides = {}) {
  const map = new Map();
  for (const c of cells) map.set(`${c.x},${c.y}`, c);
  return { name: 'L', visible: true, opacity: 1, cells: map, ...overrides };
}

describe('computeMentorMetrics', () => {
  it('counts cells from a layered template grid', () => {
    const grid = makeLayeredGrid();
    const cells = [];
    for (let y = 20; y < 44; y++) {
      for (let x = 20; x < 44; x++) cells.push({ x, y, color: '#FFF' });
    }
    grid.layers.push(layerWithCells(cells));

    const m = computeMentorMetrics(grid, null);
    expect(m.coordCount).toBe(cells.length);
  });

  it('does not flag a dense centered square as a weak silhouette', () => {
    const grid = makeLayeredGrid();
    const cells = [];
    for (let y = 20; y < 44; y++) {
      for (let x = 20; x < 44; x++) cells.push({ x, y, color: '#FFF' });
    }
    grid.layers.push(layerWithCells(cells));

    const m = computeMentorMetrics(grid, null);
    expect(m.weakSilhouette).toBe(false);
  });

  it('ignores invisible layers', () => {
    const grid = makeLayeredGrid();
    grid.layers.push(layerWithCells([{ x: 1, y: 1, color: '#F00' }], { visible: false }));

    const m = computeMentorMetrics(grid, null);
    expect(m.coordCount).toBe(0);
  });

  it('measures center drift against the actual grid center, not a hardcoded 32', () => {
    const grid = makeLayeredGrid({ width: 128, height: 128 });
    const cells = [];
    // Dense square centered on the 128-wide grid (center ~63.5)
    for (let y = 48; y < 80; y++) {
      for (let x = 48; x < 80; x++) cells.push({ x, y, color: '#FFF' });
    }
    grid.layers.push(layerWithCells(cells));
    grid.symmetryAxes = ['vertical'];

    const m = computeMentorMetrics(grid, null);
    expect(m.likelyCenterDrift).toBe(false);
  });

  it('still accepts plain coordinate arrays (legacy callers)', () => {
    const coords = [
      { x: 10, y: 10, color: '#F00' },
      { x: 11, y: 10, color: '#F00' },
    ];
    const m = computeMentorMetrics(coords, null);
    expect(m.coordCount).toBe(2);
  });
});
