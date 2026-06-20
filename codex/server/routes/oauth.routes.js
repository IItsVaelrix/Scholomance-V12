/**
 * OAuth social-login routes (authorization-code + PKCE, fully server-side).
 *
 * Mounted under the '/auth/oauth' prefix. Routes are registered ONLY for
 * providers whose credentials are configured, so this plugin is inert until
 * GOOGLE_CLIENT_ID/SECRET (etc.) are set. See PDR-2026-06-03-ACCOUNTS-EMAIL-OAUTH §7.
 */

import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import { userPersistence } from '../user.persistence.js';
import { LEXICON_GUEST_SESSION_KEY } from '../auth-pre-handler.js';
import {
  getEnabledProviders,
  getProviderConfig,
  normalizeProfile,
} from '../oauth/oauth.providers.js';
import {
  generateState,
  generateCodeVerifier,
  codeChallengeFromVerifier,
  decodeJwtPayload,
  timingSafeEqualStrings,
} from '../oauth/oauth.pkce.js';
import { resolveOAuthIdentity } from '../oauth/oauth.link.js';

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000; // a handshake older than 10 min is stale
const KNOWN_OAUTH_PROVIDERS = new Set(['google']);

/** Escape a value before interpolating it into HTML. */
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function providerLabel(provider) {
  if (provider === 'google') return 'Google';
  return String(provider || 'OAuth').replace(/^\w/, (char) => char.toUpperCase());
}

function sendProviderUnavailablePage(reply, provider, appBase) {
  const safeProvider = escapeHtml(providerLabel(provider));
  const safeAuthUrl = escapeHtml(`${appBase}/auth`);

  reply.status(503).type('text/html; charset=utf-8');
  return `<!doctype html>
<html>
  <head>
    <title>${safeProvider} sign-in unavailable</title>
  </head>
  <body>
    <main>
      <h1>${safeProvider} sign-in is not configured</h1>
      <p>This Scholomance server does not have ${safeProvider} OAuth credentials configured yet.</p>
      <p>You can still create an account with email and password.</p>
      <p><a href="${safeAuthUrl}">Return to Scholomance registration</a></p>
    </main>
  </body>
</html>`;
}

