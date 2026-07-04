import { describe, expect, it } from 'vitest';
import { ITEM_DATABASE, equipSlotOf } from '../../../src/data/itemDatabase.js';

describe('itemDatabase rig slots', () => {
  it('has a shield in the off-hand slot', () => {
    const shield = Object.values(ITEM_DATABASE).find((i) => i.type === 'shield');
    expect(shield).toBeTruthy();
    expect(shield.slot).toBe('offHand');
  });

  it('routes a weapon to the main hand and a shield to the off hand', () => {
    const weapon = Object.values(ITEM_DATABASE).find((i) => i.type === 'weapon');
    const shield = Object.values(ITEM_DATABASE).find((i) => i.type === 'shield');
    expect(equipSlotOf(weapon)).toBe('mainHand');
    expect(equipSlotOf(shield)).toBe('offHand');
  });

  it('honors an explicit offHand slot on a weapon (dual-wield)', () => {
    expect(equipSlotOf({ type: 'weapon', slot: 'offHand' })).toBe('offHand');
  });

  it('returns null for a non-hand item', () => {
    expect(equipSlotOf({ type: 'head' })).toBe(null);
    expect(equipSlotOf(null)).toBe(null);
  });
});
