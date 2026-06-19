import { describe, it, expect } from 'vitest';
import { POLICY_OFF } from '../../../codex/core/phonology/g2p/schemas.js';
import { JudiciaryEngine } from '../../../codex/core/judiciary.js';

describe('G2P Jury Layer helpers', () => {
  it('checkPolicyRouting passes for policy off', () => {
    const result = checkPolicyRouting(POLICY_OFF, { policy: POLICY_OFF });
    expect(result.passed).toBe(true);
  });

  it('checkJudgeLayerMeta returns false for unknown layer', () => {
    const result = checkJudgeLayerMeta('__nonexistent__', 0);
    expect(result.passed).toBe(false);
  });
});

export function checkPolicyRouting(policy, verdict) {
  const expectedPolicy = policy === POLICY_OFF ? POLICY_OFF : verdict?.policy;

  if (expectedPolicy === POLICY_OFF && verdict?.policy !== POLICY_OFF) {
    return {
      passed: false,
      message: `Expected policy 'off' but got '${verdict?.policy}'`,
    };
  }

  if (expectedPolicy !== POLICY_OFF && !verdict) {
    return {
      passed: false,
      message: 'Expected non-off verdict when policy is enabled',
    };
  }

  return { passed: true };
}

export function checkFidelitySilencing(semanticJuror, candidate) {
  const vote = semanticJuror.vote(candidate);
  if (!vote) {
    return { silenced: true, reason: 'vote returned null' };
  }

  return {
    silenced: false,
    fidelityGrade: vote.fidelityGrade,
  };
}

export function checkJudgeLayerMeta(layerName, expectedWeight) {
  const engine = new JudiciaryEngine();
  const layerMeta = engine.layers[layerName];
  if (!layerMeta) {
    return { passed: false, reason: `Layer '${layerName}' not registered` };
  }

  return {
    passed: layerMeta.weight === expectedWeight,
    actualWeight: layerMeta.weight,
  };
}
