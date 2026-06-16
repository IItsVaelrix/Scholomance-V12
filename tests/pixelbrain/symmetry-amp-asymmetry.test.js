import { describe, it, expect } from 'vitest';
import {
  rotationalBreaker,
  lateralDrift,
  verticalVariance,
  applyAsymmetryToLattice,
  runSymmetryAmpProcessor,
} from '../../codex/core/pixelbrain/symmetry-amp.js';

function makeLattice(cols, rows) {
  const cells = new Map();
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      cells.set(`${col},${row}`, { col, row, color: '#ff0000', emphasis: 1 });
    }
  }
  return { cols, rows, cells };
}

describe('rotationalBreaker', () => {
  it('returns a function', () => {
    expect(typeof rotationalBreaker()).toBe('function');
  });

  it('produces deterministic output for same cell', () => {
    const mp = rotationalBreaker(0.3);
    const cell = { col: 5, row: 3 };
    const d1 = mp(cell, 10, 10);
    const d2 = mp(cell, 10, 10);
    expect(d1.dc).toBe(d2.dc);
    expect(d1.dr).toBe(d2.dr);
  });
});

describe('lateralDrift', () => {
  it('returns a function', () => {
    expect(typeof lateralDrift()).toBe('function');
  });

  it('dr is always 0 (lateral only)', () => {
    const mp = lateralDrift(0.5);
    for (let c = 0; c < 10; c++) {
      const d = mp({ col: c, row: c });
      expect(d.dr).toBe(0);
    }
  });
});

describe('verticalVariance', () => {
  it('returns a function', () => {
    expect(typeof verticalVariance()).toBe('function');
  });

  it('dc is always 0 (vertical only)', () => {
    const mp = verticalVariance(1.2);
    for (let c = 0; c < 10; c++) {
      const d = mp({ col: c, row: c }, 10);
      expect(d.dc).toBe(0);
    }
  });
});

describe('applyAsymmetryToLattice', () => {
  it('returns a new lattice object', () => {
    const lattice = makeLattice(4, 4);
    const symmetry = { type: 'radial', confidence: 0.9, significant: true };
    const result = applyAsymmetryToLattice(lattice, symmetry, [lateralDrift(0.5)]);
    expect(result).not.toBe(lattice);
    expect(result.cols).toBe(lattice.cols);
    expect(result.rows).toBe(lattice.rows);
  });

  it('processes all cells (may collide, cell count <= original)', () => {
    const lattice = makeLattice(4, 4);
    const symmetry = { type: 'radial', confidence: 0.9, significant: true };
    const result = applyAsymmetryToLattice(lattice, symmetry, [
      rotationalBreaker(0.3),
      lateralDrift(0.5),
      verticalVariance(1.2),
    ]);
    // Asymmetry may cause collisions (last write wins), so cell count <= original
    expect(result.cells.size).toBeLessThanOrEqual(lattice.cells.size);
    expect(result.cells.size).toBeGreaterThan(0);
  });
});

describe('runSymmetryAmpProcessor with sourceType formula', () => {
  it('handles sourceType: formula without error when pixelData missing', () => {
    const result = runSymmetryAmpProcessor({
      assetId: 'test',
      sourceType: 'formula',
      options: { autoApply: false },
    });
    expect(result.assetId).toBe('test');
  });
});
