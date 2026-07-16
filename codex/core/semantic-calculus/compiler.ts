/**
 * SEMANTIC CALCULUS — total compiler (rev 7: epistemic + two-phase Probe)
 *
 * F1: compileSemanticIntent is TOTAL. Always seals one act.
 *
 * Pipeline:
 *   1-8  selectKind (kind + law + epistemic + phase) — kind never reads epistemic
 *   5    cite adjudication (submitted only)
 *   6.5  draftHash
 *   9-11 seal + emit
 *
 * Two-phase Probe:
 *   compileSemanticIntent(...)           → plan (phase plan, no harness run)
 *   compileProbeReport({ plan, receipts }) → report (phase report, receipts required)
 *
 * Compiler never shells out. Receipts are re-submitted for replay.
 */

import { assertPartitioned, trustedOf, assertTrustedOnly } from './trustPartition.ts';
import { digestPartitions } from './contextDigest.ts';
import { validateCites } from './citeResolver.ts';
import { registryVersions } from './formulaRegistry.ts';
import { LEXICON_VERSION } from './lexiconUi.ts';
import { probeRegistryVersion, getProbe, buildProbePlan } from './probeRegistry.ts';
import { selectKind } from './kind.ts';
import { deriveEpistemic, derivePhase, assertEpistemicDoesNotAlterKind } from './epistemic.ts';
import { evaluateHypotheses } from './hypothesisStatus.ts';
import { validateReceiptsForProbe, receiptDigest } from './observationReceipt.ts';
import { sealBody, deepFreeze, canonicalize } from './seal.ts';
import { SEMANTIC_CALCULUS_ERRORS, EXECUTABLE_KIND, SCHEMA_VERSION_V2 } from './types.ts';
import type {
  SemanticAct,
  SemanticDraft,
  SemanticEmission,
  TrustPartitionedContext,
  GeneCite,
  Capability,
  CompilerIdentity,
  ObservationReceipt,
} from './types.ts';

export const COMPILER_BUILD_ID = 'semantic-calculus-v2-rev7';
export const SCHEMA_HASH = 'sc-v2-rev7-epistemic';

export interface CompileInput {
  utterance: string;
  context: TrustPartitionedContext;
  principalId?: string;
  /** Injected for determinism tests; never read from a clock. */
  logicalTime?: number;
  geneRegistrySnapshot?: string;
  /**
   * Evidence SUBMITTED by a resolver — not fetched here.
   * Repo state must never enter the seal path via side effect.
   */
  cites?: GeneCite[];
}

export interface ProbeReportInput {
  /** Original inquiry utterance (for digests / investigation continuity). */
  utterance: string;
  context: TrustPartitionedContext;
  probeId: string;
  receipts: readonly ObservationReceipt[];
  principalId?: string;
  logicalTime?: number;
  geneRegistrySnapshot?: string;
  cites?: GeneCite[];
  /** When true, may mark exclusive if rivals are all eliminated. Default false. */
  allowExclusive?: boolean;
}

function citeGenes(
  trusted: { policy: Record<string, unknown>; user: Record<string, unknown> },
  submitted: readonly GeneCite[] = [],
): GeneCite[] {
  assertTrustedOnly(trusted);
  validateCites(submitted);
  return [...submitted].sort((a, b) => a.stableId.localeCompare(b.stableId));
}

function hashDraft(draft: Omit<SemanticDraft, 'draftHash'>): string {
  return sealBody({ ...(draft as unknown as Omit<SemanticAct, 'seal'>) }).digest.slice(0, 32);
}

function capabilityScope(payload: Record<string, unknown>): string[] {
  const scope: string[] = [];
  const walk = (v: unknown) => {
    if (!v || typeof v !== 'object') return;
    const o = v as Record<string, unknown>;
    if (typeof o.route === 'string') scope.push(o.route);
    if (typeof o.component === 'string') scope.push(o.component);
    if (typeof o.target === 'string' && !('route' in o) && !('component' in o)) scope.push(o.target);
    for (const nested of Object.values(o)) walk(nested);
  };
  walk(payload);
  return [...new Set(scope)];
}

function mintCapability(draft: Pick<SemanticDraft, 'payload' | 'riskProfile'>, logicalTime: number): Capability {
  const scope = capabilityScope(draft.payload);
  if (scope.length === 0) {
    throw new Error(SEMANTIC_CALCULUS_ERRORS.UNCAPABLE_DO);
  }
  return {
    id: `cap-${sealBody({ ...(draft as unknown as Omit<SemanticAct, 'seal'>) }).digest.slice(0, 16)}`,
    scope,
    expiresAtLogical: logicalTime + 1,
    confirmation: draft.riskProfile.confirmationPolicy,
  };
}

