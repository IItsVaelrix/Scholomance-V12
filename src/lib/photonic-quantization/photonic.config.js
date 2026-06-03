export const PHOTONIC_BRIDGE_MODES = Object.freeze({
  OFF: 'off',
  SHADOW: 'shadow',
  WARN: 'warn',
  GATE: 'gate',
});

export const PHOTONIC_EXECUTION_CLASSES = Object.freeze({
  PHOTONIC_FRIENDLY: 'photonic-friendly',
  ELECTRONIC_REQUIRED: 'electronic-required',
  HYBRID: 'hybrid',
  UNSUPPORTED: 'unsupported',
});

export const DEFAULT_PHOTONIC_BRIDGE_CONFIG = Object.freeze({
  schemaVersion: 'PBQ-v1',
  mode: PHOTONIC_BRIDGE_MODES.SHADOW,
  minWarnScore: 0.58,
  minGateScore: 0.72,
  maxDimension: 131072,
  allowedBitWidths: Object.freeze([1, 2, 3, 4, 8, 16, 32]),
  allowedStorageKinds: Object.freeze([
    'float32',
    'int8',
    'int4',
    'int2',
    'binary',
    'packed',
  ]),
});
