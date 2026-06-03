/**
 * OAuth handshake primitives: state, PKCE (RFC 7636), id_token decoding.
 *
 * All pure + dependency-free so they can be unit tested without a server.
 * PDR-2026-06-03-ACCOUNTS-EMAIL-OAUTH, Phase 3b.
 */

import crypto from 'node:crypto';

function base64url(buffer) {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** Opaque anti-CSRF value echoed by the provider and re-checked on callback. */
export function generateState() {
  return base64url(crypto.randomBytes(32));
}

/** RFC 7636 code verifier: 43 chars of base64url from 32 random bytes. */
export function generateCodeVerifier() {
  return base64url(crypto.randomBytes(32));
}

/** S256 code challenge = base64url(sha256(verifier)). */
export function codeChallengeFromVerifier(verifier) {
  const hash = crypto.createHash('sha256').update(String(verifier)).digest();
  return base64url(hash);
}

/**
 * Decode (without signature verification) the payload of a JWT. Safe to use only
 * for id_tokens received directly from the provider's token endpoint over TLS,
 * where the channel itself authenticates the issuer (OIDC core §3.1.3.7).
 */
export function decodeJwtPayload(jwt) {
  const parts = String(jwt || '').split('.');
  if (parts.length < 2) return null;
  try {
    const json = Buffer.from(
      parts[1].replace(/-/g, '+').replace(/_/g, '/'),
      'base64',
    ).toString('utf8');
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

/** Constant-time string compare for the state check. */
export function timingSafeEqualStrings(a, b) {
  const bufA = Buffer.from(String(a ?? ''));
  const bufB = Buffer.from(String(b ?? ''));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
