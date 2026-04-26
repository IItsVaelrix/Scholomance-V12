# ARCH-2026-04-26-IMMUNE-SYSTEM

## Bytecode Search Code
`SCHOL-ENC-BYKE-SEARCH-IMMUNE-SYSTEM`

## Status
**ARCHITECTURE — RATIFIED 2026-04-26.** Innate layer scaffold: Codex. Adaptive layer kernel: Codex. Override audit log: Codex (server) + Claude (UI). Dashboard surface: Claude.

## Origin
Angel's specification (2026-04-26): map biological immunity onto the codebase substrate. Three real layers, not one. Trigger-gated, not always-on. Workflow-integrated, not just observational. The TurboQuant Bridge already provides the substrate for vector-fingerprinted detection (`enforceTurboQAGates` enforces the >15% deviation gate today and emits `PB-ERR-v1-VALUE-CRIT-QUANT-0105`). The Immune System extends this from a single membrane into a layered defense.

## Anatomical Map

| Biological Layer | Codebase Equivalent | Compute Cost | Trigger |
|------------------|---------------------|--------------|---------|
| **Innate** (skin, mucus, complement) | Lightweight pattern checks | <1ms per file | Always on commit/merge |
| **Adaptive** (B-cells, T-cells) | TurboQuant semantic similarity scan | <50ms per file | Only when innate flags suspicious |
| **Override** (conscious decision) | Human/Angel sovereignty record | Async | Required when either layer wants to block intentional architecture |

## Layer 1 — Innate Immunity (The Skin Barrier)

**Mandate:** Reject the obvious. Cheap, fast, deterministic.

**Detection ruleset (initial):**
| Pattern | Detector | Bytecode |
|---------|----------|----------|
| `Math.random()` outside seeded contexts | regex + AST scope check | `PB-ERR-v1-VALUE-CRIT-QUANT-0101` |
| `Date.now()` / `performance.now()` in scoring or rendering hot paths | AST + import-graph reachability | `PB-ERR-v1-VALUE-CRIT-QUANT-0102` |
| Forbidden imports (UI → `codex/`, UI → `src/lib/` engine code) | import-graph traversal | `PB-ERR-v1-LINGUISTIC-CRIT-LING-0F03` |
| Duplicate path imports (e.g., `bytecode-bridge/` shadowing `bytecode/`) | path-similarity + canon list | `PB-ERR-v1-LINGUISTIC-CRIT-LING-0F04` |
| Known-violation literals (deleted symbol names from `dead-code.md`, comment-disabled production calls) | string match against curated list | `PB-ERR-v1-LINGUISTIC-CRIT-LING-0F05` |

**Properties:**
- Pure regex + AST + import-graph operations. No vector compute.
- Runs against staged diff only (not the whole tree) → typical scan: 5–30 files, 50–200ms total.
- Result is binary per rule: PASS or BLOCK.
- BLOCK emits a bytecode error with the offending file/line/pattern and a repair suggestion ("use `seedrandom(seed)` or replace with deterministic equivalent").
- Ruleset is versioned and lives in `codex/core/immunity/innate.rules.js` so its evolution is git-auditable.

## Layer 2 — Adaptive Immunity (The Leukocytes)

**Mandate:** Reject the *not-yet-seen-but-suspicious*. Vector-similarity to known pathogens. Heavier compute, only when warranted.

**Trigger conditions** (any ONE activates Layer 2 on the affected file):
- Layer 1 raised a soft flag (e.g., regex matched but inside a comment or test file — could be benign, needs deeper look).
- File touches a sensitive substrate: `codex/core/`, `src/lib/truesight/`, `src/lib/pls/`, `codex/server/services/combatScoring.service.js`, anything modified in the same PR as a `dead-code.md` entry.
- Diff size > 200 lines OR > 5 files in scope (heuristic for "major refactor").
- Author identity = AI agent (per commit trailer).

