# Post-Implementation Report

## 1. Change Identity
- **Report ID:** PIR-20260620-LOCAL-OAUTH-MOCK-DISABLE
- **Feature / Fix Name:** Disable implicit local mock Google OAuth
- **Author / Agent:** Codex
- **Date:** 2026-06-20
- **Branch / Environment:** Local workspace
- **Related Task / Prompt:** User saw the local "Mock google Authority / Aetheric Identity Link" screen while trying Google sign-in
- **Classification:** Auth / Security / Developer Experience
- **Priority:** High

## 2. Executive Summary
Local Google sign-in could silently fall back to the mock OAuth consent page whenever `ENABLE_DEV_AUTH=true` and real Google credentials were absent. That made the UI look like Google auth while issuing a fake local identity. The provider registry now requires the separate `ENABLE_MOCK_OAUTH=true` flag before it can synthesize mock OAuth credentials. Local `.env` was also configured with the Google OAuth client values required for real localhost sign-in.

## 3. Intent and Reasoning
### Problem Statement
`ENABLE_DEV_AUTH=true` is useful for local auth convenience, but it should not redefine the Google provider. The previous coupling caused a confusing and unsafe-looking flow: clicking Google produced an internal mock page titled "Aetheric Identity Link."

### Why This Change Was Chosen
Splitting mock OAuth into its own explicit flag keeps development auth available while making fake provider identity an intentional test-only choice. Real credentials now take precedence for local Google sign-in.

### Assumptions Made
- The mock consent route remains useful for offline or automated provider tests.
- Local Google sign-in should use `http://localhost:8080/auth/oauth/google/callback`.
- Live Fly Google OAuth was already configured separately through Fly secrets.

## 4. Scope of Change
### In Scope
- Stop `ENABLE_DEV_AUTH=true` from activating mock OAuth providers.
- Add `ENABLE_MOCK_OAUTH=false` to local environment configuration.
- Add local Google OAuth client environment values.

### Out of Scope
- Removing the mock consent route entirely.
- Rotating the Google OAuth secret after it was visible during setup.
- Deploying unrelated dirty workspace changes.

## 5. Files Changed
| File | Purpose |
|------|---------|
| `codex/server/oauth/oauth.providers.js` | Requires `ENABLE_MOCK_OAUTH=true` before mock provider credentials are synthesized. |
| `.env` | Adds local Google OAuth client settings and disables mock OAuth by default. |
| `docs/scholomance-encyclopedia/post-implementation-reports/PIR-20260620-LOCAL-OAUTH-MOCK-DISABLE.md` | Documents the behavioral and security rationale. |

## 6. Verification
- `node --check codex/server/oauth/oauth.providers.js`
- Focused ESLint on `codex/server/oauth/oauth.providers.js`
- Provider resolver probe:
  - `ENABLE_DEV_AUTH=true` alone no longer creates a mock Google provider.
  - `ENABLE_MOCK_OAUTH=true` still creates a mock provider when explicitly requested.

## 7. Residual Risk
The currently running local backend must be restarted before it reads the updated `.env` and provider code. Google Cloud must also include the local redirect URI `http://localhost:8080/auth/oauth/google/callback` for localhost testing.

## 8. Final Verdict
Functionally complete locally pending backend restart.

The local Google path no longer silently routes to mock OAuth, and real Google credentials are configured for localhost use.
