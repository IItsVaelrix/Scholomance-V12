/**
 * UNSEEDED_RANDOMNESS structural verifier.
 *
 * Proves that a Math.random() call decides an outcome that the Scholomance
 * profile declares deterministic. Randomness is not a defect; randomness inside
 * an authority that must be reproducible is.
 *
 * Supporting predicates:
 *   CALL_IS_MATH_RANDOM              — the call is literally Math.random()
 *   SYMBOL_IS_DETERMINISTIC_AUTHORITY — its symbol or path is deterministic authority
 *
 * Counterchecks (any one of them present means NO_FINDING):
 *   NOT_TEST_OR_DOCUMENTATION — the file is a test or documentation
 *   NOT_UI_ATMOSPHERE         — the symbol or path is decorative
 *   NO_APPROVED_IMMUNE_ALLOW  — an adjacent IMMUNE_ALLOW: math-random waiver
 *   NO_SEEDED_RNG_ADAPTER     — a seeded RNG adapter is available in the module
 */

import { deepFreeze } from '../contracts.js';
import {
  classifyPath,
  classifySymbol,
  hasApprovedImmuneAllow,
  isSeededRandomModule,
  isSeededRandomSymbol
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

const PATHOLOGY_CLASS = 'UNSEEDED_RANDOMNESS';
const MATH_RANDOM = 'Math.random';

const REMEDIATION = deepFreeze({
  recommendationId: 'seeded-random',
  summary: 'Draw from a seeded RNG owned by the deterministic authority instead of Math.random().',
  unsafePattern: 'const roll = Math.random();',
  safePattern: 'const roll = rng.next(); // rng seeded from the encounter/session seed',
  verificationSteps: [
    'Run the affected simulation twice with the same seed and assert identical outcomes.'
  ],
  autoFixAvailable: false
});

const LIMITATIONS = deepFreeze([
  'Only Math.random() is proven; crypto.getRandomValues and Date-derived entropy are out of scope for v1.',
  'Authority is classified from the Scholomance symbol and path profile, not from call-graph reachability.'
]);

/** True when the module imports or declares a seeded RNG it could have used. */
function hasSeededRngAdapter(facts) {
  return (facts.bindings || []).some(binding => {
    if (binding.importSource && isSeededRandomModule(binding.importSource)) return true;
    return isSeededRandomSymbol(binding.name);
  });
}

export const unseededRandomnessVerifier = deepFreeze({
  id: 'unseeded-randomness/v1',
  version: '1.0.0',
  pathologyClass: PATHOLOGY_CLASS,
  supportingPredicates: deepFreeze(['CALL_IS_MATH_RANDOM', 'SYMBOL_IS_DETERMINISTIC_AUTHORITY']),
  counterchecks: deepFreeze([
    'NOT_TEST_OR_DOCUMENTATION',
    'NOT_UI_ATMOSPHERE',
    'NO_APPROVED_IMMUNE_ALLOW',
    'NO_SEEDED_RNG_ADAPTER'
  ]),
  limitations: LIMITATIONS,

  retrieveHints() {
    return ['Math.random'];
  },

  verify(candidate, context) {
    if (!hasFacts(candidate)) return noFinding();

    const facts = candidate.facts;
    const includeTests = Boolean(context && context.includeTests);
    const pathClass = classifyPath(facts.path);

    // The file itself may disqualify every call in it.
    const isTestOrDocumentation = (pathClass.isTest || pathClass.isDocumentation) && !includeTests;
    if (isTestOrDocumentation) {
      return noFinding([
        countercheck(
          'NOT_TEST_OR_DOCUMENTATION',
          true,
          spanWithSymbol({ path: facts.path, startLine: 1, startColumn: 1, endLine: 1, endColumn: 1 }, null),
          'Randomness in a test or documentation path is not a deterministic-authority violation'
        )
      ]);
    }

    const seededAdapterPresent = hasSeededRngAdapter(facts);
    const findings = [];

    for (const call of facts.calls || []) {
      if (call.callee !== MATH_RANDOM) continue;

      const owner = enclosingNamedFunction(facts.functions, call.functionId);
      const symbol = owner ? owner.name : null;
      const symbolClass = classifySymbol(symbol);
      const span = spanWithSymbol(call.span, symbol);

      const isDeterministicAuthority =
        symbolClass.isDeterministicAuthority ||
        (pathClass.isDeterministicAuthority && !symbolClass.isUiAtmosphere && !pathClass.isUiAtmosphere);
      if (!isDeterministicAuthority) continue;

      const isUiAtmosphere = symbolClass.isUiAtmosphere || pathClass.isUiAtmosphere;
      if (isUiAtmosphere) continue;

      if (hasApprovedImmuneAllow(facts.comments, PATHOLOGY_CLASS, call.span.startLine)) continue;
      if (seededAdapterPresent) continue;

      findings.push({
        span,
        symbol,
        summary: symbol
          ? `Math.random() decides the outcome of ${symbol}, which the Scholomance profile classifies as deterministic authority`
          : 'Math.random() decides an outcome in a deterministic authority path',
        supportingEvidence: [
          supporting('CALL_IS_MATH_RANDOM', true, span, 'The call resolves to Math.random()'),
          supporting(
            'SYMBOL_IS_DETERMINISTIC_AUTHORITY',
            true,
            span,
            symbolClass.isDeterministicAuthority
              ? `Symbol ${symbol} is classified deterministic authority by the Scholomance profile`
              : `Path ${facts.path} is classified deterministic authority by the Scholomance profile`
          )
        ],
        counterEvidenceChecked: [
          countercheck('NOT_TEST_OR_DOCUMENTATION', false, span, 'The file is neither a test nor documentation'),
          countercheck('NOT_UI_ATMOSPHERE', false, span, 'Neither the symbol nor the path is decorative'),
          countercheck('NO_APPROVED_IMMUNE_ALLOW', false, span, 'No adjacent IMMUNE_ALLOW: math-random annotation'),
          countercheck('NO_SEEDED_RNG_ADAPTER', false, span, 'The module imports no seeded RNG adapter')
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
