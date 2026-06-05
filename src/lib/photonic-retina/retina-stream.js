import { RETINA_SOURCE_KINDS } from './retina.config.js';
import { encodeToPhotonicRetina } from './retina-adapter.js';

const DEFAULT_BATCH_SIZE = 16;

function normalizeBatchSize(value) {
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric > 0 ? numeric : DEFAULT_BATCH_SIZE;
}

function clonePoint(point, pointIndex) {
  return Object.freeze({
    x: point?.x,
    y: point?.y,
    pressure: point?.pressure,
    color: point?.color,
    timeIndex: Number.isFinite(Number(point?.timeIndex)) ? Number(point.timeIndex) : pointIndex,
  });
}

export function createRetinaBrushStrokeBatcher(options = {}) {
  const batchSize = normalizeBatchSize(options.batchSize);
  const dimensions = options.dimensions ? Object.freeze({ ...options.dimensions }) : undefined;
  const metadata = Object.freeze({ ...(options.metadata || {}) });
  const strokeId = String(options.strokeId || 'brush-stroke');
  const retinaOptions = Object.freeze({ ...(options.retinaOptions || {}) });
  let pending = [];
  let pointCursor = 0;
  let batchCursor = 0;

  function encodePending(reason) {
    if (pending.length === 0) return null;

    const payload = pending;
    const packet = encodeToPhotonicRetina(
      {
        sourceKind: RETINA_SOURCE_KINDS.BRUSH_STROKE,
        payload,
        dimensions,
        metadata: {
          ...metadata,
          strokeId,
          batchIndex: batchCursor,
          batchReason: reason,
        },
      },
      retinaOptions
    );

    pending = [];
    batchCursor += 1;
    return packet;
  }

  return Object.freeze({
    get pendingCount() {
      return pending.length;
    },
    addPoint(point) {
      pending = [...pending, clonePoint(point, pointCursor)];
      pointCursor += 1;
      return pending.length >= batchSize ? encodePending('batch-size') : null;
    },
    flush() {
      return encodePending('flush');
    },
    reset() {
      pending = [];
      pointCursor = 0;
      batchCursor = 0;
    },
  });
}
