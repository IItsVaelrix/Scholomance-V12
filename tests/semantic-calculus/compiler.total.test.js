import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { compileSemanticIntent, maybeCompile, assertExecutable } from '../../codex/core/semantic-calculus/compiler.ts';
import { assertSealedIntact, isSealIntact, sealBody } from '../../codex/core/semantic-calculus/seal.ts';
import { emptyContext } from '../../codex/core/semantic-calculus/trustPartition.ts';
import { userUtterance } from '../../codex/core/semantic-calculus/utterance.ts';
import { SEMANTIC_CALCULUS_ERRORS } from '../../codex/core/semantic-calculus/types.ts';

const ctx = (over = {}) => ({ ...emptyContext(), ...over });
/** F21 — these tests model a HUMAN using the app, so they must say so.
 *  A bare string is an undeclared caller and is untrusted by law. */
const said = (text) => userUtterance(text);

describe('F1 — compileSemanticIntent is total', () => {
  const inputs = [
    '',
    '   ',
    'go to albums',
    'GO TO ALBUMS.',
    'infernal plumed helm',
    'asdkjhasd',
    '你好',
    'collapse sidebar',
    'delete everything',
  ];

  it('always returns a sealed act, never null/undefined', () => {
    for (const utterance of inputs) {
      const out = compileSemanticIntent({ utterance: said(utterance), context: ctx() });
      expect(out, utterance).toBeTruthy();
      expect(out.act, utterance).toBeTruthy();
      expect(out.act.seal.digest, utterance).toMatch(/^[0-9A-F]{64}$/);
    }
  });

  it('is total across five kinds, not one — unbound becomes Theory, not a soft Do', () => {
    const bound = compileSemanticIntent({ utterance: said('go to albums'), context: ctx() });
    expect(bound.act.kind).toBe('Do');

    const unbound = compileSemanticIntent({ utterance: said('infernal plumed helm'), context: ctx() });
    expect(unbound.act.kind).not.toBe('Do');
    expect(unbound.act.theoryDeposit.required).toBe(true);
  });

  it('normalizes case/punctuation/whitespace to the same bind', () => {
    const a = compileSemanticIntent({ utterance: said('go to albums'), context: ctx() });
    const b = compileSemanticIntent({ utterance: said('  GO   TO   ALBUMS!  '), context: ctx() });
    expect(b.act.seal.digest).toBe(a.act.seal.digest);
  });
});

describe('F11 — maybeCompile is the integration gate ONLY', () => {
  const prev = process.env.ENABLE_SEMANTIC_CALCULUS;
  afterEach(() => {
    if (prev === undefined) delete process.env.ENABLE_SEMANTIC_CALCULUS;
    else process.env.ENABLE_SEMANTIC_CALCULUS = prev;
  });

  it('defaults OFF — null means "did not run", not an F1 violation', () => {
    delete process.env.ENABLE_SEMANTIC_CALCULUS;
    expect(maybeCompile({ utterance: said('go to albums'), context: ctx() })).toBeNull();
  });

  it('delegates to the total compiler when the flag is on', () => {
    process.env.ENABLE_SEMANTIC_CALCULUS = '1';
    const out = maybeCompile({ utterance: said('go to albums'), context: ctx() });
    expect(out?.act.kind).toBe('Do');
  });
});

