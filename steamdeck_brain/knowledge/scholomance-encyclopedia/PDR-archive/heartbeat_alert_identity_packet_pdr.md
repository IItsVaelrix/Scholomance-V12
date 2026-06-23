# PDR — Heartbeat Alert Identity Packet Protocol

## Status
**Proposed** — extends the Cognitive Bus (Phase 1) with active push to live MCP agents and a 30-second response SLA.

## Context
The Cognitive Bus already persists messages and broadcasts them to *browser* clients via SSE (`GET /collab/messages/stream`). MCP-connected agents (those that registered via `collab_agent_register` and keep `last_seen` fresh through `collab_agent_heartbeat`) have no symmetric path: they only see ritual-channel traffic if they explicitly poll `collab_message_list`. As a result, multi-agent rituals stall — `gemini-backend` posts a thought-thread, `claude-audit` is online, but never knows it was addressed until the human Arbiter pings it manually.

## Problem Statement
We need a deterministic mechanism by which:
1. Every agent whose heartbeat is fresh **at the moment of `message_sent`** is notified that a ritual-channel message exists.
2. The notification carries enough identity context for the receiving agent to act without re-querying (sender identity, recipient identity, message reference).
3. Receiving agents are bound to a **30-second response SLA**: an explicit acknowledgment (with optional payload) within 30 seconds of issue, or the alert is marked `expired` and recorded as an unresponsive event against the agent.

## Proposed Solution
Introduce an **Alert Dispatcher** that subscribes to the existing `message_sent` event on `collabService.events`, materializes one **Identity Packet** per live agent, persists it to a new `collab_alerts` table, and pushes it to recipients through two complementary channels:
- **Heartbeat response piggyback** — `collab_agent_heartbeat` returns pending alerts inline.
- **MCP push tool** — `collab_alerts_pull(agent_id)` for explicit drain; reused by the MCP bridge so agents that maintain a long-poll loop receive alerts within their poll window.

A reaper thread sweeps alerts every 5 seconds and marks any unanswered alert `expired` once `now - issued_at >= 30s`.

## Design

### Tech Stack
- **Framework:** Fastify (extends `codex/server/collab/collab.routes.js`)
- **Validation:** Zod (new schemas in `collab.schemas.js`)
- **Persistence:** SQLite — Migration v15 introduces `collab_alerts` and `collab_alert_responses`
- **Event source:** existing `collabService.events.emit('message_sent', message)` — no new emitter needed
- **Reaper:** `setInterval` scoped to the route plugin (registered in `collabRoutes`), with `onClose` teardown matching the existing SSE bridge pattern

### Liveness Definition
An agent is **live** for alert purposes when:
- `agents.status` is `online` or `busy` (not `offline`)
- `agents.last_seen >= now - HEARTBEAT_FRESHNESS_WINDOW_MS` (default `90_000`)

Stale agents are skipped at dispatch time and will not receive backfill on reconnect — alerts are ephemeral by design. The PDR-archive `cognitive_bus_pdr.md` ledger already covers durable history; alerts are presence-bound.

### Data Model

#### `collab_alerts` (Migration v15)
| Field | Type | Description |
|---|---|---|
| `id` | TEXT (uuid) | Alert identifier — primary key. |
| `message_id` | INTEGER | FK → `collab_messages.id`. |
| `recipient_id` | TEXT | Agent the alert is bound to. |
| `sender_id` | TEXT | Author of the source message. |
| `target_id` | TEXT | `'all'` or a specific agent ID, copied from the source message. |
| `identity_packet` | TEXT (JSON) | Frozen denormalized identity payload (see schema below). |
| `issued_at` | INTEGER (ms epoch) | Dispatch timestamp. |
| `expires_at` | INTEGER (ms epoch) | `issued_at + 30_000`. |
| `status` | TEXT | `pending` \| `acknowledged` \| `expired`. |
| `delivered_via` | TEXT | `heartbeat` \| `pull` \| `null` until first delivery. |

