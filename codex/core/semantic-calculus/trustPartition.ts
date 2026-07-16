/**
 * SEMANTIC CALCULUS — F13 trust partitions. ISOMORPHIC — no node: imports.
 *
 * kind.ts and the shadow overlay both import from here, so this module runs in the
 * browser. It must stay free of node builtins: `digestPartitions` needs crypto and
 * therefore lives in contextDigest.ts (node-only). A module-level node:crypto
 * import here crashed the dev server while the production build tree-shook it and
 * passed — see contextDigest.ts.
 *
 * Untrusted content may fill factual payload slots. It may NEVER reach gene
 * detection, formula selection, capability grants, or LAW adjudication.
 *
 * This is a stronger requirement than grammar validity: cite-not-become stops
 * untrusted text from MINTING a gene, but it never stopped untrusted text from
 * SELECTING which genes get cited — and cites are the warrant LAW adjudicates on.
 * Selection is an authority path.
 */

import { SEMANTIC_CALCULUS_ERRORS } from './types.ts';
import type { TrustPartitionedContext } from './types.ts';

const REQUIRED_PARTITIONS = ['policy', 'user', 'untrusted', 'derived'] as const;

/**
 * @throws SEMANTIC_CALCULUS_TRUST_BOUNDARY if the context is not partitioned.
 * A caller that cannot say where a string came from must place it in `untrusted`.
 */
export function assertPartitioned(context: unknown): asserts context is TrustPartitionedContext {
  if (!context || typeof context !== 'object') {
    throw new Error(SEMANTIC_CALCULUS_ERRORS.TRUST_BOUNDARY);
  }
  for (const slot of REQUIRED_PARTITIONS) {
    const value = (context as Record<string, unknown>)[slot];
    if (value === undefined || value === null || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error(SEMANTIC_CALCULUS_ERRORS.TRUST_BOUNDARY);
    }
  }
}

/**
 * The only view a formation formula or cite resolver may read.
 * Passing anything else is a trust-boundary violation, not a style preference.
 */
export function trustedOf(context: TrustPartitionedContext): { policy: Record<string, unknown>; user: Record<string, unknown> } {
  assertPartitioned(context);
  return { policy: context.policy, user: context.user };
}

/**
 * @throws SEMANTIC_CALCULUS_UNTRUSTED_CITE_SOURCE if untrusted/derived/secret data
 *         reached a code path that resolves authority.
 */
export function assertTrustedOnly(view: unknown): void {
  if (!view || typeof view !== 'object') {
    throw new Error(SEMANTIC_CALCULUS_ERRORS.UNTRUSTED_CITE_SOURCE);
  }
  const keys = Object.keys(view as Record<string, unknown>);
  const forbidden = keys.filter((k) => k === 'untrusted' || k === 'derived' || k === 'secret');
  if (forbidden.length > 0) {
    throw new Error(SEMANTIC_CALCULUS_ERRORS.UNTRUSTED_CITE_SOURCE);
  }
}

/** An empty, fully-partitioned context. Nothing is trusted by default. */
export function emptyContext(): TrustPartitionedContext {
  return { policy: {}, user: {}, untrusted: {}, derived: {} };
}