**Detection mechanics:**
1. **Pathogen Registry** lives in `codex/core/immunity/pathogenRegistry.js`. Each entry is `{ id, name, vector: <2.5-bit TurboQuant signature>, threshold, hitCount, sourceEncyclopediaEntry }`.
2. Incoming code is chunked, fingerprinted via the TurboQuant kernel (`src/lib/math/quantization/`), and compared against the registry.
3. Cosine similarity ≥ pathogen.threshold → emit `PB-ERR-v1-VALUE-CRIT-QUANT-0105` (existing `QUANT_PRECISION_LOSS` reused since the deviation IS a precision loss against canonical patterns).
4. The error payload names the matched pathogen and links to its encyclopedia entry.

**Initial pathogen seed list** (derived from `BUG-FIX-PLAN-2026-04-26-DISCONNECTED-LOGIC.md`):
- `pathogen.client-combat-scorer` — vector signature of `combatScoring.js::calculateCombatScore`. Block any file matching it.
- `pathogen.legacy-rhyme-stack` — signature of `codex/core/rhyme/predictor.js`.
- `pathogen.bytecode-bridge-shadow` — signature of `src/codex/animation/bytecode-bridge/index.ts`.
- `pathogen.unseeded-hmm-init` — signature of HMM Viterbi init that doesn't take a seed parameter.
- `pathogen.client-side-analysis-engine` — signature of `phoneme.engine.js` being imported from `src/components/`.

**Properties:**
- ~17,000 words/sec throughput (per Phase 4 of TurboQuant integration), so a 500-line file fingerprint is ~30ms.
- 0.46MB heap impact per scan (Phase 4 measurement) → fits the Steam Deck budget.
- Adaptive pathogens are **learned**: when Angel ratifies a new "hot offender" via Layer 3 audit, its signature is auto-appended to the registry.

## Layer 3 — Override (Human Sovereignty)

**Mandate:** Enforce friction for intentional deviation. Never enforce a wall against it.

**Mechanism:**
1. Layer 1 or Layer 2 emits a block.
2. The author can supply an `IMMUNE_OVERRIDE` trailer in the commit message:
   ```
   IMMUNE_OVERRIDE: pathogen.client-combat-scorer
   IMMUNE_REASON: ablation experiment for combat scoring divergence study
   IMMUNE_AUTHORITY: Angel
   ```
3. Override is logged to `codex/server/db/immunity_audit.sqlite` with `{ id, sha, file, layer, pathogenId, reason, authority, timestamp, accepter_agent_id }`.
4. The merge proceeds.
5. The override appears in the dashboard's Sovereignty Log permanently.

**Properties:**
- Required fields: `IMMUNE_OVERRIDE`, `IMMUNE_REASON`, `IMMUNE_AUTHORITY`. Missing any field → block stands.
- `IMMUNE_AUTHORITY` must be on a curated list (`Angel`, `Codex`, `Claude`, `Gemini`, `Minimax`). External authority requires Angel co-sign.
- Each override is a row in the audit log AND a one-line entry in the relevant encyclopedia bug-fix-plan (when the override is for a tracked plan item).
- Repeated identical overrides on the same pathogen suggest the pathogen is mis-classified → triage flag for Codex.

## Trigger Events (Cost Discipline)

The immune system is NOT always-on across everything. Active surface is bounded:

| Event | Layers Run | Why |
|-------|------------|-----|
| `git commit` (local) | None | Too noisy. |
| `git push` to non-main branch | Layer 1 only | Cheap sanity. |
| Pull-request open / synchronize | Layer 1 + Layer 2 (gated by triggers) | Standard checkpoint. |
| Merge to main | Layer 1 + Layer 2 (always) | Last gate before canon. |
| Major refactor (>200 LOC, >5 files, OR touches `dead-code.md` entries) | Layer 1 + Layer 2 + Override required if any block | High-risk surface. |
| AI-generated commit (per `Co-Authored-By: <agent>` trailer) | Layer 1 + Layer 2 + Override audit verbose | Multi-agent guardrail. |
| Routine doc edit / CSS-only / test-only | Layer 1 fast-path (skip import-graph) | Don't punish the trivial. |

