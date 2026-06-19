import {
  DEFAULT_RETINA_CONFIG,
  RETINA_MODES,
  RETINA_QUANTIZATION_KINDS,
  RETINA_ROTATION_KINDS,
  RETINA_SOURCE_KINDS,
} from './retina.config.js';

const ALLOWED_MODES = new Set(Object.values(RETINA_MODES));
const ALLOWED_SOURCE_KINDS = new Set(Object.values(RETINA_SOURCE_KINDS));
const ALLOWED_BIT_WIDTHS = new Set([1, 2, 4, 8]);
const ALLOWED_QUANTIZATION_KINDS = new Set(Object.values(RETINA_QUANTIZATION_KINDS));
const ALLOWED_ROTATION_KINDS = new Set(Object.values(RETINA_ROTATION_KINDS));

function normalizeEnum(value, allowed, fallback, label) {
  const normalized = String(value || fallback).trim();

  if (!allowed.has(normalized)) {
    throw new Error(`Invalid Retina ${label}: ${normalized}`);
  }

  return normalized;
}

export function normalizeRetinaConfig(options = {}) {
  const config = {
    ...DEFAULT_RETINA_CONFIG,
    ...(options || {}),
  };

  const bitWidth = Number(config.bitWidth);
  if (!ALLOWED_BIT_WIDTHS.has(bitWidth)) {
    throw new Error(`Invalid Retina bitWidth: ${config.bitWidth}`);
  }

  const targetDimension = Number(config.targetDimension);
  if (!Number.isInteger(targetDimension) || targetDimension < 1 || targetDimension > 4096) {
    throw new Error(`Invalid Retina targetDimension: ${config.targetDimension}`);
  }

  const packetVersion = Number(config.packetVersion);
  if (packetVersion !== 1) {
    throw new Error(`Invalid Retina packetVersion: ${config.packetVersion}`);
  }

  return Object.freeze({
    ...config,
    mode: normalizeEnum(config.mode, ALLOWED_MODES, DEFAULT_RETINA_CONFIG.mode, 'mode'),
    packetVersion,
    bitWidth,
    targetDimension,
    storageKind: 'int8',
    rotationKind: normalizeEnum(
      config.rotationKind,
      ALLOWED_ROTATION_KINDS,
      DEFAULT_RETINA_CONFIG.rotationKind,
      'rotationKind'
    ),
    quantizationKind: normalizeEnum(
      config.quantizationKind,
      ALLOWED_QUANTIZATION_KINDS,
      DEFAULT_RETINA_CONFIG.quantizationKind,
      'quantizationKind'
    ),
    residualKind: 'none',
    targetOperation: 'inner-product',
  });
}

export function validateRetinaInput(input) {
  if (!input || typeof input !== 'object') {
    throw new Error('Photonic Retina input must be an object');
  }

  const sourceKind = String(input.sourceKind || '').trim();

  if (!ALLOWED_SOURCE_KINDS.has(sourceKind)) {
    throw new Error(`Invalid Photonic Retina sourceKind: ${sourceKind}`);
  }

  if (!('payload' in input)) {
    throw new Error('Photonic Retina input missing payload');
  }

  let dimensions;
  if (input.dimensions !== undefined) {
    const width = Number(input.dimensions?.width);
    const height = Number(input.dimensions?.height);

    if (!Number.isFinite(width) || width <= 0) {
      throw new Error('Photonic Retina dimensions.width must be positive');
    }

    if (!Number.isFinite(height) || height <= 0) {
      throw new Error('Photonic Retina dimensions.height must be positive');
    }

    const dimensionFields = { width, height };

    if (input.dimensions?.depth !== undefined) {
      const depth = Number(input.dimensions.depth);
      if (!Number.isFinite(depth) || depth <= 0) {
        throw new Error('Photonic Retina dimensions.depth must be positive');
      }
      dimensionFields.depth = depth;
    }

    dimensions = Object.freeze(dimensionFields);
  }

  return Object.freeze({
    sourceKind,
    payload: input.payload,
    dimensions,
    metadata: input.metadata && typeof input.metadata === 'object'
      ? Object.freeze({ ...input.metadata })
      : Object.freeze({}),
  });
}
