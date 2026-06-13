import { describe, it, expect } from 'vitest';
import { traceBoundary } from '../../../codex/core/pixelbrain/cell-boundary-tracer.js';

describe('traceBoundary', () => {
  it('empty set returns empty result without throwing', () => {
    expect(() => traceBoundary(new Set())).not.toThrow();
    const { vertices, segments } = traceBoundary(new Set());
    expect(vertices).toHaveLength(0);
    expect(segments).toHaveLength(0);
  });

  it('single cell produces exactly 4 vertices', () => {
    const { vertices } = traceBoundary(new Set(['2,3']), { smooth: false });
    expect(vertices).toHaveLength(4);
    // Cell at (2,3) has corners at (2,3),(3,3),(3,4),(2,4)
    const keys = vertices.map(([x, y]) => `${x},${y}`);
    expect(keys).toContain('2,3');
    expect(keys).toContain('3,3');
    expect(keys).toContain('3,4');
    expect(keys).toContain('2,4');
  });

  it('2×2 block has exactly 4 outer corners (no internal edges)', () => {
    const cells = new Set(['0,0', '1,0', '0,1', '1,1']);
    const { vertices } = traceBoundary(cells, { smooth: false });
    expect(vertices).toHaveLength(4);
  });

  it('1×3 column has exactly 4 corners', () => {
    const cells = new Set(['0,0', '0,1', '0,2']);
    const { vertices } = traceBoundary(cells, { smooth: false });
    expect(vertices).toHaveLength(4);
  });

  it('L-shape (3 cells in column + 1 extending right at bottom) has 6 corners', () => {
    // Column: (0,0),(0,1),(0,2) + extension (1,2)
    const cells = new Set(['0,0', '0,1', '0,2', '1,2']);
    const { vertices } = traceBoundary(cells, { smooth: false });
    expect(vertices).toHaveLength(6);
  });

  it('smooth=true returns non-empty segments array for shapes with > 3 vertices', () => {
    const cells = new Set(['0,0', '1,0', '2,0', '0,1', '1,1', '0,2']);
    const { segments } = traceBoundary(cells, { smooth: true, tension: 0.4 });
    expect(Array.isArray(segments)).toBe(true);
    expect(segments.length).toBeGreaterThan(0);
  });

  it('smooth=false returns empty segments array', () => {
    const cells = new Set(['0,0', '1,0']);
    const { segments } = traceBoundary(cells, { smooth: false });
    expect(segments).toHaveLength(0);
  });

  it('each segment has p1, cp1, cp2, p2 with 2-element arrays', () => {
    const cells = new Set(['0,0','1,0','2,0','1,1','0,1','0,2']);
    const { segments } = traceBoundary(cells, { smooth: true });
    for (const seg of segments) {
      expect(seg).toHaveProperty('p1');
      expect(seg).toHaveProperty('cp1');
      expect(seg).toHaveProperty('cp2');
      expect(seg).toHaveProperty('p2');
      expect(seg.p1).toHaveLength(2);
      expect(seg.cp1).toHaveLength(2);
    }
  });

  it('is deterministic — same input → same output', () => {
    const cells = new Set(['1,1','2,1','3,1','1,2','2,2','1,3']);
    const a = traceBoundary(cells, { smooth: true });
    const b = traceBoundary(cells, { smooth: true });
    expect(a.vertices).toEqual(b.vertices);
    expect(a.segments).toEqual(b.segments);
  });
});
