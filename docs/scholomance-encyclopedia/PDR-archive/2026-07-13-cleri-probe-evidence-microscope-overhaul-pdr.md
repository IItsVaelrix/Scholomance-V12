# PDR: Cleri Probe Evidence Microscope Overhaul
## A precision-first, CLI-native investigation workbench for human forensic analysis

**Status:** Draft

**Classification:** Architectural | Developer Tooling | Immune System | Diagnostic Evidence | CLI

**Priority:** High

**Primary Goal:** Rebuild `cleri-probe` as a fast, deterministic, Scholomance-specific command-line microscope that turns a human investigator's natural-language suspicion into structurally verified, evidence-backed findings and inert remediation guidance.

**Bytecode Search Code:** `SCHOL-ENC-BYKE-SEARCH-PDR-CLERI-PROBE-EVIDENCE-MICROSCOPE`

**Predecessor:** [`PDR-2026-05-10-PROACTIVE-ANTIGEN-PROBE.md`](./PDR-2026-05-10-PROACTIVE-ANTIGEN-PROBE.md)

**Supersession Rule:** This PDR supersedes the predecessor only after Angel approves this written artifact. Until then, both remain drafts and neither authorizes implementation.

**Related Systems:** Clerical RAID, QBIT probe enrichment, Bytecode Error System, Vector AMP, Vaelrix Law, Scholomance Collab MCP

**Product Decision Record:** CLI-first for a human investigator; web-app integration is deferred and must consume the same canonical report contract.

---

# 1. Executive Summary

`cleri-probe` began with a powerful idea: let an investigator describe the shape of a suspected bug and scan the repository for code that resonates with that hypothesis. The metaphor is correct. A human investigator needs a microscope for suspicions that are too structural for `rg` and too novel for a pre-existing lint rule.

The current implementation is not yet trustworthy enough to serve that role. Its active scoring improvements materially reduce noise, but its underlying lens remains a stemmed bag of code tokens. It cannot represent ordering, scope, control flow, data flow, or the absence of a required guard. Similarity can nominate a candidate, but it cannot prove a pathology. The current output nevertheless presents percentages as if they were diagnostic confidence and can declare the substrate healthy when no item crosses a threshold.

This PDR replaces that model with a hybrid evidence microscope:

1. A deterministic planner interprets the investigator's hypothesis and exposes that interpretation.
2. Fast indexed retrieval nominates candidate code spans.
3. Small structural verifiers test required evidence and healthy counter-evidence.
4. Only structurally verified candidates become findings by default.
5. Every finding includes exact source location, proof, counterchecks, applicable law, focused verification steps, and remediation guidance.
6. Human confirmation is required before a finding can become Clerical RAID memory.

The product remains local, deterministic, read-only with respect to source code, and specific to Scholomance. It does not call a cloud model, execute scanned code, modify files, or silently train the immune substrate.

---

# 2. Problem Statement

## 2.1 The investigator's gap

Scholomance has complementary but incomplete diagnostic instruments:

- `rg` and literal search are exact but require the investigator to know the implementation spelling.
- ESLint and immune rules are precise but only recognize pathologies already encoded as rules.
- Clerical RAID compares a new report with known bug memory but does not search the live repository for a novel hypothesis.
- Existing diagnostic cells validate known invariants but do not compile an investigator's suspicion into a focused forensic sweep.
- The current `cleri-probe` retrieves token-similar files but does not prove that those files contain the suspected behavior.

The missing product is a human-facing bridge between intuition and proof.

## 2.2 Current-state evidence

Read-only measurements taken on 2026-07-13 establish the baseline for this overhaul:

| Probe | Substrate | Result | Observed duration |
|---|---:|---|---:|
| Hypothesis: unseeded `Math.random` in deterministic combat logic | 2,366 source files | Top result was `scripts/cleri-probe.js`; 119 files crossed a 0.15 floor | 5.287 s |
| Hypothesis: transaction writes without rollback | 2,366 source files | Relevant persistence files appeared, mixed with unrelated voxel and UI files | 5.328 s |
| Fifteen-archetype prion sweep | 2,368 source files | `scripts/cleri-probe.js` was the top hit for all 15 archetypes; 414 total hits crossed a 0.25 floor | 66.831 s |

