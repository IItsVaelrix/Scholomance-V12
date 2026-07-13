/**
 * Cleri Probe evidence contracts.
 *
 * Immutable, recursively frozen primitives for SCHOL-CLERI-PROBE-v2.
 * Core modules remain pure: no process, fs, os, performance, or network access.
 */

import {
  BytecodeError,
  ERROR_CATEGORIES,
  ERROR_SEVERITY,
  ERROR_CODES,
  MODULE_IDS
} from '../../pixelbrain/bytecode-error.js';

// ─── Exported constants ──────────────────────────────────────────────────────

export const EVIDENCE_KINDS = Object.freeze([
  'SUPPORTING',
  'COUNTERCHECK',
  'LIMITATION',
  'COVERAGE'
]);

export const REPORT_STATUSES = Object.freeze({
  NO_VERIFIED_FINDINGS: 'NO_VERIFIED_FINDINGS',
  VERIFIED_FINDINGS: 'VERIFIED_FINDINGS',
  INCONCLUSIVE: 'INCONCLUSIVE',
  PARTIAL: 'PARTIAL',
  FAILED: 'FAILED'
});

// ─── Internal helpers ────────────────────────────────────────────────────────

function validationError(message, context = {}) {
  const error = new BytecodeError(
    ERROR_CATEGORIES.VALUE,
    ERROR_SEVERITY.CRIT,
    MODULE_IDS.IMMUNITY,
    ERROR_CODES.INVALID_VALUE,
    { message, ...context }
  );
  // Preserve a human-readable message while still emitting a PB-ERR-v1 bytecode.
  error.message = message;
  return error;
}

function deepFreeze(value) {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (Object.isFrozen(value)) {
    return value;
  }
  Object.freeze(value);
  if (Array.isArray(value)) {
    for (const item of value) {
      deepFreeze(item);
    }
  } else {
    for (const key of Object.keys(value)) {
      deepFreeze(value[key]);
    }
  }
  return value;
}

function isSortedArray(arr) {
  if (!Array.isArray(arr) || arr.length < 2) return true;
  for (let i = 1; i < arr.length; i++) {
    if (String(arr[i - 1]) > String(arr[i])) return false;
  }
  return true;
}

// ─── Path normalization ──────────────────────────────────────────────────────

/**
 * Normalizes a repository-relative path for canonical identity.
 *
 * - Converts backslashes to forward slashes.
 * - Collapses repeated separators.
 * - Removes leading './', absolute leading slashes, and Windows drive letters.
 * - Trims trailing slashes.
 */