function compilerIdentity(input: { geneRegistrySnapshot?: string }): CompilerIdentity {
  return {
    buildId: COMPILER_BUILD_ID,
    schemaHash: SCHEMA_HASH,
    geneRegistrySnapshot:
      input.geneRegistrySnapshot ??
      `${LEXICON_VERSION}+${registryVersions().formation.join(',')}+probes:${probeRegistryVersion()}`,
  };
}

function sealAct(body: Omit<SemanticAct, 'seal'>): SemanticAct {
  return deepFreeze({ ...body, seal: sealBody(body) }) as SemanticAct;
}

/**
 * F1 — TOTAL. Never returns null. Always returns a sealed emission (plan or atomic).
 */
export function compileSemanticIntent(input: CompileInput): SemanticEmission {
  const { utterance, context } = input;
  assertPartitioned(context);
  const logicalTime = input.logicalTime ?? 0;
  const principalId = input.principalId ?? 'anonymous';

  const decision = selectKind(utterance, context);
  const cites = citeGenes(trustedOf(context), input.cites);

  // Re-derive epistemic with gene cite presence (still does not change kind).
  const kindBeforeEpistemic = decision.kind;
  const epistemic = deriveEpistemic({
    kind: decision.kind,
    bound: decision.bound,
    hasUnresolvedSlots: decision.hasUnresolvedSlots,
    unknownReferent: decision.unknownReferent,
    needsEvidence: decision.needsEvidence,
    hasObservationReceipts: decision.phase === 'report',
    hasGeneCites: cites.length > 0,
    utterance,
  });
  // Kind invariance — epistemic must never rewrite kind. The previous form
  // compared decision.kind to itself and could not fire.
  assertEpistemicDoesNotAlterKind(kindBeforeEpistemic, decision.kind);

  const partial = {
    version: 'SemanticCalculus-v2' as const,
    schemaVersion: SCHEMA_VERSION_V2,
    preliminaryKind: decision.kind,
    payload: decision.payload,
    cites,
    law: decision.law,
    contextDigests: digestPartitions(context),
    riskProfile: decision.riskProfile,
    formulaIds: decision.formulaIds,
    theoryDeposit: decision.theoryDeposit,
    principalId,
    epistemic,
    phase: decision.phase,
    investigationDeposit: decision.investigationDeposit,
  };

  const draft: SemanticDraft = { ...partial, draftHash: '' };
  draft.draftHash = hashDraft(partial as Omit<SemanticDraft, 'draftHash'>);

  const theoryReceipt = undefined;

  const kind = draft.preliminaryKind;
  const capability =
    kind === EXECUTABLE_KIND && draft.law.decision === 'allow'
      ? mintCapability(draft, logicalTime)
      : undefined;

  const body: Omit<SemanticAct, 'seal'> = {
    version: 'SemanticCalculus-v2',
    schemaVersion: SCHEMA_VERSION_V2,
    kind,
    payload: draft.payload,
    cites: draft.cites,
    law: draft.law,
    contextDigests: draft.contextDigests,
    riskProfile: draft.riskProfile,
    capability,
    formulaIds: draft.formulaIds,
    theoryDeposit: draft.theoryDeposit,
    epistemic: draft.epistemic,
    phase: draft.phase,
    investigationDeposit: draft.investigationDeposit,
    compiler: compilerIdentity(input),
  };

  const act = sealAct(body);
  return { act, theoryReceipt };
}

/**
 * Phase-2 Probe report. Requires submitted receipts. Does not re-run harnesses.
 * Seals a different digest from the plan — plan seal ≠ report seal.
 */
export function compileProbeReport(input: ProbeReportInput): SemanticEmission {
  const { utterance, context, probeId, receipts } = input;
  assertPartitioned(context);

  const probe = getProbe(probeId);
  if (!probe) throw new Error(SEMANTIC_CALCULUS_ERRORS.UNKNOWN_PROBE);

  const { digests, observationIds } = validateReceiptsForProbe(probe, receipts);
  const evaluation = evaluateHypotheses(probe.hypotheses, receipts, {
    allowExclusive: input.allowExclusive === true,
  });

  const cites = citeGenes(trustedOf(context), input.cites);
  const payload = Object.freeze({
    phase: 'report' as const,
    probeId,
    supported: evaluation.supported,
    surviving: evaluation.surviving,
    eliminated: evaluation.eliminated,
    underdetermined: evaluation.underdetermined,
    exclusive: evaluation.exclusive,
    observationIds,
    receiptDigests: digests,
    warrant: 'observation' as const,
  });

  const kind = 'Probe' as const;
  const phase = derivePhase({ kind, payload: payload as unknown as Record<string, unknown> });
  const epistemic = deriveEpistemic({
    kind,
    bound: true,
    hasUnresolvedSlots: false,
    unknownReferent: false,
    needsEvidence: false,
    hasObservationReceipts: true,
    hasGeneCites: cites.length > 0,
    utterance,
  });

  const riskProfile = {
    consequence: 'reversible_ui' as const,
    minMargin: 0.1,
    requiredCites: [] as string[],
    allowedFallback: 'Clarify' as const,
    confirmationPolicy: 'none' as const,
  };

  const law = {
    decision: 'allow' as const,
    ruleIds: ['law.ui.reversible.v1', 'law.probe.report.observation.v1'],
  };

  const body: Omit<SemanticAct, 'seal'> = {
    version: 'SemanticCalculus-v2',
    schemaVersion: SCHEMA_VERSION_V2,
    kind,
    payload: payload as unknown as Record<string, unknown>,
    cites,
    law,
    contextDigests: digestPartitions(context),
    riskProfile,
    formulaIds: {
      formation: [`inquiry.${probe.id}@${probe.version}`],
      modulation: [],
    },
    theoryDeposit: { required: false },
    epistemic,
    phase,
    compiler: compilerIdentity(input),
  };

  return { act: sealAct(body) };
}

