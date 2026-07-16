/**
 * P4 — lexicons split by epistemic role.
 *
 * The phase exists to stop "why does Listen stutter?" competing against npm
 * scripts as though a diagnosis were an action target.
 */
import { describe, it, expect } from 'vitest';
import {
  LEXICONS,
  routeUtterance,
  assertLexiconInvariants,
  lexiconsVersion,
  LEXICON_ROLE_ERRORS,
} from '../../codex/core/semantic-calculus/lexicons.ts';
import { compileSemanticIntent, assertExecutable } from '../../codex/core/semantic-calculus/compiler.ts';
import { FORMATION_FORMULAS } from '../../codex/core/semantic-calculus/formulaRegistry.ts';
import { PROBE_FORMULAS } from '../../codex/core/semantic-calculus/probeRegistry.ts';

const ctx = (over = {}) => ({
  policy: {},
  user: {},
  untrusted: {},
  derived: {},
  ...over,
});

describe('P4 — three lexicons, three roles', () => {
  it('exposes action, surface and inquiry with declared roles', () => {
    expect(LEXICONS.action.role).toBe('action');
    expect(LEXICONS.surface.role).toBe('surface');
    expect(LEXICONS.inquiry.role).toBe('inquiry');
    expect(LEXICONS.action.size()).toBeGreaterThan(0);
    expect(LEXICONS.surface.known()).toContain('albums');
    expect(LEXICONS.inquiry.ids()).toContain('render.stack.listen');
  });

  it('lexiconsVersion names all three roles (replay identity)', () => {
    const v = lexiconsVersion();
    expect(v).toContain('action@');
    expect(v).toContain('surface@');
    expect(v).toContain('inquiry@');
  });
});

describe('P4 — inquiry entries cannot become execution capabilities', () => {
  it('invariants hold for the shipped registries', () => {
    expect(() => assertLexiconInvariants()).not.toThrow();
  });

  it('no probe id collides with a formation formula', () => {
    for (const probe of PROBE_FORMULAS) {
      expect(Object.keys(FORMATION_FORMULAS)).not.toContain(probe.id);
    }
  });

  it('every probe is read_only', () => {
    for (const probe of PROBE_FORMULAS) {
      expect(probe.maxRisk).toBe('read_only');
    }
  });

  it('an inquiry-bound act is a Probe plan and never executable', () => {
    const { act } = compileSemanticIntent({
      utterance: 'why does Listen stutter?',
      context: ctx(),
    });
    expect(act.kind).toBe('Probe');
    expect(act.phase).toBe('plan');
    expect(act.capability).toBeUndefined();
    expect(() => assertExecutable(act)).toThrow();
  });

  it('the error names exist for the invariant', () => {
    expect(LEXICON_ROLE_ERRORS.INQUIRY_IS_EXECUTABLE).toBeTruthy();
    expect(LEXICON_ROLE_ERRORS.ROLE_COLLISION).toBeTruthy();
  });
});

describe('P4 — routing: evidence beats shape, a guess never does', () => {
  it('an exact action bind wins over an inquiry claim', () => {
    // Shape alone would claim this ('not showing'), but an exact bind is evidence.
    expect(routeUtterance({ utterance: 'why is it not showing', exactActionBind: true })).toBe('action');
  });

  it('a diagnosis with no exact bind goes to inquiry', () => {
    expect(routeUtterance({ utterance: 'why does Listen stutter?', exactActionBind: false })).toBe('inquiry');
    expect(routeUtterance({ utterance: 'why is the build broken', exactActionBind: false })).toBe('inquiry');
  });

  it('a bare imperative is command-shaped and NOT claimed by inquiry', () => {
    // 'debug'/'diagnose' name a procedure to run. Claiming them would take a
    // legitimate script away from the action lexicon.
    expect(LEXICONS.inquiry.claims('debug the tests')).toBe(false);
    expect(LEXICONS.inquiry.claims('run the build')).toBe(false);
    expect(LEXICONS.inquiry.claims('deploy')).toBe(false);
    expect(routeUtterance({ utterance: 'run the build', exactActionBind: false })).toBe('surface');
  });

  it('symptom reports are claimed even without an interrogative', () => {
    expect(LEXICONS.inquiry.claims('the visualiser is janky')).toBe(true);
    expect(LEXICONS.inquiry.claims('covers are blank in prod')).toBe(true);
  });
});

describe('P4 — diagnosis does not compete as an action target', () => {
  it('an inquiry-claimed miss is Theory with a procedure gap, not a Do', () => {
    // Regression: the CLI proposer scores 'why is the build broken' against the
    // 'build' script (0.25, thin-margin), which rendered as Clarify — "did you
    // mean build or build:app?" — asking the user to pick a script to run in
    // answer to a diagnosis.
    const { act } = compileSemanticIntent({
      utterance: 'why is the flargle broken',
      context: ctx(),
    });
    expect(act.kind).toBe('Theory');
    expect(act.epistemic.gap).toBe('procedure');
    expect(act.epistemic.method).toBe('absent');
    expect(act.epistemic.warrantRequired).toContain('observation');
    expect(act.investigationDeposit).toBeTruthy();
  });

  it('the action lexicon still reaches Do for a real command', () => {
    const { act } = compileSemanticIntent({
      utterance: 'open albums',
      context: ctx(),
    });
    expect(act.kind).toBe('Do');
    expect(act.epistemic.gap).toBe('none');
    expect(() => assertExecutable(act)).not.toThrow();
  });
});