export function normalizeRepositoryPath(value) {
  if (typeof value !== 'string') return '';
  let normalized = value.replace(/\\/g, '/');
  normalized = normalized.replace(/\/+/g, '/');
  normalized = normalized.replace(/^[a-zA-Z]:\//, '');
  normalized = normalized.replace(/^\/+/, '');
  normalized = normalized.replace(/^\.\//, '');
  normalized = normalized.replace(/\/$/, '');
  if (normalized === '.' || normalized === '/') return '';
  return normalized;
}

// ─── Source span constructor ─────────────────────────────────────────────────

export function createSourceSpan(input) {
  if (!input || typeof input !== 'object') {
    throw validationError('Source span input must be an object', { input });
  }

  const path = normalizeRepositoryPath(input.path);
  const startLine = Number(input.startLine);
  const startColumn = Number(input.startColumn);
  const endLine = Number(input.endLine);
  const endColumn = Number(input.endColumn);

  if (
    !Number.isFinite(startLine) || startLine < 1 ||
    !Number.isFinite(startColumn) || startColumn < 1 ||
    !Number.isFinite(endLine) || endLine < 1 ||
    !Number.isFinite(endColumn) || endColumn < 1
  ) {
    throw validationError('Source span line and column numbers must be one-based', {
      startLine, startColumn, endLine, endColumn
    });
  }

  if (endLine < startLine || (endLine === startLine && endColumn < startColumn)) {
    throw validationError('Source span end must not precede start; line and column numbers are one-based', {
      startLine, startColumn, endLine, endColumn
    });
  }

  return deepFreeze({
    path,
    startLine,
    startColumn,
    endLine,
    endColumn,
    symbol: input.symbol === undefined ? null : input.symbol,
    excerptDigest: input.excerptDigest === undefined ? null : String(input.excerptDigest)
  });
}

// ─── Evidence constructor ────────────────────────────────────────────────────

export function createEvidence(input) {
  if (!input || typeof input !== 'object') {
    throw validationError('Evidence input must be an object', { input });
  }

  if (!EVIDENCE_KINDS.includes(input.kind)) {
    throw validationError(
      `Invalid evidence kind: ${input.kind}. Allowed evidence kinds: ${EVIDENCE_KINDS.join(', ')}`,
      { kind: input.kind }
    );
  }

  return deepFreeze({
    evidenceId: input.evidenceId === undefined ? null : String(input.evidenceId),
    kind: input.kind,
    predicateId: input.predicateId === undefined ? null : String(input.predicateId),
    observed: Boolean(input.observed),
    span: input.span === undefined || input.span === null ? null : createSourceSpan(input.span),
    explanation: input.explanation === undefined ? '' : String(input.explanation)
  });
}

// ─── Coverage constructor ────────────────────────────────────────────────────

export function createCoverage(input) {
  if (!input || typeof input !== 'object') {
    throw validationError('Coverage input must be an object', { input });
  }

  const requestedPaths = [...(input.requestedPaths || [])]
    .map(normalizeRepositoryPath)
    .filter(Boolean)
    .sort();

  const analyzedPaths = [...(input.analyzedPaths || [])]
    .map(normalizeRepositoryPath)
    .filter(Boolean)
    .sort();

  const skipped = [...(input.skipped || [])]
    .map(item => deepFreeze({
      path: normalizeRepositoryPath(item.path),
      reasonCode: String(item.reasonCode)
    }))
    .sort((a, b) => a.path.localeCompare(b.path) || a.reasonCode.localeCompare(b.reasonCode));

  const parserFailures = [...(input.parserFailures || [])]
    .map(item => deepFreeze({
      path: normalizeRepositoryPath(item.path),
      errorBytecode: String(item.errorBytecode)
    }))
    .sort((a, b) => a.path.localeCompare(b.path) || a.errorBytecode.localeCompare(b.errorBytecode));

  return deepFreeze({
    requestedPaths,
    analyzedPaths,
    skipped,
    parserFailures,
    complete: Boolean(input.complete)
  });
}

// ─── Finding constructor ─────────────────────────────────────────────────────

export function createFinding(input) {
  if (!input || typeof input !== 'object') {
    throw validationError('Finding input must be an object', { input });
  }

  if (input.verdict !== 'VERIFIED') {
    throw validationError(`Finding verdict must be VERIFIED, got ${input.verdict}`, {
      verdict: input.verdict
    });
  }

  const supportingEvidence = [...(input.supportingEvidence || [])].map(item =>
    item && typeof item === 'object' && EVIDENCE_KINDS.includes(item.kind)
      ? item
      : createEvidence(item)
  );

  if (supportingEvidence.length === 0) {
    throw validationError('Finding must have at least one supporting evidence item', {
      supportingEvidenceCount: supportingEvidence.length
    });
  }

  if (!Array.isArray(input.counterEvidenceChecked)) {
    throw validationError('Finding must include counterEvidenceChecked array', {
      counterEvidenceChecked: input.counterEvidenceChecked
    });
  }

  const counterEvidenceChecked = [...input.counterEvidenceChecked].map(item =>
    item && typeof item === 'object' && EVIDENCE_KINDS.includes(item.kind)
      ? item
      : createEvidence(item)
  );

  const lawRefs = [...(input.lawRefs || [])].map(String);
  if (!isSortedArray(lawRefs)) {
    throw validationError('Finding lawRefs must be sorted', { lawRefs: input.lawRefs });
  }

  const raidRefs = [...(input.raidRefs || [])].map(String);
  if (!isSortedArray(raidRefs)) {
    throw validationError('Finding raidRefs must be sorted', { raidRefs: input.raidRefs });
  }

  const span = input.span === undefined || input.span === null
    ? null
    : createSourceSpan(input.span);

  const verificationSteps = [...(input.verificationSteps || [])].map(String).sort();
  const limitations = [...(input.limitations || [])].map(String).sort();

  const remediation = input.remediation && typeof input.remediation === 'object'
    ? deepFreeze({
        recommendationId: input.remediation.recommendationId === undefined
          ? null
          : String(input.remediation.recommendationId),
        summary: input.remediation.summary === undefined ? '' : String(input.remediation.summary),
        safePattern: input.remediation.safePattern === undefined ? '' : String(input.remediation.safePattern),
        unsafePattern: input.remediation.unsafePattern === undefined ? '' : String(input.remediation.unsafePattern),
        verificationSteps: [...(input.remediation.verificationSteps || [])].map(String).sort(),
        autoFixAvailable: Boolean(input.remediation.autoFixAvailable)
      })
    : deepFreeze({
        recommendationId: null,
        summary: '',
        safePattern: '',
        unsafePattern: '',
        verificationSteps: [],
        autoFixAvailable: false
      });

  return deepFreeze({
    findingId: input.findingId === undefined ? null : String(input.findingId),
    pathologyClass: input.pathologyClass === undefined ? null : String(input.pathologyClass),
    verdict: 'VERIFIED',
    span,
    symbol: input.symbol === undefined ? null : input.symbol,
    summary: input.summary === undefined ? '' : String(input.summary),
    supportingEvidence,
    counterEvidenceChecked,
    verifier: deepFreeze(input.verifier && typeof input.verifier === 'object'
      ? { id: String(input.verifier.id ?? ''), version: String(input.verifier.version ?? '') }
      : { id: '', version: '' }
    ),
    lawRefs,
    raidRefs,
    verificationSteps,
    remediation,
    limitations
  });
}

// ─── Status derivation ───────────────────────────────────────────────────────

export function deriveReportStatus({ findings, coverageComplete, parserFailures, failed }) {
  if (failed) return REPORT_STATUSES.FAILED;
  if (!coverageComplete || (parserFailures && parserFailures.length > 0)) {
    return REPORT_STATUSES.PARTIAL;
  }
  if (!findings || findings.length === 0) {
    return REPORT_STATUSES.NO_VERIFIED_FINDINGS;
  }
  return REPORT_STATUSES.VERIFIED_FINDINGS;
}
