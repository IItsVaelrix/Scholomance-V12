/**
 * Cleri Probe canonical report identity.
 *
 * Deterministic serialization, substrate/configuration fingerprints,
 * report/finding identifiers, checksum verification, and PB-CLERI-v2 report identity.
 *
 * Uses node:crypto only for SHA-256. Hashing has no external state, so this
 * module remains a pure core module.
 */

import { createHash } from 'node:crypto';
import {
  BytecodeError,
  ERROR_CATEGORIES,
  ERROR_SEVERITY,
  ERROR_CODES,
  MODULE_IDS
} from '../../pixelbrain/bytecode-error.js';
import {
  normalizeRepositoryPath,
  createCoverage,
  createFinding,
  deriveReportStatus
} from './contracts.js';

// ─── Internal helpers ────────────────────────────────────────────────────────

function validationError(message, context = {}) {
  const error = new BytecodeError(
    ERROR_CATEGORIES.VALUE,
    ERROR_SEVERITY.CRIT,
    MODULE_IDS.IMMUNITY,
    ERROR_CODES.INVALID_VALUE,
    { message, ...context }
  );
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

/**
 * Recursively clones a value with sorted object keys.
 * Arrays preserve input order but their elements are normalized.
 */
function sortKeys(value) {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  const sorted = {};
  for (const key of Object.keys(value).sort()) {
    sorted[key] = sortKeys(value[key]);
  }
  return sorted;
}

// ─── Stable serialization ────────────────────────────────────────────────────

export function stableClone(value) {
  return deepFreeze(sortKeys(value));
}

export function stableStringify(value) {
  return JSON.stringify(sortKeys(value));
}

// ─── Hashing ──────────────────────────────────────────────────────────────────

export function sha256Hex(value) {
  const hash = createHash('sha256');
  hash.update(typeof value === 'string' ? value : stableStringify(value));
  return hash.digest('hex');
}

// ─── Fingerprints ─────────────────────────────────────────────────────────────

export function fingerprintSubstrate(files) {
  if (!Array.isArray(files)) {
    throw validationError('Substrate files must be an array', { files });
  }
  const normalized = files
    .map(file => ({
      path: normalizeRepositoryPath(file.path),
      contentHash: String(file.contentHash)
    }))
    .filter(file => file.path)
    .sort((a, b) => a.path.localeCompare(b.path) || a.contentHash.localeCompare(b.contentHash));

  return sha256Hex(normalized);
}

export function fingerprintConfiguration(config) {
  if (!config || typeof config !== 'object') {
    throw validationError('Configuration must be an object', { config });
  }
  return sha256Hex(config);
}

// ─── Finding identity ─────────────────────────────────────────────────────────

export function buildFindingId(finding) {
  if (!finding || typeof finding !== 'object') {
    throw validationError('Finding must be an object', { finding });
  }
  const span = finding.span || {};
  const identity = {
    pathologyClass: finding.pathologyClass === undefined ? null : String(finding.pathologyClass),
    path: normalizeRepositoryPath(span.path),
    startLine: Number(span.startLine) || 0,
    startColumn: Number(span.startColumn) || 0,
    endLine: Number(span.endLine) || 0,
    endColumn: Number(span.endColumn) || 0,
    symbol: span.symbol === undefined ? null : span.symbol
  };
  return sha256Hex(identity);
}

// ─── Report construction ──────────────────────────────────────────────────────

export function buildInvestigationReport(input) {
  if (!input || typeof input !== 'object') {
    throw validationError('Report input must be an object', { input });
  }

  const hypothesis = String(input.hypothesis || '');
  const normalizedHypothesis = String(input.normalizedHypothesis || hypothesis);
  const scope = [...(input.scope || [])]
    .map(normalizeRepositoryPath)
    .filter(Boolean)
    .sort();

  const plan = input.plan && typeof input.plan === 'object'
    ? stableClone(input.plan)
    : stableClone({});

  const configuration = input.configuration && typeof input.configuration === 'object'
    ? stableClone(input.configuration)
    : stableClone({});

  const substrateFiles = [...(input.substrateFiles || [])];

  const findings = [...(input.findings || [])].map(item =>
    item && typeof item === 'object' && item.verdict === 'VERIFIED' && Object.isFrozen(item)
      ? item
      : createFinding(item)
  );

  const coverage = input.coverage && typeof input.coverage === 'object' && Object.isFrozen(input.coverage)
    ? input.coverage
    : createCoverage(input.coverage || { complete: false });

  const diagnostics = [...(input.diagnostics || [])].map(String).sort();

  const substrateFingerprint = fingerprintSubstrate(substrateFiles);
  const configurationFingerprint = fingerprintConfiguration(configuration);

  const findingsWithIds = findings.map(finding =>
    finding.findingId
      ? finding
      : createFinding({ ...finding, findingId: buildFindingId(finding) })
  );

  const sortedFindings = [...findingsWithIds].sort((a, b) => {
    const pathA = a.span?.path || '';
    const pathB = b.span?.path || '';
    const pathCmp = pathA.localeCompare(pathB);
    if (pathCmp !== 0) return pathCmp;

    const lineCmp = (a.span?.startLine || 0) - (b.span?.startLine || 0);
    if (lineCmp !== 0) return lineCmp;

    const colCmp = (a.span?.startColumn || 0) - (b.span?.startColumn || 0);
    if (colCmp !== 0) return colCmp;

    const classCmp = (a.pathologyClass || '').localeCompare(b.pathologyClass || '');
    if (classCmp !== 0) return classCmp;

    return (a.findingId || '').localeCompare(b.findingId || '');
  });

  const status = deriveReportStatus({
    findings: sortedFindings,
    coverageComplete: coverage.complete,
    parserFailures: coverage.parserFailures,
    failed: false
  });

  const verifierVersions = [...new Set(
    (plan.selectedVerifiers || [])
      .filter(v => v && typeof v === 'object')
      .map(v => `${String(v.id)}@${String(v.version)}`)
  )].sort();

  const reportId = sha256Hex({
    normalizedHypothesis,
    scope,
    substrateFingerprint,
    configurationFingerprint,
    verifierVersions,
    findings: sortedFindings,
    coverage
  });

  const report = {
    contract: 'SCHOL-CLERI-PROBE-v2',
    schemaVersion: '2.0.0',
    reportId,
    bytecode: null,
    hypothesis,
    normalizedHypothesis,
    plan,
    substrateFingerprint,
    configurationFingerprint,
    status,
    findings: sortedFindings,
    coverage,
    diagnostics,
    checksum: null
  };

  report.checksum = checksumInvestigationReport(report);
  report.bytecode = encodeCleriReportIdentity(report);

  return deepFreeze(report);
}

// ─── Checksum and identity ────────────────────────────────────────────────────

export function checksumInvestigationReport(report) {
  if (!report || typeof report !== 'object') {
    throw validationError('Report must be an object', { report });
  }
  const canonical = { ...report };
  delete canonical.bytecode;
  delete canonical.checksum;
  return sha256Hex(canonical);
}

export function encodeCleriReportIdentity(report) {
  if (!report || typeof report !== 'object') {
    throw validationError('Report must be an object', { report });
  }
  const substratePrefix = (report.substrateFingerprint || '').slice(0, 12);
  const checksumPrefix = (report.checksum || '').slice(0, 12);
  return `PB-CLERI-v2-REPORT-${report.reportId}-${substratePrefix}-${checksumPrefix}`;
}

// ─── Verification ─────────────────────────────────────────────────────────────

export function verifyInvestigationReport(report) {
  if (!report || typeof report !== 'object') {
    return { valid: false, reason: 'report must be an object' };
  }

  const expectedChecksum = checksumInvestigationReport(report);
  if (expectedChecksum !== report.checksum) {
    return { valid: false, reason: 'checksum mismatch' };
  }

  const expectedBytecode = encodeCleriReportIdentity(report);
  if (expectedBytecode !== report.bytecode) {
    return { valid: false, reason: 'bytecode mismatch' };
  }

  return { valid: true };
}
