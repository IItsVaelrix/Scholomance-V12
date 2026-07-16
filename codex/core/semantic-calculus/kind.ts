/**
 * SEMANTIC CALCULUS — kind selection (steps 1, 4-6, 8). ISOMORPHIC.
 *
 * This module is the DECISION: binding, slot resolution, law adjudication, act
 * type. It is pure, crypto-free, and runs unchanged in node, vitest, and the
 * browser under Vite.
 *
 * Rev 7: epistemic state is derived AFTER kind, never used to choose kind.
 */

import { getFormation, UNBOUND_RISK } from './formulaRegistry.ts';
import { type LexiconMatch } from './lexiconUi.ts';
import { buildProbePlan } from './probeRegistry.ts';
import { LEXICONS, routeUtterance, type LexiconRole } from './lexicons.ts';
import { deriveEpistemic, derivePhase } from './epistemic.ts';
import { buildInvestigationDeposit } from './investigationDeposit.ts';
import { trustedOf } from './trustPartition.ts';
import type {
  ActPhase,
  CalculusKind,
  EpistemicState,
  InvestigationDeposit,
  LawDecision,
  RiskProfile,
  TrustPartitionedContext,
} from './types.ts';

/** Kinds that must reach the theory bank before the act seals (F7). */
const DEPOSITING_KINDS: ReadonlySet<CalculusKind> = new Set<CalculusKind>(['Theory', 'Hypothesis']);

export interface KindDecision {
  kind: CalculusKind;
  law: LawDecision;
  riskProfile: RiskProfile;
  payload: Record<string, unknown>;
  formulaIds: { formation: string[]; modulation: string[] };
  theoryDeposit: { required: boolean };
  /** Populated on Clarify: the bounded question, and what the state can offer. */
  question?: { slot: string; text: string; candidates: string[] };
  /** Debug/telemetry only — never sealed as authority over kind. */
  bound: boolean;
  formulaId?: string;
  /** Orthogonal epistemic axis (rev 7). */
  epistemic: EpistemicState;
  /** Experimental phase (rev 7). */
  phase: ActPhase;
  investigationDeposit?: InvestigationDeposit;
  /** Binding diagnostics for epistemic (not sealed separately). */
  unknownReferent: boolean;
  hasUnresolvedSlots: boolean;
  needsEvidence: boolean;
}

/**
 * Step 6 — LAW adjudication. Returns a VERDICT, never a kind (F19).
 * Cites SEMANTIC_ACT_KIND_IS_NOT_PERMISSION.
 */
export function adjudicateLaw(input: { kind: CalculusKind; riskProfile: RiskProfile }): LawDecision {
  if (input.kind === 'Theory' || input.kind === 'Hypothesis') {
    return { decision: 'clarify', ruleIds: ['law.unbound.v1'] };
  }
  if (input.kind === 'Clarify') {
    return { decision: 'clarify', ruleIds: ['law.underspecified.v1'] };
  }
  if (input.riskProfile.consequence !== 'reversible_ui') {
    return { decision: 'escalate', ruleIds: ['law.non-reversible-requires-pdr.v1'] };
  }
  return { decision: 'allow', ruleIds: ['law.ui.reversible.v1'] };
}

/** The bounded question. If we cannot name what is missing, it is not a Clarify. */
function buildQuestion(match: LexiconMatch): KindDecision['question'] {
  const miss = match.unresolved[0];
  const opts = miss.candidates.length ? ` — ${miss.candidates.join(', or ')}?` : '?';
  return { slot: miss.slot, text: `You said "${miss.raw}". Which ${miss.slot}${opts}`, candidates: miss.candidates };
}

/**
 * Steps 1-8 minus the crypto: utterance + trusted context -> act type + verdict + epistemic.
 *
 * Kind path (unchanged grammar):
 *   no pattern matched          -> Theory     (or inquiry Probe if inquiry binds)
 *   matched, unknown-referent   -> Theory
 *   matched, deictic slots      -> Clarify
 *   matched, all slots, read    -> Probe
 *   matched, all slots, mutate  -> Do
 *
 * Epistemic is derived after kind and never rewrites it.
 */
