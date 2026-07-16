import { describe, it, expect } from 'vitest';
import {
  lexicalProposer, validateProposal, assessMargin, PROPOSAL_ERRORS,
} from '../../codex/core/semantic-calculus/proposer.ts';
import { loadCliLexicon, knownKeys, entryFor, riskFor } from '../../codex/core/semantic-calculus/cliLexicon.ts';
import { adjudicateLaw } from '../../codex/core/semantic-calculus/kind.ts';

const lex = loadCliLexicon();
const known = knownKeys(lex);
const p = (candidates) => ({ proposerId: 'test', slot: 'script', candidates });

describe('the harness refuses what the proposer invents', () => {
  it('rejects a candidate that names no real command', () => {
    // THE point of the harness. An invented key is indistinguishable from a
    // confident hallucination; accepting it makes the lexicon advisory.
    expect(() => validateProposal(p([{ key: 'rm-everything', score: 0.99 }]), known))
      .toThrow(PROPOSAL_ERRORS.INVENTED_CANDIDATE);
  });

  it('rejects an out-of-range score', () => {
    expect(() => validateProposal(p([{ key: known[0], score: 7 }]), known))
      .toThrow(PROPOSAL_ERRORS.INVALID_SCORE);
  });

  it('accepts a proposal that stays inside the closed world', () => {
    expect(() => validateProposal(p([{ key: known[0], score: 0.9 }]), known)).not.toThrow();
  });
});

describe('F4/F15 — the margin law, per risk class', () => {
  const risky = riskFor('destructive'); // bar 0.5
  const safe = riskFor('reversible_ui'); // bar 0.15

  it('a clear margin decides', () => {
    const v = assessMargin(p([{ key: 'a', score: 0.9 }, { key: 'b', score: 0.2 }]), safe);
    expect(v.decided).toBe(true);
    expect(v.pick.key).toBe('a');
  });

  it('a thin margin is a QUESTION, not a weak Do', () => {
    const v = assessMargin(p([{ key: 'a', score: 0.61 }, { key: 'b', score: 0.60 }]), safe);
    expect(v.decided).toBe(false);
    expect(v.reason).toBe('thin-margin');
    expect(v.rival.key).toBe('b'); // the question names the rival
  });

  it('THE SAME proposal decides for a safe act and asks for a destructive one', () => {
    // F15: thresholds are per risk class. A destructive act may never borrow a
    // navigation bar. This is the whole reason RiskProfile.minMargin exists.
    const proposal = p([{ key: 'a', score: 0.8 }, { key: 'b', score: 0.5 }]); // margin 0.3
    expect(assessMargin(proposal, safe).decided).toBe(true); // 0.3 >= 0.15
    expect(assessMargin(proposal, risky).decided).toBe(false); // 0.3 <  0.5
  });

  it('no candidates is not a margin', () => {
    expect(assessMargin(p([]), safe).reason).toBe('no-candidates');
  });

  it('ranking is total and replay-stable across identical calls', () => {
    const a = lexicalProposer.propose('run the tests', 'script', known);
    const b = lexicalProposer.propose('run the tests', 'script', known);
    expect(b).toEqual(a);
  });
});

describe('the CLI lexicon is a manifest, not an invention', () => {
  it('every key is a real npm script', () => {
    const pkg = JSON.parse(require('node:fs').readFileSync('package.json', 'utf8'));
    for (const k of known) expect(pkg.scripts).toHaveProperty(k);
  });

  it('classifies from the COMMAND, not the label', () => {
    // `lint` sounds read-only AND is; the point is we check what it runs.
    expect(entryFor(lex, 'lint')?.effect).toBe('read');
    expect(entryFor(lex, 'deploy')?.consequence).toBe('destructive');
  });

  it('deploy is destructive and therefore never a plain allow', () => {
    const risk = riskFor(entryFor(lex, 'deploy').consequence);
    // F19: allowedFallback is an ACT TYPE, not a verdict. This test previously
    // asserted 'Escalate' — encoding the very conflation the enum cut removed.
    // Escalation is law.decision's job; the fallback says what to DO instead.
    expect(risk.allowedFallback).toBe('Clarify');
    expect(risk.confirmationPolicy).toBe('two_phase');
    expect(risk.minMargin).toBeGreaterThan(riskFor('reversible_ui').minMargin);
  });

  it('LAW escalates deploy — the verdict lives on the other axis', () => {
    const law = adjudicateLaw({ kind: 'Do', riskProfile: riskFor(entryFor(lex, 'deploy').consequence) });
    expect(law.decision).toBe('escalate');
  });

  it('the lexicon version tracks package.json content', () => {
    expect(lex.version).toMatch(/^pkg-scripts-[0-9a-f]{12}$/);
  });

  it('running the dev server is not misread as a secrets operation', () => {
    // Regression: `--env-file=.env` matched a secrets regex and pushed the margin
    // bar to 0.5, turning every dev command into a Clarify nobody could clear.
    expect(entryFor(lex, 'dev:server')?.consequence).toBe('reversible_ui');
  });
});
