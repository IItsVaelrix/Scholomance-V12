export const PLAYER_MAX_HP = 1000;
export const PLAYER_MAX_MP = 100;
export const OPPONENT_MAX_HP = 1500;

export function splitCombatLines(text) {
  return String(text || '')
    .split(/\n+/g)
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalizeStatusEffect(statusEffect) {
  if (!statusEffect || typeof statusEffect !== 'object') return null;

  const turns = Math.max(1, Number(statusEffect.turnsRemaining ?? statusEffect.turns) || 1);
  const tier = Math.max(1, Number(statusEffect.tier) || 1);

  return {
    ...statusEffect,
    tier,
    turns: Math.max(1, Number(statusEffect.turns) || turns),
    turnsRemaining: turns,
    magnitude: Math.max(0, Number(statusEffect.magnitude) || 0),
  };
}

export function upsertStatusEffect(statusList, statusEffect) {
  const normalizedStatus = normalizeStatusEffect(statusEffect);
  if (!normalizedStatus) {
    return Array.isArray(statusList) ? statusList : [];
  }

  const entries = Array.isArray(statusList) ? [...statusList] : [];
  const existingIndex = entries.findIndex((entry) => (
    entry?.school === normalizedStatus.school
    && entry?.chainId === normalizedStatus.chainId
    && entry?.disposition === normalizedStatus.disposition
  ));

  if (existingIndex < 0) {
    entries.push(normalizedStatus);
    return entries;
  }

  const existing = normalizeStatusEffect(entries[existingIndex]) || normalizedStatus;
  entries[existingIndex] = {
    ...existing,
    ...normalizedStatus,
    tier: Math.max(existing.tier, normalizedStatus.tier),
    turns: Math.max(existing.turns, normalizedStatus.turns),
    turnsRemaining: Math.max(existing.turnsRemaining, normalizedStatus.turnsRemaining),
    magnitude: Math.max(existing.magnitude, normalizedStatus.magnitude),
  };
  return entries;
}

export function tickStatusEffects(statusList) {
  if (!Array.isArray(statusList) || statusList.length === 0) {
    return [];
  }

  return statusList
    .map((statusEffect) => normalizeStatusEffect(statusEffect))
    .filter(Boolean)
    .map((statusEffect) => ({
      ...statusEffect,
      turnsRemaining: Math.max(0, statusEffect.turnsRemaining - 1),
    }))
    .filter((statusEffect) => statusEffect.turnsRemaining > 0);
}

/**
 * Calculates the net magnitude of a status effect chain for an entity.
 */
export function getStatusMagnitude(entity, chainId) {
  const effects = Array.isArray(entity?.statusEffects) ? entity.statusEffects : [];
  return effects
    .filter((e) => e.chainId === chainId)
    .reduce((sum, e) => sum + (Number(e.magnitude) || 0), 0);
}
