import { ENERGY_TYPES } from './voxel-volume.js';
import { rasterizeTextToPixels, extractGlyphOutline } from './glyph-rasterizer.js';
import { applyGravityAMP } from './gravity-amp.js';

export const SEED_CONFIGS = Object.freeze({
  'fibonacci':        { lift: 'surface_scatter',   energySpread: 'radial'    },
  'fractal_iter':     { lift: 'recursive_columns',  energySpread: 'fractal'   },
  'parametric_curve': { lift: 'terrain_ridge',      energySpread: 'linear'    },
  'grid_projection':  { lift: 'floor_plane',        energySpread: 'uniform'   },
  'composite':        { lift: 'multi_region',       energySpread: 'blended'   },
  'vectorized_text':  { lift: 'glyph_monuments',    energySpread: 'inscribed' },
});

export function liftToVoxelSeeds(coords2D, volume, options = {}) {
  const {
    energyType = ENERGY_TYPES.STRUCTURAL,
    initialEnergy = 1.0,
    yProjection = 'surface',
    canvasSize = { width: 800, height: 600 },
  } = options;

  const surfaceY = Math.floor(volume.height * 0.75);
  const midY = Math.floor(volume.height / 2);
  const vy = yProjection === 'surface' ? surfaceY : midY;

  return coords2D.map(({ x, y }) => {
    const vx = Math.round((x / canvasSize.width) * (volume.width - 1));
    const vz = Math.round((y / canvasSize.height) * (volume.depth - 1));
    return {
      vx: Math.max(0, Math.min(volume.width - 1, vx)),
      vy: Math.max(0, Math.min(volume.height - 1, vy)),
      vz: Math.max(0, Math.min(volume.depth - 1, vz)),
      energy: initialEnergy,
      energyType,
    };
  });
}

// Generates Fibonacci golden-ratio spiral seed points directly —
// does not depend on formula-to-coordinates.js to avoid coupling.
export function generateFibonacciSeeds(formula, volume, options = {}) {
  const { iterations = 8, scale = 0.75 } = formula;
  const canvasSize = options.canvasSize ?? { width: 800, height: 600 };
  const { width: cw, height: ch } = canvasSize;
  const cx = cw / 2, cy = ch / 2;
  const phi = (1 + Math.sqrt(5)) / 2;
  // Number of points derived from golden ratio power — matches Fibonacci sequence count
  const n = Math.round(Math.pow(phi, iterations));
  const maxR = Math.min(cw, ch) * scale * 0.5;
  const coords2D = [];

  for (let i = 0; i < n; i++) {
    const angle = i * 2 * Math.PI * (1 - 1 / phi);
    const r = Math.sqrt(i / n) * maxR;
    coords2D.push({
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
    });
  }

  return liftToVoxelSeeds(coords2D, volume, { ...options, canvasSize });
}

export function generateVectorizedTextSeeds(text, volume, options = {}) {
  const { canvasSize, createCanvas, gravityOptions = {}, fontSize, fontFamily } = options;

  const cells = rasterizeTextToPixels(text, { fontSize, fontFamily, createCanvas, canvasSize });
  const outlineCells = extractGlyphOutline(cells);

  if (outlineCells.length === 0) return [];

  const xzSeeds = liftToVoxelSeeds(outlineCells, volume, { canvasSize });
  return applyGravityAMP(xzSeeds, volume, gravityOptions);
}
