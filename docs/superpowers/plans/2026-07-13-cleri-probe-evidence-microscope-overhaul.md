# Cleri Probe Evidence Microscope Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Cleri Probe's similarity-first experiment with a precision-first, CLI-native investigation workbench that turns a human bug hypothesis into reproducible, structurally verified findings with explicit counterchecks, coverage, limitations, and remediation guidance.

**Architecture:** A thin CLI calls one runtime. The runtime composes filesystem and parser services with pure core planning, retrieval, verifier, evidence-ledger, and report modules. Similarity may nominate candidates but may never verify a finding. Every exported report conforms to SCHOL-CLERI-PROBE-v2, is deterministically checksummed, and can later be consumed unchanged by QBIT or a web adapter.

**Tech Stack:** Node.js ESM, Vitest 4, @babel/parser 7.29, @babel/traverse 7.29, existing Protein Probe/Clerical RAID/QBIT/PixelBrain primitives, Markdown schema and operator documentation.

## Global Constraints

- This plan implements the approved PDR at docs/scholomance-encyclopedia/PDR-archive/2026-07-13-cleri-probe-evidence-microscope-overhaul-pdr.md.
- Preserve unrelated working-tree changes, especially current edits in scripts/cleri-probe.js and codex/core/immunity/protein-probe.engine.js. Before each task, inspect git diff for every listed file and merge deliberately.
- Do not execute repository source during analysis. Parsing, indexing, and verification are read-only.
- Do not add a cloud or LLM dependency.
- Do not auto-edit source and do not write to Clerical RAID. Phase 4 produces a reviewable proposal only.
- Core modules may not access process, fs, os, performance, or the network. Services own I/O; runtime owns orchestration and budgets; CLI owns presentation and exit codes.
- A candidate score is never a finding verdict. Only a registered structural verifier may emit verdict VERIFIED.
- All arrays that participate in identity are sorted before hashing. Absolute paths, timestamps, durations, terminal state, and cache state are excluded from checksums.
- Human output may include redacted excerpts. JSON omits source text unless --include-source is supplied. Bytecode identifies the report and never replaces its evidence.
- Operational failures use the approved PB-ERR-v1 encoder. Verified pathologies are report data, not exceptions.
- Use existing dependencies. Do not add a package without a separate approval.
- Use fixture-local temporary directories in tests. Never write test caches to the operator's real home directory.
- A verifier does not ship unless its labeled corpus reaches at least 95 percent precision. The aggregate verifier set must reach at least 98 percent precision.
- Before registration, each verifier test must mutate every supporting predicate and every countercheck, run at least 25 byte-identical repetitions, exercise hostile/unsupported syntax, and assert its fixture-scale runtime budget.
- Keep warm p95 at or below 1 second, incremental p95 at or below 500 ms, cold process with valid index at or below 3 seconds, and full repository sweep at or below 5 seconds on the documented reference machine.
- Produce byte-identical canonical reports for 100 repeated runs over identical inputs.
- After every task, run the focused test shown, then the nearest affected suite. Commit only the paths named in that task.

---

## Target File Map

### Core

- Create codex/core/immunity/cleri-probe/contracts.js — enums, normalizers, immutable evidence primitives, source-span validation, status derivation, and exit-neutral report types.
- Create codex/core/immunity/cleri-probe/canonical-report.js — stable serialization, fingerprints, report/finding identifiers, checksum verification, and PB-CLERI report identity.
- Create codex/core/immunity/cleri-probe/planner.js — deterministic hypothesis normalization and investigation-plan compilation.
- Create codex/core/immunity/cleri-probe/verifier-registry.js — verifier registration, selection, versioning, and result validation.
- Create codex/core/immunity/cleri-probe/retrieval.js — deterministic candidate merge/rank logic; no parsing or I/O.
- Create codex/core/immunity/cleri-probe/remediation.js — canonical remediation lookup backed by existing repair recommendations.
- Create codex/core/immunity/cleri-probe/graduation-proposal.js — immutable human feedback and antigen proposal artifacts with no persistence authority.
- Create codex/core/immunity/cleri-probe/verifiers/unseeded-randomness.verifier.js.
- Create codex/core/immunity/cleri-probe/verifiers/listener-lifecycle.verifier.js.
- Create codex/core/immunity/cleri-probe/verifiers/swallowed-error.verifier.js.
- Create codex/core/immunity/cleri-probe/verifiers/external-response.verifier.js.
- Create codex/core/immunity/cleri-probe/verifiers/concurrent-mutation.verifier.js.

### Services and runtime

- Create codex/services/cleri-probe/babel-facts.adapter.js — JS/JSX/TS/TSX parsing into normalized structural facts.
- Create codex/services/cleri-probe/substrate.service.js — bounded, sorted, repository-relative source loading.
- Create codex/services/cleri-probe/index.repository.js — disposable content-addressed cache with atomic writes.
- Create codex/services/cleri-probe/context.service.js — law, ownership, RAID, and repair-reference enrichment.
- Create codex/runtime/cleri-probe/investigation.runtime.js — plan, load, index, retrieve, verify, enrich, and report orchestration.

### CLI and compatibility

- Refactor scripts/cleri-probe.js — shebang and main invocation only.
- Create scripts/cleri-probe/args.js — command and option parsing.
- Create scripts/cleri-probe/render-human.js — terminal investigation plan and evidence cards.
- Create scripts/cleri-probe/commands.js — investigate, explain, verify, detectors, benchmark, and graduate dispatch.
- Modify codex/core/diagnostic/QbitProbeEnrichment.js — derive bounded hotspots from verified reports instead of raw similarity when the new runtime is selected.
- Preserve package.json script cleri:probe unless the executable path changes.

### QA and documentation

- Create tests/qa/cleri-probe/ with focused unit, integration, CLI, determinism, security, accuracy, and performance suites.
- Create tests/qa/fixtures/cleri-probe/manifest.json and labeled positive/hard-negative source fixtures.
- Create tests/qa/fixtures/cleri-probe/legacy-prion-baseline.json — deterministic baseline for the existing 15 archetypes and known inversion/self-contamination failures.
- Create docs/tooling/cleri-probe.md — operator guide.
- Create docs/tooling/cleri-probe-verifier-authoring.md — verifier contract and corpus gate.
- Rename laboratory scripts only after their measurement value is captured by tests; do not delete them in the same commit as the runtime refactor.

---

### Task 1: Ratify SCHOL-CLERI-PROBE-v2 Before Exporting Artifacts

**Files:**

- Modify: docs/scholomance-encyclopedia/Scholomance LAW/SCHEMA_CONTRACT.md
- Modify: docs/scholomance-encyclopedia/Scholomance LAW/AGENTS.md only if its schema-version table requires a pointer
- Test: docs/scholomance-encyclopedia/tools/audit-hygiene.mjs

- [ ] **Step 1: Record the current schema baseline**

Run:

    rg -n "SCHOL-CLERI-PROBE|QbitProbeEnrichmentArtifact|SCHEMA CHANGE NOTICE" "docs/scholomance-encyclopedia/Scholomance LAW/SCHEMA_CONTRACT.md"

Expected: QbitProbeEnrichmentArtifact exists; SCHOL-CLERI-PROBE-v2 does not.

- [ ] **Step 2: Add the schema change notice and exact artifact family**

Add a dated SCHEMA CHANGE NOTICE that ratifies:

    export const CLERI_PROBE_CONTRACT = "SCHOL-CLERI-PROBE-v2";
    export const CLERI_PROBE_SCHEMA_VERSION = "2.0.0";

The contract must define CleriInvestigationPlan, CleriCandidate, CleriSourceSpan, CleriEvidence, CleriRemediationGuide, CleriFinding, CleriCoverage, and CleriInvestigationReport with the exact minimum fields in PDR section 9. It must explicitly state:

    verdict = "VERIFIED"
    status = "NO_VERIFIED_FINDINGS" | "VERIFIED_FINDINGS" |
             "INCONCLUSIVE" | "PARTIAL" | "FAILED"
    startLine/startColumn/endLine/endColumn are one-based and inclusive
    QbitProbeEnrichmentArtifact is a derived compatibility view

