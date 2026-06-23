# Clerical RAID — Product Definition Record

**Bytecode:** `SCHOL-PDR-CLERICAL-RAID`
**Date:** 2026-05-10
**Author:** Merlin Data (Testing/QA)
**Classification:** WORLD-LAW ARCHITECTURE
**Status:** IMPLEMENTED v1.0 (2026-05-10)

### Implementation (canonical paths)

| Surface | Path |
|--------|------|
| Schema / thresholds | `codex/core/immunity/clerical-raid.schema.js` |
| Vector + `bugToVector` | `codex/core/immunity/clerical-raid.vector.js` |
| Engine (`ClericalRAID`, `Pattern`, `query`, `train`, `rebuildIndex`) | `codex/core/immunity/clerical-raid.core.js` |
| 50 seed patterns (PAT-001 … PAT-050) | `codex/core/immunity/clerical-raid.patterns.js` |
| Bootstrap `createRaidWithSeeds()` | `codex/core/immunity/clerical-raid.bootstrap.js` |
| CLI | `scripts/cleri-raid.js` — `npm run cleri -- <cmd>` |
| QA tests | `tests/qa/clerical-raid.test.js` |
| Phase 3–4 hooks / learning | `codex/core/immunity/clerical-raid.agents.js`, `codex/core/immunity/clerical-raid.learning.js` |

**Notes:** Verdict similarity uses dense **cosine** over 128-dim vectors (including a deterministic content signature in dims 112–127). TurboQuant **FHT + 4-bit** packing is used in `purify()` for quantized shells, `rebuildIndex()`, and memory stats. **Phase 3–4:** `clerical-raid.agents.js` (hooks + Merlin pipeline), `clerical-raid.learning.js` (Merlin vector extract, clustering, deprecation, effectiveness), MCP tools `mcp_scholomance_collab_clerical_raid_*`, CLI `agent-query|merlin-ingest|cluster|duplicates|maintenance|feedback`.

---

## 1. EXECUTIVE SUMMARY

### Vision
**Clerical RAID** (Rapid Antigen Detection) is a **TurboQuant-powered bug immune system** that encodes diagnostic patterns as compressed vectors, enabling O(1) approximate nearest-neighbor (ANN) search to quickly confirm, deny, or escalate bug reports.

### Biological Parallel
```
CRISPR-Cas9:     Read pathogen DNA → Guide RNA matches → Precision cut
Clerical RAID:   Read bug symptoms → Vector match → Targeted diagnosis
```

### Core Thesis
Bug diagnosis is immune response. Agents need rapid antigen tests, not full pathology labs. Clerical RAID provides:

| Response | Confidence | Outcome |
|----------|------------|---------|
| **CONFIRMED** | >95% match | Agent auto-fix (with regression test) |
| **DENIED** | <20% match | Escalate immediately, no wasted cycles |
| **NEEDS_MERLIN** | 20-95% match | Full Merlin Data Protocol |
| **NOVEL** | <10% match to any pattern | New pattern discovered → Add to library |

---

## 2. TURBOQUANT FOUNDATION

### Mathematical Basis
Clerical RAID exploits **TurboQuant's three-step purification ritual**:

```
Step 1 — Sign Flip:     symptomHash ^ i
Step 2 — FHT:           fastHadamardTransform(spread energy uniformly)
Step 3 — Quantize:      quantizeF32To4Bit(O(1) lookup)
Step 4 — ANN Search:    O(1) nearest neighbor in quantized space
```

### Why TurboQuant
| Metric | Linear Scan | Clerical RAID (TurboQuant) |
|--------|-------------|----------------------------|
| Pattern lookup | O(N) heuristic | **O(1) deterministic** |
| Memory | O(N * pattern size) | **<1MB for 10k patterns** |
| Latency | >200ms | **<50ms** |
| Novelty detection | Manual | **Built-in (distance threshold)** |

---

## 3. BUG VECTOR SCHEMA

### Problem: What Are the "Genes" of a Bug?

A bug's signature must be encoded as a **fixed-dimension vector** for quantization.

### Proposed Dimensions (128-dim vector)

| Dimension Group | Fields | Purpose |
|-----------------|--------|---------|
| **Symptom Cluster** (32 dims) | `symptoms[]` bitmask | What the user/system sees |
| **Layer Attribution** (8 dims) | `layer` one-hot | Where the tear originates |
| **Propagation Chain** (16 dims) | `layers_crossed[]` | How the tear spreads |
| **Schema Violation** (8 dims) | `violated_laws[]` | Which world-laws broke |
| **Temporal Pattern** (16 dims) | `timing`, `frequency` | When it manifests |
| **Agent Attribution** (8 dims) | `likely_owner` | Who owns the fix |
| **Heuristic Match** (32 dims) | `scoring_heuristics[]` | If in Codex core |
| **Error Class** (8 dims) | `error_type` | Technical classification |

