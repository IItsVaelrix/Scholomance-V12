import { test, expect } from 'vitest';
import {
  rateColorIntensity,
  annotateCoordinateColorIntensity,
  buildColorIntensityPayload,
  COLOR_INTENSITY_MICROPROCESSOR_ID
} from '../../codex/core/pixelbrain/color-intensity-rating-microprocessor.js';

test('PixelBrain Color Intensity Rating Microprocessor - pure white is extreme (white_core)', () => {
  const result = rateColorIntensity('#FFFFFF');
  expect(result.band).toBe('extreme');
  expect(result.role).toBe('white_core');
  expect(result.rating).toBeGreaterThanOrEqual(0.9);
});

test('PixelBrain Color Intensity Rating Microprocessor - pure black is extreme (black_anchor)', () => {
  const result = rateColorIntensity('#000000');
  expect(result.band).toBe('extreme');
  expect(result.role).toBe('black_anchor');
  expect(result.rating).toBeGreaterThanOrEqual(0.9);
});

test('PixelBrain Color Intensity Rating Microprocessor - saturated midtone is intense or vivid', () => {
  // Pure red
  const result = rateColorIntensity('#FF0000');
  expect(result.rating).toBeGreaterThanOrEqual(0.7); // at least intense
  expect(result.saturation).toBeGreaterThanOrEqual(0.9);
});

test('PixelBrain Color Intensity Rating Microprocessor - muted gray is muted or normal', () => {
  const result = rateColorIntensity('#808080');
  expect(result.rating).toBeLessThan(0.5); // normal or muted
});

test('PixelBrain Color Intensity Rating Microprocessor - local contrast boosts rating', () => {
  // #808080 is normally low rating
  const withoutContrast = rateColorIntensity('#808080');
  
  // But if local contrast is very high
  const withContrast = rateColorIntensity('#808080', { localContrast: 1.0 });
  
  expect(withContrast.rating).toBeGreaterThan(withoutContrast.rating);
  expect(withContrast.role).toBe('local_contrast');
});

test('PixelBrain Color Intensity Rating Microprocessor - coordinate annotation works with neighbors', () => {
  const coordinates = [
    { x: 0, y: 0, color: '#000000' }, // center, surrounded by white
    { x: 1, y: 0, color: '#FFFFFF' },
    { x: -1, y: 0, color: '#FFFFFF' },
    { x: 0, y: 1, color: '#FFFFFF' },
    { x: 0, y: -1, color: '#FFFFFF' },
  ];

  const annotated = annotateCoordinateColorIntensity(coordinates);
  const centerCoord = annotated.find(c => c.x === 0 && c.y === 0);
  
  expect(centerCoord.colorIntensity.localContrast).toBeGreaterThan(0.8);
  expect(centerCoord.colorIntensity.rating).toBeGreaterThan(0.8);
});

test('PixelBrain Color Intensity Rating Microprocessor - deterministic payload generation', () => {
  const coordinates = [
    { x: 0, y: 0, color: '#FF0000' },
    { x: 1, y: 1, color: '#00FF00' }
  ];

  const payload1 = buildColorIntensityPayload({ coordinates });
  const payload2 = buildColorIntensityPayload({ coordinates });

  expect(payload1.amp).toBe(COLOR_INTENSITY_MICROPROCESSOR_ID);
  expect(payload1.inputHash).toBe(payload2.inputHash);
  expect(payload1.outputCoordinates.length).toBe(2);
  
  // Output coordinates should be annotated
  expect(payload1.outputCoordinates[0].colorIntensity.rating).toBeGreaterThan(0);
});