The predecessor PDR requires a full-repository sweep in less than three seconds. The ordinary query misses that budget, and the prion sweep exceeds it by more than twenty times.

The stronger failure is semantic. The current prion descriptions include healthy tokens that comments claim should be absent. In a controlled in-memory comparison, the built-in listener-cleanup hypothesis scored a correctly cleaned-up listener at `0.6104` and the actual leak at `0.3983`. The safe example ranked first because the bag-of-tokens lens rewards `removeEventListener`, `cleanup`, and `return`; it cannot interpret those tokens as counter-evidence.

## 2.3 Root limitations

The current design has seven structural limitations:

1. **Retrieval is presented as diagnosis.** A cosine score is a candidate-ranking signal, not proof of a bug.
2. **Negation and absence are not representable.** “Without cleanup,” “unseeded,” and “no rollback” lose their logical meaning.
3. **Self-contamination is expected.** Detector definitions, comments, tests, fixtures, generated sources, and temporary files reproduce the queried vocabulary.
4. **Results are not locally explainable.** A file-level percentage does not identify the matching span, symbol, evidence, or counter-evidence.
5. **Performance is scan-bound.** Every hypothesis re-reads and re-vectorizes the repository; prion mode repeats that work for every archetype.
6. **Trust is unmeasured.** No direct engine benchmark gates precision, recall, ranking, threshold changes, or healthy counterexamples.
7. **The displayed fidelity signal describes the wrong artifact.** The active probe prints a quantization-fidelity grade even though its ranking path now uses a separate full-precision vector, so the grade does not establish finding quality.

## 2.4 Product fragmentation

The `cleri-probe` name currently covers several separate research scripts:

- `scripts/cleri-probe.js`
- `scripts/cleri-probe-phoneme.js`
- `scripts/cleri-probe-separation.js`
- `scripts/cleri-probe-mutation.js`
- `scripts/cleri-probe-pronunciation.js`
- `scripts/cleri-probe-metronome.js`

Clerical RAID, QBIT enrichment, immune rules, and MCP RAID tools provide adjacent capabilities through separate entrypoints and data shapes. A human investigator should not need to understand those internal boundaries to perform one investigation.

---

# 3. Product Goal

Create an exceptional command-line investigation tool for a human Scholomance maintainer.

Given a natural-language suspicion and an optional repository scope, the tool must:

1. Explain how it interpreted the suspicion.
2. Identify which parts can be structurally verified with installed capabilities.
3. Retrieve likely candidate spans quickly.
4. Test candidates for required pathological evidence and healthy counter-evidence.
5. Report only verified findings by default.
6. State incomplete coverage and inconclusive analysis explicitly.
7. Give the investigator safe, focused verification steps and remediation guidance.
8. Preserve a deterministic evidence artifact suitable for later review, QBIT enrichment, Clerical RAID graduation, and a future web interface.

The principal optimization target is precision. The tool should prefer a short list of defensible findings over a long list of plausible leads.

---

# 4. Non-Goals

This PDR does not authorize:

- A web application or graphical user interface.
- Automatic source-code changes.
- Automatic execution of suggested commands.
- Cloud analysis, hosted embeddings, or LLM calls.
- Background monitoring or a daemon.
- CI enforcement by default.
- Game-runtime authority or changes to player-facing mechanics.
- Languages outside JavaScript, JSX, TypeScript, TSX, MJS, and CJS.
- A generic cross-project product.
- Similarity-only findings.
- Automatic Clerical RAID training.
- Porting every existing prion archetype without validation.
- Treating “no verified finding” as proof that the repository is healthy.

The implementation may preserve research scripts temporarily for benchmark comparison, but they are not separate product surfaces after migration completes.

---

# 5. Core Design Principles

## 5.1 Evidence before confidence

A finding exists because a verifier established required facts and checked refuting facts. A resonance percentage can prioritize work but cannot create a verdict.

## 5.2 The plan is visible

The tool must show the investigator how it interpreted the hypothesis: suspected pathology, required evidence, healthy counter-evidence, scope, applicable verifier, and unsupported clauses. There is no hidden prompt or opaque classification step.

