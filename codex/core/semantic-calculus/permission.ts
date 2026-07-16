/**
 * SEMANTIC CALCULUS — F16 monotonic bounded modulation
 *
 * Resolves the PDR §6 escalation ("multiplicative score channels vs AST rewrite
 * operators — power vs smuggle risk") as: permission-DECREASING only.
 *
 * The theorem this buys: if every modulator is permission-decreasing and
 * permission composes monotonically, then "no sequence of modulators can
 * increase authority" follows from composition. Formula smuggling is closed by
 * construction, not by review. This is the only property in the design that can
 * be proved rather than measured — and it is what earns the word "calculus":
 * an algebra with laws, rather than a taxonomy with a pipeline.
 */

import { SEMANTIC_CALCULUS_ERRORS } from './types.ts';
import type { CalculusKind } from './types.ts';

/**
 * The permission order over ACT TYPES. Do is the top; Theory the bottom.
 *
 * Rev 5 ranked Forbidden 0 and Escalate 3 here, which put policy verdicts in an
 * act-type lattice. They are gone (SEMANTIC_ACT_KIND_IS_NOT_PERMISSION); the
 * absorbing zero now lives on the law axis, where it always belonged — see isZero.
 */
export const KIND_RANK: Readonly<Record<CalculusKind, number>> = Object.freeze({
  Theory: 0, // no binding: implies no authority at all
  Hypothesis: 1, // a guess: still no authority
  Clarify: 2, // asks a question
  Probe: 3, // reads
  Do: 4, // writes
});

export interface PermissionVector {
  kind: number;
  scope: number;
  confidence: number;
}

export interface ModulatableState {
  kind: CalculusKind;
  scope?: string[];
  score?: number;
  /** The policy axis. Modulators may lower a kind; only LAW may block outright. */
  law?: { decision: 'allow' | 'clarify' | 'block' | 'escalate' };
}

export function permission(state: ModulatableState): PermissionVector {
  return {
    kind: KIND_RANK[state.kind],
    scope: state.scope?.length ?? 0,
    confidence: state.score ?? 0,
  };
}

/** Partial order: a <= b iff NO component of a exceeds b. */
export function permissionLte(a: PermissionVector, b: PermissionVector): boolean {
  return a.kind <= b.kind && a.scope <= b.scope && a.confidence <= b.confidence;
}

/**
 * A LAW block is absorbing under composition: once blocked, always blocked.
 * This is the zero element, and it is a property of the law axis, not the kind.
 */
export function isZero(state: ModulatableState): boolean {
  return state.law?.decision === 'block';
}

export interface Modulator<T extends ModulatableState> {
  id: string;
  apply: (state: T) => T;
  /** Only an explicit LAW grant may widen permission, and only with a reason. */
  lawGrant?: string;
  reason?: string;
}

export interface PermissionGrantRecord {
  modulatorId: string;
  lawGrant: string;
  reason: string;
  from: PermissionVector;
  to: PermissionVector;
}

/**
 * Fold modulators, enforcing monotonicity at every step.
 * @throws SEMANTIC_CALCULUS_PERMISSION_WIDENED on unreasoned widening.
 */
export function applyModulation<T extends ModulatableState>(
  initial: T,
  modulators: readonly Modulator<T>[],
  grants: PermissionGrantRecord[] = [],
): { state: T; grants: PermissionGrantRecord[] } {
  let state = initial;
  for (const m of modulators) {
    if (isZero(state)) break; // Forbidden absorbs; nothing downstream may lift it.
    const next = m.apply(state);
    const from = permission(state);
    const to = permission(next);
    if (!permissionLte(to, from)) {
      if (!m.lawGrant) throw new Error(SEMANTIC_CALCULUS_ERRORS.PERMISSION_WIDENED);
      grants.push({ modulatorId: m.id, lawGrant: m.lawGrant, reason: m.reason ?? '', from, to });
    }
    state = next;
  }
  return { state, grants };
}
