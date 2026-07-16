/**
 * SEMANTIC CALCULUS — total compiler (Phase 1 stub, seal-last pipeline)
 *
 * F1: compileSemanticIntent is TOTAL. Every utterance + context yields exactly one
 * sealed act. It never returns null/undefined. But total across seven kinds, not
 * one — an unbound intent becomes Theory, never a soft Do. Totality that always
 * answers `Do` is not a feature; it is the disease. (See nl-compile's `|| 'stone'`.)
 *
 * Frozen pipeline (PDR rev 3 §3.3):
 *   1  Formation           (trusted partitions select formulas)
 *   2  Ballistics          (Phase 2 — absent here)
 *   3  Bounded modulation  (Phase 2 — F16 governs)
 *   4  Preliminary kind
 *   5  SCDNA cite resolution (trusted partitions ONLY)
 *   6  LAW adjudication
 *   6.5 draftHash          (AFTER cites + law — F7)
 *   7  Theory-bank txn     (Phase 4 — stubbed)
 *   8  Final kind + capability binding (F14)
 *   9  Canonical body      (no seal field, no theoryId — F18)
 *   10 Seal
 *   11 Emit { act, theoryReceipt? }
 *   12 Seal write-back     (Phase 4 — separate txn by necessity)
 */

import { assertPartitioned, trustedOf, assertTrustedOnly } from './trustPartition.ts';
import { digestPartitions } from './contextDigest.ts';
import { validateCites } from './citeResolver.ts';
import { registryVersions } from './formulaRegistry.ts';
import { LEXICON_VERSION } from './lexiconUi.ts';
import { selectKind } from './kind.ts';
import { sealBody, deepFreeze, canonicalize } from './seal.ts';
import { SEMANTIC_CALCULUS_ERRORS, EXECUTABLE_KIND } from './types.ts';
import type {
  CalculusKind,
  SemanticAct,
  SemanticDraft,
  SemanticEmission,
  TrustPartitionedContext,
  GeneCite,
  LawDecision,
  Capability,
  CompilerIdentity,
} from './types.ts';

export const COMPILER_BUILD_ID = 'semantic-calculus-v0-phase1';
export const SCHEMA_HASH = 'sc-v0-rev3';

export interface CompileInput {
  utterance: string;
  context: TrustPartitionedContext;
  principalId?: string;
  /** Injected for determinism tests; never read from a clock. */
  logicalTime?: number;
  geneRegistrySnapshot?: string;
  /**
   * Evidence SUBMITTED by a resolver (see citeResolver.ts), not fetched here.
   *
   * The compiler must never investigate. CODE_BRAIN's output depends on repo
   * state, which is not in the §3.2 determinism input list — shelling out from
   * inside the compile would make the same utterance seal different bytes after
   * any commit, and F18's 100% replay identity would be a lie. Same rule as the
   * proposal: the model/brain provides candidate evidence, the compiler adjudicates.
   */
  cites?: GeneCite[];
}

// ── Step 5: cites ────────────────────────────────────────────────────────────
/**
 * Adjudicate SUBMITTED evidence. This does not resolve cites — citeResolver.ts
 * does, before the compile, so repo state never reaches the sealed body.
 *
 * F6/F13: cite-not-become stops untrusted text from MINTING a gene; it never
 * stopped untrusted text from SELECTING which genes get cited, and cites are the
 * warrant LAW adjudicates on. Selection is an authority path — hence both guards.
 */
function citeGenes(
  trusted: { policy: Record<string, unknown>; user: Record<string, unknown> },
  submitted: readonly GeneCite[] = [],
): GeneCite[] {
  assertTrustedOnly(trusted);
  // Rejects untrusted provenance, unidentifiable refs, and — the one that matters —
  // any cite whose `supports` is empty. A reference that backs no specific field is
  // citation theatre: it looks like a warrant and cannot be checked.
  validateCites(submitted);
  // Deterministic order: cites are sealed, so their order is part of the digest.
  return [...submitted].sort((a, b) => a.stableId.localeCompare(b.stableId));
}

// ── Step 6.5: deposit identity, AFTER cites + law ────────────────────────────
function hashDraft(draft: Omit<SemanticDraft, 'draftHash'>): string {
  // F7: two drafts with identical formation but opposite adjudications MUST NOT
  // share an identity. Rev 2 hashed before cites/law and merged them into one row.
  return sealBody({ ...(draft as unknown as Omit<SemanticAct, 'seal'>) }).digest.slice(0, 32);
}