## 5.3 Precision is the default contract

Default output contains only `VERIFIED` findings. Unsupported or underdetermined hypotheses produce an explicit inconclusive result. Lower-confidence retrieval leads are not mixed into the finding list.

## 5.4 Healthy code is first-class evidence

Every verifier defines counter-evidence that defeats a positive verdict. Examples include cleanup functions, seeded randomness, a dominating bounds check, a rethrow, a transaction rollback path, or an immutable per-task accumulator.

## 5.5 Source remains sovereign

The tool runs locally, never sends source to a network service, never executes scanned source, and never modifies repository code. Derived caches contain no authoritative state and are safe to delete.

## 5.6 Determinism is observable

The same hypothesis, normalized configuration, substrate fingerprint, and verifier versions produce byte-identical canonical reports. The report exposes those inputs so an investigator can reproduce it.

## 5.7 Scholomance-specific context enriches proof

Vaelrix laws, bytecode categories, ownership boundaries, immune rules, and Clerical RAID precedents enrich a verified finding. They do not override or manufacture structural evidence.

## 5.8 Human confirmation governs memory

A confirmed finding may be converted into a proposed antigen. The investigator sees the evidence and generated pattern before any persistence. Rejection is also recorded as benchmark feedback. No probe result silently becomes immune memory.

## 5.9 No parallel engine for the future UI

The eventual web application consumes the canonical investigation report and invokes the same runtime. It does not recreate planning, verification, or scoring in a browser-specific implementation.

---

# 6. Feature Overview

## 6.1 Primary command

```bash
npm run cleri:probe -- investigate \
  "event listeners survive component unmount" \
  --scope src/
```

The command prints an investigation plan, scans the selected scope, and renders the report.

## 6.2 Command surface

```text
cleri:probe investigate "<hypothesis>" [options]
cleri:probe explain <finding-id> --report <report-path>
cleri:probe verify <finding-id> --report <report-path>
cleri:probe detectors [--json]
cleri:probe benchmark [--detector <id>]
cleri:probe graduate <finding-id> --report <report-path> --proposal <output-path>
```

These are readable shorthands for `npm run cleri:probe -- <command> ...` until a separately approved package-level executable exists.

`graduate` appears only in Phase 4 and creates a reviewable proposal. It does not mutate Clerical RAID directly.

## 6.3 Investigation options

The stable option set includes:

- `--scope <path>`: repeatable repository-relative scope.
- `--exclude <glob>`: repeatable additional exclusion.
- `--include-tests`: include tests and fixtures.
- `--include-generated`: include generated source.
- `--detector <id>`: require a specific verifier.
- `--plan-only`: print the compiled plan without scanning.
- `--format human|json|bytecode`: choose a report encoder.
- `--output <path>`: explicitly persist a report.
- `--include-source`: include excerpts in machine-readable output.
- `--no-cache`: bypass the disposable derived index.
- `--no-color`: disable ANSI color; `NO_COLOR` is also honored.
- `--fail-on-findings`: return exit code `1` when verified findings exist.

Unknown options fail with a `PB-ERR-v1` usage error. Numeric budgets and paths use allow-list validation.

## 6.4 Visible investigation plan

Before scanning, the human report displays:

- Original and normalized hypothesis.
- Selected repository scopes.
- Mapped pathology class or classes.
- Required supporting evidence.
- Counter-evidence that would refute the suspicion.
- Selected verifier IDs and versions.
- Unsupported hypothesis clauses.
- Default exclusions and explicit inclusions.
- Expected coverage limitations.

If no installed verifier can prove the hypothesis, the tool stops with an inconclusive report. It does not fall back to calling token similarity a finding.

## 6.5 Finding evidence card

Every verified finding shows:

1. Stable finding ID and pathology label.
2. Exact path, start/end location, and enclosing symbol.
3. A concise local excerpt in human output.
4. Required structural facts that were observed.
5. Counter-evidence that was checked and not found, or was present but insufficient.
6. Verifier name, version, and capability limitations.
7. Relevant Vaelrix law, ownership boundary, bytecode category, immune rule, and RAID precedent.
8. Focused commands or tests the investigator may run manually.
9. Deterministic remediation guidance.

