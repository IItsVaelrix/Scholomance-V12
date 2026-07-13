/**
 * SWALLOWED_ERROR structural verifier.
 *
 * Proves that a catch clause intercepts an error and then lets it disappear:
 * it neither rethrows, nor translates, nor returns a documented fallback, nor
 * calls a recovery adapter. Logging is not recovery — a logged error that
 * changes no control flow is still swallowed.
 *
 * The proof is local to the catch's own function. A throw or return inside a
 * function nested in the catch does not recover this catch, so it is not
 * counterevidence.
 *
 * Supporting predicate:
 *   CATCH_INTERCEPTS_ERROR
 *
 * Counterchecks (any one present means NO_FINDING):
 *   ERROR_RETHROWN
 *   ERROR_TRANSLATED_TO_BYTECODE_ERROR
 *   APPROVED_RECOVERY_RETURN
 *   RETRY_OR_RECOVERY_ADAPTER_CALLED
 */

import { deepFreeze } from '../contracts.js';
import {
  RECOVERY_RETURN_KEYS,
  hasApprovedImmuneAllow,
  isLoggingOnlyCallee,
  isRecoveryAdapterCallee
} from '../scholomance-profile.js';
import {
  bySpan,
  countercheck,
  enclosingNamedFunction,
  hasFacts,
  noFinding,
  spanWithSymbol,
  supporting,
  verified
} from './verifier-kit.js';

const PATHOLOGY_CLASS = 'SWALLOWED_ERROR';

const REMEDIATION = deepFreeze({
  recommendationId: 'error-propagation',
  summary: 'Rethrow, translate into a BytecodeError, or return a documented fallback that names the error.',
  unsafePattern: 'catch (error) { console.log(error); }',
  safePattern: 'catch (error) { throw new BytecodeError(CATEGORY, SEVERITY, MODULE_ID, CODE, { cause: error }); }',
  verificationSteps: [
    'Force the guarded call to fail and assert the failure reaches the caller or a recorded fallback.'
  ],
  autoFixAvailable: false
});

const LIMITATIONS = deepFreeze([
  'Recovery performed by a function nested inside the catch is not credited; only catch-local control flow is proven.',
  'A fallback return is credited only when it carries an approved recovery key and names the caught error.'
]);

/** A throw that leaves the catch: the error keeps travelling. */
function rethrows(catchClause) {
  return (catchClause.throwKinds || []).some(kind =>
    kind === 'RETHROW' || kind === 'RETHROW_BARE' || kind.startsWith('THROW:')
  );
}

/** A throw of a constructed error: the error is translated, not discarded. */
function translates(catchClause) {
  return (catchClause.throwKinds || []).some(kind => {
    if (kind.startsWith('NEW:')) return true;
    if (kind.startsWith('CALL:')) return true;
    return false;
  });
}

/**
 * A fallback return is approved only when it carries a profile-listed recovery
 * key and names the caught error, or when it hands off to a recovery adapter.
 * `return null` discards the error just as surely as an empty block.
 */
function approvedRecoveryReturn(catchClause) {
  return (catchClause.returnKinds || []).some(entry => {
    if (entry.kind === 'CALL' && isRecoveryAdapterCallee(entry.callee)) return true;
    if (entry.kind !== 'OBJECT') return false;
    if (!entry.usesCatchParam) return false;
    return (entry.objectKeys || []).some(key => RECOVERY_RETURN_KEYS.includes(key));
  });
}

function recoveryAdapterCalled(catchClause) {
  return (catchClause.localCalls || []).some(isRecoveryAdapterCallee);
}

/** Describes what the catch body actually does, for the evidence card. */
function describeBody(catchClause) {
  const statements = catchClause.bodyStatementKinds || [];
  if (statements.length === 0) return 'the catch body is empty';
  const localCalls = catchClause.localCalls || [];
  if (localCalls.length > 0 && localCalls.every(isLoggingOnlyCallee)) {
    return `the catch body only logs (${localCalls.join(', ')})`;
  }
  return `the catch body runs ${statements.length} statement(s) that neither rethrow nor recover`;
}

export const swallowedErrorVerifier = deepFreeze({
  id: 'swallowed-error/v1',
  version: '1.0.0',
  pathologyClass: PATHOLOGY_CLASS,
  supportingPredicates: deepFreeze(['CATCH_INTERCEPTS_ERROR']),
  counterchecks: deepFreeze([
    'ERROR_RETHROWN',
    'ERROR_TRANSLATED_TO_BYTECODE_ERROR',
    'APPROVED_RECOVERY_RETURN',
    'RETRY_OR_RECOVERY_ADAPTER_CALLED'
  ]),
  limitations: LIMITATIONS,

  retrieveHints() {
    return ['catch'];
  },

  verify(candidate, context) {
    if (!hasFacts(candidate)) return noFinding();

    const facts = candidate.facts;
    void context;
    const findings = [];

    for (const catchClause of facts.catchClauses || []) {
      if (rethrows(catchClause)) continue;
      if (translates(catchClause)) continue;
      if (approvedRecoveryReturn(catchClause)) continue;
      if (recoveryAdapterCalled(catchClause)) continue;
      if (hasApprovedImmuneAllow(facts.comments, PATHOLOGY_CLASS, catchClause.span.startLine)) continue;

      const owner = enclosingNamedFunction(facts.functions, catchClause.functionId);
      const symbol = owner ? owner.name : null;
      const span = spanWithSymbol(catchClause.span, symbol);
      const bound = catchClause.paramName ? `the error bound as ${catchClause.paramName}` : 'the error';

      findings.push({
        span,
        symbol,
        summary: `A catch clause intercepts ${bound} and discards it: ${describeBody(catchClause)}`,
        supportingEvidence: [
          supporting(
            'CATCH_INTERCEPTS_ERROR',
            true,
            span,
            `The catch clause intercepts ${bound} and ${describeBody(catchClause)}`
          )
        ],
        counterEvidenceChecked: [
          countercheck('ERROR_RETHROWN', false, span, 'The catch does not rethrow within its own function'),
          countercheck(
            'ERROR_TRANSLATED_TO_BYTECODE_ERROR',
            false,
            span,
            'The catch throws no translated error'
          ),
          countercheck(
            'APPROVED_RECOVERY_RETURN',
            false,
            span,
            (catchClause.returnKinds || []).length > 0
              ? 'The catch returns, but the returned value carries no approved recovery key naming the error'
              : 'The catch returns no fallback value'
          ),
          countercheck(
            'RETRY_OR_RECOVERY_ADAPTER_CALLED',
            false,
            span,
            'The catch calls no retry or recovery adapter'
          )
        ],
        remediation: REMEDIATION,
        limitations: LIMITATIONS,
        verificationSteps: REMEDIATION.verificationSteps
      });
    }

    if (findings.length === 0) return noFinding();
    return verified(findings.sort(bySpan));
  }
});
