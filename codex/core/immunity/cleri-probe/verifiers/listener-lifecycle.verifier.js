/**
 * LEAKED_LISTENER_SUBSCRIPTION structural verifier.
 *
 * Proves that a React effect registers a listener or subscription that its own
 * returned cleanup cannot remove. The proof is local to one effect: a remove
 * call anywhere else in the file is not counterevidence, because React will not
 * call it on unmount.
 *
 * Supporting predicates:
 *   EFFECT_CALLBACK_REGISTERS_LISTENER_OR_SUBSCRIPTION
 *   REGISTRATION_IDENTITY_IS_STABLE — receiver and event are resolvable, so a
 *                                     matching removal could be recognised
 *
 * Counterchecks (any one present means NO_FINDING):
 *   MATCHING_REMOVE_IN_RETURNED_CLEANUP
 *   CAPTURED_UNSUBSCRIBE_CALLED_IN_CLEANUP
 *   REGISTRATION_IS_SELF_TERMINATING
 */

import { deepFreeze } from '../contracts.js';
import {
  SELF_TERMINATING_METHODS,
  hasApprovedImmuneAllow,
  isRegistrationMethod,
  isRemovalMethod
} from '../scholomance-profile.js';
import {
  bySpan,
  callsWithin,
  countercheck,
  enclosingNamedFunction,
  hasFacts,
  noFinding,
  spanWithSymbol,
  supporting,
  verified
} from './verifier-kit.js';

const PATHOLOGY_CLASS = 'LEAKED_LISTENER_SUBSCRIPTION';

// v1 proves React effect hooks only. Class lifecycles and manual mount/unmount
// pairs are limitations, not findings.
const EFFECT_HOOKS = Object.freeze(['useEffect', 'useLayoutEffect', 'useInsertionEffect']);

const REMEDIATION = deepFreeze({
  recommendationId: 'listener-cleanup',
  summary: 'Return a cleanup from the effect that removes the exact receiver, event, and handler it registered.',
  unsafePattern: "useEffect(() => { window.addEventListener('resize', handler); }, []);",
  safePattern: "useEffect(() => { window.addEventListener('resize', handler); return () => window.removeEventListener('resize', handler); }, []);",
  verificationSteps: [
    'Mount and unmount the component repeatedly and assert the listener count returns to its baseline.'
  ],
  autoFixAvailable: false
});

const LIMITATIONS = deepFreeze([
  'Only React effect hooks are proven; class componentDidMount/componentWillUnmount pairs are not supported in v1.',
  'A registration whose receiver or event cannot be resolved statically is reported as unsupported, not as a finding.'
]);

/** The handler argument's stable identity, or null when it is inline. */
function handlerIdentity(call) {
  const handler = (call.args || [])[1];
  if (!handler) return null;
  if (handler.type === 'Identifier' || handler.type === 'MemberExpression' ||
      handler.type === 'OptionalMemberExpression') {
    return handler.name;
  }
  return null;
}

function eventLiteral(call) {
  const event = (call.args || [])[0];
  if (!event || typeof event.value !== 'string') return null;
  return event.value;
}

/** addEventListener(..., { once: true }) or emitter.once(...) cannot leak. */
function isSelfTerminating(call) {
  if (SELF_TERMINATING_METHODS.includes(call.method)) return true;
  return (call.args || []).some(arg => (arg.truthyKeys || []).includes('once'));
}

/**
 * The binding that captured this registration's return value, if any:
 * `const unsubscribe = store.subscribe(handler)`.
 */
function capturedBinding(facts, call) {
  return (facts.bindings || []).find(binding =>
    binding.initKind === 'CALL' &&
    binding.initCallee === call.callee &&
    binding.functionId === call.functionId
  ) || null;
}

