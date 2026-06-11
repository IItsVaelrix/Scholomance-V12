/**
 * IMAGE-TO-PIXEL-ART GENERATOR
 * 
 * Generates pixel art coordinates and colors from reference image analysis.
 * This module traces shapes, extracts features, and maps them to PixelBrain's coordinate system.
 */

import { snapToPixelGrid } from './anti-alias-control.js';
import { analyzeImageToFormula, formulaToBytecode } from './image-to-bytecode-formula.js';
import { verseIRMicroprocessors } from '../microprocessors/index.js';
import { extensionRegistry } from './extension-registry.js';

/**
 * @typedef {Object} ImageAnalysis
 * @property {Array} colors - Dominant colors
 * @property {Object} composition - Composition metrics
 * @property {Object} semanticParams - Semantic parameters
 * @property {Uint8ClampedArray} pixelData - Raw pixel data
 * @property {Object} dimensions - Image dimensions
 */

/**
 * Generate pixel art from image analysis
 * @param {ImageAnalysis} imageAnalysis - Result from image analysis
 * @param {Object} canvasSize - Canvas dimensions
 * @param {string} extension - Extension ID to apply
 * @returns {Promise<Object>} PixelBrain-compatible result
 */
export async function generatePixelArtFromImage(imageAnalysis, canvasSize, extension = null) {
  const { colors, composition, semanticParams: _semanticParams, pixelData, dimensions } = imageAnalysis;
  
  // 1. Extract mathematical formula from image
  const formula = analyzeImageToFormula(imageAnalysis);
  const bytecode = formulaToBytecode(formula);

  // 2. Build palette from image colors
  const palettes = buildPaletteFromImageColors(colors);
  
  // 3. Generate coordinates from image features
  // FIX: If coordinates were already extracted (e.g. by a WebWorker), use them!
  const coordinates = Array.isArray(imageAnalysis.coordinates) && imageAnalysis.coordinates.length > 0
    ? imageAnalysis.coordinates
    : (await verseIRMicroprocessors.execute('pixel.trace', { pixelData, dimensions, composition, canvasSize })).coordinates;
  
  // Snap all coordinates to pixel grid
  const finalCoordinates = coordinates.map(coord => {
    const snapped = snapToPixelGrid(coord, canvasSize.gridSize || 1);
    return {
      ...coord,
      snappedX: snapped.x,
      snappedY: snapped.y,
    };
  });
  
  // Apply extension if specified
  let processedCoordinates = finalCoordinates;
  if (extension) {
    const hookContext = {
      source: 'image-trace',
      canvasSize,
      gridMetrics: {
        cellSize: canvasSize.gridSize || 1,
        rowPitch: canvasSize.gridSize || 1,
        hexRadius: null,
      },
      dialect: composition?.dialect || canvasSize.gridType || 'rectangular',
      palette: colors,
      seed: composition?.seed || 0,
      time: composition?.time || 0,
      selectedExtensionIds: [extension],
      metadata: _semanticParams || {},
    };
    processedCoordinates = extensionRegistry.applyHooks('coordinate-map', finalCoordinates, hookContext);
  }
  
  return {
    coordinates: processedCoordinates,
    palettes,
    canvas: canvasSize,
    formula,
    bytecode,
    dominantAxis: composition?.dominantAxis || 'horizontal',
    dominantSymmetry: composition?.hasSymmetry ? (composition?.symmetryType || 'none') : 'none',
  };
}

/**
 * Direct transcription of pixel data to coordinates
 * (Used for high-fidelity reconstruction)
 */
export function transcribeFullPixelData(pixelData, dimensions, canvasSize) {
  const { width: srcWidth, height: srcHeight } = dimensions;
  const { width: canvasWidth, height: canvasHeight } = canvasSize;
  const coordinates = [];

  const scaleX = canvasWidth / srcWidth;
  const scaleY = canvasHeight / srcHeight;
  const scale = Math.min(scaleX, scaleY);
  const offsetX = (canvasWidth - srcWidth * scale) / 2;
  const offsetY = (canvasHeight - srcHeight * scale) / 2;

  for (let y = 0; y < srcHeight; y++) {
    for (let x = 0; x < srcWidth; x++) {
      const idx = (y * srcWidth + x) * 4;
      if (pixelData[idx + 3] < 128) continue;

      coordinates.push({
        x: x * scale + offsetX,
        y: y * scale + offsetY,
        z: 0,
        color: rgbToHex(pixelData[idx], pixelData[idx + 1], pixelData[idx + 2]),
        emphasis: 0.5,
        source: 'direct_transcription',
      });
    }
  }

  // Snap to pixel grid
  return coordinates.map(coord => {
    const snapped = snapToPixelGrid(coord, canvasSize.gridSize || 1);
    return {
      ...coord,
      snappedX: snapped.x,
      snappedY: snapped.y,
    };
  });
}

/**
 * Build palette from image colors
 */
function buildPaletteFromImageColors(colors) {
  if (!colors || colors.length === 0) {
    return [];
  }
  
  // Create color key from dominant color
  const dominantColor = colors[0];
  const key = `img_${dominantColor.hex.replace('#', '')}`;
  
  // Build color array with weights
  const paletteColors = colors.map(color => ({
    hex: color.hex,
    weight: color.percentage / 100,
  }));
  
  return [{
    key,
    colors: paletteColors.map(c => c.hex),
    weights: paletteColors.map(c => c.weight),
    source: 'image',
  }];
}

// Removed hardcoded applyExtensionToCoordinates in favor of extensionRegistry

/**
 * Generate a silhouette (outline) from image analysis
 */
