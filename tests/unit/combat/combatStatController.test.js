import { describe, expect, it } from 'vitest';
import { CombatStatController } from '../../../src/game/combat/combatStatController.js';

function makeController() {
  const c = new CombatStatController();
  c.registerEntity('player', { tx: 4, ty: 6 });
  c.registerEntity('dummy', { hp: 100, maxHp: 100, tx: 4, ty: 5 }); // 1 tile away
  return c;
}

describe('CombatStatController — movement', () => {
  it('spends one movement point per move and refuses at zero', () => {
    const c = makeController();
    expect(c.canMove('player')).toBe(true);
    expect(c.spendMove('player')).toBe(true);
    expect(c.spendMove('player')).toBe(true);
    expect(c.spendMove('player')).toBe(true);
    expect(c.getEntity('player').movementPointsRemaining).toBe(0);
    expect(c.canMove('player')).toBe(false);
    expect(c.spendMove('player')).toBe(false);
    expect(c.getEntity('player').movementPointsRemaining).toBe(0);
  });

  it('endTurn refills the pool and re-arms the attack', () => {
    const c = makeController();
    c.spendMove('player');
    c.resolveAttack('player', 'dummy');
    c.endTurn('player');
    expect(c.getEntity('player').movementPointsRemaining).toBe(3);
    expect(c.getEntity('player').attackUsed).toBe(false);
  });
});

describe('CombatStatController — attack', () => {
  it('respects attackRange for in/out of range targets', () => {
    const c = makeController();
    expect(c.canAttack('player', 'dummy')).toBe(true);       // 1 tile, range 1
    c.setPosition('dummy', 4, 3);                              // now 3 tiles away
    expect(c.canAttack('player', 'dummy')).toBe(false);
    expect(c.inRangeTargetIds('player', ['dummy'])).toEqual([]);
  });

  it('resolveAttack applies attackPoints, marks used, and refuses a second attack', () => {
    const c = makeController();
    const first = c.resolveAttack('player', 'dummy');
    expect(first).toEqual({ damage: 10, targetHp: 90, targetDefeated: false });
    expect(c.getEntity('player').attackUsed).toBe(true);
    expect(c.resolveAttack('player', 'dummy')).toBe(null);    // once per turn
    expect(c.getEntity('dummy').hp).toBe(90);
  });

  it('clamps HP at zero and reports defeat', () => {
    const c = makeController();
    c.registerEntity('glass', { hp: 5, maxHp: 5, tx: 4, ty: 5 });
    const res = c.resolveAttack('player', 'glass');
    expect(res).toEqual({ damage: 10, targetHp: 0, targetDefeated: true });
  });
});
