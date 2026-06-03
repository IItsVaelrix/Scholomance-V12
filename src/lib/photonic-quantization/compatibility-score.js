import { PHOTONIC_EXECUTION_CLASSES } from './photonic.config.js';

function roundScore(value) {
  return Number(Math.max(0, Math.min(1, value)).toFixed(4));
}

function gradeFromScore(score) {
  if (score >= 0.86) return 'S';
  if (score >= 0.72) return 'A';
  if (score >= 0.58) return 'B';
  if (score >= 0.42) return 'C';
  return 'D';
}

export function scorePhotonicCompatibility(packet, codecProfile, operationGraph) {
  const totalOps = Math.max(1, operationGraph.operations.length);

  const photonicFriendlyOps = operationGraph.operations
    .filter((operation) => operation.executionClass === PHOTONIC_EXECUTION_CLASSES.PHOTONIC_FRIENDLY)
    .length;

  const hybridOps = operationGraph.operations
    .filter((operation) => operation.executionClass === PHOTONIC_EXECUTION_CLASSES.HYBRID)
    .length;

  const electronicRequiredOps = operationGraph.operations
    .filter((operation) => operation.executionClass === PHOTONIC_EXECUTION_CLASSES.ELECTRONIC_REQUIRED)
    .length;

  const opPurity = roundScore((photonicFriendlyOps + hybridOps * 0.5) / totalOps);
  const boundaryPenalty = roundScore(electronicRequiredOps / totalOps);

  const targetFit = {
    'inner-product': 0.92,
    'matrix-vector': 0.9,
    'matrix-matrix': 0.86,
    'similarity-search': 0.78,
    diagnostic: 0.35,
  }[packet.targetOperation] ?? 0.35;

  const score = roundScore(
    (codecProfile.rotationFit * 0.22)
    + (codecProfile.quantizationFit * 0.16)
    + (codecProfile.residualFit * 0.12)
    + (codecProfile.bitBudgetFit * 0.14)
    + (opPurity * 0.22)
    + (targetFit * 0.14)
    - (boundaryPenalty * 0.08)
  );

  return Object.freeze({
    score,
    grade: gradeFromScore(score),
    factors: Object.freeze({
      rotationFit: codecProfile.rotationFit,
      quantizationFit: codecProfile.quantizationFit,
      residualFit: codecProfile.residualFit,
      bitBudgetFit: codecProfile.bitBudgetFit,
      opPurity,
      targetFit,
      boundaryPenalty,
    }),
  });
}
