/**
 * F21 — utterance provenance.
 *
 * The partitions guarded `context` while the utterance — the input that selects
 * the formula, resolves the slots, and produces the payload capabilityScope
 * walks to mint a capability — arrived as a bare unpartitioned string.
 *
 * The threat these tests describe: the speaker is a model. It reads a hostile
 * page, the page steers what it says, and the resulting sentence used to arrive
 * with no trust class in the position of maximum authority.
 */
import { describe, it, expect } from 'vitest';
import {
  compileSemanticIntent,
  compileProbePlan,
  assertExecutable,
} from '../../codex/core/semantic-calculus/compiler.ts';
import { adjudicateLaw } from '../../codex/core/semantic-calculus/kind.ts';
import { assertSealedIntact } from '../../codex/core/semantic-calculus/seal.ts';
import { emptyContext } from '../../codex/core/semantic-calculus/trustPartition.ts';
import {
  toUtterance,
  userUtterance,
  derivedUtterance,
  requiredConfirmation,
  isTainted,
  UNATTRIBUTED_TAINT,
} from '../../codex/core/semantic-calculus/utterance.ts';
import { SEMANTIC_CALCULUS_ERRORS } from '../../codex/core/semantic-calculus/types.ts';

const ctx = (over = {}) => ({ ...emptyContext(), ...over });

describe('F21 — there is no default-trusted utterance', () => {
  it('a bare string is untrusted and carries the unattributed taint', () => {
    const u = toUtterance('go to albums');
    expect(u.trust).toBe('untrusted');
    expect(u.taint).toContain(UNATTRIBUTED_TAINT);
  });

  it('an undeclared utterance escalates instead of executing', () => {
    // Compile stays TOTAL: it seals an honest act that refuses, rather than
    // throwing. The missing declaration is visible IN the act.
    const { act } = compileSemanticIntent({ utterance: 'go to albums', context: ctx() });
    expect(act.kind).toBe('Do'); // what was said is unchanged...
    expect(act.law.decision).toBe('escalate'); // ...only permission moved
    expect(act.law.ruleIds).toContain('law.utterance.untrusted-never-authorizes.v1');
    expect(act.capability).toBeUndefined();
    expect(() => assertExecutable(act)).toThrow(SEMANTIC_CALCULUS_ERRORS.NOT_PERMITTED);
  });

  it('a human-authored utterance still reaches execution', () => {
    const { act } = compileSemanticIntent({
      utterance: userUtterance('go to albums'),
      context: ctx(),
    });
    expect(act.law.decision).toBe('allow');
    expect(act.capability.confirmation).toBe('none');
    expect(() => assertExecutable(act)).not.toThrow();
  });
});

describe('F21 — provenance decides permission, never meaning', () => {
  it('the same text binds the same formula regardless of who said it', () => {
    const human = compileSemanticIntent({ utterance: userUtterance('go to albums'), context: ctx() });
    const model = compileSemanticIntent({
      utterance: derivedUtterance('go to albums', ['https://evil.example/page']),
      context: ctx(),
    });
    // Kind is what was said. It must not move.
    expect(human.act.kind).toBe('Do');
    expect(model.act.kind).toBe('Do');
    expect(model.act.payload).toEqual(human.act.payload);
    // Only law moved. This is the rev-6 separation holding under a new axis.
    expect(human.act.law.decision).toBe('allow');
    expect(model.act.law.decision).toBe('escalate');
  });

  it('a tainted model utterance cannot mint a capability', () => {
    const { act } = compileSemanticIntent({
      utterance: derivedUtterance('go to albums', ['tool:web_fetch']),
      context: ctx(),
    });
    expect(act.law.ruleIds).toContain('law.utterance.tainted-derived.v1');
    expect(act.capability).toBeUndefined();
    expect(() => assertExecutable(act)).toThrow();
  });

  it('an untainted model utterance is allowed but must be confirmed', () => {
    // The model is not the user even when it read nothing. It proposes; a human
    // ratifies. That is `single`, not `none`.
    const { act } = compileSemanticIntent({
      utterance: derivedUtterance('go to albums'),
      context: ctx(),
    });
    expect(act.law.decision).toBe('allow');
    expect(act.capability.confirmation).toBe('single');
    expect(() => assertExecutable(act)).toThrow(SEMANTIC_CALCULUS_ERRORS.UNCONFIRMED_DO);
    expect(() => assertExecutable(act, { confirmations: ['damien'] })).not.toThrow();
  });

  it('confirmation is counted, not asserted — two_phase needs two principals', () => {
    const act = { kind: 'Do', law: { decision: 'allow' }, capability: { confirmation: 'two_phase' } };
    expect(() => assertExecutable(act, { confirmations: ['a'] })).toThrow(
      SEMANTIC_CALCULUS_ERRORS.UNCONFIRMED_DO,
    );
    // The same principal twice is one confirmation, not two.
    expect(() => assertExecutable(act, { confirmations: ['a', 'a'] })).toThrow(
      SEMANTIC_CALCULUS_ERRORS.UNCONFIRMED_DO,
    );
    expect(() => assertExecutable(act, { confirmations: ['a', 'b'] })).not.toThrow();
  });
});

