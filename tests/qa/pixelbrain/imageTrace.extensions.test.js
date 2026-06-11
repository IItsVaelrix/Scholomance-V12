import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { generatePixelArtFromImage } from '../../../codex/core/pixelbrain/image-to-pixel-art.js';
import { extensionRegistry } from '../../../codex/core/pixelbrain/extension-registry.js';

describe('PixelBrain — Image Trace Extensions Routing', () => {
  const mockAnalysis = {
    colors: [{ hex: '#FF0000', percentage: 100 }],
    composition: { dominantAxis: 'horizontal', hasSymmetry: false, edgeDensity: 0.1, complexity: 0.1, contrastNormalized: 0.5 },
    semanticParams: { surface: { reflectivity: 0.5, roughness: 0.5 }, form: { complexity: 0.5 } },
    pixelData: new Uint8ClampedArray(400).fill(255),
    dimensions: { width: 10, height: 10 },
    coordinates: [
      { x: 5, y: 5, color: '#FFFFFF', emphasis: 1 },
      { x: 5, y: 10, color: '#FFFFFF', emphasis: 1 }
    ]
  };

  const canvasSize = { width: 160, height: 144, gridSize: 1 };

  it('traced image routes coordinates through physics-gravity when selected', async () => {
    // physics-gravity pulls y downwards
    const result = await generatePixelArtFromImage(mockAnalysis, canvasSize, 'physics-gravity');
    expect(result.coordinates).toBeDefined();
    // Gravity should modify the y coordinate of the traced coordinates
    expect(result.coordinates[0].y).toBeGreaterThan(5);
  });

  it('traced image receives custom test extension from registry', async () => {
    const customExt = {
      id: 'custom-offset-test',
      type: 'PHYSICS',
      hooks: {
        onCoordinateMap(coords) {
          return coords.map(c => ({ ...c, x: c.x + 10 }));
        }
      }
    };

    extensionRegistry.register(customExt);

    try {
      const result = await generatePixelArtFromImage(mockAnalysis, canvasSize, 'custom-offset-test');
      expect(result.coordinates[0].x).toBe(15); // 5 + 10 offset
    } finally {
      extensionRegistry.unregister('custom-offset-test');
    }
  });

  it('failed hook does not mutate or corrupt original coordinates', async () => {
    const badExt = {
      id: 'bad-throwing-hook',
      type: 'PHYSICS',
      hooks: {
        onCoordinateMap() {
          throw new Error('Simulation Crash');
        }
      }
    };

    extensionRegistry.register(badExt);

    try {
      const result = await generatePixelArtFromImage(mockAnalysis, canvasSize, 'bad-throwing-hook');
      expect(result.coordinates[0].x).toBe(5); // unchanged
    } finally {
      extensionRegistry.unregister('bad-throwing-hook');
    }
  });
});
