CODEX_DEBUGGING_SKILL.md

# Codex (CODEx Engine + Backend) Debugging Skill

> Specialization of `vaelrix.law.debug.skill.md` for the Codex agent — owner of the CODEx domain engine, backend, schemas, and runtime determinism contracts.

---

## 1. Purpose

Diagnose, isolate, and repair failures in the **deterministic core** of Scholomance — CODEx four-layer pipeline, Fastify backend, SQLite/Redis persistence, schemas, runtime adapters, scoring engines, ritual prediction, and the bytecode error contract.

The Codex lane is where determinism is enforced. A bug here is rarely a one-off — it usually means a contract was violated (schema drift, ordering instability, golden master divergence, world-law gate bypassed). This skill makes those violations *visible* in the bytecode and forces fixes that preserve the determinism substrate that the rest of the system depends on.

---

## 2. Scope

### Owned Surface (writable)
- `codex/` — all four layers: core, services, runtime, server
- `codex/server/` — Fastify routes, auth, DB, combat resolution, XP awards
- `src/lib/` — pure analysis engines (phoneme, rhyme, deepRhyme, truesight compiler, VerseSynthesis)
- Logic hooks in `src/hooks/` — `useProgression`, `useScrolls`, `usePhonemeEngine`, `useCODExPipeline`, `useVerseSynthesis`, `useColorCodex`
- `src/data/` — static data definitions (lexicon shapes, schools, vowel families)
- `scripts/` — build, generation, dictionary, vector artifacts
- `tests/` contract / unit / integration tests for owned surface
- Schema files in `src/types/core/`

### Forbidden Lanes (read-only)
- `src/pages/`, `src/components/`, `src/App.jsx`, `src/main.jsx` — Claude authority
- `src/index.css`, all `*.css` — Claude authority
- UI-only hooks: `useAtmosphere`, `useAmbientPlayer`, `usePrefersReducedMotion` — Claude authority
- `tests/visual/` — Claude / Minimax shared
- Mechanic balance numbers, scoring weights, world-law constants — Gemini authority
- CI configuration files — Minimax authority

If a bug requires UI changes, **produce a handoff brief to Claude with the data shape**, not a patch into `src/components/`.

### Shared Boundary (negotiated)
- `CombatResult` and `ScoreTrace[]` shape — Codex owns the schema; Claude owns the display. Schema changes require Claude notification first.
- `scripts/generate-school-styles.js` — Codex runs it; Claude consumes the CSS variables it emits.

---

## 3. Trigger Phrases

Auto-invoke when the user says or implies:

- "scoring is wrong / drifted / non-deterministic"
- "the bytecode failed audit / is malformed / version mismatch"
- "phoneme analysis is wrong" / "tokenization mismatch"
- "rhyme family is inconsistent" / "rhyme color wrong"
- "Fastify route returns wrong status / shape"
- "auth / session / CSRF broke"
- "SQLite migration failed" / "DB query wrong"
- "Redis session lost / expired wrong"
- "Zod validation rejected valid payload" / "accepted invalid"
- "dictionary lookup returned wrong entry"
- "TurboQuant reranking violated determinism"
- "ritual prediction surfaced illegal candidate"
- "golden master diverged"
- "schema drift" / "contract violation"
- "freeDictionary adapter returned malformed data"
- "embeddings_tq column wrong / missing"
- "VerseIR compilation produced unexpected output"
- "world-law gate let an illegal token through"
- "the IR doesn't round-trip"

---

## 4. Operating Modes

| Mode | When to Use | Output |
|---|---|---|
| **A: Diagnostic-Only** | Engine / backend complaint with incomplete evidence | Hypothesis ladder, evidence requested, blast radius across layers |
| **B: Patch-Ready** | Root cause proven, fix lives in owned surface | Diff-style patch, contract-test additions, golden master delta |
| **C: Autonomous Repair Spec** | Hand off to a coding agent | Step-by-step with file ownership, forbidden edits, validation commands |
| **D: Senior Reviewer** | Audit a proposed engine / backend patch | Pass / block + dependency audit + determinism risk + schema-version check |
| **E: Post-Update Auditor** | After any engine surface change | What improved, what got riskier, golden master deltas, schema migration notes needed |
| **F: Red-Team** | Attack a proposed fix | Find the determinism, ordering, schema, or world-law fracture the patch hides |

