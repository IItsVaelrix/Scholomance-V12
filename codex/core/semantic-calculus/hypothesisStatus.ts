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
  /**
   * A path the harness never reported is UNSEARCHED, not false.
   *
   * Found by using this: a falsifier asked for `phaserCanvasCount` and the
   * harness returned `canvasCount`. `eq` on the absent path returned false, the
   * falsifier read as "did not fire", and the hypothesis survived — on evidence
   * nobody had collected. That is the same error the numeric ops already guard
   * ("unsearched counts as refutation", mirrored): here absence silently
   * PROTECTED a claim instead of eliminating one. Both directions are lies.
   *
   * `falsy` is deliberately included: a missing field is not a false field. The
   * harness declining to answer must never satisfy a predicate about the answer.
   */
  const missing = (path: string) => getPath(result, path) === undefined;

  switch (predicate.op) {
    case 'eq':
      if (missing(predicate.path)) return 'inconclusive';
      return getPath(result, predicate.path) === predicate.value;
    case 'neq':
      if (missing(predicate.path)) return 'inconclusive';
      return getPath(result, predicate.path) !== predicate.value;
    case 'in':
      if (missing(predicate.path)) return 'inconclusive';
      return predicate.values.includes(getPath(result, predicate.path));
    case 'truthy':
      if (missing(predicate.path)) return 'inconclusive';
      return Boolean(getPath(result, predicate.path));
    case 'falsy':
      if (missing(predicate.path)) return 'inconclusive';
      return !getPath(result, predicate.path);
    case 'lt':
    case 'lte':
    case 'gt':
    case 'gte': {
      const v = getPath(result, predicate.path);
      // A missing or non-numeric field has not refuted anything. Coercing it to
      // 0 would silently eliminate a hypothesis on absent evidence, which is the
      // "unsearched counts as refutation" error one layer down.
      if (typeof v !== 'number' || Number.isNaN(v)) return 'inconclusive';
      if (predicate.op === 'lt') return v < predicate.value;
      if (predicate.op === 'lte') return v <= predicate.value;
      if (predicate.op === 'gt') return v > predicate.value;
      return v >= predicate.value;
    }
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

function predictionHolds(
  p: Prediction,
  receipts: readonly ObservationReceipt[],
): boolean | 'missing' | 'bad' | 'inconclusive' {
  const rec = receiptFor(receipts, p.observationId);
  if (!rec) return 'missing';
  if (rec.status !== 'observed') return 'bad';
  // A prediction WITHOUT a predicate can only assert "the observation
  // succeeded". That is honest but nearly vacuous, and it is how a prediction
  // reading "a bounded cache exists" reported as support. Formulas should carry
  // a predicate; this branch stays for the ones whose evidence really is the
  // observation's mere success.
  if (!p.predicate) return true;
  const v = evalPredicate(p.predicate, rec.result);
  return v;
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
    } else if (undetermined) {
      // A falsifier we could not EVALUATE (harness refused, errored, or never
      // reported the path it asks about) means we cannot say the claim survived
      // its own test. Previously this required `&& !allPredOk`, so an
      // untestable falsifier next to a holding prediction reported SUPPORTED —
      // support resting on the one check nobody managed to run.
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
