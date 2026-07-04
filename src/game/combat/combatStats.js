/**
 * combatStats.js — the root of the MMORPG stat tree.
 *
 * Data-only, framework-free. The tree grows by adding entries to COMBAT_STATS;
 * consumers iterate the registry rather than hard-coding stat names.
 */

export const COMBAT_STATS = [
  {
    key: 'movementPoints',
    label: 'Movement Points',
    category: 'mobility',
    base: 3,
    min: 0,
    max: 12,
    description: 'Points spent to move; one point per tile stepped, refilled each turn.',
  },
  {
    key: 'attackPoints',
    label: 'Attack Points',
    category: 'offense',
    base: 10,
    min: 0,
    max: 999,
    description: 'Damage dealt by a basic attack.',
  },
  {
    key: 'attackRange',
    label: 'Attack Range',
    category: 'offense',
    base: 1,
    min: 0,
    max: 12,
    description: 'Maximum Manhattan tile distance a basic attack can reach.',
  },
];

/**
 * Build a fresh stat block seeded from the registry bases, then apply overrides.
 * `movementPointsRemaining` follows `movementPoints` unless explicitly overridden.
 * @param {Partial<{movementPoints:number, movementPointsRemaining:number, attackPoints:number, attackRange:number}>} overrides
 */
export function buildDefaultStatBlock(overrides = {}) {
  const base = Object.fromEntries(COMBAT_STATS.map((s) => [s.key, s.base]));
  const movementPoints = overrides.movementPoints ?? base.movementPoints;
  return {
    movementPoints,
    movementPointsRemaining: overrides.movementPointsRemaining ?? movementPoints,
    attackPoints: overrides.attackPoints ?? base.attackPoints,
    attackRange: overrides.attackRange ?? base.attackRange,
  };
}
