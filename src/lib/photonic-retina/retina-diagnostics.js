import { stableHash } from './retina-hash.js';

function summarizeData(data) {
  const values = ArrayBuffer.isView(data) ? Array.from(data) : [];
  const nonZeroCount = values.reduce((count, value) => count + (value === 0 ? 0 : 1), 0);
  const minimum = values.length > 0 ? Math.min(...values) : 0;
  const maximum = values.length > 0 ? Math.max(...values) : 0;

  return Object.freeze({
    length: values.length,
    nonZeroCount,
    zeroCount: values.length - nonZeroCount,
    minimum,
    maximum,
    checksum: stableHash(values),
  });
}

export function createRetinaDiagnosticsSnapshot(packet) {
  if (!packet) {
    return Object.freeze({
      ok: false,
      packetId: null,
      diagnostics: Object.freeze(['RETINA_PACKET_MISSING']),
    });
  }

  return Object.freeze({
    ok: true,
    packetId: packet.packetId,
    sourceKind: packet.sourceKind,
    dimension: packet.dimension,
    bitWidth: packet.bitWidth,
    storageKind: packet.storageKind,
    rotationKind: packet.rotationKind,
    quantizationKind: packet.quantizationKind,
    targetOperation: packet.targetOperation,
    dataSummary: summarizeData(packet.data),
    metadata: Object.freeze({ ...(packet.metadata || {}) }),
    diagnostics: Object.freeze([...(packet.diagnostics || [])]),
  });
}
