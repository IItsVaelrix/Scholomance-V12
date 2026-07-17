/**
 * SEMANTIC CALCULUS — the promotion payload: deposit -> formula draft.
 *
 * The bottleneck was never the hypothesis space. It was that writing a claim down
 * cost an hour, so claims got argued instead of stated, and an unstated claim can
 * never be killed.
 *
 * But the compiler already mints the skeleton every time it admits ignorance. A
 * Theory with gap=procedure deposits `missingSlots: [probeId, observations,
 * falsifiers]` — that is not an error message, it is a formula with named holes.
 * This module makes that literal: the deposit becomes a DRAFT, and the draft
 * reports its own holes.
 *
 * THE DIVISION OF LABOUR IS THE POINT.
 *   structure  — the machine supplies it (this file)
 *   content    — you supply it: the claims, and what would kill them
 *   refusal    — the law supplies it: nothing unkillable may register
 *
 * A draft is deliberately NOT a ProbeFormula. It cannot bind, cannot seal, cannot
 * plan. It is a hole-report until every hole is filled, and `promoteDraft` is the
 * only door — it runs the falsifiability law and refuses anything that cannot
 * lose. The machine never invents a hypothesis or a falsifier: a compiler that
 * writes your claims for you is guessing and attributing the guess to you.
 */

import { assertFalsifiable, type ProbeFormula } from './probeRegistry.ts';
import type { CausalHypothesis, InvestigationDeposit, ObservationRequest } from './types.ts';

/** A hypothesis mid-draft: claims are yours, falsifiers are still missing. */
export interface HypothesisDraft {
  id: string;
  claim: string;
  predictions: CausalHypothesis['predictions'];
  falsifiers: CausalHypothesis['falsifiers'];
  citeSeeds: readonly string[];
}

export interface ProbeFormulaDraft {
  id: string;
  version: string;
  patterns: readonly string[];
  keywords: readonly string[];
  observations: readonly ObservationRequest[];
  hypotheses: readonly HypothesisDraft[];
  maxRisk: 'read_only';
  citeSeeds: readonly string[];
  /** The deposit this grew from. Replay needs to know what question it answers. */
  fromUtterance: string;
}

/** One unfilled cell in the hypotheses x observations grid. */
export interface FormulaHole {
  slot: 'probeId' | 'observations' | 'hypotheses' | 'falsifiers' | 'observationId';
  /** Which hypothesis, when the hole is inside one. */
  hypothesisId?: string;
  /** What to write, in the imperative. A hole nobody can act on is a complaint. */
  todo: string;
}

const STOP = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'why', 'does', 'do', 'did', 'it',
  'this', 'that', 'and', 'or', 'to', 'of', 'in', 'on', 'at', 'for', 'with', 'my',
  'i', 'we', 'you', 'be', 'been', 'has', 'have', 'not', 'no', 'so', 'but', 'if',
]);

function slug(text: string): string {
  return String(text ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((w) => w && !STOP.has(w))
    .slice(0, 3)
    .join('.') || 'unnamed';
}

function contentWords(text: string): string[] {
  return [...new Set(
    String(text ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP.has(w)),
  )].slice(0, 8);
}

/**
 * Turn an admission of ignorance into a fillable formula.
 *
 * Seeded ONLY from what the speaker actually said and what the deposit already
 * carries. `observations` starts empty and every hypothesis starts with no
 * falsifier — those are your holes, and inventing them here is exactly the
 * "machine guessing and calling it the user's idea" the Hypothesis gene forbids.
 */
export function draftFromDeposit(deposit: InvestigationDeposit): ProbeFormulaDraft {
  return Object.freeze({
    id: `inquiry.${slug(deposit.utterance)}`,
    version: '0.1.0-draft',
    patterns: Object.freeze([String(deposit.utterance ?? '').toLowerCase().trim()]),
    keywords: Object.freeze(contentWords(deposit.utterance)),
    observations: Object.freeze([]),
    hypotheses: Object.freeze(
      deposit.candidateHypotheses.map((h) =>
        Object.freeze({
          id: h.id,
          claim: h.claim,
          predictions: Object.freeze([]),
          falsifiers: Object.freeze([]),
          citeSeeds: Object.freeze([]),
        }),
      ),
    ),
    maxRisk: 'read_only' as const,
    citeSeeds: Object.freeze(
      [deposit.context?.route, deposit.context?.selection].filter(Boolean) as string[],
    ),
    fromUtterance: String(deposit.utterance ?? ''),
  });
}

/**
 * What is still missing, as a worklist rather than a throw.
 *
 * assertFalsifiable REFUSES; this one EXPLAINS. Same law, two audiences: the
 * registry needs a door that closes, a person needs to know which cells to fill.
 */
export function formulaHoles(draft: ProbeFormulaDraft): FormulaHole[] {
  const holes: FormulaHole[] = [];

  if (!draft.observations.length) {
    holes.push({
      slot: 'observations',
      todo: 'Name at least one observation. What would you go and look at?',
    });
  }
  if (!draft.hypotheses.length) {
    holes.push({
      slot: 'hypotheses',
      todo: 'Name at least one candidate cause. The machine will not invent it.',
    });
  }

  const observationIds = new Set(draft.observations.map((o) => o.id));
  for (const h of draft.hypotheses) {
    if (!h.falsifiers.length) {
      holes.push({
        slot: 'falsifiers',
        hypothesisId: h.id,
        todo: `What observation would prove "${h.claim}" WRONG? Without one it can only ever win.`,
      });
      continue;
    }
    for (const f of h.falsifiers) {
      if (!observationIds.has(f.observationId)) {
        holes.push({
          slot: 'observationId',
          hypothesisId: h.id,
          todo: `Falsifier ${f.id} aims at "${f.observationId}", which this probe never collects. Add that observation or re-aim the falsifier.`,
        });
      }
    }
  }
  return holes;
}

export function isPromotable(draft: ProbeFormulaDraft): boolean {
  return formulaHoles(draft).length === 0;
}

/**
 * The ONLY door from draft to formula.
 *
 * A draft cannot bind, seal, or plan — promotion is where a fillable sketch
 * becomes something the compiler will act on, so it is where the law stands. This
 * re-runs assertFalsifiable rather than trusting formulaHoles: the worklist is for
 * humans and may drift; the law is the authority.
 */
export function promoteDraft(draft: ProbeFormulaDraft, version = '1.0.0'): ProbeFormula {
  const holes = formulaHoles(draft);
  if (holes.length) {
    throw new Error(
      `SEMANTIC_CALCULUS_DRAFT_INCOMPLETE: ${draft.id} has ${holes.length} unfilled ` +
      `slot(s):\n${holes.map((x) => `  - ${x.hypothesisId ? `${x.hypothesisId}: ` : ''}${x.todo}`).join('\n')}`,
    );
  }
  const formula = Object.freeze({
    id: draft.id,
    version,
    patterns: draft.patterns,
    keywords: draft.keywords,
    observations: draft.observations,
    hypotheses: draft.hypotheses as readonly CausalHypothesis[],
    maxRisk: 'read_only' as const,
    citeSeeds: draft.citeSeeds,
  });
  assertFalsifiable(formula);
  return formula;
}
