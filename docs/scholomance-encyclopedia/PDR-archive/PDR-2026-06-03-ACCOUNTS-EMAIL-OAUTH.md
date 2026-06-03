# PDR: Accounts, Transactional Email & OAuth Social Login

**Status:** Draft → In Progress
**Date:** 2026-06-03
**Classification:** Auth + Backend + Security + Data Model
**Priority:** High
**Primary Goal:** Round out first-party accounts + transactional email, and add OAuth social login (Google first, GitHub next) **alongside** the existing password/session auth — without breaking the current session model.

---

## 1. Executive Summary

Scholomance already has a coherent first-party auth stack: bcrypt(12) passwords, `@fastify/session` cookie sessions, `@fastify/csrf-protection`, email verification, password reset, captcha, and rate limiting (`codex/server/routes/auth.routes.js`, `codex/server/user.persistence.js`, `src/hooks/useAuth.jsx`). It does **not** have OAuth.

This PDR adds OAuth as an **additive identity layer**, not a rewrite. Sessions remain the single source of truth: after an OAuth callback we issue a session cookie exactly the way `/login` does today. The work is sequenced so that the unblocked foundation (identity data model + session hardening) ships first, and the parts that need external inputs (a same-site domain, Google/GitHub client credentials) come later.

Three things must be true for OAuth to be safe here:
1. **A separate `user_identities` table** so one user can own multiple login methods, with explicit, non-silent account linking.
2. **A same-site cookie topology** — today the SPA (`*.pages.dev`) and the API (`*.fly.dev`) are *different sites*, so the session cookie is already a fragile third-party cookie. OAuth's provider redirect makes this fatal under `SameSite=strict`. This must be fixed for both existing auth and OAuth.
3. **Verified-email-gated linking** — never auto-merge an OAuth identity into an existing account on an unverified provider email.

---

## 2. Change Classification

| Dimension | Classification | Reason |
|-----------|---------------|--------|
| `user_identities` table (migration v14) | Structural (additive) | New table + backfill of `'password'` identities; no existing columns changed |
| `userPersistence.identities.*` | Additive | New persistence API alongside `users.*` |
| Session cookie `sameSite` strict→lax + regeneration | Behavioral (security) | Required for OAuth redirect return; fixation defense |
| Cookie/domain topology | Infra | Same-site domain so the session cookie is first-party to both SPA and API |
| `auth.routes.js` OAuth routes | Structural | New `/auth/oauth/:provider` + `/callback` routes |
| Transactional email provider | Infra | Wire the existing `mailer.queueTemplate` queue to a real sender (Resend/Postmark) + DKIM/DMARC |
| `src/hooks/useAuth.jsx` + Auth UI | UI | "Continue with Google", linked-accounts in profile |

---

## 3. Current-State Facts (verified)

- **Server:** Fastify 5, `codex/server/index.js`. Plugins: `@fastify/cookie`, `@fastify/session` (v11), `@fastify/csrf-protection`, `@fastify/cors`, `@fastify/helmet`, `@fastify/rate-limit`.
- **Session cookie:** `httpOnly:true`, `secure:(prod)`, **`sameSite:'strict'`**, `maxAge:4h`, `rolling:true`, `saveUninitialized:true`. Store: Redis → else SQLite/Turso (`sessions` table, migration v13).
- **DB:** `better-sqlite3` local (`scholomance_user.sqlite`) or Turso. Async access via `db.execute(sql, params)`. Migrations: versioned `USER_MIGRATIONS` array (v1–13) with sync `up(database)`.
- **Users table (v1 + later):** `id, username, email, password, recoveryTokenHash, recoveryTokenExpiry, verificationToken, verified, createdAt`.
- **`userPersistence.users` API:** `findByUsername/findByEmail/findById/findByVerificationToken/findByRecoveryTokenHash/createUser/verifyUser/setVerificationToken/setRecoveryToken/clearRecoveryToken/updatePasswordHash`.
- **Mail:** `userPersistence.mail.*` queue exists; `mailer.queueTemplate('password-reset', …)` already called. Sender backend not yet production-grade.
- **Auth routes:** `/captcha /register /login /verify-email /resend-verification /forgot-password /reset-password /logout /me /csrf-token`. **No** `/callback`, `/oauth`, provider redirect, or OAuth deps.
- **Deploy:** SPA → Cloudflare Pages `scholomance-v12.pages.dev`; API → Fly `scholomance-v12.fly.dev`.

---

## 4. Identity Data Model

