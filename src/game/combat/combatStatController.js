/**
 * combatStatController.js — pure, framework-free turn/stat engine.
 *
 * Owns per-entity stat state (movement-point pool, attack-once-per-turn, HP)
 * and all combat decisions. No Phaser, no React, no DOM. Callers sync grid
 * positions in and read decisions out.
 */
import { BASE_MP_REGEN, MIN_COMBAT_DAMAGE, computeCombatManaRegen } from '../../../codex/core/combat.balance.js';
import { buildDefaultStatBlock, BASIC_ATTACK_AP_COST, GUARD_DAMAGE_MULTIPLIER } from './combatStats.js';
import { SPELL_CAST_MANA_COST } from './combatMana.js';
import { buildDefaultScholomanceStatBlock, computeBasicAttackDamage } from './scholomanceStats.js';

export class CombatStatController {
  constructor() {
    /** @type {Map<string, any>} */
    this.entities = new Map();
  }

  registerEntity(id, {
    overrides = {},
    scholomanceOverrides = {},
    hp = null,
    maxHp = null,
    tx = 0,
    ty = 0,
  } = {}) {
    const record = {
      id,
      ...buildDefaultStatBlock(overrides),
      scholomance: buildDefaultScholomanceStatBlock(scholomanceOverrides),
      hp,
      maxHp,
      position: { tx, ty },
      attackUsed: false,
      manaUsed: false,
      lastScoreData: null,
      statuses: [],
      guarding: false,
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

  grantMovementPoints(id, amount) {
    const e = this.entities.get(id);
    const grant = Math.max(0, Math.round(Number(amount) || 0));
    if (!e || grant === 0) return e;
    e.movementPointsRemaining += grant;
    return e;
  }

  applyEquipmentModifiers(id, modifiers = {}) {
    const e = this.entities.get(id);
    if (!e) return e;
    const base = buildDefaultStatBlock();
    const bonusMp = Number(modifiers.movementPoints) || 0;
    const bonusAtk = Number(modifiers.attackPoints) || 0;
    const bonusRng = Number(modifiers.attackRange) || 0;
    const prevMax = e.movementPoints;
    const prevRemaining = e.movementPointsRemaining;
    const prevAtkMax = e.attackPoints;
    const prevAtkRemaining = e.attackPointsRemaining;
    e.movementPoints = base.movementPoints + bonusMp;
    e.attackPoints = base.attackPoints + bonusAtk;
    e.attackRange = base.attackRange + bonusRng;
    e.movementPointsRemaining = Math.max(0, prevRemaining + (e.movementPoints - prevMax));
    e.attackPointsRemaining = Math.max(0, prevAtkRemaining + (e.attackPoints - prevAtkMax));
    return e;
  }

  manhattan(id, targetId) {
    const a = this.entities.get(id);
    const b = this.entities.get(targetId);
    if (!a || !b) return Infinity;
    return Math.abs(a.position.tx - b.position.tx) + Math.abs(a.position.ty - b.position.ty);
  }

  isInAttackRange(attackerId, targetId) {
    const attacker = this.entities.get(attackerId);
    const target = this.entities.get(targetId);
    if (!attacker || !target) return false;
    if (target.hp !== null && target.hp <= 0) return false;
    return this.manhattan(attackerId, targetId) <= attacker.attackRange;
  }

  canAttack(attackerId, targetId) {
    const attacker = this.entities.get(attackerId);
    const target = this.entities.get(targetId);
    if (!attacker || !target) return false;
    if (attacker.attackPointsRemaining < BASIC_ATTACK_AP_COST) return false;
    if (target.hp !== null && target.hp <= 0) return false;
    return this.manhattan(attackerId, targetId) <= attacker.attackRange;
  }

  canCastSpell(attackerId, targetId) {
    const attacker = this.entities.get(attackerId);
    const target = this.entities.get(targetId);
    if (!attacker || !target) return false;
    if (attacker.manaPointsRemaining < SPELL_CAST_MANA_COST) return false;
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
    const rawDamage = computeBasicAttackDamage(attacker.scholomance);
    const damage = target.guarding
      ? Math.max(1, Math.round(rawDamage * GUARD_DAMAGE_MULTIPLIER))
      : rawDamage;
    const targetHp = Math.max(0, (target.hp ?? 0) - damage);
    target.hp = targetHp;
    attacker.attackPointsRemaining -= BASIC_ATTACK_AP_COST;
    attacker.attackUsed = attacker.attackPointsRemaining < BASIC_ATTACK_AP_COST;
    return {
      damage,
      apSpent: BASIC_ATTACK_AP_COST,
      attackPointsRemaining: attacker.attackPointsRemaining,
      targetHp,
      targetDefeated: targetHp <= 0,
    };
  }

  resolveSpellCast(attackerId, targetId, { damage = 0, scoreData = null } = {}) {
    if (!this.canCastSpell(attackerId, targetId)) return null;
    const attacker = this.entities.get(attackerId);
    const target = this.entities.get(targetId);
    const rawSpellDamage = Math.max(MIN_COMBAT_DAMAGE, Math.round(Number(damage) || 0));
    const spellDamage = target.guarding
      ? Math.max(1, Math.round(rawSpellDamage * GUARD_DAMAGE_MULTIPLIER))
      : rawSpellDamage;
    const targetHp = Math.max(0, (target.hp ?? 0) - spellDamage);
    target.hp = targetHp;
    attacker.manaPointsRemaining -= SPELL_CAST_MANA_COST;
    attacker.manaUsed = attacker.manaPointsRemaining < SPELL_CAST_MANA_COST;
    if (scoreData) attacker.lastScoreData = scoreData;
    return {
      damage: spellDamage,
      manaSpent: SPELL_CAST_MANA_COST,
      manaPointsRemaining: attacker.manaPointsRemaining,
      targetHp,
      targetDefeated: targetHp <= 0,
    };
  }

  applyStatus(id, { chainId, damagePerTurn, turns, disposition }) {
    const e = this.entities.get(id);
    if (!e) return e;
    if (!Array.isArray(e.statuses)) e.statuses = [];
    const existing = e.statuses.find((s) => s.chainId === chainId);
    if (existing) {
      existing.damagePerTurn = damagePerTurn;
      existing.turns = turns;
      existing.disposition = disposition;
    } else {
      e.statuses.push({ chainId, damagePerTurn, turns, disposition });
    }
    return e;
  }

  tickStatuses(id) {
    const e = this.entities.get(id);
    if (!e || !Array.isArray(e.statuses) || e.statuses.length === 0) return [];
    const ticks = [];
    for (const s of e.statuses) {
      const damage = s.damagePerTurn;
      const targetHp = Math.max(0, (e.hp ?? 0) - damage);
      e.hp = targetHp;
      s.turns -= 1;
      ticks.push({ chainId: s.chainId, damage, targetHp, targetDefeated: targetHp <= 0 });
    }
    e.statuses = e.statuses.filter((s) => s.turns > 0);
    return ticks;
  }

  setGuarding(id, value) {
    const e = this.entities.get(id);
    if (!e) return e;
    e.guarding = !!value;
    return e;
  }

  endTurn(id) {
    const e = this.entities.get(id);
    if (!e) return e;
    e.movementPointsRemaining = e.movementPoints;
    e.attackPointsRemaining = e.attackPoints;
    e.attackUsed = false;
    e.guarding = false;
    const manaRegen = computeCombatManaRegen(e.lastScoreData, { baseRegen: BASE_MP_REGEN });
    e.manaPointsRemaining = Math.min(e.manaPoints, e.manaPointsRemaining + manaRegen);
    e.manaUsed = e.manaPointsRemaining < SPELL_CAST_MANA_COST;
    return e;
  }
}
