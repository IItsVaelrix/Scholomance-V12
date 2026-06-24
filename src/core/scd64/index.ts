/**
 * SCD64 module barrel index.
 *
 * Import from here instead of from individual files.
 *
 * @example
 *   import { decodeSCD64Hover, compareSCD64ByBlocks } from '../../core/scd64';
 *   import type { SCD64HoverDecodeResponse } from '../../core/scd64';
 */

export * from './circuitBreaker';
export * from './compareSCD64';
export * from './constants';
export * from './decodeSCD64';
export * from './generateSCD64FromSlots';
export * from './generateSCD64RegressionTest';
// Export only glossary's own symbols — SCD64_SLOT_NAMES is already exported
// from constants.ts and glossary.ts re-imports it from there, so re-exporting
// both would create a duplicate identifier error.
export { BUG_FAMILIES, SCD64_GLOSSARY } from './glossary';
export * from './parseSCD64';
export * from './types';

// RuleRegistry is intentionally NOT re-exported here — it is an internal
// evaluation engine that consumers should not depend on directly.
