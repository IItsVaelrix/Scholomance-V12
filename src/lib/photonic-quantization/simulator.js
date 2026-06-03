import { PHOTONIC_BRIDGE_MODES } from './photonic.config.js';
import { createDiagnostic } from './photonic-diagnostics.js';

export function runPhotonicShadowSimulator({
  packet,
  operationGraph,
  compatibility,
  config,
}) {
  const diagnostics = [];
  const blockedReasons = [];
  const assumptions = [
    'Phase 1 is software-only and does not execute real photonic hardware.',
    'Photonic-friendly means linear-algebra-compatible, not hardware-proven.',
    'Electronic boundaries include memory movement, quantization control, nonlinear operations, and residual handling.',
  ];

  if (operationGraph.electronicBoundaries.length > 0) {
    diagnostics.push(createDiagnostic(
      'PHOTONIC_ELECTRONIC_BOUNDARIES_PRESENT',
      'info',
      'Operation graph includes electronic-required boundaries.',
      { boundaries: operationGraph.electronicBoundaries }
    ));
  }

  if (packet.targetOperation === 'diagnostic') {
    diagnostics.push(createDiagnostic(
      'PHOTONIC_DIAGNOSTIC_ONLY',
      'warn',
      'Packet targetOperation is diagnostic, so compute compatibility is limited.',
      { targetOperation: packet.targetOperation }
    ));
  }

  if (compatibility.score < config.minWarnScore) {
    diagnostics.push(createDiagnostic(
      'PHOTONIC_LOW_COMPATIBILITY',
      config.mode === PHOTONIC_BRIDGE_MODES.GATE ? 'error' : 'warn',
      'Compatibility score is below the configured warning threshold.',
      { score: compatibility.score, minWarnScore: config.minWarnScore }
    ));
  }

  if (config.mode === PHOTONIC_BRIDGE_MODES.GATE && compatibility.score < config.minGateScore) {
    blockedReasons.push(`compatibilityScore ${compatibility.score} < minGateScore ${config.minGateScore}`);
  }

  return Object.freeze({
    diagnostics,
    assumptions,
    blockedReasons: Object.freeze(blockedReasons),
  });
}