#### `collab_alert_responses` (Migration v15)
| Field | Type | Description |
|---|---|---|
| `alert_id` | TEXT | FK → `collab_alerts.id` (PK with `agent_id`). |
| `agent_id` | TEXT | Responding agent. |
| `responded_at` | INTEGER (ms epoch) | Receipt timestamp. |
| `latency_ms` | INTEGER | `responded_at - issued_at`. |
| `payload` | TEXT (JSON) | Optional response body — bytecode, glyph, free text. |

### Identity Packet (frozen at dispatch)
```json
{
  "alert_id": "alr_<uuid>",
  "issued_at": 1714234567890,
  "expires_at": 1714234597890,
  "sla_ms": 30000,
  "recipient": {
    "id": "claude-audit",
    "name": "Claude Audit",
    "role": "qa",
    "capabilities": ["bytecode-audit", "vaelrix-law-audit", "..."]
  },
  "sender": {
    "id": "gemini-backend",
    "name": "Gemini Backend",
    "role": "backend"
  },
  "message": {
    "id": 4217,
    "target_id": "all",
    "glyph": "⟐",
    "text": "...",
    "bytecode": "PB-EXP-v1-... | null",
    "created_at": "2026-04-27T20:30:00.000Z"
  },
  "respond_via": {
    "tool": "collab_alert_respond",
    "endpoint": "POST /collab/alerts/:alert_id/respond"
  }
}
```
The packet is a **snapshot** — agent rename or capability changes after dispatch do not mutate it.

### Dispatch Flow
1. `collabService.sendMessage` persists the message and emits `message_sent` (unchanged).
2. New `AlertDispatcher` subscribes to `message_sent`. On event:
   1. Resolve live recipients:
      - If `target_id === 'all'` → all agents matching the liveness definition, **excluding** `sender_id`.
      - Else → singleton `[target_id]` if that agent is live, else dispatch is skipped (no resurrection — silent agents stay silent).
   2. For each recipient, write a `collab_alerts` row and freeze the identity packet at write-time.
   3. If the recipient has an open MCP heartbeat connection, push immediately (set `delivered_via='heartbeat'`). Otherwise the alert sits `pending` until the next `collab_agent_heartbeat` or `collab_alerts_pull` call drains it.
3. `logActivity({ action: 'alert_issued', target_type: 'agent', target_id: recipient_id, details: { message_id, alert_id } })` records dispatch for the deterministic ledger.

### Response Flow
- New tool `collab_alert_respond(alert_id, payload?)` and route `POST /collab/alerts/:alert_id/respond`.
- Validates that `request.agentContext.id === alert.recipient_id` (no proxy responses).
- Writes to `collab_alert_responses`, updates `collab_alerts.status` to `acknowledged`.
- Emits `alert_acknowledged` on `collabService.events` so observers (Arbiter UI, audit dashboards) see live SLA telemetry.

### Reaper (SLA Enforcement)
- Interval: 5s.
- `UPDATE collab_alerts SET status='expired' WHERE status='pending' AND expires_at <= now`.
- For each newly expired row:
  - `logActivity({ action: 'alert_expired', target_id: recipient_id, details: { alert_id, message_id, latency_budget_breached_ms: now - expires_at } })`.
  - Emit `alert_expired` on `collabService.events`.
  - **No automatic agent demotion.** Repeated expiries are aggregated by a separate observer (out of scope for this PDR) — keeping the dispatcher single-responsibility.
- `onClose`: clear the interval (matching the `messageClients` cleanup pattern in `collab.routes.js:65`).

### MCP Integration
New tools registered alongside the existing collab suite:
- `collab_alerts_pull(agent_id)` — drains and returns all `pending` alerts for the calling agent. Marks them `delivered_via='pull'`. **Read does not extend SLA** — `expires_at` is fixed at dispatch.
- `collab_alert_respond(alert_id, payload?)` — acknowledgment. Idempotent; second call returns the existing response row.
- `collab_alert_list(agent_id?, status?)` — read-only inspection for dashboards/audits.

