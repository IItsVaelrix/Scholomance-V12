import { analyzePhotonicQuantizationBridge } from '../photonic-quantization/index.js';
import { stableHash } from './retina-hash.js';
import { encodeToPhotonicRetina } from './retina-adapter.js';

const DEFAULT_ROUTE_OPTIONS = Object.freeze({
  previewLength: 32,
});

function freezeArray(values) {
  return Object.freeze([...values]);
}

function isRetinaPacket(value) {
  return Boolean(
    value
    && typeof value === 'object'
    && typeof value.packetId === 'string'
    && Number.isInteger(Number(value.dimension))
    && ArrayBuffer.isView(value.data)
  );
}

function normalizePreviewLength(value) {
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < 1) return DEFAULT_ROUTE_OPTIONS.previewLength;
  return Math.min(numeric, 256);
}

function packetData(packet) {
  return ArrayBuffer.isView(packet?.data) ? Array.from(packet.data) : [];
}

function createLowBitPreview(packet, previewLength) {
  if (!packet) {
    return Object.freeze({
      ok: false,
      packetId: null,
      bitWidth: null,
      values: Object.freeze([]),
      buckets: Object.freeze({ negative: 0, zero: 0, positive: 0 }),
      previewHash: stableHash([]),
    });
  }

  const values = packetData(packet).slice(0, previewLength);
  const buckets = values.reduce((accumulator, value) => {
    if (value < 0) accumulator.negative += 1;
    else if (value > 0) accumulator.positive += 1;
    else accumulator.zero += 1;
    return accumulator;
  }, { negative: 0, zero: 0, positive: 0 });

  return Object.freeze({
    ok: true,
    packetId: packet.packetId,
    bitWidth: packet.bitWidth,
    dimension: packet.dimension,
    values: freezeArray(values),
    buckets: Object.freeze(buckets),
    previewHash: stableHash({
      bitWidth: packet.bitWidth,
      dimension: packet.dimension,
      values,
    }),
  });
}

function compressDeltaRuns(values) {
  const runs = [];
  let activeRun = null;

  values.forEach((value, index) => {
    if (value === 0) {
      if (activeRun) {
        runs.push(activeRun);
        activeRun = null;
      }
      return;
    }

    if (!activeRun) {
      activeRun = { start: index, values: [] };
    }

    activeRun.values.push(value);
  });

  if (activeRun) {
    runs.push(activeRun);
  }

  return runs.map((run) => Object.freeze({
    start: run.start,
    values: freezeArray(run.values),
  }));
}

function createPacketDelta(previousPacket, packet) {
  if (!previousPacket || !packet) {
    return Object.freeze({
      ok: false,
      fromPacketId: previousPacket?.packetId || null,
      toPacketId: packet?.packetId || null,
      changedCount: 0,
      runs: Object.freeze([]),
      deltaHash: stableHash(null),
    });
  }

  const previousValues = packetData(previousPacket);
  const nextValues = packetData(packet);
  const length = Math.max(previousValues.length, nextValues.length);
  const deltas = [];
  let changedCount = 0;

  for (let index = 0; index < length; index += 1) {
    const delta = (nextValues[index] || 0) - (previousValues[index] || 0);
    deltas.push(delta);
    if (delta !== 0) changedCount += 1;
  }

  const runs = compressDeltaRuns(deltas);

  return Object.freeze({
    ok: true,
    fromPacketId: previousPacket.packetId,
    toPacketId: packet.packetId,
    dimension: length,
    changedCount,
    runs: Object.freeze(runs),
    deltaHash: stableHash({
      fromPacketId: previousPacket.packetId,
      toPacketId: packet.packetId,
      runs,
    }),
  });
}

function createOpticalSimulation(packet, bridgeReport) {
  const operationGraph = bridgeReport?.operationGraph;
  const operations = operationGraph?.operations || [];
  const photonicFriendlyCount = operations
    .filter((operation) => operation.executionClass === 'photonic-friendly')
    .length;
  const hybridCount = operations
    .filter((operation) => operation.executionClass === 'hybrid')
    .length;
  const totalOperations = operations.length;
  const opticalFit = totalOperations > 0
    ? Number(((photonicFriendlyCount + hybridCount * 0.5) / totalOperations).toFixed(4))
    : 0;
  const values = packetData(packet);
  const phaseBuckets = values.reduce((accumulator, value) => {
    if (value < 0) accumulator.inverted += 1;
    else if (value > 0) accumulator.forward += 1;
    else accumulator.dark += 1;
    return accumulator;
  }, { forward: 0, inverted: 0, dark: 0 });

  return Object.freeze({
    mode: bridgeReport?.mode || 'off',
    softwareOnly: true,
    hardwareBacked: false,
    opticalFit,
    operationCount: totalOperations,
    linearPath: freezeArray(operationGraph?.linearPath || []),
    electronicBoundaries: freezeArray(operationGraph?.electronicBoundaries || []),
    phaseBuckets: Object.freeze(phaseBuckets),
    simulationHash: stableHash({
      packetId: packet?.packetId || null,
      reportHash: bridgeReport?.reportHash || null,
      opticalFit,
      phaseBuckets,
    }),
  });
}

function resolvePacket(input, retinaOptions) {
  if (isRetinaPacket(input)) {
    return input;
  }

  return encodeToPhotonicRetina(input, retinaOptions);
}

export function routeRetinaPacketToPhotonicBridge(input, options = {}) {
  const packet = resolvePacket(input, options.retina || options.retinaOptions || {});
  const bridgeReport = packet
    ? analyzePhotonicQuantizationBridge(packet, options.bridge || options.bridgeOptions || {})
    : null;
  const previewLength = normalizePreviewLength(options.previewLength);
  const preview = createLowBitPreview(packet, previewLength);
  const delta = createPacketDelta(options.previousPacket, packet);
  const opticalSimulation = createOpticalSimulation(packet, bridgeReport);

  const routeBody = {
    packetId: packet?.packetId || null,
    bridgeReportHash: bridgeReport?.reportHash || null,
    previewHash: preview.previewHash,
    deltaHash: delta.deltaHash,
    simulationHash: opticalSimulation.simulationHash,
  };

  return Object.freeze({
    ok: Boolean(packet && bridgeReport?.ok),
    routeId: `retina_bridge_${stableHash(routeBody)}`,
    packet,
    bridgeReport,
    preview,
    delta,
    opticalSimulation,
    diagnostics: Object.freeze([
      ...(packet?.diagnostics || []),
      ...(bridgeReport?.diagnostics || []),
      `RETINA_BRIDGE_ROUTE ${packet?.packetId || 'null'}`,
    ]),
  });
}

export {
  createLowBitPreview,
  createPacketDelta,
  createOpticalSimulation,
};
