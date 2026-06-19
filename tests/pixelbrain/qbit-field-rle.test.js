import { describe, it, expect } from 'vitest';
import {
  encodeEnergyFieldRLE,
  decodeEnergyFieldRLE,
  QBIT_RLE_INTERNALS,
} from '../../codex/core/pixelbrain/qbit-field-rle.js';

function uniformField(width, height, depth, value) {
  const field = new Float32Array(width * height * depth);
  field.fill(value);
  return field;
}

function randomField(width, height, depth, seed = 1) {
  // Deterministic LCG so the test is reproducible.
  let state = seed;
  const next = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xFFFFFFFF;
  };
  const field = new Float32Array(width * height * depth);
  for (let i = 0; i < field.length; i++) field[i] = next();
  return field;
}

function smoothField(width, height, depth) {
  // Smooth bell field with a single peak at the centre. RLE should
  // compress this well because adjacent cells are similar.
  const field = new Float32Array(width * height * depth);
  const cx = width / 2;
  const cy = height / 2;
  const cz = depth / 2;
  const maxDist = Math.sqrt(cx * cx + cy * cy + cz * cz);
  for (let y = 0; y < height; y++) {
    for (let z = 0; z < depth; z++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width * depth + z * width + x;
        const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2 + (z - cz) ** 2);
        field[idx] = Math.max(0, 1 - d / maxDist);
      }
    }
  }
  return field;
}

function realisticQbitField(width, height, depth, sourceRadius) {
  // Models a real QBIT field after energy-floor clamping: most cells are
  // exactly zero, with a small spherical region of nonzero values around
  // the seed. This is the actual statistical profile RLE targets, per
  // QBIT-VOXEL-SYNTHESIS.md §3 Difficulty 6: "QBIT energy fields are
  // spatially correlated (smooth gradients), so RLE on 1D scanlines of
  // the 3D tensor achieves high compression."
  const field = new Float32Array(width * height * depth);
  const cx = width / 2;
  const cy = height / 2;
  const cz = depth / 2;
  for (let y = 0; y < height; y++) {
    for (let z = 0; z < depth; z++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width * depth + z * width + x;
        const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2 + (z - cz) ** 2);
        if (d < sourceRadius) {
          field[idx] = 1 - d / sourceRadius;
        }
      }
    }
  }
  return field;
}

