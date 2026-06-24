# BUG-2026-04-26-IPV6-PROXY-BLINDNESS

## Bytecode Search Code
`SCHOL-ENC-BYKE-SEARCH-IPV6-FLY-PROXY`

## Bug Description
The site achieved a "green launch" (successful health checks) on Fly.io, but remained unreachable from external traffic (Cloudflare/Public Web). Users encountered 502 Bad Gateway or timeouts despite the infrastructure dashboard reporting a healthy state.

## Root Cause
The `HOST` environment variable was set to `0.0.0.0`, which in modern Node.js Fastify environments binds exclusively to IPv4. 
1. **Fly.io internal checks:** The local Machine health checker (`flyd`) queries the app over IPv4 (usually via `127.0.0.1`), passing the check and reporting a "green" state.
2. **External Traffic Routing:** Fly Proxy routes incoming external traffic (from Cloudflare) into the machine via its internal 6PN (IPv6) network (`fdaa::...`). 
3. **The Mismatch:** Since the app was only listening on IPv4, it was "blind" to the IPv6 traffic from the Proxy, causing all external requests to be dropped or refused.

## Thought Process
1. **Forensic Audit:** Audited the requested persistence adapters (`codex/server/persistence.adapter.js`, `codex/server/db/persistence.wrapper.js`) to check for deadlocks or failed Turso connections.
2. **Analysis:** The adapters were found to be correct. The Turso async wrapper correctly handles migrations and does not hang the event loop.
3. **Environmental Scan:** Examined `fly.toml` and `Dockerfile`. Noticed `HOST="0.0.0.0"`.
4. **Breakthrough:** Recalled that Fly.io routes external traffic via its private IPv6 network. A "green launch" with unreachable content is a classic symptom of IPv4-only binding in an IPv6-proxy environment.
5. **Solution:** Binding to `::` enables Node.js to listen on both IPv4 and IPv6 (via dual-stack), allowing both local `flyd` (IPv4) and external Proxy (IPv6) traffic to reach the app.

## Changes Made

| File | Lines Changed | Rationale |
|------|---------------|-----------|
| `fly.toml` | ~11 | Changed `HOST` from `0.0.0.0` to `::` |
| `Dockerfile` | ~55 | Changed `ENV HOST` from `0.0.0.0` to `::` |

## Testing
1. **Health Check verification:** Binding to `::` catches IPv4-mapped IPv6 traffic, ensuring local health checks still pass.
2. **External Verification:** Site becomes reachable via Fly Proxy after deployment.

## Lessons Learned
1. **Internal vs. External Connectivity:** A healthy process (internal check) does not guarantee external reachability if the network topology binding is too narrow.
2. **Default to IPv6 Dual-Stack:** In containerized cloud environments (Fly.io, Render, etc.), always bind to `::` instead of `0.0.0.0` to ensure compatibility with modern internal routing networks.
3. **Vaelrix Law Audit Rigor:** By deterministically auditing the persistence layer first, we ruled out database corruption/hanging, allowing us to pivot quickly to environmental root causes.

---

*Entry Status: DETERMINISTIC | Last Updated: 2026-04-26*