Document Angel awareness and Codex ownership in the notice. Do not assign new PB-ERR codes; use existing INVALID_FORMAT, INVALID_VALUE, INVARIANT_VIOLATION, and HOOK_TIMEOUT operational codes.

- [ ] **Step 3: Verify schema discoverability**

Run:

    rg -n "SCHOL-CLERI-PROBE-v2|CleriInvestigationReport|PB-CLERI-v2-REPORT" "docs/scholomance-encyclopedia/Scholomance LAW/SCHEMA_CONTRACT.md"

Expected: all three identifiers resolve to the new ratified section.

- [ ] **Step 4: Run documentation hygiene**

Run:

    node docs/scholomance-encyclopedia/tools/audit-hygiene.mjs

Expected: no new error references the schema lines changed by this task. Existing unrelated repository findings are recorded but not repaired here.

- [ ] **Step 5: Commit**

    git add "docs/scholomance-encyclopedia/Scholomance LAW/SCHEMA_CONTRACT.md"
    git add "docs/scholomance-encyclopedia/Scholomance LAW/AGENTS.md"  # only when this task changed its schema-version pointer
    git commit -m "docs(schema): ratify cleri probe evidence contract"

---

### Task 2: Freeze the Accuracy Corpus and Baseline Harness

**Files:**

- Create: tests/qa/fixtures/cleri-probe/manifest.json
- Create: tests/qa/fixtures/cleri-probe/legacy-prion-baseline.json
- Create: tests/qa/fixtures/cleri-probe/unseeded-randomness/verified.js
- Create: tests/qa/fixtures/cleri-probe/unseeded-randomness/hard-negative.js
- Create: tests/qa/fixtures/cleri-probe/listener-lifecycle/verified.jsx
- Create: tests/qa/fixtures/cleri-probe/listener-lifecycle/hard-negative.jsx
- Create: tests/qa/fixtures/cleri-probe/swallowed-error/verified.js
- Create: tests/qa/fixtures/cleri-probe/swallowed-error/hard-negative.js
- Create: tests/qa/fixtures/cleri-probe/external-response/verified.js
- Create: tests/qa/fixtures/cleri-probe/external-response/hard-negative.js
- Create: tests/qa/fixtures/cleri-probe/concurrent-mutation/verified.js
- Create: tests/qa/fixtures/cleri-probe/concurrent-mutation/hard-negative.js
- Create: tests/qa/cleri-probe/corpus.test.js
- Create: scripts/cleri-probe/benchmark-baseline.js
- Create: docs/tooling/cleri-probe-baseline-2026-07-13.md

- [ ] **Step 1: Write the failing corpus-integrity test**

    import { describe, expect, it } from "vitest";
    import fs from "node:fs";

    const manifest = JSON.parse(fs.readFileSync(
      new URL("../fixtures/cleri-probe/manifest.json", import.meta.url),
      "utf8"
    ));

    describe("Cleri Probe accuracy corpus", () => {
      it("has a verified and hard-negative case for every initial verifier", () => {
        const families = new Set(manifest.cases.map(item => item.pathologyClass));
        expect([...families].sort()).toEqual([
          "CONCURRENT_SHARED_STATE_MUTATION",
          "LEAKED_LISTENER_SUBSCRIPTION",
          "SWALLOWED_ERROR",
          "UNSAFE_EXTERNAL_RESPONSE_ACCESS",
          "UNSEEDED_RANDOMNESS"
        ]);
        for (const family of families) {
          const cases = manifest.cases.filter(item => item.pathologyClass === family);
          expect(cases.some(item => item.expected === "VERIFIED")).toBe(true);
          expect(cases.some(item => item.expected === "NO_FINDING")).toBe(true);
        }
      });
    });

- [ ] **Step 2: Run the test and confirm the missing-manifest failure**

Run:

    npx vitest run tests/qa/cleri-probe/corpus.test.js

Expected: FAIL because manifest.json does not exist.

- [ ] **Step 3: Add labeled fixtures and a deterministic manifest**

Each manifest case must contain only:

    {
      "id": "listener-react-effect-missing-cleanup",
      "pathologyClass": "LEAKED_LISTENER_SUBSCRIPTION",
      "path": "listener-lifecycle/verified.jsx",
      "expected": "VERIFIED",
      "expectedLine": 5,
      "notes": "useEffect registers window resize without matching cleanup"
    }

Sort cases by id. Include at least four cases per family at foundation time: one clear positive, one real-world positive copied into a minimal fixture, one direct hard negative, and one adversarial hard negative. Add every later false positive as a hard negative before changing a verifier.

legacy-prion-baseline.json must enumerate all 15 current archetype ids, their current top-k results, and the known 2026-07-13 failures: scripts/cleri-probe.js self-contamination and the safe listener cleanup ranking above the actual leak. It is a truth-baseline artifact, not an acceptance oracle for the replacement engine.

- [ ] **Step 4: Capture the current tool baseline**

Implement benchmark-baseline.js as read-only instrumentation around the current CLI engine. It emits sorted JSON with file count, query duration, prion duration, top paths, and fixture ranking; it does not assert future gates.

Run:

    node scripts/cleri-probe/benchmark-baseline.js --json

Expected: valid JSON containing currentProcessMs, currentPrionMs, scannedFiles, and listenerFixtureRanking.

Record the reproducible results in docs/tooling/cleri-probe-baseline-2026-07-13.md. Give the current source filtering, IDF weighting, 4096-dimension float vectors, raw cosine score, and prion presence/absence logic one disposition each: RETAIN_FOR_RETRIEVAL, REWORK, or REJECT. Include measured top-k recall, precision, and false-positive distribution; do not treat current resonance as proof.

- [ ] **Step 5: Run and commit**

    npx vitest run tests/qa/cleri-probe/corpus.test.js
    git add tests/qa/fixtures/cleri-probe tests/qa/cleri-probe/corpus.test.js scripts/cleri-probe/benchmark-baseline.js docs/tooling/cleri-probe-baseline-2026-07-13.md
    git commit -m "test(cleri-probe): freeze labeled accuracy corpus"

---

### Task 3: Implement Immutable Contracts and Canonical Report Identity

**Files:**

- Create: codex/core/immunity/cleri-probe/contracts.js
- Create: codex/core/immunity/cleri-probe/canonical-report.js
- Create: tests/qa/cleri-probe/contracts.test.js
- Create: tests/qa/cleri-probe/canonical-report.test.js

- [ ] **Step 1: Write failing contract tests**

    import { describe, expect, it } from "vitest";
    import {
      EVIDENCE_KINDS,
      REPORT_STATUSES,
      createEvidence,
      createSourceSpan,
      deriveReportStatus
    } from "../../../codex/core/immunity/cleri-probe/contracts.js";

    describe("Cleri Probe contracts", () => {
      it("normalizes one-based inclusive spans and freezes them", () => {
        const span = createSourceSpan({
          path: "./src\\probe.js", startLine: 2, startColumn: 3,
          endLine: 2, endColumn: 11, symbol: "probe",
          excerptDigest: "sha256:abc"
        });
        expect(span.path).toBe("src/probe.js");
        expect(Object.isFrozen(span)).toBe(true);
      });

      it("rejects inverted or zero-based spans", () => {
        expect(() => createSourceSpan({
          path: "a.js", startLine: 0, startColumn: 1,
          endLine: 1, endColumn: 1, symbol: null, excerptDigest: "sha256:x"
        })).toThrow(/one-based/);
      });

      it("derives honest terminal statuses", () => {
        expect(deriveReportStatus({ findings: [], coverageComplete: true }))
          .toBe(REPORT_STATUSES.NO_VERIFIED_FINDINGS);
        expect(deriveReportStatus({ findings: [{}], coverageComplete: true }))
          .toBe(REPORT_STATUSES.VERIFIED_FINDINGS);
      });

      it("accepts only the four evidence kinds", () => {
        expect(EVIDENCE_KINDS).toEqual([
          "SUPPORTING", "COUNTERCHECK", "LIMITATION", "COVERAGE"
        ]);
        expect(() => createEvidence({ kind: "SCORE" })).toThrow(/evidence kind/);
      });
    });

