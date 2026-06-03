import { DEFAULT_PHOTONIC_BRIDGE_CONFIG } from './photonic.config.js';
import { createDiagnostic } from './photonic-diagnostics.js';

const SOURCE_KINDS = new Set(['kv-cache', 'embedding', 'attention-probe', 'manual']);
const ROTATION_KINDS = new Set(['none', 'random-rotation', 'hadamard', 'polar', 'custom']);
const QUANTIZATION_KINDS = new Set(['none', 'scalar', 'polar', 'qjl-residual', 'custom']);
const RESIDUAL_KINDS = new Set(['none', 'qjl', 'sign-bit', 'residual-codebook', 'custom']);
const TARGET_OPERATIONS = new Set([
  'inner-product',
  'matrix-vector',
  'matrix-matrix',
  'similarity-search',
  'diagnostic',
]);

function normalizeEnum(value, allowed, fallback) {
  const normalized = String(value || fallback).trim().toLowerCase();
  return allowed.has(normalized) ? normalized : fallback;
}

function normalizeBitWidth(value, allowed) {
  const numeric = Number(value);
  if (!Number.isInteger(numeric)) return 8;
  return allowed.includes(numeric) ? numeric : 8;
}

export function validatePhotonicVectorPacket(input, config = DEFAULT_PHOTONIC_BRIDGE_CONFIG) {
  const diagnostics = [];

  if (!input || typeof input !== 'object') {
    return {
      ok: false,
      packet: null,
      diagnostics: [
        createDiagnostic('PHOTONIC_PACKET_INVALID', 'error', 'Input must be an object.'),
      ],
    };
  }

  const dimension = Math.max(1, Math.min(
    Number.isInteger(Number(input.dimension)) ? Number(input.dimension) : 1,
    config.maxDimension
  ));

  if (!Number.isInteger(Number(input.dimension)) || Number(input.dimension) <= 0) {
    diagnostics.push(createDiagnostic(
      'PHOTONIC_DIMENSION_DEFAULTED',
      'warn',
      'dimension was missing or invalid and defaulted to 1.',
      { provided: input.dimension }
    ));
  }

  if (Number(input.dimension) > config.maxDimension) {
    diagnostics.push(createDiagnostic(
      'PHOTONIC_DIMENSION_CLAMPED',
      'warn',
      'dimension exceeded maxDimension and was clamped.',
      { provided: input.dimension, maxDimension: config.maxDimension }
    ));
  }

  const storageKind = String(input.storageKind || 'float32').trim().toLowerCase();
  const safeStorageKind = config.allowedStorageKinds.includes(storageKind)
    ? storageKind
    : 'float32';

  if (safeStorageKind !== storageKind) {
    diagnostics.push(createDiagnostic(
      'PHOTONIC_STORAGE_DEFAULTED',
      'warn',
      'storageKind was unsupported and defaulted to float32.',
      { provided: input.storageKind }
    ));
  }

  const packetId = String(input.packetId || `packet_${dimension}_${safeStorageKind}`).trim();

  const packet = Object.freeze({
    packetId,
    sourceKind: normalizeEnum(input.sourceKind, SOURCE_KINDS, 'manual'),
    dimension,
    bitWidth: normalizeBitWidth(input.bitWidth, config.allowedBitWidths),
    storageKind: safeStorageKind,
    rotationKind: normalizeEnum(input.rotationKind, ROTATION_KINDS, 'none'),
    quantizationKind: normalizeEnum(input.quantizationKind, QUANTIZATION_KINDS, 'none'),
    residualKind: normalizeEnum(input.residualKind, RESIDUAL_KINDS, 'none'),
    targetOperation: normalizeEnum(input.targetOperation, TARGET_OPERATIONS, 'diagnostic'),
    hasData: Boolean(input.data),
    metadata: Object.freeze({ ...(input.metadata || {}) }),
  });

  return {
    ok: diagnostics.every((diagnostic) => diagnostic.severity !== 'error'),
    packet,
    diagnostics,
  };
}
