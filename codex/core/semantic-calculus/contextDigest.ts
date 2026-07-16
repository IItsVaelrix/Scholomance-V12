/**
 * SEMANTIC CALCULUS — F13 context digests. NODE-ONLY (uses node:crypto).
 *
 * Split out of trustPartition.ts because that module is on the browser's import
 * path (kind.ts -> trustedOf, and the shadow overlay -> emptyContext). A single
 * `import crypto from 'node:crypto'` at module level was enough to break the dev
 * server: Vite serves it as `__vite-browser-external:node:crypto`, a stub that
 * throws on access, and the page died.
 *
 * The production build TREE-SHOOK it away, so `vite build` passed and proved
 * nothing. Only the unbundled dev server exposed it. If you are ever tempted to
 * verify a browser-safety claim with a production build: don't.
 *
 * Nothing in this file may be imported by kind.ts, lexiconUi.ts, formulaRegistry.ts
 * or trustPartition.ts. tests/semantic-calculus/isomorphic.test.js enforces that.
 */

import crypto from 'node:crypto';
import { canonicalize } from './seal.ts';
import { assertPartitioned } from './trustPartition.ts';
import type { TrustPartitionedContext, ContextDigests } from './types.ts';

/** F13 — one digest per partition. `secret` is never digested into the act. */
export function digestPartitions(context: TrustPartitionedContext): ContextDigests {
  assertPartitioned(context);
  const digest = (v: unknown) =>
    crypto.createHash('sha256').update(canonicalize(v ?? {}), 'utf8').digest('hex').toUpperCase().slice(0, 32);
  return {
    policy: digest(context.policy),
    user: digest(context.user),
    untrusted: digest(context.untrusted),
    derived: digest(context.derived),
  };
}
