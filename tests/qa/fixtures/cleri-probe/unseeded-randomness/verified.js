// UNSEEDED_RANDOMNESS — verified positive fixtures

function calculateDamage(attacker, defender) {
  const roll = Math.random();
  return attacker.strength * roll;
}

function resolveDodge(agility) {
  return agility * Math.random() > 15;
}