- [ ] **Step 2: Run and confirm module-not-found failures**

    npx vitest run tests/qa/cleri-probe/contracts.test.js tests/qa/cleri-probe/canonical-report.test.js

Expected: FAIL because both core modules are absent.

- [ ] **Step 3: Implement contract constructors**

Export frozen arrays/constants and these exact functions:

    normalizeRepositoryPath(value)
    createSourceSpan(input)
    createEvidence(input)
    createCoverage(input)
    createFinding(input)
    deriveReportStatus({ findings, coverageComplete, parserFailures, failed })

All constructors return recursively frozen data. Finding construction rejects verdicts other than VERIFIED, empty supportingEvidence, missing counterEvidenceChecked, and unsorted lawRefs/raidRefs.

- [ ] **Step 4: Implement deterministic identity**

canonical-report.js exports:

    stableClone(value)
    stableStringify(value)
    sha256Hex(value)
    fingerprintSubstrate(files)
    fingerprintConfiguration(config)
    buildFindingId(finding)
    buildInvestigationReport(input)
    checksumInvestigationReport(report)
    encodeCleriReportIdentity(report)
    verifyInvestigationReport(report)

Use node:crypto only for SHA-256; the module remains pure because hashing has no external state. Build the checksum over the report with bytecode and checksum omitted. Build reportId from normalized hypothesis, normalized scope, substrate fingerprint, configuration fingerprint, verifier versions, findings, and coverage. Emit:

    PB-CLERI-v2-REPORT-<reportId>-<first12SubstrateHash>-<first12Checksum>

The report builder sorts findings by path, line, column, pathologyClass, and findingId. It excludes runtime metadata from canonical output.

- [ ] **Step 5: Add determinism and tamper tests**

Test that reversed input file order produces the same substrate fingerprint, that 100 report builds serialize byte-identically, that absolute repository roots never appear, and that changing an evidence predicate makes verification fail.

- [ ] **Step 6: Run and commit**

    npx vitest run tests/qa/cleri-probe/contracts.test.js tests/qa/cleri-probe/canonical-report.test.js
    git add codex/core/immunity/cleri-probe/contracts.js codex/core/immunity/cleri-probe/canonical-report.js tests/qa/cleri-probe/contracts.test.js tests/qa/cleri-probe/canonical-report.test.js
    git commit -m "feat(cleri-probe): add canonical evidence report"

---

### Task 4: Compile a Visible Investigation Plan and Verifier Registry

**Files:**

- Create: codex/core/immunity/cleri-probe/planner.js
- Create: codex/core/immunity/cleri-probe/verifier-registry.js
- Create: tests/qa/cleri-probe/planner.test.js
- Create: tests/qa/cleri-probe/verifier-registry.test.js

- [ ] **Step 1: Write failing planner tests**

    import { describe, expect, it } from "vitest";
    import { compileInvestigationPlan } from "../../../codex/core/immunity/cleri-probe/planner.js";

    describe("compileInvestigationPlan", () => {
      it("maps a listener hypothesis to a visible deterministic plan", () => {
        const plan = compileInvestigationPlan(
          "leaked event listener inside React useEffect",
          { paths: ["src"] }
        );
        expect(plan.pathologyClasses).toEqual(["LEAKED_LISTENER_SUBSCRIPTION"]);
        expect(plan.verifierIds).toEqual(["listener-lifecycle/v1"]);
        expect(plan.counterchecks).toContain("MATCHING_EFFECT_CLEANUP");
        expect(plan.paths).toEqual(["src"]);
      });

      it("marks unsupported hypotheses inconclusive before scanning", () => {
        const plan = compileInvestigationPlan("the UI feels haunted", {});
        expect(plan.supported).toBe(false);
        expect(plan.reasonCode).toBe("NO_REGISTERED_PATHOLOGY_CLASS");
      });
    });

- [ ] **Step 2: Run and confirm failure**

    npx vitest run tests/qa/cleri-probe/planner.test.js tests/qa/cleri-probe/verifier-registry.test.js

Expected: FAIL because planner.js and verifier-registry.js do not exist.

- [ ] **Step 3: Implement normalized pathology lexicon**

Use a frozen, versioned profile:

    {
      profileId: "scholomance/default",
      version: "1.0.0",
      pathologies: [
        {
          pathologyClass: "LEAKED_LISTENER_SUBSCRIPTION",
          verifierId: "listener-lifecycle/v1",
          terms: ["event listener", "listener leak", "subscription leak", "useeffect cleanup"],
          counterchecks: ["MATCHING_EFFECT_CLEANUP", "CAPTURED_UNSUBSCRIBE"]
        }
      ]
    }

Provide corresponding entries for the other four initial classes. Normalize Unicode, case, whitespace, and punctuation. Sort all selected values. Do not infer unsupported classes from vector proximity.

- [ ] **Step 4: Implement registry validation**

The registry accepts verifier objects with:

    {
      id: "listener-lifecycle/v1",
      pathologyClass: "LEAKED_LISTENER_SUBSCRIPTION",
      version: "1.0.0",
      retrieveHints(plan),
      verify(candidate, context)
    }

Reject duplicate ids, duplicate class/version pairs, mutable metadata, async core verifiers, malformed evidence, and any result whose verdict is not VERIFIED or NO_FINDING. Expose registerVerifier, createVerifierRegistry, selectVerifiers, and validateVerifierResult.

- [ ] **Step 5: Run and commit**

    npx vitest run tests/qa/cleri-probe/planner.test.js tests/qa/cleri-probe/verifier-registry.test.js
    git add codex/core/immunity/cleri-probe/planner.js codex/core/immunity/cleri-probe/verifier-registry.js tests/qa/cleri-probe/planner.test.js tests/qa/cleri-probe/verifier-registry.test.js
    git commit -m "feat(cleri-probe): compile deterministic investigation plans"

---

### Task 5: Parse Source into Normalized Structural Facts

**Files:**

- Create: codex/services/cleri-probe/babel-facts.adapter.js
- Create: tests/qa/cleri-probe/babel-facts.adapter.test.js

- [ ] **Step 1: Write failing adapter tests**

    import { describe, expect, it } from "vitest";
    import { parseSourceFacts } from "../../../codex/services/cleri-probe/babel-facts.adapter.js";

    describe("parseSourceFacts", () => {
      it("captures lifecycle, catch, response, and concurrency facts", () => {
        const result = parseSourceFacts({
          path: "src/example.tsx",
          content: [
            "useEffect(() => {",
            "  window.addEventListener('resize', onResize);",
            "}, []);",
            "try { await work(); } catch (error) { console.error(error); }",
            "const response = await fetch(url);",
            "return response.json();",
            "await Promise.all(items.map(async item => { shared.push(item); }));"
          ].join("\n")
        });
        expect(result.ok).toBe(true);
        expect(result.calls.some(call => call.callee === "window.addEventListener")).toBe(true);
        expect(result.catchClauses).toHaveLength(1);
        expect(result.concurrentCallbacks).toHaveLength(1);
      });

      it("returns a diagnostic instead of throwing on invalid syntax", () => {
        const result = parseSourceFacts({ path: "broken.js", content: "const = ;" });
        expect(result.ok).toBe(false);
        expect(result.diagnostics[0].code).toBe("PARSE_FAILED");
      });
    });

- [ ] **Step 2: Run and confirm module-not-found**

    npx vitest run tests/qa/cleri-probe/babel-facts.adapter.test.js

