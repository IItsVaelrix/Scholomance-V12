/**
 * enchantResolver.js — pure, deterministic (RNG injected).
 *
 * Decides whether an incantation ignites the swing with an element, and with what
 * probability. Success scales with the spell's linguistic quality (cohesionScore);
 * a syntactic collapse (failureCast) always fizzles.
 */
import { matchElement } from '../../data/combatElementDatabase.js';

export const ENCHANT_FLOOR = 0.10;
export const ENCHANT_CEIL = 0.98;

function clamp01(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/** @param {object} scoreData @param {() => number} rng */
export function computeEnchantSuccess(scoreData, rng) {
  const quality01 = clamp01(scoreData?.cohesionScore);
  const probability = scoreData?.failureCast
    ? 0
    : ENCHANT_FLOOR + (ENCHANT_CEIL - ENCHANT_FLOOR) * quality01;
  return { success: rng() < probability, probability };
}

/**
 * @param {{text?: string, weave?: string}} incantation
 * @param {object} scoreData
 * @param {() => number} rng
 */
export function resolveEnchant(incantation, scoreData, rng) {
  const combined = `${incantation?.text || ''} ${incantation?.weave || ''}`;
  const element = matchElement(combined);
  if (!element) return { element: null };
  const { success, probability } = computeEnchantSuccess(scoreData, rng);
  return { element, success, probability };
}
