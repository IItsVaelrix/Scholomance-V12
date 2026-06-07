/**
 * PB-SFX-v1 — Packet Checksum
 *
 * Deterministic identity hash for SFX packets.
 * Same packet fields → same checksum, always.
 *
 * Format: PB-SFX-v1-{EVENT_TYPE}-{HEX_HASH}
 *
 * CLASSIFICATION: core / pure / determinism
 * LAYER: codex/core — NO DOM, NO AudioContext, NO side effects.
 */

import { hashString } from '../pixelbrain/shared.js';

/**
 * Computes a deterministic checksum string for a PB-SFX-v1 packet.
 *
 * Fields included in hash:
 *   version, id, seed, eventType, durationMs, synthesis, effects, modulators
 *
 * Fields deliberately excluded:
 *   routing.pan (browser adapter concern), affinity (cosmetic label)
 *
 * @param {object} packet - A PB-SFX-v1 packet object
 * @returns {string} Checksum in format "PB-SFX-v1-{EVENT}-{HASH}"
 */
export function computePacketChecksum(packet) {
  const fields = {
    version:     packet.version ?? null,
    id:          packet.id ?? null,
    seed:        packet.seed ?? null,
    eventType:   packet.eventType ?? null,
    durationMs:  packet.durationMs ?? null,
    synthesis:   packet.synthesis ?? null,
    effects:     packet.effects ?? null,
    modulators:  packet.modulators ?? null,
  };

  const serialized = JSON.stringify(fields, _stableReplacer());
  const hash = hashString(serialized).toString(16).toUpperCase().padStart(8, '0');
  const eventTag = typeof packet.eventType === 'string' ? packet.eventType : 'UNKNOWN';

  return `PB-SFX-v1-${eventTag}-${hash}`;
}

/**
 * Produces a stable JSON.stringify replacer that sorts object keys.
 * Ensures deterministic serialization regardless of insertion order.
 *
 * @returns {function|undefined}
 */
function _stableReplacer() {
  return function replacer(_key, value) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return Object.keys(value).sort().reduce((acc, k) => {
        acc[k] = value[k];
        return acc;
      }, {});
    }
    return value;
  };
}