// ── Step 8: capability ──────────────────────────────────────────────────────
/**
 * The scope is what the capability actually authorises — derived from the RESOLVED
 * slot values, never from the raw utterance.
 *
 * Phase 2 made payloads nested ({ target: { route: '/albums' } }), and reading
 * `payload.route` off the top level silently produced `String(undefined)` -> a
 * capability scoped to "unknown". A capability that cannot name what it permits is
 * worse than no capability: it looks like authority and bounds nothing. Fail closed.
 */
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
    // No nameable scope means no bounded authority. Refuse rather than mint
    // something that looks like a grant and permits everything or nothing.
    throw new Error(SEMANTIC_CALCULUS_ERRORS.UNCAPABLE_DO);
  }
  return {
    id: `cap-${sealBody({ ...(draft as unknown as Omit<SemanticAct, 'seal'>) }).digest.slice(0, 16)}`,
    scope,
    expiresAtLogical: logicalTime + 1,
    confirmation: draft.riskProfile.confirmationPolicy,
  };
}

/**
 * F1 — TOTAL. Never returns null. Always returns a sealed emission.
 */
export function compileSemanticIntent(input: CompileInput): SemanticEmission {
  const { utterance, context } = input;
  assertPartitioned(context); // F13 — no blob contexts
  const logicalTime = input.logicalTime ?? 0;
  const principalId = input.principalId ?? 'anonymous';

  // Steps 1-8 (decision) — delegated to kind.ts, the single place an utterance
  // becomes a kind. Steps 2-3 (ballistics, modulation) are Phase 2.
  const decision = selectKind(utterance, context);

  const partial = {
    version: 'SemanticCalculus-v0' as const,
    preliminaryKind: decision.kind,
    payload: decision.payload,
    cites: citeGenes(trustedOf(context), input.cites), // Step 5
    law: decision.law, // Step 6 — a VERDICT, not a kind (F19)
    contextDigests: digestPartitions(context),
    riskProfile: decision.riskProfile,
    formulaIds: decision.formulaIds,
    theoryDeposit: decision.theoryDeposit,
    principalId,
  };

  // Step 6.5 — identity covers cites + law (F7). theoryDeposit came from selectKind.
  const draft: SemanticDraft = { ...partial, draftHash: '' };
  draft.draftHash = hashDraft(partial as Omit<SemanticDraft, 'draftHash'>);

  // Step 7 — theory-bank transaction. Phase 4 wires SQLite. The receipt is
  // bank-state-dependent and stays OUTSIDE the seal (F18), so its absence here
  // does not change a single sealed byte.
  const theoryReceipt = undefined;

  // Step 8 — final kind + capability.
  const kind = draft.preliminaryKind;
  // A capability is authority. Mint it only for an act that is both a Do AND permitted;
  // minting one LAW refused would leave a usable grant lying inside a sealed refusal.
  const capability =
    kind === EXECUTABLE_KIND && draft.law.decision === 'allow'
      ? mintCapability(draft, logicalTime)
      : undefined;

  // Step 9 — canonical body. No theoryId, no draftHash, no wall-clock.
  const compiler: CompilerIdentity = {
    buildId: COMPILER_BUILD_ID,
    schemaHash: SCHEMA_HASH,
    geneRegistrySnapshot: input.geneRegistrySnapshot ?? `${LEXICON_VERSION}+${registryVersions().formation.join(',')}`,
  };

  const body: Omit<SemanticAct, 'seal'> = {
    version: 'SemanticCalculus-v0',
    kind,
    payload: draft.payload,
    cites: draft.cites,
    law: draft.law,
    contextDigests: draft.contextDigests,
    riskProfile: draft.riskProfile,
    capability,
    formulaIds: draft.formulaIds,
    theoryDeposit: draft.theoryDeposit,
    compiler,
  };

  // Step 10 — seal. Step 11 — emit; deep-freeze is defence in depth, not the guard.
  const act = deepFreeze({ ...body, seal: sealBody(body) }) as SemanticAct;
  return { act, theoryReceipt };
}

/**
 * F11 — the integration gate, and ONLY the gate.
 * `null` means "Semantic Calculus did not run". It is NOT an F1 violation.
 */
export function maybeCompile(input: CompileInput): SemanticEmission | null {
  if (process.env.ENABLE_SEMANTIC_CALCULUS !== '1') return null;
  return compileSemanticIntent(input);
}

/**
 * F10/F14 — an act is not a permit.
 *
 * Three independent gates, because kind and permission are different axes
 * (SEMANTIC_ACT_KIND_IS_NOT_PERMISSION). Rev 5 checked only `kind !== 'Do'`,
 * which was safe only because the kind smuggled the policy verdict inside it.
 * With that duplication removed, the executor MUST consult law.decision itself —
 * a `Do` is now a claim about grammar and nothing more.
 */
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

export const __test__ = { canonicalize, hashDraft };
