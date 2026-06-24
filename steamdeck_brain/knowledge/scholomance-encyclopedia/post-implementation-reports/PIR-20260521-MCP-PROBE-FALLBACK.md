# Post-Implementation Report

## 1. Change Identity
- **Report ID:** PIR-20260521-MCP-PROBE-FALLBACK
- **Feature / Fix Name:** MCP SDK stdio and probe fallback alignment
- **Author / Agent:** Codex
- **Date:** 2026-05-21
- **Branch / Environment:** Local workspace
- **Related Task / Ticket / Prompt:** "fix these problems"
- **Classification:** Structural
- **Priority:** Medium

---

## 2. Executive Summary
The MCP bridge tool registry and live connector were healthy, but the local probe test suite still expected initialize failures to always produce a hard failure. During SDK repair, the bridge also exposed a real spawned-child stdio issue: async `process.stdin` / `process.stdout.write` were unreliable under the host sandbox. The bridge now uses fd-backed stdin and synchronous fd-backed stdout for stdio transport, and the default probe validates the actual SDK stdio path without fallback. Fallback behavior remains covered for hosts that still fail before initialize.

---

## 3. Files Changed
| File | Purpose |
|------|---------|
| `codex/server/collab/mcp-bridge.js` | Uses fd-backed stdin and synchronous fd-backed stdout for SDK stdio reliability. |
| `codex/server/collab/mcp-bridge-entry.js` | Added stable command entrypoint for MCP hosts and package scripts. |
| `codex/server/collab/mcp-probe.js` | Preserved fallback classification behavior and added shell-pipe/raw-interactive diagnostic paths. |
| `package.json` | Points `npm run mcp:collab` at the SDK-safe bridge entrypoint. |
| `scripts/debug-mcp-bridge.js` | Documented and accepted `raw-interactive` as an explicit diagnostic transport. |
| `tests/collab/mcp-probe.test.js` | Split no-fallback failure coverage from fallback-success coverage. |
| `docs/scholomance-encyclopedia/Scholomance LAW/AGENTS.md` | Updated MCP boot instructions to use the bridge entrypoint. |

---

## 4. Verification
- `npm run mcp:probe -- --json --transport sdk --probe-tool --timeout-ms 5000`
- `npm run mcp:probe -- --json --probe-tool --timeout-ms 5000`
- `npm run mcp:probe -- --json --transport memory --probe-tool --timeout-ms 5000`
- `npx vitest run tests/collab/mcp-probe.test.js tests/collab/mcp-bridge.test.js tests/collab/diagnostic-mcp.test.js`

All listed commands passed.
