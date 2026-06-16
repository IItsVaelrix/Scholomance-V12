import { describe, it, expect } from 'vitest';
import { rasterizeTextToPixels, extractGlyphOutline, RASTER_CANVAS_SIZE } from '../../codex/core/pixelbrain/glyph-rasterizer.js';

// Mock canvas factory: renders a 3×3 block of white pixels at center of a 16×16 canvas.
// Simulates what fillText would produce without needing real font rendering.
function makeMockCanvas(whitePixels) {
  return () => {
    const W = 16, H = 16;
    const data = new Uint8ClampedArray(W * H * 4); // all black
    for (const { x, y } of whitePixels) {
      const idx = (y * W + x) * 4;
      data[idx] = 255; data[idx + 1] = 255; data[idx + 2] = 255; data[idx + 3] = 255;
    }
    return {
      width: W, height: H,
      getContext: () => ({
        fillStyle: '',
        font: '',
        textAlign: '',
        textBaseline: '',
        fillRect: () => {},
        fillText: () => {},
        getImageData: () => ({ data }),
      }),
    };
  };
}

describe('rasterizeTextToPixels', () => {
  it('returns empty array when canvas context is null', () => {
    const createCanvas = () => ({ width: 16, height: 16, getContext: () => null });
    const cells = rasterizeTextToPixels('X', { createCanvas, canvasSize: { width: 16, height: 16 } });
    expect(cells).toEqual([]);
  });

  it('returns cells for white pixels in mock canvas', () => {
    const whitePixels = [{ x: 7, y: 7 }, { x: 8, y: 7 }, { x: 8, y: 8 }];
    const createCanvas = makeMockCanvas(whitePixels);
    const cells = rasterizeTextToPixels('A', { createCanvas, canvasSize: { width: 16, height: 16 } });
    expect(cells.length).toBe(3);
    expect(cells).toContainEqual({ x: 7, y: 7 });
    expect(cells).toContainEqual({ x: 8, y: 8 });
  });

  it('is deterministic for the same input', () => {
    const whitePixels = [{ x: 5, y: 5 }, { x: 6, y: 6 }];
    const createCanvas = makeMockCanvas(whitePixels);
    const a = rasterizeTextToPixels('B', { createCanvas, canvasSize: { width: 16, height: 16 } });
    const b = rasterizeTextToPixels('B', { createCanvas, canvasSize: { width: 16, height: 16 } });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe('extractGlyphOutline', () => {
  it('returns only boundary cells (cells with at least one empty 4-neighbor)', () => {
    // 3×3 filled block — only the 8 perimeter cells are outline; center is interior
    const cells = [];
    for (let y = 5; y <= 7; y++)
      for (let x = 5; x <= 7; x++)
        cells.push({ x, y });
    const outline = extractGlyphOutline(cells);
    // Center cell (6,6) has all 4 neighbors occupied — should NOT be in outline
    expect(outline).not.toContainEqual({ x: 6, y: 6 });
    // Corner cell (5,5) has neighbors missing — must be in outline
    expect(outline).toContainEqual({ x: 5, y: 5 });
  });

  it('returns all cells when input is a single pixel', () => {
    const cells = [{ x: 8, y: 8 }];
    const outline = extractGlyphOutline(cells);
    expect(outline).toEqual([{ x: 8, y: 8 }]);
  });

  it('returns empty array for empty input', () => {
    expect(extractGlyphOutline([])).toEqual([]);
  });
});

describe('RASTER_CANVAS_SIZE', () => {
  it('has width and height', () => {
    expect(RASTER_CANVAS_SIZE.width).toBeGreaterThan(0);
    expect(RASTER_CANVAS_SIZE.height).toBeGreaterThan(0);
  });
});
