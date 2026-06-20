import { describe, it, expect } from 'vitest';
import { buildPickaxeCells, EYE_CENTER } from '../../../scratch/pickaxe-cells.mjs';

/**
 * The true-3D authoring counterpart to the silhouette lift. A sculpted pickaxe
 * must do the two things the 2D→3D lift provably cannot (PDR Non-Goals):
 * carry genuine front≠back depth, and punch the pickaxe-eye hole.
 */
describe('buildPickaxeCells — true 3D sculpt', () => {
  it('returns occupied cells inside the declared dims', () => {
    const { cells, dims } = buildPickaxeCells();
    expect(cells.length).toBeGreaterThan(0);
    expect(Number.isInteger(dims.width) && dims.width > 0).toBe(true);
    expect(Number.isInteger(dims.height) && dims.height > 0).toBe(true);
    expect(Number.isInteger(dims.depth) && dims.depth > 0).toBe(true);
    for (const c of cells) {
      expect(c.x).toBeGreaterThanOrEqual(0);
      expect(c.x).toBeLessThan(dims.width);
      expect(c.y).toBeGreaterThanOrEqual(0);
      expect(c.y).toBeLessThan(dims.height);
      expect(c.z).toBeGreaterThanOrEqual(0);
      expect(c.z).toBeLessThan(dims.depth);
    }
  });

  it('is genuinely volumetric (depth is not a single mirrored slab)', () => {
    const { cells } = buildPickaxeCells();
    const zs = new Set(cells.map((c) => c.z));
    expect(zs.size).toBeGreaterThan(2);
  });

  it('punches a real through-hole at the eye (what the lift cannot do)', () => {
    const { cells, dims } = buildPickaxeCells();
    const occ = new Set(cells.map((c) => `${c.x},${c.y},${c.z}`));
    // The eye centre column is empty all the way through the depth...
    for (let z = 0; z < dims.depth; z += 1) {
      expect(occ.has(`${EYE_CENTER.x},${EYE_CENTER.y},${z}`)).toBe(false);
    }
    // ...but the housing ring around it is solid (the hole is enclosed).
    expect(occ.has(`${EYE_CENTER.x - 3},${EYE_CENTER.y},${EYE_CENTER.z}`)).toBe(true);
    expect(occ.has(`${EYE_CENTER.x + 3},${EYE_CENTER.y},${EYE_CENTER.z}`)).toBe(true);
  });

  it('emits a glowing rune (RADIANT energy carried on cells)', () => {
    const { cells } = buildPickaxeCells();
    const glow = cells.filter((c) => (c.energy ?? 0) > 0);
    expect(glow.length).toBeGreaterThan(0);
  });

  it('is pure and deterministic', () => {
    expect(buildPickaxeCells()).toEqual(buildPickaxeCells());
  });
});