export const listenerLifecycleVerifier = deepFreeze({
  id: 'listener-lifecycle/v1',
  version: '1.0.0',
  pathologyClass: PATHOLOGY_CLASS,
  supportingPredicates: deepFreeze([
    'EFFECT_CALLBACK_REGISTERS_LISTENER_OR_SUBSCRIPTION',
    'REGISTRATION_IDENTITY_IS_STABLE'
  ]),
  counterchecks: deepFreeze([
    'MATCHING_REMOVE_IN_RETURNED_CLEANUP',
    'CAPTURED_UNSUBSCRIBE_CALLED_IN_CLEANUP',
    'REGISTRATION_IS_SELF_TERMINATING'
  ]),
  limitations: LIMITATIONS,

  retrieveHints() {
    return ['addEventListener', 'subscribe', 'useEffect'];
  },

  verify(candidate, context) {
    if (!hasFacts(candidate)) return noFinding();

    const facts = candidate.facts;
    void context;
    const findings = [];

    for (const effect of facts.effects || []) {
      if (!EFFECT_HOOKS.includes(effect.hook)) continue;
      if (!effect.callbackFunctionId) continue;

      // Calls in the cleanup are removals, not registrations.
      const cleanupCalls = effect.returnFunctionId
        ? callsWithin(facts, effect.returnFunctionId)
        : [];

      const registrations = (facts.calls || []).filter(call =>
        // Directly in the effect callback: a registration buried in a nested
        // helper may never run, and this verifier does not guess.
        call.functionId === effect.callbackFunctionId &&
        isRegistrationMethod(call.method) &&
        call.receiver
      );

      for (const call of registrations) {
        const event = eventLiteral(call);
        // Without a literal event we cannot recognise its removal, so we cannot
        // prove its absence either.
        if (event === null) continue;
        if (isSelfTerminating(call)) continue;

        const handler = handlerIdentity(call);
        const captured = capturedBinding(facts, call);

        const matchingRemoval = cleanupCalls.find(cleanupCall =>
          isRemovalMethod(cleanupCall.method) &&
          cleanupCall.receiver === call.receiver &&
          eventLiteral(cleanupCall) === event &&
          // An inline handler can never be removed by identity; a named handler
          // must be removed by the same name.
          handler !== null &&
          handlerIdentity(cleanupCall) === handler
        );
        if (matchingRemoval) continue;

        const unsubscribeCalled = Boolean(
          captured && (
            effect.returnsBindingName === captured.name ||
            cleanupCalls.some(cleanupCall =>
              cleanupCall.callee === captured.name ||
              cleanupCall.receiver === captured.name
            )
          )
        );
        if (unsubscribeCalled) continue;

        if (hasApprovedImmuneAllow(facts.comments, PATHOLOGY_CLASS, call.span.startLine)) continue;

        const owner = enclosingNamedFunction(facts.functions, effect.callbackFunctionId);
        const symbol = owner ? owner.name : null;
        const span = spanWithSymbol(call.span, symbol);
        const cleanupPresent = Boolean(effect.returnFunctionId || effect.returnsBindingName);

        findings.push({
          span,
          symbol,
          summary: `${effect.hook} registers ${call.receiver}.${call.method}('${event}') and its cleanup does not remove it`,
          supportingEvidence: [
            supporting(
              'EFFECT_CALLBACK_REGISTERS_LISTENER_OR_SUBSCRIPTION',
              true,
              span,
              `The ${effect.hook} callback calls ${call.receiver}.${call.method}('${event}')`
            ),
            supporting(
              'REGISTRATION_IDENTITY_IS_STABLE',
              true,
              span,
              handler
                ? `Receiver ${call.receiver}, event '${event}', and handler ${handler} are all resolvable, so a matching removal would be recognised`
                : `Receiver ${call.receiver} and event '${event}' are resolvable, but the handler is an inline function that no removal can name`
            )
          ],
          counterEvidenceChecked: [
            countercheck(
              'MATCHING_REMOVE_IN_RETURNED_CLEANUP',
              false,
              span,
              cleanupPresent
                ? `The returned cleanup does not remove ${call.receiver}.'${event}' with the same handler identity`
                : 'The effect returns no cleanup'
            ),
            countercheck(
              'CAPTURED_UNSUBSCRIBE_CALLED_IN_CLEANUP',
              false,
              span,
              captured
                ? `The captured ${captured.name} is never called in the cleanup`
                : 'The registration returns no unsubscribe handle that the cleanup could call'
            ),
            countercheck(
              'REGISTRATION_IS_SELF_TERMINATING',
              false,
              span,
              `${call.method} is not once() and no { once: true } option was passed`
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