The tool never executes verification or remediation commands unless a future PDR explicitly authorizes such behavior.

## 6.6 Honest negative and partial outcomes

The completion messages are semantically distinct:

- `NO_VERIFIED_FINDINGS`: no verified evidence within completed coverage.
- `VERIFIED_FINDINGS`: one or more structurally verified pathologies.
- `INCONCLUSIVE`: the hypothesis could not be proven or refuted with installed capabilities.
- `PARTIAL`: some selected source could not be analyzed.
- `FAILED`: the investigation could not produce a lawful report.

The phrase “the substrate is healthy” is prohibited unless a separately specified exhaustive invariant proves it.

## 6.7 Exit behavior

Default human-investigator exit semantics are:

| Code | Meaning |
|---:|---|
| `0` | Completed lawfully, with or without verified findings |
| `1` | Verified findings exist and `--fail-on-findings` was requested |
| `2` | Usage, configuration, schema, or execution failure |
| `3` | Partial or inconclusive investigation |

This keeps interactive investigation from masquerading as a failed process while preserving a future automation hook.

---

# 7. Architecture

## 7.1 System flow

```text
Human hypothesis
    ↓
CLI adapter
    ↓
Investigation runtime
    ↓
Deterministic investigation planner
    ↓
Scoped substrate + content-addressed index
    ↓
Candidate retrievers (literal + token + AST feature + resonance)
    ↓
Structural verifier registry
    ↓
Immutable evidence ledger
    ↓
Scholomance context adapters (Law + ownership + bytecode + RAID)
    ↓
Human / JSON / bytecode report encoders
```

## 7.2 CODEx layer compliance

The local CLI uses the lawful dependency direction:

```text
scripts/ CLI adapter
  → codex/runtime investigation orchestration
    → codex/services filesystem, parser, cache, and context adapters
      → codex/core pure planning, verification, evidence, and report functions
```

The Server layer is not involved because the CLI does not resolve game mechanics or persist authoritative game state. No lower layer imports upward. Core analysis has no filesystem, network, DOM, audio, or process effects.

## 7.3 Investigation planner

The planner is deterministic and capability-aware. It maps normalized hypothesis terms and Scholomance vocabulary to registered pathology classes. Its output includes:

- `pathologyClasses`
- `requiredEvidence`
- `counterEvidence`
- `requestedScopes`
- `selectedVerifiers`
- `unsupportedClauses`
- `applicableLawRefs`
- `retrievalHints`

The planner does not use an LLM. Unknown language remains unknown rather than being forced into the nearest familiar class.

## 7.4 Scoped substrate loader

The Scholomance profile defines default production-source roots and exclusions. Default scanning excludes:

- `.git`, dependencies, build output, coverage, and caches.
- Documentation, archives, mirrored repositories, and vendored trees.
- Tests and fixtures unless `--include-tests` is present.
- Generated assets and generated source unless explicitly included.
- Detector definitions, benchmark corpora, and the probe's own implementation.
- Temporary and scratch directories, including `.tmp`.

Traversal is sorted, symlink-safe, repository-root bounded, and extension allow-listed.

## 7.5 Content-addressed index

The index stores derived retrieval and parser features keyed by:

- Repository identity.
- Normalized relative path.
- Source-content hash.
- Parser version.
- feature-lens version.
- Scholomance profile version.

It does not store authoritative findings. It is disposable, rebuildable, excluded from report checksums, and placed in the user's local cache location rather than the repository. `--no-cache` proves results do not depend on cache warmth.

An incremental update parses and indexes only changed, added, or removed files. All final ordering is recomputed deterministically.

## 7.6 Candidate retrieval

Retrieval is an ensemble of bounded nominators:

- Exact literal and identifier lookup.
- Code-aware token retrieval with corpus weighting.
- AST feature lookup, such as call sites, catch clauses, subscriptions, and concurrent combinators.
- Existing Vector AMP resonance for vocabulary drift and semantic adjacency.
- Relevant Clerical RAID pattern hints.

Retrieval outputs candidates, not findings. Candidate scores remain diagnostic metadata and are never rendered as defect probability.

## 7.7 Structural verifier registry

