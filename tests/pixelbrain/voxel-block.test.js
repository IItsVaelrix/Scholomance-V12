import { describe, it, expect } from 'vitest';
import { blockBBox, createBlock } from '../../codex/core/pixelbrain/voxel-block.js';

const CELLS = [
  { x: 0, y: 0, z: 0 },
  { x: 1, y: 0, z: 0 },
  { x: 1, y: 1, z: 0 },
  { x: 0, y: 0, z: 1 },
];

describe('blockBBox (C1)', () => {
  it('computes the min/max extent over all cells', () => {
    expect(blockBBox(CELLS)).toEqual({
      minX: 0, maxX: 1, minY: 0, maxY: 1, minZ: 0, maxZ: 1,
    });
  });

  it('throws on an empty cell list', () => {
    expect(() => blockBBox([])).toThrow();
  });
});

describe('createBlock (C1)', () => {
  it('carries name, cells, bbox and a default feet-on-ground pivot', () => {
    const block = createBlock('arm', CELLS);
    expect(block.name).toBe('arm');
    expect(block.cells).toBe(CELLS);
    expect(block.bbox).toEqual({ minX: 0, maxX: 1, minY: 0, maxY: 1, minZ: 0, maxZ: 1 });
    expect(block.pivot).toEqual({ x: 1, y: 0, z: 1 });
  });

  it('uses a half-voxel-snapped pivot override when provided', () => {
    const block = createBlock('arm', CELLS, { x: 0.3, y: 2.2, z: 1 });
    expect(block.pivot).toEqual({ x: 0.5, y: 2, z: 1 });
  });

  it('throws on an empty cell list', () => {
    expect(() => createBlock('x', [])).toThrow();
  });
});
