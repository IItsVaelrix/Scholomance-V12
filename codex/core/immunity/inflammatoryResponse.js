/**
 * INFLAMMATORY RESPONSE
 *
 * Converts immune-system scan violations into first-class PixelBrain
 * BytecodeError objects. No more `customBytecode` meta smuggle — the
 * category, severity, moduleId, and errorCode declared on the rule are
 * the *real* fields the bytecode carries, so downstream filters keyed on
 * `PB-ERR-v1-VALUE-CRIT-IMMUNE-0F01` (etc.) actually see them.
 */

import {
  BytecodeError,
  ERROR_CATEGORIES,
  ERROR_CODES,
  ERROR_SEVERITY,
  MODULE_IDS,
  encodeBytecodeError,
} from '../pixelbrain/bytecode-error.js';
import { getRepair } from './repair.recommendations.js';

/**
 * Build a BytecodeError from a Layer 1 (innate) rule violation.
 * The rule object is expected to carry { category, errorCode, severity,
 * moduleId, repairKey, name, id }. The violation carries { ruleId, context }.
 */
export function buildInnateError(rule, violation, filePath) {
  const repair = getRepair(rule.repairKey);
  const context = {
    layer: 'innate',
    ruleId: rule.id,
    ruleName: rule.name,
    path: filePath,
    repair: {
      key: repair.key,
      title: repair.title,
      suggestions: repair.suggestions,
      canonical: repair.canonical || null,
      references: repair.references,
    },
    ...(violation?.context || {}),
  };
  return new BytecodeError(
    rule.category || ERROR_CATEGORIES.LINGUISTIC,
    rule.severity || ERROR_SEVERITY.CRIT,
    rule.moduleId || MODULE_IDS.IMMUNITY,
    rule.errorCode || ERROR_CODES.IMMUNE_INNATE_BLOCK,
    context,
  );
}

/**
 * Build a BytecodeError from a Layer 2 (adaptive) pathogen match.
 * The pathogen carries { id, name, encyclopediaEntry }. The match carries
 * { score, threshold }.
 */
export function buildAdaptiveError(pathogen, match, filePath) {
  return new BytecodeError(
    ERROR_CATEGORIES.VALUE,
    ERROR_SEVERITY.CRIT,
    MODULE_IDS.IMMUNITY,
    ERROR_CODES.IMMUNE_ADAPTIVE_BLOCK,
    {
      layer: 'adaptive',
      pathogenId: pathogen.id,
      pathogenName: pathogen.name,
      score: match.score,
      threshold: match.threshold ?? pathogen.threshold,
      encyclopediaEntry: pathogen.encyclopediaEntry,
      path: filePath,
    },
  );
}

/**
 * Throws a BytecodeError for a rule violation.
 * Kept for backward-compat with the previous `emitViolationError` shape.
 */
export function emitViolationError(violation, filePath, rule = null) {
  if (rule) {
    throw buildInnateError(rule, violation, filePath);
  }
  // Fallback path when only the violation summary is available.
  throw new BytecodeError(
    ERROR_CATEGORIES.LINGUISTIC,
    ERROR_SEVERITY.CRIT,
    MODULE_IDS.IMMUNITY,
    ERROR_CODES.IMMUNE_INNATE_BLOCK,
    {
      layer: 'innate',
      ruleId: violation?.ruleId,
      ruleName: violation?.name,
      path: filePath,
      repairHint: violation?.repair,
    },
  );
}

/**
 * Build a bytecode string only (no thrown error). Useful for dashboards
 * and for stamping audit-log rows.
 */
export function bytecodeFor(rule, violation, filePath) {
  const repair = getRepair(rule.repairKey);
  return encodeBytecodeError(
    rule.category || ERROR_CATEGORIES.LINGUISTIC,
    rule.severity || ERROR_SEVERITY.CRIT,
    rule.moduleId || MODULE_IDS.IMMUNITY,
    rule.errorCode || ERROR_CODES.IMMUNE_INNATE_BLOCK,
    {
      layer: 'innate',
      ruleId: rule.id,
      ruleName: rule.name,
      path: filePath,
      repair: { key: repair.key, title: repair.title },
      ...(violation?.context || {}),
    },
  );
}