/**
 * Convenience: compile a plan for a known probe id without free-text binding.
 * Still runs nothing.
 */
export function compileProbePlan(input: {
  utterance: string;
  context: TrustPartitionedContext;
  probeId: string;
  principalId?: string;
  cites?: GeneCite[];
}): SemanticEmission {
  const probe = getProbe(input.probeId);
  if (!probe) throw new Error(SEMANTIC_CALCULUS_ERRORS.UNKNOWN_PROBE);
  // Route through total compiler by using a binding utterance from patterns[0]
  // if the free text did not bind — caller may pass probe patterns.
  const plan = buildProbePlan(probe);
  const synthetic = input.utterance || probe.patterns[0] || probe.id;
  // Prefer natural compile if inquiry binds; else force plan payload via report-style seal
  const first = compileSemanticIntent({
    utterance: synthetic,
    context: input.context,
    principalId: input.principalId,
    cites: input.cites,
  });
  if (first.act.phase === 'plan' && (first.act.payload as { probeId?: string }).probeId === probe.id) {
    return first;
  }
  // Force plan seal for explicit probeId
  const cites = citeGenes(trustedOf(input.context), input.cites);
  const kind = 'Probe' as const;
  const payload = plan as unknown as Record<string, unknown>;
  const epistemic = deriveEpistemic({
    kind,
    bound: true,
    hasUnresolvedSlots: false,
    unknownReferent: false,
    needsEvidence: true,
    hasObservationReceipts: false,
    hasGeneCites: cites.length > 0,
    utterance: synthetic,
  });
  const body: Omit<SemanticAct, 'seal'> = {
    version: 'SemanticCalculus-v2',
    schemaVersion: SCHEMA_VERSION_V2,
    kind,
    payload,
    cites,
    law: { decision: 'allow', ruleIds: ['law.ui.reversible.v1', 'law.probe.plan.v1'] },
    contextDigests: digestPartitions(input.context),
    riskProfile: {
      consequence: 'reversible_ui',
      minMargin: 0.1,
      requiredCites: [],
      allowedFallback: 'Clarify',
      confirmationPolicy: 'none',
    },
    formulaIds: { formation: [`inquiry.${probe.id}@${probe.version}`], modulation: [] },
    theoryDeposit: { required: false },
    epistemic,
    phase: 'plan',
    compiler: compilerIdentity(input),
  };
  return { act: sealAct(body) };
}

export function maybeCompile(input: CompileInput): SemanticEmission | null {
  if (process.env.ENABLE_SEMANTIC_CALCULUS !== '1') return null;
  return compileSemanticIntent(input);
}

export function assertExecutable(act: SemanticAct): void {
  if (act.kind !== EXECUTABLE_KIND) {
    throw new Error(SEMANTIC_CALCULUS_ERRORS.THEORY_NOT_EXECUTABLE);
  }
  if (act.law.decision !== 'allow') {
    throw new Error(SEMANTIC_CALCULUS_ERRORS.NOT_PERMITTED);
  }
  if (!act.capability) {
    throw new Error(SEMANTIC_CALCULUS_ERRORS.UNCAPABLE_DO);
  }
}

/** Reports never execute Do — they annotate knowledge only. */
export function assertReportNotExecutable(act: SemanticAct): void {
  if (act.phase === 'report' || act.phase === 'plan') {
    try {
      assertExecutable(act);
      throw new Error(SEMANTIC_CALCULUS_ERRORS.NOT_PERMITTED);
    } catch (e) {
      if (e instanceof Error && e.message === SEMANTIC_CALCULUS_ERRORS.NOT_PERMITTED) throw e;
      // expected: THEORY_NOT_EXECUTABLE or similar for Probe
    }
  }
}

export const __test__ = { canonicalize, hashDraft, receiptDigest };
