/**
 * STOICH COMPLEX HEALTH — Deterministic Diagnostic Math
 *
 * Evaluates diagnostic signal ratios using stoichiometric multi-protein
 * complex math as the model. A diagnostic complex assembles only when its
 * subunit signals are present in the correct proportions.
 *
 * No side effects. No logging. No runtime state. Pure functions only.
 *
 * Reference: ByteCode Diagnostic Synthesis PDR
 */

const EPSILON = 1e-9;
const SCORE_PRECISION = 6;

/**
 * Normalize a raw weight vector into proportional ratios that sum to 1.
 *
 * @param {Record<string, number>} vector
 * @returns {Record<string, number>}
 */
export function normalizeStoichVector(vector = {}) {
  const entries = Object.entries(vector).map(([key, value]) => [
    key,
    Math.max(0, Number(value) || 0),
  ]);

  const total = entries.reduce((sum, [, value]) => sum + value, 0);

  if (total <= EPSILON) {
    return Object.fromEntries(entries.map(([key]) => [key, 0]));
  }

  return Object.fromEntries(
    entries.map(([key, value]) => [key, roundScore(value / total)]),
  );
}

/**
 * Evaluate a diagnostic complex against observed signal strengths.
 *
 * @param {object} params
 * @param {string} params.complexId
 * @param {Record<string, number>} params.expected - Raw weight ratios per subunit
 * @param {Record<string, number>} params.observed - Normalized 0..1 signal scores
 * @param {Record<string, number>} [params.weights={}] - Importance weights per subunit
 * @param {object} [params.thresholds={}] - Classification thresholds
 * @returns {object} Complex evaluation result
 */
export function evaluateStoichComplex({
  complexId,
  expected = {},
  observed = {},
  weights = {},
  thresholds = {},
}) {
  const expectedNorm = normalizeStoichVector(expected);
  const observedNorm = normalizeStoichVector(observed);

  const subunitIds = Array.from(
    new Set([...Object.keys(expectedNorm), ...Object.keys(observedNorm)]),
  ).sort();

  const subunits = subunitIds.map((subunitId) => {
    const target = expectedNorm[subunitId] ?? 0;
    const actual = observedNorm[subunitId] ?? 0;
    const weight = Number(weights[subunitId] ?? 1);
    const deviation = Math.abs(actual - target);
    const ratio = target <= EPSILON ? null : actual / target;

    return {
      subunitId,
      target,
      actual,
      ratio: ratio === null ? null : roundScore(ratio),
      weight,
      deviation: roundScore(deviation),
      state: classifySubunit({ target, actual, ratio, deviation, thresholds }),
    };
  });

  const weightedDeviation = subunits.reduce(
    (sum, unit) => sum + unit.deviation * unit.weight,
    0,
  );

  const totalWeight = subunits.reduce((sum, unit) => sum + unit.weight, 0);

  const health =
    totalWeight <= EPSILON
      ? 1
      : Math.max(0, 1 - weightedDeviation / totalWeight);

  const normalizedHealth = roundScore(health);

  const limiting = subunits
    .filter((unit) => unit.state === 'missing' || unit.state === 'limiting')
    .sort(sortBySeverity);

  const excess = subunits
    .filter((unit) => unit.state === 'excess')
    .sort(sortBySeverity);

  return {
    complexId,
    health: normalizedHealth,
    status: classifyComplexStatus(normalizedHealth, limiting, excess),
    limiting,
    excess,
    subunits,
    repairVector: buildRepairVector(subunits),
  };
}

function classifySubunit({ target, actual, ratio, deviation, thresholds }) {
  const limitingRatio = thresholds.limitingRatio ?? 0.65;
  const excessRatio = thresholds.excessRatio ?? 1.45;
  const deviationLimit = thresholds.deviation ?? 0.18;

  if (target > 0 && actual <= EPSILON) return 'missing';
  if (ratio !== null && ratio < limitingRatio) return 'limiting';
  if (ratio !== null && ratio > excessRatio) return 'excess';
  if (deviation > deviationLimit) return 'unstable';
  return 'stable';
}

function classifyComplexStatus(health, limiting, excess) {
  if (limiting.some((unit) => unit.state === 'missing')) return 'critical';
  if (health < 0.55) return 'critical';
  if (health < 0.78) return 'unstable';
  if (excess.length > 0) return 'noisy';
  return 'stable';
}

function buildRepairVector(subunits) {
  return subunits
    .filter((unit) => unit.state !== 'stable')
    .sort(sortBySeverity)
    .map((unit) => ({
      subunitId: unit.subunitId,
      action: actionForState(unit.state),
      delta: roundScore(unit.target - unit.actual),
      reason: unit.state,
    }));
}

function actionForState(state) {
  switch (state) {
    case 'missing':
      return 'restore_signal';
    case 'limiting':
      return 'increase_coverage';
    case 'excess':
      return 'reduce_noise';
    case 'unstable':
      return 'inspect_shape';
    default:
      return 'observe';
  }
}

function sortBySeverity(a, b) {
  if (b.deviation !== a.deviation) return b.deviation - a.deviation;
  return a.subunitId.localeCompare(b.subunitId);
}

function roundScore(value) {
  return Number(Number(value).toFixed(SCORE_PRECISION));
}