describe('F12 — the seal law is verification, not freezing', () => {
  // This is the regression test for rev 2's guard. An Object.isFrozen check
  // passes every one of these mutations; only re-verifying the seal catches them.
  it('detects mutation of a NESTED payload field', () => {
    const { act } = compileSemanticIntent({ utterance: said('go to albums'), context: ctx() });
    const tampered = structuredClone(act);
    tampered.payload.route = '/admin';
    expect(() => assertSealedIntact(tampered)).toThrow(SEMANTIC_CALCULUS_ERRORS.SEAL_MUTATION);
  });

  it('detects an appended cite', () => {
    const { act } = compileSemanticIntent({ utterance: said('go to albums'), context: ctx() });
    const tampered = structuredClone(act);
    tampered.cites.push({
      stableId: 'fake', contentHash: 'x', whyMatched: 'forged',
      trust: 'policy', taint: [], supports: [],
    });
    expect(() => assertSealedIntact(tampered)).toThrow(SEMANTIC_CALCULUS_ERRORS.SEAL_MUTATION);
  });

  it('detects a widened capability scope', () => {
    const { act } = compileSemanticIntent({ utterance: said('go to albums'), context: ctx() });
    const tampered = structuredClone(act);
    tampered.capability.scope.push('/admin');
    expect(() => assertSealedIntact(tampered)).toThrow(SEMANTIC_CALCULUS_ERRORS.SEAL_MUTATION);
  });

  it('detects a flipped LAW decision', () => {
    const { act } = compileSemanticIntent({ utterance: said('infernal plumed helm'), context: ctx() });
    const tampered = structuredClone(act);
    tampered.law.decision = 'allow';
    tampered.kind = 'Do';
    expect(() => assertSealedIntact(tampered)).toThrow(SEMANTIC_CALCULUS_ERRORS.SEAL_MUTATION);
  });

  it('a forged law.decision cannot smuggle an act past the executor', () => {
    // Now that kind no longer encodes permission, law.decision is load-bearing on
    // its own — so it must be sealed as tightly as the kind is.
    const { act } = compileSemanticIntent({ utterance: said('go to albums'), context: ctx() });
    const tampered = structuredClone(act);
    tampered.law.decision = 'block';
    expect(() => assertSealedIntact(tampered)).toThrow(SEMANTIC_CALCULUS_ERRORS.SEAL_MUTATION);
  });

  it('survives structuredClone — freeze is stripped, the seal is not', () => {
    const { act } = compileSemanticIntent({ utterance: said('go to albums'), context: ctx() });
    const cloned = structuredClone(act);
    expect(Object.isFrozen(cloned)).toBe(false); // freeze did NOT survive
    expect(isSealIntact(cloned)).toBe(true); // the seal did
  });

  it('survives a JSON round-trip', () => {
    const { act } = compileSemanticIntent({ utterance: said('collapse sidebar'), context: ctx() });
    expect(isSealIntact(JSON.parse(JSON.stringify(act)))).toBe(true);
  });

  it('a shallow-freeze guard would have passed all of the above', () => {
    const { act } = compileSemanticIntent({ utterance: said('go to albums'), context: ctx() });
    const tampered = structuredClone(act);
    Object.freeze(tampered);
    tampered.payload.route = '/admin'; // succeeds on a frozen object
    expect(Object.isFrozen(tampered)).toBe(true); // the rev 2 guard says "intact"
    expect(isSealIntact(tampered)).toBe(false); // the rev 3 guard says otherwise
  });
});

describe('F18 — the sealed body excludes bank state', () => {
  it('carries no theoryId; the receipt lives outside the seal', () => {
    const { act } = compileSemanticIntent({ utterance: said('infernal plumed helm'), context: ctx() });
    expect(JSON.stringify(act)).not.toContain('theoryId');
    expect(act.theoryDeposit).toEqual({ required: true });
  });

  it('seals theoryDeposit.required, which is a pure function of the draft', () => {
    const a = compileSemanticIntent({ utterance: said('infernal plumed helm'), context: ctx() });
    const b = compileSemanticIntent({ utterance: said('infernal plumed helm'), context: ctx() });
    expect(b.act.seal.digest).toBe(a.act.seal.digest);
  });
});

describe('replay identity is 100%, not four nines', () => {
  const corpus = [
    'go to albums', 'open discography', 'select first track',
    'collapse sidebar', 'infernal plumed helm', '', 'unbound gibberish',
  ];

  it('is bit-identical across 50 recompiles of a frozen corpus', () => {
    for (const utterance of corpus) {
      const first = compileSemanticIntent({ utterance, context: ctx() }).act;
      for (let i = 0; i < 50; i += 1) {
        const again = compileSemanticIntent({ utterance, context: ctx() }).act;
        expect(again.seal.digest, `${utterance} @ iter ${i}`).toBe(first.seal.digest);
      }
    }
  });

  it('carries the compiler identity needed to reproduce it', () => {
    const { act } = compileSemanticIntent({ utterance: said('go to albums'), context: ctx() });
    expect(act.compiler.buildId).toBeTruthy();
    expect(act.compiler.schemaHash).toBeTruthy();
  });

  it('contains no wall-clock anywhere', () => {
    const { act } = compileSemanticIntent({ utterance: said('go to albums'), context: ctx() });
    const s = JSON.stringify(act);
    expect(s).not.toMatch(/\b1[6-9]\d{11}\b/); // ms epoch
    expect(s).not.toMatch(/\b20\d\d-\d\d-\d\dT/); // ISO
  });

  it('key insertion order does not change the digest', () => {
    const a = compileSemanticIntent({
      utterance: said('go to albums'),
      context: { policy: { a: 1, b: 2 }, user: {}, untrusted: {}, derived: {} },
    });
    const b = compileSemanticIntent({
      utterance: said('go to albums'),
      context: { policy: { b: 2, a: 1 }, user: {}, untrusted: {}, derived: {} },
    });
    expect(b.act.seal.digest).toBe(a.act.seal.digest);
  });
});

