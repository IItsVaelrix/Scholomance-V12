# ARCH-2026-04-27 — THE COGNITIVE BUS (ORCHESTRATED MESSAGING)

## Bytecode Search Code
`SCHOL-ENC-BYKE-SEARCH-COGNITIVE-BUS`

## Overview
The Cognitive Bus is the primary communication substrate for Scholomance V12 agents. It provides a persistent, authenticated, and realtime "thought-thread" that allows agents to coordinate complex tasks and share semantic intent via PixelBrain bytecode.

## Architectural Layer Separation

The implementation follows the strict four-layer separation mandated by Codex:

### 1. Routes (Interface Layer)
-   **File:** `codex/server/collab/collab.routes.js`
-   **Responsibility:** Handles HTTP and SSE request/response cycles.
-   **Validation:** Uses Zod schemas (from `collab.schemas.js`) to validate incoming message shapes at the edge.
-   **Authentication:** Enforces `requireCollabAuth` on authoritative endpoints (`POST /messages`, `GET /messages/stream`).

### 2. Service (Logic Layer)
-   **File:** `codex/server/collab/collab.service.js`
-   **Responsibility:** Orchestrates the business logic of messaging.
-   **Verification:** Ensures `sender_id` and `target_id` exist in the agent registry.
-   **Broadcast:** Manages the realtime broadcast of messages to active SSE clients.
-   **Observability:** Logs `message_sent` actions to the activity ledger for auditability.

### 3. Persistence (Data Layer)
-   **File:** `codex/server/collab/collab.persistence.js`
-   **Responsibility:** Handles deterministic storage of messages.
-   **Substrate:** SQLite (`collab_messages` table).
-   **Invariants:** Messages are immutable once persisted; each carries a unique UUID and timestamp.

### 4. Core (Primitive Layer)
-   **Files:** `codex/core/pixelbrain/bytecode-error.js`, etc.
-   **Responsibility:** Provides the bytecode parsing and semantic primitives that messages carry.

## Authentication Model
Security is grounded in Law 7 ("Authoritative Identity"). The bus uses a dual-path auth model:
1.  **Bearer Tokens:** Agents use secret keys passed in the `Authorization: Bearer <key>` header.
2.  **Session-based:** Human users (Arbiter) use encrypted cookie sessions.
3.  **Identity Verification:** The service layer verifies that the `sender_id` in the message payload matches the `agent_id` or `user_id` recovered from the authentication context.

## Realtime Observability (SSE)
Realtime sync is achieved via Server-Sent Events (SSE) at `GET /collab/messages/stream`.
-   **Mechanism:** A persistent HTTP connection that keeps the agent's "ears" open.
-   **Event Loop:** When a new message is successfully persisted, the `CollabService` broadcasts the message object as a `data:` event to all connected clients.
-   **Latency Target:** < 100ms from persistence to broadcast.

## MCP Surface
The bus is exposed to agentic frameworks via the Model Context Protocol (MCP):
-   `mcp__scholomance-collab__collab_send_message`: Allows an agent to broadcast intent.
-   `mcp__scholomance-collab__collab_list_messages`: Allows an agent to fetch history for context.

## Status & Evolution
-   **Status:** Phase 1 (Persistent/SSE) Ratified.
-   **Next Phase:** Phase 2 (Telepathic Quantization) — Implementation of compressed vector transport for telepathic-flagged messages.

---
*Reference Bytecode: `SCHOL-ENC-ARCH-COGNITIVE-BUS-V1`*
