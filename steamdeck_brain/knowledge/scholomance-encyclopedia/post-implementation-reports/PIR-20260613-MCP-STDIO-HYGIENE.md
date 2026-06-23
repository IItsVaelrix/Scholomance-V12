# Post-Implementation Report

## 1. Change Identity
- **Report ID:** PIR-20260613-MCP-STDIO-HYGIENE
- **Feature / Fix Name:** MCP stdio startup hygiene
- **Author / Agent:** Codex
- **Date:** 2026-06-13
- **Branch / Environment:** local workspace
- **Related Task / Ticket / Prompt:** "fix mcp"
- **Classification:** Behavioral / Tooling
- **Priority:** High

---

## 2. Executive Summary
The Scholomance collab MCP bridge used the stable `mcp-bridge-entry.js` command, but the user database stdout-suppression guard only recognized the implementation module path. That left the entrypoint vulnerable to non-protocol startup output on stdout, which can break MCP initialize handshakes. The bridge startup also now resumes stdin only after the SDK transport has attached its data listener, preserving child-process pipe delivery without allowing the first initialize frame to flow past the transport.

---

## 3. Intent and Reasoning
### Problem Statement
MCP stdio requires stdout to contain only JSON-RPC frames. Any diagnostic or database startup output on stdout can cause clients to fail initialization.

### Why This Change Was Chosen
The fix keeps the existing bridge architecture and makes the stable entrypoint obey the same stdout-clean rule as the original implementation module.

### Assumptions Made
- MCP hosts should continue launching `codex/server/collab/mcp-bridge-entry.js`.
- Startup diagnostics are acceptable on stderr.

### Alternatives Considered
- Remove the stable entrypoint: rejected because docs and scripts already depend on it.
- Silence all database logs globally: rejected because server diagnostics remain useful outside stdio MCP.

---

## 4. Scope of Change
### In Scope
- MCP bridge stdin startup ordering.
- MCP bridge-process detection for stdout hygiene.
- Focused MCP probe regression coverage.

### Out of Scope
- HTTP `/mcp` transport changes.
- Collab schema or tool contract changes.
- Editor-specific MCP client configuration.

### Change Type
- [x] Logic only
- [x] Build / tooling
- [x] Documentation

---

## 5. Verification
- `npm test -- tests/collab/mcp-probe.test.js tests/collab/mcp-bridge.test.js tests/collab/diagnostic-mcp.test.js`
- Manual stdio initialize with stderr redirected confirmed stdout contains only the JSON-RPC response.
