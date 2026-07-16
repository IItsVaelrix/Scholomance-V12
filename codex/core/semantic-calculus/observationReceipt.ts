/**
 * SEMANTIC CALCULUS — observation receipt validation (rev 7)
 *
 * Receipts are SUBMITTED evidence. The compiler never runs harnesses.
 * Replay re-submits receipts; it does not re-observe.
 */

import { createHash } from 'node:crypto';
import { canonicalize } from './seal.ts';
import type { ObservationReceipt } from './types.ts';
import { SEMANTIC_CALCULUS_ERRORS } from './types.ts';
import type { ProbeFormula as PF } from './probeRegistry.ts';

export function hashResult(result: unknown): string {
  return createHash('sha256').update(canonicalize(result), 'utf8').digest('hex').toUpperCase();
}

export function receiptDigest(receipt: ObservationReceipt): string {
  return createHash('sha256')
    .update(
      canonicalize({
        probeId: receipt.probeId,
        observationId: receipt.observationId,
        inputHash: receipt.inputHash,
        environmentHash: receipt.environmentHash,
        resultHash: receipt.resultHash,
        status: receipt.status,
      }),
      'utf8',
    )
    .digest('hex')
    .toUpperCase();
}

export function makeReceipt(partial: {
  probeId: string;
  observationId: string;
  inputHash?: string;
  environmentHash?: string;
  result: unknown;
  status: ObservationReceipt['status'];
}): ObservationReceipt {
  const resultHash = hashResult(partial.result);
  return Object.freeze({
    probeId: partial.probeId,
    observationId: partial.observationId,
    inputHash: partial.inputHash ?? '0'.repeat(64),
    environmentHash: partial.environmentHash ?? '0'.repeat(64),
    result: partial.result,
    resultHash,
    status: partial.status,
  });
}

/**
 * Validate receipts against a probe formula's expected observations.
 * @throws REPORT_WITHOUT_RECEIPTS | RECEIPT_MISMATCH
 */
export function validateReceiptsForProbe(
  probe: PF,
  receipts: readonly ObservationReceipt[],
): { digests: string[]; observationIds: string[] } {
  if (!receipts.length) {
    throw new Error(SEMANTIC_CALCULUS_ERRORS.REPORT_WITHOUT_RECEIPTS);
  }

  const byObs = new Map<string, ObservationReceipt>();
  for (const r of receipts) {
    if (r.probeId !== probe.id) {
      throw new Error(SEMANTIC_CALCULUS_ERRORS.RECEIPT_MISMATCH);
    }
    if (hashResult(r.result) !== r.resultHash && r.status === 'observed') {
      throw new Error(SEMANTIC_CALCULUS_ERRORS.RECEIPT_MISMATCH);
    }
    byObs.set(r.observationId, r);
  }

  const required = probe.observations.filter((o) => o.required);
  for (const o of required) {
    if (!byObs.has(o.id)) {
      throw new Error(SEMANTIC_CALCULUS_ERRORS.REPORT_WITHOUT_RECEIPTS);
    }
  }

  const digests = [...byObs.values()].map(receiptDigest).sort();
  const observationIds = [...byObs.keys()].sort();
  return { digests, observationIds };
}
