import { describe, it, expect, vi } from 'vitest';
import { generateLatticeGrid } from '../../codex/core/pixelbrain/lattice-grid-engine.js';

describe('Codex Core — PixelBrain — Lattice Grid Engine', () => {
  it('generates a lattice grid from image data', async () => {
    // Mock minimal image analysis
    const imageAnalysis = {
      pixelData: new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255]),
      dimensions: { width: 2, height: 1 }
    };
    
    // We expect the lattice to be generated
    const lattice = await generateLatticeGrid(imageAnalysis);
    
    expect(lattice.cellSize).toBeDefined();
    expect(lattice.cols).toBeDefined();
  });
});
