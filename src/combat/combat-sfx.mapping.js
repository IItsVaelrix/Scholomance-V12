/**
 * Combat SFX Mapping
 *
 * Secondary lookup table: eventType → default SFX parameters.
 * Used by the intent resolver as a fallback when event-mapping templates
 * don't cover a field (e.g., bus, default stars count, etc.).
 *
 * Data-only file. No logic. No imports from DSP layers.
 *
 * LAYER: src/combat — client integration / data.
 */

/**
 * @typedef {object} CombatSfxDefaults
 * @property {string} bus
 * @property {number} defaultDurationMs
 * @property {number} defaultStars
 * @property {boolean} isCritical - Plays even with reducedIntensity
 */

/** @type {Record<string, CombatSfxDefaults>} */
export const COMBAT_SFX_DEFAULTS = Object.freeze({
  LEYLINE_EXTRACTION_SUCCESS: {
    bus: 'combat.magic',
    defaultDurationMs: 360,
    defaultStars: 1,
    isCritical: false,
  },
  LEYLINE_EXTRACTION_FAILURE: {
    bus: 'combat.magic',
    defaultDurationMs: 320,
    defaultStars: 0,
    isCritical: false,
  },
  CODEX_BURST_STAGE_1: { bus: 'oracle', defaultDurationMs: 160, defaultStars: 0, isCritical: false },
  CODEX_BURST_STAGE_2: { bus: 'oracle', defaultDurationMs: 220, defaultStars: 0, isCritical: false },
  CODEX_BURST_STAGE_3: { bus: 'oracle', defaultDurationMs: 280, defaultStars: 0, isCritical: false },
  CODEX_BURST_STAGE_4: { bus: 'oracle', defaultDurationMs: 340, defaultStars: 0, isCritical: true },
  CODEX_BURST_STAGE_5: { bus: 'oracle', defaultDurationMs: 400, defaultStars: 0, isCritical: true },
  SYNTACTICAL_CHESS_ADVANTAGE: {
    bus: 'combat',
    defaultDurationMs: 250,
    defaultStars: 0,
    isCritical: false,
  },
  ORACLE_MARGINALIA: {
    bus: 'oracle',
    defaultDurationMs: 800,
    defaultStars: 0,
    isCritical: false,
  },
  NEXUS_UNLOCK: {
    bus: 'nexus',
    defaultDurationMs: 1200,
    defaultStars: 0,
    isCritical: true,
  },
});
