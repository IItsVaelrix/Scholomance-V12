import { describe, it, expect } from 'vitest';
import { ENERGY_TYPES, isCellOccupied } from '../../codex/core/pixelbrain/voxel-volume.js';
import {
  STRUCTURAL_ENERGY_VERSION,
  chamferDistanceField,
  computeStructuralEnergy,
} from '../../codex/core/pixelbrain/structural-energy.js';
import { liftToVolume } from '../../codex/core/pixelbrain/volume-lift-amp.js';

const dist = (cell) => cell.energies.find((e) => e.type === ENERGY_TYPES.STRUCTURAL).value;

describe('chamferDistanceField', () => {
  it('gives an isolated cell distance 1 (adjacent to empty)', () => {
    const d = chamferDistanceField([{ x: 0, y: 0 }], { width: 1, height: 1 });
    expect(d.get('0,0')).toBe(1);
  });

  it('gives the centre of a 3x3 block the largest distance', () => {
    const cells = [];
    for (let y = 0; y < 3; y += 1) for (let x = 0; x < 3; x += 1) cells.push({ x, y });
    const d = chamferDistanceField(cells, { width: 3, height: 3 });
    expect(d.get('1,1')).toBeGreaterThan(d.get('0,0'));
  });
});

describe('computeStructuralEnergy — the one law: clamp(dist/R_part, 0, 1)', () => {
  it('normalizes per part so the spine reaches exactly 1', () => {
    const cells = [];
    for (let y = 0; y < 3; y += 1) for (let x = 0; x < 3; x += 1) {
      cells.push({ x, y, partId: 'blob' });
    }
    const out = computeStructuralEnergy(cells, { width: 3, height: 3 });
    const centre = out.find((c) => c.x === 1 && c.y === 1);
    expect(dist(centre)).toBe(1); // spine = R_part / R_part = 1
    out.forEach((c) => {
      const e = dist(c);
      expect(e).toBeGreaterThan(0);
      expect(e).toBeLessThanOrEqual(1);
    });
  });

  it('decouples bulge shape from absolute size: two parts each peak at 1', () => {
    const cells = [
      // a thin 1-wide part and a fat 3-wide part, side by side
      { x: 0, y: 0, partId: 'thin' },
      { x: 2, y: 0, partId: 'fat' }, { x: 3, y: 0, partId: 'fat' }, { x: 4, y: 0, partId: 'fat' },
      { x: 2, y: 1, partId: 'fat' }, { x: 3, y: 1, partId: 'fat' }, { x: 4, y: 1, partId: 'fat' },
      { x: 2, y: 2, partId: 'fat' }, { x: 3, y: 2, partId: 'fat' }, { x: 4, y: 2, partId: 'fat' },
    ];
    const out = computeStructuralEnergy(cells, { width: 5, height: 3 });
    const thin = out.find((c) => c.partId === 'thin');
    const fatSpine = out.find((c) => c.x === 3 && c.y === 1);
    expect(dist(thin)).toBe(1);
    expect(dist(fatSpine)).toBe(1);
  });

  it('preserves pre-existing glow energies while adding STRUCTURAL', () => {
    const cells = [{ x: 0, y: 0, partId: 'rune', energies: [{ type: ENERGY_TYPES.RADIANT, value: 0.5 }] }];
    const out = computeStructuralEnergy(cells, { width: 1, height: 1 });
    const radiant = out[0].energies.find((e) => e.type === ENERGY_TYPES.RADIANT);
    expect(radiant.value).toBe(0.5);
    expect(dist(out[0])).toBe(1);
  });

  it('emits energyType STRUCTURAL on the structural channel', () => {
    const out = computeStructuralEnergy([{ x: 0, y: 0, partId: 'p' }], { width: 1, height: 1 });
    expect(out[0].energies.some((e) => e.type === ENERGY_TYPES.STRUCTURAL)).toBe(true);
  });
});

describe('round-trip: distance → energy → depth (PDR Risk #1)', () => {
  it('lifts a 2-wide haft column into a 3-voxel rod', () => {
    // 2-wide, 4-tall haft. Every cell is adjacent to empty (R_part ≈ 1) so
    // energy ≈ 1 along the column; round + maxDepth 1 → a 3-voxel rod.
    const cells = [];
    for (let y = 0; y < 4; y += 1) for (let x = 0; x < 2; x += 1) {
      cells.push({ x, y, partId: 'haft', materialId: 4 });
    }
    const energized = computeStructuralEnergy(cells, { width: 2, height: 4 });
    const vol = liftToVolume(energized, {
      dims: { width: 2, height: 4 },
      partParams: { haft: { profile: 'round', maxDepth: 1 } },
    });

    expect(vol.depth).toBe(3);
    // every column is 3 voxels deep — a haft, not a wire
    for (let y = 0; y < 4; y += 1) {
      for (let x = 0; x < 2; x += 1) {
        let deep = 0;
        for (let z = 0; z < 3; z += 1) if (isCellOccupied(vol, x, y, z)) deep += 1;
        expect(deep).toBe(3);
      }
    }
  });
});

describe('STRUCTURAL_ENERGY_VERSION', () => {
  it('is exported', () => {
    expect(typeof STRUCTURAL_ENERGY_VERSION).toBe('string');
  });
});