Each verifier is a small unit with one clear purpose and a declared contract:

```text
id
version
pathology class
supported languages
required parser capabilities
required evidence predicates
counter-evidence predicates
known limitations
remediation template key
benchmark corpus version
```

A verifier receives normalized syntax/control-flow facts, not raw filesystem authority. It returns an immutable decision with supporting facts, counterfacts, limitations, and coverage.

## 7.8 Initial verifier set

The first implementation cycle is limited to five detector families:

1. **Unseeded randomness in deterministic paths**
   - Requires an unapproved entropy call reachable from a deterministic authority path.
   - Checks seed injection, approved RNG adapters, explicit exemptions, and non-authoritative UI contexts.

2. **Leaked listeners and subscriptions**
   - Requires a registration whose lifecycle can end without a matching cleanup.
   - Checks returned cleanup functions, unsubscribe handles, once-only registrations, and process-lifetime ownership.

3. **Swallowed errors**
   - Requires a catch/rejection path that consumes an error without rethrow, translation, authoritative recovery, or intentional documented suppression.
   - Logging alone is not automatically proof; surrounding contract and return path are considered.

4. **Unsafe external-response access**
   - Requires an external or untrusted response dereference not dominated by validation or a shape guard.
   - Checks schema parsing, explicit status handling, nullish/optional paths, and adapter normalization.

5. **Concurrent shared-state mutation**
   - Requires concurrent tasks that write a shared mutable target without serialization, isolation, or a lawful aggregation boundary.
   - Checks per-task local state, immutable reducers, queues, locks, and transaction boundaries.

No detector ships merely because a similarly named prion exists today.

## 7.9 Evidence ledger

The evidence ledger is the internal authority for the report. It records:

- Candidate origin and retriever metadata.
- Parser and verifier versions.
- Exact source span and enclosing symbol.
- Supporting structural facts.
- Counter-evidence checked.
- Coverage and skipped regions.
- Verdict and limitation codes.
- Scholomance enrichment references.

The ledger is immutable and deterministically sorted before encoding.

## 7.10 Context enrichment

Adapters may attach:

- Vaelrix law references.
- Schema-contract references.
- Ownership and handoff guidance.
- Existing innate/adaptive immune rule IDs.
- `PB-ERR-v1` category/module suggestions.
- Clerical RAID precedents and historical repair keys.
- QBIT hotspot compatibility data.

Enrichment never changes `VERIFIED` to `NOT_VERIFIED` or vice versa. Only a structural verifier controls that verdict.

## 7.11 Remediation guidance

Guidance is deterministic and keyed to verifier evidence. It contains:

- The invariant that should be restored.
- One or more architecture-compatible repair shapes.
- Files or contracts that should be reviewed before editing.
- Focused verification commands from an allow-listed command catalog.
- Explicit warnings when the correct repair depends on human intent.

Guidance does not splice untrusted source into executable shell strings and is never applied automatically.

---

# 8. Module Breakdown

The implementation plan may refine filenames, but the layer boundaries and responsibility split below are mandatory.

| Layer | Responsibility | Proposed substrate |
|---|---|---|
| CLI | Argument parsing, terminal rendering, exit semantics | `scripts/cleri-probe.js` plus focused CLI helpers |
| Runtime | Investigation orchestration, budgets, cancellation, phase timing | `codex/runtime/cleri-probe/` |
| Services | Filesystem scope, parser adapters, derived cache, law/RAID adapters | `codex/services/cleri-probe/` |
| Core | Planner, verifier interfaces, evidence ledger, canonical report and checksum | `codex/core/immunity/cleri-probe/` |
| Core detectors | Independent structural verifiers | `codex/core/immunity/cleri-probe/verifiers/` |
| Scholomance profile | Scope policy, law mappings, remediation catalog | Codex-owned data/config substrate selected during planning |
| QA | Golden corpora, hard negatives, mutation tests, CLI integration tests | `tests/qa/` and focused diagnostic suites |
| Documentation | User guide, detector authoring guide, PDR/PIR | `docs/` and Scholomance Encyclopedia |

The large prion library must not remain embedded in the CLI. Detector metadata belongs with each verifier or in the canonical Scholomance profile.

