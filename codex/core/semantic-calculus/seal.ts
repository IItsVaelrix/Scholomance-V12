/**
 * SEMANTIC CALCULUS — canonical serialization + seal (steps 9-10)
 *
 * F12: the seal law is VERIFICATION, not freezing.
 *
 * Object.freeze is shallow: on a frozen act, `act.payload.target = 'x'` and
 * `act.cites.push(...)` both succeed while Object.isFrozen(act) stays true — so
 * a frozen-ness check cannot detect the mutations that matter. Freezing also does
 * not survive structuredClone / IPC / JSON round-trips, producing false positives
 * on legitimate acts crossing a worker boundary AND false negatives on tampered
 * ones. The seal is already the tamper-evidence. Recompute it.
 */

import crypto from 'node:crypto';
import { SEMANTIC_CALCULUS_ERRORS } from './types.ts';
import type { SemanticAct, Seal, SealAlgorithm } from './types.ts';

export const SEAL_ALGORITHM: SealAlgorithm = 'sha256-canonical-v0';

/**
 * Canonical serialization rules (normative, versioned by schemaHash):
 *   - object keys sorted lexicographically
 *   - arrays keep author order (order is meaning)
 *   - strings NFC-normalized
 *   - absent and null are distinct: undefined keys are omitted, null is emitted
 *   - numbers: integers plain, non-integers via a fixed repr; no -0, no exponent drift
 *   - NO wall-clock anywhere; logical time only
 */
export function canonicalize(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return undefined as unknown as string;

  const t = typeof value;
  if (t === 'string') return JSON.stringify((value as string).normalize('NFC'));
  if (t === 'boolean') return value ? 'true' : 'false';
  if (t === 'number') {
    const n = value as number;
    if (!Number.isFinite(n)) throw new TypeError(`[semantic-calculus] non-finite number in body: ${n}`);
    if (Object.is(n, -0)) return '0';
    return Number.isInteger(n) ? String(n) : String(n);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => (v === undefined ? 'null' : canonicalize(v))).join(',')}]`;
  }
  if (t === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalize(v)}`).join(',')}}`;
  }
  throw new TypeError(`[semantic-calculus] uncanonicalizable value of type ${t}`);
}

/** Step 10. 64 uppercase hex over the canonical body. NOT an SCD64 — see types.ts. */
export function sealBody(body: Omit<SemanticAct, 'seal'>): Seal {
  const digest = crypto.createHash('sha256').update(canonicalize(body), 'utf8').digest('hex').toUpperCase();
  return { algorithm: SEAL_ALGORITHM, digest };
}

/**
 * F12 — verify, don't trust the freeze. Survives structuredClone, IPC, and JSON.
 * @throws SEMANTIC_CALCULUS_SEAL_MUTATION if any sealed field changed.
 */
export function assertSealedIntact(act: SemanticAct): void {
  const { seal, ...body } = act;
  if (!seal || seal.algorithm !== SEAL_ALGORITHM) {
    throw new Error(SEMANTIC_CALCULUS_ERRORS.SEAL_MUTATION);
  }
  if (sealBody(body as Omit<SemanticAct, 'seal'>).digest !== seal.digest) {
    throw new Error(SEMANTIC_CALCULUS_ERRORS.SEAL_MUTATION);
  }
}

/** Non-throwing form, for callers that need to branch rather than fail. */
export function isSealIntact(act: SemanticAct): boolean {
  try {
    assertSealedIntact(act);
    return true;
  } catch {
    return false;
  }
}

/** Defence in depth ONLY — never the guard. Shallow freeze is what rev 2 got wrong. */
export function deepFreeze<T>(o: T): T {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    for (const v of Object.values(o as Record<string, unknown>)) deepFreeze(v);
    Object.freeze(o);
  }
  return o;
}