export function generateSilhouetteFromImage(imageAnalysis, canvasSize) {
  const { pixelData, dimensions } = imageAnalysis;
  const { width: srcWidth, height: srcHeight } = dimensions;
  const { width: canvasWidth, height: canvasHeight } = canvasSize;
  const silhouette = [];

  const scaleX = canvasWidth / srcWidth;
  const scaleY = canvasHeight / srcHeight;
  const scale = Math.min(scaleX, scaleY);
  const offsetX = (canvasWidth - srcWidth * scale) / 2;
  const offsetY = (canvasHeight - srcHeight * scale) / 2;

  // Simple edge detection: check if alpha > 128 and has at least one transparent neighbor
  for (let y = 0; y < srcHeight; y++) {
    for (let x = 0; x < srcWidth; x++) {
      const idx = (y * srcWidth + x) * 4;
      if (pixelData[idx + 3] < 128) continue;

      let isEdge = false;
      const neighbors = [
        [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]
      ];

      for (const [nx, ny] of neighbors) {
        if (nx < 0 || nx >= srcWidth || ny < 0 || ny >= srcHeight) {
          isEdge = true;
          break;
        }
        const nidx = (ny * srcWidth + nx) * 4;
        if (pixelData[nidx + 3] < 128) {
          isEdge = true;
          break;
        }
      }

      if (isEdge) {
        const coord = {
          x: x * scale + offsetX,
          y: y * scale + offsetY,
          z: 0,
          emphasis: 1.0,
          source: 'silhouette',
        };
        const snapped = snapToPixelGrid(coord, canvasSize.gridSize || 1);
        silhouette.push({
          ...coord,
          snappedX: snapped.x,
          snappedY: snapped.y,
        });
      }
    }
  }

  return silhouette;
}

/**
 * Scanline even-odd winding fill algorithm
 *
 * @param {Array} outlineCoordinates - Silhouette/outline coordinates
 * @param {Object} gridMetrics - Grid dimension settings
 * @param {Object} options - Option parameters
 * @returns {Object} Result of even-odd winding fill
 */
export function fillShapeWithEvenOddWinding(outlineCoordinates, gridMetrics, options = {}) {
  const preserveBoundary = options.preserveBoundary !== false;
  const maxFillCells = options.maxFillCells || 262144;

  if (!outlineCoordinates || outlineCoordinates.length === 0) {
    return {
      ok: false,
      error: 'EMPTY_OUTLINE',
      coordinates: [],
    };
  }

  const gridSize = gridMetrics.gridSize || gridMetrics.cellSize || 1;

  // Group outline coordinates by snapped grid position to avoid duplicates/floating precision issues
  const outlineSet = new Set();
  const uniqueOutline = [];
  
  for (const pt of outlineCoordinates) {
    const sx = Math.round((pt.snappedX ?? pt.x) / gridSize) * gridSize;
    const sy = Math.round((pt.snappedY ?? pt.y) / gridSize) * gridSize;
    const key = `${sx},${sy}`;
    if (!outlineSet.has(key)) {
      outlineSet.add(key);
      uniqueOutline.push({ x: sx, y: sy, original: pt });
    }
  }

  if (uniqueOutline.length === 0) {
    return {
      ok: false,
      error: 'EMPTY_OUTLINE',
      coordinates: [],
    };
  }

  // Find boundaries
  const ys = uniqueOutline.map((pt) => pt.y);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const filled = [];
  let preservedHoles = false;

  for (let y = minY; y <= maxY; y += gridSize) {
    const rowPoints = uniqueOutline.filter((pt) => Math.abs(pt.y - y) < gridSize / 2);
    if (rowPoints.length === 0) continue;

    rowPoints.sort((a, b) => a.x - b.x);

    const runs = [];
    let currentRun = null;

    for (const pt of rowPoints) {
      if (!currentRun) {
        currentRun = { startX: pt.x, endX: pt.x };
      } else if (Math.abs(pt.x - (currentRun.endX + gridSize)) < 1e-5) {
        currentRun.endX = pt.x;
      } else if (pt.x > currentRun.endX + gridSize) {
        runs.push(currentRun);
        currentRun = { startX: pt.x, endX: pt.x };
      }
    }
    if (currentRun) {
      runs.push(currentRun);
    }

    if (runs.length > 2) {
      preservedHoles = true;
    }

    for (let i = 0; i < runs.length; i++) {
      const run = runs[i];

      if (preserveBoundary) {
        for (let x = run.startX; x <= run.endX; x += gridSize) {
          filled.push({ x, y });
        }
      }

      if (i % 2 === 0 && i + 1 < runs.length) {
        const nextRun = runs[i + 1];
        for (let x = run.endX + gridSize; x < nextRun.startX; x += gridSize) {
          filled.push({ x, y });
        }
      }
    }

    if (filled.length > maxFillCells) {
      return {
        ok: false,
        error: 'FILL_TOO_LARGE',
        coordinates: [],
      };
    }
  }

  filled.sort((a, b) => {
    if (Math.abs(a.y - b.y) > 1e-5) {
      return a.y - b.y;
    }
    return a.x - b.x;
  });

  return {
    ok: true,
    coordinates: filled,
    fillMode: 'even-odd-winding',
    preservedHoles,
  };
}

/**
 * Fills a shape defined by a silhouette with a target color
 */
export function fillShape(silhouette, canvasSize, colorHex) {
  const result = fillShapeWithEvenOddWinding(silhouette, canvasSize, {
    preserveBoundary: true,
    maxFillCells: 262144,
  });

  if (!result.ok) {
    return [];
  }

  return result.coordinates.map((c) => ({
    x: c.x,
    y: c.y,
    z: 0,
    color: colorHex,
    emphasis: 0.5,
    source: 'fill',
    snappedX: c.x,
    snappedY: c.y,
  }));
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('').toUpperCase();
}
