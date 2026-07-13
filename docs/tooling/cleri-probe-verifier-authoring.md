# Authoring a Cleri Probe Verifier

A verifier is the only thing in the Scholomance permitted to say `VERIFIED`. This
document is the contract it must satisfy to earn that permission.

---

## The contract

A verifier is a frozen object with this shape:

```js
export const listenerLifecycleVerifier = deepFreeze({
  id: 'listener-lifecycle/v1',            // versioned, unique
  version: '1.0.0',
  pathologyClass: 'LEAKED_LISTENER_SUBSCRIPTION',   // exactly one

  supportingPredicates: deepFreeze([      // what must be observed
    'EFFECT_CALLBACK_REGISTERS_LISTENER_OR_SUBSCRIPTION',
    'REGISTRATION_IDENTITY_IS_STABLE'
  ]),
  counterchecks: deepFreeze([             // what would excuse it
    'MATCHING_REMOVE_IN_RETURNED_CLEANUP',
    'CAPTURED_UNSUBSCRIBE_CALLED_IN_CLEANUP',
    'REGISTRATION_IS_SELF_TERMINATING'
  ]),
  limitations: deepFreeze([               // what it cannot see
    'Only React effect hooks are proven; class lifecycle pairs are not supported in v1.'
  ]),

  retrieveHints() { return ['addEventListener', 'subscribe', 'useEffect']; },

  verify(candidate, context) { /* pure */ }
});
```

Register it in `codex/core/immunity/cleri-probe/verifier-registry.js`:

```js
export const DEFAULT_VERIFIERS = deepFreeze([
  concurrentMutationVerifier,
  externalResponseVerifier,
  listenerLifecycleVerifier,
  swallowedErrorVerifier,
  unseededRandomnessVerifier
]);
```

Registration runs a stability harness: the verifier must be synchronous, must not
throw on a hostile candidate, must produce byte-identical output across 25
repetitions, and must stay inside its runtime budget. A verifier that fails the
harness cannot be registered at all.

---

## The rules

**One pathology class, one versioned id.** A verifier that proves two things
proves neither cleanly. Split it.

**Normalized facts only.** `verify(candidate, context)` receives
`candidate.facts` — the file's structural facts from
`codex/services/cleri-probe/babel-facts.adapter.js`: functions, calls (with
arguments), effects, catch clauses, bindings (with initializers), writes, member
reads, external requests, guards, concurrent callbacks, and comments. Never read
source text, never re-parse, never touch the filesystem, and never execute
anything.

**No I/O, no clock, no randomness.** A verifier is a pure function of facts. If
it needs the world, it is not a verifier.

**`VERIFIED` or `NO_FINDING`. Nothing else.** There is no "probably", no
"suspicious", and no score. If you cannot prove it, say `NO_FINDING` and declare
the gap as a limitation.

**Explicit supporting predicates.** Every predicate that must hold is named,
observed, and attached to a span. A reader must be able to see *why* — never
infer it.

**Explicit counterchecks.** Every excuse you looked for is recorded with
`observed: false`. Evidence on a negative is the difference between "we found
nothing" and "we looked for nothing". A finding with no counterchecks is a
guess wearing a verdict's clothes.

**A remove call elsewhere is not counterevidence.** Prove locality. If the
cleanup that would excuse the pathology cannot run, it does not excuse it.

**Conservative by construction.** When the structure is ambiguous — an
unresolvable receiver, an unsupported client, a language you do not parse — emit
a limitation, not a finding. Precision is the product; recall is a goal.

---

## The corpus gate

A verifier does **not** ship until its labeled corpus reaches **95 percent
precision**. The aggregate registry must reach **98 percent**.

Add cases to `tests/qa/fixtures/cleri-probe/manifest.json`. Every family needs
all four subtypes:

```json
{
  "id": "listener-lifecycle-window-leak",
  "pathologyClass": "LEAKED_LISTENER_SUBSCRIPTION",
  "path": "listener-lifecycle/verified.jsx",
  "expected": "VERIFIED",
  "expectedLine": 8,
  "subtype": "CLEAR_POSITIVE",
  "notes": "Clear positive: window.addEventListener registered in useEffect without cleanup."
}
```

| Subtype | What it proves |
|---|---|
| `CLEAR_POSITIVE` | The textbook shape of the pathology |
| `REAL_WORLD_POSITIVE` | The shape as it actually appeared in this repository |
| `DIRECT_HARD_NEGATIVE` | The correct fix — must be `NO_FINDING` |
| `ADVERSARIAL_HARD_NEGATIVE` | Healthy code that *looks* like the pathology — must be `NO_FINDING` |

The adversarial hard negative is the one that matters. It is where a
similarity-first tool fails and a structural verifier must not.

Before registration, your test suite must:

- mutate **every** supporting predicate and assert the finding disappears
- mutate **every** countercheck and assert the finding reappears
- run at least **25 byte-identical repetitions**
- exercise hostile and unsupported syntax without throwing
- assert its fixture-scale runtime budget

`tests/qa/cleri-probe/verifiers/verifier-harness.js` provides `verify`,
`assertStableAndBounded`, `assertFamilyGate`, and `HOSTILE_SOURCES` for exactly
this. `assertFamilyGate` scores your family against the frozen corpus and fails
with the exact mislabeled case ids.

```bash
npx vitest run tests/qa/cleri-probe/verifiers/your-verifier.test.js
npx vitest run tests/qa/cleri-probe/accuracy.test.js
```

A family that produces no findings at all is **untested, not precise**, and the
accuracy gate fails it as such.

---

## Remediation

Map the pathology class to a repair in
`codex/core/immunity/cleri-probe/remediation.js`. Where
`repair.recommendations.js` already documents the fix, reference its key — the
Scholomance keeps one voice for a repair it already knows.

`verificationSteps` are selected from an **allow-listed command catalog**. Report
content — a symbol, a path, a hypothesis — can never reach a shell fragment.
`autoFixAvailable` is always `false`: this contract never edits source.

---

## Withdrawing a verifier

A verifier that regresses below its gate is removed from `DEFAULT_VERIFIERS`
before release. The CLI then reports its absence as a coverage limitation rather
than silently claiming the pathology is not present. A missing verifier is an
honest gap; a lying one is a broken immune system.
