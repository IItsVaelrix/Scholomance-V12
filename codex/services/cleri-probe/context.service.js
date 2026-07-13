/**
 * Cleri Probe context enrichment.
 *
 * Adds the Scholomance's existing knowledge to a proven finding: the innate
 * immune rule that already governs the pathology, the law documents that define
 * it, the boundary that owns the path, the canonical remediation, and — as
 * history only — any similar Clerical RAID entries.
 *
 * Enrichment can never change a verdict. If an adapter fails, the canonical
 * finding survives untouched and the failure is recorded as a PB-ERR-v1
 * diagnostic on the report.
 *
 * Adapters are injected and read-only. This service never writes to RAID.
 */

import { createFinding, normalizeRepositoryPath } from '../../core/immunity/cleri-probe/contracts.js';
import { getRemediation } from '../../core/immunity/cleri-probe/remediation.js';
import { INNATE_RULES } from '../../core/immunity/innate.rules.js';
import {
  BytecodeError,
  ERROR_CATEGORIES,
  ERROR_SEVERITY,
  ERROR_CODES,
  MODULE_IDS
} from '../../core/pixelbrain/bytecode-error.js';

const DEFAULT_LIMITS = Object.freeze({
  maxLawRefs: 8,
  maxRaidRefs: 5
});

/**
 * Law documents that define each pathology class. These are stable encyclopedia
 * paths, not free text, so a report can be traced back to the law it rests on.
 */
const LAW_REFS = Object.freeze({
  UNSEEDED_RANDOMNESS: Object.freeze(['ARCH-2026-04-26-IMMUNE-SYSTEM.md', 'ENGINEERING_RULEBOOK.md']),
  LEAKED_LISTENER_SUBSCRIPTION: Object.freeze(['ENGINEERING_RULEBOOK.md']),
  SWALLOWED_ERROR: Object.freeze(['ENGINEERING_RULEBOOK.md', 'SCHEMA_CONTRACT.md']),
  UNSAFE_EXTERNAL_RESPONSE_ACCESS: Object.freeze(['SCHEMA_CONTRACT.md']),
  CONCURRENT_SHARED_STATE_MUTATION: Object.freeze(['ENGINEERING_RULEBOOK.md'])
});

/** Ownership boundaries, longest prefix wins. */
const OWNERSHIP = Object.freeze([
  { prefix: 'src/game/', owner: 'game' },
  { prefix: 'src/', owner: 'ui' },
  { prefix: 'codex/', owner: 'codex' },
  { prefix: 'scripts/', owner: 'tooling' },
  { prefix: 'tests/', owner: 'qa' },
  { prefix: 'docs/', owner: 'encyclopedia' }
]);

/**
 * The repair keys each pathology class maps to, used to find the innate immune
 * rule that already detects it. A rule and a verifier that disagree about a
 * repair are a contradiction the operator should see.
 */
const REPAIR_KEYS = Object.freeze({
  UNSEEDED_RANDOMNESS: 'repair.math-random.seeded'
});

function contextError(message, context) {
  return new BytecodeError(
    ERROR_CATEGORIES.STATE,
    ERROR_SEVERITY.WARN,
    MODULE_IDS.IMMUNITY,
    ERROR_CODES.INVARIANT_VIOLATION,
    { message, ...context }
  );
}

function ownerOf(path) {
  const normalized = normalizeRepositoryPath(path);
  let match = null;
  for (const entry of OWNERSHIP) {
    if (!normalized.startsWith(entry.prefix)) continue;
    if (!match || entry.prefix.length > match.prefix.length) match = entry;
  }
  return match ? match.owner : null;
}

function innateRuleIds(pathologyClass) {
  const repairKey = REPAIR_KEYS[pathologyClass];
  if (!repairKey) return [];
  return INNATE_RULES
    .filter(rule => rule && rule.repairKey === repairKey && rule.id)
    .map(rule => String(rule.id));
}

function normalizeRaidRefs(entries, limit) {
  if (!Array.isArray(entries)) return [];
  const ids = entries
    .map(entry => (entry && entry.id !== undefined ? String(entry.id) : null))
    .filter(Boolean);
  return [...new Set(ids)].sort().slice(0, limit);
}

/**
 * @param {object} dependencies
 * @param {{query: Function}|null} [dependencies.raidAdapter] - read-only history lookup.
 * @param {{getLawRefs: Function}|null} [dependencies.lawAdapter] - overrides the static law map.
 * @param {object} [dependencies.limits]
 */
export function createContextService(dependencies = {}) {
  const { raidAdapter = null, lawAdapter = null } = dependencies;
  const limits = { ...DEFAULT_LIMITS, ...(dependencies.limits || {}) };

  function lawRefsFor(finding) {
    const declared = lawAdapter && typeof lawAdapter.getLawRefs === 'function'
      ? lawAdapter.getLawRefs(finding.pathologyClass)
      : LAW_REFS[finding.pathologyClass];

    const refs = [
      ...innateRuleIds(finding.pathologyClass),
      ...(Array.isArray(declared) ? declared.map(String) : [])
    ];

    return [...new Set(refs)].sort().slice(0, limits.maxLawRefs);
  }

  function raidRefsFor(finding) {
    if (!raidAdapter || typeof raidAdapter.query !== 'function') return { refs: [], error: null };
    try {
      const entries = raidAdapter.query({
        pathologyClass: finding.pathologyClass,
        path: finding.span ? finding.span.path : null
      });
      return { refs: normalizeRaidRefs(entries, limits.maxRaidRefs), error: null };
    } catch (error) {
      return {
        refs: [],
        error: contextError('Clerical RAID history is unavailable', {
          reason: error.message,
          pathologyClass: finding.pathologyClass
        })
      };
    }
  }

  /**
   * Enriches proven findings. Returns the enriched findings and any diagnostics
   * raised while consulting an adapter. The verdict, evidence, span, and
   * verifier of every finding are carried through unchanged.
   */
  function enrichFindings(findings) {
    const enriched = [];
    const diagnostics = [];

    for (const finding of findings || []) {
      let lawRefs = [];
      let raidRefs = [];

      try {
        lawRefs = lawRefsFor(finding);
      } catch (error) {
        diagnostics.push(
          contextError('Law references are unavailable', { reason: error.message }).bytecode
        );
      }

      const raid = raidRefsFor(finding);
      raidRefs = raid.refs;
      if (raid.error) diagnostics.push(raid.error.bytecode);

      const remediation = getRemediation(finding.pathologyClass);

      enriched.push(createFinding({
        ...finding,
        // Identity is recomputed by the report builder; enrichment must not
        // invent one.
        findingId: finding.findingId,
        lawRefs,
        raidRefs,
        ownership: ownerOf(finding.span ? finding.span.path : ''),
        remediation: remediation.recommendationId === 'repair.unknown'
          ? finding.remediation
          : remediation,
        verificationSteps: remediation.recommendationId === 'repair.unknown'
          ? finding.verificationSteps
          : remediation.verificationSteps
      }));
    }

    return { findings: enriched, diagnostics: [...new Set(diagnostics)].sort() };
  }

  return { enrichFindings };
}
