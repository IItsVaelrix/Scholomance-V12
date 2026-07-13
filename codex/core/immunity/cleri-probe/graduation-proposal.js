/**
 * Cleri Probe graduation proposals.
 *
 * A human may confirm a verified finding and propose that its pattern graduate
 * into immune memory. This module builds that proposal and nothing else: it has
 * no authority to persist, to write a file, or to reach Clerical RAID. It cannot
 * — it imports no I/O.
 *
 * A proposal is a request for review. `approved` is always false here. Only a
 * separately authorized command, through the lawful Clerical RAID path, may
 * approve and persist one.
 *
 * Pure core module: no process, fs, os, performance, or network access.
 */

import {
  BytecodeError,
  ERROR_CATEGORIES,
  ERROR_SEVERITY,
  ERROR_CODES,
  MODULE_IDS
} from '../../pixelbrain/bytecode-error.js';
import { deepFreeze } from './contracts.js';
import { sha256Hex, stableStringify, verifyInvestigationReport } from './canonical-report.js';

export const FEEDBACK_CONTRACT = 'SCHOL-CLERI-FEEDBACK-v1';
export const GRADUATION_PROPOSAL_CONTRACT = 'SCHOL-CLERI-GRADUATION-PROPOSAL-v1';

export const DECISIONS = deepFreeze(['CONFIRM', 'REJECT']);

function proposalError(code, message, context = {}) {
  const error = new BytecodeError(
    ERROR_CATEGORIES.VALUE,
    ERROR_SEVERITY.CRIT,
    MODULE_IDS.IMMUNITY,
    code,
    { message, ...context }
  );
  error.message = message;
  return error;
}

/** A proposal may only rest on a report that is exactly what it claims to be. */
function assertReport(report) {
  if (!report || typeof report !== 'object' || report.contract !== 'SCHOL-CLERI-PROBE-v2') {
    throw proposalError(
      ERROR_CODES.INVALID_FORMAT,
      'Graduation requires a SCHOL-CLERI-PROBE-v2 report'
    );
  }

  const validation = verifyInvestigationReport(report);
  if (!validation.valid) {
    throw proposalError(
      ERROR_CODES.INVARIANT_VIOLATION,
      `Graduation refused a tampered report: ${validation.reason}`
    );
  }
}

function requireFinding(report, findingId) {
  const finding = (report.findings || []).find(item => item.findingId === findingId);
  if (!finding) {
    throw proposalError(
      ERROR_CODES.INVALID_VALUE,
      `Report contains no finding ${findingId}`,
      { findingId }
    );
  }
  if (finding.verdict !== 'VERIFIED') {
    throw proposalError(
      ERROR_CODES.INVARIANT_VIOLATION,
      'Only a VERIFIED finding may be graduated',
      { findingId }
    );
  }
  return finding;
}

function checksumFeedback(feedback) {
  return sha256Hex(stableStringify({
    contract: feedback.contract,
    sourceReportId: feedback.sourceReportId,
    findingId: feedback.findingId,
    decision: feedback.decision,
    rationale: feedback.rationale,
    proposedBy: feedback.proposedBy
  }));
}

/**
 * Records a human decision about one verified finding.
 *
 * Authorship is not negotiable: feedback is always attributed to a human, never
 * to an agent, because only a human may confirm what enters immune memory.
 */
export function buildFindingFeedback({ report, findingId, decision, rationale }) {
  assertReport(report);
  requireFinding(report, findingId);

  const normalizedDecision = String(decision ?? '').toUpperCase();
  if (!DECISIONS.includes(normalizedDecision)) {
    throw proposalError(
      ERROR_CODES.MISSING_REQUIRED,
      `Feedback requires a decision of ${DECISIONS.join(' or ')}`,
      { decision }
    );
  }

  const normalizedRationale = String(rationale ?? '').trim();
  if (normalizedRationale.length === 0) {
    throw proposalError(
      ERROR_CODES.MISSING_REQUIRED,
      'Feedback requires a human rationale'
    );
  }

  const feedback = {
    contract: FEEDBACK_CONTRACT,
    sourceReportId: report.reportId,
    findingId,
    decision: normalizedDecision,
    rationale: normalizedRationale,
    proposedBy: 'human',
    checksum: null
  };

  feedback.checksum = checksumFeedback(feedback);
  return deepFreeze(feedback);
}

/**
 * A pattern a human can read and check against the report.
 *
 * It names the predicates that proved the finding and the counterchecks that
 * failed to excuse it, so a reviewer graduating this pattern knows exactly what
 * they are teaching the immune system to look for.
 */
function buildPatternPreview(finding) {
  const supporting = finding.supportingEvidence
    .filter(evidence => evidence.observed)
    .map(evidence => evidence.predicateId)
    .sort();

  const absent = finding.counterEvidenceChecked
    .filter(evidence => !evidence.observed)
    .map(evidence => evidence.predicateId)
    .sort();

  const symbol = finding.symbol || finding.span?.symbol || finding.span?.path;

  return [
    `${finding.pathologyClass} in ${symbol}`,
    `  proven by: ${supporting.join(' AND ')}`,
    `  none of:   ${absent.join(', ')}`,
    `  verifier:  ${finding.verifier.id}@${finding.verifier.version}`
  ].join('\n');
}

