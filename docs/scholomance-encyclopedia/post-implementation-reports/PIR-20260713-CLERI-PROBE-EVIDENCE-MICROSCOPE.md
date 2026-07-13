# Post-Implementation Report

## 1. Change Identity
- **Report ID:** PIR-20260713-CLERI-PROBE-EVIDENCE-MICROSCOPE
- **Feature / Fix Name:** Cleri Probe Evidence Microscope Overhaul
- **Author / Agent:** Claude (Opus 4.8)
- **Date:** 2026-07-13
- **Branch / Environment:** V13
- **Related Task / Ticket / Prompt:** Implementation of [`2026-07-13-cleri-probe-evidence-microscope-overhaul-pdr.md`](../PDR-archive/2026-07-13-cleri-probe-evidence-microscope-overhaul-pdr.md) via [`docs/superpowers/plans/2026-07-13-cleri-probe-evidence-microscope-overhaul.md`](../../superpowers/plans/2026-07-13-cleri-probe-evidence-microscope-overhaul.md)
- **Classification:** Architectural / Structural
- **Priority:** High

## 2. Executive Summary

Cleri Probe is now an evidence microscope rather than a similarity search. A
candidate score may nominate a region; only a registered structural verifier may
emit `VERIFIED`, and it must show the predicates that proved the finding and the
counterchecks that failed to excuse it.

Shipped: the `SCHOL-CLERI-PROBE-v2` contract, five structural verifier families
each meeting its precision gate, the complete `investigate → explain → verify →
graduate` loop, a QBIT compatibility view derived from verified findings, and
release gates for accuracy, determinism, security, and performance.

**The web adapter remains deferred to a separate PDR**, as the plan requires. A
future browser surface must consume this same runtime and contract, and may never
treat a client-side score as a verdict.

## 3. Shipped Surface

| Command | Behaviour |
|---|---|
| `investigate <hypothesis>` | Visible plan, canonical report, five distinct statuses |
| `explain <findingId>` | Full evidence card: span, predicates, counterchecks, limitations, law, remediation |
| `verify <findingId>` | Recomputes checksum, bytecode, finding id; reloads the covered source to detect substrate drift |
| `detectors` | Every installed verifier with its predicates, counterchecks, and limitations |
| `benchmark` | p50/p95 for four scenarios against product thresholds |
| `graduate <findingId>` | Human CONFIRM/REJECT; on CONFIRM a reviewable proposal that cannot approve or persist itself |

- **Schema version:** `SCHOL-CLERI-PROBE-v2` / `2.0.0` (SCHEMA_CONTRACT 1.31 → 1.32)
- **Fact schema:** `PARSER_VERSION` 1.1.0 (keys the disposable index)
- **Report identity:** `PB-CLERI-v2-REPORT-<reportId>-<substrate>-<checksum>`

## 4. Verifier Families and Measured Accuracy

Corpus: 20 labeled cases across 5 families, each family carrying all four
subtypes (`CLEAR_POSITIVE`, `REAL_WORLD_POSITIVE`, `DIRECT_HARD_NEGATIVE`,
`ADVERSARIAL_HARD_NEGATIVE`).

| Verifier | Version | Precision | Recall | Supporting predicates | Counterchecks |
|---|---|---|---|---|---|
| `unseeded-randomness/v1` | 1.0.0 | 1.00 | 1.00 | 2 | 4 |
| `listener-lifecycle/v1` | 1.0.0 | 1.00 | 1.00 | 2 | 3 |
| `swallowed-error/v1` | 1.0.0 | 1.00 | 1.00 | 1 | 4 |
| `external-response/v1` | 1.0.0 | 1.00 | 1.00 | 2 | 3 |
| `concurrent-mutation/v1` | 1.0.0 | 1.00 | 1.00 | 3 | 3 |
| **Aggregate** | — | **1.00** | **1.00** | — | — |

- Family precision gate: ≥ 0.95 — **met by all five.**
- Aggregate precision gate: ≥ 0.98 — **met (1.00).**
- Candidate top-set recall gate: ≥ 0.90 — **met (1.00):** retrieval nominates the
  file of every labeled positive.
- No family is withheld. A family that produced no findings at all would fail the
  accuracy gate as *untested*, not pass as precise.

## 5. Determinism, Security, Performance

**Determinism (308 tests, all passing).** 100 byte-identical runs over identical
inputs. The report is unchanged by shuffled filesystem order, cold vs. warm cache,
a different absolute repository root, injected clocks, colour, and terminal width.
Every identity-bearing field (`contract`, `schemaVersion`, `reportId`,
`hypothesis`, `normalizedHypothesis`, `substrateFingerprint`,
`configurationFingerprint`, `status`, `findings`, `coverage`, `diagnostics`,
`plan`, `checksum`, `bytecode`) was tampered with once and verification failed
each time.

**Security.** Root traversal, escaping symlinks, symlink loops, oversized files,
binary and malformed content, parser bombs, candidate floods, poisoned cache
payloads, unreadable paths, ANSI injection, and secret redaction are all covered.
Proven negatives: no fixture source is executed, and no network API is reached.
JSON omits source text unless `--include-source` is supplied.

**Performance** (reference machine: AMD Custom APU 0932, Node v20.20.2):

| Scenario | p95 measured | Threshold |
|---|---|---|
| warm targeted investigation | 42 ms | 1000 ms |
| one-file incremental | 12 ms | 500 ms |
| cold process, valid index | 23 ms | 3000 ms |
| repository-subtree sweep | 301 ms | 5000 ms |

Every scenario is an order of magnitude inside its threshold. `benchmark` exits
non-zero on a breach.