`collab_agent_heartbeat` is extended (additive, not breaking) to return:
```json
{
  "ok": true,
  "tool": "collab_agent_heartbeat",
  "result": {
    "...existing fields": "...",
    "pending_alerts": [ /* IdentityPacket[] */ ]
  }
}
```

### REST Surface
| Method | Path | Purpose |
|---|---|---|
| `GET` | `/collab/alerts` | List alerts (optional `agent_id`, `status` filters). |
| `POST` | `/collab/alerts/:alert_id/respond` | Acknowledge with optional payload. |
| `GET` | `/collab/alerts/stream` | SSE stream of `alert_issued` / `alert_acknowledged` / `alert_expired` events for the Arbiter UI. |

All gated by `requireCollabAuth`. The respond endpoint additionally enforces `agentContext.id === alert.recipient_id`.

### Authentication
- Mirrors existing Cognitive Bus posture: agent-key Bearer or authenticated session.
- Recipient verification on respond is **fail-closed** — a dev-bypass session cannot acknowledge an alert.

### Failure Modes & Idempotency
| Scenario | Behavior |
|---|---|
| Message has no live recipients | Dispatcher logs `alert_skipped_no_live_recipients`, no rows written. |
| Agent goes offline mid-window | Existing pending alert remains in DB; reaper expires it on schedule. |
| Agent reconnects after expiry | No replay. Expired alerts are visible via `collab_alert_list` for audit only. |
| Duplicate respond call | Tool returns `already_acknowledged: true` plus the original response row; no DB churn. |
| Reaper crash | On plugin restart, an idempotent boot-time sweep runs the same `UPDATE` once before the interval starts. |

## Verification
- New unit tests in `tests/collab/alerts.test.js`:
  - Dispatch fan-out on `target_id='all'` produces one row per live, non-sender agent.
  - Dispatch on directed message creates exactly one row when target is live, zero when stale.
  - Identity packet snapshot is unaffected by post-dispatch agent renames.
  - Respond inside SLA → `acknowledged`; outside SLA → `expired` and respond returns `410 Gone`.
  - Reaper transitions `pending → expired` on the boundary tick (parametric clock).
- Integration test: two simulated agents (live), one offline; sender posts; assert two alerts dispatched, two rows persisted, one acknowledgment, one expiry after 30s of simulated time.
- Manual verification: Arbiter UI subscribes to `/collab/alerts/stream` and observes the issue → ack → expire lifecycle in real time.
- Audit pass via `claude-audit` (`vaelrix-law-audit` + `bytecode-audit`) before merge.

## Open Questions
1. Should `target_id='all'` alerts respect agent capabilities (e.g., skip `qa`-role agents for a `ui` directive)? **Default proposal:** no filter; capability-aware routing is a separate PDR.
2. Should expiry trigger automatic re-dispatch to the *next* live agent matching role/capability? **Default proposal:** no — that's escalation policy, not alert mechanics.
3. Should the SLA window be configurable per message? **Default proposal:** fixed 30s for v1; surface as `metadata.sla_ms_override` in v2 if needed.

## References
- `codex/server/collab/collab.routes.js` — alert routes co-located with `/messages` block.
- `codex/server/collab/collab.service.js` — dispatcher subscribes alongside the existing `message_sent` SSE bridge.
- `codex/server/collab/collab.persistence.js` — Migration v15 + `alerts.create`, `alerts.getPending`, `alerts.markExpired`, `alert_responses.create`.
- `codex/server/collab/collab.schemas.js` — `IdentityPacketSchema`, `AlertResponseSchema`.
- `codex/server/collab/mcp-bridge.js` — register the three new tools, extend heartbeat result shape.
- `docs/scholomance-encyclopedia/PDR-archive/cognitive_bus_pdr.md` — direct predecessor; this PDR layers on top, no contract revisions to the bus itself.
- `docs/scholomance-encyclopedia/ARCH-2026-04-27-COGNITIVE-BUS.md` — companion architecture doc to be updated post-implementation with the alert flow diagram.
