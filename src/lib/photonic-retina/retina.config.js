export const RETINA_MODES = Object.freeze({
  OFF: 'off',
  SHADOW: 'shadow',
  WARN: 'warn',
  GATE: 'gate',
});

export const RETINA_SOURCE_KINDS = Object.freeze({
  COORDINATES: 'coordinates',
  PIXELS: 'pixels',
  LATTICE: 'lattice',
  FORMULA: 'formula',
  COLORS: 'colors',
  BRUSH_STROKE: 'brush-stroke',
  QBIT_FIELD: 'qbit-field',
});

export const RETINA_QUANTIZATION_KINDS = Object.freeze({
  SCALAR: 'scalar',
  BINARY_SIGN: 'binary-sign',
});

export const RETINA_ROTATION_KINDS = Object.freeze({
  NONE: 'none',
  SIGNED_HASH_ROTATION: 'signed-hash-rotation',
});

export const DEFAULT_RETINA_CONFIG = Object.freeze({
  mode: RETINA_MODES.SHADOW,
  packetVersion: 1,
  bitWidth: 4,
  targetDimension: 256,
  storageKind: 'int8',
  rotationKind: RETINA_ROTATION_KINDS.SIGNED_HASH_ROTATION,
  quantizationKind: RETINA_QUANTIZATION_KINDS.SCALAR,
  residualKind: 'none',
  targetOperation: 'inner-product',
});
