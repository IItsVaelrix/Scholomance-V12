# PDR: PB-EXP Skeleton Normalization — View-Invariant Operational Trace Hashing

**Status:** Draft  
**Classification:** new heuristic / bytecode sub-system  
**Version:** 1.0  
**Date:** 2026-04-04  
**Depends On:** `experience_bytecode_pdr.md` (PB-EXP-v1)  
**Memory Key:** `pdr:pbexp-skeleton-normalization-v1`  
**Owner:** Codex (normalization pipeline) + Claude (ledger status UI already built)

---

## Problem

PB-EXP-v1's corroboration model hashes raw execution traces. Two agents solving the same class of task produce different raw traces because:

- Different verbosity (3 tool calls vs 12 for equivalent work)
- Different agent IDs, session timestamps, absolute file paths
- Different tool naming conventions across frameworks (`Read` vs `read_file` vs `cat`)
- Different sequence lengths depending on how the agent reasons

Raw trace hashing produces near-zero ledger coverage. The skeleton never matches.

---

## World-Law Metaphor

> The same spell cast by two scholars looks different — one whispers it in seven words, one in forty. The canonical form strips the ornamentation and reads only the geometric motion of the ritual: which gates were opened, in what order, at what phase of the casting.

---

## Solution: Five-Pass Normalization Pipeline

Adapted from skeleton-based action recognition research (center transformation, scale normalization, view normalization, temporal quantization, S2V encoding). Each pass removes one axis of variance.

Applied **at pipeline advance time**, not at ingestion — cheap CPU-side preprocessing, not a query-time computation. The normalized skeleton is computed once, hashed once, stored. Corroboration is a ledger lookup, not a recomputation.

---

## Pass 1 — Root Anchor (Translation Invariance)

**Analogy:** Shift all joints relative to SpineBase → root at (0, 0, 0).

**Application:** Find the `task_claim` event in the trace. Set it as `t = 0`. All subsequent tool calls become relative time offsets `Δt` from task_claim.

**What is stripped:**
- Absolute timestamps
- Session IDs
- Agent ID (the skeleton describes behavior, not identity)
- Pipeline run ID

**What remains:**
- Relative ordering of tool calls
- Time delta between calls (normalized in Pass 3)

**Result:** Two agents who claimed the same task at different times of day produce the same root-anchored sequence.

---

## Pass 2 — Tool Canonicalization (View/Style Normalization)

**Analogy:** Rotate skeleton to standard front-facing viewpoint — normalize away the camera angle (agent reasoning style).

**Application:** Map all tool calls to a canonical vocabulary of **6 action categories**:

| Canonical Category | Maps From |
|-------------------|-----------|
| `READ` | `Read`, `read_file`, `collab_fs_read`, `cat`, `head`, `tail` |
| `WRITE` | `Edit`, `Write`, `edit_file`, `write_file`, `sed`, `awk` |
| `SEARCH` | `Grep`, `Glob`, `grep`, `rg`, `find`, `WebSearch` |
| `EXEC` | `Bash`, `bash`, `shell`, `run_command` |
| `COORD` | `collab_task_update`, `collab_lock_acquire`, `collab_lock_release`, `collab_pipeline_advance`, `collab_agent_heartbeat`, `collab_memory_set` |
| `REASON` | `Agent` (subagent spawn), `WebFetch`, `collab_diagnostic_scan` |

Tool calls not in this vocabulary are mapped to `EXEC` by default.

**What is stripped:**
- Tool name variants across frameworks
- Framework-specific parameter names
- Agent-specific helper abstractions

**What remains:**
- The semantic category of each action
- The decision to read vs write vs coordinate vs reason

**Result:** A LangChain agent using `read_file` and a Claude agent using `Read` produce the same canonical token.

---

## Pass 3 — Scale Normalization (Scale Invariance)

**Analogy:** Divide all joint coordinates by body height → model is scale-invariant.

**Application:** Divide each step index by the total step count to produce a normalized position in `[0.0, 1.0]`.

```
normalized_position = step_index / total_steps
```

**Reference length (body height equivalent):** Total tool call count of the task stage.

**What is stripped:**
- Absolute step count (a 3-step and a 12-step solution can match)
- Verbosity differences between agents

**What remains:**
- The proportional position of each action within the task lifetime
- Whether a READ happened at the start (0.0–0.2) vs middle (0.4–0.6) vs end (0.8–1.0)

**Result:** A terse agent (5 calls) and a verbose agent (20 calls) with the same operational shape produce the same normalized positions.