function digestEvidence(finding) {
  return sha256Hex(stableStringify({
    supportingEvidence: finding.supportingEvidence,
    counterEvidenceChecked: finding.counterEvidenceChecked,
    span: finding.span
  }));
}

function normalizeBenchmark(benchmark, label) {
  if (!benchmark || typeof benchmark !== 'object') {
    throw proposalError(
      ERROR_CODES.MISSING_REQUIRED,
      `Graduation requires a ${label} benchmark over the frozen corpus`
    );
  }

  const precision = Number(benchmark.precision);
  const recall = Number(benchmark.recall);
  if (!Number.isFinite(precision) || !Number.isFinite(recall)) {
    throw proposalError(
      ERROR_CODES.INVALID_VALUE,
      `The ${label} benchmark must report finite precision and recall`,
      { benchmark }
    );
  }

  return deepFreeze({
    precision,
    recall,
    truePositives: Number(benchmark.truePositives) || 0,
    falsePositives: Number(benchmark.falsePositives) || 0
  });
}

/**
 * Builds a reviewable graduation proposal from confirmed feedback.
 *
 * A candidate pattern that costs the family precision or recall on the frozen
 * corpus is not an improvement to immune memory, and cannot become a proposal at
 * all — a regression is blocked here, not flagged for later.
 */
export function buildGraduationProposal({ report, feedback, benchmark }) {
  assertReport(report);

  if (!feedback || typeof feedback !== 'object' || feedback.contract !== FEEDBACK_CONTRACT) {
    throw proposalError(
      ERROR_CODES.INVALID_FORMAT,
      'Graduation requires SCHOL-CLERI-FEEDBACK-v1 feedback'
    );
  }

  if (checksumFeedback(feedback) !== feedback.checksum) {
    throw proposalError(
      ERROR_CODES.INVARIANT_VIOLATION,
      'Graduation refused feedback whose checksum does not match its contents'
    );
  }

  if (feedback.decision !== 'CONFIRM') {
    throw proposalError(
      ERROR_CODES.INVARIANT_VIOLATION,
      'Only CONFIRM feedback may create a graduation proposal',
      { decision: feedback.decision }
    );
  }

  if (feedback.sourceReportId !== report.reportId) {
    throw proposalError(
      ERROR_CODES.INVARIANT_VIOLATION,
      'Feedback does not belong to this report'
    );
  }

  const finding = requireFinding(report, feedback.findingId);

  if (!benchmark || typeof benchmark !== 'object') {
    throw proposalError(
      ERROR_CODES.MISSING_REQUIRED,
      'Graduation requires before and candidate benchmarks over the frozen corpus'
    );
  }

  const beforeBenchmark = normalizeBenchmark(benchmark.before, 'before');
  const candidateBenchmark = normalizeBenchmark(benchmark.candidate, 'candidate');

  if (candidateBenchmark.precision < beforeBenchmark.precision) {
    throw proposalError(
      ERROR_CODES.INVARIANT_VIOLATION,
      `Graduation blocked: the candidate pattern regresses family precision from ${beforeBenchmark.precision} to ${candidateBenchmark.precision}`,
      { beforeBenchmark, candidateBenchmark }
    );
  }

  if (candidateBenchmark.recall < beforeBenchmark.recall) {
    throw proposalError(
      ERROR_CODES.INVARIANT_VIOLATION,
      `Graduation blocked: the candidate pattern regresses family recall from ${beforeBenchmark.recall} to ${candidateBenchmark.recall}`,
      { beforeBenchmark, candidateBenchmark }
    );
  }

  const proposal = {
    contract: GRADUATION_PROPOSAL_CONTRACT,
    proposalId: null,
    sourceReportId: report.reportId,
    findingId: finding.findingId,
    pathologyClass: finding.pathologyClass,
    verifier: deepFreeze({ id: finding.verifier.id, version: finding.verifier.version }),
    evidenceDigest: digestEvidence(finding),
    remediationId: finding.remediation ? finding.remediation.recommendationId : null,
    patternPreview: buildPatternPreview(finding),
    beforeBenchmark,
    candidateBenchmark,
    rationale: feedback.rationale,
    proposedBy: 'human',
    approved: false,
    checksum: null
  };

  proposal.proposalId = sha256Hex(stableStringify({
    contract: proposal.contract,
    sourceReportId: proposal.sourceReportId,
    findingId: proposal.findingId,
    evidenceDigest: proposal.evidenceDigest,
    rationale: proposal.rationale
  }));

  const { checksum: _ignored, ...identity } = proposal;
  proposal.checksum = sha256Hex(stableStringify(identity));

  return deepFreeze(proposal);
}

/** Recomputes a proposal's checksum, for a reviewer who received one out of band. */
export function verifyGraduationProposal(proposal) {
  if (!proposal || typeof proposal !== 'object' || proposal.contract !== GRADUATION_PROPOSAL_CONTRACT) {
    return { valid: false, reason: 'not a SCHOL-CLERI-GRADUATION-PROPOSAL-v1 proposal' };
  }
  const { checksum, ...identity } = proposal;
  if (sha256Hex(stableStringify(identity)) !== checksum) {
    return { valid: false, reason: 'checksum mismatch' };
  }
  if (proposal.approved !== false) {
    return { valid: false, reason: 'a proposal may not approve itself' };
  }
  return { valid: true };
}
