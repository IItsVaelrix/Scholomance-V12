/**
 * LAYER 1 — INNATE SCANNER
 * 
 * Applies pattern rules to file content.
 */

import { INNATE_RULES } from './innate.rules.js';

/**
 * @param {string} content - Raw file content
 * @param {string} filePath - Relative path to file
 * @returns {Array<{ ruleId: string, bytecode: string, repair: string }>}
 */
export function scanInnate(content, filePath) {
  const violations = [];
  
  for (const rule of INNATE_RULES) {
    if (rule.detector(content, filePath)) {
      violations.push({
        ruleId: rule.id,
        name: rule.name,
        bytecode: rule.bytecode,
        repair: rule.repair
      });
    }
  }
  
  return violations;
}