### Symptom Bitmask (32 dims)
```
bit 0:  "null/undefined"
bit 1:  "async timing"
bit 2:  "render mismatch"
bit 3:  "schema violation"
bit 4:  "scoring drift"
bit 5:  "weave propagation"
bit 6:  "type error"
bit 7:  "import/require failure"
...
bit 31: "unknown/no match"
```

### Layer One-Hot (8 dims)
```
[codex/core, codex/services, src/hooks, src/pages, src/components, src/lib, scripts, config]
```

### Schema Violation Flags (8 dims)
```
[VAELRIX_LAW, SCHEMA_CONTRACT, ARCH_CONTRACT_SECURITY, CODEX.md, GEMINI.md, CLAUDE.md, type-safety, naming-convention]
```

---

## 4. PATTERN LIBRARY

### Purpose
The "immune memory" — known bug patterns encoded as vectors.

### Initial Seed Patterns (from Merlin Reports)

| Pattern ID | Name | Vector | Fix Path |
|------------|------|--------|----------|
| `PAT-001` | SchemaContract null propagation | `[...]` | Codex: Fix null check in `data/validator.ts` |
| `PAT-002` | Async data race in render | `[...]` | Claude: Add loading state guard |
| `PAT-003` | Scoring determinism break | `[...]` | Codex: Fix `randomness` in heuristic |
| `PAT-004` | Weave propagation chain | `[...]` | Codex: Trace and fix at origin |
| `PAT-005` | XSS vector (dangerouslySetInnerHTML) | `[...]` | Claude: Use sanitize, not innerHTML |
| `PAT-006` | Rate limit bypass | `[...]` | Codex: Fix cooldown logic |
| `PAT-007` | Coverage regression | `[...]` | Blackbox: Add regression test |
| `PAT-008` | TypeScript strict null | `[...]` | Codex: Add null guards |
| `PAT-009` | Import/require cycle | `[...]` | Codex: Refactor imports |
| `PAT-010` | UI state bleeding | `[...]` | Claude: Isolate state in hook |

### Pattern Library Growth
- **Merlin Reports** → Extracted vectors → Auto-add to library
- **Agent-confirmed fixes** → Pattern confirmed → Library update
- **Novel discoveries** → New pattern → Manual review → Add

---

## 5. API CONTRACT

### Core Interface

```typescript
// Primary entry point
function query(bugReport: BugReport): QueryResult

interface BugReport {
  symptoms: string[]           // Raw symptom descriptions
  layer?: string               // Optional layer hint
  errorMessage?: string        // Optional error text
  filePaths?: string[]         // Optional affected files
  timestamp: number            // When reported
}

interface QueryResult {
  verdict: 'CONFIRMED' | 'DENIED' | 'NEEDS_MERLIN' | 'NOVEL'
  confidence: number           // 0.0 - 1.0
  matchedPattern?: Pattern     // If CONFIRMED/NEEDS_MERLIN
  fixPath?: string             // Recommended fix path
  owner?: Agent               // Who should handle it
  escalationRequired: boolean  // True if NEEDS_MERLIN
}
```

### Administrative Interface

```typescript
// Add pattern from Merlin report
function train(pattern: Pattern): void

// Add pattern from confirmed agent fix
function confirm(pattern: Pattern): void

// Rebuild quantized index
function rebuildIndex(): void

// Get pattern library stats
function stats(): LibraryStats
```

---

## 6. CLI INTERFACE

```bash
# Quick scan
cleri raid scan "null pointer in combat hook"

# Full report
cleri raid diagnose --report ./bug-report-001.json

# Train on new pattern
cleri raid train --pattern ./patterns/PAT-042.json

# Library stats
cleri raid stats

# Interactive REPL
cleri raid repl
```

---

## 7. AGENT INTEGRATION

### For Codex
```
When: Bug report touches codex/core/ or codex/services/
Ask:  "Is this a Scoring or Schema pattern?"
RAID: CONFIRMED → auto-fix with test
      NEEDS_MERLIN → full report required
```

### For Claude
```
When: Bug report touches src/
Ask:  "Is this a UI state or XSS pattern?"
RAID: CONFIRMED → auto-fix with regression
      NEEDS_MERLIN → full report required
```

### For Gemini
```
When: Bug report touches game mechanics
Ask:  "Is this a balance or world-law violation?"
RAID: CONFIRMED → suggest rule fix
      NEEDS_MERLIN → full mechanic analysis
```

### For Blackbox (Merlin)
```
When: RAID returns NEEDS_MERLIN or NOVEL
Ask:  Full Merlin Data Protocol diagnosis
Then: Extract pattern → Add to library
```

---

## 8. SUCCESS METRICS

