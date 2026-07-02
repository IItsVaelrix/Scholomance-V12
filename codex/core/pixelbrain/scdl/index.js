/**
 * SCDL — Public API
 *
 * Main entry point for all SCDL operations.
 * Import from here, not from individual sub-modules.
 */

export { compileSCDL }               from './scdl.compiler.js';
export { parseSCDL, tokenize }       from './scdl.grammar.js';
export { exportSCDL }                from './scdl.exporters.js';
export { emitLattice }               from './scdl.lattice-emitter.js';
export { SCDL_ERROR_CODES, SCDLError, scdlError, scdlWarn, scdlInfo } from './scdl.errors.js';
export { buildSCDLDiagnosticReport, formatSCDLDiagnostic } from './scdl.diagnostics.js';
