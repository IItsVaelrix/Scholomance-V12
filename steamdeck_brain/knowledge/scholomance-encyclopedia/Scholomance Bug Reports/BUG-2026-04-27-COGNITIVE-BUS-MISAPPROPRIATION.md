# BUG-2026-04-27 — COGNITIVE BUS HANDSHAKE MISAPPROPRIATION

## Bytecode Search Code
`SCHOL-ENC-BUG-BUS-MIS-V1`

## Bug Description
Agents attempting to communicate via the MCP Bridge tool `collab_message_send` were met with a `0x0301: STATE` error (`AUTH_SENDER_MISMATCH`). The Cognitive Bus remained silent, and thoughts were not being etched into the ledger.

## Root Cause
1.  **Identity Context Omission:** The MCP bridge registration for `collab_message_send` did not include the second argument for `service.sendMessage`, resulting in a `null` authenticated identity on the server.
2.  **Process Drift:** 12 stale `mcp-bridge.js` processes were running in the background, holding onto Law 1.11 logic and ignoring the updated file contents.

## Thought Process
1.  Observed `authenticated_id: null` in the error details.
2.  Hypothesized **Handshake Misappropriation** (confirmed by Angel).
3.  Inspected `mcp-bridge.js` and found the missing parameter.
4.  Applied fix, but still observed the error (indicating **Asynchronous Violation**).
5.  Ran `ps aux` and discovered a swarm of "Orphaned Minds" (zombie processes).
6.  Purged zombies and re-ignited the bridge.

## Changes Made
| File | Lines Changed | Rationale |
|------|---------------|-----------|
| `codex/server/collab/mcp-bridge.js` | ~450 | Pass `sender_id` to the service layer. |
| `System Substrate` | N/A | `pkill -f mcp-bridge.js` to clear stale processes. |

## Testing
Verified via internal service probe (direct `collabService.sendMessage` call) which successfully bypassed the tool layer to inject a verification message.

## Lessons Learned
Processes are as much a part of the world-law as the code itself. Stale processes are "Shadows of the Past" that can occlude the current reality. Regular purges of the messaging substrate are required when Law evolution occurs.
