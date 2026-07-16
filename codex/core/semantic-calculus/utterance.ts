/**
 * SEMANTIC CALCULUS — F21 utterance provenance. ISOMORPHIC — no node: imports.
 *
 * The utterance is the outermost authority path in this architecture. It selects
 * the formula, resolves the slots, and produces the payload that capabilityScope
 * walks to mint a capability. Until F21 it was the only input with no trust class
 * at all — every partition downstream was guarding a door already walked through.
 *
 * THE DEFAULT IS UNTRUSTED, AND THAT IS THE POINT.
 *
 * trustPartition.ts states the rule for context: "A caller that cannot say where
 * a string came from must place it in `untrusted` — there is no default-trusted
 * path." A bare string reaching compile is a caller that did not say. It is
 * therefore untrusted, and untrusted never authorizes a Do.
 *
 * This is a coercion rather than a throw because F1 keeps compile TOTAL: a
 * provenance-less utterance still seals one honest act, and that act escalates
 * instead of executing. Failing safe beats failing loud here — a throw would
 * tempt callers to paper over it, whereas an escalate makes the missing
 * declaration visible in the act itself.
 */

import type { TrustPartitionedContext, Utterance, UtteranceProvenance, UtteranceTrust } from './types.ts';

/** What a caller who declared nothing gets. Named so it is greppable in a corpus. */
export const UNATTRIBUTED_TAINT = 'unattributed-utterance';

export type UtteranceInput = string | Utterance;

function isUtterance(input: UtteranceInput): input is Utterance {
  return typeof input === 'object' && input !== null && typeof (input as Utterance).text === 'string';
}

/**
 * Normalize any accepted input into a declared Utterance.
 * A bare string is untrusted and carries the unattributed taint — never 'user'.
 */
export function toUtterance(input: UtteranceInput): Utterance {
  if (isUtterance(input)) {
    return Object.freeze({
      text: String(input.text ?? ''),
      trust: input.trust,
      taint: Object.freeze([...(input.taint ?? [])].map(String).sort()),
    });
  }
  return Object.freeze({
    text: String(input ?? ''),
    trust: 'untrusted' as const,
    taint: Object.freeze([UNATTRIBUTED_TAINT]),
  });
}

/** A human typed this. The only construction that earns 'user'. */
export function userUtterance(text: string): Utterance {
  return Object.freeze({ text: String(text ?? ''), trust: 'user' as const, taint: Object.freeze([]) });
}

/**
 * A model emitted this. `taint` names the untrusted sources in its causal chain
 * and is the HARNESS's to supply — the speaker declaring its own taint would be
 * the speaker authorizing itself, and omitting taint is the profitable lie.
 */
export function derivedUtterance(text: string, taint: readonly string[] = []): Utterance {
  return Object.freeze({
    text: String(text ?? ''),
    trust: 'derived' as const,
    taint: Object.freeze([...taint].map(String).sort()),
  });
}

export function provenanceOf(utterance: Utterance): UtteranceProvenance {
  return Object.freeze({ trust: utterance.trust, taint: utterance.taint });
}

/**
 * Untrusted content in the causal chain of what was said.
 *
 * A model-emitted utterance whose harness reports no untrusted reads is still
 * derived — the model is not the user — but it has not demonstrably laundered
 * anything. One that read a page has.
 */
export function isTainted(utterance: Utterance): boolean {
  return utterance.trust === 'untrusted' || utterance.taint.length > 0;
}

const CONFIRMATION_RANK = { none: 0, single: 1, two_phase: 2 } as const;
export type ConfirmationPolicy = keyof typeof CONFIRMATION_RANK;

/**
 * Provenance may only RAISE confirmation, never lower it — the same
 * monotonicity F16 requires of modulators. The consequence class was never the
 * whole risk: a reversible_ui act proposed by a model that just read the open
 * internet is not the same act as one a human typed, however reversible.
 */
export function requiredConfirmation(
  base: ConfirmationPolicy,
  utterance: Utterance,
): ConfirmationPolicy {
  const floor: ConfirmationPolicy =
    utterance.trust === 'user' ? 'none' : isTainted(utterance) ? 'two_phase' : 'single';
  return CONFIRMATION_RANK[floor] > CONFIRMATION_RANK[base] ? floor : base;
}

export function confirmationsRequired(policy: ConfirmationPolicy): number {
  return CONFIRMATION_RANK[policy];
}

/**
 * Where an utterance is allowed to come from.
 *
 * The utterance is NOT read out of the context partitions — it is a separate
 * input — but a caller that puts the request in `user` while the speaker is a
 * model has mislabelled it. This is advisory and returns the caller's own
 * declaration; there is no way to detect a lie from inside the compiler, which
 * is why taint is the harness's job.
 */
export function declaredTrust(
  utterance: Utterance,
  _context: TrustPartitionedContext,
): UtteranceTrust {
  return utterance.trust;
}