## Workflow Integration — The Multi-Agent Pipeline

Angel's stated biggest opportunity. Concretely:

```
[ Agent writes code ]
        │
        ▼
[ pre-commit: Layer 1 (innate) ]
        │
   pass ┴ block → repair suggestion shown inline
        │
        ▼
[ pre-push: Layer 1 (re-check) ]
        │
        ▼
[ PR opens ]
        │
        ▼
[ CI: Layer 1 + Layer 2 (if triggered) ]
        │
   pass ┴ block → bot comments with
        │           - matched pathogen
        │           - encyclopedia link
        │           - repair recommendation
        │           - override template
        │
        ▼
[ Author or reviewer: accept repair OR file IMMUNE_OVERRIDE ]
        │
        ▼
[ Merge to main ]
        │
        ▼
[ Override audit log updated ]
[ Dashboard reflects new state ]
```

**For multi-agent systems specifically:** every agent commit carries `Co-Authored-By: <agent-id>`. The immune system uses this to:
- Run verbose audit on agent diffs (humans get the lightweight path).
- Tag pathogen hits with the agent that introduced the pattern → reveals which agent is the source of recurring drift.
- Auto-route override decisions to Angel when an agent attempts self-override.

## Repair Recommendations (The Healing Layer)

When a block fires, the response includes a concrete repair, not just a complaint:

| Pathogen | Repair Suggestion |
|----------|------------------|
| `Math.random()` in scoring | "Replace with `seedrandom(combatSeed)`. Combat seed is derived from `combatId + turn`." |
| Forbidden import UI→codex | "Move logic to `codex/runtime/<name>.pipeline.js` and expose via `/api/...` endpoint. Consume from UI via fetch." |
| Duplicate path | "Active canon: `<canonical-path>`. Delete `<duplicate-path>` per `dead-code.md` 2026-04-25." |
| Known-violation literal | "Symbol was removed in `<commit-sha>` (BUG-2026-MM-DD-...). See encyclopedia entry for replacement." |
| Adaptive vector match | "Similar to `<pathogen-name>` signature. Reference: `<encyclopedia-link>`. Consider `<canonical-equivalent>`." |

Repair recommendations live in `codex/core/immunity/repair.recommendations.js` and are evolved through encyclopedia entries.

## Module Layout

### Codex jurisdiction (kernel)
```
codex/core/immunity/
  innate.rules.js              Layer 1 ruleset (regex + AST predicates)
  innate.scanner.js            Apply rules to staged diff
  pathogenRegistry.js          Layer 2 signature store
  adaptive.scanner.js          Vector fingerprint + similarity match
  repair.recommendations.js    Repair suggestion mapping
  inflammatoryResponse.js      Bytecode error emitter
  override.audit.js            Override log writer

codex/server/services/immunity.service.js   /api/immunity/* endpoints
codex/server/db/migrations/immunity_audit.sql

scripts/immunity/
  scan.js                      CLI entry: scan staged diff
  pre-commit.js                Git hook: Layer 1 only
  pre-merge.js                 Git hook: Layer 1 + Layer 2 if triggered
  ci.js                        CI entry: full scan + override validation
```

### Claude jurisdiction (UI surface)
```
src/pages/Immunity/
  ImmunityPage.jsx             Three-panel dashboard (innate / adaptive / override)
  ImmunityPage.css             Grimoire + biological aesthetic
  useImmunityData.js           Data hook with /api/immunity/status fetch + mock fallback
  mock/immunity-state.json     Mock data for standalone development
```

