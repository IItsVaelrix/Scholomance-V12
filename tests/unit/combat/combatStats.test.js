import { describe, expect, it } from 'vitest';
import { COMBAT_STATS, buildDefaultStatBlock } from '../../../src/game/combat/combatStats.js';

describe('combatStats registry', () => {
  it('defines the three slice-1 stats with the documented bases', () => {
    const byKey = Object.fromEntries(COMBAT_STATS.map((s) => [s.key, s]));
    expect(byKey.movementPoints.base).toBe(3);
    expect(byKey.attackPoints.base).toBe(10);
    expect(byKey.attackRange.base).toBe(1);
  });

  it('buildDefaultStatBlock seeds defaults with a full movement pool', () => {
    expect(buildDefaultStatBlock()).toEqual({
      movementPoints: 3,
      movementPointsRemaining: 3,
      attackPoints: 10,
      attackRange: 1,
    });
  });

  it('overrides merge, and overriding movementPoints seeds the remaining pool', () => {
    expect(buildDefaultStatBlock({ movementPoints: 5, attackPoints: 20 })).toEqual({
      movementPoints: 5,
      movementPointsRemaining: 5,
      attackPoints: 20,
      attackRange: 1,
    });
  });

  it('respects an explicit movementPointsRemaining override', () => {
    expect(buildDefaultStatBlock({ movementPoints: 5, movementPointsRemaining: 2 }).movementPointsRemaining).toBe(2);
  });
});
