/**
 * DIAGNOSTIC MODULE — Public API
 *
 * Entry point for the Diagnostic Cell Infrastructure.
 * All public exports are available from this module.
 *
 * Reference: PDR-2026-05-09-DIAGNOSTIC-CELL-INFRASTRUCTURE
 */

// BytecodeHealth — the green-path signal
export {
  BytecodeHealth,
  encodeBytecodeHealth,
  encodeModuleHealth,
  encodeArchivedHealth,
  checksumHealth,
  verifyHealthDeterminism,
  buildDiagnosticSynthesisSnapshot,
  HEALTH_CODES,
  ARCHIVED_CODES,
  HEALTH_SEVERITY,
  CELL_IDS as HEALTH_CELL_IDS,
} from './BytecodeHealth.js';

// Diagnostic Report
export {
  generateDiagnosticReport,
  verifyReport,
  checksumReport,
  REPORT_VERSION,
} from './DiagnosticReport.js';

// Diagnostic Runner
export {
  runDiagnostic,
  runCellById,
  getAvailableCells,
  buildSynthesisSnapshot,
  buildSynthesisProjection,
  CELL_SCAN_CONTRACTS,
  CELL_IDS,
} from './diagnostic-runner.js';

export {
  createArrayFileSource,
  createFilesystemFileSource,
  createScanContext,
  collectFileSource,
  DEFAULT_SCAN_LIMITS,
} from './diagnostic-file-source.js';

export {
  CELL_IDS as DIAGNOSTIC_CELL_IDS,
  HEALTH_CODES as DIAGNOSTIC_HEALTH_CODES,
  HEALTH_SEVERITY as DIAGNOSTIC_HEALTH_SEVERITY,
} from './diagnostic-constants.js';

export {
  CCCB_VERSION,
  CCCB_REQUIRED_FIELDS,
  fnv1a32,
  deriveSemanticSlug,
  normalizeCccbOrdinal,
  buildCccbId,
  parseCccbId,
  serializeCccbBlock,
  parseCccbBlock,
  verifyCccbBlock,
  extractCccbBlocks,
  traverseCccbGraph,
} from './cccbEncoder.js';

export {
  BYTECODE_XP_VERSION,
  BYTECODE_XP_PREFIX,
  BYTECODE_XP_SOURCE_KINDS,
  BytecodeXPVaccine,
  encodeBytecodeXPVaccineFromError,
  encodeBytecodeXPVaccineFromHealth,
  encodeBytecodeXPVaccineFromCccb,
  parseBytecodeXPVaccineBytecode,
  checksumVaccine,
  checksumVaccineFingerprint,
} from './BytecodeXPVaccine.js';

export {
  QBIT_PULSE_TYPE,
  DEFAULT_QBIT_PULSE_LIMITS,
  buildQbitPulseNode,
  normalizeHotspots,
  checksumQbitPulse,
  verifyQbitPulseNode,
} from './QbitPulse.js';

export {
  DEFAULT_QBIT_PROBE_LIMITS,
  buildCleriProbeHotspots,
  buildQbitPulseNodeWithCleriProbe,
  buildProbeHypothesis,
} from './QbitProbeEnrichment.js';

export {
  BYTECODE_XP_MEMORY_SCHEMA,
  BYTECODE_XP_MEMORY_ARTIFACT_KIND,
  BYTECODE_XP_MEMORY_KEY_PREFIX,
  buildBytecodeXPMemoryEnvelope,
  buildBytecodeXPMemoryKey,
  checksumBytecodeXPMemoryEnvelope,
  verifyBytecodeXPMemoryEnvelope,
  createBytecodeXPMemorySetPayload,
  persistBytecodeXPMemoryEnvelope,
} from './QbitMemoryPersistence.js';

export {
  DEFAULT_DIAGNOSTIC_MEMORY_INFUSION,
  runDiagnosticMemoryInfusion,
  buildDiagnosticMemoryArtifacts,
} from './diagnostic-memory-infusion.js';

// Re-export cell IDs for convenience
export { CELL_IDS as CELLS } from './diagnostic-runner.js';

// ByteCode Diagnostic Synthesis — Stage 2 public API
export {
  evaluateCleriRaidMind,
  maybeRunDiagnosticSynthesis,
  shouldFailDiagnosticGate,
} from './CleriRaidMind.js';

export { normalizeBytecodeHealthSnapshot, normalizeSignal } from './BytecodeHealthAdapter.js';
export { normalizeStoichVector, evaluateStoichComplex } from './StoichComplexHealth.js';
export { CLERI_RAID_COMPLEXES } from './CleriRaidComplexRegistry.js';

// Persistence + Logarithmic Pruner
export {
  writeReport,
  readReport,
  pruneReports,
  planPruning,
  timestampFromReportId,
  reportPath,
  DEFAULT_REPORTS_DIR,
  RETENTION,
} from './persistence.js';