### Codex wiring (consumer side, not yet done)
- Add `Immunity` to `src/lib/routes.js` (DEV only initially, gated like Collab).
- Add `immunity` link entry to `src/data/library.js::LINKS` (DEV only).
- Mount `/api/immunity/*` in `codex/server/index.js`.
- Install git hooks via `scripts/immunity/install-hooks.js`.

## API Contract (between dashboard and kernel)

```typescript
GET /api/immunity/status → ImmunityStatus

interface ImmunityStatus {
  innate: {
    enabled: boolean;
    rulesetVersion: string;
    rules: Array<{ id: string; name: string; pattern: string; hitCount: number }>;
    last24h: { scans: number; blocks: number; avgLatencyMs: number };
    lastBlock: BlockEvent | null;
  };
  adaptive: {
    enabled: boolean;
    pathogenCount: number;
    pathogens: Array<{
      id: string;
      name: string;
      threshold: number;
      hitCount: number;
      lastHitAt: string | null;
      encyclopediaEntry: string;
    }>;
    last24h: { scans: number; blocks: number; avgLatencyMs: number };
  };
  override: {
    last30d: Array<{
      id: string;
      sha: string;
      file: string;
      layer: 'innate' | 'adaptive';
      pathogenId: string;
      reason: string;
      authority: string;
      timestamp: string;
      accepter: string;
    }>;
  };
  workflow: {
    triggeredEvents: { merge: number; pr: number; refactor: number; aiCommit: number };
    activeAgents: Array<{ id: string; commitsLast7d: number; pathogensIntroduced: number }>;
  };
}

POST /api/immunity/override {
  sha, file, layer, pathogenId, reason, authority
} → { auditId, accepted: boolean }

GET /api/immunity/scan/:sha → DetailedScanResult
```

## Cost Model (per `git push` event, p95)

| Layer | Per-file p95 | Per-PR p95 | Memory |
|-------|--------------|-----------|--------|
| Layer 1 | <1ms | <100ms | <2MB |
| Layer 2 | <30ms | <500ms (only triggered files) | <4MB |
| Layer 3 | n/a (async audit log write) | <10ms write | negligible |

Total budget for a typical PR (15 files, 3 trigger Layer 2): **~600ms** end-to-end. Steam Deck class CPU.

## Success Criteria

- **SC1:** Layer 1 runs on every PR open with zero infrastructure cost (pure CI Node.js script).
- **SC2:** Layer 2 runs only on triggered files; p95 PR-level latency stays under 1s on Steam Deck CPU.
- **SC3:** Override audit log is append-only, signed, and exportable as a CSV.
- **SC4:** Pathogen Registry can be re-seeded from `dead-code.md` and BUG-FIX-PLAN entries automatically.
- **SC5:** Multi-agent commits show distinct pathogen-introduction-rate per agent (observability for Angel).
- **SC6:** Dashboard renders the full ImmunityStatus shape on a Steam Deck without dropping below 60fps.
- **SC7:** Repair recommendation acceptance rate ≥ 70% for AI-generated commits within 30 days of launch.

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| False positives on legitimate `Math.random` (e.g., visual jitter) | Innate ruleset has scope-aware allowlist: `*/effects/`, `*/atmosphere/` paths bypass the random check; explicit `// IMMUNE_ALLOW: math-random visual-jitter` line annotation honored. |
| Adaptive scan slows down a hot CI lane | Trigger gating + per-file budget + Layer 2 only runs when Layer 1 raised a soft flag. |
| Override fatigue (every PR overrides) → defeats the purpose | Override count per pathogen surfaced on dashboard; >5 overrides on the same pathogen in 30 days auto-files a Codex triage task. |
| Pathogen registry grows unbounded | Pathogen retirement: any pathogen with 0 hits in 90 days is archived (not deleted). Encyclopedia entry preserved. |
| Multi-agent collusion (one agent overrides for another) | Override authority requires fresh Angel signature for `agent-as-authority` overrides on agent commits. |