The separate pronunciation, metronome, mutation, phoneme, and separation scripts are laboratory instruments, not code-pathology commands. Implementation must either rename them as explicit experiments or retire them after their useful measurements are represented in tests and reports.

---

# 9. ByteCode IR Design

## 9.1 Schema authority

The active `SCHEMA_CONTRACT.md` defines `QbitProbeEnrichmentArtifact`, but that contract contains only hypothesis, hotspots, and scan metadata. It cannot lawfully carry the evidence model required here.

This PDR requests a schema change. It does not itself modify or bypass the active schema. No implementation may export the proposed artifacts until Codex publishes a `SCHEMA CHANGE NOTICE` with Angel's awareness.

## 9.2 Proposed contract family

The requested canonical schema identifier is:

```text
SCHOL-CLERI-PROBE-v2
```

The requested artifact family is:

```text
CleriInvestigationPlan
CleriCandidate
CleriSourceSpan
CleriEvidence
CleriFinding
CleriRemediationGuide
CleriCoverage
CleriInvestigationReport
```

The minimum shared evidence primitives are:

```ts
interface CleriSourceSpan {
  path: string;              // normalized repository-relative path
  startLine: number;         // one-based
  startColumn: number;       // one-based
  endLine: number;           // one-based, inclusive
  endColumn: number;         // one-based, inclusive
  symbol: string | null;
  excerptDigest: string;
}

interface CleriEvidence {
  evidenceId: string;
  kind: "SUPPORTING" | "COUNTERCHECK" | "LIMITATION" | "COVERAGE";
  predicateId: string;
  observed: boolean;
  span: CleriSourceSpan | null;
  explanation: string;
}

interface CleriCoverage {
  requestedPaths: string[];
  analyzedPaths: string[];
  skipped: Array<{ path: string; reasonCode: string }>;
  parserFailures: Array<{ path: string; errorBytecode: string }>;
  complete: boolean;
}
```

At minimum, `CleriFinding` must contain:

```ts
interface CleriFinding {
  findingId: string;
  pathologyClass: string;
  verdict: "VERIFIED";
  span: CleriSourceSpan;
  symbol: string | null;
  summary: string;
  supportingEvidence: CleriEvidence[];
  counterEvidenceChecked: CleriEvidence[];
  verifier: { id: string; version: string };
  lawRefs: string[];
  raidRefs: string[];
  verificationSteps: string[];
  remediation: CleriRemediationGuide;
  limitations: string[];
}
```

At minimum, `CleriInvestigationReport` must contain:

```ts
interface CleriInvestigationReport {
  contract: "SCHOL-CLERI-PROBE-v2";
  schemaVersion: "2.0.0";
  reportId: string;
  bytecode: string;
  hypothesis: string;
  normalizedHypothesis: string;
  plan: CleriInvestigationPlan;
  substrateFingerprint: string;
  configurationFingerprint: string;
  status:
    | "NO_VERIFIED_FINDINGS"
    | "VERIFIED_FINDINGS"
    | "INCONCLUSIVE"
    | "PARTIAL"
    | "FAILED";
  findings: CleriFinding[];
  coverage: CleriCoverage;
  diagnostics: string[];
  checksum: string;
}
```

## 9.3 Proposed bytecode identity

Subject to schema ratification, successful reports use a compact bytecode identity:

```text
PB-CLERI-v2-REPORT-{REPORT_ID}-{SUBSTRATE_HASH}-{PAYLOAD_CHECKSUM}
```

The full structured artifact remains necessary for evidence. The bytecode identifies and verifies that artifact; it does not discard the evidence ledger.

Operational failures continue to use approved `PB-ERR-v1` encoding. A verified pathology is report data, not an exception.

## 9.4 Deterministic identity rules

Report and finding identity includes only stable fields:

- Normalized hypothesis.
- Normalized repository-relative scope.
- Substrate content hashes.
- Profile and verifier versions.
- Structural evidence and source span.

The following are excluded:

- Wall-clock timestamp.
- Runtime duration.
- Terminal width and color.
- Cache hit/miss state.
- Filesystem enumeration order.
- Absolute repository path.

## 9.5 QBIT compatibility

