import {
  DEFAULT_PHOTONIC_BRIDGE_CONFIG,
  PHOTONIC_BRIDGE_MODES,
} from './photonic.config.js';
import { validatePhotonicVectorPacket } from './vector-packet.schema.js';
import { classifyVectorCodec } from './vector-codec.js';
import { buildPhotonicOperationGraph } from './operation-graph.js';
import { scorePhotonicCompatibility } from './compatibility-score.js';
import { runPhotonicShadowSimulator } from './simulator.js';
import {
  createDiagnostic,
  hashObject,
  sortDiagnostics,
} from './photonic-diagnostics.js';

function mergeConfig(options = {}) {
  return Object.freeze({
    ...DEFAULT_PHOTONIC_BRIDGE_CONFIG,
    ...(options.config || {}),
    mode: options.mode || options.config?.mode || DEFAULT_PHOTONIC_BRIDGE_CONFIG.mode,
  });
}

export function analyzePhotonicQuantizationBridge(input, options = {}) {
  const config = mergeConfig(options);

  if (config.mode === PHOTONIC_BRIDGE_MODES.OFF) {
    const report = {
      schemaVersion: config.schemaVersion,
      packetId: String(input?.packetId || 'disabled'),
      ok: true,
      mode: config.mode,
      compatibilityScore: 0,
      compatibilityGrade: 'OFF',
      operationGraph: null,
      diagnostics: [
        createDiagnostic('PHOTONIC_BRIDGE_DISABLED', 'info', 'Photonic bridge is disabled.'),
      ],
      assumptions: [],
      blockedReasons: [],
    };

    return Object.freeze({
      ...report,
      reportHash: hashObject(report),
    });
  }

  const validation = validatePhotonicVectorPacket(input, config);

  if (!validation.ok || !validation.packet) {
    const report = {
      schemaVersion: config.schemaVersion,
      packetId: String(input?.packetId || 'invalid'),
      ok: false,
      mode: config.mode,
      compatibilityScore: 0,
      compatibilityGrade: 'D',
      operationGraph: null,
      diagnostics: sortDiagnostics(validation.diagnostics),
      assumptions: [],
      blockedReasons: ['invalid packet schema'],
    };

    return Object.freeze({
      ...report,
      reportHash: hashObject(report),
    });
  }

  const packet = validation.packet;
  const codecProfile = classifyVectorCodec(packet);
  const operationGraph = buildPhotonicOperationGraph(packet);
  const compatibility = scorePhotonicCompatibility(packet, codecProfile, operationGraph);

  const simulation = runPhotonicShadowSimulator({
    packet,
    operationGraph,
    compatibility,
    config,
  });

  const allDiagnostics = sortDiagnostics([
    ...validation.diagnostics,
    ...simulation.diagnostics,
  ]);

  const ok = config.mode === PHOTONIC_BRIDGE_MODES.GATE
    ? simulation.blockedReasons.length === 0
    : true;

  const report = {
    schemaVersion: config.schemaVersion,
    packetId: packet.packetId,
    ok,
    mode: config.mode,
    compatibilityScore: compatibility.score,
    compatibilityGrade: compatibility.grade,
    operationGraph,
    diagnostics: allDiagnostics,
    assumptions: simulation.assumptions,
    blockedReasons: simulation.blockedReasons,
    scoringFactors: compatibility.factors,
  };

  return Object.freeze({
    ...report,
    reportHash: hashObject(report),
  });
}

export {
  DEFAULT_PHOTONIC_BRIDGE_CONFIG,
  PHOTONIC_BRIDGE_MODES,
};
