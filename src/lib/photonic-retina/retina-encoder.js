import { RETINA_QUANTIZATION_KINDS, RETINA_ROTATION_KINDS } from './retina.config.js';
import { stableHash } from './retina-hash.js';
import { normalizeRetinaPayload } from './retina-normalize.js';

function clampInt8(value) {
  return Math.max(-128, Math.min(127, Math.round(Number(value) || 0)));
}

function signedHash(index, seedHash) {
  let state = (Number.parseInt(seedHash, 16) >>> 0) ^ index;
  state = Math.imul(state ^ (state >>> 16), 0x7feb352d);
  state = Math.imul(state ^ (state >>> 15), 0x846ca68b);
  state ^= state >>> 16;
  return (state >>> 0) % 2 === 0 ? 1 : -1;
}

function quantizeScalar(value, bitWidth) {
  const maxMagnitude = (2 ** (bitWidth - 1)) - 1;
  const normalized = Math.max(-1, Math.min(1, value / 255));
  return clampInt8(normalized * maxMagnitude);
}

function quantizeBinarySign(value) {
  if (value > 0) return 1;
  if (value < 0) return -1;
  return 0;
}

export function simulateRetinaEncoding(input, config) {
  const vector = normalizeRetinaPayload(input, config);
  const inputHash = stableHash(input);
  const configHash = stableHash({
    bitWidth: config.bitWidth,
    packetVersion: config.packetVersion,
    quantizationKind: config.quantizationKind,
    rotationKind: config.rotationKind,
    seed: config.seed ?? 'photonic-retina',
    targetDimension: config.targetDimension,
  });
  const seedHash = stableHash({ configHash, inputHash });
  const data = new Int8Array(vector.length);

  for (let index = 0; index < vector.length; index += 1) {
    const sign = config.rotationKind === RETINA_ROTATION_KINDS.SIGNED_HASH_ROTATION
      ? signedHash(index, seedHash)
      : 1;
    const rotated = vector[index] * sign;

    data[index] = config.quantizationKind === RETINA_QUANTIZATION_KINDS.BINARY_SIGN
      ? quantizeBinarySign(rotated)
      : quantizeScalar(rotated, config.bitWidth);
  }

  const packetId = `retina_v${config.packetVersion}_${inputHash}_${configHash}`;

  return Object.freeze({
    schemaVersion: config.packetVersion,
    packetId,
    sourceKind: input.sourceKind,
    dimension: data.length,
    bitWidth: config.bitWidth,
    storageKind: config.storageKind,
    rotationKind: config.rotationKind,
    quantizationKind: config.quantizationKind,
    residualKind: config.residualKind,
    targetOperation: config.targetOperation,
    data,
    metadata: Object.freeze({
      generatedBy: 'photonic-retina',
      inputHash,
      configHash,
      deterministic: true,
    }),
    diagnostics: Object.freeze([
      `RETINA_ENCODED ${input.sourceKind}`,
      `DIMENSION ${data.length}`,
      `BIT_WIDTH ${config.bitWidth}`,
      `PACKET_ID ${packetId}`,
    ]),
  });
}