Expected: FAIL because the adapter does not exist.

- [ ] **Step 3: Implement the normalized fact model**

Use @babel/parser and @babel/traverse with sourceType unambiguous and plugins typescript, jsx, classProperties, objectRestSpread, optionalChaining, dynamicImport, topLevelAwait, and decorators-legacy. Return recursively frozen facts:

    {
      ok, path, contentHash,
      functions: [{ id, name, span, parentFunctionId, async }],
      calls: [{ id, callee, receiver, argumentKinds, functionId, span }],
      effects: [{ id, hook, callbackFunctionId, returnFunctionId, span }],
      catchClauses: [{ id, functionId, bodyStatementKinds, calls, throws, returns, span }],
      bindings: [{ id, name, kind, functionId, declarationSpan }],
      writes: [{ bindingId, operation, functionId, concurrentCallbackId, span }],
      externalRequests: [{ bindingId, client, functionId, span }],
      guards: [{ bindingId, kind, functionId, span }],
      concurrentCallbacks: [{ id, primitive, functionId, callbackFunctionId, span }],
      diagnostics: []
    }

Member names are canonical dotted strings. Source spans use the core constructor. Store excerpt digests, not excerpts.

- [ ] **Step 4: Add equivalence and resilience tests**

Assert stable facts for LF versus CRLF, identifier renaming where semantics are unchanged, TypeScript annotations, JSX, optional chaining, anonymous callbacks, destructuring, and parse failure. Assert that comments containing addEventListener or Math.random produce no call facts.

- [ ] **Step 5: Run and commit**

    npx vitest run tests/qa/cleri-probe/babel-facts.adapter.test.js
    git add codex/services/cleri-probe/babel-facts.adapter.js tests/qa/cleri-probe/babel-facts.adapter.test.js
    git commit -m "feat(cleri-probe): normalize source into structural facts"

---

### Task 6: Build a Bounded Substrate Loader and Disposable Index

**Files:**

- Create: codex/services/cleri-probe/substrate.service.js
- Create: codex/services/cleri-probe/index.repository.js
- Create: tests/qa/cleri-probe/substrate.service.test.js
- Create: tests/qa/cleri-probe/index.repository.test.js

- [ ] **Step 1: Write failing security-first tests**

Test these exact behaviors:

    resolveScope({ root, paths: ["src"] }) returns sorted repository-relative files
    resolveScope({ root, paths: ["../outside"] }) throws PB-ERR INVALID_VALUE
    symlink escaping root is skipped with reason SYMLINK_OUTSIDE_ROOT
    default exclusions omit .git, node_modules, dist, coverage, docs, generated output
    --include-tests and --include-generated opt in explicitly
    files larger than maxFileBytes are skipped with reason FILE_TOO_LARGE
    cache corruption returns a miss and deletes only the corrupt entry

- [ ] **Step 2: Run and confirm failure**

    npx vitest run tests/qa/cleri-probe/substrate.service.test.js tests/qa/cleri-probe/index.repository.test.js

Expected: FAIL because both services are absent.

- [ ] **Step 3: Implement deterministic scope loading**

Export createSubstrateService with injected fs, root, and limits. It supports .js, .jsx, .ts, .tsx, .mjs, and .cjs; normalizes real paths; refuses root escape; sorts directory entries before traversal; returns:

    {
      rootFingerprint,
      requestedPaths,
      files: [{ path, content, contentHash, bytes }],
      skipped: [{ path, reasonCode }]
    }

No returned value contains the absolute root.

Production cache discovery defaults to:

    path.join(
      process.env.XDG_CACHE_HOME || path.join(os.homedir(), ".cache"),
      "scholomance",
      "cleri-probe",
      repositoryFingerprint
    )

Keep that environment lookup in the service composition root. Unit tests always inject cacheDir.

- [ ] **Step 4: Implement the content-addressed index**

Export createIndexRepository with injected cacheDir and fs. The key is:

    sha256(contract + parserVersion + profileVersion + repositoryFingerprint)

Each file entry is keyed by repository-relative path plus contentHash. Write a temporary file, fsync it, and rename atomically. Validate contract, version, checksum, and root fingerprint on read. Cache state is advisory; the same input must produce the same report on a miss or hit.

- [ ] **Step 5: Add cache equivalence and malicious-input tests**

Cover corrupt JSON, valid JSON with wrong checksum, stale parser version, symlink loops, unreadable files, a path named with terminal escape characters, and two roots containing identical relative source. Assert safe skips and byte-identical fact records.

- [ ] **Step 6: Run and commit**

    npx vitest run tests/qa/cleri-probe/substrate.service.test.js tests/qa/cleri-probe/index.repository.test.js
    git add codex/services/cleri-probe/substrate.service.js codex/services/cleri-probe/index.repository.js tests/qa/cleri-probe/substrate.service.test.js tests/qa/cleri-probe/index.repository.test.js
    git commit -m "feat(cleri-probe): add bounded substrate index"

---

### Task 7: Retrieve Candidates Without Confusing Rank with Proof

**Files:**

- Create: codex/core/immunity/cleri-probe/retrieval.js
- Create: tests/qa/cleri-probe/retrieval.test.js

- [ ] **Step 1: Write failing retrieval tests**

    import { describe, expect, it } from "vitest";
    import { mergeCandidates } from "../../../codex/core/immunity/cleri-probe/retrieval.js";

    describe("mergeCandidates", () => {
      it("deduplicates and deterministically ranks independent nominations", () => {
        const result = mergeCandidates([
          { path: "b.js", factId: "c2", source: "VECTOR", score: 0.99 },
          { path: "a.js", factId: "c1", source: "STRUCTURAL", score: 1 },
          { path: "a.js", factId: "c1", source: "LITERAL", score: 1 }
        ], { limit: 10 });
        expect(result.map(item => item.path)).toEqual(["a.js", "b.js"]);
        expect(result[0].nominators).toEqual(["LITERAL", "STRUCTURAL"]);
        expect(result[0]).not.toHaveProperty("verdict");
      });
    });

- [ ] **Step 2: Run and confirm failure**

    npx vitest run tests/qa/cleri-probe/retrieval.test.js

Expected: FAIL because retrieval.js does not exist.

- [ ] **Step 3: Implement candidate merging**

Candidate identity is path + factId + pathologyClass. Merge literal, structural, token, prion, and optional vector nominations. Sort by:

    structural nomination descending
    literal nomination descending
    number of independent nominators descending
    bounded candidate score descending
    path ascending
    start line ascending
    fact id ascending

Candidate objects expose retrievalReason, nominators, score, span, and factId. They never expose verdict, confidence-as-proof, or remediation.

- [ ] **Step 4: Keep Protein Probe behind an adapter boundary**

Keep the adapter in retrieval.js and call the existing vectorizeHypothesis, buildIdfIndex, and scanSubstrate exports. Do not modify protein-probe.engine.js in this task. Do not make vector dimensionality or resonance part of canonical finding identity. Add a regression test showing the controlled listener hard negative may rank highly but cannot be verified by retrieval alone.

- [ ] **Step 5: Add known-positive recall gate**

Against the corpus manifest, assert at least 90 percent of known positives appear in the top configured candidate set. Record recall separately from verifier precision.

- [ ] **Step 6: Run and commit**

    npx vitest run tests/qa/cleri-probe/retrieval.test.js
    git add codex/core/immunity/cleri-probe/retrieval.js tests/qa/cleri-probe/retrieval.test.js
    git commit -m "feat(cleri-probe): separate candidate retrieval from proof"

---

### Task 8: Deliver the First End-to-End Investigation Runtime and CLI

**Files:**

- Create: codex/runtime/cleri-probe/investigation.runtime.js
- Create: scripts/cleri-probe/args.js
- Create: scripts/cleri-probe/render-human.js
- Create: scripts/cleri-probe/commands.js
- Modify: scripts/cleri-probe.js
- Create: tests/qa/cleri-probe/investigation.runtime.test.js
- Create: tests/qa/cleri-probe/cli.test.js

