import { describe, expect, it } from 'vitest';
import {
  generatePixelArtFromImage,
  transcribeSourcePixelData,
} from '../../../codex/core/pixelbrain/image-to-pixel-art.js';

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

describe('PixelBrain source-scale transcription', () => {
  it('preserves every opaque sprite pixel at source scale', () => {
    const pixelData = rgbaImage(4, 4, (x, y) => {
      if (x === 1 && y === 1) return [255, 255, 255, 255];
      if (x === 2 && y === 1) return [132, 132, 132, 255];
      return [0, 0, 0, 0];
    });

    const coordinates = transcribeSourcePixelData(pixelData, { width: 4, height: 4 });

    expect(coordinates).toHaveLength(2);
    expect(coordinates).toEqual(expect.arrayContaining([
      expect.objectContaining({ x: 1, y: 1, color: '#FFFFFF', source: 'source_pixel_transcription' }),
      expect.objectContaining({ x: 2, y: 1, color: '#848484', source: 'source_pixel_transcription' }),
    ]));
  });

  it('drops a uniform opaque border background without dropping sprite pixels', () => {
    const pixelData = rgbaImage(6, 6, (x, y) => {
      if (x === 2 && y === 2) return [255, 255, 255, 255];
      if (x === 3 && y === 2) return [12, 16, 28, 255];
      return [0, 0, 0, 255];
    });

    const coordinates = transcribeSourcePixelData(pixelData, { width: 6, height: 6 });

    expect(coordinates).toHaveLength(2);
    expect(coordinates.some((coord) => coord.color === '#000000')).toBe(false);
    expect(coordinates.some((coord) => coord.color === '#FFFFFF')).toBe(true);
    expect(coordinates.some((coord) => coord.color === '#0C101C')).toBe(true);
  });

  it('uses source transcription for small uploaded pixel references', async () => {
    const pixelData = rgbaImage(4, 4, (x, y) => {
      if (x === 1 && y === 1) return [255, 255, 255, 255];
      if (x === 2 && y === 1) return [132, 132, 132, 255];
      return [0, 0, 0, 0];
    });

    const result = await generatePixelArtFromImage({
      colors: [{ hex: '#FFFFFF', percentage: 50 }, { hex: '#848484', percentage: 50 }],
      composition: { dominantAxis: 'vertical', hasSymmetry: false },
      semanticParams: {},
      pixelData,
      dimensions: { width: 4, height: 4 },
    }, { width: 160, height: 144, gridSize: 1 });

    expect(result.coordinates).toHaveLength(2);
    expect(result.coordinates.map((coord) => coord.color)).toEqual(['#FFFFFF', '#848484']);
  });
});