### Phase 1: Core Engine
| Metric | Target | Measurement |
|--------|--------|-------------|
| O(1) query latency | <50ms | Benchmarked via `scripts/verify_turboquant_sovereign.js` |
| Memory < 1MB | <32MB (Sovereign Gate) | Memory profiling |
| Pattern library size | 50+ seed patterns | Count on init |
| Accuracy (CONFIRMED/DENIED) | >90% | Test against historical Merlin reports |

### Phase 2: Agent Integration
| Metric | Target | Measurement |
|--------|--------|-------------|
| Agent escalations reduced | 40% fewer Merlin escalations | Before/after CI logs |
| False positive rate | <5% | Agent feedback loop |
| Fix-path accuracy | >80% | Agent reports back |

### Phase 3: Immune Learning
| Metric | Target | Measurement |
|--------|--------|-------------|
| Novel pattern detection | >50% of new bugs flagged NOVEL | New bug analysis |
| Library growth | +10 patterns/week | Pattern add rate |
| Auto-train accuracy | >70% match to confirmed fixes | Agent confirm rate |

---

## 9. IMPLEMENTATION ROADMAP

### Phase 1: Core Engine
- [x] Define bug vector schema (128 dims)
- [x] Implement `symptomHash()` — deterministic hash from symptoms (`symptomsToVector` + content signature in `bugToVector`)
- [x] Implement `fastHadamardTransform()` — TurboQuant FHT (`codex/core/quantization/turboquant.js`)
- [x] Implement `quantizeF32To4Bit()` — 4-bit quantization (same module)
- [x] Build ANN search — top-K **dense cosine** over trained pattern vectors (library size N; PDR heap optional)
- [x] Seed pattern library with 50 patterns
- [ ] Verify memory <32MB, latency <50ms (run under production profiling / sovereign gate scripts)

### Phase 2: API + CLI
- [x] Implement `ClericalRAID.query()`
- [x] Implement administrative interface (`train`, `confirm`, `rebuildIndex`, `getStats`, `exportPatterns`)
- [x] Build CLI (`npm run cleri -- scan|diagnose|train|stats|repl|rebuild-index`)
- [x] Add REPL mode
- [x] Unit tests — `tests/qa/clerical-raid.test.js` (coverage % not audited)

### Phase 3: Agent Integration
- [x] Codex integration hook (`agentHookQuery`, path heuristics, playbook)
- [x] Claude integration hook (same module)
- [x] Gemini integration hook (same module)
- [x] Merlin auto-train pipeline (`merlinAutoTrainPipeline` / `autoTrainFromMerlinReport`, CLI `merlin-ingest`, MCP ingest)
- [x] Feedback loop for pattern confirmation (`confirm`, `feedbackNegative`, CLI `feedback`, MCP feedback)

### Phase 4: Learning Loop
- [x] Extract vectors from Merlin reports automatically (`extractVectorFromMerlinReport`, `merlinReportToBugReport`)
- [x] Pattern clustering (novelty detection) (`clusterPatternsBySimilarity`, `findNearDuplicatePatterns`)
- [x] Auto-deprecate stale patterns (`deprecateStalePatterns`, deprecated patterns skipped in ANN)
- [x] Pattern confidence scoring (`patternEffectivenessScore`, feedback-adjusted `confidence`)

---

## 10. RISKS AND MITIGATIONS

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Vector schema too coarse | Medium | High | Iterative refinement based on accuracy metrics |
| Novel bugs undetected | High | Medium | Explicit NOVEL bucket, aggressive library growth |
| Pattern drift (fixes change behavior) | Low | High | Version patterns, deprecate stale |
| False CONFIRMED causing bad fixes | Medium | High | Require agent confirmation, always run tests |
| Memory bloat as library grows | Medium | Low | Tiered storage, quantization is memory-efficient |

---

## 11. OPEN QUESTIONS

1. **Who owns pattern curation?** Merlin (Blackbox) validates, Codex auto-adds?
2. **Pattern versioning?** When a fix changes, does the pattern version?
3. **Confidence thresholds?** CONFIRMED >95%, DENIED <20% — tunable?
4. **Human-in-loop for NOVEL?** Or auto-create pattern after N confirmations?
5. **Cross-layer bugs?** PAT-004 (Weave propagation) handles this explicitly?

---

## 12. REFERENCES

- TurboQuant White Paper: `docs/scholomance-encyclopedia/Scholomance White Papers/TURBOQUANT_WHITE_PAPER.md`
- Merlin Data Protocol: `BLACKBOX.md`
- Schema Contract: `SCHEMA_CONTRACT.md`
- VAELRIX Law: `VAELRIX_LAW.md`
- Agent Charters: `CLAUDE.md`, `GEMINI.md`, `CODEX.md`

---

*For the integrity of the weave.*
**Merlin Data**
*Oracle of the Scholomance*
