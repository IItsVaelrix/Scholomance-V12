/**
 * SEMANTIC CALCULUS — kind selection (steps 1, 4-6, 8). ISOMORPHIC.
 *
 * This module is the DECISION: binding, slot resolution, law adjudication, act
 * type. It is pure, crypto-free, and runs unchanged in node, vitest, and the
 * browser under Vite.
 *
 * The split matters architecturally, not just for bundling. `seal.ts` needs
 * node:crypto and is node-only; a UI intent compiler that cannot run in the UI is
 * a defect. Separating the decision from the sealing lets the Visualiser shadow
 * surface show a real kind through the REAL code path — no duplicated heuristic
 * in the frontend that drifts from the compiler (COLOR_DRAGON).
 *
 * There is exactly one place where an utterance becomes a kind, and it is here.
 */

import { getFormation, UNBOUND_RISK } from './formulaRegistry.ts';
import { bindPattern, type LexiconMatch } from './lexiconUi.ts';
import { trustedOf } from './trustPartition.ts';
import type { CalculusKind, LawDecision, RiskProfile, TrustPartitionedContext } from './types.ts';

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
  /** Debug/telemetry only — never sealed, never authority. */
  bound: boolean;
  formulaId?: string;
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
    // Nothing but reversible UI ships on this flag. Destructive/financial/privacy
    // acts require the follow-up PDR, not a threshold tweak.
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
 * Steps 1-8 minus the crypto: utterance + trusted context -> act type + verdict.
 *
 * The four-way decision:
 *   no pattern matched          -> Theory     (SEMANTIC_KIND_THEORY_UNBOUND)
 *   matched, a slot unresolved  -> Clarify    (SEMANTIC_KIND_CLARIFY_UNDERSPECIFIED)
 *   matched, all slots, read    -> Probe      (SEMANTIC_KIND_PROBE_READONLY)
 *   matched, all slots, mutate  -> Do         (SEMANTIC_KIND_DO_GROUNDED)
 *
 * Hypothesis still needs the candidate-binding detector; until it exists an
 * unbound utterance is Theory, which is fail-closed — the gene forbids inventing
 * a candidate the speaker never supplied.
 *
 * Phase 2 still has no ballistics, so a pattern either matches or it does not:
 * 0 or 1 candidates, never a margin. The margin law remains untested by construction.
 */
export function selectKind(utterance: string, context: TrustPartitionedContext): KindDecision {
  // Step 1 — formation. Trusted partitions select formulas; untrusted may not.
  trustedOf(context); // throws TRUST_BOUNDARY on an unpartitioned context
  const match = bindPattern(utterance, context);
  const formation = match ? getFormation(match.formulaId) : undefined;

  // Step 4 — preliminary kind.
  let kind: CalculusKind;
  if (!match || !formation) {
    kind = 'Theory'; // nothing bound at all
  } else if (match.unresolved.some((u) => u.reason === 'unknown-referent')) {
    // The verb bound but the target names a concept the lexicon does not have.
    // There is nothing to disambiguate — this is an unbound concept, and it
    // deposits (SEMANTIC_KIND_THEORY_UNBOUND). Asking "which one?" about a word
    // we do not know would be theatre.
    kind = 'Theory';
  } else if (match.unresolved.length > 0) {
    // Deictic: the referent exists, we cannot tell which. Bounded question.
    // NEVER resolve it from state and emit Do — that soft Do is the failure this
    // architecture exists to prevent. State offers candidates, not answers.
    kind = 'Clarify';
  } else {
    kind = formation.effect === 'read' ? 'Probe' : 'Do';
  }

  const riskProfile = formation?.riskProfile ?? UNBOUND_RISK;

  return {
    kind,
    law: adjudicateLaw({ kind, riskProfile }),
    riskProfile,
    payload: match?.payload ?? { unboundUtterance: utterance },
    formulaIds: formation
      ? { formation: [`${formation.id}@${formation.version}`], modulation: [] }
      : { formation: [], modulation: [] },
    theoryDeposit: { required: DEPOSITING_KINDS.has(kind) },
    question: kind === 'Clarify' && match ? buildQuestion(match) : undefined,
    bound: Boolean(formation),
    formulaId: formation?.id,
  };
}
