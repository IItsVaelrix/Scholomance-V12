# Post-Implementation Report

## 1. Change Identity
- **Report ID:** PIR-20260620-MCP-OAUTH-COMPAT
- **Feature / Fix Name:** MCP OAuth compatibility for Grok custom connectors
- **Author / Agent:** Codex
- **Date:** 2026-06-20
- **Branch / Environment:** Local workspace
- **Related Task / Prompt:** "yes please" after Grok requested OAuth credentials for the live MCP connector
- **Classification:** Security / Infrastructure / API compatibility
- **Priority:** High

## 2. Executive Summary
Scholomance's remote MCP endpoint already supported bearer agent keys, but Grok's custom connector UI requires an OAuth authorization-code shape. This change adds a narrow MCP OAuth compatibility layer under `/mcp/oauth/*` without replacing the existing agent-key path. The authorize endpoint requires a Scholomance browser session by default, issues a short-lived authorization code with PKCE S256, and the token endpoint mints a hashed, expiring collab agent token through the existing `collab_agent_keys` seam. The live URL values are now predictable after deployment: `https://scholomance-v12.fly.dev/mcp/oauth/authorize` and `https://scholomance-v12.fly.dev/mcp/oauth/token`.

## 3. Intent and Reasoning
### Problem Statement
Grok can see the MCP server but prompts for OAuth credentials. The existing production auth model expects `Authorization: Bearer sk-scholomance-...`, which Grok's connector setup screen does not expose as the primary path.

### Why This Change Was Chosen
The safest compatibility layer is to translate OAuth authorization-code + PKCE into the existing collab agent-key auth surface. This keeps one downstream authorization model for `/mcp` instead of adding a parallel privileged token validator.

### Assumptions Made
- Grok supports authorization-code OAuth with PKCE and token auth method `none`.
- Client ID is the collab agent ID, with `grok-backend` registered by default.
- Production authorization should require a real Scholomance browser session unless `MCP_OAUTH_REQUIRE_SESSION=false` is explicitly set.
- `MCP_OAUTH_APPROVER_USERS` can further restrict which logged-in user IDs, usernames, or emails may approve MCP OAuth grants.

### Alternatives Considered
- Public no-session OAuth approval: rejected because anyone who guessed `grok-backend` could mint MCP access.
- Client-secret-only flow: rejected because Grok's displayed recommended mode is PKCE-only and the client secret field is optional.
- Separate OAuth token table: rejected for this pass because the existing hashed `collab_agent_keys` table already provides expiry, revocation, and validation.

## 4. Scope of Change
### In Scope
- New OAuth metadata endpoints.
- New `/mcp/oauth/authorize` endpoint.
- New `/mcp/oauth/token` endpoint.
- Default configured client for `grok-backend`.
- Token exchange through existing hashed agent-key persistence.

### Out of Scope
- Deployment to Fly.
- A QA-owned committed test file.
- Refresh tokens.
- OAuth dynamic client registration.

### Change Type
- [ ] UI only
- [ ] Logic only
- [ ] Data model
- [x] API contract
- [ ] Persistence layer
- [ ] Styling / layout
- [ ] Performance
- [ ] Accessibility
- [x] Security
- [ ] Build / tooling
- [x] Documentation
- [x] Multi-layer / cross-cutting

## 5. Files Changed
| File | Purpose |
|------|---------|
| `codex/server/collab/mcp-oauth.routes.js` | Adds OAuth metadata, authorization, PKCE verification, token minting, and `grok-backend` default client registration. |
| `codex/server/index.js` | Registers the OAuth compatibility routes before the authenticated Streamable HTTP MCP route. |
| `docs/scholomance-encyclopedia/post-implementation-reports/PIR-20260620-MCP-OAUTH-COMPAT.md` | Documents the implementation and residual QA handoff. |

## 6. Security Notes
- Authorization code flow requires PKCE S256.
- Authorization requires a session by default.
- Existing collab agents are not OAuth clients by default. Only configured clients, including the built-in `grok-backend`, are allowed unless `MCP_OAUTH_ALLOW_EXISTING_AGENTS=true`.
- `MCP_OAUTH_APPROVER_USERS` can restrict approval to specific operator identities.
- Redirect URIs must be HTTPS unless localhost in non-production.
- Access tokens are returned once, stored only as bcrypt hashes, and expire by default after 30 days.
- Existing `/mcp` bearer validation remains the authority.

## 7. Verification
- `node --check codex/server/collab/mcp-oauth.routes.js`
- `node --check codex/server/index.js`
- Focused in-process Fastify probe:
  - authorize returned `302` to `https://grok.com/...` with an authorization code
  - token endpoint returned `200` with `Bearer`
  - returned access token validated as agent `grok-backend`
- `eslint` focused pass:
  - `codex/server/collab/mcp-oauth.routes.js`
  - `codex/server/index.js`

## 8. Residual Risk
The QA-owned test file lock blocked writing `tests/collab/mcp-oauth.routes.test.js`. Gemini/QA should add a committed test covering successful PKCE exchange, bad verifier rejection, unknown client rejection, and session-required behavior.

## 9. Final Verdict
Functionally complete but needs follow-up.

The backend compatibility layer is implemented and locally verified, but the change is not deployed and still needs a QA-owned regression test before it should be treated as production-ready.
