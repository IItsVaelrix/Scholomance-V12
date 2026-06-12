import { describe, expect, it } from 'vitest';
import { traceLattice } from '../../../codex/core/microprocessors/pixel/LatticeTracer.js';

function rgbaImage(width, height, pixelFor) {
  const pixelData = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const [r, g, b, a = 255] = pixelFor(x, y);
      const idx = (y * width + x) * 4;
      pixelData[idx] = r;
      pixelData[idx + 1] = g;
      pixelData[idx + 2] = b;
      pixelData[idx + 3] = a;
    }
  }
  return pixelData;
}

describe('LatticeTracer luminance preservation', () => {
  it('captures flat white-hot regions that have no edge gradient', () => {
    const pixelData = rgbaImage(8, 8, () => [255, 255, 255, 255]);
    const { coordinates } = traceLattice({
      pixelData,
      dimensions: { width: 8, height: 8 },
      threshold: 30,
    });

    expect(coordinates.length).toBeGreaterThan(0);
    expect(coordinates.some((coord) => coord.color === '#FFFFFF')).toBe(true);
    expect(coordinates.some((coord) => coord.source === 'image_luminance_high')).toBe(true);
  });

  it('captures flat near-black regions that fallback used to exclude', () => {
    const pixelData = rgbaImage(8, 8, () => [0, 0, 0, 255]);
    const { coordinates } = traceLattice({
      pixelData,
      dimensions: { width: 8, height: 8 },
      threshold: 30,
    });

    expect(coordinates.length).toBeGreaterThan(0);
    expect(coordinates.some((coord) => coord.color === '#000000')).toBe(true);
    expect(coordinates.some((coord) => coord.source === 'image_luminance_low')).toBe(true);
  });

  it('samples subtle interior shading even when the edge threshold is high', () => {
    const pixelData = rgbaImage(8, 8, (x) => {
      const value = x < 4 ? 120 : 132;
      return [value, value, value, 255];
    });
    const { coordinates } = traceLattice({
      pixelData,
      dimensions: { width: 8, height: 8 },
      threshold: 200,
    });

    const colors = new Set(coordinates.map((coord) => coord.color));
    expect(colors.has('#787878')).toBe(true);
    expect(colors.has('#848484')).toBe(true);
    expect(coordinates.some((coord) => coord.source === 'image_luminance_sample')).toBe(true);
  });
});