---

## 5. Evidence Standard

| Tier | Label | Example |
|---|---|---|
| Direct | `Direct Evidence:` | File inspected, query result captured, golden master diff shown, bytecode parsed |
| Repo Context | `Repo Context:` | Derivable from SCHEMA_CONTRACT.md, CLAUDE.md, ARCH_CONTRACT_SECURITY.md, AI_README_ARCHITECTURE.md |
| Inference | `Inference:` | Implied by call graph, schema shape, layer convention |
| Hypothesis | `Hypothesis:` | Plausible but unverified |
| Unknown | `Unknown:` | Missing — must request |

**Forbidden phrasings**:
- "the test passed" without command output
- "this query returns X" without running it
- "the bytecode is valid" without parsing it
- "deterministic" without a determinism check
- "no migration needed" without consumer audit
- "no schema change" without diffing the type definitions

Codex bugs almost never have "no risk" — assume schema, persistence, or contract impact until proven otherwise.

---

## 6. Debug Report Format

```markdown
# Codex Debug Report

## 1. Symptom
## 2. Classification — Schema / Determinism / Persistence / Auth / Routing / Scoring / IR / Bytecode / Adapter / Cache
## 3. Reproduction Path — Input vector, seed, environment, command
## 4. Failure Chain — Layer A → Layer B → Layer C → user-visible failure
## 5. Root Cause
## 6. Evidence
## 7. Blast Radius — Which layers, schemas, consumers, agents
## 8. Fix Strategy
## 9. Minimal Patch
## 10. Contract Test Net — New / updated tests required
## 11. Schema Migration Notes
## 12. Golden Master Delta
## 13. QA Checklist
## 14. Risk Reduced
## 15. Confidence Grade
## 16. Remaining Unknowns
## 17. Codex DebugTraceIR
```

No section omitted silently.

---

## 7. Codex DebugTraceIR Bytecode

```json
{
  "debug_trace_ir_version": "1.0.0",
  "agent": { "name": "Codex", "assigned_md": "CODEX.md", "mode": "" },
  "bug": {
    "title": "",
    "symptom": "",
    "classification": "schema | determinism | persistence | auth | routing | scoring | ir | bytecode | adapter | cache | architectural",
    "severity": "low | medium | high | critical",
    "confidence": 0.0
  },
  "context": {
    "repo": "Scholomance-V12",
    "layer": "core | services | runtime | server",
    "files_observed": [],
    "files_suspected": [],
    "input_vector": "",
    "seed": "",
    "user_goal": ""
  },
  "failure_chain": [
    { "step": 1, "layer": "", "event": "", "expected": "", "actual": "", "evidence_type": "direct | inferred | hypothesis | unknown" }
  ],
  "invariants": [
    { "id": "", "statement": "", "status": "held | violated | unknown", "evidence": "" }
  ],
  "schema": {
    "schema_file": "",
    "version_observed": "",
    "version_expected": "",
    "drift_detected": "true | false | unknown",
    "consumer_breakage": []
  },
  "determinism": {
    "function": "",
    "input_hash": "",
    "output_hash_run_1": "",
    "output_hash_run_2": "",
    "matches": "true | false | unknown",
    "nondeterminism_source": ""
  },
  "world_law": {
    "gate": "",
    "expected_behavior": "",
    "observed_behavior": "",
    "legality_violation_observed": "true | false | unknown"
  },
  "bytecode_error": {
    "category": "",
    "code_hex": "",
    "matches_taxonomy": "true | false | unknown",
    "parsable_by_parseErrorForAI": "true | false | unknown"
  },
  "persistence": {
    "store": "sqlite | redis | filesystem | none",
    "table_or_key": "",
    "migration_required": "true | false | unknown",
    "rollback_safe": "true | false | unknown"
  },
  "fix": {
    "strategy": "",
    "minimal_patch_summary": "",
    "files_to_change": [],
    "files_not_to_change": [],
    "schema_migration_notes": "",
    "rollback_plan": ""
  },
  "tests": {
    "contract_tests_added": [],
    "golden_master_updates": [],
    "mandatory_commands": [],
    "not_run": []
  },
  "red_team": {
    "ways_this_fix_can_fail": [],
    "edge_cases": [],
    "schema_consumers_affected": [],
    "remaining_unknowns": []
  },
  "grade": { "letter": "", "score": 0, "reason": "", "upgrade_path": "" }
}
```

