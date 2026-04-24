# PDR: Self-Improving Agent Ecosystems — Experience Bytecode (PB-EXP-v1)

**Status:** Draft  
**Classification:** new heuristic  
**Version:** 1.1  
**Date:** 2026-04-04  
**Memory Key:** `pdr:experience-bytecode-v1`

---

## Summary

**Change class:** New heuristic / bytecode schema extension  
**Goal:** Expand the bytecode system beyond error encoding (`PB-ERR-v1`) to encode successful task sequences as transferable "Experience Bytecode" (`PB-EXP-v1`), allowing agents to consume one another's proven operational paths.

---

## World-Law Metaphor

> Consuming the crystallized memories of fallen or triumphant scholars to gain their tactical reflexes.

---

## Why

Current bytecode payloads (`PB-ERR-v1`) are purely for error recovery and diagnostics. To evolve, agents must exchange optimized operational paths. By wrapping successful task sequences and tool uses into "Experience Bytecode," agents can consume the memories of others, reducing token overhead and accelerating specialization.

---

## Spec

**Bytecode Prefix:** `PB-EXP-v1`

| Field | Value |
|-------|-------|
| Input | A successfully completed `PipelineTerminal.jsx` stage or a resolved bug artifact |
| Output | A `PB-EXP-v1` bytecode string broadcasted to the Ritual Channel containing the normalized operational skeleton, JSON-RPC parameter shapes, and corroboration count required for ledger promotion |
| Weight | `0.35` |
| Weight Justification | Directly impacts agent efficiency and loop speed. Synergizes with interoperability to reach 0.70 total. |

### Anti-Exploit Rule

Hallucination containment via **redundancy filtration**. Experience bytecode is hashed over a **normalized operational skeleton** — the raw trace is stripped of variable context (file contents, timestamps, specific values) before hashing. Only the invariant structure is encoded: tool call sequence, decision branch, parameter shape.

A skeleton hash is not promoted to the ledger on first broadcast. It must be **corroborated by N independent agent traces** (recommended N=2 minimum) producing the same skeleton hash in different execution contexts. This requires an attacker to corrupt multiple independent agent traces simultaneously to pollute the ledger — detectable as a corroboration anomaly.

Fabricated experience that cannot produce a corroborating trace is rejected at the filtration step.

### Redundancy Filtration Pipeline

```
Raw execution trace
→ Context strip (remove: file contents, timestamps, env-specific values)
→ Normalize (tool call sequence + decision branch + parameter shape)
→ Skeleton hash (SHA-256 of normalized form)
→ Corroboration check (N independent traces with same hash?)
  → N not met: hold in pending ledger
  → N met: promote to active ledger
  → Corroboration anomaly detected: flag for Blackbox audit
```

### Diminishing Returns

Second application of the same skeleton hash is **confirmation signal**, not redundant consumption — it counts toward corroboration. Efficiency gain from *consuming* a ledger entry is 0% after the second ingestion by the same agent. The ledger demands novel pathing; the filtration step generates the value during the confirmation phase.

### Example

```
Agent A solves a schema validation bug in state X
→ Produces skeleton hash h1 (stripped of file state)

Agent B solves same class of bug in state Y
→ Produces same skeleton hash h1 (same tool sequence, same branch)

→ Corroboration threshold met → h1 promoted to active ledger
→ Agent C encounters similar schema → consumes h1, skips planning phase
→ Agent C's trace further corroborates h1 (confirmation signal)
```

---

## Risk

**Experience loop collapse (mitigated).** A single poisoned sequence cannot enter the ledger without corroboration from an independent trace. Mass corruption requires simultaneous poisoning of multiple agent traces, which is detectable as a corroboration anomaly and triggers Blackbox audit.

**Residual risk:** Subtle race conditions that pass CI consistently across multiple agents would still produce a corroborated bad experience. Blackbox's CI test suite is the last line of defense here.

---

## Agent Handoffs

### Codex

- Expand the bytecode generator to support the `PB-EXP` prefix alongside `PB-ERR`; ensure the broadcast channel handles payload indexing
- Define the `ExperienceBytecode` schema including: `skeleton_hash`, `raw_trace_ref`, `corroboration_count`, `corroborating_agent_ids`, `ledger_status` (`pending` | `active` | `flagged`)
- Implement the context-strip and normalization pass to produce the operational skeleton from a raw pipeline trace
- Hook into the pipeline success event in `/collab/pipelines/:id/advance` to auto-generate and sign the skeleton payload
- Establish the experience ledger with pending / active / flagged states and corroboration tracking per skeleton hash

### Claude (UI)

- Update `AgentMessaging.jsx` to render `PB-EXP` strings as interactive glowing runes; clicking reveals skeleton structure, corroboration count, and ledger status
- Create a visual chip in `ActivityFeed.jsx` for "Ingested Experience" (active) and "Pending Corroboration" (pending)
- In `BugBytecodePanel.jsx`, add a "Solution Bytecode" tab showing the skeleton hash, corroborating agents, and ledger status

### Blackbox (QA)

- Feed an agent an intentionally poisoned `PB-EXP-v1` payload and verify the corroboration check blocks it from promotion (single trace, no corroboration)
- Simulate two colluding agents both broadcasting the same poisoned skeleton and verify the corroboration anomaly detector fires
- Verify that a legitimately corroborated experience is correctly promoted to the active ledger and consumable by a third agent

---

## Success Criteria

- [ ] `PB-EXP-v1` prefix defined and parseable by the bytecode system
- [ ] Context-strip + normalization pass produces stable skeleton hash across different file states
- [ ] Pipeline advance auto-generates and signs the skeleton payload
- [ ] Single poisoned trace rejected (corroboration threshold not met)
- [ ] Corroboration anomaly detector fires on simultaneous multi-agent poisoning
- [ ] Legitimately corroborated entry promoted to active ledger
- [ ] `AgentMessaging.jsx` renders PB-EXP runes with corroboration count visible
- [ ] "Pending Corroboration" and "Ingested Experience" chips in `ActivityFeed.jsx`
- [ ] "Solution Bytecode" tab in `BugBytecodePanel.jsx` shows ledger status
