/**
 * DIAGNOSTIC ADAPTER
 *
 * Permitted, browser-safe bridge between UI pages and Codex core diagnostics.
 * Prevents importing Node-only modules (like node:crypto) into client-side code.
 */

export { CELL_IDS } from '../../codex/core/diagnostic/diagnostic-constants.js';

function base64url(str) {
  try {
    const b64 = btoa(unescape(encodeURIComponent(str)));
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  } catch (e) {
    return 'empty';
  }
}

function stableChecksum(payload) {
  const stable = {
    version: payload.version,
    code: payload.code,
    cellId: payload.cellId,
    checkId: payload.checkId,
    moduleId: payload.moduleId,
    context: payload.context,
  };
  const str = JSON.stringify(stable);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0').slice(0, 8);
}

export class BrowserBytecodeHealth {
  constructor({ code, cellId, checkId, moduleId = null, context = {} }) {
    this.version = 'v1';
    this.code = code;
    this.cellId = cellId;
    this.checkId = checkId;
    this.moduleId = moduleId;
    this.context = JSON.parse(JSON.stringify(context)); // deep clone
    this.timestamp = Date.now();
    this.checksum = stableChecksum(this);
    
    const contextB64 = base64url(JSON.stringify(this.context));
    this.bytecode = `${this.code}-${this.cellId}-${this.checkId}-${contextB64}-${this.checksum}`;
  }

  toJSON() {
    return {
      version: this.version,
      code: this.code,
      cellId: this.cellId,
      checkId: this.checkId,
      moduleId: this.moduleId,
      context: this.context,
      timestamp: this.timestamp,
      checksum: this.checksum,
      bytecode: this.bytecode,
    };
  }

  toString() {
    return `[${this.code}] ${this.cellId}/${this.checkId}`;
  }
}

export function encodeBytecodeHealth(cellId, checkId, context = {}) {
  return new BrowserBytecodeHealth({
    code: 'PB-OK-v1-IMMUNE-PASS-COORD',
    cellId,
    checkId,
    context
  });
}
