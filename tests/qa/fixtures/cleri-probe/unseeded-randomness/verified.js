// UNSEEDED_RANDOMNESS — verified positive fixtures

// subtype: CLEAR_POSITIVE
function calculateDamage(attacker, defender) {
  const roll = Math.random();
  return attacker.strength * roll;
}

// subtype: REAL_WORLD_POSITIVE
function resolveDodge(agility) {
  return agility * Math.random() > 15;
}