## Trigger Discipline (Anti-Pattern Defense)

Per Angel's directive: **do not always-on this across everything.** It becomes performance noise. Initial activation surface (in priority order):
1. Merge events to main.
2. PR open / synchronize.
3. Major refactors (heuristic-detected).
4. AI-generated commits (trailer-detected).

Local commits run nothing by default. `npm run immune-scan` is opt-in for authors who want to check before pushing.

## Encyclopedia Coupling

Every pathogen entry in `codex/core/immunity/pathogenRegistry.js` MUST link to an encyclopedia entry that explains:
- What the pattern is.
- Why it's harmful.
- The canonical replacement.
- The original incident that introduced it (if any).

When a new pathogen is auto-added by Layer 3 ("hot offender" graduation), the immune system also auto-drafts a stub encyclopedia entry that Angel/Codex completes. This is the "adaptive immunity → memory" loop made literal.

## Multi-Agent Workflow Diagram

```
                   ┌──────────────┐
                   │    Angel     │ ◀── ratifies pathogens, signs overrides
                   └──────┬───────┘
                          │
       ┌──────────────────┼──────────────────┐
       │                  │                  │
       ▼                  ▼                  ▼
   ┌───────┐         ┌────────┐         ┌────────┐
   │Claude │         │ Codex  │         │ Gemini │
   │ (UI)  │         │(kernel)│         │(specs) │
   └───┬───┘         └────┬───┘         └────┬───┘
       │                  │                  │
       │ writes commit    │ writes commit    │ writes commit
       └──────┬───────────┴──────────────────┘
              │
              ▼
       ┌────────────────────┐
       │ Innate Scan (L1)   │ ◀── always
       └────────┬───────────┘
                │
         flagged│
                ▼
       ┌────────────────────┐
       │ Adaptive Scan (L2) │ ◀── only if triggered
       └────────┬───────────┘
                │
         blocked│
                ▼
       ┌────────────────────┐
       │ Override (L3)      │ ◀── requires authority + reason
       └────────┬───────────┘
                │
                ▼
            [ merged ]
                │
                ▼
       ┌────────────────────┐
       │ Audit log + Dashboard updated │
       │ Encyclopedia auto-stub if new │
       └────────────────────┘
```

## Phased Rollout

| Phase | Scope | Owner | Gate |
|-------|-------|-------|------|
| 0 | This encyclopedia entry + UI dashboard skeleton + mock data | Claude | Done with this PR |
| 1 | Layer 1 ruleset + scanner CLI (Math.random + forbidden imports + duplicate paths) | Codex | Lint-clean, all `dead-code.md` modified files re-scanned with no false positives |
| 2 | Layer 1 → CI integration (PR-only, advisory mode) | Codex | 14-day soak, false-positive rate < 5% |
| 3 | Layer 2 pathogen registry + adaptive scanner | Codex | Steam Deck p95 < 500ms verified |
| 4 | Override layer + audit log + signature verification | Codex | Audit log replay test passes |
| 5 | Encyclopedia auto-stub on pathogen graduation | Codex | First pathogen graduates and Angel ratifies the auto-drafted entry |
| 6 | Multi-agent workflow integration (per-agent dashboards) | Claude (UI) + Codex (data) | Dashboard shows distinct pathogen-introduction-rate per agent |

## Lessons Sought

- Will Layer 1 catch enough? If most regressions slip past it, the trigger heuristics for Layer 2 need to widen.
- Are repair recommendations actually accepted, or do agents just override? Tracked via SC7.
- Does the override audit reveal which agent is the most consistent source of drift? If yes → that agent's prompt/training needs adjustment, not the rules.
- At what pathogen count does scan time become a problem? Inform retirement policy.

---

*The Scholomance is alive. The immune system is the price of being alive. — Angel, 2026-04-26*

*Entry Status: ARCHITECTURAL CANON | Last Updated: 2026-04-26*