```sql
-- migration v14: create_user_identities_table
CREATE TABLE IF NOT EXISTS user_identities (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id           INTEGER NOT NULL,
  provider          TEXT NOT NULL,            -- 'password' | 'google' | 'github'
  provider_user_id  TEXT NOT NULL,            -- password: users.id as text; oauth: provider 'sub'/id
  email             TEXT,                      -- email as seen from this provider
  email_verified    INTEGER NOT NULL DEFAULT 0,
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_identities_provider_uid
  ON user_identities(provider, provider_user_id);
CREATE INDEX IF NOT EXISTS idx_identities_user ON user_identities(user_id);

-- backfill: every existing user gets a 'password' identity
INSERT INTO user_identities (user_id, provider, provider_user_id, email, email_verified)
SELECT id, 'password', CAST(id AS TEXT), email, COALESCE(verified, 0)
FROM users
WHERE NOT EXISTS (
  SELECT 1 FROM user_identities ui
  WHERE ui.user_id = users.id AND ui.provider = 'password'
);
```

`userPersistence.identities` API: `find(provider, providerUserId)`, `findUserByIdentity(provider, providerUserId)`, `link({ userId, provider, providerUserId, email, emailVerified })`, `listForUser(userId)`, `unlink(userId, provider)`.

---

## 5. Account Linking Rules (security-critical)

On OAuth callback, after fetching the provider profile:

1. **Existing identity** `(provider, provider_user_id)` → log that user in. Done.
2. **No identity, provider email is verified AND matches a verified existing user:**
   - Do **not** silently merge. Either (a) require the user to be in an active session to link (preferred — linking happens from Profile), or (b) require a one-time "confirm linking" email click. Default: **block auto-merge; prompt to sign in with password first, then link.**
3. **No identity, provider email unverified:** never link, never trust the email. Offer to create a fresh account with a separate verification.
4. **No identity, brand-new email:** create a `users` row (no password) + a `(provider)` identity, mark `email_verified` from the provider's verified flag.
5. **Linking a second provider** requires an **active session** (Profile → Linked Accounts), never the login screen.

---

## 6. Cookie / Domain Topology — RESOLVED: `scholomance.live`

`*.pages.dev` and `*.fly.dev` are different registrable sites → the session cookie is third-party today. **Resolution:** the owned domain `scholomance.live`, with the SPA and API on the *same site* (different subdomains):

| Component | Host | Notes |
|---|---|---|
| SPA (Cloudflare Pages) | `scholomance.live` (apex) | custom domain on the Pages project |
| API (Fly) | `api.scholomance.live` | Fly cert for that hostname |

