import { describe, it, expect } from 'vitest';
import { fillShapeWithEvenOddWinding } from '../../../codex/core/pixelbrain/image-to-pixel-art.js';

describe('PixelBrain — Even-Odd Winding Fill', () => {
  const gridMetrics = { cellSize: 1, width: 160, height: 144 };

  it('solid rectangle fills fully', () => {
    // 4x4 outline box
    const outline = [
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 },
      { x: 3, y: 1 }, { x: 3, y: 2 }, { x: 3, y: 3 },
      { x: 2, y: 3 }, { x: 1, y: 3 }, { x: 0, y: 3 },
      { x: 0, y: 2 }, { x: 0, y: 1 }
    ];
    const res = fillShapeWithEvenOddWinding(outline, gridMetrics);
    expect(res.ok).toBe(true);
    expect(res.coordinates.length).toBeGreaterThan(12);
  });

  it('donut shape preserves center hole', () => {
    // A hollow 7x7 outline box with hole at (3,3)
    const outline = [
      // Outer border (7x7)
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 }, { x: 5, y: 0 }, { x: 6, y: 0 },
      { x: 0, y: 6 }, { x: 1, y: 6 }, { x: 2, y: 6 }, { x: 3, y: 6 }, { x: 4, y: 6 }, { x: 5, y: 6 }, { x: 6, y: 6 },
      { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 }, { x: 0, y: 4 }, { x: 0, y: 5 },
      { x: 6, y: 1 }, { x: 6, y: 2 }, { x: 6, y: 3 }, { x: 6, y: 4 }, { x: 6, y: 5 },
      // Inner border (hole 3x3 at center)
      { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 2 },
      { x: 2, y: 4 }, { x: 3, y: 4 }, { x: 4, y: 4 },
      { x: 2, y: 3 }, { x: 4, y: 3 }
    ];
    const res = fillShapeWithEvenOddWinding(outline, gridMetrics);
    expect(res.ok).toBe(true);
    expect(res.preservedHoles).toBe(true);

    const hasCenter = res.coordinates.some(pt => pt.x === 3 && pt.y === 3);
    expect(hasCenter).toBe(false); // Center (3,3) should not be filled
  });

  it('empty outline fails closed', () => {
    const res = fillShapeWithEvenOddWinding([], gridMetrics);
    expect(res.ok).toBe(false);
    expect(res.error).toBe('EMPTY_OUTLINE');
  });

  it('fill exceeding max cells returns FILL_TOO_LARGE', () => {
    // 10x10 box
    const outline = [];
    for (let x = 0; x <= 10; x++) {
      outline.push({ x, y: 0 });
      outline.push({ x, y: 10 });
    }
    for (let y = 1; y < 10; y++) {
      outline.push({ x: 0, y });
      outline.push({ x: 10, y });
    }
    const res = fillShapeWithEvenOddWinding(outline, gridMetrics, { maxFillCells: 10 });
    expect(res.ok).toBe(false);
    expect(res.error).toBe('FILL_TOO_LARGE');
  });
});