describe('F21 — provenance may only raise confirmation', () => {
  it('never lowers an already-strict policy', () => {
    expect(requiredConfirmation('two_phase', userUtterance('x'))).toBe('two_phase');
    expect(requiredConfirmation('single', userUtterance('x'))).toBe('single');
  });

  it('raises none -> single for a clean model utterance', () => {
    expect(requiredConfirmation('none', derivedUtterance('x'))).toBe('single');
  });

  it('raises none -> two_phase for a tainted one', () => {
    expect(requiredConfirmation('none', derivedUtterance('x', ['page']))).toBe('two_phase');
    expect(requiredConfirmation('single', derivedUtterance('x', ['page']))).toBe('two_phase');
  });

  it('isTainted covers untrusted as well as declared sources', () => {
    expect(isTainted(userUtterance('x'))).toBe(false);
    expect(isTainted(derivedUtterance('x'))).toBe(false);
    expect(isTainted(derivedUtterance('x', ['p']))).toBe(true);
    expect(isTainted(toUtterance('x'))).toBe(true);
  });
});

describe('F21 — the gate applies to Do alone', () => {
  it('a Probe from an undeclared utterance still plans', () => {
    // "Untrusted may inform, never authorize" — a Probe authorizes nothing. It is
    // read-only, commits nothing, and its plan runs no observations. Gating it
    // would make the safe path the expensive one.
    const { act } = compileSemanticIntent({ utterance: 'why does Listen stutter?', context: ctx() });
    expect(act.kind).toBe('Probe');
    expect(act.phase).toBe('plan');
    expect(act.law.decision).toBe('allow');
  });

  it('Theory from an undeclared utterance is unchanged', () => {
    const { act } = compileSemanticIntent({ utterance: 'infernal plumed helm', context: ctx() });
    expect(act.kind).toBe('Theory');
    expect(act.law.decision).toBe('clarify');
    expect(act.law.ruleIds).toContain('law.unbound.v1');
  });

  it('LAW reads provenance only for Do', () => {
    const risk = { consequence: 'reversible_ui', minMargin: 0.1, requiredCites: [], allowedFallback: 'Clarify', confirmationPolicy: 'none' };
    const dirty = derivedUtterance('x', ['page']);
    expect(adjudicateLaw({ kind: 'Probe', riskProfile: risk, utterance: dirty }).decision).toBe('allow');
    expect(adjudicateLaw({ kind: 'Do', riskProfile: risk, utterance: dirty }).decision).toBe('escalate');
  });
});

describe('F21 — provenance is sealed', () => {
  it('the act carries who said it', () => {
    const { act } = compileSemanticIntent({
      utterance: derivedUtterance('go to albums', ['https://evil.example/page']),
      context: ctx(),
    });
    expect(act.utteranceProvenance.trust).toBe('derived');
    expect(act.utteranceProvenance.taint).toEqual(['https://evil.example/page']);
  });

  it('forging the provenance to user breaks the seal', () => {
    // Otherwise an executor could relabel a model utterance as human and walk
    // straight past LAW.
    const { act } = compileSemanticIntent({
      utterance: derivedUtterance('go to albums', ['page']),
      context: ctx(),
    });
    const tampered = structuredClone(act);
    tampered.utteranceProvenance.trust = 'user';
    tampered.utteranceProvenance.taint = [];
    expect(() => assertSealedIntact(tampered)).toThrow(SEMANTIC_CALCULUS_ERRORS.SEAL_MUTATION);
  });

  it('provenance changes the digest — a human act and a model act are not the same act', () => {
    const human = compileSemanticIntent({ utterance: userUtterance('go to albums'), context: ctx() });
    const model = compileSemanticIntent({ utterance: derivedUtterance('go to albums'), context: ctx() });
    expect(model.act.seal.digest).not.toBe(human.act.seal.digest);
  });

  it('replay is deterministic under identical provenance', () => {
    const once = compileSemanticIntent({ utterance: derivedUtterance('go to albums', ['b', 'a']), context: ctx() });
    // taint order must not matter — it is a set, and it is sorted on construction.
    const twice = compileSemanticIntent({ utterance: derivedUtterance('go to albums', ['a', 'b']), context: ctx() });
    expect(twice.act.seal.digest).toBe(once.act.seal.digest);
  });
});

describe('F21 — the machine seam invents no text', () => {
  it('compileProbePlan binds by probeId with no utterance at all', () => {
    // It used to fabricate English from probe.patterns[0] and push it through the
    // human matcher to rediscover the probe it was already handed.
    const { act } = compileProbePlan({ probeId: 'render.stack.listen', context: ctx() });
    expect(act.kind).toBe('Probe');
    expect(act.phase).toBe('plan');
    expect(act.payload.probeId).toBe('render.stack.listen');
    expect(act.utteranceProvenance.trust).toBe('untrusted');
  });

  it('a probe plan compiled by id equals one compiled with the same declared text', () => {
    const byId = compileProbePlan({ probeId: 'render.stack.listen', context: ctx() });
    const withText = compileProbePlan({
      probeId: 'render.stack.listen',
      utterance: toUtterance(''),
      context: ctx(),
    });
    expect(withText.act.seal.digest).toBe(byId.act.seal.digest);
  });
});