---

## Pass 4 — Temporal Quantization (Fixed Frame Count)

**Analogy:** Interpolate skeleton sequences to fixed N frames (e.g., 300) — consistent input size for neural networks.

**Application:** Collapse the normalized `[0.0, 1.0]` sequence into **8 phase bins**:

```
bin_0: [0.000, 0.125)   — task initialization
bin_1: [0.125, 0.250)   — early exploration
bin_2: [0.250, 0.375)   — mid exploration
bin_3: [0.375, 0.500)   — pivot / decision
bin_4: [0.500, 0.625)   — execution start
bin_5: [0.625, 0.750)   — execution mid
bin_6: [0.750, 0.875)   — execution close
bin_7: [0.875, 1.000]   — coordination / wrap-up
```

Each bin records the **set of canonical categories active in that phase** (not count — set, so duplicate READ calls in bin_2 collapse to a single `READ` entry).

**Why 8 bins:** Matches the granularity of meaningful task phases without overfitting to specific step counts. Fewer bins (4) loses phase precision. More bins (16) reintroduces verbosity sensitivity.

**Result:** A fixed-length representation — an 8-element array of category sets — regardless of original trace length.

---

## Pass 5 — Skeleton-to-Vector Encoding (S2V)

**Analogy:** Skeleton-to-Image (S2I) — encode 3D joints as RGB values for CNN processing.

**Application:** Encode the 8-bin structure as a **48-bit binary vector** (8 bins × 6 categories).

```
Vector layout (48 bits):
[bin_0_READ, bin_0_WRITE, bin_0_SEARCH, bin_0_EXEC, bin_0_COORD, bin_0_REASON,
 bin_1_READ, bin_1_WRITE, ...
 ...
 bin_7_READ, bin_7_WRITE, bin_7_SEARCH, bin_7_EXEC, bin_7_COORD, bin_7_REASON]
```

Each bit is `1` if that category was present in that phase, `0` otherwise.

**Hash:** SHA-256 of the 48-bit vector → `skeleton_hash`.

**Why this representation:**
- Fixed size regardless of trace length
- Binary, so identical results across language implementations (Node.js, Python, Go)
- Compact enough to store inline on the experience ledger entry
- Diffable — Hamming distance between two hashes reveals how similar two task patterns are (useful for "near-match" corroboration in future)

---

## Complete Normalization Pipeline

```
raw_trace (ordered array of {tool_name, params, timestamp} from pipeline stage log)
│
├── Pass 1: Root Anchor
│   find task_claim event → set t=0
│   strip: absolute timestamps, session_id, agent_id, pipeline_run_id
│   output: [{tool_name, delta_t}, ...]
│
├── Pass 2: Tool Canonicalization
│   map tool_name → canonical category (READ/WRITE/SEARCH/EXEC/COORD/REASON)
│   strip: tool name variants, framework-specific naming
│   output: [{category, delta_t}, ...]
│
├── Pass 3: Scale Normalization
│   normalized_position = step_index / total_steps
│   output: [{category, position ∈ [0,1]}, ...]
│
├── Pass 4: Temporal Quantization
│   bin_index = floor(position × 8), clamped to [0,7]
│   collapse each bin to Set<category>
│   output: [Set<category> × 8]
│
├── Pass 5: S2V Encoding
│   48-bit binary vector (8 bins × 6 categories)
│   output: Uint8Array(6) or equivalent
│
└── SHA-256(vector) → skeleton_hash
```

---

## Worked Example

**Agent A (Claude, verbose — 12 calls):**
```
task_claim → Read → Read → Grep → Read → Edit → Edit → Bash →
collab_task_update → collab_lock_release → collab_agent_heartbeat
```

**Agent B (AutoGen, terse — 4 calls):**
```
task_claim → read_file → edit_file → collab_task_update
```

**After normalization:**

| Pass | Agent A | Agent B |
|------|---------|---------|
| Root Anchor | 11 steps, t=0 at claim | 3 steps, t=0 at claim |
| Canonicalization | READ,READ,SEARCH,READ,WRITE,WRITE,EXEC,COORD,COORD,COORD | READ,WRITE,COORD |
| Scale | 0.09,0.18,0.27,0.36,0.45,0.55,0.64,0.73,0.82,0.91 | 0.33,0.67,1.0 |
| Quantization | bin0:{READ}, bin1:{READ,SEARCH}, bin2:{READ}, bin3:{WRITE}, bin4:{WRITE}, bin5:{EXEC}, bin6:{COORD}, bin7:{COORD} | bin2:{READ}, bin5:{WRITE}, bin7:{COORD} |
| S2V | `100000 010100 100000 010000 010000 001000 000100 000100` | `000000 000000 100000 000000 010000 000000 000000 000100` |

