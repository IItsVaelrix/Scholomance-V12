/**
 * combatStatController.js — pure, framework-free turn/stat engine.
 *
 * Owns per-entity stat state (movement-point pool, attack-once-per-turn, HP)
 * and all combat decisions. No Phaser, no React, no DOM. Callers sync grid
 * positions in and read decisions out.
 */
import { buildDefaultStatBlock } from './combatStats.js';

export class CombatStatController {
  constructor() {
    /** @type {Map<string, any>} */
    this.entities = new Map();
  }

  registerEntity(id, { overrides = {}, hp = null, maxHp = null, tx = 0, ty = 0 } = {}) {
    const record = {
      id,
      ...buildDefaultStatBlock(overrides),
      hp,
      maxHp,
      position: { tx, ty },
      attackUsed: false,
    };
    this.entities.set(id, record);
    return record;
  }

  getEntity(id) {
    return this.entities.get(id);
  }

  setPosition(id, tx, ty) {
    const e = this.entities.get(id);
    if (e) e.position = { tx, ty };
    return e;
  }

  canMove(id) {
    const e = this.entities.get(id);
    return !!e && e.movementPointsRemaining >= 1;
  }

  spendMove(id) {
    if (!this.canMove(id)) return false;
    this.entities.get(id).movementPointsRemaining -= 1;
    return true;
  }

  manhattan(id, targetId) {
    const a = this.entities.get(id);
    const b = this.entities.get(targetId);
    if (!a || !b) return Infinity;
    return Math.abs(a.position.tx - b.position.tx) + Math.abs(a.position.ty - b.position.ty);
  }

  canAttack(attackerId, targetId) {
    const attacker = this.entities.get(attackerId);
    const target = this.entities.get(targetId);
    if (!attacker || !target) return false;
    if (attacker.attackUsed) return false;
    if (target.hp !== null && target.hp <= 0) return false;
    return this.manhattan(attackerId, targetId) <= attacker.attackRange;
  }

  inRangeTargetIds(attackerId, candidateIds) {
    return candidateIds.filter((tid) => this.canAttack(attackerId, tid));
  }

  resolveAttack(attackerId, targetId) {
    if (!this.canAttack(attackerId, targetId)) return null;
    const attacker = this.entities.get(attackerId);
    const target = this.entities.get(targetId);
    const damage = attacker.attackPoints;
    const targetHp = Math.max(0, (target.hp ?? 0) - damage);
    target.hp = targetHp;
    attacker.attackUsed = true;
    return { damage, targetHp, targetDefeated: targetHp <= 0 };
  }

  endTurn(id) {
    const e = this.entities.get(id);
    if (!e) return e;
    e.movementPointsRemaining = e.movementPoints;
    e.attackUsed = false;
    return e;
  }
}
