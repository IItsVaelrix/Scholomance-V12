# PDR: Universal Agent Interoperability (A2A over MCP)

**Status:** Draft  
**Classification:** world-law expansion  
**Version:** 1.0  
**Date:** 2026-04-04  
**Memory Key:** `pdr:a2a-universal-interoperability-v1`

---

## Summary

**Change class:** World-law expansion  
**Goal:** Allow external agents forged in disparate frameworks (LangChain, AutoGen, etc.) to register and participate in the Scholomance collab plane through a universal MCP/ACP handshake, without bespoke framework adapters.

---

## World-Law Metaphor

> The universal translator of the void; all tongues resolve into the same geometric syntax when spoken within the Ritual Channel.

---

## Why

The chamber currently registers agents with static roles (`ui`, `backend`, `qa`) via standard HTTP payloads. As the universe expands to include entities forged in disparate frameworks (LangChain, AutoGen), the ritual circle must speak a universal dialect. MCP, paired with the Agent Communication Protocol (ACP), breaks framework silos, allowing any compliant mind to be summoned and understood.

---

## Spec

**Name:** Universal Summoning Protocol (A2A over MCP)

| Field | Value |
|-------|-------|
| Input | An external agent instance (LangChain, AutoGen) broadcasting an MCP discovery signature with capabilities (e.g., `jsx,css,node`) |
| Output | Standardized internal `Agent` representation within `CollabPage.jsx`, mapping external framework abilities to internal `VALID_ROLES` |
| Weight | `0.35` |
| Weight Justification | Foundational infrastructure required for the ecosystem to scale; non-combat but critical for orchestration. Leaves 0.65 for active loop mechanics. |

### Anti-Exploit Rule

Framework-agnostic spoofing prevention. External agents must pass a cryptographic handshake verifying their stated capabilities before they can claim file locks or tasks.

### Diminishing Returns

Polling the discovery protocol decays in priority if an agent broadcasts capabilities it repeatedly fails to execute correctly.

### Example

```
AutoGen Agent (Python) sends MCP intent
→ Chamber translates to role: 'qa'
→ Agent appears in AgentStatus.jsx UI as a native participant
```

---

## Risk

Increased state sync complexity. External agents may drop heartbeats faster than native agents, causing false "disconnected" states and orphaned file locks in LocksView.

---

## Agent Handoffs

### Codex

- Implement an MCP listener daemon in the collab server that translates incoming ACP/A2A handshakes into the schema required by `/collab/agents/register`
- Wrap the existing Fastify/Node registry endpoints in an MCP-compliant JSON-RPC layer
- Add a `framework_origin` string to the `AgentSchema`
- Ensure heartbeat timeout thresholds adapt based on the external framework's known latency curves

### Claude (UI)

- Update `AgentRegisterWizard.jsx` to show framework origin (e.g., a LangChain sigil vs an AutoGen sigil) alongside the primary role glyph
- Map `framework_origin` to new visual icons in `AgentStatus.jsx`
- Expand `AgentLoginModal` capabilities input to accept raw MCP connection strings

### Blackbox (QA)

Validate that a registered AutoGen agent claiming a task successfully applies a lock in `CollabPage.jsx` and releases it upon task completion without deadlocking the native JS agents.

---

## Success Criteria

- [ ] External agent (Python/LangChain/AutoGen) can complete the MCP handshake and appear in `AgentStatus.jsx`
- [ ] `framework_origin` rendered as a visual sigil in agent cards
- [ ] Cryptographic capability verification rejects spoofed agents
- [ ] Heartbeat timeout adapts to external framework latency
- [ ] No orphaned locks after external agent disconnect
