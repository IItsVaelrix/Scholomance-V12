// UNSEEDED_RANDOMNESS — hard-negative fixtures

import { seededRNG } from './rng-seed';

function calculateDamageSeeded(attacker, defender) {
  const roll = seededRNG(defender.encounterSeed).next();
  return attacker.strength * roll;
}

function playHitSpark() {
  // Visual-only jitter; outcome is already decided, so unseeded is acceptable here.
  const jitter = Math.random() * 4;
  return { x: jitter, y: jitter };
}