`QbitProbeEnrichmentArtifact` remains a derived compatibility view. A QBIT adapter may map verified findings into hotspots using path, a bounded resonance/risk display value, and a concise reason. QBIT metadata cannot replace the canonical evidence report.

## 9.6 Machine-readable source policy

Human terminal output may show local excerpts. JSON and bytecode-adjacent exports omit source excerpts unless `--include-source` is explicitly provided. Secret-like values are redacted in all formats. Digests and source spans preserve reproducibility without copying credentials into logs.

---

# 10. Implementation Phases

## Phase 0 — Truth baseline

Deliverables:

- Record current cold and warm latency on the target environment.
- Capture known-positive and hard-negative examples for the existing 15 archetypes.
- Preserve the 2026-07-13 self-contamination and listener-cleanup inversion cases.
- Measure current top-k retrieval, precision, recall, and false-positive distribution.
- Identify which active IDF, source filtering, float-cosine, and raw-score changes are valid retrieval improvements.

Exit gate:

- The baseline corpus and measurement script reproduce the current failure modes deterministically.

## Phase 1 — Investigator foundation

Deliverables:

- Stable command parser and help.
- Visible investigation planner and `--plan-only`.
- Scoped substrate loader.
- Content-addressed derived index.
- Evidence ledger and canonical report implementation after schema ratification.
- Human, JSON, and bytecode encoders.
- Coverage, partial-result, and exit-code behavior.
- Benchmark runner.

Exit gate:

- A synthetic verifier can complete the full CLI lifecycle with byte-identical reports across 100 runs.

## Phase 2 — First structural verifiers

Deliverables:

- Five independently gated verifiers from Section 7.8.
- Positive, hard-negative, mutation, limitation, and hostile-input tests per verifier.
- Deterministic remediation and verification-step templates.

Exit gate:

- Each verifier meets its individual precision, determinism, security, and runtime gates.

## Phase 3 — Complete investigation loop

Deliverables:

- `explain` and `verify` report workflows.
- Substrate-drift detection when verifying an older finding.
- Vaelrix law, ownership, bytecode, immune-rule, RAID, and QBIT adapters.
- Incremental-index performance and corruption recovery.
- User and verifier-author documentation.
- Deprecation or explicit laboratory renaming of fragmented probe scripts.

Exit gate:

- A human investigator can move from hypothesis to verified evidence and manual verification without reading implementation internals.

## Phase 4 — Human-controlled immune memory

Deliverables:

- Confirm/reject feedback artifact.
- `graduate` command that creates a proposed antigen from a confirmed finding.
- Human-readable pattern preview and evidence links.
- Benchmark comparison before a learned pattern may affect default retrieval.
- Explicit separate persistence action through the lawful Clerical RAID path.

Exit gate:

- No unconfirmed finding can mutate immune memory, and every proposed antigen is reproducible from its source report.

## Deferred phase — Web adapter

A later PDR may define a web interface. It must invoke the same runtime and consume `SCHOL-CLERI-PROBE-v2`. It may not create browser-authoritative findings or transmit source without a separately approved privacy architecture.

---

# 11. QA Requirements

## 11.1 Accuracy corpus

Every verifier corpus must include:

- Minimal true positives.
- Real Scholomance true positives where available.
- Healthy code with nearly identical vocabulary.
- Guarded and exempt variants.
- Different scopes and nesting arrangements.
- Comments and strings containing the suspicious terms without executable pathology.
- Detector definitions and tests that reproduce the pathology as data.
- Unsupported syntax and parser recovery cases.

Default `VERIFIED` findings must achieve at least 98% aggregate precision. No individual verifier may ship below 95% precision.

Recall is measured and published but may not be improved by weakening the verified threshold. Candidate retrieval must place at least 90% of corpus positives inside the verifier's bounded candidate set.

## 11.2 Mutation tests

For every required evidence predicate, a mutation test removes or changes that fact and expects the verdict to change. For every counter-evidence predicate, a mutation test adds the healthy guard and expects the positive verdict to disappear.

This gate proves the verifier is responding to structure rather than incidental vocabulary.

## 11.3 Determinism battery

For a fixed repository fixture, configuration, and hypothesis:

