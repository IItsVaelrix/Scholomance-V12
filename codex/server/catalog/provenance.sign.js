/**
 * Provenance signing — tamper-evident, artist-attested AI provenance.
 *
 * This is the "wedge" from PDR-2026-06-05-SONIC-EXCHANGE-NATIVE-LISTENING:
 * where other platforms treat AI music as contraband to police, the Sonic
 * Exchange treats provenance as a *declared, signed, displayed* feature.
 *
 * The signature is an HMAC-SHA256 over a canonical (stable-key-order) JSON
 * encoding of the declared fields. It is tamper-EVIDENT, not anti-forgery:
 * anyone holding the server secret can sign, so it proves the stored row was
 * not mutated after the artist's attestation — not that the claim is true.
 * Provenance is artist-attested by design; we do not claim AI detection.
 *
 * Pure module (no DB, no I/O beyond node:crypto) so it is unit-testable in
 * isolation, mirroring codex/server/oauth/oauth.link.js.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

/** Declared origin of a track. Enum, validated on declare. */
export const PROVENANCE_ORIGINS = Object.freeze(['human', 'ai_assisted', 'ai_generated', 'hybrid']);

/** Fields that participate in the signature, in canonical order. */
const SIGNED_FIELDS = Object.freeze([
  'trackId',
  'version',
  'origin',
  'model',
  'promptLineage',
  'humanEditRatio',
  'stemsAvailable',
  'license',
  'declaredBy',
]);

/**
 * Deterministic JSON: object keys sorted recursively so the same logical
 * record always serializes to the same bytes (arrays keep their order).
 */
export function stableStringify(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value ?? null);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  const keys = Object.keys(value).sort();
  const entries = keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`);
  return `{${entries.join(',')}}`;
}

function clamp01OrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.min(1, parsed));
}

/**
 * Normalize a raw provenance declaration into the exact shape that gets signed
 * and stored. Throws a plain Error (callers translate to bytecode) on a bad
 * origin so an invalid enum can never be persisted.
 */
export function normalizeProvenance(input = {}) {
  const origin = String(input.origin || '').trim();
  if (!PROVENANCE_ORIGINS.includes(origin)) {
    throw new Error(`Invalid provenance origin: ${JSON.stringify(input.origin)}`);
  }

  let promptLineage = input.promptLineage ?? null;
  // Accept either a parsed object/array or a JSON string; store the parsed form
  // so the canonical encoding is stable regardless of caller whitespace.
  if (typeof promptLineage === 'string' && promptLineage.trim()) {
    try {
      promptLineage = JSON.parse(promptLineage);
    } catch {
      promptLineage = { note: promptLineage };
    }
  }

  return {
    trackId: Number(input.trackId),
    version: Number.isInteger(input.version) && input.version > 0 ? input.version : 1,
    origin,
    model: input.model ? String(input.model) : null,
    promptLineage: promptLineage ?? null,
    humanEditRatio: clamp01OrNull(input.humanEditRatio),
    stemsAvailable: input.stemsAvailable ? 1 : 0,
    license: input.license ? String(input.license) : 'all_rights_reserved',
    declaredBy: Number(input.declaredBy),
  };
}

/** Canonical signing payload — only the SIGNED_FIELDS, in fixed order. */
export function canonicalizeProvenance(record) {
  const picked = {};
  for (const field of SIGNED_FIELDS) {
    picked[field] = record[field] ?? null;
  }
  return stableStringify(picked);
}

/** HMAC-SHA256 hex signature over the canonical payload. */
export function signProvenance(record, secret) {
  if (!secret) {
    throw new Error('signProvenance requires a non-empty secret');
  }
  return createHmac('sha256', secret).update(canonicalizeProvenance(record)).digest('hex');
}

/** Constant-time signature check. Returns boolean; never throws on mismatch. */
export function verifyProvenance(record, signature, secret) {
  if (!signature || !secret) return false;
  let expected;
  try {
    expected = signProvenance(record, secret);
  } catch {
    return false;
  }
  const a = Buffer.from(String(signature), 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
