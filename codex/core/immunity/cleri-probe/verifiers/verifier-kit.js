/**
 * Shared primitives for Cleri Probe structural verifiers.
 *
 * Every verifier is a pure function of normalized facts. This kit holds the
 * fact-navigation and evidence-construction helpers they share, so that no
 * verifier reinvents scope resolution or evidence shape.
 *
 * Pure core module: no process, fs, os, performance, or network access.
 */

import { createEvidence, createSourceSpan } from '../contracts.js';

// ─── Result constructors ─────────────────────────────────────────────────────

/**
 * Builds a NO_FINDING result that still explains what was checked.
 * Evidence on a negative result is the difference between "we found nothing"
 * and "we looked for nothing".
 */
export function noFinding(evidence = []) {
  return Object.freeze({ verdict: 'NO_FINDING', evidence: Object.freeze([...evidence]) });
}

export function verified(findings) {
  return Object.freeze({
    verdict: 'VERIFIED',
    findings: Object.freeze([...findings]),
    // Flattened for registry-level result validation.
    evidence: Object.freeze(
      findings.flatMap(finding => [...finding.supportingEvidence, ...finding.counterEvidenceChecked])
    )
  });
}

export function supporting(predicateId, observed, span, explanation) {
  return createEvidence({ kind: 'SUPPORTING', predicateId, observed, span, explanation });
}

export function countercheck(predicateId, observed, span, explanation) {
  return createEvidence({ kind: 'COUNTERCHECK', predicateId, observed, span, explanation });
}

// ─── Fact guards ─────────────────────────────────────────────────────────────

/** True when the candidate carries usable normalized facts. */
export function hasFacts(candidate) {
  const facts = candidate && typeof candidate === 'object' ? candidate.facts : null;
  return Boolean(facts && facts.ok === true && Array.isArray(facts.functions));
}

// ─── Fact navigation ─────────────────────────────────────────────────────────

export function indexById(items) {
  const map = new Map();
  for (const item of items || []) {
    if (item && item.id) map.set(item.id, item);
  }
  return map;
}

/**
 * Resolves the nearest named function enclosing `functionId`.
 * Anonymous callbacks inherit the authority of the symbol they were written in:
 * an arrow inside calculateDamage is still combat authority.
 */
export function enclosingNamedFunction(functions, functionId) {
  const byId = indexById(functions);
  let current = byId.get(functionId);
  let guard = 0;
  while (current && guard < 100) {
    if (current.name) return current;
    current = current.parentFunctionId ? byId.get(current.parentFunctionId) : null;
    guard += 1;
  }
  return null;
}

/** True when `functionId` is `ancestorId` or lexically nested inside it. */
export function isWithinFunction(functions, functionId, ancestorId) {
  if (!functionId || !ancestorId) return false;
  const byId = indexById(functions);
  let current = byId.get(functionId);
  let guard = 0;
  while (current && guard < 100) {
    if (current.id === ancestorId) return true;
    current = current.parentFunctionId ? byId.get(current.parentFunctionId) : null;
    guard += 1;
  }
  return false;
}

/** Every call whose function is `functionId` or nested inside it. */
export function callsWithin(facts, functionId) {
  return (facts.calls || []).filter(call =>
    isWithinFunction(facts.functions, call.functionId, functionId)
  );
}

// ─── Spans ───────────────────────────────────────────────────────────────────

/** Re-stamps a fact span with the symbol that owns it. */
export function spanWithSymbol(span, symbol) {
  return createSourceSpan({ ...span, symbol: symbol ?? null });
}

/** Deterministic order for findings inside one file. */
export function bySpan(a, b) {
  return (
    a.span.startLine - b.span.startLine ||
    a.span.startColumn - b.span.startColumn
  );
}
