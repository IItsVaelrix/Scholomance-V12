# Cleri Probe — Operator Guide

Cleri Probe turns a human bug hypothesis into reproducible, structurally verified
findings. It is an evidence microscope, not a search engine.

The rule that shapes everything else:

> **A candidate score is never a verdict.** Similarity may nominate a region for
> inspection. Only a registered structural verifier may emit `VERIFIED`.

```bash
npm run cleri:probe -- investigate "leaked event listener in a React effect" --scope src
```

---

## The investigation lifecycle

`PLAN → LOAD → INDEX → RETRIEVE → VERIFY → ENRICH → REPORT`

1. **PLAN** — your hypothesis is normalized and matched against the pathology
   lexicon. A hypothesis that reaches no registered pathology class is
   `INCONCLUSIVE` *before* anything is scanned. The probe will not guess.
2. **LOAD** — the scope is resolved into a bounded, sorted, repository-relative
   substrate. Symlinks that escape the root are refused.
3. **INDEX** — each file is parsed into normalized structural facts, cached in a
   disposable content-addressed index.
4. **RETRIEVE** — literal, structural, token, prion, and vector sources nominate
   candidates. This is the only place a score exists.
5. **VERIFY** — the registered verifier for each pathology class reads the facts
   and proves, or fails to prove, the pathology. It never sees the score.
6. **ENRICH** — proven findings gain law references, ownership, and remediation.
   Enrichment can only add context; it can never change a verdict.
7. **REPORT** — a canonical `SCHOL-CLERI-PROBE-v2` report, deterministically
   checksummed and identified by a `PB-CLERI-v2-REPORT` bytecode.

---

## Commands

### investigate

```bash
node scripts/cleri-probe.js investigate "<hypothesis>" [options]

# A targeted investigation of one subtree
node scripts/cleri-probe.js investigate "swallowed error in an empty catch block" \
  --scope src/game --scope codex/runtime

# See the plan without scanning anything
node scripts/cleri-probe.js investigate "race condition from concurrent mutation" --plan-only

# Machine-readable, written to a file, cache bypassed
node scripts/cleri-probe.js investigate "unguarded api response data from fetch" \
  --scope src/services --format json --output /tmp/report.json --no-cache

# Fail a CI job when anything is proven
node scripts/cleri-probe.js investigate "unseeded random in a deterministic path" \
  --scope src/game --fail-on-findings
```

`--scope` and `--exclude` are repeatable:

```bash
node scripts/cleri-probe.js investigate "listener leak" \
  --scope src --scope codex \
  --exclude "src/legacy/*" --exclude "**/*.generated.js"
```

### explain

Renders the complete evidence card for one finding: the exact span, the
predicates that proved it, the counterchecks that were run against it, the
limitations of the proof, the law it rests on, and how to fix it.

```bash
node scripts/cleri-probe.js explain <findingId> --report /tmp/report.json
node scripts/cleri-probe.js explain <findingId> --report /tmp/report.json --format json
```

### verify

Recomputes the report's checksum, bytecode, and finding ids, then **reloads the
source the finding covers** and compares its excerpt digest. A report can be
intact and no longer true: the code it points at may have moved.

```bash
node scripts/cleri-probe.js verify <findingId> --report /tmp/report.json
```

Substrate drift is reported as `EXCERPT_CHANGED`, `SPAN_OUT_OF_RANGE`, or
`SOURCE_UNREADABLE`. Evidence is only reproducible when the identity checks pass
*and* the substrate has not drifted.

### detectors

Lists every installed verifier with its supporting predicates, its counterchecks,
and its limitations. Read this before you trust a `NO_VERIFIED_FINDINGS`.

```bash
node scripts/cleri-probe.js detectors
node scripts/cleri-probe.js detectors --json
```

### benchmark

Measures the four product scenarios and reports p50/p95 against their thresholds.

```bash
node scripts/cleri-probe.js benchmark --format json
```

| Scenario | Threshold (p95) |
|---|---|
| warm targeted investigation | 1000 ms |
| one-file incremental | 500 ms |
| cold process, valid index | 3000 ms |
| full repository sweep | 5000 ms |

### graduate

Records a human decision about a finding and, on `confirm`, writes a **proposal
for review**. It cannot approve itself and it cannot write to immune memory.

```bash
node scripts/cleri-probe.js graduate <findingId> \
  --report /tmp/report.json \
  --proposal /tmp/proposal.json \
  --decision confirm \
  --rationale "Combat damage must be reproducible from the encounter seed."
```