- [ ] **Step 1: Write failing runtime and CLI tests**

The runtime test injects substrate, index, parser, registry, and clock adapters and asserts the exact phase order:

    PLAN, LOAD, INDEX, RETRIEVE, VERIFY, ENRICH, REPORT

The CLI test invokes the executable with:

    node scripts/cleri-probe.js investigate "leaked listener" --scope fixture --format json

It expects stdout to be one parseable SCHOL-CLERI-PROBE-v2 object and stderr to contain no debug output.

- [ ] **Step 2: Run and confirm failure**

    npx vitest run tests/qa/cleri-probe/investigation.runtime.test.js tests/qa/cleri-probe/cli.test.js

Expected: FAIL because the new runtime and CLI helpers do not exist.

- [ ] **Step 3: Implement orchestration with injected budgets**

Export createInvestigationRuntime(dependencies).investigate(request). The request includes:

    {
      hypothesis,
      scopes,
      excludes,
      profile,
      detectorIds,
      includeTests,
      includeGenerated,
      planOnly,
      noCache,
      maxFiles,
      maxFileBytes,
      maxCandidates,
      maxRuntimeMs,
      signal
    }

The runtime checks cancellation and budget between files and phases. Parser failures become coverage entries. Unsupported hypotheses become INCONCLUSIVE without walking the repository. A budget expiry returns PARTIAL with analyzed coverage and a PB-ERR-v1 HOOK_TIMEOUT diagnostic. Runtime duration is returned in a separate operational envelope, never inside the canonical report.

Inject a synthetic verifier in the runtime test and prove the complete plan-to-report lifecycle before registering any production verifier. Its report must be byte-identical across 100 runs.

- [ ] **Step 4: Implement strict argument parsing and exit semantics**

Supported commands:

    investigate <hypothesis>
    explain <finding-id> --report <report-path>
    verify <finding-id> --report <report-path>
    detectors [--json]
    benchmark [--detector <id>]
    graduate <finding-id> --report <report-path> --proposal <output-path>

Foundation ships investigate, detectors, and benchmark; explain, verify, and graduate initially return an explicit NOT_AVAILABLE_IN_PHASE diagnostic until their tasks land. Unknown options and missing values are PB-ERR INVALID_FORMAT failures.

detectors prints each installed id, version, pathology class, supporting predicates, counterchecks, and declared limitations. --json emits the same list in stable id order without terminal decoration.

The stable investigate options are:

    --scope <repository-relative-path>       repeatable
    --exclude <glob>                        repeatable
    --include-tests
    --include-generated
    --detector <id>                         repeatable
    --plan-only
    --format human|json|bytecode
    --output <path>
    --include-source
    --no-cache
    --no-color
    --fail-on-findings

Honor NO_COLOR. Validate numeric budgets and repository-relative scopes by allow list. --plan-only compiles and renders the plan without invoking substrate, index, parser, retrieval, or verifier adapters.

Exit codes:

    0 = complete with or without verified findings
    1 = verified findings and --fail-on-findings supplied
    2 = operational failure
    3 = partial or inconclusive

- [ ] **Step 5: Render a visible human plan**

Human output prints original and normalized hypothesis, normalized scopes, selected pathology classes, required supporting predicates, verifier ids and versions, counterchecks, unsupported clauses, default exclusions, explicit inclusions, expected coverage limitations, then one card per VERIFIED finding. It prints NO VERIFIED FINDINGS only when coverage.complete is true. It sanitizes ANSI/control characters and redacts tokens, passwords, bearer values, private keys, and high-entropy assignments.

- [ ] **Step 6: Run and commit**

Before staging scripts/cleri-probe.js, compare its pre-task diff and carry valid source filtering/IDF retrieval behavior into the retrieval service. Do not silently discard pre-existing investigator work.

    npx vitest run tests/qa/cleri-probe/investigation.runtime.test.js tests/qa/cleri-probe/cli.test.js
    node scripts/cleri-probe.js investigate "the UI feels haunted" --scope scripts
    git add codex/runtime/cleri-probe scripts/cleri-probe.js scripts/cleri-probe tests/qa/cleri-probe/investigation.runtime.test.js tests/qa/cleri-probe/cli.test.js
    git commit -m "feat(cleri-probe): add evidence-first investigation CLI"

---

### Task 9: Ship the Unseeded Randomness Verifier

**Files:**

- Create: codex/core/immunity/cleri-probe/verifiers/unseeded-randomness.verifier.js
- Create: tests/qa/cleri-probe/verifiers/unseeded-randomness.test.js
- Modify: codex/core/immunity/cleri-probe/verifier-registry.js

- [ ] **Step 1: Write failing positive and counterexample tests**

Verify Math.random() only when it occurs inside a symbol or path explicitly classified deterministic by the Scholomance profile. Assert NO_FINDING for tests, docs, UI atmosphere/effects, comments, string literals, seeded RNG adapters, and an adjacent IMMUNE_ALLOW: math-random annotation.

- [ ] **Step 2: Run and confirm failure**

    npx vitest run tests/qa/cleri-probe/verifiers/unseeded-randomness.test.js

Expected: FAIL because the verifier is not registered.

- [ ] **Step 3: Implement exact predicates**

Supporting predicates:

    CALL_IS_MATH_RANDOM
    SYMBOL_IS_DETERMINISTIC_AUTHORITY

Mandatory counterchecks:

    NOT_TEST_OR_DOCUMENTATION
    NOT_UI_ATMOSPHERE
    NO_APPROVED_IMMUNE_ALLOW
    NO_SEEDED_RNG_ADAPTER

Emit one VERIFIED finding per call span only when every supporting predicate is observed and every countercheck passes. Map remediation to the existing seeded-random repair recommendation.

- [ ] **Step 4: Run the corpus precision gate**

    npx vitest run tests/qa/cleri-probe/verifiers/unseeded-randomness.test.js tests/qa/cleri-probe/corpus.test.js

Expected: precision at least 95 percent for this family. If not, leave it unregistered and add the false positives as hard negatives.

- [ ] **Step 5: Commit**

    git add codex/core/immunity/cleri-probe/verifiers/unseeded-randomness.verifier.js codex/core/immunity/cleri-probe/verifier-registry.js tests/qa/cleri-probe/verifiers/unseeded-randomness.test.js tests/qa/fixtures/cleri-probe
    git commit -m "feat(cleri-probe): verify deterministic randomness violations"

---

### Task 10: Ship the Listener Lifecycle Verifier

**Files:**

- Create: codex/core/immunity/cleri-probe/verifiers/listener-lifecycle.verifier.js
- Create: tests/qa/cleri-probe/verifiers/listener-lifecycle.test.js
- Modify: codex/core/immunity/cleri-probe/verifier-registry.js

- [ ] **Step 1: Write failing lifecycle tests**

Cover useEffect registrations with no returned cleanup, correct cleanup using the same receiver/event/handler, cleanup with a different handler identity, captured unsubscribe callbacks, once:true listeners, class lifecycle mount/unmount pairs as NO_FINDING until a separate rule supports them, and nested functions that must not be conflated.

- [ ] **Step 2: Run and confirm failure**

    npx vitest run tests/qa/cleri-probe/verifiers/listener-lifecycle.test.js

Expected: FAIL because the verifier does not exist.

- [ ] **Step 3: Implement conservative React effect proof**

Supporting predicates:

    EFFECT_CALLBACK_REGISTERS_LISTENER_OR_SUBSCRIPTION
    REGISTRATION_IDENTITY_IS_STABLE

Counterchecks:

    MATCHING_REMOVE_IN_RETURNED_CLEANUP
    CAPTURED_UNSUBSCRIBE_CALLED_IN_CLEANUP
    REGISTRATION_IS_SELF_TERMINATING