export async function oauthRoutes(fastify, options = {}) {
  const { serverBaseUrl, publicAppUrl } = options;
  const enabled = getEnabledProviders({ serverBaseUrl });

  if (enabled.length === 0) {
    fastify.log.info(
      '[OAUTH] No providers configured (set e.g. GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET to enable). Disabled-provider routes remain mounted.',
    );
  }

  const enabledNames = new Set(enabled.map((p) => p.provider));
  fastify.log.info(`[OAUTH] Enabled providers: ${[...enabledNames].join(', ')}`);

  const appBase = String(publicAppUrl || '').replace(/\/+$/, '');
  const toApp = (reply, pathWithQuery) => reply.redirect(`${appBase}${pathWithQuery}`);

  // ── Start: redirect the browser to the provider ───────────────────────────
  fastify.get('/:provider', async (request, reply) => {
    const { provider } = request.params;
    if (!enabledNames.has(provider)) {
      if (KNOWN_OAUTH_PROVIDERS.has(provider)) {
        return sendProviderUnavailablePage(reply, provider, appBase);
      }
      return reply.status(404).send({ message: 'Unknown OAuth provider' });
    }
    const cfg = getProviderConfig(provider, { serverBaseUrl });

    const state = generateState();
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = codeChallengeFromVerifier(codeVerifier);

    // Stash the one-time handshake secrets in the session; SameSite=Lax lets the
    // cookie ride the top-level redirect back from the provider.
    request.session.oauth = {
      provider,
      state,
      codeVerifier,
      linkUserId: request.session.user?.id ?? null, // set → this is an explicit link
      createdAt: Date.now(),
    };

    const isDevMock = cfg.clientId.startsWith('mock-');
    if (isDevMock) {
      const consentUrl = new URL(`${appBase}/auth/oauth/mock-consent`);
      consentUrl.searchParams.set('state', state);
      consentUrl.searchParams.set('provider', provider);
      return reply.redirect(consentUrl.toString());
    }

    const authUrl = new URL(cfg.authorizationUrl);
    authUrl.searchParams.set('client_id', cfg.clientId);
    authUrl.searchParams.set('redirect_uri', cfg.redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', cfg.scope);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    authUrl.searchParams.set('access_type', 'online');
    authUrl.searchParams.set('prompt', 'select_account');

    return reply.redirect(authUrl.toString());
  });

  // Serve mock consent page for development/offline testing
  fastify.get('/mock-consent', async (request, reply) => {
    const { state, provider } = request.query;
    const saved = request.session.oauth;
    if (!saved || saved.state !== state || saved.provider !== provider) {
      return reply.status(400).send('Invalid or expired mock OAuth session.');
    }

    // These are already gated to server-generated values by the equality check above,
    // but escape on the way into HTML so safety never rides on a distant guard.
    const safeProvider = escapeHtml(provider);
    const safeState = escapeHtml(state);

    reply.type('text/html');
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Scholomance Aetheric Identity Link (Mock OAuth)</title>
          <style>
            body {
              background-color: #0c0a09;
              color: #f5f5f4;
              font-family: 'Space Grotesk', system-ui, -apple-system, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
            }
            .card {
              background: rgba(28, 25, 23, 0.7);
              border: 1px solid rgba(217, 119, 6, 0.3);
              backdrop-filter: blur(12px);
              padding: 2.5rem;
              border-radius: 1rem;
              width: 100%;
              max-width: 400px;
              box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
              text-align: center;
            }
            .kicker {
              color: #d97706;
              font-size: 0.8rem;
              text-transform: uppercase;
              letter-spacing: 0.15em;
              margin-bottom: 0.5rem;
            }
            h1 {
              font-size: 1.5rem;
              margin: 0 0 1.5rem 0;
              font-family: Georgia, serif;
            }
            .field {
              margin-bottom: 1.5rem;
              text-align: left;
            }
            label {
              display: block;
              font-size: 0.85rem;
              margin-bottom: 0.5rem;
              color: #a8a29e;
            }
            input[type="email"] {
              width: 100%;
              padding: 0.75rem;
              background: #1c1917;
              border: 1px solid #44403c;
              border-radius: 0.375rem;
              color: #f5f5f4;
              box-sizing: border-box;
              font-size: 1rem;
            }
            input[type="email"]:focus {
              border-color: #d97706;
              outline: none;
            }
            .checkbox-group {
              display: flex;
              align-items: center;
              gap: 0.5rem;
            }
            input[type="checkbox"] {
              accent-color: #d97706;
              width: 1.1rem;
              height: 1.1rem;
            }
            .btn {
              width: 100%;
              padding: 0.75rem;
              background: #d97706;
              color: #0c0a09;
              border: none;
              border-radius: 0.375rem;
              font-weight: 600;
              font-size: 1rem;
              cursor: pointer;
              transition: background 0.2s;
            }
            .btn:hover {
              background: #f59e0b;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="kicker">Mock ${safeProvider} Authority</div>
            <h1>Aetheric Identity Link</h1>
            <form action="${appBase}/auth/oauth/mock-submit" method="GET">
              <input type="hidden" name="state" value="${safeState}" />
              <input type="hidden" name="provider" value="${safeProvider}" />
              <div class="field">
                <label for="email">Essence Email</label>
                <input type="email" id="email" name="email" value="mock-${safeProvider}-user@example.com" required />
              </div>
              <div class="field checkbox-group">
                <input type="checkbox" id="emailVerified" name="emailVerified" value="true" checked />
                <label for="emailVerified">Mark Email as Verified</label>
              </div>
              <button type="submit" class="btn">Synchronize Essence</button>
            </form>
          </div>
        </body>
      </html>
    `;
  });

  // Process mock consent choices and redirect to standard callback
  fastify.get('/mock-submit', async (request, reply) => {
    const { state, provider, email, emailVerified } = request.query;
    const saved = request.session.oauth;
    if (!saved || saved.state !== state || saved.provider !== provider) {
      return reply.status(400).send('Invalid or expired mock OAuth session.');
    }

    request.session.oauthMockProfile = {
      email: String(email),
      emailVerified: emailVerified === 'true' || emailVerified === true,
    };
    await request.session.save();

    const callbackUrl = new URL(`${serverBaseUrl}/auth/oauth/${provider}/callback`);
    callbackUrl.searchParams.set('code', 'mock-code');
    callbackUrl.searchParams.set('state', state);
    return reply.redirect(callbackUrl.toString());
  });

  // ── Callback: verify, exchange, find-or-link, establish session ───────────
  fastify.get('/:provider/callback', async (request, reply) => {
    const { provider } = request.params;
    if (!enabledNames.has(provider)) {
      if (KNOWN_OAUTH_PROVIDERS.has(provider)) {
        return sendProviderUnavailablePage(reply, provider, appBase);
      }
      return reply.status(404).send({ message: 'Unknown OAuth provider' });
    }
    const cfg = getProviderConfig(provider, { serverBaseUrl });

    const { code, state, error: providerError } = request.query;
    const saved = request.session.oauth;
    // One-time use: drop the handshake state regardless of outcome.
    request.session.oauth = null;

    if (providerError) return toApp(reply, '/auth?oauth=error');
    if (!saved || saved.provider !== provider) return toApp(reply, '/auth?oauth=expired');
    if (Date.now() - Number(saved.createdAt || 0) > OAUTH_STATE_TTL_MS) {
      return toApp(reply, '/auth?oauth=expired');
    }
    if (!code || !state || !timingSafeEqualStrings(state, saved.state)) {
      return toApp(reply, '/auth?oauth=bad_state');
    }

    // Exchange the authorization code for tokens (PKCE).
    let tokenJson;
    const isDevMock = cfg.clientId.startsWith('mock-');
    if (isDevMock) {
      const mockProfile = request.session.oauthMockProfile;
      request.session.oauthMockProfile = null;
      if (!mockProfile) {
        return toApp(reply, '/auth?oauth=token_failed');
      }
      tokenJson = {
        id_token: `header.${Buffer.from(JSON.stringify({
          sub: `mock-${provider}-sub-${mockProfile.email}`,
          email: mockProfile.email,
          email_verified: mockProfile.emailVerified,
          name: mockProfile.email.split('@')[0],
        })).toString('base64url')}.signature`,
      };
    } else {
      try {
        const body = new URLSearchParams({
          grant_type: 'authorization_code',
          code: String(code),
          redirect_uri: cfg.redirectUri,
          client_id: cfg.clientId,
          client_secret: cfg.clientSecret,
          code_verifier: saved.codeVerifier,
        });
        const resp = await fetch(cfg.tokenUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
          body,
        });
        if (!resp.ok) throw new Error(`token endpoint returned ${resp.status}`);
        tokenJson = await resp.json();
      } catch (err) {
        fastify.log.error({ err }, '[OAUTH] token exchange failed');
        return toApp(reply, '/auth?oauth=token_failed');
      }
    }

    // The id_token came straight from the token endpoint over TLS — trusting it
    // without re-verifying the signature is sound here (OIDC core §3.1.3.7).
    const profile = normalizeProfile(provider, decodeJwtPayload(tokenJson.id_token));
    if (!profile) return toApp(reply, '/auth?oauth=no_profile');

    let result;
    try {
      result = await resolveOAuthIdentity({
        persistence: userPersistence,
        provider,
        profile,
        sessionUserId: saved.linkUserId ?? null,
        makePlaceholderPasswordHash: () => bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12),
      });
    } catch (err) {
      fastify.log.error({ err }, '[OAUTH] identity resolution failed');
      return toApp(reply, '/auth?oauth=link_failed');
    }

    if (result.action === 'refused_unverified') return toApp(reply, '/auth?oauth=unverified');
    if (result.action === 'link_requires_login') {
      return toApp(reply, `/auth?oauth=link_required&email=${encodeURIComponent(result.email)}`);
    }

    // login | linked | created → issue a fresh session (fixation defense) and sign in.
    await request.session.regenerate();
    request.session.user = {
      id: result.user.id,
      username: result.user.username,
      email: result.user.email,
    };
    request.session[LEXICON_GUEST_SESSION_KEY] = false;

    return toApp(reply, `/read?oauth=${result.action}`);
  });
}