- Run 100 times.
- Randomize input file enumeration before normalization.
- Exercise cold and warm cache paths.
- Exercise color and no-color terminal modes.
- Compare canonical report bytes and checksums.

All canonical artifacts must be identical.

## 11.4 Performance battery

Measured on the target Scholomance environment and current repository scale:

| Operation | Required budget |
|---|---:|
| Warm investigation, p95 | ≤ 1.0 s |
| Ordinary incremental index update | ≤ 500 ms |
| Cold process start with an already valid index | ≤ 3.0 s |
| Full installed-verifier sweep | ≤ 5.0 s |

Index construction has a separate published budget and visible progress. It is never hidden inside every query.

## 11.5 Security battery

Tests must prove:

- Scanned modules are parsed but never imported or executed.
- Traversal cannot escape the selected repository through `..` or symlinks.
- Oversized files, deep syntax, candidate floods, and parser bombs are bounded.
- ANSI/control characters in paths and excerpts cannot alter terminal semantics.
- Secret-like values are redacted.
- Suggested commands come from an allow-listed catalog.
- Corrupt indexes fail closed and rebuild safely.
- No network API is called.

## 11.6 Error and bytecode battery

- All operational failures produce valid `PB-ERR-v1` artifacts.
- Checksums verify.
- Malformed options do not silently fall back to defaults.
- Unsupported languages and unavailable verifiers produce partial/inconclusive coverage, never a clean verdict.
- Tests use the repository bytecode assertion library where applicable.

## 11.7 CLI usability battery

- Help covers every command and option.
- Narrow terminals remain readable.
- `NO_COLOR` and `--no-color` are honored.
- Piped human output contains no uncontrolled ANSI sequences.
- JSON output is stable and contains no debug logging.
- `--include-source` is explicit.
- Exit codes match Section 6.7.

## 11.8 Ownership and quality gates

Implementation must pass the repository's required lint, typecheck, QA, security, dead-code advisory, and relevant performance gates. Gemini owns implementation tests under the established agent boundary; Codex owns schema and engine architecture; any future UI is handed to Claude through the canonical report contract.

---

# 12. Success Criteria

The overhaul is complete only when all of the following are true:

1. A human can run one documented CLI command with a natural-language suspicion and optional scope.
2. The tool prints the interpretation and verification plan before reporting findings.
3. No similarity-only candidate appears as a verified finding.
4. Every finding contains exact source location, supporting facts, counterchecks, verifier identity, limitations, manual verification steps, and remediation guidance.
5. Default verified precision is at least 98% across the versioned corpus, with no verifier below 95%.
6. The safe listener-cleanup example does not produce a leak finding.
7. Detector definitions, tests, fixtures, generated files, mirrors, and temporary files do not contaminate default results.
8. The full installed-verifier sweep completes within five seconds on the target environment.
9. Warm investigations complete within one second at p95.
10. Canonical output is byte-identical across the 100-run determinism battery.
11. Partial analysis is visibly distinct from no verified findings.
12. Source never leaves the local machine and scanned code is never executed.
13. Operational failures use valid `PB-ERR-v1` encoding.
14. The active schema contract ratifies the investigation artifact before machine-readable exports ship.
15. Clerical RAID graduation always requires an explicit human-confirmed proposal and a separate persistence action.
16. The existing QBIT enrichment path derives from, rather than competes with, the canonical evidence report.
17. Fragmented probe scripts are either retired or clearly reclassified as laboratory benchmarks.
18. The predecessor PDR is marked superseded only after this PDR is approved.
19. A future web interface can consume the report without duplicating the analysis engine.
20. A PIR records the implementation reality, performance evidence, accepted tradeoffs, and any deferred verifier families.

---

## Approval Gate

Approval of this PDR authorizes implementation planning, not implementation itself. The required next artifact is a detailed implementation plan that respects schema ratification, agent ownership, test ownership, file locks, and the phased acceptance gates above.

**Law evolution evaluation:** The current Vaelrix Law already covers determinism, schema authority, security, bytecode errors, evidence, PDR archival, and PIR reporting for this work. This design reveals no law gap requiring a `LAW_UPDATE_PROPOSAL` before planning.