export function selectKind(utterance: string, context: TrustPartitionedContext): KindDecision {
  trustedOf(context);
  const match = LEXICONS.action.bind(utterance, context);
  const formation = match ? getFormation(match.formulaId) : undefined;
  // P4 — an EXACT action bind is evidence and wins. Only when it misses does
  // the inquiry lexicon get to claim the utterance.
  const role: LexiconRole = routeUtterance({
    utterance,
    exactActionBind: Boolean(match && formation),
  });

  let kind: CalculusKind;
  let payload: Record<string, unknown> = match?.payload ?? { unboundUtterance: utterance };
  let formulaId: string | undefined = formation?.id;
  let formulaIds: KindDecision['formulaIds'] = formation
    ? { formation: [`${formation.id}@${formation.version}`], modulation: [] }
    : { formation: [], modulation: [] };
  let bound = Boolean(formation);
  let unknownReferent = false;
  let hasUnresolvedSlots = false;
  let needsEvidence = false;
  let riskProfile = formation?.riskProfile ?? UNBOUND_RISK;
  let question: KindDecision['question'];

  if (!match || !formation) {
    // Inquiry lexicon: bind read-only Probe plans without competing as Do actions.
    const probe = role === 'inquiry' ? LEXICONS.inquiry.bind(utterance) : undefined;
    if (probe) {
      kind = 'Probe';
      const plan = buildProbePlan(probe);
      payload = { ...plan };
      formulaId = `inquiry.${probe.id}`;
      formulaIds = { formation: [`inquiry.${probe.id}@${probe.version}`], modulation: [] };
      bound = true;
      needsEvidence = true;
      riskProfile = {
        consequence: 'reversible_ui',
        minMargin: 0.1,
        requiredCites: [],
        allowedFallback: 'Clarify',
        confirmationPolicy: 'none',
      };
    } else {
      kind = 'Theory';
    }
  } else if (match.unresolved.some((u) => u.reason === 'unknown-referent')) {
    kind = 'Theory';
    unknownReferent = true;
    bound = false;
  } else if (match.unresolved.length > 0) {
    kind = 'Clarify';
    hasUnresolvedSlots = true;
    question = buildQuestion(match);
  } else {
    kind = formation.effect === 'read' ? 'Probe' : 'Do';
  }

  const phase = derivePhase({ kind, payload });
  const epistemic = deriveEpistemic({
    kind,
    bound,
    hasUnresolvedSlots,
    unknownReferent,
    needsEvidence: needsEvidence || (phase === 'plan' && kind === 'Probe'),
    hasObservationReceipts: phase === 'report',
    hasGeneCites: false,
    utterance,
    // Only 'inquiry' is forwarded, and only when the inquiry lexicon actually
    // claimed the utterance and missed — that is real evidence the missing unit
    // is a method. 'action'/'surface' stay out: unknownReferent already carries
    // the concept signal, and a role hint must inform the surface-form genes,
    // never override them.
    lexiconRole: role === 'inquiry' && !bound ? 'inquiry' : undefined,
  });

  const investigationDeposit =
    DEPOSITING_KINDS.has(kind) && (epistemic.gap === 'procedure' || epistemic.gap === 'concept')
      ? buildInvestigationDeposit(utterance, context, epistemic.gap)
      : undefined;

  return {
    kind,
    law: adjudicateLaw({ kind, riskProfile }),
    riskProfile,
    payload,
    formulaIds,
    theoryDeposit: { required: DEPOSITING_KINDS.has(kind) },
    question,
    bound,
    formulaId,
    epistemic,
    phase,
    investigationDeposit,
    unknownReferent,
    hasUnresolvedSlots,
    needsEvidence: needsEvidence || phase === 'plan',
  };
}
