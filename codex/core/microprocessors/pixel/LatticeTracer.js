/**
 * PIXEL MICROPROCESSOR: Lattice Tracer
 * 
 * Extracts visual features (edges, landmarks) from pixel substrates
 * and transforms them into VerseIR-compatible coordinate hints.
 */

import {
  BytecodeError,
  ERROR_CATEGORIES,
  ERROR_SEVERITY,
  MODULE_IDS,
  ERROR_CODES,
} from '../../pixelbrain/bytecode-error.js';
import { clamp01 } from '../../pixelbrain/shared.js';

const MOD = MODULE_IDS.IMG_PIXEL;
const TRANSPARENT_ALPHA_THRESHOLD = 128;
const WHITE_HOT_BRIGHTNESS = 235;
const COLD_SHADOW_BRIGHTNESS = 20;

/**
 * Trace visual lattice from substrate
 * @param {Object} payload - { pixelData, dimensions, threshold }
 * @returns {Object} { coordinates }
 */
export function traceLattice({ pixelData, dimensions, threshold = 30 }) {
  const width = Number(dimensions?.width);
  const height = Number(dimensions?.height);
  
  // Safety: Validate dimensions
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new BytecodeError(
      ERROR_CATEGORIES.RANGE, ERROR_SEVERITY.CRIT, MOD,
      ERROR_CODES.BELOW_MIN,
      { width, height, minimum: 1, reason: 'lattice tracing requires finite positive dimensions' },
    );
  }

  const coordinates = [];
  const coordinateKeys = new Set();
  const edgeThreshold = threshold;
  const materialSampleStep = Math.max(1, Math.floor(Math.max(width, height) / 64));

  function addCoordinate(x, y, color, emphasis, source) {
    const key = `${x},${y}`;
    if (coordinateKeys.has(key)) return;
    coordinateKeys.add(key);
    coordinates.push({
      x,
      y,
      z: 0,
      color,
      emphasis,
      source,
    });
  }

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      
      // Skip transparent pixels
      if (pixelData[idx + 3] < TRANSPARENT_ALPHA_THRESHOLD) continue;
      
      // Detect edges using simple gradient
      const leftIdx = (y * width + (x - 1)) * 4;
      const topIdx = ((y - 1) * width + x) * 4;
      
      const leftDiff = Math.abs(pixelData[idx] - pixelData[leftIdx]) +
                       Math.abs(pixelData[idx + 1] - pixelData[leftIdx + 1]) +
                       Math.abs(pixelData[idx + 2] - pixelData[leftIdx + 2]);
      
      const topDiff = Math.abs(pixelData[idx] - pixelData[topIdx]) +
                      Math.abs(pixelData[idx + 1] - pixelData[topIdx + 1]) +
                      Math.abs(pixelData[idx + 2] - pixelData[topIdx + 2]);
      
      const brightness = getBrightness(pixelData, idx);
      const adaptiveThreshold = brightness >= WHITE_HOT_BRIGHTNESS || brightness <= COLD_SHADOW_BRIGHTNESS
        ? Math.max(6, edgeThreshold * 0.35)
        : edgeThreshold;
      const isEdge = leftDiff > adaptiveThreshold || topDiff > adaptiveThreshold;
      
      if (isEdge) {
        const r = pixelData[idx];
        const g = pixelData[idx + 1];
        const b = pixelData[idx + 2];
        const colorHex = rgbToHex(r, g, b);
        
        addCoordinate(x, y, colorHex, clamp01((leftDiff + topDiff) / (2 * 255)), 'image_edge');
      }
    }
  }

  // Luminance/material pass: sample opaque interior pixels even when the
  // gradient is flat. This preserves white-hot cores, near-black shadows, and
  // soft shading regions that edge detection cannot see.
  for (let y = 0; y < height; y += materialSampleStep) {
    for (let x = 0; x < width; x += materialSampleStep) {
      const idx = (y * width + x) * 4;
      if (pixelData[idx + 3] < TRANSPARENT_ALPHA_THRESHOLD) continue;

      const r = pixelData[idx];
      const g = pixelData[idx + 1];
      const b = pixelData[idx + 2];
      const brightness = getBrightness(pixelData, idx);
      const source = brightness >= WHITE_HOT_BRIGHTNESS
        ? 'image_luminance_high'
        : brightness <= COLD_SHADOW_BRIGHTNESS
          ? 'image_luminance_low'
          : 'image_luminance_sample';

      addCoordinate(
        x,
        y,
        rgbToHex(r, g, b),
        Math.max(0.12, clamp01(brightness / 255) * 0.65),
        source
      );
    }
  }

  // Fallback: if very sparse, add denser opaque samples.
  if (coordinates.length < 50) {
    const sampleStep = Math.max(2, Math.floor(width / 20));
    for (let y = 0; y < height; y += sampleStep) {
      for (let x = 0; x < width; x += sampleStep) {
        const idx = (y * width + x) * 4;
        if (pixelData[idx + 3] < TRANSPARENT_ALPHA_THRESHOLD) continue;
        
        const r = pixelData[idx];
        const g = pixelData[idx + 1];
        const b = pixelData[idx + 2];
        const brightness = getBrightness(pixelData, idx);
        
        addCoordinate(
          x,
          y,
          rgbToHex(r, g, b),
          Math.max(0.08, clamp01(brightness / 255) * 0.5),
          'image_sample'
        );
      }
    }
  }

  return { coordinates };
}

function getBrightness(pixelData, idx) {
  return (pixelData[idx] + pixelData[idx + 1] + pixelData[idx + 2]) / 3;
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => {
    const hex = Math.min(255, Math.max(0, x)).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('').toUpperCase();
}
