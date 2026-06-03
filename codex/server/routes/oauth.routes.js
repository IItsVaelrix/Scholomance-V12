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

export async function oauthRoutes(fastify, options = {}) {
  const { serverBaseUrl, publicAppUrl } = options;
  const enabled = getEnabledProviders({ serverBaseUrl });

  if (enabled.length === 0) {
    fastify.log.info(
      '[OAUTH] No providers configured (set e.g. GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET to enable). Routes not mounted.',
    );
    return;
  }

  const enabledNames = new Set(enabled.map((p) => p.provider));
  fastify.log.info(`[OAUTH] Enabled providers: ${[...enabledNames].join(', ')}`);

  const appBase = String(publicAppUrl || '').replace(/\/+$/, '');
  const toApp = (reply, pathWithQuery) => reply.redirect(`${appBase}${pathWithQuery}`);

  // ── Start: redirect the browser to the provider ───────────────────────────
  fastify.get('/:provider', async (request, reply) => {
    const { provider } = request.params;
    if (!enabledNames.has(provider)) {
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

  // ── Callback: verify, exchange, find-or-link, establish session ───────────
  fastify.get('/:provider/callback', async (request, reply) => {
    const { provider } = request.params;
    if (!enabledNames.has(provider)) {
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
