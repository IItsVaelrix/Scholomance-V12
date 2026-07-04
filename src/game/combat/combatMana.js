/**
 * Mana pool constants for arena spellcasting (Invoke).
 * Mirrors the tactical battle session MP model (100 pool, 10 per cast).
 */

export const DEFAULT_MANA_POINTS = 100;
export const SPELL_CAST_MANA_COST = 10;

/**
 * @param {number | null | undefined} remaining
 * @param {number} [cost=SPELL_CAST_MANA_COST]
 */
export function hasManaForSpell(remaining, cost = SPELL_CAST_MANA_COST) {
  return Number(remaining) >= cost;
}