Match receiver, event literal, handler binding, and effect callback identity. A remove call elsewhere in the file is not counterevidence. Start with React useEffect only; unsupported lifecycle forms remain limitations, not findings.

- [ ] **Step 4: Run precision gate**

    npx vitest run tests/qa/cleri-probe/verifiers/listener-lifecycle.test.js tests/qa/cleri-probe/corpus.test.js

Expected: at least 95 percent precision and the historical equipment-changed leak fixture VERIFIED while its fixed form is NO_FINDING.

- [ ] **Step 5: Commit**

    git add codex/core/immunity/cleri-probe/verifiers/listener-lifecycle.verifier.js codex/core/immunity/cleri-probe/verifier-registry.js tests/qa/cleri-probe/verifiers/listener-lifecycle.test.js tests/qa/fixtures/cleri-probe
    git commit -m "feat(cleri-probe): verify effect listener lifecycle leaks"

---

### Task 11: Ship the Swallowed Error Verifier

**Files:**

- Create: codex/core/immunity/cleri-probe/verifiers/swallowed-error.verifier.js
- Create: tests/qa/cleri-probe/verifiers/swallowed-error.test.js
- Modify: codex/core/immunity/cleri-probe/verifier-registry.js

- [ ] **Step 1: Write failing catch-clause tests**

Cover empty catches, logging-only catches, rethrow, wrapped BytecodeError throw, explicit documented fallback return, retry/recovery adapter, catch bindings used only in telemetry, nested throw, and finally blocks.

- [ ] **Step 2: Run and confirm failure**

    npx vitest run tests/qa/cleri-probe/verifiers/swallowed-error.test.js

Expected: FAIL because the verifier does not exist.

- [ ] **Step 3: Implement catch-local control-flow proof**

Supporting predicate:

    CATCH_INTERCEPTS_ERROR

Counterchecks:

    ERROR_RETHROWN
    ERROR_TRANSLATED_TO_BYTECODE_ERROR
    APPROVED_RECOVERY_RETURN
    RETRY_OR_RECOVERY_ADAPTER_CALLED

An empty or logging-only catch is VERIFIED. A return is not automatically healthy: only profile-listed fallback forms with an explicit recovery reason pass. Do not cross function boundaries when evaluating throws or returns.

- [ ] **Step 4: Run precision gate and commit**

    npx vitest run tests/qa/cleri-probe/verifiers/swallowed-error.test.js tests/qa/cleri-probe/corpus.test.js
    git add codex/core/immunity/cleri-probe/verifiers/swallowed-error.verifier.js codex/core/immunity/cleri-probe/verifier-registry.js tests/qa/cleri-probe/verifiers/swallowed-error.test.js tests/qa/fixtures/cleri-probe
    git commit -m "feat(cleri-probe): verify swallowed error paths"

Expected: at least 95 percent family precision.

---

### Task 12: Ship the Unsafe External Response Verifier

**Files:**

- Create: codex/core/immunity/cleri-probe/verifiers/external-response.verifier.js
- Create: tests/qa/cleri-probe/verifiers/external-response.test.js
- Modify: codex/core/immunity/cleri-probe/verifier-registry.js

- [ ] **Step 1: Write failing external-boundary tests**

Cover fetch response.json without response.ok, guarded fetch, zod parse and safeParse, approved adapter normalization, axios data access with and without schema validation, aliasing inside the same function, shadowed response bindings, optional chaining, and a local object named response.

- [ ] **Step 2: Run and confirm failure**

    npx vitest run tests/qa/cleri-probe/verifiers/external-response.test.js

Expected: FAIL because the verifier does not exist.

- [ ] **Step 3: Implement same-function dataflow proof**

Supporting predicates:

    BINDING_ORIGINATES_FROM_APPROVED_EXTERNAL_CLIENT
    EXTERNAL_PAYLOAD_IS_DEREFERENCED

Counterchecks:

    HTTP_STATUS_GUARDED
    PAYLOAD_SCHEMA_PARSED
    APPROVED_NORMALIZATION_ADAPTER_CALLED

Limit v1 clients to global fetch and imported axios identifiers. Track aliases only inside one function. For fetch, require both status handling and payload validation when the payload crosses into domain logic. Unsupported clients produce limitations.

- [ ] **Step 4: Run precision gate and commit**

    npx vitest run tests/qa/cleri-probe/verifiers/external-response.test.js tests/qa/cleri-probe/corpus.test.js
    git add codex/core/immunity/cleri-probe/verifiers/external-response.verifier.js codex/core/immunity/cleri-probe/verifier-registry.js tests/qa/cleri-probe/verifiers/external-response.test.js tests/qa/fixtures/cleri-probe
    git commit -m "feat(cleri-probe): verify unsafe external response access"

Expected: at least 95 percent family precision.

---

### Task 13: Ship the Concurrent Shared-State Mutation Verifier

**Files:**

- Create: codex/core/immunity/cleri-probe/verifiers/concurrent-mutation.verifier.js
- Create: tests/qa/cleri-probe/verifiers/concurrent-mutation.test.js
- Modify: codex/core/immunity/cleri-probe/verifier-registry.js

- [ ] **Step 1: Write failing concurrency tests**

Cover Promise.all with map async callback mutating an outer array/object/counter, callback-local mutation, immutable returned values, writes guarded by an approved synchronization adapter, sequential for...of, shadowed bindings, nested callbacks, and Promise.allSettled.

- [ ] **Step 2: Run and confirm failure**

    npx vitest run tests/qa/cleri-probe/verifiers/concurrent-mutation.test.js

Expected: FAIL because the verifier does not exist.

- [ ] **Step 3: Implement binding-identity proof**

Supporting predicates:

    CALLBACK_EXECUTES_UNDER_CONCURRENT_PRIMITIVE
    WRITE_TARGET_DECLARED_OUTSIDE_CALLBACK
    WRITE_CAN_OCCUR_MORE_THAN_ONCE

Counterchecks:

    TARGET_IS_CALLBACK_LOCAL
    CALLBACK_RETURNS_IMMUTABLE_RESULT
    APPROVED_SYNCHRONIZATION_ADAPTER_GUARDS_WRITE

Support Promise.all and Promise.allSettled over map/filter-derived async callbacks in v1. Do not flag sequential loops or mutation performed after aggregation.

- [ ] **Step 4: Run precision gate and commit**

    npx vitest run tests/qa/cleri-probe/verifiers/concurrent-mutation.test.js tests/qa/cleri-probe/corpus.test.js
    git add codex/core/immunity/cleri-probe/verifiers/concurrent-mutation.verifier.js codex/core/immunity/cleri-probe/verifier-registry.js tests/qa/cleri-probe/verifiers/concurrent-mutation.test.js tests/qa/fixtures/cleri-probe
    git commit -m "feat(cleri-probe): verify concurrent shared-state mutation"

Expected: at least 95 percent family precision.

---

### Task 14: Complete Explain, Verify, Context Enrichment, Remediation, and QBIT Compatibility

**Files:**

- Create: codex/core/immunity/cleri-probe/remediation.js
- Create: codex/services/cleri-probe/context.service.js
- Modify: scripts/cleri-probe/commands.js
- Modify: codex/core/diagnostic/QbitProbeEnrichment.js
- Modify: tests/diagnostic/qbitProbeEnrichment.test.js
- Create: tests/qa/cleri-probe/context.service.test.js
- Create: tests/qa/cleri-probe/report-commands.test.js

- [ ] **Step 1: Write failing adapter and command tests**

Assert:

    verify accepts an untampered report and rejects a changed predicate
    explain resolves report id, finding ids, evidence predicates, and limitations
    automatic context enrichment adds lawRefs, RAID refs, ownership, and remediation without changing verdict
    QBIT hotspots are derived only from VERIFIED findings
    context-service failure preserves the canonical finding and adds a diagnostic