## 6. Defects Found and Fixed During Implementation

Three real defects surfaced *because* the gates were written honestly:

1. **Task 1 was never carried out.** `SCHOL-CLERI-PROBE-v2` appeared in no schema
   document, yet the runtime had been exporting reports stamped with that contract
   since the CLI landed. Ratified in SCHEMA_CONTRACT 1.32.

2. **`String(null)` in the finding contract.** An explicit `null` `findingId`
   became the truthy string `"null"`, so the report builder kept it instead of
   computing the canonical id. Every context-enriched finding would have shipped
   with `findingId: "null"`. Found by the first CLI test that resolved a finding
   *by* its id.

3. **Symlink-loop re-entry in the substrate service.** The guard was keyed on the
   link path, so `src/game/loop -> src` produced an endlessly new alias
   (`src/game/loop/game/loop/...`) and analyzed the same physical file 41 times.
   Now keyed on the resolved real directory. The substrate suite had an unused
   `symlink` helper — the loop case had never actually been exercised.

## 7. Deviations from the Plan

- **Facts had to grow before the verifiers could exist.** The Task 8 runtime never
  handed verifiers the parsed facts, and the fact shape carried no call arguments,
  member reads, comments, import sources, binding initializers, or function-local
  catch control flow. Task 9 therefore also extended `babel-facts.adapter.js`, the
  runtime (facts into `verify`, multiple findings per candidate), and the planner
  (three pathology classes had retrieval profiles but no hypothesis terms, so they
  were unreachable). Recorded here rather than silently absorbed.
- **A new core module, `scholomance-profile.js`,** holds the path/symbol
  classification and adapter allow-lists the five verifiers share. The plan named
  the profile but gave it no home.
- **`ownership` was added to `CleriFinding`** so context enrichment had somewhere
  lawful to put it. Ratified in the schema notice.
- **`NOT_TEST_OR_DOCUMENTATION` is waived by `--include-tests`.** An operator who
  explicitly asks for test paths has asked for them to be analyzed as product code.

## 8. Release Battery

| Check | Result |
|---|---|
| `npx vitest run tests/qa/cleri-probe tests/diagnostic/qbitProbeEnrichment.test.js` | **308 passed** |
| `node scripts/cleri-probe.js benchmark --format json` | **0 breaches** |
| `npm run security:qa` | **PASS** |
| `npx eslint` (cleri-probe subsystem) | **0 errors, 0 warnings** |
| `npm run dead:scan:ci` (cleri-probe) | **0 dead exports** (5 removed during review) |
| `node docs/.../audit-hygiene.mjs` | 140 errors — **unchanged**, none from these docs |
| `git diff --check` | clean |

### Pre-existing findings, listed with their owners

These fail today and failed before this work. They are named here rather than
absorbed:

| Finding | Owner |
|---|---|
| `src/features/graph-editor/PixelBrainGrammarGlossary.tsx` — the Vaelrix randomness law flags `Math.random()` **inside UI prose that quotes the law itself** | graph-editor |
| `codex/core/pixelbrain/graphic-forge/graphic-forge.pipeline.js` — un-exempted `Date.now()` fallback | pixelbrain |
| 96 repo-wide ESLint errors and 50 TypeScript errors outside this subsystem | various |
| 140 encyclopedia hygiene errors (missing PDR/README index links) | encyclopedia |
| `scripts/labs/cleri-probe/phoneme.js` — one unused-variable warning, inherited on move | laboratory |

Two scanner defects were fixed in passing, because they made the battery
unreadable: the determinism and Vaelrix law greps matched **compiled Rust
artifacts** (`.rlib`/`.rmeta` under `target/`), which are not source. `target/` is
now excluded. The cache service's `Date.now()`/`Math.random()` — cache freshness
and atomic-rename temp filenames, neither of which enters a report — now carry the
`// EXEMPT` annotation the law understands.

## 9. Known Limitations

Declared by the verifiers themselves and printed by `detectors`:

- **Randomness:** only `Math.random()` is proven. `crypto.getRandomValues` and
  Date-derived entropy are out of scope. Authority is classified from the symbol
  and path profile, not from call-graph reachability.
- **Listeners:** React effect hooks only. Class `componentDidMount` /
  `componentWillUnmount` pairs are a limitation, not a finding.
- **Swallowed errors:** recovery performed by a function *nested inside* the catch
  is not credited; only catch-local control flow is proven.
- **External responses:** global `fetch` and imported `axios` only; aliases are
  tracked inside a single function. A response guarded by HTTP status alone clears
  the verifier even when the payload shape is unvalidated.
- **Concurrency:** `Promise.all` / `Promise.allSettled` over map/filter-derived
  callbacks only. A `Promise.all` over an array literal runs each callback once,
  so its writes are not reported.

`NO_VERIFIED_FINDINGS` is not proof of absence beyond the reported coverage.

## 10. Laboratory Dispositions

The five phonemic and Markov experiments moved to `scripts/labs/cleri-probe/`
(`metronome`, `pronunciation`, `phoneme`, `separation`, `mutation`) behind a
README naming them non-authoritative research instruments. They are **kept, not
deleted**: their honest negative result — that similarity can nominate a region
but can never prove a defect — is precisely why the product CLI verifies structure.
`scripts/cleri-probe.js` is the only product CLI. Historical plans, PDRs, and
field reports keep the paths they documented at the time.

## 11. Lifecycle

The PDR moves to **Implemented**. All required gates pass, no verifier family was
withheld, and the deferred web adapter is explicitly out of scope for this PDR.
