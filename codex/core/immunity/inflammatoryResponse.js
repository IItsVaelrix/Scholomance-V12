/**
 * INFLAMMATORY RESPONSE
 * 
 * Emits bytecode errors for detected logical infections.
 */

import {
  BytecodeError,
  ERROR_CATEGORIES,
  ERROR_SEVERITY,
  MODULE_IDS,
  ERROR_CODES,
} from '../pixelbrain/bytecode-error.js';

const MOD = MODULE_IDS.SHARED; // Can be specialized to IMMUNITY if needed

/**
 * Converts a scan violation into a rich BytecodeError.
 */
export function emitViolationError(violation, filePath) {
  const { ruleId, name, bytecode, repair } = violation;
  
  // Map specific rule IDs to standard categories/codes
  let category = ERROR_CATEGORIES.LINGUISTIC;
  let severity = ERROR_SEVERITY.CRIT;
  
  if (ruleId.startsWith('QUANT')) {
    category = ERROR_CATEGORIES.VALUE;
  }

  throw new BytecodeError(
    category,
    severity,
    MOD,
    ERROR_CODES.INVALID_VALUE, // Generic catch-all for now
    {
      ruleName: name,
      path: filePath,
      repairHint: repair,
      customBytecode: bytecode
    }
  );
}
