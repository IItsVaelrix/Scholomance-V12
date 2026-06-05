import { hashString } from '../photonic-quantization/photonic-diagnostics.js';

function numberOrZero(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function colorToNumber(color) {
  return Number.parseInt(hashString(String(color || '')), 16) % 256;
}

function scaleAxis(value, extent) {
  const numeric = numberOrZero(value);
  return extent > 0 ? (numeric / extent) * 255 : numeric;
}

function normalizeCoordinates(payload, dimensions) {
  const coords = Array.isArray(payload) ? payload : [];
  const width = dimensions?.width || 0;
  const height = dimensions?.height || 0;
  const values = [];

  coords.forEach((coord) => {
    values.push(scaleAxis(coord?.x, width));
    values.push(scaleAxis(coord?.y, height));
    values.push(numberOrZero(coord?.z));
    values.push(numberOrZero(coord?.emphasis) * 255);
    values.push(colorToNumber(coord?.color));
  });

  return values;
}

function normalizeBrushStroke(payload, dimensions) {
  const points = Array.isArray(payload) ? payload : [];
  const width = dimensions?.width || 0;
  const height = dimensions?.height || 0;
  const values = [];

  points.forEach((point, strokeIndex) => {
    values.push(scaleAxis(point?.x, width));
    values.push(scaleAxis(point?.y, height));
    values.push(numberOrZero(point?.pressure) * 255);
    values.push(Number.isFinite(Number(point?.timeIndex)) ? Number(point.timeIndex) : strokeIndex);
    values.push(colorToNumber(point?.color));
  });

  return values;
}

function normalizePixels(payload, targetDimension) {
  const pixels = ArrayBuffer.isView(payload) ? payload : new Uint8ClampedArray();
  const values = [];
  const stride = Math.max(1, Math.floor(pixels.length / targetDimension));

  for (let index = 0; index < pixels.length && values.length < targetDimension; index += stride) {
    values.push(numberOrZero(pixels[index]));
  }

  return values;
}

function normalizeLattice(payload) {
  const cells = payload?.cells instanceof Map
    ? Array.from(payload.cells.values())
    : Array.isArray(payload?.cells)
      ? payload.cells
      : [];

  const values = [];

  cells.forEach((cell) => {
    values.push(numberOrZero(cell?.col));
    values.push(numberOrZero(cell?.row));
    values.push(numberOrZero(cell?.emphasis) * 255);
    values.push(colorToNumber(cell?.color));
    values.push(cell?.occupied === false ? 0 : 1);
  });

  return values;
}

function normalizeFormula(payload) {
  const values = [];
  const formulaType = payload?.type || payload?.formulaType || 'unknown';
  values.push(colorToNumber(formulaType));

  const params = payload?.parameters && typeof payload.parameters === 'object'
    ? payload.parameters
    : {};

  Object.keys(params).sort().forEach((key) => {
    values.push(colorToNumber(key));
    values.push(numberOrZero(params[key]));
  });

  return values;
}

function normalizeColors(payload) {
  const colors = Array.isArray(payload) ? payload : [];
  return colors.map(colorToNumber);
}

export function normalizeRetinaPayload(input, config) {
  let values;

  switch (input.sourceKind) {
    case 'coordinates':
      values = normalizeCoordinates(input.payload, input.dimensions);
      break;
    case 'brush-stroke':
      values = normalizeBrushStroke(input.payload, input.dimensions);
      break;
    case 'pixels':
      values = normalizePixels(input.payload, config.targetDimension);
      break;
    case 'lattice':
      values = normalizeLattice(input.payload);
      break;
    case 'formula':
      values = normalizeFormula(input.payload);
      break;
    case 'colors':
      values = normalizeColors(input.payload);
      break;
    default:
      values = [];
  }

  const target = new Float32Array(config.targetDimension);

  for (let index = 0; index < target.length; index += 1) {
    target[index] = values.length > 0 ? numberOrZero(values[index % values.length]) : 0;
  }

  return target;
}
