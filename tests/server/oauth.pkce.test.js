import { describe, it, expect } from 'vitest';
import {
  generateState,
  generateCodeVerifier,
  codeChallengeFromVerifier,
  decodeJwtPayload,
  timingSafeEqualStrings,
} from '../../codex/server/oauth/oauth.pkce.js';

describe('[Server] OAuth PKCE primitives', () => {
  it('derives the S256 challenge per the RFC 7636 Appendix B vector', () => {
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    const expectedChallenge = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';
    expect(codeChallengeFromVerifier(verifier)).toBe(expectedChallenge);
  });

  it('generates unique, base64url state and verifier values', () => {
    const base64url = /^[A-Za-z0-9_-]+$/;
    const s1 = generateState();
    const s2 = generateState();
    const v1 = generateCodeVerifier();
    expect(s1).toMatch(base64url);
    expect(v1).toMatch(base64url);
    expect(s1).not.toBe(s2);
    expect(v1.length).toBeGreaterThanOrEqual(43); // RFC 7636 minimum
  });

  it('decodes a JWT payload without verifying the signature', () => {
    const payload = { sub: '12345', email: 'x@y.com', email_verified: true };
    const b64 = (obj) =>
      Buffer.from(JSON.stringify(obj)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const jwt = `${b64({ alg: 'RS256' })}.${b64(payload)}.fakesig`;
    expect(decodeJwtPayload(jwt)).toEqual(payload);
  });

  it('returns null for malformed JWTs', () => {
    expect(decodeJwtPayload('not-a-jwt')).toBeNull();
    expect(decodeJwtPayload('')).toBeNull();
    expect(decodeJwtPayload(null)).toBeNull();
  });

  it('compares strings in constant time, including length mismatches', () => {
    expect(timingSafeEqualStrings('abc123', 'abc123')).toBe(true);
    expect(timingSafeEqualStrings('abc123', 'abc124')).toBe(false);
    expect(timingSafeEqualStrings('abc', 'abcdef')).toBe(false);
    expect(timingSafeEqualStrings('', '')).toBe(true);
  });
});
