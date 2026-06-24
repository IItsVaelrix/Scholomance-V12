# Post-Implementation Report

## 1. Change Identity
- **Report ID:** PIR-20260620-OAUTH-DISABLED-ROUTE
- **Feature / Fix Name:** Graceful disabled Google OAuth route
- **Author / Agent:** Codex
- **Date:** 2026-06-20
- **Branch / Environment:** Local workspace
- **Related Task / Prompt:** User reported `{"message":"Route not found","path":"/auth/oauth/google"}` while trying to register
- **Classification:** Behavioral / Security / Auth UX
- **Priority:** High

## 2. Executive Summary
The live server returns a generic 404 for `/auth/oauth/google` because Google OAuth credentials are not configured. The auth page can still navigate users to that URL, which turns a disabled provider into a confusing dead-end. This change keeps the OAuth route plugin mounted even when providers are disabled and returns a clear HTML page for known-but-unconfigured providers. Real Google OAuth behavior is unchanged when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are present.

## 3. Intent and Reasoning
### Problem Statement
Users trying Google registration saw raw JSON instead of a usable account path. The system was technically correct that the route was unmounted, but that behavior was hostile to account creation.

### Why This Change Was Chosen
A server-side fallback fixes direct navigation, deployed clients with stale UI, and any future auth page variant without crossing into UI ownership. The page directs users back to normal email/password registration while preserving the secure deny-by-default OAuth provider gate.

### Assumptions Made
- Google OAuth is intentionally disabled on live until real provider credentials are configured.
- Email/password registration remains the fallback account creation path.
- Unknown provider names should still return 404 rather than leaking route behavior.

### Alternatives Considered
- Add Google provider credentials: not possible without Angel's Google OAuth app secrets.
- Hide the Google button in UI: useful follow-up, but UI-owned and not required to eliminate the raw 404.
- Enable mock OAuth in production: rejected as insecure.

## 4. Scope of Change
### In Scope
- Keep `/auth/oauth/:provider` mounted even when no provider credentials exist.
- Return a clear unavailable page for known providers, currently Google.
- Preserve 404 behavior for unknown providers.

### Out of Scope
- Creating Google OAuth credentials.
- Deploying to Fly.
- UI-owned auth page changes.
- QA-owned committed route tests.

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
- [ ] Multi-layer / cross-cutting

## 5. Files Changed
| File | Purpose |
|------|---------|
| `codex/server/routes/oauth.routes.js` | Adds disabled-provider fallback HTML for known OAuth providers. |
| `docs/scholomance-encyclopedia/post-implementation-reports/PIR-20260620-OAUTH-DISABLED-ROUTE.md` | Documents the behavior fix and remaining deployment/UX work. |

## 6. Verification
- `node --check codex/server/routes/oauth.routes.js`
- Focused ESLint on `codex/server/routes/oauth.routes.js`
- In-process Fastify probe with no Google credentials:
  - `GET /auth/oauth/google` returned `503`
  - response type was `text/html`
  - body included `Google sign-in is not configured`

## 7. Residual Risk
This is not deployed yet, so the live site will continue returning the old 404 until the patch is shipped. The auth UI may still display the Google button until a UI-owned follow-up hides or labels it when OAuth is unavailable.

## 8. Final Verdict
Functionally complete but needs deployment.

The backend no longer dead-ends known disabled OAuth providers locally, but live behavior remains unchanged until this route fix is deployed.
