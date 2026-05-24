/**
 * CLERI RAID MIND — Raid-Level Diagnostic Intelligence
 *
 * Converts normalized BytecodeHealth signals into a raid-level mind state
 * by evaluating diagnostic complexes through stoichiometric math.
 *
 * Pipeline:
 *   BytecodeHealth snapshot
 *     → BytecodeHealthAdapter (normalize)
 *     → StoichComplexHealth (evaluate each complex)
 *     → CleriRaidMind (aggregate → mind state + repair vectors)
 *     → QBIT payload / QA / proof artifacts
 *
 * No side effects. No mutations. No runtime state.
 *
 * Reference: ByteCode Diagnostic Synthesis PDR
 */

import { normalizeBytecodeHealthSnapshot } from './BytecodeHealthAdapter.js';
import { evaluateStoichComplex } from './StoichComplexHealth.js';
import { CLERI_RAID_COMPLEXES } from './CleriRaidComplexRegistry.js';

/**
 * Evaluate the Cleri-Raid mind state from a BytecodeHealth snapshot.
 *
 * @param {object} [params={}]
 * @param {string} [params.raidId='CLERI_RAID_MAIN']
 * @param {Record<string, unknown>} [params.bytecodeHealthSnapshot={}]
 * @param {Array} [params.complexes] - Override the registry for testing
 * @returns {object} Raid mind result
 */
export function evaluateCleriRaidMind({
  raidId = 'CLERI_RAID_MAIN',
  bytecodeHealthSnapshot = {},
  complexes = CLERI_RAID_COMPLEXES,
} = {}) {
  const normalizedSnapshot = normalizeBytecodeHealthSnapshot(bytecodeHealthSnapshot);

  const evaluatedComplexes = complexes.map((complex) => {
    const observed = collectObservedSubunits({
      subunits: complex.subunits,
      normalizedSnapshot,
    });

    return evaluateStoichComplex({
      complexId: complex.id,
      expected: complex.expected,
      observed,
      weights: complex.weights,
      thresholds: complex.thresholds,
    });
  });

  const globalHealth = roundScore(averageHealth(evaluatedComplexes));

  return {
    raidId,
    mindState: classifyMindState(globalHealth, evaluatedComplexes),
    globalHealth,
    complexes: evaluatedComplexes,
    primaryFaults: extractPrimaryFaults(evaluatedComplexes),
    nextDebugActions: extractNextDebugActions(evaluatedComplexes),
    qbitPayload: buildQbitPayload({ raidId, globalHealth, evaluatedComplexes }),
  };
}

/**
 * Shadow-mode runner — observes and reports without blocking anything.
 *
 * Controlled by CLERI_RAID_SYNTHESIS_MODE env var or the mode param.
 * Allowed values: off | shadow | warn | gate
 *
 * @param {object} params
 * @param {boolean} [params.enabled=false]
 * @param {'off'|'shadow'|'warn'|'gate'} [params.mode='shadow']
 * @param {Record<string, unknown>} [params.snapshot={}]
 * @param {string} [params.raidId='CLERI_RAID_MAIN']
 * @returns {object|null}
 */
export function maybeRunDiagnosticSynthesis({
  enabled = false,
  mode = 'shadow',
  snapshot = {},
  raidId = 'CLERI_RAID_MAIN',
} = {}) {
  if (!enabled) return null;

  const mind = evaluateCleriRaidMind({
    raidId,
    bytecodeHealthSnapshot: snapshot,
  });

  if (mode === 'shadow') {
    return { enforced: false, mind };
  }

  if (mode === 'warn') {
    return {
      enforced: false,
      warning:
        mind.mindState === 'coherent' ? null : 'CLERI_RAID_MIND_NOT_COHERENT',
      mind,
    };
  }

  if (mode === 'gate') {
    return {
      enforced: true,
      pass: mind.mindState === 'coherent',
      mind,
    };
  }

  return { enforced: false, mind };
}

function collectObservedSubunits({ subunits = [], normalizedSnapshot = {} }) {
  const observed = {};
  for (const subunit of subunits) {
    observed[subunit.id] = normalizedSnapshot[subunit.signalKey] ?? 0;
  }
  return observed;
}

function averageHealth(complexes) {
  if (!complexes.length) return 1;
  return (
    complexes.reduce((sum, complex) => sum + complex.health, 0) / complexes.length
  );
}

function classifyMindState(globalHealth, complexes) {
  const hasCritical = complexes.some((complex) => complex.status === 'critical');
  if (hasCritical) return 'fractured';
  if (globalHealth < 0.78) return 'agitated';

  const hasNoise = complexes.some((complex) => complex.status === 'noisy');
  if (hasNoise) return 'overstimulated';

  return 'coherent';
}

function extractPrimaryFaults(complexes) {
  return complexes
    .flatMap((complex) =>
      complex.limiting.slice(0, 2).map((unit) => ({
        complexId: complex.complexId,
        subunitId: unit.subunitId,
        state: unit.state,
        severity: unit.deviation,
      })),
    )
    .sort((a, b) => {
      if (b.severity !== a.severity) return b.severity - a.severity;
      return `${a.complexId}:${a.subunitId}`.localeCompare(
        `${b.complexId}:${b.subunitId}`,
      );
    });
}

function extractNextDebugActions(complexes) {
  return complexes
    .flatMap((complex) =>
      complex.repairVector.slice(0, 3).map((repair) => ({
        complexId: complex.complexId,
        ...repair,
      })),
    )
    .sort((a, b) => {
      if (Math.abs(b.delta) !== Math.abs(a.delta)) {
        return Math.abs(b.delta) - Math.abs(a.delta);
      }
      return `${a.complexId}:${a.subunitId}`.localeCompare(
        `${b.complexId}:${b.subunitId}`,
      );
    });
}

function buildQbitPayload({ raidId, globalHealth, evaluatedComplexes }) {
  return {
    qbitType: 'BYTECODE_DIAGNOSTIC_SYNTHESIS',
    raidId,
    collapseConfidence: globalHealth,
    complexCount: evaluatedComplexes.length,
    unstableComplexes: evaluatedComplexes
      .filter((complex) => complex.status !== 'stable')
      .map((complex) => complex.complexId)
      .sort(),
  };
}

/**
 * Gate mode policy — fails only on fractured mind state.
 * Agitated and overstimulated states do not block; use warn mode for those.
 *
 * @param {object} mind - Result of evaluateCleriRaidMind
 * @returns {boolean}
 */
export function shouldFailDiagnosticGate(mind) {
  return mind.mindState === 'fractured';
}

function roundScore(value) {
  return Number(Number(value).toFixed(6));
}
