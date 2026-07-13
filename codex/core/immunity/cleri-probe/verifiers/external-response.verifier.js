/**
 * UNSAFE_EXTERNAL_RESPONSE_ACCESS structural verifier.
 *
 * Proves that a payload from an approved external client is dereferenced as if
 * it were trusted domain data: no status guard, no schema parse, no
 * normalization adapter, and no optional access.
 *
 * Dataflow is tracked inside one function only. A binding that leaves its
 * function is out of scope, because this verifier does not guess what a caller
 * does with it.
 *
 * Supporting predicates:
 *   BINDING_ORIGINATES_FROM_APPROVED_EXTERNAL_CLIENT
 *   EXTERNAL_PAYLOAD_IS_DEREFERENCED — a non-optional read into the payload
 *
 * Counterchecks (any one present means NO_FINDING):
 *   HTTP_STATUS_GUARDED
 *   PAYLOAD_SCHEMA_PARSED
 *   APPROVED_NORMALIZATION_ADAPTER_CALLED
 */

import { deepFreeze } from '../contracts.js';
import {
  PAYLOAD_ACCESSORS,
  STATUS_PROPERTIES,
  hasApprovedImmuneAllow,
  isNormalizationAdapterCallee,
  isSchemaValidationCall,
  isSupportedExternalClient
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

const PATHOLOGY_CLASS = 'UNSAFE_EXTERNAL_RESPONSE_ACCESS';

const REMEDIATION = deepFreeze({
  recommendationId: 'external-response-validation',
  summary: 'Guard the HTTP status and validate the payload shape before it crosses into domain logic.',
  unsafePattern: "const data = await response.json(); return data.profile.name;",
  safePattern: "if (!response.ok) throw new BytecodeError(...); const data = ProfileSchema.parse(await response.json()); return data.profile.name;",
  verificationSteps: [
    'Return a 500 and a malformed body from the endpoint and assert the caller fails loudly instead of reading undefined.'
  ],
  autoFixAvailable: false
});

const LIMITATIONS = deepFreeze([
  'Only global fetch and imported axios identifiers are supported in v1; other HTTP clients are not proven.',
  'Aliases are tracked inside a single function; a payload passed to another function is out of scope.',
  'A response guarded by HTTP status alone clears this verifier even when the payload shape is unvalidated; payload-shape proof is a separate rule.'
]);

function bindingById(facts, id) {
  return (facts.bindings || []).find(binding => binding.id === id) || null;
}

/**
 * Resolves every binding in `functionId` that holds an external payload:
 * the fetch body (`await response.json()`), the axios envelope's `.data`, and
 * any alias of either declared in the same function.
 */
function payloadBindings(facts, request, responseBinding) {
  const bindings = [];
  const name = responseBinding.name;

  for (const binding of facts.bindings || []) {
    if (binding.functionId !== request.functionId) continue;

    // const data = await response.json()
    if (binding.initKind === 'CALL' && binding.initCallee) {
      const [receiver, method] = splitCallee(binding.initCallee);
      if (receiver === name && PAYLOAD_ACCESSORS.includes(method)) {
        bindings.push(binding);
        continue;
      }
    }
    // const payload = res.data
    if (binding.initKind === 'MEMBER' && binding.initCallee === `${name}.data`) {
      bindings.push(binding);
    }
  }

  return bindings;
}

function splitCallee(callee) {
  const index = String(callee).lastIndexOf('.');
  if (index === -1) return [null, String(callee)];
  return [String(callee).slice(0, index), String(callee).slice(index + 1)];
}

/**
 * Non-optional reads that pull a value out of the external payload.
 *
 * For a payload binding, any property read is a dereference. For the axios
 * envelope itself, only a read that goes *through* `.data` counts — reading
 * `response.ok` is a status check, not a payload dereference.
 */
function payloadDereferences(facts, request, responseBinding, payloads) {
  const payloadIds = new Set(payloads.map(binding => binding.id));

  return (facts.memberReads || []).filter(read => {
    if (read.functionId !== request.functionId) return false;
    if (read.optional) return false;

    if (payloadIds.has(read.bindingId)) {
      return read.propertyPath.length >= 1;
    }
    if (read.bindingId === responseBinding.id) {
      if (STATUS_PROPERTIES.includes(read.propertyPath[0])) return false;
      // res.data.settings.theme — through the envelope and into the payload.
      return read.propertyPath[0] === 'data' && read.propertyPath.length >= 2;
    }
    return false;
  });
}

function statusGuarded(facts, request, responseBinding) {
  return (facts.guards || []).some(guard => {
    if (guard.functionId !== request.functionId) return false;
    if (guard.bindingId !== responseBinding.id) return false;
    return (guard.properties || []).some(property => {
      const [, tail] = splitCallee(property);
      return STATUS_PROPERTIES.includes(tail);
    });
  });
}

/** A call in the same function that validates or normalizes the payload. */
function callsWithPayloadArgument(facts, request, names, predicate) {
  return (facts.calls || []).some(call => {
    if (call.functionId !== request.functionId) return false;
    if (!predicate(call.callee)) return false;
    return (call.args || []).some(arg => names.has(arg.name));
  });
}

export const externalResponseVerifier = deepFreeze({
  id: 'external-response/v1',
  version: '1.0.0',
  pathologyClass: PATHOLOGY_CLASS,
  supportingPredicates: deepFreeze([
    'BINDING_ORIGINATES_FROM_APPROVED_EXTERNAL_CLIENT',
    'EXTERNAL_PAYLOAD_IS_DEREFERENCED'
  ]),
  counterchecks: deepFreeze([
    'HTTP_STATUS_GUARDED',
    'PAYLOAD_SCHEMA_PARSED',
    'APPROVED_NORMALIZATION_ADAPTER_CALLED'
  ]),
  limitations: LIMITATIONS,

  retrieveHints() {
    return ['axios', 'fetch', 'response.json'];
  },

  verify(candidate, context) {
    if (!hasFacts(candidate)) return noFinding();

    const facts = candidate.facts;
    void context;
    const findings = [];

    for (const request of facts.externalRequests || []) {
      if (!isSupportedExternalClient(request.client)) continue;
      if (!request.bindingId) continue;

      const responseBinding = bindingById(facts, request.bindingId);
      if (!responseBinding) continue;

      const payloads = payloadBindings(facts, request, responseBinding);
      const dereferences = payloadDereferences(facts, request, responseBinding, payloads);
      if (dereferences.length === 0) continue;

      const names = new Set([responseBinding.name, ...payloads.map(binding => binding.name)]);
      if (statusGuarded(facts, request, responseBinding)) continue;
      if (callsWithPayloadArgument(facts, request, names, isSchemaValidationCall)) continue;
      if (callsWithPayloadArgument(facts, request, names, isNormalizationAdapterCallee)) continue;

      const owner = enclosingNamedFunction(facts.functions, request.functionId);
      const symbol = owner ? owner.name : null;

      for (const dereference of dereferences) {
        if (hasApprovedImmuneAllow(facts.comments, PATHOLOGY_CLASS, dereference.span.startLine)) continue;

        const span = spanWithSymbol(dereference.span, symbol);
        const read = `${dereference.rootName}.${dereference.propertyPath.join('.')}`;

        findings.push({
          span,
          symbol,
          summary: `${read} reads an unvalidated ${request.client} payload as trusted domain data`,
          supportingEvidence: [
            supporting(
              'BINDING_ORIGINATES_FROM_APPROVED_EXTERNAL_CLIENT',
              true,
              span,
              `${responseBinding.name} originates from ${request.client} at line ${request.span.startLine}`
            ),
            supporting(
              'EXTERNAL_PAYLOAD_IS_DEREFERENCED',
              true,
              span,
              `${read} is a non-optional read into the external payload`
            )
          ],
          counterEvidenceChecked: [
            countercheck(
              'HTTP_STATUS_GUARDED',
              false,
              span,
              `No guard on ${responseBinding.name}.ok or ${responseBinding.name}.status precedes the read`
            ),
            countercheck(
              'PAYLOAD_SCHEMA_PARSED',
              false,
              span,
              'The payload is never passed to a schema validator'
            ),
            countercheck(
              'APPROVED_NORMALIZATION_ADAPTER_CALLED',
              false,
              span,
              'The payload is never passed to an approved normalization adapter'
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

export default externalResponseVerifier;