describe('kind is an act type, not a permission (SEMANTIC_ACT_KIND_IS_NOT_PERMISSION)', () => {
  it('CalculusKind contains no policy verdict', () => {
    // Regression for rev 5: Forbidden/Escalate duplicated law.decision inside the
    // kind enum, which is what made the taxonomy unannotatable (kappa 0.271).
    const kinds = new Set();
    for (const u of ['go to albums', 'infernal plumed helm', '', 'delete everything', 'collapse sidebar']) {
      kinds.add(compileSemanticIntent({ utterance: u, context: ctx() }).act.kind);
    }
    expect(kinds.has('Forbidden')).toBe(false);
    expect(kinds.has('Escalate')).toBe(false);
  });

  it('a refused act keeps its act type — LAW refusing a Do does not unmake the Do', () => {
    // 'delete everything' does not bind, so it is Theory. The point is structural:
    // whatever the kind is, law.decision is a SEPARATE field carrying the verdict.
    const { act } = compileSemanticIntent({ utterance: said('infernal plumed helm'), context: ctx() });
    expect(act.kind).toBe('Theory');
    expect(act.law.decision).toBe('clarify'); // two axes, two fields
  });

  it('an unpermitted act is never handed a capability', () => {
    const { act } = compileSemanticIntent({ utterance: said('infernal plumed helm'), context: ctx() });
    expect(act.law.decision).not.toBe('allow');
    expect(act.capability).toBeUndefined(); // no usable grant inside a sealed refusal
  });
});

describe('F10/F14 — a valid act is not a permitted act', () => {
  it('rejects Theory at the executor', () => {
    const { act } = compileSemanticIntent({ utterance: said('infernal plumed helm'), context: ctx() });
    expect(() => assertExecutable(act)).toThrow(SEMANTIC_CALCULUS_ERRORS.THEORY_NOT_EXECUTABLE);
  });

  it('rejects a Do that LAW did not allow — the executor checks BOTH axes', () => {
    const { act } = compileSemanticIntent({ utterance: said('go to albums'), context: ctx() });
    const forged = { ...structuredClone(act), law: { decision: 'block', ruleIds: [] } };
    expect(() => assertExecutable(forged)).toThrow(SEMANTIC_CALCULUS_ERRORS.NOT_PERMITTED);
  });

  it('every Do carries a capability', () => {
    const { act } = compileSemanticIntent({ utterance: said('go to albums'), context: ctx() });
    expect(act.capability?.scope).toContain('/albums');
    expect(() => assertExecutable(act)).not.toThrow();
  });

  it('capability expiry is logical, never wall-clock', () => {
    const a = compileSemanticIntent({ utterance: said('go to albums'), context: ctx(), logicalTime: 0 });
    const b = compileSemanticIntent({ utterance: said('go to albums'), context: ctx(), logicalTime: 5 });
    expect(a.act.capability.expiresAtLogical).toBe(1);
    expect(b.act.capability.expiresAtLogical).toBe(6);
  });
});

describe('Phase 2 — Clarify is reachable (found by real shadow usage)', () => {
  // Regression for the finding that ended Phase 1: 'open it' on a real album
  // returned Theory with the album id sitting in the route, because the lexicon
  // bound whole phrases and had no slot to leave unresolved. Clarify had NO code
  // path — 15 probes could not produce it.
  const onAlbum = () => ({
    ...emptyContext(),
    user: { route: '/visualiser/album/grimoire-vol-1', selection: '3' },
  });

  it('"open it" is Clarify, not Theory', () => {
    const { act } = compileSemanticIntent({ utterance: said('open it'), context: onAlbum() });
    expect(act.kind).toBe('Clarify');
    expect(act.law.decision).toBe('clarify');
  });

  it('a deictic NEVER resolves from state — no soft Do', () => {
    // The album is in the route and the track is in the query. Resolving "it" from
    // either would be the exact failure this architecture exists to prevent.
    const { act } = compileSemanticIntent({ utterance: said('open it'), context: onAlbum() });
    expect(act.kind).not.toBe('Do');
    expect(act.capability).toBeUndefined();
  });

  it('an unknown word deposits as Theory rather than asking a nonsense question', () => {
    const { act } = compileSemanticIntent({ utterance: said('open the flurb'), context: onAlbum() });
    expect(act.kind).toBe('Theory');
    expect(act.theoryDeposit.required).toBe(true);
  });

  it('a read-only formula yields Probe, from the FORMULA not the sentence', () => {
    const { act } = compileSemanticIntent({ utterance: said('what album is this'), context: onAlbum() });
    expect(act.kind).toBe('Probe');
  });

  it('all four non-Hypothesis kinds are now reachable', () => {
    const kinds = new Set(
      ['open albums', 'open it', 'what album is this', 'asdkjh'].map(
        (u) => compileSemanticIntent({ utterance: u, context: onAlbum() }).act.kind,
      ),
    );
    expect([...kinds].sort()).toEqual(['Clarify', 'Do', 'Probe', 'Theory']);
  });

  it('capability scope names what it permits, derived from resolved slots', () => {
    // Regression: nested payloads made this String(undefined) -> scope "unknown".
    // A capability that cannot name its scope is authority-shaped and bounds nothing.
    const { act } = compileSemanticIntent({ utterance: said('open albums'), context: onAlbum() });
    expect(act.capability.scope).toEqual(['/albums']);
    expect(act.capability.scope).not.toContain('unknown');
  });
});
