import { describe, it, expect } from 'vitest';
import { ENERGY_TYPES } from '../../codex/core/pixelbrain/voxel-volume.js';
import { sketchToSilhouette } from '../../codex/core/pixelbrain/sketch-amp.js';

const structural = (coord) =>
  (coord.energies || []).find((e) => e.type === ENERGY_TYPES.STRUCTURAL)?.value;

describe('SketchAMP emits its chamfer field as STRUCTURAL energy (emit, don\'t hide)', () => {
  // A 3x3 filled block well inside the canvas: centre is the spine, edges the rim.
  const occupied = [];
  for (let y = 3; y <= 5; y += 1) for (let x = 3; x <= 5; x += 1) occupied.push({ x, y });
  const result = sketchToSilhouette(occupied, { width: 10, height: 10 });

  it('attaches STRUCTURAL energy to every silhouette cell', () => {
    expect(result.coordinates.length).toBe(9);
    result.coordinates.forEach((c) => {
      expect(structural(c)).toBeGreaterThan(0);
      expect(structural(c)).toBeLessThanOrEqual(1);
    });
  });

  it('normalizes the spine to 1 and the rim below it (pure bulge shape)', () => {
    const centre = result.coordinates.find((c) => c.x === 4 && c.y === 4);
    const edge = result.coordinates.find((c) => c.x === 3 && c.y === 4);
    expect(structural(centre)).toBe(1);
    expect(structural(edge)).toBeLessThan(1);
  });

  it('mirrors the emitted energy on the structuralEnergy convenience field', () => {
    const centre = result.coordinates.find((c) => c.x === 4 && c.y === 4);
    expect(centre.structuralEnergy).toBe(structural(centre));
  });
});
