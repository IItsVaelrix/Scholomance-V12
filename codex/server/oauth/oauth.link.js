/**
 * Find-or-link decision logic for OAuth sign-in. This is the security-critical
 * core: it decides whether a provider identity logs into an existing account,
 * links to the current session, creates a fresh account, or is refused.
 *
 * Pure aside from the injected `persistence` and `makePlaceholderPasswordHash`,
 * so every branch is unit-testable. See PDR-2026-06-03-ACCOUNTS-EMAIL-OAUTH §5.
 */

import crypto from 'node:crypto';

/** Derive a unique, sanitized username from an email, retrying on collisions. */
export async function generateUniqueUsername(persistence, email) {
  const base =
    String(email || 'seeker')
      .split('@')[0]
      .replace(/[^a-zA-Z0-9_]/g, '')
      .slice(0, 20) || 'seeker';

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}${crypto.randomBytes(2).toString('hex')}`;
    const existing = await persistence.users.findByUsername(candidate);
    if (!existing) return candidate;
  }
  // Extremely unlikely fallthrough — make it effectively unique.
  return `${base}${crypto.randomBytes(4).toString('hex')}`;
}

/**
 * @param {object} args
 * @param {object} args.persistence            userPersistence (or a test double)
 * @param {string} args.provider               'google' | …
 * @param {{ providerUserId: string, email: string|null, emailVerified: boolean }} args.profile
 * @param {number|string|null} [args.sessionUserId]  set when an authenticated user is linking
 * @param {() => Promise<string>} args.makePlaceholderPasswordHash  unusable hash for OAuth-only accounts
 * @returns {Promise<{ action: 'login'|'linked'|'created'|'link_requires_login'|'refused_unverified', user?: object, email?: string }>}
 */
export async function resolveOAuthIdentity({
  persistence,
  provider,
  profile,
  sessionUserId = null,
  makePlaceholderPasswordHash,
}) {
  // 1. A known identity always logs straight in.
  const existing = await persistence.identities.find(provider, profile.providerUserId);
  if (existing) {
    return { action: 'login', user: await persistence.users.findById(existing.user_id) };
  }

  // 2. An already-authenticated user is explicitly linking from their profile.
  if (sessionUserId) {
    await persistence.identities.link({
      userId: sessionUserId,
      provider,
      providerUserId: profile.providerUserId,
      email: profile.email,
      emailVerified: profile.emailVerified,
    });
    return { action: 'linked', user: await persistence.users.findById(sessionUserId) };
  }

  // 3. Anonymous + the provider has NOT verified the email → never trust it.
  if (!profile.email || !profile.emailVerified) {
    return { action: 'refused_unverified' };
  }

  // 4. The verified email already belongs to an account → never silently merge.
  //    Make them prove ownership by signing in, then link from the profile page.
  const owner = await persistence.users.findByEmail(profile.email);
  if (owner) {
    return { action: 'link_requires_login', email: profile.email };
  }

  // 5. Brand-new verified email → create a passwordless account + this identity.
  //    Both writes happen atomically inside createOAuthAccount so a partial failure
  //    can never leave an account without a usable login method.
  const username = await generateUniqueUsername(persistence, profile.email);
  const placeholderHash = await makePlaceholderPasswordHash();
  const user = await persistence.users.createOAuthAccount({
    username,
    email: profile.email,
    passwordHash: placeholderHash,
    provider,
    providerUserId: profile.providerUserId,
    emailVerified: true,
  });
  return { action: 'created', user };
}