The proposal carries `approved: false`, the evidence digest, a pattern preview
reproducible from the report, and before/candidate benchmarks against the frozen
corpus. **A candidate pattern that costs the family precision or recall is
blocked outright** — it never becomes a proposal.

A `reject` decision records the rejection and creates no proposal.

---

## Options

| Option | Meaning |
|---|---|
| `--scope <path>` | Repository-relative path to investigate (repeatable) |
| `--exclude <glob>` | Path or glob to exclude (repeatable) |
| `--detector <id>` | Restrict verification to one detector (repeatable) |
| `--include-tests` | Analyze test paths as product code |
| `--include-generated` | Analyze generated assets |
| `--plan-only` | Print the investigation plan and stop |
| `--format human\|json\|bytecode` | Output format (default `human`) |
| `--output <path>` | Write output to a file instead of stdout |
| `--include-source` | Include source excerpts in JSON output |
| `--no-cache` | Ignore and do not write the disposable fact index |
| `--no-color` | Disable colour (`NO_COLOR` is also honoured) |
| `--fail-on-findings` | Exit 1 when the report carries verified findings |
| `--report <path>` | The report `explain`, `verify`, and `graduate` operate on |
| `--proposal <path>` | Where `graduate` writes its proposal |
| `--decision confirm\|reject` | The human decision `graduate` records |
| `--rationale <text>` | Why the human made that decision |

JSON output **omits source text** unless `--include-source` is given. Evidence
names spans, symbols, receivers, and events; it does not carry your source.

---

## Statuses

| Status | Meaning |
|---|---|
| `VERIFIED_FINDINGS` | At least one finding was structurally verified |
| `NO_VERIFIED_FINDINGS` | Nothing was verified **within the reported coverage** |
| `PARTIAL` | Coverage was incomplete: skips, parser failures, or budget exhaustion |
| `INCONCLUSIVE` | The hypothesis reached no registered pathology class |
| `FAILED` | The investigation could not complete |

> **`NO VERIFIED FINDINGS` is not proof of absence.** It means: within the files
> that were analyzed, by the verifiers that are installed, with the limitations
> they declare, nothing was proven. Read `coverage` and `detectors` before you
> conclude the bug is not there. A file that failed to parse, a language that is
> unsupported, or a verifier that is not installed produces `PARTIAL` or
> `INCONCLUSIVE` — never a clean bill of health.

## Exit codes

| Code | Meaning |
|---|---|
| `0` | The command succeeded |
| `1` | Verified findings were reported and `--fail-on-findings` was given |
| `2` | An operational failure: usage, configuration, parser, schema, or timeout |
| `3` | The report is `PARTIAL` or `INCONCLUSIVE`, or evidence is not reproducible |

Operational failures are emitted on stderr as `PB-ERR-v1` bytecode artifacts.
A verified pathology is report data, never an exception.

---

## Installed verifiers

| Pathology class | Verifier | Proves |
|---|---|---|
| `UNSEEDED_RANDOMNESS` | `unseeded-randomness/v1` | `Math.random()` decides an outcome the profile calls deterministic |
| `LEAKED_LISTENER_SUBSCRIPTION` | `listener-lifecycle/v1` | A React effect registers a listener its own cleanup cannot remove |
| `SWALLOWED_ERROR` | `swallowed-error/v1` | A catch intercepts an error and neither rethrows, translates, nor recovers |
| `UNSAFE_EXTERNAL_RESPONSE_ACCESS` | `external-response/v1` | A fetch/axios payload is dereferenced as trusted domain data |
| `CONCURRENT_SHARED_STATE_MUTATION` | `concurrent-mutation/v1` | A concurrent callback mutates state declared outside it, more than once |

Run `detectors` for each verifier's predicates, counterchecks, and limitations.

## Waiving a finding

An operator may waive a pathology on the adjacent line:

```js
// IMMUNE_ALLOW: math-random — cosmetic tiebreak, reviewed 2026-07-13
const jitter = Math.random();
```

The token is fixed per pathology class (`math-random`, `listener-lifecycle`,
`swallowed-error`, `external-response`, `concurrent-mutation`), so a blanket
waiver cannot silence every verifier at once.

---

## The laboratory

`scripts/labs/cleri-probe/` holds the phonemic and Markov experiments that
preceded this tool. They are research instruments, not detectors, and they gate
nothing. See [scripts/labs/cleri-probe/README.md](../../scripts/labs/cleri-probe/README.md).