describe('qbit-field-rle', () => {
  describe('encodeEnergyFieldRLE', () => {
    it('encodes a uniform field to a tiny payload (single run per scanline)', () => {
      const field = uniformField(8, 4, 8, 0.5);
      const result = encodeEnergyFieldRLE(field, 8, 4, 8);
      // 4 * 8 = 32 scanlines, each one run = 32 runs total
      expect(result.runCount).toBe(32);
      expect(result.compressedBytes).toBe(15 + 32 * 3);
    });

    it('reports correct originalBytes (Float32 = 4 bytes per cell)', () => {
      const field = uniformField(4, 4, 4, 0.1);
      const result = encodeEnergyFieldRLE(field, 4, 4, 4);
      expect(result.originalBytes).toBe(4 * 4 * 4 * 4);
    });

    it('achieves >80% compression on a realistic QBIT field (per spec §4 Level 4)', () => {
      // Real QBIT fields have large zero regions (cells below the energy
      // floor). 32³ field with a small nonzero sphere of radius 8 around
      // the centre matches the post-floor distribution.
      const field = realisticQbitField(32, 32, 32, 8);
      const result = encodeEnergyFieldRLE(field, 32, 32, 32);
      // Compression ratio = original / compressed. >80% compression means
      // compressed is <= 20% of original, i.e. ratio >= 5x.
      expect(result.compressionRatio).toBeGreaterThan(5);
    });

    it('throws on mismatched dimensions', () => {
      const field = new Float32Array(10);
      expect(() => encodeEnergyFieldRLE(field, 4, 4, 4)).toThrow();
    });

    it('is deterministic — same input produces byte-identical output', () => {
      const field = smoothField(8, 8, 8);
      const a = encodeEnergyFieldRLE(field, 8, 8, 8);
      const b = encodeEnergyFieldRLE(field, 8, 8, 8);
      expect(Array.from(a.bytes)).toEqual(Array.from(b.bytes));
    });
  });

  describe('decodeEnergyFieldRLE', () => {
    it('round-trips a uniform field exactly (within quantization)', () => {
      const value = 0.5;
      const field = uniformField(8, 4, 8, value);
      const encoded = encodeEnergyFieldRLE(field, 8, 4, 8);
      const decoded = decodeEnergyFieldRLE(encoded.bytes);
      expect(decoded.width).toBe(8);
      expect(decoded.height).toBe(4);
      expect(decoded.depth).toBe(8);
      for (let i = 0; i < decoded.energyField.length; i++) {
        expect(decoded.energyField[i]).toBeCloseTo(value, 2);
      }
    });

    it('round-trips a smooth field with bounded quantization error', () => {
      const field = smoothField(16, 16, 16);
      const encoded = encodeEnergyFieldRLE(field, 16, 16, 16);
      const decoded = decodeEnergyFieldRLE(encoded.bytes);
      const maxError = 1 / (QBIT_RLE_INTERNALS.QUANT_LEVELS - 1);
      for (let i = 0; i < field.length; i++) {
        expect(Math.abs(field[i] - decoded.energyField[i])).toBeLessThanOrEqual(maxError + 1e-6);
      }
    });

    it('preserves volume dimensions across encode/decode', () => {
      const field = uniformField(7, 3, 5, 0.25);
      const encoded = encodeEnergyFieldRLE(field, 7, 3, 5);
      const decoded = decodeEnergyFieldRLE(encoded.bytes);
      expect(decoded.width).toBe(7);
      expect(decoded.height).toBe(3);
      expect(decoded.depth).toBe(5);
      expect(decoded.energyField.length).toBe(7 * 3 * 5);
    });

    it('rejects an unsupported version byte', () => {
      const field = uniformField(4, 4, 4, 0.1);
      const encoded = encodeEnergyFieldRLE(field, 4, 4, 4);
      const corrupted = new Uint8Array(encoded.bytes);
      corrupted[0] = 99;
      expect(() => decodeEnergyFieldRLE(corrupted)).toThrow(/unsupported version/);
    });

    it('rejects a buffer smaller than the header', () => {
      const buf = new Uint8Array(5);
      expect(() => decodeEnergyFieldRLE(buf)).toThrow(/smaller than header/);
    });

    it('survives a random (low-compressibility) field round-trip', () => {
      const field = randomField(8, 8, 8, 42);
      const encoded = encodeEnergyFieldRLE(field, 8, 8, 8);
      const decoded = decodeEnergyFieldRLE(encoded.bytes);
      const maxError = 1 / (QBIT_RLE_INTERNALS.QUANT_LEVELS - 1);
      for (let i = 0; i < field.length; i++) {
        expect(Math.abs(field[i] - decoded.energyField[i])).toBeLessThanOrEqual(maxError + 1e-6);
      }
    });
  });

  describe('QBIT_RLE_INTERNALS', () => {
    it('quantizeEnergy clamps to [0, 1]', () => {
      const { quantizeEnergy, QUANT_LEVELS } = QBIT_RLE_INTERNALS;
      expect(quantizeEnergy(-1)).toBe(0);
      expect(quantizeEnergy(2)).toBe(QUANT_LEVELS - 1);
      expect(quantizeEnergy(0)).toBe(0);
      expect(quantizeEnergy(1)).toBe(QUANT_LEVELS - 1);
    });

    it('dequantizeEnergy maps the byte range to [0, 1]', () => {
      const { dequantizeEnergy, QUANT_LEVELS } = QBIT_RLE_INTERNALS;
      expect(dequantizeEnergy(0)).toBe(0);
      expect(dequantizeEnergy(QUANT_LEVELS - 1)).toBe(1);
    });
  });
});
