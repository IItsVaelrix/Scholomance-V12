/**
 * QBIT Field RLE Compression
 *
 * Per QBIT-VOXEL-SYNTHESIS.md §3 Difficulty 6: TurboQuant's vector-quantization
 * codebook is shaped for point-cloud statistics, not for 3D energy tensors.
 * Energy fields are bounded [0,1], spatially correlated, and Gaussian-smooth —
 * a profile that run-length encoding handles natively without the codebook
 * mismatch TurboQuant exhibits.
 *
 * The pipeline is two stages:
 *   1. Quantize each Float32 [0, 1] cell to a Uint8 (256 levels).
 *   2. RLE-encode the quantized stream scanline-by-scanline along the X axis.
 *
 * The X-axis scanline choice is deliberate: it matches the cell index layout
 * (`y * width * depth + z * width + x`) so encoding visits adjacent cells in
 * memory order. Adjacent cells have similar energy, which yields long runs.
 *
 * Format:
 *   header: [version(u8), width(u32), height(u32), depth(u32), quantLevels(u16)]
 *   payload: pairs of [count(u16), value(u8)] for each run
 *
 * Determinism: every cell maps to one byte; every byte maps to one cell;
 * the format is byte-identical across runs given the same input.
 */

const RLE_VERSION = 1;
const RLE_MAX_RUN = 0xFFFF;     // u16 ceiling per run
const QUANT_LEVELS = 256;        // Uint8 quantization

function quantizeEnergy(value, levels = QUANT_LEVELS) {
  const clamped = Math.max(0, Math.min(1, value));
  const quantized = Math.round(clamped * (levels - 1));
  return quantized;
}

function dequantizeEnergy(byte, levels = QUANT_LEVELS) {
  return byte / (levels - 1);
}

/**
 * Encode a QBIT energy field to a compact RLE Uint8Array.
 *
 * @param {Float32Array} energyField - Flat field, length = width * height * depth
 * @param {number} width
 * @param {number} height
 * @param {number} depth
 * @returns {{ bytes: Uint8Array, runCount: number, originalBytes: number,
 *            compressedBytes: number, compressionRatio: number }}
 */
export function encodeEnergyFieldRLE(energyField, width, height, depth) {
  const totalCells = width * height * depth;
  if (energyField.length !== totalCells) {
    throw new Error(
      `encodeEnergyFieldRLE: energyField length ${energyField.length} does not match ${width}*${height}*${depth}=${totalCells}`
    );
  }

  // First pass: collect runs scanline-by-scanline along X.
  // A new run starts at:
  //   - the first cell
  //   - any cell whose quantized value differs from the previous
  //   - the start of a new scanline (we reset runs at scanline boundaries
  //     so decoding can skip into the middle of the volume without replay)
  //   - whenever a run reaches RLE_MAX_RUN
  const runs = [];
  for (let y = 0; y < height; y++) {
    for (let z = 0; z < depth; z++) {
      let runValue = -1;
      let runCount = 0;
      for (let x = 0; x < width; x++) {
        const idx = y * width * depth + z * width + x;
        const q = quantizeEnergy(energyField[idx]);
        if (q === runValue && runCount < RLE_MAX_RUN) {
          runCount += 1;
        } else {
          if (runCount > 0) runs.push({ count: runCount, value: runValue });
          runValue = q;
          runCount = 1;
        }
      }
      if (runCount > 0) runs.push({ count: runCount, value: runValue });
    }
  }

  // Header: 1 (version) + 4 + 4 + 4 + 2 = 15 bytes
  const headerBytes = 15;
  const payloadBytes = runs.length * 3; // 2 bytes count + 1 byte value
  const bytes = new Uint8Array(headerBytes + payloadBytes);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  view.setUint8(0, RLE_VERSION);
  view.setUint32(1, width, true);
  view.setUint32(5, height, true);
  view.setUint32(9, depth, true);
  view.setUint16(13, QUANT_LEVELS, true);

  let offset = headerBytes;
  for (const run of runs) {
    view.setUint16(offset, run.count, true);
    view.setUint8(offset + 2, run.value);
    offset += 3;
  }

  const originalBytes = totalCells * 4; // Float32 = 4 bytes per cell
  return {
    bytes,
    runCount: runs.length,
    originalBytes,
    compressedBytes: bytes.length,
    compressionRatio: bytes.length === 0 ? 0 : originalBytes / bytes.length,
  };
}

/**
 * Decode an RLE-encoded buffer back to a Float32Array energy field.
 * Round-trips through quantization, so output differs from input by at most
 * 1/(QUANT_LEVELS - 1) ≈ 0.0039 per cell.
 *
 * @param {Uint8Array} bytes
 * @returns {{ energyField: Float32Array, width: number, height: number, depth: number }}
 */
export function decodeEnergyFieldRLE(bytes) {
  if (bytes.length < 15) {
    throw new Error('decodeEnergyFieldRLE: buffer smaller than header (15 bytes)');
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const version = view.getUint8(0);
  if (version !== RLE_VERSION) {
    throw new Error(`decodeEnergyFieldRLE: unsupported version ${version}`);
  }

  const width = view.getUint32(1, true);
  const height = view.getUint32(5, true);
  const depth = view.getUint32(9, true);
  const quantLevels = view.getUint16(13, true);
  const totalCells = width * height * depth;
  const energyField = new Float32Array(totalCells);

  let offset = 15;
  let cellIdx = 0;
  while (offset < bytes.length) {
    const count = view.getUint16(offset, true);
    const value = view.getUint8(offset + 2);
    const energy = dequantizeEnergy(value, quantLevels);
    for (let i = 0; i < count; i++) {
      if (cellIdx >= totalCells) {
        throw new Error('decodeEnergyFieldRLE: run overflow past totalCells');
      }
      energyField[cellIdx] = energy;
      cellIdx += 1;
    }
    offset += 3;
  }

  if (cellIdx !== totalCells) {
    throw new Error(
      `decodeEnergyFieldRLE: run count covered ${cellIdx} cells, expected ${totalCells}`
    );
  }

  return { energyField, width, height, depth };
}

export const QBIT_RLE_INTERNALS = Object.freeze({
  RLE_VERSION,
  RLE_MAX_RUN,
  QUANT_LEVELS,
  quantizeEnergy,
  dequantizeEnergy,
});
