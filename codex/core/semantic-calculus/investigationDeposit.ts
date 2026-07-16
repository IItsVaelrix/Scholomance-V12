/**
 * SEMANTIC CALCULUS — investigation deposit skeleton (rev 7 P5)
 *
 * When Theory/Hypothesis deposits with a procedure (or concept) gap, the unit
 * promoted later is a method — not a bare token.
 */

import type { InvestigationDeposit, TrustPartitionedContext } from './types.ts';
import { looksLikeProcedureInquiry } from './epistemic.ts';
import { bindInquiryProbe } from './probeRegistry.ts';

export function buildInvestigationDeposit(
  utterance: string,
  context: TrustPartitionedContext,
  gap: 'procedure' | 'concept' | 'command' | 'none' | 'required_slot' | 'evidence',
): InvestigationDeposit | undefined {
  if (gap !== 'procedure' && gap !== 'concept') return undefined;

  const user = (context.user ?? {}) as Record<string, unknown>;
  const route = typeof user.route === 'string' ? user.route : undefined;
  const selection = user.selection != null ? String(user.selection) : undefined;

  const probe = bindInquiryProbe(utterance);
  const candidateHypotheses = probe
    ? probe.hypotheses.map((h) => ({ id: h.id, claim: h.claim }))
    : looksLikeProcedureInquiry(utterance)
      ? [{ id: 'h_open', claim: 'Unspecified causal mechanism — needs Probe formula' }]
      : [];

  const missingSlots: string[] = [];
  if (!probe) missingSlots.push('probeId');
  if (gap === 'procedure') {
    missingSlots.push('observations', 'falsifiers');
  }
  if (!route) missingSlots.push('route');

  return Object.freeze({
    utterance: String(utterance ?? ''),
    context: Object.freeze({
      ...(route ? { route } : {}),
      ...(selection ? { selection } : {}),
    }),
    candidateHypotheses: Object.freeze(candidateHypotheses),
    missingSlots: Object.freeze(missingSlots),
    status: 'open' as const,
  });
}