Because both are `scholomance.live`, the SPA→API XHR is **same-site**, so the cookie can be **host-only** on `api.scholomance.live` (no `Domain=` needed — it's `HttpOnly`, the SPA never reads it). `SameSite=Lax` is required only so the cookie survives the **top-level redirect back from the OAuth provider**; CSRF posture is preserved by the existing `x-csrf-token` double-submit.

### DNS (you set these)
- `scholomance.live` → Cloudflare Pages (add `scholomance.live` as a custom domain on the `scholomance-v12` Pages project; Cloudflare auto-manages the CNAME/cert).
- `api.scholomance.live` → Fly (`flyctl certs add api.scholomance.live`, then add the AAAA/A/CNAME records Fly prints).
- (Phase 2) `mail.scholomance.live` → Resend DKIM/SPF/DMARC records.

### Fly env (you set these)
```
PUBLIC_APP_URL=https://scholomance.live
APP_ALLOWED_ORIGINS=https://scholomance.live   # restricts CORS to the SPA, with credentials
SESSION_COOKIE_SAMESITE=lax                     # default; explicit for clarity
# SESSION_COOKIE_DOMAIN  → leave unset (host-only cookie)
```

### Cloudflare Pages build env (you set these)
```
VITE_API_BASE_URL=https://api.scholomance.live
VITE_PUBLIC_APP_URL=https://scholomance.live
```

### Code status — Phase 3a DONE
- `codex/server/index.js`: session cookie `sameSite` now `SESSION_COOKIE_SAMESITE` (default **lax**) + optional `SESSION_COOKIE_DOMAIN`; CORS gains an env-gated app-origin allowlist (`APP_ALLOWED_ORIGINS` / `PUBLIC_APP_URL`) with credentials + `x-csrf-token`. **Non-breaking:** with the vars unset, behavior is identical to before.

---

## 7. OAuth Flow

Authorization-code + PKCE + `state`, fully server-side:

```
GET  /auth/oauth/:provider           → set state+PKCE+returnTo in session, 302 to provider
GET  /auth/oauth/:provider/callback  → verify state, exchange code (PKCE), fetch userinfo,
                                        find-or-link identity, regenerate session, set session.user, 302 to app
```

- **Library:** `@fastify/oauth2` (fits the stack) or `arctic` (provider-agnostic). Decision: start with `@fastify/oauth2` for Google.
- **`state`** is the OAuth-handshake CSRF token (separate from `x-csrf-token`); store in session, compare on callback.
- **Session fixation:** `await request.session.regenerate()` before setting `session.user` — applied to **both** password `/login` and OAuth callback.
- **Secrets:** `GOOGLE_CLIENT_ID/SECRET`, `GITHUB_CLIENT_ID/SECRET` via `flyctl secrets set`, never committed.

---

## 8. Transactional Email

The `mailer.queueTemplate` queue exists; it needs a real sender + deliverability:
- **Provider:** Resend (solo-dev DX) or Postmark (transactional deliverability). Decision: Resend.
- **DNS (non-negotiable):** SPF + DKIM + DMARC on a dedicated subdomain `mail.scholomance.app`. Without DKIM/DMARC, verification/reset mail is spam-filtered and signup silently breaks.
- **Token hygiene:** verification TTL 24h, reset TTL 1h, single-use (delete on consume), hashed at rest (already done for reset/verify).

---

## 9. Implementation Plan (phased)

**Phase 1 — Foundation (unblocked, additive, this PDR's first code):**
1. Migration v14: `user_identities` + backfill `'password'` identities.
2. `userPersistence.identities.*` API.
3. Session-id **regeneration** on `/login` (fixation defense) — pure security win, no domain dependency.
4. Unit tests for the identities persistence + backfill.

**Phase 2 — Email hardening:** wire Resend, set DKIM/DMARC, confirm TTL/single-use on tokens.

**Phase 3 — Cookie/domain + OAuth wiring (needs domain + Google creds):** custom domain, `sameSite:'lax'`, `@fastify/oauth2` Google routes, find-or-link, linking rules.

**Phase 4 — UI:** "Continue with Google" on AuthPage; Profile → Linked Accounts (link/unlink).

**Phase 5 — GitHub** + QA + rollout.

---

## 10. Risk Checklist

- ❏ Cross-site session cookie (the big one) → same-site domain + `SameSite=Lax`
- ❏ Auto-link only when provider `email_verified` is true
- ❏ No silent merge with existing password accounts (require session or confirm-email)
- ❏ Session-id regeneration on every login (fixation)
- ❏ `state` + PKCE on the OAuth handshake
- ❏ Cookie flags `HttpOnly/Secure/SameSite=Lax`
- ❏ Reset/verify token TTL + single-use
- ❏ Secrets in Fly secrets, not repo
- ❏ DKIM/DMARC live before relying on email
- ❏ Don't strand the last login method: block unlinking a user's only identity

---

## 11. Definition of Done

- [ ] `user_identities` table + backfill migration (v14) applied on better-sqlite3 and Turso
- [ ] `userPersistence.identities.*` API with tests
- [ ] Session regenerated on password login and OAuth callback
- [ ] `sameSite:'lax'` + same-site domain; existing session auth still works end-to-end
- [ ] Google OAuth: new-account, existing-identity, and verified-link paths all correct; unverified-email path refused
- [ ] Resend wired; DKIM/DMARC verified; verify + reset mail land in inbox
- [ ] "Continue with Google" + Profile linked-accounts UI
- [ ] Cannot unlink the only remaining identity
- [ ] Lint + typecheck + vitest green

---

## 12. Glossary

| Term | Definition |
|------|-----------|
| **Identity** | One login method bound to a user: `('password'|'google'|'github', provider_user_id)`. A user may have several. |
| **Account linking** | Attaching a new identity to an existing user. Must be explicit and ownership-verified. |
| **`state`** | Random per-request token in the OAuth redirect that the provider echoes back; defeats handshake CSRF. |
| **PKCE** | Proof Key for Code Exchange — binds the auth code to the initiator, protects the code exchange. |
| **Session fixation** | Attack where a pre-known session id is elevated on login; defeated by regenerating the id at login. |
| **SameSite=Lax** | Cookie sent on top-level cross-site navigations (needed for OAuth return) but not on cross-site subrequests. |
