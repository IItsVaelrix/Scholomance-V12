import { describe, expect, it } from 'vitest';
import { DEFAULT_RETINA_CONFIG } from '../../src/lib/photonic-retina/retina.config.js';
import { normalizeRetinaPayload } from '../../src/lib/photonic-retina/retina-normalize.js';
import {
  normalizeRetinaConfig,
  validateRetinaInput,
} from '../../src/lib/photonic-retina/retina-schema.js';

describe('retina-normalize', () => {
  it('normalizes coordinates to the target dimension', () => {
    const config = normalizeRetinaConfig({ targetDimension: 8 });
    const input = validateRetinaInput({
      sourceKind: 'coordinates',
      payload: [{ x: 5, y: 10, emphasis: 1, color: '#ffffff' }],
      dimensions: { width: 10, height: 20 },
    });

    const vector = normalizeRetinaPayload(input, config);

    expect(vector).toBeInstanceOf(Float32Array);
    expect(vector).toHaveLength(8);
    expect(vector[0]).toBe(127.5);
    expect(vector[1]).toBe(127.5);
  });

  it('normalizes empty coordinates into a zero vector', () => {
    const config = normalizeRetinaConfig({ targetDimension: 4 });
    const input = validateRetinaInput({ sourceKind: 'coordinates', payload: [] });
    const vector = normalizeRetinaPayload(input, config);

    expect(Array.from(vector)).toEqual([0, 0, 0, 0]);
  });

  it('downsamples pixel buffers deterministically', () => {
    const config = normalizeRetinaConfig({ targetDimension: 4 });
    const input = validateRetinaInput({
      sourceKind: 'pixels',
      payload: new Uint8ClampedArray([1, 2, 3, 4, 5, 6, 7, 8]),
    });

    const first = normalizeRetinaPayload(input, config);
    const second = normalizeRetinaPayload(input, config);

    expect(Array.from(first)).toEqual([1, 3, 5, 7]);
    expect(Array.from(first)).toEqual(Array.from(second));
  });

  it('normalizes lattice Map input without mutating it', () => {
    const config = normalizeRetinaConfig({ targetDimension: 5 });
    const originalCell = { col: 2, row: 3, emphasis: 0.5, color: '#f00' };
    const cells = new Map([['a', originalCell]]);
    const input = validateRetinaInput({ sourceKind: 'lattice', payload: { cells } });

    const vector = normalizeRetinaPayload(input, config);

    expect(vector).toHaveLength(5);
    expect(cells.get('a')).toBe(originalCell);
    expect(originalCell).toEqual({ col: 2, row: 3, emphasis: 0.5, color: '#f00' });
  });

  it('sorts formula params before normalization', () => {
    const config = normalizeRetinaConfig({ targetDimension: 5 });
    const left = validateRetinaInput({
      sourceKind: 'formula',
      payload: { type: 'arc', parameters: { b: 2, a: 1 } },
    });
    const right = validateRetinaInput({
      sourceKind: 'formula',
      payload: { type: 'arc', parameters: { a: 1, b: 2 } },
    });

    expect(Array.from(normalizeRetinaPayload(left, config))).toEqual(
      Array.from(normalizeRetinaPayload(right, config))
    );
  });

  it('uses the default target dimension when not overridden', () => {
    const input = validateRetinaInput({ sourceKind: 'colors', payload: ['#fff'] });
    const vector = normalizeRetinaPayload(input, DEFAULT_RETINA_CONFIG);

    expect(vector).toHaveLength(DEFAULT_RETINA_CONFIG.targetDimension);
  });
});
