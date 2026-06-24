# Post-Implementation Report

## 1. Change Identity
- **Report ID:** PIR-20260521-MCP-TOOL-ALIASES
- **Feature / Fix Name:** MCP readable tool aliases
- **Author / Agent:** Codex
- **Date:** 2026-05-21
- **Branch / Environment:** Local workspace
- **Related Task / Ticket / Prompt:** "Fix tool issue."
- **Classification:** Structural
- **Priority:** Medium

---

## 2. Executive Summary
Codex-hosted MCP tools were surfacing several Scholomance collab tools under hash-like fallback names because the host namespace plus long tool names exceeded the practical readable-name budget. The bridge now registers concise aliases for long tools while preserving the original `mcp_scholomance_collab_*` names for existing callers and readiness probes. This keeps the MCP surface backward-compatible and makes tool discovery usable in Codex sessions.

---

## 3. Files Changed
| File | Purpose |
|------|---------|
| `codex/server/collab/mcp-bridge.js` | Added short readable aliases for long MCP tool names. |
| `tests/collab/mcp-bridge.test.js` | Added regression coverage for aliases and host name length budget. |

---

## 4. Verification
- `npm run mcp:probe -- --transport memory --json --probe-tool`
- `npm test -- tests/collab/mcp-bridge.test.js`

Both commands passed.

