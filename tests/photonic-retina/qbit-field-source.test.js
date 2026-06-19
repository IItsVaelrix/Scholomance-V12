import { describe, it, expect } from 'vitest';
import {
  RETINA_SOURCE_KINDS,
} from '../../src/lib/photonic-retina/retina.config.js';
import {
  normalizeRetinaConfig,
  validateRetinaInput,
} from '../../src/lib/photonic-retina/retina-schema.js';
import { normalizeRetinaPayload } from '../../src/lib/photonic-retina/retina-normalize.js';
import { encodeToPhotonicRetina } from '../../src/lib/photonic-retina/index.js';

function makeEnergyField(width, height, depth) {
  const field = new Float32Array(width * height * depth);
  for (let i = 0; i < field.length; i++) {
    field[i] = (i / field.length);
  }
  return field;
}

describe('photonic-retina qbit-field source kind', () => {
  describe('RETINA_SOURCE_KINDS', () => {
    it('exposes QBIT_FIELD', () => {
      expect(RETINA_SOURCE_KINDS.QBIT_FIELD).toBe('qbit-field');
    });
  });

  describe('validateRetinaInput', () => {
    it('accepts sourceKind qbit-field with 3D dimensions', () => {
      const input = validateRetinaInput({
        sourceKind: 'qbit-field',
        payload: {
          width: 4,
          height: 4,
          depth: 4,
          energyField: makeEnergyField(4, 4, 4),
        },
        dimensions: { width: 4, height: 4, depth: 4 },
      });
      expect(input.sourceKind).toBe('qbit-field');
      expect(input.dimensions.width).toBe(4);
      expect(input.dimensions.depth).toBe(4);
    });

    it('rejects negative depth', () => {
      expect(() => validateRetinaInput({
        sourceKind: 'qbit-field',
        payload: {},
        dimensions: { width: 4, height: 4, depth: -1 },
      })).toThrow(/depth must be positive/);
    });

    it('rejects non-finite depth', () => {
      expect(() => validateRetinaInput({
        sourceKind: 'qbit-field',
        payload: {},
        dimensions: { width: 4, height: 4, depth: NaN },
      })).toThrow(/depth must be positive/);
    });

    it('treats omitted depth as 2D (depth undefined)', () => {
      const input = validateRetinaInput({
        sourceKind: 'coordinates',
        payload: [],
        dimensions: { width: 8, height: 8 },
      });
      expect(input.dimensions.depth).toBeUndefined();
    });
  });

  describe('normalizeRetinaPayload', () => {
    it('extracts values from energyField for qbit-field source', () => {
      const config = normalizeRetinaConfig({ targetDimension: 16 });
      const input = validateRetinaInput({
        sourceKind: 'qbit-field',
        payload: {
          width: 4,
          height: 4,
          depth: 4,
          energyField: makeEnergyField(4, 4, 4),
        },
        dimensions: { width: 4, height: 4, depth: 4 },
      });
      const vector = normalizeRetinaPayload(input, config);
      expect(vector).toBeInstanceOf(Float32Array);
      expect(vector).toHaveLength(16);
      // First value should be 0 (i/N at i=0)
      expect(vector[0]).toBe(0);
      // Some later value should be nonzero
      let nonZero = false;
      for (let i = 0; i < vector.length; i++) {
        if (vector[i] !== 0) { nonZero = true; break; }
      }
      expect(nonZero).toBe(true);
    });

    it('returns zeros when energyField is missing', () => {
      const config = normalizeRetinaConfig({ targetDimension: 8 });
      const input = validateRetinaInput({
        sourceKind: 'qbit-field',
        payload: { width: 4, height: 4, depth: 4 },
        dimensions: { width: 4, height: 4, depth: 4 },
      });
      const vector = normalizeRetinaPayload(input, config);
      expect(vector).toHaveLength(8);
      for (let i = 0; i < vector.length; i++) expect(vector[i]).toBe(0);
    });

    it('uses gradientField as overflow when energyField is shorter than targetDimension', () => {
      const config = normalizeRetinaConfig({ targetDimension: 64 });
      const energyField = new Float32Array(8);
      energyField.fill(0.5);
      const gradientField = new Float32Array(24);
      gradientField.fill(0.1);
      const input = validateRetinaInput({
        sourceKind: 'qbit-field',
        payload: { width: 2, height: 2, depth: 2, energyField, gradientField },
        dimensions: { width: 2, height: 2, depth: 2 },
      });
      const vector = normalizeRetinaPayload(input, config);
      expect(vector).toHaveLength(64);
      // At least the first few cells reflect energy (0.5 * 255 = 127.5)
      expect(vector[0]).toBeCloseTo(127.5);
    });

    it('encodes qbit-field input deterministically end-to-end', () => {
      const energyField = makeEnergyField(4, 4, 4);
      const input = {
        sourceKind: 'qbit-field',
        payload: { width: 4, height: 4, depth: 4, energyField },
        dimensions: { width: 4, height: 4, depth: 4 },
      };
      const a = encodeToPhotonicRetina(input, { targetDimension: 16 });
      const b = encodeToPhotonicRetina(input, { targetDimension: 16 });
      expect(a.packetId).toBe(b.packetId);
      expect(Array.from(a.data)).toEqual(Array.from(b.data));
    });
  });
});