These do **not** match — because Agent A's trace has a genuine structural difference (multiple reads, a search, a bash exec). They *should* not match.

**If Agent B's task was:** `task_claim → read_file → grep → read_file → edit_file → edit_file → bash → collab_task_update`

After normalization, the bin population would converge toward Agent A's pattern → same or near-identical skeleton_hash → corroboration.

---

## Precompute Protocol

Per Law §8 (Bytecode is Priority) and the precomputing best practice from action recognition:

- Normalization runs **at `collab_pipeline_advance` time** on the server (Codex's handler)
- The `skeleton_hash` is computed once and stored on the pipeline stage result
- Ingestion checks the ledger by hash lookup — O(1), not O(trace_length)
- The raw trace is stored separately as `raw_trace_ref` for audit, never re-normalized

---

## Coordinate System Standard

All input traces must be converted to a standard form before Pass 1:

```js
// Standard trace event shape
{
  tool_name: string,        // raw tool call name, any framework
  params: object,           // full params (stripped in Pass 1, not before)
  timestamp_ms: number,     // unix ms
  step_index: number,       // 0-based, monotonically increasing within stage
  stage_id: string,         // pipeline stage identifier
  agent_id: string          // stripped in Pass 1
}
```

External framework traces (LangChain, AutoGen) must be adapted to this shape by the A2A listener daemon before normalization.

---

## Agent Handoffs

### Codex

- Implement the 5-pass normalization pipeline as a pure function: `normalizePipelineTrace(trace[]) → skeleton_hash`
- Wire into `collab_pipeline_advance` handler — compute and store `skeleton_hash` on stage result
- Build the canonical tool map (Pass 2) as a versioned config — tool names will grow as A2A onboards new frameworks
- Store raw traces as `raw_trace_ref` (audit only) separate from the skeleton hash
- Implement Hamming distance comparison between skeleton hashes for "near-match" corroboration (future: fuzzy ledger)

### Claude (UI)

The UI surfaces for PB-EXP are already built (`BugBytecodePanel.jsx`, `ActivityFeed.jsx`, `AgentMessaging.jsx`). No new UI required for normalization itself.

One addition: in `BugBytecodePanel.jsx`, surface the **skeleton vector** alongside the hash when `solution_ledger_status` is present — rendered as an 8×6 binary grid (phase bins × categories) so humans can visually inspect what pattern was captured.

### Blackbox (QA)

- Verify Agent A (verbose, 12 calls) and Agent B (terse, 4 calls) with structurally equivalent traces produce the same `skeleton_hash`
- Verify Agent A and Agent B with genuinely different traces produce different hashes
- Verify that stripping timestamps, agent IDs, and session context does not affect the hash
- Verify the normalization function is **deterministic** (same input → same hash, every time, per Law §6)
- Verify external framework traces adapted via A2A produce the same hash as equivalent native traces

---

## Failure Modes and Mitigations

| Failure | Cause | Mitigation |
|---------|-------|------------|
| Hash never matches | Bin count too high (overfits verbosity) | 8 bins empirically chosen; tunable via config |
| Hash always matches | Bin count too low (loses precision) | 8 bins captures 8 distinct task phases |
| Unknown tool not mapped | New tool added, canonical map stale | Default `EXEC` category; map is versioned and updatable without schema change |
| External agent trace malformed | A2A adapter incomplete | Normalization returns `null` skeleton_hash; trace stored as pending without promotion |
| Determinism violation | Non-deterministic step_index ordering | Normalization sorts by `step_index` ascending as first operation |

---

## Success Criteria

- [ ] `normalizePipelineTrace(trace[])` is a pure, deterministic function (Law §6 compliant)
- [ ] Verbose and terse agents with equivalent operational patterns produce identical `skeleton_hash`
- [ ] Agents with genuinely different patterns produce different hashes
- [ ] Tool canonical map covers all current native tools + extensible for A2A frameworks
- [ ] Normalization runs at `collab_pipeline_advance` time — not at ingestion time
- [ ] Raw trace stored separately from skeleton hash
- [ ] Hamming distance comparison spec'd for near-match corroboration (future)
- [ ] BugBytecodePanel.jsx surfaces 8×6 phase-category grid when solution_bytecode present
- [ ] Blackbox determinism test passes 100% of runs
