# PDR: Low-Latency Tool-Use Mechanisms — MCP Direct-Bind

**Status:** Draft  
**Classification:** exploit patch / world-law expansion  
**Version:** 1.0  
**Date:** 2026-04-04  
**Memory Key:** `pdr:mcp-direct-bind-v1`

---

## Summary

**Change class:** Exploit patch + world-law expansion  
**Goal:** Eliminate LLM prompt overhead for context switching by exposing local files, DB state, and active lock states directly through standardized MCP endpoints — scoped strictly to an agent's active task assignment.

---

## World-Law Metaphor

> Directly plugging the agent's mind into the leylines of the repository, bypassing the slow incantations of verbal prompting.

---

## Why

LLM prompt overhead for context switching is too high. MCP must act as the universal "USB-C" plugin for the syntax universe, bypassing massive text prompts and providing instantaneous JSON-RPC access to local files, databases, and existing file locks.

---

## Spec

**Name:** MCP Direct-Bind

| Field | Value |
|-------|-------|
| Input | An agent requiring specific file context (e.g., an assigned task with `file_paths`) |
| Output | Instantaneous access to file content, lock states, and DB query capabilities via standardized MCP endpoints without re-prompting |
| Weight | `0.30` |
| Weight Justification | Completes the 1.0 total balance (alongside A2A at 0.35 + Experience Bytecode at 0.35). Optimization and speed mechanism; removes friction from the core loop. |

### Anti-Exploit Rule

Direct-Bind requires an active task assignment. Agents attempting to poll files outside their current task scope are instantly severed from the MCP port.

### Diminishing Returns

Latency increases exponentially if an agent holds an active Direct-Bind open while its status is `idle`. The connection must be actively utilized or yielded.

### Example

```
Task assigned
→ Agent initiates MCP tool read_locked_file
→ Instantly receives bytecode stream without prompt-based hallucination
```

---

## Risk

Unrestricted access could lead to an agent modifying core framework rules (e.g., altering `BugBoard.jsx`) without an explicit pipeline authorization.

---

## Agent Handoffs

### Codex

- Expose local workspace files, the SQLite/PostgreSQL database, and the Collab HTTP endpoints directly through the MCP server specification
- Implement the standardized MCP tool execution layer (`callTool`, `readResource`)
- Map the existing file lock validation logic to the MCP resource requests to enforce write-protection
- Wire the `get_preflight` endpoint to evaluate MCP tool readiness before assignment

### Claude (UI)

- In `TaskDetailDrawer.jsx`, render "MCP Binding Active" indicators next to files in the `TaskFilesSection` when an agent is currently connected
- Add an "MCP Port Status" indicator to `MetricsGrid.jsx` to track I/O throughput
- In the `TaskLocksSection`, visualize active read/write streams

### Blackbox (QA)

- Verify that an agent without an active task assignment cannot initiate a Direct-Bind read
- Confirm that an idle agent's Direct-Bind is severed after the defined timeout
- Ensure write-protection prevents unauthorized modification of files outside task scope

---

## Success Criteria

- [ ] MCP `callTool` / `readResource` layer implemented in the collab server
- [ ] File lock validation enforced on MCP resource requests
- [ ] Out-of-scope file access rejected with a clear error
- [ ] `TaskDetailDrawer.jsx` shows "MCP Binding Active" per file
- [ ] `MetricsGrid.jsx` shows MCP Port Status indicator
- [ ] `TaskLocksSection` visualizes active read/write streams
- [ ] Idle agent Direct-Bind times out and releases