- [ ] **Step 2: Run and confirm failure**

    npx vitest run tests/qa/cleri-probe/context.service.test.js tests/qa/cleri-probe/report-commands.test.js tests/diagnostic/qbitProbeEnrichment.test.js

Expected: FAIL on unavailable commands and new verified-report adapter behavior.

- [ ] **Step 3: Implement remediation and context adapters**

remediation.js maps pathologyClass to existing repair.recommendations.js entries and returns:

    {
      recommendationId,
      summary,
      safePattern,
      unsafePattern,
      verificationSteps,
      autoFixAvailable: false
    }

context.service.js reads law references, ownership boundaries, bytecode categories, immune rules, and Clerical RAID through injected read-only adapters. It sorts and bounds all references. RAID similarity is contextual history, never proof. verificationSteps are selected from an allow-listed command catalog; report content cannot inject shell fragments.

- [ ] **Step 4: Implement report commands**

explain requires a finding id and --report path, validates the report, and renders canonical evidence. verify requires the same arguments, recomputes checksum, reportId, findingIds, and bytecode, then reloads the finding's covered source to detect substrate drift before declaring the evidence reproducible. Both accept --format human|json|bytecode; bytecode format emits the report bytecode plus a verification state, not a source excerpt.

- [ ] **Step 5: Switch QBIT to the canonical adapter**

Add buildQbitHotspotsFromCleriReport(report, options). It validates the report, maps verified findings to bounded hotspots, and keeps duration/cache metadata outside the report. Preserve the legacy injected probe runner behind an explicit legacy option until its callers migrate.

- [ ] **Step 6: Run and commit**

    npx vitest run tests/qa/cleri-probe/context.service.test.js tests/qa/cleri-probe/report-commands.test.js tests/diagnostic/qbitProbeEnrichment.test.js
    git add codex/core/immunity/cleri-probe/remediation.js codex/services/cleri-probe/context.service.js scripts/cleri-probe/commands.js codex/core/diagnostic/QbitProbeEnrichment.js tests/diagnostic/qbitProbeEnrichment.test.js tests/qa/cleri-probe/context.service.test.js tests/qa/cleri-probe/report-commands.test.js
    git commit -m "feat(cleri-probe): complete evidence context and qbit adapter"

---

### Task 15: Add Human-Controlled Graduation Proposals

**Files:**

- Create: codex/core/immunity/cleri-probe/graduation-proposal.js
- Modify: scripts/cleri-probe/commands.js
- Create: tests/qa/cleri-probe/graduation-proposal.test.js

- [ ] **Step 1: Write failing proposal safety tests**

Assert graduation rejects an unverified report, unknown finding, tampered report, missing confirm/reject decision, and missing human rationale. Assert it returns data without writing a file or calling RAID. Assert rejected feedback cannot create an antigen proposal.

- [ ] **Step 2: Run and confirm failure**

    npx vitest run tests/qa/cleri-probe/graduation-proposal.test.js

Expected: FAIL because graduation-proposal.js does not exist.

- [ ] **Step 3: Implement a deterministic proposal**

Export buildFindingFeedback and buildGraduationProposal. The feedback artifact contains sourceReportId, findingId, decision CONFIRM or REJECT, rationale, proposedBy human, and checksum. Only CONFIRM may feed proposal construction.

The proposal contains:

    {
      contract: "SCHOL-CLERI-GRADUATION-PROPOSAL-v1",
      proposalId,
      sourceReportId,
      findingId,
      pathologyClass,
      verifier,
      evidenceDigest,
      remediationId,
      patternPreview,
      beforeBenchmark,
      candidateBenchmark,
      rationale,
      proposedBy: "human",
      approved: false,
      checksum
    }

The command writes the proposal only to the explicit --proposal path. patternPreview is human-readable, evidence-linked, and reproducible from the report. beforeBenchmark and candidateBenchmark compare retrieval impact on the frozen positive/hard-negative corpus; a regression blocks proposal creation.

It never invokes raid_feedback, raid_learning, raid_merlin_ingest, transaction_patch, or any source-write adapter. A future, separately authorized command may persist an approved proposal through the lawful Clerical RAID path; it is outside this plan.

- [ ] **Step 4: Run and commit**

    npx vitest run tests/qa/cleri-probe/graduation-proposal.test.js
    git add codex/core/immunity/cleri-probe/graduation-proposal.js scripts/cleri-probe/commands.js tests/qa/cleri-probe/graduation-proposal.test.js
    git commit -m "feat(cleri-probe): propose human-reviewed immune graduation"

---

### Task 16: Enforce Aggregate Accuracy, Determinism, Security, and Performance Gates

**Files:**

- Create: tests/qa/cleri-probe/accuracy.test.js
- Create: tests/qa/cleri-probe/determinism.test.js
- Create: tests/qa/cleri-probe/security.test.js
- Create: tests/qa/cleri-probe/performance.test.js
- Modify: scripts/cleri-probe/commands.js

- [ ] **Step 1: Write aggregate acceptance tests**

accuracy.test.js loads every manifest case, runs the selected verifier, and calculates TP, FP, TN, FN per family and aggregate. It fails with the exact mislabeled case ids when:

    family precision < 0.95
    aggregate precision < 0.98
    candidate top-set recall < 0.90

Do not hide zero-denominator families; fail them as untested.

- [ ] **Step 2: Add the 100-run determinism battery**

Run identical investigations across shuffled filesystem order, cold/warm cache, different absolute roots, color on/off, terminal widths, and injected duration values. Compare stableStringify(report) byte-for-byte. Tamper every identity-bearing field once and assert verify fails.

- [ ] **Step 3: Add the security battery**

Cover root traversal, escaping symlinks, symlink loops, oversized files, binary content, malformed Unicode, ANSI injection, secret redaction, malicious cache JSON, unreadable paths, parser bombs bounded by file/runtime limits, candidate floods, and --include-source opt-in. Assert no fixture source is executed and no network API is called.

Add CLI usability assertions for complete --help text, narrow terminal rendering, NO_COLOR, --no-color, piped human output without uncontrolled ANSI, stable JSON without debug logging, explicit --include-source, and every exit-code branch.

Use tests/qa/tools/bytecode-assertions.js for operational error cases. Assert every usage, configuration, parser, timeout, and schema failure produces a checksum-valid PB-ERR-v1 artifact; unsupported languages and unavailable verifiers produce PARTIAL or INCONCLUSIVE, never NO_VERIFIED_FINDINGS.

- [ ] **Step 4: Add the benchmark command and thresholds**

benchmark emits machine-readable samples and p50/p95 for:

    warm targeted investigation <= 1000 ms p95
    one-file incremental investigation <= 500 ms p95
    cold process with valid index <= 3000 ms p95
    full repository sweep <= 5000 ms p95

The test uses deterministic fixture scale and generous CI ceilings; the benchmark command enforces product thresholds on the documented reference machine. Record Node version, CPU model, repository file count, and cache state outside canonical reports.

- [ ] **Step 5: Run acceptance gates**

    npx vitest run tests/qa/cleri-probe
    npx vitest run tests/diagnostic/qbitProbeEnrichment.test.js
    node scripts/cleri-probe.js benchmark --format json

Expected: all accuracy, determinism, security, compatibility, and reference-machine gates pass. Any verifier below its precision gate is removed from the default registry before release.

- [ ] **Step 6: Commit**

    git add tests/qa/cleri-probe scripts/cleri-probe/commands.js
    git commit -m "test(cleri-probe): enforce investigator release gates"

---

### Task 17: Publish Operator and Verifier Documentation

**Files:**

- Create: docs/tooling/cleri-probe.md
- Create: docs/tooling/cleri-probe-verifier-authoring.md
- Create: scripts/labs/cleri-probe/README.md
- Move: scripts/cleri-probe-metronome.js to scripts/labs/cleri-probe/metronome.js
- Move: scripts/cleri-probe-pronunciation.js to scripts/labs/cleri-probe/pronunciation.js
- Move: scripts/cleri-probe-separation.js to scripts/labs/cleri-probe/separation.js
- Move: scripts/cleri-probe-mutation.js to scripts/labs/cleri-probe/mutation.js
- Move: scripts/cleri-probe-phoneme.js to scripts/labs/cleri-probe/phoneme.js

