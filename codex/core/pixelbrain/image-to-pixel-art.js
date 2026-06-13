/**
 * IMAGE-TO-PIXEL-ART GENERATOR
 * 
 * Generates pixel art coordinates and colors from reference image analysis.
 * This module traces shapes, extracts features, and maps them to PixelBrain's coordinate system.
 */

import { snapToPixelGrid } from './raster-jitter-filter.js';
import { analyzeImageToFormula, formulaToBytecode } from './image-to-bytecode-formula.js';
import { verseIRMicroprocessors } from '../microprocessors/index.js';
import { extensionRegistry } from './extension-registry.js';

const HIGH_FIDELITY_SOURCE_PIXEL_LIMIT = 96 * 96;

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
  
  // 3. Generate coordinates from image features. Small pixel-art references
  // need source-scale transcription; edge/landmark tracing loses flat cores
  // and subtle material shading even after luminance sampling.
  const coordinates = await resolveImageCoordinates(imageAnalysis, {
    pixelData,
    dimensions,
    composition,
    canvasSize,
    extension,
  });
  
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

async function resolveImageCoordinates(imageAnalysis, context) {
  if (Array.isArray(imageAnalysis.coordinates) && imageAnalysis.coordinates.length > 0) {
    return imageAnalysis.coordinates;
  }

  if (shouldUseSourceTranscription(imageAnalysis, context.extension)) {
    const transcribed = transcribeSourcePixelData(context.pixelData, context.dimensions);
    if (transcribed.length > 0) return transcribed;
  }

  return (await verseIRMicroprocessors.execute('pixel.trace', {
    pixelData: context.pixelData,
    dimensions: context.dimensions,
    composition: context.composition,
    canvasSize: context.canvasSize,
  })).coordinates;
}

function shouldUseSourceTranscription(imageAnalysis, extension) {
  if (extension) return false;
  const width = Number(imageAnalysis?.dimensions?.width);
  const height = Number(imageAnalysis?.dimensions?.height);
  const pixelCount = width * height;
  return Boolean(
    imageAnalysis?.pixelData
      && Number.isFinite(pixelCount)
      && pixelCount > 0
      && pixelCount <= HIGH_FIDELITY_SOURCE_PIXEL_LIMIT
  );
}

export function transcribeSourcePixelData(pixelData, dimensions, options = {}) {
  const srcWidth = Number(dimensions?.width);
  const srcHeight = Number(dimensions?.height);
  const alphaThreshold = Number(options.alphaThreshold ?? 128);
  const backgroundTolerance = Number(options.backgroundTolerance ?? 18);
  const coordinates = [];

  if (!Number.isFinite(srcWidth) || !Number.isFinite(srcHeight) || srcWidth <= 0 || srcHeight <= 0) {
    return coordinates;
  }

  const background = detectOpaqueBorderBackground(pixelData, srcWidth, srcHeight, alphaThreshold);

  for (let y = 0; y < srcHeight; y++) {
    for (let x = 0; x < srcWidth; x++) {
      const idx = (y * srcWidth + x) * 4;
      const alpha = Number(pixelData[idx + 3]) || 0;
      if (alpha < alphaThreshold) continue;

      const r = pixelData[idx];
      const g = pixelData[idx + 1];
      const b = pixelData[idx + 2];
      if (background && colorDistance({ r, g, b }, background) <= backgroundTolerance) continue;

      const brightness = (r + g + b) / 3;

      coordinates.push({
        x,
        y,
        snappedX: x,
        snappedY: y,
        z: 0,
        color: rgbToHex(r, g, b),
        emphasis: Math.max(0.08, Math.min(1, alpha / 255 || brightness / 255)),
        alpha,
        source: 'source_pixel_transcription',
      });
    }
  }

  return coordinates;
}

function detectOpaqueBorderBackground(pixelData, width, height, alphaThreshold) {
  const samples = [];
  for (let x = 0; x < width; x++) {
    samples.push(readRgb(pixelData, width, x, 0));
    samples.push(readRgb(pixelData, width, x, height - 1));
  }
  for (let y = 1; y < height - 1; y++) {
    samples.push(readRgb(pixelData, width, 0, y));
    samples.push(readRgb(pixelData, width, width - 1, y));
  }

  const opaque = samples.filter((sample) => sample.a >= alphaThreshold);
  if (opaque.length < samples.length * 0.9) return null;

  const avg = opaque.reduce((acc, sample) => ({
    r: acc.r + sample.r,
    g: acc.g + sample.g,
    b: acc.b + sample.b,
  }), { r: 0, g: 0, b: 0 });
  const background = {
    r: avg.r / opaque.length,
    g: avg.g / opaque.length,
    b: avg.b / opaque.length,
  };

  const maxDistance = opaque.reduce((max, sample) => Math.max(max, colorDistance(sample, background)), 0);
  return maxDistance <= 24 ? background : null;
}

function readRgb(pixelData, width, x, y) {
  const idx = (y * width + x) * 4;
  return {
    r: Number(pixelData[idx]) || 0,
    g: Number(pixelData[idx + 1]) || 0,
    b: Number(pixelData[idx + 2]) || 0,
    a: Number(pixelData[idx + 3]) || 0,
  };
}

function colorDistance(a, b) {
  return Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b);
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
