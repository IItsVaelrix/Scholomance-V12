# Cleri Probe Laboratory

These are **research instruments, not product**. Nothing here is authoritative,
nothing here is a detector, and nothing here may gate a release.

`scripts/cleri-probe.js` is the only product CLI. It is the thing that emits a
`SCHOL-CLERI-PROBE-v2` report, and the only thing whose findings mean anything.
The experiments in this directory were the ancestors of that CLI: they measured
whether phonemic and Markov similarity could locate a bug. Their honest answer —
that similarity can *nominate* a region but can never *prove* a defect — is the
reason the product CLI verifies structure instead.

## What each experiment measured

| Script | Question it asked |
|---|---|
| `metronome.js` | Can prosodic stress disambiguate homographs in identifiers? |
| `pronunciation.js` | How accurately does context-free G2P pronounce homographs? |
| `phoneme.js` | Can a phoneme "prion" detector find misfolded code by sound? |
| `separation.js` | Does the phoneme prion detector separate real defects from noise? |
| `mutation.js` | Can an order-2 Markov model of normal syntax flag anomalies? |

Their reusable measurements are captured by the product's own suites: the frozen
accuracy corpus (`tests/qa/fixtures/cleri-probe/manifest.json`, with the legacy
15-archetype baseline in `legacy-prion-baseline.json`) and the release gates in
`tests/qa/cleri-probe/`. The experiments are kept, not deleted, because a
negative result is a result — but they live here so that no one mistakes a
similarity score for a verdict.

## Running one

```bash
node scripts/labs/cleri-probe/separation.js --collision=0.90
node scripts/labs/cleri-probe/phoneme.js --mode=prion
```

They print to a terminal. They emit no contract, no checksum, and no evidence.

## Adding one

Put it here, name what it measures in the table above, and keep it out of
`package.json`. If an experiment produces a result worth trusting, it does not
graduate by moving back to `scripts/` — it graduates by becoming a structural
verifier with a labeled corpus and a precision gate. See
[docs/tooling/cleri-probe-verifier-authoring.md](../../../docs/tooling/cleri-probe-verifier-authoring.md).
