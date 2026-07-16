/**
 * SEMANTIC CALCULUS — epistemic state (rev 7)
 *
 * Orthogonal to kind and law. Answers: what is missing, how bound is the method,
 * what warrants are required vs present.
 *
 * CRITICAL: this module never returns or mutates CalculusKind. Kind is decided
 * only in kind.ts. If a future change branches on epistemic.gap to set kind,
 * that is EPISTEMIC_KIND_COUPLING and recreates the rev-5 taxonomy failure.
 */

import type {
  ActPhase,
  CalculusKind,
  EpistemicGap,
  EpistemicMethod,
  EpistemicState,
  WarrantKind,
} from './types.ts';

/** Interrogative / diagnostic surface forms — procedure gap when unbound. */
const PROCEDURE_RE =
  /\b(why|how come|diagnose|debug|root\s*cause|not\s+work|doesn'?t\s+work|fail(?:s|ing|ure)?|broken|stutter|jank|blank|missing|not\s+show(?:ing)?|off[- ]?screen|low[- ]?tier|performance)\b/i;

/** Command-like surface forms when nothing binds. */
const COMMAND_RE =
  /\b(run|start|deploy|build|install|lint|test|fix|ship|execute|npm|script)\b/i;

export function looksLikeProcedureInquiry(utterance: string): boolean {
  return PROCEDURE_RE.test(String(utterance ?? ''));
}

export function looksLikeCommandRequest(utterance: string): boolean {
  return COMMAND_RE.test(String(utterance ?? ''));
}

export interface EpistemicInput {
  kind: CalculusKind;
  /** UI/CLI/inquiry pattern bound. */
  bound: boolean;
  /** Bound but required slots open (deictic Clarify). */
  hasUnresolvedSlots: boolean;
  /** Unbound concept (unknown-referent) rather than pure miss. */
  unknownReferent: boolean;
  /** Probe plan sealed without observation receipts yet. */
  needsEvidence: boolean;
  /** Probe report with valid observation receipts in body. */
  hasObservationReceipts: boolean;
  /** Gene cites present on the act. */
  hasGeneCites: boolean;
  utterance: string;
  /**
   * Which lexicon the miss was against. This is the P4 seam (split lexicons by
   * epistemic role); until P4 lands only 'inquiry' influences derivation.
   *
   * 'action' and 'surface' are deliberately inert: a miss against a lexicon says
   * which lexicon failed to bind, not what the speaker asked for. Do not restore
   * a role→gap shortcut — surface-form genes are the computable trigger, and a
   * role override made every unbound CLI utterance a 'command' gap.
   */
  lexiconRole?: 'action' | 'surface' | 'inquiry';
}

function uniqueWarrants(list: readonly WarrantKind[]): readonly WarrantKind[] {
  return Object.freeze([...new Set(list)].sort());
}

/**
 * Pure function of kind + binding facts. Never changes kind.
 * Genes (conceptual): EPISTEMIC_GAP_*, EPISTEMIC_METHOD_*.
 */
export function deriveEpistemic(input: EpistemicInput): EpistemicState {
  const present: WarrantKind[] = [];
  if (input.bound) present.push('lexicon');
  if (input.hasGeneCites) present.push('gene');
  if (input.hasObservationReceipts) present.push('observation');

  let gap: EpistemicGap = 'none';
  let method: EpistemicMethod = 'bound';
  let required: WarrantKind[] = ['lexicon'];

  if (input.kind === 'Do' || (input.kind === 'Probe' && input.bound && !input.needsEvidence)) {
    gap = 'none';
    method = 'bound';
    required = input.kind === 'Probe' ? ['lexicon'] : ['lexicon'];
  }

  if (input.kind === 'Probe' && input.needsEvidence) {
    // Plan phase: method bound to a formula, but conclusion needs evidence.
    gap = 'evidence';
    method = 'bound';
    required = ['lexicon', 'observation'];
  }

  if (input.kind === 'Probe' && input.hasObservationReceipts) {
    gap = 'none';
    method = 'bound';
    required = ['lexicon', 'observation'];
  }

  if (input.kind === 'Clarify') {
    gap = input.hasUnresolvedSlots ? 'required_slot' : 'procedure';
    method = 'underspecified';
    required = gap === 'required_slot' ? ['lexicon', 'human'] : ['lexicon', 'observation'];
  }

  if (input.kind === 'Theory' || input.kind === 'Hypothesis') {
    method = 'absent';
    if (input.unknownReferent) {
      gap = 'concept';
      required = ['lexicon'];
    } else if (looksLikeProcedureInquiry(input.utterance) || input.lexiconRole === 'inquiry') {
      // Procedure is tested BEFORE the action role. A closed-world lexicon miss
      // says which lexicon failed, never what the speaker asked for; letting
      // lexiconRole:'action' win here reclassified diagnoses as missing scripts.
      gap = 'procedure';
      required = ['lexicon', 'observation'];
    } else if (looksLikeCommandRequest(input.utterance)) {
      gap = 'command';
      required = ['lexicon'];
    } else {
      gap = 'concept';
      required = ['lexicon'];
    }
  }

  // Bound path already set method=bound above; Theory never bound.
  if (!input.bound && (input.kind === 'Theory' || input.kind === 'Hypothesis')) {
    method = 'absent';
  }

  return Object.freeze({
    gap,
    method,
    warrantRequired: uniqueWarrants(required),
    warrantPresent: uniqueWarrants(present),
  });
}

/** Experimental phase for the sealed act. Probe plans/reports only. */
export function derivePhase(input: {
  kind: CalculusKind;
  payload: Record<string, unknown>;
}): ActPhase {
  if (input.kind !== 'Probe') return 'atomic';
  const p = input.payload?.phase;
  if (p === 'plan' || p === 'report') return p;
  return 'atomic';
}

/**
 * Property helper for tests: epistemic derivation must never invent a new kind.
 */
export function assertEpistemicDoesNotAlterKind(
  before: CalculusKind,
  after: CalculusKind,
): void {
  if (before !== after) {
    throw new Error('SEMANTIC_CALCULUS_EPISTEMIC_KIND_COUPLING');
  }
}
