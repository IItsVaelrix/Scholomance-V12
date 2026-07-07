import { describe, expect, it } from 'vitest';
import { voidAcolyteBestiaryEntry } from '../../../../src/game/combat/bestiary/entries/voidAcolyte.entry.js';

describe('void acolyte combatAI kit', () => {
  const entity = { scholomance: { BAPO: 22 }, attackRange: 8 };
  const ctx = { enemyId: 'portal-warden', entity };

  it('exposes bruiser melee profile and kit', () => {
    const profile = voidAcolyteBestiaryEntry.combatAI.buildProfile(ctx);
    expect(profile.role).toBe('bruiser');
    expect(profile.preferredRange).toBe(8);

    const kit = voidAcolyteBestiaryEntry.combatAI.buildAbilityKit(ctx);
    expect(kit.estimateAttackDamage()).toBe(11);
    expect(kit.canActFromRange(1)).toBe(false);
    expect(kit.canActFromRange(8)).toBe(true);
  });
});