Bytecode must be valid JSON, must match the human report, and must not invent files or schema fields.

---

## 8. Senior Debugging Arsenal (Engine-prioritized)

| Technique | Codex Application |
|---|---|
| **Differential Testing** | Old engine vs new engine, JS fallback vs WASM, FP16 vs TurboQuant 2.5-bit baseline |
| **Golden Master** | CODEx scoring, phoneme analysis, rhyme mapping, ritual prediction, bytecode IR — capture before refactor |
| **Property-Based** | Arbitrary token sequences, edge phonemes, empty input, Unicode, repeated tokens |
| **Metamorphic** | Whitespace must not change phoneme identity; same text → same bytecode; reordered candidates → same final ranking |
| **Mutation Testing** | Would the contract test fail if the implementation were broken? If not, the test is decorative |
| **Fault Injection** | API timeout, missing dictionary DB, corrupted corpus artifact, Redis unavailable, SQLite locked, MCP agent unavailable |
| **Shadow-Mode Validation** | Run new scoring beside old without replacing — feature-flag gated |
| **Race Timeline Analysis** | Async sequencing across runtime layer (caching, dedupe, rate limit) |
| **Contract Testing** | API request / response shape, Zod schemas, DB row shape, event payload structure |
| **Static Dependency Graphing** | Before changing any schema, map every consumer (UI, hook, adapter, route, test) |
| **Invariant Extraction** | "TurboQuant Pass 2 may only reorder, never introduce candidates"; "VerseIR round-trips"; "phoneme map is stable across builds" |
| **Determinism Bisect** | Identical input + seed must produce bit-identical output across platforms (QA Req #4 from `turboquant_integration_bridge_pdr.md`) |

---

## 9. Scholomance-Specific Engine Audits

### 9.1 Four-Layer Boundary Audit

| Layer | Allowed Imports | Forbidden Imports |
|---|---|---|
| Core | None outside core | Services, runtime, server |
| Services | Core | Runtime, server |
| Runtime | Core, services | Server |
| Server | Core, services, runtime | UI |

A core function importing a service is an architecture drift.

### 9.2 Bytecode Error Contract Audit

- Every error path must use `bytecode-error.js` (`ERROR_CATEGORIES`, `ERROR_CODES`)
- Every thrown error must be `parseErrorForAI`-parsable
- Hex code format: `0xXXXX` (4 hex digits, uppercase, zero-padded)
- Error categories must be from the canonical taxonomy
- `verify_turboqa.js` is the reference verifier — extend, don't bypass

### 9.3 Determinism Audit

| Check | Required |
|---|---|
| Same input + same seed → same output | Always |
| Bit-identical across platforms (Browser / Fly.io / local) | For prediction, scoring, IR |
| No `Date.now()`, `Math.random()` without seeded source | In core layer |
| No floating-point ordering instability | Sort keys must be deterministic |
| No iteration-order dependence on `Object.keys` / `Map` insertion order without explicit sort | Always |

### 9.4 World-Law Gate Audit

When ritual prediction or scoring promotes a candidate:

- Pass 1 (graph) produces a closed legal candidate set
- Pass 2 (vector / TurboQuant) may only reorder Pass 1 output
- Legality score is independent of similarity score
- `LEGALITY_VIOLATION` (linguistic category) must fire when `legalityScore: 0` regardless of similarity
- `QUANT_PRECISION_LOSS` (value category) must fire when overlap < 85% threshold

### 9.5 Schema Stability Audit

| Check | Required |
|---|---|
| Schema version bump | On any breaking shape change |
| Migration notes | On any DB schema change |
| Consumer audit | Every type consumer found and updated |
| Round-trip test | Serialize → deserialize → equal |
| `SCHEMA_CONTRACT.md` updated | Always when schema changes |
| Backward-compat shim | Only when explicitly required; default is clean break |

### 9.6 Persistence Audit

| Store | Audit Items |
|---|---|
| SQLite (`scholomance_dict.sqlite`) | FTS5 index integrity, embeddings_tq blob shape, file size within stasis budget, migration rollback path |
| Redis | Session expiry, no token leakage, cluster mode compatibility |
| Filesystem | No write-on-read, no race on concurrent build |

### 9.7 Adapter Audit

External data must pass through an adapter that:
- Validates with Zod or equivalent
- Normalizes to the canonical shape
- Surfaces errors as parseable bytecode (not raw fetch errors)
- Has a fallback path or explicit failure mode

### 9.8 TurboQuant / Vector Bridge Audit (per `turboquant_integration_bridge_pdr.md`)

| QA Req | Check |
|---|---|
| Vector Fidelity | Reranked top-5 must maintain ≥0.85 overlap with FP baseline |
| World-Law Legality | Reranker may never promote `legalityScore: 0` candidates |
| Latency | <12ms for 200 candidates on Steam Deck CPU |
| Determinism | Same input + same seed → bit-identical similarity scores |
| Memory | `WebAssembly.Memory` fixed at allocation, no dynamic growth |
| Feature flag | `ENABLE_TURBOQUANT` must gate Pass 2 until Phase 5 |

---

## 10. Mandatory QA

| Command | Purpose | Required When |
|---|---|---|
| `npm run lint` | Static, max-warnings=0 | Every change |
| `npm test` | Unit / integration | Every change |
| `npm run build` | Production build | Every change |
| `npm run security:qa` | Security checks | Every auth / API / persistence change |
| `npm run security:audit` | Dependency risk | Before release |
| `node scripts/verify_turboqa.js` | Vector reranker gates | Every TurboQuant / prediction change |
| `npm run db:setup` | DB schema integrity | Every persistence change |
| `npm run build:rhyme-astrology:index` | Rhyme index rebuild | Every rhyme / phoneme change |
| Golden master comparison | Determinism | Every scoring / IR change |
| Schema round-trip test | Contract integrity | Every schema change |

**Never claim a command passed without actual output.**

---

## 11. Red-Team Review

| Attack Question | Answer |
|---|---|
| Does this introduce non-determinism (Date.now, Math.random, unsorted iteration)? | |
| Does this change a schema without bumping version + migration notes? | |
| Does this break a `parseErrorForAI` consumer? | |
| Does this let an illegal token through a world-law gate? | |
| Does this break golden master output? | |
| Does this cross a layer boundary (core importing service, etc.)? | |
| Does this break the JS fallback path while only WASM is tested? | |
| Does this assume Object key order? | |
| Does this leak persistence detail to UI? | |
| Does this skip Zod validation at an adapter boundary? | |
| Does this break Fly.io free-tier memory budget? | |

---

## 12. VAELRIX_LAW Tribunal

| Category | Verdict | Evidence |
|---|---|---|
| Determinism Preserved | | |
| Schema Integrity | | |
| Bytecode Contract Integrity | | |
| World-Law Gate Integrity | | |
| Layer Boundary Integrity | | |
| Persistence Safety | | |
| Adapter Discipline | | |
| Test Coverage (contract + golden) | | |
| Migration Safety | | |
| Rollback Path | | |
| Final Grade | | |

Verdicts: Excellent / Good / Needs refinement / Risky / Blocked / Unknown.

---

## 13. Agent-Specific Rules

1. **Determinism is non-negotiable.** Any change that introduces non-determinism is automatically blocked.
2. **Schema changes require version bump, migration notes, and consumer audit.** No exceptions.
3. **Errors must use the bytecode-error contract** (`ERROR_CATEGORIES` + `ERROR_CODES`). Raw `throw new Error("...")` in business logic is a smell.
4. **Layer boundaries are absolute.** Core never imports from services / runtime / server. Services never import from runtime / server. Runtime never imports from server.
5. **External data passes through an adapter.** Components, hooks, and core never touch external APIs directly.
6. **Auth tokens are httpOnly cookies only.**
7. **Allow-list validation, never deny-list.**
8. **Golden master before refactor.** Capture known-good output first.
9. **Feature flags for risky engine changes** (ENABLE_TURBOQUANT, PASS_2_RERANKER, etc.). Default off until Phase 5 of the relevant PDR.
10. **No write to UI surface** (`src/pages/`, `src/components/`, `*.css`). Hand off to Claude.
11. **No write to mechanic balance numbers.** Hand off to Gemini.
12. **No comments explaining what code does.** Comments only when *why* is non-obvious (a constraint, an invariant, a workaround).

---

## 14. Forbidden Behaviors

The skill must not:

- Edit files outside the owned surface
- Introduce non-determinism in core / scoring / IR / prediction
- Change a schema without version bump and migration notes
- Bypass the bytecode error contract
- Cross a layer boundary
- Skip Zod / contract validation at an adapter boundary
- Skip a golden master capture before refactor
- Skip schema consumer audit
- Patch a symptom while hiding root-cause uncertainty
- Refactor unrelated engine surfaces while fixing a specific bug
- Invent test results, query output, or schema fields
- Assume `Object.keys` / `Map` iteration order
- Use `Date.now()` / `Math.random()` in deterministic code paths
- Leak persistence detail to UI
- Hand-roll auth or CSRF
- Disable security gates (`--no-verify`, `--insecure`, etc.) without explicit user authorization
- Touch `src/pages/`, `src/components/`, `*.css`, mechanic balance numbers, or CI config

---

## 15. Example Output Skeleton

```markdown
# Codex Debug Report — Ritual Prediction Surfaces Illegal Candidate Under Pass 2

## 1. Symptom
With `ENABLE_TURBOQUANT=true`, the ritual predictor occasionally surfaces a token with `legalityScore: 0` in the top-5 suggestions for VOID school inputs.

## 2. Classification
World-Law Gate (Linguistic / `LEGALITY_VIOLATION`) — Pass 2 reranker promoting illegal candidate.

## 3. Reproduction Path
- Input: VOID school verse with `["void", "null", "empty"]` context
- Seed: 0xCAFEBABE
- Command: `node scripts/verify_turboqa.js`
- Expected: `LEGALITY_VIOLATION` raised when illegal candidate enters top-5
- Observed: illegal candidate ranked at position 3 with no error

## 4. Failure Chain
Pass 1 graph produces 200 candidates including 2 with `legalityScore: 0` (graph emits all syntactically valid, defers legality to Pass 2 gate). → Pass 2 TurboQuant reranks by similarity only, ignores `legalityScore`. → Final top-5 includes illegal candidate. → World-Law gate not invoked.

## 5. Root Cause
**Direct Evidence**: `codex/core/ritual-prediction/reranker.js` multiplies similarity by 1.0 instead of `legalityScore` when computing final rank. The legality gate is checked *after* top-5 selection, not *during* ranking.

## 6. Evidence
- Direct: file inspection of `reranker.js` line 47
- Direct: `verify_turboqa.js` test 4 output captured
- Repo Context: `turboquant_integration_bridge_pdr.md` §9 specifies legality gate must reject illegal candidates *during* Pass 2

## 7. Blast Radius
- All schools using TurboQuant Pass 2
- Production risk: low (feature-flagged off by default per PDR Phase 3)
- Stage risk: high (any test environment with flag on)

## 8. Fix Strategy
Multiply similarity by `legalityScore` during Pass 2 ranking, not after. Ensures `legalityScore: 0` always sorts to bottom regardless of similarity.

## 9. Minimal Patch
[diff in codex/core/ritual-prediction/reranker.js]

## 10. Contract Test Net
- Add `verify_turboqa.js` test case: VOID school input with seeded illegal candidates, assert none in top-5
- Add unit test: `rerank([legalityScore: 0, similarity: 1.0])` returns last position

## 11. Schema Migration Notes
None — fix is in the ranking math, not the schema.

## 12. Golden Master Delta
- `tests/qa/fixtures/panelAnalysis.scenarios.js` — re-run, expect no regression on legal-only inputs
- Capture new golden for VOID school with mixed legality input

## 13. QA Checklist
- [x] node scripts/verify_turboqa.js
- [x] npm run lint
- [x] npm test
- [x] npm run build
- [ ] Determinism check (5 runs, identical output)

## 14. Risk Reduced
Eliminates an entire class of world-law violations under Pass 2 reranking. Closes QA Req #2 from the TurboQuant PDR.

## 15. Confidence Grade
A+ — direct evidence, minimal patch, contract test added, world-law contract preserved.

## 16. Remaining Unknowns
- Whether the same multiplication is missing in any other reranker (check `codex/core/grimdesign/signalExtractor.js`)

## 17. Codex DebugTraceIR
[json bytecode block]
```

---

*Skill author: codex-engine-debug-specialization*
*Source template: `docs/skills/vaelrix.law.debug.skill.md`*
*Date: 2026-04-26*
