import { SCHOLOTIME_ERROR_CODES } from './scholotime.constants.js';

export function createScholoTimeError(code, context = {}) {
  const codeName = Object.keys(SCHOLOTIME_ERROR_CODES).find(k => SCHOLOTIME_ERROR_CODES[k] === code) || 'UNKNOWN';
  const err = new Error(`SCHOLOTIME_ERR: ${codeName}`);
  err.bytecode = `PB-ERR-v1-TIME-CRIT-SCHOLOTIME-${code.toString(16).toUpperCase()}`;
  err.code = code;
  err.context = context;
  return err;
}