- [ ] **Step 1: Document the operator workflow**

Include exact examples for investigate, repeatable --scope and --exclude, --detector, --plan-only, --format, --output, --include-source, --no-cache, --no-color, --fail-on-findings, explain, verify, detectors, benchmark, and graduate --proposal. Explain all five statuses and all four exit codes. State that NO VERIFIED FINDINGS is not proof of absence beyond reported coverage.

- [ ] **Step 2: Document verifier authoring**

Require:

    one pathology class and versioned verifier id
    explicit supporting predicates
    explicit counterchecks
    normalized-fact input only
    no I/O and no source execution
    VERIFIED or NO_FINDING only
    at least one positive and one adversarial hard negative
    family precision >= 95 percent before registration

Show the registry object from Task 4 and the corpus manifest record from Task 2.

- [ ] **Step 3: Reconcile laboratory scripts**

Inventory scripts matching cleri-probe*. Task 2 and Task 16 capture their reusable measurements. Move the five non-product experiments under scripts/labs/cleri-probe/ with the exact paths listed above, add a README identifying them as non-authoritative research instruments, and update executable instructions inside the moved scripts plus any active import or package-script reference found by:

    rg -n "cleri-probe-(metronome|pronunciation|separation|mutation|phoneme)" .

Do not rewrite historical plans, specs, PDRs, or field reports that document the old path at the time it existed. Do not delete the experiments. Their scripts/labs location is the explicit laboratory naming boundary required by the PDR; scripts/cleri-probe.js remains the only product CLI.

- [ ] **Step 4: Verify commands and docs**

    node scripts/cleri-probe.js --help
    node scripts/cleri-probe.js investigate "listener leak in React effect" --scope tests/qa/fixtures/cleri-probe/listener-lifecycle/verified.jsx --include-tests --format json --output /tmp/cleri-report.json
    REPORT_FINDING_ID=$(node --input-type=module -e "import fs from 'node:fs'; const report=JSON.parse(fs.readFileSync('/tmp/cleri-report.json','utf8')); process.stdout.write(report.findings[0].findingId)")
    node scripts/cleri-probe.js verify "$REPORT_FINDING_ID" --report /tmp/cleri-report.json
    node --check scripts/labs/cleri-probe/metronome.js
    node --check scripts/labs/cleri-probe/pronunciation.js
    node --check scripts/labs/cleri-probe/separation.js
    node --check scripts/labs/cleri-probe/mutation.js
    node --check scripts/labs/cleri-probe/phoneme.js
    node docs/scholomance-encyclopedia/tools/audit-hygiene.mjs

Expected: help and examples match actual behavior; no new hygiene error points to the new docs.

- [ ] **Step 5: Commit**

    git add docs/tooling/cleri-probe.md docs/tooling/cleri-probe-verifier-authoring.md scripts/labs/cleri-probe
    git add -u scripts/cleri-probe-metronome.js scripts/cleri-probe-pronunciation.js scripts/cleri-probe-separation.js scripts/cleri-probe-mutation.js scripts/cleri-probe-phoneme.js
    git commit -m "docs(cleri-probe): publish investigator and verifier guides"

---

### Task 18: Final Release Review and PIR

**Files:**

- Modify: docs/scholomance-encyclopedia/PDR-archive/2026-07-13-cleri-probe-evidence-microscope-overhaul-pdr.md
- Modify: docs/scholomance-encyclopedia/PDR-archive/README.md
- Create: docs/scholomance-encyclopedia/PIR-archive/2026-07-13-cleri-probe-evidence-microscope-overhaul-pir.md

- [ ] **Step 1: Run the complete release battery from a clean process**

    npm run lint
    npm run typecheck
    npm run test:qa
    npm run security:qa
    npm run dead:scan:ci
    npx vitest run tests/qa/cleri-probe tests/diagnostic/qbitProbeEnrichment.test.js
    node scripts/cleri-probe.js benchmark --format json
    node docs/scholomance-encyclopedia/tools/audit-hygiene.mjs
    git diff --check

Expected: implementation-related checks pass. Any unrelated pre-existing hygiene finding is listed in the PIR with its existing owner.

- [ ] **Step 2: Perform a human evidence-card review**

For one positive and one hard negative from each family, review:

    hypothesis and visible plan
    exact source span
    supporting evidence
    counterevidence checked
    limitations and coverage
    law/RAID context
    remediation and verification steps
    JSON source omission by default
    bytecode verification

Reject release if a human must infer why a finding was verified from a score alone.

- [ ] **Step 3: Write the PIR**

Record shipped commands, schema version, verifier versions, corpus counts, per-family and aggregate precision/recall, p50/p95 timings, determinism results, security results, known limitations, deferred web adapter, and laboratory-script dispositions.

- [ ] **Step 4: Update lifecycle status only after evidence passes**

Set the PDR and archive catalog to Implemented only when all required gates pass. If a verifier was withheld, use In Progress and name the withheld family in the PIR.

- [ ] **Step 5: Commit**

    git add docs/scholomance-encyclopedia/PDR-archive/2026-07-13-cleri-probe-evidence-microscope-overhaul-pdr.md docs/scholomance-encyclopedia/PDR-archive/README.md docs/scholomance-encyclopedia/PIR-archive/2026-07-13-cleri-probe-evidence-microscope-overhaul-pir.md
    git commit -m "docs(pir): record cleri probe overhaul evidence"

---

## Implementation Review Checkpoints

Pause for review after:

1. Task 1: schema ratification.
2. Task 8: the first end-to-end investigation with no verifier claims beyond registered proof.
3. Each of Tasks 9–13: one verifier and its precision report.
4. Task 16: aggregate release gates.
5. Task 18: PIR and lifecycle transition.

At each checkpoint, show the focused test output, new report example, false-positive corpus additions, and exact changed paths. Do not batch all five verifiers into one unreviewed change.

## PDR Phase Traceability

| Approved PDR phase | Plan tasks | Exit evidence |
|---|---|---|
| Phase 0 — Truth baseline | Task 2 | Reproducible 15-archetype baseline, known inversion/self-contamination cases, and retrieval-change dispositions |
| Phase 1 — Investigator foundation | Tasks 1 and 3–8 | Ratified schema and a synthetic verifier completing the CLI lifecycle with 100 byte-identical reports |
| Phase 2 — Structural verifiers | Tasks 9–13 and Task 16 | Five independently gated verifier families, mutation/countercheck tests, and published precision |
| Phase 3 — Complete investigation loop | Tasks 14, 16, and 17 | Explain/verify with drift detection, context/QBIT adapters, resilience gates, docs, and explicit lab paths |
| Phase 4 — Human-controlled memory | Task 15 | Confirmed feedback can create a benchmarked proposal; no proposal can persist itself |
| Deferred web adapter | Not implemented by this plan | A later PDR must consume the same runtime and SCHOL-CLERI-PROBE-v2 without browser-authoritative findings |

## Definition of Done

The overhaul is complete when:

- The CLI produces a visible plan and a valid SCHOL-CLERI-PROBE-v2 report.
- Every finding is structurally VERIFIED with supporting evidence and explicit counterchecks.
- Complete negative, partial, inconclusive, and failed outcomes are distinct.
- The default registry contains only verifier families meeting their individual precision gates.
- Aggregate precision, candidate recall, determinism, security, and performance gates pass.
- QBIT consumes a derived verified-finding view.
- Graduation produces a human-review proposal and cannot mutate immune memory.
- Operator and verifier-authoring documentation match the executable.
- The PIR records empirical outcomes and the web adapter remains deferred to a separate PDR.
