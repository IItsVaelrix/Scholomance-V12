// UNSEEDED_RANDOMNESS — hard-negative fixtures

import { seededRNG } from './rng-seed';

// subtype: DIRECT_HARD_NEGATIVE
function calculateDamageSeeded(attacker, defender) {
  const roll = seededRNG(defender.encounterSeed).next();
  return attacker.strength * roll;
}

// subtype: ADVERSARIAL_HARD_NEGATIVE
function playHitSpark() {
  // Visual-only jitter; outcome is already decided, so unseeded is acceptable here.
  const jitter = Math.random() * 4;
  return { x: jitter, y: jitter };
}
