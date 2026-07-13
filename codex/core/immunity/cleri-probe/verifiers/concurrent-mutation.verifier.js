/**
 * CONCURRENT_SHARED_STATE_MUTATION structural verifier.
 *
 * Proves that a callback running under a concurrent primitive writes to a
 * binding declared outside itself, more than once, with nothing serializing the
 * writes. Interleaving is what makes the write unsafe, so a sequential loop and
 * a mutation performed after the join are both healthy.
 *
 * Supporting predicates:
 *   CALLBACK_EXECUTES_UNDER_CONCURRENT_PRIMITIVE
 *   WRITE_TARGET_DECLARED_OUTSIDE_CALLBACK
 *   WRITE_CAN_OCCUR_MORE_THAN_ONCE
 *
 * Counterchecks (any one present means NO_FINDING):
 *   TARGET_IS_CALLBACK_LOCAL
 *   CALLBACK_RETURNS_IMMUTABLE_RESULT
 *   APPROVED_SYNCHRONIZATION_ADAPTER_GUARDS_WRITE
 */

import { deepFreeze } from '../contracts.js';
import {
  REPEATING_ITERATORS,
  hasApprovedImmuneAllow,
  isConcurrentPrimitive,
  isSynchronizationAdapterCallee
} from '../scholomance-profile.js';
import {
  bySpan,
  callsWithin,
  countercheck,
  enclosingNamedFunction,
  hasFacts,
  isWithinFunction,
  noFinding,
  spanWithSymbol,
  supporting,
  verified
} from './verifier-kit.js';

const PATHOLOGY_CLASS = 'CONCURRENT_SHARED_STATE_MUTATION';

const REMEDIATION = deepFreeze({
  recommendationId: 'concurrent-shared-state',
  summary: 'Return a value from each callback and aggregate after the join, or serialize the write behind an approved synchronization adapter.',
  unsafePattern: 'await Promise.all(items.map(async item => { shared[item.id] = await work(item); }));',
  safePattern: 'const entries = await Promise.all(items.map(async item => [item.id, await work(item)])); const shared = Object.fromEntries(entries);',
  verificationSteps: [
    'Run the concurrent path with a shuffled input order and assert the aggregate is identical every time.'
  ],
  autoFixAvailable: false
});

const LIMITATIONS = deepFreeze([
  'Only Promise.all and Promise.allSettled over map/filter-derived callbacks are proven in v1.',
  'A Promise.all over an array literal runs each callback once, so its writes are not reported.',
  'Sequential loops and mutation performed after the join are outside this pathology class.'
]);

function bindingById(facts, id) {
  return (facts.bindings || []).find(binding => binding.id === id) || null;
}

export const concurrentMutationVerifier = deepFreeze({
  id: 'concurrent-mutation/v1',
  version: '1.0.0',
  pathologyClass: PATHOLOGY_CLASS,
  supportingPredicates: deepFreeze([
    'CALLBACK_EXECUTES_UNDER_CONCURRENT_PRIMITIVE',
    'WRITE_TARGET_DECLARED_OUTSIDE_CALLBACK',
    'WRITE_CAN_OCCUR_MORE_THAN_ONCE'
  ]),
  counterchecks: deepFreeze([
    'TARGET_IS_CALLBACK_LOCAL',
    'CALLBACK_RETURNS_IMMUTABLE_RESULT',
    'APPROVED_SYNCHRONIZATION_ADAPTER_GUARDS_WRITE'
  ]),
  limitations: LIMITATIONS,

  retrieveHints() {
    return ['Promise.all', 'Promise.allSettled'];
  },

  verify(candidate, context) {
    if (!hasFacts(candidate)) return noFinding();

    const facts = candidate.facts;
    void context;
    const findings = [];

    for (const callback of facts.concurrentCallbacks || []) {
      if (!isConcurrentPrimitive(callback.primitive)) continue;

      // An array literal runs each callback exactly once, so its writes cannot
      // race with themselves. Only an iterator-derived callback repeats.
      const repeats = REPEATING_ITERATORS.includes(callback.iterator);
      if (!repeats) continue;

      const serialized = callsWithin(facts, callback.callbackFunctionId)
        .some(call => isSynchronizationAdapterCallee(call.callee));
      if (serialized) continue;

      const writes = (facts.writes || []).filter(write => write.concurrentCallbackId === callback.id);

      for (const write of writes) {
        const target = write.bindingId ? bindingById(facts, write.bindingId) : null;
        if (!target) continue;

        // A binding declared inside the callback is private to one iteration.
        const callbackLocal = isWithinFunction(
          facts.functions,
          target.functionId,
          callback.callbackFunctionId
        );
        if (callbackLocal) continue;

        if (hasApprovedImmuneAllow(facts.comments, PATHOLOGY_CLASS, write.span.startLine)) continue;

        const owner = enclosingNamedFunction(facts.functions, callback.functionId);
        const symbol = owner ? owner.name : null;
        const span = spanWithSymbol(write.span, symbol);

        findings.push({
          span,
          symbol,
          summary: `${target.name} is declared outside a ${callback.primitive} callback and mutated inside it, once per ${callback.iterator}ped item`,
          supportingEvidence: [
            supporting(
              'CALLBACK_EXECUTES_UNDER_CONCURRENT_PRIMITIVE',
              true,
              span,
              `The callback runs under ${callback.primitive} at line ${callback.span.startLine}`
            ),
            supporting(
              'WRITE_TARGET_DECLARED_OUTSIDE_CALLBACK',
              true,
              span,
              `${target.name} is declared at line ${target.declarationSpan.startLine}, outside the callback`
            ),
            supporting(
              'WRITE_CAN_OCCUR_MORE_THAN_ONCE',
              true,
              span,
              `The callback is derived from .${callback.iterator}(), so the '${write.operation}' write runs once per item and the runs interleave`
            )
          ],
          counterEvidenceChecked: [
            countercheck(
              'TARGET_IS_CALLBACK_LOCAL',
              false,
              span,
              `${target.name} is not declared inside the callback`
            ),
            countercheck(
              'CALLBACK_RETURNS_IMMUTABLE_RESULT',
              false,
              span,
              'The callback mutates shared state instead of returning a value to aggregate after the join'
            ),
            countercheck(
              'APPROVED_SYNCHRONIZATION_ADAPTER_GUARDS_WRITE',
              false,
              span,
              'No approved synchronization adapter serializes the write'
            )
          ],
          remediation: REMEDIATION,
          limitations: LIMITATIONS,
          verificationSteps: REMEDIATION.verificationSteps
        });
      }
    }

    if (findings.length === 0) return noFinding();
    return verified(findings.sort(bySpan));
  }
});

export default concurrentMutationVerifier;
