/**
 * OAuth provider registry. A provider is "enabled" only when its client
 * credentials are present in the environment, so the routes light up purely by
 * setting secrets — no code change, no dead routes when unconfigured.
 *
 * PDR-2026-06-03-ACCOUNTS-EMAIL-OAUTH, Phase 3b.
 */

const PROVIDER_DEFS = {
  google: {
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scope: 'openid email profile',
    clientIdEnv: 'GOOGLE_CLIENT_ID',
    clientSecretEnv: 'GOOGLE_CLIENT_SECRET',
  },
  // github, discord, … slot in here later with the same shape.
};

function trimTrailingSlash(value) {
  return String(value || '').replace(/\/+$/, '');
}

function isDevMockActive(env = process.env) {
  const isProd = env.NODE_ENV === 'production';
  const isTest = env.NODE_ENV === 'test' || env.VITEST === 'true';
  // Mock OAuth issues a session for ANY typed email. Keep it separate from
  // ENABLE_DEV_AUTH so local Google sign-in cannot silently become fake Google.
  return !isProd && !isTest && env.ENABLE_MOCK_OAUTH === 'true';
}

/**
 * Resolve a single provider's full config, or null if not configured.
 * @param {string} provider
 * @param {{ serverBaseUrl: string, env?: Record<string,string|undefined> }} opts
 */
export function getProviderConfig(provider, { serverBaseUrl, env = process.env } = {}) {
  const def = PROVIDER_DEFS[provider];
  if (!def) return null;
  let clientId = env[def.clientIdEnv];
  let clientSecret = env[def.clientSecretEnv];
  if (!clientId || !clientSecret) {
    if (isDevMockActive(env)) {
      clientId = `mock-${provider}-client-id`;
      clientSecret = `mock-${provider}-client-secret`;
    } else {
      return null;
    }
  }
  return {
    provider,
    authorizationUrl: def.authorizationUrl,
    tokenUrl: def.tokenUrl,
    scope: def.scope,
    clientId,
    clientSecret,
    redirectUri: `${trimTrailingSlash(serverBaseUrl)}/auth/oauth/${provider}/callback`,
  };
}

/** Every provider that has credentials configured. */
export function getEnabledProviders(opts) {
  return Object.keys(PROVIDER_DEFS)
    .map((p) => getProviderConfig(p, opts))
    .filter(Boolean);
}

/**
 * Normalize a provider's id_token payload into a common profile shape.
 * @returns {{ providerUserId: string, email: string|null, emailVerified: boolean, name: string|null } | null}
 */
export function normalizeProfile(provider, payload) {
  if (!payload) return null;
  if (provider === 'google') {
    if (!payload.sub) return null;
    return {
      providerUserId: String(payload.sub),
      email: payload.email ? String(payload.email).toLowerCase() : null,
      emailVerified: payload.email_verified === true || payload.email_verified === 'true',
      name: payload.name || null,
    };
  }
  return null;
}
