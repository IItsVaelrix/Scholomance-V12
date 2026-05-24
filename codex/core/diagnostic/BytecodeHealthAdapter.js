/**
 * BYTECODE HEALTH ADAPTER — Signal Shape Normalizer
 *
 * Converts existing BytecodeHealth outputs (and any other diagnostic signal
 * shapes) into normalized 0..1 scores for StoichComplexHealth consumption.
 *
 * This is a passport checkpoint, not a judge. It translates shapes.
 * It does not decide system meaning, assign blame, or invent health semantics.
 *
 * Reference: ByteCode Diagnostic Synthesis PDR
 */

/**
 * Normalize a full BytecodeHealth snapshot into a canonical signal map.
 * Keys are sorted for deterministic output.
 *
 * @param {Record<string, unknown>} snapshot
 * @returns {Record<string, number>}
 */
export function normalizeBytecodeHealthSnapshot(snapshot = {}) {
  if (!snapshot || typeof snapshot !== 'object') {
    return {};
  }

  return Object.fromEntries(
    Object.entries(snapshot)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([signalKey, rawSignal]) => [signalKey, normalizeSignal(rawSignal)]),
  );
}

/**
 * Normalize a single raw signal value into a 0..1 score.
 *
 * Accepted shapes (in order of precedence):
 *   number       → clamped 0..1
 *   boolean      → 1 or 0
 *   { score }    → clamped 0..1
 *   { health }   → clamped 0..1
 *   { ok }       → 1 or 0
 *   { status }   → mapped via statusToScore
 *   anything else → 0
 *
 * @param {unknown} rawSignal
 * @returns {number}
 */
export function normalizeSignal(rawSignal) {
  if (typeof rawSignal === 'number') {
    return clamp01(rawSignal);
  }

  if (typeof rawSignal === 'boolean') {
    return rawSignal ? 1 : 0;
  }

  if (!rawSignal || typeof rawSignal !== 'object') {
    return 0;
  }

  if (typeof rawSignal.score === 'number') {
    return clamp01(rawSignal.score);
  }

  if (typeof rawSignal.health === 'number') {
    return clamp01(rawSignal.health);
  }

  if (typeof rawSignal.ok === 'boolean') {
    return rawSignal.ok ? 1 : 0;
  }

  if (typeof rawSignal.status === 'string') {
    return statusToScore(rawSignal.status);
  }

  return 0;
}

function statusToScore(status) {
  switch (status) {
    case 'ok':
    case 'pass':
    case 'stable':
    case 'healthy':
      return 1;
    case 'warn':
    case 'warning':
    case 'unstable':
      return 0.65;
    case 'critical':
    case 'error':
    case 'fail':
      return 0.15;
    case 'missing':
      return 0;
    default:
      return 0.5;
  }
}

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}
