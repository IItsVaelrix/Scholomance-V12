/**
 * Browser-safe diagnostic constants.
 *
 * This module intentionally imports no Node built-ins so both Codex core and
 * UI adapters can share diagnostic literals without bundling server-only code.
 */

export const HEALTH_SEVERITY = Object.freeze({
  PASS: 'pass',
  INFO: 'info',
  ARCHIVED: 'archived',
});

export const HEALTH_CODES = Object.freeze({
  IMMUNE_PASS_COORD: 'PB-OK-v1-IMMUNE-PASS-COORD',
  LAYER_BOUNDARY_OK: 'PB-OK-v1-LAYER-BOUNDARY-OK',
  TEST_COVERAGE_PASS: 'PB-OK-v1-TEST-COVERAGE-PASS',
  FIXTURE_SHAPE_OK: 'PB-OK-v1-FIXTURE-SHAPE-OK',
  PROCESSOR_BRIDGE_CLEAN: 'PB-OK-v1-PROCESSOR-BRIDGE-CLEAN',
  CELL_SCAN_CLEAN: 'PB-OK-v1-CELL-SCAN-CLEAN',
  QUANT_FIDELITY_PASS: 'PB-OK-v1-QUANT-FIDELITY-PASS',
});

/**
 * Well-known diagnostic cell IDs.
 */
export const CELL_IDS = Object.freeze({
  IMMUNITY_SCAN: 'IMMUNITY_SCAN',
  LAYER_BOUNDARY: 'LAYER_BOUNDARY',
  TEST_COVERAGE: 'TEST_COVERAGE',
  FIXTURE_SHAPE: 'FIXTURE_SHAPE',
  PROCESSOR_BRIDGE: 'PROCESSOR_BRIDGE',
  CONNECTION_HEALTH: 'CONNECTION_HEALTH',
  LIFECYCLE: 'LIFECYCLE',
  DB_HEALTH: 'DB_HEALTH',
  VECTOR_FIDELITY: 'VECTOR_FIDELITY',
});
