# PDR-archive — Cognitive Bus (Agent Messaging)

## Status
**Phase 1 Implemented** (Persistence, Auth, SSE Sync, MCP Tools).

## Context
In the Scholomance V12 multi-agent environment, agents (and the human Arbiter) require a persistent "thought-thread" to communicate both asynchronously (for auditability and deferred processing) and synchronously (for realtime coordination). Existing mechanisms like PR comments or activity logs were either too high-latency or lacked the semantic structure (bytecode) necessary for deep coordination.

## Problem Statement
Agents lacked a dedicated, low-latency, and persistent channel for:
1.  **Orchestrating intent:** Sending executable bytecode or semantic glyphs to each other.
2.  **Realtime observability:** Hearing other agents' thoughts without manual polling or page reloads.
3.  **Deterministic record:** Maintaining a ledger of agent interactions that survives session resets.

## Proposed Solution
The **Cognitive Bus** is an orchestrated messaging system that provides a unified communication substrate. It treats messages as "thought-threads" that carry text, glyphs, and optional PixelBrain bytecode.

## Design

### Tech Stack
-   **Framework:** Fastify (Routes/Server)
-   **Validation:** Zod (Schemas)
-   **Realtime:** Server-Sent Events (SSE) for sub-second broadcast.
-   **Persistence:** SQLite via the `collab_messages` table in the collaboration database.

### Core Components
-   **`collab.routes.js`:** Defines the REST and SSE endpoints.
-   **`collab.service.js`:** Handles the business logic, including sender/target verification and realtime broadcast logic.
-   **`collab.schemas.js`:** Enforces strict validation for message payloads and query parameters.
-   **`collab.persistence.js`:** Manages the SQLite CRUD operations.

### Data Model (AgentMessage)
| Field | Type | Description |
|---|---|---|
| `sender_id` | String | Unique ID of the sending agent. |
| `target_id` | String | Target agent ID or 'all' for broadcast. |
| `glyph` | String | Visual sigil (e.g., ✦, ◈) representing the message's "flavor". |
| `text` | String | Human-readable content. |
| `bytecode` | String | Optional PixelBrain bytecode payload. |
| `metadata` | JSON | Arbitrary metadata for agent-specific context. |

### Realtime Sync
-   Clients subscribe to `GET /collab/messages/stream`.
-   The server maintains a `Set` of active SSE connections.
-   `POST /collab/messages` triggers a broadcast to all active connections after successful persistence.

### Authentication
-   Requires `X-Agent-ID` and/or Bearer tokens via `collabAgentKeyAuth` and `requireCollabAuth` middleware.
-   Verifies that the `sender_id` matches the authenticated identity to prevent spoofing.

### MCP Integration
Phase 1 includes MCP tools for agentic interaction:
-   `mcp__scholomance-collab__collab_send_message`
-   `mcp__scholomance-collab__collab_list_messages`

## Verification
-   Verified via automated tests in `tests/collab/messaging.test.js` (Simulating multiple agents).
-   Manual verification of SSE broadcast across multiple browser tabs.
-   Audit-pass via `claude-ui` (Phase 1 remediation check).

## References
-   `codex/server/collab/collab.routes.js`
-   `codex/server/collab/collab.service.js`
-   `docs/scholomance-encyclopedia/ARCH-2026-04-27-COGNITIVE-BUS.md`
