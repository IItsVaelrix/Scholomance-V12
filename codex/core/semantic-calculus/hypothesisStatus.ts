/**
 * SEMANTIC CALCULUS — competitive causal hypothesis evaluation (rev 7)
 *
 * Formal state machine:
 *   eliminated(h)      ⇔ ∃f∈Fh : observed(f) fails  [only status=observed]
 *   supported(h)       ⇔ ∀ required predictions hold ∧ ¬eliminated
 *   surviving(h)       ⇔ ¬eliminated ∧ testing incomplete
 *   underdetermined(h) ⇔ observations refused/error/inconclusive for required bits
 *   exclusive(h)       ⇔ supported(h) ∧ ∀r≠h: eliminated(r)  [optional; default empty]
 *
 * Tool failure never eliminates. Unsearched never counts as refutation.
 * Multiple hypotheses may be supported simultaneously.
 */

import type {
  CausalHypothesis,
  CausalHypothesisStatus,
  Falsifier,
  ObservationReceipt,
  PredicateSpec,
  Prediction,
} from './types.ts';

export interface HypothesisEvaluation {
  supported: readonly string[];
  surviving: readonly string[];
  eliminated: readonly string[];
  underdetermined: readonly string[];
  exclusive: readonly string[];
  byId: Readonly<Record<string, CausalHypothesisStatus>>;
}

function getPath(result: unknown, path: string): unknown {
  if (!path) return result;
  let cur: unknown = result;
  for (const part of path.split('.')) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

export function evalPredicate(predicate: PredicateSpec, result: unknown): boolean | 'inconclusive' {
  switch (predicate.op) {
    case 'eq':
      return getPath(result, predicate.path) === predicate.value;
    case 'neq':
      return getPath(result, predicate.path) !== predicate.value;
    case 'in':
      return predicate.values.includes(getPath(result, predicate.path));
    case 'truthy':
      return Boolean(getPath(result, predicate.path));
    case 'falsy':
      return !getPath(result, predicate.path);
    case 'http_status_in': {
      const status = getPath(result, 'status') ?? getPath(result, 'httpStatus');
      return typeof status === 'number' && predicate.values.includes(status);
    }
    case 'csp_blocks_host': {
      const imgSrc = String(getPath(result, 'imgSrc') ?? getPath(result, 'csp') ?? '');
      if (!imgSrc) return 'inconclusive';
      const host = predicate.host;
      // Blocks if host is not in allowlist (and not *).
      if (imgSrc.includes('*') && !imgSrc.includes("'self'")) return false;
      return !imgSrc.includes(host);
    }
    case 'csp_allows_host': {
      const imgSrc = String(getPath(result, 'imgSrc') ?? getPath(result, 'csp') ?? '');
      if (!imgSrc) return 'inconclusive';
      return imgSrc.includes(predicate.host) || imgSrc.includes('*');
    }
    default:
      return 'inconclusive';
  }
}

function receiptFor(
  receipts: readonly ObservationReceipt[],
  observationId: string,
): ObservationReceipt | undefined {
  return receipts.find((r) => r.observationId === observationId);
}

function predictionHolds(p: Prediction, receipts: readonly ObservationReceipt[]): boolean | 'missing' | 'bad' {
  const rec = receiptFor(receipts, p.observationId);
  if (!rec) return 'missing';
  if (rec.status !== 'observed') return 'bad';
  // Predictions default to "observation was successfully observed" unless a
  // path is encoded in the id as path:...  For harvested probes, presence of
  // observed receipt for required prediction is enough; detailed checks use falsifiers.
  return true;
}

function falsifierTriggered(f: Falsifier, receipts: readonly ObservationReceipt[]): boolean | 'missing' | 'bad' | 'inconclusive' {
  const rec = receiptFor(receipts, f.observationId);
  if (!rec) return 'missing';
  if (rec.status === 'refused' || rec.status === 'error') return 'bad';
  if (rec.status === 'inconclusive') return 'inconclusive';
  if (rec.status !== 'observed') return 'bad';
  const v = evalPredicate(f.predicate, rec.result);
  if (v === 'inconclusive') return 'inconclusive';
  // Falsifier "triggers" (eliminates) when its predicate is TRUE
  // e.g. csp_allows_host true eliminates "CSP blocks" hypothesis via f_csp_allows
  // Wait - in our schema falsifiers eliminate when observed. For h_csp_blocks_cdn2,
  // f_csp_allows_cdn2 eliminates it when allows is true. So trigger = predicate true.
  return v === true;
}

/**
 * Evaluate hypotheses against submitted receipts only.
 * Does not re-run harnesses.
 */
export function evaluateHypotheses(
  hypotheses: readonly CausalHypothesis[],
  receipts: readonly ObservationReceipt[],
  opts: { allowExclusive?: boolean } = {},
): HypothesisEvaluation {
  const byId: Record<string, CausalHypothesisStatus> = {};
  const supported: string[] = [];
  const surviving: string[] = [];
  const eliminated: string[] = [];
  const underdetermined: string[] = [];

  for (const h of hypotheses) {
    let elim = false;
    let undetermined = false;
    let incomplete = false;
    let allPredOk = true;

    for (const f of h.falsifiers) {
      const t = falsifierTriggered(f, receipts);
      if (t === true) elim = true;
      if (t === 'bad' || t === 'inconclusive') undetermined = true;
      if (t === 'missing') incomplete = true;
    }

    for (const p of h.predictions) {
      if (!p.required) continue;
      const ph = predictionHolds(p, receipts);
      if (ph === 'missing') {
        incomplete = true;
        allPredOk = false;
      } else if (ph === 'bad') {
        undetermined = true;
        allPredOk = false;
      } else if (ph !== true) {
        allPredOk = false;
      }
    }

    if (elim) {
      byId[h.id] = 'eliminated';
      eliminated.push(h.id);
    } else if (undetermined && !allPredOk) {
      byId[h.id] = 'underdetermined';
      underdetermined.push(h.id);
    } else if (allPredOk && !incomplete) {
      byId[h.id] = 'supported';
      supported.push(h.id);
    } else {
      byId[h.id] = 'surviving';
      surviving.push(h.id);
    }
  }

  const exclusive: string[] = [];
  if (opts.allowExclusive && supported.length === 1) {
    const only = supported[0];
    const othersElim = hypotheses.every((h) => h.id === only || byId[h.id] === 'eliminated');
    if (othersElim && surviving.length === 0 && underdetermined.length === 0) {
      byId[only] = 'exclusive';
      exclusive.push(only);
    }
  }

  return Object.freeze({
    supported: Object.freeze(supported),
    surviving: Object.freeze(surviving),
    eliminated: Object.freeze(eliminated),
    underdetermined: Object.freeze(underdetermined),
    exclusive: Object.freeze(exclusive),
    byId: Object.freeze(byId),
  });
}
