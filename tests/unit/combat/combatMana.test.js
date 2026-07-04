import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MANA_POINTS,
  SPELL_CAST_MANA_COST,
  hasManaForSpell,
} from '../../../src/game/combat/combatMana.js';

describe('combatMana', () => {
  it('exports the arena spellcasting defaults', () => {
    expect(DEFAULT_MANA_POINTS).toBe(100);
    expect(SPELL_CAST_MANA_COST).toBe(10);
  });

  it('checks whether a caster can afford a spell', () => {
    expect(hasManaForSpell(10)).toBe(true);
    expect(hasManaForSpell(9)).toBe(false);
    expect(hasManaForSpell(null)).toBe(false);
  });
});